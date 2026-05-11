from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from types import SimpleNamespace
from app.auth import require_auth
from app.database import get_conn

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewSubmit(BaseModel):
    business_id: str
    stars: int = Field(..., ge=1, le=5)
    text: str = ""


class ReviewOut(BaseModel):
    business_id: str
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
        conn.commit()
    return ReviewOut(
        business_id=data.business_id, stars=data.stars, text=data.text, created_at=now
    )


@router.get("/me", response_model=list[ReviewOut])
def my_reviews(current_user: SimpleNamespace = Depends(require_auth)):
    user_id = current_user.user_id
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT business_id, stars, text, created_at FROM reviews "
            "WHERE user_id=? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [
        ReviewOut(
            business_id=r["business_id"],
            stars=r["stars"],
            text=r["text"],
            created_at=r["created_at"],
        )
        for r in rows
    ]
