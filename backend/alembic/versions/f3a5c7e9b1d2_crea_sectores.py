"""crea sectores

Revision ID: f3a5c7e9b1d2
Revises: c4e6a8b0d2f4
Create Date: 2026-10-26 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a5c7e9b1d2'
down_revision: Union[str, Sequence[str], None] = 'c4e6a8b0d2f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO = sa.Enum('HABILITADO', 'DESHABILITADO', name='estado', native_enum=False)
INDICE_UNICO = 'ux_sectores_nombre_normalizado'


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'sectores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=30), nullable=False),
        sa.Column('nombre_normalizado', sa.String(), nullable=False),
        sa.Column('descripcion', sa.String(length=200), nullable=True),
        sa.Column('estado', ESTADO, nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(INDICE_UNICO, 'sectores', ['nombre_normalizado'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(INDICE_UNICO, table_name='sectores')
    op.drop_table('sectores')
