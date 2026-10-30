"""Pruebas del modelo Mozo (HU-M3-09)."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon.models import Mozo
from app.shared.models import Estado


def _mozo(dni: str = "30123456") -> Mozo:
    return Mozo(dni=dni, nombre="Juan", apellido="Fernández")


# CA 7 de #43: todo alta queda HABILITADO
def test_mozo_nuevo_queda_habilitado_por_defecto(db: Session) -> None:
    mozo = _mozo()
    db.add(mozo)
    db.flush()

    assert mozo.estado == Estado.HABILITADO


# CA 3 de #43: el DNI es unico
def test_dni_es_unico(db: Session) -> None:
    db.add(_mozo("30123456"))
    db.commit()

    db.add(_mozo("30123456"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_dos_mozos_con_dni_distinto_son_validos(db: Session) -> None:
    db.add(_mozo("30123456"))
    db.add(_mozo("35987654"))
    db.commit()

    assert len(db.query(Mozo).all()) == 2
