"""Puebla la base de datos completa con datos de demostración.

El esquema se crea solo con Alembic. Antes de ejecutar este script, desde `backend/`:

    alembic upgrade head

Uso:

    python -m scripts.poblar_base            # exige una base vacía
    python -m scripts.poblar_base --reset    # borra los datos y vuelve a poblar

Carga sectores, mesas, mozos, la carta completa, menús del día, menús ejecutivos,
promociones, clientes, reservas, medios de pago y un histórico de comandas facturadas
y pendientes. Usa los `service` de cada módulo para respetar sus reglas de negocio.
"""

import argparse
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal
from app.modules.atencion import service as atencion_service
from app.modules.atencion.adaptadores import CatalogoDeCarta, MesasDeSalon
from app.modules.atencion.models import Comanda
from app.modules.atencion.schemas import EntregaDetalle
from app.modules.menus import service as menus_service
from app.modules.menus.models import DiaSemana, TipoPromocion
from app.modules.menus.schemas import MenuDelDiaCrear, MenuEjecutivoCrear, PromocionCrear
from app.modules.pagos import service as pagos_service
from app.modules.pagos.models import Factura, TipoMedioPago
from app.modules.pagos.schemas import CobroCrear, FacturaCrear, MedioPagoCrear
from app.modules.productos import service as productos_service
from app.modules.productos.schemas import BebidaCrear, PlatoCrear, PostreCrear, SeccionCrear
from app.modules.reservas import service as reservas_service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import ClienteNuevo as ClienteNuevoReserva
from app.modules.reservas.schemas import ReservaCrear
from app.modules.salon import service as salon_service
from app.modules.salon.schemas import MesaCrear, MozoCrear, SectorCrear
from app.shared.contratos.comanda import ComandaCrear, DetalleComandaCrear
from app.shared.models import Categoria

ZONA_RESTAURANTE = timezone(timedelta(hours=-3), "ART")
CENTAVO = Decimal("0.01")


@dataclass(frozen=True)
class SemillaSector:
    nombre: str
    descripcion: str


@dataclass(frozen=True)
class SemillaMesa:
    sector: str
    numero: int
    capacidad: int


@dataclass(frozen=True)
class SemillaMozo:
    dni: str
    nombre: str
    apellido: str
    telefono: str


@dataclass(frozen=True)
class SemillaSeccion:
    nombre: str
    orden: int


@dataclass(frozen=True)
class SemillaProducto:
    seccion: str
    nombre: str
    categoria: Categoria
    precio: str
    ingredientes: tuple[str, ...]
    descripcion: str
    etiquetas: tuple[str, ...] = ()


@dataclass(frozen=True)
class SemillaMenuDelDia:
    nombre: str
    descripcion: str
    precio: str
    ingredientes: tuple[str, ...]
    etiquetas: tuple[str, ...] = ()


@dataclass(frozen=True)
class SemillaMenuEjecutivo:
    nombre: str
    descripcion: str
    precio_fijo: str
    productos: tuple[str, ...]


@dataclass(frozen=True)
class SemillaPromocion:
    nombre: str
    tipo: TipoPromocion
    descripcion: str
    productos: tuple[str, ...]
    dias: tuple[DiaSemana, ...]
    hora_desde: time | None = None
    hora_hasta: time | None = None
    porcentaje: int | None = None
    precio_fijo: str | None = None
    cant_lleva: int | None = None
    cant_paga: int | None = None


@dataclass(frozen=True)
class SemillaReserva:
    clave: str
    dias: int
    hora: time
    mesa: tuple[str, int]
    personas: int
    cliente: str | None = None
    cliente_nuevo: tuple[str, str] | None = None
    final: EstadoReserva = EstadoReserva.ACTIVA


@dataclass(frozen=True)
class LineaComanda:
    producto: str | None = None
    menu: str | None = None
    cantidad: int = 1
    entregada: int | None = None  # None: se entrega toda la cantidad


@dataclass(frozen=True)
class SemillaPago:
    medio: str
    fraccion: str = "1"


