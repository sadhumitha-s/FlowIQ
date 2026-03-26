import json
import re
from datetime import date, timedelta
from typing import Literal

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings
from app.models.domain import CategoryType, FinancialItem


NegotiationTier = Literal["Formal", "Strategic", "Flexible"]


class NegotiationServiceError(RuntimeError):
    pass


class NegotiationEmailModel(BaseModel):
    subject: str = Field(min_length=8, max_length=140)
    body: str = Field(min_length=80, max_length=1800)

    model_config = ConfigDict(extra="forbid")


def _get_groq_api_key() -> str | None:
    raw = (settings.GROQ_API_KEY or "").strip()
    if not raw:
        return None

    normalized = (
        raw.replace("“", "")
        .replace("”", "")
        .replace("‘", "")
        .replace("’", "")
        .strip()
        .strip('"')
        .strip("'")
        .strip()
    )
    if not normalized:
        return None

    try:
        normalized.encode("ascii")
    except UnicodeEncodeError:
        return None
    return normalized


def resolve_negotiation_tier(item: FinancialItem) -> NegotiationTier:
    category_value = item.category.value if isinstance(item.category, CategoryType) else str(item.category)
    risk = (item.relationship_risk or "").strip().lower()

    if category_value == CategoryType.strategic.value:
        return "Strategic"
    if category_value == CategoryType.flexible.value and risk in {"low", ""}:
        return "Flexible"
    if risk == "high":
        return "Formal"
    if risk == "medium":
        return "Strategic"
    if category_value == CategoryType.flexible.value:
        return "Flexible"
    return "Formal"


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

    raise NegotiationServiceError("Negotiation model did not return valid JSON content.")


def _validate_email_json(raw_json: str) -> NegotiationEmailModel:
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise NegotiationServiceError("Negotiation model returned invalid JSON.") from exc

    try:
        return NegotiationEmailModel.model_validate(payload)
    except ValidationError as exc:
        raise NegotiationServiceError(f"Negotiation output failed schema validation: {exc.errors()}") from exc


def _system_prompt() -> str:
    return (
        "You write high-stakes vendor payment negotiation emails. "
        "Output concise, professional copy that is psychologically calibrated to the requested relationship tier."
    )


def _tier_style_instruction(tier: NegotiationTier) -> str:
    if tier == "Formal":
        return "Tone: formal, compliance-forward, no casual phrasing, emphasize reliability and exact dates."
    if tier == "Strategic":
        return "Tone: partnership-oriented, highlight long-term mutual value, preserve executive trust."
    return "Tone: collaborative and direct, warm but businesslike, focus on quick alignment and action."


def _user_prompt(
    *,
    vendor_name: str,
    tier: NegotiationTier,
    total_amount: float,
    payment_now: float,
    payment_later: float,
    due_date: date,
) -> str:
    next_payment_date = max(due_date, date.today() + timedelta(days=14))
    return (
        "Task: Draft one copy-paste-ready vendor negotiation email for a partial payment plan.\n"
        "Rules:\n"
        "1) Return JSON only with schema: {\"subject\": string, \"body\": string}.\n"
        "2) Body must include: acknowledgement of invoice, exact amount payable now, explicit deferred amount, and a concrete next payment date.\n"
        "3) Keep body 130-220 words, no markdown, no bullet points.\n"
        "4) Avoid manipulative language, threats, or overpromising.\n"
        f"5) {_tier_style_instruction(tier)}\n\n"
        "Context:\n"
        f"Vendor: {vendor_name}\n"
        f"Relationship tier: {tier}\n"
        f"Invoice amount: ${total_amount:,.2f}\n"
        f"Pay now: ${payment_now:,.2f}\n"
        f"Deferred: ${payment_later:,.2f}\n"
        f"Invoice due date: {due_date.isoformat()}\n"
        f"Required next payment date: {next_payment_date.isoformat()}"
    )


