"""M4 creation with test-only service providers and real migrated persistence."""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.atencion import repository, service
from app.shared.contratos.comanda import (
    ComandaCrear,
    DetalleComandaCrear,
    DetalleComandaSalida,
    EstadoComanda,
    EstadoEntrega,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError


class MesasPrueba:
    def validar_disponibilidad(self, db: Session, mesa_id: int) -> None:
        estado = db.execute(
            text("SELECT estado FROM mesas WHERE id=:id"), {"id": mesa_id}
        ).scalar_one_or_none()
        if estado is None:
            raise NoEncontradoError("Mesa does not exist")
        if estado != "LIBRE":
            raise ReglaDeNegocioError("Mesa is not available")

    def ocupar(self, db: Session, mesa_id: int) -> None:
        db.execute(text("UPDATE mesas SET estado='OCUPADA' WHERE id=:id"), {"id": mesa_id})

    def liberar(self, db: Session, mesa_id: int) -> None:
        db.execute(
            text("UPDATE mesas SET estado='LIBRE' WHERE id=:id AND estado='OCUPADA'"),
            {"id": mesa_id},
        )


class CatalogoPrueba:
    precio = Decimal("29.90")
    descuento = Decimal("3.25")
    promocion_id = 8

    def cotizar(self, db: Session, detalle: DetalleComandaCrear) -> DetalleComandaSalida:
        return DetalleComandaSalida(
            **detalle.model_dump(),
            precio_unitario=self.precio,
            descuento=self.descuento,
            promocion_id=self.promocion_id,
            estado_entrega=EstadoEntrega.PENDIENTE,
        )


@pytest.fixture
def pedido(comanda) -> ComandaCrear:
    return ComandaCrear(
        mesa_id=2,
        mozo_id=1,
        observaciones="No salt",
        detalles=[DetalleComandaCrear(producto_id=1, cantidad=2)],
    )


def test_crear_comanda_persiste_historia_y_ocupa_en_una_confirmacion(db, pedido, monkeypatch):
    confirmaciones = []
    commit = db.commit

    def confirmar():
        confirmaciones.append(1)
        commit()

    monkeypatch.setattr(db, "commit", confirmar)
    antes = datetime.now(UTC)
    salida = service.crear_comanda(db, pedido, MesasPrueba(), CatalogoPrueba())

    assert salida.mesa_id == 2
    assert salida.estado == EstadoComanda.ABIERTA
    assert salida.reserva_id is None
    assert salida.observaciones == "No salt"
    assert antes <= salida.fecha_hora <= datetime.now(UTC)
    assert salida.fecha_hora.utcoffset().total_seconds() == 0
    assert confirmaciones == [1]
    with Session(db.get_bind()) as otra:
        registro = repository.obtener_comanda(otra, salida.id)
        assert registro.estado == "ABIERTA"
        assert len(registro.detalles) == 1
        assert registro.detalles[0].cantidad == 2
        assert registro.detalles[0].precio_unitario == Decimal("29.90")
        assert registro.detalles[0].descuento == Decimal("3.25")
        assert registro.detalles[0].promocion_id == 8
        assert registro.detalles[0].estado_entrega == "PENDIENTE"
        assert otra.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "OCUPADA"


def test_crear_comanda_a01_devuelve_id_y_preserva_existente(db, pedido, comanda):
    pedido.mesa_id = 1
    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, pedido, MesasPrueba(), CatalogoPrueba())

    assert error.value.comanda_id == comanda.id
    existente = repository.obtener_comanda(db, error.value.comanda_id)
    assert existente.estado == EstadoComanda.ABIERTA
    assert len(existente.detalles) == 1
    assert existente.detalles[0].precio_unitario == Decimal("29.90")
    assert db.execute(text("SELECT count(*) FROM comandas")).scalar_one() == 1
    assert db.execute(text("SELECT count(*) FROM detalles_comanda")).scalar_one() == 1


def test_crear_comanda_mesa_inexistente_no_inserta(db, pedido):
    pedido.mesa_id = 999
    with pytest.raises(NoEncontradoError):
        service.crear_comanda(db, pedido, MesasPrueba(), CatalogoPrueba())

    assert db.execute(text("SELECT count(*) FROM comandas")).scalar_one() == 1
    assert db.execute(text("SELECT count(*) FROM detalles_comanda")).scalar_one() == 1


