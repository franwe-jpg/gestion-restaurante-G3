"""Validación de datos de un cliente nuevo antes de su primera reserva."""

import pytest
from pydantic import ValidationError

from app.modules.atencion import schemas
from app.shared.contratos.comanda import ComandaCrear, ComandaResumen, DetalleComandaCrear


def test_comanda_crear_exige_mozo_id_positivo() -> None:
    detalle = [DetalleComandaCrear(producto_id=1, cantidad=1)]

    with pytest.raises(ValidationError):
        ComandaCrear(mesa_id=1, detalles=detalle)

    with pytest.raises(ValidationError):
        ComandaCrear(mesa_id=1, mozo_id=0, detalles=detalle)


def test_comanda_resumen_expone_mozo_id_nullable_para_historicos() -> None:
    resumen = ComandaResumen(
        id=3,
        mesa_id=1,
        estado="ABIERTA",
        fecha_hora="2026-11-11T12:00:00Z",
        mozo_id=None,
    )

    assert resumen.model_dump()["mozo_id"] is None


@pytest.mark.parametrize("campo", ["nombre", "telefono"])
def test_cliente_nuevo_exige_datos_obligatorios(campo: str) -> None:
    datos = {"nombre": "Ana", "telefono": "+54 123-456"}
    del datos[campo]

    with pytest.raises(ValidationError) as error:
        schemas.ClienteNuevo(**datos)

    assert error.value.errors()[0]["loc"] == (campo,)


@pytest.mark.parametrize("campo", ["nombre", "telefono"])
def test_cliente_nuevo_rechaza_dato_vacio(campo: str) -> None:
    datos = {"nombre": "Ana", "telefono": "123-456"}
    datos[campo] = "   "

    with pytest.raises(ValidationError) as error:
        schemas.ClienteNuevo(**datos)

    assert error.value.errors()[0]["loc"] == (campo,)


@pytest.mark.parametrize("nombre", ["Ana2", "Ana!", "Ana@Luis"])
def test_cliente_nuevo_rechaza_nombre_con_numeros_o_caracteres_especiales(nombre: str) -> None:
    with pytest.raises(ValidationError, match="nombre.*letras"):
        schemas.ClienteNuevo(nombre=nombre, telefono="123")


@pytest.mark.parametrize("telefono", ["12a3", "12+34", "(123)"])
def test_cliente_nuevo_rechaza_telefono_fuera_del_formato_provisional(telefono: str) -> None:
    with pytest.raises(ValidationError, match="telefono"):
        schemas.ClienteNuevo(nombre="Ana", telefono=telefono)


@pytest.mark.parametrize(
    ("nombre", "telefono"),
    [("Ana", "123"), ("María José", "+54 123-456"), ("Zoë", "--")],
)
def test_cliente_nuevo_admite_letras_acentos_espacios_y_formato_provisional(
    nombre: str, telefono: str
) -> None:
    cliente = schemas.ClienteNuevo(nombre=nombre, telefono=telefono)

    assert (cliente.nombre, cliente.telefono) == (nombre, telefono)


def test_cliente_nuevo_admite_nombres_repetidos() -> None:
    primero = schemas.ClienteNuevo(nombre="Ana", telefono="123")
    segundo = schemas.ClienteNuevo(nombre="Ana", telefono="123")

    assert primero.model_dump() == segundo.model_dump() == {"nombre": "Ana", "telefono": "123"}


@pytest.mark.parametrize("campo", ["nombre", "telefono"])
@pytest.mark.parametrize("valor", [None, "", "   "])
def test_cliente_modificar_exige_ambos_datos(campo: str, valor: str | None) -> None:
    datos = {"nombre": "Ana", "telefono": "123"}
    if valor is None:
        del datos[campo]
    else:
        datos[campo] = valor

    with pytest.raises(ValidationError) as error:
        schemas.ClienteModificar(**datos)

    assert error.value.errors()[0]["loc"] == (campo,)


@pytest.mark.parametrize("nombre", ["Ana2", "Ana!", "Ana@Luis"])
def test_cliente_modificar_rechaza_nombre_invalido(nombre: str) -> None:
    with pytest.raises(ValidationError, match="nombre.*letras"):
        schemas.ClienteModificar(nombre=nombre, telefono="123")


@pytest.mark.parametrize("telefono", ["12a3", "12+34", "(123)"])
def test_cliente_modificar_rechaza_telefono_invalido(telefono: str) -> None:
    with pytest.raises(ValidationError, match="telefono"):
        schemas.ClienteModificar(nombre="Ana", telefono=telefono)


def test_cliente_modificar_y_salida_preservan_datos_y_duplicados() -> None:
    primero = schemas.ClienteModificar(nombre="María José", telefono="+54 123-456")
    segundo = schemas.ClienteModificar(nombre="María José", telefono="+54 123-456")

    assert primero == segundo
    assert schemas.ClienteSalida(id=7, **primero.model_dump()).model_dump() == {
        "id": 7,
        "nombre": "María José",
        "telefono": "+54 123-456",
    }


# Entregas por cantidad (HU-M4-08)


@pytest.mark.parametrize("valor", [0, 1, 250])
def test_entrega_detalle_acepta_entero_valido(valor: int) -> None:
    assert schemas.EntregaDetalle(cantidad_entregada=valor).cantidad_entregada == valor


@pytest.mark.parametrize("valor", ["2", "dos", 2.5, 2.0, True, None])
def test_entrega_detalle_rechaza_texto_decimal_booleano_y_nulo(valor: object) -> None:
    with pytest.raises(ValidationError) as error:
        schemas.EntregaDetalle(cantidad_entregada=valor)

    assert error.value.errors()[0]["loc"] == ("cantidad_entregada",)


def test_entrega_detalle_rechaza_negativo() -> None:
    with pytest.raises(ValidationError) as error:
        schemas.EntregaDetalle(cantidad_entregada=-1)

    assert error.value.errors()[0]["type"] == "greater_than_equal"


@pytest.mark.parametrize("datos", [{}, {"cantidad_entregada": 1, "otro": 2}])
def test_entrega_detalle_rechaza_campos_extra_y_ausente(datos: dict) -> None:
    with pytest.raises(ValidationError):
        schemas.EntregaDetalle(**datos)


def test_entregas_comanda_serializa_detalles_y_estado() -> None:
    salida = schemas.EntregasComanda(
        comanda_id=4,
        estado="ABIERTA",
        detalles=[
            schemas.DetalleEntrega(
                id=9,
                producto_id=1,
                cantidad=5,
                cantidad_entregada=2,
                estado_entrega="PENDIENTE",
            )
        ],
    )

    assert salida.model_dump(mode="json") == {
        "comanda_id": 4,
        "estado": "ABIERTA",
        "detalles": [
            {
                "id": 9,
                "producto_id": 1,
                "menu_ejecutivo_id": None,
                "cantidad": 5,
                "cantidad_entregada": 2,
                "estado_entrega": "PENDIENTE",
            }
        ],
    }
