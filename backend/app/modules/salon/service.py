"""salon: reglas de negocio y transacciones."""

from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.salon import personas, reporte, repository
from app.modules.salon.models import Mesa, Mozo, Sector
from app.modules.salon.schemas import (
    ChefCrear,
    ChefModificar,
    ChefSalida,
    MesaCrear,
    MesaModificar,
    MesaSalida,
    MozoCrear,
    MozoModificar,
    MozoSalida,
    ReporteMesasVentasPorMozo,
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


def _mesa_existente(db: Session, mesa_id: int) -> Mesa:
    mesa = repository.obtener_mesa(db, mesa_id)
    if mesa is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")
    return mesa


def obtener_mesa(db: Session, mesa_id: int) -> MesaSalida:
    """Consulta una mesa con su sector y estado; no modifica datos (HU-M4-04)."""
    mesa = _mesa_existente(db, mesa_id)
    return _a_salida(mesa, repository.obtener_sector(db, mesa.sector_id))


def ocupar_mesa(db: Session, mesa_id: int) -> None:
    """LIBRE -> OCUPADA sin commit: quien llama cierra la transaccion (HU-M4-04)."""
    mesa = _mesa_existente(db, mesa_id)
    if mesa.estado != EstadoMesa.LIBRE:
        raise ReglaDeNegocioError(f"La mesa {mesa.numero} no está libre")
    mesa.estado = EstadoMesa.OCUPADA


def liberar_mesa(db: Session, mesa_id: int) -> None:
    """OCUPADA -> LIBRE sin commit al cerrar la comanda (HU-M4-09).

    Si la mesa no está OCUPADA no la cambia ni falla: el cierre no depende de su estado.
    """
    mesa = _mesa_existente(db, mesa_id)
    if mesa.estado == EstadoMesa.OCUPADA:
        mesa.estado = EstadoMesa.LIBRE


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


def crear_mozo(db: Session, datos: MozoCrear) -> MozoSalida:
    """Alta de mozo y de su usuario en una transaccion (HU-M3-09, HU-TR-01)."""
    return personas.crear(db, personas.MOZO, datos)


def modificar_mozo(db: Session, mozo_id: int, datos: MozoModificar) -> MozoSalida:
    """Reemplazo completo de los datos y las credenciales; el estado no se toca (HU-M3-10)."""
    return personas.modificar(db, personas.MOZO, mozo_id, datos)


def dar_de_baja_mozo(db: Session, mozo_id: int) -> MozoSalida:
    """Baja lógica: el mozo y su usuario quedan deshabilitados (HU-M3-11, S4)."""
    return personas.dar_de_baja(db, personas.MOZO, mozo_id)


def listar_mozos(
    db: Session,
    parametros: ParametrosPaginacion,
    estado: Estado | None = None,
    q: str | None = None,
) -> Pagina[MozoSalida]:
    """Listado paginado de mozos; con `estado=HABILITADO` son los disponibles (HU-M3-12)."""
    return personas.listar(db, personas.MOZO, parametros, estado, q)


def crear_chef(db: Session, datos: ChefCrear) -> ChefSalida:
    """Alta de chef y de su usuario en una transaccion (HU-TR-01)."""
    return personas.crear(db, personas.CHEF, datos)


def modificar_chef(db: Session, chef_id: int, datos: ChefModificar) -> ChefSalida:
    """Reemplazo completo de los datos y las credenciales del chef (HU-TR-01)."""
    return personas.modificar(db, personas.CHEF, chef_id, datos)


def dar_de_baja_chef(db: Session, chef_id: int) -> ChefSalida:
    """Baja lógica: el chef y su usuario quedan deshabilitados (HU-TR-01, S4)."""
    return personas.dar_de_baja(db, personas.CHEF, chef_id)


def listar_chefs(
    db: Session, parametros: ParametrosPaginacion, estado: Estado | None = None
) -> Pagina[ChefSalida]:
    """Listado paginado de chefs (HU-TR-01)."""
    return personas.listar(db, personas.CHEF, parametros, estado)


def validar_mozo_habilitado(db: Session, mozo_id: int) -> MozoSalida:
    """Valida que el mozo exista y esté habilitado para una comanda nueva."""
    mozo = repository.obtener_persona(db, Mozo, mozo_id)
    if mozo is None:
        raise NoEncontradoError(f"El mozo {mozo_id} no existe")
    if mozo.estado != Estado.HABILITADO:
        raise ReglaDeNegocioError(f"El mozo {mozo_id} está deshabilitado")
    return MozoSalida.model_validate(mozo)


def generar_reporte_mozos(
    db: Session,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    mozo_id: int | None = None,
    sector_id: int | None = None,
) -> ReporteMesasVentasPorMozo:
    """Mesas atendidas y ventas por mozo en el período (HU-M3-13). Solo lectura."""
    desde, hasta = reporte.validar_periodo(fecha_desde, fecha_hasta)
    mozos = repository.mozos_para_reporte(db, mozo_id)
    mesas = repository.ids_mesas_del_sector(db, sector_id) if sector_id is not None else None
    inicio, fin = reporte.intervalo_utc(desde, hasta)
    ventas = atencion_service.sumar_ventas_por_mozo_mesa(db, inicio, fin, mesas)
    return reporte.armar_reporte(desde, hasta, reporte.armar_lineas(mozos, ventas))
