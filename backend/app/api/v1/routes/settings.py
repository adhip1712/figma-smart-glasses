from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.db.repositories import SettingsRepository
from app.schemas.settings import SettingUpdateRequest

router = APIRouter()


@router.get("")
def get_all_settings(db: DbSession) -> dict[str, str]:
    repo = SettingsRepository(db)
    return repo.get_all(None)


@router.get("/{key}")
def get_setting(key: str, db: DbSession) -> dict[str, str]:
    repo = SettingsRepository(db)
    value = repo.get(key, None)
    if value is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return {key: value}


@router.patch("/{key}")
def update_setting(key: str, payload: SettingUpdateRequest, db: DbSession) -> dict[str, str]:
    repo = SettingsRepository(db)
    value = repo.set(key, payload.value, None)
    return {key: value}


@router.put("")
def update_all_settings(payload: dict[str, str], db: DbSession) -> dict[str, str]:
    repo = SettingsRepository(db)
    return repo.set_many(payload, None)
