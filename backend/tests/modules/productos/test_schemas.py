import json
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.modules.productos.schemas import (
    FiltroEstadoProducto,
    FiltroProductos,
    PlatoCrear,
    PlatoModificar,
    PostreCrear,
    PostreModificar,
    ProductoListado,
    ProductoModificar,
    ProductoSalida,
    ProductoSeleccionable,
    SeccionResumen,
)
from app.shared.models import Categoria, Estado


def _plato(**cambios) -> PlatoCrear:
    base = {"nombre": "Milanesa", "seccion_id": 1, "precio": "1500.50", "ingredientes": ["Carne"]}
    return PlatoCrear.model_validate_json(json.dumps(base | cambios))


def _campos_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _plato(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


# CA 14
def test_plato_minimo_toma_valores_por_defecto() -> None:
    plato = _plato()

    assert plato.nombre == "Milanesa"
    assert plato.precio == Decimal("1500.50")
    assert plato.descripcion is None
    assert plato.etiquetas == []
    assert plato.CATEGORIA == Categoria.PLATO
    assert plato.MENSAJE_NOMBRE_REPETIDO == "El plato ya está registrado"


# CA 2 y CA 4
def test_nombre_se_recorta_antes_de_medirlo() -> None:
    assert _plato(nombre="  Milanesa  ").nombre == "Milanesa"
    assert _plato(nombre=f" {'a' * 100} ").nombre == "a" * 100


@pytest.mark.parametrize("nombre", ["", "   ", "a" * 101])
def test_nombre_vacio_o_de_mas_de_100_caracteres_es_invalido(nombre: str) -> None:
    assert _campos_con_error(nombre=nombre) == {"nombre"}


# CA 5
@pytest.mark.parametrize(
    "precio, esperado",
    [("1500.50", "1500.50"), ("12345678.99", "12345678.99"), (1500, "1500"), ("0.01", "0.01")],
)
def test_precio_valido(precio: str | int, esperado: str) -> None:
    assert _plato(precio=precio).precio == Decimal(esperado)


@pytest.mark.parametrize("precio", ["0", "-5", "mil", "1500.555", "123456789", "", None])
def test_precio_invalido(precio: str | None) -> None:
    assert _campos_con_error(precio=precio) == {"precio"}


# CA 6
def test_ingredientes_se_recortan_y_conservan_su_capitalizacion() -> None:
    assert _plato(ingredientes=[" Huevo ", "Pan"]).ingredientes == ["Huevo", "Pan"]


@pytest.mark.parametrize(
    "ingredientes",
    [[], [" "], ["Huevo", " huevo "], ["a" * 101], [f"i{n}" for n in range(51)]],
    ids=["vacio", "solo-espacios", "repetidos", "largo", "mas-de-50"],
)
def test_ingredientes_invalidos(ingredientes: list[str]) -> None:
    assert _campos_con_error(ingredientes=ingredientes) == {"ingredientes"}


# CA 7
def test_descripcion_de_500_caracteres_es_valida_y_501_no() -> None:
    assert _plato(descripcion="a" * 500).descripcion == "a" * 500
    assert _campos_con_error(descripcion="a" * 501) == {"descripcion"}


@pytest.mark.parametrize("descripcion", ["", "   ", None])
def test_descripcion_vacia_se_guarda_como_none(descripcion: str | None) -> None:
    assert _plato(descripcion=descripcion).descripcion is None


# CA 13
def test_etiquetas_validas() -> None:
    assert _plato(etiquetas=["Sin TACC", " Vegano "]).etiquetas == ["Sin TACC", "Vegano"]
    assert _plato(etiquetas=["a" * 30]).etiquetas == ["a" * 30]


@pytest.mark.parametrize(
    "etiquetas",
    [["a" * 31], ["casero", "Casero"], [""], [f"e{n}" for n in range(21)]],
    ids=["31-caracteres", "repetidas", "vacia", "mas-de-20"],
)
def test_etiquetas_invalidas(etiquetas: list[str]) -> None:
    assert _campos_con_error(etiquetas=etiquetas) == {"etiquetas"}


@pytest.mark.parametrize("campo, valor", [("estado", "DESHABILITADO"), ("categoria", "POSTRE")])
def test_campos_desconocidos_se_rechazan(campo: str, valor: str) -> None:
    assert _campos_con_error(**{campo: valor}) == {campo}


# HU-M1-04: las dos categorias comparten reglas; cada una fija categoria y mensaje (S13)
CATEGORIAS = [
    (PlatoCrear, Categoria.PLATO, "El plato ya está registrado"),
    (PostreCrear, Categoria.POSTRE, "El postre ya está registrado"),
]
DATOS_MINIMOS = {"nombre": "Flan", "seccion_id": 1, "precio": "900", "ingredientes": ["Huevo"]}


@pytest.mark.parametrize("esquema, categoria, mensaje", CATEGORIAS, ids=["plato", "postre"])
def test_cada_esquema_fija_su_categoria_y_su_mensaje(esquema, categoria, mensaje) -> None:
    datos = esquema.model_validate(DATOS_MINIMOS)

    assert categoria == datos.CATEGORIA
    assert mensaje == datos.MENSAJE_NOMBRE_REPETIDO


@pytest.mark.parametrize("esquema", [PlatoCrear, PostreCrear], ids=["plato", "postre"])
@pytest.mark.parametrize("ingredientes", [None, []], ids=["ausentes", "vacios"])
def test_ingredientes_son_obligatorios_en_platos_y_postres(esquema, ingredientes) -> None:
    datos = {k: v for k, v in DATOS_MINIMOS.items() if k != "ingredientes"}
    if ingredientes is not None:
        datos["ingredientes"] = ingredientes

    with pytest.raises(ValidationError) as error:
        esquema.model_validate(datos)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"ingredientes"}


