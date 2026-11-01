"""Pruebas del servicio de reservas: alta (HU-M5-01), modificacion (HU-M5-02) y listado."""

from datetime import UTC, date, datetime, time, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas import puente, repository, service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import (
    FiltroReservas,
    MesaDisponible,
    ReservaCrear,
    ReservaModificar,
    ReservaSalida,
)
from app.modules.reservas.service import ahora as ahora_real
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import Pagina

# El reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00.
HOY = date(2026, 11, 2)
MANANA = date(2026, 11, 3)
TURNO_OCUPADO = "La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30"


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


# S6 y S20: el lado Cliente sigue siendo un stub, todo cliente positivo existe
def test_crear_reserva_acepta_cualquier_cliente_positivo_con_el_stub(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(mesa_id=5, cliente_id=456))

    assert salida.mesa_id == 5
    assert salida.cliente_id == 456


# CA 7, S5 (issue #61): la cantidad solo debe ser un entero mayor a cero; no se la compara con
# la capacidad de la mesa (se resuelve en forma presencial)
def test_crear_reserva_acepta_una_cantidad_muy_grande_de_personas(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(cantidad_personas=100))

    assert salida.cantidad_personas == 100
    db.expire_all()
    assert db.get(Reserva, salida.id).cantidad_personas == 100


# CA 9
def test_crear_reserva_rechaza_turno_ocupado(db: Session, fabrica_reserva) -> None:
    existente = _ocupar_turno(fabrica_reserva)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cliente_id=8))

    assert str(error.value) == TURNO_OCUPADO
    db.expire_all()
    reservas = _reservas(db)
    assert [reserva.id for reserva in reservas] == [existente.id]
    assert reservas[0].cliente_id == 3
    assert reservas[0].estado == EstadoReserva.ACTIVA


@pytest.mark.parametrize(
    "estado",
    [
        EstadoReserva.ATENDIDA,
        EstadoReserva.CANCELADA_ANTICIPADA,
        EstadoReserva.CANCELADA_POR_AUSENCIA,
    ],
)
def test_crear_reserva_permite_turno_de_reserva_no_activa(
    db: Session, fabrica_reserva, estado: EstadoReserva
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado)

    salida = service.crear_reserva(db, _datos())

    assert salida.estado == EstadoReserva.ACTIVA
    assert len(_reservas(db)) == 2


def test_crear_reserva_permite_misma_hora_en_otra_mesa(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)

    salida = service.crear_reserva(db, _datos(mesa_id=6))

    assert salida.mesa_id == 6


@pytest.mark.parametrize(
    "cambios",
    [{"hora": time(22, 0)}, {"fecha": MANANA}],
    ids=["otra-hora", "otra-fecha"],
)
def test_crear_reserva_permite_otra_hora_u_otra_fecha_en_la_misma_mesa(
    db: Session, fabrica_reserva, cambios: dict
) -> None:
    _ocupar_turno(fabrica_reserva)

    salida = service.crear_reserva(db, _datos(**cambios))

    assert salida.mesa_id == 5
    assert len(_reservas(db)) == 2


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
    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva activa"):
        service.crear_reserva(db, _datos())


