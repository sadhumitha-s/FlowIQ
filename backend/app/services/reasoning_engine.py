import json
import re
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings


class ReasoningServiceError(RuntimeError):
    pass


class ItemReasoning(BaseModel):
    item_id: int
    justification: str = Field(min_length=20, max_length=600)

    model_config = ConfigDict(extra="forbid")


class ReasoningResponse(BaseModel):
    rationales: list[ItemReasoning]

    model_config = ConfigDict(extra="forbid")


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

    raise ReasoningServiceError("Reasoning model did not return valid JSON content.")


def _validate_reasoning_json(raw_json: str, expected_item_ids: set[int]) -> dict[int, str]:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ReasoningServiceError("Reasoning model returned invalid JSON.") from exc

    try:
        validated = ReasoningResponse.model_validate(payload)
    except ValidationError as exc:
        raise ReasoningServiceError(f"Reasoning output failed schema validation: {exc.errors()}") from exc

    rationale_by_id: dict[int, str] = {}
    for row in validated.rationales:
        if row.item_id not in expected_item_ids:
            continue
        rationale_by_id[row.item_id] = row.justification.strip()
    return rationale_by_id


def _system_prompt() -> str:
    return (
        "You are a financial optimization reasoning engine. "
        "You must explain solver decisions using only provided numeric context. "
        "Do not invent constraints, values, or business facts."
    )


def _user_prompt(context: dict[str, Any]) -> str:
    return (
        "Task: Generate one concise mathematical explanation per payable item.\n"
        "Rules:\n"
        "1) Mention concrete numbers from context: paid amount, cost coefficient, and at least one dual/reduced-cost signal.\n"
        "2) Explain tradeoff using primal-dual logic in plain English.\n"
        "3) Do not use markdown, bullets, or code fences.\n"
        "4) Return valid JSON only with schema: "
        '{"rationales":[{"item_id": number, "justification": string}]}\n'
        "5) Include every item exactly once.\n\n"
        f"Context JSON:\n{json.dumps(context, separators=(',', ':'))}"
    )


def _call_groq_reasoning(context: dict[str, Any], expected_item_ids: set[int]) -> dict[int, str]:
    if not settings.GROQ_API_KEY:
        raise ReasoningServiceError("GROQ_API_KEY is required for LLM reasoning.")

    endpoint = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    payload = {
        "model": settings.GROQ_REASONING_MODEL,
        "temperature": 0.0,
        "messages": [
            {"role": "system", "content": _system_prompt()},
            {"role": "user", "content": _user_prompt(context)},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "payment_rationales",
                "schema": {
                    "type": "object",
                    "properties": {
                        "rationales": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "item_id": {"type": "integer"},
                                    "justification": {"type": "string"},
                                },
                                "required": ["item_id", "justification"],
                                "additionalProperties": False,
                            },
                        }
                    },
                    "required": ["rationales"],
                    "additionalProperties": False,
                },
            },
        },
    }

    try:
        response = httpx.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=settings.REASONING_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise ReasoningServiceError("Failed to call Groq reasoning endpoint.") from exc

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise ReasoningServiceError("Groq reasoning response did not contain choices.")

    content = choices[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise ReasoningServiceError("Groq reasoning response did not contain message content.")

    raw_json = _extract_json_text(content)
    return _validate_reasoning_json(raw_json, expected_item_ids=expected_item_ids)


def is_reasoning_enabled() -> bool:
    return settings.REASONING_LLM_ENABLED and bool(settings.GROQ_API_KEY)


def generate_llm_rationales(context: dict[str, Any], expected_item_ids: set[int]) -> dict[int, str]:
    if not is_reasoning_enabled():
        return {}
    try:
        return _call_groq_reasoning(context=context, expected_item_ids=expected_item_ids)
    except ReasoningServiceError:
        return {}
