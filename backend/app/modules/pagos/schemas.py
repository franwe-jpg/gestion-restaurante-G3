"""pagos: entrada y salida de la API."""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    StrictInt,
    StringConstraints,
    field_validator,
)

from app.modules.pagos.models import EstadoFactura, TipoMedioPago
from app.shared.models import Estado
from app.shared.paginacion import ParametrosPaginacion

NOMBRE_MEDIO_PAGO_MINIMO = 3
NOMBRE_MEDIO_PAGO_MAXIMO = 50
DESCRIPCION_MEDIO_PAGO_MAXIMA = 200
# Letras (con acentos y ñ), numeros, espacios, punto y guion (CA 5 de #74, S6).
PATRON_NOMBRE_MEDIO_PAGO = r"^[\p{L}\p{N} .\-]+$"

NombreMedioPago = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=NOMBRE_MEDIO_PAGO_MINIMO,
        max_length=NOMBRE_MEDIO_PAGO_MAXIMO,
        pattern=PATRON_NOMBRE_MEDIO_PAGO,
    ),
]
DescripcionMedioPago = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=DESCRIPCION_MEDIO_PAGO_MAXIMA),
]


class MedioPagoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # estado no se recibe (CA 8 de #74)

    nombre: NombreMedioPago
    tipo: TipoMedioPago
    descripcion: DescripcionMedioPago | None = None

    @field_validator("descripcion")
    @classmethod
    def _descripcion_vacia_es_none(cls, descripcion: str | None) -> str | None:
        return descripcion or None


class MedioPagoModificar(MedioPagoCrear):
    """Reemplazo completo: mismas reglas que el alta y el estado obligatorio (HU-M6-05)."""

    estado: Estado


class MedioPagoSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    tipo: TipoMedioPago
    descripcion: str | None
    estado: Estado


class FiltroMediosPago(ParametrosPaginacion):
    """Paginacion de GET /medios-de-pago; por defecto solo los habilitados (S2)."""

    incluir_deshabilitados: bool = False


# Importes como cadenas con 2 decimales, igual que Productos.
Importe = Annotated[Decimal, PlainSerializer(lambda valor: f"{valor:.2f}", return_type=str)]
# SQLite devuelve las fechas sin zona: se guardan en UTC.
InstanteUTC = Annotated[
    datetime, AfterValidator(lambda valor: valor.replace(tzinfo=valor.tzinfo or UTC))
]


class CobroCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    medio_pago_id: StrictInt = Field(gt=0)
    monto: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class FacturaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comanda_id: StrictInt = Field(gt=0)
    cobro: CobroCrear


class DetalleFacturaSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    producto_id: int | None
    menu_ejecutivo_id: int | None
    descripcion: str
    cantidad: int
    precio_unitario: Importe
    descuento: Importe
    subtotal: Importe


class CobroSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_comprobante: int | None
    monto: Importe
    fecha_hora: InstanteUTC
    medio_pago_id: int


class FacturaPrevia(BaseModel):
    comanda_id: int
    fecha_emision: InstanteUTC
    total: Importe
    detalles: list[DetalleFacturaSalida]


class FacturaSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    comanda_id: int
    fecha_emision: InstanteUTC
    total: Importe
    saldo_pendiente: Importe
    estado: EstadoFactura
    detalles: list[DetalleFacturaSalida]
    cobros: list[CobroSalida]


class FacturaResumenSalida(BaseModel):
    """Fila del listado de facturas para la pantalla de cobro (HU-M6-02)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    comanda_id: int
    fecha_emision: InstanteUTC
    total: Importe
    saldo_pendiente: Importe
    estado: EstadoFactura


class MedioPagoDelComprobante(BaseModel):
    """Medio de pago tal como figura en el comprobante (HU-M6-03)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    tipo: TipoMedioPago


class ComprobanteSalida(BaseModel):
    """Comprobante de un cobro: sus datos y la factura y comanda a las que pertenece (HU-M6-03)."""

    numero_comprobante: int
    fecha_hora: InstanteUTC
    monto: Importe
    medio_pago: MedioPagoDelComprobante
    cobro_id: int
    factura_id: int
    comanda_id: int
    total_factura: Importe
    saldo_pendiente: Importe


class CobradoPorMedio(BaseModel):
    """Cobros de un medio de pago en un intervalo (S4-06, HU-M6-08)."""

    model_config = ConfigDict(from_attributes=True)

    medio_pago_id: int
    nombre: str
    tipo: TipoMedioPago
    cantidad_cobros: int
    monto: Importe


class AdeudadoSalida(BaseModel):
    cantidad_facturas: int
    monto: Importe


class CajaDelDiaSalida(BaseModel):
    fecha: date
    por_medio_pago: list[CobradoPorMedio]
    total_cobrado: Importe
    adeudado: AdeudadoSalida


class ResumenRecaudacion(BaseModel):
    """Recaudación de un período por medio de pago y deuda de sus facturas (HU-M6-08)."""

    fecha_desde: date
    fecha_hasta: date
    por_medio_pago: list[CobradoPorMedio]
    total_cobrado: Importe
    adeudado: AdeudadoSalida
