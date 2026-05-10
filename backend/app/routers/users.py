import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from fastapi import APIRouter, Depends, Response
from app.models import UserModel, TasteProfileModel
from app.auth import get_current_user, require_auth, _profiles, get_demo_accounts
from app.services import recommender, business_store

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data"
MOCK_DIR = DATA_DIR / "mock"

_DEFAULT_SEASON_BARS = [
    {"label": "Italian",   "value": 28},
    {"label": "Wine bars", "value": 22},
    {"label": "Cocktails", "value": 18},
    {"label": "Brunch",    "value": 14},
    {"label": "Coffee",    "value": 11},
    {"label": "Asian",     "value": 7},
]


def _load_mock_user() -> dict:
    with open(MOCK_DIR / "user.json", encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("season_taste", _DEFAULT_SEASON_BARS)
    return data


def _compute_season_taste(user_id: str) -> list[dict]:
    """Top categories from user's top-30 recommendations."""
    top_recs = recommender.get_recommendations(user_id, limit=30)
    cat_counts: dict[str, int] = {}
    for rec in top_recs:
        biz = business_store.get_business(rec["business_id"])
        if biz:
            cat = biz["category"]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    if not cat_counts:
        return _DEFAULT_SEASON_BARS
    total = sum(cat_counts.values())
    sorted_cats = sorted(cat_counts.items(), key=lambda x: -x[1])[:6]
    return [
        {"label": cat, "value": round(count / total * 100)}
        for cat, count in sorted_cats
    ]


@router.get("/users/me", response_model=UserModel)
def get_me(current_user: SimpleNamespace = Depends(get_current_user)):
    if current_user.is_guest:
        return _load_mock_user()

    profiles = _profiles()
    profile = profiles.get(current_user.username, {})
    name = profile.get("name", current_user.username)
    parts = name.split()
    first = parts[0] if parts else name
    avatar = profile.get("avatar", (name[:2].upper() if len(name) >= 2 else "??"))

    top_recs = recommender.get_recommendations(current_user.user_id, limit=50)
    saved_ids = [r["business_id"] for r in top_recs[:12]]
    season_taste = _compute_season_taste(current_user.user_id)

    return {
        "id": current_user.username,
        "name": name,
        "first_name": first,
        "avatar": avatar,
        "location": "Philadelphia",
        "bio": "Exploring Philadelphia one plate at a time.",
        "member_since": "2024",
        "stats": {
            "saved":      len(saved_ids),
            "reviews":    max(5, len(top_recs) // 3),
            "cities":     1,
            "avg_rating": 4.2,
        },
        "taste": {"italian": 70, "asian": 65, "cozy": 80, "lively": 50, "cheap": 40, "special": 70},
        "saved_business_ids": saved_ids,
        "cities_visited": ["Philadelphia"],
        "season_taste": season_taste,
    }


@router.get("/users/list")
def list_users():
    return get_demo_accounts()


@router.post("/users/me/taste", response_model=TasteProfileModel)
def update_taste(
    taste: TasteProfileModel,
    current_user: SimpleNamespace = Depends(get_current_user),
):
    return taste


@router.post("/users/me/coldstart", status_code=204)
def save_coldstart(
    profile: dict,
    current_user: SimpleNamespace = Depends(require_auth),
):
    """Persist a cold-start preference profile linked to the authenticated user."""
    from app.database import get_conn
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO user_preferences (user_id, coldstart_json, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET
                 coldstart_json = excluded.coldstart_json,
                 updated_at     = excluded.updated_at""",
            (current_user.user_id, json.dumps(profile), now),
        )
        conn.commit()
    return Response(status_code=204)


@router.get("/users/me/coldstart")
def get_coldstart(current_user: SimpleNamespace = Depends(require_auth)):
    """Return the stored cold-start profile for the authenticated user, or null."""
    from app.database import get_conn
    with get_conn() as conn:
        row = conn.execute(
            "SELECT coldstart_json FROM user_preferences WHERE user_id = ?",
            (current_user.user_id,),
        ).fetchone()
    if row:
        return json.loads(row["coldstart_json"])
    return None
