"""crea medios_pago

Revision ID: e7a9c1b3d5f7
Revises: 0e9f2fe2e157
Create Date: 2026-10-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7a9c1b3d5f7'
down_revision: Union[str, Sequence[str], None] = '0e9f2fe2e157'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIPO = sa.Enum(
    'EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_VIRTUAL',
    name='tipomediopago', native_enum=False,
)
ESTADO = sa.Enum('HABILITADO', 'DESHABILITADO', name='estado', native_enum=False)
INDICE_UNICO = 'ux_medios_pago_nombre_normalizado'


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'medios_pago',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=50), nullable=False),
        sa.Column('nombre_normalizado', sa.String(), nullable=False),
        sa.Column('tipo', TIPO, nullable=False),
        sa.Column('descripcion', sa.String(length=200), nullable=True),
        sa.Column('estado', ESTADO, nullable=False),
        sa.Column('eliminado', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        INDICE_UNICO,
        'medios_pago',
        ['nombre_normalizado'],
        unique=True,
        sqlite_where=sa.text('eliminado = 0'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(INDICE_UNICO, table_name='medios_pago')
    op.drop_table('medios_pago')
