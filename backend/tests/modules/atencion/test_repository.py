"""Read persisted M4 orders without defining an HTTP or shared DTO contract."""

from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion import repository
from app.modules.atencion.models import Comanda, DetalleComanda


def _crear_mesa(db: Session) -> None:
    db.execute(
        text(
            "INSERT INTO sectores (id, nombre, nombre_normalizado, estado) "
            "VALUES (1, 'Sala', 'sala', 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO mesas (id, numero, capacidad, sector_id, estado) "
            "VALUES (1, 1, 4, 1, 'LIBRE')"
        )
    )


def test_obtener_comanda_recupera_detalles_historicos(db: Session) -> None:
    _crear_mesa(db)
    db.execute(
        text(
            "INSERT INTO secciones (id, nombre, nombre_normalizado, orden, estado) "
            "VALUES (1, 'Carta', 'carta', 1, 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO productos (id, nombre, nombre_normalizado, categoria, precio, "
            "ingredientes, etiquetas, estado, seccion_id) "
            "VALUES (1, 'Plato', 'plato', 'PLATO', 29.90, '[]', '[]', 'HABILITADO', 1)"
        )
    )
    comanda = Comanda(mesa_id=1)
    db.add(comanda)
    db.flush()
    db.add(
        DetalleComanda(
            comanda_id=comanda.id,
            producto_id=1,
            cantidad=2,
            precio_unitario=Decimal("29.90"),
            descuento=Decimal("3.25"),
        )
    )
    db.commit()
    db.expunge_all()

    recuperada = repository.obtener_comanda(db, comanda.id)

    assert recuperada.id == comanda.id
    assert recuperada.mesa_id == 1
    assert len(recuperada.detalles) == 1
    assert recuperada.detalles[0].producto_id == 1
    assert recuperada.detalles[0].precio_unitario == Decimal("29.90")
    assert recuperada.detalles[0].descuento == Decimal("3.25")


def test_obtener_comanda_no_devuelve_otra_comanda_si_id_no_existe(db: Session) -> None:
    _crear_mesa(db)
    db.add(Comanda(mesa_id=1))
    db.commit()

    assert repository.obtener_comanda(db, 999) is None
    assert db.execute(text("SELECT COUNT(*) FROM comandas")).scalar_one() == 1
