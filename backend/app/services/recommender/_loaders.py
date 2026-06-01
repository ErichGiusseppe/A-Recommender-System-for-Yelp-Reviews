"""
Startup loaders — read artifacts from disk and populate _state.

Each function is called once at server startup (via startup() in __init__.py).
They are intentionally side-effect-only: they write to _state, return nothing.
"""
from __future__ import annotations

import json
import logging

import numpy as np

from app.config import settings
from . import _state as state

logger = logging.getLogger(__name__)


def load_mock_fallback() -> None:
    """Populate state from mock JSON files when parquets are unavailable."""
    with open(settings.MOCK_DIR / "businesses.json", encoding="utf-8") as f:
        businesses: list[dict] = json.load(f)

    recs_list = [
        {
            "business_id": b["id"],
            "score":       float(b["match"]),
            "cf":          b["cf"],
            "ctx":         b["ctx"],
            "pop":         b["pop"],
            "match":       b["match"],
        }
        for b in sorted(businesses, key=lambda b: b["match"], reverse=True)
    ]
    state.top_n["camila"]      = recs_list
    state.top_n["new_visitor"] = recs_list
    state.top_n["default"]     = recs_list

    for b in businesses:
        key = f"camila|{b['id']}"
        state.explanations[key] = {
            "cf": b["cf"], "cb": b.get("cb", 0),
            "ctx": b["ctx"], "pop": b["pop"], "match": b["match"],
        }

    state.model_version = "mock-0.1.0"
    logger.info("Recommender: mock fallback loaded")


def load_parquets() -> None:
    """Load top_n.parquet and explanations.parquet into state."""
    try:
        import pandas as pd  # type: ignore
    except ImportError:
        load_mock_fallback()
        return

    top_n_path = settings.DATA_DIR / "top_n.parquet"
    expl_path  = settings.DATA_DIR / "explanations.parquet"

    if not top_n_path.exists() or not expl_path.exists():
        logger.info("Parquets not found — mock fallback")
        load_mock_fallback()
        return

    try:
        top_df  = pd.read_parquet(top_n_path)
        expl_df = pd.read_parquet(expl_path)

        # Build top_n store: user_id → sorted list of recs
        score_lookup: dict[str, float] = {}
        for user_id, group in top_df.groupby("user_id"):
            group_sorted = group.sort_values("score", ascending=False)
            rows = group_sorted.to_dict("records")
            state.top_n[str(user_id)] = [
                {
                    "business_id": str(r["business_id"]),
                    "score":       round(float(r["score"]), 4),
                    "match":       min(99, max(1, int(round(float(r["score"]) * 100)))),
                    "cf": 0, "ctx": 0, "pop": 0,
                }
                for r in rows
            ]
            for r in rows:
                score_lookup[f"{user_id}|{r['business_id']}"] = float(r["score"])

        # Build explanations store
        for r in expl_df.to_dict("records"):
            uid   = str(r["user_id"])
            bid   = str(r["business_id"])
            key   = f"{uid}|{bid}"
            sc    = score_lookup.get(key, 0.0)
            state.explanations[key] = {
                "cf":    int(round(float(r["cf"]))),
                "cb":    0,
                "ctx":   int(round(float(r["ctx"]))),
                "pop":   int(round(float(r["pop"]))),
                "match": min(99, max(1, int(round(sc * 100)))),
            }

        # Back-fill breakdown scores into top_n entries
        for uid, recs in state.top_n.items():
            for rec in recs:
                expl = state.explanations.get(f"{uid}|{rec['business_id']}")
                if expl:
                    rec["cf"]  = expl["cf"]
                    rec["cb"]  = expl.get("cb", 0)
                    rec["ctx"] = expl["ctx"]
                    rec["pop"] = expl["pop"]

        # Load city lookup from business_meta.parquet
        meta_path = settings.DATA_DIR / "business_meta.parquet"
        if meta_path.exists():
            try:
                meta = pd.read_parquet(meta_path)
                if "city" in meta.columns:
                    for r in meta[["business_id", "city"]].to_dict("records"):
                        state.biz_city[str(r["business_id"])] = str(r.get("city", settings.DEFAULT_CITY))
                    logger.info("Recommender: city lookup loaded for %d businesses", len(state.biz_city))
                else:
                    logger.info("Recommender: no city column in parquet — regenerate to enable multi-city")
            except Exception as exc:
                logger.warning("City lookup load failed (%s) — city filter disabled", exc)

        eval_path = settings.DATA_DIR / "eval.json"
        state.model_version = "svdpp-hybrid-0.1.0"
        if eval_path.exists():
            with open(eval_path, encoding="utf-8") as f:
                state.model_version = json.load(f).get("model_version", "svdpp-hybrid-0.1.0")

        state.parquets_are_loaded = True
        logger.info("Recommender: %d users, %d explanations loaded", len(state.top_n), len(state.explanations))

    except Exception as exc:
        logger.warning("Error loading parquets (%s) — mock fallback", exc)
        load_mock_fallback()


def load_content_model() -> None:
    """Load TF-IDF content model and popularity lookup into state."""
    model_path = settings.DATA_DIR / "content_model.joblib"
    if not model_path.exists():
        logger.info("content_model.joblib not found — cold-start disabled")
        return

    try:
        import joblib  # type: ignore
        bundle = joblib.load(model_path)
        state.tfidf       = bundle["tfidf"]
        state.feature_mat = bundle["feature_mat"]
        state.biz_ids_cb  = bundle["biz_ids"]

        # Build normalized popularity lookup
        meta_path = settings.DATA_DIR / "business_meta.parquet"
        if meta_path.exists():
            import pandas as pd  # type: ignore
            meta   = pd.read_parquet(meta_path, columns=["business_id", "review_count"])
            log_rc = np.log1p(meta["review_count"].values.astype(float))
            norm   = log_rc / (log_rc.max() or 1.0)
            state.biz_pop_cb = dict(zip(meta["business_id"].tolist(), norm.tolist()))

        state.content_model_is_loaded = True
        logger.info("Content model loaded: %d businesses, %d features",
                    len(state.biz_ids_cb), state.feature_mat.shape[1])
    except Exception as exc:
        logger.warning("Error loading content_model.joblib (%s)", exc)


def load_svdpp_model() -> None:
    """Load the trained SVD++ model into state for folding-in and warm scoring."""
    model_path = settings.MODELS_DIR / "model_SVDpp_100.joblib"
    if not model_path.exists():
        logger.info("SVD++ model not found at %s — folding-in disabled", model_path)
        return

    try:
        import joblib  # type: ignore
        state.svdpp_model     = joblib.load(model_path)
        state.svdpp_is_loaded = True
        ts = state.svdpp_model.trainset
        logger.info("SVD++ model loaded: %d users, %d items, %d factors",
                    ts.n_users, ts.n_items, state.svdpp_model.n_factors)
    except Exception as exc:
        logger.warning("SVD++ model load failed (%s) — folding-in disabled", exc)
