from __future__ import annotations

from pydantic import BaseModel


class DeviceStatusOut(BaseModel):
    connected: bool
    status: str
    ip: str | None = None
    device_id: str
    firmware: str
    battery: int
    signal: int
    camera: bool = True
    mic: bool = True
    speaker: bool = True


class CameraStatusOut(BaseModel):
    streaming: bool
    capturing: bool
    resolution: str
    fps: int
    status: str
