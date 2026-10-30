"""Modificación atómica de clientes en una base temporal migrada."""

import pytest
from sqlalchemy.orm import Session

from app.modules.atencion import service
from app.modules.atencion.models import Cliente
from app.modules.atencion.schemas import ClienteModificar
from app.shared.excepciones import NoEncontradoError


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
