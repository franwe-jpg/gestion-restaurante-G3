"""Pruebas de los esquemas de reservas (HU-M5-01, HU-M5-02 y HU-M5-03)."""

from datetime import date, time

import pytest
from pydantic import ValidationError

from app.modules.reservas.models import EstadoReserva
from app.modules.reservas.puente import MesaReservable, SectorDeMesa
from app.modules.reservas.schemas import (
    ComandaDesdeReservaCrear,
    ConsultaMesasDisponibles,
    FiltroReservas,
    MesaDisponible,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.shared.models.enums import EstadoMesa

CUERPO = {
    "mesa_id": 5,
    "cliente_id": 7,
    "fecha": "2026-11-02",
    "hora": "21:30",
    "cantidad_personas": 4,
}
CAMPOS = [campo for campo in CUERPO if campo != "cliente_id"]  # el cliente va aparte (S39)
CLIENTE_NUEVO = {"nombre": "Luis Gómez", "telefono": "+54 280 1234567"}


def _reserva(**cambios) -> ReservaCrear:
    return ReservaCrear.model_validate(CUERPO | cambios)


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _reserva(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# HU-M5-01 CA 1
def test_reserva_crear_acepta_datos_validos() -> None:
    datos = _reserva()

    assert datos.mesa_id == 5
    assert datos.cliente_id == 7
    assert datos.fecha == date(2026, 11, 2)
    assert datos.hora == time(21, 30)
    assert datos.cantidad_personas == 4


# CA 3: los cuatro campos son obligatorios y ninguno admite null
@pytest.mark.parametrize("campo", CAMPOS)
def test_reserva_crear_rechaza_campos_faltantes(campo: str) -> None:
    cuerpo = {nombre: valor for nombre, valor in CUERPO.items() if nombre != campo}

    with pytest.raises(ValidationError) as error:
        ReservaCrear.model_validate(cuerpo)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}


@pytest.mark.parametrize("campo", CAMPOS)
def test_reserva_crear_rechaza_campos_nulos(campo: str) -> None:
    assert _campos_con_error(**{campo: None}) == {campo}


# CA 7
@pytest.mark.parametrize("cantidad", [0, -1])
def test_reserva_crear_rechaza_cantidad_no_positiva(cantidad: int) -> None:
    assert _campos_con_error(cantidad_personas=cantidad) == {"cantidad_personas"}


# CA 3 y CA 7: enteros estrictos
@pytest.mark.parametrize(
    "campo, valor",
    [
        ("cantidad_personas", 2.5),
        ("cantidad_personas", "4"),
        ("cantidad_personas", True),
        ("mesa_id", 2.5),
        ("mesa_id", "5"),
        ("mesa_id", True),
        ("mesa_id", 0),
        ("mesa_id", -1),
        ("cliente_id", 2.5),
        ("cliente_id", "7"),
        ("cliente_id", True),
        ("cliente_id", 0),
        ("cliente_id", -1),
        ("cliente_nuevo", "Luis"),
        ("cliente_nuevo", [CLIENTE_NUEVO]),
        ("cliente_nuevo", {"telefono": "123"}),
        ("cliente_nuevo", {"nombre": "Luis"}),
        ("cliente_nuevo", {"nombre": 123, "telefono": "123"}),
        ("cliente_nuevo", {"nombre": "Luis", "telefono": 123}),
        ("cliente_nuevo", CLIENTE_NUEVO | {"dni": "1"}),
    ],
)
def test_reserva_crear_rechaza_tipos_laxos(campo: str, valor: object) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


# S39 y S40 (Enmienda): el esquema acepta solo la forma; "exactamente un cliente" es del service
def test_reserva_crear_acepta_cliente_nuevo_solo() -> None:
    datos = _reserva(cliente_id=None, cliente_nuevo=CLIENTE_NUEVO)

    assert datos.cliente_id is None
    assert datos.cliente_nuevo is not None
    assert (datos.cliente_nuevo.nombre, datos.cliente_nuevo.telefono) == (
        "Luis Gómez",
        "+54 280 1234567",
    )


def test_reserva_crear_acepta_cliente_id_solo() -> None:
    datos = _reserva()

    assert datos.cliente_id == 7
    assert datos.cliente_nuevo is None


@pytest.mark.parametrize("cuerpo", [{}, {"cliente_nuevo": CLIENTE_NUEVO}])
def test_reserva_crear_acepta_ningun_cliente_o_los_dos(cuerpo: dict) -> None:
    base = {k: v for k, v in CUERPO.items() if k != "cliente_id"}
    datos = ReservaCrear.model_validate(base | cuerpo)

    assert datos.cliente_id is None
    assert (datos.cliente_nuevo is None) == (not cuerpo)


def test_reserva_crear_acepta_los_dos_clientes_y_el_service_los_rechaza() -> None:
    datos = _reserva(cliente_nuevo=CLIENTE_NUEVO)

    assert datos.cliente_id == 7
    assert datos.cliente_nuevo is not None


@pytest.mark.parametrize("campo", ["cliente_id", "cliente_nuevo"])
def test_reserva_crear_toma_null_del_cliente_como_ausente(campo: str) -> None:
    assert getattr(_reserva(**{campo: None}), campo) is None


# S42: las reglas de contenido son de M4; la forma deja pasar vacios y simbolos
@pytest.mark.parametrize("nombre, telefono", [("", "abc"), ("   ", "   "), ("Luis3", "280+456")])
def test_reserva_crear_deja_las_reglas_de_contenido_a_m4(nombre: str, telefono: str) -> None:
    datos = _reserva(cliente_id=None, cliente_nuevo={"nombre": nombre, "telefono": telefono})

    assert (datos.cliente_nuevo.nombre, datos.cliente_nuevo.telefono) == (nombre, telefono)


@pytest.mark.parametrize(
    "campo, valor",
    [
        ("fecha", "02/11/2026"),
        ("fecha", "2026-13-40"),
        ("hora", "25:00"),
        ("hora", "9pm"),
    ],
)
def test_reserva_crear_rechaza_formatos_de_fecha_y_hora(campo: str, valor: str) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


# S16: la hora tiene precision de minutos
def test_reserva_crear_acepta_hora_con_segundos_en_cero() -> None:
    assert _reserva(hora="21:30:00").hora == time(21, 30)


@pytest.mark.parametrize("hora", ["21:30:45", "21:30:00.500000", "21:30+03:00", "21:30Z"])
def test_reserva_crear_rechaza_hora_con_segundos(hora: str) -> None:
    assert _campos_con_error(hora=hora) == {"hora"}


# CA 2 (S15): el estado y el id los asigna el sistema
@pytest.mark.parametrize("estado", ["ATENDIDA", "ACTIVA"])
def test_reserva_crear_rechaza_estado(estado: str) -> None:
    assert _campos_con_error(estado=estado) == {"estado"}


def test_reserva_crear_rechaza_id() -> None:
    assert _campos_con_error(id=1) == {"id"}


# Decision 7: la salida entrega la hora como HH:MM
def test_reserva_salida_serializa_hora_en_minutos() -> None:
    salida = ReservaSalida(
        id=1,
        mesa_id=5,
        cliente_id=7,
        fecha=date(2026, 11, 2),
        hora=time(21, 30),
        cantidad_personas=4,
        estado=EstadoReserva.ACTIVA,
    )

    assert salida.model_dump(mode="json") == {
        "id": 1,
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": "2026-11-02",
        "hora": "21:30",
        "cantidad_personas": 4,
        "estado": "ACTIVA",
    }
    assert '"hora":"21:30"' in salida.model_dump_json()


def test_reserva_salida_serializa_horas_con_cero_a_la_izquierda() -> None:
    salida = ReservaSalida(
        id=2,
        mesa_id=5,
        cliente_id=7,
        fecha=date(2026, 11, 2),
        hora=time(4, 5),
        cantidad_personas=1,
        estado=EstadoReserva.ATENDIDA,
    )

    assert salida.model_dump(mode="json")["hora"] == "04:05"


# HU-M5-03 CA 2: filtros por fecha y estado
def test_filtro_reservas_acepta_fecha_y_estado() -> None:
    filtro = FiltroReservas.model_validate({"fecha": "2026-11-02", "estado": "ACTIVA"})

    assert filtro.fecha == date(2026, 11, 2)
    assert filtro.estado == EstadoReserva.ACTIVA


def test_filtro_reservas_sin_parametros_usa_los_valores_por_defecto() -> None:
    filtro = FiltroReservas()

    assert (filtro.fecha, filtro.estado) == (None, None)
    assert (filtro.limit, filtro.offset) == (50, 0)


# S22: el estado distingue mayusculas y minusculas
@pytest.mark.parametrize("estado", ["ABIERTA", "activa"])
def test_filtro_reservas_rechaza_estado_desconocido(estado: str) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroReservas.model_validate({"estado": estado})

    assert [str(falla["loc"][0]) for falla in error.value.errors()] == ["estado"]


@pytest.mark.parametrize("fecha", ["02/11/2026", "2026-13-40"])
def test_filtro_reservas_rechaza_fecha_invalida(fecha: str) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroReservas.model_validate({"fecha": fecha})

    assert [str(falla["loc"][0]) for falla in error.value.errors()] == ["fecha"]


# HU-M5-03 CA 1: el filtro hereda los limites de ParametrosPaginacion (D-27)
@pytest.mark.parametrize(
    ("parametros", "campo"),
    [({"limit": 0}, "limit"), ({"limit": 101}, "limit"), ({"offset": -1}, "offset")],
)
def test_filtro_reservas_hereda_limites_de_paginacion(parametros: dict, campo: str) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroReservas.model_validate(parametros)

    assert [str(falla["loc"][0]) for falla in error.value.errors()] == [campo]


# HU-M5-02: la modificacion solo trae fecha, hora y cantidad de personas
CUERPO_MODIFICAR = {"fecha": "2026-11-03", "hora": "22:00", "cantidad_personas": 5}


def _campos_con_error_al_modificar(cuerpo: dict) -> set[str]:
    with pytest.raises(ValidationError) as error:
        ReservaModificar.model_validate(cuerpo)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


def test_reserva_modificar_acepta_fecha_hora_y_personas() -> None:
    datos = ReservaModificar.model_validate(CUERPO_MODIFICAR)

    assert datos.fecha == date(2026, 11, 3)
    assert datos.hora == time(22, 0)
    assert datos.cantidad_personas == 5


# S19: el PUT exige los tres campos
@pytest.mark.parametrize("campo", list(CUERPO_MODIFICAR))
def test_reserva_modificar_exige_los_tres_campos(campo: str) -> None:
    cuerpo = {nombre: valor for nombre, valor in CUERPO_MODIFICAR.items() if nombre != campo}

    assert _campos_con_error_al_modificar(cuerpo) == {campo}


# CA 2 (S15): mesa, cliente, estado e id no se reciben
@pytest.mark.parametrize(
    ("campo", "valor"),
    [("mesa_id", 6), ("cliente_id", 8), ("estado", "ATENDIDA"), ("id", 1)],
)
def test_reserva_modificar_rechaza_mesa_cliente_estado_o_id(campo: str, valor: object) -> None:
    assert _campos_con_error_al_modificar(CUERPO_MODIFICAR | {campo: valor}) == {campo}


# La modificacion hereda las reglas de cantidad y de hora del alta
@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("cantidad_personas", 0),
        ("cantidad_personas", "4"),
        ("cantidad_personas", True),
        ("hora", "21:30:45"),
    ],
)
def test_reserva_modificar_hereda_reglas_de_cantidad_y_hora(campo: str, valor: object) -> None:
    assert _campos_con_error_al_modificar(CUERPO_MODIFICAR | {campo: valor}) == {campo}


