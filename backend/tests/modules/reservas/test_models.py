"""Pruebas del modelo Reserva y de su enumerado (HU-M5-01)."""

from datetime import date, time

from sqlalchemy.orm import Session

from app.modules.reservas.models import EstadoReserva, Reserva


# S1: el estado inicial es ACTIVA; PENDIENTE (valor de S1-07) no figura.
def test_estado_reserva_tiene_exactamente_los_cuatro_valores() -> None:
    assert [estado.value for estado in EstadoReserva] == [
        "ACTIVA",
        "ATENDIDA",
        "CANCELADA_ANTICIPADA",
        "CANCELADA_POR_AUSENCIA",
    ]


def test_reserva_nueva_queda_activa_por_defecto(db: Session) -> None:
    reserva = Reserva(
        mesa_id=5, cliente_id=7, fecha=date(2026, 11, 2), hora=time(21, 30), cantidad_personas=4
    )
    db.add(reserva)
    db.flush()

    assert reserva.estado == EstadoReserva.ACTIVA
