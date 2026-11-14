"""Carga datos de demostracion: `python -m scripts.cargar_datos_demo [--dias N] [--reiniciar]`.

Llena una base ya migrada (`alembic upgrade head`) para que cada pantalla y cada reporte muestren
datos: usuarios con sus roles, carta, menus, promociones, salon, medios de pago, clientes y el
historial de comandas, reservas, facturas y cobros de los ultimos `--dias` dias (91 por defecto,
unas 13 semanas), relativo al momento en que corre. Deja algunas comandas abiertas con sus mesas
ocupadas y reservas para los proximos dias.

El catalogo, las personas y lo que pasa "ahora" se cargan con el `service` de cada modulo; el
historial, con los models (ver `scripts.historial_demo`). Usa la base de `DATABASE_URL`. Si la
base ya tiene datos, avisa y no cambia nada. La semilla es fija: el mismo dia da los mismos datos.
Todos los usuarios tienen la contrasena `Resto123!` (solo para la demostracion).

Con `--reiniciar` descarta la base (borra el archivo de SQLite y sus archivos `-wal`, `-shm` y
`-journal`), la vuelve a crear con las migraciones y la llena. Solo admite SQLite en un archivo;
una ruta relativa se resuelve desde la carpeta en que se ejecuta, igual que en la app.
"""

import argparse
import random
import sys
from collections.abc import Iterator
from contextlib import AbstractContextManager, contextmanager
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

import sqlalchemy as sa
from alembic.config import Config
from sqlalchemy import func, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.config import get_settings
from app.database import SessionLocal, crear_motor, motor
from app.modules.atencion import adaptadores
from app.modules.atencion import service as atencion_service
from app.modules.atencion.schemas import EntregaDetalle, ListoDetalle
from app.modules.menus import service as menus_service
from app.modules.menus.models import DiaSemana
from app.modules.menus.schemas import MenuDelDiaCrear, MenuEjecutivoCrear, PromocionCrear
from app.modules.pagos import service as pagos_service
from app.modules.pagos.schemas import MedioPagoCrear
from app.modules.productos import service as productos_service
from app.modules.productos.schemas import (
    BebidaCrear,
    PlatoCrear,
    PostreCrear,
    ProductoCrear,
    SeccionCrear,
)
from app.modules.reservas import service as reservas_service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import ComandaDesdeReservaCrear, ReservaCrear
from app.modules.salon import service as salon_service
from app.modules.salon.schemas import ChefCrear, MesaCrear, MozoCrear, SectorCrear
from app.modules.usuarios import service as usuarios_service
from app.shared.contratos.comanda import ComandaCrear, DetalleComandaCrear
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria
from scripts import datos_demo as datos
from scripts.historial_demo import (
    ZONA_DEL_RESTAURANTE,
    Catalogo,
    MesaDemo,
    Vendible,
    Vigencia,
    cargar_historial,
)

DIAS_POR_DEFECTO = 91  # unas 13 semanas: la duracion de la cursada
SEMILLA = 2026
COMANDAS_ABIERTAS = 5
DIAS_DE_RESERVAS_FUTURAS = 14
HORAS_DE_RESERVA = (time(13, 0), time(13, 30), time(20, 30), time(21, 0), time(21, 30))
# Tablas que indican que la base ya tiene datos.
TABLAS_DE_CONTROL = ("usuarios", "secciones", "sectores", "medios_pago", "comandas")
ESQUEMAS_POR_CATEGORIA: dict[Categoria, type[ProductoCrear]] = {
    Categoria.PLATO: PlatoCrear,
    Categoria.POSTRE: PostreCrear,
    Categoria.BEBIDA: BebidaCrear,
}
ERRORES_DE_NEGOCIO = (DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError)
ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"
SUFIJOS_SQLITE = ("", "-wal", "-shm", "-journal")


class BaseNoReiniciableError(Exception):
    """La URL de la base no es un archivo de SQLite: `--reiniciar` no la borra."""


