"""Fixtures del modulo reservas: reloj fijo, fabrica de reservas, doble del puente y semilla de M3.

Toda prueba arranca con el doble del puente (`puente_doble`, autouse), sin base de M3. Las pruebas
del puente real piden `puente_real` y siembran M3 con `mesas_en_m3` (S20, S33); las que simulan una
falla de M3 piden ademas `m3_falla_desde_la_segunda_pagina`. Las pruebas de la zona del
restaurante (S28) piden `reloj_utc_fijo`, que usa el `ahora()` verdadero con un servidor en UTC.
"""

import time as tiempo
from collections.abc import Callable, Iterator
from dataclasses import replace
from datetime import UTC, date, datetime, time

import pytest
from sqlalchemy.orm import Session

from app.modules.reservas import puente, service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.puente import MesaReservable, SectorDeMesa

# Los modelos de salon se importan solo en las pruebas: lint-imports controla `app`, no `tests`.
from app.modules.salon import service as salon_service
from app.modules.salon.models import Mesa, Sector
from app.shared.models.enums import EstadoMesa

# Lunes 2 de noviembre de 2026, mediodia: los escenarios de la spec se trasladan a este reloj.
AHORA = datetime(2026, 11, 2, 12, 0)

# S28: el reloj UTC del servidor ya marca el 2 de noviembre a las 02:30, pero en la zona del
# restaurante (UTC-3) todavia es el 1 de noviembre a las 23:30.
INSTANTE_UTC = datetime(2026, 11, 2, 2, 30, tzinfo=UTC)

# `ahora` verdadera, guardada al importar el archivo, antes de que `reloj` la reemplace.
AHORA_REAL = service.ahora

# Funciones originales del puente, guardadas al importar el archivo, antes de que el doble las
# reemplace.
OBTENER_MESA_REAL = puente.obtener_mesa
LISTAR_MESAS_REAL = puente.listar_mesas
EXISTE_CLIENTE_REAL = puente.existe_cliente

SECTOR_SALON = SectorDeMesa(1, "Salón")

# Cuantas mesas devuelve M3 por pagina como maximo (app.shared.paginacion.LIMIT_MAXIMO).
PAGINA_DE_M3 = 100

FabricaReserva = Callable[..., Reserva]
FabricaMesasM3 = Callable[..., list[Mesa]]


class DoblePuente:
    """Puente de prueba con las tres operaciones del contrato y las mesas 5 y 6 por defecto.

    `obtener_mesa` y `listar_mesas` leen el mismo diccionario, asi que nunca difieren en el
    estado de una mesa.
    """

    def __init__(self) -> None:
        self.mesas: dict[int, MesaReservable] = {}
        self.poner(5)
        self.poner(6)

    def poner(self, mesa_id: int, **cambios) -> MesaReservable:
        """Reemplaza la mesa con `cambios`; si no existe, la agrega con los valores por defecto."""
        mesa = self.mesas.get(mesa_id)
        if mesa is None:
            mesa = MesaReservable(
                id=mesa_id,
                numero=mesa_id,
                capacidad=4,
                sector=SECTOR_SALON,
                estado=EstadoMesa.LIBRE,
            )
        self.mesas[mesa_id] = replace(mesa, **cambios)
        return self.mesas[mesa_id]

    def obtener_mesa(self, _db: Session, mesa_id: int) -> MesaReservable | None:
        return self.mesas.get(mesa_id)

    def listar_mesas(self, _db: Session) -> list[MesaReservable]:
        return list(self.mesas.values())

    def existe_cliente(self, _db: Session, cliente_id: int) -> bool:
        return cliente_id > 0


class DatetimeConRelojFijo(datetime):
    """`datetime` cuyo `now` devuelve `INSTANTE_UTC`, sin leer el reloj del sistema.

    Con `tz` devuelve el instante convertido a esa zona; sin `tz` devuelve lo que daria un
    `datetime.now()` local, sin zona, con la zona del proceso.
    """

    @classmethod
    def now(cls, tz=None):
        if tz is None:
            return INSTANTE_UTC.astimezone().replace(tzinfo=None)
        return INSTANTE_UTC.astimezone(tz)


