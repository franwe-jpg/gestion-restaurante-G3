"""Pruebas del servicio de reservas (HU-M5-01, HU-M5-02 y HU-M5-03)."""

from datetime import date, time, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reservas import repository, service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import ReservaCrear, ReservaModificar
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import ParametrosPaginacion

MANANA = date.today() + timedelta(days=1)
AYER = date.today() - timedelta(days=1)


def _datos(
    mesa_id: int, fecha: date = MANANA, hora: time = time(21, 0), cantidad: int = 4
) -> ReservaCrear:
    return ReservaCrear(
        cliente_nombre="Ana Pérez",
        cliente_telefono="2804000000",
        fecha=fecha,
        hora=hora,
        cantidad_personas=cantidad,
        mesa_id=mesa_id,
    )


def _cantidad_reservas(db: Session) -> int:
    return len(db.scalars(select(Reserva)).all())


# CA 1
def test_crear_reserva_minima_queda_activa(db: Session, fabrica_sector, fabrica_mesa) -> None:
    mesa = fabrica_mesa(fabrica_sector("Terraza"), numero=5)

    salida = service.crear_reserva(db, _datos(mesa.id))

    assert salida.cliente_nombre == "Ana Pérez"
    assert salida.mesa.id == mesa.id
    assert salida.mesa.numero == 5
    assert salida.mesa.sector_nombre == "Terraza"
    assert salida.estado == EstadoReserva.ACTIVA
    assert _cantidad_reservas(db) == 1


# Carrera: el indice unico detiene lo que el chequeo previo deja pasar
def test_crear_reserva_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0))
    monkeypatch.setattr(repository, "existe_reserva_activa_en_horario", lambda *_, **__: False)

    with pytest.raises(ReglaDeNegocioError, match="No hay mesa disponible"):
        service.crear_reserva(db, _datos(mesa.id, fecha=MANANA, hora=time(21, 0)))

    assert _cantidad_reservas(db) == 1


# CA 3: el cliente nuevo queda registrado junto con la reserva (Supuesto S1)
def test_crear_reserva_guarda_el_cliente_con_la_reserva(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())

    salida = service.crear_reserva(db, _datos(mesa.id))
    guardada = db.get(Reserva, salida.id)

    assert guardada.cliente_nombre == "Ana Pérez"
    assert guardada.cliente_telefono == "2804000000"


# CA 4
def test_crear_reserva_con_fecha_pasada_es_rechazada(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector())

    with pytest.raises(ReglaDeNegocioError, match="no puede ser anterior a hoy"):
        service.crear_reserva(db, _datos(mesa.id, fecha=AYER))

    assert _cantidad_reservas(db) == 0


def test_crear_reserva_con_mesa_inexistente_es_no_encontrada(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La mesa 99 no existe"):
        service.crear_reserva(db, _datos(99))

    assert _cantidad_reservas(db) == 0


# CA 7: una mesa Fuera de servicio no esta disponible
def test_crear_reserva_con_mesa_fuera_de_servicio_es_rechazada(
    db: Session, fabrica_sector, fabrica_mesa
) -> None:
    mesa = fabrica_mesa(fabrica_sector(), estado=EstadoMesa.FUERA_DE_SERVICIO)

    with pytest.raises(ReglaDeNegocioError, match="No hay mesa disponible"):
        service.crear_reserva(db, _datos(mesa.id))

    assert _cantidad_reservas(db) == 0


# CA 6
def test_crear_reserva_con_mesa_ya_reservada_en_el_horario_es_rechazada(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0))

    with pytest.raises(ReglaDeNegocioError, match="No hay mesa disponible"):
        service.crear_reserva(db, _datos(mesa.id, fecha=MANANA, hora=time(21, 0)))

    assert _cantidad_reservas(db) == 1


# CA 6, limite: otro horario de la misma mesa esta disponible
def test_crear_reserva_en_otro_horario_de_la_misma_mesa_es_aceptada(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0))

    salida = service.crear_reserva(db, _datos(mesa.id, fecha=MANANA, hora=time(22, 0)))

    assert salida.mesa.id == mesa.id
    assert _cantidad_reservas(db) == 2


# Una reserva cancelada no bloquea el horario
def test_crear_reserva_en_horario_de_una_reserva_cancelada_es_aceptada(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0), estado=EstadoReserva.CANCELADA_ANTICIPADA)

    salida = service.crear_reserva(db, _datos(mesa.id, fecha=MANANA, hora=time(21, 0)))

    assert salida.mesa.id == mesa.id


# --- HU-M5-02: modificar una reserva ---


def _datos_modificar(
    fecha: date = MANANA, hora: time = time(22, 0), cantidad: int = 2
) -> ReservaModificar:
    return ReservaModificar(fecha=fecha, hora=hora, cantidad_personas=cantidad)


