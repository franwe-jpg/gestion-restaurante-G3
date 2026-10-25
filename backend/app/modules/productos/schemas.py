"""productos: entrada y salida de la API."""

from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    StringConstraints,
    field_validator,
)

from app.shared.models import Categoria, Estado

NOMBRE_SECCION_MAXIMO = 50

NombreSeccion = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=NOMBRE_SECCION_MAXIMO)
]


class SeccionCrear(BaseModel):
    nombre: NombreSeccion
    orden: StrictInt = Field(gt=0)  # rechaza "3", 2.0 y true (S2)
    producto_ids: list[StrictInt] = Field(default_factory=list)
    confirmar_traslado: StrictBool = False

    @field_validator("producto_ids")
    @classmethod
    def _sin_repetidos(cls, ids: list[int]) -> list[int]:
        if len(set(ids)) != len(ids):
            raise ValueError("los ids de producto no pueden repetirse")
        return ids


class ProductoResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class SeccionSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    orden: int
    estado: Estado
    productos: list[ProductoResumen]


class SeccionListado(BaseModel):
    id: int
    nombre: str
    orden: int
    estado: Estado
    cantidad_productos: int


class SeccionResumen(BaseModel):
    id: int
    nombre: str


class ProductoSeleccionable(BaseModel):
    id: int
    nombre: str
    categoria: Categoria
    seccion: SeccionResumen
