"""agrega cantidad_entregada a detalles_comanda

Revision ID: a8c0e2b4d6f8
Revises: e7a9c1b3d5f7
Create Date: 2026-11-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8c0e2b4d6f8'
down_revision: Union[str, Sequence[str], None] = 'e7a9c1b3d5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RANGO = 'ck_detalles_comanda_cantidad_entregada_rango'


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('detalles_comanda') as lote:
        lote.add_column(
            sa.Column('cantidad_entregada', sa.Integer(), server_default='0', nullable=False)
        )
        lote.create_check_constraint(
            RANGO, 'cantidad_entregada >= 0 AND cantidad_entregada <= cantidad'
        )
    op.execute(
        "UPDATE detalles_comanda SET cantidad_entregada = cantidad "
        "WHERE estado_entrega = 'ENTREGADO'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('detalles_comanda') as lote:
        lote.drop_constraint(RANGO, type_='check')
        lote.drop_column('cantidad_entregada')
