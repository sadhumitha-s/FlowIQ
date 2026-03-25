import pytest
from datetime import date, timedelta
from app.models.domain import FinancialItem, ItemType, CategoryType
from app.services.tax_engine import calculate_tax_envelope, get_available_cash
from app.services.runway import calculate_runway, generate_action_directives
from app.services import clustering
from app.services.clustering import cluster_obligation

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
