"""reservas: entrada y salida de la API."""

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

from app.modules.reservas.models import EstadoReserva
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


class ClienteNuevo(BaseModel):
    """Cliente que se registra con la reserva (S40). Solo forma: el contenido lo valida M4."""

    model_config = ConfigDict(extra="forbid")

    nombre: StrictStr
    telefono: StrictStr


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
