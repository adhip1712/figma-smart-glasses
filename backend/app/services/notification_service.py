from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.repositories import NotificationRepository


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    def create(self, user_id: int | None, title: str, message: str, level: str = "info") -> dict[str, Any]:
        item = self.repo.create(user_id, title, message, level)
        return {
            "id": item.id,
            "title": item.title,
            "message": item.message,
            "level": item.level,
            "read": item.read,
            "created_at": item.created_at.isoformat(),
        }

    def list_for_user(self, user_id: int | None) -> list[dict[str, Any]]:
        items = self.repo.list_for_user(user_id)
        return [
            {
                "id": item.id,
                "title": item.title,
                "message": item.message,
                "level": item.level,
                "read": item.read,
                "created_at": item.created_at.isoformat(),
            }
            for item in items
        ]