@dataclass(frozen=True)
class SemillaComanda:
    dias_atras: int
    hora: time | None
    mesa: tuple[str, int]
    mozo: str
    lineas: tuple[LineaComanda, ...]
    cerrar: bool = True
    facturar: bool = True
    pagos: tuple[SemillaPago, ...] = ()


@dataclass
class Contexto:
    """Ids creados, por nombre, para que cada paso referencie a los anteriores."""

    sectores: dict[str, int] = field(default_factory=dict)
    mesas: dict[tuple[str, int], int] = field(default_factory=dict)
    mozos: dict[str, int] = field(default_factory=dict)
    secciones: dict[str, int] = field(default_factory=dict)
    productos: dict[str, int] = field(default_factory=dict)
    menus_del_dia: dict[str, int] = field(default_factory=dict)
    menus_ejecutivos: dict[str, int] = field(default_factory=dict)
    promociones: dict[str, int] = field(default_factory=dict)
    clientes: dict[str, int] = field(default_factory=dict)
    reservas: dict[str, int] = field(default_factory=dict)
    medios_pago: dict[str, int] = field(default_factory=dict)


SECTORES = (
    SemillaSector("Salón Principal", "Planta baja, junto a las ventanas"),
    SemillaSector("Terraza", "Mesas al aire libre"),
    SemillaSector("Comedor Familiar", "Sector tranquilo para grupos"),
    SemillaSector("Bar", "Mesas altas junto a la barra"),
)

MESAS = (
    SemillaMesa("Salón Principal", 1, 2),
    SemillaMesa("Salón Principal", 2, 2),
    SemillaMesa("Salón Principal", 3, 4),
    SemillaMesa("Salón Principal", 4, 6),
    SemillaMesa("Terraza", 1, 2),
    SemillaMesa("Terraza", 2, 4),
    SemillaMesa("Terraza", 3, 6),
    SemillaMesa("Comedor Familiar", 1, 6),
    SemillaMesa("Comedor Familiar", 2, 8),
    SemillaMesa("Bar", 1, 2),
    SemillaMesa("Bar", 2, 2),
    SemillaMesa("Bar", 3, 4),
)

MOZOS = (
    SemillaMozo("30111222", "Lucía", "Fernández", "299 555 1001"),
    SemillaMozo("31555666", "Martín", "Gómez", "299 555 1002"),
    SemillaMozo("28999888", "Sofía", "Rodríguez", "299 555 1003"),
    SemillaMozo("32777888", "Diego", "Álvarez", "299 555 1004"),
    SemillaMozo("35444555", "Valentina", "López", "299 555 1005"),
)

SECCIONES = (
    SemillaSeccion("Entradas", 1),
    SemillaSeccion("Platos principales", 2),
    SemillaSeccion("Postres", 3),
    SemillaSeccion("Bebidas", 4),
    SemillaSeccion("Menús del día", 5),
    SemillaSeccion("Menús ejecutivos", 6),
)

