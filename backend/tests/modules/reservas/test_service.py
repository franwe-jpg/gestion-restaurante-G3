"""Pruebas del servicio de reservas: alta (HU-M5-01) y listado (HU-M5-03)."""

from datetime import date, datetime, time

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas import puente, repository, service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import FiltroReservas, ReservaCrear, ReservaSalida
from app.modules.reservas.service import ahora as ahora_real
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
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


# Decision 3: el reloj real es local y sin zona horaria
def test_ahora_devuelve_la_fecha_y_hora_locales_sin_zona() -> None:
    antes = datetime.now()
    actual = ahora_real()
    despues = datetime.now()

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


# S20
def test_crear_reserva_acepta_cualquier_id_positivo_con_el_stub(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(mesa_id=123, cliente_id=456))

    assert salida.mesa_id == 123
    assert salida.cliente_id == 456


# CA 8 (S5): este es tambien el escenario "puente de reemplazo con capacidad"
def test_crear_reserva_rechaza_capacidad_excedida(db: Session, puente_con_capacidad) -> None:
    puente_con_capacidad(6)

    with pytest.raises(
        DatosInvalidosError,
        match="La mesa 5 tiene capacidad para 6 personas y la reserva pide 7",
    ):
        service.crear_reserva(db, _datos(cantidad_personas=7))

    assert _reservas(db) == []


# CA 8, limite
def test_crear_reserva_acepta_capacidad_justa(db: Session, puente_con_capacidad) -> None:
    puente_con_capacidad(6)

    salida = service.crear_reserva(db, _datos(cantidad_personas=6))

    assert salida.cantidad_personas == 6


# CA 8: el stub no informa la capacidad y entonces no se controla
def test_crear_reserva_sin_capacidad_informada_no_controla(db: Session) -> None:
    salida = service.crear_reserva(db, _datos(cantidad_personas=50))

    assert salida.cantidad_personas == 50


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
def test_crear_reserva_conflicto_no_depende_del_puente(db: Session, fabrica_reserva) -> None:
    _ocupar_turno(fabrica_reserva)

    assert puente.obtener_mesa(db, 5) == puente.MesaReservable(id=5, capacidad=None)
    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva activa"):
        service.crear_reserva(db, _datos())


# S17: orden de validacion. Cada paso corrige el error anterior y deja el siguiente.
def test_crear_reserva_orden_de_validacion(
    db: Session, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    _ocupar_turno(fabrica_reserva)
    monkeypatch.setattr(puente, "obtener_mesa", lambda _db, _mesa_id: None)
    monkeypatch.setattr(puente, "existe_cliente", lambda _db, _cliente_id: False)
    ayer = date(2026, 11, 1)

    with pytest.raises(NoEncontradoError, match="La mesa 5 no existe"):
        service.crear_reserva(db, _datos(fecha=ayer, cantidad_personas=7))

    monkeypatch.setattr(
        puente, "obtener_mesa", lambda _db, mesa_id: puente.MesaReservable(mesa_id, 3)
    )
    with pytest.raises(NoEncontradoError, match="El cliente 7 no existe"):
        service.crear_reserva(db, _datos(fecha=ayer, cantidad_personas=7))

    monkeypatch.setattr(puente, "existe_cliente", lambda _db, _cliente_id: True)
    with pytest.raises(DatosInvalidosError, match="La fecha de la reserva"):
        service.crear_reserva(db, _datos(fecha=ayer, cantidad_personas=7))

    with pytest.raises(DatosInvalidosError, match="La hora de la reserva"):
        service.crear_reserva(db, _datos(hora=time(11, 0), cantidad_personas=7))

    with pytest.raises(DatosInvalidosError, match="tiene capacidad para 3 personas"):
        service.crear_reserva(db, _datos(cantidad_personas=7))

    with pytest.raises(ReglaDeNegocioError, match="ya tiene una reserva activa"):
        service.crear_reserva(db, _datos(cantidad_personas=3))


@pytest.mark.parametrize(
    "cambios",
    [
        {"fecha": date(2026, 11, 1)},
        {"hora": time(11, 59)},
        {"cantidad_personas": 7},
    ],
    ids=["fecha-pasada", "hora-pasada", "capacidad-excedida"],
)
def test_crear_reserva_dato_invalido_no_guarda_nada(
    db: Session, puente_con_capacidad, cambios: dict
) -> None:
    puente_con_capacidad(6)

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
