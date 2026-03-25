from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.domain import CashBalance, FinancialItem, ItemType
from app.schemas.schemas import (
    DashboardInsight,
    ActionDirective,
    NegotiationEmailResponse,
    CashRunwayStressSimulationRequest,
    CashRunwayStressSimulationResponse,
)
from app.services.tax_engine import calculate_tax_envelope, get_available_cash
from app.services.runway import calculate_runway, generate_action_directives, project_survival_curve
from app.services.negotiation_engine import generate_negotiation_email, NegotiationServiceError

router = APIRouter()

@router.get("/insights", response_model=DashboardInsight)
def get_insights(db: Session = Depends(get_db)):
    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0
    
    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()
    
    # Calculate tax based on incoming receivables
    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    
    available_operational_cash = get_available_cash(current_cash, tax_envelope)
    
    runway_days, failure_modes = calculate_runway(available_operational_cash, payables, receivables)
    
    return DashboardInsight(
        current_cash=current_cash,
        tax_envelope=tax_envelope,
        available_operational_cash=available_operational_cash,
        runway_days=runway_days,
        failure_modes=failure_modes
    )

@router.get("/actions", response_model=List[ActionDirective])
def get_action_plan(db: Session = Depends(get_db)):
    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0
    
    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()
    
    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    available_operational_cash = get_available_cash(current_cash, tax_envelope)
    
    return generate_action_directives(available_operational_cash, payables)


@router.post("/actions/{item_id}/negotiation-email", response_model=NegotiationEmailResponse)
def generate_negotiation_email_for_action(item_id: int, db: Session = Depends(get_db)):
    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0

    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()

    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    available_operational_cash = get_available_cash(current_cash, tax_envelope)

    actions = generate_action_directives(available_operational_cash, payables)
    action_by_id = {a.item_id: a for a in actions}
    action = action_by_id.get(item_id)
    if not action:
        raise HTTPException(status_code=404, detail="No action exists for this payable item.")
    if action.action != "Negotiate":
        raise HTTPException(status_code=400, detail="Negotiation email is only available for partial-payment actions.")

    item = next((p for p in payables if p.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Payable item not found.")

    try:
        tier, subject, body = generate_negotiation_email(item=item, payment_now=action.amount_to_pay)
    except NegotiationServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    total_amount = round(float(item.amount), 2)
    amount_to_pay_now = round(float(action.amount_to_pay), 2)
    amount_deferred = round(max(0.0, total_amount - amount_to_pay_now), 2)

    return NegotiationEmailResponse(
        item_id=item.id,
        vendor_name=item.name,
        relationship_tier=tier,
        amount_total=total_amount,
        amount_to_pay_now=amount_to_pay_now,
        amount_deferred=amount_deferred,
        subject=subject,
        body=body,
    )


def _clone_with_due_date(item: FinancialItem, due_date_value: date) -> FinancialItem:
    return FinancialItem(
        id=item.id,
        name=item.name,
        amount=item.amount,
        due_date=due_date_value,
        item_type=item.item_type,
        category=item.category,
        penalty_rate=item.penalty_rate,
        relationship_risk=item.relationship_risk,
    )


@router.post(
    "/simulations/cash-runway-stress",
    response_model=CashRunwayStressSimulationResponse,
)
def simulate_cash_runway_stress(
    payload: CashRunwayStressSimulationRequest,
    db: Session = Depends(get_db),
):
    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()
    target = next((item for item in payables if item.id == payload.item_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Payable item not found for simulation.")

    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0
    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    available_operational_cash = get_available_cash(current_cash, tax_envelope)

    simulated_payables: List[FinancialItem] = []
    for item in payables:
        if item.id == payload.item_id:
            simulated_payables.append(_clone_with_due_date(item, payload.due_date))
        else:
            simulated_payables.append(_clone_with_due_date(item, item.due_date))

    actions = generate_action_directives(available_operational_cash, simulated_payables)
    payment_plan = {directive.item_id: directive.amount_to_pay for directive in actions}
    runway_days, failure_modes, curve_points = project_survival_curve(
        available_cash=available_operational_cash,
        payables=simulated_payables,
        receivables=receivables,
        payment_plan=payment_plan,
    )

    return CashRunwayStressSimulationResponse(
        item_id=payload.item_id,
        original_due_date=target.due_date,
        simulated_due_date=payload.due_date,
        runway_days=runway_days,
        failure_modes=failure_modes,
        curve_points=curve_points,
        actions=actions,
    )
