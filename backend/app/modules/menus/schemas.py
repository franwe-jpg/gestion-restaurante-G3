"""menus: entrada y salida de la API."""

from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    StringConstraints,
    field_serializer,
    field_validator,
)

from app.shared.models import Categoria, Estado
from app.shared.paginacion import ParametrosPaginacion

# Mismas restricciones que `productos.schemas` (S3, S4, S5): el menu del dia es un Producto,
# pero este modulo no puede importar los schemas de productos (contrato de importaciones).
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Descripcion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Ingrediente = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Etiqueta = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]


def _sin_repetidos(textos: list[str], mensaje: str) -> list[str]:
    if len({texto.casefold() for texto in textos}) != len(textos):
        raise ValueError(mensaje)
    return textos


class MenuDelDiaCrear(BaseModel):
    """Alta de un menu del dia: la categoria y el estado los fija el sistema (S10)."""

    model_config = ConfigDict(extra="forbid")

    nombre: Nombre
    seccion_id: StrictInt = Field(gt=0)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)  # S4
    ingredientes: list[Ingrediente] = Field(min_length=1, max_length=50)
    descripcion: Descripcion | None = None
    etiquetas: list[Etiqueta] = Field(default_factory=list, max_length=20)

    @field_validator("ingredientes")
    @classmethod
    def _ingredientes_sin_repetidos(cls, ingredientes: list[str]) -> list[str]:
        return _sin_repetidos(ingredientes, "los ingredientes no pueden repetirse")

    @field_validator("etiquetas")
    @classmethod
    def _etiquetas_sin_repetidas(cls, etiquetas: list[str]) -> list[str]:
        return _sin_repetidos(etiquetas, "las etiquetas no pueden repetirse")

    @field_validator("descripcion")
    @classmethod
    def _descripcion_vacia_es_none(cls, descripcion: str | None) -> str | None:
        return descripcion or None


class MenuDelDiaModificar(MenuDelDiaCrear):
    """Reemplazo completo del alta, con estado y quitar_imagen (S24)."""

    estado: Estado | None = None  # ausente: conserva el actual
    quitar_imagen: StrictBool = False


class SeccionResumen(BaseModel):
    id: int
    nombre: str


class MenuDelDiaSalida(BaseModel):
    id: int
    nombre: str
    categoria: Categoria
    precio: Decimal
    ingredientes: list[str]
    descripcion: str | None
    etiquetas: list[str]
    estado: Estado
    seccion: SeccionResumen
    imagen_url: str | None

    @field_serializer("precio")
    def _precio_con_dos_decimales(self, precio: Decimal) -> str:
        return f"{precio:.2f}"


class MenuDelDiaListado(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    seccion: SeccionResumen
    precio: Decimal
    estado: Estado
    imagen_url: str | None

    @field_serializer("precio")
    def _precio_con_dos_decimales(self, precio: Decimal) -> str:
        return f"{precio:.2f}"


class FiltroEstadoMenuDelDia(StrEnum):
    """Opciones del filtro de GET /menus-del-dia; `TODOS` no existe en `Estado` del shared."""

    HABILITADO = "HABILITADO"
    DESHABILITADO = "DESHABILITADO"
    TODOS = "TODOS"


class FiltroMenusDelDia(ParametrosPaginacion):
    """Paginacion y filtro de GET /menus-del-dia: `estado` viaja dentro del mismo modelo."""

    estado: FiltroEstadoMenuDelDia = FiltroEstadoMenuDelDia.HABILITADO

    def estado_elegido(self) -> Estado | None:
        """Traduce el filtro a `Estado`; `None` significa todos."""
        if self.estado == FiltroEstadoMenuDelDia.TODOS:
            return None
        return Estado(self.estado.value)
