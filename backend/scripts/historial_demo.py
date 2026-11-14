"""Historial de la demostracion: comandas, reservas, facturas y cobros de los ultimos dias.

Se inserta con los models porque los `service` fijan la fecha y hora actuales (comandas, facturas
y cobros) o rechazan fechas pasadas (reservas). Respeta las reglas de cada modulo:

- Las comandas historicas quedan CERRADA (todo entregado y listo) o ANULADA (nada entregado), asi
  que no ocupan mesas; una mesa atiende una sola comanda por turno.
- El precio y el descuento de cada linea son los de su momento: los precios suben dos veces en el
  periodo y la promocion se elige con `menus.service.promocion_para_linea` en la fecha de la linea.
- Cada comanda CERRADA tiene su factura, salvo las dos ultimas (quedan para facturar en la demo).
  El total es la suma de `cantidad * precio_unitario - descuento` y los cobros suman el total,
  salvo algunas facturas recientes que quedan ADEUDADA con saldo pendiente.
- Las reservas ATENDIDA tienen su comanda en la misma mesa; las canceladas no ocupan la mesa.
"""

import random
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from functools import cached_property

from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda, DetalleComanda
from app.modules.menus import service as menus_service
from app.modules.pagos.models import Cobro, DetalleFactura, EstadoFactura, Factura
from app.modules.reservas.models import EstadoReserva, Reserva
from app.shared.contratos.comanda import EstadoComanda, EstadoEntrega
from app.shared.models import Categoria
from scripts.datos_demo import OBSERVACIONES

ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")
CENTAVO = Decimal("0.01")
CERO = Decimal("0.00")
# Una comanda historica termina al menos este tiempo antes de la carga.
MARGEN = timedelta(minutes=10)
COMANDAS_SIN_FACTURAR = 2
DIAS_DE_BAJA_DEL_RETIRADO = 21  # el producto retirado no se vende en las ultimas 3 semanas
DIAS_CON_DEUDA = 14
EFECTO_PROMOCION = 2.5  # solo las facturas recientes quedan adeudadas

ENTRADAS = ("Entradas",)
PRINCIPALES = ("Pastas", "Platos principales", "Parrilla")
POSTRES = ("Postres",)
BEBIDAS = ("Bebidas sin alcohol", "Vinos y cervezas")
SECCION_CON_PINTAS = "Vinos y cervezas"


@dataclass(frozen=True)
class Vendible:
    """Producto o menu ejecutivo que se puede pedir; `es_menu` distingue la referencia."""

    id: int
    nombre: str
    seccion: str
    precio: Decimal
    popularidad: int
    es_menu: bool = False
    categoria: Categoria | None = None
    retirado: bool = False


@dataclass(frozen=True)
class Vigencia:
    """Cuando rige una promocion; solo orienta la demanda (el descuento lo calcula M2)."""

    producto_ids: frozenset[int]
    desde: date
    hasta: date
    dias_semana: frozenset[int]  # 0 = lunes
    horas: tuple[int, int] | None  # [desde, hasta) en horas locales

    def cubre(self, producto_id: int, llegada: datetime) -> bool:
        if producto_id not in self.producto_ids or not self.desde <= llegada.date() <= self.hasta:
            return False
        if llegada.weekday() not in self.dias_semana:
            return False
        return self.horas is None or self.horas[0] <= llegada.hour < self.horas[1]


@dataclass(frozen=True)
class MesaDemo:
    id: int
    capacidad: int


