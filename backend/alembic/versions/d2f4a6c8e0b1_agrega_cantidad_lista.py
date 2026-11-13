"""agrega cantidad_lista a detalles_comanda

Revision ID: d2f4a6c8e0b1
Revises: b8d0f2a4c6e8
Create Date: 2026-11-12 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d2f4a6c8e0b1"
down_revision: str | None = "b8d0f2a4c6e8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

RANGO = "ck_detalles_comanda_cantidad_lista_rango"


def upgrade() -> None:
    """Agrega la cantidad lista para servir; lo ya entregado figura como listo."""
    with op.batch_alter_table("detalles_comanda") as lote:
        lote.add_column(
            sa.Column("cantidad_lista", sa.Integer(), server_default="0", nullable=False)
        )
        lote.create_check_constraint(RANGO, "cantidad_lista >= 0 AND cantidad_lista <= cantidad")
    op.execute(
        "UPDATE detalles_comanda SET cantidad_lista = cantidad WHERE estado_entrega = 'ENTREGADO'"
    )


def downgrade() -> None:
    """Elimina la columna y su CHECK; las entregas y el cierre no cambian."""
    with op.batch_alter_table("detalles_comanda") as lote:
        lote.drop_constraint(RANGO, type_="check")
        lote.drop_column("cantidad_lista")
