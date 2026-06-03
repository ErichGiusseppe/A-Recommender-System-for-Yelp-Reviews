"""
Hybrid scorer — the core of the Lantern recommender.

Implements Burke (2002) Cascade hybrid:
  Primary:   SVD++ collaborative filtering
  Secondary: Time-of-day contextual re-ranking

With Switching for cold-start users (TF-IDF content model)
and Weighted combination of CF + CTX + POP within each branch.

Entry point: score_businesses_for_user()
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from app.config import settings
from app.services.contextual_scorer import CTX_SCORES, get_time_bucket
from . import _state as state
from .svdpp_engine import (
    build_warm_user_vector,
    compute_folding_in_vector,
    score_all_businesses_for_user,
)

logger = logging.getLogger(__name__)


_WHY_PICKED = {
    "cf":  "mostly your taste history",
    "cb":  "matches your stated preferences",
    "ctx": "perfect for this time of day",
    "pop": "popular in this area",
}


def _dominant_signal(cf: float, cb: float, ctx: float, pop: float) -> str:
    """Return the name of the signal that contributes most to the final score."""
    weighted = {
        "cf":  settings.W_CF  * cf,
        "cb":  settings.W_CF  * cb,   # cb occupies the CF slot
        "ctx": settings.W_CTX * ctx,
        "pop": settings.W_POP * pop,
    }
    return max(weighted, key=lambda k: weighted[k])


def _apply_hybrid_score(
    biz: dict,
    cf_raw: float,
    cb_raw: float,
    ctx_live: float,
    pop_raw: float,
) -> dict:
    """Compute and attach match/cf/cb/ctx/pop/whyPicked to a business dict in place.

    Uses the centralized weights from settings (W_CF, W_CTX, W_POP).
    The CF slot is filled by either SVD++ (cf_raw) or TF-IDF (cb_raw) depending
    on which signal is active — both cannot be non-zero at the same time in normal paths.
    """
    primary = cf_raw if cf_raw > 0 else cb_raw
    final   = settings.W_CF * primary + settings.W_CTX * ctx_live + settings.W_POP * pop_raw

    biz["match"] = min(99, max(1, round(final * 100)))
    biz["cf"]    = round(cf_raw   * 100)
    biz["cb"]    = round(cb_raw   * 100)
    biz["ctx"]   = round(ctx_live * 100)
    biz["pop"]   = round(pop_raw  * 100)

    dominant = _dominant_signal(cf_raw, cb_raw, ctx_live, pop_raw)
    biz["whyPicked"] = f"Picked {_WHY_PICKED[dominant]}."
    return biz


def score_businesses_for_user(
    businesses: list[dict],
    user_id: str,
    city: Optional[str] = None,
    hour: Optional[int] = None,
    user_ratings: Optional[dict[str, float]] = None,
    cold_start_scores: Optional[dict[str, float]] = None,
) -> list[dict]:
    """Attach match/cf/cb/ctx/pop to every business using the Cascade hybrid.

    Cascade hybrid (Burke 2002):
        score = W_CF · CF  +  W_CTX · CTX  +  W_POP · POP

    Priority chain — first matching branch wins for each user:
      1. Folding-in  user has >= MIN_RATINGS_FOR_FOLDING_IN app ratings → lstsq p_u
      2. Warm SVD++  user in trainset, no new ratings → vectorized batch scoring (~2ms)
      3. Cold-start  user not in trainset OR < MIN_RATINGS_FOR_FOLDING_IN → TF-IDF
      4. Fallback    anonymous / no profile → city parquet or raw popularity

    The folding-in threshold applies equally to trainset and non-trainset users
    (KISS consistency): below the threshold everyone uses cold-start TF-IDF.
    Businesses already rated by the user are excluded from the output.
    CTX is always computed live from the business tags and current hour.
    """
    is_guest  = not user_id or user_id in (settings.GUEST_USER_ID, "default")
    rated_ids = set(user_ratings.keys()) if user_ratings else set()
    n_ratings = len(rated_ids)

    city_key      = f"new_visitor|{city}" if city else None
    city_fallback = {
        r["business_id"]: r
        for r in (
            (state.top_n.get(city_key) if city_key else None)
            or state.top_n.get("new_visitor")
            or []
        )
    }

    # ── Pre-compute branch signals (before the per-business loop) ──────────────

    # Priority 1 / 1b: folding-in (always computed when user has any app ratings).
    # α = n_ratings / MIN_RATINGS_FOR_FOLDING_IN controls the CF↑ / CB↓ blend:
    #   α < 1 → blend (noisy vector, still useful when mixed with TF-IDF)
    #   α = 1 → pure folding-in (enough ratings, vector is reliable)
    # Applies the same logic to trainset and non-trainset users (KISS consistency).
    folded_scores: Optional[dict[str, float]] = None
    blend_alpha = 0.0
    if user_ratings and not is_guest:
        folding_result = compute_folding_in_vector(user_id, user_ratings)
        if folding_result is not None:
            p_u_new, b_u = folding_result
            unrated_ids  = [b["id"] for b in businesses if b["id"] not in rated_ids]
            raw_scores   = score_all_businesses_for_user(p_u_new, b_u, unrated_ids)
            normalized   = np.clip((raw_scores - 1.0) / 4.0, 0.0, 1.0)
            folded_scores = dict(zip(unrated_ids, normalized.tolist()))
            blend_alpha   = min(1.0, n_ratings / settings.MIN_RATINGS_FOR_FOLDING_IN)

    # Priority 2: warm SVD++ historical vector — only for users with 0 app ratings
    # who are in the SVD++ trainset (their Yelp history is encoded in the model).
    warm_cf_scores: dict[str, float] = {}
    if not is_guest and folded_scores is None:
        warm_vector = build_warm_user_vector(user_id)
        if warm_vector is not None:
            u_eff, b_u   = warm_vector
            all_ids      = [b["id"] for b in businesses]
            raw_cf       = score_all_businesses_for_user(u_eff, b_u, all_ids)
            cf_normalized = np.clip((raw_cf - 1.0) / 4.0, 0.0, 1.0)
            warm_cf_scores = dict(zip(all_ids, cf_normalized.tolist()))
            logger.debug("Warm SVD++ scored %d businesses for user %s", len(warm_cf_scores), user_id)

    # ── Per-business scoring loop ──────────────────────────────────────────────
    result = []
    # Pre-compute the CTX bucket scores once — avoids calling get_time_bucket()
    # and dict.get() on CTX_SCORES on every iteration of the per-business loop.
    ctx_bucket_scores: dict[str, int] = CTX_SCORES.get(get_time_bucket(hour), {}) if hour is not None else {}

    for b in businesses:
        if b["id"] in rated_ids:
            continue  # exclude already-rated businesses

        biz     = dict(b)
        bid     = biz["id"]
        # CTX: look up the best tag score for this business against the pre-computed bucket
        ctx_live = 0.0
        if ctx_bucket_scores:
            for tag in (biz.get("tags") or []):
                v = ctx_bucket_scores.get(tag, 0)
                if v > ctx_live:
                    ctx_live = v
            ctx_live /= 100.0
        pop_raw  = state.biz_pop_cb.get(bid, 0.0)

        if folded_scores is not None:
            cf_raw = folded_scores.get(bid, 0.0)
            if blend_alpha < 1.0 and cold_start_scores is not None:
                # ── 1b. Blend α·CF + (1-α)·CB — same logic for all users ────
                cb_raw = cold_start_scores.get(bid, 0.0)
                biz = _apply_hybrid_score(biz, blend_alpha * cf_raw, (1.0 - blend_alpha) * cb_raw, ctx_live, pop_raw)
            else:
                # ── 1. Pure folding-in (≥ MIN_RATINGS_FOR_FOLDING_IN) ─────────
                biz = _apply_hybrid_score(biz, cf_raw, 0.0, ctx_live, pop_raw)

        elif warm_cf_scores:
            # ── 2. Full warm SVD++ ────────────────────────────────────────────
            biz = _apply_hybrid_score(biz, warm_cf_scores.get(bid, 0.0), 0.0, ctx_live, pop_raw)

        elif cold_start_scores is not None and bid in cold_start_scores:
            # ── 3. Cold-start TF-IDF (Switching) ─────────────────────────────
            biz = _apply_hybrid_score(biz, 0.0, cold_start_scores[bid], ctx_live, pop_raw)

        else:
            # ── 4. Fallback: city parquet or raw popularity ───────────────────
            rec = city_fallback.get(bid)
            if rec:
                biz["match"] = rec["match"]
                biz["cf"]    = rec.get("cf", 0)
                biz["cb"]    = 0
                biz["ctx"]   = round(ctx_live * 100)
                biz["pop"]   = rec.get("pop", 0)
            elif pop_raw:
                pop_pct      = round(pop_raw * 100)
                biz["match"] = max(1, pop_pct)
                biz["cf"]    = 0
                biz["cb"]    = 0
                biz["ctx"]   = round(ctx_live * 100)
                biz["pop"]   = pop_pct

        result.append(biz)

    return result
