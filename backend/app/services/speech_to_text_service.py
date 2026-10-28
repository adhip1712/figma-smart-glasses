from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import get_settings


class BaseSpeechToTextProvider(ABC):
    name = "base"

    @abstractmethod
    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> str:
        raise NotImplementedError


class MockSpeechToTextProvider(BaseSpeechToTextProvider):
    name = "mock"

    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> str:
        if not audio_bytes:
            raise ValueError("Audio payload is empty")

        source = (filename or "audio.wav").lower()
        text = "play some music"
        if "weather" in source or b"weather" in (audio_bytes[:200].lower()):
            text = "what is the weather in London"
        elif "photo" in source or b"photo" in (audio_bytes[:200].lower()):
            text = "take a photo"
        elif "pause" in source or b"pause" in (audio_bytes[:200].lower()):
            text = "pause music"
        return text


class RealSpeechToTextProvider(BaseSpeechToTextProvider):
    name = "real"

    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()

    @property
    def api_key(self) -> str | None:
        value = (self.settings.stt_api_key or "").strip()
        return value or None

    @property
    def base_url(self) -> str:
        value = (self.settings.stt_base_url or "https://api.openai.com/v1").strip().rstrip("/")
        return value or "https://api.openai.com/v1"

    @property
    def model(self) -> str:
        return (self.settings.stt_model or "whisper-1").strip() or "whisper-1"

    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> str:
        if not audio_bytes:
            raise ValueError("Audio payload is empty")
        if not self.api_key:
            raise RuntimeError("Speech-to-text API key is not configured")

        files = {"file": (filename or "audio.wav", audio_bytes, "audio/wav")}
        data = {"model": self.model}
        response = httpx.post(
            f"{self.base_url}/audio/transcriptions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            files=files,
            data=data,
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        text = payload.get("text") or payload.get("transcript")
        if not text:
            raise ValueError("Speech provider returned no transcript")
        return str(text).strip()


class SpeechToTextService:
    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()
        provider_name = (self.settings.stt_provider or "mock").lower()
        self.provider: BaseSpeechToTextProvider = RealSpeechToTextProvider(self.settings) if provider_name == "real" else MockSpeechToTextProvider()

    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> dict[str, Any]:
        try:
            text = self.provider.transcribe(audio_bytes, filename)
            return {"text": text, "provider": self.provider.name, "status": "ok"}
        except Exception:
            fallback = MockSpeechToTextProvider()
            return {"text": fallback.transcribe(audio_bytes, filename), "provider": fallback.name, "status": "fallback"}
