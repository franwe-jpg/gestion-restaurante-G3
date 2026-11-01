"""Pruebas de los esquemas de medios de pago (HU-M6-04 y HU-M6-05)."""

import pytest
from pydantic import ValidationError

from app.modules.pagos.models import TipoMedioPago
from app.modules.pagos.schemas import FiltroMediosPago, MedioPagoCrear, MedioPagoModificar
from app.shared.models import Estado


def _crear(**datos: object) -> MedioPagoCrear:
    return MedioPagoCrear.model_validate({"nombre": "Efectivo", "tipo": "EFECTIVO", **datos})


def test_crear_recorta_el_nombre() -> None:
    assert _crear(nombre="  Efectivo  ").nombre == "Efectivo"


# CA 3 de #74
@pytest.mark.parametrize("nombre", ["", "   "])
def test_crear_rechaza_nombre_vacio(nombre: str) -> None:
    with pytest.raises(ValidationError):
        _crear(nombre=nombre)


# CA 4 de #74
@pytest.mark.parametrize("nombre", ["ab", "a" * 51])
def test_crear_rechaza_nombre_fuera_de_largo(nombre: str) -> None:
    with pytest.raises(ValidationError):
        _crear(nombre=nombre)


@pytest.mark.parametrize("nombre", ["abc", "a" * 50])
def test_crear_admite_nombre_en_los_limites(nombre: str) -> None:
    assert _crear(nombre=nombre).nombre == nombre


# CA 5 de #74
@pytest.mark.parametrize("nombre", ["Tarjeta $", "Mercado_Pago", "QR/Billetera", "Débito\t1"])
def test_crear_rechaza_caracteres_no_permitidos(nombre: str) -> None:
    with pytest.raises(ValidationError):
        _crear(nombre=nombre)


@pytest.mark.parametrize("nombre", ["Tarjeta de crédito", "Señal 2", "Cta. Cte.", "Pago-QR"])
def test_crear_admite_letras_acentos_numeros_punto_y_guion(nombre: str) -> None:
    assert _crear(nombre=nombre).nombre == nombre


# CA 6 de #74
def test_crear_rechaza_tipo_faltante() -> None:
    with pytest.raises(ValidationError):
        MedioPagoCrear.model_validate({"nombre": "Efectivo"})


def test_crear_rechaza_tipo_fuera_de_los_cuatro() -> None:
    with pytest.raises(ValidationError):
        _crear(tipo="CHEQUE")


@pytest.mark.parametrize("tipo", list(TipoMedioPago))
def test_crear_admite_los_cuatro_tipos(tipo: TipoMedioPago) -> None:
    assert _crear(tipo=tipo.value).tipo == tipo


# CA 7 de #74 y S7
def test_crear_rechaza_descripcion_de_201_caracteres() -> None:
    with pytest.raises(ValidationError):
        _crear(descripcion="a" * 201)


def test_crear_admite_descripcion_de_200_caracteres() -> None:
    assert _crear(descripcion="a" * 200).descripcion == "a" * 200


@pytest.mark.parametrize("descripcion", ["", "   "])
def test_crear_convierte_descripcion_vacia_en_none(descripcion: str) -> None:
    assert _crear(descripcion=descripcion).descripcion is None


# CA 8 de #74: el estado no se recibe en el alta
def test_crear_rechaza_estado() -> None:
    with pytest.raises(ValidationError):
        _crear(estado="DESHABILITADO")


# HU-M6-05: el estado es obligatorio en la modificacion
def test_modificar_exige_estado() -> None:
    with pytest.raises(ValidationError):
        MedioPagoModificar.model_validate({"nombre": "Efectivo", "tipo": "EFECTIVO"})


def test_modificar_recibe_estado_y_mismas_reglas_que_el_alta() -> None:
    datos = MedioPagoModificar.model_validate(
        {"nombre": " Tarjeta ", "tipo": "TARJETA", "estado": "DESHABILITADO"}
    )

    assert datos.nombre == "Tarjeta"
    assert datos.estado == Estado.DESHABILITADO
    with pytest.raises(ValidationError):
        MedioPagoModificar.model_validate(
            {"nombre": "ab", "tipo": "TARJETA", "estado": "HABILITADO"}
        )


def test_filtro_por_defecto_no_incluye_deshabilitados() -> None:
    filtro = FiltroMediosPago()

    assert filtro.incluir_deshabilitados is False
    assert (filtro.limit, filtro.offset) == (50, 0)
