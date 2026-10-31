"""Pruebas del modelo MedioPago (HU-M6-04 a HU-M6-07)."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.pagos.models import MedioPago, TipoMedioPago
from app.shared.models import Estado


def test_tipo_medio_pago_tiene_los_cuatro_valores_del_diagrama() -> None:
    assert [tipo.value for tipo in TipoMedioPago] == [
        "EFECTIVO",
        "TARJETA",
        "TRANSFERENCIA",
        "BILLETERA_VIRTUAL",
    ]


def test_medio_nuevo_queda_habilitado_y_no_eliminado(db: Session) -> None:
    medio = MedioPago(nombre="Efectivo", tipo=TipoMedioPago.EFECTIVO)
    db.add(medio)
    db.flush()

    assert medio.estado == Estado.HABILITADO
    assert medio.eliminado is False
    assert medio.descripcion is None


def test_nombre_normalizado_se_mantiene_con_el_nombre() -> None:
    medio = MedioPago(nombre="  Tarjeta DÉBITO ", tipo=TipoMedioPago.TARJETA)
    assert medio.nombre_normalizado == "tarjeta débito"

    medio.nombre = "EFECTIVO "
    assert medio.nombre_normalizado == "efectivo"


# CA 9 de #74
def test_nombre_normalizado_es_unico_entre_los_no_eliminados(
    db: Session, fabrica_medio_pago
) -> None:
    fabrica_medio_pago("Efectivo")

    db.add(MedioPago(nombre=" efectivo", tipo=TipoMedioPago.EFECTIVO))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


# S3
def test_el_nombre_de_un_medio_eliminado_se_puede_reutilizar(
    db: Session, fabrica_medio_pago
) -> None:
    fabrica_medio_pago("Efectivo", eliminado=True)

    nuevo = MedioPago(nombre="Efectivo", tipo=TipoMedioPago.EFECTIVO)
    db.add(nuevo)
    db.commit()

    assert nuevo.id is not None


def test_dos_eliminados_pueden_compartir_nombre(db: Session, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo", eliminado=True)
    fabrica_medio_pago("Efectivo", eliminado=True)
