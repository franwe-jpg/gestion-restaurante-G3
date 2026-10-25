"""agrega nombre_normalizado a productos

Revision ID: c4e6a8b0d2f4
Revises: a1c3e5f7b9d1
Create Date: 2026-10-25 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e6a8b0d2f4'
down_revision: Union[str, Sequence[str], None] = 'a1c3e5f7b9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDICE = 'ux_productos_categoria_nombre_normalizado'


def _normalizar(nombre: str) -> str:
    # Misma expresion que normalizar_nombre() de la app: las migraciones no importan la app.
    return nombre.strip().casefold()


def _calcular_normalizados(conexion: sa.Connection) -> dict[int, str]:
    filas = conexion.execute(sa.text('SELECT id, nombre, categoria FROM productos')).all()
    normalizados: dict[int, str] = {}
    vistos: set[tuple[str, str]] = set()
    for id_, nombre, categoria in filas:
        normalizado = _normalizar(nombre)
        if (categoria, normalizado) in vistos:
            raise RuntimeError(
                f'Hay productos repetidos en la categoria {categoria} '
                f'("{normalizado}"): unificarlos antes de migrar.'
            )
        vistos.add((categoria, normalizado))
        normalizados[id_] = normalizado
    return normalizados


def upgrade() -> None:
    """Upgrade schema."""
    conexion = op.get_bind()
    normalizados = _calcular_normalizados(conexion)

    with op.batch_alter_table('productos') as lote:
        lote.add_column(sa.Column('nombre_normalizado', sa.String(), nullable=True))
    for id_, normalizado in normalizados.items():
        conexion.execute(
            sa.text('UPDATE productos SET nombre_normalizado = :normalizado WHERE id = :id'),
            {'normalizado': normalizado, 'id': id_},
        )
    with op.batch_alter_table('productos') as lote:
        lote.alter_column('nombre_normalizado', existing_type=sa.String(), nullable=False)
        lote.create_index(INDICE, ['categoria', 'nombre_normalizado'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('productos') as lote:
        lote.drop_index(INDICE)
        lote.drop_column('nombre_normalizado')
