"""
Central configuration for the Lantern backend.

All paths, constants and tuneable parameters live here.
Import as: from app.config import settings
"""
from __future__ import annotations

import os
from pathlib import Path


class Settings:
    # ── Paths ────────────────────────────────────────────────────────────────
    BASE_DIR:    Path = Path(__file__).parent.parent
    DATA_DIR:    Path = BASE_DIR / "data"
    MOCK_DIR:    Path = BASE_DIR / "data" / "mock"
    MODELS_DIR:  Path = BASE_DIR / "data" / "models"
    PHOTOS_DIR:  Path = BASE_DIR / "data" / "real" / "photos" / "photos"
    PHOTOS_JSON: Path = BASE_DIR / "data" / "real" / "photos" / "photos.json"

    # ── Hybrid recommender weights (must sum to 1.0) ──────────────────────
    W_CF:  float = 0.60   # collaborative filtering (SVD++)
    W_CTX: float = 0.25   # contextual (time-of-day)
    W_POP: float = 0.15   # popularity prior

    # ── SVD++ model ──────────────────────────────────────────────────────
    SVDPP_N_FACTORS: int = 25

    # ── Cold-start transition ────────────────────────────────────────────
    # Minimum app ratings before folding-in activates for any user.
    # Below this threshold everyone uses cold-start TF-IDF regardless of
    # whether they are in the SVD++ trainset or not (KISS consistency rule).
    MIN_RATINGS_FOR_FOLDING_IN: int = 5

    # ── Geographic defaults ──────────────────────────────────────────────
    DEFAULT_CITY: str   = "Philadelphia"
    DEFAULT_LAT:  float = 39.9526
    DEFAULT_LNG:  float = -75.1652

    # ── Identity constants ────────────────────────────────────────────────
    GUEST_USER_ID: str = "new_visitor"

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET:       str = os.getenv("JWT_SECRET", "lantern-dev-secret-change-before-deploy-2026")
    JWT_ALGORITHM:    str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # ── Photos ───────────────────────────────────────────────────────────
    PHOTOS_BASE_URL: str = os.environ.get("PHOTOS_BASE_URL", "http://localhost:8000/photos")


settings = Settings()
