from __future__ import annotations

import itertools
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
                    "Accept": "application/json",
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
        return data.get("result", data)


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


def _pick_address_id(addresses: dict[str, Any], location: str | None) -> str:
    data = addresses.get("data") or addresses.get("content") or addresses.get("result") or []
    if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get("type") == "text":
        try:
            import json
            parsed = json.loads(data[0].get("text", "{}"))
            data = parsed.get("data", parsed)
        except Exception:
            pass
            
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
