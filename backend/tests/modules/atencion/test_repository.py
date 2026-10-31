"""Consultas filtradas y paginadas sobre SQLite aislada."""

import pytest
from sqlalchemy.orm import Session

from app.modules.atencion import repository
from app.modules.atencion.models import Cliente
from app.shared.paginacion import ParametrosPaginacion


@pytest.fixture
def registros(db: Session) -> list[Cliente]:
    clientes = [
        Cliente(nombre="Ana", telefono="123"),
        Cliente(nombre="Anabel", telefono="123"),
        Cliente(nombre="Luis", telefono="456"),
        Cliente(nombre="A%na", telefono="789"),
    ]
    db.add_all(clientes)
    db.commit()
    return clientes


@pytest.mark.parametrize(
    "q,esperados",
    [
        (None, ["Ana", "Anabel", "Luis", "A%na"]),
        ("Ana", ["Ana", "Anabel"]),
        ("nabel", ["Anabel"]),
        ("123", ["Ana", "Anabel"]),
        ("sin coincidencias", []),
        ("%", ["A%na"]),
        ("_", []),
    ],
)
def test_listar_clientes_filtra_literal_y_cuenta(
    db: Session, registros: list[Cliente], q: str | None, esperados: list[str]
) -> None:
    items, total = repository.listar_clientes(db, ParametrosPaginacion(), q)

    assert [item.nombre for item in items] == esperados
    assert total == len(esperados)


def test_listar_clientes_cuenta_antes_de_paginar(db: Session, registros: list[Cliente]) -> None:
    items, total = repository.listar_clientes(db, ParametrosPaginacion(limit=1, offset=1), "Ana")

    assert [item.nombre for item in items] == ["Anabel"]
    assert total == 2


def test_listar_clientes_vacio(db: Session) -> None:
    items, total = repository.listar_clientes(db, ParametrosPaginacion(), None)

    assert items == []
    assert total == 0
