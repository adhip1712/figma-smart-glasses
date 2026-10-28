from __future__ import annotations

from typing import Any

from app.services.ai_service import AIChatService
from app.services.command_router import CommandRouter
from app.services.music_service import MusicService
from app.services.weather_service import WeatherService


class AssistantService:
    def __init__(self, db: Any | None = None):
        self.db = db
        self.music_service = MusicService()
        self.weather_service = WeatherService()
        self.ai_service = AIChatService(db) if db is not None else AIChatService(db=None)

    def _build_response(self, intent: str, response: str, parameters: dict[str, Any] | None = None) -> dict[str, Any]:
        return {
            "intent": intent,
            "response": response,
            "parameters": parameters or {},
        }

    def handle_text(self, text: str) -> dict[str, Any]:
        route = CommandRouter.route(text)
        intent = route["intent"]
        parameters = route.get("parameters", {})

        if intent == "weather":
            city = str(parameters.get("city") or "London")
            current = self.weather_service.get_current(city)
            return self._build_response(intent, f"Weather in {current.get('city', city)}: {current.get('temp')}°C and {current.get('description', 'clear')}", parameters)

        if intent == "music_search":
            query = str(parameters.get("query") or "ambient")
            tracks = self.music_service.search(query, 3)
            if not tracks:
                return self._build_response(intent, "No music matches were found.", parameters)
            first = tracks[0]
            return self._build_response(intent, f"I found {first.get('name', 'a track')} by {first.get('artist_name', 'an artist')}.", {**parameters, "track": first})

        if intent == "music_pause":
            return self._build_response(intent, "Music paused.", parameters)

        if intent == "music_resume":
            return self._build_response(intent, "Music resumed.", parameters)

        if intent == "music_stop":
            return self._build_response(intent, "Music stopped.", parameters)

        if intent == "music_next":
            return self._build_response(intent, "Skipping to the next track.", parameters)

        if intent == "music_previous":
            return self._build_response(intent, "Returning to the previous track.", parameters)

        if intent == "camera_capture":
            return self._build_response(intent, "Camera capture requested. Use the vision route to view or analyze the latest image.", parameters)

        if intent == "device_status":
            return self._build_response(intent, "The device is online and ready.", parameters)

        if intent in {"chat", "unknown"}:
            ai_reply = self.ai_service.generate_reply(text)
            return self._build_response("chat", ai_reply["response"], {"conversation_id": ai_reply.get("conversation_id")})

        return self._build_response(intent, "I can help with weather, music, device status, or general questions.", parameters)

    def handle_audio(self, audio_bytes: bytes, filename: str | None = None) -> dict[str, Any]:
        from app.services.speech_to_text_service import SpeechToTextService

        transcription = SpeechToTextService().transcribe(audio_bytes, filename)
        text = transcription["text"]
        if not text:
            return {"intent": "unknown", "response": "No speech was detected.", "parameters": {}}
        return self.handle_text(text)
