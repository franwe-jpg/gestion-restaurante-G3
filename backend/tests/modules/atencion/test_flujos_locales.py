"""Local HTTP workflows, with unavailable integrations replaced only in tests."""

from app.modules.atencion import service
from app.modules.atencion.models import Comanda
from app.shared.contratos.comanda import EstadoEntrega


def test_cierre_a02_informa_identidad_de_pendientes_sin_mutar(cliente, db, comanda):
    comanda.detalles[0].estado_entrega = EstadoEntrega.PENDIENTE
    db.commit()
    detalle_id = comanda.detalles[0].id

    respuesta = cliente.post(f"/api/v1/comandas/{comanda.id}/cerrar")

    assert respuesta.status_code == 409
    assert respuesta.json()["comanda_id"] == comanda.id
    assert respuesta.json()["pendientes"] == [
        {"id": detalle_id, "producto_id": 1, "menu_ejecutivo_id": None, "cantidad": 2}
    ]
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == "ABIERTA"
    assert comanda.detalles[0].estado_entrega == "PENDIENTE"


def test_consultar_pendientes_antes_de_confirmar(cliente, db, comanda):
    comanda.detalles[0].estado_entrega = EstadoEntrega.PENDIENTE
    db.commit()
    respuesta = cliente.get(f"/api/v1/comandas/{comanda.id}/pendientes")
    assert respuesta.status_code == 200
    assert respuesta.json()["pendientes"][0]["id"] == comanda.detalles[0].id
    assert cliente.get("/api/v1/comandas/999/pendientes").status_code == 404


def test_consultar_pendientes_entregados_es_vacio(cliente, comanda):
    respuesta = cliente.get(f"/api/v1/comandas/{comanda.id}/pendientes")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"comanda_id": comanda.id, "pendientes": []}


def test_error_a02_es_regla_de_negocio_con_datos(db, comanda):
    import pytest

    from app.shared.excepciones import ReglaDeNegocioError

    comanda.detalles[0].estado_entrega = EstadoEntrega.PENDIENTE
    db.commit()
    with pytest.raises(ReglaDeNegocioError) as error:
        service.cerrar_comanda(db, comanda.id)
    assert error.value.comanda_id == comanda.id
    assert error.value.pendientes[0].id == comanda.detalles[0].id


def test_alta_http_con_dobles_solo_de_prueba_y_a01(cliente, comanda):
    from app.main import app
    from app.modules.atencion.router import obtener_catalogo_port, obtener_mesas_port
    from tests.modules.atencion.test_alta import CatalogoPrueba, MesasPrueba

    app.dependency_overrides[obtener_mesas_port] = MesasPrueba
    app.dependency_overrides[obtener_catalogo_port] = CatalogoPrueba
    pedido = {"mesa_id": 2, "detalles": [{"producto_id": 1, "cantidad": 2}]}
    creada = cliente.post("/api/v1/comandas", json=pedido)
    assert creada.status_code == 201
    assert creada.json()["estado"] == "ABIERTA"
    repetida = cliente.post("/api/v1/comandas", json=pedido)
    assert repetida.status_code == 409
    assert repetida.json()["comanda_id"] == creada.json()["id"]
    assert cliente.get("/api/v1/comandas?mesa_id=2").json()["total"] == 1
