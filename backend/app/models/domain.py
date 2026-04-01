from sqlalchemy import Column, Integer, String, Float, Date, Enum as SQLEnum
import enum
from app.db.session import Base
import datetime

class CategoryType(str, enum.Enum):
    fixed = "fixed"
    flexible = "flexible"
    strategic = "strategic"
    unassigned = "unassigned"

class ItemType(str, enum.Enum):
    payable = "payable"
    receivable = "receivable"

class CashBalance(Base):
    __tablename__ = "cash_balances"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    updated_at = Column(Date, default=datetime.date.today)

class FinancialItem(Base):
    __tablename__ = "financial_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    item_type = Column(SQLEnum(ItemType), nullable=False)
    category = Column(SQLEnum(CategoryType), default=CategoryType.unassigned)
    penalty_rate = Column(Float, default=0.0)
    relationship_risk = Column(String, default="low") # low, medium, high

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    monthly_cost = Column(Float, nullable=False)
    is_active = Column(Integer, default=1) # 1=active, 0=inactive
    category = Column(String, nullable=True)
    alternative_suggestion = Column(String, nullable=True)
    last_detected = Column(Date, default=datetime.date.today)
