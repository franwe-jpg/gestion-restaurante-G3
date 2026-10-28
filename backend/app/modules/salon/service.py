"""salon: reglas de negocio y transacciones."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon import repository
from app.modules.salon.models import Mesa, Sector
from app.modules.salon.schemas import (
    MesaCrear,
    MesaSalida,
    SectorCrear,
    SectorModificar,
    SectorResumen,
    SectorSalida,
)
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import Pagina, ParametrosPaginacion


def _validar_nombre_libre(db: Session, nombre: str, excluir_id: int | None = None) -> None:
    if repository.existe_nombre_normalizado(db, nombre.strip().casefold(), excluir_id):
        raise ReglaDeNegocioError("El sector ya existe")


def _guardar(db: Session, datos: SectorCrear) -> Sector:
    sector = Sector(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        estado=Estado.HABILITADO,
    )
    try:
        repository.agregar(db, sector)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError("El sector ya existe") from error
    return sector


def crear_sector(db: Session, datos: SectorCrear) -> SectorSalida:
    _validar_nombre_libre(db, datos.nombre)
    return SectorSalida.model_validate(_guardar(db, datos))


def _actualizar(db: Session, sector: Sector, datos: SectorModificar) -> Sector:
    """Asigna sobre la entidad cargada: el validador mantiene el nombre normalizado (M5)."""
    sector.nombre = datos.nombre
    sector.descripcion = datos.descripcion
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError("El sector ya existe") from error
    return sector


def modificar_sector(db: Session, sector_id: int, datos: SectorModificar) -> SectorSalida:
    """Reemplazo completo; el estado no se toca (M4, M5 y M6)."""
    sector = repository.obtener_sector(db, sector_id)
    if sector is None:
        raise NoEncontradoError(f"El sector {sector_id} no existe")
    _validar_nombre_libre(db, datos.nombre, sector.id)
    return SectorSalida.model_validate(_actualizar(db, sector, datos))


def _validar_sector_habilitado(db: Session, sector_id: int) -> Sector:
    sector = repository.obtener_sector(db, sector_id)
    if sector is None:
        raise NoEncontradoError(f"El sector {sector_id} no existe")
    if sector.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"El sector {sector.nombre} está deshabilitado")
    return sector


def _validar_numero_libre(db: Session, sector: Sector, numero: int) -> None:
    if repository.existe_numero_en_sector(db, sector.id, numero):
        raise ReglaDeNegocioError(f"La mesa {numero} ya existe en el sector {sector.nombre}")


def _guardar_mesa(db: Session, datos: MesaCrear, sector: Sector) -> Mesa:
    mesa = Mesa(
        numero=datos.numero,
        capacidad=datos.capacidad,
        sector_id=sector.id,
        estado=EstadoMesa.LIBRE,
    )
    mensaje = f"La mesa {datos.numero} ya existe en el sector {sector.nombre}"
    try:
        repository.agregar(db, mesa)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(mensaje) from error
    return mesa


def _a_salida(mesa: Mesa, sector: Sector) -> MesaSalida:
    return MesaSalida(
        id=mesa.id,
        numero=mesa.numero,
        capacidad=mesa.capacidad,
        sector=SectorResumen(id=sector.id, nombre=sector.nombre),
        estado=mesa.estado,
    )


def crear_mesa(db: Session, datos: MesaCrear) -> MesaSalida:
    sector = _validar_sector_habilitado(db, datos.sector_id)
    _validar_numero_libre(db, sector, datos.numero)
    return _a_salida(_guardar_mesa(db, datos, sector), sector)


def listar_sectores(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None = None
) -> Pagina[SectorSalida]:
    sectores, total = repository.listar_sectores(db, parametros, estado)
    return Pagina[SectorSalida](
        items=[SectorSalida.model_validate(sector) for sector in sectores],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )


def dar_de_baja_sector(db: Session, sector_id: int) -> SectorSalida:
    """Baja logica: el sector deja de estar disponible y conserva sus datos (HU-M3-03)."""
    sector = repository.obtener_sector(db, sector_id)
    if sector is None:
        raise NoEncontradoError(f"El sector {sector_id} no existe")
    if sector.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("El sector ya está deshabilitado")
    if repository.contar_mesas_del_sector(db, sector.id) > 0:
        raise ReglaDeNegocioError(
            f"No se puede eliminar el sector {sector.nombre} porque tiene mesas asociadas"
        )
    sector.estado = Estado.DESHABILITADO
    db.commit()
    return SectorSalida.model_validate(sector)


def listar_mesas(db: Session, parametros: ParametrosPaginacion) -> Pagina[MesaSalida]:
    """Listado paginado de mesas con su sector (HU-M3-08)."""
    filas, total = repository.listar_mesas(db, parametros)
    return Pagina[MesaSalida](
        items=[_a_salida(mesa, sector) for mesa, sector in filas],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )
