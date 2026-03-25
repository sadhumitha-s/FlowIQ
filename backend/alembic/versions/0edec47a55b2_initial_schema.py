"""Initial schema

Revision ID: 0edec47a55b2
Revises: 
Create Date: 2026-03-25 18:34:46.359507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0edec47a55b2'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass
  

def downgrade() -> None:
    """Downgrade schema."""
    pass

