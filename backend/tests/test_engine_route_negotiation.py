from types import SimpleNamespace
from datetime import date

import pytest
from fastapi import HTTPException

from app.api.routes import engine as engine_route
from app.models.domain import CategoryType, FinancialItem, ItemType
from app.schemas.schemas import ActionDirective
from app.services.negotiation_engine import NegotiationServiceError


class _ScalarQuery:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value


class _ListQuery:
    def __init__(self, values):
        self._values = values

    def filter(self, *_args, **_kwargs):
        return self

    def all(self):
        return list(self._values)


class FakeSession:
    def __init__(self, *, balance_amount, payables, receivables):
        self._balance_amount = balance_amount
        self._payables = payables
        self._receivables = receivables
        self._financial_query_count = 0

    def query(self, model):
        if model is engine_route.CashBalance:
            if self._balance_amount is None:
                return _ScalarQuery(None)
            return _ScalarQuery(SimpleNamespace(amount=self._balance_amount))

        if model is engine_route.FinancialItem:
            self._financial_query_count += 1
            if self._financial_query_count % 2 == 1:
                return _ListQuery(self._payables)
            return _ListQuery(self._receivables)

        raise AssertionError(f"Unexpected model queried: {model}")


def _payable(item_id: int, amount: float = 300.0) -> FinancialItem:
    return FinancialItem(
        id=item_id,
        name="Vendor Labs",
        amount=amount,
        due_date=date.today(),
        item_type=ItemType.payable,
        category=CategoryType.strategic,
        relationship_risk="medium",
    )


def test_generate_negotiation_email_for_action_success(monkeypatch):
    payable = _payable(item_id=11, amount=300.0)
    db = FakeSession(balance_amount=1000.0, payables=[payable], receivables=[])

    monkeypatch.setattr(engine_route, "calculate_tax_envelope", lambda _incoming: 0.0)
    monkeypatch.setattr(engine_route, "get_available_cash", lambda cash, _tax: cash)
    monkeypatch.setattr(
        engine_route,
        "generate_action_directives",
        lambda *_args, **_kwargs: [
            ActionDirective(
                item_id=11,
                name="Vendor Labs",
                action="Negotiate",
                amount_to_pay=120.0,
                justification="Boundary payment",
            )
        ],
    )
    monkeypatch.setattr(
        engine_route,
        "generate_negotiation_email",
        lambda **_kwargs: ("Strategic", "Subject", "Body"),
    )

    response = engine_route.generate_negotiation_email_for_action(item_id=11, db=db)

    assert response.item_id == 11
    assert response.relationship_tier == "Strategic"
    assert response.amount_to_pay_now == 120.0
    assert response.amount_deferred == 180.0
    assert response.subject == "Subject"
    assert response.body == "Body"


def test_generate_negotiation_email_for_action_missing_action(monkeypatch):
    db = FakeSession(balance_amount=800.0, payables=[_payable(item_id=1)], receivables=[])

    monkeypatch.setattr(engine_route, "calculate_tax_envelope", lambda _incoming: 0.0)
    monkeypatch.setattr(engine_route, "get_available_cash", lambda cash, _tax: cash)
    monkeypatch.setattr(engine_route, "generate_action_directives", lambda *_args, **_kwargs: [])

    with pytest.raises(HTTPException) as exc:
        engine_route.generate_negotiation_email_for_action(item_id=1, db=db)

    assert exc.value.status_code == 404
    assert "No action exists" in exc.value.detail


def test_generate_negotiation_email_for_action_rejects_non_negotiate(monkeypatch):
    db = FakeSession(balance_amount=800.0, payables=[_payable(item_id=1)], receivables=[])

    monkeypatch.setattr(engine_route, "calculate_tax_envelope", lambda _incoming: 0.0)
    monkeypatch.setattr(engine_route, "get_available_cash", lambda cash, _tax: cash)
    monkeypatch.setattr(
        engine_route,
        "generate_action_directives",
        lambda *_args, **_kwargs: [
            ActionDirective(
                item_id=1,
                name="Vendor Labs",
                action="Pay",
                amount_to_pay=300.0,
                justification="Full payment",
            )
        ],
    )

    with pytest.raises(HTTPException) as exc:
        engine_route.generate_negotiation_email_for_action(item_id=1, db=db)

    assert exc.value.status_code == 400
    assert "only available for partial-payment actions" in exc.value.detail


def test_generate_negotiation_email_for_action_missing_payable(monkeypatch):
    db = FakeSession(balance_amount=800.0, payables=[], receivables=[])

    monkeypatch.setattr(engine_route, "calculate_tax_envelope", lambda _incoming: 0.0)
    monkeypatch.setattr(engine_route, "get_available_cash", lambda cash, _tax: cash)
    monkeypatch.setattr(
        engine_route,
        "generate_action_directives",
        lambda *_args, **_kwargs: [
            ActionDirective(
                item_id=9,
                name="Unknown",
                action="Negotiate",
                amount_to_pay=100.0,
                justification="Partial",
            )
        ],
    )

    with pytest.raises(HTTPException) as exc:
        engine_route.generate_negotiation_email_for_action(item_id=9, db=db)

    assert exc.value.status_code == 404
    assert "Payable item not found" in exc.value.detail


def test_generate_negotiation_email_for_action_handles_service_error(monkeypatch):
    db = FakeSession(balance_amount=800.0, payables=[_payable(item_id=2)], receivables=[])

    monkeypatch.setattr(engine_route, "calculate_tax_envelope", lambda _incoming: 0.0)
    monkeypatch.setattr(engine_route, "get_available_cash", lambda cash, _tax: cash)
    monkeypatch.setattr(
        engine_route,
        "generate_action_directives",
        lambda *_args, **_kwargs: [
            ActionDirective(
                item_id=2,
                name="Vendor Labs",
                action="Negotiate",
                amount_to_pay=100.0,
                justification="Partial",
            )
        ],
    )

    def _raise_service_error(**_kwargs):
        raise NegotiationServiceError("simulated failure")

    monkeypatch.setattr(engine_route, "generate_negotiation_email", _raise_service_error)

    with pytest.raises(HTTPException) as exc:
        engine_route.generate_negotiation_email_for_action(item_id=2, db=db)

    assert exc.value.status_code == 400
    assert "simulated failure" in exc.value.detail
