"""Initial schema

Revision ID: 0edec47a55b2
Revises:
Create Date: 2026-03-25 18:34:46.359507
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0edec47a55b2"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cash_balances",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cash_balances_id", "cash_balances", ["id"], unique=False)

    op.create_table(
        "financial_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column(
            "item_type",
            sa.Enum("payable", "receivable", name="itemtype"),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.Enum(
                "fixed",
                "flexible",
                "strategic",
                "unassigned",
                name="categorytype",
            ),
            nullable=True,
        ),
        sa.Column("penalty_rate", sa.Float(), nullable=True),
        sa.Column("relationship_risk", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_financial_items_id", "financial_items", ["id"], unique=False)
    op.create_index(
        "ix_financial_items_name", "financial_items", ["name"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_financial_items_name", table_name="financial_items")
    op.drop_index("ix_financial_items_id", table_name="financial_items")
    op.drop_table("financial_items")
    op.drop_index("ix_cash_balances_id", table_name="cash_balances")
    op.drop_table("cash_balances")