from __future__ import annotations

import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx

from config.settings import get_settings
from services.token_store import TokenStore


_pkce_sessions: dict[str, dict[str, str]] = {}


def _challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


class SwiggyOAuthService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.tokens = TokenStore()

    def authorization_url(self, user_id: str) -> tuple[str, str]:
        if not self.settings.swiggy_client_id:
            raise ValueError("SWIGGY_CLIENT_ID is required for Swiggy OAuth.")
        state = secrets.token_urlsafe(24)
        verifier = secrets.token_urlsafe(48)
        _pkce_sessions[state] = {"verifier": verifier, "user_id": user_id}
        query = urlencode(
            {
                "response_type": "code",
                "client_id": self.settings.swiggy_client_id,
                "redirect_uri": self.settings.swiggy_redirect_uri,
                "code_challenge": _challenge(verifier),
                "code_challenge_method": "S256",
                "state": state,
                "scope": self.settings.swiggy_scopes,
            }
        )
        return f"{self.settings.swiggy_base_url}/auth/authorize?{query}", state

    async def callback(self, code: str, state: str) -> dict[str, str]:
        session = _pkce_sessions.pop(state, None)
        if not session:
            raise ValueError("Invalid or expired OAuth state.")
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{self.settings.swiggy_base_url}/auth/token",
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "code_verifier": session["verifier"],
                    "client_id": self.settings.swiggy_client_id,
                    "redirect_uri": self.settings.swiggy_redirect_uri,
                },
            )
            response.raise_for_status()
            payload = response.json()
        self.tokens.save(
            user_id=session["user_id"],
            access_token=payload["access_token"],
            expires_in=int(payload.get("expires_in", 432000)),
            scope=payload.get("scope"),
            refresh_token=payload.get("refresh_token"),
        )
        return {"status": "connected", "scope": payload.get("scope", "")}
