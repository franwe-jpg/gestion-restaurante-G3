"""Matriz de permisos de la API por rol (HU-TR-01, P3 y P5).

La tabla ESPERADA se escribe aca a partir de la spec `control-de-acceso`, sin consultar
`PERMISOS_POR_ROL`: si alguien cambia un permiso o un router sin querer, una celda falla.
"""

import re
from collections.abc import Callable

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import API_PREFIX
from app.database import Base
from app.main import app
from app.modules.atencion.models import Comanda
from app.modules.pagos.models import TipoMedioPago
from app.shared.models.enums import Rol
from app.shared.seguridad import usuario_actual

E, M, C = Rol.ENCARGADO, Rol.MOZO, Rol.CHEF
TODOS = {E, M, C}
ENCARGADO_Y_MOZO = {E, M}
SOLO_ENCARGADO = {E}

# (metodo, ruta, roles permitidos)
FILAS: list[tuple[str, str, set[Rol]]] = []


def _filas(metodo: str, rutas: list[str], roles: set[Rol]) -> None:
    FILAS.extend((metodo, ruta, roles) for ruta in rutas)


# M1 Productos y Carta
_filas(
    "GET",
    ["/platos/1", "/postres/1", "/bebidas/1", "/secciones", "/secciones/1", "/productos", "/carta"],
    TODOS,
)
_filas("POST", ["/platos", "/postres", "/bebidas", "/secciones"], SOLO_ENCARGADO)
_filas("PUT", ["/platos/1", "/postres/1", "/bebidas/1", "/secciones/1"], SOLO_ENCARGADO)
_filas(
    "POST",
    ["/platos/1/baja", "/postres/1/baja", "/bebidas/1/baja", "/secciones/1/baja"],
    SOLO_ENCARGADO,
)
_filas(
    "GET",
    ["/reportes/productos-mas-vendidos", "/reportes/productos-mas-vendidos/pdf"],
    SOLO_ENCARGADO,
)
# M2 Menus y Promociones
_filas(
    "GET",
    [
        "/menus-del-dia",
        "/menus-del-dia/1",
        "/menus-ejecutivos",
        "/menus-ejecutivos/1",
        "/promociones",
    ],
    TODOS,
)
_filas("POST", ["/menus-del-dia", "/menus-ejecutivos", "/promociones"], SOLO_ENCARGADO)
_filas("PUT", ["/menus-del-dia/1", "/menus-ejecutivos/1", "/promociones/1"], SOLO_ENCARGADO)
_filas(
    "POST",
    ["/menus-del-dia/1/baja", "/menus-ejecutivos/1/baja", "/promociones/1/finalizar"],
    SOLO_ENCARGADO,
)
_filas("GET", ["/reportes/impacto-promociones"], SOLO_ENCARGADO)
# M3 Salon, Mozos y Chefs
_filas("GET", ["/mesas", "/sectores", "/mozos"], ENCARGADO_Y_MOZO)
_filas("POST", ["/sectores", "/sectores/1/baja", "/mesas"], SOLO_ENCARGADO)
_filas("PUT", ["/sectores/1", "/mesas/1"], SOLO_ENCARGADO)
_filas("DELETE", ["/mesas/1"], SOLO_ENCARGADO)
_filas("POST", ["/mozos", "/mozos/1/baja", "/chefs", "/chefs/1/baja"], SOLO_ENCARGADO)
_filas("GET", ["/chefs", "/reportes/mesas-ventas-por-mozo"], SOLO_ENCARGADO)
_filas("PUT", ["/mozos/1", "/chefs/1"], SOLO_ENCARGADO)
# M4 Atencion al Publico
_filas(
    "GET",
    ["/comandas", "/comandas/1", "/comandas/1/detalles", "/comandas/1/pendientes"],
    TODOS,
)
_filas(
    "POST",
    ["/comandas", "/comandas/1/cerrar", "/comandas/1/reabrir", "/comandas/1/anular"],
    ENCARGADO_Y_MOZO,
)
_filas(
    "PUT",
    ["/comandas/1", "/comandas/1/mozo", "/comandas/1/detalles/1/entrega", "/clientes/1"],
    ENCARGADO_Y_MOZO,
)
_filas("GET", ["/clientes"], ENCARGADO_Y_MOZO)
# M5 Reservas
_filas("GET", ["/reservas", "/reservas/1", "/reservas/mesas-disponibles"], TODOS)
_filas(
    "POST",
    [
        "/reservas",
        "/reservas/1/cancelar-anticipada",
        "/reservas/1/cancelar-por-ausencia",
        "/reservas/1/comanda",
    ],
    ENCARGADO_Y_MOZO,
)
_filas("PUT", ["/reservas/1"], ENCARGADO_Y_MOZO)
_filas(
    "GET", ["/reportes/reservas-ausentismo", "/reportes/reservas-ausentismo/pdf"], SOLO_ENCARGADO
)
# M6 Pagos
_filas(
    "GET",
    [
        "/medios-de-pago",
        "/facturas",
        "/facturas/previsualizar",
        "/facturas/1",
        "/comprobantes/F-1",
        "/comprobantes/F-1/pdf",
    ],
    ENCARGADO_Y_MOZO,
)
_filas("POST", ["/facturas", "/facturas/1/cobros"], ENCARGADO_Y_MOZO)
_filas("POST", ["/medios-de-pago"], SOLO_ENCARGADO)
_filas("PUT", ["/medios-de-pago/1"], SOLO_ENCARGADO)
_filas("DELETE", ["/medios-de-pago/1"], SOLO_ENCARGADO)
_filas(
    "GET",
    [
        "/reportes/caja-del-dia",
        "/reportes/recaudacion-por-medio-de-pago",
        "/reportes/recaudacion-por-medio-de-pago/pdf",
    ],
    SOLO_ENCARGADO,
)

