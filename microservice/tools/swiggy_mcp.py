from __future__ import annotations

import itertools
import json
import re
from typing import Any, Literal

import httpx
from langchain_core.tools import tool

from config.settings import get_settings

McpServer = Literal["food", "im", "dineout"]


class SwiggyAuthRequired(Exception):
    pass


class SwiggyMCPClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._ids = itertools.count(1)

    async def call_tool(
        self,
        access_token: str | None,
        server: McpServer,
        tool_name: str,
        arguments: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not access_token:
            raise SwiggyAuthRequired("Swiggy OAuth connection required.")

        payload = {
            "jsonrpc": "2.0",
            "id": next(self._ids),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {},
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.settings.swiggy_base_url}/{server}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                },
                json=payload,
            )
            if response.status_code in {401, 419}:
                raise SwiggyAuthRequired("Swiggy token expired or revoked.")
            
            try:
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                import logging
                logging.error(f"Swiggy API Error: {response.status_code} {response.text}")
                raise e
            
            import logging
            logging.info(f"Swiggy API Response for {tool_name}: {str(data)[:500]}")
            
        if "error" in data:
            raise RuntimeError(data["error"].get("message", "Swiggy MCP call failed."))
        
        result = data.get("result", data)
        return self._parse_tool_response(result)

    def _parse_tool_response(self, data: Any) -> Any:
        if isinstance(data, dict):
            # If it's already a structured response with success/error, return it
            if "success" in data or "error" in data:
                return data
            
            content = data.get("structuredContent") or data.get("data") or data.get("content") or data.get("result")
            if content:
                return self._parse_tool_response(content)
        
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict) and data[0].get("type") == "text":
                text = data[0].get("text", "")
                try:
                    if text.strip().startswith(("{", "[")):
                        parsed = json.loads(text)
                        return self._parse_tool_response(parsed)
                except Exception:
                    pass
                # If it's not JSON but text, return it as a message
                return {"success": False, "message": text}
        
        # Fallback
        return data if isinstance(data, dict) else {"success": True, "data": data}

    async def ensure_address_id(self, access_token: str | None, server: McpServer, address_id: str | None) -> str:
        if address_id:
            return address_id
        
        tool_name = "get_addresses" if server != "dineout" else "get_saved_locations"
        addresses = await self.call_tool(access_token, server, tool_name, {})
        return _pick_address_id(addresses)


client = SwiggyMCPClient()

def _pick_address_id(addresses: Any) -> str:
    items = []
    if isinstance(addresses, dict):
        items = (
            addresses.get("addresses") or 
            addresses.get("locations") or 
            addresses.get("items") or 
            addresses.get("data", {}).get("addresses") or 
            addresses.get("data", {}).get("locations") or 
            []
        )
    elif isinstance(addresses, list):
        items = addresses
    
    if not items or not isinstance(items, list):
        return "" # Return empty so ensure_address_id can fail or caller can handle
    
    # Simple heuristic: first address
    try:
        first = items[0]
        if isinstance(first, dict):
            return str(first.get("id") or first.get("addressId") or "")
    except Exception:
        pass
    return ""

# --- Food Tools ---

async def get_addresses(access_token: str | None = None) -> dict[str, Any]:
    return await client.call_tool(access_token, "food", "get_addresses", {})

async def search_restaurants(
    query: str,
    access_token: str | None = None,
    address_id: str | None = None,
) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    return await client.call_tool(
        access_token,
        "food",
        "search_restaurants",
        {"addressId": address_id, "query": query},
    )

async def search_menu(
    query: str,
    address_id: str | None = None,
    restaurant_id: str | None = None,
    veg_filter: int | None = None,
    offset: int | None = None,
    access_token: str | None = None,
) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {"query": query, "addressId": address_id}
    if restaurant_id:
        args["restaurantIdOfAddedItem"] = restaurant_id
    if veg_filter is not None:
        args["vegFilter"] = veg_filter
    if offset is not None:
        args["offset"] = offset
    return await client.call_tool(access_token, "food", "search_menu", args)

async def get_restaurant_menu(
    restaurant_id: str,
    access_token: str | None = None,
    address_id: str | None = None,
) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    return await client.call_tool(access_token, "food", "get_restaurant_menu", {"restaurantId": restaurant_id, "addressId": address_id})

