import io
from decimal import Decimal
from pathlib import Path

import pytest
from PIL import Image
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.modules.productos import service
from app.modules.productos.models import Seccion
from app.modules.productos.schemas import PlatoCrear, SeccionCrear
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
