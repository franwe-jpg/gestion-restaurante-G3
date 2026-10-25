import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.productos.models import Seccion
from app.shared.models import Estado
from app.shared.paginacion import Pagina, ParametrosPaginacion, aplicar, contar


def _crear_secciones(db: Session, cantidad: int) -> None:
    for numero in range(1, cantidad + 1):
        db.add(Seccion(nombre=f"Seccion {numero}", orden=numero, estado=Estado.HABILITADO))
    db.commit()


def test_parametros_por_defecto() -> None:
    parametros = ParametrosPaginacion()

    assert parametros.limit == 50
    assert parametros.offset == 0


@pytest.mark.parametrize("campo, valor", [("limit", 101), ("limit", 0), ("offset", -1)])
def test_parametros_fuera_de_rango_se_rechazan(campo: str, valor: int) -> None:
    with pytest.raises(ValidationError):
        ParametrosPaginacion(**{campo: valor})


def test_parametros_en_el_limite_se_aceptan() -> None:
    assert ParametrosPaginacion(limit=100, offset=0).limit == 100
    assert ParametrosPaginacion(limit=1, offset=5).offset == 5


def test_contar_cuenta_en_la_base(db: Session) -> None:
    _crear_secciones(db, 3)

    assert contar(db, select(Seccion)) == 3


def test_aplicar_recorta_la_pagina(db: Session) -> None:
    _crear_secciones(db, 3)
    consulta = select(Seccion).order_by(Seccion.orden)

    primera = db.scalars(aplicar(consulta, ParametrosPaginacion(limit=2, offset=0))).all()
    segunda = db.scalars(aplicar(consulta, ParametrosPaginacion(limit=2, offset=2))).all()

    assert [s.orden for s in primera] == [1, 2]
    assert [s.orden for s in segunda] == [3]


def test_pagina_tiene_la_forma_de_d27() -> None:
    pagina = Pagina[int](items=[1, 2], total=5, limit=2, offset=0)

    assert pagina.model_dump() == {"items": [1, 2], "total": 5, "limit": 2, "offset": 0}
