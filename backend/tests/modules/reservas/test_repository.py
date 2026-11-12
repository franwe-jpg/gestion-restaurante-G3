"""Pruebas directas de la definicion de "mesa ocupada" del repository (S69).

La ventana llega como parametro: aqui se prueba con valores distintos de las 2 horas del service.
"""

from datetime import date, datetime, time, timedelta

import pytest
from sqlalchemy.orm import Session

from app.modules.reservas import repository
from app.modules.reservas.models import EstadoReserva

DIA = date(2026, 11, 2)
INSTANTE = datetime(2026, 11, 2, 21, 30)
DOS_HORAS = timedelta(hours=2)


def test_reserva_que_ocupa_la_mesa_devuelve_la_reserva_que_conflicta(
    db: Session, fabrica_reserva
) -> None:
    existente = fabrica_reserva(mesa_id=5, fecha=DIA, hora=time(22, 30))

    conflicto = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, DOS_HORAS)

    assert conflicto is not None
    assert (conflicto.id, conflicto.fecha, conflicto.hora) == (existente.id, DIA, time(22, 30))


def test_reserva_que_ocupa_la_mesa_sin_reservas_de_esa_mesa_devuelve_none(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=6, fecha=DIA, hora=time(21, 30))
    fabrica_reserva(mesa_id=5, fecha=DIA, hora=time(23, 30))  # justo a 2 horas: no ocupa

    assert repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, DOS_HORAS) is None


def test_reserva_que_ocupa_la_mesa_con_varias_devuelve_la_primera_por_fecha_y_hora(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=DIA, hora=time(22, 30))
    primera = fabrica_reserva(mesa_id=5, fecha=DIA, hora=time(20, 30))

    conflicto = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, DOS_HORAS)

    assert conflicto is not None
    assert conflicto.id == primera.id


@pytest.mark.parametrize(
    ("estado", "ocupa"),
    [
        (EstadoReserva.ACTIVA, True),
        (EstadoReserva.ATENDIDA, True),
        (EstadoReserva.CANCELADA_ANTICIPADA, False),
        (EstadoReserva.CANCELADA_POR_AUSENCIA, False),
    ],
)
def test_reserva_que_ocupa_la_mesa_solo_cuentan_activa_y_atendida(
    db: Session, fabrica_reserva, estado: EstadoReserva, ocupa: bool
) -> None:
    fabrica_reserva(mesa_id=5, fecha=DIA, hora=time(21, 30), estado=estado)

    conflicto = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, DOS_HORAS)

    assert (conflicto is not None) is ocupa


def test_reserva_que_ocupa_la_mesa_excluye_la_reserva_indicada(
    db: Session, fabrica_reserva
) -> None:
    propia = fabrica_reserva(mesa_id=5, fecha=DIA, hora=time(21, 30))

    sin_excluir = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, DOS_HORAS)
    excluyendo = repository.reserva_que_ocupa_la_mesa(
        db, 5, INSTANTE, DOS_HORAS, excluir_id=propia.id
    )

    assert sin_excluir is not None
    assert excluyendo is None


# La ventana es un parametro: con media hora, 30 minutos ya alcanzan y 29 todavia conflictan
@pytest.mark.parametrize(
    ("hora", "ocupa"),
    [(time(21, 1), True), (time(21, 0), False), (time(21, 59), True), (time(22, 0), False)],
    ids=["29-antes", "30-antes", "29-despues", "30-despues"],
)
def test_reserva_que_ocupa_la_mesa_respeta_la_ventana_recibida(
    db: Session, fabrica_reserva, hora: time, ocupa: bool
) -> None:
    fabrica_reserva(mesa_id=5, fecha=DIA, hora=hora)

    conflicto = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, timedelta(minutes=30))

    assert (conflicto is not None) is ocupa


@pytest.mark.parametrize(
    ("existente", "instante"),
    [
        pytest.param(
            datetime(2026, 11, 2, 23, 30),
            datetime(2026, 11, 3, 0, 30),
            id="reserva-del-dia-anterior",
        ),
        pytest.param(
            datetime(2026, 11, 3, 0, 30),
            datetime(2026, 11, 2, 23, 30),
            id="reserva-del-dia-siguiente",
        ),
    ],
)
def test_reserva_que_ocupa_la_mesa_mira_el_dia_anterior_y_el_siguiente(
    db: Session, fabrica_reserva, existente: datetime, instante: datetime
) -> None:
    reserva = fabrica_reserva(mesa_id=5, fecha=existente.date(), hora=existente.time())

    conflicto = repository.reserva_que_ocupa_la_mesa(db, 5, instante, DOS_HORAS)

    assert conflicto is not None
    assert conflicto.id == reserva.id


def test_reserva_que_ocupa_la_mesa_con_una_ventana_de_mas_de_un_dia(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 1), hora=time(15, 30))  # 30 h antes

    dentro = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, timedelta(hours=36))
    fuera = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, timedelta(hours=30))

    assert dentro is not None
    assert fuera is None  # justo a 30 horas: la ventana es estricta


def test_ids_de_mesas_ocupadas_devuelve_las_mesas_con_reserva_que_ocupa(
    db: Session, fabrica_reserva
) -> None:
    fabrica_reserva(mesa_id=1, fecha=DIA, hora=time(22, 0))
    fabrica_reserva(mesa_id=2, fecha=DIA, hora=time(20, 30), estado=EstadoReserva.ATENDIDA)
    fabrica_reserva(
        mesa_id=3, fecha=DIA, hora=time(21, 30), estado=EstadoReserva.CANCELADA_ANTICIPADA
    )
    fabrica_reserva(mesa_id=4, fecha=DIA, hora=time(23, 30))  # justo a 2 horas
    fabrica_reserva(mesa_id=5, fecha=date(2026, 11, 3), hora=time(21, 30))  # otro dia

    ocupadas = repository.ids_de_mesas_ocupadas(db, INSTANTE, DOS_HORAS)

    assert ocupadas == {1, 2}


# Una sola definicion: la mesa que `reserva_que_ocupa_la_mesa` ve ocupada es la que figura aqui
@pytest.mark.parametrize("minutos", [-121, -120, -119, 0, 119, 120, 121])
def test_ids_de_mesas_ocupadas_coincide_con_reserva_que_ocupa_la_mesa(
    db: Session, fabrica_reserva, minutos: int
) -> None:
    momento = INSTANTE + timedelta(minutes=minutos)
    fabrica_reserva(mesa_id=5, fecha=momento.date(), hora=momento.time())

    ocupada = 5 in repository.ids_de_mesas_ocupadas(db, INSTANTE, DOS_HORAS)
    conflicto = repository.reserva_que_ocupa_la_mesa(db, 5, INSTANTE, DOS_HORAS)

    assert ocupada is (conflicto is not None)
    assert ocupada is (abs(minutos) < 120)
