"""
Recommender service: loads pre-computed parquets (top_n + explanations) at
startup. Falls back to mock JSON when parquets are missing so the API keeps
running during development before the notebook is executed.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Optional

import logging

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
MOCK_DIR = DATA_DIR / "mock"

# Populated on startup
_top_n: dict[str, list[dict]] = {}        # user_id → [{"business_id", "score", "cf", "ctx", "pop"}]
_explanations: dict[str, dict] = {}       # "user_id|business_id" → {cf, ctx, pop, match}
_model_version: str = "mock-0.1.0"
_loaded_from_parquet: bool = False


def _load_mock_fallback() -> None:
    global _model_version
    with open(MOCK_DIR / "businesses.json", encoding="utf-8") as f:
        businesses: list[dict] = json.load(f)

    items = sorted(businesses, key=lambda b: b["match"], reverse=True)
    recs = [
        {
            "business_id": b["id"],
            "score": float(b["match"]),
            "cf": b["cf"],
            "ctx": b["ctx"],
            "pop": b["pop"],
        }
        for b in items
    ]

    _top_n["camila"] = recs
    _top_n["default"] = recs

    for b in businesses:
        key = f"camila|{b['id']}"
        _explanations[key] = {
            "cf": b["cf"],
            "ctx": b["ctx"],
            "pop": b["pop"],
            "match": b["match"],
        }

    _model_version = "mock-0.1.0"
    logger.info("Recommender: loaded mock fallback (parquets not found)")


def _load_parquets() -> None:
    global _model_version, _loaded_from_parquet

    try:
        import pandas as pd  # type: ignore
    except ImportError:
        logger.warning("pandas not installed — using mock fallback")
        _load_mock_fallback()
        return

    top_n_path = DATA_DIR / "top_n.parquet"
    expl_path = DATA_DIR / "explanations.parquet"

    if not top_n_path.exists() or not expl_path.exists():
        logger.info("Parquets not found — using mock fallback")
        _load_mock_fallback()
        return

    try:
        top_df = pd.read_parquet(top_n_path)
        expl_df = pd.read_parquet(expl_path)

        # top_n.parquet columns: user_id, business_id, score, cf, ctx, pop, rank
        for user_id, group in top_df.groupby("user_id"):
            group_sorted = group.sort_values("rank")
            _top_n[str(user_id)] = [
                {
                    "business_id": str(row["business_id"]),
                    "score": float(row["score"]),
                    "cf": int(round(float(row["cf"]))),
                    "ctx": int(round(float(row["ctx"]))),
                    "pop": int(round(float(row["pop"]))),
                }
                for _, row in group_sorted.iterrows()
            ]

        # explanations.parquet columns: user_id, business_id, score, cf, ctx, pop, match
        for _, row in expl_df.iterrows():
            key = f"{row['user_id']}|{row['business_id']}"
            _explanations[key] = {
                "cf": int(round(float(row["cf"]))),
                "ctx": int(round(float(row["ctx"]))),
                "pop": int(round(float(row["pop"]))),
                "match": int(round(float(row["match"]))),
            }

        # read model version from eval.json if available
        eval_path = DATA_DIR / "eval.json"
        if eval_path.exists():
            with open(eval_path, encoding="utf-8") as f:
                eval_data = json.load(f)
            _model_version = eval_data.get("model_version", "als-0.1.0")
        else:
            _model_version = "als-0.1.0"

        _loaded_from_parquet = True
        logger.info(
            "Recommender: loaded %d user vectors and %d explanations from parquets",
            len(_top_n),
            len(_explanations),
        )

    except Exception as exc:
        logger.warning("Error loading parquets (%s) — using mock fallback", exc)
        _load_mock_fallback()


def startup() -> None:
    """Call once at application startup."""
    _load_parquets()


def is_real_model() -> bool:
    return _loaded_from_parquet


def get_model_version() -> str:
    return _model_version


def get_recommendations(user_id: str, limit: int = 10) -> list[dict]:
    recs = _top_n.get(user_id) or _top_n.get("camila") or _top_n.get("default") or []
    return recs[:limit]


def get_explanation(user_id: str, business_id: str) -> Optional[dict]:
    # exact match first
    key = f"{user_id}|{business_id}"
    if key in _explanations:
        return _explanations[key]

    # fallback: any user for this business
    fallback_key = f"camila|{business_id}"
    if fallback_key in _explanations:
        return _explanations[fallback_key]

    # last resort: derive from top_n entry
    for rec in _top_n.get(user_id, _top_n.get("camila", [])):
        if rec["business_id"] == business_id:
            total = rec["cf"] + rec["ctx"] + rec["pop"]
            if total == 0:
                total = 1
            return {
                "cf": rec["cf"],
                "ctx": rec["ctx"],
                "pop": rec["pop"],
                "match": int(round(rec["score"])),
            }

    return None
