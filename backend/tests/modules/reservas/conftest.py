"""Fixtures del modulo reservas: reloj fijo, fabrica de reservas y reemplazos del puente."""

from collections.abc import Callable
from datetime import date, datetime, time

import pytest
from sqlalchemy.orm import Session

from app.modules.reservas import service
from app.modules.reservas.models import EstadoReserva, Reserva

# Lunes 2 de noviembre de 2026, mediodia: los escenarios de la spec se trasladan a este reloj.
AHORA = datetime(2026, 11, 2, 12, 0)

FabricaReserva = Callable[..., Reserva]
ConfigurarCapacidad = Callable[[int], None]


@pytest.fixture(autouse=True)
def reloj(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "ahora", lambda: AHORA)


@pytest.fixture
def fabrica_reserva(db: Session) -> FabricaReserva:
    def crear(
        mesa_id: int = 1,
        cliente_id: int = 1,
        fecha: date = date(2026, 11, 3),
        hora: time = time(21, 30),
        cantidad_personas: int = 4,
        estado: EstadoReserva = EstadoReserva.ACTIVA,
    ) -> Reserva:
        reserva = Reserva(
            mesa_id=mesa_id,
            cliente_id=cliente_id,
            fecha=fecha,
            hora=hora,
            cantidad_personas=cantidad_personas,
            estado=estado,
        )
        db.add(reserva)
        db.commit()
        return reserva

    return crear


# El puente se importa dentro de cada fixture para que este archivo no dependa de su existencia
# al importarse.
@pytest.fixture
def puente_sin_mesa(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.modules.reservas import puente

    monkeypatch.setattr(puente, "obtener_mesa", lambda _db, _mesa_id: None)


@pytest.fixture
def puente_sin_cliente(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.modules.reservas import puente

    monkeypatch.setattr(puente, "existe_cliente", lambda _db, _cliente_id: False)


@pytest.fixture
def puente_con_capacidad(monkeypatch: pytest.MonkeyPatch) -> ConfigurarCapacidad:
    from app.modules.reservas import puente

    def configurar(capacidad: int) -> None:
        monkeypatch.setattr(
            puente,
            "obtener_mesa",
            lambda _db, mesa_id: puente.MesaReservable(id=mesa_id, capacidad=capacidad),
        )

    return configurar
