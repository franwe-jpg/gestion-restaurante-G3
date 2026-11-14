"""une menus ejecutivos y mozos

Revision ID: 0e9f2fe2e157
Revises: d6b7c8e9f0a1, d6f8a0b2c4e6
Create Date: 2026-10-30 13:45:43.246253

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e9f2fe2e157'
down_revision: Union[str, Sequence[str], None] = ('d6b7c8e9f0a1', 'd6f8a0b2c4e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
