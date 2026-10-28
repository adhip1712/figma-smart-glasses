from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import get_settings


class BaseMusicProvider(ABC):
    name = "base"

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        raise NotImplementedError


class MockMusicProvider(BaseMusicProvider):
    name = "mock"

    def __init__(self):
        self._tracks = [
            {
                "id": "track-1",
                "name": "Neon Drift",
                "artist_name": "Luna Echo",
                "album_name": "Night Signals",
                "audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                "image": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
                "duration": 220,
            },
            {
                "id": "track-2",
                "name": "Glass Horizon",
                "artist_name": "Orbital Memory",
                "album_name": "Skyline Tides",
                "audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
                "image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
                "duration": 245,
            },
            {
                "id": "track-3",
                "name": "Midnight Circuit",
                "artist_name": "Astra Mode",
                "album_name": "Circuit Bloom",
                "audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
                "image": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
                "duration": 270,
            },
        ]

    def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        normalized_query = (query or "").strip()
        if not normalized_query:
            return []

        query_lower = normalized_query.lower()
        matches = [
            track
            for track in self._tracks
            if query_lower in (f"{track['name']} {track['artist_name']}".lower())
        ]
        if not matches:
            matches = list(self._tracks)
        return matches[:limit]


class RealMusicProvider(BaseMusicProvider):
    name = "real"

    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()

    @property
    def api_key(self) -> str | None:
        value = (
            self.settings.music_api_key
            or getattr(self.settings, "jamendo_client_id", None)
            or ""
        ).strip()
        return value or None

    @property
    def base_url(self) -> str:
        value = (self.settings.music_base_url or "https://api.jamendo.com/v3.0").strip().rstrip("/")
        return value or "https://api.jamendo.com/v3.0"

    @staticmethod
    def _coerce_url(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, (list, tuple)):
            for item in value:
                candidate = RealMusicProvider._coerce_url(item)
                if candidate:
                    return candidate
            return ""
        if isinstance(value, dict):
            for key in ("mp32", "mp31", "stream", "url", "audio", "preview", "href"):
                candidate = RealMusicProvider._coerce_url(value.get(key))
                if candidate:
                    return candidate
            return ""
        return str(value).strip()

    @staticmethod
    def _coerce_int(value: Any) -> int:
        try:
            return int(value) if value not in (None, "", "null") else 0
        except (TypeError, ValueError):
            return 0

    def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        normalized_query = (query or "").strip()
        if not normalized_query:
            return []

        if not self.api_key:
            return MockMusicProvider().search(normalized_query, limit)

        try:
            response = httpx.get(
                f"{self.base_url}/tracks/",
                params={
                    "client_id": self.api_key,
                    "format": "json",
                    "search": normalized_query,
                    "limit": limit,
                },
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            results = payload.get("results") if isinstance(payload, dict) else None
            if not isinstance(results, list):
                raise ValueError("Malformed music response")

            tracks: list[dict[str, Any]] = []
            for item in results:
                if not isinstance(item, dict):
                    continue

                name = str(item.get("name") or "Unknown Track").strip() or "Unknown Track"
                artist_name = str(item.get("artist_name") or item.get("artist") or "Unknown Artist").strip() or "Unknown Artist"
                album_name = str(item.get("album_name") or item.get("album") or "").strip()
                audio = self._coerce_url(item.get("audio") or item.get("stream_url") or item.get("preview"))
                image = self._coerce_url(item.get("image") or item.get("album_image") or item.get("cover"))
                duration = self._coerce_int(item.get("duration"))

                tracks.append(
                    {
                        "id": str(item.get("id") or f"track-{len(tracks) + 1}"),
                        "name": name,
                        "artist_name": artist_name,
                        "album_name": album_name,
                        "audio": audio,
                        "image": image,
                        "duration": duration,
                    }
                )

            if not tracks:
                return MockMusicProvider().search(normalized_query, limit)
            return tracks[:limit]
        except Exception:
            return MockMusicProvider().search(normalized_query, limit)


JamendoMusicProvider = RealMusicProvider


class MusicService:
    def __init__(self):
        settings = get_settings()
        provider_name = (settings.music_provider or "mock").lower()
        if provider_name in {"real", "jamendo", "jamendo_music", "music"}:
            self.provider: BaseMusicProvider = RealMusicProvider(settings)
        else:
            self.provider = MockMusicProvider()

    def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        return self.provider.search(query, limit)
