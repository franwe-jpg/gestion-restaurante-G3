"""crea mozos

Revision ID: d6f8a0b2c4e6
Revises: b2d4f6a8c0e1
Create Date: 2026-10-30 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d6f8a0b2c4e6"
down_revision: Union[str, Sequence[str], None] = "b2d4f6a8c0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO = sa.Enum("HABILITADO", "DESHABILITADO", name="estado", native_enum=False)
UNICO_DNI = "ux_mozos_dni"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "mozos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dni", sa.String(length=8), nullable=False),
        sa.Column("nombre", sa.String(length=60), nullable=False),
        sa.Column("apellido", sa.String(length=60), nullable=False),
        sa.Column("telefono", sa.String(length=30), nullable=True),
        sa.Column("estado", ESTADO, nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dni", name=UNICO_DNI),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("mozos")