# Issue #61: GET /reservas/mesas-disponibles recibe fecha y hora en la consulta
CONSULTA = {"fecha": "2026-11-02", "hora": "21:30"}


def _campos_con_error_en_la_consulta(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        ConsultaMesasDisponibles.model_validate(CONSULTA | cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


def test_consulta_mesas_disponibles_acepta_fecha_y_hora() -> None:
    consulta = ConsultaMesasDisponibles.model_validate(CONSULTA)

    assert consulta.fecha == date(2026, 11, 2)
    assert consulta.hora == time(21, 30)


# Escenarios "Falta la fecha" y "Falta la hora": los dos son obligatorios y ninguno admite null
@pytest.mark.parametrize("campo", list(CONSULTA))
def test_consulta_mesas_disponibles_exige_fecha_y_hora(campo: str) -> None:
    faltante = {nombre: valor for nombre, valor in CONSULTA.items() if nombre != campo}

    with pytest.raises(ValidationError) as error:
        ConsultaMesasDisponibles.model_validate(faltante)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}
    assert _campos_con_error_en_la_consulta(**{campo: None}) == {campo}


# S16: la hora de la consulta tiene la misma precision de minutos que la del alta
def test_consulta_mesas_disponibles_rechaza_hora_con_segundos() -> None:
    assert _campos_con_error_en_la_consulta(hora="21:30:45") == {"hora"}
    consulta = ConsultaMesasDisponibles.model_validate(CONSULTA | {"hora": "21:30:00"})
    assert consulta.hora == time(21, 30)


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("fecha", "02/11/2026"),
        ("fecha", "2026-13-40"),
        ("hora", "25:00"),
        ("hora", "9pm"),
    ],
)
def test_consulta_mesas_disponibles_rechaza_formatos_de_fecha_y_hora(
    campo: str, valor: str
) -> None:
    assert _campos_con_error_en_la_consulta(**{campo: valor}) == {campo}


