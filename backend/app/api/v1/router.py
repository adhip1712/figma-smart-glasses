from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    camera,
    commands,
    conversations,
    dashboard,
    device,
    music,
    notifications,
    settings,
    system,
    voice,
    weather,
)

router = APIRouter()
router.include_router(system.router)
router.include_router(auth.router, prefix="/auth")
router.include_router(conversations.router)
router.include_router(music.router, prefix="/music")
router.include_router(weather.router, prefix="/weather")
router.include_router(voice.router, prefix="/voice")
router.include_router(device.router, prefix="/device")
router.include_router(camera.router, prefix="/camera")
router.include_router(settings.router, prefix="/settings")
router.include_router(commands.router, prefix="/commands")
router.include_router(dashboard.router)
router.include_router(notifications.router)
