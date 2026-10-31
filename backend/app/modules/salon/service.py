"""salon: reglas de negocio y transacciones."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.salon import repository
from app.modules.salon.models import Mesa, Mozo, Sector
from app.modules.salon.schemas import (
    MesaCrear,
    MesaModificar,
    MesaSalida,
    MozoCrear,
    MozoModificar,
    MozoSalida,
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


def modificar_mesa(db: Session, mesa_id: int, datos: MesaModificar) -> MesaSalida:
    """Reemplazo completo de numero, capacidad y sector; el estado no se toca (HU-M3-06)."""
    mesa = repository.obtener_mesa(db, mesa_id)
    if mesa is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")
    sector = _validar_sector_habilitado(db, datos.sector_id)
    if repository.existe_numero_en_sector(db, sector.id, datos.numero, mesa.id):
        raise ReglaDeNegocioError(f"La mesa {datos.numero} ya existe en el sector {sector.nombre}")
    mesa.numero = datos.numero
    mesa.capacidad = datos.capacidad
    mesa.sector_id = sector.id
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(
            f"La mesa {datos.numero} ya existe en el sector {sector.nombre}"
        ) from error
    return _a_salida(mesa, sector)


def eliminar_mesa(db: Session, mesa_id: int) -> None:
    """Borra la mesa; una mesa ocupada tiene una comanda abierta y no se elimina (HU-M3-07)."""
    mesa = repository.obtener_mesa(db, mesa_id)
    if mesa is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")
    if mesa.estado == EstadoMesa.OCUPADA:
        raise ReglaDeNegocioError(f"No se puede eliminar la mesa {mesa.numero} porque está ocupada")
    repository.eliminar(db, mesa)
    db.commit()


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


def _validar_dni_libre(db: Session, dni: str, excluir_id: int | None = None) -> None:
    if repository.existe_dni(db, dni, excluir_id):
        raise ReglaDeNegocioError(f"Ya existe un mozo con el DNI {dni}")


def _guardar_mozo(db: Session, datos: MozoCrear) -> Mozo:
    mozo = Mozo(
        dni=datos.dni,
        nombre=datos.nombre,
        apellido=datos.apellido,
        telefono=datos.telefono,
        estado=Estado.HABILITADO,
    )
    try:
        repository.agregar(db, mozo)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(f"Ya existe un mozo con el DNI {datos.dni}") from error
    return mozo


def crear_mozo(db: Session, datos: MozoCrear) -> MozoSalida:
    """Alta de mozo: el sistema lo deja Habilitado (HU-M3-09)."""
    _validar_dni_libre(db, datos.dni)
    return MozoSalida.model_validate(_guardar_mozo(db, datos))


def modificar_mozo(db: Session, mozo_id: int, datos: MozoModificar) -> MozoSalida:
    """Reemplazo completo de los datos; el estado no se toca (HU-M3-10)."""
    mozo = repository.obtener_mozo(db, mozo_id)
    if mozo is None:
        raise NoEncontradoError(f"El mozo {mozo_id} no existe")
    _validar_dni_libre(db, datos.dni, mozo.id)
    mozo.dni = datos.dni
    mozo.nombre = datos.nombre
    mozo.apellido = datos.apellido
    mozo.telefono = datos.telefono
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ReglaDeNegocioError(f"Ya existe un mozo con el DNI {datos.dni}") from error
    return MozoSalida.model_validate(mozo)


def dar_de_baja_mozo(db: Session, mozo_id: int) -> MozoSalida:
    """Baja lógica: el mozo deja de estar disponible y conserva sus datos (HU-M3-11)."""
    mozo = repository.obtener_mozo(db, mozo_id)
    if mozo is None:
        raise NoEncontradoError(f"El mozo {mozo_id} no existe")
    if mozo.estado == Estado.DESHABILITADO:
        raise ReglaDeNegocioError("El mozo ya está dado de baja")
    mozo.estado = Estado.DESHABILITADO
    db.commit()
    return MozoSalida.model_validate(mozo)


def listar_mozos(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None = None
) -> Pagina[MozoSalida]:
    """Listado paginado de mozos; con `estado=HABILITADO` son los disponibles (HU-M3-12)."""
    mozos, total = repository.listar_mozos(db, parametros, estado)
    return Pagina[MozoSalida](
        items=[MozoSalida.model_validate(mozo) for mozo in mozos],
        total=total,
        limit=parametros.limit,
        offset=parametros.offset,
    )
