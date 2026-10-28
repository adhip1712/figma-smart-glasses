from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "healthy": True, "service": "visionary-nexus"}


@router.get("/status")
def status() -> dict[str, str | bool]:
    return {"status": "online", "backend_online": True, "api_version": "v1"}
