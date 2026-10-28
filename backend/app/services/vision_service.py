from __future__ import annotations

from dataclasses import dataclass


@dataclass
class CameraState:
    streaming: bool = False
    capturing: bool = False
    resolution: str = "1920x1080"
    fps: int = 30
    status: str = "standby"


class VisionService:
    def __init__(self):
        self.state = CameraState()

    def get_status(self) -> CameraState:
        return self.state

    def start(self) -> CameraState:
        self.state.streaming = True
        self.state.status = "streaming"
        return self.state

    def stop(self) -> CameraState:
        self.state.streaming = False
        self.state.status = "stopped"
        return self.state

    def capture(self) -> CameraState:
        self.state.capturing = True
        self.state.status = "capturing"
        return self.state

    def reset_capture(self) -> CameraState:
        self.state.capturing = False
        self.state.status = "streaming" if self.state.streaming else "standby"
        return self.state
