"""menus: vigencia y descuento de una promocion sobre una linea (S4-02)."""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from app.modules.menus.models import DiaSemana, Promocion, TipoPromocion
from app.shared.models import Estado

# S4-02: UTC-3 fijo todo el año, igual que salon/reporte.py; se unificara en shared/ mas adelante.
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")
CENTAVO = Decimal("0.01")
CERO = Decimal("0.00")


@dataclass(frozen=True)
class PromocionAplicable:
    """Promocion elegida para una linea, con su descuento absoluto ya redondeado."""

    promocion_id: int
    descuento: Decimal


def momento_local(momento: datetime) -> datetime:
    """Convierte el instante de la comanda a la hora local del restaurante."""
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=UTC)
    return momento.astimezone(ZONA_DEL_RESTAURANTE)


def es_vigente(promocion: Promocion, momento: datetime) -> bool:
    """Estado, fecha, dia de la semana y franja horaria, evaluados en hora local."""
    if promocion.estado != Estado.HABILITADO:
        return False
    local = momento_local(momento)
    if not promocion.fecha_desde <= local.date() <= promocion.fecha_hasta:
        return False
    dia = DiaSemana(list(DiaSemana)[local.weekday()]).value
    if dia not in promocion.dias_semana:
        return False
    if promocion.hora_desde is not None and promocion.hora_hasta is not None:
        return promocion.hora_desde <= local.time() < promocion.hora_hasta
    return True


def calcular_descuento(promocion: Promocion, precio_unitario: Decimal, cantidad: int) -> Decimal:
    """Descuento absoluto de la linea segun el tipo, acotado al importe bruto."""
    bruto = precio_unitario * cantidad
    if promocion.tipo == TipoPromocion.PORCENTAJE:
        descuento = bruto * Decimal(promocion.descuento_porcentaje or 0) / 100
    elif promocion.tipo == TipoPromocion.PRECIO_FIJO:
        descuento = (precio_unitario - (promocion.precio_fijo or CERO)) * cantidad
    else:
        descuento = _descuento_nxm(promocion, precio_unitario, cantidad)
    return min(max(descuento, CERO), bruto).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def _descuento_nxm(promocion: Promocion, precio_unitario: Decimal, cantidad: int) -> Decimal:
    """Solo los grupos completos: «lleva 2, paga 1» sobre 3 deja 1 a precio regular."""
    lleva = promocion.cant_lleva or 0
    paga = promocion.cant_paga or 0
    if lleva <= 0 or paga >= lleva:
        return CERO
    unidades_gratis = (cantidad // lleva) * (lleva - paga)
    return precio_unitario * unidades_gratis


def elegir_promocion(
    promociones: Iterable[Promocion],
    precio_unitario: Decimal,
    cantidad: int,
    momento: datetime,
) -> PromocionAplicable | None:
    """La promocion vigente de mayor descuento; en empate, la de menor id."""
    aplicables = [
        PromocionAplicable(
            promocion_id=promocion.id,
            descuento=calcular_descuento(promocion, precio_unitario, cantidad),
        )
        for promocion in promociones
        if promocion.id is not None and es_vigente(promocion, momento)
    ]
    aplicables = [aplicable for aplicable in aplicables if aplicable.descuento > CERO]
    if not aplicables:
        return None
    return max(aplicables, key=lambda aplicable: (aplicable.descuento, -aplicable.promocion_id))
