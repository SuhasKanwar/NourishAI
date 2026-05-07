from __future__ import annotations

import json
import re
from typing import Any

from langchain_groq import ChatGroq

from config.settings import get_settings
from memory.vector_memory import PreferenceMemory
from models.schemas import AgentRunRequest, AgentRunResponse, DashboardAction, Recommendation

from tools.swiggy_mcp import SwiggyAuthRequired, search_dineout, search_groceries, search_restaurants, search_menu
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
            # Try search_menu first for specific dishes
            swiggy_result = await search_menu(
                query=query,
                address_id=context.address_id,
                access_token=request.swiggy_token.get("access_token") if request.swiggy_token else None,
            )
            
            # Check if we got results from search_menu
            items = swiggy_result.get("data", {}).get("items") or swiggy_result.get("items")
            if not items:
                # Fallback to search_restaurants if no specific dishes found
                 swiggy_result = await search_restaurants(
                    query=query,
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
        actions = self._actions(recommendations, action_status, auth_required, context.address_id)
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
        from tools.swiggy_mcp import (
            get_restaurant_menu, update_food_cart, get_food_cart, 
            place_food_order, order_groceries, book_table
        )

        action = request.action
        token = request.swiggy_token.get("access_token") if request.swiggy_token else None

        try:
            if action.payload.get("intent") == "oauth":
                return {"status": "requires_auth", "intent": "oauth"}

            if action.type == "view_menu":
                restaurant_id = action.payload.get("recommendationId")
                address_id = action.payload.get("addressId")
                
                # Try search_menu with empty query first as it often returns better structured items
                menu_data = await search_menu(
                    query="", 
                    address_id=address_id, 
                    restaurant_id=restaurant_id, 
                    access_token=token
                )
                
                # Check if we got items
                items = menu_data.get("data", {}).get("items") or menu_data.get("items")
                if not items:
                    # Fallback to get_restaurant_menu
                    menu_data = await get_restaurant_menu(
                        restaurant_id=restaurant_id, 
                        access_token=token, 
                        address_id=address_id
                    )
                
                menu_items = self._normalize_recommendations(menu_data, None, "menu_item")
                actions = []
                for mi in menu_items:
                    mi.raw["restaurantId"] = restaurant_id
                    actions.append(DashboardAction(
                        id=f"add-{mi.id}",
                        label="Add to Cart",
                        type="add_to_cart",
                        status="ready",
                        payload={
                            "recommendationId": mi.id, 
                            "raw": mi.raw, 
                            "estimatedPrice": mi.price, 
                            "restaurantId": restaurant_id, 
                            "addressId": address_id
                        }
                    ))
                
                actions.append(DashboardAction(
                    id="view-cart",
                    label="View Cart",
                    type="view_cart",
                    status="ready",
                    payload={"addressId": address_id}
                ))

                return {
                    "status": "completed",
                    "data": {
                        "menu": [m.model_dump() for m in menu_items],
                        "actions": [a.model_dump() for a in actions],
                        "ui_patch": {"todayPlan": f"Menu loaded for {menu_items[0].vendor if menu_items else 'restaurant'}. Select items."}
                    }
                }

            elif action.type == "add_to_cart":
                item_raw = action.payload.get("raw", {})
                restaurant_id = action.payload.get("restaurantId")
                address_id = action.payload.get("addressId")
                price = int(action.payload.get("estimatedPrice", 0))
                
                # Check budget
                budget_remaining = int(request.budget_data.get("remaining", 0)) if request.budget_data else 0
                if price > budget_remaining:
                    raise ValueError(f"Cannot add item. Price (Rs {price}) exceeds your remaining budget (Rs {budget_remaining}).")

                # Prepare item for cart
                item_to_add = {"itemId": action.payload.get("recommendationId"), "quantity": 1}
                for field in ["variantsV2", "variants", "variations"]:
                    if field in item_raw:
                        item_to_add[field] = item_raw[field]
                        break
                
                await update_food_cart(
                    restaurant_id=restaurant_id,
                    cart_items=[item_to_add],
                    address_id=address_id,
                    access_token=token
                )
                
                # Always get updated cart
                cart_res = await get_food_cart(address_id=address_id, access_token=token)
                cart_data = cart_res.get("data", {}) if isinstance(cart_res, dict) else {}
                cart_total = cart_data.get("cart", {}).get("cartTotal", price)
                
                return {
                    "status": "completed",
                    "data": {"cart": cart_data},
                    "message": f"Added {item_raw.get('name', 'item')} to cart. Cart total is Rs {cart_total}."
                }

            elif action.type == "view_cart":
                address_id = action.payload.get("addressId")
                cart_res = await get_food_cart(address_id=address_id, access_token=token)
                
                actions = [
                    DashboardAction(
                        id="checkout",
                        label="Place Order",
                        type="order_food",
                        status="ready",
                        payload={"addressId": address_id}
                    )
                ]
                
                return {
                    "status": "completed",
                    "data": {
                        "cart": cart_res.get("data", cart_res),
                        "actions": [a.model_dump() for a in actions]
                    }
                }

            elif action.type == "order_food":
                address_id = action.payload.get("addressId")
                result = await place_food_order(address_id=address_id, access_token=token)
                
                # Record action for budget tracking
                cart_total = result.get("data", {}).get("order", {}).get("totalPrice", 0)
                record_action = {
                    "type": action.type,
                    "payload": action.payload,
                    "amount": int(cart_total or action.payload.get("estimatedPrice") or 0)
                }
                return {"status": "completed", "result": result, "record_action": record_action}

            elif action.type == "order_groceries":
                items = action.payload.get("items") or []
                address_id = action.payload.get("addressId")
                result = await order_groceries(items=items, access_token=token, address_id=address_id)
                return {"status": "completed", "result": result}

            elif action.type == "track":
                address_id = action.payload.get("address_id")
                from tools.swiggy_mcp import get_food_orders
                orders_res = await get_food_orders(address_id=address_id, access_token=token)
                
                orders_data = orders_res.get("data", {}).get("orders") or orders_res.get("orders") or []
                if not isinstance(orders_data, list):
                    orders_data = []
                return {
                    "status": "completed",
                    "data": {"orders": orders_data}
                }

            elif action.type == "book_table":
                # Assuming payload has required fields: restaurantId, date, timeSlot, guests
                result = await book_table(
                    restaurant_id=action.payload.get("restaurantId"),
                    date=action.payload.get("date"),
                    time_slot=action.payload.get("timeSlot"),
                    guests=action.payload.get("guests", 2),
                    access_token=token
                )
                return {"status": "completed", "result": result}

            else:
                return {"status": "completed", "message": f"Action {action.type} not implemented."}

        except SwiggyAuthRequired:
            return {"status": "requires_auth", "intent": "oauth"}
        except ValueError as exc:
            return {"status": "configuration_required", "message": str(exc)}
        except Exception as exc:
            import logging
            logging.error(f"Action Execution Error: {exc}", exc_info=True)
            return {"status": "error", "message": str(exc)}

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
        if isinstance(data, dict) and "content" in data:
            data = data["content"]
            
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
            items = (
                data.get("restaurants") or 
                data.get("cards") or 
                data.get("items") or 
                data.get("products") or 
                data.get("addresses") or 
                data.get("locations") or 
                []
            )
            
            # Extract items from categories (common in get_restaurant_menu response)
            categories = data.get("categories") or data.get("data", {}).get("categories")
            if not items and categories and isinstance(categories, list):
                for cat in categories:
                    if isinstance(cat, dict) and "items" in cat and isinstance(cat["items"], list):
                        items.extend(cat["items"])
        else:
            items = data if isinstance(data, list) else []
            
        # Flatten Instamart widgets if necessary
        flattened_items = []
        for item in items:
            if isinstance(item, dict) and "products" in item and isinstance(item["products"], list):
                flattened_items.extend(item["products"])
            else:
                flattened_items.append(item)
        items = flattened_items

        normalized: list[Recommendation] = []
        for index, item in enumerate(items[:12]):
            if not isinstance(item, dict):
                continue
            
            # Instamart items often don't have an 'info' wrapper, they are the item themselves
            info = item.get("info") or item
            
            # Heuristic for name
            name = info.get("name") or info.get("displayName") or info.get("title")
            if not name:
                # Skip items that don't have a name/title to avoid placeholders
                continue
            
            title = str(name)
            vendor = str(info.get("brand") or info.get("name") or info.get("restaurantName") or "Swiggy")
            description = str(info.get("description") or info.get("cuisines") or "Available nearby")
            
            price = _money(info.get("price") or info.get("costForTwo") or info.get("avgCost"))
            image_id = info.get("imageId") or info.get("cloudinaryImageId")
            image_url = f"https://media-assets.swiggy.com/swiggy/image/upload/{image_id}" if image_id else None
            
            normalized.append(
                Recommendation(
                    id=str(info.get("id") or info.get("restaurantId") or info.get("productId") or info.get("spinId") or f"swiggy-{index}"),
                    title=title,
                    vendor=vendor,
                    description=description,
                    price=price,
                    rating=_float(info.get("avgRating") or info.get("rating")),
                    eta_minutes=_int(info.get("sla", {}).get("deliveryTime") or info.get("deliveryTime") or info.get("etaMinutes")),
                    tags=["open", "nearby", "Swiggy MCP"],
                    category=category,  # type: ignore[arg-type]
                    source="swiggy",
                    image_url=image_url,
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
        address_id: str | None = None,
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
        actions = [
            DashboardAction(
                id=f"view-{item.id}",
                label=f"View Menu" if item.category == "restaurant" else f"Order {item.title[:15]}",
                type="view_menu" if item.category == "restaurant" else "order_groceries",
                status=status,
                payload={
                    "recommendationId": item.id, 
                    "raw": item.raw, 
                    "estimatedPrice": item.price,
                    "addressId": address_id
                },
            )
            for item in recommendations
        ]
        actions.append(
            DashboardAction(
                id="modify-plan",
                label="Modify",
                type="modify",
                status="suggested",
                payload={"intent": "ask_for_alternatives"},
            )
        )
        return actions

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
                query=query,
                location=context.location,
                latitude=context.latitude,
                longitude=context.longitude,
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
        # Common food and dietary keywords
        keywords = [
            "biryani", "thali", "pizza", "burger", "roll", "salad", "dosa", "idli", 
            "rice bowl", "protein", "veg", "vegan", "chicken", "paneer", "healthy",
            "diet", "keto", "snack", "dessert", "mutton", "fish", "egg", "chinese",
            "north indian", "south indian", "italian", "pasta", "sandwich", "juice"
        ]
        
        found = [term for term in keywords if term in lower]
        
        if found:
            # If we found specific terms, use them.
            return " ".join(found)
        
        # If no keywords found but prompt is short, it might be the query itself
        words = lower.split()
        if len(words) <= 3 and "want" not in words and "suggest" not in words:
            return lower.strip(" .!?")

        # Fallback to meal defaults
        defaults = {
            "breakfast": "idli dosa",
            "lunch": "thali rice bowl",
            "snack": "roll sandwich",
            "dinner": "thali biryani",
        }
        # Handle string or Enum
        meal_str = str(meal_type).lower()
        for key in defaults:
            if key in meal_str:
                return defaults[key]
        
        return "healthy meal"


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
    if isinstance(value, dict):
        # Handle Instamart price structure: {"mrp": 69, "offerPrice": 69}
        # Or {"mrp": {"amount": 69}}
        price = value.get("offerPrice") or value.get("mrp") or value.get("price") or 0
        if isinstance(price, dict):
            return _money(price.get("amount") or price.get("value") or 0)
        return _money(price)
    
    # Handle list of variations
    if isinstance(value, list) and value:
        return _money(value[0])

    match = re.search(r"\d+", str(value).replace(",", ""))
    return int(match.group(0)) if match else 0
