from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.notifications import NotificationCreate, NotificationOut
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(db: DbSession) -> list[NotificationOut]:
    service = NotificationService(db)
    items = service.list_for_user(None)
    return [
        NotificationOut(
            id=item["id"],
            title=item["title"],
            message=item["message"],
            level=item["level"],
            read=item["read"],
            created_at=item["created_at"],
        )
        for item in items
    ]


@router.post("/notifications", response_model=NotificationOut)
def create_notification(payload: NotificationCreate, db: DbSession) -> NotificationOut:
    service = NotificationService(db)
    item = service.create(None, payload.title, payload.message, payload.level)
    return NotificationOut(
        id=item["id"],
        title=item["title"],
        message=item["message"],
        level=item["level"],
        read=item["read"],
        created_at=item["created_at"],
    )


@router.patch("/notifications/{notification_id}")
def mark_notification_read(notification_id: int, db: DbSession) -> dict[str, bool]:
    return {"ok": True}


@router.get("/notifications/unread")
def unread_notifications(db: DbSession) -> list[NotificationOut]:
    return list_notifications(db)
