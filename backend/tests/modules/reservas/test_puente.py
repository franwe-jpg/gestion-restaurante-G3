"""Pruebas del puente con Mesa y Cliente (stub hasta que M3 y M4 expongan su service)."""

import pytest
from sqlalchemy.orm import Session

from app.modules.reservas import puente


# S5 y S20: toda mesa con id positivo existe; el puente solo informa su id, no su capacidad.
def test_obtener_mesa_stub_devuelve_la_mesa_con_su_id(db: Session) -> None:
    mesa = puente.obtener_mesa(db, 5)

    assert mesa == puente.MesaReservable(id=5)


# S6 y S20: todo cliente con id positivo existe.
def test_existe_cliente_stub_acepta_id_positivo(db: Session) -> None:
    assert puente.existe_cliente(db, 7) is True


@pytest.mark.parametrize("mesa_id", [0, -1])
def test_obtener_mesa_stub_rechaza_id_no_positivo(db: Session, mesa_id: int) -> None:
    assert puente.obtener_mesa(db, mesa_id) is None


@pytest.mark.parametrize("cliente_id", [0, -1])
def test_existe_cliente_stub_rechaza_id_no_positivo(db: Session, cliente_id: int) -> None:
    assert puente.existe_cliente(db, cliente_id) is False