PRODUCTOS = (
    SemillaProducto(
        "Entradas",
        "Bruschetta caprese",
        Categoria.PLATO,
        "4200.00",
        ("Pan", "Tomate", "Mozzarella", "Albahaca"),
        "Pan tostado con tomate, mozzarella y albahaca.",
        ("vegetariano",),
    ),
    SemillaProducto(
        "Entradas",
        "Empanadas de carne",
        Categoria.PLATO,
        "3800.00",
        ("Carne picada", "Cebolla", "Huevo", "Masa"),
        "Tres empanadas de carne cortada a cuchillo.",
        ("clásico",),
    ),
    SemillaProducto(
        "Entradas",
        "Provoleta a la parrilla",
        Categoria.PLATO,
        "4600.00",
        ("Queso provolone", "Orégano", "Aceite de oliva"),
        "Provoleta grillada con orégano.",
        ("vegetariano", "sin gluten"),
    ),
    SemillaProducto(
        "Entradas",
        "Ensalada César",
        Categoria.PLATO,
        "5100.00",
        ("Lechuga", "Pollo", "Crutones", "Queso parmesano", "Aderezo César"),
        "Ensalada fresca con pollo grillado.",
        ("fresco",),
    ),
    SemillaProducto(
        "Platos principales",
        "Milanesa napolitana",
        Categoria.PLATO,
        "9800.00",
        ("Carne vacuna", "Pan rallado", "Tomate", "Jamón", "Queso mozzarella"),
        "Milanesa con jamón, tomate y queso gratinado.",
        ("clásico", "favorito"),
    ),
    SemillaProducto(
        "Platos principales",
        "Bife de chorizo",
        Categoria.PLATO,
        "14500.00",
        ("Carne vacuna", "Sal", "Pimienta"),
        "Bife de chorizo a la parrilla con guarnición.",
        ("parrilla", "sin gluten"),
    ),
    SemillaProducto(
        "Platos principales",
        "Pastel de papas",
        Categoria.PLATO,
        "8900.00",
        ("Carne picada", "Papa", "Cebolla", "Huevo"),
        "Pastel de papas casero al horno.",
        ("casero",),
    ),
    SemillaProducto(
        "Platos principales",
        "Risotto de hongos",
        Categoria.PLATO,
        "9500.00",
        ("Arroz arborio", "Hongos", "Cebolla", "Queso parmesano", "Vino blanco"),
        "Risotto cremoso de hongos de temporada.",
        ("vegetariano",),
    ),
    SemillaProducto(
        "Platos principales",
        "Trucha patagónica",
        Categoria.PLATO,
        "12800.00",
        ("Trucha", "Limón", "Papas", "Mantequilla"),
        "Trucha al horno con papas rústicas.",
        ("pescado", "sin gluten"),
    ),
    SemillaProducto(
        "Platos principales",
        "Hamburguesa completa",
        Categoria.PLATO,
        "8700.00",
        ("Carne vacuna", "Pan de hamburguesa", "Queso cheddar", "Lechuga", "Tomate", "Huevo"),
        "Hamburguesa con cheddar, huevo y vegetales.",
        ("clásico",),
    ),
    SemillaProducto(
        "Postres",
        "Flan casero con dulce de leche",
        Categoria.POSTRE,
        "3900.00",
        ("Leche", "Huevo", "Azúcar", "Dulce de leche"),
        "Flan casero con dulce de leche y crema.",
        ("casero",),
    ),
    SemillaProducto(
        "Postres",
        "Tiramisú",
        Categoria.POSTRE,
        "4500.00",
        ("Mascarpone", "Café", "Bizcochuelo", "Cacao"),
        "Tiramisú clásico italiano.",
        ("italiano",),
    ),
    SemillaProducto(
        "Postres",
        "Volcán de chocolate",
        Categoria.POSTRE,
        "4800.00",
        ("Chocolate", "Manteca", "Huevo", "Azúcar", "Harina"),
        "Volcán de chocolate con corazón fundido.",
        ("chocolate",),
    ),
    SemillaProducto(
        "Postres",
        "Panqueques con dulce de leche",
        Categoria.POSTRE,
        "4100.00",
        ("Harina", "Leche", "Huevo", "Dulce de leche"),
        "Panqueques rellenos de dulce de leche.",
        ("casero",),
    ),
    SemillaProducto(
        "Bebidas",
        "Agua mineral 500 ml",
        Categoria.BEBIDA,
        "2200.00",
        ("Agua mineral",),
        "Botella de agua mineral sin gas.",
        ("sin alcohol",),
    ),
    SemillaProducto(
        "Bebidas",
        "Coca-Cola 500 ml",
        Categoria.BEBIDA,
        "2800.00",
        ("Agua", "Azúcar", "Colorante", "Gas"),
        "Gaseosa cola bien fría.",
        ("sin alcohol",),
    ),
    SemillaProducto(
        "Bebidas",
        "Limonada casera",
        Categoria.BEBIDA,
        "3200.00",
        ("Limón", "Agua", "Azúcar", "Menta"),
        "Limonada fresca con menta.",
        ("sin alcohol", "fresco"),
    ),
    SemillaProducto(
        "Bebidas",
        "Vino Malbec",
        Categoria.BEBIDA,
        "6500.00",
        ("Uva Malbec", "Sulfitos"),
        "Copa de vino Malbec de Mendoza.",
        ("con alcohol",),
    ),
    SemillaProducto(
        "Bebidas",
        "Café espresso",
        Categoria.BEBIDA,
        "2500.00",
        ("Café",),
        "Café espresso doble.",
        ("sin alcohol", "caliente"),
    ),
    SemillaProducto(
        "Bebidas",
        "Cerveza artesanal IPA",
        Categoria.BEBIDA,
        "4200.00",
        ("Agua", "Cebada", "Lúpulo", "Levadura"),
        "Pinta de cerveza artesanal IPA.",
        ("con alcohol",),
    ),
)

