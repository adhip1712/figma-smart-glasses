from __future__ import annotations

import base64
import io
import math
import wave
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import get_settings


class BaseTextToSpeechProvider(ABC):
    name = "base"

    @abstractmethod
    def synthesize(self, text: str) -> str:
        raise NotImplementedError


class MockTextToSpeechProvider(BaseTextToSpeechProvider):
    name = "mock"

    def synthesize(self, text: str) -> str:
        if not text or not text.strip():
            raise ValueError("Text input is empty")

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(22050)
            samples = []
            for i in range(2205):
                value = int(2000 * math.sin(2 * math.pi * 440 * i / 22050))
                samples.extend([value, value])
            wav_file.writeframes(b"".join(int(v).to_bytes(2, byteorder="little", signed=True) for v in samples[:2205]))
        payload = buffer.getvalue()
        return f"data:audio/wav;base64,{base64.b64encode(payload).decode('ascii')}"


class RealTextToSpeechProvider(BaseTextToSpeechProvider):
    name = "real"

    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()

    @property
    def api_key(self) -> str | None:
        value = (self.settings.tts_api_key or "").strip()
        return value or None

    @property
    def base_url(self) -> str:
        value = (self.settings.tts_base_url or "https://api.openai.com/v1").strip().rstrip("/")
        return value or "https://api.openai.com/v1"

    @property
    def model(self) -> str:
        return (self.settings.tts_model or "gpt-4o-mini-tts").strip() or "gpt-4o-mini-tts"

    def synthesize(self, text: str) -> str:
        if not text or not text.strip():
            raise ValueError("Text input is empty")
        if not self.api_key:
            raise RuntimeError("Text-to-speech API key is not configured")

        response = httpx.post(
            f"{self.base_url}/audio/speech",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json={"model": self.model, "input": text, "voice": "alloy"},
            timeout=30,
        )
        response.raise_for_status()
        content_type = response.headers.get("content-type", "audio/wav")
        if "audio" in content_type.lower():
            payload = response.content
            return f"data:{content_type};base64,{base64.b64encode(payload).decode('ascii')}"

        data = response.json()
        if isinstance(data, dict):
            encoded = data.get("audio") or data.get("audio_content") or data.get("data")
            if isinstance(encoded, str):
                return f"data:audio/wav;base64,{encoded}"
        raise ValueError("Speech provider returned an unsupported payload")


class TextToSpeechService:
    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()
        provider_name = (self.settings.tts_provider or "mock").lower()
        self.provider: BaseTextToSpeechProvider = RealTextToSpeechProvider(self.settings) if provider_name == "real" else MockTextToSpeechProvider()

    def synthesize(self, text: str) -> dict[str, Any]:
        try:
            audio = self.provider.synthesize(text)
            return {"audio": audio, "provider": self.provider.name, "format": "audio/wav"}
        except Exception:
            fallback = MockTextToSpeechProvider()
            return {"audio": fallback.synthesize(text), "provider": fallback.name, "format": "audio/wav"}
