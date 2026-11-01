"""pagos: entrada y salida de la API."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.modules.pagos.models import TipoMedioPago
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