MENUS_DEL_DIA = (
    SemillaMenuDelDia(
        "Menú del día: Milanesa con papas",
        "Incluye entrada, postre y bebida.",
        "8900.00",
        ("Milanesa de carne", "Papas fritas", "Ensalada", "Pan"),
        ("del día",),
    ),
    SemillaMenuDelDia(
        "Menú del día: Pastel de papas",
        "Incluye entrada, postre y bebida.",
        "8200.00",
        ("Pastel de papas", "Ensalada", "Pan"),
        ("del día",),
    ),
    SemillaMenuDelDia(
        "Menú del día vegetariano",
        "Incluye entrada, postre y bebida sin carne.",
        "7800.00",
        ("Risotto de hongos", "Ensalada", "Pan"),
        ("del día", "vegetariano"),
    ),
)

MENUS_EJECUTIVOS = (
    SemillaMenuEjecutivo(
        "Menú Ejecutivo Clásico",
        "Entrada, plato principal, postre y bebida.",
        "13500.00",
        (
            "Empanadas de carne",
            "Bife de chorizo",
            "Flan casero con dulce de leche",
            "Agua mineral 500 ml",
        ),
    ),
    SemillaMenuEjecutivo(
        "Menú Ejecutivo Vegetariano",
        "Entrada, plato principal, postre y bebida sin carne.",
        "11800.00",
        ("Ensalada César", "Risotto de hongos", "Tiramisú", "Limonada casera"),
    ),
)

PROMOCIONES = (
    SemillaPromocion(
        "Happy Hour",
        TipoPromocion.PORCENTAJE,
        "25% de descuento en bebidas seleccionadas.",
        ("Coca-Cola 500 ml", "Limonada casera", "Cerveza artesanal IPA"),
        (
            DiaSemana.LUNES,
            DiaSemana.MARTES,
            DiaSemana.MIERCOLES,
            DiaSemana.JUEVES,
            DiaSemana.VIERNES,
        ),
        hora_desde=time(18, 0),
        hora_hasta=time(20, 0),
        porcentaje=25,
    ),
    SemillaPromocion(
        "Martes de Milanesa",
        TipoPromocion.PRECIO_FIJO,
        "Milanesa napolitana con papas a precio promocional.",
        ("Milanesa napolitana",),
        (DiaSemana.MARTES,),
        precio_fijo="8500.00",
    ),
    SemillaPromocion(
        "Dos por uno en postres",
        TipoPromocion.NXM,
        "Llevá dos postres y pagá uno.",
        ("Flan casero con dulce de leche", "Tiramisú", "Volcán de chocolate"),
        (DiaSemana.SABADO, DiaSemana.DOMINGO),
        cant_lleva=2,
        cant_paga=1,
    ),
)

CLIENTES = (
    ("Ana Pérez", "299 555 2001"),
    ("Bruno Díaz", "299 555 2002"),
    ("Carla Ruiz", "299 555 2003"),
    ("Diego Sosa", "299 555 2004"),
    ("Elena Morales", "299 555 2005"),
    ("Facundo Castro", "299 555 2006"),
)

RESERVAS = (
    SemillaReserva("reserva_ana", 2, time(20, 0), ("Salón Principal", 3), 4, cliente="Ana Pérez"),
    SemillaReserva("reserva_bruno", 3, time(21, 0), ("Terraza", 2), 2, cliente="Bruno Díaz"),
    SemillaReserva(
        "reserva_carla",
        4,
        time(20, 30),
        ("Comedor Familiar", 1),
        5,
        cliente="Carla Ruiz",
        final=EstadoReserva.CANCELADA_ANTICIPADA,
    ),
    SemillaReserva(
        "reserva_lucia",
        5,
        time(21, 30),
        ("Bar", 3),
        3,
        cliente_nuevo=("Lucía Gómez", "299 555 3001"),
        final=EstadoReserva.CANCELADA_POR_AUSENCIA,
    ),
    SemillaReserva(
        "reserva_elena",
        6,
        time(13, 0),
        ("Salón Principal", 4),
        6,
        cliente="Elena Morales",
        final=EstadoReserva.ATENDIDA,
    ),
)

