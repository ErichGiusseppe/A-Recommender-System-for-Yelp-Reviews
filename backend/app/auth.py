"""
JWT authentication helpers for Lantern.

Security model: educational prototype — passwords stored/compared in plain text.
Demo accounts are hardcoded; real Yelp users authenticate with their Yelp name.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from fastapi import Depends, Request
from jose import JWTError, jwt

# ── Config ──────────────────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("JWT_SECRET", "lantern-dev-secret-change-before-deploy-2026")
ALGORITHM   = "HS256"
EXPIRE_HOURS = 24

DATA_DIR    = Path(__file__).parent.parent / "data"
PROFILES_PATH = DATA_DIR / "user_profiles_map.json"

# Lazy-loaded Yelp user index {user_id: name}
_yelp_users: Optional[dict[str, str]] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _profiles() -> dict:
    if PROFILES_PATH.exists():
        with open(PROFILES_PATH, encoding="utf-8-sig") as f:
            return json.load(f)
    return {}


def _get_yelp_users() -> dict[str, str]:
    """Lazy-load user_id→name from Yelp dataset (only if file exists)."""
    global _yelp_users
    if _yelp_users is not None:
        return _yelp_users
    yelp_path = DATA_DIR / "real" / "structured" / "yelp_academic_dataset_user.json"
    if not yelp_path.exists():
        _yelp_users = {}
        return _yelp_users
    _yelp_users = {}
    with open(yelp_path, encoding="utf-8") as f:
        for line in f:
            try:
                u = json.loads(line)
                _yelp_users[u["user_id"]] = u.get("name", "")
            except Exception:
                continue
    return _yelp_users


def create_access_token(user_id: str, username: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS)
    payload = {"user_id": user_id, "username": username, "exp": exp}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def verify_user(username: str, password: str) -> Optional[dict]:
    """
    Returns {user_id, name} if credentials are valid, else None.
    Priority: demo profiles → real Yelp users.
    """
    profiles = _profiles()

    # Demo account check
    if username in profiles:
        p = profiles[username]
        if p.get("password") == password:
            return {"user_id": p["user_id"], "name": p["name"]}
        return None

    # Real Yelp user: username IS the user_id, password IS the name
    yelp = _get_yelp_users()
    real_name = yelp.get(username, "").strip()
    if real_name and real_name == password.strip():
        return {"user_id": username, "name": real_name}

    return None


def get_demo_accounts() -> list[dict]:
    """Public list of demo accounts (no passwords)."""
    profiles = _profiles()
    return [
        {"user_id": p["user_id"], "name": p["name"], "avatar": p.get("avatar", p["name"][:2].upper())}
        for p in profiles.values()
        if p.get("is_demo")
    ]


# ── FastAPI dependencies ─────────────────────────────────────────────────────

def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def get_current_user(request: Request) -> SimpleNamespace:
    """
    Soft auth dependency — never raises 401.
    Returns authenticated user or guest (is_guest=True, user_id='new_visitor').
    """
    token = _extract_token(request)
    if token:
        payload = decode_token(token)
        if payload:
            return SimpleNamespace(
                user_id=payload["user_id"],
                username=payload.get("username", payload["user_id"]),
                is_guest=False,
            )
    return SimpleNamespace(user_id="new_visitor", username="guest", is_guest=True)


def require_auth(request: Request) -> SimpleNamespace:
    """Hard auth dependency — raises 401 if no valid token."""
    from fastapi import HTTPException, status
    token = _extract_token(request)
    if token:
        payload = decode_token(token)
        if payload:
            return SimpleNamespace(
                user_id=payload["user_id"],
                username=payload.get("username", payload["user_id"]),
                is_guest=False,
            )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
