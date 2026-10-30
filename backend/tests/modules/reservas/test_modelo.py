"""Pruebas del modelo Reserva (HU-M5-01)."""

from datetime import date, time

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva


def _reserva(mesa_id: int, cantidad_personas: int = 4) -> Reserva:
    return Reserva(
        cliente_nombre="Ana Pérez",
        cliente_telefono="2804000000",
        fecha=date(2026, 12, 1),
        hora=time(21, 0),
        cantidad_personas=cantidad_personas,
        mesa_id=mesa_id,
    )


def test_estado_reserva_tiene_los_cuatro_valores_del_diagrama() -> None:
    assert [estado.value for estado in EstadoReserva] == [
        "ACTIVA",
        "ATENDIDA",
        "CANCELADA_ANTICIPADA",
        "CANCELADA_POR_AUSENCIA",
    ]


# CA 1: toda alta queda Activa
def test_reserva_nueva_queda_activa_por_defecto(db: Session, fabrica_sector, fabrica_mesa) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = _reserva(mesa.id)
    db.add(reserva)
    db.flush()

    assert reserva.estado == EstadoReserva.ACTIVA


# CA 5: cantidad de personas mayor a cero
def test_check_rechaza_cantidad_de_personas_no_positiva(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = _reserva(mesa.id, cantidad_personas=0)
    db.add(reserva)

    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


# CA 6: dos reservas Activas no pueden compartir mesa, fecha y hora
def test_indice_unico_rechaza_dos_reservas_activas_en_el_mismo_horario(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    db.add(_reserva(mesa.id))
    db.commit()

    db.add(_reserva(mesa.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


# CA 6, limite: una reserva Cancelada no bloquea el indice unico
def test_indice_unico_permite_repetir_el_horario_si_la_otra_no_esta_activa(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    cancelada = _reserva(mesa.id)
    cancelada.estado = EstadoReserva.CANCELADA_ANTICIPADA
    db.add(cancelada)
    db.commit()

    db.add(_reserva(mesa.id))
    db.commit()  # no debe lanzar


def test_la_mesa_con_reservas_no_se_puede_borrar(db: Session, fabrica_sector, fabrica_mesa) -> None:
    """FK RESTRICT (CA 6, mesa elegida entre las disponibles): no se pierde el historial."""
    mesa = fabrica_mesa(fabrica_sector())
    db.add(_reserva(mesa.id))
    db.commit()

    db.delete(mesa)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