# S29: la mesa disponible trae id, numero, capacidad y sector; el estado no sale
def test_mesa_disponible_no_expone_el_estado() -> None:
    mesa = MesaReservable(
        id=14,
        numero=1,
        capacidad=6,
        sector=SectorDeMesa(id=2, nombre="Terraza"),
        estado=EstadoMesa.OCUPADA,
    )

    disponible = MesaDisponible.model_validate(mesa)

    assert disponible.model_dump() == {
        "id": 14,
        "numero": 1,
        "capacidad": 6,
        "sector": {"id": 2, "nombre": "Terraza"},
    }


# --- HU-M5-06: ComandaDesdeReservaCrear, el pedido de la comanda de una reserva ---

PRODUCTO_12 = {"producto_id": 12, "cantidad": 2}
MENU_5 = {"menu_ejecutivo_id": 5, "cantidad": 1}
MOZO_ID = 31
UNA_REFERENCIA = "Indique un producto o un menú ejecutivo, exclusivamente"


def _fallas_de_la_comanda(cuerpo: dict) -> list[tuple]:
    """Ubicacion (`loc`) de cada falla que el esquema encuentra en el cuerpo."""
    with pytest.raises(ValidationError) as error:
        ComandaDesdeReservaCrear.model_validate({"mozo_id": MOZO_ID, **cuerpo})
    return [tuple(falla["loc"]) for falla in error.value.errors()]


