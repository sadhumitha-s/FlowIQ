import io
import re
from datetime import date
from typing import Any

import pandas as pd

from app.models.domain import ItemType
from app.services.vision_invoice import is_vision_fallback_enabled, parse_invoice_with_vision

try:
    import pytesseract
    from PIL import Image
except ImportError:  # pragma: no cover - validated via runtime route handling
    pytesseract = None
    Image = None


class OCRDependencyError(RuntimeError):
    pass


_AMOUNT_PATTERN = re.compile(r"(?<!\w)(?:USD\s*)?\$?\s*(-?\d[\d,]*(?:\.\d{1,2})?)", re.IGNORECASE)
_DATE_TOKEN_PATTERN = re.compile(
    r"(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|"
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,)?\s+\d{2,4}|"
    r"\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?:,)?\s+\d{2,4})",
    re.IGNORECASE,
)
_TYPE_TOKEN_PATTERN = re.compile(r"\b(payable|bill|expense|receivable|invoice|income)\b", re.IGNORECASE)


def _normalize_item_type(raw: str | None, default_item_type: ItemType) -> ItemType:
    if not raw:
        return default_item_type
    token = raw.lower()
    if token in {"receivable", "invoice", "income"}:
        return ItemType.receivable
    return ItemType.payable


def _parse_amount(raw: str | None) -> float | None:
    if not raw:
        return None
    cleaned = raw.replace(",", "").replace("$", "").replace("USD", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_date_token(raw: str | None) -> date | None:
    if not raw:
        return None
    parsed = pd.to_datetime(raw, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def _extract_name(raw_line: str, amount_token: str | None, date_token: str | None, type_token: str | None) -> str:
    normalized = raw_line
    removable_type_token = type_token if type_token and type_token.lower() in {"payable", "receivable", "income", "expense"} else None
    for token in [amount_token, date_token, removable_type_token]:
        if token:
            normalized = normalized.replace(token, " ")
    normalized = re.sub(r"\b(due|on|by)\b", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s+", " ", normalized).strip(" -:\t")
    return normalized or "Imported Item"


def _extract_rows(text: str, default_item_type: ItemType) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in text.splitlines():
        normalized_line = re.sub(r"\s+", " ", line).strip()
        if not normalized_line:
            continue

        amount_match = _AMOUNT_PATTERN.search(normalized_line)
        date_match = _DATE_TOKEN_PATTERN.search(normalized_line)
        type_tokens = _TYPE_TOKEN_PATTERN.findall(normalized_line)
        preferred_type = next(
            (token for token in type_tokens if token.lower() in {"payable", "receivable", "income", "expense"}),
            type_tokens[0] if type_tokens else None,
        )
        if not amount_match:
            continue

        amount_token = amount_match.group(0) if amount_match else None
        date_token = date_match.group(0) if date_match else None
        type_token = preferred_type
        rows.append(
            {
                "name": _extract_name(normalized_line, amount_token, date_token, type_token),
                "amount": _parse_amount(amount_token),
                "due_date": _parse_date_token(date_token) or date.today(),
                "item_type": _normalize_item_type(type_token, default_item_type),
            }
        )

    return rows


def parse_financial_text(text: str, default_item_type: ItemType = ItemType.payable) -> list[dict[str, Any]]:
    rows = _extract_rows(text, default_item_type=default_item_type)
    if not rows:
        return []

    df = pd.DataFrame(rows)
    if df.empty:
        return []

    df["name"] = df["name"].fillna("Imported Item").astype(str).str.strip()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["due_date"] = pd.to_datetime(df["due_date"], errors="coerce").dt.date
    df["item_type"] = df["item_type"].apply(lambda x: x if isinstance(x, ItemType) else default_item_type)
    df = df.dropna(subset=["name", "amount", "due_date"])

    if df.empty:
        return []

    df["amount"] = df["amount"].round(2)
    return df.to_dict(orient="records")


def extract_text_from_image(image_bytes: bytes) -> str:
    if pytesseract is None or Image is None:
        raise OCRDependencyError("OCR dependencies are unavailable. Install pytesseract and Pillow.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        raise ValueError("Unable to read uploaded image.") from exc

    extracted_text = pytesseract.image_to_string(image)
    if not extracted_text or not extracted_text.strip():
        raise ValueError("No text found in uploaded document.")
    return extracted_text


def parse_financial_document(image_bytes: bytes, default_item_type: ItemType = ItemType.payable) -> list[dict[str, Any]]:
    ocr_failure: Exception | None = None
    try:
        extracted_text = extract_text_from_image(image_bytes)
    except (OCRDependencyError, ValueError) as exc:
        ocr_failure = exc
    else:
        parsed_rows = parse_financial_text(extracted_text, default_item_type=default_item_type)
        if parsed_rows:
            return parsed_rows
        ocr_failure = ValueError("No financial line-items were detected in OCR output.")

    if not is_vision_fallback_enabled():
        raise ocr_failure

    vision_invoice = parse_invoice_with_vision(image_bytes)
    return [
        {
            "name": vision_invoice.vendor.strip(),
            "amount": round(float(vision_invoice.amount), 2),
            "due_date": vision_invoice.due_date,
            "item_type": default_item_type,
        }
    ]
