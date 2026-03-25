from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date
from app.models.domain import CategoryType, ItemType

class CashBalanceBase(BaseModel):
    amount: float

class CashBalanceCreate(CashBalanceBase):
    pass

class CashBalanceResponse(CashBalanceBase):
    id: int
    updated_at: date
    model_config = ConfigDict(from_attributes=True)

class FinancialItemBase(BaseModel):
    name: str
    amount: float
    due_date: date
    item_type: ItemType
    category: Optional[CategoryType] = CategoryType.unassigned
    penalty_rate: float = 0.0
    relationship_risk: str = "low"

class FinancialItemCreate(FinancialItemBase):
    pass

class FinancialItemResponse(FinancialItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DashboardInsight(BaseModel):
    current_cash: float
    tax_envelope: float
    available_operational_cash: float
    runway_days: int
    failure_modes: List[str]

class CashRunwayPoint(BaseModel):
    date: date
    day_offset: int
    cumulative_cash: float
    survives: bool


class CashRunwayStressSimulationRequest(BaseModel):
    item_id: int
    due_date: date

class ActionDirective(BaseModel):
    item_id: int
    name: str
    action: str # Pay, Delay, Negotiate
    amount_to_pay: float
    justification: str


class CashRunwayStressSimulationResponse(BaseModel):
    item_id: int
    original_due_date: date
    simulated_due_date: date
    runway_days: int
    failure_modes: List[str]
    curve_points: List[CashRunwayPoint]
    actions: List[ActionDirective]


class NegotiationEmailResponse(BaseModel):
    item_id: int
    vendor_name: str
    relationship_tier: str  # Formal, Strategic, Flexible
    amount_total: float
    amount_to_pay_now: float
    amount_deferred: float
    subject: str
    body: str


class OCRIngestionResponse(BaseModel):
    created_count: int
    items: List[FinancialItemResponse]