# CA 1: las observaciones son opcionales y las lineas pueden ser de producto o de menu
def test_comanda_desde_reserva_acepta_detalles_con_observaciones_opcionales() -> None:
    sin_observaciones = ComandaDesdeReservaCrear.model_validate(
        {"mozo_id": MOZO_ID, "detalles": [PRODUCTO_12]}
    )
    con_observaciones = ComandaDesdeReservaCrear.model_validate(
        {"mozo_id": MOZO_ID, "detalles": [PRODUCTO_12, MENU_5], "observaciones": "Sin sal"}
    )

    assert sin_observaciones.observaciones is None
    assert [(d.producto_id, d.cantidad) for d in sin_observaciones.detalles] == [(12, 2)]
    assert con_observaciones.observaciones == "Sin sal"
    assert [(d.producto_id, d.menu_ejecutivo_id) for d in con_observaciones.detalles] == [
        (12, None),
        (None, 5),
    ]


# Forma del pedido: `detalles` es obligatorio y no admite lista vacia ni null
@pytest.mark.parametrize("cuerpo", [{}, {"detalles": []}, {"detalles": None}], ids=str)
def test_comanda_desde_reserva_rechaza_detalles_ausentes_vacios_o_nulos(cuerpo: dict) -> None:
    assert _fallas_de_la_comanda(cuerpo) == [("detalles",)]


