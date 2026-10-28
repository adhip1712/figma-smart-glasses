from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    CommandRecord,
    Conversation,
    DeviceRecord,
    FavoriteTrack,
    Message,
    MusicHistory,
    Notification,
    User,
    UserSetting,
    VoiceInteraction,
)

DEFAULT_SETTINGS = {
    "wake_word": "Hey Vision",
    "voice_input": "true",
    "voice_output": "true",
    "microphone": "true",
    "music_autoplay": "false",
    "navigation_units": "metric",
    "camera_enabled": "true",
    "theme": "Orion Dark",
    "accent_color": "Cyan",
    "animations": "true",
}


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, username: str, email: str, password_hash: str) -> User:
        user = User(username=username, email=email, password_hash=password_hash)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: int | None) -> list[Conversation]:
        query = self.db.query(Conversation)
        if user_id is not None:
            query = query.filter(Conversation.user_id == user_id)
        return query.order_by(Conversation.updated_at.desc()).all()

    def get(self, conversation_id: int, user_id: int | None = None) -> Conversation | None:
        query = self.db.query(Conversation).filter(Conversation.id == conversation_id)
        if user_id is not None:
            query = query.filter(Conversation.user_id == user_id)
        return query.first()

    def create(self, user_id: int | None, title: str = "New Chat") -> Conversation:
        conversation = Conversation(user_id=user_id, title=title)
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def delete(self, conversation: Conversation) -> None:
        for message in list(conversation.messages):
            self.db.delete(message)
        self.db.delete(conversation)
        self.db.commit()

    def update(self, conversation: Conversation, title: str | None = None) -> Conversation:
        if title:
            conversation.title = title
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversation)
        return conversation


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, conversation_id: int, user_id: int | None, role: str, content: str) -> Message:
        message = Message(conversation_id=conversation_id, user_id=user_id, role=role, content=content)
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def list_for_conversation(self, conversation_id: int) -> list[Message]:
        return self.db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()


class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, user_id: int | None = None) -> dict[str, str]:
        settings = {**DEFAULT_SETTINGS}
        rows = self.db.query(UserSetting).filter(UserSetting.user_id == user_id).all() if user_id is not None else self.db.query(UserSetting).all()
        for row in rows:
            settings[row.key] = row.value
        return settings

    def get(self, key: str, user_id: int | None = None) -> str | None:
        row = self.db.query(UserSetting).filter(UserSetting.key == key, UserSetting.user_id == user_id).first() if user_id is not None else self.db.query(UserSetting).filter(UserSetting.key == key).first()
        return row.value if row else DEFAULT_SETTINGS.get(key)

    def set(self, key: str, value: str, user_id: int | None = None) -> str:
        if user_id is None:
            row = self.db.query(UserSetting).filter(UserSetting.key == key, UserSetting.user_id.is_(None)).first()
            if row is None:
                row = UserSetting(key=key, value=value, user_id=None)
                self.db.add(row)
            else:
                row.value = value
        else:
            row = self.db.query(UserSetting).filter(UserSetting.key == key, UserSetting.user_id == user_id).first()
            if row is None:
                row = UserSetting(key=key, value=value, user_id=user_id)
                self.db.add(row)
            else:
                row.value = value
        self.db.commit()
        self.db.refresh(row)
        return row.value

    def set_many(self, data: dict[str, str], user_id: int | None = None) -> dict[str, str]:
        for key, value in data.items():
            self.set(key, str(value), user_id=user_id)
        return self.get_all(user_id=user_id)


class CommandRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int | None, command_type: str, raw_text: str, payload: dict[str, Any] | None, response: dict[str, Any] | None, status: str = "completed") -> CommandRecord:
        record = CommandRecord(
            user_id=user_id,
            command_type=command_type,
            raw_text=raw_text,
            payload=payload,
            response=response,
            status=status,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record


class MusicRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_history(self, user_id: int | None, track_info: dict[str, Any], provider: str = "mock") -> MusicHistory:
        item = MusicHistory(
            user_id=user_id,
            provider=provider,
            track_id=str(track_info.get("id", "unknown")),
            name=str(track_info.get("name", "Unknown Track")),
            artist_name=str(track_info.get("artist_name", "")),
            album_name=str(track_info.get("album_name", "")),
            image=str(track_info.get("image", "")),
            audio=str(track_info.get("audio", "")),
            duration=int(track_info.get("duration", 0) or 0),
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_history(self, user_id: int | None) -> list[MusicHistory]:
        query = self.db.query(MusicHistory)
        if user_id is not None:
            query = query.filter(MusicHistory.user_id == user_id)
        return query.order_by(MusicHistory.created_at.desc()).limit(20).all()

    def add_favorite(self, user_id: int | None, track: dict[str, Any], provider: str = "mock") -> FavoriteTrack:
        favorite = FavoriteTrack(
            user_id=user_id,
            provider=provider,
            track_id=str(track.get("id", "unknown")),
            name=str(track.get("name", "Unknown Track")),
            artist_name=str(track.get("artist_name", "")),
            album_name=str(track.get("album_name", "")),
            image=str(track.get("image", "")),
            audio=str(track.get("audio", "")),
        )
        self.db.add(favorite)
        self.db.commit()
        self.db.refresh(favorite)
        return favorite


class DeviceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int | None = None) -> DeviceRecord:
        device = self.db.query(DeviceRecord).order_by(DeviceRecord.created_at.desc()).first()
        if device:
            return device
        device = DeviceRecord(
            user_id=user_id,
            device_id="sg-0001",
            name="Visionary Nexus",
            status="offline",
            ip_address="127.0.0.1",
            firmware="v1.0.0",
            battery=74,
            signal=78,
            camera_enabled=True,
            microphone_enabled=True,
            speaker_enabled=True,
        )
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return device

    def update(self, device: DeviceRecord, **kwargs: Any) -> DeviceRecord:
        for key, value in kwargs.items():
            if hasattr(device, key):
                setattr(device, key, value)
        device.last_seen_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(device)
        return device


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int | None, title: str, message: str, level: str = "info") -> Notification:
        item = Notification(user_id=user_id, title=title, message=message, level=level)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_for_user(self, user_id: int | None) -> list[Notification]:
        query = self.db.query(Notification)
        if user_id is not None:
            query = query.filter(Notification.user_id == user_id)
        return query.order_by(Notification.created_at.desc()).all()


class VoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int | None, transcript: str, intent: str, response: str | None = None) -> VoiceInteraction:
        item = VoiceInteraction(user_id=user_id, transcript=transcript, intent=intent, response=response)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item
