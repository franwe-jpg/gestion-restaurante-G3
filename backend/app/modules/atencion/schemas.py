"""Esquemas de Cliente y metadatos de Comanda; las salidas usan S2-01."""

import re

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

from app.shared.contratos.comanda import DetalleComandaCrear, EstadoComanda, EstadoEntrega
from app.shared.paginacion import ParametrosPaginacion


class DetallePendiente(DetalleComandaCrear):
    id: int


class PendientesComanda(BaseModel):
    comanda_id: int
    pendientes: list[DetallePendiente]


class EntregaDetalle(BaseModel):
    """Cantidad entregada absoluta de una línea; el tope depende del detalle (service)."""

    model_config = ConfigDict(extra="forbid")

    cantidad_entregada: StrictInt = Field(ge=0)


class DetalleEntrega(DetallePendiente):
    cantidad_entregada: int
    estado_entrega: EstadoEntrega


class EntregasComanda(BaseModel):
    comanda_id: int
    estado: EstadoComanda
    detalles: list[DetalleEntrega]


class ClienteNuevo(BaseModel):
    """Datos del cliente nuevo; no registra clientes sin reserva."""

    nombre: str
    telefono: str

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, nombre: str) -> str:
        if not nombre.strip():
            raise ValueError("nombre es obligatorio")
        if not all(letra.isalpha() or letra == " " for letra in nombre):
            raise ValueError("nombre solo admite letras y espacios")
        return nombre

    @field_validator("telefono")
    @classmethod
    def validar_telefono(cls, telefono: str) -> str:
        if not telefono.strip():
            raise ValueError("telefono es obligatorio")
        if re.fullmatch(r"\+?[0-9 -]+", telefono) is None:
            raise ValueError("telefono solo admite dígitos, espacios, guiones y + al inicio")
        return telefono


class ClienteModificar(ClienteNuevo):
    """Sustitución completa de los datos de contacto de un cliente."""


class ClienteSalida(ClienteNuevo):
    """Datos públicos de un cliente registrado."""

    id: int

    model_config = {"from_attributes": True}


class FiltroClientes(ParametrosPaginacion):
    q: str | None = None
