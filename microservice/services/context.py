from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo
import asyncio

import httpx

from config.settings import get_settings
from models.schemas import MealType, UserContext


def infer_meal_type(now: datetime, prompt: str = "") -> MealType:
    lower = prompt.lower()
    for meal in MealType:
        if meal.value in lower:
            return meal
    hour = now.hour
    if 5 <= hour < 11:
        return MealType.breakfast
    if 11 <= hour < 16:
        return MealType.lunch
    if 16 <= hour < 19:
        return MealType.snack
    return MealType.dinner


class ContextService:
    async def collect(
        self,
        user_id: str,
        prompt: str = "",
        location: str | None = None,
        address_id: str | None = None,
        budget_limit: int | None = None,
    ) -> UserContext:
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        resolved_location = location or "Bengaluru, India"
        weather, temperature = await self._weather(resolved_location)
        return UserContext(
            user_id=user_id,
            location=resolved_location,
            address_id=address_id,
            meal_type=infer_meal_type(now, prompt),
            local_time=now,
            weather=weather,
            temperature_c=temperature,
            budget_remaining=budget_limit or 1200,
        )

    async def _weather(self, location: str) -> tuple[str, float | None]:
        settings = get_settings()
        if not settings.enable_weather_api:
            return "seasonal", None
        try:
            return await asyncio.wait_for(self._fetch_weather(location), timeout=3)
        except Exception:
            return "seasonal", None

    async def _fetch_weather(self, location: str) -> tuple[str, float | None]:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=2) as client:
            response = await client.get(
                f"{settings.weather_api_url}/{location}",
                params={"format": "j1"},
            )
            response.raise_for_status()
            current = response.json()["current_condition"][0]
            return current["weatherDesc"][0]["value"], float(current["temp_C"])
