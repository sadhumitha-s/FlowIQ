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

class SubscriptionBase(BaseModel):
    name: str
    monthly_cost: float
    is_active: int = 1
    category: Optional[str] = None
    alternative_suggestion: Optional[str] = None

class SubscriptionResponse(SubscriptionBase):
    id: int
    last_detected: date
    model_config = ConfigDict(from_attributes=True)

class SubscriptionAuditResult(BaseModel):
    detected_subscriptions: List[SubscriptionResponse]
    total_monthly_bleed: float
    annual_bleed: float

class CanvasNode(BaseModel):
    id: str
    type: str
    position: dict
    data: dict

class CanvasEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None

class CanvasSimulationRequest(BaseModel):
    nodes: List[CanvasNode]
    edges: List[CanvasEdge]
