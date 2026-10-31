"""Crea la tabla de clientes de M4.

Revision ID: e7a9c1d3f5b7
Revises: 0e9f2fe2e157
"""

import sqlalchemy as sa

from alembic import op

revision: str = "e7a9c1d3f5b7"
down_revision: str | None = "0e9f2fe2e157"
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
