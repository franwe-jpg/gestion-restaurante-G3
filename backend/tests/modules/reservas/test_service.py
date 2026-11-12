"""Pruebas del servicio de reservas: alta (HU-M5-01), modificacion (HU-M5-02) y listado."""

from datetime import UTC, date, datetime, time, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.modules.atencion.service import ComandaAbiertaError
from app.modules.reservas import puente, repository, service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import (
    ComandaDesdeReservaCrear,
    FiltroReservas,
    MesaDisponible,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.modules.reservas.service import ahora as ahora_real
from app.shared.contratos.comanda import EstadoComanda
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import Pagina

# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00.
HOY = date(2026, 11, 2)
MANANA = date(2026, 11, 3)
# S69: una reserva ACTIVA o ATENDIDA ocupa la mesa 2 horas desde su hora; el mensaje nombra la
# reserva que conflicta, no el turno pedido.
TURNO_OCUPADO = (
    "La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas"
)


def _conflicto(fecha: date, hora: time, mesa_id: int = 5) -> str:
    """Mensaje 409 del conflicto con la reserva de `mesa_id` en esa `fecha` y `hora` (S69)."""
    return (
        f"La mesa {mesa_id} ya tiene una reserva el {fecha} a las {hora:%H:%M}; "
        "cada reserva ocupa la mesa 2 horas"
    )


def _desplazar(minutos: int, fecha: date = HOY, hora: time = time(21, 30)) -> dict:
    """`fecha` y `hora` del turno que queda `minutos` despues (o antes, si es negativo) del dado."""
    momento = datetime.combine(fecha, hora) + timedelta(minutes=minutos)
    return {"fecha": momento.date(), "hora": momento.time()}


def _datos(**cambios) -> ReservaCrear:
    cuerpo = {
        "mesa_id": 5,
        "cliente_id": 7,
        "fecha": HOY,
        "hora": time(21, 30),
        "cantidad_personas": 4,
    }
    return ReservaCrear(**(cuerpo | cambios))


def _reservas(db: Session) -> list[Reserva]:
    return list(db.scalars(select(Reserva).order_by(Reserva.id)))


def _ocupar_turno(fabrica_reserva, **cambios) -> Reserva:
    """Deja una reserva ACTIVA en la mesa 5, el 2026-11-02 a las 21:30."""
    turno = {"mesa_id": 5, "cliente_id": 3, "fecha": HOY, "hora": time(21, 30)}
    return fabrica_reserva(**(turno | cambios))


# Decision 3 y 20 (S28): el reloj real es el del restaurante (UTC-3) y no lleva zona horaria
def test_ahora_devuelve_la_hora_del_restaurante_sin_zona(zona_del_proceso) -> None:
    zona_del_proceso("UTC")  # como el contenedor de Docker: la hora del proceso no es la del local
    utc_menos_3 = timedelta(hours=-3)
    antes = datetime.now(UTC).replace(tzinfo=None) + utc_menos_3
    actual = ahora_real()
    despues = datetime.now(UTC).replace(tzinfo=None) + utc_menos_3

    assert antes <= actual <= despues
    assert actual.tzinfo is None


# HU-M5-01 CA 1 y CA 2
def test_crear_reserva_queda_activa(db: Session) -> None:
    salida = service.crear_reserva(db, _datos())

    assert salida.estado == EstadoReserva.ACTIVA
    db.expire_all()
    guardada = db.get(Reserva, salida.id)
    assert guardada.estado == EstadoReserva.ACTIVA
    assert guardada.mesa_id == 5
    assert guardada.cliente_id == 7
    assert guardada.fecha == HOY
    assert guardada.hora == time(21, 30)
    assert guardada.cantidad_personas == 4
    assert len(_reservas(db)) == 1


# CA 7, limite
def test_crear_reserva_acepta_una_persona(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(cantidad_personas=1))

    assert salida.cantidad_personas == 1


# CA 5
def test_crear_reserva_rechaza_fecha_pasada(db: Session) -> None:
    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva no puede ser anterior"):
        service.crear_reserva(db, _datos(fecha=date(2026, 11, 1)))

    assert _reservas(db) == []


# CA 6
def test_crear_reserva_rechaza_hora_pasada_de_hoy(db: Session) -> None:
    with pytest.raises(DatosInvalidosError, match="debe ser posterior a la hora actual"):
        service.crear_reserva(db, _datos(hora=time(11, 30)))

    assert _reservas(db) == []


# CA 6, limite
def test_crear_reserva_rechaza_hora_igual_a_la_actual(db: Session) -> None:
    with pytest.raises(DatosInvalidosError, match="debe ser posterior a la hora actual"):
        service.crear_reserva(db, _datos(hora=time(12, 0)))

    assert _reservas(db) == []


# CA 6, limite
def test_crear_reserva_acepta_hoy_con_hora_futura(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(hora=time(12, 1)))

    assert salida.fecha == HOY
    assert salida.hora == time(12, 1)


# CA 6: la hora se compara en minutos, sin mirar los segundos del reloj
def test_crear_reserva_compara_la_hora_en_minutos(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "ahora", lambda: datetime(2026, 11, 2, 12, 0, 30))

    with pytest.raises(DatosInvalidosError, match="debe ser posterior a la hora actual"):
        service.crear_reserva(db, _datos(hora=time(12, 0)))
    salida = service.crear_reserva(db, _datos(hora=time(12, 1)))

    assert salida.hora == time(12, 1)


def test_crear_reserva_acepta_hora_anterior_en_otro_dia(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(fecha=MANANA, hora=time(11, 0)))

    assert salida.fecha == MANANA
    assert salida.hora == time(11, 0)


# CA 6, S2: no hay horario de atencion
def test_crear_reserva_acepta_hora_fuera_de_horario_habitual(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(fecha=MANANA, hora=time(4, 15)))

    assert salida.hora == time(4, 15)


# CA 4
def test_crear_reserva_rechaza_mesa_inexistente(db: Session, puente_sin_mesa) -> None:
    with pytest.raises(NoEncontradoError, match="La mesa 99 no existe"):
        service.crear_reserva(db, _datos(mesa_id=99))

    assert _reservas(db) == []


def test_crear_reserva_rechaza_cliente_inexistente(db: Session, puente_sin_cliente) -> None:
    with pytest.raises(NoEncontradoError, match="El cliente 99 no existe"):
        service.crear_reserva(db, _datos(cliente_id=99))

    assert _reservas(db) == []


# S17: la mesa se verifica antes que el cliente
def test_crear_reserva_mesa_y_cliente_inexistentes_informa_la_mesa(
    db: Session, puente_sin_mesa, puente_sin_cliente
) -> None:
    with pytest.raises(NoEncontradoError, match="La mesa 99 no existe"):
        service.crear_reserva(db, _datos(mesa_id=99, cliente_id=98))


# S20 (issue #61): una mesa que M3 no conoce no se acepta aunque su id sea positivo
def test_crear_reserva_rechaza_mesa_que_m3_no_conoce(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La mesa 123 no existe"):
        service.crear_reserva(db, _datos(mesa_id=123))

    assert _reservas(db) == []


# S31 (issue #61): una mesa fuera de servicio es un conflicto con una regla de negocio (409)
def test_crear_reserva_rechaza_mesa_fuera_de_servicio(db: Session, puente_doble) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(mesa_id=6))

    assert str(error.value) == "La mesa 6 está fuera de servicio"
    assert _reservas(db) == []


# S30: OCUPADA describe el momento presente, no el turno pedido: la mesa se puede reservar
def test_crear_reserva_acepta_mesa_ocupada(db: Session, puente_doble) -> None:
    puente_doble.poner(5, estado=EstadoMesa.OCUPADA)

    salida = service.crear_reserva(db, _datos(fecha=MANANA))

    assert salida.mesa_id == 5
    assert salida.estado == EstadoReserva.ACTIVA


# S17: la mesa fuera de servicio se rechaza antes que el cliente y que el momento
def test_crear_reserva_mesa_fuera_de_servicio_se_rechaza_antes_que_cliente_y_fecha(
    db: Session, puente_doble, puente_sin_cliente
) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)

    with pytest.raises(ReglaDeNegocioError, match="La mesa 6 está fuera de servicio"):
        service.crear_reserva(db, _datos(mesa_id=6, cliente_id=98, fecha=date(2026, 11, 1)))

    assert _reservas(db) == []


# S39 y S20: un identificador positivo que M4 no conoce no se acepta
def test_crear_reserva_rechaza_cliente_positivo_que_m4_no_conoce(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El cliente 456 no existe"):
        service.crear_reserva(db, _datos(mesa_id=5, cliente_id=456))

    assert _reservas(db) == []


# --- Cliente registrado o nuevo (issue #61, S39 a S43) ---

CLIENTE_NUEVO = {"nombre": "Luis Gómez", "telefono": "+54 280 1234567"}


def _datos_con_cliente_nuevo(**cambios) -> ReservaCrear:
    return _datos(cliente_id=None, cliente_nuevo=CLIENTE_NUEVO, **cambios)


# Enmienda: "exactamente un cliente" es la primera comprobacion y no consulta al puente
def test_crear_reserva_rechaza_los_dos_clientes(db: Session, puente_doble) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        service.crear_reserva(db, _datos(cliente_nuevo=CLIENTE_NUEVO))

    assert "cliente_id" in str(error.value)
    assert "cliente_nuevo" in str(error.value)
    assert puente_doble.registrados == []
    assert _reservas(db) == []


def test_crear_reserva_rechaza_ningun_cliente(db: Session, puente_doble) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        service.crear_reserva(db, _datos(cliente_id=None))

    assert "cliente_id" in str(error.value)
    assert "cliente_nuevo" in str(error.value)
    assert puente_doble.registrados == []
    assert _reservas(db) == []


def test_crear_reserva_exactamente_un_cliente_se_valida_antes_que_la_mesa(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_debe_consultarse(*_args, **_kwargs):
        raise AssertionError("el puente no se consulta")

    monkeypatch.setattr(puente, "obtener_mesa", no_debe_consultarse)
    monkeypatch.setattr(puente, "existe_cliente", no_debe_consultarse)

    with pytest.raises(DatosInvalidosError):
        service.crear_reserva(db, _datos(mesa_id=99, cliente_nuevo=CLIENTE_NUEVO))


def test_crear_reserva_con_cliente_existente_no_registra_clientes(
    db: Session, puente_doble
) -> None:
    salida = service.crear_reserva(db, _datos(cliente_id=7))

    assert salida.cliente_id == 7
    assert puente_doble.registrados == []


def test_crear_reserva_con_cliente_nuevo_lo_registra(db: Session, puente_doble) -> None:
    salida = service.crear_reserva(db, _datos_con_cliente_nuevo())

    assert salida.cliente_id >= 100
    assert puente_doble.registrados == [(salida.cliente_id, "Luis Gómez", "+54 280 1234567")]
    db.expire_all()
    assert db.get(Reserva, salida.id).cliente_id == salida.cliente_id


def test_crear_reserva_dos_altas_con_cliente_nuevo_crean_dos_clientes(
    db: Session, puente_doble
) -> None:
    primera = service.crear_reserva(db, _datos_con_cliente_nuevo())
    segunda = service.crear_reserva(db, _datos_con_cliente_nuevo(hora=time(23, 30)))

    assert primera.cliente_id != segunda.cliente_id
    assert len(puente_doble.registrados) == 2


def test_crear_reserva_acepta_cliente_nuevo_con_acentos_y_prefijo(
    db: Session, puente_doble
) -> None:
    telefono = "+54 280 123456"  # S66: antes "+54 280", de 5 digitos, que el esquema ya no admite
    datos = _datos(cliente_id=None, cliente_nuevo={"nombre": "María José", "telefono": telefono})

    service.crear_reserva(db, datos)

    assert [(n, t) for _, n, t in puente_doble.registrados] == [("María José", telefono)]


# El nombre lo valida M4 (S42). El telefono ya no llega hasta M4 con datos invalidos: lo rechaza el
# esquema propio de M5 con 422 antes del service (S66; ver test_schemas.py y test_router.py).
@pytest.mark.parametrize("nombre", ["", "   ", "Luis3"])
def test_crear_reserva_rechaza_nombre_invalido_del_cliente_nuevo(
    db: Session, puente_doble, nombre: str
) -> None:
    datos = _datos(cliente_id=None, cliente_nuevo={"nombre": nombre, "telefono": "280123456"})

    with pytest.raises(DatosInvalidosError, match="nombre:"):
        service.crear_reserva(db, datos)

    assert puente_doble.registrados == []
    assert _reservas(db) == []


# Decision 28: una reserva fallida no deja un cliente huerfano (el registro es el ultimo paso)
@pytest.mark.parametrize(
    "cambios, excepcion",
    [
        ({"mesa_id": 99}, NoEncontradoError),
        ({"mesa_id": 6}, ReglaDeNegocioError),
        ({"fecha": date(2026, 11, 1)}, DatosInvalidosError),
        ({"hora": time(11, 0)}, DatosInvalidosError),
        ({}, ReglaDeNegocioError),
        ({"mesa_id": 5, "hora": time(23, 0), "cantidad_personas": 5}, ReglaDeNegocioError),
    ],
    ids=[
        "mesa-inexistente",
        "mesa-fuera-de-servicio",
        "fecha-pasada",
        "hora-pasada",
        "turno-ocupado",
        "capacidad-excedida",
    ],
)
def test_crear_reserva_fallida_con_cliente_nuevo_no_registra_al_cliente(
    db: Session, fabrica_reserva, puente_doble, cambios: dict, excepcion: type[Exception]
) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)
    _ocupar_turno(fabrica_reserva)

    with pytest.raises(excepcion):
        service.crear_reserva(db, _datos_con_cliente_nuevo(**cambios))

    assert puente_doble.registrados == []
    assert len(_reservas(db)) == 1


# S17: la mesa se verifica antes que los datos del cliente nuevo
def test_crear_reserva_mesa_inexistente_con_cliente_nuevo_invalido_informa_la_mesa(
    db: Session, puente_sin_mesa
) -> None:
    datos = _datos(
        mesa_id=99, cliente_id=None, cliente_nuevo={"nombre": "Luis3", "telefono": "280123456"}
    )

    with pytest.raises(NoEncontradoError, match="La mesa 99 no existe"):
        service.crear_reserva(db, datos)


# CA 7, S67 (correccion 2026-11-11, pendiente de validacion del equipo). Esta prueba antes se
# llamaba `test_crear_reserva_acepta_una_cantidad_muy_grande_de_personas` y comprobaba el S5 del
# issue #61 (la cantidad no se compara con la capacidad). La responsable del modulo pidio revertir
# esa regla: ahora la cantidad no puede superar la capacidad de la mesa. Se conserva el caso (100
# personas) con el resultado invertido.
def test_crear_reserva_rechaza_una_cantidad_muy_grande_de_personas(db: Session) -> None:
    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cantidad_personas=100))

    assert str(error.value) == "La mesa 5 admite hasta 4 personas"
    assert _reservas(db) == []


