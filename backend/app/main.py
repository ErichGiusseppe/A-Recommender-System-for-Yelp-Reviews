from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import HealthResponse
from app.routers import businesses, users, recommendations, search

app = FastAPI(
    title="Lantern API",
    description="Hybrid recommender backend for Lantern — MINE4201 Taller 2",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(businesses.router, tags=["businesses"])
app.include_router(users.router, tags=["users"])
app.include_router(recommendations.router, tags=["recommendations"])
app.include_router(search.router, tags=["search"])

_STARTED_AT = datetime.now(timezone.utc).isoformat()


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health():
    return HealthResponse(
        status="ok",
        model_version="mock-0.1.0",
        loaded_at=_STARTED_AT,
    )