MEDIOS_PAGO = (
    ("Efectivo", TipoMedioPago.EFECTIVO, "Pagos en efectivo en caja."),
    ("Tarjeta de crédito", TipoMedioPago.TARJETA, "Terminal POS para tarjetas."),
    ("Transferencia bancaria", TipoMedioPago.TRANSFERENCIA, "Transferencia o alias."),
    ("Mercado Pago", TipoMedioPago.BILLETERA_VIRTUAL, "Pago con QR o billetera virtual."),
)

COMANDAS = (
    SemillaComanda(
        5,
        time(13, 30),
        ("Salón Principal", 3),
        "Lucía Fernández",
        (
            LineaComanda(producto="Milanesa napolitana", cantidad=2),
            LineaComanda(producto="Agua mineral 500 ml", cantidad=2),
            LineaComanda(producto="Flan casero con dulce de leche", cantidad=1),
        ),
        pagos=(SemillaPago("Tarjeta de crédito"),),
    ),
    SemillaComanda(
        4,
        time(21, 0),
        ("Terraza", 2),
        "Martín Gómez",
        (
            LineaComanda(producto="Bife de chorizo", cantidad=1),
            LineaComanda(producto="Trucha patagónica", cantidad=1),
            LineaComanda(producto="Vino Malbec", cantidad=1),
            LineaComanda(producto="Café espresso", cantidad=1),
        ),
        pagos=(SemillaPago("Efectivo", "0.4"),),
    ),
    SemillaComanda(
        2,
        time(20, 15),
        ("Comedor Familiar", 2),
        "Sofía Rodríguez",
        (
            LineaComanda(menu="Menú Ejecutivo Clásico", cantidad=2),
            LineaComanda(producto="Limonada casera", cantidad=1),
        ),
        pagos=(SemillaPago("Mercado Pago"),),
    ),
    SemillaComanda(
        1,
        time(22, 0),
        ("Bar", 2),
        "Diego Álvarez",
        (
            LineaComanda(producto="Empanadas de carne", cantidad=3),
            LineaComanda(producto="Cerveza artesanal IPA", cantidad=2),
        ),
        facturar=False,
    ),
    SemillaComanda(
        0,
        None,
        ("Salón Principal", 2),
        "Valentina López",
        (
            LineaComanda(producto="Provoleta a la parrilla", cantidad=2, entregada=2),
            LineaComanda(producto="Risotto de hongos", cantidad=1, entregada=0),
            LineaComanda(producto="Cerveza artesanal IPA", cantidad=2, entregada=1),
        ),
        cerrar=False,
        facturar=False,
    ),
)


def _hoy_local() -> date:
    return datetime.now(ZONA_RESTAURANTE).date()


def _instante(dias_atras: int, hora: time | None) -> datetime:
    """Instante UTC de un momento local del restaurante; sin hora, media hora atrás."""
    if hora is None:
        return datetime.now(UTC) - timedelta(minutes=30)
    dia = _hoy_local() - timedelta(days=dias_atras)
    return datetime.combine(dia, hora, tzinfo=ZONA_RESTAURANTE).astimezone(UTC)


def _poblar_salon(db: Session, contexto: Contexto) -> None:
    for semilla in SECTORES:
        salida = salon_service.crear_sector(
            db, SectorCrear(nombre=semilla.nombre, descripcion=semilla.descripcion)
        )
        contexto.sectores[semilla.nombre] = salida.id

    for semilla in MESAS:
        salida = salon_service.crear_mesa(
            db,
            MesaCrear(
                numero=semilla.numero,
                capacidad=semilla.capacidad,
                sector_id=contexto.sectores[semilla.sector],
            ),
        )
        contexto.mesas[(semilla.sector, semilla.numero)] = salida.id

    for semilla in MOZOS:
        salida = salon_service.crear_mozo(
            db,
            MozoCrear(
                dni=semilla.dni,
                nombre=semilla.nombre,
                apellido=semilla.apellido,
                telefono=semilla.telefono,
            ),
        )
        contexto.mozos[f"{semilla.nombre} {semilla.apellido}"] = salida.id


