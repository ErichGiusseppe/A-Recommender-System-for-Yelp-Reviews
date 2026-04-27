import json
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Query
from app.models import RecommendationsResponse, RecommendationModel, ExplanationModel, SignalDetailsModel

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "mock"


def _load_businesses() -> list[dict]:
    with open(DATA_DIR / "businesses.json", encoding="utf-8") as f:
        return json.load(f)


@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    user_id: str = Query("camila"),
    limit: int = Query(10, ge=1, le=50),
):
    businesses = _load_businesses()
    # Phase 1: sort by match score descending as proxy
    sorted_biz = sorted(businesses, key=lambda b: b["match"], reverse=True)
    items = [
        RecommendationModel(
            business_id=b["id"],
            score=float(b["match"]),
            cf=b["cf"],
            ctx=b["ctx"],
            pop=b["pop"],
        )
        for b in sorted_biz[:limit]
    ]
    return RecommendationsResponse(
        items=items,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/explanations/{business_id}", response_model=ExplanationModel)
def get_explanation(business_id: str, user_id: str = Query("camila")):
    businesses = _load_businesses()
    biz = next((b for b in businesses if b["id"] == business_id), None)
    if biz is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    return ExplanationModel(
        business_id=business_id,
        user_id=user_id,
        match=biz["match"],
        cf=biz["cf"],
        ctx=biz["ctx"],
        pop=biz["pop"],
        signal_details=SignalDetailsModel(
            cf_reasoning="Users with similar taste history rated this highly (matrix factorization, k=64)",
            ctx_reasoning="Open now, weather-matched, within walking distance",
            pop_reasoning="Trending in this neighborhood this week (+reservation velocity)",
        ),
    )
