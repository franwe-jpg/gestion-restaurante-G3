"""Pruebas del service de medios de pago (HU-M6-04 a HU-M6-07)."""

from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.modules.pagos import service
from app.modules.pagos.models import EstadoFactura, Factura, MedioPago, TipoMedioPago
from app.modules.pagos.schemas import FiltroMediosPago, MedioPagoCrear, MedioPagoModificar
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Estado


def _alta(nombre: str = "Efectivo", tipo: str = "EFECTIVO", **extra: object) -> MedioPagoCrear:
    return MedioPagoCrear.model_validate({"nombre": nombre, "tipo": tipo, **extra})


def _cambio(
    nombre: str = "Efectivo", tipo: str = "EFECTIVO", estado: str = "HABILITADO", **extra: object
) -> MedioPagoModificar:
    return MedioPagoModificar.model_validate(
        {"nombre": nombre, "tipo": tipo, "estado": estado, **extra}
    )


def _nombres(db: Session, **filtro: object) -> list[str]:
    pagina = service.listar_medios_pago(db, FiltroMediosPago.model_validate(filtro))
    return [medio.nombre for medio in pagina.items]


def test_esta_facturada_de_comanda_sin_factura_devuelve_false(db: Session, fabrica_comanda) -> None:
    comanda_id = fabrica_comanda()

    assert service.esta_facturada(db, comanda_id) is False


@pytest.mark.parametrize("estado", [EstadoFactura.ADEUDADA, EstadoFactura.PAGADA])
def test_esta_facturada_de_comanda_con_factura_devuelve_true(
    db: Session, fabrica_comanda, estado: EstadoFactura
) -> None:
    comanda_id = fabrica_comanda()
    db.add(
        Factura(
            comanda_id=comanda_id,
            total=Decimal("100.00"),
            saldo_pendiente=(
                Decimal("100.00") if estado == EstadoFactura.ADEUDADA else Decimal("0.00")
            ),
            estado=estado,
        )
    )
    db.commit()

    assert service.esta_facturada(db, comanda_id) is True


# --- Crear (#74) ---


# CA 1 y CA 8 de #74
def test_crear_medio_pago_queda_habilitado_y_disponible(db: Session) -> None:
    creado = service.crear_medio_pago(db, _alta("Efectivo", descripcion="Caja"))

    assert creado.nombre == "Efectivo"
    assert creado.tipo == TipoMedioPago.EFECTIVO
    assert creado.descripcion == "Caja"
    assert creado.estado == Estado.HABILITADO
    assert _nombres(db) == ["Efectivo"]


# CA 2 y CA 9 de #74
@pytest.mark.parametrize("repetido", ["Efectivo", "efectivo ", " EFECTIVO"])
def test_crear_medio_pago_con_nombre_repetido_lanza_regla_de_negocio(
    db: Session, fabrica_medio_pago, repetido: str
) -> None:
    fabrica_medio_pago("Efectivo")

    with pytest.raises(ReglaDeNegocioError, match="El medio de pago ya existe"):
        service.crear_medio_pago(db, _alta(repetido))
    assert len(db.query(MedioPago).all()) == 1


def test_crear_medio_pago_con_nombre_repetido_por_carrera_lanza_regla_de_negocio(
    db: Session, fabrica_medio_pago, monkeypatch: pytest.MonkeyPatch
) -> None:
    fabrica_medio_pago("Efectivo")
    # Simula que otra solicitud guardo el mismo nombre despues de la validacion previa.
    monkeypatch.setattr(service.repository, "existe_nombre_normalizado", lambda *_: False)

    with pytest.raises(ReglaDeNegocioError, match="El medio de pago ya existe"):
        service.crear_medio_pago(db, _alta("efectivo"))
    assert len(db.query(MedioPago).all()) == 1


# S3
def test_crear_medio_pago_con_el_nombre_de_uno_eliminado(db: Session, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo", eliminado=True)

    assert service.crear_medio_pago(db, _alta("Efectivo")).estado == Estado.HABILITADO


# --- Modificar (#75) ---


# CA 1 de #75
def test_modificar_medio_pago_aplica_los_datos_nuevos(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)

    modificado = service.modificar_medio_pago(
        db, medio.id, _cambio("Tarjeta de crédito", "TARJETA", descripcion="Visa y Master")
    )

    assert (modificado.id, modificado.nombre) == (medio.id, "Tarjeta de crédito")
    assert modificado.descripcion == "Visa y Master"
    assert _nombres(db) == ["Tarjeta de crédito"]


# CA 5 de #75
def test_modificar_con_el_nombre_de_otro_medio_lanza_regla_de_negocio(
    db: Session, fabrica_medio_pago
) -> None:
    fabrica_medio_pago("Efectivo")
    tarjeta = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)

    with pytest.raises(ReglaDeNegocioError, match="El medio de pago ya existe"):
        service.modificar_medio_pago(db, tarjeta.id, _cambio(" EFECTIVO ", "TARJETA"))
    db.refresh(tarjeta)
    assert tarjeta.nombre == "Tarjeta"


# CA 6 de #75
def test_modificar_sin_cambiar_el_nombre_no_es_duplicado(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)

    modificado = service.modificar_medio_pago(
        db, medio.id, _cambio("Tarjeta", "TARJETA", descripcion="Nueva")
    )

    assert modificado.descripcion == "Nueva"


