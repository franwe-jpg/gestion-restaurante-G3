"""Integracion de HU-M5-06: `POST /reservas/{id}/comanda` con el puente real, sin doble.

Usa una base SQLite migrada, M3 sembrado con `mesas_en_m3`, un producto habilitado de M1 y la
interfaz real de M4. Los modelos y el service de `productos`, `salon` y `atencion` se importan solo
en las pruebas: lint-imports controla `app`, no `tests`.

Los dos entrelazados (Decision 60) son deterministas: una funcion corre dentro de la solicitud,
justo despues de que M4 comprobo que la mesa esta libre y antes de que inserte la comanda, y
confirma desde otra sesion lo que haria una solicitud concurrente. No hay hilos ni esperas.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, time
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.main import app
from app.modules.atencion.models import Comanda, DetalleComanda
from app.modules.atencion.service import ComandaAbiertaError
from app.modules.productos import service as productos_service
from app.modules.productos.schemas import PlatoCrear, SeccionCrear
from app.modules.reservas import service
from app.modules.reservas.models import EstadoReserva, Reserva
from app.modules.reservas.schemas import ComandaDesdeReservaCrear
from app.modules.salon import service as salon_service
from app.modules.salon.models import Mesa
from app.shared.contratos.comanda import ComandaSalida, DetalleComandaCrear, EstadoComanda
from app.shared.models.enums import EstadoMesa

RUTA = "/api/v1/reservas"
HOY = date(2026, 11, 2)  # el reloj de las pruebas (conftest.py) marca el 2026-11-02 a las 12:00
PRODUCTO_INEXISTENTE = 999


@dataclass(frozen=True)
class Escenario:
    """Una mesa de M3, un producto habilitado de M1 y una reserva ACTIVA de hoy en esa mesa."""

    mesa: Mesa
    mozo_id: int
    producto_id: int
    reserva: Reserva

    @property
    def pedido(self) -> dict:
        return {
            "mozo_id": self.mozo_id,
            "detalles": [{"producto_id": self.producto_id, "cantidad": 2}],
        }


def _sembrar_producto_habilitado(db: Session) -> int:
    """Siembra un producto HABILITADO de M1 con los servicios reales y devuelve su id."""
    seccion = productos_service.crear_seccion(db, SeccionCrear(nombre="Principales", orden=1))
    plato = productos_service.crear_producto(
        db,
        PlatoCrear(
            nombre="Milanesa",
            seccion_id=seccion.id,
            precio=Decimal("1500.50"),
            ingredientes=["Carne"],
        ),
        None,
    )
    return plato.id


@pytest.fixture
def armar(
    db: Session, puente_real, mesas_en_m3, mozo_habilitado_en_m3, fabrica_reserva
) -> Callable[..., Escenario]:
    """Fabrica del escenario base; `puente_real` deja a M5 hablando con M4 de verdad."""

    def crear(estado_mesa: EstadoMesa = EstadoMesa.LIBRE) -> Escenario:
        mesa = mesas_en_m3(1, estado_mesa)[0]
        producto_id = _sembrar_producto_habilitado(db)
        reserva = fabrica_reserva(mesa_id=mesa.id, cliente_id=1, fecha=HOY, hora=time(21, 30))
        return Escenario(
            mesa=mesa, mozo_id=mozo_habilitado_en_m3, producto_id=producto_id, reserva=reserva
        )

    return crear


@pytest.fixture
def entre_la_verificacion_y_el_insert_de_m4(
    monkeypatch: pytest.MonkeyPatch,
) -> Callable[[Callable[[], None]], None]:
    """Devuelve `registrar(accion)`: la accion corre una sola vez dentro de la solicitud.

    M4 busca primero una comanda abierta en la mesa, despues le pregunta a M3 por su estado
    (`salon_service.obtener_mesa`) y recien entonces inserta. La accion corre al volver esa
    consulta a M3: queda despues de la verificacion previa de M4 y antes del insert, que es el
    entrelazado de la Decision 60. Se desregistra antes de correr, asi que una solicitud anidada
    no la dispara de nuevo.
    """
    original = salon_service.obtener_mesa
    acciones: list[Callable[[], None]] = []

    def obtener_mesa(db: Session, mesa_id: int):
        mesa = original(db, mesa_id)
        if acciones:
            acciones.pop()()
        return mesa

    monkeypatch.setattr(salon_service, "obtener_mesa", obtener_mesa)
    return acciones.append


def _atender(cliente: TestClient, escenario: Escenario, cuerpo: dict | None = None):
    cuerpo = escenario.pedido if cuerpo is None else {"mozo_id": escenario.mozo_id, **cuerpo}
    return cliente.post(f"{RUTA}/{escenario.reserva.id}/comanda", json=cuerpo)


def _estado_de_la_reserva(db: Session, reserva_id: int) -> EstadoReserva:
    db.expire_all()  # se relee de la base, no del identity map
    return db.get(Reserva, reserva_id).estado


def _estado_de_la_mesa(db: Session, mesa_id: int) -> EstadoMesa:
    db.expire_all()
    return db.get(Mesa, mesa_id).estado


def _comandas(db: Session) -> list[Comanda]:
    db.expire_all()
    return list(db.scalars(select(Comanda)))


def _cantidad_de_detalles(db: Session) -> int:
    return len(db.scalars(select(DetalleComanda)).all())


# CA 1: la comanda se persiste con el vinculo, ocupa la mesa y atiende la reserva
def test_post_comanda_de_reserva_persiste_la_comanda_con_el_vinculo_y_ocupa_la_mesa(
    cliente: TestClient, db: Session, armar
) -> None:
    escenario = armar()

    respuesta = _atender(cliente, escenario)

    assert respuesta.status_code == 201
    [comanda] = _comandas(db)
    assert (comanda.estado, comanda.mesa_id, comanda.reserva_id) == (
        EstadoComanda.ABIERTA,
        escenario.mesa.id,
        escenario.reserva.id,
    )
    assert comanda.mozo_id == escenario.mozo_id
    assert [(d.producto_id, d.cantidad) for d in comanda.detalles] == [(escenario.producto_id, 2)]
    salida = respuesta.json()
    assert (salida["id"], salida["mesa_id"], salida["reserva_id"], salida["mozo_id"]) == (
        comanda.id,
        escenario.mesa.id,
        escenario.reserva.id,
        escenario.mozo_id,
    )
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.OCUPADA
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ATENDIDA


# M4 rechaza la mesa que no esta libre: 409 y ningun cambio
def test_post_comanda_de_reserva_con_la_mesa_ocupada_devuelve_409_sin_cambios(
    cliente: TestClient, db: Session, armar
) -> None:
    escenario = armar(EstadoMesa.OCUPADA)

    respuesta = _atender(cliente, escenario)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La mesa {escenario.mesa.numero} no está libre"}
    assert _comandas(db) == []
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.OCUPADA
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ACTIVA


def test_post_comanda_de_reserva_con_la_mesa_fuera_de_servicio_devuelve_409(
    cliente: TestClient, db: Session, armar
) -> None:
    escenario = armar(EstadoMesa.FUERA_DE_SERVICIO)

    respuesta = _atender(cliente, escenario)

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La mesa {escenario.mesa.numero} no está libre"}
    assert _comandas(db) == []
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.FUERA_DE_SERVICIO
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ACTIVA


# La verificacion de M4 de comanda abierta (ComandaAbiertaError) llega tal cual, sin cambios
def test_post_comanda_de_reserva_con_otra_comanda_abierta_devuelve_el_409_de_m4(
    cliente: TestClient, db: Session, armar
) -> None:
    escenario = armar(EstadoMesa.OCUPADA)
    previa = Comanda(mesa_id=escenario.mesa.id, estado=EstadoComanda.ABIERTA)
    db.add(previa)
    db.commit()

    respuesta = _atender(cliente, escenario)

    assert respuesta.status_code == 409
    assert respuesta.json()["detalle"] == str(ComandaAbiertaError(previa.id))
    assert [comanda.id for comanda in _comandas(db)] == [previa.id]
    assert _cantidad_de_detalles(db) == 0
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.OCUPADA
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ACTIVA


# La cotizacion falla en la segunda linea: no se persiste nada
def test_post_comanda_de_reserva_con_producto_inexistente_no_persiste_nada(
    cliente: TestClient, db: Session, armar
) -> None:
    escenario = armar()
    cuerpo = {
        "detalles": [
            {"producto_id": escenario.producto_id, "cantidad": 1},
            {"producto_id": PRODUCTO_INEXISTENTE, "cantidad": 1},
        ]
    }

    respuesta = _atender(cliente, escenario, cuerpo)

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detalle": f"El producto {PRODUCTO_INEXISTENTE} no existe"}
    assert _comandas(db) == []
    assert _cantidad_de_detalles(db) == 0
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.LIBRE
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ACTIVA


# Atomicidad: la comanda ya esta en la transaccion cuando falla el commit, y no queda nada
def test_post_comanda_de_reserva_falla_el_commit_no_deja_comanda(
    cliente: TestClient, db: Session, armar, monkeypatch: pytest.MonkeyPatch
) -> None:
    escenario = armar()
    sin_relanzar = TestClient(app, raise_server_exceptions=False)
    en_la_transaccion: list[int] = []

    def commit_roto() -> None:
        db.flush()  # la comanda, la mesa y la reserva llegan a la transaccion, pero el commit falla
        en_la_transaccion.append(len(db.scalars(select(Comanda)).all()))
        raise OperationalError("COMMIT", {}, Exception("disk I/O error"))

    monkeypatch.setattr(db, "commit", commit_roto)

    respuesta = _atender(sin_relanzar, escenario)

    assert en_la_transaccion == [1], "la comanda no llego a crearse antes de que fallara el commit"
    assert respuesta.status_code == 500
    assert _comandas(db) == []
    assert _cantidad_de_detalles(db) == 0
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.LIBRE
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ACTIVA


# Decision 52: la verificacion previa de M4 no ve la comanda, pero la base la rechaza (409 de M5)
def test_post_comanda_de_reserva_con_la_base_rechazando_la_comanda_duplicada_devuelve_409(
    cliente: TestClient,
    db: Session,
    armar,
    entre_la_verificacion_y_el_insert_de_m4,
) -> None:
    escenario = armar()
    mesa_id = escenario.mesa.id
    ajena: list[int] = []

    def otra_solicitud_toma_la_mesa() -> None:
        # El alta general de otra sesion confirma una comanda ABIERTA en la misma mesa.
        with sessionmaker(bind=db.get_bind())() as otra:
            comanda = Comanda(mesa_id=mesa_id, estado=EstadoComanda.ABIERTA)
            otra.add(comanda)
            salon_service.ocupar_mesa(otra, mesa_id)
            otra.commit()
            ajena.append(comanda.id)

    entre_la_verificacion_y_el_insert_de_m4(otra_solicitud_toma_la_mesa)

    respuesta = _atender(cliente, escenario)

    assert ajena, "el entrelazado no se produjo: la prueba no comprueba nada"
    assert respuesta.status_code == 409
    assert respuesta.json() == {"detalle": f"La mesa {mesa_id} ya tiene una comanda abierta"}
    assert [comanda.id for comanda in _comandas(db)] == ajena  # solo la ajena, sin duplicada
    assert _cantidad_de_detalles(db) == 0
    assert _estado_de_la_reserva(db, escenario.reserva.id) == EstadoReserva.ACTIVA


# S65 y Decision 60: dos solicitudes para la misma reserva, una atiende y la otra pierde la carrera
def test_post_comanda_de_reserva_dos_solicitudes_para_la_misma_reserva_una_201_y_otra_409(
    cliente: TestClient,
    db: Session,
    armar,
    entre_la_verificacion_y_el_insert_de_m4,
) -> None:
    escenario = armar()
    reserva_id = escenario.reserva.id
    pedido = ComandaDesdeReservaCrear(
        mozo_id=escenario.mozo_id,
        detalles=[DetalleComandaCrear(producto_id=escenario.producto_id, cantidad=2)],
    )
    ganadora: list[ComandaSalida] = []

    def otra_solicitud_atiende_la_reserva() -> None:
        # La otra solicitud leyo la reserva ACTIVA igual que esta, y llega al commit primero.
        with sessionmaker(bind=db.get_bind())() as otra:
            ganadora.append(service.crear_comanda(otra, reserva_id, pedido))

    entre_la_verificacion_y_el_insert_de_m4(otra_solicitud_atiende_la_reserva)

    perdedora = _atender(cliente, escenario)

    assert [comanda.reserva_id for comanda in ganadora] == [reserva_id]  # esa responde 201
    assert perdedora.status_code == 409
    assert perdedora.json() == {"detalle": f"La reserva {reserva_id} ya fue atendida"}
    [comanda] = _comandas(db)
    assert (comanda.id, comanda.reserva_id) == (ganadora[0].id, reserva_id)  # una sola comanda
    assert _estado_de_la_reserva(db, reserva_id) == EstadoReserva.ATENDIDA
    assert _estado_de_la_mesa(db, escenario.mesa.id) == EstadoMesa.OCUPADA
