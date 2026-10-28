from __future__ import annotations

from fastapi import APIRouter

from app.schemas.device import CameraStatusOut
from app.services.vision_service import VisionService

router = APIRouter()
service = VisionService()


@router.get("/status", response_model=CameraStatusOut)
def get_status() -> CameraStatusOut:
    state = service.get_status()
    return CameraStatusOut(
        streaming=state.streaming,
        capturing=state.capturing,
        resolution=state.resolution,
        fps=state.fps,
        status=state.status,
    )


@router.post("/start")
def start_camera() -> CameraStatusOut:
    service.start()
    return get_status()


@router.post("/stop")
def stop_camera() -> CameraStatusOut:
    service.stop()
    return get_status()


@router.post("/capture")
def capture_frame() -> CameraStatusOut:
    service.capture()
    return get_status()


@router.get("/stream")
def stream() -> dict[str, str]:
    return {"status": "streaming", "url": "http://localhost:8001/api/camera/stream"}
