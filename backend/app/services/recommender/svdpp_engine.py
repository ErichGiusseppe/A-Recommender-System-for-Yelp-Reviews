"""
SVD++ scoring engine.

Responsible for three operations, all using the loaded SVD++ model:
  1. build_warm_user_vector  — retrieve the effective user vector from the trainset
  2. compute_folding_in_vector — update user vector from new ratings (Brand 2006)
  3. score_all_businesses_for_user — fast numpy batch scoring over all candidates
"""
from __future__ import annotations

import logging

import numpy as np

from . import _state as state

logger = logging.getLogger(__name__)


def build_warm_user_vector(user_id: str) -> "tuple[np.ndarray, float] | None":
    """Return (u_eff, b_u) for a user already in the trained SVD++ model.

    u_eff = p_u + (1/√|N(u)|) · Σ y_j   — same formula used at training time.
    Returns None if the model is not loaded or the user is not in the trainset.
    """
    if not state.svdpp_is_loaded or state.svdpp_model is None:
        return None

    ts = state.svdpp_model.trainset
    try:
        u = ts.to_inner_uid(user_id)
    except ValueError:
        return None  # user not in trainset → caller falls through to cold-start

    b_u  = float(state.svdpp_model.bu[u])
    seen = ts.ur[u]
    implicit_feedback = (
        state.svdpp_model.yj[[iid for iid, _ in seen]].sum(axis=0) / np.sqrt(max(1, len(seen)))
        if seen else np.zeros(state.svdpp_model.n_factors)
    )
    u_eff = (state.svdpp_model.pu[u] + implicit_feedback).astype(np.float32)
    return u_eff, b_u


def compute_folding_in_vector(
    user_id: str,
    user_ratings: dict[str, float],
) -> "tuple[np.ndarray, float] | None":
    """Update user latent vector from new ratings without retraining (Brand 2006).

    Keeps the item matrix Q fixed and solves:
        argmin ‖Q · p_u − r‖²   via numpy least squares

    where residual r_i = stars_i − μ − b_u − b_i − q_i · u_impl.

    Returns (p_u_new, b_u) or None if the model is unavailable or
    no rated businesses exist in the trainset.
    """
    if not state.svdpp_is_loaded or state.svdpp_model is None or not user_ratings:
        return None

    ts = state.svdpp_model.trainset
    mu = ts.global_mean

    # Collect (inner_item_id, stars, b_i) for all rated businesses in the trainset
    rated_items: list[tuple[int, float, float]] = []
    for business_id, stars in user_ratings.items():
        try:
            inner_id = ts.to_inner_iid(business_id)
            b_i      = float(state.svdpp_model.bi[inner_id])
            rated_items.append((inner_id, float(stars), b_i))
        except ValueError:
            pass  # business not in trainset, skip

    if not rated_items:
        return None

    # Retrieve user bias and implicit feedback (use zeros for new users)
    try:
        inner_u = ts.to_inner_uid(user_id)
        b_u     = float(state.svdpp_model.bu[inner_u])
        seen    = ts.ur[inner_u]
        u_impl  = (
            state.svdpp_model.yj[[iid for iid, _ in seen]].sum(axis=0) / np.sqrt(len(seen))
            if seen else np.zeros(state.svdpp_model.n_factors)
        )
    except ValueError:
        b_u    = 0.0
        u_impl = np.zeros(state.svdpp_model.n_factors)

    # Build Q (item factor matrix) and residual vector r
    Q = np.array([state.svdpp_model.qi[i] for i, _, _ in rated_items], dtype=np.float64)
    r = np.array(
        [stars - mu - b_u - b_i - float(np.dot(state.svdpp_model.qi[i], u_impl))
         for i, stars, b_i in rated_items],
        dtype=np.float64,
    )

    p_u_new, _, _, _ = np.linalg.lstsq(Q, r, rcond=None)
    return p_u_new.astype(np.float32), b_u


def score_all_businesses_for_user(
    p_u: np.ndarray,
    b_u: float,
    business_ids: list[str],
) -> np.ndarray:
    """Score a list of businesses using the provided user vector.

    Formula: r̂_ui = μ + b_u + b_i + q_i · p_u  (clipped to [1, 5]).
    Uses numpy matrix multiplication — O(n·k) where k=25 factors.
    Returns raw predicted ratings in [1, 5] aligned with business_ids.
    """
    if not state.svdpp_is_loaded or state.svdpp_model is None:
        return np.zeros(len(business_ids))

    ts = state.svdpp_model.trainset
    n  = len(business_ids)
    qi = np.zeros((n, state.svdpp_model.n_factors), dtype=np.float32)
    bi = np.zeros(n, dtype=np.float32)

    for idx, business_id in enumerate(business_ids):
        try:
            inner_id  = ts.to_inner_iid(business_id)
            qi[idx]   = state.svdpp_model.qi[inner_id]
            bi[idx]   = float(state.svdpp_model.bi[inner_id])
        except ValueError:
            pass  # business not in trainset — qi and bi stay zero

    raw_scores = ts.global_mean + b_u + bi + (qi @ p_u)
    return np.clip(raw_scores, 1.0, 5.0)
