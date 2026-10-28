from __future__ import annotations

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    level: str
    read: bool
    created_at: str


class NotificationCreate(BaseModel):
    title: str
    message: str
    level: str = "info"
