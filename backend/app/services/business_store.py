"""
Business store: loads businesses from business_meta.parquet when available,
falls back to mock JSON. Single source of truth for business metadata.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.config import settings
from app.database import get_conn

logger = logging.getLogger(__name__)

DATA_DIR        = settings.DATA_DIR
MOCK_DIR        = settings.MOCK_DIR
PHOTOS_JSON     = settings.PHOTOS_JSON
PHOTOS_BASE_URL = settings.PHOTOS_BASE_URL

_businesses: list[dict] = []
_by_id: dict[str, dict] = {}
_biz_photos: dict[str, list[str]] = {}    # business_id → [photo_id, ...]
_biz_reviews: dict[str, list[dict]] = {}  # business_id → [{stars, text, date}, ...]
_biz_excerpts: dict[str, str] = {}        # business_id → top-voted review snippet
_loaded_from_parquet: bool = False

# Derived caches — built once at startup from _businesses
_categories_cache: list[dict] = []
_cities_cache: list[str] = []

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
    "Fast Food":                ["photo-1568901346375-23c9450c58cd","photo-1550317138-10000687a72b","photo-1619096252214-ef06c45683e3"],
    # Non-restaurant categories
    "Beauty & Spas":            ["photo-1560066984-138dadb4c035","photo-1522337360788-8b13dee7a37e","photo-1487412947147-5cebf100ffc2"],
    "Hair Salons":              ["photo-1522337360788-8b13dee7a37e","photo-1487412947147-5cebf100ffc2","photo-1560066984-138dadb4c035"],
    "Nail Salons":              ["photo-1604654894610-df63bc536371","photo-1560066984-138dadb4c035","photo-1522337360788-8b13dee7a37e"],
    "Shopping":                 ["photo-1483985988355-763728e1935b","photo-1555529669-e69e7aa0ba9a","photo-1441986300917-64674bd600d8"],
    "Automotive":               ["photo-1486262715619-67b85e0b08d3","photo-1503376780353-7e6692767b70","photo-1619642751034-765dfdf7c58e"],
    "Auto Repair":              ["photo-1486262715619-67b85e0b08d3","photo-1503376780353-7e6692767b70"],
    "Home Services":            ["photo-1484154218962-a197022b5858","photo-1513694203232-719a280e022f","photo-1558618666-fcd25c85cd64"],
    "Health & Medical":         ["photo-1576091160399-112ba8d25d1d","photo-1559757148-5c350d0d3c56","photo-1631815588090-d4bfec5b1ccb"],
    "Active Life":              ["photo-1571019614242-c5c5dee9f50b","photo-1534438327276-14e5300c3a48","photo-1486218119243-13301543a1b4"],
    "Fitness & Instruction":    ["photo-1571019614242-c5c5dee9f50b","photo-1534438327276-14e5300c3a48"],
    "Hotels & Travel":          ["photo-1566073771259-6a8506099945","photo-1455587734955-081b22074882","photo-1520250497591-112ba2864d68"],
    "Hotels":                   ["photo-1566073771259-6a8506099945","photo-1455587734955-081b22074882","photo-1520250497591-112ba2864d68"],
    "Arts & Entertainment":     ["photo-1513364776144-60967b0f800f","photo-1460661419201-fd4cecdf8a8b","photo-1459749411175-04bf5292ceea"],
    "Event Planning & Services":["photo-1530103862676-de8c9debad1d","photo-1464366400600-7168b8af9bc3","photo-1519671482749-fd09be7ccebf"],
    "Local Services":           ["photo-1450101499163-c8848c66ca85","photo-1554774853-719586f82d77"],
    "Pets":                     ["photo-1587300003388-59208cc962cb","photo-1548802673-380ab8ebc7b7","photo-1601758124510-52d02ddb7cbd"],
    "Education":                ["photo-1481627834876-b7833e8f5570","photo-1456513080510-7bf3a84b82f8"],
    "Financial Services":       ["photo-1450101499163-c8848c66ca85","photo-1554774853-719586f82d77"],
    "default":                  ["photo-1444703686981-a3abbc4d4fe3","photo-1477959858617-67f85cf4f1df","photo-1480714378408-67cf0d13bc1b"],
}


def _load_photos() -> None:
    """Load photos.json → _biz_photos dict (business_id → [photo_id, ...]).

    Tries the local filesystem first; falls back to GCS if the local file
    is missing (production containers may not have it baked in).
    """
    global _biz_photos

    # Determine source: local file or GCS
    gcs_url = f"{PHOTOS_BASE_URL}/photos.json"
    source_desc = str(PHOTOS_JSON)

    if PHOTOS_JSON.exists():
        import io
        content = PHOTOS_JSON.read_bytes()
        lines_iter = io.TextIOWrapper(io.BytesIO(content), encoding="utf-8")
    else:
        # Fallback: fetch from GCS (PHOTOS_BASE_URL/photos.json)
        try:
            import urllib.request
            req = urllib.request.urlopen(gcs_url, timeout=30)
            import io
            lines_iter = io.TextIOWrapper(req, encoding="utf-8")
            source_desc = gcs_url
            logger.info("photos.json not found locally — loading from %s", gcs_url)
        except Exception as exc:
            logger.info("photos.json not found locally or remotely (%s) — Unsplash fallback", exc)
            return

    try:
        biz_to_ids: dict[str, list[str]] = {}
        for line in lines_iter:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            bid = obj.get("business_id", "")
            pid = obj.get("photo_id", "")
            if bid and pid:
                biz_to_ids.setdefault(bid, []).append(pid)
        _biz_photos = biz_to_ids
        logger.info("business_store: loaded photos for %d businesses from %s",
                    len(_biz_photos), source_desc)
    except Exception as exc:
        logger.warning("Error loading photos.json (%s) — Unsplash fallback", exc)


def _pick_photo(category: str, business_id: str) -> str:
    options = _CAT_IMAGES.get(category) or _CAT_IMAGES["default"]
    # Use sum of char codes instead of hash() — deterministic across restarts
    # (Python's hash() changes with PYTHONHASHSEED, which is random by default)
    index = sum(ord(c) for c in business_id) % len(options)
    return options[index]


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


def _price_is_known(price_range) -> bool:
    """True only when the dataset actually has price information for this business."""
    if price_range is None:
        return False
    try:
        v = float(str(price_range))
        return v == v  # NaN != NaN, so this is False for NaN
    except (TypeError, ValueError):
        return False


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
    neighborhood = str(row.get("neighborhood") or settings.DEFAULT_CITY)

    raw_city = str(row.get("city") or settings.DEFAULT_CITY)
    city = raw_city if raw_city.strip() else settings.DEFAULT_CITY

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
        "price_known":  _price_is_known(row.get("price_range")),
        "match":        0,          # injected per-user at request time
        "image":        image_url,
        "cover":        cover_url,
        "gallery":      gallery,
        "attributes":   [],
        "whyPicked":    f"A well-regarded {primary.lower()} in {neighborhood}.",
        "excerpt":      _biz_excerpts.get(bid, ""),
        "cf":           0,          # injected per-user at request time
        "cb":           0,          # content-based (cold-start TF-IDF similarity)
        "ctx":          0,          # contextual (time-of-day boost)
        "pop":          0,
        "lat":          _safe_float(row.get("latitude"),  settings.DEFAULT_LAT),
        "lng":          _safe_float(row.get("longitude"), settings.DEFAULT_LNG),
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
        for row in df.to_dict("records"):
            biz = _row_to_biz(row)
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


def _load_local_businesses() -> None:
    """Load user-created businesses from SQLite and merge into in-memory store."""
    try:
        with get_conn() as conn:
            rows = conn.execute("SELECT * FROM local_businesses").fetchall()
        count = 0
        for row in rows:
            biz = _row_to_biz({
                "business_id": row["business_id"],
                "name":        row["name"],
                "categories":  row["category"],
                "city":        row["city"],
                "neighborhood": row["neighborhood"],
                "address":     row["address"],
                "stars":       row["rating"],
                "review_count": 0,
                "price_range": row["price_range"],
                "latitude":    row["lat"],
                "longitude":   row["lng"],
            })
            if biz["id"] not in _by_id:
                _businesses.append(biz)
                _by_id[biz["id"]] = biz
                count += 1
        logger.info("business_store: loaded %d local businesses from SQLite", count)
    except Exception as exc:
        logger.warning("Could not load local businesses from SQLite: %s", exc)


def add_business(data: dict) -> dict:
    """Insert a new business into SQLite and the in-memory store. Returns the full biz dict."""
    price_map = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
    price_range = price_map.get(data.get("price", "$$"), 2)
    business_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO local_businesses
               (business_id, name, category, city, neighborhood, address,
                rating, price_range, lat, lng, created_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                business_id,
                data["name"],
                data["category"],
                data["city"],
                data["neighborhood"],
                data["address"],
                data.get("rating", 0.0),
                price_range,
                data.get("lat", settings.DEFAULT_LAT),
                data.get("lng", settings.DEFAULT_LNG),
                data.get("created_by", "unknown"),
                created_at,
            ),
        )
    biz = _row_to_biz({
        "business_id": business_id,
        "name":        data["name"],
        "categories":  data["category"],
        "city":        data["city"],
        "neighborhood": data["neighborhood"],
        "address":     data["address"],
        "stars":       data.get("rating", 0.0),
        "review_count": 0,
        "price_range": price_range,
        "latitude":    data.get("lat", settings.DEFAULT_LAT),
        "longitude":   data.get("lng", settings.DEFAULT_LNG),
    })
    _businesses.append(biz)
    _by_id[biz["id"]] = biz
    return biz


def _load_reviews() -> None:
    global _biz_reviews, _biz_excerpts
    reviews_path = DATA_DIR / "reviews_sample.parquet"
    if not reviews_path.exists():
        logger.info("reviews_sample.parquet not found — run generate_reviews.py to enable review tab")
        return
    try:
        import pandas as pd  # type: ignore
        df = pd.read_parquet(reviews_path)
        # reviews_sample is already sorted by votes desc — first row per business
        # is the most-voted review, used as the excerpt snippet.
        for bid, group in df.groupby("business_id"):
            records = group.to_dict("records")
            _biz_reviews[str(bid)] = [
                {"author": "Yelp user", "rating": float(r["stars"]), "text": str(r["text"])}
                for r in records
            ]
            top_text = str(records[0]["text"]).strip()
            # Truncate to first sentence or 160 chars, whichever is shorter
            sentence_end = top_text.find(". ")
            if 0 < sentence_end < 160:
                _biz_excerpts[str(bid)] = top_text[: sentence_end + 1]
            else:
                _biz_excerpts[str(bid)] = top_text[:160].rstrip() + ("…" if len(top_text) > 160 else "")
        logger.info("business_store: loaded reviews for %d businesses", len(_biz_reviews))
    except Exception as exc:
        logger.warning("Error loading reviews_sample.parquet (%s)", exc)


def _build_derived_caches() -> None:
    """Pre-compute categories and cities after the main catalog is loaded.

    Called once at startup so get_categories_with_images() and get_cities()
    are O(1) lookups instead of O(n) scans on every request.
    """
    global _categories_cache, _cities_cache
    from collections import Counter
    counts: Counter = Counter(b["category"] for b in _businesses if b.get("category"))
    _categories_cache = [
        {"name": cat, "img": _img(cat), "count": count}
        for cat, count in counts.most_common(20)
    ]
    _cities_cache = sorted({b["city"] for b in _businesses if b.get("city")})


def startup() -> None:
    _load_photos()           # must run before _load_parquet so gallery URLs are ready
    _load_reviews()          # must run before _load_parquet so excerpts are ready
    _load_parquet()
    _load_local_businesses()
    _build_derived_caches()  # pre-compute category and city indexes


def is_real_data() -> bool:
    return _loaded_from_parquet


def get_businesses() -> list[dict]:
    return _businesses


def get_business(business_id: str) -> Optional[dict]:
    biz = _by_id.get(business_id)
    if biz is None:
        return None
    reviews = _biz_reviews.get(business_id)
    if reviews:
        biz = dict(biz)
        biz["reviewList"] = reviews
    return biz


def get_categories_with_images(n: int = 20) -> list[dict]:
    """Top N categories by business count. Pre-computed at startup — O(1)."""
    return _categories_cache[:n]


def get_cities() -> list[str]:
    """Sorted list of distinct cities. Pre-computed at startup — O(1)."""
    return _cities_cache


def search_businesses(
    q: Optional[str] = None,
    categories: list[str] | None = None,
    prices: list[str] | None = None,
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
    if categories:
        cats_lower = {c.lower() for c in categories}
        items = [b for b in items if b["category"].lower() in cats_lower]
    if prices:
        items = [b for b in items if b["price"] in prices]
    return items
