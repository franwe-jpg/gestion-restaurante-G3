"""Pruebas de cierre de Comanda y modificación de Cliente."""

from decimal import Decimal

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion import service
from app.modules.atencion.models import Cliente, Comanda, DetalleComanda
from app.modules.atencion.schemas import ClienteModificar
from app.shared.contratos.comanda import ComandaSalida, EstadoComanda, EstadoEntrega
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError


def test_cerrar_comanda_entregada_persiste_solo_estado_y_devuelve_dto(
    db: Session,
    comanda: Comanda,
) -> None:
    salida = service.cerrar_comanda(db, comanda.id)

    assert isinstance(salida, ComandaSalida)
    assert salida.id == comanda.id
    assert salida.estado == EstadoComanda.CERRADA
    assert salida.mesa_id == 1
    assert salida.reserva_id == 7
    assert salida.observaciones == "Sin sal"
    assert salida.fecha_hora == comanda.fecha_hora
    assert len(salida.detalles) == 1
    detalle = salida.detalles[0]
    assert detalle.estado_entrega == EstadoEntrega.ENTREGADO
    assert detalle.producto_id == 1
    assert detalle.cantidad == 2
    assert detalle.precio_unitario == Decimal("29.90")
    assert detalle.descuento == Decimal("3.25")
    assert detalle.promocion_id == 8
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == "CERRADA"
    assert db.execute(text("SELECT estado FROM mesas WHERE id=1")).scalar_one() == "OCUPADA"
    assert db.execute(text("SELECT precio FROM productos WHERE id=1")).scalar_one() == 99.90


def test_cerrar_comanda_inexistente_no_cambia_otras(db: Session, comanda: Comanda) -> None:
    with pytest.raises(NoEncontradoError, match="no existe"):
        service.cerrar_comanda(db, 999)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == "ABIERTA"


@pytest.mark.parametrize("estado", [EstadoComanda.CERRADA, EstadoComanda.ANULADA])
def test_cerrar_comanda_no_abierta_rechaza_sin_transicion(
    db: Session,
    comanda: Comanda,
    estado: EstadoComanda,
) -> None:
    comanda.estado = estado
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.cerrar_comanda(db, comanda.id)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == estado


@pytest.mark.parametrize("indice_pendiente", [0, 1])
def test_cerrar_comanda_con_pendiente_no_cierra_ni_entrega(
    db: Session,
    comanda: Comanda,
    indice_pendiente: int,
) -> None:
    comanda.detalles.append(
        DetalleComanda(
            producto_id=1,
            cantidad=1,
            precio_unitario=Decimal("19.90"),
            descuento=Decimal("0.00"),
            estado_entrega=EstadoEntrega.ENTREGADO,
        )
    )
    comanda.detalles[indice_pendiente].estado_entrega = EstadoEntrega.PENDIENTE
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="pendientes"):
        service.cerrar_comanda(db, comanda.id)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert len(comanda.detalles) == 2
    assert comanda.detalles[indice_pendiente].estado_entrega == EstadoEntrega.PENDIENTE
    assert comanda.detalles[1 - indice_pendiente].estado_entrega == EstadoEntrega.ENTREGADO
    assert comanda.detalles[0].precio_unitario == Decimal("29.90")


def test_cerrar_comanda_mapeo_invalido_revierte_transicion(db: Session, comanda: Comanda) -> None:
    comanda.detalles[0].precio_unitario = Decimal("0.00")
    db.commit()

    with pytest.raises(ValidationError):
        service.cerrar_comanda(db, comanda.id)

    assert comanda.estado == EstadoComanda.ABIERTA
    assert not db.dirty


def test_cerrar_comanda_fallo_commit_revierte_estado(
    db: Session,
    comanda: Comanda,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fallar() -> None:
        raise RuntimeError("Fallo de escritura de prueba")

    monkeypatch.setattr(db, "commit", fallar)

    with pytest.raises(RuntimeError, match="Fallo de escritura"):
        service.cerrar_comanda(db, comanda.id)

    assert comanda.estado == EstadoComanda.ABIERTA
    assert not db.dirty
    assert comanda.detalles[0].precio_unitario == Decimal("29.90")


def test_cerrar_comanda_revalida_entregas_persistidas_no_cache(
    db: Session, comanda: Comanda
) -> None:
    detalle_id = comanda.detalles[0].id
    assert comanda.detalles[0].estado_entrega == EstadoEntrega.ENTREGADO
    with Session(db.get_bind()) as otra:
        otra.execute(
            text("UPDATE detalles_comanda SET estado_entrega=:estado WHERE id=:id"),
            {"estado": "PENDIENTE", "id": detalle_id},
        )
        otra.commit()

    with pytest.raises(ReglaDeNegocioError, match="pendientes"):
        service.cerrar_comanda(db, comanda.id)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert comanda.detalles[0].estado_entrega == EstadoEntrega.PENDIENTE


def test_cerrar_comanda_revalida_estado_persistido_no_cache(db: Session, comanda: Comanda) -> None:
    with Session(db.get_bind()) as otra:
        otra.execute(
            text("UPDATE comandas SET estado=:estado WHERE id=:id"),
            {"estado": "ANULADA", "id": comanda.id},
        )
        otra.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.cerrar_comanda(db, comanda.id)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ANULADA


def test_modificar_cliente_confirma_ambos_datos(db: Session) -> None:
    cliente = Cliente(nombre="Ana", telefono="123")
    db.add(cliente)
    db.commit()

    salida = service.modificar_cliente(
        db, cliente.id, ClienteModificar(nombre="María José", telefono="+54 456-789")
    )
    db.expire_all()

    assert salida.model_dump() == {
        "id": cliente.id,
        "nombre": "María José",
        "telefono": "+54 456-789",
    }
    assert (db.get(Cliente, cliente.id).nombre, db.get(Cliente, cliente.id).telefono) == (
        "María José",
        "+54 456-789",
    )


def test_modificar_cliente_inexistente_no_crea_otro(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="cliente 99"):
        service.modificar_cliente(db, 99, ClienteModificar(nombre="Ana", telefono="123"))

    assert db.get(Cliente, 99) is None
