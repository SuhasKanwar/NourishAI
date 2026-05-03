from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from database import SessionLocal, SwiggyToken
from services.security import decrypt_token, encrypt_token


class TokenStore:
    def save(
        self,
        user_id: str,
        access_token: str,
        expires_in: int,
        scope: str | None = None,
        refresh_token: str | None = None,
    ) -> None:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        with SessionLocal() as session:
            record = session.get(SwiggyToken, user_id) or SwiggyToken(user_id=user_id)
            record.access_token = encrypt_token(access_token)
            record.refresh_token = encrypt_token(refresh_token) if refresh_token else None
            record.expires_at = expires_at
            record.scope = scope
            session.add(record)
            session.commit()

    def get_access_token(self, user_id: str) -> str | None:
        with SessionLocal() as session:
            record = session.get(SwiggyToken, user_id)
            if not record:
                return None
            expires_at = _as_aware(record.expires_at)
            if expires_at <= datetime.now(timezone.utc) + timedelta(seconds=60):
                return None
            return decrypt_token(record.access_token)


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
