"""Pruebas del modelo Mesa (HU-M3-05)."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon.models import Mesa
from app.shared.models.enums import EstadoMesa


def _mesa(sector_id: int, numero: int = 1, capacidad: int = 4) -> Mesa:
    return Mesa(numero=numero, capacidad=capacidad, sector_id=sector_id)


def test_estado_mesa_tiene_los_tres_valores_del_diagrama() -> None:
    assert [estado.value for estado in EstadoMesa] == ["LIBRE", "OCUPADA", "FUERA_DE_SERVICIO"]


# CA 7: toda alta queda LIBRE
def test_mesa_nueva_queda_libre_por_defecto(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector()
    mesa = _mesa(sector.id)
    db.add(mesa)
    db.flush()

    assert mesa.estado == EstadoMesa.LIBRE


# CA 5 y CA 6: numero y capacidad mayores a cero
@pytest.mark.parametrize("campo", ["numero", "capacidad"])
def test_check_rechaza_valores_no_positivos(campo: str, db: Session, fabrica_sector) -> None:
    sector = fabrica_sector()
    mesa = _mesa(sector.id)
    setattr(mesa, campo, 0)
    db.add(mesa)

    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


# CA 3: numero unico dentro del sector
def test_unicidad_del_numero_por_sector(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector()
    db.add(_mesa(sector.id, numero=3))
    db.commit()

    db.add(_mesa(sector.id, numero=3, capacidad=2))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


# CA 3, limite: el mismo numero puede repetirse en otro sector
def test_mismo_numero_en_otro_sector_es_valido(db: Session, fabrica_sector) -> None:
    salon = fabrica_sector("Salón principal")
    terraza = fabrica_sector("Terraza")
    db.add(_mesa(salon.id, numero=3))
    db.add(_mesa(terraza.id, numero=3))
    db.commit()

    assert len(db.scalars(select(Mesa)).all()) == 2
