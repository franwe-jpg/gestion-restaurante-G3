"""crea facturas, detalles_factura y cobros

Revision ID: f1a3c5e7b9d2
Revises: b5d7f9a1c3e5
Create Date: 2026-11-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a3c5e7b9d2'
down_revision: Union[str, Sequence[str], None] = 'b5d7f9a1c3e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ESTADO_FACTURA = sa.Enum('ADEUDADA', 'PAGADA', name='estadofactura', native_enum=False)


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'facturas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('comanda_id', sa.Integer(), nullable=False),
        sa.Column('fecha_emision', sa.DateTime(timezone=True), nullable=False),
        sa.Column('total', sa.Numeric(10, 2), nullable=False),
        sa.Column('saldo_pendiente', sa.Numeric(10, 2), nullable=False),
        sa.Column('estado', ESTADO_FACTURA, nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('comanda_id'),
    )
    op.create_table(
        'detalles_factura',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=True),
        sa.Column('menu_ejecutivo_id', sa.Integer(), nullable=True),
        sa.Column('descripcion', sa.String(), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('precio_unitario', sa.Numeric(10, 2), nullable=False),
        sa.Column('descuento', sa.Numeric(10, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False),
        sa.CheckConstraint(
            '(producto_id IS NULL) <> (menu_ejecutivo_id IS NULL)',
            name='ck_detalles_factura_producto_xor_menu',
        ),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'cobros',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('factura_id', sa.Integer(), nullable=False),
        sa.Column('medio_pago_id', sa.Integer(), nullable=False),
        sa.Column('monto', sa.Numeric(10, 2), nullable=False),
        sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
        sa.Column('numero_comprobante', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['factura_id'], ['facturas.id']),
        sa.ForeignKeyConstraint(['medio_pago_id'], ['medios_pago.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero_comprobante'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('cobros')
    op.drop_table('detalles_factura')
    op.drop_table('facturas')