@pytest.mark.parametrize("cantidad", [0, -1, 1.5, "invalid", True])
def test_crear_comanda_revalida_cantidad_antes_de_escribir(db, pedido, cantidad):
    class MesasNoInvocables(MesasPrueba):
        def validar_disponibilidad(self, db, mesa_id):
            raise AssertionError("Invalid input must not reach providers")

    pedido.detalles[0].cantidad = cantidad
    with pytest.raises(ValidationError):
        service.crear_comanda(db, pedido, MesasNoInvocables(), CatalogoPrueba())
    assert db.execute(text("SELECT count(*) FROM comandas WHERE mesa_id=2")).scalar_one() == 0
    assert db.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "LIBRE"


@pytest.mark.parametrize(
    "cambio",
    [
        {"cantidad": 9},
        {"producto_id": 999},
        {"estado_entrega": EstadoEntrega.ENTREGADO},
        {"precio_unitario": Decimal("100000000.00")},
        {"descuento": Decimal("100000000.00")},
        {"precio_unitario": 29.90},
    ],
)
def test_crear_comanda_rechaza_cotizacion_incompatible(db, pedido, cambio):
    class CatalogoIncompatible(CatalogoPrueba):
        def cotizar(self, db, detalle):
            return super().cotizar(db, detalle).model_copy(update=cambio)

    with pytest.raises(DatosInvalidosError):
        service.crear_comanda(db, pedido, MesasPrueba(), CatalogoIncompatible())
    assert db.execute(text("SELECT count(*) FROM comandas WHERE mesa_id=2")).scalar_one() == 0
    assert db.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "LIBRE"


def test_crear_comanda_a01_carrera_dos_sesiones_identifica_ganadora(db, pedido):
    ganadoras = []

    class CatalogoIntercalado(CatalogoPrueba):
        def cotizar(self, sesion, detalle):
            # The competing application operation owns its own commit, not this provider.
            with Session(sesion.get_bind()) as otra:
                ganadoras.append(
                    service.crear_comanda(otra, pedido, MesasPrueba(), CatalogoPrueba()).id
                )
            return super().cotizar(sesion, detalle)

    with pytest.raises(ReglaDeNegocioError) as error:
        service.crear_comanda(db, pedido, MesasPrueba(), CatalogoIntercalado())

    assert error.value.comanda_id == ganadoras[0]
    assert db.execute(text("SELECT count(*) FROM comandas WHERE mesa_id=2")).scalar_one() == 1
    assert db.execute(text("SELECT count(*) FROM detalles_comanda")).scalar_one() == 2
    existente = repository.obtener_comanda(db, ganadoras[0])
    assert existente.detalles[0].precio_unitario == Decimal("29.90")
    assert db.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "OCUPADA"


@pytest.mark.parametrize("fallo", ["catalogo", "ocupar", "mapeo", "commit", "integridad"])
def test_crear_comanda_fallo_revierte_comanda_detalles_y_mesa(db, pedido, monkeypatch, fallo):
    class CatalogoFallido(CatalogoPrueba):
        def cotizar(self, sesion, detalle):
            MesasPrueba().ocupar(sesion, pedido.mesa_id)
            raise RuntimeError("catalog failure")

    class MesasFallidas(MesasPrueba):
        def ocupar(self, sesion, mesa_id):
            super().ocupar(sesion, mesa_id)
            if fallo == "ocupar":
                raise RuntimeError("occupation failure")
            if fallo == "mapeo":
                sesion.execute(
                    text("UPDATE detalles_comanda SET precio_unitario=0 WHERE comanda_id>1")
                )
                sesion.expire_all()

    def fallar_commit():
        raise RuntimeError("commit failure")

    if fallo == "commit":
        monkeypatch.setattr(db, "commit", fallar_commit)
    if fallo == "integridad":
        pedido.detalles[0].producto_id = 999
    catalogo = CatalogoFallido() if fallo == "catalogo" else CatalogoPrueba()
    error = (
        ValidationError
        if fallo == "mapeo"
        else (IntegrityError if fallo == "integridad" else RuntimeError)
    )
    with pytest.raises(error):
        service.crear_comanda(db, pedido, MesasFallidas(), catalogo)

    with Session(db.get_bind()) as otra:
        assert otra.execute(text("SELECT count(*) FROM comandas WHERE mesa_id=2")).scalar_one() == 0
        assert otra.execute(text("SELECT count(*) FROM detalles_comanda")).scalar_one() == 1
        assert otra.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "LIBRE"
    assert not db.new
    assert not db.dirty


