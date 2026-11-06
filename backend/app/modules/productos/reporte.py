"""productos: cálculo puro del reporte de productos más vendidos (HU-M1-15), sin base de datos."""

from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from datetime import UTC, date, datetime, time, timedelta, timezone

from app.modules.atencion.service import CantidadPedidaPorFranja
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import (
    DiaSemana,
    FranjaHoraria,
    LineaReporteProductos,
    SeccionReporte,
)
from app.shared.excepciones import DatosInvalidosError
from app.shared.models import Producto

# S116: UTC-3 fijo todo el año; se unificará con la de reservas en shared/ más adelante.
DESPLAZAMIENTO_HORAS = -3
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=DESPLAZAMIENTO_HORAS), "ART")
_DIAS = list(DiaSemana)


def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Exige ambas fechas y que el período no sea inverso; devuelve las fechas válidas."""
    if desde is None and hasta is None:
        raise DatosInvalidosError("Faltan la fecha desde y la fecha hasta.")
    if desde is None:
        raise DatosInvalidosError("Falta la fecha desde.")
    if hasta is None:
        raise DatosInvalidosError("Falta la fecha hasta.")
    if desde > hasta:
        raise DatosInvalidosError(
            "El período es inválido: la fecha desde es posterior a la fecha hasta."
        )
    return desde, hasta


def intervalo_utc(desde: date, hasta: date) -> tuple[datetime, datetime]:
    """Intervalo semiabierto en UTC: de las 00:00 locales de `desde` a las 00:00 de `hasta + 1`."""
    inicio = datetime.combine(desde, time.min, tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)
    try:
        fin_local = datetime.combine(hasta + timedelta(days=1), time.min)
    except OverflowError:
        return inicio, datetime.max.replace(tzinfo=UTC)
    return inicio, fin_local.replace(tzinfo=ZONA_DEL_RESTAURANTE).astimezone(UTC)


def _ganadores[T](cantidades: Mapping[T, int]) -> list[T]:
    maximo = max(cantidades.values())
    return sorted(clave for clave, cantidad in cantidades.items() if cantidad == maximo)


def dias_mas_pedidos(franjas: Iterable[CantidadPedidaPorFranja]) -> list[DiaSemana]:
    """Días de la semana con más unidades (todos los empatados, de lunes a domingo)."""
    por_dia: defaultdict[int, int] = defaultdict(int)
    for franja in franjas:
        por_dia[franja.dia_semana] += franja.cantidad
    return [_DIAS[dia] for dia in _ganadores(por_dia)]


def franjas_mas_pedidas(franjas: Iterable[CantidadPedidaPorFranja]) -> list[FranjaHoraria]:
    """Franjas de una hora con más unidades (todas las empatadas, en orden ascendente)."""
    por_hora: defaultdict[int, int] = defaultdict(int)
    for franja in franjas:
        por_hora[franja.hora] += franja.cantidad
    return [
        FranjaHoraria(hora_desde=hora, hora_hasta=(hora + 1) % 24) for hora in _ganadores(por_hora)
    ]


def _linea(producto: Producto, franjas: Sequence[CantidadPedidaPorFranja]) -> LineaReporteProductos:
    return LineaReporteProductos(
        producto_id=producto.id,
        nombre=producto.nombre,
        estado=producto.estado,
        cantidad_pedida=sum(franja.cantidad for franja in franjas),
        dias_mas_pedidos=dias_mas_pedidos(franjas),
        franjas_mas_pedidas=franjas_mas_pedidas(franjas),
    )


def armar_secciones(
    cantidades: Iterable[CantidadPedidaPorFranja],
    productos: Iterable[Producto],
    secciones: Mapping[int, Seccion],
) -> list[SeccionReporte]:
    """Agrupa por sección (orden de la carta) y ordena por cantidad, nombre e id."""
    por_producto: defaultdict[int, list[CantidadPedidaPorFranja]] = defaultdict(list)
    for fila in cantidades:
        por_producto[fila.producto_id].append(fila)
    por_seccion: defaultdict[int, list[LineaReporteProductos]] = defaultdict(list)
    for producto in productos:
        if producto.id in por_producto:
            por_seccion[producto.seccion_id].append(_linea(producto, por_producto[producto.id]))
    ordenadas = sorted(
        (secciones[id_] for id_ in por_seccion), key=lambda s: (s.orden, s.nombre, s.id)
    )
    return [
        SeccionReporte(
            id=seccion.id,
            nombre=seccion.nombre,
            orden=seccion.orden,
            productos=sorted(
                por_seccion[seccion.id],
                key=lambda linea: (-linea.cantidad_pedida, linea.nombre, linea.producto_id),
            ),
        )
        for seccion in ordenadas
    ]
