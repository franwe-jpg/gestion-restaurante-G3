"""Pruebas del reporte de mesas atendidas y ventas por mozo (HU-M3-13)."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion.models import Comanda, DetalleComanda
from app.modules.salon import service
from app.shared.excepciones import DatosInvalidosError

RUTA = "/api/v1/reportes/mesas-ventas-por-mozo"
ZONA = timezone(timedelta(hours=-3))
DIA = datetime(2026, 11, 1, 20, 0, tzinfo=ZONA)
FUERA_DEL_PERIODO = datetime(2026, 10, 31, 20, 0, tzinfo=ZONA)


def _sembrar_producto(db: Session, precio: Decimal = Decimal("10.00")) -> None:
    db.execute(
        text(
            "INSERT INTO secciones (id, nombre, nombre_normalizado, orden, estado) "
            "VALUES (1, 'Carta', 'carta', 1, 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO productos (id, nombre, nombre_normalizado, categoria, precio, "
            "ingredientes, etiquetas, estado, seccion_id) "
            "VALUES (1, 'Plato', 'plato', 'PLATO', :precio, '[]', '[]', 'HABILITADO', 1)"
        ),
        {"precio": precio},
    )


def _pedido(
    db: Session,
    mozo_id: int | None,
    mesa_id: int,
    fecha_hora: datetime = DIA,
    estado: str = "CERRADA",
    cantidad: int = 2,
    precio_unitario: Decimal = Decimal("10.00"),
    descuento: Decimal = Decimal("0.00"),
) -> Comanda:
    comanda = Comanda(
        mesa_id=mesa_id,
        mozo_id=mozo_id,
        estado=estado,
        fecha_hora=fecha_hora,
    )
    db.add(comanda)
    db.flush()
    db.add(
        DetalleComanda(
            comanda_id=comanda.id,
            producto_id=1,
            cantidad=cantidad,
            precio_unitario=precio_unitario,
            descuento=descuento,
        )
    )
    db.commit()
    return comanda


# CA 1 y CA 5
def test_generar_reporte_agrupa_mesas_y_ventas_por_mozo(
    db, fabrica_mozo, fabrica_sector, fabrica_mesa
):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa_1 = fabrica_mesa(sector, numero=1)
    mesa_2 = fabrica_mesa(sector, numero=2)
    ana = fabrica_mozo(dni="30111111", nombre="Ana", apellido="Pérez")
    beto = fabrica_mozo(dni="30222222", nombre="Beto", apellido="Gómez")
    _pedido(db, ana.id, mesa_1.id)
    _pedido(db, ana.id, mesa_2.id)
    _pedido(db, beto.id, mesa_1.id, cantidad=1)

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date())

    lineas = {linea.mozo_id: linea for linea in reporte.lineas}
    assert lineas[ana.id].mesas_atendidas == 2
    assert lineas[ana.id].total_ventas == Decimal("40.00")
    assert lineas[ana.id].promedio_por_mesa == Decimal("20.00")
    assert lineas[beto.id].mesas_atendidas == 1
    assert lineas[beto.id].total_ventas == Decimal("10.00")
    assert lineas[beto.id].promedio_por_mesa == Decimal("10.00")


# CA 3
def test_generar_reporte_muestra_en_cero_al_mozo_sin_actividad(
    db, fabrica_mozo, fabrica_sector, fabrica_mesa
):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa = fabrica_mesa(sector)
    con_ventas = fabrica_mozo(dni="30111111", nombre="Ana", apellido="Pérez")
    sin_ventas = fabrica_mozo(dni="30222222", nombre="Beto", apellido="Gómez")
    _pedido(db, con_ventas.id, mesa.id)

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date())

    inactivo = next(linea for linea in reporte.lineas if linea.mozo_id == sin_ventas.id)
    assert inactivo.mesas_atendidas == 0
    assert inactivo.total_ventas == Decimal("0.00")
    assert inactivo.promedio_por_mesa == Decimal("0.00")


# CA 2 y CA 6
def test_generar_reporte_sin_ventas_devuelve_totales_en_cero(
    db, fabrica_mozo, fabrica_sector, fabrica_mesa
):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa = fabrica_mesa(sector)
    mozo = fabrica_mozo()
    _pedido(db, mozo.id, mesa.id, fecha_hora=FUERA_DEL_PERIODO)

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date())

    assert reporte.total_mesas_atendidas == 0
    assert reporte.total_ventas == Decimal("0.00")
    assert reporte.promedio_general == Decimal("0.00")
    assert all(linea.mesas_atendidas == 0 for linea in reporte.lineas)


def test_generar_reporte_ignora_comandas_anuladas(db, fabrica_mozo, fabrica_sector, fabrica_mesa):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa = fabrica_mesa(sector)
    mozo = fabrica_mozo()
    _pedido(db, mozo.id, mesa.id, estado="ANULADA")

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date())

    assert reporte.total_ventas == Decimal("0.00")


def test_generar_reporte_calcula_el_descuento_por_linea(
    db, fabrica_mozo, fabrica_sector, fabrica_mesa
):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa = fabrica_mesa(sector)
    mozo = fabrica_mozo()
    _pedido(db, mozo.id, mesa.id, cantidad=3, descuento=Decimal("5.00"))

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date())

    assert reporte.lineas[0].total_ventas == Decimal("25.00")


def test_generar_reporte_totales_y_promedio_general(db, fabrica_mozo, fabrica_sector, fabrica_mesa):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa_1 = fabrica_mesa(sector, numero=1)
    mesa_2 = fabrica_mesa(sector, numero=2)
    mesa_3 = fabrica_mesa(sector, numero=3)
    ana = fabrica_mozo(dni="30111111", nombre="Ana", apellido="Pérez")
    beto = fabrica_mozo(dni="30222222", nombre="Beto", apellido="Gómez")
    _pedido(db, ana.id, mesa_1.id)
    _pedido(db, ana.id, mesa_2.id)
    _pedido(db, beto.id, mesa_3.id, cantidad=1)

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date())

    assert reporte.total_mesas_atendidas == 3
    assert reporte.total_ventas == Decimal("50.00")
    assert reporte.promedio_general == Decimal("16.67")


def test_generar_reporte_filtra_por_mozo(db, fabrica_mozo, fabrica_sector, fabrica_mesa):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa = fabrica_mesa(sector)
    ana = fabrica_mozo(dni="30111111", nombre="Ana", apellido="Pérez")
    beto = fabrica_mozo(dni="30222222", nombre="Beto", apellido="Gómez")
    _pedido(db, ana.id, mesa.id)

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date(), mozo_id=beto.id)

    assert [linea.mozo_id for linea in reporte.lineas] == [beto.id]
    assert reporte.lineas[0].mesas_atendidas == 0


def test_generar_reporte_filtra_por_sector(db, fabrica_mozo, fabrica_sector, fabrica_mesa):
    _sembrar_producto(db)
    salon = fabrica_sector("Salón")
    terraza = fabrica_sector("Terraza")
    mesa_salon = fabrica_mesa(salon, numero=1)
    mesa_terraza = fabrica_mesa(terraza, numero=1)
    ana = fabrica_mozo(dni="30111111", nombre="Ana", apellido="Pérez")
    beto = fabrica_mozo(dni="30222222", nombre="Beto", apellido="Gómez")
    _pedido(db, ana.id, mesa_salon.id)
    _pedido(db, beto.id, mesa_terraza.id)

    reporte = service.generar_reporte_mozos(db, DIA.date(), DIA.date(), sector_id=terraza.id)

    lineas = {linea.mozo_id: linea for linea in reporte.lineas}
    assert lineas[ana.id].total_ventas == Decimal("0.00")
    assert lineas[beto.id].total_ventas == Decimal("20.00")


@pytest.mark.parametrize(
    ("desde", "hasta"),
    [
        (None, None),
        (DIA.date(), None),
        (None, DIA.date()),
        (DIA.date(), DIA.date() - timedelta(days=1)),
    ],
    ids=["ambas-faltan", "falta-hasta", "falta-desde", "periodo-inverso"],
)
def test_generar_reporte_rechaza_periodo_invalido(db, desde, hasta):
    with pytest.raises(DatosInvalidosError):
        service.generar_reporte_mozos(db, desde, hasta)


# Contrato HTTP
def test_router_reporte_devuelve_200_con_importes_como_texto(
    cliente: TestClient, db, fabrica_mozo, fabrica_sector, fabrica_mesa
):
    _sembrar_producto(db)
    sector = fabrica_sector()
    mesa = fabrica_mesa(sector)
    mozo = fabrica_mozo()
    _pedido(db, mozo.id, mesa.id)

    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-01"})

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["fecha_desde"] == "2026-11-01"
    assert cuerpo["fecha_hasta"] == "2026-11-01"
    assert cuerpo["total_mesas_atendidas"] == 1
    assert cuerpo["total_ventas"] == "20.00"
    assert cuerpo["promedio_general"] == "20.00"
    assert cuerpo["lineas"] == [
        {
            "mozo_id": mozo.id,
            "nombre": "Juan",
            "apellido": "Fernández",
            "mesas_atendidas": 1,
            "total_ventas": "20.00",
            "promedio_por_mesa": "20.00",
        }
    ]


@pytest.mark.parametrize(
    "parametros",
    [
        {},
        {"fecha_desde": "2026-11-01"},
        {"fecha_hasta": "2026-11-01"},
        {"fecha_desde": "2026-11-02", "fecha_hasta": "2026-11-01"},
        {"fecha_desde": "no-es-fecha", "fecha_hasta": "2026-11-01"},
        {"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-01", "mozo_id": 0},
    ],
    ids=["sin-fechas", "falta-hasta", "falta-desde", "inverso", "formato", "mozo-invalido"],
)
def test_router_reporte_responde_422_sin_generar(cliente: TestClient, parametros: dict):
    respuesta = cliente.get(RUTA, params=parametros)

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


def test_router_reporte_filtros_opcionales_por_mozo_y_sector(
    cliente: TestClient, db, fabrica_mozo, fabrica_sector, fabrica_mesa
):
    _sembrar_producto(db)
    salon = fabrica_sector("Salón")
    mesa = fabrica_mesa(salon)
    mozo = fabrica_mozo()
    _pedido(db, mozo.id, mesa.id)

    respuesta = cliente.get(
        RUTA,
        params={
            "fecha_desde": "2026-11-01",
            "fecha_hasta": "2026-11-01",
            "mozo_id": mozo.id,
            "sector_id": salon.id,
        },
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["total_mesas_atendidas"] == 1
