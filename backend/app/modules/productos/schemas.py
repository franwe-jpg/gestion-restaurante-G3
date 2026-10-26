"""productos: entrada y salida de la API."""

from decimal import Decimal
from enum import StrEnum
from typing import Annotated, ClassVar

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

NOMBRE_SECCION_MAXIMO = 50

NombreSeccion = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=NOMBRE_SECCION_MAXIMO)
]


class Texto:
    """`Texto[minimo, maximo]`: texto recortado antes de medir su largo (S5)."""

    def __class_getitem__(cls, limites: tuple[int, int]) -> object:
        minimo, maximo = limites
        restricciones = StringConstraints(
            strip_whitespace=True, min_length=minimo, max_length=maximo
        )
        return Annotated[str, restricciones]


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


class SeccionModificar(SeccionCrear):
    estado: Estado | None = None  # ausente: conserva el actual (S59)


class FiltroSecciones(ParametrosPaginacion):
    """Paginacion y filtro de GET /secciones. FastAPI no mezcla un modelo `Query()` con otros
    parametros de consulta: `estado` viaja dentro del mismo modelo."""

    estado: Estado | None = None


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
    productos_habilitados: int


class SeccionListado(BaseModel):
    id: int
    nombre: str
    orden: int
    estado: Estado
    cantidad_productos: int
    productos_habilitados: int


class SeccionResumen(BaseModel):
    id: int
    nombre: str


class ProductoSeleccionable(BaseModel):
    id: int
    nombre: str
    categoria: Categoria
    seccion: SeccionResumen


class ProductoListado(ProductoSeleccionable):
    precio: Decimal
    etiquetas: list[str]
    estado: Estado

    @field_serializer("precio")
    def _precio_con_dos_decimales(self, precio: Decimal) -> str:
        return f"{precio:.2f}"


class FiltroEstadoProducto(StrEnum):
    """Opciones del filtro de GET /productos; `TODOS` no existe en `Estado` del shared (E15)."""

    HABILITADO = "HABILITADO"
    DESHABILITADO = "DESHABILITADO"
    TODOS = "TODOS"


class FiltroProductos(ParametrosPaginacion):
    """Paginacion y filtro de GET /productos: `estado` viaja dentro del mismo modelo."""

    estado: FiltroEstadoProducto = FiltroEstadoProducto.HABILITADO

    def estado_elegido(self) -> Estado | None:
        """Traduce el filtro a `Estado`; `None` significa todos."""
        if self.estado == FiltroEstadoProducto.TODOS:
            return None
        return Estado(self.estado.value)


class FiltroCarta(FiltroProductos):
    """Paginacion y filtro de GET /carta: mismas opciones y 422 que GET /productos (I2)."""


def _sin_repetidos(textos: list[str], mensaje: str) -> list[str]:
    if len({texto.casefold() for texto in textos}) != len(textos):
        raise ValueError(mensaje)
    return textos


class ProductoCrear(BaseModel):
    """Base de PlatoCrear, PostreCrear y BebidaCrear: cada una fija su categoria y su mensaje."""

    model_config = ConfigDict(extra="forbid")  # categoria y estado no se reciben (S10)

    CATEGORIA: ClassVar[Categoria]
    MENSAJE_NOMBRE_REPETIDO: ClassVar[str]

    nombre: Texto[1, 100]
    seccion_id: StrictInt = Field(gt=0)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)  # S4
    ingredientes: list[Texto[1, 100]] = Field(default_factory=list, max_length=50)  # S3
    descripcion: Texto[0, 500] | None = None
    etiquetas: list[Texto[1, 30]] = Field(default_factory=list, max_length=20)

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


class PlatoCrear(ProductoCrear):
    CATEGORIA = Categoria.PLATO
    MENSAJE_NOMBRE_REPETIDO = "El plato ya está registrado"

    ingredientes: list[Texto[1, 100]] = Field(min_length=1, max_length=50)


class ProductoModificar(ProductoCrear):
    """Base de la modificacion: reemplazo completo del alta, con estado y quitar_imagen (S24)."""

    estado: Estado | None = None  # ausente: conserva el actual
    quitar_imagen: StrictBool = False


class PlatoModificar(PlatoCrear, ProductoModificar):
    """Modificacion de un plato: las reglas y los mensajes salen de PlatoCrear (E2)."""


class PostreCrear(ProductoCrear):
    CATEGORIA = Categoria.POSTRE
    MENSAJE_NOMBRE_REPETIDO = "El postre ya está registrado"  # S13

    ingredientes: list[Texto[1, 100]] = Field(min_length=1, max_length=50)


class PostreModificar(PostreCrear, ProductoModificar):
    """Modificacion de un postre: las reglas y los mensajes salen de PostreCrear (F1)."""


class BebidaCrear(ProductoCrear):
    CATEGORIA = Categoria.BEBIDA
    MENSAJE_NOMBRE_REPETIDO = "La bebida ya está registrada"  # S43
    # ingredientes: se hereda opcional de ProductoCrear (S44)


class BebidaModificar(BebidaCrear, ProductoModificar):
    """Modificacion de una bebida: las reglas y los mensajes salen de BebidaCrear (G1)."""


class ProductoSalida(BaseModel):
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


class ProductoCarta(BaseModel):
    id: int
    nombre: str
    categoria: Categoria
    precio: Decimal
    descripcion: str | None
    etiquetas: list[str]
    imagen_url: str | None
    estado: Estado

    @field_serializer("precio")
    def _precio_con_dos_decimales(self, precio: Decimal) -> str:
        return f"{precio:.2f}"


class SeccionCarta(BaseModel):
    id: int
    nombre: str
    orden: int
    estado: Estado
    productos: list[ProductoCarta]
