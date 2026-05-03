from __future__ import annotations

import json
import re
from typing import Any

from langchain_groq import ChatGroq

from config.settings import get_settings
from memory.vector_memory import PreferenceMemory
from models.schemas import AgentRunRequest, AgentRunResponse, DashboardAction, Recommendation
from services.budget import BudgetService
from services.context import ContextService
from services.oauth import SwiggyOAuthService
from tools.swiggy_mcp import SwiggyAuthRequired, search_dineout, search_groceries, search_restaurants


class NourishAgentOrchestrator:
    def __init__(self) -> None:
        self.context = ContextService()
        self.budget = BudgetService()
        self.memory = PreferenceMemory()
        self.settings = get_settings()
        self.oauth = SwiggyOAuthService()
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
        if request.monthly_budget:
            budget = self.budget.set_monthly_limit(request.user_id, request.monthly_budget)
        else:
            budget = self.budget.summary(request.user_id)
        context.budget_remaining = int(budget["remaining"])
        self.memory.load(request.user_id)
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
                user_id=request.user_id,
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
            recommendations = []
            action_status = "suggested"
            plan["tool_warning"] = str(exc)

        if not auth_required:
            dineouts = await self._try_dineouts(request.user_id, query, context)
            groceries = await self._try_groceries(request.user_id, query, context.address_id)
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

        if recommendations:
            self.memory.remember(
                request.user_id,
                f"Prompt: {request.prompt}; selected: {recommendations[0].title}; meal: {context.meal_type.value}",
            )

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
                "budgetRemaining": budget["remaining"],
                "totalSpent": budget["total_spent"],
                "copilotState": "ready",
            },
        )

    async def execute_action(self, action: DashboardAction, user_id: str) -> dict[str, Any]:
        from tools.swiggy_mcp import book_table, order_groceries, place_food_order

        try:
            if action.payload.get("intent") == "oauth":
                url, state = self.oauth.authorization_url(user_id)
                return {"status": "requires_auth", "authorization_url": url, "state": state}
            if action.type == "order_food":
                result = await place_food_order(action.payload, user_id=user_id)
                self.budget.record_action(
                    user_id,
                    action.type,
                    action.payload,
                    int(action.payload.get("estimatedPrice") or 0),
                )
            elif action.type == "order_groceries":
                result = await order_groceries(action.payload.get("items", []), user_id=user_id)
            elif action.type == "book_table":
                result = await book_table(action.payload, user_id=user_id)
            else:
                result = {"status": "scheduled", "payload": action.payload}
            return {"status": "completed", "result": result}
        except SwiggyAuthRequired:
            try:
                url, state = self.oauth.authorization_url(user_id)
                return {"status": "requires_auth", "authorization_url": url, "state": state}
            except ValueError as exc:
                return {"status": "configuration_required", "message": str(exc)}
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
        data = result.get("data") or result.get("content") or result.get("result") or result
        if isinstance(data, dict):
            items = data.get("restaurants") or data.get("cards") or data.get("items") or []
        else:
            items = data if isinstance(data, list) else []
        normalized: list[Recommendation] = []
        for index, item in enumerate(items[:12]):
            if not isinstance(item, dict):
                continue
            status = str(item.get("availabilityStatus", "OPEN")).upper()
            if status not in {"OPEN", ""}:
                continue
            price = _money(item.get("costForTwo") or item.get("price") or item.get("avgCost"))
            normalized.append(
                Recommendation(
                    id=str(item.get("id") or item.get("restaurantId") or f"swiggy-{index}"),
                    title=str(item.get("name") or item.get("title") or "Swiggy pick"),
                    vendor=str(item.get("name") or item.get("restaurantName") or "Swiggy"),
                    description=str(item.get("cuisines") or item.get("description") or "Available nearby"),
                    price=price,
                    rating=_float(item.get("avgRating") or item.get("rating")),
                    eta_minutes=_int(item.get("sla") or item.get("deliveryTime") or item.get("etaMinutes")),
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

    async def _try_dineouts(self, user_id: str, query: str, context: Any) -> list[Recommendation]:
        try:
            result = await search_dineout(
                {
                    "query": query,
                    "location": context.location,
                    "latitude": context.latitude,
                    "longitude": context.longitude,
                },
                user_id=user_id,
            )
            return self._normalize_recommendations(result, None, "dineout")
        except Exception:
            return []

    async def _try_groceries(
        self,
        user_id: str,
        query: str,
        address_id: str | None,
    ) -> list[Recommendation]:
        try:
            result = await search_groceries(query=query, user_id=user_id, address_id=address_id)
            return self._normalize_recommendations(result, None, "grocery")
        except Exception:
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
