"""M4 operation metadata; order DTOs remain owned by S2-01."""

from pydantic import BaseModel

from app.shared.contratos.comanda import DetalleComandaCrear


class DetallePendiente(DetalleComandaCrear):
    id: int


class PendientesComanda(BaseModel):
    comanda_id: int
    pendientes: list[DetallePendiente]
