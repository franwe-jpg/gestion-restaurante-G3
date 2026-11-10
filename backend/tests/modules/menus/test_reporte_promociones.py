"""Pruebas del reporte de impacto de promociones (HU-M2-10)."""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda, DetalleComanda
from app.modules.menus import service
from app.modules.menus.models import DiaSemana, Promocion, TipoPromocion
from app.modules.menus.schemas import UnidadPromedio
from app.modules.salon.models import Mesa, Sector
from app.shared.excepciones import DatosInvalidosError
from app.shared.models import Estado

RUTA = "/api/v1/reportes/impacto-promociones"
ZONA = timezone(timedelta(hours=-3))
DESDE = date(2026, 11, 1)
HASTA = date(2026, 11, 10)
PROMO_DESDE = DESDE
PROMO_HASTA = date(2026, 11, 2)
NOV_1 = datetime(2026, 11, 1, 20, tzinfo=ZONA)
NOV_2 = datetime(2026, 11, 2, 20, tzinfo=ZONA)
NOV_3 = datetime(2026, 11, 3, 20, tzinfo=ZONA)


@pytest.fixture
def mesa(db: Session) -> Mesa:
    sector = Sector(nombre="Salón")
    db.add(sector)
    db.flush()
    mesa = Mesa(numero=1, capacidad=4, sector_id=sector.id)
    db.add(mesa)
    db.commit()
    return mesa


def _promocion(
    db: Session,
    productos,
    estado: Estado = Estado.HABILITADO,
    nombre: str = "Promo",
    fecha_desde: date = PROMO_DESDE,
    fecha_hasta: date = PROMO_HASTA,
    dias_semana: list[DiaSemana] | None = None,
    hora_desde=None,
    hora_hasta=None,
) -> Promocion:
    promocion = Promocion(
        nombre=nombre,
        tipo=TipoPromocion.PORCENTAJE,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        dias_semana=[dia.value for dia in (dias_semana or list(DiaSemana))],
        hora_desde=hora_desde,
        hora_hasta=hora_hasta,
        descuento_porcentaje=10,
        estado=estado,
        productos=list(productos),
    )
    db.add(promocion)
    db.commit()
    return promocion


def _comanda(
    db: Session,
    mesa: Mesa,
    fecha_hora: datetime,
    producto_id: int,
    cantidad: int,
    promocion_id: int | None = None,
    estado: str = "CERRADA",
) -> None:
    comanda = Comanda(mesa_id=mesa.id, estado=estado, fecha_hora=fecha_hora)
    db.add(comanda)
    db.flush()
    db.add(
        DetalleComanda(
            comanda_id=comanda.id,
            producto_id=producto_id,
            cantidad=cantidad,
            precio_unitario=Decimal("10.00"),
            descuento=Decimal("0.00"),
            promocion_id=promocion_id,
        )
    )
    db.commit()