def _poblar_carta(db: Session, contexto: Contexto) -> None:
    for semilla in SECCIONES:
        salida = productos_service.crear_seccion(
            db, SeccionCrear(nombre=semilla.nombre, orden=semilla.orden)
        )
        contexto.secciones[semilla.nombre] = salida.id

    for semilla in PRODUCTOS:
        contexto.productos[semilla.nombre] = _crear_producto(db, semilla, contexto.secciones)


def _crear_producto(db: Session, semilla: SemillaProducto, secciones: dict[str, int]) -> int:
    datos = {
        "nombre": semilla.nombre,
        "seccion_id": secciones[semilla.seccion],
        "precio": Decimal(semilla.precio),
        "ingredientes": list(semilla.ingredientes),
        "descripcion": semilla.descripcion,
        "etiquetas": list(semilla.etiquetas),
    }
    if semilla.categoria is Categoria.PLATO:
        salida = productos_service.crear_producto(db, PlatoCrear(**datos), None)
    elif semilla.categoria is Categoria.POSTRE:
        salida = productos_service.crear_producto(db, PostreCrear(**datos), None)
    else:
        salida = productos_service.crear_producto(db, BebidaCrear(**datos), None)
    return salida.id


def _poblar_menus(db: Session, contexto: Contexto) -> None:
    for semilla in MENUS_DEL_DIA:
        salida = menus_service.crear_menu_del_dia(
            db,
            MenuDelDiaCrear(
                nombre=semilla.nombre,
                seccion_id=contexto.secciones["Menús del día"],
                precio=Decimal(semilla.precio),
                ingredientes=list(semilla.ingredientes),
                descripcion=semilla.descripcion,
                etiquetas=list(semilla.etiquetas),
            ),
            None,
        )
        contexto.menus_del_dia[semilla.nombre] = salida.id

    for semilla in MENUS_EJECUTIVOS:
        salida = menus_service.crear_menu_ejecutivo(
            db,
            MenuEjecutivoCrear(
                nombre=semilla.nombre,
                precio_fijo=Decimal(semilla.precio_fijo),
                producto_ids=[contexto.productos[nombre] for nombre in semilla.productos],
                seccion_id=contexto.secciones["Menús ejecutivos"],
                descripcion=semilla.descripcion,
            ),
        )
        contexto.menus_ejecutivos[semilla.nombre] = salida.id

    _poblar_promociones(db, contexto)


def _poblar_promociones(db: Session, contexto: Contexto) -> None:
    desde = _hoy_local() - timedelta(days=7)
    hasta = _hoy_local() + timedelta(days=30)
    for semilla in PROMOCIONES:
        salida = menus_service.crear_promocion(
            db,
            PromocionCrear(
                nombre=semilla.nombre,
                tipo=semilla.tipo,
                descripcion=semilla.descripcion,
                producto_ids=[contexto.productos[nombre] for nombre in semilla.productos],
                fecha_desde=desde,
                fecha_hasta=hasta,
                dias_semana=list(semilla.dias),
                hora_desde=semilla.hora_desde,
                hora_hasta=semilla.hora_hasta,
                descuento_porcentaje=semilla.porcentaje,
                precio_fijo=(
                    Decimal(semilla.precio_fijo) if semilla.precio_fijo is not None else None
                ),
                cant_lleva=semilla.cant_lleva,
                cant_paga=semilla.cant_paga,
            ),
        )
        contexto.promociones[semilla.nombre] = salida.id


def _poblar_clientes(db: Session, contexto: Contexto) -> None:
    for nombre, telefono in CLIENTES:
        cliente_id = atencion_service.registrar_cliente_para_reserva(db, nombre, telefono)
        db.commit()
        contexto.clientes[nombre] = cliente_id


