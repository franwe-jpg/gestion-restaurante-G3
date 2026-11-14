import io
from decimal import Decimal
from pathlib import Path

import pytest
from PIL import Image
from sqlalchemy import event, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.modules.productos import service
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import (
    PlatoCrear,
    PlatoModificar,
    SeccionCrear,
    SeccionModificar,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado, Producto
from app.shared.paginacion import ParametrosPaginacion


def _datos(nombre: str = "Entradas", orden: int = 1, **extra) -> SeccionCrear:
    return SeccionCrear(nombre=nombre, orden=orden, **extra)


def _cantidad_secciones(db: Session) -> int:
    return len(db.scalars(select(Seccion)).all())


# CA 1
def test_crear_seccion_sin_productos_queda_habilitada(db: Session) -> None:
    salida = service.crear_seccion(db, _datos("Entradas", 3))

    assert salida.nombre == "Entradas"
    assert salida.orden == 3
    assert salida.estado == Estado.HABILITADO
    assert salida.productos == []
    assert db.get(Seccion, salida.id).nombre_normalizado == "entradas"


def test_crear_seccion_quita_espacios_del_nombre(db: Session) -> None:
    salida = service.crear_seccion(db, _datos("  Entradas  "))

    assert salida.nombre == "Entradas"


# CA 3
def test_crear_seccion_rechaza_nombre_repetido_sin_distinguir_mayusculas(
    db: Session, fabrica_seccion
) -> None:
    fabrica_seccion("Postres", 1)

    with pytest.raises(ReglaDeNegocioError, match="ya existe"):
        service.crear_seccion(db, _datos("  postres ", 2))
    assert _cantidad_secciones(db) == 1


def test_crear_seccion_compara_con_casefold_no_solo_ascii(db: Session, fabrica_seccion) -> None:
    fabrica_seccion("Ñoquis", 1)

    with pytest.raises(ReglaDeNegocioError, match="ya existe"):
        service.crear_seccion(db, _datos("ñOQUIS", 2))


def test_crear_seccion_rechaza_nombre_de_una_deshabilitada(db: Session, fabrica_seccion) -> None:
    fabrica_seccion("Entradas", 1, Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="ya existe"):
        service.crear_seccion(db, _datos("Entradas", 2))


# CA 6
def test_crear_seccion_rechaza_orden_ocupado_por_una_habilitada(
    db: Session, fabrica_seccion
) -> None:
    existente = fabrica_seccion("Postres", 1)

    with pytest.raises(ReglaDeNegocioError, match="osición ocupada"):
        service.crear_seccion(db, _datos("Entradas", 1))
    assert db.get(Seccion, existente.id).orden == 1
    assert _cantidad_secciones(db) == 1


def test_crear_seccion_permite_orden_de_una_deshabilitada(db: Session, fabrica_seccion) -> None:
    fabrica_seccion("Postres", 2, Estado.DESHABILITADO)

    salida = service.crear_seccion(db, _datos("Entradas", 2))

    assert salida.orden == 2


# CA 7
def test_crear_seccion_con_producto_inexistente_responde_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError):
        service.crear_seccion(db, _datos(producto_ids=[999], confirmar_traslado=True))
    assert _cantidad_secciones(db) == 0


def test_crear_seccion_con_producto_deshabilitado_responde_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    origen = fabrica_seccion("Postres", 1)
    producto = fabrica_producto(origen, "Flan", Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="deshabilitado"):
        service.crear_seccion(db, _datos("Nueva", 2, producto_ids=[producto.id]))
    assert _cantidad_secciones(db) == 1


