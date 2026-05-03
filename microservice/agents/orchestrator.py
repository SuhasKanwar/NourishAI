from __future__ import annotations

import json
import re
from typing import Any

from langchain_groq import ChatGroq

from config.settings import get_settings
from memory.vector_memory import PreferenceMemory
from models.schemas import AgentRunRequest, AgentRunResponse, DashboardAction, Recommendation

from tools.swiggy_mcp import SwiggyAuthRequired, search_dineout, search_groceries, search_restaurants
from services.context import ContextService


class NourishAgentOrchestrator:
    def __init__(self) -> None:
        self.context = ContextService()
        self.memory = PreferenceMemory()
        self.settings = get_settings()
        self.llm = (
            ChatGroq(
                model=self.settings.groq_model,
                api_key=self.settings.groq_api_key,
                timeout=8,
                max_retries=0,
            )
            if self.settings.groq_api_key
            else None
        )

    async def run(self, request: AgentRunRequest) -> AgentRunResponse:
        context = await self.context.collect(
            user_id=request.user_id,
            prompt=request.prompt,
            location=request.location,
            latitude=request.latitude,
            longitude=request.longitude,
            address_id=request.address_id,
            budget_limit=request.budget_limit,
        )
        budget = request.budget_data or {"monthly_limit": 12000, "total_spent": 0, "remaining": 12000}
        if "total_spent" not in budget and "spent" in budget:
            budget["total_spent"] = budget["spent"]
        context.budget_remaining = int(budget.get("remaining", 0))
        self.memory.load(request.user_preferences)
        preferences = self.memory.search(request.prompt)
        plan = await self._planner(request.prompt, context.model_dump(), preferences)
        query = plan.get("search_query") or context.meal_type.value
        auth_required = False
        restaurants: list[Recommendation] = []
        dineouts: list[Recommendation] = []
        groceries: list[Recommendation] = []

        try:
            swiggy_result = await search_restaurants(
                query=query,
                location=context.location,
                access_token=request.swiggy_token.get("access_token") if request.swiggy_token else None,
                address_id=context.address_id,
            )
            restaurants = self._normalize_recommendations(swiggy_result, request.budget_limit, "restaurant")
            recommendations = self._budget_agent(restaurants, context.budget_remaining)
            action_status = "ready"
        except SwiggyAuthRequired:
            auth_required = True
            recommendations = []
            action_status = "requires_auth"
        except Exception as exc:
            import logging
            logging.error(f"Error fetching restaurants: {exc}", exc_info=True)
            recommendations = []
            action_status = "suggested"
            plan["tool_warning"] = str(exc)

        if not auth_required:
            dineouts = await self._try_dineouts(request.swiggy_token.get("access_token") if request.swiggy_token else None, query, context)
            groceries = await self._try_groceries(request.swiggy_token.get("access_token") if request.swiggy_token else None, query, context.address_id)
        recommendations = self._health_agent(recommendations)
        actions = self._actions(recommendations, action_status, auth_required)
        reasoning = self._reasoning(
            request.prompt,
            context.model_dump(),
            plan,
            recommendations,
            preferences,
            auth_required,
            len(restaurants),
            len(dineouts),
            len(groceries),
        )

        new_preference = None
        if recommendations:
            new_preference = f"Prompt: {request.prompt}; selected: {recommendations[0].title}; meal: {context.meal_type.value}"
            self.memory.remember(new_preference)

        return AgentRunResponse(
            recommendations=recommendations,
            restaurants=restaurants[:6],
            dineouts=dineouts[:6],
            groceries=groceries[:6],
            actions=actions,
            reasoning=reasoning,
            context=context,
            budget=budget,
            ui_patch={
                "todayPlan": f"{context.meal_type.value.title()} plan updated",
                "budgetRemaining": budget.get("remaining", 0),
                "totalSpent": budget.get("total_spent", budget.get("spent", 0)),
                "copilotState": "ready",
            },
            new_preference=new_preference,
        )

    async def execute_action(self, request: ActionRunRequest) -> dict[str, Any]:
        from tools.swiggy_mcp import book_table, order_groceries, place_food_order

        action = request.action

        try:
            if action.payload.get("intent") == "oauth":
                return {"status": "requires_auth", "intent": "oauth"}
            if action.type == "order_food":
                result = await place_food_order(action.payload, access_token=request.swiggy_token.get("access_token") if request.swiggy_token else None)
                record_action = {
                    "type": action.type,
                    "payload": action.payload,
                    "amount": int(action.payload.get("estimatedPrice") or 0)
                }
                return {"status": "completed", "result": result, "record_action": record_action}
            elif action.type == "order_groceries":
                result = await order_groceries(action.payload.get("items", []), access_token=request.swiggy_token.get("access_token") if request.swiggy_token else None)
            elif action.type == "book_table":
                result = await book_table(action.payload, access_token=request.swiggy_token.get("access_token") if request.swiggy_token else None)
            else:
                result = {"status": "scheduled", "payload": action.payload}
            return {"status": "completed", "result": result}
        except SwiggyAuthRequired:
            return {"status": "requires_auth", "intent": "oauth"}
        except ValueError as exc:
            return {"status": "configuration_required", "message": str(exc)}

    async def _planner(
        self,
        prompt: str,
        context: dict[str, Any],
        preferences: list[str],
    ) -> dict[str, Any]:
        budget = self._extract_budget(prompt)
        base_plan = {
            "tasks": ["identify meal", "fetch Swiggy options", "apply budget", "rank health", "prepare action"],
            "meal_type": str(context["meal_type"]),
            "budget_limit": budget,
            "search_query": self._search_query(prompt, context["meal_type"]),
        }
        if not self.llm:
            return base_plan
        system = (
            "Return compact JSON only with keys search_query, constraints, tasks. "
            "Plan for a dashboard agent that must output structured UI recommendations."
        )
        message = (
            f"Prompt: {prompt}\nContext: {context}\nPast preferences: {preferences}\n"
            f"Default plan: {base_plan}"
        )
        try:
            response = await self.llm.ainvoke([("system", system), ("human", message)])
            parsed = json.loads(str(response.content))
            return {**base_plan, **parsed}
        except Exception:
            return base_plan

    def _normalize_recommendations(
        self,
        result: dict[str, Any],
        budget_limit: int | None,
        category: str = "meal",
    ) -> list[Recommendation]:
        data = result.get("structuredContent") or result.get("data") or result.get("content") or result.get("result") or result
        if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get("type") == "text":
            try:
                parsed = json.loads(data[0].get("text", "{}"))
                if not parsed.get("success", True) or "error" in parsed:
                    import logging
                    logging.error(f"MCP Tool Payload Error: {parsed}")
                data = parsed.get("structuredContent") or parsed.get("data") or parsed
            except Exception:
                pass

        if isinstance(data, dict):
            items = data.get("restaurants") or data.get("cards") or data.get("items") or data.get("products") or data.get("addresses") or []
        else:
            items = data if isinstance(data, list) else []
        normalized: list[Recommendation] = []
        for index, item in enumerate(items[:12]):
            if not isinstance(item, dict):
                continue
            
            info = item.get("info") or item
            
            status = str(info.get("availabilityStatus") or info.get("availability", {}).get("opened", True)).upper()
            if status in {"CLOSED", "FALSE"}:
                continue
            price = _money(info.get("costForTwo") or info.get("price") or info.get("avgCost"))
            normalized.append(
                Recommendation(
                    id=str(info.get("id") or info.get("restaurantId") or f"swiggy-{index}"),
                    title=str(info.get("name") or info.get("title") or "Swiggy pick"),
                    vendor=str(info.get("name") or info.get("restaurantName") or "Swiggy"),
                    description=str(info.get("cuisines") or info.get("description") or "Available nearby"),
                    price=price,
                    rating=_float(info.get("avgRating") or info.get("rating")),
                    eta_minutes=_int(info.get("sla", {}).get("deliveryTime") or info.get("deliveryTime") or info.get("etaMinutes")),
                    tags=["open", "nearby", "Swiggy MCP"],
                    category=category,  # type: ignore[arg-type]
                    source="swiggy",
                    raw=item,
                )
            )
        return normalized

    def _budget_agent(self, recommendations: list[Recommendation], budget: int) -> list[Recommendation]:
        affordable = [item for item in recommendations if item.price <= budget]
        return affordable or sorted(recommendations, key=lambda item: item.price)[:3]

    def _health_agent(self, recommendations: list[Recommendation]) -> list[Recommendation]:
        healthy_terms = ("bowl", "thali", "salad", "protein", "grill", "rice")
        return sorted(
            recommendations,
            key=lambda item: (
                not any(term in item.title.lower() for term in healthy_terms),
                item.price or 999999,
            ),
        )[:4]

    def _actions(
        self,
        recommendations: list[Recommendation],
        status: str,
        auth_required: bool,
    ) -> list[DashboardAction]:
        if auth_required:
            return [
                DashboardAction(
                    id="connect-swiggy",
                    label="Connect Swiggy",
                    type="order_food",
                    status="requires_auth",
                    payload={"intent": "oauth"},
                )
            ]
        if not recommendations:
            return [
                DashboardAction(
                    id="refresh-live-results",
                    label="Search again",
                    type="modify",
                    status=status,
                    payload={"intent": "refresh_live_results"},
                )
            ]
        top = recommendations[0]
        return [
            DashboardAction(
                id=f"order-{top.id}",
                label="Order now",
                type="order_food",
                status=status,
                payload={"recommendationId": top.id, "raw": top.raw, "estimatedPrice": top.price},
            ),
            DashboardAction(
                id="modify-plan",
                label="Modify",
                type="modify",
                status="suggested",
                payload={"intent": "ask_for_alternatives"},
            ),
        ]

    def _reasoning(
        self,
        prompt: str,
        context: dict[str, Any],
        plan: dict[str, Any],
        recommendations: list[Recommendation],
        preferences: list[str],
        auth_required: bool,
        restaurant_count: int,
        dineout_count: int,
        grocery_count: int,
    ) -> str:
        names = ", ".join(item.title for item in recommendations[:3])
        if auth_required:
            return (
                "Swiggy MCP OAuth is required before I can show original restaurant, menu, "
                "Instamart, or Dineout data. I captured live time, location, weather, budget, "
                "and preference context, and queued the connect action."
            )
        return (
            f"Planner interpreted this as a {str(context['meal_type']).replace('MealType.', '')} request and searched for "
            f"{plan.get('search_query')}. Context used: {context['weather']} weather in "
            f"{context['location']} with budget around Rs {plan.get('budget_limit') or context['budget_remaining']}. "
            f"Budget, health, and preference agents ranked {names or 'no live options'}. "
            f"Live MCP sections: {restaurant_count} restaurants, {dineout_count} dineouts, {grocery_count} groceries. "
            f"Preference memory considered {len(preferences)} prior signals."
        )

    async def _try_dineouts(self, access_token: str | None, query: str, context: Any) -> list[Recommendation]:
        try:
            result = await search_dineout(
                {
                    "query": query,
                    "location": context.location,
                    "latitude": context.latitude,
                    "longitude": context.longitude,
                },
                access_token=access_token,
            )
            return self._normalize_recommendations(result, None, "dineout")
        except Exception as exc:
            import logging
            logging.error(f"Error fetching dineouts: {exc}", exc_info=True)
            return []

    async def _try_groceries(
        self,
        access_token: str | None,
        query: str,
        address_id: str | None,
    ) -> list[Recommendation]:
        try:
            result = await search_groceries(query=query, access_token=access_token, address_id=address_id)
            return self._normalize_recommendations(result, None, "grocery")
        except Exception as exc:
            import logging
            logging.error(f"Error fetching groceries: {exc}", exc_info=True)
            return []

    def _extract_budget(self, prompt: str) -> int | None:
        match = re.search(r"(?:under|below|less than|<=?)\s*(?:rs\.?|inr|₹)?\s*(\d+)", prompt, re.I)
        if not match:
            match = re.search(r"(?:rs\.?|inr|₹)\s*(\d+)", prompt, re.I)
        return int(match.group(1)) if match else None

    def _search_query(self, prompt: str, meal_type: str) -> str:
        lower = prompt.lower()
        for term in ("biryani", "thali", "pizza", "burger", "roll", "salad", "dosa", "idli", "rice bowl"):
            if term in lower:
                return term
        defaults = {
            "breakfast": "idli dosa",
            "lunch": "thali rice bowl",
            "snack": "roll sandwich",
            "dinner": "thali biryani",
        }
        normalized_meal = str(meal_type).replace("MealType.", "")
        return defaults.get(normalized_meal, "healthy meal")


def _float(value: Any) -> float | None:
    try:
        return float(value)
    except Exception:
        return None


def _int(value: Any) -> int | None:
    try:
        if isinstance(value, dict):
            value = value.get("deliveryTime") or value.get("slaString") or value.get("min")
        return int(re.sub(r"\D", "", str(value)))
    except Exception:
        return None


def _money(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, int | float):
        return int(value)
    match = re.search(r"\d+", str(value).replace(",", ""))
    return int(match.group(0)) if match else 0
