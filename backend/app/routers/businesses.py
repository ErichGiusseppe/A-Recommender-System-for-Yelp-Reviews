import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from app.models import BusinessModel, CategoryModel, PaginatedBusinesses

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "mock"


def _load_businesses() -> list[dict]:
    with open(DATA_DIR / "businesses.json", encoding="utf-8") as f:
        return json.load(f)


def _load_categories() -> list[dict]:
    with open(DATA_DIR / "categories.json", encoding="utf-8") as f:
        return json.load(f)


@router.get("/businesses", response_model=PaginatedBusinesses)
def list_businesses(
    city: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items = _load_businesses()
    if city:
        items = [b for b in items if b["city"].lower() == city.lower()]
    total = len(items)
    return {"items": items[offset : offset + limit], "total": total}


@router.get("/businesses/{business_id}", response_model=BusinessModel)
def get_business(business_id: str):
    items = _load_businesses()
    for b in items:
        if b["id"] == business_id:
            return b
    raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")


@router.get("/categories", response_model=list[CategoryModel])
def list_categories():
    return _load_categories()