def test_crear_reserva_acepta_la_capacidad_exacta_de_la_mesa(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(cantidad_personas=4))

    assert salida.cantidad_personas == 4
    db.expire_all()
    assert db.get(Reserva, salida.id).cantidad_personas == 4


def test_crear_reserva_rechaza_una_persona_mas_que_la_capacidad(db: Session) -> None:
    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cantidad_personas=5))

    assert str(error.value) == "La mesa 5 admite hasta 4 personas"
    assert _reservas(db) == []
    assert not db.new


@pytest.mark.parametrize("cantidad", [8, 500])
def test_crear_reserva_rechaza_mucho_mas_que_la_capacidad_de_una_mesa_chica(
    db: Session, puente_doble, cantidad: int
) -> None:
    puente_doble.poner(5, capacidad=2)

    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 admite hasta 2 personas"):
        service.crear_reserva(db, _datos(cantidad_personas=cantidad))

    assert _reservas(db) == []


def test_crear_reserva_usa_la_capacidad_de_la_mesa_pedida(db: Session, puente_doble) -> None:
    puente_doble.poner(5, capacidad=2)
    puente_doble.poner(6, capacidad=10)

    assert service.crear_reserva(db, _datos(mesa_id=6, cantidad_personas=10)).mesa_id == 6
    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 admite hasta 2 personas"):
        service.crear_reserva(db, _datos(mesa_id=5, cantidad_personas=3))


# Una mesa de capacidad 1 se nombra en singular
def test_crear_reserva_en_una_mesa_de_una_persona_dice_persona_en_singular(
    db: Session, puente_doble
) -> None:
    puente_doble.poner(5, capacidad=1)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cantidad_personas=2))

    assert str(error.value) == "La mesa 5 admite hasta 1 persona"


# La capacidad se lee de la misma consulta de la mesa: una sola llamada al puente
def test_crear_reserva_consulta_la_mesa_una_sola_vez(
    db: Session, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    llamadas: list[int] = []
    original = puente_doble.obtener_mesa

    def contar(db_: Session, mesa_id: int):
        llamadas.append(mesa_id)
        return original(db_, mesa_id)

    monkeypatch.setattr(puente, "obtener_mesa", contar)

    service.crear_reserva(db, _datos(cantidad_personas=4))

    assert llamadas == [5]


# CA 9
def test_crear_reserva_rechaza_turno_ocupado(db: Session, fabrica_reserva, puente_doble) -> None:
    puente_doble.poner_cliente(8, "Beto Díaz", "+54 280 7654321")
    existente = _ocupar_turno(fabrica_reserva)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cliente_id=8))

    assert str(error.value) == TURNO_OCUPADO
    db.expire_all()
    reservas = _reservas(db)
    assert [reserva.id for reserva in reservas] == [existente.id]
    assert reservas[0].cliente_id == 3
    assert reservas[0].estado == EstadoReserva.ACTIVA


# S69: la reserva cancelada libera la mesa, tambien dentro de la ventana de 2 horas
@pytest.mark.parametrize("minutos", [0, 60], ids=["misma-hora", "una-hora-despues"])
@pytest.mark.parametrize(
    "estado",
    [EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA],
)
def test_crear_reserva_permite_turno_de_reserva_cancelada(
    db: Session, fabrica_reserva, estado: EstadoReserva, minutos: int
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado)

    salida = service.crear_reserva(db, _datos(**_desplazar(minutos)))

    assert salida.estado == EstadoReserva.ACTIVA
    assert len(_reservas(db)) == 2


# S69: una reserva ATENDIDA sigue ocupando la mesa durante su ventana
@pytest.mark.parametrize("minutos", [-90, 0, 90], ids=["antes", "misma-hora", "despues"])
def test_crear_reserva_rechaza_turno_de_reserva_atendida(
    db: Session, fabrica_reserva, minutos: int
) -> None:
    existente = _ocupar_turno(fabrica_reserva, estado=EstadoReserva.ATENDIDA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(**_desplazar(minutos)))

    assert str(error.value) == TURNO_OCUPADO
    assert [reserva.id for reserva in _reservas(db)] == [existente.id]


def test_crear_reserva_permite_misma_hora_en_otra_mesa(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)

    salida = service.crear_reserva(db, _datos(mesa_id=6))

    assert salida.mesa_id == 6


# S69: la ventana es de la mesa; otra mesa no conflicta ni dentro de las 2 horas
def test_crear_reserva_permite_otra_mesa_dentro_de_la_ventana(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)

    salida = service.crear_reserva(db, _datos(mesa_id=6, **_desplazar(60)))

    assert (salida.mesa_id, salida.hora) == (6, time(22, 30))
    assert len(_reservas(db)) == 2


# --- S69: ventana de ocupacion de 2 horas (reemplaza a S4, que solo miraba la hora exacta) ---


@pytest.mark.parametrize(
    "minutos",
    [-119, -1, 0, 1, 119],
    ids=["119-antes", "1-antes", "misma-hora", "1-despues", "119-despues"],
)
def test_crear_reserva_rechaza_turno_dentro_de_la_ventana(
    db: Session, fabrica_reserva, minutos: int
) -> None:
    existente = _ocupar_turno(fabrica_reserva)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(**_desplazar(minutos)))

    assert str(error.value) == TURNO_OCUPADO  # nombra la reserva que conflicta, no el pedido
    assert [reserva.id for reserva in _reservas(db)] == [existente.id]


@pytest.mark.parametrize("minutos", [-120, 120], ids=["120-antes", "120-despues"])
@pytest.mark.parametrize("estado", [EstadoReserva.ACTIVA, EstadoReserva.ATENDIDA])
def test_crear_reserva_permite_turno_justo_a_dos_horas(
    db: Session, fabrica_reserva, estado: EstadoReserva, minutos: int
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado)

    salida = service.crear_reserva(db, _datos(**_desplazar(minutos)))

    assert salida.estado == EstadoReserva.ACTIVA
    assert len(_reservas(db)) == 2


def test_crear_reserva_permite_la_misma_hora_otro_dia(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)

    salida = service.crear_reserva(db, _datos(fecha=MANANA))

    assert (salida.mesa_id, salida.fecha) == (5, MANANA)
    assert len(_reservas(db)) == 2


# La ventana compara instantes reales: tambien rige entre un dia y el siguiente
CRUZA_LA_MEDIANOCHE = [
    pytest.param(
        {"fecha": HOY, "hora": time(23, 30)},
        {"fecha": MANANA, "hora": time(0, 30)},
        id="pedido-pasada-la-medianoche",
    ),
    pytest.param(
        {"fecha": MANANA, "hora": time(0, 30)},
        {"fecha": HOY, "hora": time(23, 30)},
        id="pedido-antes-de-la-medianoche",
    ),
]


@pytest.mark.parametrize(("existente", "pedido"), CRUZA_LA_MEDIANOCHE)
def test_crear_reserva_rechaza_turno_dentro_de_la_ventana_al_cruzar_la_medianoche(
    db: Session, fabrica_reserva, existente: dict, pedido: dict
) -> None:
    _ocupar_turno(fabrica_reserva, **existente)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(**pedido))

    assert str(error.value) == _conflicto(existente["fecha"], existente["hora"])
    assert len(_reservas(db)) == 1


@pytest.mark.parametrize(
    ("existente", "pedido"),
    [
        pytest.param(
            {"fecha": HOY, "hora": time(23, 30)},
            {"fecha": MANANA, "hora": time(1, 30)},
            id="pedido-pasada-la-medianoche",
        ),
        pytest.param(
            {"fecha": MANANA, "hora": time(1, 30)},
            {"fecha": HOY, "hora": time(23, 30)},
            id="pedido-antes-de-la-medianoche",
        ),
    ],
)
def test_crear_reserva_permite_dos_horas_exactas_al_cruzar_la_medianoche(
    db: Session, fabrica_reserva, existente: dict, pedido: dict
) -> None:
    _ocupar_turno(fabrica_reserva, **existente)

    salida = service.crear_reserva(db, _datos(**pedido))

    assert (salida.fecha, salida.hora) == (pedido["fecha"], pedido["hora"])
    assert len(_reservas(db)) == 2


# La duracion vive en una sola constante: el limite y el texto del mensaje salen de ella
def test_crear_reserva_toma_la_ventana_de_la_constante(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    assert timedelta(hours=2) == service.VENTANA_DE_OCUPACION
    monkeypatch.setattr(service, "VENTANA_DE_OCUPACION", timedelta(hours=3))
    _ocupar_turno(fabrica_reserva)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(**_desplazar(150)))  # 2 h 30 min: ya no alcanza con 2 h
    salida = service.crear_reserva(db, _datos(**_desplazar(180)))

    assert str(error.value).endswith("; cada reserva ocupa la mesa 3 horas")
    assert salida.hora == time(0, 30)


# S21: la unica regla de conflicto es la de mesa
def test_crear_reserva_permite_mismo_cliente_en_mesas_distintas(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva, cliente_id=7)

    salida = service.crear_reserva(db, _datos(mesa_id=6, cliente_id=7))

    assert salida.cliente_id == 7
    assert len(_reservas(db)) == 2


# El conflicto se resuelve con la tabla reservas, aunque el puente acepte todo
def test_crear_reserva_conflicto_no_depende_del_puente(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    _ocupar_turno(fabrica_reserva)

    assert puente.obtener_mesa(db, 5) == puente_doble.mesas[5]
    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva el"):
        service.crear_reserva(db, _datos())


# S17: orden de validacion. Cada paso corrige el error anterior y deja el siguiente.
def test_crear_reserva_orden_de_validacion(
    db: Session,
    fabrica_reserva,
    puente_doble,
    puente_sin_mesa,
    puente_sin_cliente,
) -> None:
    _ocupar_turno(fabrica_reserva)
    ayer = date(2026, 11, 1)

    with pytest.raises(NoEncontradoError, match="La mesa 5 no existe"):
        service.crear_reserva(db, _datos(fecha=ayer))

    puente_doble.poner(5, estado=EstadoMesa.FUERA_DE_SERVICIO)
    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 está fuera de servicio"):
        service.crear_reserva(db, _datos(fecha=ayer, cantidad_personas=5))

    # S67: la capacidad se comprueba con la mesa, antes que el cliente, la fecha y la hora
    puente_doble.poner(5, estado=EstadoMesa.LIBRE)
    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 admite hasta 4 personas"):
        service.crear_reserva(db, _datos(fecha=ayer, cantidad_personas=5))

    with pytest.raises(NoEncontradoError, match="El cliente 7 no existe"):
        service.crear_reserva(db, _datos(fecha=ayer))

    puente_doble.poner_cliente(7, "Ana Pérez", "+54 280 1234567")
    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva"):
        service.crear_reserva(db, _datos(fecha=ayer))

    with pytest.raises(DatosInvalidosError, match="La hora de la reserva"):
        service.crear_reserva(db, _datos(hora=time(11, 0)))

    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva el"):
        service.crear_reserva(db, _datos())


@pytest.mark.parametrize(
    "cambios",
    [
        {"fecha": date(2026, 11, 1)},
        {"hora": time(11, 59)},
    ],
    ids=["fecha-pasada", "hora-pasada"],
)
def test_crear_reserva_dato_invalido_no_guarda_nada(db: Session, cambios: dict) -> None:
    with pytest.raises(DatosInvalidosError):
        service.crear_reserva(db, _datos(**cambios))

    assert _reservas(db) == []
    assert not db.new
    # La sesion sigue usable despues del rechazo.
    assert service.crear_reserva(db, _datos()).estado == EstadoReserva.ACTIVA


# --- R13: defensa de la base (HU-M5-01 CA 9) ---


def _sin_verificacion_previa(monkeypatch: pytest.MonkeyPatch) -> None:
    """Simula dos altas simultaneas: la consulta previa no ve la reserva de la otra."""
    monkeypatch.setattr(repository, "reserva_que_ocupa_la_mesa", lambda *_args, **_kwargs: None)


def test_crear_reserva_traduce_conflicto_del_indice_en_409(
    db: Session, fabrica_reserva, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    puente_doble.poner_cliente(8, "Beto Díaz", "+54 280 7654321")
    existente = _ocupar_turno(fabrica_reserva)
    _sin_verificacion_previa(monkeypatch)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cliente_id=8))

    assert str(error.value) == TURNO_OCUPADO
    # El rollback deja la sesion usable y sin la segunda reserva.
    assert [reserva.id for reserva in _reservas(db)] == [existente.id]


