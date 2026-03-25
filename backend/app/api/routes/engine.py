from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.domain import CashBalance, FinancialItem, ItemType
from app.schemas.schemas import DashboardInsight, ActionDirective
from app.services.tax_engine import calculate_tax_envelope, get_available_cash
from app.services.runway import calculate_runway, generate_action_directives

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
