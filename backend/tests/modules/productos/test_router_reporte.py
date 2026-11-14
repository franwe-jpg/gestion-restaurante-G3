"""API del reporte de productos más vendidos (HU-M1-15): JSON y PDF."""

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.shared.models import Estado

from .conftest import FabricaProducto, FabricaSeccion, SembrarComanda

RUTA = "/api/v1/reportes/productos-mas-vendidos"
PERIODO = {"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-05"}
MEDIODIA = datetime(2026, 11, 3, 15, tzinfo=UTC)  # 12:00 locales, martes


def _nombres(cuerpo: dict) -> list[tuple[str, list[str]]]:
    return [(s["nombre"], [p["nombre"] for p in s["productos"]]) for s in cuerpo["secciones"]]


# CA 1
def test_reporte_ordena_productos_por_cantidad_y_secciones_por_orden_de_carta(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    platos = fabrica_seccion("Platos", 1)
    bebidas = fabrica_seccion("Bebidas", 2)
    milanesa = fabrica_producto(platos, "Milanesa")
    noquis = fabrica_producto(platos, "Ñoquis")
    agua = fabrica_producto(bebidas, "Agua")
    sembrar_comanda(MEDIODIA, [(milanesa.id, 5), (noquis.id, 9), (agua.id, 3)])

    respuesta = cliente.get(RUTA, params=PERIODO)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["fecha_desde"] == "2026-11-01"
    assert _nombres(cuerpo) == [("Platos", ["Ñoquis", "Milanesa"]), ("Bebidas", ["Agua"])]
    assert cuerpo["secciones"][0]["productos"][0] == {
        "producto_id": noquis.id,
        "nombre": "Ñoquis",
        "estado": "HABILITADO",
        "cantidad_pedida": 9,
        "dias_mas_pedidos": ["MARTES"],
        "franjas_mas_pedidas": [{"hora_desde": 12, "hora_hasta": 13}],
    }


def test_reporte_suma_cantidades_y_no_lineas(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    flan = fabrica_producto(fabrica_seccion(), "Flan")
    sembrar_comanda(MEDIODIA, [(flan.id, 3)])
    sembrar_comanda(MEDIODIA, [(flan.id, 2)])

    cuerpo = cliente.get(RUTA, params=PERIODO).json()

    assert cuerpo["secciones"][0]["productos"][0]["cantidad_pedida"] == 5


def test_reporte_solo_incluye_productos_y_secciones_con_pedidos(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    postres = fabrica_seccion("Postres", 1)
    fabrica_seccion("Vacia", 2)
    flan = fabrica_producto(postres, "Flan")
    fabrica_producto(postres, "Helado")
    sembrar_comanda(MEDIODIA, [(flan.id, 1)])

    cuerpo = cliente.get(RUTA, params=PERIODO).json()

    assert _nombres(cuerpo) == [("Postres", ["Flan"])]


# CA 2
def test_reporte_de_un_periodo_sin_comandas_responde_200_con_secciones_vacia(
    cliente: TestClient,
) -> None:
    respuesta = cliente.get(RUTA, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.json()["secciones"] == []


def test_reporte_con_solo_comandas_anuladas_responde_secciones_vacia(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    sembrar_comanda(MEDIODIA, [(pizza.id, 4)], "ANULADA")

    respuesta = cliente.get(RUTA, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.json()["secciones"] == []


# CA 3
def test_reporte_sin_fecha_desde_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_hasta": "2026-11-05"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Falta la fecha desde."}


def test_reporte_sin_fecha_hasta_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-11-01"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Falta la fecha hasta."}


def test_reporte_sin_fechas_responde_422_nombrando_las_dos(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA)

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Faltan la fecha desde y la fecha hasta."}


def test_reporte_con_formato_de_fecha_invalido_responde_422_con_detalle(
    cliente: TestClient,
) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "31-12-2026", "fecha_hasta": "2026-12-31"})

    assert respuesta.status_code == 422
    assert "detalle" in respuesta.json()


# CA 4
def test_reporte_con_desde_posterior_a_hasta_responde_422(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"fecha_desde": "2026-11-10", "fecha_hasta": "2026-11-05"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."
    }


def test_reporte_de_un_solo_dia_cuenta_los_pedidos_de_ese_dia_local(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    sembrar_comanda(MEDIODIA, [(pizza.id, 2)])

    cuerpo = cliente.get(RUTA, params={"fecha_desde": "2026-11-03", "fecha_hasta": "2026-11-03"})

    assert cuerpo.status_code == 200
    assert _nombres(cuerpo.json()) == [("Postres", ["Pizza"])]


# CA 5
def test_reporte_incluye_producto_y_seccion_deshabilitados_con_su_estado(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    seccion = fabrica_seccion("Viejos", 1, Estado.DESHABILITADO)
    producto = fabrica_producto(seccion, "Flan", Estado.DESHABILITADO)
    sembrar_comanda(MEDIODIA, [(producto.id, 2)])

    cuerpo = cliente.get(RUTA, params=PERIODO).json()

    assert _nombres(cuerpo) == [("Viejos", ["Flan"])]
    assert cuerpo["secciones"][0]["productos"][0]["estado"] == "DESHABILITADO"


# CA 6
def test_reporte_informa_empates_de_dia_y_de_franja(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    sembrar_comanda(datetime(2026, 11, 6, 16, 30, tzinfo=UTC), [(pizza.id, 3)])  # vie 13:30
    sembrar_comanda(datetime(2026, 11, 8, 0, 15, tzinfo=UTC), [(pizza.id, 3)])  # sáb 21:15

    linea = cliente.get(RUTA, params=PERIODO | {"fecha_hasta": "2026-11-08"}).json()
    linea = linea["secciones"][0]["productos"][0]

    assert linea["dias_mas_pedidos"] == ["VIERNES", "SABADO"]
    assert linea["franjas_mas_pedidas"] == [
        {"hora_desde": 13, "hora_hasta": 14},
        {"hora_desde": 21, "hora_hasta": 22},
    ]


# Qué cuenta
def test_reporte_excluye_anuladas_y_menus_y_cuenta_abiertas_cerradas_y_promociones(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    seccion = fabrica_seccion("Platos", 1)
    pizza = fabrica_producto(seccion, "Pizza")
    agua = fabrica_producto(seccion, "Agua")
    sembrar_comanda(MEDIODIA, [(pizza.id, 2)], "CERRADA")
    sembrar_comanda(MEDIODIA, [(pizza.id, 10)], "ANULADA")
    sembrar_comanda(MEDIODIA, [(pizza.id, 1)], "ABIERTA")
    sembrar_comanda(MEDIODIA, [(pizza.id, 2, 7)], "CERRADA")
    sembrar_comanda(MEDIODIA, [(None, 4), (agua.id, 1)], "CERRADA")

    productos = cliente.get(RUTA, params=PERIODO).json()["secciones"][0]["productos"]

    assert [(p["nombre"], p["cantidad_pedida"]) for p in productos] == [("Pizza", 5), ("Agua", 1)]


# Zona horaria
def test_reporte_asigna_la_madrugada_utc_al_dia_local_anterior(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    cafe = fabrica_producto(fabrica_seccion(), "Café")
    sembrar_comanda(datetime(2026, 11, 6, 2, tzinfo=UTC), [(cafe.id, 1)])

    jueves = cliente.get(RUTA, params={"fecha_desde": "2026-11-05", "fecha_hasta": "2026-11-05"})
    viernes = cliente.get(RUTA, params={"fecha_desde": "2026-11-06", "fecha_hasta": "2026-11-06"})

    linea = jueves.json()["secciones"][0]["productos"][0]
    assert linea["dias_mas_pedidos"] == ["JUEVES"]
    assert linea["franjas_mas_pedidas"] == [{"hora_desde": 23, "hora_hasta": 0}]
    assert viernes.json()["secciones"] == []


def test_reporte_fecha_hasta_incluye_todo_su_dia_local(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    flan = fabrica_producto(fabrica_seccion("Otra", 2), "Flan")
    sembrar_comanda(datetime(2026, 11, 6, 2, 59, 59, tzinfo=UTC), [(pizza.id, 1)])
    sembrar_comanda(datetime(2026, 11, 6, 3, tzinfo=UTC), [(flan.id, 1)])

    cuerpo = cliente.get(RUTA, params={"fecha_desde": "2026-11-05", "fecha_hasta": "2026-11-05"})

    assert _nombres(cuerpo.json()) == [("Postres", ["Pizza"])]


def test_reporte_fecha_desde_incluye_desde_las_00_locales(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    flan = fabrica_producto(fabrica_seccion("Otra", 2), "Flan")
    sembrar_comanda(datetime(2026, 11, 6, 3, tzinfo=UTC), [(pizza.id, 1)])
    sembrar_comanda(datetime(2026, 11, 6, 2, 59, 59, tzinfo=UTC), [(flan.id, 1)])

    cuerpo = cliente.get(RUTA, params={"fecha_desde": "2026-11-06", "fecha_hasta": "2026-11-06"})

    assert _nombres(cuerpo.json()) == [("Postres", ["Pizza"])]


# Solo lectura
def test_reporte_no_cambia_los_datos_ni_las_otras_consultas(
    cliente: TestClient,
    db: Session,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    sembrar_comanda(MEDIODIA, [(pizza.id, 1)])
    antes = [cliente.get(f"/api/v1/{ruta}").json() for ruta in ("carta", "productos", "secciones")]

    cliente.get(RUTA, params=PERIODO)
    db.rollback()

    despues = [
        cliente.get(f"/api/v1/{ruta}").json() for ruta in ("carta", "productos", "secciones")
    ]
    assert despues == antes


RUTA_PDF = f"{RUTA}/pdf"


# PDF
def test_reporte_pdf_responde_el_archivo_adjunto_con_el_periodo_en_el_nombre(
    cliente: TestClient,
    fabrica_seccion: FabricaSeccion,
    fabrica_producto: FabricaProducto,
    sembrar_comanda: SembrarComanda,
) -> None:
    pizza = fabrica_producto(fabrica_seccion(), "Pizza")
    sembrar_comanda(MEDIODIA, [(pizza.id, 2)])

    respuesta = cliente.get(RUTA_PDF, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["content-disposition"] == (
        'attachment; filename="productos-mas-vendidos_2026-11-01_2026-11-05.pdf"'
    )
    assert respuesta.content.startswith(b"%PDF")


def test_reporte_pdf_de_un_periodo_sin_datos_responde_200_con_pdf(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA_PDF, params=PERIODO)

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.content.startswith(b"%PDF")


def test_reporte_pdf_sin_fecha_desde_responde_422_sin_pdf(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA_PDF, params={"fecha_hasta": "2026-11-05"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {"detalle": "Falta la fecha desde."}


def test_reporte_pdf_con_periodo_invalido_responde_422_sin_pdf(cliente: TestClient) -> None:
    respuesta = cliente.get(
        RUTA_PDF, params={"fecha_desde": "2026-11-10", "fecha_hasta": "2026-11-05"}
    )

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."
    }
