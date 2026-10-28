from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import get_settings


class BaseWeatherProvider(ABC):
    name = "base"

    @abstractmethod
    def get_current(self, city: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_forecast(self, city: str) -> dict[str, Any]:
        raise NotImplementedError


class MockWeatherProvider(BaseWeatherProvider):
    name = "mock"

    def get_current(self, city: str) -> dict[str, Any]:
        normalized = (city or "London").strip() or "London"
        return {
            "city": normalized.title(),
            "country": "US",
            "temp": 22.0,
            "feels_like": 24.0,
            "humidity": 58,
            "description": "Clear skies",
            "icon": "01d",
            "wind_speed": 4.2,
            "visibility": 10000,
        }

    def get_forecast(self, city: str) -> dict[str, Any]:
        normalized = (city or "London").strip() or "London"
        return {
            "city": normalized.title(),
            "country": "US",
            "forecast": [
                {"date": "2026-09-25", "temp": 22, "description": "Clear", "icon": "01d"},
                {"date": "2026-09-26", "temp": 21, "description": "Cloudy", "icon": "03d"},
                {"date": "2026-09-27", "temp": 24, "description": "Sunny", "icon": "01d"},
            ],
        }


class RealWeatherProvider(BaseWeatherProvider):
    name = "real"

    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._cache_ttl_seconds = 300

    @property
    def api_key(self) -> str | None:
        value = (self.settings.weather_api_key or getattr(self.settings, "openweather_api_key", None) or "").strip()
        return value or None

    @property
    def base_url(self) -> str:
        value = (
            self.settings.weather_base_url
            or getattr(self.settings, "openweather_base_url", None)
            or "https://api.openweathermap.org/data/2.5"
        ).strip().rstrip("/")
        return value or "https://api.openweathermap.org/data/2.5"

    def _cache_get(self, cache_key: str) -> dict[str, Any] | None:
        cached = self._cache.get(cache_key)
        if cached is None:
            return None
        expires_at, payload = cached
        if time.monotonic() < expires_at:
            return payload
        self._cache.pop(cache_key, None)
        return None

    def _cache_set(self, cache_key: str, payload: dict[str, Any]) -> dict[str, Any]:
        self._cache[cache_key] = (time.monotonic() + self._cache_ttl_seconds, payload)
        return payload

    def _normalize_current_payload(self, city: str, data: dict[str, Any]) -> dict[str, Any]:
        weather = (data.get("weather") or [{}])[0] if (data.get("weather") or [{}]) else {}
        main = data.get("main") or {}
        wind = data.get("wind") or {}
        return {
            "city": data.get("name") or city.title(),
            "country": (data.get("sys") or {}).get("country", ""),
            "temp": main.get("temp", 0),
            "feels_like": main.get("feels_like", 0),
            "humidity": main.get("humidity", 0),
            "description": weather.get("main") or weather.get("description") or "Clear",
            "icon": weather.get("icon") or "01d",
            "wind_speed": wind.get("speed", 0),
            "visibility": data.get("visibility", 10000),
        }

    def _normalize_forecast_payload(self, city: str, data: dict[str, Any]) -> dict[str, Any]:
        records = data.get("list") or []
        forecast = []
        for item in records[:5]:
            weather = (item.get("weather") or [{}])[0] if (item.get("weather") or [{}]) else {}
            main = item.get("main") or {}
            forecast.append(
                {
                    "date": str(item.get("dt_txt") or "").split(" ")[0],
                    "temp": main.get("temp", 0),
                    "description": weather.get("main") or weather.get("description") or "Clear",
                    "icon": weather.get("icon") or "01d",
                }
            )

        return {
            "city": data.get("city", {}).get("name") or city.title(),
            "country": (data.get("city") or {}).get("country", ""),
            "forecast": forecast,
        }

    def get_current(self, city: str) -> dict[str, Any]:
        normalized_city = (city or "London").strip()
        if not normalized_city:
            return MockWeatherProvider().get_current("London")

        cache_key = f"current:{normalized_city.lower()}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        if not self.api_key:
            return self._cache_set(cache_key, MockWeatherProvider().get_current(normalized_city))

        try:
            response = httpx.get(
                f"{self.base_url}/weather",
                params={"q": normalized_city, "appid": self.api_key, "units": "metric"},
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not payload.get("main") or not isinstance(payload.get("weather"), list):
                raise ValueError("Malformed response payload")
            return self._cache_set(cache_key, self._normalize_current_payload(normalized_city, payload))
        except Exception:
            return self._cache_set(cache_key, MockWeatherProvider().get_current(normalized_city))

    def get_forecast(self, city: str) -> dict[str, Any]:
        normalized_city = (city or "London").strip()
        if not normalized_city:
            return MockWeatherProvider().get_forecast("London")

        cache_key = f"forecast:{normalized_city.lower()}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        if not self.api_key:
            return self._cache_set(cache_key, MockWeatherProvider().get_forecast(normalized_city))

        try:
            response = httpx.get(
                f"{self.base_url}/forecast",
                params={"q": normalized_city, "appid": self.api_key, "units": "metric", "cnt": 5},
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not isinstance(payload.get("list"), list):
                raise ValueError("Malformed forecast payload")
            return self._cache_set(cache_key, self._normalize_forecast_payload(normalized_city, payload))
        except Exception:
            return self._cache_set(cache_key, MockWeatherProvider().get_forecast(normalized_city))


OpenWeatherProvider = RealWeatherProvider


class WeatherService:
    def __init__(self):
        settings = get_settings()
        provider_name = (settings.weather_provider or "mock").lower()
        if provider_name in {"real", "openweather", "open_weather", "open-weather"}:
            self.provider: BaseWeatherProvider = RealWeatherProvider(settings)
        else:
            self.provider = MockWeatherProvider()

    def get_current(self, city: str):
        return self.provider.get_current(city)

    def get_forecast(self, city: str):
        return self.provider.get_forecast(city)
