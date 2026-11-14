from datetime import UTC, datetime

RUTA = "/api/v1/reportes/comandas-ticket-promedio"


def test_endpoint_reporte_devuelve_totales_y_promedio(cliente, db, sembrar_pedidos) -> None:
    sembrar_pedidos(datetime(2026, 11, 12, 15, tzinfo=UTC), [(1, 2)])
    sembrar_pedidos(datetime(2026, 11, 12, 15, 30, tzinfo=UTC), [(1, 1)])

    respuesta = cliente.get(
        RUTA,
        params={"fecha_desde": "2026-11-12", "fecha_hasta": "2026-11-12", "turno": "ALMUERZO"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "fecha_desde": "2026-11-12",
        "fecha_hasta": "2026-11-12",
        "turno": "ALMUERZO",
        "grupos": [
            {
                "fecha": "2026-11-12",
                "turno": "ALMUERZO",
                "cantidad_comandas": 2,
                "importe_total": "30.00",
                "ticket_promedio": "15.00",
            }
        ],
        "total_comandas": 2,
        "importe_total": "30.00",
        "ticket_promedio": "15.00",
    }


def test_endpoint_sin_datos_responde_ceros_y_fechas_invertidas_422(cliente) -> None:
    vacio = cliente.get(RUTA, params={"fecha_desde": "2026-11-12", "fecha_hasta": "2026-11-12"})
    invalido = cliente.get(RUTA, params={"fecha_desde": "2026-11-13", "fecha_hasta": "2026-11-12"})

    assert vacio.status_code == 200
    assert vacio.json()["grupos"] == []
    assert vacio.json()["importe_total"] == "0.00"
    assert vacio.json()["ticket_promedio"] == "0.00"
    assert invalido.status_code == 422
    assert "posterior" in invalido.json()["detalle"]


def test_endpoint_rechaza_fechas_faltantes_y_turno_desconocido(cliente) -> None:
    faltantes = cliente.get(RUTA)
    turno = cliente.get(
        RUTA,
        params={"fecha_desde": "2026-11-12", "fecha_hasta": "2026-11-12", "turno": "DESAYUNO"},
    )

    assert faltantes.status_code == 422
    assert "Faltan la fecha desde y la fecha hasta" in faltantes.json()["detalle"]
    assert turno.status_code == 422
    assert "turno" in turno.json()["detalle"]


def test_endpoint_usa_zona_restaurante_para_turno_noche(cliente, db, sembrar_pedidos) -> None:
    sembrar_pedidos(datetime(2026, 11, 13, 2, 59, 59, tzinfo=UTC), [(1, 1)])

    respuesta = cliente.get(
        RUTA,
        params={"fecha_desde": "2026-11-12", "fecha_hasta": "2026-11-12", "turno": "NOCHE"},
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["grupos"][0]["fecha"] == "2026-11-12"
    assert respuesta.json()["grupos"][0]["turno"] == "NOCHE"
