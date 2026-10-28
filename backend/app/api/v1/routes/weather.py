from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.weather import ForecastResponse, WeatherData
from app.services.weather_service import WeatherService

router = APIRouter()


@router.get("/search")
def search_weather(q: str) -> dict[str, object]:
    service = WeatherService()
    data = service.get_current(q)
    return {"city": data.get("city"), "description": data.get("description")}


@router.get("/{city}", response_model=WeatherData)
def get_weather(city: str) -> WeatherData:
    service = WeatherService()
    data = service.get_current(city)
    if not data:
        raise HTTPException(status_code=404, detail="Weather data unavailable")
    return WeatherData(
        city=data.get("city", city),
        country=data.get("country", ""),
        temp=float(data.get("temp", 0)),
        feels_like=float(data.get("feels_like", 0)),
        humidity=float(data.get("humidity", 0)),
        description=str(data.get("description", "Clear")),
        icon=str(data.get("icon", "01d")),
        wind_speed=float(data.get("wind_speed", 0)),
        visibility=float(data.get("visibility", 0)),
    )


@router.get("/forecast/{city}", response_model=ForecastResponse)
def forecast(city: str) -> ForecastResponse:
    service = WeatherService()
    data = service.get_forecast(city)
    return ForecastResponse(
        city=data.get("city", city),
        country=data.get("country", ""),
        forecast=[
            {
                "date": item.get("date", ""),
                "temp": float(item.get("temp", 0)),
                "description": str(item.get("description", "Clear")),
                "icon": str(item.get("icon", "01d")),
            }
            for item in data.get("forecast", [])
        ],
    )