def _poblar_reservas(db: Session, contexto: Contexto) -> None:
    hoy = _hoy_local()
    for semilla in RESERVAS:
        datos = _datos_reserva(semilla, contexto, hoy)
        reserva_id = reservas_service.crear_reserva(db, datos).id
        contexto.reservas[semilla.clave] = reserva_id
        _aplicar_estado_reserva(db, reserva_id, semilla.final, hoy)


def _datos_reserva(semilla: SemillaReserva, contexto: Contexto, hoy: date) -> ReservaCrear:
    cliente_nuevo = None
    if semilla.cliente_nuevo is not None:
        nombre, telefono = semilla.cliente_nuevo
        cliente_nuevo = ClienteNuevoReserva(nombre=nombre, telefono=telefono)
    return ReservaCrear(
        mesa_id=contexto.mesas[semilla.mesa],
        cliente_id=contexto.clientes[semilla.cliente] if semilla.cliente is not None else None,
        cliente_nuevo=cliente_nuevo,
        fecha=hoy + timedelta(days=semilla.dias),
        hora=semilla.hora,
        cantidad_personas=semilla.personas,
    )


def _aplicar_estado_reserva(db: Session, reserva_id: int, final: EstadoReserva, hoy: date) -> None:
    if final is EstadoReserva.ACTIVA:
        return
    if final is EstadoReserva.CANCELADA_ANTICIPADA:
        reservas_service.cancelar_anticipada(db, reserva_id)
        return
    reserva = db.get(Reserva, reserva_id)
    if reserva is None:
        raise RuntimeError(f"La reserva {reserva_id} no se guardó")
    if final is EstadoReserva.CANCELADA_POR_AUSENCIA:
        reserva.fecha = hoy - timedelta(days=1)
        reserva.hora = time(21, 30)
        db.commit()
        reservas_service.cancelar_por_ausencia(db, reserva_id)
        return
    reserva.estado = final
    db.commit()


def _poblar_medios_pago(db: Session, contexto: Contexto) -> None:
    for nombre, tipo, descripcion in MEDIOS_PAGO:
        salida = pagos_service.crear_medio_pago(
            db, MedioPagoCrear(nombre=nombre, tipo=tipo, descripcion=descripcion)
        )
        contexto.medios_pago[nombre] = salida.id


def _poblar_comandas(db: Session, contexto: Contexto) -> None:
    for semilla in COMANDAS:
        comanda_id = _crear_comanda(db, semilla, contexto)
        _entregar(db, comanda_id, semilla)
        if semilla.cerrar:
            atencion_service.cerrar_comanda(db, comanda_id, MesasDeSalon())
        if semilla.facturar:
            _facturar(db, comanda_id, semilla.pagos, contexto.medios_pago)
        _fechar(db, comanda_id, _instante(semilla.dias_atras, semilla.hora))


def _crear_comanda(db: Session, semilla: SemillaComanda, contexto: Contexto) -> int:
    detalles = [_a_detalle(linea, contexto) for linea in semilla.lineas]
    salida = atencion_service.crear_comanda(
        db,
        ComandaCrear(mesa_id=contexto.mesas[semilla.mesa], detalles=detalles),
        MesasDeSalon(),
        CatalogoDeCarta(),
    )
    comanda = db.get(Comanda, salida.id)
    if comanda is None:
        raise RuntimeError(f"La comanda {salida.id} no se guardó")
    # El mozo no forma parte del alta de M4; se completa acá para el reporte de M3.
    comanda.mozo_id = contexto.mozos[semilla.mozo]
    db.commit()
    return salida.id


def _a_detalle(linea: LineaComanda, contexto: Contexto) -> DetalleComandaCrear:
    if linea.producto is not None:
        return DetalleComandaCrear(
            producto_id=contexto.productos[linea.producto], cantidad=linea.cantidad
        )
    if linea.menu is not None:
        return DetalleComandaCrear(
            menu_ejecutivo_id=contexto.menus_ejecutivos[linea.menu], cantidad=linea.cantidad
        )
    raise ValueError("Cada línea debe indicar un producto o un menú ejecutivo")


