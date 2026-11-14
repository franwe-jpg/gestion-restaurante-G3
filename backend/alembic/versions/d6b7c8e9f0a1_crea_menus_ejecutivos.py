"""crea menus ejecutivos

Revision ID: d6b7c8e9f0a1
Revises: b2d4f6a8c0e1
Create Date: 2026-10-28 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d6b7c8e9f0a1"
down_revision: Union[str, Sequence[str], None] = "b2d4f6a8c0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO = sa.Enum("HABILITADO", "DESHABILITADO", name="estado", native_enum=False)
CHECK_PRECIO = "ck_menus_ejecutivos_precio_positivo"
INDICE_NOMBRE = "ux_menus_ejecutivos_nombre_normalizado"


def upgrade() -> None:
    """Crea el menú ejecutivo y su relación con productos."""
    op.create_table(
        "menus_ejecutivos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("nombre_normalizado", sa.String(), nullable=False),
        sa.Column("descripcion", sa.String(length=500), nullable=True),
        sa.Column("precio_fijo", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("estado", ESTADO, nullable=False),
        sa.Column("seccion_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("precio_fijo > 0", name=CHECK_PRECIO),
        sa.ForeignKeyConstraint(["seccion_id"], ["secciones.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(INDICE_NOMBRE, "menus_ejecutivos", ["nombre_normalizado"], unique=True)
    op.create_index(
        "ix_menus_ejecutivos_seccion_id", "menus_ejecutivos", ["seccion_id"], unique=False
    )
    op.create_table(
        "menu_ejecutivo_productos",
        sa.Column("menu_ejecutivo_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["menu_ejecutivo_id"], ["menus_ejecutivos.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint(
            "menu_ejecutivo_id", "producto_id", name="pk_menu_ejecutivo_productos"
        ),
    )


def downgrade() -> None:
    """Elimina la composición y la tabla del menú ejecutivo."""
    op.drop_table("menu_ejecutivo_productos")
    op.drop_index("ix_menus_ejecutivos_seccion_id", table_name="menus_ejecutivos")
    op.drop_index(INDICE_NOMBRE, table_name="menus_ejecutivos")
    op.drop_table("menus_ejecutivos")
