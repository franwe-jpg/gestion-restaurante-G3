"""reservas: entrada y salida de la API."""

import re
from datetime import date, time
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StrictStr,
    field_serializer,
    field_validator,
)
from pydantic_core import PydanticCustomError

from app.modules.reservas.models import EstadoReserva
from app.shared.contratos.comanda import DetalleComandaCrear
from app.shared.paginacion import ParametrosPaginacion


def _hora_en_minutos(hora: time) -> time:
    """S16: la hora tiene precision de minutos y sin zona horaria.

    La comparten el alta, la modificacion y la consulta de mesas disponibles.
    """
    if hora.second or hora.microsecond or hora.tzinfo is not None:
        raise ValueError("La hora debe tener el formato HH:MM, sin segundos ni zona horaria")
    return hora


class _DatosDelTurno(BaseModel):
    """Datos que comparten el alta y la modificacion: cuando y para cuantas personas."""

    model_config = ConfigDict(extra="forbid")  # S15: id y estado no se reciben

    fecha: date
    hora: time
    cantidad_personas: StrictInt = Field(gt=0)  # rechaza "4", 2.5 y true

    _hora_con_precision_de_minutos = field_validator("hora")(_hora_en_minutos)


# Supuesto S66 (correccion de HU-M5-01-02-03, 2026-11-11, pendiente de validacion del equipo): el
# telefono del cliente nuevo admite un `+` opcional solo al inicio, digitos, espacios y guiones;
# entre 6 y 15 digitos (15 es el maximo de E.164) y hasta 20 caracteres en total. Los espacios de
# los extremos se recortan antes de validar y de guardar. Lo valida M5 antes de llamar a M4 porque
# la regla de M4 no acota el largo.
_TELEFONO_FORMATO = re.compile(r"\+?[0-9 -]+")
_TELEFONO_LARGO_MAXIMO = 20
_TELEFONO_DIGITOS_MINIMO = 6
_TELEFONO_DIGITOS_MAXIMO = 15


def _telefono_valido(telefono: str) -> str:
    """Devuelve el telefono recortado o lanza el error de la primera regla que no cumple.

    Se usa `PydanticCustomError` y no `ValueError` para que el detalle del 422 no lleve el
    prefijo «Value error, » y se lea como el de M4.
    """
    recortado = telefono.strip()
    if not recortado:
        raise PydanticCustomError("telefono_obligatorio", "telefono es obligatorio")
    if _TELEFONO_FORMATO.fullmatch(recortado) is None:
        raise PydanticCustomError(
            "telefono_caracteres", "telefono solo admite dígitos, espacios, guiones y + al inicio"
        )
    if len(recortado) > _TELEFONO_LARGO_MAXIMO:
        raise PydanticCustomError(
            "telefono_largo", f"telefono admite hasta {_TELEFONO_LARGO_MAXIMO} caracteres"
        )
    digitos = sum(caracter.isdigit() for caracter in recortado)
    if not _TELEFONO_DIGITOS_MINIMO <= digitos <= _TELEFONO_DIGITOS_MAXIMO:
        raise PydanticCustomError(
            "telefono_digitos",
            f"telefono debe tener entre {_TELEFONO_DIGITOS_MINIMO} y "
            f"{_TELEFONO_DIGITOS_MAXIMO} dígitos",
        )
    return recortado


class ClienteNuevo(BaseModel):
    """Cliente que se registra con la reserva (S40).

    El nombre es solo de forma: su contenido lo valida M4 (S42). El teléfono lo valida este
    esquema antes de llamar a M4 (S66) y se guarda ya recortado.
    """

    model_config = ConfigDict(extra="forbid")

    nombre: StrictStr
    telefono: StrictStr

    _telefono_acotado = field_validator("telefono")(_telefono_valido)


class ReservaCrear(_DatosDelTurno):
    """El cliente es `cliente_id` o `cliente_nuevo`: esa regla la comprueba el service (S39)."""

    mesa_id: StrictInt = Field(gt=0)
    cliente_id: StrictInt | None = Field(default=None, gt=0)
    cliente_nuevo: ClienteNuevo | None = None


class ReservaModificar(_DatosDelTurno):
    """Solo fecha, hora y cantidad: mesa, cliente y estado no cambian (S7, S15)."""


class ReservaSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mesa_id: int
    cliente_id: int
    fecha: date
    hora: time
    cantidad_personas: int
    estado: EstadoReserva

    @field_serializer("hora")
    def _serializar_hora(self, hora: time) -> str:
        return hora.strftime("%H:%M")


class FiltroReservas(ParametrosPaginacion):
    """Paginacion y filtros de GET /reservas: `fecha` y `estado` viajan dentro del mismo modelo."""

    fecha: date | None = None
    estado: EstadoReserva | None = None


class ConsultaMesasDisponibles(BaseModel):
    """Parametros de GET /reservas/mesas-disponibles: el turno que se quiere reservar."""

    fecha: date
    hora: time

    _hora_con_precision_de_minutos = field_validator("hora")(_hora_en_minutos)


class SectorResumenMesa(BaseModel):
    """Sector de una mesa disponible; propio de reservas, sin importar el esquema de salon."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class MesaDisponible(BaseModel):
    """Mesa que se puede reservar en un turno. No expone el estado de la mesa (S29)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: int
    capacidad: int
    sector: SectorResumenMesa


class ComandaDesdeReservaCrear(BaseModel):
    """Pedido de la comanda de una reserva: Mozo elegido y sin mesa (sale de la reserva)."""

    model_config = ConfigDict(extra="forbid")  # S62: mesa, reserva, estado y cliente no se reciben

    mozo_id: StrictInt = Field(gt=0)
    detalles: list[DetalleComandaCrear] = Field(min_length=1)
    observaciones: str | None = None


class ResumenReservas(BaseModel):
    """Reporte de reservas y ausentismo de un período (HU-M5-07; diagrama, celda `rep-rM5dto`).

    `atendidas` no está en el diagrama: lo pide el issue, que gana (proposal, Decisión `atendidas`).
    """

    fecha_desde: date
    fecha_hasta: date
    total_reservas: int
    atendidas: int
    canceladas_anticipada: int
    canceladas_por_ausencia: int
    porcentaje_ausentismo: Decimal | None

    @field_serializer("porcentaje_ausentismo")
    def _porcentaje_con_dos_decimales(self, porcentaje: Decimal | None) -> str | None:
        return None if porcentaje is None else f"{porcentaje:.2f}"
