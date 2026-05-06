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
            content = data.get("structuredContent") or data.get("data") or data.get("content") or data.get("result")
            if content:
                return self._parse_tool_response(content)
        
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict) and data[0].get("type") == "text":
            try:
                text = data[0].get("text", "")
                if text.strip().startswith(("{", "[")):
                    parsed = json.loads(text)
                    return self._parse_tool_response(parsed)
            except Exception:
                pass
        return data


client = SwiggyMCPClient()


async def search_restaurants(
    query: str,
    location: str | None = None,
    access_token: str | None = None,
    address_id: str | None = None,
) -> dict[str, Any]:
    if not address_id:
        addresses = await client.call_tool(access_token, "food", "get_addresses", {})
        address_id = _pick_address_id(addresses, location)
    return await client.call_tool(
        access_token,
        "food",
        "search_restaurants",
        {"addressId": address_id, "query": query},
    )


async def search_menu(
    query: str,
    address_id: str,
    restaurant_id: str | None = None,
    veg_filter: int | None = None,
    offset: int | None = None,
    access_token: str | None = None,
) -> dict[str, Any]:
    args: dict[str, Any] = {"query": query, "addressId": address_id}
    if restaurant_id:
        args["restaurantIdOfAddedItem"] = restaurant_id
    if veg_filter is not None:
        args["vegFilter"] = veg_filter
    if offset is not None:
        args["offset"] = offset
    return await client.call_tool(access_token, "food", "search_menu", args)


async def get_menu(
    restaurant_id: str,
    access_token: str | None = None,
    address_id: str | None = None,
) -> dict[str, Any]:
    args: dict[str, Any] = {"restaurantId": restaurant_id}
    if address_id:
        args["addressId"] = address_id
    return await client.call_tool(access_token, "food", "get_restaurant_menu", args)


async def place_food_order(data: dict[str, Any], access_token: str | None = None) -> dict[str, Any]:
    return await client.call_tool(access_token, "food", "place_food_order", data)


async def order_groceries(items: list[dict[str, Any]], access_token: str | None = None) -> dict[str, Any]:
    addresses = await client.call_tool(access_token, "im", "get_addresses", {})
    address_id = _pick_address_id(addresses, None)
    products = []
    for item in items:
        found = await client.call_tool(
            access_token,
            "im",
            "search_products",
            {"addressId": address_id, "query": item.get("name", "")},
        )
        products.append(found)
    cart = await client.call_tool(
        access_token,
        "im",
        "update_cart",
        {"addressId": address_id, "items": items},
    )
    checkout = await client.call_tool(access_token, "im", "checkout", {"addressId": address_id})
    return {"products": products, "cart": cart, "checkout": checkout}


async def book_table(details: dict[str, Any], access_token: str | None = None) -> dict[str, Any]:
    if "restaurantId" not in details:
        locations = await client.call_tool(access_token, "dineout", "get_saved_locations", {})
        details["location"] = details.get("location") or locations
        search = await client.call_tool(
            access_token,
            "dineout",
            "search_restaurants_dineout",
            details.get("search", {}),
        )
        details["searchResult"] = search
        return search
    return await client.call_tool(access_token, "dineout", "book_table", details)


async def search_dineout(details: dict[str, Any], access_token: str | None = None) -> dict[str, Any]:
    return await client.call_tool(access_token, "dineout", "search_restaurants_dineout", details)


async def search_groceries(query: str, access_token: str | None = None, address_id: str | None = None) -> dict[str, Any]:
    if not address_id:
        addresses = await client.call_tool(access_token, "im", "get_addresses", {})
        address_id = _pick_address_id(addresses, None)
    return await client.call_tool(
        access_token,
        "im",
        "search_products",
        {"addressId": address_id, "query": query},
    )


def _pick_address_id(addresses: Any, location: str | None) -> str:
    items = []
    if isinstance(addresses, dict):
        items = addresses.get("addresses") or addresses.get("items") or addresses.get("data") or []
    elif isinstance(addresses, list):
        items = addresses
    
    if not items or not isinstance(items, list):
        return "default"
    
    # Simple heuristic: first address
    first = items[0]
    if isinstance(first, dict):
        return str(first.get("id") or first.get("addressId") or "default")
    return "default"


