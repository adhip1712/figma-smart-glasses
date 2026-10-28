from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.db.repositories import MusicRepository
from app.schemas.music import MusicHistoryItem, MusicSearchRequest, MusicSearchResponse, Track
from app.services.music_service import MusicService

router = APIRouter()


@router.post("/search", response_model=MusicSearchResponse)
def search_music(payload: MusicSearchRequest, db: DbSession) -> MusicSearchResponse:
    service = MusicService()
    tracks = service.search(payload.query, payload.limit)
    return MusicSearchResponse(tracks=[Track(**track) for track in tracks], total=len(tracks))


@router.get("/history", response_model=list[MusicHistoryItem])
def history(db: DbSession) -> list[MusicHistoryItem]:
    repo = MusicRepository(db)
    rows = repo.get_history(None)
    return [
        MusicHistoryItem(
            id=row.id,
            track_id=row.track_id,
            name=row.name,
            artist_name=row.artist_name,
            album_name=row.album_name,
            image=row.image,
            audio=row.audio,
            duration=row.duration,
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]


@router.post("/play")
def play_music(payload: dict) -> dict[str, str]:
    return {"status": "ok", "action": "play", "track": payload.get("track") or "queue"}


@router.post("/pause")
def pause_music() -> dict[str, str]:
    return {"status": "ok", "action": "pause"}


@router.post("/resume")
def resume_music() -> dict[str, str]:
    return {"status": "ok", "action": "resume"}


@router.post("/stop")
def stop_music() -> dict[str, str]:
    return {"status": "ok", "action": "stop"}


@router.post("/next")
def next_track() -> dict[str, str]:
    return {"status": "ok", "action": "next"}


@router.post("/previous")
def previous_track() -> dict[str, str]:
    return {"status": "ok", "action": "previous"}


@router.get("/queue")
def get_queue() -> dict[str, list[str]]:
    return {"queue": []}


@router.post("/favorites")
def add_favorite(track: dict, db: DbSession) -> dict[str, str]:
    repo = MusicRepository(db)
    repo.add_favorite(None, track)
    return {"status": "ok", "message": "favorite added"}