@dataclass(frozen=True)
class Contexto:
    """Lo que comparten las etapas de la carga."""

    rng: random.Random
    ahora: datetime  # UTC con zona
    catalogo: Catalogo
    promociones: dict[str, int]  # id por nombre

    @property
    def hoy(self) -> date:
        return self.ahora.astimezone(ZONA_DEL_RESTAURANTE).date()


def abrir_sesion() -> AbstractContextManager[Session]:
    return SessionLocal()


def contar_filas(db: Session) -> dict[str, int]:
    """Filas de cada tabla de la aplicacion, en orden alfabetico."""
    tablas = sorted(sa.inspect(db.get_bind()).get_table_names())
    return {
        tabla: db.scalar(select(func.count()).select_from(sa.table(tabla))) or 0
        for tabla in tablas
        if tabla != "alembic_version"
    }


def tiene_datos(db: Session) -> bool:
    filas = contar_filas(db)
    return any(filas.get(tabla, 0) > 0 for tabla in TABLAS_DE_CONTROL)


# --- Usuarios y personas (HU-TR-01, M3) -------------------------------------------------------


def _cargar_personas(db: Session) -> tuple[list[int], int | None]:
    """Encargado, mozos y chefs; cada mozo y chef queda vinculado a su usuario (A8)."""
    usuarios_service.crear_encargado(db, datos.CORREO_ENCARGADO, datos.CONTRASENA_DEMO)
    mozos: list[int] = []
    mozo_de_baja = None
    for persona in datos.MOZOS:
        mozo = salon_service.crear_mozo(db, MozoCrear(**_datos_persona(persona)))
        if persona.de_baja:
            mozo_de_baja = mozo.id
        else:
            mozos.append(mozo.id)
    for persona in datos.CHEFS:
        salon_service.crear_chef(db, ChefCrear(**_datos_persona(persona)))
    return mozos, mozo_de_baja


def _datos_persona(persona: datos.PersonaDemo) -> dict[str, str]:
    return {
        "dni": persona.dni,
        "nombre": persona.nombre,
        "apellido": persona.apellido,
        "telefono": persona.telefono,
        "correo": persona.correo,
        "contrasena": datos.CONTRASENA_DEMO,
    }


# --- Salon (M3) ---------------------------------------------------------------------------------


def _cargar_salon(db: Session) -> list[MesaDemo]:
    mesas: list[MesaDemo] = []
    for nombre, descripcion, numeros in datos.SECTORES:
        sector = salon_service.crear_sector(db, SectorCrear(nombre=nombre, descripcion=descripcion))
        for numero, capacidad in numeros:
            mesa = salon_service.crear_mesa(
                db, MesaCrear(numero=numero, capacidad=capacidad, sector_id=sector.id)
            )
            mesas.append(MesaDemo(mesa.id, mesa.capacidad))
    nombre, descripcion = datos.SECTOR_DE_BAJA
    sector = salon_service.crear_sector(db, SectorCrear(nombre=nombre, descripcion=descripcion))
    salon_service.dar_de_baja_sector(db, sector.id)
    return mesas


# --- Carta y menus (M1, M2) ---------------------------------------------------------------------


def _cargar_carta(db: Session) -> list[Vendible]:
    secciones = {
        nombre: productos_service.crear_seccion(db, SeccionCrear(nombre=nombre, orden=orden)).id
        for orden, nombre in enumerate(datos.SECCIONES, start=1)
    }
    vendibles = [_crear_producto(db, producto, secciones) for producto in datos.PRODUCTOS]
    for menu in datos.MENUS_DEL_DIA:
        salida = menus_service.crear_menu_del_dia(
            db,
            MenuDelDiaCrear(
                nombre=menu.nombre,
                seccion_id=secciones[menu.seccion],
                precio=Decimal(menu.precio),
                ingredientes=list(menu.ingredientes),
            ),
            None,
        )
        vendibles.append(_vendible(salida.id, menu))
    return vendibles


