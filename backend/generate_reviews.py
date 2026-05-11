"""
generate_reviews.py — extrae top-10 reviews por negocio del dataset Yelp.

Criterio de "interesante": suma de votos útiles + funny + cool (validación comunitaria).
Filtra reviews con texto < 80 chars. Trunca a 500 chars para no inflar el parquet.

Output: backend/data/reviews_sample.parquet
Tiempo estimado: ~2-4 min (lee 6.9M reviews línea a línea).
"""
import json
import time
from collections import defaultdict
from pathlib import Path

DATA_DIR    = Path(__file__).parent / "data"
REVIEW_JSON = DATA_DIR / "yelp_dataset" / "yelp_academic_dataset_review.json"
META_PATH   = DATA_DIR / "business_meta.parquet"
OUT_PATH    = DATA_DIR / "reviews_sample.parquet"

TOP_K   = 10   # reviews per business
MIN_LEN = 80   # min text length to avoid "Great place!" junk


def main() -> None:
    try:
        import pandas as pd
    except ImportError:
        print("ERROR: pandas not installed. Run: pip install pandas pyarrow")
        return

    if not REVIEW_JSON.exists():
        print(f"ERROR: {REVIEW_JSON} not found")
        return
    if not META_PATH.exists():
        print(f"ERROR: {META_PATH} not found — run generate_parquets.py first")
        return

    meta = pd.read_parquet(META_PATH, columns=["business_id"])
    known = set(meta["business_id"].tolist())
    print(f"Businesses in meta: {len(known):,}")

    bucket: dict[str, list] = defaultdict(list)
    t0 = time.time()

    with open(REVIEW_JSON, encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i % 500_000 == 0 and i > 0:
                print(f"  {i:,} reviews scanned ({time.time()-t0:.0f}s)…", flush=True)
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue

            bid  = r.get("business_id", "")
            text = (r.get("text") or "").strip()
            if bid not in known or len(text) < MIN_LEN:
                continue

            votes = (
                int(r.get("useful", 0))
                + int(r.get("funny",  0))
                + int(r.get("cool",   0))
            )
            bucket[bid].append({
                "business_id": bid,
                "stars":       float(r.get("stars", 3)),
                "text":        text[:500],
                "date":        str(r.get("date", ""))[:10],
                "votes":       votes,
            })

    print(f"Scanned {i+1:,} reviews in {time.time()-t0:.1f}s. Selecting top-{TOP_K}…")

    rows = []
    for bid, revs in bucket.items():
        top = sorted(revs, key=lambda x: x["votes"], reverse=True)[:TOP_K]
        rows.extend(top)

    import pandas as pd  # already imported above but explicit for clarity
    df = pd.DataFrame(rows)
    df.to_parquet(OUT_PATH, index=False)
    print(
        f"Saved {len(df):,} reviews for {df['business_id'].nunique():,} businesses\n"
        f"→ {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
