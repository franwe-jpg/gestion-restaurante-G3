"""Pruebas de la factura de una comanda (HU-M6-01) y de su cobro (HU-M6-02, issue #71)."""

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.atencion.adaptadores import CatalogoDeCarta, MesasDeSalon
from app.modules.atencion.schemas import EntregaDetalle
from app.modules.menus import service as menus_service
from app.modules.menus.schemas import PromocionCrear
from app.modules.pagos.models import Cobro, DetalleFactura, Factura, MedioPago
from app.modules.salon import service as salon_service
from app.modules.salon.schemas import MozoCrear
from app.shared.contratos.comanda import ComandaCrear, DetalleComandaCrear, EstadoComanda
from app.shared.models import Estado
from tests.modules.pagos.conftest import Catalogo, FabricaComanda, FabricaMedioPago

RUTA = "/api/v1/facturas"
TOTAL = "7101.00"


def _cuerpo(comanda_id: int, medio_pago_id: int, monto: str = TOTAL) -> dict[str, object]:
    return {"comanda_id": comanda_id, "cobro": {"medio_pago_id": medio_pago_id, "monto": monto}}


def _contar(db: Session) -> tuple[int, int, int]:
    """Cantidad de facturas, lineas de detalle y cobros guardados."""
    return (
        db.query(Factura).count(),
        db.query(DetalleFactura).count(),
        db.query(Cobro).count(),
    )


# --- Vista previa ---


# CA1 de #70
def test_previsualizar_comanda_cerrada_muestra_detalle_fecha_y_total(
    cliente: TestClient, db: Session, fabrica_comanda: FabricaComanda
) -> None:
    comanda_id = fabrica_comanda()

    respuesta = cliente.get(f"{RUTA}/previsualizar", params={"comanda_id": comanda_id})

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["comanda_id"] == comanda_id
    assert cuerpo["total"] == TOTAL
    assert cuerpo["fecha_emision"]
    assert len(cuerpo["detalles"]) == 2
    assert _contar(db) == (0, 0, 0)


# --- Confirmar con el primer cobro ---


# CA2 de #70
def test_generar_con_monto_igual_al_total_deja_la_factura_pagada(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    medio = fabrica_medio_pago()

    respuesta = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio.id))

    cuerpo = respuesta.json()
    assert respuesta.status_code == 201
    assert cuerpo["estado"] == "PAGADA"
    assert cuerpo["saldo_pendiente"] == "0.00"
    assert cuerpo["total"] == TOTAL
    [cobro] = cuerpo["cobros"]
    assert cobro["numero_comprobante"] == cobro["id"]
    assert cobro["medio_pago_id"] == medio.id
    assert cobro["monto"] == TOTAL


# S3 del cambio
def test_generar_con_cobro_parcial_deja_la_factura_adeudada(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    medio = fabrica_medio_pago()

    respuesta = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio.id, "1000.00"))

    cuerpo = respuesta.json()
    assert respuesta.status_code == 201
    assert cuerpo["estado"] == "ADEUDADA"
    assert cuerpo["saldo_pendiente"] == "6101.00"


# F04 y F13: el cobro invalido no deja nada guardado
@pytest.mark.parametrize("monto", ["7101.01", "0.00", "-5.00"])
def test_generar_con_monto_invalido_responde_422_y_no_guarda_nada(
    monto: str,
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    medio = fabrica_medio_pago()

    respuesta = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio.id, monto))

    assert respuesta.status_code == 422
    assert _contar(db) == (0, 0, 0)


# F05
@pytest.mark.parametrize(
    ("preparar", "codigo"),
    [
        (lambda medio: None, 404),
        (lambda medio: setattr(medio, "eliminado", True), 404),
        (lambda medio: setattr(medio, "estado", Estado.DESHABILITADO), 409),
    ],
    ids=["inexistente", "eliminado", "deshabilitado"],
)
def test_generar_con_medio_de_pago_no_utilizable_responde_error_y_no_guarda_nada(
    preparar: object,
    codigo: int,
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    medio = fabrica_medio_pago()
    medio_id = medio.id
    if preparar is not None:
        preparar(medio)  # type: ignore[operator]
        db.commit()
    if codigo == 404 and not medio.eliminado:
        medio_id = 999

    respuesta = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio_id))

    assert respuesta.status_code == codigo
    assert _contar(db) == (0, 0, 0)


# --- Solo comandas cerradas ---


