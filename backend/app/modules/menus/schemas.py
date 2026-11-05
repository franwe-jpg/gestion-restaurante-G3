"""menus: entrada y salida de la API."""

from datetime import date, datetime, time
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
    model_validator,
)

from app.modules.menus.models import DiaSemana, TipoPromocion
from app.shared.models import Categoria, Estado
from app.shared.paginacion import ParametrosPaginacion

# Mismas restricciones que `productos.schemas` (S3, S4, S5): el menu del dia es un Producto,
# pero este modulo no puede importar los schemas de productos (contrato de importaciones).
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Descripcion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Ingrediente = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Etiqueta = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]

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


def _sin_repetidos(textos: list[str], mensaje: str) -> list[str]:
    if len({texto.casefold() for texto in textos}) != len(textos):
        raise ValueError(mensaje)
    return textos


class SeccionResumen(BaseModel):
    id: int
    nombre: str


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


class ProductoResumen(BaseModel):
    id: int
    nombre: str
    categoria: Categoria
    estado: Estado


class PromocionCrear(BaseModel):
    """Alta de una promocion: el estado lo fija el sistema en HABILITADO (HU-M2-07)."""

    model_config = ConfigDict(extra="forbid")

    nombre: NombreMenu
    tipo: TipoPromocion
    descripcion: DescripcionMenu | None = None
    producto_ids: list[IdPositivo] = Field(min_length=1)
    fecha_desde: date
    fecha_hasta: date
    dias_semana: list[DiaSemana] = Field(min_length=1)
    hora_desde: time | None = None
    hora_hasta: time | None = None
    descuento_porcentaje: StrictInt | None = Field(default=None, ge=1, le=100)
    precio_fijo: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    cant_lleva: StrictInt | None = Field(default=None, gt=0)
    cant_paga: StrictInt | None = Field(default=None, gt=0)

    @field_validator("producto_ids")
    @classmethod
    def _rechazar_productos_repetidos(cls, producto_ids: list[int]) -> list[int]:
        if len(set(producto_ids)) != len(producto_ids):
            raise ValueError("La lista no puede repetir productos")
        return producto_ids

    @field_validator("dias_semana")
    @classmethod
    def _rechazar_dias_repetidos(cls, dias: list[DiaSemana]) -> list[DiaSemana]:
        if len(set(dias)) != len(dias):
            raise ValueError("Los días no pueden repetirse")
        return dias

    @field_validator("descripcion")
    @classmethod
    def _descripcion_vacia_es_none(cls, descripcion: str | None) -> str | None:
        return descripcion or None

    @model_validator(mode="after")
    def _validar_reglas(self) -> "PromocionCrear":
        if self.fecha_hasta < self.fecha_desde:
            raise ValueError("La fecha hasta no puede ser anterior a la fecha desde")
        if (self.hora_desde is None) != (self.hora_hasta is None):
            raise ValueError("La franja horaria debe tener hora desde y hora hasta, o ninguna")
        if (
            self.hora_desde is not None
            and self.hora_hasta is not None
            and self.hora_hasta <= self.hora_desde
        ):
            raise ValueError("La hora hasta debe ser posterior a la hora desde")
        self._validar_campos_del_tipo()
        return self

    def _validar_campos_del_tipo(self) -> None:
        if self.tipo == TipoPromocion.PORCENTAJE:
            self._validar_porcentaje()
        elif self.tipo == TipoPromocion.PRECIO_FIJO:
            self._validar_precio_fijo()
        else:
            self._validar_nxm()

    def _validar_porcentaje(self) -> None:
        if self.descuento_porcentaje is None:
            raise ValueError("El descuento en porcentaje es obligatorio para el tipo PORCENTAJE")
        if any(valor is not None for valor in (self.precio_fijo, self.cant_lleva, self.cant_paga)):
            raise ValueError("El tipo PORCENTAJE no admite precio fijo ni cantidades")

    def _validar_precio_fijo(self) -> None:
        if self.precio_fijo is None:
            raise ValueError("El precio fijo es obligatorio para el tipo PRECIO_FIJO")
        if any(
            valor is not None
            for valor in (self.descuento_porcentaje, self.cant_lleva, self.cant_paga)
        ):
            raise ValueError("El tipo PRECIO_FIJO no admite descuento ni cantidades")

    def _validar_nxm(self) -> None:
        if self.cant_lleva is None or self.cant_paga is None:
            raise ValueError("Las cantidades son obligatorias para el tipo NXM")
        if self.cant_paga >= self.cant_lleva:
            raise ValueError("La cantidad que paga debe ser menor que la cantidad que lleva")
        if any(valor is not None for valor in (self.descuento_porcentaje, self.precio_fijo)):
            raise ValueError("El tipo NXM no admite descuento ni precio fijo")


class PromocionModificar(PromocionCrear):
    """Reemplazo completo del alta; el estado no se recibe (HU-M2-08)."""


class PromocionSalida(BaseModel):
    id: int
    nombre: str
    tipo: TipoPromocion
    descripcion: str | None
    fecha_desde: date
    fecha_hasta: date
    dias_semana: list[DiaSemana]
    hora_desde: time | None
    hora_hasta: time | None
    descuento_porcentaje: int | None
    precio_fijo: Decimal | None
    cant_lleva: int | None
    cant_paga: int | None
    estado: Estado
    fecha_hora_finalizacion: datetime | None
    productos: list[ProductoResumen]

    @field_serializer("precio_fijo")
    def _precio_con_dos_decimales(self, precio_fijo: Decimal | None) -> str | None:
        return None if precio_fijo is None else f"{precio_fijo:.2f}"

    @field_serializer("hora_desde", "hora_hasta")
    def _hora_sin_segundos(self, hora: time | None) -> str | None:
        return None if hora is None else hora.strftime("%H:%M")


class PromocionListado(PromocionSalida):
    """Datos que muestra una fila del listado de promociones."""


class FiltroPromociones(ParametrosPaginacion):
    """Paginación y filtro de estado del listado de promociones."""

    estado: Estado | None = None


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
