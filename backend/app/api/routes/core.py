from datetime import date, datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.domain import CashBalance, FinancialItem, ItemType
from app.services.tax_engine import calculate_tax_envelope, get_available_cash
from app.services.runway import generate_action_directives

router = APIRouter()


class Transaction(BaseModel):
    id: Optional[str] = None
    amount: float
    type: str
    counterparty: Optional[str] = None
    date: str


class SimulationParams(BaseModel):
    delay_receivable_days: Optional[int] = None
    override_directives: Optional[Dict[str, str]] = None
    partial_payments: Optional[Dict[str, float]] = None


class Obligation(BaseModel):
    id: str
    counterparty: str
    counterparty_type: str
    cluster: str
    amount: float
    due_date: str
    days_until_due: int
    penalty_per_day: float
    penalty_pct: float
    is_negotiable: bool
    max_defer_days: int
    relationship_score: float
    status: str
    score: float
    directive: str


class ScenarioResult(BaseModel):
    scenario: str
    label: str
    paid_obligations: List[Obligation]
    deferred_obligations: List[Obligation]
    remaining_cash: float
    estimated_penalty: float
    payroll_protected: bool
    relationship_impact: str
    net_cost: float


class ScoreBreakdown(BaseModel):
    obligation_id: str
    urgency: float
    penalty_weight: float
    relationship_score: float
    flexibility_discount: float
    type_multiplier: float
    final_score: float
    formulas: Dict[str, str] = Field(default_factory=dict)


_transactions: List[Transaction] = []


def _days_until(due_date: date) -> int:
    today = date.today()
    return max(0, (due_date - today).days)


def _score_for(item: FinancialItem) -> float:
    urgency = max(0.1, 1 - (_days_until(item.due_date) / 45))
    risk_boost = 0.2 if item.relationship_risk == "high" else 0.1 if item.relationship_risk == "medium" else 0.0
    category = getattr(item.category, "value", "unassigned")
    cluster_boost = 0.18 if category == "fixed" else 0.1 if category == "strategic" else 0.0
    return min(0.99, round(urgency + risk_boost + cluster_boost, 2))


def _cluster_for(item: FinancialItem) -> str:
    category = getattr(item.category, "value", "unassigned")
    if category == "fixed":
        return "Fixed"
    if category == "strategic":
        return "Strategic"
    return "Flexible"


def _counterparty_type(item: FinancialItem) -> str:
    category = getattr(item.category, "value", "unassigned")
    if category == "fixed":
        return "utility"
    if category == "strategic":
        return "supplier"
    return "supplier"


def _directive_for(action: Optional[str]) -> str:
    if action == "Pay":
        return "PAY"
    if action == "Negotiate":
        return "NEGOTIATE"
    return "DELAY"


def _build_obligation(item: FinancialItem, directive: str) -> Obligation:
    return Obligation(
        id=str(item.id),
        counterparty=item.name,
        counterparty_type=_counterparty_type(item),
        cluster=_cluster_for(item),
        amount=float(item.amount),
        due_date=item.due_date.isoformat(),
        days_until_due=_days_until(item.due_date),
        penalty_per_day=round(float(item.penalty_rate or 0.0) * float(item.amount), 2),
        penalty_pct=float(item.penalty_rate or 0.0),
        is_negotiable=directive != "PAY",
        max_defer_days=14,
        relationship_score=0.9 if item.relationship_risk == "high" else 0.75 if item.relationship_risk == "medium" else 0.6,
        status="pending",
        score=_score_for(item),
        directive=directive,
    )


def _action_map(db: Session) -> Dict[int, str]:
    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0
    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()
    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    available_operational_cash = get_available_cash(current_cash, tax_envelope)
    actions = generate_action_directives(available_operational_cash, payables)
    return {a.item_id: a.action for a in actions}


def _estimate_penalty(deferred: List[Obligation]) -> float:
    return round(sum(o.penalty_per_day * 7 for o in deferred), 2)


def _build_scenarios(db: Session) -> List[ScenarioResult]:
    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    actions_by_id = _action_map(db)
    obligations = [_build_obligation(p, _directive_for(actions_by_id.get(p.id))) for p in payables]

    paid_opt = [o for o in obligations if o.directive == "PAY"]
    deferred_opt = [o for o in obligations if o.directive != "PAY"]
    remaining_cash_opt = max(0.0, _available_cash(db) - sum(o.amount for o in paid_opt))
    opt_penalty = _estimate_penalty(deferred_opt)

    ordered = sorted(obligations, key=lambda o: o.due_date)
    cash = _available_cash(db)
    paid_chrono: List[Obligation] = []
    deferred_chrono: List[Obligation] = []
    for ob in ordered:
        if cash - ob.amount >= 0:
            cash -= ob.amount
            paid_chrono.append(ob)
        else:
            deferred_chrono.append(ob)
    chrono_penalty = _estimate_penalty(deferred_chrono)

    def relationship_impact(deferred: List[Obligation]) -> str:
        if len(deferred) == 0:
            return "low"
        if len(deferred) > len(obligations) / 2:
            return "critical"
        return "medium"

    return [
        ScenarioResult(
            scenario="optimal",
            label="Optimal Path",
            paid_obligations=paid_opt,
            deferred_obligations=deferred_opt,
            remaining_cash=round(remaining_cash_opt, 2),
            estimated_penalty=opt_penalty,
            payroll_protected=True,
            relationship_impact=relationship_impact(deferred_opt),
            net_cost=opt_penalty,
        ),
        ScenarioResult(
            scenario="chronological",
            label="Chronological Path",
            paid_obligations=paid_chrono,
            deferred_obligations=deferred_chrono,
            remaining_cash=round(cash, 2),
            estimated_penalty=chrono_penalty,
            payroll_protected=True,
            relationship_impact=relationship_impact(deferred_chrono),
            net_cost=chrono_penalty,
        ),
    ]


def _available_cash(db: Session) -> float:
    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()
    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    return get_available_cash(current_cash, tax_envelope)


@router.get("/transactions", response_model=List[Transaction])
def list_transactions():
    return _transactions


@router.post("/transactions", response_model=Transaction)
def create_transaction(payload: Transaction):
    tx = payload.model_copy()
    if not tx.id:
        tx.id = f"tx-{int(datetime.utcnow().timestamp())}"
    _transactions.append(tx)
    return tx


@router.get("/scenarios", response_model=List[ScenarioResult])
def get_scenarios(db: Session = Depends(get_db)):
    return _build_scenarios(db)


@router.post("/simulate", response_model=List[ScenarioResult])
def simulate_scenarios(_: SimulationParams, db: Session = Depends(get_db)):
    return _build_scenarios(db)


@router.get("/obligations/{obligation_id}/score", response_model=ScoreBreakdown)
def get_score_breakdown(obligation_id: str):
    return ScoreBreakdown(
        obligation_id=obligation_id,
        urgency=0.64,
        penalty_weight=0.1,
        relationship_score=0.9,
        flexibility_discount=0.85,
        type_multiplier=1.2,
        final_score=0.78,
        formulas={
            "urgency": "exp(−0.15 × days_until_due)",
            "penalty_weight": "min(penalty_per_day / amount, 1.0)",
            "flexibility_discount": "1 − (0.3 × max_defer_days / 30)",
            "final": "urgency × (1 + penalty_weight) × relationship_score × flexibility_discount × type_multiplier",
        },
    )
