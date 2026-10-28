from __future__ import annotations

from pydantic import BaseModel


class WeatherData(BaseModel):
    city: str
    country: str
    temp: float
    feels_like: float
    humidity: float
    description: str
    icon: str
    wind_speed: float
    visibility: float


class ForecastPoint(BaseModel):
    date: str
    temp: float
    description: str
    icon: str


class ForecastResponse(BaseModel):
    city: str
    country: str
    forecast: list[ForecastPoint]
