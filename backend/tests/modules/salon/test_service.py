"""Pruebas del servicio de sectores (HU-M3-01)."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.salon import repository, service
from app.modules.salon.models import Sector
from app.modules.salon.schemas import SectorCrear
from app.shared.excepciones import ReglaDeNegocioError
from app.shared.models import Estado


def _datos(nombre: str = "Salón principal", descripcion: str | None = None) -> SectorCrear:
    return SectorCrear(nombre=nombre, descripcion=descripcion)


def _cantidad_sectores(db: Session) -> int:
    return len(db.scalars(select(Sector)).all())


# CA 1
def test_crear_sector_minimo_queda_habilitado(db: Session) -> None:
    salida = service.crear_sector(db, _datos("Salón principal"))

    assert salida.nombre == "Salón principal"
    assert salida.descripcion is None
    assert salida.estado == Estado.HABILITADO
    guardado = db.get(Sector, salida.id)
    assert guardado.nombre_normalizado == "salón principal"
    assert guardado.estado == Estado.HABILITADO
    assert _cantidad_sectores(db) == 1


def test_crear_sector_con_descripcion(db: Session) -> None:
    salida = service.crear_sector(db, _datos("Terraza", "Al aire libre"))

    assert salida.descripcion == "Al aire libre"
    assert db.get(Sector, salida.id).descripcion == "Al aire libre"


def test_crear_sector_quita_espacios_del_nombre(db: Session) -> None:
    salida = service.crear_sector(db, _datos("  Terraza  "))

    assert salida.nombre == "Terraza"
    assert db.get(Sector, salida.id).nombre_normalizado == "terraza"


# CA 3
def test_crear_sector_rechaza_nombre_repetido_sin_distinguir_mayusculas(
    db: Session, fabrica_sector
) -> None:
    existente = fabrica_sector("Salón principal")

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.crear_sector(db, _datos("  salón PRINCIPAL "))

    assert _cantidad_sectores(db) == 1
    assert db.get(Sector, existente.id).nombre == "Salón principal"


def test_crear_sector_compara_con_casefold_no_solo_ascii(db: Session, fabrica_sector) -> None:
    fabrica_sector("Ñoquis")

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.crear_sector(db, _datos("ñOQUIS"))

    assert _cantidad_sectores(db) == 1


def test_crear_sector_rechaza_nombre_de_un_deshabilitado(db: Session, fabrica_sector) -> None:
    fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.crear_sector(db, _datos("Entradas"))

    assert _cantidad_sectores(db) == 1


def test_crear_sector_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, fabrica_sector, monkeypatch: pytest.MonkeyPatch
) -> None:
    fabrica_sector("Terraza")
    monkeypatch.setattr(repository, "existe_nombre_normalizado", lambda *_: False)

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.crear_sector(db, _datos("terraza"))

    assert _cantidad_sectores(db) == 1
