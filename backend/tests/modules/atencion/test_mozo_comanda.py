"""M4 behavior for waiter assignment on new and historical Comandas."""

import logging

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.atencion import service
from app.modules.atencion.adaptadores import CatalogoDeCarta, MesasDeSalon
from app.modules.atencion.models import Comanda
from app.modules.salon import service as salon_service
from app.modules.salon.schemas import MozoCrear
from app.shared.contratos.comanda import ComandaCrear, DetalleComandaCrear
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError


class MozosPublicos:
    """M4 port test double that delegates validation through M3's public service."""

    def validar_habilitado(self, db: Session, mozo_id: int) -> None:
        salon_service.validar_mozo_habilitado(db, mozo_id)


def test_crear_comanda_guarda_el_mozo_validado_por_m3(db: Session, salon) -> None:
    mozo_id = salon.mozo_id
    datos = ComandaCrear(
        mesa_id=salon.mesa_id,
        mozo_id=mozo_id,
        detalles=[DetalleComandaCrear(producto_id=salon.plato_id, cantidad=1)],
    )

    salida = service.crear_comanda(db, datos, MesasDeSalon(), CatalogoDeCarta(), MozosPublicos())

    assert salida.mozo_id == mozo_id
    assert db.get(Comanda, salida.id).mozo_id == mozo_id


@pytest.mark.parametrize("caso", ["inexistente", "deshabilitado"])
def test_crear_comanda_rechaza_mozo_invalido_sin_ocupar_mesa(db: Session, salon, caso: str) -> None:
    if caso == "deshabilitado":
        salon_service.dar_de_baja_mozo(db, salon.mozo_id)
    mozo_id = 999 if caso == "inexistente" else salon.mozo_id
    datos = ComandaCrear(
        mesa_id=salon.mesa_id,
        mozo_id=mozo_id,
        detalles=[DetalleComandaCrear(producto_id=salon.plato_id, cantidad=1)],
    )

    error = NoEncontradoError if caso == "inexistente" else ReglaDeNegocioError
    with pytest.raises(error):
        service.crear_comanda(db, datos, MesasDeSalon(), CatalogoDeCarta(), MozosPublicos())

    assert db.scalars(select(Comanda).where(Comanda.mesa_id == salon.mesa_id)).all() == []
    assert salon_service.obtener_mesa(db, salon.mesa_id).estado.value == "LIBRE"


def test_asignar_y_corregir_mozo_historico_registra_valores_en_log(
    db: Session,
    comanda: Comanda,
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    primero_id = salon_service.crear_mozo(
        db,
        MozoCrear(
            dni="35987654",
            nombre="Ana",
            apellido="Paz",
            correo="mozo35987654@resto.com",
            contrasena="Clave1234",
        ),
    ).id
    segundo_id = salon_service.crear_mozo(
        db,
        MozoCrear(
            dni="40123456",
            nombre="Eva",
            apellido="Ríos",
            correo="mozo40123456@resto.com",
            contrasena="Clave1234",
        ),
    ).id
    monkeypatch.setattr(service.logger, "disabled", False)
    caplog.set_level(logging.INFO, logger=service.logger.name)

    asignada = service.asignar_mozo_comanda(db, comanda.id, primero_id, MozosPublicos())
    corregida = service.asignar_mozo_comanda(db, comanda.id, segundo_id, MozosPublicos())

    assert (asignada.mozo_id, corregida.mozo_id) == (primero_id, segundo_id)
    cambios = [
        record
        for record in caplog.records
        if record.getMessage().startswith("Mozo de comanda actualizado")
    ]
    assert [(record.mozo_anterior_id, record.mozo_nuevo_id) for record in cambios] == [
        (None, primero_id),
        (primero_id, segundo_id),
    ]
    assert [record.getMessage() for record in cambios] == [
        f"Mozo de comanda actualizado: comanda_id={comanda.id}, "
        f"mozo_anterior_id=None, mozo_nuevo_id={primero_id}",
        f"Mozo de comanda actualizado: comanda_id={comanda.id}, "
        f"mozo_anterior_id={primero_id}, mozo_nuevo_id={segundo_id}",
    ]


def test_corregir_mozo_historico_invalido_no_muta_ni_registra_cambio(
    db: Session,
    comanda: Comanda,
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original_id = salon_service.crear_mozo(
        db,
        MozoCrear(
            dni="35987654",
            nombre="Ana",
            apellido="Paz",
            correo="mozo35987654@resto.com",
            contrasena="Clave1234",
        ),
    ).id
    comanda.mozo_id = original_id
    db.commit()
    monkeypatch.setattr(service.logger, "disabled", False)
    caplog.set_level(logging.INFO, logger=service.logger.name)

    with pytest.raises(NoEncontradoError):
        service.asignar_mozo_comanda(db, comanda.id, 999, MozosPublicos())

    db.refresh(comanda)
    assert comanda.mozo_id == original_id
    assert not [
        record
        for record in caplog.records
        if record.getMessage().startswith("Mozo de comanda actualizado")
    ]


def test_asignar_mozo_a_comanda_inexistente_lanza_no_encontrado(db: Session) -> None:
    mozo_id = salon_service.crear_mozo(
        db,
        MozoCrear(
            dni="35987654",
            nombre="Ana",
            apellido="Paz",
            correo="mozo35987654@resto.com",
            contrasena="Clave1234",
        ),
    ).id

    with pytest.raises(NoEncontradoError, match="La comanda 999 no existe"):
        service.asignar_mozo_comanda(db, 999, mozo_id, MozosPublicos())


def test_corregir_comanda_historica_con_mozo_deshabilitado_lanza_conflicto(
    db: Session,
    comanda: Comanda,
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mozo = salon_service.crear_mozo(
        db,
        MozoCrear(
            dni="35987654",
            nombre="Ana",
            apellido="Paz",
            correo="mozo35987654@resto.com",
            contrasena="Clave1234",
        ),
    )
    salon_service.dar_de_baja_mozo(db, mozo.id)
    monkeypatch.setattr(service.logger, "disabled", False)
    caplog.set_level(logging.INFO, logger=service.logger.name)

    with pytest.raises(ReglaDeNegocioError, match="deshabilitado"):
        service.asignar_mozo_comanda(db, comanda.id, mozo.id, MozosPublicos())

    db.refresh(comanda)
    assert comanda.mozo_id is None
    assert not [
        record
        for record in caplog.records
        if record.getMessage().startswith("Mozo de comanda actualizado")
    ]
