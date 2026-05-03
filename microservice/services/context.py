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
        latitude: float | None = None,
        longitude: float | None = None,
        address_id: str | None = None,
        budget_limit: int | None = None,
    ) -> UserContext:
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        resolved_location = location or self._format_location(latitude, longitude)
        weather, temperature = await self._weather(latitude, longitude)
        return UserContext(
            user_id=user_id,
            location=resolved_location,
            latitude=latitude,
            longitude=longitude,
            address_id=address_id,
            meal_type=infer_meal_type(now, prompt),
            local_time=now,
            weather=weather,
            temperature_c=temperature,
            budget_remaining=budget_limit or 1200,
        )

    async def _weather(self, latitude: float | None, longitude: float | None) -> tuple[str, float | None]:
        settings = get_settings()
        if not settings.enable_weather_api or latitude is None or longitude is None:
            return "location weather unavailable", None
        try:
            return await asyncio.wait_for(self._fetch_weather(latitude, longitude), timeout=3)
        except Exception:
            return "weather unavailable", None

    async def _fetch_weather(self, latitude: float, longitude: float) -> tuple[str, float | None]:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=2) as client:
            response = await client.get(
                settings.weather_api_url,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,weather_code",
                },
            )
            response.raise_for_status()
            current = response.json()["current"]
            return _weather_label(int(current.get("weather_code", -1))), float(current["temperature_2m"])

    def _format_location(self, latitude: float | None, longitude: float | None) -> str:
        if latitude is None or longitude is None:
            return "Current location unavailable"
        return f"{latitude:.4f}, {longitude:.4f}"


def _weather_label(code: int) -> str:
    if code == 0:
        return "clear"
    if code in {1, 2, 3}:
        return "partly cloudy"
    if code in {45, 48}:
        return "fog"
    if code in {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82}:
        return "rain"
    if code in {71, 73, 75, 77, 85, 86}:
        return "snow"
    if code in {95, 96, 99}:
        return "thunderstorm"
    return "weather available"