def test_comanda_desde_reserva_requiere_mozo_id() -> None:
    with pytest.raises(ValidationError) as error:
        ComandaDesdeReservaCrear.model_validate({"detalles": [PRODUCTO_12]})

    assert [tuple(falla["loc"]) for falla in error.value.errors()] == [("mozo_id",)]


# CA 4: la cantidad es un entero estricto mayor que cero
@pytest.mark.parametrize("cantidad", [0, -3, 1.5, "2", True, None], ids=repr)
def test_comanda_desde_reserva_rechaza_cantidad_invalida(cantidad: object) -> None:
    cuerpo = {"detalles": [{"producto_id": 12, "cantidad": cantidad}]}

    assert _fallas_de_la_comanda(cuerpo) == [("detalles", 0, "cantidad")]


def test_comanda_desde_reserva_rechaza_cantidad_ausente() -> None:
    assert _fallas_de_la_comanda({"detalles": [{"producto_id": 12}]}) == [
        ("detalles", 0, "cantidad")
    ]


def test_comanda_desde_reserva_nombra_la_linea_con_la_cantidad_invalida() -> None:
    cuerpo = {"detalles": [PRODUCTO_12, {"producto_id": 13, "cantidad": 0}]}

    assert _fallas_de_la_comanda(cuerpo) == [("detalles", 1, "cantidad")]


@pytest.mark.parametrize("producto_id", [0, -1, 2.5, "12", True], ids=repr)
def test_comanda_desde_reserva_rechaza_producto_no_positivo_o_no_entero(
    producto_id: object,
) -> None:
    cuerpo = {"detalles": [{"producto_id": producto_id, "cantidad": 1}]}

    assert _fallas_de_la_comanda(cuerpo) == [("detalles", 0, "producto_id")]


@pytest.mark.parametrize(
    "linea",
    [{"producto_id": 12, "menu_ejecutivo_id": 5, "cantidad": 1}, {"cantidad": 1}],
    ids=["ambos", "ninguno"],
)
def test_comanda_desde_reserva_rechaza_producto_y_menu_a_la_vez_o_ninguno(linea: dict) -> None:
    with pytest.raises(ValidationError, match=UNA_REFERENCIA) as error:
        ComandaDesdeReservaCrear.model_validate({"mozo_id": MOZO_ID, "detalles": [linea]})

    assert [tuple(falla["loc"]) for falla in error.value.errors()] == [("detalles", 0)]


# S62: el cuerpo no trae mesa, reserva, estado ni cliente
@pytest.mark.parametrize(
    ("campo", "valor"),
    [("mesa_id", 6), ("reserva_id", 10), ("estado", "ATENDIDA"), ("cliente_id", 7)],
)
def test_comanda_desde_reserva_prohibe_campos_extra(campo: str, valor: object) -> None:
    cuerpo = {"detalles": [PRODUCTO_12], campo: valor}

    assert _fallas_de_la_comanda(cuerpo) == [(campo,)]


def test_comanda_desde_reserva_no_declara_mesa_id() -> None:
    assert "mesa_id" not in ComandaDesdeReservaCrear.model_fields  # la mesa sale de la reserva
    assert set(ComandaDesdeReservaCrear.model_fields) == {"mozo_id", "detalles", "observaciones"}
