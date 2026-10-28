from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.voice import AssistantRequest, AssistantResponse, SynthesisOut, TranscriptionOut
from app.services.assistant_service import AssistantService
from app.services.speech_to_text_service import SpeechToTextService
from app.services.text_to_speech_service import TextToSpeechService

router = APIRouter()


@router.post("/transcribe", response_model=TranscriptionOut)
async def transcribe_audio(audio: UploadFile = File(...)) -> TranscriptionOut:
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio filename is required")

    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Audio payload is empty")
    if len(payload) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio upload is too large")

    result = SpeechToTextService().transcribe(payload, audio.filename)
    return TranscriptionOut(**result)


@router.post("/synthesize", response_model=SynthesisOut)
def synthesize_audio(payload: dict[str, str]) -> SynthesisOut:
    text = (payload or {}).get("text") or (payload or {}).get("command")
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text input is required")

    result = TextToSpeechService().synthesize(text)
    return SynthesisOut(**result)


@router.post("/assistant", response_model=AssistantResponse)
def handle_assistant_request(payload: AssistantRequest) -> AssistantResponse:
    text = payload.text or payload.command
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    result = AssistantService().handle_text(text)
    return AssistantResponse(**result)
