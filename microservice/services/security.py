from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from config.settings import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    key = settings.token_encryption_key
    if not key:
        digest = hashlib.sha256(b"nourishai-local-dev-token-key").digest()
        key = base64.urlsafe_b64encode(digest).decode()
    return Fernet(key.encode())


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()
