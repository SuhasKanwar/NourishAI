from __future__ import annotations

import json
import re
from typing import Any

from langchain_groq import ChatGroq

from config.settings import get_settings
from memory.vector_memory import PreferenceMemory
from models.schemas import AgentRunRequest, AgentRunResponse, DashboardAction, Recommendation
from services.context import ContextService
from services.oauth import SwiggyOAuthService
from tools.swiggy_mcp import SwiggyAuthRequired, search_restaurants


class NourishAgentOrchestrator:
    def __init__(self) -> None:
        self.context = ContextService()
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
            address_id=request.address_id,
            budget_limit=request.budget_limit,
        )
        self.memory.load(request.user_id)
        preferences = self.memory.search(request.prompt)
        plan = await self._planner(request.prompt, context.model_dump(), preferences)
        query = plan.get("search_query") or context.meal_type.value

        try:
            swiggy_result = await search_restaurants(
                query=query,
                location=context.location,
                user_id=request.user_id,
                address_id=context.address_id,
            )
            recommendations = self._normalize_recommendations(swiggy_result, request.budget_limit)
            action_status = "ready"
        except SwiggyAuthRequired:
            recommendations = self._fallback_recommendations(query, request.budget_limit)
            action_status = "requires_auth"
        except Exception as exc:
            recommendations = self._fallback_recommendations(query, request.budget_limit)
            action_status = "suggested"
            plan["tool_warning"] = str(exc)

        recommendations = self._budget_agent(recommendations, request.budget_limit or context.budget_remaining)
        recommendations = self._health_agent(recommendations)
        actions = self._actions(recommendations, action_status)
        reasoning = self._reasoning(request.prompt, context.model_dump(), plan, recommendations, preferences)

        if recommendations:
            self.memory.remember(
                request.user_id,
                f"Prompt: {request.prompt}; selected: {recommendations[0].title}; meal: {context.meal_type.value}",
            )

        return AgentRunResponse(
            recommendations=recommendations,
            actions=actions,
            reasoning=reasoning,
            context=context,
            ui_patch={
                "todayPlan": f"{context.meal_type.value.title()} plan updated",
                "budgetRemaining": max(
                    context.budget_remaining - (recommendations[0].price if recommendations else 0),
                    0,
                ),
                "copilotState": "ready",
            },
        )

    async def execute_action(self, action: DashboardAction, user_id: str) -> dict[str, Any]:
        from tools.swiggy_mcp import book_table, order_groceries, place_food_order

        try:
            if action.type == "order_food":
                result = await place_food_order(action.payload, user_id=user_id)
            elif action.type == "order_groceries":
                result = await order_groceries(action.payload.get("items", []), user_id=user_id)
            elif action.type == "book_table":
                result = await book_table(action.payload, user_id=user_id)
            else:
                result = {"status": "scheduled", "payload": action.payload}
            return {"status": "completed", "result": result}
        except SwiggyAuthRequired:
            url, state = self.oauth.authorization_url(user_id)
            return {"status": "requires_auth", "authorization_url": url, "state": state}

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
    ) -> list[Recommendation]:
        data = result.get("data") or result.get("content") or result.get("result") or result
        if isinstance(data, dict):
            items = data.get("restaurants") or data.get("cards") or data.get("items") or []
        else:
            items = data if isinstance(data, list) else []
        normalized: list[Recommendation] = []
        for index, item in enumerate(items[:8]):
            if not isinstance(item, dict):
                continue
            status = str(item.get("availabilityStatus", "OPEN")).upper()
            if status not in {"OPEN", ""}:
                continue
            price = int(
                item.get("costForTwo")
                or item.get("price")
                or item.get("avgCost")
                or max(120, (budget_limit or 250) * 0.75)
            )
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
                    source="swiggy",
                    raw=item,
                )
            )
        return normalized or self._fallback_recommendations("dinner", budget_limit)

    def _fallback_recommendations(self, query: str, budget_limit: int | None) -> list[Recommendation]:
        cap = budget_limit or 220
        return [
            Recommendation(
                id="fallback-thali",
                title=f"{query.title()} thali",
                vendor="Swiggy MCP pending auth",
                description="Balanced meal candidate ready to replace with live Swiggy results after OAuth.",
                price=min(cap, 180),
                calories=620,
                rating=4.3,
                eta_minutes=28,
                tags=["budget-fit", "balanced", "auth-needed"],
                source="fallback",
            ),
            Recommendation(
                id="fallback-bowl",
                title="Protein rice bowl",
                vendor="Swiggy MCP pending auth",
                description="High-satiety option selected by the budget and health agents.",
                price=min(cap, 195),
                calories=540,
                rating=4.4,
                eta_minutes=24,
                tags=["healthy", "under-budget"],
                source="fallback",
            ),
        ]

    def _budget_agent(self, recommendations: list[Recommendation], budget: int) -> list[Recommendation]:
        affordable = [item for item in recommendations if item.price <= budget]
        return affordable or sorted(recommendations, key=lambda item: item.price)[:3]

    def _health_agent(self, recommendations: list[Recommendation]) -> list[Recommendation]:
        healthy_terms = ("bowl", "thali", "salad", "protein", "grill", "rice")
        return sorted(
            recommendations,
            key=lambda item: (
                not any(term in item.title.lower() for term in healthy_terms),
                item.price,
            ),
        )[:4]

    def _actions(self, recommendations: list[Recommendation], status: str) -> list[DashboardAction]:
        if not recommendations:
            return []
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
    ) -> str:
        names = ", ".join(item.title for item in recommendations[:3])
        return (
            f"Planner interpreted this as a {str(context['meal_type']).replace('MealType.', '')} request and searched for "
            f"{plan.get('search_query')}. Context used: {context['weather']} weather in "
            f"{context['location']} with budget around Rs {plan.get('budget_limit') or context['budget_remaining']}. "
            f"Budget, health, and preference agents ranked {names or 'no live options'}. "
            f"Preference memory considered {len(preferences)} prior signals."
        )

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
        return defaults.get(meal_type, "healthy meal")


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
