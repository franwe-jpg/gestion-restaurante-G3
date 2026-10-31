"""Reglas de edición y consulta de clientes."""

from sqlalchemy.orm import Session

from app.modules.atencion import repository
from app.modules.atencion.schemas import ClienteModificar, ClienteSalida
from app.shared.excepciones import NoEncontradoError
from app.shared.paginacion import Pagina, ParametrosPaginacion


def modificar_cliente(db: Session, cliente_id: int, datos: ClienteModificar) -> ClienteSalida:
    cliente = repository.obtener_cliente(db, cliente_id)
    if cliente is None:
        raise NoEncontradoError(f"El cliente {cliente_id} no existe")
    cliente.nombre = datos.nombre
    cliente.telefono = datos.telefono
    db.commit()
    return ClienteSalida.model_validate(cliente)


def listar_clientes(
    db: Session, parametros: ParametrosPaginacion, q: str | None = None
) -> Pagina[ClienteSalida]:
    clientes, total = repository.listar_clientes(db, parametros, q)
    return Pagina[ClienteSalida](
        items=[ClienteSalida.model_validate(cliente) for cliente in clientes],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )
