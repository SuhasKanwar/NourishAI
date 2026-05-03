from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./nourishai.dev.db")
    swiggy_base_url: str = os.getenv("SWIGGY_MCP_BASE_URL", "https://mcp.swiggy.com")
    swiggy_client_id: str | None = os.getenv("SWIGGY_CLIENT_ID")
    swiggy_redirect_uri: str = os.getenv(
        "SWIGGY_REDIRECT_URI",
        "http://localhost:8000/mcp/auth/callback",
    )
    swiggy_scopes: str = os.getenv(
        "SWIGGY_SCOPES",
        "mcp:tools mcp:resources mcp:prompts",
    )
    token_encryption_key: str | None = os.getenv("TOKEN_ENCRYPTION_KEY")
    weather_api_url: str = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")
    enable_weather_api: bool = os.getenv("ENABLE_WEATHER_API", "true").lower() == "true"


@lru_cache
def get_settings() -> Settings:
    return Settings()
