"""Parametros y respuesta paginada (limit 50 por defecto, maximo 100)."""

from pydantic import BaseModel, Field
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

LIMIT_POR_DEFECTO = 50
LIMIT_MAXIMO = 100


class ParametrosPaginacion(BaseModel):
    limit: int = Field(default=LIMIT_POR_DEFECTO, ge=1, le=LIMIT_MAXIMO)
    offset: int = Field(default=0, ge=0)


class Pagina[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


def contar(db: Session, consulta: Select) -> int:
    """Cuenta en la base las filas que devuelve la consulta, sin cargarlas (D-11)."""
    total = db.scalar(select(func.count()).select_from(consulta.order_by(None).subquery()))
    return total or 0


def aplicar(consulta: Select, parametros: ParametrosPaginacion) -> Select:
    """Recorta la consulta a la pagina pedida."""
    return consulta.limit(parametros.limit).offset(parametros.offset)
