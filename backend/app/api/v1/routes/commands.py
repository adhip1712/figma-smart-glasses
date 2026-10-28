from __future__ import annotations

from fastapi import APIRouter

from app.db.repositories import CommandRepository
from app.api.deps import DbSession
from app.schemas.commands import CommandRequest, CommandResult
from app.services.command_service import CommandService

router = APIRouter()


@router.post("", response_model=CommandResult)
def execute_command(payload: CommandRequest, db: DbSession) -> CommandResult:
    result = CommandService.execute(payload.command, payload.payload or {})
    CommandRepository(db).create(None, result["command_type"], payload.command, payload.payload or {}, result)
    return CommandResult(**result)


@router.post("/execute", response_model=CommandResult)
def execute_command_variant(payload: CommandRequest, db: DbSession) -> CommandResult:
    return execute_command(payload, db)
