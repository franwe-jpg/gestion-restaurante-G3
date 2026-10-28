"""Pruebas del servicio de sectores (HU-M3-01)."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon import repository, service
from app.modules.salon.models import Mesa, Sector
from app.modules.salon.schemas import MesaCrear, SectorCrear, SectorModificar
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


# --- HU-M3-02: modificacion de sectores ---


def _modificacion(nombre: str = "Terraza", descripcion: str | None = None) -> SectorModificar:
    return SectorModificar(nombre=nombre, descripcion=descripcion)


# M2: la exclusion del propio id
def test_existe_nombre_normalizado_sin_exclusion_se_comporta_como_antes(
    db: Session, fabrica_sector
) -> None:
    sector = fabrica_sector("Terraza")

    assert repository.existe_nombre_normalizado(db, "terraza") is True
    assert repository.existe_nombre_normalizado(db, "terraza", excluir_id=sector.id) is False
    assert repository.existe_nombre_normalizado(db, "patio") is False


def test_existe_nombre_normalizado_con_exclusion_sigue_encontrando_a_otro(
    db: Session, fabrica_sector
) -> None:
    fabrica_sector("Salón principal")
    terraza = fabrica_sector("Terraza")

    assert (
        repository.existe_nombre_normalizado(db, "salón principal", excluir_id=terraza.id) is True
    )


# CA 1
def test_modificar_sector_cambia_el_nombre_y_la_descripcion(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector("Salón principal", "Planta baja")

    salida = service.modificar_sector(db, sector.id, _modificacion("Salón central", "Planta alta"))

    assert salida.id == sector.id
    assert salida.nombre == "Salón central"
    assert salida.descripcion == "Planta alta"
    assert salida.estado == Estado.HABILITADO
    guardado = db.get(Sector, sector.id)
    assert guardado.nombre == "Salón central"
    assert guardado.nombre_normalizado == "salón central"
    assert guardado.descripcion == "Planta alta"
    assert _cantidad_sectores(db) == 1


# Mismo nombre con otra descripcion
def test_modificar_sector_con_el_mismo_nombre_solo_cambia_la_descripcion(
    db: Session, fabrica_sector
) -> None:
    sector = fabrica_sector("Terraza")

    salida = service.modificar_sector(db, sector.id, _modificacion("Terraza", "Al aire libre"))

    assert salida.nombre == "Terraza"
    assert salida.descripcion == "Al aire libre"
    assert db.get(Sector, sector.id).nombre == "Terraza"
    assert _cantidad_sectores(db) == 1


# CA 3
def test_modificar_sector_rechaza_el_nombre_de_otro_sin_distinguir_mayusculas(
    db: Session, fabrica_sector
) -> None:
    fabrica_sector("Salón principal")
    terraza = fabrica_sector("Terraza", "Al aire libre")

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.modificar_sector(db, terraza.id, _modificacion("  salón PRINCIPAL "))

    db.expire_all()
    guardado = db.get(Sector, terraza.id)
    assert guardado.nombre == "Terraza"
    assert guardado.descripcion == "Al aire libre"


def test_modificar_sector_rechaza_el_nombre_de_un_deshabilitado(
    db: Session, fabrica_sector
) -> None:
    fabrica_sector("Entradas", estado=Estado.DESHABILITADO)
    terraza = fabrica_sector("Terraza")

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.modificar_sector(db, terraza.id, _modificacion("entradas"))

    db.expire_all()
    assert db.get(Sector, terraza.id).nombre == "Terraza"


def test_modificar_sector_inexistente_es_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El sector 99 no existe"):
        service.modificar_sector(db, 99, _modificacion())

    assert _cantidad_sectores(db) == 0


# S1: el estado se conserva
def test_modificar_sector_deshabilitado_conserva_su_estado(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector("Reservado", estado=Estado.DESHABILITADO)

    salida = service.modificar_sector(db, sector.id, _modificacion("Reservado", "Fondo"))

    assert salida.descripcion == "Fondo"
    assert salida.estado == Estado.DESHABILITADO
    assert db.get(Sector, sector.id).estado == Estado.DESHABILITADO


# S2: PUT reemplaza la descripcion
def test_modificar_sector_sin_descripcion_la_deja_en_none(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector("Terraza", "Al aire libre")

    salida = service.modificar_sector(db, sector.id, SectorModificar(nombre="Terraza"))

    assert salida.descripcion is None
    assert db.get(Sector, sector.id).descripcion is None


def test_modificar_sector_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, fabrica_sector, monkeypatch: pytest.MonkeyPatch
) -> None:
    sector = fabrica_sector("Terraza", "Al aire libre")
    monkeypatch.setattr(repository, "existe_nombre_normalizado", lambda *_, **__: False)
    deshacer: list[bool] = []
    rollback_original = db.rollback
    monkeypatch.setattr(db, "rollback", lambda: (deshacer.append(True), rollback_original())[1])

    def commit_en_conflicto() -> None:
        raise IntegrityError("UPDATE sectores", {}, Exception("UNIQUE constraint failed"))

    monkeypatch.setattr(db, "commit", commit_en_conflicto)

    with pytest.raises(ReglaDeNegocioError, match="El sector ya existe"):
        service.modificar_sector(db, sector.id, _modificacion("Terraza", "Cambiada"))

    assert deshacer == [True]
    db.expire_all()
    assert db.get(Sector, sector.id).descripcion == "Al aire libre"


# HU-M3-03: baja de sectores
def test_contar_mesas_del_sector_solo_cuenta_las_del_sector(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    salon = fabrica_sector("Salón principal")
    terraza = fabrica_sector("Terraza")
    fabrica_mesa(salon, numero=1)
    fabrica_mesa(salon, numero=2)
    fabrica_mesa(terraza, numero=1)

    assert repository.contar_mesas_del_sector(db, salon.id) == 2
    assert repository.contar_mesas_del_sector(db, terraza.id) == 1
    assert repository.contar_mesas_del_sector(db, 999) == 0


# CA 1 de #35
def test_dar_de_baja_sector_lo_deshabilita_y_conserva_los_datos(
    db: Session, fabrica_sector
) -> None:
    sector = fabrica_sector("Terraza", "Al aire libre")

    salida = service.dar_de_baja_sector(db, sector.id)

    assert salida.estado == Estado.DESHABILITADO
    assert salida.nombre == "Terraza"
    assert salida.descripcion == "Al aire libre"
    guardado = db.get(Sector, sector.id)
    assert guardado.estado == Estado.DESHABILITADO
    assert _cantidad_sectores(db) == 1


def test_dar_de_baja_sector_lo_quita_de_los_habilitados(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector("Terraza")
    fabrica_sector("Salón principal")

    service.dar_de_baja_sector(db, sector.id)

    habilitados = service.listar_sectores(db, ParametrosPaginacion(), Estado.HABILITADO)
    assert [item.nombre for item in habilitados.items] == ["Salón principal"]
    assert habilitados.total == 1


# CA 2 de #35
def test_dar_de_baja_sector_con_mesas_es_conflicto_y_no_cambia(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector("Salón principal")
    mesa = fabrica_mesa(sector, numero=1)

    with pytest.raises(
        ReglaDeNegocioError,
        match="No se puede eliminar el sector Salón principal porque tiene mesas asociadas",
    ):
        service.dar_de_baja_sector(db, sector.id)

    db.expire_all()
    assert db.get(Sector, sector.id).estado == Estado.HABILITADO
    assert db.get(Mesa, mesa.id) is not None


def test_dar_de_baja_sector_ya_deshabilitado_es_conflicto(db: Session, fabrica_sector) -> None:
    sector = fabrica_sector("Reservado", estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="El sector ya está deshabilitado"):
        service.dar_de_baja_sector(db, sector.id)


def test_dar_de_baja_sector_ya_deshabilitado_con_mesas_informa_el_estado(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector("Reservado", estado=Estado.DESHABILITADO)
    fabrica_mesa(sector)

    with pytest.raises(ReglaDeNegocioError, match="El sector ya está deshabilitado"):
        service.dar_de_baja_sector(db, sector.id)


def test_dar_de_baja_sector_inexistente_es_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El sector 999 no existe"):
        service.dar_de_baja_sector(db, 999)


# HU-M3-08: listado de mesas
def test_listar_mesas_devuelve_la_pagina_con_su_sector(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    terraza = fabrica_sector("Terraza")
    salon = fabrica_sector("Salón principal")
    fabrica_mesa(salon, numero=2, capacidad=4)
    fabrica_mesa(salon, numero=1, capacidad=2)
    fabrica_mesa(terraza, numero=1)

    pagina = service.listar_mesas(db, ParametrosPaginacion())

    assert [(item.sector.nombre, item.numero, item.capacidad) for item in pagina.items] == [
        ("Salón principal", 1, 2),
        ("Salón principal", 2, 4),
        ("Terraza", 1, 4),
    ]
    assert pagina.total == 3
    assert pagina.limit == 50
    assert pagina.offset == 0
    assert pagina.items[0].estado == EstadoMesa.LIBRE


def test_listar_mesas_sin_mesas_devuelve_una_pagina_vacia(db: Session) -> None:
    pagina = service.listar_mesas(db, ParametrosPaginacion())

    assert pagina.items == []
    assert pagina.total == 0


def test_listar_mesas_respeta_limit_y_offset(db: Session, fabrica_sector, fabrica_mesa) -> None:
    salon = fabrica_sector("Salón principal")
    for numero in range(1, 4):
        fabrica_mesa(salon, numero=numero)

    pagina = service.listar_mesas(db, ParametrosPaginacion(limit=2, offset=1))

    assert [item.numero for item in pagina.items] == [2, 3]
    assert pagina.total == 3
    assert pagina.limit == 2
    assert pagina.offset == 1


def test_listar_mesas_incluye_sectores_deshabilitados(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    sector = fabrica_sector("Reservado", estado=Estado.DESHABILITADO)
    fabrica_mesa(sector)

    pagina = service.listar_mesas(db, ParametrosPaginacion())

    assert pagina.items[0].sector.nombre == "Reservado"
