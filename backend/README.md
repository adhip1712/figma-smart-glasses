# Smart Glasses Backend

This backend powers the Visionary Nexus smart-glasses dashboard with a modular FastAPI service layer, SQLAlchemy database access, and production-oriented configuration.

## Features

- Rest API with FastAPI and Pydantic v2
- SQLAlchemy + SQLite default database with Alembic migrations
- JWT-based auth with secure password hashing
- Conversational AI service with configurable provider
- Music, weather, device, camera, settings, dashboard, and notifications modules
- Input validation, structured errors, logging, and CORS protection
- API documents under /docs and /redoc
- Frontend-compatible routes like /api/conversations and /api/settings

## Project layout

- app/main.py: FastAPI app creation and router registration
- app/core: config, logging, security, middleware
- app/db: models, repositories, session management
- app/services: business logic for AI, command routing, music, weather, device, vision, notifications
- app/api/v1/routes: HTTP endpoints
- app/schemas: request and response models

## Quick start

1. Create a virtual environment
2. Install dependencies:
   python -m pip install -r backend/requirements.txt
3. Copy env file:
   copy backend\.env.example backend\.env
4. Start the API:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

## Database setup

The project uses SQLite by default for local development. Alembic migrations are included under backend/alembic.

Initialize the database and run migrations:

- python -m alembic -c backend/alembic.ini upgrade head

If you prefer to create tables directly from app startup, the FastAPI app will auto-create tables when the app boots using SQLAlchemy metadata.

## Environment configuration

Use backend/.env to override defaults. Secrets like API keys and JWT signing values should never be committed to source control.

### Weather provider setup

Set the weather backend in backend/.env:

- `WEATHER_PROVIDER="mock"` for local development and tests
- `WEATHER_PROVIDER="real"` to enable the real weather provider
- `WEATHER_API_KEY=""` only when your selected provider requires one
- `WEATHER_BASE_URL="https://api.openweathermap.org/data/2.5"` for the real provider URL

The app keeps the API key strictly server-side and never exposes it to the frontend or API responses.

### Music provider setup

Set the music backend in backend/.env:

- `MUSIC_PROVIDER="mock"` for local development and automated tests
- `MUSIC_PROVIDER="real"` to enable the real Jamendo-backed provider
- `MUSIC_API_KEY=""` for the real service key, or use the legacy `JAMENDO_CLIENT_ID` field if you already have it configured
- `MUSIC_BASE_URL="https://api.jamendo.com/v3.0"` for the real provider URL

The app keeps the music API key on the backend only and never returns it to the browser or API clients.

## API docs

- Swagger: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Frontend connection

The React app expects backend routes under /api. This is supported directly and also via versioned /api/v1 routes.

## Notes

- The app ships with mock providers for local development when no external credentials are configured.
- Hardware routes are included as architecture-ready interfaces and remain safe for offline and future ESP32 / ESP32-CAM integration.
