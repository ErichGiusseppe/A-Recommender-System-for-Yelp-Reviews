"""
Recommender package — public API.

All imports from outside this package go through here.
Routers use: from app.services import recommender
Then call:   recommender.startup(), recommender.inject_scores(), etc.

Internal modules (_state, _loaders, svdpp_engine, coldstart, hybrid_scorer)
are implementation details and should not be imported directly by routers.
"""
from __future__ import annotations

from typing import Optional

from app.config import settings
from . import _state as state
from ._loaders import load_parquets, load_content_model, load_svdpp_model
from .coldstart import get_content_scores_for_city, get_top_cold_start_recommendations
from .hybrid_scorer import score_businesses_for_user


# ── Lifecycle ─────────────────────────────────────────────────────────────────

def startup() -> None:
    """Load all models and parquets into memory. Called once at server startup."""
    load_parquets()
    load_content_model()
    load_svdpp_model()


# ── Status ────────────────────────────────────────────────────────────────────

def get_model_version() -> str:
    return state.model_version


def is_real_model() -> bool:
    """True if recommendations come from real parquets (vs. mock JSON)."""
    return state.parquets_are_loaded


def has_precomputed_recs(user_id: str) -> bool:
    """True if this user has pre-computed SVD++ recommendations stored in memory."""
    return bool(state.top_n.get(user_id))


# ── Core scoring ──────────────────────────────────────────────────────────────

def inject_scores(
    businesses: list[dict],
    user_id: str,
    city: Optional[str] = None,
    hour: Optional[int] = None,
    user_ratings: Optional[dict[str, float]] = None,
    cold_start_scores: Optional[dict[str, float]] = None,
) -> list[dict]:
    """Attach match/cf/cb/ctx/pop to every business. See hybrid_scorer for details."""
    return score_businesses_for_user(
        businesses, user_id,
        city=city, hour=hour,
        user_ratings=user_ratings,
        cold_start_scores=cold_start_scores,
    )


# ── Query functions ───────────────────────────────────────────────────────────

def get_recommendations(user_id: str, limit: int = 10, city: Optional[str] = None) -> list[dict]:
    """Return pre-computed top-N recommendations for a user from the parquet store."""
    if city and user_id in (settings.GUEST_USER_ID, "default"):
        recs = state.top_n.get(f"{user_id}|{city}") or state.top_n.get(user_id) or []
    else:
        recs = (
            state.top_n.get(user_id)
            or state.top_n.get(settings.GUEST_USER_ID)
            or state.top_n.get("camila")
            or state.top_n.get("default")
            or []
        )

    if city:
        recs = [r for r in recs if state.biz_city.get(r["business_id"], settings.DEFAULT_CITY) == city]

    return recs[:limit]


def get_explanation(user_id: str, business_id: str) -> Optional[dict]:
    """Return the explanation breakdown for a user-business pair (O(1) dict lookup)."""
    for candidate_uid in (user_id, "new_visitor", "camila"):
        expl = state.explanations.get(f"{candidate_uid}|{business_id}")
        if expl:
            return expl
    return None


def get_popularity_score(business_id: str) -> Optional[dict]:
    """Return a popularity-only score as last-resort fallback when no CF/CB signal exists."""
    pop = state.biz_pop_cb.get(business_id)
    if pop is None:
        return None
    pop_pct = round(pop * 100)
    return {"match": max(1, pop_pct), "cf": 0, "ctx": 0, "pop": pop_pct}


# ── Cold-start ────────────────────────────────────────────────────────────────

def get_cold_start_scores(
    categories: str,
    price_pref: int = 2,
    stars_pref: float = 0.8,
    city: Optional[str] = None,
) -> dict[str, float]:
    """Return {business_id: score} from the TF-IDF content model for inject_scores()."""
    return get_content_scores_for_city(categories, price_pref, stars_pref, city)


def get_cold_start_recommendations(
    categories: str,
    price_pref: int = 2,
    stars_pref: float = 0.8,
    limit: int = 50,
    city: Optional[str] = None,
) -> list[dict]:
    """Return top-N cold-start recommendations for the /recommendations/cold-start endpoint."""
    return get_top_cold_start_recommendations(categories, price_pref, stars_pref, limit, city)
