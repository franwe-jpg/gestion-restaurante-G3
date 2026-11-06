"""pagos: acceso a datos. Nunca confirma la transaccion: lo hace el service (D-10)."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.pagos.models import Cobro, Factura, MedioPago
from app.shared.models import Estado
from app.shared.paginacion import ParametrosPaginacion, aplicar, contar


def existe_nombre_normalizado(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool:
    """Busca el nombre solo entre los medios no eliminados (S3)."""
    consulta = select(MedioPago.id).where(
        MedioPago.nombre_normalizado == nombre_normalizado,
        MedioPago.eliminado.is_(False),
    )
    if excluir_id is not None:
        consulta = consulta.where(MedioPago.id != excluir_id)
    return db.scalar(consulta.limit(1)) is not None


def obtener_medio_pago(db: Session, medio_pago_id: int) -> MedioPago | None:
    """Devuelve el medio de pago, o None si no existe o fue eliminado."""
    medio = db.get(MedioPago, medio_pago_id)
    if medio is None or medio.eliminado:
        return None
    return medio


def agregar(db: Session, medio: MedioPago) -> None:
    db.add(medio)
    db.flush()


def listar_medios_pago(
    db: Session, parametros: ParametrosPaginacion, incluir_deshabilitados: bool
) -> tuple[list[MedioPago], int]:
    """Pagina de medios no eliminados ordenada por nombre y el total (HU-M6-07)."""
    consulta = select(MedioPago).where(MedioPago.eliminado.is_(False))
    if not incluir_deshabilitados:
        consulta = consulta.where(MedioPago.estado == Estado.HABILITADO)
    ordenada = consulta.order_by(MedioPago.nombre_normalizado, MedioPago.id)
    filas = db.scalars(aplicar(ordenada, parametros)).all()
    return list(filas), contar(db, consulta)


def existe_factura_de_comanda(db: Session, comanda_id: int) -> bool:
    return (
        db.scalar(select(Factura.id).where(Factura.comanda_id == comanda_id).limit(1)) is not None
    )


def obtener_factura(db: Session, factura_id: int) -> Factura | None:
    return db.get(Factura, factura_id)


def listar_facturas(db: Session, parametros: ParametrosPaginacion) -> tuple[list[Factura], int]:
    """Pagina de facturas, de la mas reciente a la mas vieja (HU-M6-02)."""
    consulta = select(Factura).order_by(Factura.fecha_emision.desc(), Factura.id.desc())
    filas = db.scalars(aplicar(consulta, parametros)).all()
    return list(filas), contar(db, consulta)


def existe_cobro_con_medio(db: Session, factura_id: int, medio_pago_id: int) -> bool:
    consulta = select(Cobro.id).where(
        Cobro.factura_id == factura_id,
        Cobro.medio_pago_id == medio_pago_id,
    )
    return db.scalar(consulta.limit(1)) is not None


def agregar_factura(db: Session, factura: Factura) -> None:
    db.add(factura)
    db.flush()


def agregar_cobro(db: Session, cobro: Cobro) -> None:
    db.add(cobro)
    db.flush()


def obtener_cobro_por_comprobante(db: Session, numero_comprobante: int) -> Cobro | None:
    """Cobro con ese numero de comprobante, con su factura (HU-M6-03)."""
    consulta = (
        select(Cobro)
        .where(Cobro.numero_comprobante == numero_comprobante)
        .options(selectinload(Cobro.factura))
    )
    return db.scalar(consulta)


def obtener_medio_pago_aunque_eliminado(db: Session, medio_pago_id: int) -> MedioPago | None:
    """El comprobante muestra el medio del cobro aunque luego se haya eliminado (S4)."""
    return db.get(MedioPago, medio_pago_id)