@dataclass
class Catalogo:
    """Ids creados con los `service`; el historial solo los referencia."""

    mesas: list[MesaDemo]
    mozos: list[int]
    mozo_de_baja: int | None
    productos: list[Vendible]
    menus_ejecutivos: list[Vendible]
    vigencias: list[Vigencia]
    medios_pago: list[tuple[int, int]]  # (id, peso relativo)
    clientes: list[int]

    @cached_property
    def productos_en_promocion(self) -> frozenset[int]:
        return frozenset().union(*(vigencia.producto_ids for vigencia in self.vigencias))

    def del_grupo(self, secciones: Sequence[str]) -> list[Vendible]:
        return [producto for producto in self.productos if producto.seccion in secciones]

    def menus_del_dia(self) -> list[Vendible]:
        return [p for p in self.productos if p.categoria == Categoria.MENU_DEL_DIA]

    def nombre(self, detalle: DetalleComanda) -> str:
        """Nombre que copia la factura (S4 de pagos)."""
        if detalle.menu_ejecutivo_id is not None:
            return self._nombres[(True, detalle.menu_ejecutivo_id)]
        return self._nombres[(False, detalle.producto_id or 0)]

    @cached_property
    def _nombres(self) -> dict[tuple[bool, int], str]:
        return {
            (item.es_menu, item.id): item.nombre
            for item in [*self.productos, *self.menus_ejecutivos]
        }


@dataclass(frozen=True)
class Turno:
    almuerzo: bool
    inicio: time  # primera hora local de llegada
    minutos: int  # ventana de llegada desde `inicio`
    volumen: tuple[tuple[int, int], ...]  # (minimo, maximo) de comandas, de lunes a domingo


ALMUERZO = Turno(
    True, time(12, 10), 165, ((3, 5), (4, 6), (4, 7), (5, 7), (6, 9), (9, 13), (10, 14))
)
NOCHE = Turno(
    False, time(20, 15), 180, ((4, 7), (5, 8), (6, 9), (7, 10), (11, 15), (13, 17), (8, 12))
)


@dataclass
class Generador:
    db: Session
    rng: random.Random
    catalogo: Catalogo
    ahora: datetime  # UTC con zona
    dias: int
    pendientes: list[tuple[Comanda, datetime]] = field(default_factory=list)


@dataclass(frozen=True)
class Visita:
    """Una mesa ocupada en un momento: de ella sale una comanda."""

    mesa: MesaDemo
    llegada: datetime  # hora local con zona
    dias_atras: int
    almuerzo: bool


def cargar_historial(
    db: Session, catalogo: Catalogo, rng: random.Random, ahora: datetime, dias: int
) -> None:
    """Carga `dias` dias hasta hoy inclusive; confirma un dia por vez (RNF-REN-03)."""
    generador = Generador(db, rng, catalogo, ahora, dias)
    hoy = ahora.astimezone(ZONA_DEL_RESTAURANTE).date()
    for dias_atras in range(dias - 1, -1, -1):
        cerradas = _cargar_dia(generador, hoy - timedelta(days=dias_atras), dias_atras)
        if dias_atras == 0 and not cerradas:
            cerradas = _cargar_bloque_de_hoy(generador)
        if cerradas:
            _facturar_todas(generador, generador.pendientes)
            generador.pendientes = cerradas
        db.commit()
    _facturar_todas(generador, generador.pendientes[:-COMANDAS_SIN_FACTURAR])
    db.commit()


def _cargar_dia(gen: Generador, fecha: date, dias_atras: int) -> list[tuple[Comanda, datetime]]:
    cerradas: list[tuple[Comanda, datetime]] = []
    for turno in (ALMUERZO, NOCHE):
        minimo, maximo = turno.volumen[fecha.weekday()]
        cantidad = min(gen.rng.randint(minimo, maximo), len(gen.catalogo.mesas))
        inicio = datetime.combine(fecha, turno.inicio, tzinfo=ZONA_DEL_RESTAURANTE)
        for mesa in gen.rng.sample(gen.catalogo.mesas, cantidad):
            llegada = inicio + timedelta(minutes=gen.rng.randint(0, turno.minutos))
            cerradas += _cargar_visita(gen, Visita(mesa, llegada, dias_atras, turno.almuerzo))
        _cargar_reservas_canceladas(gen, inicio)
    return cerradas


def _cargar_bloque_de_hoy(gen: Generador) -> list[tuple[Comanda, datetime]]:
    """Si todavia no paso ningun turno de hoy, unas comandas de las ultimas horas (caja del dia)."""
    local = gen.ahora.astimezone(ZONA_DEL_RESTAURANTE)
    desde = max(
        local.replace(hour=0, minute=0, second=0, microsecond=0), local - timedelta(hours=4)
    )
    hasta = local - timedelta(minutes=110)
    if hasta <= desde:
        return []
    minutos = int((hasta - desde).total_seconds() // 60)
    cerradas: list[tuple[Comanda, datetime]] = []
    for mesa in gen.rng.sample(gen.catalogo.mesas, 5):
        llegada = desde + timedelta(minutes=gen.rng.randint(0, minutos))
        cerradas += _cargar_visita(gen, Visita(mesa, llegada, 0, llegada.hour < 17))
    return cerradas


def _cargar_visita(gen: Generador, visita: Visita) -> list[tuple[Comanda, datetime]]:
    """Crea la comanda de la visita (y su reserva atendida); devuelve la cerrada con su fin."""
    fin = visita.llegada.astimezone(UTC) + timedelta(minutes=gen.rng.randint(50, 95))
    if fin + MARGEN > gen.ahora:
        return []
    personas = max(1, visita.mesa.capacidad - gen.rng.randint(0, 2))
    anulada = gen.rng.random() < 0.03
    reserva_id = None
    if not anulada and gen.rng.random() < 0.2:
        reserva_id = _crear_reserva_atendida(gen, visita, personas)
    comanda = Comanda(
        mesa_id=visita.mesa.id,
        mozo_id=_elegir_mozo(gen, visita.dias_atras),
        reserva_id=reserva_id,
        observaciones=gen.rng.choice(OBSERVACIONES) if gen.rng.random() < 0.12 else None,
        estado=EstadoComanda.ANULADA if anulada else EstadoComanda.CERRADA,
        fecha_hora=visita.llegada.astimezone(UTC),
        detalles=_armar_detalles(gen, visita, personas, entregado=not anulada),
    )
    gen.db.add(comanda)
    return [] if anulada else [(comanda, fin)]


def _elegir_mozo(gen: Generador, dias_atras: int) -> int:
    mozos = list(gen.catalogo.mozos)
    if gen.catalogo.mozo_de_baja is not None and dias_atras > gen.dias // 2:
        mozos.append(gen.catalogo.mozo_de_baja)
    return gen.rng.choice(mozos)


def _crear_reserva_atendida(gen: Generador, visita: Visita, personas: int) -> int:
    """La reserva es de la media hora en que llega la mesa: se atiende desde su hora (S68)."""
    reserva = Reserva(
        mesa_id=visita.mesa.id,
        cliente_id=gen.rng.choice(gen.catalogo.clientes),
        fecha=visita.llegada.date(),
        hora=time(visita.llegada.hour, visita.llegada.minute // 30 * 30),
        cantidad_personas=personas,
        estado=EstadoReserva.ATENDIDA,
    )
    gen.db.add(reserva)
    gen.db.flush()
    return reserva.id


def _cargar_reservas_canceladas(gen: Generador, inicio_turno: datetime) -> None:
    """Reservas que no llegaron a la mesa: ausentes o canceladas con anticipacion."""
    cantidad = gen.rng.choices((0, 1, 2), weights=(5, 3, 1))[0]
    for _ in range(cantidad):
        llegada = inicio_turno.replace(minute=0) + timedelta(minutes=30 * gen.rng.randint(1, 4))
        if llegada.astimezone(UTC) > gen.ahora:
            continue
        mesa = gen.rng.choice(gen.catalogo.mesas)
        ausente = gen.rng.random() < 0.45
        gen.db.add(
            Reserva(
                mesa_id=mesa.id,
                cliente_id=gen.rng.choice(gen.catalogo.clientes),
                fecha=llegada.date(),
                hora=llegada.time().replace(tzinfo=None),
                cantidad_personas=gen.rng.randint(1, mesa.capacidad),
                estado=(
                    EstadoReserva.CANCELADA_POR_AUSENCIA
                    if ausente
                    else EstadoReserva.CANCELADA_ANTICIPADA
                ),
            )
        )


def _peso(gen: Generador, opcion: Vendible, visita: Visita) -> float:
    """Popularidad del producto; una promocion vigente la multiplica (los clientes responden)."""
    en_promocion = not opcion.es_menu and any(
        vigencia.cubre(opcion.id, visita.llegada) for vigencia in gen.catalogo.vigencias
    )
    return opcion.popularidad * (EFECTO_PROMOCION if en_promocion else 1)


def _elegir(gen: Generador, opciones: Sequence[Vendible], visita: Visita) -> Vendible:
    vigentes = [
        opcion
        for opcion in opciones
        if not (opcion.retirado and visita.dias_atras < DIAS_DE_BAJA_DEL_RETIRADO)
    ]
    return gen.rng.choices(vigentes, weights=[_peso(gen, opcion, visita) for opcion in vigentes])[0]


def _plato_de(gen: Generador, visita: Visita) -> Vendible:
    """Plato de una persona: al mediodia de semana hay menu ejecutivo y menu del dia."""
    azar = gen.rng.random()
    if visita.almuerzo and visita.llegada.weekday() < 5 and azar < 0.25:
        return _elegir(gen, gen.catalogo.menus_ejecutivos, visita)
    if visita.almuerzo and azar < 0.4:
        return _elegir(gen, gen.catalogo.menus_del_dia(), visita)
    return _elegir(gen, gen.catalogo.del_grupo(PRINCIPALES), visita)


def _armar_pedido(gen: Generador, visita: Visita, personas: int) -> Counter[Vendible]:
    """Lo que pide la mesa: plato y casi siempre bebida por persona, entradas y postres."""
    pedido: Counter[Vendible] = Counter()
    catalogo = gen.catalogo
    for _ in range(personas):
        pedido[_plato_de(gen, visita)] += 1
        if gen.rng.random() < 0.85:
            bebida = _elegir(gen, catalogo.del_grupo(BEBIDAS), visita)
            pinta_doble = bebida.seccion == SECCION_CON_PINTAS and gen.rng.random() < 0.35
            pedido[bebida] += 2 if pinta_doble else 1
        if gen.rng.random() < 0.35:
            pedido[_elegir(gen, catalogo.del_grupo(POSTRES), visita)] += 1
    for _ in range(gen.rng.randint(0, max(1, personas // 2))):
        pedido[_elegir(gen, catalogo.del_grupo(ENTRADAS), visita)] += 1
    return pedido


def precio_historico(precio: Decimal, dias_atras: int) -> Decimal:
    """Precio vigente hace `dias_atras` dias: hubo aumentos hace 30 y hace 60 dias."""
    if dias_atras > 60:
        factor = Decimal("0.85")
    elif dias_atras > 30:
        factor = Decimal("0.93")
    else:
        return precio.quantize(CENTAVO)
    redondeado = (precio * factor / 100).quantize(Decimal(1), rounding=ROUND_HALF_UP) * 100
    return redondeado.quantize(CENTAVO)


def _armar_detalles(
    gen: Generador, visita: Visita, personas: int, *, entregado: bool
) -> list[DetalleComanda]:
    momento = visita.llegada.astimezone(UTC)
    detalles = []
    for item, cantidad in _armar_pedido(gen, visita, personas).items():
        precio = precio_historico(item.precio, visita.dias_atras)
        descuento, promocion_id = _promocion(gen, item, precio, cantidad, momento)
        servida = cantidad if entregado else 0
        detalles.append(
            DetalleComanda(
                producto_id=None if item.es_menu else item.id,
                menu_ejecutivo_id=item.id if item.es_menu else None,
                cantidad=cantidad,
                cantidad_entregada=servida,
                cantidad_lista=servida,
                estado_entrega=EstadoEntrega.ENTREGADO if entregado else EstadoEntrega.PENDIENTE,
                precio_unitario=precio,
                descuento=descuento,
                promocion_id=promocion_id,
            )
        )
    return detalles


def _promocion(
    gen: Generador, item: Vendible, precio: Decimal, cantidad: int, momento: datetime
) -> tuple[Decimal, int | None]:
    """Descuento de la promocion vigente en el momento de la linea, con la regla de M2."""
    if item.es_menu or item.id not in gen.catalogo.productos_en_promocion:
        return CERO, None
    aplicada = menus_service.promocion_para_linea(
        gen.db,
        producto_id=item.id,
        menu_ejecutivo_id=None,
        precio_unitario=precio,
        cantidad=cantidad,
        momento=momento,
    )
    if aplicada is None:
        return CERO, None
    return aplicada.descuento, aplicada.promocion_id


def _facturar_todas(gen: Generador, cerradas: list[tuple[Comanda, datetime]]) -> None:
    gen.db.flush()
    cobros: list[Cobro] = []
    for comanda, fin in cerradas:
        cobros += _facturar(gen, comanda, fin)
    gen.db.flush()
    for cobro in cobros:
        cobro.numero_comprobante = cobro.id  # S2 de pagos: el comprobante es el id del cobro


def _facturar(gen: Generador, comanda: Comanda, fin: datetime) -> list[Cobro]:
    """Factura con la copia de las lineas (subtotal = cantidad x precio - descuento) y cobros."""
    detalles = [
        DetalleFactura(
            producto_id=linea.producto_id,
            menu_ejecutivo_id=linea.menu_ejecutivo_id,
            descripcion=gen.catalogo.nombre(linea),
            cantidad=linea.cantidad,
            precio_unitario=linea.precio_unitario,
            descuento=linea.descuento,
            subtotal=(linea.cantidad * linea.precio_unitario - linea.descuento).quantize(CENTAVO),
        )
        for linea in comanda.detalles
    ]
    total = sum((detalle.subtotal for detalle in detalles), CERO)
    reciente = gen.ahora - fin < timedelta(days=DIAS_CON_DEUDA)
    cobros = _armar_cobros(gen, total, fin, reciente)
    saldo = total - sum((cobro.monto for cobro in cobros), CERO)
    gen.db.add(
        Factura(
            comanda_id=comanda.id,
            fecha_emision=fin,
            total=total,
            saldo_pendiente=saldo,
            estado=EstadoFactura.PAGADA if saldo == CERO else EstadoFactura.ADEUDADA,
            detalles=detalles,
            cobros=cobros,
        )
    )
    return cobros


def _armar_cobros(gen: Generador, total: Decimal, fin: datetime, reciente: bool) -> list[Cobro]:
    """Un pago completo, dos medios distintos que suman el total o un pago parcial reciente."""
    azar = gen.rng.random()
    if reciente and azar < 0.07:
        montos = [(total * Decimal(gen.rng.choice(("0.4", "0.5", "0.6")))).quantize(CENTAVO)]
    elif azar < 0.22:
        primero = (total * gen.rng.randint(30, 70) / 100).quantize(CENTAVO)
        montos = [primero, total - primero]
    else:
        montos = [total]
    medios = _elegir_medios(gen, len(montos))
    return [
        Cobro(medio_pago_id=medio, monto=monto, fecha_hora=fin + timedelta(minutes=indice))
        for indice, (medio, monto) in enumerate(zip(medios, montos, strict=True))
        if monto > CERO
    ]


def _elegir_medios(gen: Generador, cantidad: int) -> list[int]:
    """Medios distintos: una factura no repite medio de pago (regla de `registrar_cobro`)."""
    disponibles = list(gen.catalogo.medios_pago)
    elegidos = []
    for _ in range(cantidad):
        medio = gen.rng.choices(disponibles, weights=[peso for _, peso in disponibles])[0]
        disponibles.remove(medio)
        elegidos.append(medio[0])
    return elegidos
