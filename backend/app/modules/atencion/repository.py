"""Consultas y modificaciones persistentes de clientes."""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.atencion.models import Cliente
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def obtener_cliente(db: Session, cliente_id: int) -> Cliente | None:
    return db.get(Cliente, cliente_id)


def listar_clientes(
    db: Session, parametros: ParametrosPaginacion, q: str | None
) -> tuple[list[Cliente], int]:
    consulta = select(Cliente)
    if q:
        consulta = consulta.where(
            or_(Cliente.nombre.contains(q, autoescape=True), Cliente.telefono == q)
        )
    total = contar(db, consulta)
    items = list(db.scalars(aplicar(consulta.order_by(Cliente.id), parametros)).all())
    return items, total