def _crear_producto(
    db: Session, producto: datos.ProductoDemo, secciones: dict[str, int]
) -> Vendible:
    esquema = ESQUEMAS_POR_CATEGORIA[producto.categoria]
    alta = esquema(
        nombre=producto.nombre,
        seccion_id=secciones[producto.seccion],
        precio=Decimal(producto.precio),
        ingredientes=list(producto.ingredientes),
        descripcion=producto.descripcion,
        etiquetas=list(producto.etiquetas),
    )
    return _vendible(productos_service.crear_producto(db, alta, None).id, producto)


def _vendible(producto_id: int, producto: datos.ProductoDemo) -> Vendible:
    return Vendible(
        id=producto_id,
        nombre=producto.nombre,
        seccion=producto.seccion,
        precio=Decimal(producto.precio),
        popularidad=producto.popularidad,
        categoria=producto.categoria,
        retirado=producto.retirado,
    )


def _cargar_menus_ejecutivos(db: Session, productos: list[Vendible]) -> list[Vendible]:
    ids = {producto.nombre: producto.id for producto in productos}
    seccion_id = productos_service.obtener_productos_por_ids(
        db, [ids[datos.MENUS_DEL_DIA[0].nombre]]
    )[0].seccion.id
    menus = []
    for menu in datos.MENUS_EJECUTIVOS:
        salida = menus_service.crear_menu_ejecutivo(
            db,
            MenuEjecutivoCrear(
                nombre=menu.nombre,
                precio_fijo=Decimal(menu.precio_fijo),
                producto_ids=[ids[nombre] for nombre in menu.productos],
                seccion_id=seccion_id,
                descripcion=menu.descripcion,
            ),
        )
        menus.append(
            Vendible(salida.id, salida.nombre, datos.SECCION_MENUS, salida.precio_fijo, 5, True)
        )
    return menus


def _cargar_promociones(db: Session, productos: list[Vendible], hoy: date) -> dict[str, int]:
    """Promociones vigentes, vencidas y futuras; devuelve los ids por nombre."""
    ids = {producto.nombre: producto.id for producto in productos}
    creadas = {}
    for promocion in datos.PROMOCIONES:
        horario = promocion.horario or (None, None)
        alta = PromocionCrear(
            nombre=promocion.nombre,
            tipo=promocion.tipo,
            descripcion=promocion.descripcion,
            producto_ids=[ids[nombre] for nombre in promocion.productos],
            fecha_desde=hoy + timedelta(days=promocion.desde_dias),
            fecha_hasta=hoy + timedelta(days=promocion.hasta_dias),
            dias_semana=list(promocion.dias_semana),
            hora_desde=time(horario[0]) if horario[0] is not None else None,
            hora_hasta=time(horario[1]) if horario[1] is not None else None,
            **_valores_del_tipo(promocion.valores),
        )
        creadas[promocion.nombre] = menus_service.crear_promocion(db, alta).id
    return creadas


def _valores_del_tipo(valores: dict[str, int | str]) -> dict[str, int | Decimal]:
    return {
        clave: Decimal(valor) if isinstance(valor, str) else valor
        for clave, valor in valores.items()
    }


# --- Pagos y clientes (M6, M4) ------------------------------------------------------------------


def _cargar_medios_pago(db: Session) -> list[tuple[int, int]]:
    medios = []
    for nombre, tipo, descripcion, peso in datos.MEDIOS_DE_PAGO:
        alta = MedioPagoCrear(nombre=nombre, tipo=tipo, descripcion=descripcion)
        medios.append((pagos_service.crear_medio_pago(db, alta).id, peso))
    return medios


def _cargar_clientes(db: Session, rng: random.Random) -> list[int]:
    """Clientes de las reservas; M4 solo los registra junto con una reserva (lo confirma M5)."""
    ids = [
        atencion_service.registrar_cliente_para_reserva(
            db, nombre, f"280-4{rng.randint(100000, 999999)}"
        )
        for nombre in datos.CLIENTES
    ]
    db.commit()
    return ids


# --- Lo que pasa ahora: comandas abiertas y reservas -------------------------------------------


