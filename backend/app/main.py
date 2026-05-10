from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.models import HealthResponse
from app.routers import businesses, users, recommendations, search, auth_router
from app.services import recommender, business_store

_PHOTOS_DIR = Path(__file__).parent.parent / "data" / "real" / "photos" / "photos"

_STARTED_AT = datetime.now(timezone.utc).isoformat()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import init_db
    init_db()
    business_store.startup()
    recommender.startup()
    yield


app = FastAPI(
    title="Lantern API",
    description="Hybrid recommender backend for Lantern — MINE4201 Taller 2",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(businesses.router, tags=["businesses"])
app.include_router(users.router, tags=["users"])
app.include_router(recommendations.router, tags=["recommendations"])
app.include_router(search.router, tags=["search"])

if _PHOTOS_DIR.exists():
    app.mount("/photos", StaticFiles(directory=str(_PHOTOS_DIR)), name="photos")


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health():
    return HealthResponse(
        status="ok",
        model_version=recommender.get_model_version(),
        loaded_at=_STARTED_AT,
    )
