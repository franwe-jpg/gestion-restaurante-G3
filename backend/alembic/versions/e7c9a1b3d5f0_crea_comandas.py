"""Create M4 order and order-item tables.

Revision ID: e7c9a1b3d5f0
Revises: d6b7c8e9f0a1
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e7c9a1b3d5f0"
down_revision: str | None = "d6b7c8e9f0a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "comandas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mesa_id", sa.Integer(), nullable=False),
        sa.Column("reserva_id", sa.Integer(), nullable=True),
        sa.Column("observaciones", sa.String(500), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("fecha_hora", sa.String(32), nullable=False),
        sa.ForeignKeyConstraint(["mesa_id"], ["mesas.id"], ondelete="RESTRICT"),
    )
    op.create_index(
        "ux_comandas_mesa_abierta",
        "comandas",
        ["mesa_id"],
        unique=True,
        sqlite_where=sa.text("estado = 'ABIERTA'"),
    )
    op.create_table(
        "detalles_comanda",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("comanda_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=True),
        sa.Column("menu_ejecutivo_id", sa.Integer(), nullable=True),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("estado_entrega", sa.String(20), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(10, 2), nullable=False),
        sa.Column("descuento", sa.Numeric(10, 2), nullable=False),
        sa.Column("promocion_id", sa.Integer(), nullable=True),
        sa.CheckConstraint("cantidad > 0", name="ck_detalles_comanda_cantidad_positiva"),
        sa.CheckConstraint(
            "(producto_id IS NOT NULL AND menu_ejecutivo_id IS NULL) OR "
            "(producto_id IS NULL AND menu_ejecutivo_id IS NOT NULL)",
            name="ck_detalles_comanda_origen_exclusivo",
        ),
        sa.ForeignKeyConstraint(["comanda_id"], ["comandas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["menu_ejecutivo_id"], ["menus_ejecutivos.id"], ondelete="RESTRICT"
        ),
    )


def downgrade() -> None:
    op.drop_table("detalles_comanda")
    op.drop_index("ux_comandas_mesa_abierta", table_name="comandas")
    op.drop_table("comandas")
