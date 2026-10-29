"""menus: entrada y salida de la API."""

from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
    field_serializer,
    field_validator,
)

from app.shared.models import Categoria, Estado
from app.shared.paginacion import ParametrosPaginacion

NOMBRE_MENU_MAXIMO = 100
DESCRIPCION_MENU_MAXIMA = 500

NombreMenu = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=NOMBRE_MENU_MAXIMO),
]
DescripcionMenu = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=DESCRIPCION_MENU_MAXIMA),
]
IdPositivo = Annotated[StrictInt, Field(gt=0)]


class MenuEjecutivoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: NombreMenu
    precio_fijo: Decimal = Field(max_digits=10, decimal_places=2)
    producto_ids: list[IdPositivo] = Field(min_length=1)
    seccion_id: IdPositivo
    descripcion: DescripcionMenu | None = None

    @field_validator("producto_ids")
    @classmethod
    def _rechazar_productos_repetidos(cls, producto_ids: list[int]) -> list[int]:
        if len(set(producto_ids)) != len(producto_ids):
            raise ValueError("La lista no puede repetir productos")
        return producto_ids

    @field_validator("precio_fijo")
    @classmethod
    def _precio_debe_ser_positivo(cls, precio_fijo: Decimal) -> Decimal:
        if precio_fijo <= 0:
            raise ValueError("El precio fijo debe ser mayor que cero")
        return precio_fijo

    @field_validator("descripcion")
    @classmethod
    def _descripcion_vacia_es_none(cls, descripcion: str | None) -> str | None:
        return descripcion or None


class MenuEjecutivoActualizar(MenuEjecutivoCrear):
    """Reemplazo completo del alta; si falta `estado`, conserva el actual."""

    estado: Estado | None = None


class SeccionResumen(BaseModel):
    id: int
    nombre: str


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    categoria: Categoria
    estado: Estado


class MenuEjecutivoSalida(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    precio_fijo: Decimal
    estado: Estado
    seccion: SeccionResumen
    productos: list[ProductoResumen]

    @field_serializer("precio_fijo")
    def _precio_con_dos_decimales(self, precio_fijo: Decimal) -> str:
        return f"{precio_fijo:.2f}"


class MenuEjecutivoListado(MenuEjecutivoSalida):
    """Datos que muestra una fila del listado de menús ejecutivos."""


class FiltroMenusEjecutivos(ParametrosPaginacion):
    """Paginación y filtro de estado del listado de menús."""

    estado: Estado | None = None
