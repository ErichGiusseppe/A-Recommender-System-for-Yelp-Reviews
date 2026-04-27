import json
from pathlib import Path
from fastapi import APIRouter, Query
from app.models import SearchResponse

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "mock"


def _load_businesses() -> list[dict]:
    with open(DATA_DIR / "businesses.json", encoding="utf-8") as f:
        return json.load(f)


@router.get("/search", response_model=SearchResponse)
def search(
    q: str | None = None,
    category: str | None = None,
    price: str | None = None,
    attribute: str | None = None,
    user_id: str = Query("camila"),
    limit: int = Query(20, ge=1, le=100),
):
    items = _load_businesses()

    if q:
        q_lower = q.lower()
        items = [
            b for b in items
            if q_lower in b["name"].lower()
            or q_lower in b["category"].lower()
            or q_lower in b["neighborhood"].lower()
            or any(q_lower in tag for tag in b["tags"])
        ]
    if category:
        items = [b for b in items if b["category"].lower() == category.lower()]
    if price:
        items = [b for b in items if b["price"] == price]
    if attribute:
        items = [b for b in items if attribute in b["attributes"]]

    items = sorted(items, key=lambda b: b["match"], reverse=True)
    return SearchResponse(items=items[:limit], total=len(items))