def test_modificar_reserva_cambia_fecha_hora_y_comensales(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0), cantidad_personas=4)

    salida = service.modificar_reserva(db, reserva.id, _datos_modificar())

    assert salida.hora == time(22, 0)
    assert salida.cantidad_personas == 2
    guardada = db.get(Reserva, reserva.id)
    assert guardada.hora == time(22, 0)


def test_modificar_reserva_inexistente_es_no_encontrada(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="La reserva 99 no existe"):
        service.modificar_reserva(db, 99, _datos_modificar())


def test_modificar_reserva_con_fecha_pasada_es_rechazada(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0))

    with pytest.raises(ReglaDeNegocioError, match="no puede ser anterior a hoy"):
        service.modificar_reserva(db, reserva.id, _datos_modificar(fecha=AYER))


# CA del modify: sin mesa disponible para el nuevo horario no se aplica el cambio
def test_modificar_reserva_a_un_horario_ocupado_por_otra_reserva_es_rechazada(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0))
    fabrica_reserva(mesa, fecha=MANANA, hora=time(22, 0))

    with pytest.raises(ReglaDeNegocioError, match="No hay mesa disponible"):
        service.modificar_reserva(db, reserva.id, _datos_modificar(fecha=MANANA, hora=time(22, 0)))

    assert db.get(Reserva, reserva.id).hora == time(21, 0)


# Carrera en la modificacion
def test_modificar_reserva_convierte_la_carrera_en_conflicto_y_deshace(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva, monkeypatch: pytest.MonkeyPatch
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0))
    fabrica_reserva(mesa, fecha=MANANA, hora=time(22, 0))
    monkeypatch.setattr(repository, "existe_reserva_activa_en_horario", lambda *_, **__: False)

    with pytest.raises(ReglaDeNegocioError, match="No hay mesa disponible"):
        service.modificar_reserva(db, reserva.id, _datos_modificar(fecha=MANANA, hora=time(22, 0)))

    assert db.get(Reserva, reserva.id).hora == time(21, 0)


# Limite: modificar al mismo horario que ya tenia es valido (no choca consigo misma)
def test_modificar_reserva_al_mismo_horario_es_aceptada(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    reserva = fabrica_reserva(mesa, fecha=MANANA, hora=time(21, 0), cantidad_personas=4)

    salida = service.modificar_reserva(
        db, reserva.id, _datos_modificar(fecha=MANANA, hora=time(21, 0), cantidad=6)
    )

    assert salida.cantidad_personas == 6


# --- HU-M5-03: listar las reservas de un dia ---


def test_listar_reservas_de_un_dia_ordenadas_por_hora(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    mesa = fabrica_mesa(fabrica_sector())
    fabrica_reserva(mesa, cliente_nombre="Luis", fecha=MANANA, hora=time(22, 0))
    fabrica_reserva(mesa, cliente_nombre="Ana", fecha=MANANA, hora=time(20, 0))
    fabrica_reserva(
        mesa, cliente_nombre="Otro día", fecha=MANANA + timedelta(days=1), hora=time(21, 0)
    )

    pagina = service.listar_reservas(db, ParametrosPaginacion(), MANANA)

    assert [reserva.cliente_nombre for reserva in pagina.items] == ["Ana", "Luis"]
    assert pagina.total == 2


# CA: sin reservas ese dia
def test_listar_reservas_sin_reservas_ese_dia_devuelve_pagina_vacia(db: Session) -> None:
    pagina = service.listar_reservas(db, ParametrosPaginacion(), MANANA)

    assert pagina.items == []
    assert pagina.total == 0


# --- mesas disponibles (selector de HU-M5-01) ---


def test_listar_mesas_disponibles_excluye_fuera_de_servicio_y_reservadas(
    db: Session, fabrica_sector, fabrica_mesa, fabrica_reserva
) -> None:
    sector = fabrica_sector()
    libre = fabrica_mesa(sector, numero=1)
    reservada = fabrica_mesa(sector, numero=2)
    fuera_de_servicio = fabrica_mesa(sector, numero=3, estado=EstadoMesa.FUERA_DE_SERVICIO)
    fabrica_reserva(reservada, fecha=MANANA, hora=time(21, 0))

    disponibles = service.listar_mesas_disponibles(db, MANANA, time(21, 0))

    ids = {mesa.id for mesa in disponibles}
    assert ids == {libre.id}
    assert reservada.id not in ids
    assert fuera_de_servicio.id not in ids


def test_listar_mesas_disponibles_sin_mesas_devuelve_lista_vacia(db: Session) -> None:
    assert service.listar_mesas_disponibles(db, MANANA, time(21, 0)) == []