# CA 9 de #75
def test_deshabilitar_y_volver_a_habilitar(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo")

    service.modificar_medio_pago(db, medio.id, _cambio(estado="DESHABILITADO"))
    assert _nombres(db) == []
    assert _nombres(db, incluir_deshabilitados=True) == ["Efectivo"]

    service.modificar_medio_pago(db, medio.id, _cambio(estado="HABILITADO"))
    assert _nombres(db) == ["Efectivo"]


# CA 11 de #75
def test_modificar_medio_eliminado_lanza_no_encontrado(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo", eliminado=True)

    with pytest.raises(NoEncontradoError, match=f"El medio de pago {medio.id} no existe"):
        service.modificar_medio_pago(db, medio.id, _cambio("Otro nombre"))


def test_modificar_medio_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="El medio de pago 99 no existe"):
        service.modificar_medio_pago(db, 99, _cambio())


# CA 12 de #75 (diferido S5): el nombre cambia sobre la misma fila
def test_modificar_nombre_actualiza_la_misma_fila(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA)

    service.modificar_medio_pago(db, medio.id, _cambio("Tarjeta débito", "TARJETA"))

    db.refresh(medio)
    assert medio.nombre == "Tarjeta débito"
    assert len(db.query(MedioPago).all()) == 1


# --- Eliminar (#76) ---


# CA 1 y CA 3 de #76 (diferido S5): baja logica, la fila se conserva
def test_eliminar_medio_pago_es_baja_logica(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo")

    service.eliminar_medio_pago(db, medio.id)

    db.refresh(medio)
    assert medio.eliminado is True
    assert (medio.nombre, medio.tipo) == ("Efectivo", TipoMedioPago.EFECTIVO)
    assert _nombres(db) == []


# CA 4 de #76
def test_eliminar_de_nuevo_lanza_no_encontrado(db: Session, fabrica_medio_pago) -> None:
    medio = fabrica_medio_pago("Efectivo")
    service.eliminar_medio_pago(db, medio.id)

    with pytest.raises(NoEncontradoError, match=f"El medio de pago {medio.id} no existe"):
        service.eliminar_medio_pago(db, medio.id)


def test_eliminar_medio_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError):
        service.eliminar_medio_pago(db, 99)


# CA 6 de #76
def test_eliminar_medio_deshabilitado_no_se_puede_volver_a_habilitar(
    db: Session, fabrica_medio_pago
) -> None:
    medio = fabrica_medio_pago("Efectivo", estado=Estado.DESHABILITADO)

    service.eliminar_medio_pago(db, medio.id)

    assert _nombres(db, incluir_deshabilitados=True) == []
    with pytest.raises(NoEncontradoError):
        service.modificar_medio_pago(db, medio.id, _cambio(estado="HABILITADO"))


# --- Listar (#77) ---


# CA 1 y CA 2 de #77
def test_listar_muestra_solo_habilitados_no_eliminados(db: Session, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo")
    fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA, estado=Estado.DESHABILITADO)
    fabrica_medio_pago("Cheque viejo", TipoMedioPago.TRANSFERENCIA, eliminado=True)

    pagina = service.listar_medios_pago(db, FiltroMediosPago())

    assert [(medio.nombre, medio.tipo) for medio in pagina.items] == [
        ("Efectivo", TipoMedioPago.EFECTIVO)
    ]
    assert pagina.total == 1


# CA 3 de #77
def test_listar_sin_habilitados_devuelve_pagina_vacia(db: Session, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo", estado=Estado.DESHABILITADO)

    pagina = service.listar_medios_pago(db, FiltroMediosPago())

    assert (pagina.items, pagina.total) == ([], 0)


# CA 4 de #77
def test_listar_ordena_por_nombre_sin_distinguir_mayusculas(
    db: Session, fabrica_medio_pago
) -> None:
    fabrica_medio_pago("tarjeta", TipoMedioPago.TARJETA)
    fabrica_medio_pago("Efectivo")
    fabrica_medio_pago("Billetera", TipoMedioPago.BILLETERA_VIRTUAL)

    assert _nombres(db) == ["Billetera", "Efectivo", "tarjeta"]


# S2
def test_listar_con_deshabilitados_excluye_eliminados(db: Session, fabrica_medio_pago) -> None:
    fabrica_medio_pago("Efectivo")
    fabrica_medio_pago("Tarjeta", TipoMedioPago.TARJETA, estado=Estado.DESHABILITADO)
    fabrica_medio_pago("Viejo", TipoMedioPago.TARJETA, eliminado=True)

    pagina = service.listar_medios_pago(db, FiltroMediosPago(incluir_deshabilitados=True))

    assert [medio.nombre for medio in pagina.items] == ["Efectivo", "Tarjeta"]
    assert pagina.total == 2


def test_listar_pagina_con_limit_y_offset(db: Session, fabrica_medio_pago) -> None:
    for nombre in ["Aaa", "Bbb", "Ccc"]:
        fabrica_medio_pago(nombre)

    pagina = service.listar_medios_pago(db, FiltroMediosPago(limit=2, offset=1))

    assert [medio.nombre for medio in pagina.items] == ["Bbb", "Ccc"]
    assert (pagina.total, pagina.limit, pagina.offset) == (3, 2, 1)