def _pedido_actual(catalogo: Catalogo, rng: random.Random) -> list[DetalleComandaCrear]:
    disponibles = [p for p in catalogo.productos if not p.retirado]
    elegidos = rng.sample(disponibles, rng.randint(2, 4))
    return [
        DetalleComandaCrear(producto_id=producto.id, cantidad=rng.randint(1, 2))
        for producto in elegidos
    ]


def _avanzar_entregas(db: Session, comanda_id: int) -> None:
    """Primera linea entregada y segunda lista en cocina; el resto, pendiente (HU-M4-08, M4-12)."""
    primera, segunda = atencion_service.consultar_entregas(db, comanda_id).detalles[:2]
    atencion_service.registrar_entrega(
        db, comanda_id, primera.id, EntregaDetalle(cantidad_entregada=primera.cantidad)
    )
    atencion_service.marcar_listo(
        db, comanda_id, segunda.id, ListoDetalle(cantidad_lista=segunda.cantidad)
    )


def _mesas_segun_reservas(db: Session, ctx: Contexto) -> tuple[list[MesaDemo], list[MesaDemo]]:
    """Mesas sin reservas hoy y mesas con reservas hoy, cada grupo en orden aleatorio."""
    con_reserva = set(db.scalars(select(Reserva.mesa_id).where(Reserva.fecha == ctx.hoy)))
    libres = [mesa for mesa in ctx.catalogo.mesas if mesa.id not in con_reserva]
    otras = [mesa for mesa in ctx.catalogo.mesas if mesa.id in con_reserva]
    ctx.rng.shuffle(libres)
    ctx.rng.shuffle(otras)
    return libres, otras


def _reserva_de_hoy(db: Session, ctx: Contexto, mesa: MesaDemo, antes: timedelta) -> Reserva | None:
    """Reserva ACTIVA de hoy cuya hora ya paso; el `service` no acepta horas pasadas (S3)."""
    local = ctx.ahora.astimezone(ZONA_DEL_RESTAURANTE)
    momento = local - antes
    if momento.date() != local.date():
        return None
    reserva = Reserva(
        mesa_id=mesa.id,
        cliente_id=ctx.rng.choice(ctx.catalogo.clientes),
        fecha=momento.date(),
        hora=time(momento.hour, momento.minute),
        cantidad_personas=max(1, mesa.capacidad - 1),
        estado=EstadoReserva.ACTIVA,
    )
    db.add(reserva)
    db.commit()
    return reserva


def _abrir_comandas(db: Session, ctx: Contexto) -> None:
    """Comandas ABIERTA de ahora con sus mesas OCUPADA; la primera sale de una reserva de hoy."""
    rng, catalogo = ctx.rng, ctx.catalogo
    libres, otras = _mesas_segun_reservas(db, ctx)
    mesas = (libres + otras)[:COMANDAS_ABIERTAS]
    abiertas = []
    reserva = _reserva_de_hoy(db, ctx, mesas[0], timedelta(minutes=20)) if libres else None
    if reserva is not None:
        pedido = ComandaDesdeReservaCrear(
            mozo_id=rng.choice(catalogo.mozos), detalles=_pedido_actual(catalogo, rng)
        )
        abiertas.append(reservas_service.crear_comanda(db, reserva.id, pedido).id)
        mesas = mesas[1:]
    for mesa in mesas:
        alta = ComandaCrear(
            mesa_id=mesa.id,
            mozo_id=rng.choice(catalogo.mozos),
            detalles=_pedido_actual(catalogo, rng),
        )
        salida = atencion_service.crear_comanda(
            db, alta, adaptadores.MesasDeSalon(), adaptadores.CatalogoDeCarta()
        )
        abiertas.append(salida.id)
    for comanda_id in abiertas[::2]:
        _avanzar_entregas(db, comanda_id)


def _crear_reserva(db: Session, alta: ReservaCrear) -> list[int]:
    """Alta con el `service`; si una regla la rechaza (turno ocupado, hora pasada), se descarta."""
    try:
        return [reservas_service.crear_reserva(db, alta).id]
    except ERRORES_DE_NEGOCIO:
        return []


