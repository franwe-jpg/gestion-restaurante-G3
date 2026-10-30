"""Pruebas del servicio de sectores (HU-M3-01)."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.salon import repository, service
from app.modules.salon.models import Mesa, Sector
from app.modules.salon.schemas import MesaCrear, SectorCrear
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import ParametrosPaginacion


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


# --- HU-M3-05: alta de mesas ---


def _datos_mesa(sector_id: int, numero: int = 13, capacidad: int = 4) -> MesaCrear:
    return MesaCrear(numero=numero, capacidad=capacidad, sector_id=sector_id)


def _cantidad_mesas(db: Session) -> int:
    return len(db.scalars(select(Mesa)).all())


# CA 1 y CA 7
def test_crear_mesa_minima_queda_libre(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector()

    salida = service.crear_mesa(db, _datos_mesa(sector.id))

    assert salida.numero == 13
    assert salida.capacidad == 4
    assert salida.sector.id == sector.id
    assert salida.sector.nombre == "Salón principal"
    assert salida.estado == EstadoMesa.LIBRE
    guardada = db.get(Mesa, salida.id)
    assert guardada.sector_id == sector.id
    assert guardada.estado == EstadoMesa.LIBRE
    assert _cantidad_mesas(db) == 1


# CA 3
def test_crear_mesa_rechaza_numero_repetido_en_el_sector(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector()
    fabrica_mesa(sector, numero=3)

    with pytest.raises(
        ReglaDeNegocioError, match="La mesa 3 ya existe en el sector Salón principal"
    ):
        service.crear_mesa(db, _datos_mesa(sector.id, numero=3))

    assert _cantidad_mesas(db) == 1


# CA 3, limite
def test_crear_mesa_permite_el_mismo_numero_en_otro_sector(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    salon = fabrica_sector("Salón principal")
    terraza = fabrica_sector("Terraza")
    fabrica_mesa(salon, numero=3)

    salida = service.crear_mesa(db, _datos_mesa(terraza.id, numero=3))

    assert salida.sector.id == terraza.id
    assert _cantidad_mesas(db) == 2


def test_crear_mesa_con_sector_inexistente_es_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El sector 99 no existe"):
        service.crear_mesa(db, _datos_mesa(99))

    assert _cantidad_mesas(db) == 0


def test_crear_mesa_rechaza_un_sector_deshabilitado(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="El sector Entradas está deshabilitado"):
        service.crear_mesa(db, _datos_mesa(sector.id))

    assert _cantidad_mesas(db) == 0


def test_crear_mesa_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, fabrica_sector, fabrica_mesa, monkeypatch: pytest.MonkeyPatch
) -> None:
    sector = fabrica_sector()
    fabrica_mesa(sector, numero=3)
    monkeypatch.setattr(repository, "existe_numero_en_sector", lambda *_: False)

    with pytest.raises(ReglaDeNegocioError, match="La mesa 3 ya existe"):
        service.crear_mesa(db, _datos_mesa(sector.id, numero=3))

    assert _cantidad_mesas(db) == 1


# --- HU-M3-05: lectura de apoyo de sectores ---


def test_listar_sectores_sin_filtro_incluye_a_todos(db: Session, fabrica_sector) -> None:
    fabrica_sector("Terraza")
    fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    pagina = service.listar_sectores(db, ParametrosPaginacion(), None)

    assert [sector.nombre for sector in pagina.items] == ["Entradas", "Terraza"]
    assert pagina.total == 2
    assert pagina.limit == 50
    assert pagina.offset == 0


def test_listar_sectores_filtra_por_estado(db: Session, fabrica_sector) -> None:
    fabrica_sector("Terraza")
    fabrica_sector("Entradas", estado=Estado.DESHABILITADO)

    pagina = service.listar_sectores(
        db, ParametrosPaginacion(limit=100, offset=0), Estado.HABILITADO
    )

    assert [sector.nombre for sector in pagina.items] == ["Terraza"]
    assert pagina.total == 1


# --- lectura de apoyo de mesas (RNF-MAN-09, consumida por reservas) ---


def test_obtener_mesa_devuelve_la_mesa_con_su_sector(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector("Terraza")
    mesa = fabrica_mesa(sector, numero=7, capacidad=2, estado=EstadoMesa.FUERA_DE_SERVICIO)

    salida = service.obtener_mesa(db, mesa.id)

    assert salida.id == mesa.id
    assert salida.numero == 7
    assert salida.capacidad == 2
    assert salida.sector.id == sector.id
    assert salida.sector.nombre == "Terraza"
    assert salida.estado == EstadoMesa.FUERA_DE_SERVICIO


def test_obtener_mesa_inexistente_es_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La mesa 99 no existe"):
        service.obtener_mesa(db, 99)


# --- listado de mesas (HU-M3-08, traida desde `main`; ver repository) ---


def test_listar_mesas_ordena_por_sector_y_numero(db: Session, fabrica_sector, fabrica_mesa) -> None:
    terraza = fabrica_sector("Terraza")
    salon = fabrica_sector("Salón principal")
    fabrica_mesa(terraza, numero=1)
    fabrica_mesa(salon, numero=2)
    fabrica_mesa(salon, numero=1)

    pagina = service.listar_mesas(db, ParametrosPaginacion())

    vistas = [(mesa.sector.nombre, mesa.numero) for mesa in pagina.items]
    assert vistas == [("Salón principal", 1), ("Salón principal", 2), ("Terraza", 1)]
    assert pagina.total == 3


def test_listar_mesas_sin_mesas_devuelve_pagina_vacia(db: Session) -> None:
    pagina = service.listar_mesas(db, ParametrosPaginacion())

    assert pagina.items == []
    assert pagina.total == 0