# S17: orden de validacion. Cada paso corrige el error anterior y deja el siguiente.
def test_crear_reserva_orden_de_validacion(
    db: Session,
    fabrica_reserva,
    puente_doble,
    puente_sin_mesa,
    puente_sin_cliente,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _ocupar_turno(fabrica_reserva)
    ayer = date(2026, 11, 1)

    with pytest.raises(NoEncontradoError, match="La mesa 5 no existe"):
        service.crear_reserva(db, _datos(fecha=ayer))

    puente_doble.poner(5, estado=EstadoMesa.FUERA_DE_SERVICIO)
    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 está fuera de servicio"):
        service.crear_reserva(db, _datos(fecha=ayer))

    puente_doble.poner(5, estado=EstadoMesa.LIBRE)
    with pytest.raises(NoEncontradoError, match="El cliente 7 no existe"):
        service.crear_reserva(db, _datos(fecha=ayer))

    monkeypatch.setattr(puente, "existe_cliente", puente_doble.existe_cliente)
    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva"):
        service.crear_reserva(db, _datos(fecha=ayer))

    with pytest.raises(DatosInvalidosError, match="La hora de la reserva"):
        service.crear_reserva(db, _datos(hora=time(11, 0)))

    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva activa"):
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
    monkeypatch.setattr(repository, "existe_reserva_activa", lambda *_args, **_kwargs: False)


def test_crear_reserva_traduce_conflicto_del_indice_en_409(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    existente = _ocupar_turno(fabrica_reserva)
    _sin_verificacion_previa(monkeypatch)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_reserva(db, _datos(cliente_id=8))

    assert str(error.value) == TURNO_OCUPADO
    # El rollback deja la sesion usable y sin la segunda reserva.
    assert [reserva.id for reserva in _reservas(db)] == [existente.id]


def test_crear_reserva_dos_altas_iguales_sin_verificacion_previa_deja_una_sola_activa(
    db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _sin_verificacion_previa(monkeypatch)

    primera = service.crear_reserva(db, _datos(cliente_id=7))
    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva activa"):
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
    cuerpo = {"fecha": HOY, "hora": time(22, 0), "cantidad_personas": 5}
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

    assert (salida.fecha, salida.hora, salida.cantidad_personas) == (MANANA, time(22, 0), 5)
    assert _guardada(db, reserva.id) == salida


def test_modificar_reserva_cambia_un_solo_valor(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    salida = _modificar(db, reserva.id, hora=time(21, 30), cantidad_personas=6)

    assert (salida.fecha, salida.hora, salida.cantidad_personas) == (HOY, time(21, 30), 6)


# S7: sin control de concurrencia, gana la ultima
def test_modificar_reserva_la_ultima_modificacion_prevalece(db: Session, fabrica_reserva) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    _modificar(db, reserva.id, cantidad_personas=3)
    _modificar(db, reserva.id, cantidad_personas=5)

    assert _guardada(db, reserva.id).cantidad_personas == 5


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


# CA 3, S5 (issue #61): la cantidad no se compara con la capacidad de la mesa
def test_modificar_reserva_acepta_una_cantidad_muy_grande_de_personas(
    db: Session, fabrica_reserva
) -> None:
    reserva = _ocupar_turno(fabrica_reserva)

    salida = _modificar(db, reserva.id, cantidad_personas=100)

    assert salida.cantidad_personas == 100
    assert _guardada(db, reserva.id) == salida


# S27: la modificacion no consulta al puente: ninguna de sus tres operaciones se llama
def test_modificar_reserva_no_consulta_mesa_ni_cliente(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    def falla(*_args, **_kwargs):
        raise AssertionError("la modificacion no debe consultar al puente")

    for operacion in ("obtener_mesa", "listar_mesas", "existe_cliente"):
        monkeypatch.setattr(puente, operacion, falla)
    reserva = _ocupar_turno(fabrica_reserva)

    assert _modificar(db, reserva.id, cantidad_personas=6).cantidad_personas == 6


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


def test_modificar_reserva_rechaza_turno_de_otra_reserva(db: Session, fabrica_reserva) -> None:
    a = _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))
    antes = (_guardada(db, a.id), _guardada(db, b.id))

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, hora=time(21, 30))

    assert str(error.value) == TURNO_OCUPADO
    assert (_guardada(db, a.id), _guardada(db, b.id)) == antes


def test_modificar_reserva_permite_turno_de_reserva_no_activa(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva, estado=EstadoReserva.CANCELADA_ANTICIPADA)
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))

    assert _modificar(db, b.id, hora=time(21, 30)).hora == time(21, 30)


def test_modificar_reserva_permite_turno_libre_de_otra_mesa(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, mesa_id=6, hora=time(22, 0))

    assert _modificar(db, b.id, hora=time(21, 30)).hora == time(21, 30)


def test_modificar_reserva_libera_el_turno_anterior(db: Session, fabrica_reserva) -> None:
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))

    _modificar(db, b.id, hora=time(22, 30))
    nueva = service.crear_reserva(db, _datos(hora=time(22, 0)))

    assert nueva.hora == time(22, 0)


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
        _modificar(db, reserva.id, fecha=date(2026, 11, 1), cantidad_personas=6)
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
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))
    antes = (_guardada(db, a.id), _guardada(db, b.id))
    _sin_verificacion_previa(monkeypatch)

    with pytest.raises(ReglaDeNegocioError) as error:
        _modificar(db, b.id, hora=time(21, 30))

    assert str(error.value) == TURNO_OCUPADO  # con el horario pedido, no el que quedo en la base
    assert (_guardada(db, a.id), _guardada(db, b.id)) == antes


# S17: orden de validacion. Cada paso corrige el error anterior y deja el siguiente.
def test_modificar_reserva_orden_de_validacion(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)
    b = _ocupar_turno(fabrica_reserva, hora=time(22, 0))
    atendida = _ocupar_turno(fabrica_reserva, mesa_id=6, estado=EstadoReserva.ATENDIDA)
    ayer = date(2026, 11, 1)
    todo_mal = {"fecha": ayer, "hora": time(11, 0)}

    with pytest.raises(NoEncontradoError, match="La reserva 999 no existe"):
        _modificar(db, 999, **todo_mal)

    with pytest.raises(ReglaDeNegocioError, match="no está activa"):
        _modificar(db, atendida.id, **todo_mal)

    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva"):
        _modificar(db, b.id, **todo_mal)

    with pytest.raises(DatosInvalidosError, match="La hora de la reserva"):
        _modificar(db, b.id, **(todo_mal | {"fecha": HOY}))

    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva activa"):
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


# S4: no se modela duracion, solo cuenta la misma fecha y la misma hora
def test_listar_mesas_disponibles_no_excluye_reservas_de_otra_hora_u_otra_fecha(
    db: Session, fabrica_reserva
) -> None:
    _ocupar_turno(fabrica_reserva, hora=time(22, 0))
    _ocupar_turno(fabrica_reserva, fecha=MANANA)

    assert _ids_disponibles(db) == [5, 6]


@pytest.mark.parametrize(
    "estado",
    [
        EstadoReserva.ATENDIDA,
        EstadoReserva.CANCELADA_ANTICIPADA,
        EstadoReserva.CANCELADA_POR_AUSENCIA,
    ],
)
def test_listar_mesas_disponibles_no_excluye_reservas_no_activas(
    db: Session, fabrica_reserva, estado: EstadoReserva
) -> None:
    _ocupar_turno(fabrica_reserva, estado=estado)

    assert _ids_disponibles(db) == [5, 6]


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
