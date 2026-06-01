"""
Shared in-memory state for the recommender package.

All modules that need to read or write recommender state import from here.
Nothing outside this package should import these variables directly.
"""
from __future__ import annotations

# ── Pre-computed recommendation stores ───────────────────────────────────────
# user_id → sorted list of {business_id, score, cf, cb, ctx, pop, match}
top_n: dict[str, list[dict]] = {}

# "user_id|business_id" → {cf, cb, ctx, pop, match}
explanations: dict[str, dict] = {}

# business_id → city name (loaded from business_meta.parquet)
biz_city: dict[str, str] = {}

# ── Content-based model ───────────────────────────────────────────────────────
tfidf        = None   # sklearn TfidfVectorizer
feature_mat  = None   # scipy sparse matrix (n_businesses × n_features)
biz_ids_cb: list[str] = []              # ordered list of business_ids in feature_mat
biz_pop_cb: dict[str, float] = {}       # business_id → normalized popularity [0,1]

# ── SVD++ model ───────────────────────────────────────────────────────────────
svdpp_model        = None   # scikit-surprise SVDpp instance
svdpp_is_loaded: bool = False

# ── Flags ─────────────────────────────────────────────────────────────────────
content_model_is_loaded: bool = False
parquets_are_loaded:     bool = False
model_version: str = "mock-0.1.0"
