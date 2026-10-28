from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DeviceState:
    connected: bool = False
    status: str = "offline"
    ip: str | None = None
    device_id: str = "sg-0001"
    firmware: str = "v1.0.0"
    battery: int = 74
    signal: int = 78
    camera: bool = True
    mic: bool = True
    speaker: bool = True


class DeviceService:
    def __init__(self):
        self.state = DeviceState()

    def get_status(self) -> DeviceState:
        return self.state

    def connect(self) -> DeviceState:
        self.state.connected = True
        self.state.status = "connected"
        self.state.ip = "10.0.0.24"
        return self.state

    def disconnect(self) -> DeviceState:
        self.state.connected = False
        self.state.status = "offline"
        self.state.ip = None
        return self.state

    def restart(self) -> DeviceState:
        self.state.status = "restarting"
        self.state.connected = True
        return self.state

    def sleep(self) -> DeviceState:
        self.state.status = "sleeping"
        self.state.connected = False
        return self.state

    def wake(self) -> DeviceState:
        self.state.connected = True
        self.state.status = "connected"
        return self.state
