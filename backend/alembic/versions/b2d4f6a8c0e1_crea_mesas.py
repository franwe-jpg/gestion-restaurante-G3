"""crea mesas

Revision ID: b2d4f6a8c0e1
Revises: f3a5c7e9b1d2
Create Date: 2026-10-26 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2d4f6a8c0e1"
down_revision: Union[str, Sequence[str], None] = "f3a5c7e9b1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO_MESA = sa.Enum("LIBRE", "OCUPADA", "FUERA_DE_SERVICIO", name="estadomesa", native_enum=False)
CHECK_NUMERO = "ck_mesas_numero_positivo"
CHECK_CAPACIDAD = "ck_mesas_capacidad_positiva"
UNICO_SECTOR_NUMERO = "ux_mesas_sector_numero"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "mesas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("capacidad", sa.Integer(), nullable=False),
        sa.Column("sector_id", sa.Integer(), nullable=False),
        sa.Column("estado", ESTADO_MESA, nullable=False),
        sa.CheckConstraint("numero > 0", name=CHECK_NUMERO),
        sa.CheckConstraint("capacidad > 0", name=CHECK_CAPACIDAD),
        sa.ForeignKeyConstraint(["sector_id"], ["sectores.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sector_id", "numero", name=UNICO_SECTOR_NUMERO),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("mesas")
