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


from app.schemas.schemas import (
    DashboardInsight,
    ActionDirective,
    NegotiationEmailResponse,
    CashRunwayStressSimulationRequest,
    CashRunwayStressSimulationResponse,
    CanvasSimulationRequest,
)

# ... (existing imports and code)

@router.post("/simulations/canvas", response_model=CashRunwayStressSimulationResponse)
def simulate_canvas_graph(
    payload: CanvasSimulationRequest,
    db: Session = Depends(get_db),
):
    """
    Simulates cash runway based on graph topology.
    Revenue nodes connected to Payable nodes represent direct allocations.
    """
    payables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()
    receivables = db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.receivable).all()
    balance_record = db.query(CashBalance).first()
    current_cash = balance_record.amount if balance_record else 0.0
    
    # Map edges to payment plan
    # In this MVP canvas logic:
    # 1. Edges from CashNode/RevenueNode to PayableNode count as planned payments.
    # 2. We use the edge 'label' or 'amount' if present, otherwise assume full payment if connected.
    
    payment_plan: Dict[int, float] = {}
    for edge in payload.edges:
        # Check if target is a payable
        target_node = next((n for n in payload.nodes if n.id == edge.target), None)
        if target_node and target_node.type == 'payable':
            item_id = int(target_node.data.get('item_id', 0))
            if item_id:
                # For MVP, if connected, we treat it as "fully funded" or "prioritized"
                # In a more advanced version, we'd parse the edge weight.
                payable_item = next((p for p in payables if p.id == item_id), None)
                if payable_item:
                    payment_plan[item_id] = payable_item.amount

    incoming_revenue = sum(r.amount for r in receivables)
    tax_envelope = calculate_tax_envelope(incoming_revenue)
    available_operational_cash = get_available_cash(current_cash, tax_envelope)

    runway_days, failure_modes, curve_points = project_survival_curve(
        available_cash=available_operational_cash,
        payables=payables,
        receivables=receivables,
        payment_plan=payment_plan,
    )

    # We return the directives reflecting this manual plan
    actions = []
    for p in payables:
        paid = payment_plan.get(p.id, 0.0)
        action = "Pay" if paid >= p.amount - 0.01 else "Delay"
        actions.append(ActionDirective(
            item_id=p.id,
            name=p.name,
            action=action,
            amount_to_pay=paid,
            justification="Manual allocation via Scenario Canvas."
        ))

    return CashRunwayStressSimulationResponse(
        item_id=0, # Not a single item simulation
        original_due_date=date.today(),
        simulated_due_date=date.today(),
        runway_days=runway_days,
        failure_modes=failure_modes,
        curve_points=curve_points,
        actions=actions,
    )