def test_crear_reserva_dos_altas_iguales_sin_verificacion_previa_deja_una_sola_activa(
    db: Session, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    puente_doble.poner_cliente(8, "Beto Díaz", "+54 280 7654321")
    _sin_verificacion_previa(monkeypatch)

    primera = service.crear_reserva(db, _datos(cliente_id=7))
    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva el"):
        service.crear_reserva(db, _datos(cliente_id=8))

    activas = [reserva for reserva in _reservas(db) if reserva.estado == EstadoReserva.ACTIVA]
    assert [reserva.id for reserva in activas] == [primera.id]
    assert (activas[0].mesa_id, activas[0].fecha, activas[0].hora) == (5, HOY, time(21, 30))


def test_crear_reserva_conflicto_del_indice_no_expone_sql(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    _ocupar_turno(fabrica_reserva)
    _sin_verificacion_previa(monkeypatch)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos())

    detalle = str(error.value).casefold()
    for fragmento in ("insert", "unique", "constraint", "sqlite", "reservas", "ux_", "ix_"):
        assert fragmento not in detalle
    assert error.value.__cause__ is not None  # el error original queda encadenado, no expuesto


# HU-M5-03: listado paginado
def _listar(db: Session, **filtros) -> Pagina[ReservaSalida]:
    return service.listar_reservas(db, FiltroReservas(**filtros))


def _ids(pagina: Pagina[ReservaSalida]) -> list[int]:
    return [reserva.id for reserva in pagina.items]


def _tres_reservas_desordenadas(fabrica_reserva) -> None:
    """Ids 1, 2 y 3 creados en un orden distinto al de fecha y hora (spec, CA 3)."""
    fabrica_reserva(fecha=MANANA, hora=time(10, 0))
    fabrica_reserva(mesa_id=2, fecha=HOY, hora=time(22, 0))
    fabrica_reserva(mesa_id=3, fecha=HOY, hora=time(21, 30))


# CA 3
def test_listar_reservas_ordena_por_fecha_hora_e_id(db: Session, fabrica_reserva) -> None:
    _tres_reservas_desordenadas(fabrica_reserva)

    pagina = _listar(db)

    assert _ids(pagina) == [3, 2, 1]
    assert pagina.items[0] == ReservaSalida(
        id=3,
        mesa_id=3,
        cliente_id=1,
        fecha=HOY,
        hora=time(21, 30),
        cantidad_personas=4,
        estado=EstadoReserva.ACTIVA,
    )


def test_listar_reservas_empate_de_fecha_y_hora_ordena_por_id(db: Session) -> None:
    for id_reserva, mesa_id in ((5, 6), (4, 7)):  # el id mayor se inserta primero
        db.add(
            Reserva(
                id=id_reserva,
                mesa_id=mesa_id,
                cliente_id=1,
                fecha=HOY,
                hora=time(21, 30),
                cantidad_personas=2,
                estado=EstadoReserva.ACTIVA,
            )
        )
    db.commit()

    assert _ids(_listar(db)) == [4, 5]


def test_listar_reservas_mantiene_el_orden_entre_paginas(db: Session, fabrica_reserva) -> None:
    _tres_reservas_desordenadas(fabrica_reserva)

    primera = _listar(db, limit=2, offset=0)
    segunda = _listar(db, limit=2, offset=2)

    assert _ids(primera) + _ids(segunda) == [3, 2, 1]


# CA 1
def test_listar_reservas_pagina_y_cuenta_total(db: Session, fabrica_reserva) -> None:
    _tres_reservas_desordenadas(fabrica_reserva)

    primera = _listar(db, limit=2, offset=0)
    segunda = _listar(db, limit=2, offset=2)

    assert (len(primera.items), primera.total, primera.limit, primera.offset) == (2, 3, 2, 0)
    assert (len(segunda.items), segunda.total, segunda.limit, segunda.offset) == (1, 3, 2, 2)


# CA 2
def test_listar_reservas_filtra_por_fecha(db: Session, fabrica_reserva) -> None:
    pasada = date(2026, 10, 20)
    fabrica_reserva(fecha=HOY)
    fabrica_reserva(mesa_id=2, fecha=MANANA)
    fabrica_reserva(mesa_id=3, fecha=pasada, estado=EstadoReserva.ATENDIDA)

    assert _ids(_listar(db, fecha=HOY)) == [1]
    en_el_pasado = _listar(db, fecha=pasada)
    assert (_ids(en_el_pasado), en_el_pasado.total) == ([3], 1)


def test_listar_reservas_filtra_por_estado(db: Session, fabrica_reserva) -> None:
    fabrica_reserva(mesa_id=1)
    fabrica_reserva(mesa_id=2, estado=EstadoReserva.CANCELADA_ANTICIPADA)
    fabrica_reserva(mesa_id=3)

    activas = _listar(db, estado=EstadoReserva.ACTIVA)
    canceladas = _listar(db, estado=EstadoReserva.CANCELADA_ANTICIPADA)

    assert (_ids(activas), activas.total) == ([1, 3], 2)
    assert (_ids(canceladas), canceladas.total) == ([2], 1)


def test_listar_reservas_combina_fecha_y_estado(db: Session, fabrica_reserva) -> None:
    fabrica_reserva(mesa_id=1, fecha=HOY)
    fabrica_reserva(mesa_id=2, fecha=HOY, estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(mesa_id=3, fecha=MANANA)

    pagina = _listar(db, fecha=HOY, estado=EstadoReserva.ACTIVA)

    assert (_ids(pagina), pagina.total) == ([1], 1)


def test_listar_reservas_filtros_y_paginacion_juntos(db: Session, fabrica_reserva) -> None:
    for mesa_id, estado in enumerate(
        [EstadoReserva.ACTIVA, EstadoReserva.ATENDIDA] * 2 + [EstadoReserva.ACTIVA], start=1
    ):
        fabrica_reserva(mesa_id=mesa_id, estado=estado)

    pagina = _listar(db, estado=EstadoReserva.ACTIVA, limit=2, offset=2)

    assert (_ids(pagina), pagina.total) == ([5], 3)


# CA 4
def test_listar_reservas_sin_filtros_trae_todos_los_estados(db: Session, fabrica_reserva) -> None:
    for mesa_id, estado in enumerate(EstadoReserva, start=1):
        fabrica_reserva(mesa_id=mesa_id, estado=estado)

    pagina = _listar(db)

    assert [reserva.estado for reserva in pagina.items] == list(EstadoReserva)
    assert pagina.total == 4


def test_listar_reservas_sin_resultados_devuelve_pagina_vacia(db: Session) -> None:
    pagina = _listar(db)

    assert (pagina.items, pagina.total, pagina.limit, pagina.offset) == ([], 0, 50, 0)


def test_listar_reservas_filtros_sin_coincidencias_devuelve_pagina_vacia(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva()

    pagina = _listar(db, estado=EstadoReserva.ATENDIDA)

    assert (pagina.items, pagina.total) == ([], 0)


def test_listar_reservas_no_modifica_datos(db: Session, fabrica_reserva) -> None:
    for mesa_id, estado in enumerate(EstadoReserva, start=1):
        fabrica_reserva(mesa_id=mesa_id, estado=estado)
    antes = [(r.id, r.mesa_id, r.fecha, r.hora, r.estado) for r in _reservas(db)]

    _listar(db)
    _listar(db, fecha=MANANA, estado=EstadoReserva.ACTIVA, limit=1, offset=1)

    despues = [(r.id, r.mesa_id, r.fecha, r.hora, r.estado) for r in _reservas(db)]
    assert despues == antes


# --- HU-M5-02: consulta y modificacion ---


def _modificacion(**cambios) -> ReservaModificar:
    cuerpo = {"fecha": HOY, "hora": time(22, 0), "cantidad_personas": 3}
    return ReservaModificar(**(cuerpo | cambios))


def _modificar(db: Session, reserva_id: int, **cambios) -> ReservaSalida:
    return service.modificar_reserva(db, reserva_id, _modificacion(**cambios))


def _guardada(db: Session, reserva_id: int) -> ReservaSalida:
    """Lee la reserva de la base (no del identity map) como la dejo la ultima operacion."""
    assert not db.dirty  # la reserva se modifica recien despues de validar todo
    db.expire_all()
    return ReservaSalida.model_validate(db.get(Reserva, reserva_id))


def test_obtener_reserva_existente(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    assert service.obtener_reserva(db, reserva.id) == ReservaSalida(
        id=reserva.id,
        mesa_id=5,
        cliente_id=3,
        fecha=HOY,
        hora=time(21, 30),
        cantidad_personas=4,
        estado=EstadoReserva.ACTIVA,
    )


def test_obtener_reserva_no_activa_se_puede_consultar(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva, estado=EstadoReserva.ATENDIDA)

    assert service.obtener_reserva(db, reserva.id).estado == EstadoReserva.ATENDIDA


def test_obtener_reserva_inexistente(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        service.obtener_reserva(db, 999)


# CA 1
def test_modificar_reserva_cambia_fecha_hora_y_personas(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    salida = _modificar(db, reserva.id, fecha=MANANA)

    assert (salida.fecha, salida.hora, salida.cantidad_personas) == (MANANA, time(22, 0), 3)
    assert _guardada(db, reserva.id) == salida


def test_modificar_reserva_cambia_un_solo_valor(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    salida = _modificar(db, reserva.id, hora=time(21, 30), cantidad_personas=2)

    assert (salida.fecha, salida.hora, salida.cantidad_personas) == (HOY, time(21, 30), 2)


# S7: sin control de concurrencia, gana la ultima
def test_modificar_reserva_la_ultima_modificacion_prevalece(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    _modificar(db, reserva.id, cantidad_personas=3)
    _modificar(db, reserva.id, cantidad_personas=2)

    assert _guardada(db, reserva.id).cantidad_personas == 2


# CA 2
def test_modificar_reserva_conserva_mesa_cliente_y_estado(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva, cliente_id=7)

    salida = _modificar(db, reserva.id, fecha=MANANA)

    guardada = _guardada(db, reserva.id)
    for resultado in (salida, guardada):
        assert (resultado.mesa_id, resultado.cliente_id) == (5, 7)
        assert resultado.estado == EstadoReserva.ACTIVA


# CA 3: cada rechazo deja la reserva como estaba
def test_modificar_reserva_rechaza_fecha_pasada(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    antes = _guardada(db, reserva.id)

    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva no puede ser anterior"):
        _modificar(db, reserva.id, fecha=date(2026, 11, 1))

    assert _guardada(db, reserva.id) == antes


def test_modificar_reserva_rechaza_hora_pasada_de_hoy(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    antes = _guardada(db, reserva.id)

    with pytest.raises(DatosInvalidosError, match="debe ser posterior a la hora actual"):
        _modificar(db, reserva.id, hora=time(11, 30))

    assert _guardada(db, reserva.id) == antes


# CA 3, S67 (correccion 2026-11-11, pendiente de validacion del equipo). Esta prueba antes se
# llamaba `test_modificar_reserva_acepta_una_cantidad_muy_grande_de_personas` y comprobaba el S5 del
# issue #61. Se conserva el caso (100 personas) con el resultado invertido: ahora la cantidad no
# puede superar la capacidad de la mesa de la reserva, tambien al modificar.
def test_modificar_reserva_rechaza_una_cantidad_muy_grande_de_personas(
    db: Session, fabrica_reserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    antes = _guardada(db, reserva.id)

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, reserva.id, cantidad_personas=100)

    assert str(error.value) == "La mesa 5 admite hasta 4 personas"
    assert _guardada(db, reserva.id) == antes


def test_modificar_reserva_acepta_la_capacidad_exacta_de_la_mesa(
    db: Session, fabrica_reserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva, cantidad_personas=2)

    salida = _modificar(db, reserva.id, cantidad_personas=4)

    assert salida.cantidad_personas == 4
    assert _guardada(db, reserva.id) == salida


def test_modificar_reserva_rechaza_una_persona_mas_que_la_capacidad(
    db: Session, fabrica_reserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    antes = _guardada(db, reserva.id)

    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 admite hasta 4 personas"):
        _modificar(db, reserva.id, fecha=MANANA, cantidad_personas=5)

    assert _guardada(db, reserva.id) == antes


def test_modificar_reserva_rechaza_nueve_personas_en_una_mesa_de_dos(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    puente_doble.poner(5, capacidad=2)
    reserva = _ocupar_turno(fabrica_reserva, cantidad_personas=2)
    antes = _guardada(db, reserva.id)

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, reserva.id, cantidad_personas=9)

    assert str(error.value) == "La mesa 5 admite hasta 2 personas"
    assert _guardada(db, reserva.id) == antes


# La mesa no se edita: la capacidad es la de la mesa de la reserva, no la de otra mesa del puente
def test_modificar_reserva_usa_la_capacidad_de_la_mesa_de_la_reserva(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    puente_doble.poner(5, capacidad=2)
    puente_doble.poner(6, capacidad=10)
    en_la_5 = _ocupar_turno(fabrica_reserva, mesa_id=5, cantidad_personas=2)
    en_la_6 = _ocupar_turno(fabrica_reserva, mesa_id=6, cantidad_personas=2)

    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 admite hasta 2 personas"):
        _modificar(db, en_la_5.id, cantidad_personas=3)

    assert _modificar(db, en_la_6.id, cantidad_personas=10).cantidad_personas == 10


# Supuesto: si M3 ya no tiene la mesa de la reserva, no hay capacidad contra la cual comparar y se
# responde 404 como en el alta, en vez de aceptar la cantidad sin control.
def test_modificar_reserva_con_mesa_que_m3_ya_no_tiene_responde_404(
    db: Session, fabrica_reserva, puente_sin_mesa
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    antes = _guardada(db, reserva.id)

    with pytest.raises(NoEncontradoError, match="La mesa 5 no existe"):
        _modificar(db, reserva.id)

    assert _guardada(db, reserva.id) == antes


# S27 (acotado por S67): al modificar solo se consulta la mesa de la reserva, una vez y para leer
# su capacidad; no se lista ninguna otra mesa ni se consulta al cliente
def test_modificar_reserva_solo_consulta_la_mesa_de_la_reserva(
    db: Session, fabrica_reserva, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    def falla(*_args, **_kwargs):
        raise AssertionError("la modificacion solo debe consultar la mesa de la reserva")

    llamadas: list[int] = []
    original = puente_doble.obtener_mesa

    def contar(db_: Session, mesa_id: int):
        llamadas.append(mesa_id)
        return original(db_, mesa_id)

    for operacion in ("listar_mesas", "existe_cliente", "registrar_cliente"):
        monkeypatch.setattr(puente, operacion, falla)
    monkeypatch.setattr(puente, "obtener_mesa", contar)
    reserva = _ocupar_turno(fabrica_reserva, mesa_id=6)

    assert _modificar(db, reserva.id, cantidad_personas=4).cantidad_personas == 4
    assert llamadas == [6]


# S27: la modificacion no mira el estado de la mesa, aunque ahora este fuera de servicio
def test_modificar_reserva_con_mesa_fuera_de_servicio_se_modifica(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    puente_doble.poner(5, estado=EstadoMesa.FUERA_DE_SERVICIO)

    salida = _modificar(db, reserva.id, fecha=MANANA)

    assert salida.fecha == MANANA
    assert _guardada(db, reserva.id) == salida


# CA 4
def test_modificar_reserva_no_choca_consigo_misma(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)
    antes = _guardada(db, reserva.id)

    salida = _modificar(db, reserva.id, hora=time(21, 30), cantidad_personas=4)

    assert salida.id == reserva.id
    assert _guardada(db, reserva.id) == antes


# S69: la propia reserva no cuenta, tampoco cuando el turno nuevo cae dentro de su ventana vieja
def test_modificar_reserva_no_choca_con_su_propio_turno_anterior(
    db: Session, fabrica_reserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    salida = _modificar(db, reserva.id, hora=time(22, 30))

    assert salida.hora == time(22, 30)
    assert _guardada(db, reserva.id) == salida


def test_modificar_reserva_rechaza_turno_de_otra_reserva(db: Session, fabrica_reserva) -> None:
    a = _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(23, 30))
    antes = (_guardada(db, a.id), _guardada(db, b.id))

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, hora=time(21, 30))

    assert str(error.value) == TURNO_OCUPADO
    assert (_guardada(db, a.id), _guardada(db, b.id)) == antes


# S69: mover la reserva a un turno que se superpone con otra de la mesa se rechaza
@pytest.mark.parametrize(
    "minutos", [-119, -1, 1, 119], ids=["119-antes", "1-antes", "1-despues", "119-despues"]
)
def test_modificar_reserva_rechaza_mover_a_un_turno_dentro_de_la_ventana_de_otra(
    db: Session, fabrica_reserva, minutos: int
) -> None:
    a = _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, fecha=MANANA)
    antes = (_guardada(db, a.id), _guardada(db, b.id))

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, **_desplazar(minutos))

    assert str(error.value) == TURNO_OCUPADO
    assert (_guardada(db, a.id), _guardada(db, b.id)) == antes


@pytest.mark.parametrize("minutos", [-120, 120], ids=["120-antes", "120-despues"])
def test_modificar_reserva_permite_mover_a_dos_horas_de_otra(
    db: Session, fabrica_reserva, minutos: int
) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, fecha=MANANA)

    turno = _desplazar(minutos)

    salida = _modificar(db, b.id, **turno)

    assert (salida.fecha, salida.hora) == (turno["fecha"], turno["hora"])
    assert _guardada(db, b.id) == salida


def test_modificar_reserva_rechaza_mover_dentro_de_la_ventana_al_cruzar_la_medianoche(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva, hora=time(23, 30))
    b = _ocupar_turno(fabrica_reserva, fecha=date(2026, 11, 5))

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, fecha=MANANA, hora=time(0, 30))

    assert str(error.value) == _conflicto(HOY, time(23, 30))
    assert _guardada(db, b.id).fecha == date(2026, 11, 5)


# S69: una reserva ATENDIDA tambien ocupa la mesa; una cancelada no
def test_modificar_reserva_rechaza_mover_a_la_ventana_de_una_atendida(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva, estado=EstadoReserva.ATENDIDA)
    b = _ocupar_turno(fabrica_reserva, fecha=MANANA)

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, hora=time(22, 30))

    assert str(error.value) == TURNO_OCUPADO


def test_modificar_reserva_permite_turno_de_reserva_no_activa(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva, estado=EstadoReserva.CANCELADA_ANTICIPADA)
    b = _ocupar_turno(fabrica_reserva, hora=time(23, 30))

    assert _modificar(db, b.id, hora=time(21, 30)).hora == time(21, 30)


def test_modificar_reserva_permite_turno_libre_de_otra_mesa(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, mesa_id=6, hora=time(22, 0))

    assert _modificar(db, b.id, hora=time(21, 30)).hora == time(21, 30)


def test_modificar_reserva_libera_el_turno_anterior(db: Session, fabrica_reserva) -> None:
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))

    _modificar(db, b.id, fecha=MANANA)
    nueva = service.crear_reserva(db, _datos(hora=time(22, 0)))

    assert nueva.hora == time(22, 0)


# S69: la ventana se revisa solo si cambian `fecha` u `hora`. Una modificacion que no las toca no se
# bloquea por una superposicion que ya existia (datos de antes de esta regla).
def test_modificar_reserva_sin_cambiar_fecha_ni_hora_no_se_bloquea_por_una_superposicion_previa(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))  # ya se superpone con la anterior

    salida = _modificar(db, b.id, cantidad_personas=3)

    assert (salida.fecha, salida.hora, salida.cantidad_personas) == (HOY, time(22, 0), 3)
    assert _guardada(db, b.id) == salida


def test_modificar_reserva_cambiando_la_hora_a_otro_turno_superpuesto_si_se_bloquea(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))  # ya se superpone con la anterior

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, hora=time(22, 30), cantidad_personas=3)

    assert str(error.value) == TURNO_OCUPADO
    assert _guardada(db, b.id).hora == time(22, 0)


# CA 5
@pytest.mark.parametrize(
    "estado",
    [
        EstadoReserva.ATENDIDA,
        EstadoReserva.CANCELADA_ANTICIPADA,
        EstadoReserva.CANCELADA_POR_AUSENCIA,
    ],
)
def test_modificar_reserva_rechaza_reserva_no_activa(
    db: Session, fabrica_reserva, estado: EstadoReserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva, estado=estado)
    antes = _guardada(db, reserva.id)

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, reserva.id)

    assert str(error.value) == f"La reserva {reserva.id} no está activa y no se puede modificar"
    assert _guardada(db, reserva.id) == antes


# S7: una reserva ACTIVA con fecha pasada se rescata solo con una fecha y hora validas
def test_modificar_reserva_activa_con_fecha_pasada(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva, fecha=date(2026, 11, 1))

    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva no puede ser anterior"):
        _modificar(db, reserva.id, fecha=date(2026, 11, 1), cantidad_personas=3)
    salida = _modificar(db, reserva.id, fecha=MANANA)

    assert salida.fecha == MANANA


# CA 6
def test_modificar_reserva_inexistente(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        _modificar(db, 999)

    assert _reservas(db) == []


# R13: la defensa de la base tambien vale al modificar
def test_modificar_reserva_traduce_conflicto_del_indice_en_409(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    a = _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(23, 30))
    antes = (_guardada(db, a.id), _guardada(db, b.id))
    _sin_verificacion_previa(monkeypatch)

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, hora=time(21, 30))

    assert str(error.value) == TURNO_OCUPADO  # con el horario pedido, no el que quedo en la base
    assert (_guardada(db, a.id), _guardada(db, b.id)) == antes


# S17: orden de validacion. Cada paso corrige el error anterior y deja el siguiente.
def test_modificar_reserva_orden_de_validacion(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(23, 30))
    atendida = _ocupar_turno(fabrica_reserva, mesa_id=6, estado=EstadoReserva.ATENDIDA)
    ayer = date(2026, 11, 1)
    todo_mal = {"fecha": ayer, "hora": time(11, 0)}

    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        _modificar(db, 999, **todo_mal)

    with pytest.raises(ReglaDeNegocioError, match="no está activa"):
        _modificar(db, atendida.id, cantidad_personas=5, **todo_mal)

    # S67: la capacidad de la mesa se comprueba despues del estado y antes de la fecha y la hora
    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 admite hasta 4 personas"):
        _modificar(db, b.id, cantidad_personas=5, **todo_mal)

    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva"):
        _modificar(db, b.id, **todo_mal)

    with pytest.raises(DatosInvalidosError, match="La hora de la reserva"):
        _modificar(db, b.id, **(todo_mal | {"fecha": HOY}))

    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva el"):
        _modificar(db, b.id, hora=time(21, 30))


# --- Issue #61: mesas disponibles para una fecha y hora (turno de las pruebas: HOY a las 21:30) ---

SALON = puente.SectorDeMesa(7, "Salón")
TERRAZA = puente.SectorDeMesa(3, "Terraza")  # id menor que el de Salón, nombre posterior


def _disponibles(db: Session, fecha: date = HOY, hora: time = time(21, 30)) -> list[MesaDisponible]:
    return service.listar_mesas_disponibles(db, fecha, hora)


def _ids_disponibles(db: Session, fecha: date = HOY, hora: time = time(21, 30)) -> list[int]:
    return [mesa.id for mesa in _disponibles(db, fecha, hora)]


def test_listar_mesas_disponibles_incluye_las_mesas_libres_con_su_forma_exacta(
    db: Session,
) -> None:
    disponibles = _disponibles(db)

    assert [mesa.id for mesa in disponibles] == [5, 6]
    assert disponibles[0].model_dump() == {
        "id": 5,
        "numero": 5,
        "capacidad": 4,
        "sector": {"id": 1, "nombre": "Salón"},
    }


# Issue #61: una mesa fuera de servicio no aparece entre las mesas disponibles
def test_listar_mesas_disponibles_excluye_la_mesa_fuera_de_servicio(
    db: Session, puente_doble
) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)

    assert _ids_disponibles(db) == [5]


def test_listar_mesas_disponibles_excluye_la_mesa_con_reserva_activa_en_el_turno(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva)

    assert _ids_disponibles(db) == [6]


# S69: una reserva ACTIVA o ATENDIDA saca la mesa de la lista durante sus 2 horas (ventana estricta)
@pytest.mark.parametrize("estado", [EstadoReserva.ACTIVA, EstadoReserva.ATENDIDA])
@pytest.mark.parametrize(
    "minutos", [-119, -1, 1, 119], ids=["119-antes", "1-antes", "1-despues", "119-despues"]
)
def test_listar_mesas_disponibles_excluye_la_mesa_con_reserva_dentro_de_la_ventana(
    db: Session, fabrica_reserva, estado: EstadoReserva, minutos: int
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado, **_desplazar(minutos))

    assert _ids_disponibles(db) == [6]


@pytest.mark.parametrize("estado", [EstadoReserva.ACTIVA, EstadoReserva.ATENDIDA])
@pytest.mark.parametrize("minutos", [-120, 120], ids=["120-antes", "120-despues"])
def test_listar_mesas_disponibles_incluye_la_mesa_con_reserva_justo_a_dos_horas(
    db: Session, fabrica_reserva, estado: EstadoReserva, minutos: int
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado, **_desplazar(minutos))

    assert _ids_disponibles(db) == [5, 6]


def test_listar_mesas_disponibles_no_excluye_reservas_de_otra_fecha(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva, fecha=MANANA)

    assert _ids_disponibles(db) == [5, 6]


@pytest.mark.parametrize("minutos", [0, 60], ids=["misma-hora", "una-hora-despues"])
@pytest.mark.parametrize(
    "estado",
    [EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA],
)
def test_listar_mesas_disponibles_no_excluye_reservas_canceladas(
    db: Session, fabrica_reserva, estado: EstadoReserva, minutos: int
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado, **_desplazar(minutos))

    assert _ids_disponibles(db) == [5, 6]


# La ventana tambien se mide entre un dia y el siguiente: se mira el dia anterior y el posterior
@pytest.mark.parametrize(
    ("existente", "pedido", "ids"),
    [
        pytest.param(
            {"fecha": HOY, "hora": time(23, 30)},
            {"fecha": MANANA, "hora": time(0, 30)},
            [6],
            id="reserva-del-dia-anterior",
        ),
        pytest.param(
            {"fecha": MANANA, "hora": time(0, 30)},
            {"fecha": HOY, "hora": time(23, 30)},
            [6],
            id="reserva-del-dia-siguiente",
        ),
        pytest.param(
            {"fecha": HOY, "hora": time(23, 30)},
            {"fecha": MANANA, "hora": time(1, 30)},
            [5, 6],
            id="dos-horas-exactas-del-dia-anterior",
        ),
        pytest.param(
            {"fecha": MANANA, "hora": time(1, 30)},
            {"fecha": HOY, "hora": time(23, 30)},
            [5, 6],
            id="dos-horas-exactas-del-dia-siguiente",
        ),
    ],
)
def test_listar_mesas_disponibles_mide_la_ventana_al_cruzar_la_medianoche(
    db: Session, fabrica_reserva, existente: dict, pedido: dict, ids: list[int]
) -> None:
    _ocupar_turno(fabrica_reserva, **existente)

    assert _ids_disponibles(db, **pedido) == ids


# S69: la lista y el alta usan la misma definicion de mesa ocupada: nunca se ofrece una mesa que
# el alta rechazaria, ni se esconde una que el alta aceptaria
@pytest.mark.parametrize(
    ("minutos", "libre"),
    [
        (-121, True),
        (-120, True),
        (-119, False),
        (-1, False),
        (0, False),
        (1, False),
        (119, False),
        (120, True),
        (121, True),
    ],
)
def test_listar_mesas_disponibles_coincide_con_el_alta(
    db: Session, fabrica_reserva, minutos: int, libre: bool
) -> None:
    _ocupar_turno(fabrica_reserva)
    turno = _desplazar(minutos)

    figura = 5 in _ids_disponibles(db, **turno)
    if libre:
        service.crear_reserva(db, _datos(**turno))
    else:
        with pytest.raises(ReglaDeNegocioError):
            service.crear_reserva(db, _datos(**turno))

    assert figura is libre
    assert len(_reservas(db)) == (2 if libre else 1)


# S30: OCUPADA describe el momento presente, no el turno pedido
def test_listar_mesas_disponibles_incluye_la_mesa_ocupada(db: Session, puente_doble) -> None:
    puente_doble.poner(5, estado=EstadoMesa.OCUPADA)

    assert _ids_disponibles(db) == [5, 6]


def test_listar_mesas_disponibles_con_todas_las_mesas_reservadas_devuelve_lista_vacia(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva, mesa_id=5)
    _ocupar_turno(fabrica_reserva, mesa_id=6)

    assert _disponibles(db) == []


def _todas_fuera_de_servicio(doble) -> None:
    for mesa_id in (5, 6):
        doble.poner(mesa_id, estado=EstadoMesa.FUERA_DE_SERVICIO)


def _sin_mesas(doble) -> None:
    doble.mesas.clear()


# Que no haya mesas para reservar no es un error: es una lista vacia
@pytest.mark.parametrize(
    "dejar_sin_mesas",
    [_todas_fuera_de_servicio, _sin_mesas],
    ids=["todas-fuera-de-servicio", "el-puente-no-ofrece-mesas"],
)
def test_listar_mesas_disponibles_sin_mesas_reservables_devuelve_lista_vacia(
    db: Session, puente_doble, dejar_sin_mesas
) -> None:
    dejar_sin_mesas(puente_doble)

    assert _disponibles(db) == []


# El orden no depende del que traiga el puente: sector (por nombre, no por id), numero e id
def test_listar_mesas_disponibles_ordena_por_sector_numero_e_id(
    db: Session, puente_doble, puente_sin_mesa
) -> None:
    puente_doble.poner(12, numero=1, sector=TERRAZA)
    puente_doble.poner(15, numero=2, sector=SALON)
    puente_doble.poner(14, numero=1, sector=SALON)

    assert _ids_disponibles(db) == [14, 15, 12]


def test_listar_mesas_disponibles_desempata_por_id(
    db: Session, puente_doble, puente_sin_mesa
) -> None:
    puente_doble.poner(21, numero=1, sector=SALON)
    puente_doble.poner(20, numero=1, sector=SALON)

    assert _ids_disponibles(db) == [20, 21]


def test_listar_mesas_disponibles_distingue_el_mismo_numero_en_sectores_distintos(
    db: Session, puente_doble, puente_sin_mesa
) -> None:
    puente_doble.poner(14, numero=1, sector=SALON)
    puente_doble.poner(12, numero=1, sector=TERRAZA)

    disponibles = _disponibles(db)

    assert [(mesa.id, mesa.numero, mesa.sector.nombre) for mesa in disponibles] == [
        (14, 1, "Salón"),
        (12, 1, "Terraza"),
    ]


# S35: la lista no bloquea nada, pero una reserva nueva si saca la mesa de la lista siguiente
def test_listar_mesas_disponibles_una_reserva_nueva_saca_la_mesa_de_la_lista(db: Session) -> None:
    assert _ids_disponibles(db) == [5, 6]

    service.crear_reserva(db, _datos(mesa_id=5))

    assert _ids_disponibles(db) == [6]


def test_listar_mesas_disponibles_no_modifica_datos(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)
    _ocupar_turno(fabrica_reserva, mesa_id=6, estado=EstadoReserva.ATENDIDA)
    antes = [(r.id, r.mesa_id, r.fecha, r.hora, r.estado) for r in _reservas(db)]

    _disponibles(db)

    assert not db.new
    assert not db.dirty
    despues = [(r.id, r.mesa_id, r.fecha, r.hora, r.estado) for r in _reservas(db)]
    assert despues == antes


# S32: el turno pedido cumple las reglas de "no pasado" del alta
def test_listar_mesas_disponibles_rechaza_fecha_pasada(db: Session) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        _disponibles(db, fecha=date(2026, 11, 1))

    assert str(error.value) == "La fecha de la reserva no puede ser anterior a hoy"


@pytest.mark.parametrize("hora", [time(12, 0), time(11, 0)], ids=["igual", "anterior"])
def test_listar_mesas_disponibles_rechaza_hora_pasada_o_igual_de_hoy(
    db: Session, hora: time
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        _disponibles(db, fecha=HOY, hora=hora)

    assert str(error.value) == "La hora de la reserva debe ser posterior a la hora actual"


# La regla de la hora solo aplica si la fecha es hoy
@pytest.mark.parametrize(
    ("fecha", "hora"),
    [(HOY, time(12, 1)), (MANANA, time(11, 0))],
    ids=["hoy-un-minuto-despues", "manana-a-una-hora-menor"],
)
def test_listar_mesas_disponibles_acepta_turnos_validos_parecidos(
    db: Session, fecha: date, hora: time
) -> None:
    assert _ids_disponibles(db, fecha, hora) == [5, 6]


# Un turno pasado se rechaza antes de leer M3
def test_listar_mesas_disponibles_con_turno_pasado_no_consulta_al_puente(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    def falla(*_args, **_kwargs):
        raise AssertionError("un turno pasado no debe leer las mesas de M3")

    monkeypatch.setattr(puente, "listar_mesas", falla)

    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva"):
        _disponibles(db, fecha=date(2026, 11, 1))


# --- S28: "hoy" y la hora actual en la zona del restaurante (UTC-3) ---
# Reloj UTC del servidor: 2026-11-02 02:30 (en el restaurante, 2026-11-01 23:30). Las pruebas piden
# `reloj_utc_fijo`: usan el `ahora()` verdadero, con el proceso en UTC como en Docker.

ANOCHE = date(2026, 11, 1)
HORA_DEL_RESTAURANTE = datetime(2026, 11, 1, 23, 30)


@pytest.mark.parametrize(
    ("zona", "hora_del_proceso"),
    [
        ("UTC", datetime(2026, 11, 2, 2, 30)),
        ("America/Argentina/Buenos_Aires", datetime(2026, 11, 1, 23, 30)),
    ],
    ids=["utc", "buenos-aires"],
)
def test_ahora_no_depende_de_la_zona_del_proceso(
    reloj_utc_fijo, zona_del_proceso, zona: str, hora_del_proceso: datetime
) -> None:
    zona_del_proceso(zona)

    actual = ahora_real()

    assert service.datetime.now() == hora_del_proceso  # el proceso quedo en la zona pedida
    assert actual == HORA_DEL_RESTAURANTE
    assert actual.tzinfo is None


def test_crear_reserva_acepta_hoy_del_restaurante_aunque_el_servidor_ya_este_en_manana(
    db: Session, reloj_utc_fijo
) -> None:
    salida = service.crear_reserva(db, _datos(fecha=ANOCHE, hora=time(23, 45)))

    assert salida.fecha == ANOCHE
    assert salida.hora == time(23, 45)
    assert len(_reservas(db)) == 1


def test_crear_reserva_rechaza_hora_pasada_en_la_zona_del_restaurante(
    db: Session, reloj_utc_fijo
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        service.crear_reserva(db, _datos(fecha=ANOCHE, hora=time(23, 0)))

    assert str(error.value) == "La hora de la reserva debe ser posterior a la hora actual"
    assert _reservas(db) == []


def test_crear_reserva_rechaza_ayer_en_la_zona_del_restaurante(db: Session, reloj_utc_fijo) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        service.crear_reserva(db, _datos(fecha=date(2026, 10, 31)))

    assert str(error.value) == "La fecha de la reserva no puede ser anterior a hoy"
    assert _reservas(db) == []


def test_listar_mesas_disponibles_usa_el_hoy_de_la_zona_del_restaurante(
    db: Session, reloj_utc_fijo
) -> None:
    assert _ids_disponibles(db, ANOCHE, time(23, 45)) == [5, 6]


# --- HU-M5-04 y HU-M5-05: cancelar una reserva anticipadamente o por ausencia ---
# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00 (HOY, definido arriba).

YA_FUE_CANCELADA = "La reserva {id} ya fue cancelada"
YA_FUE_ATENDIDA = "La reserva {id} ya fue atendida y no se puede cancelar"
YA_LLEGO_SU_HORA = (
    "La reserva {id} ya llegó a su hora; si el cliente no vino, cancélela por ausencia"
)
TODAVIA_NO_LLEGO = "La reserva {id} todavía no llegó a su hora y no se puede cancelar por ausencia"


def _reserva_guardada(db: Session, reserva_id: int) -> Reserva:
    """Relee la reserva de la base (no del identity map) despues de intentar cancelarla."""
    db.expire_all()
    return db.get(Reserva, reserva_id)


# --- HU-M5-04: cancelar_anticipada ---


def test_cancelar_anticipada_reserva_activa_queda_cancelada_y_libera_la_mesa(
    db: Session, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(mesa_id=5, cliente_id=7, fecha=HOY, hora=time(21, 30))

    salida = service.cancelar_anticipada(db, reserva.id)

    assert salida.estado == EstadoReserva.CANCELADA_ANTICIPADA
    guardada = _reserva_guardada(db, reserva.id)
    assert guardada.estado == EstadoReserva.CANCELADA_ANTICIPADA
    assert guardada.mesa_id == 5
    assert guardada.cliente_id == 7
    assert guardada.fecha == HOY
    assert guardada.hora == time(21, 30)
    assert guardada.cantidad_personas == 4


def test_cancelar_anticipada_un_minuto_despues_de_la_hora_actual_es_valida(
    db: Session, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(fecha=HOY, hora=time(12, 1))

    salida = service.cancelar_anticipada(db, reserva.id)

    assert salida.estado == EstadoReserva.CANCELADA_ANTICIPADA


def test_cancelar_anticipada_rechaza_hora_igual_a_la_actual(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(fecha=HOY, hora=time(12, 0))

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_anticipada(db, reserva.id)

    assert str(error.value) == YA_LLEGO_SU_HORA.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


def test_cancelar_anticipada_rechaza_fecha_anterior(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(fecha=date(2026, 11, 1), hora=time(12, 0))

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_anticipada(db, reserva.id)

    assert str(error.value) == YA_LLEGO_SU_HORA.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


@pytest.mark.parametrize(
    "estado", [EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA]
)
def test_cancelar_anticipada_reserva_ya_cancelada_responde_409(
    db: Session, fabrica_reserva, estado: EstadoReserva
) -> None:
    reserva = fabrica_reserva(fecha=MANANA, estado=estado)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_anticipada(db, reserva.id)

    assert str(error.value) == YA_FUE_CANCELADA.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == estado


def test_cancelar_anticipada_reserva_atendida_responde_409(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(fecha=MANANA, estado=EstadoReserva.ATENDIDA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_anticipada(db, reserva.id)

    assert str(error.value) == YA_FUE_ATENDIDA.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


def test_cancelar_anticipada_reserva_inexistente_responde_404(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        service.cancelar_anticipada(db, 999)


# --- HU-M5-05: cancelar_por_ausencia ---


def test_cancelar_por_ausencia_reserva_activa_queda_cancelada(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(mesa_id=6, cliente_id=7, fecha=HOY, hora=time(11, 30))

    salida = service.cancelar_por_ausencia(db, reserva.id)

    assert salida.estado == EstadoReserva.CANCELADA_POR_AUSENCIA
    guardada = _reserva_guardada(db, reserva.id)
    assert guardada.estado == EstadoReserva.CANCELADA_POR_AUSENCIA
    assert guardada.mesa_id == 6
    assert guardada.cliente_id == 7
    assert guardada.fecha == HOY
    assert guardada.hora == time(11, 30)
    assert guardada.cantidad_personas == 4


def test_cancelar_por_ausencia_limite_exacto_responde_200(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(fecha=HOY, hora=time(12, 0))

    salida = service.cancelar_por_ausencia(db, reserva.id)

    assert salida.estado == EstadoReserva.CANCELADA_POR_AUSENCIA


def test_cancelar_por_ausencia_rechaza_hora_que_todavia_no_llego(
    db: Session, fabrica_reserva
) -> None:
    reserva = fabrica_reserva(fecha=HOY, hora=time(12, 1))

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_por_ausencia(db, reserva.id)

    assert str(error.value) == TODAVIA_NO_LLEGO.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


def test_cancelar_por_ausencia_rechaza_dia_siguiente(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(fecha=MANANA, hora=time(12, 0))

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_por_ausencia(db, reserva.id)

    assert str(error.value) == TODAVIA_NO_LLEGO.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


@pytest.mark.parametrize(
    "estado, mensaje",
    [
        (EstadoReserva.CANCELADA_ANTICIPADA, YA_FUE_CANCELADA),
        (EstadoReserva.CANCELADA_POR_AUSENCIA, YA_FUE_CANCELADA),
        (EstadoReserva.ATENDIDA, YA_FUE_ATENDIDA),
    ],
)
def test_cancelar_por_ausencia_reserva_ya_cancelada_o_atendida_responde_409(
    db: Session, fabrica_reserva, estado: EstadoReserva, mensaje: str
) -> None:
    reserva = fabrica_reserva(fecha=date(2026, 11, 1), estado=estado)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.cancelar_por_ausencia(db, reserva.id)

    assert str(error.value) == mensaje.format(id=reserva.id)
    assert _reserva_guardada(db, reserva.id).estado == estado


def test_cancelar_por_ausencia_reserva_inexistente_responde_404(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        service.cancelar_por_ausencia(db, 999)


# --- Orden de verificacion: estado (cancelada/atendida) antes que la regla de hora ---


@pytest.mark.parametrize("nombre_cancelar", ["cancelar_anticipada", "cancelar_por_ausencia"])
def test_cancelar_atendida_con_hora_futura_responde_ya_atendida(
    db: Session, fabrica_reserva, nombre_cancelar: str
) -> None:
    cancelar = getattr(service, nombre_cancelar)
    reserva = fabrica_reserva(fecha=HOY, hora=time(21, 30), estado=EstadoReserva.ATENDIDA)

    with pytest.raises(ReglaDeNegocioError) as error:
        cancelar(db, reserva.id)

    assert str(error.value) == YA_FUE_ATENDIDA.format(id=reserva.id)


@pytest.mark.parametrize("nombre_cancelar", ["cancelar_anticipada", "cancelar_por_ausencia"])
@pytest.mark.parametrize(
    "estado", [EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA]
)
def test_cancelar_cancelada_con_hora_pasada_responde_ya_cancelada(
    db: Session, fabrica_reserva, estado: EstadoReserva, nombre_cancelar: str
) -> None:
    cancelar = getattr(service, nombre_cancelar)
    reserva = fabrica_reserva(fecha=HOY, hora=time(11, 30), estado=estado)

    with pytest.raises(ReglaDeNegocioError) as error:
        cancelar(db, reserva.id)

    assert str(error.value) == YA_FUE_CANCELADA.format(id=reserva.id)


# --- Liberacion automatica de la mesa (Requisito "El estado cancelado excluye la mesa...") ---


def test_cancelar_anticipada_libera_la_mesa_en_repository(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(mesa_id=5, cliente_id=1, fecha=HOY, hora=time(21, 30))

    service.cancelar_anticipada(db, reserva.id)

    instante = datetime.combine(HOY, time(21, 30))
    assert 5 not in repository.ids_de_mesas_ocupadas(db, instante, service.VENTANA_DE_OCUPACION)
    assert (
        repository.reserva_que_ocupa_la_mesa(db, 5, instante, service.VENTANA_DE_OCUPACION) is None
    )

    nueva = service.crear_reserva(
        db, ReservaCrear(mesa_id=5, cliente_id=7, fecha=HOY, hora=time(21, 30), cantidad_personas=2)
    )
    assert nueva.estado == EstadoReserva.ACTIVA


def test_cancelar_por_ausencia_libera_la_mesa_en_repository(db: Session, fabrica_reserva) -> None:
    reserva = fabrica_reserva(mesa_id=6, cliente_id=1, fecha=HOY, hora=time(11, 30))

    service.cancelar_por_ausencia(db, reserva.id)

    instante = datetime.combine(HOY, time(11, 30))
    assert 6 not in repository.ids_de_mesas_ocupadas(db, instante, service.VENTANA_DE_OCUPACION)
    assert (
        repository.reserva_que_ocupa_la_mesa(db, 6, instante, service.VENTANA_DE_OCUPACION) is None
    )


# --- HU-M5-06: crear una comanda a partir de una reserva ---
# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00 (HOY). Los ids de las
# reservas son los que asigna la base: las pruebas usan `reserva.id`, no un numero fijo.
# La reserva de referencia es de las 11:30: su hora ya se cumplio (S68), asi que las pruebas de
# atencion no chocan con la regla del horario; las del horario fijan la hora que necesitan.

AYER = date(2026, 11, 1)
YA_ATENDIDA = "La reserva {id} ya fue atendida"
NO_ES_DE_HOY = "La reserva {id} no corresponde al día de hoy"
NO_EN_HORARIO = "La reserva {id} todavía no está en su horario: es a las {hora}"


def _pedido(*lineas: dict, observaciones: str | None = None) -> ComandaDesdeReservaCrear:
    """El pedido de referencia (producto 12 por 2) o el de las lineas que se indiquen."""
    lineas = lineas or ({"producto_id": 12, "cantidad": 2},)
    return ComandaDesdeReservaCrear(detalles=list(lineas), observaciones=observaciones)


def _de_hoy(fabrica_reserva, **cambios) -> Reserva:
    """La reserva de referencia: ACTIVA, de hoy a las 11:30 (ya cumplida), mesa 5, cliente 7."""
    cuerpo = {"mesa_id": 5, "cliente_id": 7, "fecha": HOY, "hora": time(11, 30)}
    return fabrica_reserva(**(cuerpo | cambios))


# --- guarda para atender (existencia, estado y fecha; el horario va aparte, S68) ---


def test_crear_comanda_reserva_inexistente_responde_404(db: Session, puente_doble) -> None:
    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        service.crear_comanda(db, 999, _pedido())

    assert puente_doble.comandas == []


@pytest.mark.parametrize(
    "estado", [EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA]
)
def test_crear_comanda_reserva_cancelada_responde_409(
    db: Session, fabrica_reserva, puente_doble, estado: EstadoReserva
) -> None:
    reserva = _de_hoy(fabrica_reserva, estado=estado)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_FUE_CANCELADA.format(id=reserva.id)
    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == estado


def test_crear_comanda_reserva_atendida_responde_409(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, estado=EstadoReserva.ATENDIDA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_ATENDIDA.format(id=reserva.id)
    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


# S57: la fecha de la reserva tiene que ser la de hoy, ni futura ni pasada
@pytest.mark.parametrize("fecha", [MANANA, AYER], ids=["manana", "ayer"])
def test_crear_comanda_reserva_de_otra_fecha_responde_409(
    db: Session, fabrica_reserva, puente_doble, fecha: date
) -> None:
    reserva = _de_hoy(fabrica_reserva, fecha=fecha)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == NO_ES_DE_HOY.format(id=reserva.id)
    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


# Orden de las verificaciones: cancelada y atendida van antes que la fecha
def test_crear_comanda_cancelada_de_otra_fecha_responde_ya_fue_cancelada(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, fecha=MANANA, estado=EstadoReserva.CANCELADA_ANTICIPADA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_FUE_CANCELADA.format(id=reserva.id)
    assert puente_doble.comandas == []


def test_crear_comanda_atendida_de_otra_fecha_responde_ya_fue_atendida(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, fecha=MANANA, estado=EstadoReserva.ATENDIDA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_ATENDIDA.format(id=reserva.id)
    assert puente_doble.comandas == []


# --- el pedido incluye al menos un producto (paso 6, S53) ---

AL_MENOS_UN_PRODUCTO = "La comanda debe incluir al menos un producto"
MENU_5 = {"menu_ejecutivo_id": 5, "cantidad": 1}
MENU_6 = {"menu_ejecutivo_id": 6, "cantidad": 2}


def test_crear_comanda_solo_menus_responde_422(db: Session, fabrica_reserva, puente_doble) -> None:
    reserva = _de_hoy(fabrica_reserva)

    with pytest.raises(DatosInvalidosError) as error:
        service.crear_comanda(db, reserva.id, _pedido(MENU_5))

    assert str(error.value) == AL_MENOS_UN_PRODUCTO
    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


def test_crear_comanda_varias_lineas_de_menu_responde_422(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    with pytest.raises(DatosInvalidosError, match=AL_MENOS_UN_PRODUCTO):
        service.crear_comanda(db, reserva.id, _pedido(MENU_5, MENU_6))

    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


def test_crear_comanda_solo_menus_gana_a_los_errores_de_m4(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    invocaciones = []
    puente_doble.efecto = invocaciones.append  # queda anotado si se llamo, aunque falle
    puente_doble.falla = ReglaDeNegocioError("La mesa 5 no está libre")

    with pytest.raises(DatosInvalidosError, match=AL_MENOS_UN_PRODUCTO):
        service.crear_comanda(db, reserva.id, _pedido(MENU_5))

    assert invocaciones == []


# Estas dos protegen el orden y pasan desde el principio: la guarda ya existe
def test_crear_comanda_cancelada_con_solo_menus_responde_409(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, estado=EstadoReserva.CANCELADA_POR_AUSENCIA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido(MENU_5))

    assert str(error.value) == YA_FUE_CANCELADA.format(id=reserva.id)
    assert puente_doble.comandas == []


def test_crear_comanda_otra_fecha_con_solo_menus_responde_409(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, fecha=MANANA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido(MENU_5))

    assert str(error.value) == NO_ES_DE_HOY.format(id=reserva.id)
    assert puente_doble.comandas == []


# S68: el horario (409) tambien va antes que el pedido sin productos (422), igual que la fecha
def test_crear_comanda_antes_de_su_hora_con_solo_menus_responde_409_del_horario(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=time(21, 30))

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido(MENU_5))

    assert str(error.value) == NO_EN_HORARIO.format(id=reserva.id, hora="21:30")
    assert puente_doble.comandas == []


# --- camino feliz y atomicidad (pasos 7 y 8) ---

PRODUCTO_12 = {"producto_id": 12, "cantidad": 2}
PRODUCTO_13 = {"producto_id": 13, "cantidad": 1}


def test_crear_comanda_reserva_activa_de_hoy_queda_atendida_y_devuelve_la_comanda(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    pedido = _pedido(PRODUCTO_12, observaciones="Sin sal")

    comanda = service.crear_comanda(db, reserva.id, pedido)

    # D1: el puente recibe argumentos sueltos (mesa, reserva, lineas, observaciones), no un DTO
    assert puente_doble.comandas == [(5, reserva.id, pedido.detalles, "Sin sal")]
    assert comanda.estado == EstadoComanda.ABIERTA
    assert (comanda.mesa_id, comanda.reserva_id) == (5, reserva.id)
    guardada = _reserva_guardada(db, reserva.id)
    assert guardada.estado == EstadoReserva.ATENDIDA
    assert (guardada.mesa_id, guardada.cliente_id, guardada.fecha) == (5, 7, HOY)
    assert (guardada.hora, guardada.cantidad_personas) == (time(11, 30), 4)


def test_crear_comanda_hace_un_unico_commit_despues_del_puente_y_de_atender(
    db: Session, fabrica_reserva, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    eventos: list[object] = []
    puente_doble.efecto = lambda _db: eventos.append("puente")
    commit_real = db.commit

    def commit_espiado() -> None:
        eventos.append(("commit", reserva.estado))
        commit_real()

    monkeypatch.setattr(db, "commit", commit_espiado)

    service.crear_comanda(db, reserva.id, _pedido())

    assert eventos == ["puente", ("commit", EstadoReserva.ATENDIDA)]


def test_crear_comanda_hereda_la_mesa_de_la_reserva(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, mesa_id=6)

    comanda = service.crear_comanda(db, reserva.id, _pedido())

    assert comanda.mesa_id == 6
    assert [llamada[0] for llamada in puente_doble.comandas] == [6]


def test_crear_comanda_varias_lineas_con_producto_y_menu_conserva_el_orden(
    db: Session, fabrica_reserva
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    comanda = service.crear_comanda(db, reserva.id, _pedido(PRODUCTO_12, MENU_5, PRODUCTO_13))

    assert [(d.producto_id, d.menu_ejecutivo_id) for d in comanda.detalles] == [
        (12, None),
        (None, 5),
        (13, None),
    ]
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


def test_crear_comanda_un_producto_junto_a_menus_alcanza(db: Session, fabrica_reserva) -> None:
    reserva = _de_hoy(fabrica_reserva)

    pedido = _pedido(MENU_5, {"producto_id": 12, "cantidad": 1})

    comanda = service.crear_comanda(db, reserva.id, pedido)

    assert len(comanda.detalles) == 2
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


@pytest.mark.parametrize("observaciones", ["Sin sal", None])
def test_crear_comanda_observaciones_son_opcionales(
    db: Session, fabrica_reserva, observaciones: str | None
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    comanda = service.crear_comanda(db, reserva.id, _pedido(observaciones=observaciones))

    assert comanda.observaciones == observaciones


def test_crear_comanda_no_agrega_un_cliente_propio(db: Session, fabrica_reserva) -> None:
    reserva = _de_hoy(fabrica_reserva)

    comanda = service.crear_comanda(db, reserva.id, _pedido())

    assert not [clave for clave in comanda.model_dump() if "cliente" in clave]
    assert _reserva_guardada(db, reserva.id).cliente_id == 7  # el cliente se conoce por la reserva


def test_crear_reserva_no_crea_ninguna_comanda(db: Session, puente_doble) -> None:
    service.crear_reserva(db, _datos())

    assert puente_doble.comandas == []


# S55: la mesa la verifica M4; M5 no la consulta al puente en este flujo
def test_crear_comanda_no_consulta_la_mesa_al_puente(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    consultas: list[str] = []
    monkeypatch.setattr(puente, "obtener_mesa", lambda *_: consultas.append("obtener_mesa"))
    monkeypatch.setattr(puente, "listar_mesas", lambda *_: consultas.append("listar_mesas"))

    service.crear_comanda(db, reserva.id, _pedido())

    assert consultas == []


# S68 (revierte S63): la reserva de hoy no se atiende antes de su hora, sin tolerancia
@pytest.mark.parametrize(
    ("hora", "texto"),
    [(time(12, 1), "12:01"), (time(21, 30), "21:30"), (time(23, 59), "23:59")],
    ids=["un-minuto-antes", "a-la-noche", "ultimo-minuto-del-dia"],
)
def test_crear_comanda_de_hoy_antes_de_su_hora_responde_409(
    db: Session, fabrica_reserva, puente_doble, hora: time, texto: str
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=hora)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == NO_EN_HORARIO.format(id=reserva.id, hora=texto)
    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


@pytest.mark.parametrize(
    "hora",
    [time(12, 0), time(11, 59), time(8, 0)],
    ids=["en-punto", "un-minuto-despues", "ya-paso"],
)
def test_crear_comanda_de_hoy_desde_su_hora_queda_atendida(
    db: Session, fabrica_reserva, puente_doble, hora: time
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=hora)

    comanda = service.crear_comanda(db, reserva.id, _pedido())

    assert comanda.reserva_id == reserva.id
    assert len(puente_doble.comandas) == 1
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


def test_crear_comanda_antes_de_su_hora_no_llama_al_puente_ni_escribe(
    db: Session, fabrica_reserva, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=time(21, 30))
    invocaciones: list[Session] = []
    commits: list[str] = []
    puente_doble.efecto = invocaciones.append  # queda anotado si se llamo, aunque falle
    monkeypatch.setattr(db, "commit", lambda: commits.append("commit"))

    with pytest.raises(ReglaDeNegocioError, match="todavía no está en su horario"):
        service.crear_comanda(db, reserva.id, _pedido())

    assert invocaciones == []
    assert puente_doble.comandas == []
    assert commits == []
    assert not db.new
    assert not db.dirty
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


# Orden de las verificaciones: cancelada, atendida y la fecha van antes que el horario
def test_crear_comanda_cancelada_antes_de_su_hora_responde_ya_fue_cancelada(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=time(21, 30), estado=EstadoReserva.CANCELADA_ANTICIPADA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_FUE_CANCELADA.format(id=reserva.id)
    assert puente_doble.comandas == []


def test_crear_comanda_atendida_antes_de_su_hora_responde_ya_fue_atendida(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva, hora=time(21, 30), estado=EstadoReserva.ATENDIDA)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_ATENDIDA.format(id=reserva.id)
    assert puente_doble.comandas == []


@pytest.mark.parametrize("fecha", [MANANA, AYER], ids=["manana", "ayer"])
def test_crear_comanda_otra_fecha_con_la_hora_sin_cumplir_responde_el_409_de_la_fecha(
    db: Session, fabrica_reserva, puente_doble, fecha: date
) -> None:
    reserva = _de_hoy(fabrica_reserva, fecha=fecha, hora=time(21, 30))

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == NO_ES_DE_HOY.format(id=reserva.id)
    assert puente_doble.comandas == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


# S28 y S68: el horario se compara con la hora del restaurante (23:30), no con la del servidor
def test_crear_comanda_el_horario_es_el_de_la_zona_del_restaurante(
    db: Session, fabrica_reserva, puente_doble, reloj_utc_fijo
) -> None:
    cumplida = _de_hoy(fabrica_reserva, fecha=ANOCHE, hora=time(23, 0))
    pendiente = _de_hoy(fabrica_reserva, mesa_id=6, fecha=ANOCHE, hora=time(23, 45))

    service.crear_comanda(db, cumplida.id, _pedido())
    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, pendiente.id, _pedido())

    assert _reserva_guardada(db, cumplida.id).estado == EstadoReserva.ATENDIDA
    assert str(error.value) == NO_EN_HORARIO.format(id=pendiente.id, hora="23:45")
    assert _reserva_guardada(db, pendiente.id).estado == EstadoReserva.ACTIVA
    assert len(puente_doble.comandas) == 1


# S28 y D9: "hoy" es el de la zona del restaurante (el servidor en UTC ya marca el 2 de noviembre)
def test_crear_comanda_hoy_es_el_de_la_zona_del_restaurante(
    db: Session, fabrica_reserva, puente_doble, reloj_utc_fijo
) -> None:
    de_anoche = _de_hoy(fabrica_reserva, fecha=ANOCHE)
    de_la_fecha_del_servidor = _de_hoy(fabrica_reserva, fecha=HOY)

    service.crear_comanda(db, de_anoche.id, _pedido())
    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, de_la_fecha_del_servidor.id, _pedido())

    assert _reserva_guardada(db, de_anoche.id).estado == EstadoReserva.ATENDIDA
    assert str(error.value) == NO_ES_DE_HOY.format(id=de_la_fecha_del_servidor.id)
    assert _reserva_guardada(db, de_la_fecha_del_servidor.id).estado == EstadoReserva.ACTIVA
    assert len(puente_doble.comandas) == 1


def test_crear_comanda_segundo_envio_responde_ya_fue_atendida(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    service.crear_comanda(db, reserva.id, _pedido())

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == YA_ATENDIDA.format(id=reserva.id)
    assert len(puente_doble.comandas) == 1


ERRORES_DE_M4 = [
    NoEncontradoError("El producto 99 no existe"),
    ReglaDeNegocioError("El producto Milanesa está deshabilitado"),
    ReglaDeNegocioError("La mesa 5 no está libre"),
    ComandaAbiertaError(31),
    NoEncontradoError("La mesa 5 no existe"),
]


@pytest.mark.parametrize("falla", ERRORES_DE_M4, ids=lambda falla: str(falla)[:30])
def test_crear_comanda_error_de_m4_se_propaga_y_deja_la_reserva_activa(
    db: Session,
    fabrica_reserva,
    puente_doble,
    monkeypatch: pytest.MonkeyPatch,
    falla: Exception,
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    puente_doble.falla = falla
    commits: list[str] = []
    monkeypatch.setattr(db, "commit", lambda: commits.append("commit"))

    with pytest.raises(type(falla)) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert error.value is falla  # sube la misma excepcion, sin reescribirla
    assert commits == []
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


def test_crear_comanda_error_de_m4_revierte_lo_que_m4_ya_escribio(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)

    def escritura_de_m4(sesion: Session) -> None:
        sesion.add(
            Reserva(
                mesa_id=6,
                cliente_id=7,
                fecha=MANANA,
                hora=time(10, 0),
                cantidad_personas=2,
                estado=EstadoReserva.ACTIVA,
            )
        )
        sesion.flush()  # M4 hace flush y no confirma

    puente_doble.efecto = escritura_de_m4
    puente_doble.falla = ReglaDeNegocioError("La mesa 5 no está libre")

    with pytest.raises(ReglaDeNegocioError):
        service.crear_comanda(db, reserva.id, _pedido())

    # la escritura de M4 no quedo y la sesion sigue sirviendo para consultar
    assert [fila.id for fila in _reservas(db)] == [reserva.id]


def test_crear_comanda_misma_reserva_se_atiende_cuando_la_mesa_se_libera(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    puente_doble.falla = ReglaDeNegocioError("La mesa 5 no está libre")
    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 no está libre"):
        service.crear_comanda(db, reserva.id, _pedido())

    puente_doble.falla = None
    comanda = service.crear_comanda(db, reserva.id, _pedido())

    assert comanda.estado == EstadoComanda.ABIERTA
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


def test_crear_comanda_falla_el_commit_deshace_la_sesion(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    deshechos: list[str] = []
    rollback_real = db.rollback

    def commit_roto() -> None:
        db.flush()  # lo escrito llega a la transaccion, pero el commit falla
        raise OperationalError("COMMIT", {}, Exception("disk I/O error"))

    def rollback_espiado() -> None:
        deshechos.append("rollback")
        rollback_real()

    monkeypatch.setattr(db, "commit", commit_roto)
    monkeypatch.setattr(db, "rollback", rollback_espiado)

    with pytest.raises(OperationalError):
        service.crear_comanda(db, reserva.id, _pedido())

    assert deshechos == ["rollback"]
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


# --- carrera sobre la mesa (Decision 52): el indice unico de comanda abierta por mesa de M4 ---

CONFLICTO_DE_MESA = "La mesa 5 ya tiene una comanda abierta"


def _indice_de_comandas_abiertas() -> IntegrityError:
    """El error que M4 deja subir cuando otra comanda ABIERTA tomo la mesa (sin traducir)."""
    return IntegrityError(
        "INSERT INTO comandas", {}, Exception("UNIQUE constraint failed: comandas.mesa_id")
    )


def test_crear_comanda_integrity_error_con_la_reserva_activa_responde_conflicto_de_mesa(
    db: Session, fabrica_reserva, puente_doble, monkeypatch: pytest.MonkeyPatch
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    puente_doble.falla = _indice_de_comandas_abiertas()
    deshechos: list[str] = []
    rollback_real = db.rollback

    def rollback_espiado() -> None:
        deshechos.append("rollback")
        rollback_real()

    monkeypatch.setattr(db, "rollback", rollback_espiado)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva.id, _pedido())

    assert str(error.value) == CONFLICTO_DE_MESA
    assert isinstance(error.value.__cause__, IntegrityError)
    assert deshechos == ["rollback"]
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA


def test_crear_comanda_integrity_error_con_reserva_atendida_por_otra_sesion_responde_ya_atendida(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    reserva_id = reserva.id

    def otra_solicitud_atiende_la_reserva(sesion: Session) -> None:
        # M4 consulta la sesion antes de insertar: eso abre la transaccion y el rollback de
        # `crear_comanda` expira lo ya leido (sin ella, la reserva seguiria en memoria).
        sesion.execute(select(Reserva.id))
        with sessionmaker(bind=db.get_bind())() as otra:
            otra.get(Reserva, reserva_id).estado = EstadoReserva.ATENDIDA
            otra.commit()

    puente_doble.efecto = otra_solicitud_atiende_la_reserva
    puente_doble.falla = _indice_de_comandas_abiertas()

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, reserva_id, _pedido())

    assert str(error.value) == YA_ATENDIDA.format(id=reserva_id)
    assert _reserva_guardada(db, reserva_id).estado == EstadoReserva.ATENDIDA


def test_crear_comanda_integrity_error_deja_la_sesion_usable_y_sin_cambios(
    db: Session, fabrica_reserva, puente_doble
) -> None:
    reserva = _de_hoy(fabrica_reserva)
    puente_doble.falla = _indice_de_comandas_abiertas()
    with pytest.raises(ReglaDeNegocioError):
        service.crear_comanda(db, reserva.id, _pedido())

    assert not db.new
    assert not db.dirty
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ACTIVA
    puente_doble.falla = None
    service.crear_comanda(db, reserva.id, _pedido())  # la misma sesion sigue sirviendo
    assert _reserva_guardada(db, reserva.id).estado == EstadoReserva.ATENDIDA


# --- HU-M5-07: reporte de reservas y ausentismo, variante PDF ---


def test_generar_pdf_reservas_ausentismo_llama_a_componer_con_ahora_y_arma_el_nombre(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    llamadas: list[datetime] = []
    original = service.reporte_pdf.componer

    def espia(resumen, generado):
        llamadas.append(generado)
        return original(resumen, generado)

    monkeypatch.setattr(service.reporte_pdf, "componer", espia)

    archivo = service.generar_pdf_reservas_ausentismo(db, date(2026, 10, 1), date(2026, 10, 31))

    assert llamadas == [service.ahora()]
    assert archivo.nombre == "reservas-ausentismo_2026-10-01_2026-10-31.pdf"
    assert archivo.contenido.startswith(b"%PDF")
