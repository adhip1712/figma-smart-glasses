from __future__ import annotations

from pydantic import BaseModel, Field


class SettingUpdateRequest(BaseModel):
    value: str = Field(..., min_length=1)


class SettingsMap(BaseModel):
    settings: dict[str, str]