@pytest.mark.parametrize("campo", ["precio_unitario", "descuento"])
def test_crear_comanda_no_redondea_cotizacion_con_mas_de_dos_decimales(db, pedido, campo):
    class CatalogoConPrecisionInvalida(CatalogoPrueba):
        def cotizar(self, sesion, detalle):
            return super().cotizar(sesion, detalle).model_copy(update={campo: Decimal("1.235")})

    with pytest.raises(ValidationError):
        service.crear_comanda(db, pedido, MesasPrueba(), CatalogoConPrecisionInvalida())
    assert db.execute(text("SELECT count(*) FROM comandas WHERE mesa_id=2")).scalar_one() == 0
    assert db.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "LIBRE"


@pytest.mark.parametrize("menu", [False, True])
def test_crear_comanda_historia_de_lineas_repetidas_no_recalcula_al_cerrar(db, pedido, menu):
    catalogo = CatalogoPrueba()
    if menu:
        db.execute(
            text(
                "INSERT INTO menus_ejecutivos "
                "(id, nombre, nombre_normalizado, precio_fijo, estado, seccion_id) "
                "VALUES (1, 'Menu', 'menu', 50.00, 'HABILITADO', 1)"
            )
        )
        db.commit()
        pedido.detalles = [DetalleComandaCrear(menu_ejecutivo_id=1, cantidad=3)]
        catalogo.precio = Decimal("49.95")
        catalogo.descuento = Decimal("0.00")
        catalogo.promocion_id = None
    pedido.detalles.append(pedido.detalles[0].model_copy(update={"cantidad": 1}))
    salida = service.crear_comanda(db, pedido, MesasPrueba(), catalogo)
    precio, descuento = catalogo.precio, catalogo.descuento
    catalogo.precio = Decimal("90.00")
    catalogo.descuento = Decimal("9.00")
    db.execute(text("UPDATE productos SET precio=90.00 WHERE id=1"))
    db.execute(text("UPDATE menus_ejecutivos SET precio_fijo=90.00 WHERE id=1"))
    db.execute(
        text("UPDATE detalles_comanda SET estado_entrega='ENTREGADO' WHERE comanda_id=:id"),
        {"id": salida.id},
    )
    db.commit()
    cerrada = service.cerrar_comanda(db, salida.id, MesasPrueba())
    assert cerrada.estado == EstadoComanda.CERRADA
    assert db.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "LIBRE"
    assert cerrada.fecha_hora == salida.fecha_hora
    assert len(cerrada.detalles) == 2
    assert [linea.cantidad for linea in cerrada.detalles] == [3 if menu else 2, 1]
    assert [linea.precio_unitario for linea in cerrada.detalles] == [precio, precio]
    assert [linea.descuento for linea in cerrada.detalles] == [descuento, descuento]
    assert [linea.promocion_id for linea in cerrada.detalles] == ([None, None] if menu else [8, 8])
    assert [linea.menu_ejecutivo_id for linea in cerrada.detalles] == (
        [1, 1] if menu else [None, None]
    )


@pytest.mark.parametrize("caso", ["vacio", "sin_referencia", "doble_referencia"])
def test_crear_comanda_revalida_estructura_compartida_sin_alta(db, pedido, caso):
    if caso == "vacio":
        pedido.detalles = []
    elif caso == "sin_referencia":
        pedido.detalles[0].producto_id = None
    else:
        pedido.detalles[0].menu_ejecutivo_id = 1
    with pytest.raises(ValidationError):
        service.crear_comanda(db, pedido, MesasPrueba(), CatalogoPrueba())
    assert db.execute(text("SELECT count(*) FROM comandas WHERE mesa_id=2")).scalar_one() == 0
    assert db.execute(text("SELECT estado FROM mesas WHERE id=2")).scalar_one() == "LIBRE"
