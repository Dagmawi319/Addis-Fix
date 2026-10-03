import os
import json
import re
import base64
import uuid
import logging

from core import config

logger = logging.getLogger(__name__)

_VALID_CATEGORIES = [
    "roads", "waste", "water", "electricity", "streetlights",
    "drainage", "public_property", "other",
]

SYSTEM_PROMPT = (
    "You are an assistive vision model for AddisFix, a civic issue reporting platform. "
    "You analyze a citizen-submitted photo of a possible public infrastructure problem. "
    "You are ASSISTIVE ONLY and never the official authority. "
    "Return STRICT JSON only, no prose, with this exact shape: "
    '{"category": one of ' + str(_VALID_CATEGORIES) + ', '
    '"severity": "low"|"medium"|"high", '
    '"description": short factual observation, '
    '"confidence": a number between 0 and 1 that is YOUR OWN self-assessed estimate, '
    '"needs_review": boolean}. '
    "If the image is unclear or not a civic issue, use category 'other', low confidence, needs_review true."
)


def ai_available() -> bool:
    k = config.EMERGENT_LLM_KEY
    return bool(k) and not k.startswith("{")


async def analyze_image(image_bytes: bytes, mime_type: str) -> dict:
    """Server-side AI image analysis. Returns a dict with available flag.
    Never fabricates results: if the service is not configured or errors, returns unavailable."""
    if not ai_available():
        return {"available": False, "message": "AI analysis is currently unavailable."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        chat = LlmChat(
            api_key=config.EMERGENT_LLM_KEY,
            session_id=f"addisfix-ai-{uuid.uuid4().hex[:10]}",
            system_message=SYSTEM_PROMPT,
        ).with_model("openai", config.AI_MODEL)
        msg = UserMessage(
            text="Analyze this civic issue photo and respond with the required JSON only.",
            file_contents=[ImageContent(image_base64=b64)],
        )
        raw = await chat.send_message(msg)
        text = raw if isinstance(raw, str) else str(raw)
        parsed = _parse_json(text)
        if not parsed:
            return {"available": False, "message": "AI analysis is currently unavailable."}
        category = parsed.get("category")
        if category not in _VALID_CATEGORIES:
            category = "other"
        severity = parsed.get("severity")
        if severity not in ("low", "medium", "high"):
            severity = "medium"
        conf = parsed.get("confidence")
        try:
            conf = max(0.0, min(1.0, float(conf)))
        except Exception:
            conf = None
        return {
            "available": True,
            "category": category,
            "severity": severity,
            "description": str(parsed.get("description", ""))[:400],
            "confidence": conf,
            "needs_review": bool(parsed.get("needs_review", True)),
            "model": config.AI_MODEL,
        }
    except Exception as e:
        logger.error(f"AI image analysis failed: {e}")
        return {"available": False, "message": "AI analysis is currently unavailable."}


def _parse_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None