def _call_groq_negotiation(
    *,
    vendor_name: str,
    tier: NegotiationTier,
    total_amount: float,
    payment_now: float,
    payment_later: float,
    due_date: date,
) -> NegotiationEmailModel:
    api_key = _get_groq_api_key()
    if not api_key:
        raise NegotiationServiceError("GROQ_API_KEY is required for negotiation generation.")

    endpoint = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}

    payload = {
        "model": settings.GROQ_NEGOTIATION_MODEL,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": _system_prompt()},
            {
                "role": "user",
                "content": _user_prompt(
                    vendor_name=vendor_name,
                    tier=tier,
                    total_amount=total_amount,
                    payment_now=payment_now,
                    payment_later=payment_later,
                    due_date=due_date,
                ),
            },
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "negotiation_email",
                "schema": {
                    "type": "object",
                    "properties": {
                        "subject": {"type": "string"},
                        "body": {"type": "string"},
                    },
                    "required": ["subject", "body"],
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
            timeout=settings.NEGOTIATION_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise NegotiationServiceError("Failed to call negotiation generation endpoint.") from exc

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise NegotiationServiceError("Negotiation response did not contain choices.")

    content = choices[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise NegotiationServiceError("Negotiation response did not contain message content.")

    raw_json = _extract_json_text(content)
    return _validate_email_json(raw_json)


def _fallback_subject(vendor_name: str) -> str:
    return f"Payment Plan Proposal for Upcoming {vendor_name} Invoice"


def _fallback_body(
    *,
    vendor_name: str,
    tier: NegotiationTier,
    total_amount: float,
    payment_now: float,
    payment_later: float,
    due_date: date,
) -> str:
    next_payment_date = max(due_date, date.today() + timedelta(days=14)).isoformat()

    if tier == "Strategic":
        opener = (
            f"I appreciate the partnership we have with {vendor_name} and the role your team plays in our operations. "
            "I am writing to align on this invoice in a way that protects continuity on both sides."
        )
    elif tier == "Flexible":
        opener = (
            f"Thanks for working closely with us, and for the flexibility your team has shown in the past. "
            "I wanted to share a clear payment proposal so we can close this invoice smoothly."
        )
    else:
        opener = (
            f"I am reaching out regarding our current invoice with {vendor_name}. "
            "We are managing a short-term cash timing constraint and want to confirm a precise payment plan."
        )

    return (
        f"{opener} We can remit ${payment_now:,.2f} immediately against the total balance of ${total_amount:,.2f}, "
        f"with the remaining ${payment_later:,.2f} paid on {next_payment_date}. "
        "This structure lets us meet the majority of the obligation now while preserving continuity of service and a dependable close-out timeline. "
        "Please confirm if this schedule is acceptable, and we will process the first transfer right away and share remittance details."
    )


def is_negotiation_enabled() -> bool:
    return settings.NEGOTIATION_LLM_ENABLED and bool(_get_groq_api_key())


def generate_negotiation_email(
    *,
    item: FinancialItem,
    payment_now: float,
) -> tuple[NegotiationTier, str, str]:
    total_amount = round(float(item.amount), 2)
    payment_now = round(float(payment_now), 2)
    payment_later = round(max(0.0, total_amount - payment_now), 2)
    tier = resolve_negotiation_tier(item)

    if payment_now <= 0.0 or payment_later <= 0.0:
        raise NegotiationServiceError("Negotiation email requires a partial-payment scenario.")

    if is_negotiation_enabled():
        try:
            llm_email = _call_groq_negotiation(
                vendor_name=item.name,
                tier=tier,
                total_amount=total_amount,
                payment_now=payment_now,
                payment_later=payment_later,
                due_date=item.due_date,
            )
            return tier, llm_email.subject.strip(), llm_email.body.strip()
        except NegotiationServiceError:
            pass

    return (
        tier,
        _fallback_subject(item.name),
        _fallback_body(
            vendor_name=item.name,
            tier=tier,
            total_amount=total_amount,
            payment_now=payment_now,
            payment_later=payment_later,
            due_date=item.due_date,
        ),
    )
