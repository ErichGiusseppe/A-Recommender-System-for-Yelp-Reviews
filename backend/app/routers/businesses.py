from datetime import datetime
from types import SimpleNamespace
from fastapi import APIRouter, HTTPException, Query, Depends
from app.models import BusinessModel, BusinessCreate, CategoryModel, PaginatedBusinesses
from app.services import business_store, recommender
from app.auth import get_current_user, require_auth
from app.database import get_conn
import json
from pathlib import Path

router = APIRouter()

_MOCK_DIR = Path(__file__).parent.parent.parent / "data" / "mock"
_categories_cache: list[dict] | None = None


def _load_mock_categories() -> list[dict]:
    with open(_MOCK_DIR / "categories.json", encoding="utf-8") as f:
        return json.load(f)


_OCCASION_STARS: dict[str, float] = {
    "traveling": 0.92, "local": 0.75, "date": 0.88, "quick": 0.50,
}
_TIME_CATS: dict[str, str] = {
    "morning":   "Coffee, Tea, Breakfast, Brunch",
    "lunch":     "Food, Restaurants, Sandwiches",
    "dinner":    "Restaurants, Italian, Steakhouses",
    "latenight": "Bars, Nightlife, Pizza",
}
_PRICE_VAL: dict[str, int] = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}


def _load_user_ratings(user_id: str) -> dict[str, float]:
    """Return {business_id: stars} for all reviews the user has submitted."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT business_id, stars FROM reviews WHERE user_id=?", (user_id,)
        ).fetchall()
    return {r["business_id"]: float(r["stars"]) for r in rows}


def _load_cold_start_profile(user_id: str) -> dict | None:
    """Return the stored ColdStartProfile dict for this user, or None."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT coldstart_json FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
    if row:
        return json.loads(row["coldstart_json"])
    return None


def _profile_to_content_params(profile: dict) -> dict:
    """Mirror frontend profileToParams() — convert raw wizard profile to content model inputs."""
    moods     = profile.get("moods") or []
    time_slot = profile.get("timeSlot", "dinner")
    occasion  = profile.get("occasion", "local")
    price_str = profile.get("price", "$$")

    time_cats = _TIME_CATS.get(time_slot, "")
    parts     = [*moods, *[c.strip() for c in time_cats.split(",") if c.strip()]]
    return {
        "categories": ", ".join(parts) or "Restaurants, Food",
        "stars_pref": _OCCASION_STARS.get(occasion, 0.75),
        "price_pref": _PRICE_VAL.get(price_str, 2),
    }


@router.get("/businesses", response_model=PaginatedBusinesses)
def list_businesses(
    city: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: SimpleNamespace = Depends(get_current_user),
):
    user_id = "new_visitor" if current_user.is_guest else current_user.user_id
    items = business_store.get_businesses()
    if city:
        items = [b for b in items if b["city"].lower() == city.lower()]

    user_ratings = (
        _load_user_ratings(user_id) if not current_user.is_guest else None
    )

    # Cold-start content scores for users without SVD++ history
    cold_start_scores = None
    has_personal_recs = not current_user.is_guest and bool(recommender._top_n.get(user_id))
    if not has_personal_recs and not current_user.is_guest:
        cs_profile = _load_cold_start_profile(user_id)
        if cs_profile:
            params = _profile_to_content_params(cs_profile)
            cold_start_scores = recommender.get_cold_start_scores(city=city, **params)

    hour = datetime.now().hour
    all_scored = recommender.inject_scores(
        items, user_id, city=city, hour=hour,
        user_ratings=user_ratings, cold_start_scores=cold_start_scores,
    )
    total = len(all_scored)
    return {"items": all_scored[offset: offset + limit], "total": total}


@router.get("/businesses/{business_id}", response_model=BusinessModel)
def get_business(
    business_id: str,
    current_user: SimpleNamespace = Depends(get_current_user),
):
    user_id = "new_visitor" if current_user.is_guest else current_user.user_id
    biz = business_store.get_business(business_id)
    if biz is None:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")
    biz = dict(biz)

    # Priority 1: personal SVD++ explanation from precomputed parquets
    expl = recommender.get_explanation(user_id, business_id)
    if expl:
        biz["match"] = expl["match"]
        biz["cf"]    = expl["cf"]
        biz["ctx"]   = expl["ctx"]
        biz["pop"]   = expl["pop"]
        return biz

    # Priority 2: cold-start content model using the user's wizard profile.
    # Applies to any logged-in user who completed the wizard, even demo users —
    # because the wizard tells us what they're looking for tonight.
    cold_start_scores: dict[str, float] | None = None
    if not current_user.is_guest:
        cs_profile = _load_cold_start_profile(user_id)
        if cs_profile:
            params = _profile_to_content_params(cs_profile)
            cold_start_scores = recommender.get_cold_start_scores(city=None, **params)

    city = biz.get("city")
    scored = recommender.inject_scores(
        [biz], user_id, city=city, hour=datetime.now().hour,
        user_ratings=None,  # Don't filter rated businesses in Detail view
        cold_start_scores=cold_start_scores,
    )
    if scored and scored[0].get("match", 0) > 0:
        return scored[0]

    # Priority 3: raw popularity — honest fallback when there's no personal signal.
    # CF=0 (no collaborative data), pop = normalized review count from content model.
    expl = recommender.get_popularity_score(business_id)
    if expl:
        biz["match"] = expl["match"]
        biz["cf"]    = expl["cf"]
        biz["ctx"]   = expl["ctx"]
        biz["pop"]   = expl["pop"]

    return biz


@router.post("/businesses", response_model=BusinessModel, status_code=201)
def create_business(
    data: BusinessCreate,
    current_user: SimpleNamespace = Depends(require_auth),
):
    biz = business_store.add_business({
        **data.model_dump(),
        "created_by": current_user.user_id,
    })
    return biz


@router.get("/categories", response_model=list[CategoryModel])
def list_categories():
    if business_store.is_real_data():
        return business_store.get_categories_with_images(20)
    return _load_mock_categories()


@router.get("/cities", response_model=list[str])
def list_cities():
    cities = business_store.get_cities()
    # Fallback to known cities if data not loaded yet
    return cities or [
        "Philadelphia", "Tucson", "Tampa", "Indianapolis", "Nashville",
        "New Orleans", "Reno", "Edmonton", "Saint Louis", "Santa Barbara",
    ]