def _cargar_reservas_futuras(db: Session, ctx: Contexto) -> None:
    """Reservas ACTIVA de hoy en adelante, algunas canceladas con anticipacion (HU-M5-01, M5-04).

    Ademas, una reserva de hoy cuya hora ya paso, para mostrar la cancelacion por ausencia.
    """
    rng, catalogo = ctx.rng, ctx.catalogo
    libres, _ = _mesas_segun_reservas(db, ctx)
    if libres:
        _reserva_de_hoy(db, ctx, libres[0], timedelta(hours=1))
    creadas = []
    for dias in range(DIAS_DE_RESERVAS_FUTURAS + 1):
        fecha = ctx.hoy + timedelta(days=dias)
        cantidad = rng.randint(4, 7) if fecha.weekday() >= 4 else rng.randint(2, 4)
        for _ in range(cantidad):
            mesa = rng.choice(catalogo.mesas)
            alta = ReservaCrear(
                mesa_id=mesa.id,
                cliente_id=rng.choice(catalogo.clientes),
                fecha=fecha,
                hora=rng.choice(HORAS_DE_RESERVA),
                cantidad_personas=rng.randint(1, mesa.capacidad),
            )
            creadas += _crear_reserva(db, alta)
    for reserva_id in rng.sample(creadas, min(3, len(creadas))):
        reservas_service.cancelar_anticipada(db, reserva_id)


# --- Orquestacion -------------------------------------------------------------------------------


def _cargar_catalogo(db: Session, rng: random.Random, ahora: datetime) -> Contexto:
    mozos, mozo_de_baja = _cargar_personas(db)
    mesas = _cargar_salon(db)
    productos = _cargar_carta(db)
    hoy = ahora.astimezone(ZONA_DEL_RESTAURANTE).date()
    promociones = _cargar_promociones(db, productos, hoy)
    catalogo = Catalogo(
        mesas=mesas,
        mozos=mozos,
        mozo_de_baja=mozo_de_baja,
        productos=productos,
        menus_ejecutivos=_cargar_menus_ejecutivos(db, productos),
        vigencias=_vigencias(productos, hoy),
        medios_pago=_cargar_medios_pago(db),
        clientes=_cargar_clientes(db, rng),
    )
    return Contexto(rng, ahora, catalogo, promociones)


def _vigencias(productos: list[Vendible], hoy: date) -> list[Vigencia]:
    """Cuando rige cada promocion, con los mismos datos que se le dieron a M2."""
    ids = {producto.nombre: producto.id for producto in productos}
    semana = list(DiaSemana)
    return [
        Vigencia(
            producto_ids=frozenset(ids[nombre] for nombre in promocion.productos),
            desde=hoy + timedelta(days=promocion.desde_dias),
            hasta=hoy + timedelta(days=promocion.hasta_dias),
            dias_semana=frozenset(semana.index(dia) for dia in promocion.dias_semana),
            horas=promocion.horario,
        )
        for promocion in datos.PROMOCIONES
    ]


def _cerrar_historial(db: Session, ctx: Contexto) -> None:
    """Bajas posteriores al historial: un mozo, el producto retirado y una promocion finalizada."""
    if ctx.catalogo.mozo_de_baja is not None:
        salon_service.dar_de_baja_mozo(db, ctx.catalogo.mozo_de_baja)
    for producto in ctx.catalogo.productos:
        if producto.retirado and producto.categoria is not None:
            productos_service.dar_de_baja_producto(db, producto.categoria, producto.id)
    for promocion in datos.PROMOCIONES:
        if promocion.finalizar:
            menus_service.finalizar_promocion(db, ctx.promociones[promocion.nombre])


