"""Pruebas de cierre de Comanda y modificación de Cliente."""

from decimal import Decimal

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

from app.modules.atencion import repository, service
from app.modules.atencion.adaptadores import CatalogoDeCarta, MesasDeSalon
from app.modules.atencion.models import Cliente, Comanda, DetalleComanda
from app.modules.atencion.schemas import ClienteModificar, ComandaModificar, EntregaDetalle
from app.modules.pagos.models import EstadoFactura, Factura
from app.shared.contratos.comanda import ComandaSalida, EstadoComanda, EstadoEntrega
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError


class MesasEspia:
    """Registra las mesas liberadas; el cierre no debe validar ni ocupar mesas."""

    def __init__(self) -> None:
        self.liberadas: list[int] = []

    def validar_disponibilidad(self, db: Session, mesa_id: int) -> None:
        raise AssertionError("El cierre no valida disponibilidad")

    def ocupar(self, db: Session, mesa_id: int) -> None:
        raise AssertionError("El cierre no ocupa mesas")

    def liberar(self, db: Session, mesa_id: int) -> None:
        self.liberadas.append(mesa_id)


@pytest.fixture
def mesas() -> MesasEspia:
    return MesasEspia()


def _estado_mesa(db: Session, mesa_id: int = 1) -> str:
    return db.execute(text("SELECT estado FROM mesas WHERE id=:id"), {"id": mesa_id}).scalar_one()


def test_cerrar_comanda_entregada_persiste_solo_estado_y_devuelve_dto(
    db: Session,
    comanda: Comanda,
) -> None:
    salida = service.cerrar_comanda(db, comanda.id, MesasDeSalon())

    assert isinstance(salida, ComandaSalida)
    assert salida.id == comanda.id
    assert salida.estado == EstadoComanda.CERRADA
    assert salida.mesa_id == 1
    assert salida.reserva_id == 7
    assert salida.observaciones == "Sin sal"
    assert salida.fecha_hora == comanda.fecha_hora
    assert len(salida.detalles) == 1
    detalle = salida.detalles[0]
    assert detalle.estado_entrega == EstadoEntrega.ENTREGADO
    assert detalle.producto_id == 1
    assert detalle.cantidad == 2
    assert detalle.precio_unitario == Decimal("29.90")
    assert detalle.descuento == Decimal("3.25")
    assert detalle.promocion_id == 8
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == "CERRADA"
    assert _estado_mesa(db) == "LIBRE"
    assert db.execute(text("SELECT precio FROM productos WHERE id=1")).scalar_one() == 99.90


def test_anular_comanda_no_facturada_conserva_historial_y_libera_mesa(
    db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.pagos import service as pagos_service

    monkeypatch.setattr(pagos_service, "esta_facturada", lambda _db, _id: False, raising=False)

    salida = service.anular_comanda(db, comanda.id, MesasDeSalon())

    assert salida.estado == EstadoComanda.ANULADA
    assert len(salida.detalles) == 1
    assert salida.detalles[0].precio_unitario == Decimal("29.90")
    with Session(db.get_bind()) as otra:
        assert otra.get(Comanda, comanda.id).estado == EstadoComanda.ANULADA
        assert _estado_mesa(otra) == "LIBRE"


def test_anular_comanda_consulta_servicio_m6_real_y_libera_mesa(
    db: Session, comanda: Comanda
) -> None:
    salida = service.anular_comanda(db, comanda.id, MesasDeSalon())

    assert salida.estado == EstadoComanda.ANULADA
    assert len(salida.detalles) == 1
    with Session(db.get_bind()) as otra:
        assert otra.get(Comanda, comanda.id).estado == EstadoComanda.ANULADA
        assert _estado_mesa(otra, comanda.mesa_id) == "LIBRE"


@pytest.mark.parametrize("estado_factura", [EstadoFactura.ADEUDADA, EstadoFactura.PAGADA])
def test_anular_comanda_con_factura_real_m6_rechaza_sin_efectos(
    db: Session, comanda: Comanda, estado_factura: EstadoFactura
) -> None:
    db.add(
        Factura(
            comanda_id=comanda.id,
            total=Decimal("100.00"),
            saldo_pendiente=(
                Decimal("100.00") if estado_factura == EstadoFactura.ADEUDADA else Decimal("0.00")
            ),
            estado=estado_factura,
        )
    )
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="facturada"):
        service.anular_comanda(db, comanda.id, MesasDeSalon())

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db, comanda.mesa_id) == "OCUPADA"