# CA3 de #70
@pytest.mark.parametrize("estado", [EstadoComanda.ABIERTA, EstadoComanda.ANULADA])
def test_facturar_comanda_no_cerrada_responde_409(
    estado: EstadoComanda,
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    comanda_id = fabrica_comanda(estado)
    medio = fabrica_medio_pago()

    previa = cliente.get(f"{RUTA}/previsualizar", params={"comanda_id": comanda_id})
    generada = cliente.post(RUTA, json=_cuerpo(comanda_id, medio.id))

    assert previa.status_code == generada.status_code == 409
    assert generada.json() == {"detalle": "La comanda no está cerrada"}
    assert _contar(db) == (0, 0, 0)


# F07
def test_facturar_comanda_inexistente_responde_404(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago
) -> None:
    medio = fabrica_medio_pago()

    previa = cliente.get(f"{RUTA}/previsualizar", params={"comanda_id": 999})
    generada = cliente.post(RUTA, json=_cuerpo(999, medio.id))

    assert previa.status_code == generada.status_code == 404


# --- Detalle copiado ---


# CA4 de #70
def test_generar_copia_una_linea_por_cada_linea_de_la_comanda(
    cliente: TestClient,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
    catalogo: Catalogo,
) -> None:
    medio = fabrica_medio_pago()

    cuerpo = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio.id)).json()

    plato, menu = cuerpo["detalles"]
    assert plato == {
        "producto_id": catalogo.plato_id,
        "menu_ejecutivo_id": None,
        "descripcion": "Milanesa",
        "cantidad": 2,
        "precio_unitario": "1500.50",
        "descuento": "100.00",
        "subtotal": "2901.00",
    }
    assert menu["menu_ejecutivo_id"] == catalogo.menu_id
    assert menu["producto_id"] is None
    assert menu["descripcion"] == "Ejecutivo del dia"
    assert menu["subtotal"] == "4200.00"


# --- Una sola factura por comanda ---


# CA5 de #70
def test_generar_dos_veces_la_misma_comanda_responde_409_y_no_crea_otra(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    comanda_id = fabrica_comanda()
    medio = fabrica_medio_pago()
    cliente.post(RUTA, json=_cuerpo(comanda_id, medio.id, "1000.00"))

    segunda = cliente.post(RUTA, json=_cuerpo(comanda_id, medio.id, "500.00"))
    previa = cliente.get(f"{RUTA}/previsualizar", params={"comanda_id": comanda_id})

    assert segunda.status_code == previa.status_code == 409
    assert segunda.json() == {"detalle": "La comanda ya fue facturada"}
    assert _contar(db) == (1, 2, 1)


# --- La factura conserva lo facturado ---


# CA6 de #70
def test_consultar_conserva_el_precio_aunque_el_producto_cambie(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
    catalogo: Catalogo,
) -> None:
    medio = fabrica_medio_pago()
    factura_id = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio.id)).json()["id"]
    db.execute(
        text("UPDATE productos SET precio = 9999.00 WHERE id = :id"), {"id": catalogo.plato_id}
    )
    db.commit()

    cuerpo = cliente.get(f"{RUTA}/{factura_id}").json()

    assert cuerpo["detalles"][0]["precio_unitario"] == "1500.50"
    assert cuerpo["total"] == TOTAL


# CA7 de #70
def test_consultar_mantiene_el_producto_dado_de_baja_en_el_detalle(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
    catalogo: Catalogo,
) -> None:
    medio = fabrica_medio_pago()
    factura_id = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), medio.id)).json()["id"]
    db.execute(
        text("UPDATE productos SET estado = 'DESHABILITADO' WHERE id = :id"),
        {"id": catalogo.plato_id},
    )
    db.commit()

    linea = cliente.get(f"{RUTA}/{factura_id}").json()["detalles"][0]

    assert linea["descripcion"] == "Milanesa"
    assert linea["precio_unitario"] == "1500.50"


# --- Consulta ---


# F12
def test_consultar_factura_inexistente_responde_404(cliente: TestClient) -> None:
    respuesta = cliente.get(f"{RUTA}/999")

    assert respuesta.status_code == 404
    assert "detalle" in respuesta.json()


