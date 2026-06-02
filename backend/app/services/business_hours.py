"""
Business hours service.

Loads business_hours.parquet at startup and provides is_open_now() for
pre-filtering the /businesses endpoint to only serve currently-open businesses.

Parsing rules (derived from Yelp dataset analysis):
  1. All days = "0:0-0:0"  → 24/7 (Wawa, Walmart) → always open
  2. One day  = "0:0-0:0"  → closed that day
  3. "H:M-0:0" where H≠0   → closes at midnight (treated as 24:00)
  4. Day absent from dict   → closed that day
  5. No hours data at all   → include by default (fail open)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Day names exactly as stored in the Yelp dataset
_YELP_DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

# In-memory store: business_id → hours dict (or None)
_hours: dict[str, Optional[dict[str, str]]] = {}
_loaded: bool = False

# When True, all days in a business hours dict are "0:0-0:0" → treat as 24/7
_ALL_ZERO = "0:0-0:0"


def _parse_minutes(time_str: str, *, is_close: bool = False) -> int:
    """Convert 'H:M' to minutes since midnight. Closing '0:0' → 1440 (24h)."""
    h, m = map(int, time_str.split(":"))
    if is_close and h == 0 and m == 0:
        return 24 * 60  # midnight = end of day
    return h * 60 + m


def _is_open_at(hours_dict: dict[str, str], day_name: str, current_minutes: int) -> bool:
    """Return True if the business is open at the given day and time-of-day."""
    # All days 0:0-0:0 → 24/7
    if all(v == _ALL_ZERO for v in hours_dict.values()):
        return True

    slot = hours_dict.get(day_name)
    if slot is None:
        return False  # day not listed → closed

    if slot == _ALL_ZERO:
        return False  # this day is 0:0-0:0 but others aren't → closed today

    try:
        open_str, close_str = slot.split("-")
        open_min  = _parse_minutes(open_str)
        close_min = _parse_minutes(close_str, is_close=True)
        return open_min <= current_minutes < close_min
    except (ValueError, AttributeError):
        return True  # unparseable → fail open


def startup() -> None:
    """Load business_hours.parquet into memory. Called once at server startup."""
    global _hours, _loaded

    parquet_path = settings.DATA_DIR / "business_hours.parquet"
    if not parquet_path.exists():
        logger.info("business_hours.parquet not found — run generate_hours.py to enable is_open filter")
        return

    try:
        import pandas as pd  # type: ignore
        df = pd.read_parquet(parquet_path)
        for row in df.to_dict("records"):
            bid  = str(row["business_id"])
            raw  = row.get("hours_json", "")
            _hours[bid] = json.loads(raw) if raw else None
        _loaded = True
        with_hours = sum(1 for v in _hours.values() if v)
        logger.info(
            "business_hours: loaded %d businesses (%d with hours data)",
            len(_hours), with_hours,
        )
    except Exception as exc:
        logger.warning("business_hours: failed to load parquet (%s) — filter disabled", exc)


def is_open_now(business_id: str, dt: Optional[datetime] = None) -> bool:
    """Return True if the business is likely open at the given datetime.

    Falls back to True (include) when:
      - Hours data was not loaded (generate_hours.py not run)
      - This specific business has no hours entry
      - The hours entry is empty / unparseable
    """
    if not _loaded:
        return True  # no data → fail open

    hours_dict = _hours.get(business_id)
    if hours_dict is None:
        return True  # no hours entry → fail open

    now = dt or datetime.now()
    day_name = now.strftime("%A")          # "Monday", "Tuesday", …
    current_minutes = now.hour * 60 + now.minute

    return _is_open_at(hours_dict, day_name, current_minutes)