@pytest.fixture(autouse=True)
def reloj(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service, "ahora", lambda: AHORA)


@pytest.fixture
def zona_del_proceso() -> Iterator[Callable[[str], None]]:
    """Devuelve `fijar(nombre)`, que cambia la zona horaria del proceso (`TZ` y `tzset`).

    Al terminar, el parche restaura `TZ` y se vuelve a llamar a `tzset`. `time.tzset` no existe en
    Windows: ahi `fijar` salta la prueba.
    """
    with pytest.MonkeyPatch.context() as parche:

        def fijar(nombre: str) -> None:
            if not hasattr(tiempo, "tzset"):
                pytest.skip("time.tzset no existe en este sistema")
            parche.setenv("TZ", nombre)
            tiempo.tzset()

        yield fijar
    if hasattr(tiempo, "tzset"):
        tiempo.tzset()


@pytest.fixture
def reloj_utc_fijo(monkeypatch: pytest.MonkeyPatch, zona_del_proceso) -> None:
    """Servidor en UTC con el reloj en `INSTANTE_UTC` (S28), usando el `ahora()` verdadero.

    No parchea `ahora()`: sustituye `service.datetime` por `DatetimeConRelojFijo` y deja el
    proceso en la zona UTC, como el contenedor de Docker. Asi la prueba falla de verdad si
    `ahora()` vuelve a usar la hora del proceso, en un contenedor y en cualquier maquina.
    """
    monkeypatch.setattr(service, "ahora", AHORA_REAL)
    monkeypatch.setattr(service, "datetime", DatetimeConRelojFijo)
    zona_del_proceso("UTC")


@pytest.fixture(autouse=True)
def puente_doble(monkeypatch: pytest.MonkeyPatch) -> DoblePuente:
    doble = DoblePuente()
    monkeypatch.setattr(puente, "obtener_mesa", doble.obtener_mesa)
    monkeypatch.setattr(puente, "listar_mesas", doble.listar_mesas)
    monkeypatch.setattr(puente, "existe_cliente", doble.existe_cliente)
    return doble


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


@pytest.fixture
def puente_sin_mesa(puente_doble: DoblePuente) -> None:
    puente_doble.mesas.clear()


@pytest.fixture
def puente_sin_cliente(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(puente, "existe_cliente", lambda _db, _cliente_id: False)


@pytest.fixture
def puente_real(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deshace el doble: vuelve a poner las funciones originales del puente."""
    monkeypatch.setattr(puente, "obtener_mesa", OBTENER_MESA_REAL)
    monkeypatch.setattr(puente, "listar_mesas", LISTAR_MESAS_REAL)
    monkeypatch.setattr(puente, "existe_cliente", EXISTE_CLIENTE_REAL)


@pytest.fixture
def mesas_en_m3(db: Session) -> FabricaMesasM3:
    """Crea en la base de prueba un sector y `cantidad` mesas de M3, numeradas desde 1."""

    def crear(cantidad: int, estado: EstadoMesa = EstadoMesa.LIBRE) -> list[Mesa]:
        sector = Sector(nombre=SECTOR_SALON.nombre)
        db.add(sector)
        db.flush()  # el sector necesita su id antes de crear las mesas
        mesas = [
            Mesa(numero=numero, capacidad=4, sector_id=sector.id, estado=estado)
            for numero in range(1, cantidad + 1)
        ]
        db.add_all(mesas)
        db.commit()
        return mesas

    return crear


@pytest.fixture
def m3_falla_desde_la_segunda_pagina(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hace que `listar_mesas` de M3 lea la primera pagina y falle desde la segunda."""
    original = salon_service.listar_mesas

    def envoltura(db: Session, parametros):
        if parametros.offset >= PAGINA_DE_M3:
            raise RuntimeError("falla simulada de M3")
        return original(db, parametros)

    monkeypatch.setattr(salon_service, "listar_mesas", envoltura)
