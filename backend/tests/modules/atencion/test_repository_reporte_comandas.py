from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.atencion import repository


def test_reporte_agrupa_cerradas_por_dia_y_turno_y_excluye_estados(
    db: Session, sembrar_pedidos
) -> None:
    sembrar_pedidos(datetime(2026, 11, 12, 15, tzinfo=UTC), [(1, 2)])
    sembrar_pedidos(datetime(2026, 11, 12, 15, 30, tzinfo=UTC), [(1, 1)])
    sembrar_pedidos(datetime(2026, 11, 12, 19, tzinfo=UTC), [(1, 8)], "ABIERTA")
    sembrar_pedidos(datetime(2026, 11, 12, 15, tzinfo=UTC), [(1, 9)], "ANULADA")

    grupos = repository.resumir_comandas_por_dia_turno(
        db,
        datetime(2026, 11, 12, 3, tzinfo=UTC),
        datetime(2026, 11, 13, 3, tzinfo=UTC),
        None,
    )

    assert [(fila[0], fila[1], fila[2], str(fila[3])) for fila in grupos] == [
        ("2026-11-12", "ALMUERZO", 2, "30.00")
    ]


def test_reporte_incluye_almuerzo_desde_12_y_excluye_16(db: Session, sembrar_pedidos) -> None:
    sembrar_pedidos(datetime(2026, 11, 12, 15, tzinfo=UTC), [(1, 1)])
    sembrar_pedidos(datetime(2026, 11, 12, 18, 59, 59, tzinfo=UTC), [(1, 2)])
    sembrar_pedidos(datetime(2026, 11, 12, 19, tzinfo=UTC), [(1, 4)])

    grupos = repository.resumir_comandas_por_dia_turno(
        db,
        datetime(2026, 11, 12, 3, tzinfo=UTC),
        datetime(2026, 11, 13, 3, tzinfo=UTC),
        "ALMUERZO",
    )

    assert [(fila[2], str(fila[3])) for fila in grupos] == [(2, "30.00")]


def test_reporte_suma_detalles_con_descuento(db: Session, comanda) -> None:
    comanda.estado = "CERRADA"
    comanda.fecha_hora = datetime(2026, 11, 12, 15, tzinfo=UTC)
    db.commit()

    grupos = repository.resumir_comandas_por_dia_turno(
        db,
        datetime(2026, 11, 12, 3, tzinfo=UTC),
        datetime(2026, 11, 13, 3, tzinfo=UTC),
        "ALMUERZO",
    )

    assert grupos[0][3] == Decimal("56.55")


def test_reporte_noche_incluye_20_y_2359_pero_excluye_00(db: Session, sembrar_pedidos) -> None:
    sembrar_pedidos(datetime(2026, 11, 12, 23, tzinfo=UTC), [(1, 1)])
    sembrar_pedidos(datetime(2026, 11, 13, 2, 59, 59, tzinfo=UTC), [(1, 2)])
    sembrar_pedidos(datetime(2026, 11, 13, 3, tzinfo=UTC), [(1, 4)])

    grupos = repository.resumir_comandas_por_dia_turno(
        db,
        datetime(2026, 11, 12, 3, tzinfo=UTC),
        datetime(2026, 11, 13, 3, tzinfo=UTC),
        "NOCHE",
    )

    assert [(fila[0], fila[2], str(fila[3])) for fila in grupos] == [("2026-11-12", 2, "30.00")]
