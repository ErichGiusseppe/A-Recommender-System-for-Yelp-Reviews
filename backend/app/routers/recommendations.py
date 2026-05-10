from datetime import datetime, timezone
from types import SimpleNamespace
from fastapi import APIRouter, HTTPException, Query, Depends
from app.models import RecommendationsResponse, RecommendationModel, ExplanationModel, SignalDetailsModel
from app.services import recommender, business_store
from app.auth import get_current_user

router = APIRouter()

_CF_REASONING  = "Usuarios con historial similar valoraron este lugar altamente (SVD++, 50 factores latentes)."
_CTX_REASONING = "Encaja con el contexto actual: categoría, hora y zona."
_POP_REASONING = "Muy popular en el vecindario — alto volumen de reseñas recientes."


def _signal_details(cf: int, ctx: int, pop: int) -> SignalDetailsModel:
    dominant = max([(cf, "cf"), (ctx, "ctx"), (pop, "pop")], key=lambda x: x[0])[1]
    return SignalDetailsModel(
        cf_reasoning =_CF_REASONING  if dominant == "cf"  else f"La señal colaborativa contribuye {cf}% de tu match.",
        ctx_reasoning=_CTX_REASONING if dominant == "ctx" else f"La señal contextual contribuye {ctx}% de tu match.",
        pop_reasoning=_POP_REASONING if dominant == "pop" else f"El prior de popularidad contribuye {pop}% de tu match.",
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: SimpleNamespace = Depends(get_current_user),
):
    user_id = "new_visitor" if current_user.is_guest else current_user.user_id
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


@router.get("/recommendations/cold-start", response_model=RecommendationsResponse)
def get_cold_start(
    categories: str = Query("Restaurants, Food"),
    price: int = Query(2, ge=1, le=4),
    stars: float = Query(0.8, ge=0.0, le=1.0),
    limit: int = Query(20, ge=1, le=50),
    city: str | None = Query(None),
):
    recs = recommender.get_cold_start_recommendations(
        categories=categories, price_pref=price, stars_pref=stars, limit=limit, city=city,
    )
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
    return RecommendationsResponse(items=items, generated_at=datetime.now(timezone.utc).isoformat())


@router.get("/explanations/{business_id}", response_model=ExplanationModel)
def get_explanation(
    business_id: str,
    current_user: SimpleNamespace = Depends(get_current_user),
):
    user_id = "new_visitor" if current_user.is_guest else current_user.user_id
    expl = recommender.get_explanation(user_id, business_id)

    if expl is None:
        biz = business_store.get_business(business_id)
        if biz is None:
            raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")
        expl = {"cf": biz.get("cf", 0), "ctx": biz.get("ctx", 0),
                "pop": biz.get("pop", 0), "match": biz.get("match", 0)}

    return ExplanationModel(
        business_id=business_id,
        user_id=user_id,
        match=expl["match"],
        cf=expl["cf"],
        ctx=expl["ctx"],
        pop=expl["pop"],
        signal_details=_signal_details(expl["cf"], expl["ctx"], expl["pop"]),
    )
