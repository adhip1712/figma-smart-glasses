from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CommandRequest(BaseModel):
    command: str = Field(..., min_length=1)
    payload: dict[str, Any] | None = None


class CommandResult(BaseModel):
    command_type: str
    status: str
    response: str
    payload: dict[str, Any] = {}