# CA 8
def test_crear_seccion_sin_confirmar_traslado_nombra_producto_y_seccion(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    origen = fabrica_seccion("Postres", 1)
    producto = fabrica_producto(origen, "Flan")

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_seccion(db, _datos("Nueva", 2, producto_ids=[producto.id]))

    assert "Flan" in str(error.value)
    assert "Postres" in str(error.value)
    assert _cantidad_secciones(db) == 1
    assert db.get(Producto, producto.id).seccion_id == origen.id


def test_crear_seccion_confirmada_traslada_los_productos(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    origen = fabrica_seccion("Postres", 1)
    flan = fabrica_producto(origen, "Flan")
    helado = fabrica_producto(origen, "Helado")

    salida = service.crear_seccion(
        db, _datos("Nueva", 2, producto_ids=[flan.id, helado.id], confirmar_traslado=True)
    )

    assert sorted(p.nombre for p in salida.productos) == ["Flan", "Helado"]
    assert db.get(Producto, flan.id).seccion_id == salida.id
    assert db.get(Producto, helado.id).seccion_id == salida.id


def test_crear_seccion_con_un_producto_invalido_no_traslada_ninguno(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    origen = fabrica_seccion("Postres", 1)
    valido = fabrica_producto(origen, "Flan")
    deshabilitado = fabrica_producto(origen, "Helado", Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError):
        service.crear_seccion(
            db,
            _datos("Nueva", 2, producto_ids=[valido.id, deshabilitado.id], confirmar_traslado=True),
        )

    assert db.get(Producto, valido.id).seccion_id == origen.id
    assert _cantidad_secciones(db) == 1


def test_crear_seccion_convierte_la_carrera_de_orden_en_conflicto(
    db: Session, fabrica_seccion, monkeypatch
) -> None:
    fabrica_seccion("Postres", 1)
    monkeypatch.setattr(service.repository, "buscar_habilitada_por_orden", lambda *_: None)

    with pytest.raises(ReglaDeNegocioError):
        service.crear_seccion(db, _datos("Entradas", 1))
    assert _cantidad_secciones(db) == 1


# HU-M1-11 y HU-M1-12
def test_obtener_seccion_con_productos(db: Session, fabrica_seccion, fabrica_producto) -> None:
    seccion = fabrica_seccion("Postres", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    salida = service.obtener_seccion(db, seccion.id)

    assert [p.nombre for p in salida.productos] == ["Flan", "Helado"]
    assert salida.productos_habilitados == 1


def test_obtener_seccion_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="999"):
        service.obtener_seccion(db, 999)


def test_modificar_seccion_convierte_la_carrera_de_orden_en_conflicto(
    db: Session, fabrica_seccion, monkeypatch
) -> None:
    fabrica_seccion("Postres", 1)
    entradas = fabrica_seccion("Entradas", 2)
    monkeypatch.setattr(service.repository, "buscar_habilitada_por_orden", lambda *_: None)

    with pytest.raises(ReglaDeNegocioError, match="posición está ocupada"):
        service.modificar_seccion(db, entradas.id, SeccionModificar(nombre="Entradas", orden=1))
    assert db.get(Seccion, entradas.id).orden == 2


# Listados
def test_listar_secciones_pagina_por_orden_con_cantidad_de_productos(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    tercera = fabrica_seccion("C", 3)
    primera = fabrica_seccion("A", 1)
    fabrica_seccion("B", 2)
    fabrica_producto(primera, "Flan")
    fabrica_producto(primera, "Helado")

    pagina = service.listar_secciones(db, ParametrosPaginacion(limit=2, offset=0))

    assert [s.nombre for s in pagina.items] == ["A", "B"]
    assert [s.cantidad_productos for s in pagina.items] == [2, 0]
    assert (pagina.total, pagina.limit, pagina.offset) == (3, 2, 0)
    resto = service.listar_secciones(db, ParametrosPaginacion(limit=2, offset=2))
    assert [s.id for s in resto.items] == [tercera.id]


def test_listar_productos_devuelve_solo_habilitados_con_su_seccion(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Postres", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)

    pagina = service.listar_productos(db, ParametrosPaginacion())

    assert [p.nombre for p in pagina.items] == ["Flan"]
    assert pagina.items[0].seccion.nombre == "Postres"
    assert pagina.total == 1


def _nombres(pagina) -> list[str]:
    return [p.nombre for p in pagina.items]


def _carta_mixta(fabrica_seccion, fabrica_producto) -> None:
    seccion = fabrica_seccion("Postres", 1)
    fabrica_producto(seccion, "Flan")
    fabrica_producto(seccion, "Helado", Estado.DESHABILITADO)
    fabrica_producto(seccion, "Budin")


def test_listar_productos_por_defecto_solo_habilitados(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    _carta_mixta(fabrica_seccion, fabrica_producto)

    pagina = service.listar_productos(db, ParametrosPaginacion())

    assert _nombres(pagina) == ["Budin", "Flan"]
    assert pagina.total == 2


def test_listar_productos_estado_habilitado(db: Session, fabrica_seccion, fabrica_producto) -> None:
    _carta_mixta(fabrica_seccion, fabrica_producto)

    pagina = service.listar_productos(db, ParametrosPaginacion(), Estado.HABILITADO)

    assert _nombres(pagina) == ["Budin", "Flan"]


def test_listar_productos_estado_deshabilitado(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    _carta_mixta(fabrica_seccion, fabrica_producto)

    pagina = service.listar_productos(db, ParametrosPaginacion(), Estado.DESHABILITADO)

    assert _nombres(pagina) == ["Helado"]
    assert pagina.items[0].estado == Estado.DESHABILITADO


def test_listar_productos_estado_todos_incluye_ambos(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    _carta_mixta(fabrica_seccion, fabrica_producto)

    pagina = service.listar_productos(db, ParametrosPaginacion(), None)

    assert [(p.nombre, p.estado) for p in pagina.items] == [
        ("Budin", Estado.HABILITADO),
        ("Flan", Estado.HABILITADO),
        ("Helado", Estado.DESHABILITADO),
    ]


def test_listar_productos_total_cuenta_solo_el_filtro(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    _carta_mixta(fabrica_seccion, fabrica_producto)

    assert service.listar_productos(db, ParametrosPaginacion(), Estado.DESHABILITADO).total == 1
    assert service.listar_productos(db, ParametrosPaginacion(), None).total == 3


def test_listar_productos_items_con_precio_etiquetas_y_estado(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    producto = fabrica_producto(fabrica_seccion("Postres", 1), "Flan")
    producto.etiquetas = ["Dulce", "Sin TACC"]
    db.commit()

    item = service.listar_productos(db, ParametrosPaginacion()).items[0]

    assert item.precio == Decimal("1500.00")
    assert item.etiquetas == ["Dulce", "Sin TACC"]
    assert item.estado == Estado.HABILITADO
    assert item.categoria == Categoria.POSTRE
    assert item.seccion.nombre == "Postres"


def test_listar_productos_orden_por_nombre_e_id(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Postres", 1)
    segundo = fabrica_producto(seccion, "Zeta")
    primero = fabrica_producto(seccion, "Alfa")
    otra_categoria = fabrica_producto(seccion, "Alfa", categoria=Categoria.PLATO)

    pagina = service.listar_productos(db, ParametrosPaginacion(), None)

    assert [p.id for p in pagina.items] == [primero.id, otra_categoria.id, segundo.id]


def test_listar_productos_sin_productos_vacio(db: Session) -> None:
    pagina = service.listar_productos(db, ParametrosPaginacion(), None)

    assert pagina.items == []
    assert pagina.total == 0


def test_listar_productos_pagina_con_offset(db: Session, fabrica_seccion, fabrica_producto) -> None:
    _carta_mixta(fabrica_seccion, fabrica_producto)

    pagina = service.listar_productos(db, ParametrosPaginacion(limit=2, offset=2), None)

    assert _nombres(pagina) == ["Helado"]
    assert (pagina.total, pagina.limit, pagina.offset) == (3, 2, 2)


# ---------------------------------------------------------------------------
# HU-M1-01: alta de platos
# ---------------------------------------------------------------------------

MENSAJE_PLATO_REPETIDO = "El plato ya está registrado"


def _jpeg() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 4), "red").save(buffer, "JPEG")
    return buffer.getvalue()


def _plato(seccion_id: int, nombre: str = "Milanesa", **extra) -> PlatoCrear:
    base = {"nombre": nombre, "seccion_id": seccion_id, "precio": "1500.50"}
    base |= {"ingredientes": ["Carne"]} | extra
    return PlatoCrear(**base)


def _cantidad_productos(db: Session) -> int:
    return len(db.scalars(select(Producto)).all())


# CA 1 y CA 14
def test_crear_producto_minimo_queda_habilitado_como_plato(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    salida = service.crear_producto(db, _plato(seccion.id, "  Milanesa "), None)

    assert salida.nombre == "Milanesa"
    assert salida.categoria == Categoria.PLATO
    assert salida.estado == Estado.HABILITADO
    assert salida.precio == Decimal("1500.50")
    assert salida.ingredientes == ["Carne"]
    assert (salida.descripcion, salida.imagen_url, salida.etiquetas) == (None, None, [])
    assert (salida.seccion.id, salida.seccion.nombre) == (seccion.id, "Platos")
    assert db.get(Producto, salida.id).nombre_normalizado == "milanesa"
    assert not directorio_media.exists()


def test_crear_producto_completo_guarda_la_imagen_y_la_url(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    datos = _plato(seccion.id, descripcion="Con papas", etiquetas=["Casero"])

    salida = service.crear_producto(db, datos, _jpeg())

    archivo = salida.imagen_url.removeprefix("/media/")
    assert salida.imagen_url == f"/media/{archivo}"
    assert (directorio_media / archivo).is_file()
    assert db.get(Producto, salida.id).imagen == archivo
    assert (salida.descripcion, salida.etiquetas) == ("Con papas", ["Casero"])


# CA 9
def test_crear_producto_con_seccion_inexistente_responde_no_encontrado(
    db: Session, directorio_media: Path
) -> None:
    with pytest.raises(NoEncontradoError):
        service.crear_producto(db, _plato(999), _jpeg())

    assert _cantidad_productos(db) == 0
    assert not directorio_media.exists()


def test_crear_producto_con_seccion_deshabilitada_responde_conflicto(
    db: Session, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Viejos", estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="deshabilitada"):
        service.crear_producto(db, _plato(seccion.id), None)

    assert _cantidad_productos(db) == 0


# CA 3
def test_crear_producto_rechaza_nombre_repetido_con_otra_capitalizacion(
    db: Session, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Platos")
    service.crear_producto(db, _plato(seccion.id, "Milanesa"), None)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_producto(db, _plato(seccion.id, "  milanesa "), None)

    assert str(error.value) == MENSAJE_PLATO_REPETIDO
    assert _cantidad_productos(db) == 1


def test_crear_producto_rechaza_nombre_de_un_plato_deshabilitado(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Platos")
    fabrica_producto(seccion, "Flan casero", Estado.DESHABILITADO, Categoria.PLATO)

    with pytest.raises(ReglaDeNegocioError, match=MENSAJE_PLATO_REPETIDO):
        service.crear_producto(db, _plato(seccion.id, "Flan casero"), None)


def test_crear_producto_permite_el_mismo_nombre_en_otra_categoria(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Platos")
    fabrica_producto(seccion, "Tiramisú", categoria=Categoria.POSTRE)

    salida = service.crear_producto(db, _plato(seccion.id, "Tiramisú"), None)

    assert salida.categoria == Categoria.PLATO
    assert _cantidad_productos(db) == 2


# CA 10: la imagen invalida cancela el alta completa y precede a 404 y 409
def test_crear_producto_con_imagen_invalida_no_guarda_nada(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")

    with pytest.raises(DatosInvalidosError):
        service.crear_producto(db, _plato(seccion.id), b"no es una imagen")

    assert _cantidad_productos(db) == 0
    assert not directorio_media.exists()


def test_crear_producto_valida_la_imagen_antes_que_la_seccion(
    db: Session, directorio_media: Path
) -> None:
    with pytest.raises(DatosInvalidosError):
        service.crear_producto(db, _plato(999), b"no es una imagen")


# Atomicidad
def test_crear_producto_con_fallo_en_commit_no_deja_fila_ni_archivo(
    db: Session, fabrica_seccion, directorio_media: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion("Platos")

    def fallar() -> None:
        raise OperationalError("COMMIT", {}, Exception("disco lleno"))

    monkeypatch.setattr(db, "commit", fallar)

    with pytest.raises(OperationalError):
        service.crear_producto(db, _plato(seccion.id), _jpeg())

    monkeypatch.undo()
    assert _cantidad_productos(db) == 0
    assert list(directorio_media.iterdir()) == []


def test_crear_producto_con_integridad_violada_responde_conflicto_y_borra_el_archivo(
    db: Session, fabrica_seccion, directorio_media: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion("Platos")

    def fallar() -> None:
        raise IntegrityError("INSERT", {}, Exception("UNIQUE"))

    monkeypatch.setattr(db, "commit", fallar)

    with pytest.raises(ReglaDeNegocioError, match=MENSAJE_PLATO_REPETIDO):
        service.crear_producto(db, _plato(seccion.id), _jpeg())

    monkeypatch.undo()
    assert _cantidad_productos(db) == 0
    assert list(directorio_media.iterdir()) == []


# Filtro por estado en el listado de secciones
def test_listar_secciones_con_estado_filtra_y_cuenta_solo_las_que_cumplen(
    db: Session, fabrica_seccion
) -> None:
    fabrica_seccion("A", 1)
    fabrica_seccion("B", 2, Estado.DESHABILITADO)
    fabrica_seccion("C", 3)

    pagina = service.listar_secciones(db, ParametrosPaginacion(), Estado.HABILITADO)

    assert [s.nombre for s in pagina.items] == ["A", "C"]
    assert pagina.total == 2


def test_listar_secciones_sin_estado_devuelve_todas(db: Session, fabrica_seccion) -> None:
    fabrica_seccion("A", 1)
    fabrica_seccion("B", 2, Estado.DESHABILITADO)

    pagina = service.listar_secciones(db, ParametrosPaginacion())

    assert [s.nombre for s in pagina.items] == ["A", "B"]
    assert pagina.total == 2


# ---------------------------------------------------------------------------
# HU-M1-02-03: consultar, modificar y dar de baja un plato
# ---------------------------------------------------------------------------


# Consultar
def test_obtener_producto_existente(db: Session, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    creado = service.crear_producto(db, _plato(seccion.id), None)

    salida = service.obtener_producto(db, Categoria.PLATO, creado.id)

    assert salida == creado


def test_obtener_producto_otra_categoria_error(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta")
    postre = fabrica_producto(seccion, "Flan", categoria=Categoria.POSTRE)

    with pytest.raises(NoEncontradoError, match=f"El producto {postre.id} no existe"):
        service.obtener_producto(db, Categoria.PLATO, postre.id)


# Modificar
def _modificar(seccion_id: int, nombre: str = "Milanesa", **extra) -> PlatoModificar:
    base = {"nombre": nombre, "seccion_id": seccion_id, "precio": "1500.50"}
    return PlatoModificar(**(base | {"ingredientes": ["Carne"]} | extra))


def _archivos(directorio: Path) -> set[str]:
    return {archivo.name for archivo in directorio.iterdir()}


def test_modificar_producto_orden_de_validacion(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    viva = fabrica_seccion("Platos", 1)
    vieja = fabrica_seccion("Viejos", 2, Estado.DESHABILITADO)
    service.crear_producto(db, _plato(viva.id, "Flan"), None)
    plato = service.crear_producto(db, _plato(viva.id, "Milanesa"), None)

    # 1) quitar + imagen: 422 antes que todo lo demas
    with pytest.raises(DatosInvalidosError):
        service.modificar_producto(db, 999, _modificar(999, quitar_imagen=True), _jpeg())
    # 2) imagen invalida antes que el 404 del plato
    with pytest.raises(DatosInvalidosError):
        service.modificar_producto(db, 999, _modificar(999), b"no es una imagen")
    # 3) 404 del plato antes que la seccion
    with pytest.raises(NoEncontradoError, match="El producto 999 no existe"):
        service.modificar_producto(db, 999, _modificar(999), None)
    # 4) seccion (404) antes que el nombre repetido
    with pytest.raises(NoEncontradoError, match="La sección 999"):
        service.modificar_producto(db, plato.id, _modificar(999, "Flan"), None)
    # 5) seccion deshabilitada (409) antes que el nombre repetido
    with pytest.raises(ReglaDeNegocioError, match="deshabilitada"):
        service.modificar_producto(db, plato.id, _modificar(vieja.id, "Flan"), None)
    # 6) nombre repetido
    with pytest.raises(ReglaDeNegocioError, match=MENSAJE_PLATO_REPETIDO):
        service.modificar_producto(db, plato.id, _modificar(viva.id, "flan"), None)


def test_modificar_producto_seccion_sin_cambio_no_se_valida(db: Session, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = service.crear_producto(db, _plato(seccion.id), None)
    db.get(Seccion, seccion.id).estado = Estado.DESHABILITADO
    db.commit()

    salida = service.modificar_producto(db, plato.id, _modificar(seccion.id, precio="2000"), None)

    assert salida.precio == Decimal("2000")
    assert salida.seccion.id == seccion.id


def test_modificar_producto_nombre_propio_permitido(db: Session, fabrica_seccion) -> None:
    seccion = fabrica_seccion("Platos")
    plato = service.crear_producto(db, _plato(seccion.id, "Milanesa"), None)

    salida = service.modificar_producto(db, plato.id, _modificar(seccion.id, " MILANESA "), None)

    assert salida.nombre == "MILANESA"
    assert db.get(Producto, plato.id).nombre_normalizado == "milanesa"


def test_modificar_producto_commit_fallido_conserva_imagen_anterior(
    db: Session, fabrica_seccion, directorio_media: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion("Platos")
    original = service.crear_producto(db, _plato(seccion.id), _jpeg())
    anteriores = _archivos(directorio_media)

    def fallar() -> None:
        raise OperationalError("COMMIT", {}, Exception("disco lleno"))

    monkeypatch.setattr(db, "commit", fallar)
    with pytest.raises(OperationalError):
        service.modificar_producto(db, original.id, _modificar(seccion.id, "Otro"), _jpeg())
    monkeypatch.undo()

    assert service.obtener_producto(db, Categoria.PLATO, original.id) == original
    assert _archivos(directorio_media) == anteriores


def test_modificar_producto_commit_fallido_con_imagen_conservada_no_la_borra(
    db: Session, fabrica_seccion, directorio_media: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion("Platos")
    original = service.crear_producto(db, _plato(seccion.id), _jpeg())

    def fallar() -> None:
        raise OperationalError("COMMIT", {}, Exception("disco lleno"))

    monkeypatch.setattr(db, "commit", fallar)
    with pytest.raises(OperationalError):
        service.modificar_producto(db, original.id, _modificar(seccion.id, "Otro"), None)
    monkeypatch.undo()

    assert (directorio_media / original.imagen_url.removeprefix("/media/")).is_file()


def test_modificar_producto_error_al_borrar_anterior_se_ignora(
    db: Session, fabrica_seccion, directorio_media: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion("Platos")
    original = service.crear_producto(db, _plato(seccion.id), _jpeg())

    def fallar(nombre: str) -> None:
        raise OSError("sin permiso")

    monkeypatch.setattr(service.imagenes, "borrar", fallar)

    salida = service.modificar_producto(
        db, original.id, _modificar(seccion.id, quitar_imagen=True), None
    )

    assert salida.imagen_url is None


def test_modificar_plato_conserva_identidad_y_filas_relacionadas(
    db: Session, fabrica_seccion
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = service.crear_producto(db, _plato(seccion.id), None)
    db.execute(
        text(
            "CREATE TABLE prueba_linea "
            "(id INTEGER PRIMARY KEY, producto_id INTEGER REFERENCES productos(id))"
        )
    )
    db.execute(text("INSERT INTO prueba_linea (id, producto_id) VALUES (1, :id)"), {"id": plato.id})
    db.commit()

    salida = service.modificar_producto(db, plato.id, _modificar(seccion.id, precio="3000"), None)

    assert salida.id == plato.id
    assert salida.precio == Decimal("3000")
    assert db.execute(text("SELECT producto_id FROM prueba_linea")).all() == [(plato.id,)]
    assert db.execute(text("SELECT count(*) FROM productos")).scalar() == 1


# Dar de baja
def test_dar_de_baja_producto_solo_cambia_estado(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Platos")
    creado = service.crear_producto(
        db, _plato(seccion.id, descripcion="Con papas", etiquetas=["Casero"]), _jpeg()
    )
    archivos = _archivos(directorio_media)

    salida = service.dar_de_baja_producto(db, Categoria.PLATO, creado.id)

    assert salida == creado.model_copy(update={"estado": Estado.DESHABILITADO})
    assert db.get(Producto, creado.id).estado == Estado.DESHABILITADO
    assert _archivos(directorio_media) == archivos
    assert _cantidad_productos(db) == 1


def test_dar_de_baja_producto_ya_deshabilitado_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Platos")
    plato = fabrica_producto(seccion, "Flan", Estado.DESHABILITADO, Categoria.PLATO)

    with pytest.raises(ReglaDeNegocioError, match="ya está deshabilitado"):
        service.dar_de_baja_producto(db, Categoria.PLATO, plato.id)


def test_dar_de_baja_producto_otra_categoria_error(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Carta")
    postre = fabrica_producto(seccion, "Flan", categoria=Categoria.POSTRE)

    with pytest.raises(NoEncontradoError):
        service.dar_de_baja_producto(db, Categoria.PLATO, postre.id)

    assert db.get(Producto, postre.id).estado == Estado.HABILITADO


def _contar_sentencias(db: Session, accion) -> int:
    """Cuenta solo las sentencias SQL que ejecuta `accion`, sin las de la preparación."""
    sentencias: list[str] = []

    def registrar(_conn, _cursor, sentencia, *_resto) -> None:
        sentencias.append(sentencia)

    motor = db.get_bind()
    event.listen(motor, "before_cursor_execute", registrar)
    try:
        accion()
    finally:
        event.remove(motor, "before_cursor_execute", registrar)
    return len(sentencias)


def test_listar_carta_ejecuta_tres_sentencias_sql(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    for orden, nombre in enumerate(["Entradas", "Principales", "Postres"], start=1):
        fabrica_producto(fabrica_seccion(nombre, orden), f"Plato de {nombre}")

    sentencias = _contar_sentencias(
        db, lambda: service.listar_carta(db, ParametrosPaginacion(), Estado.HABILITADO)
    )

    assert sentencias == 3


def test_listar_carta_sin_secciones_omite_la_consulta_de_productos(db: Session) -> None:
    sentencias = _contar_sentencias(
        db, lambda: service.listar_carta(db, ParametrosPaginacion(), Estado.HABILITADO)
    )

    assert sentencias == 2


# --- API publica para otros modulos (M2, HU-M2-04) --------------------------------
# M2 arma el menu del dia sobre `Producto`, pero no puede importar estos schemas: llama a
# estas funciones con valores simples (D-03, contrato de importaciones).


def _menu_del_dia(seccion_id: int, nombre: str = "Guiso de lentejas", **extra) -> dict:
    base = {
        "nombre": nombre,
        "seccion_id": seccion_id,
        "precio": Decimal("9900.00"),
        "ingredientes": ["Lentejas"],
        "descripcion": None,
        "etiquetas": [],
    }
    return base | extra


def test_crear_producto_de_categoria_crea_menu_del_dia_habilitado(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")

    salida = service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id, "  Guiso ")
    )

    assert salida.categoria == Categoria.MENU_DEL_DIA
    assert salida.estado == Estado.HABILITADO
    assert salida.nombre == "Guiso"
    assert salida.seccion.id == seccion.id
    assert db.get(Producto, salida.id).nombre_normalizado == "guiso"


def test_crear_producto_de_categoria_permite_el_mismo_nombre_que_un_plato(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")
    service.crear_producto(db, _plato(seccion.id, "Guiso"), None)

    salida = service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id, "Guiso")
    )

    assert salida.nombre == "Guiso"


def test_crear_producto_de_categoria_rechaza_nombre_repetido_en_su_categoria(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")
    service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id, "Guiso")
    )

    with pytest.raises(ReglaDeNegocioError, match="El producto ya está registrado"):
        service.crear_producto_de_categoria(
            db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id, "guiso")
        )


def test_crear_producto_de_categoria_usa_el_mensaje_del_modulo_que_llama(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")
    service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id, "Guiso")
    )

    with pytest.raises(ReglaDeNegocioError, match="El menú del día ya está registrado"):
        service.crear_producto_de_categoria(
            db,
            Categoria.MENU_DEL_DIA,
            mensaje_nombre_repetido="El menú del día ya está registrado",
            **_menu_del_dia(seccion.id, "Guiso"),
        )


def test_crear_producto_de_categoria_con_seccion_deshabilitada_lanza_regla_de_negocio(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales", estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="está deshabilitada"):
        service.crear_producto_de_categoria(db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id))


def test_crear_producto_de_categoria_con_seccion_inexistente_lanza_no_encontrado(
    db: Session, directorio_media: Path
) -> None:
    with pytest.raises(NoEncontradoError):
        service.crear_producto_de_categoria(db, Categoria.MENU_DEL_DIA, **_menu_del_dia(9999))


def test_crear_producto_de_categoria_guarda_la_imagen(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")

    salida = service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, imagen=_jpeg(), **_menu_del_dia(seccion.id)
    )

    archivo = salida.imagen_url.removeprefix("/media/")
    assert (directorio_media / archivo).is_file()


def test_modificar_producto_de_categoria_cambia_los_datos(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")
    creado = service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id)
    )

    salida = service.modificar_producto_de_categoria(
        db,
        Categoria.MENU_DEL_DIA,
        creado.id,
        nombre="Guiso de arroz",
        seccion_id=seccion.id,
        precio=Decimal("10500.00"),
        ingredientes=["Arroz"],
        descripcion="Con pan",
        etiquetas=["Casero"],
    )

    assert (salida.nombre, salida.precio) == ("Guiso de arroz", Decimal("10500.00"))
    assert (salida.ingredientes, salida.descripcion) == (["Arroz"], "Con pan")
    assert salida.etiquetas == ["Casero"]


def test_modificar_producto_de_categoria_reactiva(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")
    creado = service.crear_producto_de_categoria(
        db, Categoria.MENU_DEL_DIA, **_menu_del_dia(seccion.id)
    )
    service.dar_de_baja_producto(db, Categoria.MENU_DEL_DIA, creado.id)

    salida = service.modificar_producto_de_categoria(
        db,
        Categoria.MENU_DEL_DIA,
        creado.id,
        estado=Estado.HABILITADO,
        **_menu_del_dia(seccion.id),
    )

    assert salida.estado == Estado.HABILITADO


def test_modificar_producto_de_categoria_de_otra_categoria_lanza_no_encontrado(
    db: Session, fabrica_seccion, directorio_media: Path
) -> None:
    seccion = fabrica_seccion("Principales")
    plato = service.crear_producto(db, _plato(seccion.id), None)

    with pytest.raises(NoEncontradoError):
        service.modificar_producto_de_categoria(
            db, Categoria.MENU_DEL_DIA, plato.id, **_menu_del_dia(seccion.id)
        )


def test_obtener_productos_por_ids_conserva_el_orden(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Principales")
    primero = fabrica_producto(seccion, "Uno")
    segundo = fabrica_producto(seccion, "Dos")

    salida = service.obtener_productos_por_ids(db, [segundo.id, primero.id])

    assert [producto.nombre for producto in salida] == ["Dos", "Uno"]


def test_obtener_productos_por_ids_incluye_los_deshabilitados(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Principales")
    apagado = fabrica_producto(seccion, "Guiso", estado=Estado.DESHABILITADO)

    salida = service.obtener_productos_por_ids(db, [apagado.id])

    assert salida[0].estado == Estado.DESHABILITADO


def test_obtener_productos_por_ids_con_id_inexistente_lanza_no_encontrado(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion("Principales")
    existente = fabrica_producto(seccion)

    with pytest.raises(NoEncontradoError, match="9999"):
        service.obtener_productos_por_ids(db, [existente.id, 9999])
