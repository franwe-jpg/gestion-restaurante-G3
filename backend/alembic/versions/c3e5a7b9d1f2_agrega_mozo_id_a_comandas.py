"""agrega mozo_id a comandas

Revision ID: c3e5a7b9d1f2
Revises: a9c1e3f5b7d9
Create Date: 2026-11-08 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3e5a7b9d1f2"
down_revision: str | None = "a9c1e3f5b7d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Agrega la referencia al mozo; queda nula para las comandas existentes."""
    op.add_column("comandas", sa.Column("mozo_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    """Quita la referencia al mozo."""
    op.drop_column("comandas", "mozo_id")
