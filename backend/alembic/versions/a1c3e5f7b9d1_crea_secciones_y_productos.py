"""crea secciones y productos

Revision ID: a1c3e5f7b9d1
Revises: efdafc2a164c
Create Date: 2026-10-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c3e5f7b9d1'
down_revision: Union[str, Sequence[str], None] = 'efdafc2a164c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO = sa.Enum('HABILITADO', 'DESHABILITADO', name='estado', native_enum=False)
CATEGORIA = sa.Enum(
    'PLATO', 'POSTRE', 'BEBIDA', 'MENU_DEL_DIA', name='categoria', native_enum=False
)


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'secciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=50), nullable=False),
        sa.Column('nombre_normalizado', sa.String(), nullable=False),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('estado', ESTADO, nullable=False),
        sa.CheckConstraint('orden > 0', name='ck_secciones_orden_positivo'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre_normalizado'),
    )
    op.create_index(
        'ux_secciones_orden_habilitada',
        'secciones',
        ['orden'],
        unique=True,
        sqlite_where=sa.text("estado = 'HABILITADO'"),
    )
    op.create_table(
        'productos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('categoria', CATEGORIA, nullable=False),
        sa.Column('precio', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('ingredientes', sa.JSON(), nullable=False),
        sa.Column('descripcion', sa.String(length=500), nullable=True),
        sa.Column('imagen', sa.String(length=255), nullable=True),
        sa.Column('etiquetas', sa.JSON(), nullable=False),
        sa.Column('estado', ESTADO, nullable=False),
        sa.Column('seccion_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['seccion_id'], ['secciones.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_productos_seccion_id'), 'productos', ['seccion_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_productos_seccion_id'), table_name='productos')
    op.drop_table('productos')
    op.drop_index('ux_secciones_orden_habilitada', table_name='secciones')
    op.drop_table('secciones')
