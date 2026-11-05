"""agrega fecha de finalizacion a promociones

Revision ID: b5d7f9a1c3e5
Revises: a4c6e8b0d2f4
Create Date: 2026-11-05 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b5d7f9a1c3e5"
down_revision: Union[str, Sequence[str], None] = "a4c6e8b0d2f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega el instante en que la promoción se finalizó."""
    with op.batch_alter_table("promociones") as batch:
        batch.add_column(
            sa.Column("fecha_hora_finalizacion", sa.DateTime(timezone=True), nullable=True)
        )


def downgrade() -> None:
    """Quita el instante de finalización."""
    with op.batch_alter_table("promociones") as batch:
        batch.drop_column("fecha_hora_finalizacion")
