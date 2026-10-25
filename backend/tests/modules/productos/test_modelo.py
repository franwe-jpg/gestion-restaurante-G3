from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.shared.models import Categoria, Producto
from app.shared.models.producto import normalizar_nombre


@pytest.mark.parametrize(
    "nombre, esperado",
    [("  Milanesa ", "milanesa"), ("ÑANDÚ", "ñandú"), ("Straße", "strasse")],
)
def test_normalizar_nombre_recorta_y_aplica_casefold(nombre: str, esperado: str) -> None:
    assert normalizar_nombre(nombre) == esperado


def _producto(nombre: str, categoria: Categoria, seccion_id: int) -> Producto:
    return Producto(
        nombre=nombre, categoria=categoria, precio=Decimal("10.00"), seccion_id=seccion_id
    )


def test_producto_sincroniza_nombre_normalizado_al_asignar_el_nombre() -> None:
    producto = _producto("  Milanesa ", Categoria.PLATO, 1)

    assert producto.nombre_normalizado == "milanesa"


def test_indice_unico_rechaza_mismo_nombre_normalizado_en_la_misma_categoria(
    db: Session, fabrica_seccion
) -> None:
    seccion = fabrica_seccion()
    db.add(_producto("Flan", Categoria.PLATO, seccion.id))
    db.commit()

    db.add(_producto(" FLAN ", Categoria.PLATO, seccion.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_indice_unico_permite_mismo_nombre_en_otra_categoria(db: Session, fabrica_seccion) -> None:
    seccion = fabrica_seccion()
    db.add(_producto("Flan", Categoria.PLATO, seccion.id))
    db.add(_producto("Flan", Categoria.POSTRE, seccion.id))
    db.commit()

    assert db.query(Producto).count() == 2