# CA 1
def test_reporte_calcula_promedios_y_variacion(
    db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Milanesa")
    promocion = _promocion(db, [producto])
    _comanda(db, mesa, NOV_1, producto.id, 30, promocion.id)
    _comanda(db, mesa, NOV_2, producto.id, 30, promocion.id)
    _comanda(db, mesa, NOV_3, producto.id, 80)

    reporte = service.generar_reporte_impacto_promociones(db, DESDE, HASTA, promocion.id)

    assert reporte.hay_datos is True
    assert reporte.dias_promocion == 2
    assert reporte.dias_fuera == 8
    assert reporte.unidad_promedio == UnidadPromedio.DIA
    linea = reporte.lineas[0]
    assert linea.promedio_durante == Decimal("30.00")
    assert linea.promedio_fuera == Decimal("10.00")
    assert linea.diferencia_promedio == Decimal("20.00")
    assert linea.impacto_estimado == Decimal("40.00")
    assert linea.variacion_porcentual == Decimal("200.00")
    assert linea.dias_con_ventas_promocion == 2


def test_reporte_usa_los_dias_programados_y_no_los_dias_con_ventas(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Pizza")
    promocion = _promocion(
        db,
        [producto],
        fecha_desde=date(2026, 11, 2),
        fecha_hasta=date(2026, 11, 8),
        dias_semana=[DiaSemana.LUNES],
    )

    reporte = service.generar_reporte_impacto_promociones(
        db, date(2026, 11, 2), date(2026, 11, 8), promocion.id
    )

    assert reporte.dias_promocion == 1
    assert reporte.dias_fuera == 6


def test_reporte_con_franja_horaria_promedia_por_hora(
    db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Pizza")
    promocion = _promocion(
        db,
        [producto],
        fecha_desde=DESDE,
        fecha_hasta=DESDE,
        hora_desde=time(17, 0),
        hora_hasta=time(20, 0),
    )
    _comanda(db, mesa, datetime(2026, 11, 1, 18, tzinfo=ZONA), producto.id, 6, promocion.id)

    reporte = service.generar_reporte_impacto_promociones(db, DESDE, DESDE, promocion.id)

    assert reporte.unidad_promedio == UnidadPromedio.HORA
    assert reporte.horas_promocion_por_dia == Decimal("3.00")
    assert reporte.lineas[0].promedio_durante == Decimal("2.00")
    assert reporte.lineas[0].impacto_estimado == Decimal("6.00")


# CA 4
def test_reporte_con_ventas_solo_promocionales_deja_fuera_en_cero(
    db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Pizza")
    promocion = _promocion(db, [producto])
    _comanda(db, mesa, NOV_1, producto.id, 5, promocion.id)

    linea = service.generar_reporte_impacto_promociones(db, DESDE, HASTA, promocion.id).lineas[0]

    assert linea.promedio_fuera == Decimal("0.00")
    assert linea.variacion_porcentual is None


# CA 5
def test_reporte_sin_ventas_de_la_promocion_no_tiene_datos(
    db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Pizza")
    promocion = _promocion(db, [producto])
    _comanda(db, mesa, NOV_1, producto.id, 5)

    reporte = service.generar_reporte_impacto_promociones(db, DESDE, HASTA, promocion.id)

    assert reporte.hay_datos is False
    assert reporte.lineas == []


# CA 6
def test_reporte_incluye_producto_y_promocion_deshabilitados(
    db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Pizza", estado=Estado.DESHABILITADO)
    promocion = _promocion(db, [producto], Estado.DESHABILITADO)
    _comanda(db, mesa, NOV_1, producto.id, 5, promocion.id)

    reporte = service.generar_reporte_impacto_promociones(db, DESDE, HASTA, promocion.id)

    assert reporte.promocion.estado == Estado.DESHABILITADO
    assert reporte.lineas[0].estado == Estado.DESHABILITADO


def test_reporte_ignora_comandas_anuladas(
    db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Pizza")
    promocion = _promocion(db, [producto])
    _comanda(db, mesa, NOV_1, producto.id, 5, promocion.id, estado="ANULADA")

    reporte = service.generar_reporte_impacto_promociones(db, DESDE, HASTA, promocion.id)

    assert reporte.hay_datos is False


@pytest.mark.parametrize(
    ("desde", "hasta"),
    [(None, None), (DESDE, None), (None, HASTA), (HASTA, DESDE)],
    ids=["ambas-faltan", "falta-hasta", "falta-desde", "periodo-inverso"],
)
def test_reporte_rechaza_periodo_invalido(db: Session, desde, hasta) -> None:
    with pytest.raises(DatosInvalidosError):
        service.generar_reporte_impacto_promociones(db, desde, hasta, 1)


def test_reporte_rechaza_promocion_faltante(db: Session) -> None:
    with pytest.raises(DatosInvalidosError, match="Falta la promoción"):
        service.generar_reporte_impacto_promociones(db, DESDE, HASTA, None)


# Contrato HTTP
def test_router_reporte_devuelve_200_con_los_promedios_como_texto(
    cliente: TestClient, db: Session, fabrica_seccion, fabrica_producto, mesa
) -> None:
    producto = fabrica_producto(fabrica_seccion(), "Milanesa")
    promocion = _promocion(db, [producto])
    _comanda(db, mesa, NOV_1, producto.id, 10, promocion.id)

    respuesta = cliente.get(
        RUTA,
        params={
            "fecha_desde": DESDE.isoformat(),
            "fecha_hasta": HASTA.isoformat(),
            "promocion_id": promocion.id,
        },
    )

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["promocion"]["id"] == promocion.id
    assert cuerpo["dias_promocion"] == 2
    assert cuerpo["dias_fuera"] == 8
    assert cuerpo["unidad_promedio"] == "DIA"
    assert cuerpo["hay_datos"] is True
    assert cuerpo["lineas"][0]["promedio_durante"] == "5.00"
    assert cuerpo["lineas"][0]["promedio_fuera"] == "0.00"
    assert cuerpo["lineas"][0]["variacion_porcentual"] is None


@pytest.mark.parametrize(
    "parametros",
    [
        {"fecha_hasta": "2026-11-10", "promocion_id": 1},
        {"fecha_desde": "2026-11-01", "promocion_id": 1},
        {"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-10"},
    ],
    ids=["sin-fecha-desde", "sin-fecha-hasta", "sin-promocion"],
)
def test_router_reporte_responde_422_cuando_falta_un_filtro(
    cliente: TestClient, parametros: dict
) -> None:
    respuesta = cliente.get(RUTA, params=parametros)

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


def test_router_reporte_promocion_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.get(
        RUTA,
        params={"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-10", "promocion_id": 999},
    )

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La promoción 999 no existe"}
