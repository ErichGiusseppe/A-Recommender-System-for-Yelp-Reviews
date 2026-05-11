from types import SimpleNamespace
from typing import List
from fastapi import APIRouter, Query, Depends
from app.models import SearchResponse
from app.services import business_store, recommender
from app.auth import get_current_user

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
def search(
    q: str | None = None,
    category: List[str] = Query(default=[]),
    price: List[str] = Query(default=[]),
    limit: int = Query(20, ge=1, le=100),
    current_user: SimpleNamespace = Depends(get_current_user),
):
    user_id = "new_visitor" if current_user.is_guest else current_user.user_id
    items = business_store.search_businesses(
        q=q,
        categories=category or None,
        prices=price or None,
    )
    items = recommender.inject_scores(items, user_id)
    items = sorted(items, key=lambda b: b["match"], reverse=True)
    return SearchResponse(items=items[:limit], total=len(items))
