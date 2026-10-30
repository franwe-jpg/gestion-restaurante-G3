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
