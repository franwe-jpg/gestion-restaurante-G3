"""Pruebas del service de mozos (HU-M3-09 a HU-M3-12)."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon import repository, service
from app.modules.salon.models import Mozo
from app.modules.salon.schemas import MozoCrear, MozoModificar
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.paginacion import ParametrosPaginacion


def _alta(**cambios) -> MozoCrear:
    return MozoCrear.model_validate(
        {"dni": "30123456", "nombre": "Juan", "apellido": "Fernández"} | cambios
    )


def _modificacion(dni: str = "30123456", **cambios) -> MozoModificar:
    return MozoModificar.model_validate(
        {"dni": dni, "nombre": "Juan", "apellido": "Fernández"} | cambios
    )


def _cantidad_mozos(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Mozo)) or 0


# CA 1 y CA 7 de #43
def test_crear_mozo_lo_guarda_habilitado(db: Session) -> None:
    salida = service.crear_mozo(db, _alta(telefono="280 412-3456"))

    assert salida.dni == "30123456"
    assert salida.nombre == "Juan"
    assert salida.apellido == "Fernández"
    assert salida.telefono == "280 412-3456"
    assert salida.estado == Estado.HABILITADO
    assert _cantidad_mozos(db) == 1


# CA 3 de #43
def test_crear_mozo_con_dni_repetido_es_conflicto(db: Session, fabrica_mozo) -> None:
    fabrica_mozo(dni="30123456")

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un mozo con el DNI 30123456"):
        service.crear_mozo(db, _alta())

    assert _cantidad_mozos(db) == 1


def test_crear_mozo_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(repository, "existe_dni", lambda *_, **__: False)
    deshacer: list[bool] = []
    rollback_original = db.rollback
    monkeypatch.setattr(db, "rollback", lambda: (deshacer.append(True), rollback_original())[1])

    def commit_en_conflicto() -> None:
        raise IntegrityError("INSERT mozos", {}, Exception("UNIQUE constraint failed"))

    monkeypatch.setattr(db, "commit", commit_en_conflicto)

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un mozo con el DNI 30123456"):
        service.crear_mozo(db, _alta())

    assert deshacer == [True]


# CA 1 de #44
def test_modificar_mozo_actualiza_sus_datos(db: Session, fabrica_mozo) -> None:
    mozo = fabrica_mozo()

    salida = service.modificar_mozo(
        db,
        mozo.id,
        _modificacion(nombre="Juan Carlos", apellido="Pérez", telefono="280 400-0000"),
    )

    assert salida.nombre == "Juan Carlos"
    assert salida.apellido == "Pérez"
    assert salida.telefono == "280 400-0000"
    assert db.get(Mozo, mozo.id).nombre == "Juan Carlos"


def test_modificar_mozo_conserva_el_estado(db: Session, fabrica_mozo) -> None:
    mozo = fabrica_mozo(estado=Estado.DESHABILITADO)

    salida = service.modificar_mozo(db, mozo.id, _modificacion(apellido="Gómez"))

    assert salida.apellido == "Gómez"
    assert salida.estado == Estado.DESHABILITADO


def test_modificar_mozo_admite_su_propio_dni(db: Session, fabrica_mozo) -> None:
    mozo = fabrica_mozo(dni="30123456")

    salida = service.modificar_mozo(db, mozo.id, _modificacion(telefono="280 412-3456"))

    assert salida.dni == "30123456"


# CA 3 de #44
def test_modificar_mozo_con_el_dni_de_otro_es_conflicto(db: Session, fabrica_mozo) -> None:
    fabrica_mozo(dni="30123456", nombre="Ana", apellido="Romero")
    mozo = fabrica_mozo(dni="35987654")

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un mozo con el DNI 30123456"):
        service.modificar_mozo(db, mozo.id, _modificacion(dni="30123456"))

    db.expire_all()
    assert db.get(Mozo, mozo.id).dni == "35987654"


def test_modificar_mozo_inexistente_es_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El mozo 99 no existe"):
        service.modificar_mozo(db, 99, _modificacion())


# CA 1 de #45
def test_dar_de_baja_mozo_lo_deshabilita_y_conserva_los_datos(db: Session, fabrica_mozo) -> None:
    mozo = fabrica_mozo(telefono="280 412-3456")

    salida = service.dar_de_baja_mozo(db, mozo.id)

    assert salida.estado == Estado.DESHABILITADO
    assert salida.nombre == "Juan"
    assert salida.telefono == "280 412-3456"
    assert db.get(Mozo, mozo.id).estado == Estado.DESHABILITADO


# CA 3 de #45
def test_dar_de_baja_mozo_lo_quita_de_los_disponibles(db: Session, fabrica_mozo) -> None:
    mozo = fabrica_mozo()
    fabrica_mozo(dni="35987654", nombre="Ana", apellido="Romero")

    service.dar_de_baja_mozo(db, mozo.id)

    disponibles = service.listar_mozos(db, ParametrosPaginacion(), Estado.HABILITADO)
    assert [item.nombre for item in disponibles.items] == ["Ana"]
    assert disponibles.total == 1


# CA 4 de #45
def test_dar_de_baja_mozo_ya_deshabilitado_es_conflicto(db: Session, fabrica_mozo) -> None:
    mozo = fabrica_mozo(estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="El mozo ya está dado de baja"):
        service.dar_de_baja_mozo(db, mozo.id)


def test_dar_de_baja_mozo_inexistente_es_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El mozo 999 no existe"):
        service.dar_de_baja_mozo(db, 999)


# HU-M3-12: listado
def test_listar_mozos_devuelve_la_pagina_ordenada_por_apellido_y_nombre(
    db: Session, fabrica_mozo
) -> None:
    fabrica_mozo(dni="30123456", nombre="Juan", apellido="Fernández")
    fabrica_mozo(dni="35987654", nombre="Ana", apellido="Romero")
    fabrica_mozo(dni="40111222", nombre="Luis", apellido="Castro")

    pagina = service.listar_mozos(db, ParametrosPaginacion())

    assert [(item.apellido, item.nombre) for item in pagina.items] == [
        ("Castro", "Luis"),
        ("Fernández", "Juan"),
        ("Romero", "Ana"),
    ]
    assert pagina.total == 3
    assert pagina.limit == 50
    assert pagina.offset == 0


def test_listar_mozos_sin_mozos_devuelve_una_pagina_vacia(db: Session) -> None:
    pagina = service.listar_mozos(db, ParametrosPaginacion())

    assert pagina.items == []
    assert pagina.total == 0


def test_listar_mozos_filtra_por_estado_y_cuenta_solo_los_filtrados(
    db: Session, fabrica_mozo
) -> None:
    fabrica_mozo(dni="30123456", nombre="Juan", apellido="Fernández")
    fabrica_mozo(dni="35987654", nombre="Ana", apellido="Romero")
    fabrica_mozo(
        dni="40111222",
        nombre="Luis",
        apellido="Castro",
        estado=Estado.DESHABILITADO,
    )

    pagina = service.listar_mozos(db, ParametrosPaginacion(), Estado.HABILITADO)

    assert [item.nombre for item in pagina.items] == ["Juan", "Ana"]
    assert pagina.total == 2


def test_listar_mozos_incluye_deshabilitados_sin_filtro(db: Session, fabrica_mozo) -> None:
    fabrica_mozo(estado=Estado.DESHABILITADO)

    pagina = service.listar_mozos(db, ParametrosPaginacion())

    assert pagina.items[0].estado == Estado.DESHABILITADO
    assert pagina.total == 1


def test_listar_mozos_respeta_limit_y_offset(db: Session, fabrica_mozo) -> None:
    for indice, apellido in enumerate(["Castro", "Fernández", "Romero"], start=1):
        fabrica_mozo(dni=f"3012345{indice}", nombre=f"Mozo {indice}", apellido=apellido)

    pagina = service.listar_mozos(db, ParametrosPaginacion(limit=2, offset=1))

    assert [item.apellido for item in pagina.items] == ["Fernández", "Romero"]
    assert pagina.total == 3
    assert pagina.limit == 2
    assert pagina.offset == 1


def test_modificar_mozo_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, fabrica_mozo, monkeypatch: pytest.MonkeyPatch
) -> None:
    mozo = fabrica_mozo()
    monkeypatch.setattr(repository, "existe_dni", lambda *_, **__: False)
    deshacer: list[bool] = []
    rollback_original = db.rollback
    monkeypatch.setattr(db, "rollback", lambda: (deshacer.append(True), rollback_original())[1])

    def commit_en_conflicto() -> None:
        raise IntegrityError("UPDATE mozos", {}, Exception("UNIQUE constraint failed"))

    monkeypatch.setattr(db, "commit", commit_en_conflicto)

    with pytest.raises(ReglaDeNegocioError, match="Ya existe un mozo con el DNI 30123456"):
        service.modificar_mozo(db, mozo.id, _modificacion(apellido="Pérez"))

    assert deshacer == [True]
    db.expire_all()
    assert db.get(Mozo, mozo.id).apellido == "Fernández"
