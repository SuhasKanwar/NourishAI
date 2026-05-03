from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    snack = "snack"
    dinner = "dinner"


class UserContext(BaseModel):
    user_id: str = "demo-user"
    location: str = "Current location"
    latitude: float | None = None
    longitude: float | None = None
    address_id: str | None = None
    meal_type: MealType
    local_time: datetime
    weather: str = "unknown"
    temperature_c: float | None = None
    budget_remaining: int = 1200


class AgentRunRequest(BaseModel):
    prompt: str = Field(..., min_length=2)
    user_id: str = "demo-user"
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address_id: str | None = None
    monthly_budget: int | None = None
    budget_limit: int | None = None
    swiggy_token: dict[str, Any] | None = None
    user_preferences: list[str] = []
    budget_data: dict[str, Any] | None = None


class Recommendation(BaseModel):
    id: str
    title: str
    vendor: str
    description: str
    price: int
    calories: int | None = None
    rating: float | None = None
    eta_minutes: int | None = None
    tags: list[str] = []
    category: Literal["meal", "restaurant", "dineout", "grocery"] = "meal"
    source: Literal["swiggy"] = "swiggy"
    raw: dict[str, Any] = {}


class DashboardAction(BaseModel):
    id: str
    label: str
    type: Literal["order_food", "order_groceries", "book_table", "schedule", "modify"]
    status: Literal["suggested", "requires_auth", "ready", "scheduled", "completed"] = "suggested"
    payload: dict[str, Any] = {}


class AgentRunResponse(BaseModel):
    recommendations: list[Recommendation]
    restaurants: list[Recommendation] = []
    dineouts: list[Recommendation] = []
    groceries: list[Recommendation] = []
    actions: list[DashboardAction]
    reasoning: str
    context: UserContext
    budget: dict[str, Any] = {}
    ui_patch: dict[str, Any] = {}
    new_preference: str | None = None


class ActionRunRequest(BaseModel):
    action: DashboardAction
    user_id: str = "demo-user"
    swiggy_token: dict[str, Any] | None = None
    budget_data: dict[str, Any] | None = None


class BudgetUpdateRequest(BaseModel):
    user_id: str = "demo-user"
    monthly_budget: int = Field(..., gt=0)


class OAuthStartResponse(BaseModel):
    authorization_url: str
    state: str