def _entregar(db: Session, comanda_id: int, semilla: SemillaComanda) -> None:
    detalles = atencion_service.consultar_entregas(db, comanda_id).detalles
    if len(detalles) != len(semilla.lineas):
        raise RuntimeError(f"La comanda {comanda_id} no coincide con sus líneas")
    for detalle, linea in zip(detalles, semilla.lineas, strict=True):
        cantidad = linea.cantidad if linea.entregada is None else linea.entregada
        if not 0 <= cantidad <= linea.cantidad:
            raise ValueError(f"Cantidad entregada inválida para la comanda {comanda_id}")
        if cantidad == 0:
            continue
        atencion_service.registrar_entrega(
            db, comanda_id, detalle.id, EntregaDetalle(cantidad_entregada=cantidad)
        )


def _facturar(
    db: Session,
    comanda_id: int,
    pagos: tuple[SemillaPago, ...],
    medios_pago: dict[str, int],
) -> None:
    if not pagos:
        raise ValueError("Una comanda a facturar necesita al menos un cobro")
    total = pagos_service.previsualizar_factura(db, comanda_id).total
    factura_id: int | None = None
    for pago in pagos:
        monto = (total * Decimal(pago.fraccion)).quantize(CENTAVO)
        datos = CobroCrear(medio_pago_id=medios_pago[pago.medio], monto=monto)
        if factura_id is None:
            factura_id = pagos_service.generar_factura(
                db, FacturaCrear(comanda_id=comanda_id, cobro=datos)
            ).id
        else:
            pagos_service.registrar_cobro(db, factura_id, datos)


def _fechar(db: Session, comanda_id: int, instante: datetime) -> None:
    """Corre la comanda, su factura y sus cobros al momento histórico de la semilla."""
    comanda = db.get(Comanda, comanda_id)
    if comanda is None:
        raise RuntimeError(f"La comanda {comanda_id} no existe")
    comanda.fecha_hora = instante
    factura = db.scalar(sa.select(Factura).where(Factura.comanda_id == comanda_id))
    if factura is not None:
        factura.fecha_emision = instante + timedelta(hours=1)
        for indice, cobro in enumerate(factura.cobros):
            cobro.fecha_hora = instante + timedelta(hours=1, minutes=5 * indice)
    db.commit()


def _verificar_esquema(db: Session) -> None:
    existentes = set(sa.inspect(db.get_bind()).get_table_names())
    faltantes = sorted({tabla.name for tabla in Base.metadata.sorted_tables} - existentes)
    if faltantes:
        raise SystemExit(
            "Faltan tablas en la base (" + ", ".join(faltantes) + "). "
            "Ejecutá 'alembic upgrade head' desde backend/."
        )


def _esta_vacia(db: Session) -> bool:
    for tabla in Base.metadata.sorted_tables:
        if db.scalar(sa.select(sa.func.count()).select_from(tabla)):
            return False
    return True


def _limpiar(db: Session) -> None:
    for tabla in reversed(Base.metadata.sorted_tables):
        db.execute(sa.delete(tabla))
    db.commit()


def _imprimir_resumen(db: Session) -> None:
    print("\nBase poblada:")
    for tabla in Base.metadata.sorted_tables:
        total = db.scalar(sa.select(sa.func.count()).select_from(tabla)) or 0
        print(f"  {tabla.name:<28} {total:>4}")


def _poblar(db: Session) -> None:
    contexto = Contexto()
    _poblar_salon(db, contexto)
    _poblar_carta(db, contexto)
    _poblar_menus(db, contexto)
    _poblar_clientes(db, contexto)
    _poblar_reservas(db, contexto)
    _poblar_medios_pago(db, contexto)
    _poblar_comandas(db, contexto)


def main() -> None:
    parser = argparse.ArgumentParser(description="Puebla la base con datos de demostración.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Borra los datos existentes antes de poblar (conserva las migraciones).",
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        _verificar_esquema(db)
        if args.reset:
            _limpiar(db)
        elif not _esta_vacia(db):
            raise SystemExit("La base ya tiene datos. Volvé a ejecutar con --reset.")
        _poblar(db)
        _imprimir_resumen(db)


if __name__ == "__main__":
    main()
