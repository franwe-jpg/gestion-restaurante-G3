"""reservas: entrada y salida de la API."""

from datetime import date, time
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StringConstraints

from app.modules.reservas.models import EstadoReserva
from app.shared.paginacion import ParametrosPaginacion

NOMBRE_CLIENTE_MAXIMO = 60
TELEFONO_MAXIMO = 30
SOLO_LETRAS_PATRON = r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$"

ClienteNombre = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=NOMBRE_CLIENTE_MAXIMO,
        pattern=SOLO_LETRAS_PATRON,
    ),
]
ClienteTelefono = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=TELEFONO_MAXIMO),
]


class ReservaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # el estado lo asigna el sistema (HU-M5-01)

    # Supuesto S1: cliente como nombre y telefono mientras M4 no tenga la entidad Cliente.
    cliente_nombre: ClienteNombre
    cliente_telefono: ClienteTelefono
    fecha: date
    hora: time
    cantidad_personas: StrictInt = Field(gt=0)  # rechaza "3", 2.0 y true
    mesa_id: StrictInt = Field(gt=0)


class ReservaModificar(BaseModel):
    """Solo fecha, hora y comensales (HU-M5-02): el cliente y la mesa no cambian."""

    model_config = ConfigDict(extra="forbid")

    fecha: date
    hora: time
    cantidad_personas: StrictInt = Field(gt=0)


class MesaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero: int
    capacidad: int
    sector_nombre: str


class ReservaSalida(BaseModel):
    id: int
    cliente_nombre: str
    cliente_telefono: str
    fecha: date
    hora: time
    cantidad_personas: int
    mesa: MesaResumen
    estado: EstadoReserva


class FiltroReservas(ParametrosPaginacion):
    """Paginacion y filtro de GET /reservas: `fecha` es obligatoria (HU-M5-03)."""

    fecha: date