@pytest.mark.parametrize("campo, valor", [("estado", "DESHABILITADO"), ("categoria", "PLATO")])
def test_postre_rechaza_campos_desconocidos(campo: str, valor: str) -> None:
    with pytest.raises(ValidationError) as error:
        PostreCrear.model_validate(DATOS_MINIMOS | {campo: valor})

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {campo}


def test_seccion_id_debe_ser_entero_positivo() -> None:
    assert _campos_con_error(seccion_id=0) == {"seccion_id"}
    assert _campos_con_error(seccion_id="3") == {"seccion_id"}


# ProductoSalida
def test_producto_salida_serializa_el_precio_como_texto_con_dos_decimales() -> None:
    salida = ProductoSalida(
        id=1,
        nombre="Milanesa",
        categoria=Categoria.PLATO,
        precio=Decimal("1500.5"),
        ingredientes=["Carne"],
        descripcion=None,
        etiquetas=[],
        estado=Estado.HABILITADO,
        seccion=SeccionResumen(id=1, nombre="Platos"),
        imagen_url=None,
    )

    assert salida.model_dump(mode="json")["precio"] == "1500.50"


# HU-M1-02-03: PlatoModificar hereda las reglas del alta
def _modificar(**cambios) -> PlatoModificar:
    base = {"nombre": "Milanesa", "seccion_id": 1, "precio": "1500.50", "ingredientes": ["Carne"]}
    return PlatoModificar.model_validate_json(json.dumps(base | cambios))


def _campos_modificar_con_error(**cambios) -> set[str]:
    with pytest.raises(ValidationError) as error:
        _modificar(**cambios)
    return {str(falla["loc"][0]) for falla in error.value.errors()}


def test_plato_modificar_hereda_categoria_mensaje_y_tipo_base() -> None:
    datos = _modificar()

    assert datos.CATEGORIA == Categoria.PLATO
    assert datos.MENSAJE_NOMBRE_REPETIDO == "El plato ya está registrado"
    assert isinstance(datos, ProductoModificar)


def test_plato_modificar_toma_valores_por_defecto() -> None:
    datos = _modificar()

    assert datos.estado is None
    assert datos.quitar_imagen is False
    assert datos.descripcion is None
    assert datos.etiquetas == []


@pytest.mark.parametrize(
    "cambios, campo",
    [
        ({"nombre": "   "}, "nombre"),
        ({"precio": "0"}, "precio"),
        ({"ingredientes": []}, "ingredientes"),
        ({"ingredientes": ["Huevo", " huevo "]}, "ingredientes"),
        ({"etiquetas": ["casero", "Casero"]}, "etiquetas"),
        ({"descripcion": "a" * 501}, "descripcion"),
        ({"seccion_id": 0}, "seccion_id"),
    ],
)
def test_plato_modificar_aplica_las_reglas_del_alta(cambios: dict, campo: str) -> None:
    assert _campos_modificar_con_error(**cambios) == {campo}


def test_plato_modificar_sin_ingredientes_es_invalido() -> None:
    datos = {"nombre": "Milanesa", "seccion_id": 1, "precio": "10"}

    with pytest.raises(ValidationError) as error:
        PlatoModificar.model_validate(datos)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"ingredientes"}