async def get_food_cart(address_id: str | None = None, restaurant_name: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {"addressId": address_id}
    if restaurant_name:
        args["restaurantName"] = restaurant_name
    return await client.call_tool(access_token, "food", "get_food_cart", args)

async def update_food_cart(
    restaurant_id: str,
    cart_items: list[dict[str, Any]],
    address_id: str | None = None,
    restaurant_name: str | None = None,
    access_token: str | None = None,
) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {
        "restaurantId": restaurant_id,
        "cartItems": cart_items,
        "addressId": address_id
    }
    if restaurant_name:
        args["restaurantName"] = restaurant_name
    return await client.call_tool(access_token, "food", "update_food_cart", args)

async def flush_food_cart(access_token: str | None = None) -> dict[str, Any]:
    return await client.call_tool(access_token, "food", "flush_food_cart", {})

async def apply_food_coupon(coupon_code: str, address_id: str | None = None, cart_id: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {"couponCode": coupon_code, "addressId": address_id}
    if cart_id:
        args["cartId"] = cart_id
    return await client.call_tool(access_token, "food", "apply_food_coupon", args)

async def fetch_food_coupons(restaurant_id: str, address_id: str | None = None, coupon_code: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {"restaurantId": restaurant_id, "addressId": address_id}
    if coupon_code:
        args["couponCode"] = coupon_code
    return await client.call_tool(access_token, "food", "fetch_food_coupons", args)

async def place_food_order(address_id: str | None = None, payment_method: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {"addressId": address_id}
    if payment_method:
        args["paymentMethod"] = payment_method
    return await client.call_tool(access_token, "food", "place_food_order", args)

async def get_food_orders(address_id: str | None = None, order_count: int | None = None, access_token: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "food", address_id)
    args: dict[str, Any] = {"addressId": address_id}
    if order_count:
        args["orderCount"] = order_count
    return await client.call_tool(access_token, "food", "get_food_orders", args)

async def get_food_order_details(order_id: str, access_token: str | None = None) -> dict[str, Any]:
    return await client.call_tool(access_token, "food", "get_food_order_details", {"orderId": order_id})

async def track_food_order(order_id: str, access_token: str | None = None) -> dict[str, Any]:
    return await client.call_tool(access_token, "food", "track_food_order", {"orderId": order_id})

# --- Instamart Tools ---

async def search_groceries(query: str, access_token: str | None = None, address_id: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "im", address_id)
    return await client.call_tool(
        access_token,
        "im",
        "search_products",
        {"addressId": address_id, "query": query},
    )

async def order_groceries(items: list[dict[str, Any]], access_token: str | None = None, address_id: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "im", address_id)
    cart = await client.call_tool(
        access_token,
        "im",
        "update_cart",
        {"addressId": address_id, "items": items},
    )
    checkout = await client.call_tool(access_token, "im", "checkout", {"addressId": address_id})
    return {"cart": cart, "checkout": checkout}

# --- Dineout Tools ---

async def search_dineout(query: str, location: str | None = None, latitude: float | None = None, longitude: float | None = None, access_token: str | None = None) -> dict[str, Any]:
    address_id = await client.ensure_address_id(access_token, "dineout", None)
    args: dict[str, Any] = {"query": query}
    if address_id: args["addressId"] = address_id
    if location: args["location"] = location
    if latitude: args["latitude"] = latitude
    if longitude: args["longitude"] = longitude
    return await client.call_tool(access_token, "dineout", "search_restaurants_dineout", args)

async def book_table(restaurant_id: str, date: str, time_slot: str, guests: int, access_token: str | None = None) -> dict[str, Any]:
    args = {
        "restaurantId": restaurant_id,
        "date": date,
        "timeSlot": time_slot,
        "guests": guests
    }
    return await client.call_tool(access_token, "dineout", "book_table", args)

# --- LangChain Tools (Wrappers) ---

@tool
async def search_restaurants_tool(query: str, access_token: str | None = None, address_id: str | None = None) -> dict[str, Any]:
    """Search Swiggy Food restaurants for delivery."""
    return await search_restaurants(query=query, access_token=access_token, address_id=address_id)

@tool
async def search_menu_tool(query: str, address_id: str | None = None, restaurant_id: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Search for dishes and menu items across restaurants or within a specific restaurant."""
    return await search_menu(query=query, address_id=address_id, restaurant_id=restaurant_id, access_token=access_token)

@tool
async def get_restaurant_menu_tool(restaurant_id: str, access_token: str | None = None, address_id: str | None = None) -> dict[str, Any]:
    """Fetch the complete menu of a Swiggy Food restaurant."""
    return await get_restaurant_menu(restaurant_id=restaurant_id, access_token=access_token, address_id=address_id)

@tool
async def update_food_cart_tool(restaurant_id: str, cart_items: list[dict[str, Any]], address_id: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Add items to food delivery cart or update cart contents."""
    return await update_food_cart(restaurant_id=restaurant_id, cart_items=cart_items, address_id=address_id, access_token=access_token)

@tool
async def get_food_cart_tool(address_id: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Get current food delivery cart."""
    return await get_food_cart(address_id=address_id, access_token=access_token)

@tool
async def place_food_order_tool(address_id: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Place the food delivery order."""
    return await place_food_order(address_id=address_id, access_token=access_token)

@tool
async def search_groceries_tool(query: str, access_token: str | None = None, address_id: str | None = None) -> dict[str, Any]:
    """Search for products on Swiggy Instamart."""
    return await search_groceries(query=query, access_token=access_token, address_id=address_id)

@tool
async def search_dineout_tool(query: str, location: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Search for restaurants on Swiggy Dineout."""
    return await search_dineout(query=query, location=location, access_token=access_token)
