from datetime import datetime
from types import SimpleNamespace
from fastapi import APIRouter, HTTPException, Query, Depends
from app.models import BusinessModel, CategoryModel, PaginatedBusinesses
from app.services import business_store, recommender
from app.auth import get_current_user
import json
from pathlib import Path

router = APIRouter()

_MOCK_DIR = Path(__file__).parent.parent.parent / "data" / "mock"
_categories_cache: list[dict] | None = None


def _load_categories() -> list[dict]:
    global _categories_cache
    if _categories_cache is None:
        with open(_MOCK_DIR / "categories.json", encoding="utf-8") as f:
            _categories_cache = json.load(f)
    return _categories_cache


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
    # Inject scores + contextual re-ranking by current hour
    hour = datetime.now().hour
    all_scored = recommender.inject_scores(items, user_id, city=city, hour=hour)
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


@router.get("/categories", response_model=list[CategoryModel])
def list_categories():
    return _load_categories()
