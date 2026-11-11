"""reservas: puente con Mesa (M3), Cliente y Comanda (M4).

El lado Mesa es real (S33): consulta a M3 solo con `app.modules.salon.service.listar_mesas` y
lee todas sus paginas, porque M3 pagina (100 como maximo), no filtra por estado y no busca por
`id`. `listar_mesas` y `obtener_mesa` salen de la misma lectura, asi que informan lo mismo de cada
mesa. El lado Cliente tambien es real (S39): consulta y registra clientes solo con
`app.modules.atencion.service.existe_cliente` y `registrar_cliente_para_reserva`. El lado Comanda
(HU-M5-06) crea la comanda de una reserva con `app.modules.atencion.service`, sin confirmarla.

El `service` llama siempre a `puente.<operacion>(...)` para que las pruebas puedan reemplazarlas.
La capacidad de la mesa solo se informa para mostrarla en el selector de mesas: la cantidad de
personas no se valida contra ella (S5, issue #61).
"""

from dataclasses import dataclass
from typing import Protocol

from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.salon import service as salon_service
from app.shared.contratos.comanda import ComandaCrear, ComandaSalida, DetalleComandaCrear
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import LIMIT_MAXIMO, ParametrosPaginacion

TAMANO_PAGINA = LIMIT_MAXIMO


@dataclass(frozen=True)
class SectorDeMesa:
    id: int
    nombre: str


@dataclass(frozen=True)
class MesaReservable:
    id: int
    numero: int
    capacidad: int
    sector: SectorDeMesa
    estado: EstadoMesa


class _SectorDeM3(Protocol):
    id: int
    nombre: str


class _MesaDeM3(Protocol):
    """Lo que el puente lee de cada mesa de M3, sin importar el esquema de salida de `salon`."""

    id: int
    numero: int
    capacidad: int
    sector: _SectorDeM3
    estado: EstadoMesa


def _a_mesa_reservable(item: _MesaDeM3) -> MesaReservable:
    """Unica conversion de una mesa de M3 al tipo propio de reservas."""
    return MesaReservable(
        id=item.id,
        numero=item.numero,
        capacidad=item.capacidad,
        sector=SectorDeMesa(id=item.sector.id, nombre=item.sector.nombre),
        estado=item.estado,
    )


def _leer_todas(db: Session) -> list[MesaReservable]:
    """Lee todas las paginas de M3, en su orden. No captura errores: si una falla, falla todo.

    El ciclo corta cuando lo leido alcanza el total o cuando una pagina viene vacia: sin el
    segundo corte, un total que bajara entre dos paginas dejaria el ciclo sin fin.
    """
    mesas: list[MesaReservable] = []
    offset = 0
    while True:
        parametros = ParametrosPaginacion(limit=TAMANO_PAGINA, offset=offset)
        pagina = salon_service.listar_mesas(db, parametros)
        mesas.extend(_a_mesa_reservable(item) for item in pagina.items)
        offset += len(pagina.items)
        if not pagina.items or offset >= pagina.total:
            return mesas


def listar_mesas(db: Session) -> list[MesaReservable]:
    """Todas las mesas de M3, tambien las FUERA_DE_SERVICIO, en el orden de M3."""
    return _leer_todas(db)


def obtener_mesa(db: Session, mesa_id: int) -> MesaReservable | None:
    """La mesa con ese id, o None si M3 no la tiene."""
    return next((mesa for mesa in _leer_todas(db) if mesa.id == mesa_id), None)


def existe_cliente(db: Session, cliente_id: int) -> bool:
    """Un cliente existe si M4 lo tiene (S39)."""
    return atencion_service.existe_cliente(db, cliente_id)


def registrar_cliente(db: Session, nombre: str, telefono: str) -> int:
    """Registra el cliente en M4 dentro de la sesion de la reserva; M4 no confirma (S41).

    Si M4 rechaza los datos, su `DatosInvalidosError` sube tal cual (S42).
    """
    return atencion_service.registrar_cliente_para_reserva(db, nombre, telefono)


def crear_comanda_de_reserva(
    db: Session,
    mesa_id: int,
    reserva_id: int,
    detalles: list[DetalleComandaCrear],
    observaciones: str | None,
) -> ComandaSalida:
    """Crea en M4 la comanda de la reserva dentro de la sesion de M5; M4 no confirma (HU-M5-06).

    Usa `crear_comanda_para_reserva`, que recibe el vinculo con la reserva como argumento aparte:
    `ComandaCrear` no tiene `reserva_id` y lo ignoraria en silencio. Los errores de M4 suben tal
    cual; el commit o el rollback los hace `service.crear_comanda`.
    """
    datos = ComandaCrear(mesa_id=mesa_id, detalles=detalles, observaciones=observaciones)
    return atencion_service.crear_comanda_para_reserva(db, datos, reserva_id)
