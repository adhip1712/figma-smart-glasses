from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.repositories import DeviceRepository, NotificationRepository


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.device_repo = DeviceRepository(db)
        self.notification_repo = NotificationRepository(db)

    def get_summary(self) -> dict[str, object]:
        device = self.device_repo.get_or_create()
        notifications = self.notification_repo.list_for_user(None)
        return {
            "backend_online": True,
            "device_connected": device.status == "connected",
            "camera_streaming": device.camera_enabled,
            "system_status": device.status,
            "notifications_count": len(notifications),
            "message_count": 0,
            "weather_summary": "Clear skies",
        }
