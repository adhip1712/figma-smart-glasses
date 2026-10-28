from __future__ import annotations

import re
from typing import Any


class CommandService:
    @staticmethod
    def execute(command: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        text = (command or "").strip()
        lower = text.lower()

        if re.search(r"\b(play|resume|pause|stop)\b", lower):
            if "pause" in lower or "stop playing" in lower:
                return {"command_type": "PAUSE_MUSIC", "status": "ok", "response": "Music paused.", "payload": {"action": "pause"}}
            if "resume" in lower or "continue" in lower:
                return {"command_type": "RESUME_MUSIC", "status": "ok", "response": "Music resumed.", "payload": {"action": "resume"}}
            if "stop" in lower:
                return {"command_type": "STOP_MUSIC", "status": "ok", "response": "Music stopped.", "payload": {"action": "stop"}}
            if "play" in lower:
                target = payload.get("query") if payload else None
                return {"command_type": "PLAY_MUSIC", "status": "ok", "response": f"Playing {target or 'music'}.", "payload": {"query": target or "music"}}

        if "weather" in lower:
            location = payload.get("location") if payload else None
            return {"command_type": "WEATHER", "status": "ok", "response": f"Checking weather for {location or 'your location'}.", "payload": {"location": location or "current location"}}

        if "open" in lower or "go to" in lower or "switch to" in lower:
            feature = payload.get("feature") if payload else None
            if not feature:
                feature = "dashboard"
            return {"command_type": "TAB_SWITCH", "status": "ok", "response": f"Opening {feature}.", "payload": {"feature": feature}}

        if "camera" in lower or "vision" in lower:
            return {"command_type": "CAMERA", "status": "ok", "response": "Vision mode ready.", "payload": {"mode": "vision"}}

        if "device" in lower:
            return {"command_type": "DEVICE_STATUS", "status": "ok", "response": "Device status requested.", "payload": {"feature": "device"}}

        if "settings" in lower:
            return {"command_type": "SETTINGS", "status": "ok", "response": "Opening settings.", "payload": {"feature": "settings"}}

        if "assistant" in lower or "chat" in lower or "help" in lower:
            return {"command_type": "GENERAL_AI", "status": "ok", "response": "AI assistant is ready for follow-up requests.", "payload": {"feature": "assistant"}}

        return {"command_type": "GENERAL_AI", "status": "ok", "response": "I can help with music, weather, device status, and navigation.", "payload": {"raw_command": text}}
