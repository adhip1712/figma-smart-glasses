from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TranscriptionOut(BaseModel):
    text: str = ""
    provider: str = "mock"
    status: str = "ok"


class SynthesisOut(BaseModel):
    audio: str = ""
    provider: str = "mock"
    format: str = "audio/wav"


class AssistantRequest(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    command: str | None = Field(default=None, min_length=1)


class AssistantResponse(BaseModel):
    intent: str
    response: str
    parameters: dict[str, Any] = {}
