"""crea promociones

Revision ID: a4c6e8b0d2f4
Revises: d6f8a0c2e4b6
Create Date: 2026-11-04 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a4c6e8b0d2f4"
down_revision: Union[str, Sequence[str], None] = "d6f8a0c2e4b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIPO_PROMOCION = sa.Enum(
    "PORCENTAJE",
    "PRECIO_FIJO",
    "NXM",
    name="tipopromocion",
    native_enum=False,
)
ESTADO = sa.Enum("HABILITADO", "DESHABILITADO", name="estado", native_enum=False)
INDICE_NOMBRE = "ux_promociones_nombre_normalizado"
CHECK_FECHAS = "ck_promociones_fechas"
CHECK_HORARIO = "ck_promociones_horario"
CHECK_PORCENTAJE = "ck_promociones_porcentaje"
CHECK_PRECIO_FIJO = "ck_promociones_precio_fijo"
CHECK_NXM = "ck_promociones_nxm"


def upgrade() -> None:
    """Crea las promociones y su relación con productos."""
    op.create_table(
        "promociones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("nombre_normalizado", sa.String(), nullable=False),
        sa.Column("tipo", TIPO_PROMOCION, nullable=False),
        sa.Column("descripcion", sa.String(length=500), nullable=True),
        sa.Column("fecha_desde", sa.Date(), nullable=False),
        sa.Column("fecha_hasta", sa.Date(), nullable=False),
        sa.Column("dias_semana", sa.JSON(), nullable=False),
        sa.Column("hora_desde", sa.Time(), nullable=True),
        sa.Column("hora_hasta", sa.Time(), nullable=True),
        sa.Column("descuento_porcentaje", sa.Integer(), nullable=True),
        sa.Column("precio_fijo", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("cant_lleva", sa.Integer(), nullable=True),
        sa.Column("cant_paga", sa.Integer(), nullable=True),
        sa.Column("estado", ESTADO, nullable=False),
        sa.CheckConstraint("fecha_hasta >= fecha_desde", name=CHECK_FECHAS),
        sa.CheckConstraint(
            "(hora_desde IS NULL AND hora_hasta IS NULL) OR "
            "(hora_desde IS NOT NULL AND hora_hasta IS NOT NULL AND hora_hasta > hora_desde)",
            name=CHECK_HORARIO,
        ),
        sa.CheckConstraint(
            "(tipo <> 'PORCENTAJE' OR (descuento_porcentaje BETWEEN 1 AND 100 "
            "AND precio_fijo IS NULL AND cant_lleva IS NULL AND cant_paga IS NULL))",
            name=CHECK_PORCENTAJE,
        ),
        sa.CheckConstraint(
            "(tipo <> 'PRECIO_FIJO' OR (precio_fijo > 0 AND descuento_porcentaje IS NULL "
            "AND cant_lleva IS NULL AND cant_paga IS NULL))",
            name=CHECK_PRECIO_FIJO,
        ),
        sa.CheckConstraint(
            "(tipo <> 'NXM' OR (cant_lleva > 0 AND cant_paga > 0 AND cant_paga < cant_lleva "
            "AND descuento_porcentaje IS NULL AND precio_fijo IS NULL))",
            name=CHECK_NXM,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(INDICE_NOMBRE, "promociones", ["nombre_normalizado"], unique=True)
    op.create_table(
        "promocion_productos",
        sa.Column("promocion_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["promocion_id"], ["promociones.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("promocion_id", "producto_id", name="pk_promocion_productos"),
    )


def downgrade() -> None:
    """Elimina la relación y la tabla de promociones."""
    op.drop_table("promocion_productos")
    op.drop_index(INDICE_NOMBRE, table_name="promociones")
    op.drop_table("promociones")
