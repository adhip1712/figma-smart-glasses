from __future__ import annotations

from pydantic import BaseModel, Field


class Track(BaseModel):
    id: str
    name: str
    artist_name: str
    album_name: str = ""
    audio: str = ""
    image: str = ""
    duration: int = 0


class MusicSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=25)


class MusicSearchResponse(BaseModel):
    tracks: list[Track]
    total: int


class MusicHistoryItem(BaseModel):
    id: int
    track_id: str
    name: str
    artist_name: str
    album_name: str
    image: str
    audio: str
    duration: int
    created_at: str
