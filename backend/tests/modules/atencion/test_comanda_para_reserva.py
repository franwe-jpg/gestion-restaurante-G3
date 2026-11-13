"""Interfaz de M4 para M5: crear una comanda desde una reserva sin confirmar (HU-M5-06)."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.atencion import service
from app.modules.atencion.models import Comanda
from app.modules.salon import service as salon_service
from app.shared.contratos.comanda import ComandaCrear, DetalleComandaCrear, EstadoComanda
from app.shared.excepciones import DatosInvalidosError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from tests.modules.atencion.conftest import Salon


def _pedido(salon: Salon, cantidad: int = 2) -> ComandaCrear:
    return ComandaCrear(
        mesa_id=salon.mesa_id,
        mozo_id=salon.mozo_id,
        detalles=[DetalleComandaCrear(producto_id=salon.plato_id, cantidad=cantidad)],
    )


def _estado_mesa(db: Session, mesa_id: int) -> EstadoMesa:
    return salon_service.obtener_mesa(db, mesa_id).estado


def test_crear_comanda_para_reserva_vincula_la_reserva_y_ocupa_la_mesa(
    db: Session, salon: Salon
) -> None:
    salida = service.crear_comanda_para_reserva(db, _pedido(salon), reserva_id=5)

    assert salida.reserva_id == 5
    assert salida.mesa_id == salon.mesa_id
    assert salida.estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db, salon.mesa_id) == EstadoMesa.OCUPADA


def test_crear_comanda_para_reserva_no_confirma_y_el_llamador_puede_revertir(
    db: Session, salon: Salon
) -> None:
    service.crear_comanda_para_reserva(db, _pedido(salon), reserva_id=5)

    db.rollback()

    assert db.scalars(select(Comanda)).all() == []
    assert _estado_mesa(db, salon.mesa_id) == EstadoMesa.LIBRE


def test_crear_comanda_para_reserva_persiste_cuando_el_llamador_confirma(
    db: Session, salon: Salon
) -> None:
    salida = service.crear_comanda_para_reserva(db, _pedido(salon), reserva_id=5)

    db.commit()
    db.expire_all()

    guardada = db.get(Comanda, salida.id)
    assert guardada is not None
    assert guardada.reserva_id == 5


def test_crear_comanda_para_reserva_con_mesa_ocupada_lanza_conflicto(
    db: Session, salon: Salon
) -> None:
    service.crear_comanda_para_reserva(db, _pedido(salon), reserva_id=5)

    with pytest.raises(ReglaDeNegocioError):
        service.crear_comanda_para_reserva(db, _pedido(salon), reserva_id=6)


@pytest.mark.parametrize("reserva_id", [0, -1])
def test_crear_comanda_para_reserva_con_reserva_invalida_no_escribe(
    db: Session, salon: Salon, reserva_id: int
) -> None:
    with pytest.raises(DatosInvalidosError):
        service.crear_comanda_para_reserva(db, _pedido(salon), reserva_id=reserva_id)

    assert db.scalars(select(Comanda)).all() == []
    assert _estado_mesa(db, salon.mesa_id) == EstadoMesa.LIBRE


def test_crear_comanda_publica_no_vincula_reserva(db: Session, salon: Salon) -> None:
    from app.modules.atencion.adaptadores import CatalogoDeCarta, MesasDeSalon, MozosDeSalon

    salida = service.crear_comanda(
        db, _pedido(salon), MesasDeSalon(), CatalogoDeCarta(), MozosDeSalon()
    )

    assert salida.reserva_id is None
