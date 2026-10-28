from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Visionary Nexus"
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=False, alias="DEBUG")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    database_url: str = Field(default="sqlite:///./smart_glasses.db", alias="DATABASE_URL")
    secret_key: str = Field(default="change-me-in-production", alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:8443", "http://127.0.0.1:8443", "http://localhost:5173"], alias="CORS_ORIGINS")

    ai_provider: str = Field(default="mock", alias="AI_PROVIDER")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str | None = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")

    weather_provider: str = Field(default="mock", alias="WEATHER_PROVIDER")
    weather_api_key: str | None = Field(default=None, alias="WEATHER_API_KEY")
    weather_base_url: str | None = Field(default="https://api.openweathermap.org/data/2.5", alias="WEATHER_BASE_URL")
    openweather_api_key: str | None = Field(default=None, alias="OPENWEATHER_API_KEY")
    openweather_base_url: str | None = Field(default=None, alias="OPENWEATHER_BASE_URL")

    music_provider: str = Field(default="mock", alias="MUSIC_PROVIDER")
    music_api_key: str | None = Field(default=None, alias="MUSIC_API_KEY")
    music_base_url: str | None = Field(default="https://api.jamendo.com/v3.0", alias="MUSIC_BASE_URL")
    jamendo_client_id: str | None = Field(default=None, alias="JAMENDO_CLIENT_ID")

    stt_provider: str = Field(default="mock", alias="STT_PROVIDER")
    stt_api_key: str | None = Field(default=None, alias="STT_API_KEY")
    stt_base_url: str | None = Field(default="https://api.openai.com/v1", alias="STT_BASE_URL")
    stt_model: str | None = Field(default="whisper-1", alias="STT_MODEL")

    tts_provider: str = Field(default="mock", alias="TTS_PROVIDER")
    tts_api_key: str | None = Field(default=None, alias="TTS_API_KEY")
    tts_base_url: str | None = Field(default="https://api.openai.com/v1", alias="TTS_BASE_URL")
    tts_model: str | None = Field(default="gpt-4o-mini-tts", alias="TTS_MODEL")

    device_host: str | None = Field(default=None, alias="DEVICE_HOST")
    device_port: int = Field(default=8888, alias="DEVICE_PORT")

    disable_auth: bool = Field(default=False, alias="DISABLE_AUTH")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins if origin.strip()]


@lru_cache

def get_settings() -> Settings:
    return Settings()
