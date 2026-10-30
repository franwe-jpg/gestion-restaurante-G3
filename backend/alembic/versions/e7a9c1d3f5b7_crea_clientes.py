"""Crea la tabla de clientes de M4.

Revision ID: e7a9c1d3f5b7
Revises: d6b7c8e9f0a1
"""

import sqlalchemy as sa

from alembic import op

revision: str = "e7a9c1d3f5b7"
down_revision: str | None = "d6b7c8e9f0a1"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("telefono", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("clientes")
