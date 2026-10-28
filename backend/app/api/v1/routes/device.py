from __future__ import annotations

from fastapi import APIRouter

from app.schemas.device import DeviceStatusOut
from app.services.device_service import DeviceService

router = APIRouter()
service = DeviceService()


@router.get("/status", response_model=DeviceStatusOut)
def get_status() -> DeviceStatusOut:
    state = service.get_status()
    return DeviceStatusOut(
        connected=state.connected,
        status=state.status,
        ip=state.ip,
        device_id=state.device_id,
        firmware=state.firmware,
        battery=state.battery,
        signal=state.signal,
        camera=state.camera,
        mic=state.mic,
        speaker=state.speaker,
    )


@router.post("/connect")
def connect() -> DeviceStatusOut:
    return get_status() if not service.connect().connected else get_status()


@router.post("/disconnect")
def disconnect() -> DeviceStatusOut:
    service.disconnect()
    return get_status()


@router.post("/restart")
def restart() -> DeviceStatusOut:
    service.restart()
    return get_status()


@router.post("/sleep")
def sleep() -> DeviceStatusOut:
    service.sleep()
    return get_status()


@router.post("/wake")
def wake() -> DeviceStatusOut:
    service.wake()
    return get_status()
