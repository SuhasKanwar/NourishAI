from __future__ import annotations

import itertools
from typing import Any, Literal

import httpx
from langchain_core.tools import tool

from config.settings import get_settings
from services.token_store import TokenStore

McpServer = Literal["food", "im", "dineout"]


class SwiggyAuthRequired(Exception):
    pass


class SwiggyMCPClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.tokens = TokenStore()
        self._ids = itertools.count(1)

    async def call_tool(
        self,
        user_id: str,
        server: McpServer,
        tool_name: str,
        arguments: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        access_token = self.tokens.get_access_token(user_id)
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
                    "Accept": "application/json",
                },
                json=payload,
            )
            if response.status_code in {401, 419}:
                raise SwiggyAuthRequired("Swiggy token expired or revoked.")
            response.raise_for_status()
            data = response.json()
        if "error" in data:
            raise RuntimeError(data["error"].get("message", "Swiggy MCP call failed."))
        return data.get("result", data)


client = SwiggyMCPClient()


async def search_restaurants(
    query: str,
    location: str | None = None,
    user_id: str = "demo-user",
    address_id: str | None = None,
) -> dict[str, Any]:
    if not address_id:
        addresses = await client.call_tool(user_id, "food", "get_addresses", {})
        address_id = _pick_address_id(addresses, location)
    return await client.call_tool(
        user_id,
        "food",
        "search_restaurants",
        {"addressId": address_id, "query": query},
    )


async def get_menu(
    restaurant_id: str,
    user_id: str = "demo-user",
    address_id: str | None = None,
) -> dict[str, Any]:
    args: dict[str, Any] = {"restaurantId": restaurant_id}
    if address_id:
        args["addressId"] = address_id
    return await client.call_tool(user_id, "food", "get_restaurant_menu", args)


async def place_food_order(data: dict[str, Any], user_id: str = "demo-user") -> dict[str, Any]:
    return await client.call_tool(user_id, "food", "place_food_order", data)


async def order_groceries(items: list[dict[str, Any]], user_id: str = "demo-user") -> dict[str, Any]:
    addresses = await client.call_tool(user_id, "im", "get_addresses", {})
    address_id = _pick_address_id(addresses, None)
    products = []
    for item in items:
        found = await client.call_tool(
            user_id,
            "im",
            "search_products",
            {"addressId": address_id, "query": item.get("name", "")},
        )
        products.append(found)
    cart = await client.call_tool(
        user_id,
        "im",
        "update_cart",
        {"addressId": address_id, "items": items},
    )
    checkout = await client.call_tool(user_id, "im", "checkout", {"addressId": address_id})
    return {"products": products, "cart": cart, "checkout": checkout}


async def book_table(details: dict[str, Any], user_id: str = "demo-user") -> dict[str, Any]:
    if "restaurantId" not in details:
        locations = await client.call_tool(user_id, "dineout", "get_saved_locations", {})
        details["location"] = details.get("location") or locations
        search = await client.call_tool(
            user_id,
            "dineout",
            "search_restaurants_dineout",
            details.get("search", {}),
        )
        details["searchResult"] = search
        return search
    return await client.call_tool(user_id, "dineout", "book_table", details)


async def search_dineout(details: dict[str, Any], user_id: str = "demo-user") -> dict[str, Any]:
    return await client.call_tool(user_id, "dineout", "search_restaurants_dineout", details)


async def search_groceries(query: str, user_id: str = "demo-user", address_id: str | None = None) -> dict[str, Any]:
    if not address_id:
        addresses = await client.call_tool(user_id, "im", "get_addresses", {})
        address_id = _pick_address_id(addresses, None)
    return await client.call_tool(
        user_id,
        "im",
        "search_products",
        {"addressId": address_id, "query": query},
    )


def _pick_address_id(addresses: dict[str, Any], location: str | None) -> str:
    data = addresses.get("data") or addresses.get("content") or addresses.get("result") or []
    if isinstance(data, dict):
        data = data.get("addresses", [])
    if not data:
        raise RuntimeError("No Swiggy delivery address found. Add an address in Swiggy first.")
    if location:
        location_lower = location.lower()
        for address in data:
            label = str(address.get("label") or address.get("address") or "").lower()
            if location_lower in label:
                return str(address.get("id") or address.get("addressId"))
    first = data[0]
    return str(first.get("id") or first.get("addressId"))


@tool
async def search_restaurants_tool(query: str, location: str, user_id: str = "demo-user") -> dict[str, Any]:
    """Search Swiggy Food restaurants for delivery."""
    return await search_restaurants(query=query, location=location, user_id=user_id)


@tool
async def get_menu_tool(restaurant_id: str, user_id: str = "demo-user") -> dict[str, Any]:
    """Fetch a Swiggy Food restaurant menu."""
    return await get_menu(restaurant_id=restaurant_id, user_id=user_id)


@tool
async def place_food_order_tool(data: dict[str, Any], user_id: str = "demo-user") -> dict[str, Any]:
    """Place a Swiggy Food order."""
    return await place_food_order(data=data, user_id=user_id)


@tool
async def order_groceries_tool(items: list[dict[str, Any]], user_id: str = "demo-user") -> dict[str, Any]:
    """Order groceries through Swiggy Instamart."""
    return await order_groceries(items=items, user_id=user_id)


@tool
async def book_table_tool(details: dict[str, Any], user_id: str = "demo-user") -> dict[str, Any]:
    """Book a restaurant table through Swiggy Dineout."""
    return await book_table(details=details, user_id=user_id)