CELDAS = [
    pytest.param(metodo, ruta, rol, rol in permitidos, id=f"{metodo} {ruta} {rol.value}")
    for metodo, ruta, permitidos in FILAS
    for rol in Rol
]
ClienteConRol = Callable[..., TestClient]


def _filas_en_la_base(db: Session) -> int:
    return sum(
        db.scalar(select(func.count()).select_from(tabla)) or 0
        for tabla in Base.metadata.sorted_tables
    )


def _llamar(cliente: TestClient, metodo: str, ruta: str):
    cuerpo = {} if metodo in {"POST", "PUT"} else None
    return cliente.request(metodo, f"{API_PREFIX}{ruta}", json=cuerpo)


@pytest.mark.parametrize(("metodo", "ruta", "rol", "permitido"), CELDAS)
def test_celda_de_la_matriz(
    db: Session,
    cliente_con_rol: ClienteConRol,
    metodo: str,
    ruta: str,
    rol: Rol,
    permitido: bool,
) -> None:
    antes = _filas_en_la_base(db)

    respuesta = _llamar(cliente_con_rol(rol), metodo, ruta)

    if permitido:
        assert respuesta.status_code not in {401, 403}
    else:
        assert respuesta.status_code == 403
        assert respuesta.json() == {"detalle": "No tiene permiso para realizar esta acción"}
        assert _filas_en_la_base(db) == antes


# --- Escenarios con datos reales ---


def test_el_mozo_no_gestiona_el_catalogo(cliente_con_rol: ClienteConRol) -> None:
    cuerpo = {"nombre": "Milanesa", "seccion_id": 1, "precio": "10.00", "ingredientes": ["Carne"]}

    respuesta = cliente_con_rol(M).post(f"{API_PREFIX}/platos", json=cuerpo)

    assert respuesta.status_code == 403


def test_el_chef_no_entra_a_pagos_ni_salon(cliente_con_rol: ClienteConRol) -> None:
    chef = cliente_con_rol(C)

    assert chef.get(f"{API_PREFIX}/facturas").status_code == 403
    assert chef.get(f"{API_PREFIX}/medios-de-pago").status_code == 403
    assert chef.get(f"{API_PREFIX}/mesas").status_code == 403
    assert chef.get(f"{API_PREFIX}/mozos").status_code == 403


def test_el_chef_ve_comandas_y_su_detalle_pero_no_las_modifica(
    cliente_con_rol: ClienteConRol, comanda: Comanda
) -> None:
    chef = cliente_con_rol(C)
    base = f"{API_PREFIX}/comandas/{comanda.id}"

    assert chef.get(base).status_code == 200
    assert chef.get(f"{base}/detalles").status_code == 200
    assert chef.post(f"{base}/cerrar").status_code == 403
    entrega = f"{base}/detalles/{comanda.detalles[0].id}/entrega"
    assert chef.put(entrega, json={"cantidad_entregada": 1}).status_code == 403


