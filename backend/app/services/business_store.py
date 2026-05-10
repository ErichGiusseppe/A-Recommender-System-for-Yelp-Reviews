"""
Business store: loads businesses from business_meta.parquet when available,
falls back to mock JSON. Single source of truth for business metadata.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
MOCK_DIR = DATA_DIR / "mock"
PHOTOS_JSON = DATA_DIR / "real" / "photos" / "photos.json"

# Base URL for serving Yelp photos (override via env var for Cloud Run deploy)
PHOTOS_BASE_URL = os.environ.get("PHOTOS_BASE_URL", "http://localhost:8000/photos")

_businesses: list[dict] = []
_by_id: dict[str, dict] = {}
_biz_photos: dict[str, list[str]] = {}   # business_id → [photo_id, ...]
_loaded_from_parquet: bool = False

# Multiple Unsplash photos per category — rotated by hash(business_id) so each
# restaurant gets a distinct image even within the same category.
_CAT_IMAGES: dict[str, list[str]] = {
    "Italian":                   ["photo-1414235077428-338989a2e8c0","photo-1555396273-367ea4eb4db5","photo-1481931098730-318b6f776db0","photo-1498579150354-977475b7ea0b"],
    "Pizza":                     ["photo-1513104890138-7c749659a591","photo-1574071318508-1cdbab80d002","photo-1565299624946-b28f40a0ae38"],
    "Chinese":                   ["photo-1563245372-f21724e3856d","photo-1563897539950-a7a68af1d989","photo-1455619452474-d2be8b1e70cd"],
    "Japanese":                  ["photo-1569050467447-ce54b3bbc37d","photo-1617196034183-421b4040ed20","photo-1611143669185-af224c5e3252"],
    "Sushi Bars":                ["photo-1579584425555-c3ce17fd4351","photo-1617196034183-421b4040ed20","photo-1611143669185-af224c5e3252"],
    "Mexican":                   ["photo-1565299585323-38d6b0865b47","photo-1618449840665-9ed506d73a34","photo-1464219789935-c2d9d9aba644"],
    "American (Traditional)":   ["photo-1568901346375-23c9450c58cd","photo-1485963631004-f2f00b1d6606","photo-1550317138-10000687a72b"],
    "American (New)":           ["photo-1555396273-367ea4eb4db5","photo-1517248135467-4c7edcad34c4","photo-1414235077428-338989a2e8c0"],
    "Bars":                     ["photo-1514362545857-3bc16c4c7d1b","photo-1470338745628-171cf53de3a8","photo-1543007630-9359815b6105"],
    "Nightlife":                ["photo-1543007630-9359815b6105","photo-1514362545857-3bc16c4c7d1b","photo-1470338745628-171cf53de3a8"],
    "Cocktail Bars":            ["photo-1470338745628-171cf53de3a8","photo-1543007630-9359815b6105","photo-1514362545857-3bc16c4c7d1b"],
    "Lounges":                  ["photo-1414235077428-338989a2e8c0","photo-1555396273-367ea4eb4db5","photo-1517248135467-4c7edcad34c4"],
    "Coffee & Tea":             ["photo-1495474472287-4d71bcdd2085","photo-1509042239860-f550ce710b93","photo-1447933601403-0c6688de566e","photo-1498804103079-a6351b050096"],
    "Breakfast & Brunch":       ["photo-1533089860892-a7c6f0a88666","photo-1484723091739-30a097e8f929","photo-1525351484163-7529414344d8"],
    "Sandwiches":               ["photo-1553979459-d2229ba7433b","photo-1509722747041-616f39b57ef3","photo-1528735602780-2552fd46c7af"],
    "Seafood":                  ["photo-1565680018434-b513d5e5fd47","photo-1519708227418-c8fd9a32b7a2","photo-1534482421-64566f976cfa"],
    "Mediterranean":            ["photo-1481671703460-040cb8a2d909","photo-1546069901-ba9599a7e63c","photo-1414235077428-338989a2e8c0"],
    "Greek":                    ["photo-1481671703460-040cb8a2d909","photo-1546069901-ba9599a7e63c"],
    "Spanish":                  ["photo-1555396273-367ea4eb4db5","photo-1481671703460-040cb8a2d909"],
    "French":                   ["photo-1414235077428-338989a2e8c0","photo-1555396273-367ea4eb4db5","photo-1516100882582-96c3a05fe590"],
    "Indian":                   ["photo-1585937421612-70a008356fbe","photo-1596797038530-2c107229654b","photo-1567337710282-00832b415979"],
    "Thai":                     ["photo-1562802378-063ec186a863","photo-1533777857889-4be7c70b33f7"],
    "Vietnamese":               ["photo-1569050467447-ce54b3bbc37d","photo-1559314809-0d155014e29e"],
    "Korean":                   ["photo-1517248135467-4c7edcad34c4","photo-1569050467447-ce54b3bbc37d"],
    "Burgers":                  ["photo-1568901346375-23c9450c58cd","photo-1550317138-10000687a72b","photo-1542574271-7f3b92e6c821"],
    "Vegan":                    ["photo-1540189549336-e6e99c3679fe","photo-1512621776951-a57141f2eefd","photo-1498579150354-977475b7ea0b"],
    "Vegetarian":               ["photo-1512621776951-a57141f2eefd","photo-1540189549336-e6e99c3679fe"],
    "Steakhouses":              ["photo-1558030006-450675393462","photo-1615361200141-f45040f367be","photo-1529042410759-befb1204b468"],
    "Bakeries":                 ["photo-1509440159596-0249088772ff","photo-1606101273945-e9eba94c3531","photo-1568254183919-78a4f43a2877"],
    "Ice Cream & Frozen Yogurt":["photo-1567206563114-c179ce53ccdf","photo-1488900128323-21503983a07e"],
    "Candy Stores":             ["photo-1587132137056-bfbf0166836e","photo-1559181567-c3190f82a9a4"],
    "Grocery":                  ["photo-1542838132-92c53300491e","photo-1498579150354-977475b7ea0b"],
    "Restaurants":              ["photo-1517248135467-4c7edcad34c4","photo-1414235077428-338989a2e8c0","photo-1555396273-367ea4eb4db5"],
    "Food":                     ["photo-1504674900247-0877df9cc836","photo-1555396273-367ea4eb4db5","photo-1517248135467-4c7edcad34c4"],
    "default":                  ["photo-1517248135467-4c7edcad34c4","photo-1414235077428-338989a2e8c0","photo-1555396273-367ea4eb4db5","photo-1504674900247-0877df9cc836","photo-1485963631004-f2f00b1d6606"],
}


def _load_photos() -> None:
    """Load photos.json → _biz_photos dict (business_id → [photo_id, ...])."""
    global _biz_photos
    if not PHOTOS_JSON.exists():
        logger.info("photos.json not found — gallery will use Unsplash fallback")
        return
    try:
        biz_to_ids: dict[str, list[str]] = {}
        with open(PHOTOS_JSON, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                bid = obj.get("business_id", "")
                pid = obj.get("photo_id", "")
                if bid and pid:
                    biz_to_ids.setdefault(bid, []).append(pid)
        _biz_photos = biz_to_ids
        logger.info("business_store: loaded photos for %d businesses", len(_biz_photos))
    except Exception as exc:
        logger.warning("Error loading photos.json (%s) — gallery will use Unsplash", exc)


def _pick_photo(category: str, business_id: str) -> str:
    options = _CAT_IMAGES.get(category) or _CAT_IMAGES["default"]
    return options[abs(hash(business_id)) % len(options)]


def _img(category: str, business_id: str = "") -> str:
    return f"https://images.unsplash.com/{_pick_photo(category, business_id)}?w=900&q=80"


def _cover_img(category: str, business_id: str = "") -> str:
    return f"https://images.unsplash.com/{_pick_photo(category, business_id)}?w=1600&q=80"


def _price_label(price_range) -> str:
    if price_range is None:
        return "$$"
    try:
        n = int(float(str(price_range)))
        return "$" * max(1, min(4, n))
    except Exception:
        return "$$"


def _safe_float(val, default: float) -> float:
    """Return val as float, falling back to default if None/NaN/invalid."""
    try:
        v = float(val)
        return default if (v != v) else v  # v != v is True only for NaN
    except (TypeError, ValueError):
        return default


def _row_to_biz(row: dict) -> dict:
    cats_raw = str(row.get("categories") or "")
    cat_list = [c.strip() for c in cats_raw.split(",") if c.strip()]
    primary  = cat_list[0] if cat_list else "Restaurant"
    tags     = [c.lower().replace("&", "and").replace(" ", "-") for c in cat_list[:5]]
    svg_x    = _safe_float(row.get("svg_x"), 340.0)
    svg_y    = _safe_float(row.get("svg_y"), 350.0)
    neighborhood = str(row.get("neighborhood") or "Philadelphia")

    raw_city = str(row.get("city") or "Philadelphia")
    city = raw_city if raw_city.strip() else "Philadelphia"

    bid = row["business_id"]
    photo_ids  = _biz_photos.get(bid, [])
    gallery    = [f"{PHOTOS_BASE_URL}/{pid}.jpg" for pid in photo_ids[:8]]
    first_photo = gallery[0] if gallery else None
    image_url   = first_photo or _img(primary, bid)
    cover_url   = gallery[1] if len(gallery) > 1 else _cover_img(primary, bid)

    return {
        "id":           bid,
        "name":         str(row.get("name") or ""),
        "category":     primary,
        "city":         city,
        "neighborhood": neighborhood,
        "rating":       _safe_float(row.get("stars"), 4.0),
        "reviews":      int(row.get("review_count") or 0),
        "price":        _price_label(row.get("price_range")),
        "match":        0,          # injected per-user at request time
        "image":        image_url,
        "cover":        cover_url,
        "gallery":      gallery,
        "attributes":   [],
        "whyPicked":    f"A well-regarded {primary.lower()} in {neighborhood}.",
        "excerpt":      "",
        "cf":           0,          # injected per-user at request time
        "ctx":          0,
        "pop":          0,
        "lat":          _safe_float(row.get("latitude"), 39.9526),
        "lng":          _safe_float(row.get("longitude"), -75.1652),
        "coords":       {"x": svg_x, "y": svg_y},
        "hours":        "",
        "address":      str(row.get("address") or ""),
        "tags":         tags,
        "reviewList":   [],
    }


def _load_parquet() -> None:
    global _loaded_from_parquet
    meta_path = DATA_DIR / "business_meta.parquet"
    if not meta_path.exists():
        logger.info("business_meta.parquet not found — using mock")
        _load_mock()
        return
    try:
        import pandas as pd  # type: ignore
        df = pd.read_parquet(meta_path)
        for _, row in df.iterrows():
            biz = _row_to_biz(row.to_dict())
            _businesses.append(biz)
            _by_id[biz["id"]] = biz
        _loaded_from_parquet = True
        logger.info("business_store: loaded %d businesses from parquet", len(_businesses))
    except Exception as exc:
        logger.warning("Error loading business_meta.parquet (%s) — using mock", exc)
        _load_mock()


def _load_mock() -> None:
    with open(MOCK_DIR / "businesses.json", encoding="utf-8") as f:
        items: list[dict] = json.load(f)
    for b in items:
        _businesses.append(b)
        _by_id[b["id"]] = b
    logger.info("business_store: loaded %d businesses from mock", len(_businesses))


def startup() -> None:
    _load_photos()     # must run before _load_parquet so gallery URLs are ready
    _load_parquet()


def is_real_data() -> bool:
    return _loaded_from_parquet


def get_businesses() -> list[dict]:
    return _businesses


def get_business(business_id: str) -> Optional[dict]:
    return _by_id.get(business_id)


def search_businesses(
    q: Optional[str] = None,
    category: Optional[str] = None,
    price: Optional[str] = None,
) -> list[dict]:
    items = _businesses
    if q:
        q_lower = q.lower()
        items = [
            b for b in items
            if q_lower in b["name"].lower()
            or q_lower in b["category"].lower()
            or q_lower in b["neighborhood"].lower()
            or any(q_lower in tag for tag in b.get("tags", []))
        ]
    if category:
        items = [b for b in items if b["category"].lower() == category.lower()]
    if price:
        items = [b for b in items if b["price"] == price]
    return items
