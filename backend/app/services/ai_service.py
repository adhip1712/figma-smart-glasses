from __future__ import annotations

import ast
import json
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings


class BaseAIProvider(ABC):
    name = "base"

    @abstractmethod
    def generate_reply(self, message: str) -> str:
        raise NotImplementedError


class MockAIProvider(BaseAIProvider):
    name = "mock"

    @staticmethod
    def _normalize_math_expression(text: str) -> str | None:
        lower = text.lower().strip()
        if not lower:
            return None
        lower = lower.replace("what is", "").replace("what's", "").replace("?", " ")
        lower = re.sub(r"\bplus\b", " + ", lower)
        lower = re.sub(r"\bminus\b", " - ", lower)
        lower = re.sub(r"\bmultiplied by\b", " * ", lower)
        lower = re.sub(r"\btimes\b", " * ", lower)
        lower = re.sub(r"\bdivided by\b", " / ", lower)
        lower = re.sub(r"\bover\b", " / ", lower)
        lower = re.sub(r"[^0-9+\-*/().\s]", " ", lower)
        lower = re.sub(r"\s+", " ", lower).strip()
        if not lower or re.search(r"[+\-*/]$", lower):
            return None
        return lower

    @staticmethod
    def _evaluate_math_expression(text: str) -> float | int | None:
        expression = MockAIProvider._normalize_math_expression(text)
        if not expression:
            return None
        try:
            tree = ast.parse(expression, mode="eval")
            allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd, ast.Constant)
            for node in ast.walk(tree):
                if not isinstance(node, allowed):
                    return None
            result = eval(compile(tree, "<calc>", "eval"), {"__builtins__": {}}, {})
            return result
        except Exception:
            return None

    @staticmethod
    def _describe_math_question(text: str) -> str | None:
        expression = MockAIProvider._normalize_math_expression(text)
        if not expression:
            return None
        return expression

    def generate_reply(self, message: str) -> str:
        if not message or not message.strip():
            return "I can answer questions, check the weather, play music, and help with your device."

        lower = message.lower().strip()
        if any(token in lower for token in ("hello", "hi", "hey", "good morning", "good evening")):
            return "Hello! I’m here to help with questions, music, weather, and device controls."
        if "how are you" in lower:
            return "I’m doing well and ready to help you with whatever you need."
        if "artificial intelligence" in lower or ("ai" in lower and ("what is" in lower or "define" in lower or "tell me about" in lower or "explain" in lower)):
            return "Artificial intelligence (AI) is the field of computer science focused on building systems that can perform tasks that normally require human intelligence, such as reasoning, understanding language, recognizing patterns, and making decisions."

        math_result = self._evaluate_math_expression(lower)
        if math_result is not None:
            expression = self._describe_math_question(lower)
            if expression:
                return f"{expression} = {math_result}."

        if "photosynthesis" in lower:
            return "Photosynthesis is the process plants use to convert sunlight, water, and carbon dioxide into sugars for energy and oxygen."
        if "cristiano ronaldo" in lower or "ronaldo" in lower:
            return "Cristiano Ronaldo is a Portuguese professional footballer widely regarded as one of the greatest players of all time."
        if "summarize" in lower or "summary" in lower or "overview" in lower:
            return "The smart glasses app is a wearable assistant that combines voice commands, weather, music, camera access, and device controls in one hands-free interface."
        if "weather" in lower:
            return "I can check the weather for you. Try: weather in London."
        if "music" in lower:
            return "I can help search and play music. Try a track name or artist."
        if "camera" in lower or "vision" in lower:
            return "Camera mode is ready. I can help analyze a scene, object, or live frame."
        if "device" in lower or "status" in lower:
            return "The device is online and ready. Battery, connectivity, and sensors are reporting nominal status."
        return "I can help with that. Ask me a question, a calculation, or a device action and I’ll respond as a useful assistant."


class OpenAIChatProvider(BaseAIProvider):
    name = "openai"

    def __init__(self, settings: Any | None = None):
        self.settings = settings or get_settings()

    def generate_reply(self, message: str) -> str:
        if not self.settings.openai_api_key:
            raise RuntimeError("OpenAI API key is not configured")

        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are the AI assistant for a smart glasses app. Return a valid JSON object with exactly two keys: "
                        "polished_message and response. polished_message must rewrite the user's complete request in clear, natural language, "
                        "correcting grammar and obvious speech-recognition errors while preserving every detail, example, requirement, and intent. "
                        "Never summarize or shorten a long request. Choose formatting intelligently: keep a simple thought as a paragraph; use bullets "
                        "only when several distinct requirements, items, or steps are easier to scan as a list. Do not force bullets. If uncertain whether "
                        "a phrase is meaningful, preserve it. response must answer the polished request helpfully and may use Markdown formatting when useful. "
                        "Do not include anything outside the JSON object."
                    ),
                },
                {"role": "user", "content": message},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        base_url = (self.settings.openai_base_url or "https://api.openai.com/v1").rstrip("/")
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not content:
            raise ValueError("OpenAI returned an empty completion")
        return str(content).strip()


class AIChatService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.mock_provider = MockAIProvider()
        provider_name = (self.settings.ai_provider or "mock").lower()
        if provider_name == "openai":
            self.provider = OpenAIChatProvider(self.settings)
        else:
            self.provider = self.mock_provider

    def generate_reply(self, message: str, conversation_id: int | None = None, user_id: int | None = None) -> dict[str, Any]:
        provider_name = self.provider.name
        polished_message = message.strip()
        try:
            generated = self.provider.generate_reply(message)
            if isinstance(self.provider, OpenAIChatProvider):
                parsed = json.loads(generated)
                candidate = str(parsed.get("polished_message") or message).strip()
                # A suspiciously short rewrite can mean details were omitted; keep the source text.
                if len(message.strip()) < 180 or len(candidate) >= len(message.strip()) * 0.72:
                    polished_message = candidate or message.strip()
                content = str(parsed.get("response") or "").strip()
                if not content:
                    raise ValueError("OpenAI returned an empty assistant response")
            else:
                content = generated
        except Exception:
            content = self.mock_provider.generate_reply(message)
            polished_message = message.strip()
            provider_name = self.mock_provider.name

        return {
            "response": content,
            "polished_message": polished_message,
            "conversation_id": conversation_id,
            "role": "assistant",
            "provider": provider_name,
        }
