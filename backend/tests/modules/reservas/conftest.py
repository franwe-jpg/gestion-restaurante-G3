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
from decimal import Decimal

import pytest
from pydantic import ValidationError
from sqlalchemy.orm import Session

# Los esquemas y el service de atencion se importan solo en las pruebas (como los de salon).
from app.modules.atencion import service as atencion_service
from app.modules.atencion.schemas import ClienteNuevo
from app.modules.reservas import puente, service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.puente import MesaReservable, SectorDeMesa

# Los modelos de salon se importan solo en las pruebas: lint-imports controla `app`, no `tests`.
from app.modules.salon import service as salon_service
from app.modules.salon.models import Mesa, Sector
from app.shared.contratos.comanda import (
    ComandaSalida,
    DetalleComandaCrear,
    DetalleComandaSalida,
    EstadoComanda,
    EstadoEntrega,
)
from app.shared.excepciones import DatosInvalidosError
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
REGISTRAR_CLIENTE_REAL = puente.registrar_cliente
CREAR_COMANDA_DE_RESERVA_REAL = puente.crear_comanda_de_reserva

SECTOR_SALON = SectorDeMesa(1, "Salón")

# Cuantas mesas devuelve M3 por pagina como maximo (app.shared.paginacion.LIMIT_MAXIMO).
PAGINA_DE_M3 = 100

FabricaReserva = Callable[..., Reserva]
FabricaMesasM3 = Callable[..., list[Mesa]]


class DoblePuente:
    """Puente de prueba con las operaciones del contrato, las mesas 5 y 6 y el cliente 7.

    `obtener_mesa` y `listar_mesas` leen el mismo diccionario, asi que nunca difieren en el
    estado de una mesa. Los clientes nuevos se validan con el `ClienteNuevo` real de M4 (una sola
    fuente de reglas, S42), pero su lista no participa de la transaccion: un `rollback` no la
    vacia (Decision 27); lo que depende de la transaccion se prueba con el puente real.

    `crear_comanda_de_reserva` (HU-M5-06) no escribe en la base: devuelve una `ComandaSalida`
    `ABIERTA` y guarda lo recibido en `comandas`. Si `falla` tiene una excepcion, la lanza sin
    registrar la llamada. Si `efecto` tiene una funcion, la ejecuta con la sesion antes de
    fallar o devolver (simula una escritura de M4 con `flush` o una sesion concurrente).
    """

    def __init__(self) -> None:
        self.mesas: dict[int, MesaReservable] = {}
        self.poner(5)
        self.poner(6)
        self.clientes: dict[int, tuple[str, str]] = {}
        self.registrados: list[tuple[int, str, str]] = []
        self.poner_cliente(7, "Ana Pérez", "+54 280 1234567")
        self.comandas: list[tuple[int, int, list[DetalleComandaCrear], str | None]] = []
        self.falla: Exception | None = None
        self.efecto: Callable[[Session], None] | None = None

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

    def poner_cliente(self, cliente_id: int, nombre: str, telefono: str) -> None:
        self.clientes[cliente_id] = (nombre, telefono)

    def existe_cliente(self, _db: Session, cliente_id: int) -> bool:
        return cliente_id in self.clientes

    def registrar_cliente(self, _db: Session, nombre: str, telefono: str) -> int:
        try:
            datos = ClienteNuevo(nombre=nombre, telefono=telefono)
        except ValidationError as error:
            falla = error.errors()[0]
            campo = str(falla["loc"][0])
            mensaje = falla["msg"].removeprefix("Value error, ")
            raise DatosInvalidosError(f"Datos invalidos. {campo}: {mensaje}") from error
        cliente_id = max([99, *self.clientes]) + 1  # ids desde 100
        self.poner_cliente(cliente_id, datos.nombre, datos.telefono)
        self.registrados.append((cliente_id, datos.nombre, datos.telefono))
        return cliente_id

    def crear_comanda_de_reserva(
        self,
        db: Session,
        mesa_id: int,
        reserva_id: int,
        detalles: list[DetalleComandaCrear],
        observaciones: str | None,
    ) -> ComandaSalida:
        if self.efecto is not None:
            self.efecto(db)
        if self.falla is not None:
            raise self.falla
        self.comandas.append((mesa_id, reserva_id, detalles, observaciones))
        return ComandaSalida(
            id=len(self.comandas),
            mesa_id=mesa_id,
            estado=EstadoComanda.ABIERTA,
            fecha_hora=AHORA,
            reserva_id=reserva_id,
            observaciones=observaciones,
            detalles=[
                DetalleComandaSalida(
                    producto_id=detalle.producto_id,
                    menu_ejecutivo_id=detalle.menu_ejecutivo_id,
                    cantidad=detalle.cantidad,
                    precio_unitario=Decimal("100.00"),
                    descuento=Decimal("0.00"),
                    estado_entrega=EstadoEntrega.PENDIENTE,
                )
                for detalle in detalles
            ],
        )


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
    monkeypatch.setattr(puente, "registrar_cliente", doble.registrar_cliente)
    monkeypatch.setattr(puente, "crear_comanda_de_reserva", doble.crear_comanda_de_reserva)
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
def puente_sin_cliente(puente_doble: DoblePuente) -> None:
    puente_doble.clientes.clear()


@pytest.fixture
def puente_real(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deshace el doble: vuelve a poner las funciones originales del puente."""
    monkeypatch.setattr(puente, "obtener_mesa", OBTENER_MESA_REAL)
    monkeypatch.setattr(puente, "listar_mesas", LISTAR_MESAS_REAL)
    monkeypatch.setattr(puente, "existe_cliente", EXISTE_CLIENTE_REAL)
    monkeypatch.setattr(puente, "registrar_cliente", REGISTRAR_CLIENTE_REAL)
    monkeypatch.setattr(puente, "crear_comanda_de_reserva", CREAR_COMANDA_DE_RESERVA_REAL)


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


@pytest.fixture
def cliente_en_m4(db: Session) -> int:
    """Registra "Ana Pérez" con la funcion real de M4 y confirma; devuelve su id."""
    cliente_id = atencion_service.registrar_cliente_para_reserva(db, "Ana Pérez", "+54 280 1234567")
    db.commit()
    return cliente_id
