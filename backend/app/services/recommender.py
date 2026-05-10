"""
Recommender service: loads pre-computed parquets + trained models at startup.

Warm users  → SVD++ hybrid scores from top_n.parquet
Cold users  → content-based cosine similarity (content_model.joblib)
Unknown     → fallback to 'new_visitor' cold-start profile
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
MOCK_DIR = DATA_DIR / "mock"

# ── In-memory stores ────────────────────────────────────────────────────────
# user_id → list of {business_id, score, cf, ctx, pop, match}
_top_n: dict[str, list[dict]] = {}
# "user_id|business_id" → {cf, ctx, pop, match}
_explanations: dict[str, dict] = {}
# business_id → city (loaded from business_meta.parquet)
_biz_city: dict[str, str] = {}

# Content-based model (loaded from content_model.joblib)
_tfidf        = None
_feature_mat  = None   # scipy sparse (n_biz × n_features)
_biz_ids_cb: list[str] = []
_biz_pop_cb: dict[str, float] = {}

_model_version: str = "mock-0.1.0"
_loaded_from_parquet: bool = False
_content_model_ok: bool = False

# SVD++ model loaded at runtime for folding-in
_svdpp_model = None
_svdpp_ok: bool = False


# ── Mock fallback ───────────────────────────────────────────────────────────

def _load_mock_fallback() -> None:
    global _model_version
    with open(MOCK_DIR / "businesses.json", encoding="utf-8") as f:
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
    _top_n["camila"]      = recs_list
    _top_n["new_visitor"] = recs_list
    _top_n["default"]     = recs_list

    for b in businesses:
        key = f"camila|{b['id']}"
        _explanations[key] = {"cf": b["cf"], "ctx": b["ctx"], "pop": b["pop"], "match": b["match"]}

    _model_version = "mock-0.1.0"
    logger.info("Recommender: mock fallback loaded")


# ── Parquet loader ──────────────────────────────────────────────────────────

def _load_parquets() -> None:
    global _model_version, _loaded_from_parquet

    try:
        import pandas as pd  # type: ignore
    except ImportError:
        _load_mock_fallback()
        return

    top_n_path = DATA_DIR / "top_n.parquet"
    expl_path  = DATA_DIR / "explanations.parquet"

    if not top_n_path.exists() or not expl_path.exists():
        logger.info("Parquets not found — mock fallback")
        _load_mock_fallback()
        return

    try:
        top_df  = pd.read_parquet(top_n_path)
        expl_df = pd.read_parquet(expl_path)

        # top_n.parquet: user_id, business_id, score
        score_lookup: dict[str, float] = {}
        for user_id, group in top_df.groupby("user_id"):
            group_sorted = group.sort_values("score", ascending=False)
            _top_n[str(user_id)] = [
                {
                    "business_id": str(row["business_id"]),
                    "score":       round(float(row["score"]), 4),
                    "match":       min(99, max(1, int(round(float(row["score"]) * 100)))),
                    "cf": 0, "ctx": 0, "pop": 0,
                }
                for _, row in group_sorted.iterrows()
            ]
            for _, row in group_sorted.iterrows():
                score_lookup[f"{user_id}|{row['business_id']}"] = float(row["score"])

        # explanations.parquet: user_id, business_id, cf, ctx, pop
        for _, row in expl_df.iterrows():
            uid   = str(row["user_id"])
            bid   = str(row["business_id"])
            key   = f"{uid}|{bid}"
            sc    = score_lookup.get(key, 0.0)
            match = min(99, max(1, int(round(sc * 100))))
            _explanations[key] = {
                "cf":    int(round(float(row["cf"]))),
                "ctx":   int(round(float(row["ctx"]))),
                "pop":   int(round(float(row["pop"]))),
                "match": match,
            }

        # Back-fill cf/ctx/pop into top_n entries
        for uid, recs in _top_n.items():
            for rec in recs:
                expl = _explanations.get(f"{uid}|{rec['business_id']}")
                if expl:
                    rec["cf"]  = expl["cf"]
                    rec["ctx"] = expl["ctx"]
                    rec["pop"] = expl["pop"]

        # Load city lookup from business_meta.parquet
        meta_path = DATA_DIR / "business_meta.parquet"
        if meta_path.exists():
            try:
                meta = pd.read_parquet(meta_path)
                if "city" in meta.columns:
                    for _, row in meta.iterrows():
                        _biz_city[str(row["business_id"])] = str(row.get("city", "Philadelphia"))
                    logger.info("Recommender: city lookup loaded for %d businesses", len(_biz_city))
                else:
                    logger.info("Recommender: no city column in parquet — regenerate parquets to enable multi-city filtering")
            except Exception as meta_exc:
                logger.warning("City lookup load failed (%s) — city filter disabled", meta_exc)

        eval_path = DATA_DIR / "eval.json"
        _model_version = "als-hybrid-0.1.0"
        if eval_path.exists():
            with open(eval_path, encoding="utf-8") as f:
                _model_version = json.load(f).get("model_version", "als-hybrid-0.1.0")

        _loaded_from_parquet = True
        logger.info("Recommender: %d users, %d explanations loaded", len(_top_n), len(_explanations))

    except Exception as exc:
        logger.warning("Error loading parquets (%s) — mock fallback", exc)
        _load_mock_fallback()


# ── Content model loader ────────────────────────────────────────────────────

def _load_content_model() -> None:
    global _tfidf, _feature_mat, _biz_ids_cb, _biz_pop_cb, _content_model_ok

    model_path = DATA_DIR / "content_model.joblib"
    if not model_path.exists():
        logger.info("content_model.joblib not found — cold-start via pre-computed profiles only")
        return

    try:
        import joblib  # type: ignore
        bundle       = joblib.load(model_path)
        _tfidf       = bundle["tfidf"]
        _feature_mat = bundle["feature_mat"]
        _biz_ids_cb  = bundle["biz_ids"]

        # Build pop lookup from business_meta if available
        meta_path = DATA_DIR / "business_meta.parquet"
        if meta_path.exists():
            import pandas as pd  # type: ignore
            meta = pd.read_parquet(meta_path, columns=["business_id", "review_count"])
            log_rc = np.log1p(meta["review_count"].values.astype(float))
            norm   = log_rc / (log_rc.max() or 1.0)
            _biz_pop_cb = dict(zip(meta["business_id"].tolist(), norm.tolist()))

        _content_model_ok = True
        logger.info("Content model loaded: %d businesses, %d features",
                    len(_biz_ids_cb), _feature_mat.shape[1])
    except Exception as exc:
        logger.warning("Error loading content_model.joblib (%s)", exc)


# ── SVD++ runtime loader (for folding-in) ──────────────────────────────────

def _load_svdpp_model() -> None:
    global _svdpp_model, _svdpp_ok

    model_path = DATA_DIR / "models" / "model_SVDpp_100.joblib"
    if not model_path.exists():
        logger.info("SVD++ model not found at %s — folding-in disabled", model_path)
        return

    try:
        import joblib  # type: ignore
        _svdpp_model = joblib.load(model_path)
        _svdpp_ok = True
        ts = _svdpp_model.trainset
        logger.info(
            "SVD++ model loaded for folding-in: %d users, %d items",
            ts.n_users, ts.n_items,
        )
    except Exception as exc:
        logger.warning("SVD++ model load failed (%s) — folding-in disabled", exc)


# ── Folding-in (Brand 2006) ─────────────────────────────────────────────────

def _folding_in(
    raw_uid: str,
    user_ratings: dict[str, float],
) -> "tuple[np.ndarray, float] | None":
    """
    Compute updated user latent vector given new ratings, keeping Q fixed.

    Returns (p_u_new, bu) or None if the model is unavailable or there are
    too few ratings to solve the system.

    Math:
      residual r_i = stars_i - mu - bu - bi - qi · u_impl
      Solve: argmin ||Q p_u - r||^2  via np.linalg.lstsq
    """
    if not _svdpp_ok or _svdpp_model is None or not user_ratings:
        return None

    ts = _svdpp_model.trainset
    mu = ts.global_mean

    rated: list[tuple[int, float, float]] = []
    for bid, stars in user_ratings.items():
        try:
            i  = ts.to_inner_iid(bid)
            bi = float(_svdpp_model.bi[i])
            rated.append((i, float(stars), bi))
        except ValueError:
            pass

    if not rated:
        return None

    try:
        u  = ts.to_inner_uid(raw_uid)
        bu = float(_svdpp_model.bu[u])
        seen = ts.ur[u]
        u_impl = (
            _svdpp_model.yj[[iid for iid, _ in seen]].sum(axis=0) / np.sqrt(len(seen))
            if seen else np.zeros(_svdpp_model.n_factors)
        )
    except ValueError:
        bu     = 0.0
        u_impl = np.zeros(_svdpp_model.n_factors)

    Q = np.array([_svdpp_model.qi[i] for i, _, _  in rated], dtype=np.float64)
    r = np.array(
        [
            stars - mu - bu - bi - float(np.dot(_svdpp_model.qi[i], u_impl))
            for i, stars, bi in rated
        ],
        dtype=np.float64,
    )

    p_u_new, _, _, _ = np.linalg.lstsq(Q, r, rcond=None)
    return p_u_new.astype(np.float32), bu


def _svdpp_batch_pu(
    p_u: np.ndarray,
    bu: float,
    raw_iids: list[str],
) -> np.ndarray:
    """Score a list of business_ids using a provided p_u (e.g. folded-in)."""
    if not _svdpp_ok or _svdpp_model is None:
        return np.zeros(len(raw_iids))

    ts = _svdpp_model.trainset
    n  = len(raw_iids)
    qi = np.zeros((n, _svdpp_model.n_factors), dtype=np.float32)
    bi = np.zeros(n, dtype=np.float32)

    for k, raw_iid in enumerate(raw_iids):
        try:
            i     = ts.to_inner_iid(raw_iid)
            qi[k] = _svdpp_model.qi[i]
            bi[k] = float(_svdpp_model.bi[i])
        except ValueError:
            pass

    scores = ts.global_mean + bu + bi + (qi @ p_u)
    return np.clip(scores, 1.0, 5.0)


# ── Public API ──────────────────────────────────────────────────────────────

def startup() -> None:
    _load_parquets()
    _load_content_model()
    _load_svdpp_model()


def is_real_model() -> bool:
    return _loaded_from_parquet


def get_model_version() -> str:
    return _model_version


def get_recommendations(user_id: str, limit: int = 10, city: str | None = None) -> list[dict]:
    # Prefer city-specific cold-start key for anonymous users
    if city and user_id in ("new_visitor", "default"):
        city_key = f"{user_id}|{city}"
        recs = _top_n.get(city_key) or _top_n.get(user_id) or []
    else:
        recs = (
            _top_n.get(user_id)
            or _top_n.get("new_visitor")
            or _top_n.get("camila")
            or _top_n.get("default")
            or []
        )

    if city:
        recs = [r for r in recs if _biz_city.get(r["business_id"], "Philadelphia") == city]

    return recs[:limit]


def get_explanation(user_id: str, business_id: str) -> Optional[dict]:
    key = f"{user_id}|{business_id}"
    if key in _explanations:
        return _explanations[key]
    fallback = f"new_visitor|{business_id}"
    if fallback in _explanations:
        return _explanations[fallback]
    fallback2 = f"camila|{business_id}"
    if fallback2 in _explanations:
        return _explanations[fallback2]
    for rec in get_recommendations(user_id, 200):
        if rec["business_id"] == business_id:
            return {"cf": rec["cf"], "ctx": rec["ctx"], "pop": rec["pop"], "match": rec["match"]}
    return None


def get_cold_start_recommendations(
    categories: str,
    price_pref: int = 2,
    stars_pref: float = 0.8,
    limit: int = 50,
) -> list[dict]:
    """Dynamic cold-start using the content model (requires content_model.joblib)."""
    if not _content_model_ok or _tfidf is None or _feature_mat is None:
        return get_recommendations("new_visitor", limit)

    try:
        import scipy.sparse as sp  # type: ignore
        from sklearn.metrics.pairwise import cosine_similarity as cos_sim  # type: ignore

        tfidf_q  = _tfidf.transform([categories])
        num_q    = sp.csr_matrix(np.array([[stars_pref, 0.5, 1.0]]))
        price_oh = np.zeros((1, 4))
        price_oh[0, max(0, min(3, price_pref - 1))] = 1.0
        query    = sp.hstack([tfidf_q, num_q, sp.csr_matrix(price_oh)])

        sims     = cos_sim(query, _feature_mat).flatten()
        pop      = np.array([_biz_pop_cb.get(b, 0.0) for b in _biz_ids_cb])
        scores   = 0.75 * sims + 0.25 * pop

        top_idx  = np.argsort(scores)[::-1][:limit]
        return [
            {
                "business_id": _biz_ids_cb[i],
                "score":       round(float(scores[i]), 4),
                "match":       min(99, max(1, int(round(float(scores[i]) * 100)))),
                "cf":          0,
                "ctx":         round(float(sims[i]) * 100),
                "pop":         round(float(pop[i]) * 100),
            }
            for i in top_idx
        ]
    except Exception as exc:
        logger.warning("Dynamic cold-start failed (%s) — falling back to pre-computed", exc)
        return get_recommendations("new_visitor", limit)


def inject_scores(
    businesses: list[dict],
    user_id: str,
    city: str | None = None,
    hour: int | None = None,
    user_ratings: "dict[str, float] | None" = None,
) -> list[dict]:
    """Attach match/cf/ctx/pop and apply contextual re-ranking by time of day.

    When user_ratings is provided (stars keyed by business_id), folding-in is
    attempted to personalise scores without retraining the model. Rated businesses
    are excluded from the result.
    """
    from .contextual_scorer import contextual_rerank

    is_guest = user_id in ("new_visitor", "default") or not user_id
    personal_recs = [] if is_guest else _top_n.get(user_id, [])

    # City cold-start fallback — used when personal recs don't cover the city
    city_key     = f"new_visitor|{city}" if city else None
    city_fallback: dict = {
        r["business_id"]: r
        for r in (
            (_top_n.get(city_key) if city_key else None)
            or _top_n.get("new_visitor")
            or []
        )
    }

    if personal_recs:
        recs_by_id: dict = {r["business_id"]: r for r in personal_recs}
    else:
        recs_by_id = city_fallback

    rated_ids: set[str] = set(user_ratings.keys()) if user_ratings else set()

    # Folding-in: re-score with updated latent vector derived from new ratings
    folded: "dict[str, float] | None" = None
    if user_ratings and not is_guest:
        fi = _folding_in(user_id, user_ratings)
        if fi is not None:
            p_u_new, bu = fi
            unrated_ids = [b["id"] for b in businesses if b["id"] not in rated_ids]
            raw_scores  = _svdpp_batch_pu(p_u_new, bu, unrated_ids)
            # Normalise [1,5] → [0,1]
            norm   = (raw_scores - 1.0) / 4.0
            folded = dict(zip(unrated_ids, norm.tolist()))

    result = []
    for b in businesses:
        if b["id"] in rated_ids:
            continue
        biz = dict(b)
        if folded is not None:
            score        = folded.get(biz["id"], 0.0)
            match        = min(99, max(1, int(round(score * 100))))
            biz["match"] = match
            biz["cf"]    = match
            biz["ctx"]   = 0
            biz["pop"]   = 0
        else:
            rec = recs_by_id.get(biz["id"]) or city_fallback.get(biz["id"])
            if rec:
                biz["match"] = rec["match"]
                biz["cf"]    = rec["cf"]
                biz["ctx"]   = rec["ctx"]
                biz["pop"]   = rec["pop"]
        result.append(biz)

    # Post-filter: contextual re-ranking by hour (O(n), instant)
    if hour is not None:
        result = contextual_rerank(result, hour=hour)

    return result
