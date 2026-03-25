from datetime import date

from app.models.domain import ItemType
from app.services.ocr_ingestion import parse_financial_text


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
