import json
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from app.models import RecommendationsResponse, RecommendationModel, ExplanationModel, SignalDetailsModel
from app.services import recommender

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "mock"


def _load_businesses() -> list[dict]:
    with open(DATA_DIR / "businesses.json", encoding="utf-8") as f:
        return json.load(f)


# Static signal descriptions indexed by dominant signal
_CF_REASONING = "Users with a similar taste history rated this place highly (ALS matrix factorization, k=64 latent factors)."
_CTX_REASONING = "Matches tonight's context: open now, weather-appropriate, proximity to your area."
_POP_REASONING = "Trending in this neighborhood — high reservation velocity over the last 14 days."


def _signal_details(cf: int, ctx: int, pop: int) -> SignalDetailsModel:
    dominant = max([(cf, "cf"), (ctx, "ctx"), (pop, "pop")], key=lambda x: x[0])[1]
    return SignalDetailsModel(
        cf_reasoning=_CF_REASONING if dominant == "cf" else f"Collaborative signal contributes {cf}% of your match score.",
        ctx_reasoning=_CTX_REASONING if dominant == "ctx" else f"Context signal contributes {ctx}% of your match score.",
        pop_reasoning=_POP_REASONING if dominant == "pop" else f"Popularity prior contributes {pop}% of your match score.",
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    user_id: str = Query("camila"),
    limit: int = Query(10, ge=1, le=50),
):
    recs = recommender.get_recommendations(user_id, limit)
    items = [
        RecommendationModel(
            business_id=r["business_id"],
            score=r["score"],
            cf=r["cf"],
            ctx=r["ctx"],
            pop=r["pop"],
        )
        for r in recs
    ]
    return RecommendationsResponse(
        items=items,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/explanations/{business_id}", response_model=ExplanationModel)
def get_explanation(business_id: str, user_id: str = Query("camila")):
    expl = recommender.get_explanation(user_id, business_id)

    if expl is None:
        # last fallback: load from mock JSON directly
        businesses = _load_businesses()
        biz = next((b for b in businesses if b["id"] == business_id), None)
        if biz is None:
            raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")
        expl = {"cf": biz["cf"], "ctx": biz["ctx"], "pop": biz["pop"], "match": biz["match"]}

    return ExplanationModel(
        business_id=business_id,
        user_id=user_id,
        match=expl["match"],
        cf=expl["cf"],
        ctx=expl["ctx"],
        pop=expl["pop"],
        signal_details=_signal_details(expl["cf"], expl["ctx"], expl["pop"]),
    )
