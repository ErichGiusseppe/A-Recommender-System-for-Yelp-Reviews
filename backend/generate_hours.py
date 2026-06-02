"""
generate_hours.py — extract business hours from the Yelp dataset.

Reads yelp_academic_dataset_business.json and saves a lightweight parquet
with one row per business: business_id + hours as a JSON string.

Output: backend/data/business_hours.parquet
Run time: ~10 seconds (sequential JSON read, no model training).

Usage:
    cd backend
    python generate_hours.py
"""
import json
import time
from pathlib import Path

DATA_DIR   = Path(__file__).parent / "data"
YELP_BIZ   = DATA_DIR / "yelp_dataset" / "yelp_academic_dataset_business.json"
OUT_PATH   = DATA_DIR / "business_hours.parquet"


def main() -> None:
    try:
        import pandas as pd
    except ImportError:
        print("ERROR: pandas not installed.")
        return

    if not YELP_BIZ.exists():
        print(f"ERROR: {YELP_BIZ} not found")
        return

    print("Reading business hours from Yelp dataset...", flush=True)
    t0 = time.time()

    rows = []
    with open(YELP_BIZ, encoding="utf-8") as f:
        for line in f:
            try:
                b = json.loads(line)
                hours = b.get("hours")  # dict or None
                rows.append({
                    "business_id": b["business_id"],
                    "hours_json":  json.dumps(hours) if hours else "",
                })
            except Exception:
                continue

    df = pd.DataFrame(rows)
    df.to_parquet(OUT_PATH, index=False)

    with_hours = (df.hours_json != "").sum()
    print(
        f"Done in {time.time() - t0:.1f}s — "
        f"{len(df):,} businesses, "
        f"{with_hours:,} with hours data ({with_hours / len(df) * 100:.1f}%)\n"
        f"→ {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
