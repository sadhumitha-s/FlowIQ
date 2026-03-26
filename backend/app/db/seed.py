from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.domain import CashBalance, FinancialItem, ItemType, CategoryType


def _seed_records(db: Session) -> None:
    today = date.today()

    db.add(CashBalance(amount=120_000.00))

    payables = [
        FinancialItem(
            name="Payroll - Engineering",
            amount=78_000.00,
            due_date=today + timedelta(days=10),
            item_type=ItemType.payable,
            category=CategoryType.fixed,
            penalty_rate=0.0,
            relationship_risk="high",
        ),
        FinancialItem(
            name="Office Lease",
            amount=30_000.00,
            due_date=today + timedelta(days=12),
            item_type=ItemType.payable,
            category=CategoryType.fixed,
            penalty_rate=0.01,
            relationship_risk="medium",
        ),
        FinancialItem(
            name="AWS Cloud Hosting (Apr)",
            amount=42_000.00,
            due_date=today + timedelta(days=5),
            item_type=ItemType.payable,
            category=CategoryType.fixed,
            penalty_rate=0.08,
            relationship_risk="high",
        ),
        FinancialItem(
            name="Security Audit Retainer",
            amount=18_000.00,
            due_date=today + timedelta(days=25),
            item_type=ItemType.payable,
            category=CategoryType.strategic,
            penalty_rate=0.06,
            relationship_risk="high",
        ),
        FinancialItem(
            name="Data Warehouse Renewal",
            amount=26_000.00,
            due_date=today + timedelta(days=15),
            item_type=ItemType.payable,
            category=CategoryType.strategic,
            penalty_rate=0.03,
            relationship_risk="medium",
        ),
        FinancialItem(
            name="Sales Commissions",
            amount=24_000.00,
            due_date=today + timedelta(days=18),
            item_type=ItemType.payable,
            category=CategoryType.flexible,
            penalty_rate=0.02,
            relationship_risk="low",
        ),
        FinancialItem(
            name="Consulting - RevOps",
            amount=14_000.00,
            due_date=today + timedelta(days=20),
            item_type=ItemType.payable,
            category=CategoryType.flexible,
            penalty_rate=0.0,
            relationship_risk="low",
        ),
    ]

    receivables = [
        FinancialItem(
            name="Enterprise Renewal - Acme Health",
            amount=65_000.00,
            due_date=today + timedelta(days=12),
            item_type=ItemType.receivable,
            category=CategoryType.strategic,
        ),
        FinancialItem(
            name="Partner Referral - BluePeak",
            amount=12_000.00,
            due_date=today + timedelta(days=7),
            item_type=ItemType.receivable,
            category=CategoryType.flexible,
        ),
        FinancialItem(
            name="Usage Overages - Nimbus Logistics",
            amount=18_000.00,
            due_date=today + timedelta(days=22),
            item_type=ItemType.receivable,
            category=CategoryType.flexible,
        ),
        FinancialItem(
            name="Implementation Milestone - Northwind",
            amount=32_000.00,
            due_date=today + timedelta(days=35),
            item_type=ItemType.receivable,
            category=CategoryType.strategic,
        ),
        FinancialItem(
            name="Hardware Buyback - Orion",
            amount=8_000.00,
            due_date=today + timedelta(days=48),
            item_type=ItemType.receivable,
            category=CategoryType.unassigned,
        ),
    ]

    db.add_all(payables)
    db.add_all(receivables)


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        has_balance = db.query(CashBalance).first() is not None
        has_items = db.query(FinancialItem).first() is not None
        if has_balance or has_items:
            return
        _seed_records(db)
        db.commit()
    finally:
        db.close()
