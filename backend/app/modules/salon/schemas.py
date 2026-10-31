"""salon: entrada y salida de la API."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StringConstraints, field_validator

from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import ParametrosPaginacion

NOMBRE_SECTOR_MAXIMO = 30
DESCRIPCION_SECTOR_MAXIMA = 200

NombreSector = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=NOMBRE_SECTOR_MAXIMO),
]
DescripcionSector = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=DESCRIPCION_SECTOR_MAXIMA),
]


class SectorCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # estado no se recibe (S3)

    nombre: NombreSector
    descripcion: DescripcionSector | None = None

    @field_validator("descripcion")
    @classmethod
    def _descripcion_vacia_es_none(cls, descripcion: str | None) -> str | None:
        return descripcion or None


class SectorModificar(SectorCrear):
    """Mismos campos y reglas que el alta; el estado no se recibe (M3 y M6)."""


class SectorSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    estado: Estado


class MesaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # estado no se recibe (S4)

    numero: StrictInt = Field(gt=0)  # rechaza "3", 2.0 y true
    capacidad: StrictInt = Field(gt=0)
    sector_id: StrictInt = Field(gt=0)


class MesaModificar(MesaCrear):
    """Mismos campos y reglas que el alta; el estado no se recibe (HU-M3-06)."""


class SectorResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class MesaSalida(BaseModel):
    id: int
    numero: int
    capacidad: int
    sector: SectorResumen
    estado: EstadoMesa


class FiltroSectores(ParametrosPaginacion):
    """Paginacion y filtro de GET /sectores: `estado` viaja dentro del mismo modelo."""

    estado: Estado | None = None


NOMBRE_PERSONA_MAXIMO = 60
TELEFONO_MAXIMO = 30
DNI_PATRON = r"^\d{7,8}$"
SOLO_LETRAS_PATRON = r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$"

Dni = Annotated[str, StringConstraints(strip_whitespace=True, pattern=DNI_PATRON)]
NombrePersona = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=NOMBRE_PERSONA_MAXIMO,
        pattern=SOLO_LETRAS_PATRON,
    ),
]
Telefono = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=TELEFONO_MAXIMO),
]


class MozoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # el estado lo asigna el sistema (HU-M3-09)

    dni: Dni
    nombre: NombrePersona
    apellido: NombrePersona
    telefono: Telefono | None = None

    @field_validator("telefono")
    @classmethod
    def _telefono_vacio_es_none(cls, telefono: str | None) -> str | None:
        return telefono or None


class MozoModificar(MozoCrear):
    """Mismos campos y reglas que el alta; el estado no se recibe (HU-M3-10)."""


class MozoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dni: str
    nombre: str
    apellido: str
    telefono: str | None
    estado: Estado


class FiltroMozos(ParametrosPaginacion):
    """Paginación y filtro de GET /mozos: `estado` viaja dentro del mismo modelo."""

    estado: Estado | None = None