def cargar(
    db: Session, ahora: datetime, dias: int = DIAS_POR_DEFECTO, semilla: int = SEMILLA
) -> None:
    """Carga toda la demostracion sobre una base vacia.

    `ahora` es el momento actual en UTC con zona: los `service` de comandas y reservas usan el
    reloj real, asi que no sirve para simular otra fecha.
    """
    rng = random.Random(semilla)  # noqa: S311 - datos de demostracion reproducibles, no seguridad
    ctx = _cargar_catalogo(db, rng, ahora)
    cargar_historial(db, ctx.catalogo, rng, ahora, dias)
    _cerrar_historial(db, ctx)
    _abrir_comandas(db, ctx)
    _cargar_reservas_futuras(db, ctx)


# --- Reinicio de la base ------------------------------------------------------------------------


def archivo_de_la_base(url: str) -> Path:
    """Archivo de una URL de SQLite en disco; cualquier otra base no se reinicia."""
    datos_url = make_url(url)
    archivo = datos_url.database or ""
    en_memoria = archivo in ("", ":memory:") or archivo.startswith("file:")
    if datos_url.get_backend_name() != "sqlite" or en_memoria:
        raise BaseNoReiniciableError(
            f"--reiniciar solo admite una base SQLite en un archivo; DATABASE_URL es {url}"
        )
    return Path(archivo)


def reiniciar_base(url: str) -> None:
    """Borra el archivo de la base y sus archivos auxiliares y aplica las migraciones."""
    archivo = archivo_de_la_base(url)
    motor.dispose()  # el motor de la app no conecta al importarse; se cierra por si acaso
    for sufijo in SUFIJOS_SQLITE:
        Path(f"{archivo}{sufijo}").unlink(missing_ok=True)
    command.upgrade(Config(str(ALEMBIC_INI)), "head")  # env.py toma la misma DATABASE_URL


@contextmanager
def _sesion_de(url: str) -> Iterator[Session]:
    """Sesion sobre `url` con un motor propio, que se cierra al terminar."""
    motor_propio = crear_motor(url)
    try:
        with sessionmaker(bind=motor_propio, autoflush=False, expire_on_commit=False)() as db:
            yield db
    finally:
        motor_propio.dispose()


# --- Linea de comandos --------------------------------------------------------------------------


def _dias_validos(texto: str) -> int:
    dias = int(texto)
    if dias < 1:
        raise argparse.ArgumentTypeError("debe ser 1 o más")
    return dias


def _leer_opciones(argumentos: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Carga datos de demostración.")
    parser.add_argument(
        "--dias",
        type=_dias_validos,
        default=DIAS_POR_DEFECTO,
        help=f"días de historial hasta hoy (por defecto {DIAS_POR_DEFECTO})",
    )
    parser.add_argument(
        "--reiniciar",
        action="store_true",
        help="descarta la base SQLite, la vuelve a crear con las migraciones y la llena",
    )
    return parser.parse_args(argumentos)


def _cargar_e_informar(db: Session, dias: int) -> None:
    cargar(db, datetime.now(UTC), dias)
    print(f"Datos de demostración cargados ({dias} días de historial):")
    for tabla, cantidad in contar_filas(db).items():
        print(f"  {tabla}: {cantidad}")
    correos = ", ".join((datos.CORREO_ENCARGADO, datos.CORREO_MOZO, datos.CORREO_CHEF))
    print(f"Usuarios ({correos} y más), contraseña {datos.CONTRASENA_DEMO}")


def _reiniciar_y_cargar(dias: int) -> int:
    url = get_settings().database_url
    try:
        reiniciar_base(url)
    except BaseNoReiniciableError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"Base reiniciada: {archivo_de_la_base(url)}")
    with _sesion_de(url) as db:
        _cargar_e_informar(db, dias)
    return 0


def main(argumentos: list[str] | None = None) -> int:
    opciones = _leer_opciones(argumentos)
    if opciones.reiniciar:
        return _reiniciar_y_cargar(opciones.dias)
    with abrir_sesion() as db:
        if tiene_datos(db):
            print("La base ya tiene datos: no se cargó nada.")
            return 0
        _cargar_e_informar(db, opciones.dias)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
