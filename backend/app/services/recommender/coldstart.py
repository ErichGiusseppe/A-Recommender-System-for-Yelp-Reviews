"""
Content-based cold-start scoring.

Uses a TF-IDF + cosine similarity model to score businesses against a user
preference profile when no collaborative filtering signal is available.
"""
from __future__ import annotations

import logging

import numpy as np

from app.config import settings
from . import _state as state

logger = logging.getLogger(__name__)


def _compute_raw_scores(
    categories: str,
    price_pref: int,
    stars_pref: float,
) -> "tuple[np.ndarray, np.ndarray] | None":
    """Compute (combined_scores, tfidf_similarities) over all businesses in the content model.

    combined_score = 0.75 · tfidf_similarity + 0.25 · popularity
    Returns None if the content model is not loaded.
    """
    if not state.content_model_is_loaded or state.tfidf is None or state.feature_mat is None:
        return None

    try:
        import scipy.sparse as sp  # type: ignore
        from sklearn.metrics.pairwise import cosine_similarity  # type: ignore

        tfidf_query  = state.tfidf.transform([categories])
        # Numeric features: [stars_pref, avg_price_normalized, is_open_flag]
        numeric_query = sp.csr_matrix(np.array([[stars_pref, 0.5, 1.0]]))
        price_onehot  = np.zeros((1, 4))
        price_onehot[0, max(0, min(3, price_pref - 1))] = 1.0
        query = sp.hstack([tfidf_query, numeric_query, sp.csr_matrix(price_onehot)])

        tfidf_sims = cosine_similarity(query, state.feature_mat).flatten()
        popularity = np.array([state.biz_pop_cb.get(b, 0.0) for b in state.biz_ids_cb])
        combined   = 0.75 * tfidf_sims + 0.25 * popularity
        return combined, tfidf_sims

    except Exception as exc:
        logger.warning("Content model scoring failed: %s", exc)
        return None


def get_content_scores_for_city(
    categories: str,
    price_pref: int = 2,
    stars_pref: float = 0.8,
    city: str | None = None,
) -> dict[str, float]:
    """Return {business_id: score [0,1]} filtered by city for use in inject_scores().

    Called by the /businesses router when a cold-start user is identified.
    Returns an empty dict if the content model is not available.
    """
    result = _compute_raw_scores(categories, price_pref, stars_pref)
    if result is None:
        return {}

    scores, _ = result
    return {
        bid: float(scores[i])
        for i, bid in enumerate(state.biz_ids_cb)
        if not city or state.biz_city.get(bid) == city
    }


def get_top_cold_start_recommendations(
    categories: str,
    price_pref: int = 2,
    stars_pref: float = 0.8,
    limit: int = 50,
    city: str | None = None,
) -> list[dict]:
    """Return top-N cold-start recommendations as scored dicts.

    Used by the /recommendations/cold-start endpoint.
    Falls back to new_visitor parquet if content model is unavailable.
    """
    result = _compute_raw_scores(categories, price_pref, stars_pref)
    if result is None:
        fallback = state.top_n.get("new_visitor") or []
        return fallback[:limit]

    scores, tfidf_sims = result
    popularity = np.array([state.biz_pop_cb.get(b, 0.0) for b in state.biz_ids_cb])

    if city:
        city_mask = np.array([state.biz_city.get(b, "") == city for b in state.biz_ids_cb])
        filtered  = scores * city_mask
        top_idx   = np.argsort(filtered)[::-1][:limit]
        if not city_mask.any():  # no businesses for this city in model → use global
            top_idx = np.argsort(scores)[::-1][:limit]
    else:
        top_idx = np.argsort(scores)[::-1][:limit]

    return [
        {
            "business_id": state.biz_ids_cb[i],
            "score":       round(float(scores[i]), 4),
            "match":       min(99, max(1, int(round(float(scores[i]) * 100)))),
            "cf":          0,
            "cb":          round(float(tfidf_sims[i]) * 100),
            "ctx":         0,
            "pop":         round(float(popularity[i]) * 100),
        }
        for i in top_idx
    ]
