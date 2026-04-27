import json
from pathlib import Path
from fastapi import APIRouter
from app.models import UserModel, TasteProfileModel

router = APIRouter()

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "mock"


def _load_user() -> dict:
    with open(DATA_DIR / "user.json", encoding="utf-8") as f:
        return json.load(f)


@router.get("/users/me", response_model=UserModel)
def get_me():
    return _load_user()


@router.post("/users/me/taste", response_model=TasteProfileModel)
def update_taste(taste: TasteProfileModel):
    # Phase 1: no-op — returns the body as received
    return taste