@pytest.mark.parametrize("estado", ["HABILITADO", "DESHABILITADO"])
def test_plato_modificar_acepta_estado_valido(estado: str) -> None:
    assert _modificar(estado=estado).estado == Estado(estado)


@pytest.mark.parametrize("estado", ["ANULADO", "habilitado", 1])
def test_plato_modificar_estado_invalido(estado) -> None:
    assert _campos_modificar_con_error(estado=estado) == {"estado"}


@pytest.mark.parametrize("valor", ["si", 1, "true"])
def test_plato_modificar_quitar_imagen_es_estricto(valor) -> None:
    assert _campos_modificar_con_error(quitar_imagen=valor) == {"quitar_imagen"}


def test_plato_modificar_acepta_quitar_imagen_booleano() -> None:
    assert _modificar(quitar_imagen=True).quitar_imagen is True


def test_plato_modificar_rechaza_categoria_desconocida() -> None:
    assert _campos_modificar_con_error(categoria="POSTRE") == {"categoria"}


# HU-M1-05-06: PostreModificar hereda las reglas del alta de un postre
def _postre_modificar(**cambios) -> PostreModificar:
    base = {"nombre": "Flan", "seccion_id": 1, "precio": "900", "ingredientes": ["Huevo"]}
    return PostreModificar.model_validate_json(json.dumps(base | cambios))


def test_postre_modificar_hereda_categoria_mensaje_y_tipo_base() -> None:
    datos = _postre_modificar()

    assert datos.CATEGORIA == Categoria.POSTRE
    assert datos.MENSAJE_NOMBRE_REPETIDO == "El postre ya está registrado"
    assert isinstance(datos, ProductoModificar)


def test_postre_modificar_exige_ingredientes() -> None:
    with pytest.raises(ValidationError) as error:
        PostreModificar.model_validate({"nombre": "Flan", "seccion_id": 1, "precio": "10"})

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"ingredientes"}


@pytest.mark.parametrize("modelo", [PlatoModificar, PostreModificar])
def test_modificar_rechaza_categoria_enviada(modelo) -> None:
    datos = {
        "nombre": "Flan",
        "seccion_id": 1,
        "precio": "10",
        "ingredientes": ["Huevo"],
        "categoria": "BEBIDA",
    }

    with pytest.raises(ValidationError) as error:
        modelo.model_validate(datos)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"categoria"}


# HU-M1-13: filtro de estado y esquema de la lista
def test_filtro_productos_estado_por_defecto_habilitado() -> None:
    filtro = FiltroProductos()

    assert filtro.estado == FiltroEstadoProducto.HABILITADO
    assert filtro.estado_elegido() == Estado.HABILITADO


@pytest.mark.parametrize(
    "valor, esperado",
    [
        ("HABILITADO", Estado.HABILITADO),
        ("DESHABILITADO", Estado.DESHABILITADO),
        ("TODOS", None),
    ],
)
def test_filtro_productos_estado_elegido(valor: str, esperado: Estado | None) -> None:
    assert FiltroProductos(estado=valor).estado_elegido() == esperado


def test_filtro_productos_estado_invalido_error() -> None:
    with pytest.raises(ValidationError) as error:
        FiltroProductos(estado="ANULADO")

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"estado"}


@pytest.mark.parametrize("limit", [0, 101])
def test_filtro_productos_hereda_limites_de_paginacion(limit: int) -> None:
    with pytest.raises(ValidationError) as error:
        FiltroProductos(limit=limit)

    assert {str(falla["loc"][0]) for falla in error.value.errors()} == {"limit"}


def test_producto_listado_extiende_seleccionable() -> None:
    listado = ProductoListado(
        id=1,
        nombre="Flan",
        categoria=Categoria.POSTRE,
        seccion=SeccionResumen(id=2, nombre="Postres"),
        precio=Decimal("12500.5"),
        etiquetas=["Dulce"],
        estado=Estado.HABILITADO,
    )

    assert issubclass(ProductoListado, ProductoSeleccionable)
    assert json.loads(listado.model_dump_json()) == {
        "id": 1,
        "nombre": "Flan",
        "categoria": "POSTRE",
        "seccion": {"id": 2, "nombre": "Postres"},
        "precio": "12500.50",
        "etiquetas": ["Dulce"],
        "estado": "HABILITADO",
    }
