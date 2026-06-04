from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from types import SimpleNamespace
from app.auth import require_auth
from app.database import get_conn
from app.config import settings
from app.services import business_store

router = APIRouter(prefix="/reviews", tags=["reviews"])

_DEMO_REVIEWS_PATH = settings.DATA_DIR / "demo_user_reviews.parquet"


def _load_yelp_reviews(user_id: str) -> list[dict]:
    """Load historical Yelp reviews for demo users from the pre-generated parquet."""
    if not _DEMO_REVIEWS_PATH.exists():
        return []
    try:
        import pandas as pd  # type: ignore
        df = pd.read_parquet(_DEMO_REVIEWS_PATH)
        user_df = df[df["user_id"] == user_id].sort_values("date", ascending=False)
        out = []
        for r in user_df.to_dict("records"):
            bid = r["business_id"]
            # Enrich with category/city from the in-memory catalog when available
            biz = business_store.get_business(bid) or {}
            out.append({
                "business_id":   bid,
                "business_name": str(r.get("business_name") or biz.get("name", "")),
                "category":      biz.get("category", ""),
                "city":          str(r.get("city") or biz.get("city", "")),
                "stars":         int(r["stars"]),
                "text":          str(r["text"] or ""),
                "created_at":    str(r["date"]) + "T00:00:00+00:00",
            })
        return out
    except Exception:
        return []


class ReviewSubmit(BaseModel):
    business_id: str
    stars: int = Field(..., ge=1, le=5)
    text: str = ""


class ReviewOut(BaseModel):
    business_id: str
    business_name: str = ""
    category: str = ""
    city: str = ""
    stars: int
    text: str
    created_at: str


@router.post("", status_code=201, response_model=ReviewOut)
def submit_review(
    data: ReviewSubmit,
    current_user: SimpleNamespace = Depends(require_auth),
):
    user_id = current_user.user_id
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO reviews (user_id, business_id, stars, text, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, business_id) DO UPDATE SET
                stars=excluded.stars,
                text=excluded.text,
                created_at=excluded.created_at
            """,
            (user_id, data.business_id, data.stars, data.text.strip(), now),
        )
    return ReviewOut(
        business_id=data.business_id, stars=data.stars, text=data.text, created_at=now
    )


@router.get("/me", response_model=list[ReviewOut])
def my_reviews(current_user: SimpleNamespace = Depends(require_auth)):
    user_id = current_user.user_id

    # App reviews (written in Lantern) — take precedence
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT business_id, stars, text, created_at FROM reviews "
            "WHERE user_id=? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    app_reviews = []
    for r in rows:
        biz = business_store.get_business(r["business_id"]) or {}
        app_reviews.append(ReviewOut(
            business_id=r["business_id"],
            business_name=biz.get("name", ""),
            category=biz.get("category", ""),
            city=biz.get("city", ""),
            stars=r["stars"],
            text=r["text"],
            created_at=r["created_at"],
        ))
    app_biz_ids = {r.business_id for r in app_reviews}

    # Historical Yelp reviews — shown only for demo users (parquet pre-generated)
    yelp_reviews = [
        ReviewOut(business_id=r["business_id"], business_name=r["business_name"],
                  category=r.get("category", ""), city=r.get("city", ""),
                  stars=r["stars"], text=r["text"], created_at=r["created_at"])
        for r in _load_yelp_reviews(user_id)
        if r["business_id"] not in app_biz_ids  # app review takes precedence
    ]

    # App reviews first (most recent first), then historical Yelp reviews
    return app_reviews + yelp_reviews