@tool
async def search_restaurants_tool(query: str, location: str, access_token: str | None = None) -> dict[str, Any]:
    """Search Swiggy Food restaurants for delivery."""
    return await search_restaurants(query=query, location=location, access_token=access_token)


@tool
async def get_menu_tool(restaurant_id: str, access_token: str | None = None) -> dict[str, Any]:
    """Fetch a Swiggy Food restaurant menu."""
    return await get_menu(restaurant_id=restaurant_id, access_token=access_token)


@tool
async def place_food_order_tool(data: dict[str, Any], access_token: str | None = None) -> dict[str, Any]:
    """Place a Swiggy Food order."""
    return await place_food_order(data=data, access_token=access_token)


@tool
async def order_groceries_tool(items: list[dict[str, Any]], access_token: str | None = None) -> dict[str, Any]:
    """Order groceries through Swiggy Instamart."""
    return await order_groceries(items=items, access_token=access_token)


@tool
async def book_table_tool(details: dict[str, Any], access_token: str | None = None) -> dict[str, Any]:
    """Book a restaurant table through Swiggy Dineout."""
    return await book_table(details=details, access_token=access_token)

@tool
async def get_addresses_tool(access_token: str | None = None) -> dict[str, Any]:
    """Get all saved delivery addresses for the authenticated Swiggy user."""
    return await client.call_tool(access_token, "food", "get_addresses", {})

@tool
async def search_menu_tool(query: str, address_id: str, restaurant_id: str | None = None, veg_filter: int | None = None, offset: int | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Search for dishes and menu items to order for food delivery."""
    args: dict[str, Any] = {"query": query, "addressId": address_id}
    if restaurant_id: args["restaurantIdOfAddedItem"] = restaurant_id
    if veg_filter is not None: args["vegFilter"] = veg_filter
    if offset is not None: args["offset"] = offset
    return await client.call_tool(access_token, "food", "search_menu", args)

@tool
async def apply_food_coupon_tool(coupon_code: str, address_id: str, cart_id: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Apply coupon code or discount to food delivery order."""
    args: dict[str, Any] = {"couponCode": coupon_code, "addressId": address_id}
    if cart_id: args["cartId"] = cart_id
    return await client.call_tool(access_token, "food", "apply_food_coupon", args)

@tool
async def fetch_food_coupons_tool(restaurant_id: str, address_id: str, coupon_code: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Get available coupons and offers for food delivery order."""
    args: dict[str, Any] = {"restaurantId": restaurant_id, "addressId": address_id}
    if coupon_code: args["couponCode"] = coupon_code
    return await client.call_tool(access_token, "food", "fetch_food_coupons", args)

@tool
async def flush_food_cart_tool(access_token: str | None = None) -> dict[str, Any]:
    """Clear or empty the food delivery cart."""
    return await client.call_tool(access_token, "food", "flush_food_cart", {})

@tool
async def get_food_cart_tool(address_id: str, restaurant_name: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Get current food delivery cart with all items."""
    args: dict[str, Any] = {"addressId": address_id}
    if restaurant_name: args["restaurantName"] = restaurant_name
    return await client.call_tool(access_token, "food", "get_food_cart", args)

@tool
async def update_food_cart_tool(restaurant_id: str, cart_items: list[dict[str, Any]], address_id: str, restaurant_name: str | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Add items to food delivery cart or update cart contents."""
    args: dict[str, Any] = {"restaurantId": restaurant_id, "cartItems": cart_items, "addressId": address_id}
    if restaurant_name: args["restaurantName"] = restaurant_name
    return await client.call_tool(access_token, "food", "update_food_cart", args)

@tool
async def get_food_order_details_tool(order_id: str, access_token: str | None = None) -> dict[str, Any]:
    """Get detailed information about a specific food delivery order."""
    return await client.call_tool(access_token, "food", "get_food_order_details", {"orderId": order_id})

@tool
async def get_food_orders_tool(address_id: str, order_count: int | None = None, access_token: str | None = None) -> dict[str, Any]:
    """Get active food delivery orders and order status."""
    args: dict[str, Any] = {"addressId": address_id}
    if order_count: args["orderCount"] = order_count
    return await client.call_tool(access_token, "food", "get_food_orders", args)

@tool
async def track_food_order_tool(order_id: str, access_token: str | None = None) -> dict[str, Any]:
    """Track food delivery order status and delivery progress."""
    return await client.call_tool(access_token, "food", "track_food_order", {"orderId": order_id})
