from datetime import date

import pytest

from app.models.domain import ItemType
from app.services import ocr_ingestion
from app.services.ocr_ingestion import OCRDependencyError, parse_financial_document, parse_financial_text
from app.services.vision_invoice import VisionServiceError, parse_invoice_with_vision


def test_parse_financial_text_extracts_amount_date_and_type():
    text = """
    AWS Invoice $1,200.50 due 2026-04-30 receivable
    """
    parsed = parse_financial_text(text, default_item_type=ItemType.payable)

    assert len(parsed) == 1
    assert parsed[0]["name"] == "AWS Invoice"
    assert parsed[0]["amount"] == 1200.5
    assert parsed[0]["due_date"].isoformat() == "2026-04-30"
    assert parsed[0]["item_type"] == ItemType.receivable


def test_parse_financial_text_uses_default_item_type_when_missing():
    text = "Stripe Processing Fee $45.89 due 03/15/2026"
    parsed = parse_financial_text(text, default_item_type=ItemType.payable)

    assert len(parsed) == 1
    assert parsed[0]["item_type"] == ItemType.payable
    assert parsed[0]["amount"] == 45.89


def test_parse_financial_text_skips_non_financial_lines():
    text = """
    This is a heading
    Another line without amount
    """
    parsed = parse_financial_text(text, default_item_type=ItemType.payable)

    assert parsed == []


def test_parse_financial_text_defaults_due_date_to_today_when_missing():
    text = "Office Rent $2500 payable"
    parsed = parse_financial_text(text, default_item_type=ItemType.payable)

    assert len(parsed) == 1
    assert parsed[0]["due_date"] == date.today()


def test_parse_financial_document_falls_back_to_vision_when_ocr_parse_fails(monkeypatch):
    monkeypatch.setattr(ocr_ingestion, "extract_text_from_image", lambda _: "Header only")
    monkeypatch.setattr(ocr_ingestion, "parse_financial_text", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(ocr_ingestion, "is_vision_fallback_enabled", lambda: True)

    class StubVisionInvoice:
        vendor = "ACME Telecom"
        due_date = date(2026, 6, 1)
        amount = 99.5

    monkeypatch.setattr(ocr_ingestion, "parse_invoice_with_vision", lambda _: StubVisionInvoice())

    parsed = parse_financial_document(b"img", default_item_type=ItemType.payable)
    assert parsed == [
        {
            "name": "ACME Telecom",
            "amount": 99.5,
            "due_date": date(2026, 6, 1),
            "item_type": ItemType.payable,
        }
    ]


def test_parse_financial_document_preserves_ocr_dependency_error_when_vision_disabled(monkeypatch):
    monkeypatch.setattr(ocr_ingestion, "extract_text_from_image", lambda _: (_ for _ in ()).throw(OCRDependencyError("missing")))
    monkeypatch.setattr(ocr_ingestion, "is_vision_fallback_enabled", lambda: False)

    with pytest.raises(OCRDependencyError, match="missing"):
        parse_financial_document(b"img", default_item_type=ItemType.payable)


def test_parse_financial_document_raises_vision_error_when_fallback_fails(monkeypatch):
    monkeypatch.setattr(ocr_ingestion, "extract_text_from_image", lambda _: (_ for _ in ()).throw(ValueError("no text")))
    monkeypatch.setattr(ocr_ingestion, "is_vision_fallback_enabled", lambda: True)
    monkeypatch.setattr(
        ocr_ingestion,
        "parse_invoice_with_vision",
        lambda _: (_ for _ in ()).throw(VisionServiceError("vision unavailable")),
    )

    with pytest.raises(VisionServiceError, match="vision unavailable"):
        parse_financial_document(b"img", default_item_type=ItemType.payable)


def test_parse_invoice_with_vision_rejects_extra_fields(monkeypatch):
    from app.services import vision_invoice

    monkeypatch.setattr(
        vision_invoice,
        "_call_groq_vision",
        lambda _: '{"vendor":"Nexa","due_date":"2026-04-10","amount":450.0,"notes":"extra"}',
    )

    with pytest.raises(VisionServiceError, match="schema validation"):
        parse_invoice_with_vision(b"img")
