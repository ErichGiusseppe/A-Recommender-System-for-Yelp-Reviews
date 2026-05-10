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


def _load_user_ratings(user_id: str) -> dict[str, float]:
    """Return {business_id: stars} for all reviews the user has submitted."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT business_id, stars FROM reviews WHERE user_id=?", (user_id,)
        ).fetchall()
    return {r["business_id"]: float(r["stars"]) for r in rows}


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

    hour = datetime.now().hour
    all_scored = recommender.inject_scores(
        items, user_id, city=city, hour=hour, user_ratings=user_ratings
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
    expl = recommender.get_explanation(user_id, business_id)
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
