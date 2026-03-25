import base64
import json
import re
from datetime import date

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings


class VisionServiceError(RuntimeError):
    pass


class VisionInvoiceExtraction(BaseModel):
    vendor: str = Field(min_length=1)
    due_date: date
    amount: float = Field(gt=0)

    model_config = ConfigDict(extra="forbid")


def is_vision_fallback_enabled() -> bool:
    return settings.VISION_FALLBACK_ENABLED


def _schema_instructions() -> str:
    return (
        "Extract invoice data from the image and return JSON only. "
        "Use this exact schema with no extra keys: "
        '{"vendor": "string", "due_date": "YYYY-MM-DD", "amount": number}. '
        "If uncertain, infer the most likely values from the visible invoice fields."
    )


def _extract_json_text(raw_text: str) -> str:
    stripped = raw_text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped

    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL)
    if fenced_match:
        return fenced_match.group(1)

    brace_match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
    if brace_match:
        return brace_match.group(0)

    raise VisionServiceError("Vision model did not return valid JSON content.")


def _validate_invoice_json(raw_json: str) -> VisionInvoiceExtraction:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise VisionServiceError("Vision model returned invalid JSON.") from exc

    try:
        return VisionInvoiceExtraction.model_validate(payload)
    except ValidationError as exc:
        raise VisionServiceError(f"Vision output failed schema validation: {exc.errors()}") from exc


def _call_groq_vision(image_bytes: bytes) -> str:
    if not settings.GROQ_API_KEY:
        raise VisionServiceError("GROQ_API_KEY is required for vision fallback.")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    request_payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _schema_instructions()},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                    },
                ],
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "invoice_extraction",
                "schema": {
                    "type": "object",
                    "properties": {
                        "vendor": {"type": "string"},
                        "due_date": {"type": "string"},
                        "amount": {"type": "number"},
                    },
                    "required": ["vendor", "due_date", "amount"],
                    "additionalProperties": False,
                },
            },
        },
    }

    endpoint = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    try:
        response = httpx.post(
            endpoint,
            headers=headers,
            json=request_payload,
            timeout=settings.VISION_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise VisionServiceError("Failed to call Groq vision endpoint.") from exc

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise VisionServiceError("Groq response did not contain choices.")

    content = choices[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise VisionServiceError("Groq response did not contain message content.")
    return content


def parse_invoice_with_vision(image_bytes: bytes) -> VisionInvoiceExtraction:
    raw_content = _call_groq_vision(image_bytes)
    raw_json = _extract_json_text(raw_content)
    return _validate_invoice_json(raw_json)