def test_anular_comanda_falla_cerrado_si_servicio_m6_no_disponible(
    db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.pagos import service as pagos_service

    monkeypatch.delattr(pagos_service, "esta_facturada", raising=False)
    mesas = MesasEspia()

    with pytest.raises(ReglaDeNegocioError, match="El servicio de facturación.*no está disponible"):
        service.anular_comanda(db, comanda.id, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db) == "OCUPADA"
    assert mesas.liberadas == []


def test_anular_comanda_facturada_rechaza_sin_efectos(
    db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.pagos import service as pagos_service

    monkeypatch.setattr(pagos_service, "esta_facturada", lambda _db, _id: True, raising=False)
    mesas = MesasEspia()

    with pytest.raises(ReglaDeNegocioError, match="facturada"):
        service.anular_comanda(db, comanda.id, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db) == "OCUPADA"
    assert mesas.liberadas == []


@pytest.mark.parametrize("estado", [EstadoComanda.CERRADA, EstadoComanda.ANULADA])
def test_anular_comanda_no_abierta_rechaza_antes_de_consultar_m6(
    db: Session, comanda: Comanda, estado: EstadoComanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.pagos import service as pagos_service

    comanda.estado = estado
    db.commit()
    consultas: list[int] = []
    monkeypatch.setattr(
        pagos_service,
        "esta_facturada",
        lambda _db, comanda_id: consultas.append(comanda_id) or False,
        raising=False,
    )
    mesas = MesasEspia()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.anular_comanda(db, comanda.id, mesas)

    assert consultas == []
    assert db.get(Comanda, comanda.id).estado == estado
    assert mesas.liberadas == []


def test_anular_comanda_fallo_al_liberar_revierte_estado_y_mesa(
    db: Session, comanda: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.pagos import service as pagos_service

    monkeypatch.setattr(pagos_service, "esta_facturada", lambda _db, _id: False, raising=False)

    class FallaLiberacion(MesasDeSalon):
        def liberar(self, db: Session, mesa_id: int) -> None:
            super().liberar(db, mesa_id)
            raise RuntimeError("Fallo de liberación")

    with pytest.raises(RuntimeError, match="Fallo de liberación"):
        service.anular_comanda(db, comanda.id, FallaLiberacion())

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db) == "OCUPADA"


def test_cerrar_comanda_inexistente_no_cambia_otras(
    db: Session, comanda: Comanda, mesas: MesasEspia
) -> None:
    with pytest.raises(NoEncontradoError, match="no existe"):
        service.cerrar_comanda(db, 999, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == "ABIERTA"
    assert mesas.liberadas == []


@pytest.mark.parametrize("estado", [EstadoComanda.CERRADA, EstadoComanda.ANULADA])
def test_cerrar_comanda_no_abierta_rechaza_sin_transicion(
    db: Session,
    comanda: Comanda,
    estado: EstadoComanda,
    mesas: MesasEspia,
) -> None:
    comanda.estado = estado
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.cerrar_comanda(db, comanda.id, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == estado
    assert mesas.liberadas == []


@pytest.mark.parametrize("indice_pendiente", [0, 1])
def test_cerrar_comanda_con_pendiente_no_cierra_ni_entrega(
    db: Session,
    comanda: Comanda,
    indice_pendiente: int,
    mesas: MesasEspia,
) -> None:
    comanda.detalles.append(
        DetalleComanda(
            producto_id=1,
            cantidad=1,
            precio_unitario=Decimal("19.90"),
            descuento=Decimal("0.00"),
            estado_entrega=EstadoEntrega.ENTREGADO,
        )
    )
    comanda.detalles[indice_pendiente].estado_entrega = EstadoEntrega.PENDIENTE
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="pendientes"):
        service.cerrar_comanda(db, comanda.id, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert mesas.liberadas == []
    assert len(comanda.detalles) == 2
    assert comanda.detalles[indice_pendiente].estado_entrega == EstadoEntrega.PENDIENTE
    assert comanda.detalles[1 - indice_pendiente].estado_entrega == EstadoEntrega.ENTREGADO
    assert comanda.detalles[0].precio_unitario == Decimal("29.90")


def test_cerrar_comanda_mapeo_invalido_revierte_transicion(db: Session, comanda: Comanda) -> None:
    comanda.detalles[0].precio_unitario = Decimal("0.00")
    db.commit()

    with pytest.raises(ValidationError):
        service.cerrar_comanda(db, comanda.id, MesasDeSalon())

    assert comanda.estado == EstadoComanda.ABIERTA
    assert not db.dirty
    assert _estado_mesa(db) == "OCUPADA"


def test_cerrar_comanda_fallo_commit_revierte_estado(
    db: Session,
    comanda: Comanda,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fallar() -> None:
        raise RuntimeError("Fallo de escritura de prueba")

    monkeypatch.setattr(db, "commit", fallar)

    with pytest.raises(RuntimeError, match="Fallo de escritura"):
        service.cerrar_comanda(db, comanda.id, MesasDeSalon())

    assert comanda.estado == EstadoComanda.ABIERTA
    assert not db.dirty
    assert comanda.detalles[0].precio_unitario == Decimal("29.90")
    assert _estado_mesa(db) == "OCUPADA"


def test_cerrar_comanda_revalida_entregas_persistidas_no_cache(
    db: Session, comanda: Comanda, mesas: MesasEspia
) -> None:
    detalle_id = comanda.detalles[0].id
    assert comanda.detalles[0].estado_entrega == EstadoEntrega.ENTREGADO
    with Session(db.get_bind()) as otra:
        otra.execute(
            text("UPDATE detalles_comanda SET estado_entrega=:estado WHERE id=:id"),
            {"estado": "PENDIENTE", "id": detalle_id},
        )
        otra.commit()

    with pytest.raises(ReglaDeNegocioError, match="pendientes"):
        service.cerrar_comanda(db, comanda.id, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA
    assert comanda.detalles[0].estado_entrega == EstadoEntrega.PENDIENTE
    assert mesas.liberadas == []


def test_cerrar_comanda_revalida_estado_persistido_no_cache(
    db: Session, comanda: Comanda, mesas: MesasEspia
) -> None:
    with Session(db.get_bind()) as otra:
        otra.execute(
            text("UPDATE comandas SET estado=:estado WHERE id=:id"),
            {"estado": "ANULADA", "id": comanda.id},
        )
        otra.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.cerrar_comanda(db, comanda.id, mesas)

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ANULADA
    assert mesas.liberadas == []


def test_cerrar_comanda_libera_su_mesa_una_sola_vez(
    db: Session, comanda: Comanda, mesas: MesasEspia
) -> None:
    service.cerrar_comanda(db, comanda.id, mesas)
    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.cerrar_comanda(db, comanda.id, mesas)

    assert mesas.liberadas == [comanda.mesa_id]


def test_cerrar_comanda_libera_la_mesa_en_la_misma_transaccion(
    db: Session, comanda: Comanda
) -> None:
    service.cerrar_comanda(db, comanda.id, MesasDeSalon())

    with Session(db.get_bind()) as otra:
        assert otra.get(Comanda, comanda.id).estado == EstadoComanda.CERRADA
        assert _estado_mesa(otra) == "LIBRE"


def test_modificar_cliente_confirma_ambos_datos(db: Session) -> None:
    cliente = Cliente(nombre="Ana", telefono="123")
    db.add(cliente)
    db.commit()

    salida = service.modificar_cliente(
        db, cliente.id, ClienteModificar(nombre="María José", telefono="+54 456-789")
    )
    db.expire_all()

    assert salida.model_dump() == {
        "id": cliente.id,
        "nombre": "María José",
        "telefono": "+54 456-789",
    }
    assert (db.get(Cliente, cliente.id).nombre, db.get(Cliente, cliente.id).telefono) == (
        "María José",
        "+54 456-789",
    )


def test_modificar_cliente_inexistente_no_crea_otro(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="cliente 99"):
        service.modificar_cliente(db, 99, ClienteModificar(nombre="Ana", telefono="123"))

    assert db.get(Cliente, 99) is None


# Entregas por cantidad (HU-M4-08). `comanda_con_lineas`: líneas de cantidad 3 y 10.


def _entregar(db: Session, comanda: Comanda, indice: int, n: int) -> service.EntregasComanda:
    detalle = comanda.detalles[indice]
    return service.registrar_entrega(
        db, comanda.id, detalle.id, EntregaDetalle(cantidad_entregada=n)
    )


def _linea(salida: service.EntregasComanda, detalle: DetalleComanda) -> tuple[int, str]:
    encontrada = next(d for d in salida.detalles if d.id == detalle.id)
    return encontrada.cantidad_entregada, encontrada.estado_entrega


def _persistido(db: Session, detalle: DetalleComanda) -> tuple[int, str]:
    fila = db.execute(
        text("SELECT cantidad_entregada, estado_entrega FROM detalles_comanda WHERE id=:id"),
        {"id": detalle.id},
    ).one()
    return tuple(fila)


def test_registrar_entrega_parcial_actualiza_cantidad(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    salida = _entregar(db, comanda_con_lineas, 1, 4)

    assert _linea(salida, comanda_con_lineas.detalles[1]) == (4, "PENDIENTE")
    assert _persistido(db, comanda_con_lineas.detalles[1]) == (4, "PENDIENTE")


def test_registrar_entrega_completa_marca_entregado_y_no_toca_otro_detalle(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    salida = _entregar(db, comanda_con_lineas, 0, 3)

    primero, segundo = comanda_con_lineas.detalles
    assert salida.comanda_id == comanda_con_lineas.id
    assert salida.estado == EstadoComanda.ABIERTA
    assert [d.id for d in salida.detalles] == [primero.id, segundo.id]
    assert _linea(salida, primero) == (3, "ENTREGADO")
    assert _linea(salida, segundo) == (0, "PENDIENTE")


def test_registrar_entrega_completa_una_parcial(db: Session, comanda_con_lineas: Comanda) -> None:
    _entregar(db, comanda_con_lineas, 1, 4)

    salida = _entregar(db, comanda_con_lineas, 1, 10)

    assert _linea(salida, comanda_con_lineas.detalles[1]) == (10, "ENTREGADO")


def test_registrar_entrega_desmarca_bajando_una_unidad(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    _entregar(db, comanda_con_lineas, 0, 3)

    salida = _entregar(db, comanda_con_lineas, 0, 2)

    assert _linea(salida, comanda_con_lineas.detalles[0]) == (2, "PENDIENTE")


def test_registrar_entrega_fija_cero(db: Session, comanda_con_lineas: Comanda) -> None:
    _entregar(db, comanda_con_lineas, 0, 3)

    salida = _entregar(db, comanda_con_lineas, 0, 0)

    assert _linea(salida, comanda_con_lineas.detalles[0]) == (0, "PENDIENTE")
    assert _persistido(db, comanda_con_lineas.detalles[0]) == (0, "PENDIENTE")


def test_registrar_entrega_repetida_es_idempotente(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    primera = _entregar(db, comanda_con_lineas, 1, 4)
    segunda = _entregar(db, comanda_con_lineas, 1, 4)

    assert primera == segunda
    assert _linea(segunda, comanda_con_lineas.detalles[1]) == (4, "PENDIENTE")


def test_registrar_entrega_mayor_que_cantidad_lanza_datos_invalidos_sin_cambios(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    with pytest.raises(DatosInvalidosError):
        _entregar(db, comanda_con_lineas, 0, 4)

    assert _persistido(db, comanda_con_lineas.detalles[0]) == (0, "PENDIENTE")


def test_registrar_entrega_comanda_inexistente_lanza_no_encontrado(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    with pytest.raises(NoEncontradoError, match="comanda 999"):
        service.registrar_entrega(
            db, 999, comanda_con_lineas.detalles[0].id, EntregaDetalle(cantidad_entregada=1)
        )


def test_registrar_entrega_detalle_inexistente_lanza_no_encontrado(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    with pytest.raises(NoEncontradoError, match="detalle 999"):
        service.registrar_entrega(
            db, comanda_con_lineas.id, 999, EntregaDetalle(cantidad_entregada=1)
        )


def test_registrar_entrega_detalle_de_otra_comanda_lanza_no_encontrado_y_no_cambia(
    db: Session, comanda: Comanda, comanda_con_lineas: Comanda
) -> None:
    ajeno = comanda.detalles[0]

    with pytest.raises(NoEncontradoError, match="detalle"):
        service.registrar_entrega(
            db, comanda_con_lineas.id, ajeno.id, EntregaDetalle(cantidad_entregada=1)
        )

    assert _persistido(db, ajeno) == (2, "ENTREGADO")


@pytest.mark.parametrize("estado", [EstadoComanda.CERRADA, EstadoComanda.ANULADA])
def test_registrar_entrega_comanda_no_abierta_lanza_conflicto(
    db: Session, comanda_con_lineas: Comanda, estado: EstadoComanda
) -> None:
    comanda_con_lineas.estado = estado
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        _entregar(db, comanda_con_lineas, 0, 3)

    assert _persistido(db, comanda_con_lineas.detalles[0]) == (0, "PENDIENTE")


def test_registrar_entrega_desmarcar_en_comanda_cerrada_lanza_conflicto(
    db: Session, comanda: Comanda
) -> None:
    comanda.estado = EstadoComanda.CERRADA
    db.commit()

    with pytest.raises(ReglaDeNegocioError):
        service.registrar_entrega(
            db, comanda.id, comanda.detalles[0].id, EntregaDetalle(cantidad_entregada=0)
        )

    assert _persistido(db, comanda.detalles[0]) == (2, "ENTREGADO")


def test_registrar_entrega_orden_de_diagnostico(db: Session, comanda_con_lineas: Comanda) -> None:
    ajeno = comanda_con_lineas.detalles[0].id
    datos = EntregaDetalle(cantidad_entregada=99)  # excede el tope en todos los casos
    comanda_con_lineas.estado = EstadoComanda.CERRADA
    db.commit()

    with pytest.raises(NoEncontradoError, match="comanda"):  # comanda antes que detalle
        service.registrar_entrega(db, 999, 999, datos)
    with pytest.raises(NoEncontradoError, match="detalle"):  # detalle antes que estado
        service.registrar_entrega(db, comanda_con_lineas.id, 999, datos)
    with pytest.raises(ReglaDeNegocioError):  # estado antes que tope
        service.registrar_entrega(db, comanda_con_lineas.id, ajeno, datos)
    comanda_con_lineas.estado = EstadoComanda.ABIERTA
    db.commit()
    with pytest.raises(DatosInvalidosError):
        service.registrar_entrega(db, comanda_con_lineas.id, ajeno, datos)


def test_registrar_entrega_ultima_unidad_no_cierra_la_comanda(
    db: Session, comanda_con_lineas: Comanda, mesas: MesasEspia
) -> None:
    _entregar(db, comanda_con_lineas, 0, 3)
    salida = _entregar(db, comanda_con_lineas, 1, 10)

    assert salida.estado == EstadoComanda.ABIERTA
    assert db.get(Comanda, comanda_con_lineas.id).estado == "ABIERTA"
    assert service.cerrar_comanda(db, comanda_con_lineas.id, mesas).estado == EstadoComanda.CERRADA


def test_cerrar_comanda_tras_entregar_todo_funciona(
    db: Session, comanda_con_lineas: Comanda, mesas: MesasEspia
) -> None:
    with pytest.raises(ReglaDeNegocioError):  # antes de entregar, el cierre se bloquea
        service.cerrar_comanda(db, comanda_con_lineas.id, mesas)
    _entregar(db, comanda_con_lineas, 0, 3)
    _entregar(db, comanda_con_lineas, 1, 10)

    cerrada = service.cerrar_comanda(db, comanda_con_lineas.id, mesas)

    assert cerrada.estado == EstadoComanda.CERRADA
    assert mesas.liberadas == [2]


def test_cerrar_comanda_tras_desmarcar_una_unidad_lanza_conflicto(
    db: Session, comanda_con_lineas: Comanda, mesas: MesasEspia
) -> None:
    _entregar(db, comanda_con_lineas, 0, 3)
    _entregar(db, comanda_con_lineas, 1, 10)
    _entregar(db, comanda_con_lineas, 1, 9)

    with pytest.raises(service.EntregasPendientesError) as error:
        service.cerrar_comanda(db, comanda_con_lineas.id, mesas)

    assert [d.id for d in error.value.pendientes] == [comanda_con_lineas.detalles[1].id]
    assert mesas.liberadas == []


def test_registrar_entrega_comanda_cerrada_por_otra_sesion_lanza_conflicto_sin_cambios(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    with sessionmaker(bind=db.get_bind())() as otra:
        otra.execute(
            text("UPDATE comandas SET estado='CERRADA' WHERE id=:id"), {"id": comanda_con_lineas.id}
        )
        otra.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        _entregar(db, comanda_con_lineas, 0, 3)

    assert _persistido(db, comanda_con_lineas.detalles[0]) == (0, "PENDIENTE")


def test_registrar_entrega_dos_escrituras_gana_la_ultima(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    detalle = comanda_con_lineas.detalles[1]
    datos = {"id": detalle.id}
    with sessionmaker(bind=db.get_bind())() as otra:
        service.registrar_entrega(
            otra, comanda_con_lineas.id, detalle.id, EntregaDetalle(cantidad_entregada=2)
        )
    salida = _entregar(db, comanda_con_lineas, 1, 2)  # el segundo mozo también envía 2

    assert _linea(salida, detalle) == (2, "PENDIENTE")
    assert (
        db.execute(
            text("SELECT cantidad_entregada FROM detalles_comanda WHERE id=:id"), datos
        ).scalar_one()
        == 2
    )


def test_registrar_entrega_sin_causa_visible_lanza_conflicto_detalle_cambio(
    db: Session, comanda_con_lineas: Comanda, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(repository, "registrar_entrega", lambda *_args: False)

    with pytest.raises(ReglaDeNegocioError, match="El detalle cambió; vuelva a consultar"):
        _entregar(db, comanda_con_lineas, 0, 1)


def test_consultar_entregas_devuelve_detalles_ordenados_con_cantidades(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    _entregar(db, comanda_con_lineas, 0, 3)
    _entregar(db, comanda_con_lineas, 1, 4)

    salida = service.consultar_entregas(db, comanda_con_lineas.id)

    primero, segundo = comanda_con_lineas.detalles
    assert [
        (d.id, d.cantidad, d.cantidad_entregada, d.estado_entrega) for d in salida.detalles
    ] == [
        (primero.id, 3, 3, "ENTREGADO"),
        (segundo.id, 10, 4, "PENDIENTE"),
    ]
    assert salida.detalles[0].producto_id == 1
    assert salida.detalles[0].menu_ejecutivo_id is None


def test_consultar_entregas_todo_entregado_sin_pendientes(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    _entregar(db, comanda_con_lineas, 0, 3)
    _entregar(db, comanda_con_lineas, 1, 10)

    salida = service.consultar_entregas(db, comanda_con_lineas.id)

    assert [d.estado_entrega for d in salida.detalles] == ["ENTREGADO", "ENTREGADO"]
    assert service.consultar_pendientes(db, comanda_con_lineas.id).pendientes == []


def test_consultar_entregas_comanda_cerrada_devuelve_detalles(
    db: Session, comanda: Comanda
) -> None:
    comanda.estado = EstadoComanda.CERRADA
    db.commit()

    salida = service.consultar_entregas(db, comanda.id)

    assert salida.estado == EstadoComanda.CERRADA
    assert [(d.cantidad, d.cantidad_entregada) for d in salida.detalles] == [(2, 2)]


def test_consultar_entregas_comanda_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="comanda 999"):
        service.consultar_entregas(db, 999)


def _contar_clientes(db: Session) -> int:
    return db.execute(text("SELECT COUNT(*) FROM clientes")).scalar_one()


def test_registrar_cliente_para_reserva_devuelve_id_sin_commit(db: Session) -> None:
    cliente_id = service.registrar_cliente_para_reserva(db, "Ana Pérez", "2804 123456")

    assert isinstance(cliente_id, int)
    assert repository.obtener_cliente(db, cliente_id) is not None
    assert db.in_transaction()


def test_registrar_cliente_para_reserva_rollback_posterior_no_deja_cliente(db: Session) -> None:
    cliente_id = service.registrar_cliente_para_reserva(db, "Ana Pérez", "2804 123456")

    db.rollback()

    assert repository.obtener_cliente(db, cliente_id) is None
    assert _contar_clientes(db) == 0


def test_registrar_cliente_para_reserva_permite_nombres_repetidos(db: Session) -> None:
    primero = service.registrar_cliente_para_reserva(db, "Ana Pérez", "2804 123456")
    segundo = service.registrar_cliente_para_reserva(db, "Ana Pérez", "2804 654321")

    assert primero != segundo
    assert _contar_clientes(db) == 2


@pytest.mark.parametrize(
    ("nombre", "telefono", "campo"),
    [("", "2804 123456", "nombre"), ("Ana", "", "telefono"), ("  ", "2804 123456", "nombre")],
)
def test_registrar_cliente_para_reserva_campo_vacio_nombra_el_campo(
    db: Session, nombre: str, telefono: str, campo: str
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        service.registrar_cliente_para_reserva(db, nombre, telefono)

    assert str(error.value).startswith(f"{campo}: ")
    assert _contar_clientes(db) == 0


@pytest.mark.parametrize("nombre", ["Ana2", "Ana!", "Ana_Pérez"])
def test_registrar_cliente_para_reserva_nombre_invalido_nombra_el_campo(
    db: Session, nombre: str
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        service.registrar_cliente_para_reserva(db, nombre, "2804 123456")

    assert str(error.value) == "nombre: solo admite letras y espacios"
    assert "Value error, " not in str(error.value)
    assert _contar_clientes(db) == 0


def test_existe_cliente_distingue_existente_de_inexistente(db: Session) -> None:
    cliente_id = service.registrar_cliente_para_reserva(db, "Ana Pérez", "2804 123456")

    assert service.existe_cliente(db, cliente_id) is True
    assert service.existe_cliente(db, cliente_id + 999) is False


def test_promocion_fue_aplicada_detecta_linea_de_comanda(db: Session, comanda: Comanda) -> None:
    assert service.promocion_fue_aplicada(db, 8) is True
    assert service.promocion_fue_aplicada(db, 99) is False


def test_modificar_comanda_quita_y_agrega_sin_tocar_los_historicos(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    detalle_id = comanda_con_lineas.detalles[0].id

    salida = service.modificar_comanda(
        db,
        comanda_con_lineas.id,
        ComandaModificar(
            quitar=[detalle_id],
            agregar=[{"producto_id": 1, "cantidad": 5}],
        ),
        CatalogoDeCarta(),
    )

    assert salida.estado == EstadoComanda.ABIERTA
    assert [detalle.cantidad for detalle in salida.detalles] == [10, 5]
    assert salida.detalles[0].precio_unitario == Decimal("29.90")
    assert salida.detalles[1].precio_unitario == Decimal("99.90")
    db.expire_all()
    guardada = db.get(Comanda, comanda_con_lineas.id)
    assert [detalle.cantidad for detalle in guardada.detalles] == [10, 5]


def test_modificar_comanda_cerrada_rechaza_sin_cambios(db: Session, comanda: Comanda) -> None:
    comanda.estado = EstadoComanda.CERRADA
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.modificar_comanda(
            db,
            comanda.id,
            ComandaModificar(quitar=[comanda.detalles[0].id]),
            CatalogoDeCarta(),
        )

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.CERRADA
    assert len(db.get(Comanda, comanda.id).detalles) == 1


def test_modificar_comanda_detalle_ajeno_no_cambia_nada(
    db: Session, comanda_con_lineas: Comanda
) -> None:
    with pytest.raises(NoEncontradoError, match="no existe"):
        service.modificar_comanda(
            db,
            comanda_con_lineas.id,
            ComandaModificar(quitar=[999]),
            CatalogoDeCarta(),
        )

    db.expire_all()
    assert len(db.get(Comanda, comanda_con_lineas.id).detalles) == 2


def test_reabrir_comanda_cerrada_vuelve_a_ocupar_su_mesa(db: Session, comanda: Comanda) -> None:
    comanda.estado = EstadoComanda.CERRADA
    db.execute(text("UPDATE mesas SET estado='LIBRE' WHERE id=1"))
    db.commit()

    salida = service.reabrir_comanda(db, comanda.id, MesasDeSalon())

    assert salida.estado == EstadoComanda.ABIERTA
    assert _estado_mesa(db) == "OCUPADA"
    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.ABIERTA


def test_reabrir_comanda_abierta_rechaza_sin_cambios(db: Session, comanda: Comanda) -> None:
    with pytest.raises(ReglaDeNegocioError, match="CERRADA"):
        service.reabrir_comanda(db, comanda.id, MesasDeSalon())

    assert comanda.estado == EstadoComanda.ABIERTA


def test_reabrir_comanda_con_otra_abierta_en_la_mesa_rechaza(db: Session, comanda: Comanda) -> None:
    comanda.estado = EstadoComanda.CERRADA
    db.add(Comanda(mesa_id=1, estado=EstadoComanda.ABIERTA))
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="ABIERTA"):
        service.reabrir_comanda(db, comanda.id, MesasDeSalon())

    db.expire_all()
    assert db.get(Comanda, comanda.id).estado == EstadoComanda.CERRADA