def test_el_mozo_cierra_una_comanda_de_otro_mozo(
    cliente_con_rol: ClienteConRol, db: Session, comanda: Comanda
) -> None:
    comanda.mozo_id = 999  # un mozo que no es quien consulta
    db.commit()

    respuesta = cliente_con_rol(M).post(f"{API_PREFIX}/comandas/{comanda.id}/cerrar")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "CERRADA"


def test_el_mozo_factura_y_cobra_una_comanda_ajena(
    cliente_con_rol: ClienteConRol, fabrica_comanda, fabrica_medio_pago
) -> None:
    mozo = cliente_con_rol(M)
    medio = fabrica_medio_pago()
    tarjeta = fabrica_medio_pago(nombre="Tarjeta", tipo=TipoMedioPago.TARJETA)
    cuerpo = {
        "comanda_id": fabrica_comanda(),
        "cobro": {"medio_pago_id": medio.id, "monto": "1000.00"},
    }

    factura = mozo.post(f"{API_PREFIX}/facturas", json=cuerpo)
    cobro = mozo.post(
        f"{API_PREFIX}/facturas/{factura.json()['id']}/cobros",
        json={"medio_pago_id": tarjeta.id, "monto": "100.00"},
    )

    assert factura.status_code == 201
    assert cobro.status_code == 201


def test_los_reportes_son_solo_del_encargado_incluido_el_pdf(
    cliente_con_rol: ClienteConRol,
) -> None:
    for rol in (M, C):
        cliente = cliente_con_rol(rol)
        for ruta in ("/reportes/caja-del-dia", "/reportes/productos-mas-vendidos/pdf"):
            assert cliente.get(f"{API_PREFIX}{ruta}").status_code == 403

    periodo = {"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-05"}
    pdf = cliente_con_rol(E).get(
        f"{API_PREFIX}/reportes/productos-mas-vendidos/pdf", params=periodo
    )
    assert pdf.status_code == 200


def test_prohibido_antes_que_invalido_en_sectores(cliente_con_rol: ClienteConRol) -> None:
    respuesta = cliente_con_rol(M).post(f"{API_PREFIX}/sectores", json={"nombre": ""})

    assert respuesta.status_code == 403


def test_el_usuario_con_mozo_y_chef_recibe_la_union_de_permisos(
    cliente_con_rol: ClienteConRol,
) -> None:
    assert cliente_con_rol(C).get(f"{API_PREFIX}/mesas").status_code == 403
    assert cliente_con_rol(M, C).get(f"{API_PREFIX}/mesas").status_code == 200


# --- Completitud (P5) ---

PUBLICAS = {("POST", f"{API_PREFIX}/sesion"), ("GET", f"{API_PREFIX}/salud")}
SOLO_SESION = {("GET", f"{API_PREFIX}/sesion"), ("DELETE", f"{API_PREFIX}/sesion")}


def _rutas_de_la_api() -> list[tuple[str, APIRoute]]:
    return [
        (metodo, ruta)
        for ruta in app.routes
        if isinstance(ruta, APIRoute) and ruta.path.startswith(API_PREFIX)
        for metodo in sorted(ruta.methods)
    ]


def test_cada_ruta_protegida_declara_un_permiso() -> None:
    sin_permiso = []
    for metodo, ruta in _rutas_de_la_api():
        clave = (metodo, ruta.path)
        if clave in PUBLICAS or clave in SOLO_SESION:
            continue
        verificadores = [d.dependency for d in ruta.dependencies]
        if not any(hasattr(v, "permiso") for v in verificadores):
            sin_permiso.append(f"{metodo} {ruta.path}")

    assert sin_permiso == []


def test_get_y_delete_de_sesion_solo_exigen_una_sesion_valida() -> None:
    for metodo, ruta in _rutas_de_la_api():
        if (metodo, ruta.path) in SOLO_SESION:
            llamadas = [d.call for d in ruta.dependant.dependencies]
            assert usuario_actual in llamadas


def test_sin_sesion_toda_ruta_protegida_responde_401(cliente_sin_sesion: TestClient) -> None:
    for metodo, ruta in _rutas_de_la_api():
        if (metodo, ruta.path) in PUBLICAS:
            continue
        camino = re.sub(r"\{[^}]+\}", "1", ruta.path)
        respuesta = cliente_sin_sesion.request(metodo, camino, json={})
        assert respuesta.status_code == 401, f"{metodo} {ruta.path}"


def test_salud_es_publica(cliente_sin_sesion: TestClient) -> None:
    assert cliente_sin_sesion.get(f"{API_PREFIX}/salud").status_code == 200
