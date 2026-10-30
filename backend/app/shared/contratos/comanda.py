"""Provisional Comanda data contract; not an approved production API."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field, StrictInt, field_serializer, model_validator


class EstadoComanda(StrEnum):
    ABIERTA = "ABIERTA"
    CERRADA = "CERRADA"
    ANULADA = "ANULADA"


class EstadoEntrega(StrEnum):
    PENDIENTE = "PENDIENTE"
    ENTREGADO = "ENTREGADO"


class DetalleComandaCrear(BaseModel):
    producto_id: StrictInt | None = Field(default=None, gt=0)
    menu_ejecutivo_id: StrictInt | None = Field(default=None, gt=0)
    cantidad: StrictInt = Field(gt=0)

    @model_validator(mode="after")
    def _una_referencia(self) -> "DetalleComandaCrear":
        if (self.producto_id is None) == (self.menu_ejecutivo_id is None):
            raise ValueError("Indique un producto o un menú ejecutivo, exclusivamente")
        return self


class ComandaCrear(BaseModel):
    mesa_id: StrictInt = Field(gt=0)
    detalles: list[DetalleComandaCrear] = Field(min_length=1)
    observaciones: str | None = None


class DetalleComandaSalida(DetalleComandaCrear):
    precio_unitario: Decimal = Field(gt=0, decimal_places=2)
    descuento: Decimal = Field(ge=0, decimal_places=2)
    promocion_id: int | None = None
    estado_entrega: EstadoEntrega

    @field_serializer("precio_unitario", "descuento")
    def _importe(self, valor: Decimal) -> str:
        return f"{valor:.2f}"


class ComandaResumen(BaseModel):
    id: int
    mesa_id: int
    estado: EstadoComanda
    fecha_hora: datetime


class ComandaSalida(ComandaResumen):
    reserva_id: int | None = None
    observaciones: str | None = None
    detalles: list[DetalleComandaSalida]