# La referencia a MedioPago evita que el import quede sin uso si cambian las fabricas.
def test_el_medio_de_pago_del_cobro_es_el_elegido(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")

    factura_id = cliente.post(RUTA, json=_cuerpo(fabrica_comanda(), tarjeta.id)).json()["id"]

    cobro = cliente.get(f"{RUTA}/{factura_id}").json()["cobros"][0]
    assert db.get(MedioPago, cobro["medio_pago_id"]).nombre == "Tarjeta"  # type: ignore[union-attr]


# --- Cobrar una factura adeudada (HU-M6-02, issue #71) ---


def _cuerpo_cobro(medio_pago_id: int, monto: str) -> dict[str, object]:
    return {"medio_pago_id": medio_pago_id, "monto": monto}


def _crear_factura(
    cliente: TestClient,
    comanda_id: int,
    medio_pago_id: int,
    monto: str = "1000.00",
) -> int:
    respuesta = cliente.post(RUTA, json=_cuerpo(comanda_id, medio_pago_id, monto))
    assert respuesta.status_code == 201
    return respuesta.json()["id"]


def _cobrar(cliente: TestClient, factura_id: int, medio_pago_id: int, monto: str):
    return cliente.post(f"{RUTA}/{factura_id}/cobros", json=_cuerpo_cobro(medio_pago_id, monto))


# CA1 de #71
def test_cobrar_factura_adeudada_baja_el_saldo(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    respuesta = _cobrar(cliente, factura_id, tarjeta.id, "3000.00")

    cuerpo = respuesta.json()
    assert respuesta.status_code == 201
    assert cuerpo["estado"] == "ADEUDADA"
    assert cuerpo["saldo_pendiente"] == "3101.00"
    assert [cobro["monto"] for cobro in cuerpo["cobros"]] == ["1000.00", "3000.00"]
    nuevo = cuerpo["cobros"][1]
    assert nuevo["numero_comprobante"] == nuevo["id"]
    assert nuevo["medio_pago_id"] == tarjeta.id
    assert _contar(db) == (1, 2, 2)


# CA1 de #71, limite: el monto iguala el saldo
def test_cobrar_el_saldo_completo_deja_la_factura_pagada(
    cliente: TestClient,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    cuerpo = _cobrar(cliente, factura_id, tarjeta.id, "6101.00").json()

    assert cuerpo["estado"] == "PAGADA"
    assert cuerpo["saldo_pendiente"] == "0.00"


# CA2 de #71
def test_cobrar_una_factura_pagada_responde_409_y_no_crea_cobro(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, TOTAL)

    respuesta = _cobrar(cliente, factura_id, tarjeta.id, "10.00")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "La factura ya está pagada"}
    assert _contar(db) == (1, 2, 1)


# CA3 de #71
def test_cobrar_mas_que_el_saldo_responde_422_y_no_cambia_nada(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    respuesta = _cobrar(cliente, factura_id, tarjeta.id, "6101.01")

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detalle": "El monto no puede superar el saldo pendiente de la factura"
    }
    assert _contar(db) == (1, 2, 1)


# CA3 de #71, limite: monto cero o negativo
@pytest.mark.parametrize("monto", ["0.00", "-5.00"])
def test_cobrar_con_monto_no_positivo_responde_422(
    monto: str,
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    respuesta = _cobrar(cliente, factura_id, tarjeta.id, monto)

    assert respuesta.status_code == 422
    assert _contar(db) == (1, 2, 1)


# CA4 de #71
def test_cobrar_con_medio_deshabilitado_responde_409(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta", estado=Estado.DESHABILITADO)
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    respuesta = _cobrar(cliente, factura_id, tarjeta.id, "100.00")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El medio de pago está deshabilitado"}
    assert _contar(db) == (1, 2, 1)


# F07
def test_cobrar_con_medio_inexistente_o_eliminado_responde_404(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    eliminado = fabrica_medio_pago(nombre="Transferencia", eliminado=True)
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    inexistente = _cobrar(cliente, factura_id, 999, "100.00")
    borrado = _cobrar(cliente, factura_id, eliminado.id, "100.00")

    assert inexistente.status_code == borrado.status_code == 404
    assert _contar(db) == (1, 2, 1)


# CA5 de #71: el primer cobro de la factura tambien cuenta como usado
def test_cobrar_con_un_medio_ya_usado_en_la_factura_responde_409(
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    respuesta = _cobrar(cliente, factura_id, efectivo.id, "100.00")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": "El medio de pago ya fue usado en esta factura"}
    assert _contar(db) == (1, 2, 1)


# CA6 de #71
@pytest.mark.parametrize(
    "cuerpo",
    [{}, {"monto": "100.00"}, {"medio_pago_id": 1}],
    ids=["vacio", "sin-medio", "sin-monto"],
)
def test_cobrar_sin_monto_o_sin_medio_responde_422(
    cuerpo: dict[str, object],
    cliente: TestClient,
    db: Session,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    respuesta = cliente.post(f"{RUTA}/{factura_id}/cobros", json=cuerpo)

    assert respuesta.status_code == 422
    assert _contar(db) == (1, 2, 1)


# F10
def test_cobrar_una_factura_inexistente_responde_404(
    cliente: TestClient, fabrica_medio_pago: FabricaMedioPago
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")

    respuesta = _cobrar(cliente, 999, efectivo.id, "100.00")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": "La factura 999 no existe"}


# F14: el saldo es el total menos la suma de los cobros
def test_el_saldo_es_el_total_menos_la_suma_de_los_cobros(
    cliente: TestClient,
    fabrica_comanda: FabricaComanda,
    fabrica_medio_pago: FabricaMedioPago,
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    tarjeta = fabrica_medio_pago(nombre="Tarjeta")
    transferencia = fabrica_medio_pago(nombre="Transferencia")
    factura_id = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")
    _cobrar(cliente, factura_id, tarjeta.id, "2000.50")

    cuerpo = _cobrar(cliente, factura_id, transferencia.id, "1100.50").json()

    sumatoria = sum(Decimal(cobro["monto"]) for cobro in cuerpo["cobros"])
    assert cuerpo["saldo_pendiente"] == f"{Decimal(TOTAL) - sumatoria:.2f}"
    assert cuerpo["saldo_pendiente"] == "3000.00"
    assert cuerpo["estado"] == "ADEUDADA"


# --- Listado de facturas (instrumental de HU-M6-02) ---


# F11
def test_listar_facturas_devuelve_la_mas_reciente_primero(
    cliente: TestClient, fabrica_comanda: FabricaComanda, fabrica_medio_pago: FabricaMedioPago
) -> None:
    efectivo = fabrica_medio_pago(nombre="Efectivo")
    primera = _crear_factura(cliente, fabrica_comanda(), efectivo.id, "1000.00")

    cartera = fabrica_medio_pago(nombre="Cartera")
    segunda = _crear_factura(cliente, fabrica_comanda(), cartera.id, "2000.00")

    respuesta = cliente.get(RUTA)

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["total"] == 2
    assert [factura["id"] for factura in cuerpo["items"]] == [segunda, primera]
    assert cuerpo["items"][0]["comanda_id"] > 0
    assert set(cuerpo["items"][0]) == {
        "id",
        "comanda_id",
        "fecha_emision",
        "total",
        "saldo_pendiente",
        "estado",
    }


# F12
def test_listar_facturas_sin_datos_devuelve_pagina_vacia(cliente: TestClient) -> None:
    respuesta = cliente.get(RUTA, params={"limit": 10, "offset": 0})

    assert respuesta.status_code == 200
    assert respuesta.json() == {"items": [], "total": 0, "limit": 10, "offset": 0}


# --- Promoción aplicada en la comanda (S4-02, issue #223) ---


def test_previsualizar_factura_de_comanda_con_promocion_conserva_el_descuento(
    cliente: TestClient, db: Session, catalogo: Catalogo
) -> None:
    momento = datetime(2026, 11, 9, 18, 0, tzinfo=UTC)  # lunes 15:00 en UTC-3
    menus_service.crear_promocion(
        db,
        PromocionCrear.model_validate(
            {
                "nombre": "Promo S4-02",
                "tipo": "PORCENTAJE",
                "producto_ids": [catalogo.plato_id],
                "fecha_desde": date(2026, 11, 1),
                "fecha_hasta": date(2026, 11, 30),
                "dias_semana": ["LUNES"],
                "descuento_porcentaje": 10,
            }
        ),
    )
    mozo = salon_service.crear_mozo(
        db,
        MozoCrear(
            dni="30123456",
            nombre="Ana",
            apellido="Paz",
            correo="mozo30123456@resto.com",
            contrasena="Clave1234",
        ),
    )
    comanda = atencion_service.crear_comanda(
        db,
        ComandaCrear(
            mesa_id=catalogo.mesa_id,
            mozo_id=mozo.id,
            detalles=[DetalleComandaCrear(producto_id=catalogo.plato_id, cantidad=2)],
        ),
        MesasDeSalon(),
        CatalogoDeCarta(ahora=lambda: momento),
    )
    [detalle] = comanda.detalles
    atencion_service.registrar_entrega(
        db, comanda.id, detalle.id, EntregaDetalle(cantidad_entregada=2)
    )
    atencion_service.cerrar_comanda(db, comanda.id, MesasDeSalon())

    respuesta = cliente.get(f"{RUTA}/previsualizar", params={"comanda_id": comanda.id})

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["detalles"][0]["descuento"] == "300.10"
    assert cuerpo["detalles"][0]["subtotal"] == "2700.90"
    assert cuerpo["total"] == "2700.90"
