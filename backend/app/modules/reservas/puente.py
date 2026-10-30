"""reservas: puente con Mesa (M3) y Cliente (M4).

Hoy son stubs: toda mesa y todo cliente con id positivo existen. Cuando M3 y M4 expongan lo
necesario en su `service`, solo cambia el cuerpo de estas funciones; las reglas del `service` de
reservas no se tocan. El `service` las llama siempre como `puente.obtener_mesa(...)` para que las
pruebas puedan reemplazarlas. El puente no informa la capacidad de la mesa: la cantidad de
personas no se valida contra ella (issue #61, se resuelve en forma presencial).
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session


@dataclass(frozen=True)
class MesaReservable:
    id: int


def obtener_mesa(db: Session, mesa_id: int) -> MesaReservable | None:
    """Stub hasta que M3 exponga la consulta de mesas (S4): toda mesa positiva existe."""
    return MesaReservable(id=mesa_id) if mesa_id > 0 else None


def existe_cliente(db: Session, cliente_id: int) -> bool:
    """Stub hasta que M4 exponga Cliente (S6): todo cliente positivo existe."""
    return cliente_id > 0
