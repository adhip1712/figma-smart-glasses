from __future__ import annotations

import re
from typing import Any


class CommandRouter:
    @staticmethod
    def _extract_city(text: str) -> str | None:
        city_match = re.search(r"(?:in|for)\s+([A-Z][A-Za-z\-']+(?:\s+[A-Z][A-Za-z\-']+)*)", text)
        if city_match:
            return city_match.group(1).strip()
        if re.search(r"\b(london|paris|new york|bengaluru|delhi|rome|tokyo|berlin|seoul)\b", text.lower()):
            for city in ["London", "Paris", "New York", "Bengaluru", "Delhi", "Rome", "Tokyo", "Berlin", "Seoul"]:
                if city.lower() in text.lower():
                    return city
        return None

    @staticmethod
    def _extract_music_query(text: str) -> str | None:
        value = (text or "").strip()
        if not value:
            return None

        stripped = re.sub(r"^(?:play|queue|search(?:\s+for)?|find)\s+", "", value, flags=re.I).strip()
        if not stripped:
            return None

        stripped = re.sub(r"^(?:the|a|an)\s+", "", stripped, flags=re.I).strip()
        stripped = re.sub(r"^(?:song|track|music)\s+", "", stripped, flags=re.I).strip()
        return stripped or None

    @staticmethod
    def route(text: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        value = (text or "").strip()
        lower = value.lower()
        if not value:
            return {"intent": "unknown", "parameters": {}}

        if re.search(r"\b(weather|forecast)\b", lower):
            city = CommandRouter._extract_city(value) or (payload or {}).get("city") or "London"
            return {"intent": "weather", "parameters": {"city": city}}

        music_query = CommandRouter._extract_music_query(value)
        if re.search(r"\b(play|queue|search|find)\b", lower) and (music_query or ""):
            query = (payload or {}).get("query") or music_query
            return {"intent": "music_search", "parameters": {"query": query or "ambient"}}

        if re.search(r"\b(pause\s+music|pause music|stop music|resume music|next song|previous song|next track|previous track)\b", lower):
            if "pause" in lower:
                return {"intent": "music_pause", "parameters": {}}
            if "resume" in lower or "continue" in lower:
                return {"intent": "music_resume", "parameters": {}}
            if "stop" in lower:
                return {"intent": "music_stop", "parameters": {}}
            if "next" in lower:
                return {"intent": "music_next", "parameters": {}}
            if "previous" in lower:
                return {"intent": "music_previous", "parameters": {}}

        if re.search(r"\b(camera|vision|take a photo|take photo|capture image|analyze\s+(this|image|scene))\b", lower):
            return {"intent": "camera_capture", "parameters": {}}

        if re.search(r"\b(device status|status of device|battery|connected|offline)\b", lower):
            return {"intent": "device_status", "parameters": {}}

        if re.search(r"\b(help|assist|assistant|chat|what is|who is|how do i)\b", lower):
            return {"intent": "chat", "parameters": {"message": value}}

        if re.search(r"\b(settings|preferences|change.*settings)\b", lower):
            return {"intent": "settings", "parameters": {}}

        return {"intent": "chat", "parameters": {"message": value}}
