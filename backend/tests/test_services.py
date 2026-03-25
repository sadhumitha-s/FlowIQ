import pytest
from datetime import date, timedelta
from app.models.domain import FinancialItem, ItemType, CategoryType
from app.services.tax_engine import calculate_tax_envelope, get_available_cash
from app.services.runway import calculate_runway, generate_action_directives
from app.services import runway
from app.services import clustering
from app.services.clustering import cluster_obligation
from app.services.negotiation_engine import (
    resolve_negotiation_tier,
    generate_negotiation_email,
    NegotiationServiceError,
)

def test_calculate_tax_envelope():
    assert calculate_tax_envelope(1000.0, 0.25) == 250.0

def test_get_available_cash():
    assert get_available_cash(1000.0, 250.0) == 750.0
    assert get_available_cash(200.0, 250.0) == 0.0

def test_clustering_heuristics(monkeypatch):
    clustering._get_semantic_classifier.cache_clear()
    monkeypatch.setattr(clustering, "_get_semantic_classifier", lambda: None)

    fixed_item = FinancialItem(name="Monthly Office Rent", amount=1000, due_date=date.today(), item_type=ItemType.payable)
    assert cluster_obligation(fixed_item) == CategoryType.fixed
    
    flexible_item = FinancialItem(name="Office Supplies", amount=100, due_date=date.today(), item_type=ItemType.payable)
    assert cluster_obligation(flexible_item) == CategoryType.flexible


def test_clustering_semantic_fallback(monkeypatch):
    class StubSemanticClassifier:
        def classify(self, item):
            assert "Next Quarter Growth Initiative" in item.name
            return CategoryType.strategic

    clustering._get_semantic_classifier.cache_clear()
    monkeypatch.setattr(clustering, "_get_semantic_classifier", lambda: StubSemanticClassifier())

    unmapped_item = FinancialItem(
        name="Next Quarter Growth Initiative",
        amount=1200,
        due_date=date.today(),
        item_type=ItemType.payable,
    )
    assert cluster_obligation(unmapped_item) == CategoryType.strategic

def test_calculate_runway():
    today = date.today()
    payables = [
        FinancialItem(id=1, name="Rent", amount=1500, due_date=today + timedelta(days=2), item_type=ItemType.payable),
        FinancialItem(id=2, name="AWS", amount=200, due_date=today + timedelta(days=5), item_type=ItemType.payable)
    ]
    # Current cash is 1600.
    # Day 2: -1500 -> 100 cache.
    # Day 5: -200 -> -100 cash (Fail!)
    days, failures = calculate_runway(1600.0, payables, [])
    assert days == 5
    assert len(failures) == 1
    assert "Shortfall" in failures[0]

def test_generate_action_directives():
    payables = [
        FinancialItem(id=1, name="Rent", amount=1500, due_date=date.today(), item_type=ItemType.payable, category=CategoryType.fixed, relationship_risk="high"),
        FinancialItem(id=2, name="AWS", amount=200, due_date=date.today(), item_type=ItemType.payable, category=CategoryType.flexible, relationship_risk="low")
    ]
    
    # We only have 1600 cash.
    # Rent should score higher and be paid. 1600 - 1500 = 100 left.
    # AWS should get partial/negotiate.
    actions = generate_action_directives(1600.0, payables)
    
    assert len(actions) == 2
    
    # Expect Rent to be paid
    assert actions[0].name == "Rent"
    assert actions[0].action == "Pay"
    
    # Expect AWS to be negotiate
    assert actions[1].name == "AWS"
    assert actions[1].action == "Negotiate"
    assert actions[1].amount_to_pay == 100.0
    assert "shadow price" in actions[1].justification.lower()


def test_generate_action_directives_uses_llm_reasoning(monkeypatch):
    payables = [
        FinancialItem(id=1, name="Rent", amount=1500, due_date=date.today(), item_type=ItemType.payable, category=CategoryType.fixed, relationship_risk="high"),
        FinancialItem(id=2, name="AWS", amount=200, due_date=date.today(), item_type=ItemType.payable, category=CategoryType.flexible, relationship_risk="low"),
    ]

    monkeypatch.setattr(
        runway,
        "generate_llm_rationales",
        lambda **kwargs: {
            1: "Rent was fully funded because its delay coefficient dominated the cash dual signal.",
            2: "AWS is partially funded because the cash shadow price forced a boundary solution.",
        },
    )

    actions = generate_action_directives(1600.0, payables)

    assert actions[0].item_id == 1
    assert "dominated the cash dual signal" in actions[0].justification
    assert actions[1].item_id == 2
    assert "cash shadow price" in actions[1].justification.lower()


def test_resolve_negotiation_tier():
    formal = FinancialItem(
        name="Landlord",
        amount=1200,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.fixed,
        relationship_risk="high",
    )
    strategic = FinancialItem(
        name="Cloud Platform",
        amount=1200,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.strategic,
        relationship_risk="medium",
    )
    flexible = FinancialItem(
        name="Freelancer Collective",
        amount=1200,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.flexible,
        relationship_risk="low",
    )

    assert resolve_negotiation_tier(formal) == "Formal"
    assert resolve_negotiation_tier(strategic) == "Strategic"
    assert resolve_negotiation_tier(flexible) == "Flexible"


def test_generate_negotiation_email_requires_partial_payment():
    item = FinancialItem(
        name="Agency",
        amount=1000,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.flexible,
        relationship_risk="low",
    )

    with pytest.raises(NegotiationServiceError):
        generate_negotiation_email(item=item, payment_now=0.0)

    with pytest.raises(NegotiationServiceError):
        generate_negotiation_email(item=item, payment_now=1000.0)


def test_generate_negotiation_email_fallback(monkeypatch):
    monkeypatch.setattr("app.services.negotiation_engine.is_negotiation_enabled", lambda: False)
    item = FinancialItem(
        name="VendorX",
        amount=800,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.strategic,
        relationship_risk="medium",
    )

    tier, subject, body = generate_negotiation_email(item=item, payment_now=300)

    assert tier == "Strategic"
    assert "VendorX" in subject
    assert "$300.00" in body
    assert "$500.00" in body


def test_generate_negotiation_email_falls_back_when_llm_call_fails(monkeypatch):
    monkeypatch.setattr("app.services.negotiation_engine.is_negotiation_enabled", lambda: True)
    monkeypatch.setattr(
        "app.services.negotiation_engine._call_groq_negotiation",
        lambda **_kwargs: (_ for _ in ()).throw(NegotiationServiceError("llm unavailable")),
    )

    item = FinancialItem(
        name="Critical Vendor",
        amount=600,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.fixed,
        relationship_risk="high",
    )

    tier, subject, body = generate_negotiation_email(item=item, payment_now=200)

    assert tier == "Formal"
    assert "Critical Vendor" in subject
    assert "$200.00" in body
    assert "$400.00" in body
