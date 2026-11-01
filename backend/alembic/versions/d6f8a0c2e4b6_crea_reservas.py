"""crea reservas

Revision ID: d6f8a0c2e4b6
Revises: a8c0e2b4d6f8
Create Date: 2026-10-28 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d6f8a0c2e4b6"
down_revision: Union[str, Sequence[str], None] = "a8c0e2b4d6f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO_RESERVA = sa.Enum(
    "ACTIVA",
    "ATENDIDA",
    "CANCELADA_ANTICIPADA",
    "CANCELADA_POR_AUSENCIA",
    name="estadoreserva",
    native_enum=False,
)
CHECK_CANTIDAD = "ck_reservas_cantidad_personas_positiva"
UNICO_ACTIVA = "ux_reservas_mesa_fecha_hora_activa"
INDICE_FECHA = "ix_reservas_fecha_hora"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "reservas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("mesa_id", sa.Integer(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("hora", sa.Time(), nullable=False),
        sa.Column("cantidad_personas", sa.Integer(), nullable=False),
        sa.Column("estado", ESTADO_RESERVA, nullable=False),
        sa.CheckConstraint("cantidad_personas > 0", name=CHECK_CANTIDAD),
        sa.PrimaryKeyConstraint("id"),
    )
    # R13: una sola reserva ACTIVA por mesa, fecha y hora; las demas no participan.
    op.create_index(
        UNICO_ACTIVA,
        "reservas",
        ["mesa_id", "fecha", "hora"],
        unique=True,
        sqlite_where=sa.text("estado = 'ACTIVA'"),
    )
    op.create_index(INDICE_FECHA, "reservas", ["fecha", "hora"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(INDICE_FECHA, table_name="reservas")
    op.drop_index(UNICO_ACTIVA, table_name="reservas")
    op.drop_table("reservas")
