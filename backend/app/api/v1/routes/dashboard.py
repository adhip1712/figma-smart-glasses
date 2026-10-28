from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(db: DbSession) -> DashboardSummary:
    service = DashboardService(db)
    data = service.get_summary()
    return DashboardSummary(
        backend_online=bool(data["backend_online"]),
        device_connected=bool(data["device_connected"]),
        camera_streaming=bool(data["camera_streaming"]),
        system_status=str(data["system_status"]),
        notifications_count=int(data["notifications_count"]),
        message_count=int(data["message_count"]),
        weather_summary=str(data["weather_summary"]),
    )
