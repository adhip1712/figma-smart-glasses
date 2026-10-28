from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import DbSession
from app.db.repositories import ConversationRepository, MessageRepository
from app.db.models import Conversation, Message
from app.schemas.conversations import AskRequest, AskResponse, ConversationCreate, ConversationOut, MessageOut
from app.services.ai_service import AIChatService

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: DbSession) -> list[ConversationOut]:
    repo = ConversationRepository(db)
    items = repo.list_for_user(None)
    return [
        ConversationOut(
            id=item.id,
            title=item.title,
            created_at=item.created_at.isoformat(),
            updated_at=item.updated_at.isoformat(),
        )
        for item in items
    ]


@router.post("/conversations", response_model=ConversationOut)
def create_conversation(payload: ConversationCreate, db: DbSession) -> ConversationOut:
    repo = ConversationRepository(db)
    item = repo.create(None, payload.title or "New Chat")
    return ConversationOut(id=item.id, title=item.title, created_at=item.created_at.isoformat(), updated_at=item.updated_at.isoformat())


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, db: DbSession) -> ConversationOut:
    repo = ConversationRepository(db)
    item = repo.get(conversation_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return ConversationOut(id=item.id, title=item.title, created_at=item.created_at.isoformat(), updated_at=item.updated_at.isoformat())


@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
def rename_conversation(conversation_id: int, payload: dict[str, str], db: DbSession) -> ConversationOut:
    repo = ConversationRepository(db)
    item = repo.get(conversation_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    updated = repo.update(item, title=payload.get("title"))
    return ConversationOut(id=updated.id, title=updated.title, created_at=updated.created_at.isoformat(), updated_at=updated.updated_at.isoformat())


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: DbSession) -> dict[str, bool]:
    repo = ConversationRepository(db)
    item = repo.get(conversation_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    repo.delete(item)
    return {"ok": True}


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(conversation_id: int, db: DbSession) -> list[MessageOut]:
    repo = MessageRepository(db)
    rows = repo.list_for_conversation(conversation_id)
    return [MessageOut(id=row.id, role=row.role, content=row.content, created_at=row.created_at.isoformat()) for row in rows]


@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest, db: DbSession) -> AskResponse:
    message_repo = MessageRepository(db)
    conversation_repo = ConversationRepository(db)

    conversation_id = payload.conversation_id
    if conversation_id is not None:
        conversation = conversation_repo.get(conversation_id)
        if not conversation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    else:
        conversation = conversation_repo.create(None, "New Chat")
        conversation_id = conversation.id

    user_message = message_repo.create(conversation_id, None, "user", payload.message)
    service = AIChatService(db)
    result = service.generate_reply(payload.message, conversation_id=conversation_id, user_id=None)
    polished_message = str(result.get("polished_message") or payload.message).strip()
    if polished_message:
        user_message.content = polished_message
        db.commit()
        db.refresh(user_message)
    message_repo.create(conversation_id, None, result["role"], result["response"])

    conversation_repo.update(conversation, title=(polished_message[:50].strip() or conversation.title))
    return AskResponse(
        conversation_id=conversation_id,
        response=result["response"],
        role=result["role"],
        polished_message=polished_message,
    )
