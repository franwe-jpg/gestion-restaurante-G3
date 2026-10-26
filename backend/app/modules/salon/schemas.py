"""salon: entrada y salida de la API."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.shared.models import Estado

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


class SectorSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    estado: Estado
