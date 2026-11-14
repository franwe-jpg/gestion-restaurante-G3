"""agrega los indices de comandas y detalles para el reporte de productos mas vendidos

Revision ID: a9c1e3f5b7d9
Revises: f1a3c5e7b9d2
Create Date: 2026-11-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a9c1e3f5b7d9'
down_revision: Union[str, Sequence[str], None] = 'f1a3c5e7b9d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_comandas_fecha_hora', 'comandas', ['fecha_hora'])
    op.create_index('ix_detalles_comanda_comanda_id', 'detalles_comanda', ['comanda_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_detalles_comanda_comanda_id', table_name='detalles_comanda')
    op.drop_index('ix_comandas_fecha_hora', table_name='comandas')
