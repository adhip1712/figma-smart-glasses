from __future__ import annotations

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    backend_online: bool
    device_connected: bool
    camera_streaming: bool
    system_status: str
    notifications_count: int
    message_count: int
    weather_summary: str
