from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.router import router as api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import add_cors_middleware, add_rate_limit_middleware
from app.db.base import Base
from app.db.repositories import DEFAULT_SETTINGS, SettingsRepository
from app.db.session import SessionLocal, engine

configure_logging()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Smart glasses backend for AI, music, weather, device, settings, and camera features.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

add_cors_middleware(app)
add_rate_limit_middleware(app)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        repo = SettingsRepository(db)
        for key, value in DEFAULT_SETTINGS.items():
            repo.set(key, str(value), user_id=None)
    finally:
        db.close()


app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(api_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Visionary Nexus API is running"}
