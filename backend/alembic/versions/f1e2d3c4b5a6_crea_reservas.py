"""crea reservas

Revision ID: f1e2d3c4b5a6
Revises: d6b7c8e9f0a1
Create Date: 2026-10-30 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1e2d3c4b5a6"
down_revision: Union[str, Sequence[str], None] = "d6b7c8e9f0a1"
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
CHECK_CANTIDAD_PERSONAS = "ck_reservas_cantidad_personas_positiva"
INDICE_UNICO_ACTIVA = "ux_reservas_mesa_fecha_hora_activa"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "reservas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cliente_nombre", sa.String(length=60), nullable=False),
        sa.Column("cliente_telefono", sa.String(length=30), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("hora", sa.Time(), nullable=False),
        sa.Column("cantidad_personas", sa.Integer(), nullable=False),
        sa.Column("mesa_id", sa.Integer(), nullable=False),
        sa.Column("estado", ESTADO_RESERVA, nullable=False),
        sa.CheckConstraint("cantidad_personas > 0", name=CHECK_CANTIDAD_PERSONAS),
        sa.ForeignKeyConstraint(["mesa_id"], ["mesas.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    # Indice parcial (solo SQLite): dos reservas Activas no pueden compartir mesa, fecha y hora.
    op.create_index(
        INDICE_UNICO_ACTIVA,
        "reservas",
        ["mesa_id", "fecha", "hora"],
        unique=True,
        sqlite_where=sa.text("estado = 'ACTIVA'"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("reservas")
