from __future__ import annotations

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str | None = Field(default="New Chat")


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


class AskRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: int | None = None


class AskResponse(BaseModel):
    conversation_id: int
    response: str
    role: str = "assistant"
    polished_message: str | None = None
