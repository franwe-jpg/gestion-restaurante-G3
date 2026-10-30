"""Contract checks for the provisional Comanda DTO and isolated fake."""

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.shared.contratos.comanda import (
    ComandaCrear,
    ComandaSalida,
    DetalleComandaCrear,
    EstadoComanda,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.paginacion import ParametrosPaginacion
from tests.shared.fakes.comanda import CatalogoValor, ComandaFake, ReservaFake


@pytest.mark.parametrize(
    ("datos", "valido"),
    [
        ({"producto_id": 12, "cantidad": 2}, True),
        ({"menu_ejecutivo_id": 5, "cantidad": 1}, True),
        ({"cantidad": 1}, False),
        ({"producto_id": 12, "menu_ejecutivo_id": 5, "cantidad": 1}, False),
        *[({"producto_id": 12, "cantidad": n}, False) for n in (0, -1, 1.5, True, "2")],
    ],
)
def test_datos_detalle_referencia_y_cantidad(datos: dict, valido: bool) -> None:
    if valido:
        assert DetalleComandaCrear.model_validate(datos).cantidad == datos["cantidad"]
    else:
        with pytest.raises(ValidationError):
            DetalleComandaCrear.model_validate(datos)


def test_datos_comanda_requiere_detalles() -> None:
    with pytest.raises(ValidationError):
        ComandaCrear(mesa_id=7, detalles=[])
    pedido = ComandaCrear(mesa_id=7, detalles=[{"producto_id": 12, "cantidad": 2}])
    assert pedido.detalles[0].producto_id == 12


def test_datos_precio_serializado_como_productos() -> None:
    from app.shared.contratos.comanda import DetalleComandaSalida

    detalle = DetalleComandaSalida(
        producto_id=12,
        cantidad=2,
        precio_unitario=Decimal("10.00"),
        descuento=Decimal("0.50"),
        promocion_id=3,
        estado_entrega="PENDIENTE",
    )
    assert detalle.precio_unitario == Decimal("10.00")
    assert detalle.model_dump(mode="json")["precio_unitario"] == "10.00"
    assert detalle.model_dump(mode="json")["descuento"] == "0.50"


@pytest.fixture
def fake() -> ComandaFake:
    return ComandaFake(
        mesas={7: "LIBRE", 8: "LIBRE", 9: "LIBRE"},
        catalogo={
            ("producto", 12): CatalogoValor(Decimal("10.00"), Decimal("0.50"), 3),
            ("menu", 5): CatalogoValor(Decimal("20.25"), Decimal("0.00"), None),
        },
        reloj=lambda: datetime(2026, 10, 29, 12, 30, tzinfo=UTC),
    )


def pedido(mesa_id: int = 7, *, menu: bool = False) -> ComandaCrear:
    referencia = {"menu_ejecutivo_id": 5} if menu else {"producto_id": 12}
    return ComandaCrear(mesa_id=mesa_id, detalles=[{**referencia, "cantidad": 2}])


@pytest.fixture
def fake_entregada(fake: ComandaFake) -> ComandaFake:
    """Seed a separately delivered snapshot; no delivery transition is implemented."""
    inicial = ComandaSalida(
        id=1,
        mesa_id=7,
        estado="ABIERTA",
        fecha_hora=fake.reloj(),
        detalles=[
            {
                "producto_id": 12,
                "cantidad": 2,
                "precio_unitario": Decimal("10.00"),
                "descuento": Decimal("0.50"),
                "promocion_id": 3,
                "estado_entrega": "ENTREGADO",
            }
        ],
    )
    return ComandaFake(
        fake.mesas | {7: "OCUPADA"}, fake.catalogo, fake.reloj, comandas_iniciales=[inicial]
    )


def test_alta_ocupa_mesa_y_conserva_detalle(fake: ComandaFake) -> None:
    creada = fake.crear_comanda(pedido())
    assert (creada.id, creada.mesa_id, creada.estado, creada.detalles[0].cantidad) == (
        1,
        7,
        "ABIERTA",
        2,
    )
    assert fake.mesas[7] == "OCUPADA"
    assert fake.consultar_comanda(1).detalles[0].producto_id == 12


def test_alta_bloquea_otra_abierta_pero_permite_consultarla(fake: ComandaFake) -> None:
    primera = fake.crear_comanda(pedido())
    with pytest.raises(ReglaDeNegocioError, match="abierta"):
        fake.crear_comanda(pedido())
    pagina = fake.listar_comandas(mesa_id=7)
    assert (pagina.total, pagina.items[0].id, fake.consultar_comanda(primera.id).id) == (1, 1, 1)
    assert fake.mesas[7] == "OCUPADA"


def test_alta_mesa_inexistente_no_ocupa_otra(fake: ComandaFake) -> None:
    with pytest.raises(NoEncontradoError, match="mesa"):
        fake.crear_comanda(pedido(77))
    assert fake.mesas[7] == "LIBRE"
    assert fake.listar_comandas().total == 0


def test_alta_sin_reserva_no_crea_cliente(fake: ComandaFake) -> None:
    creada = fake.crear_comanda(pedido())
    assert creada.reserva_id is None
    assert "cliente" not in type(creada).model_fields


def test_alta_distingue_estados_de_comanda(fake: ComandaFake) -> None:
    creada = fake.crear_comanda(pedido())
    assert creada.estado is EstadoComanda.ABIERTA
    assert set(EstadoComanda) == {
        EstadoComanda.ABIERTA,
        EstadoComanda.CERRADA,
        EstadoComanda.ANULADA,
    }


def test_alta_fecha_estado_y_menu(fake: ComandaFake) -> None:
    creada = fake.crear_comanda(pedido(menu=True))
    assert creada.estado == "ABIERTA"
    assert creada.fecha_hora == datetime(2026, 10, 29, 12, 30, tzinfo=UTC)
    assert (creada.detalles[0].menu_ejecutivo_id, creada.detalles[0].precio_unitario) == (
        5,
        Decimal("20.25"),
    )


def test_alta_snapshot_no_cambia_con_catalogo(fake: ComandaFake) -> None:
    creada = fake.crear_comanda(pedido())
    fake.catalogo[("producto", 12)] = CatalogoValor(Decimal("99.00"), Decimal("1.00"), 8)
    guardado = fake.consultar_comanda(creada.id).detalles[0]
    assert (guardado.precio_unitario, guardado.descuento, guardado.promocion_id) == (
        Decimal("10.00"),
        Decimal("0.50"),
        3,
    )


def test_listado_vacio_y_filtro_sin_coincidencias(fake: ComandaFake) -> None:
    assert fake.listar_comandas().model_dump() == {
        "items": [],
        "total": 0,
        "limit": 50,
        "offset": 0,
    }
    fake.crear_comanda(pedido())
    assert fake.listar_comandas(mesa_id=9).model_dump() == {
        "items": [],
        "total": 0,
        "limit": 50,
        "offset": 0,
    }


def test_listado_abiertas_muestra_mesa_y_estado_sin_filtro_implicito(
    fake_entregada: ComandaFake,
) -> None:
    fake_entregada.cerrar_comanda(1)
    abierta = fake_entregada.crear_comanda(pedido(8))
    pagina = fake_entregada.listar_comandas()
    assert (pagina.total, pagina.limit, pagina.offset) == (2, 50, 0)
    assert [(c.id, c.mesa_id, c.estado) for c in pagina.items] == [
        (abierta.id, 8, EstadoComanda.ABIERTA),
        (1, 7, EstadoComanda.CERRADA),
    ]
    assert [(c.id, c.mesa_id) for c in fake_entregada.listar_comandas(estado="ABIERTA").items] == [
        (abierta.id, 8)
    ]


def test_listado_filtra_mesa_sin_confundir_numero_de_sector(fake: ComandaFake) -> None:
    numero = 4
    mesas_por_sector = {(1, numero): 7, (2, numero): 8}
    primera = fake.crear_comanda(pedido(mesas_por_sector[(1, numero)]))
    segunda = fake.crear_comanda(pedido(mesas_por_sector[(2, numero)]))

    pagina_primera = fake.listar_comandas(mesa_id=mesas_por_sector[(1, numero)])
    pagina_segunda = fake.listar_comandas(mesa_id=mesas_por_sector[(2, numero)])

    assert (pagina_primera.total, [(c.id, c.mesa_id) for c in pagina_primera.items]) == (
        1,
        [(primera.id, 7)],
    )
    assert (pagina_segunda.total, [(c.id, c.mesa_id) for c in pagina_segunda.items]) == (
        1,
        [(segunda.id, 8)],
    )


def test_listado_fecha_desc_y_desempate_id_desc(fake: ComandaFake) -> None:
    fake.crear_comanda(pedido(7))
    fake.crear_comanda(pedido(8))
    fake.crear_comanda(pedido(9))
    pagina = fake.listar_comandas(ParametrosPaginacion(limit=2, offset=1))
    assert (pagina.total, [c.id for c in pagina.items], pagina.limit, pagina.offset) == (
        3,
        [2, 1],
        2,
        1,
    )
    fuera = fake.listar_comandas(ParametrosPaginacion(offset=10))
    assert (fuera.total, fuera.items, fuera.limit, fuera.offset) == (3, [], 50, 10)


def test_listado_filtro_estado_cerrada(fake_entregada: ComandaFake) -> None:
    fake_entregada.crear_comanda(pedido(8))
    fake_entregada.cerrar_comanda(1)
    assert [c.id for c in fake_entregada.listar_comandas(estado="CERRADA").items] == [1]


@pytest.mark.parametrize("limit,offset", [(0, 0), (101, 0), (1, -1)])
def test_listado_paginacion_invalida(limit: int, offset: int) -> None:
    with pytest.raises(ValidationError):
        ParametrosPaginacion(limit=limit, offset=offset)


def test_cierre_entregada_permite_consulta_para_facturacion(fake_entregada: ComandaFake) -> None:
    cerrada = fake_entregada.cerrar_comanda(1)
    assert (cerrada.estado, fake_entregada.consultar_comanda(1).estado) == ("CERRADA", "CERRADA")
    assert [c.id for c in fake_entregada.listar_comandas(estado="CERRADA").items] == [1]
    assert cerrada.detalles[0].estado_entrega == "ENTREGADO"
    assert cerrada.detalles[0].precio_unitario == Decimal("10.00")
    assert fake_entregada.mesas[7] == "OCUPADA"  # Closing does not free a mesa.


def test_cierre_pendientes_bloquea_sin_entregar(fake: ComandaFake) -> None:
    abierta = fake.crear_comanda(pedido())
    with pytest.raises(ReglaDeNegocioError, match="pendientes"):
        fake.cerrar_comanda(abierta.id)
    consultada = fake.consultar_comanda(abierta.id)
    assert (consultada.estado, consultada.detalles[0].estado_entrega) == ("ABIERTA", "PENDIENTE")


def test_cierre_segundo_intento_no_muta(fake_entregada: ComandaFake) -> None:
    primera = fake_entregada.cerrar_comanda(1).model_dump()
    with pytest.raises(ReglaDeNegocioError, match="abierta"):
        fake_entregada.cerrar_comanda(1)
    assert fake_entregada.consultar_comanda(1).model_dump() == primera


def test_cierre_inexistente_informa_error(fake: ComandaFake) -> None:
    with pytest.raises(NoEncontradoError, match="comanda"):
        fake.cerrar_comanda(99)
    assert fake.listar_comandas().total == 0


@pytest.fixture
def fake_reserva(fake: ComandaFake) -> ComandaFake:
    reserva = ReservaFake(mesa_id=8, fecha=date(2026, 10, 29))
    return ComandaFake(fake.mesas, fake.catalogo, fake.reloj, reservas={5: reserva})


def test_reserva_activa_confirmada_crea_en_mesa_heredada(fake_reserva: ComandaFake) -> None:
    assert fake_reserva.listar_comandas().total == 0  # Booking itself creates no empty order.
    creada = fake_reserva.crear_desde_reserva(5, pedido().detalles)
    assert (creada.mesa_id, creada.reserva_id, creada.estado) == (8, 5, "ABIERTA")
    assert (fake_reserva.reservas[5].estado, fake_reserva.reservas[5].comanda_id) == (
        "ATENDIDA",
        creada.id,
    )
    assert fake_reserva.mesas[8] == "OCUPADA"


def test_reserva_vinculada_no_agrega_cliente_propio(fake_reserva: ComandaFake) -> None:
    creada = fake_reserva.crear_desde_reserva(5, pedido().detalles)
    assert creada.reserva_id == 5
    assert "cliente" not in creada.model_dump()
    assert fake_reserva.consultar_comanda(creada.id).reserva_id == 5


def test_reserva_activa_admite_producto_y_menu_en_mismo_pedido(fake_reserva: ComandaFake) -> None:
    detalles = [
        DetalleComandaCrear(producto_id=12, cantidad=2),
        DetalleComandaCrear(menu_ejecutivo_id=5, cantidad=1),
    ]
    creada = fake_reserva.crear_desde_reserva(5, detalles)
    assert (creada.estado, creada.mesa_id, creada.reserva_id) == ("ABIERTA", 8, 5)
    assert (fake_reserva.reservas[5].estado, fake_reserva.reservas[5].comanda_id) == (
        "ATENDIDA",
        creada.id,
    )
    assert [(d.producto_id, d.menu_ejecutivo_id, d.cantidad) for d in creada.detalles] == [
        (12, None, 2),
        (None, 5, 1),
    ]
    assert fake_reserva.consultar_comanda(creada.id).detalles == creada.detalles


@pytest.mark.parametrize("estado", ["CANCELADA", "ATENDIDA"])
def test_reserva_no_activa_no_crea(fake_reserva: ComandaFake, estado: str) -> None:
    fake_reserva.reservas[5].estado = estado
    with pytest.raises(ReglaDeNegocioError, match="reserva"):
        fake_reserva.crear_desde_reserva(5, pedido().detalles)
    assert fake_reserva.listar_comandas().total == 0
    assert fake_reserva.mesas[8] == "LIBRE"


def test_reserva_otra_fecha_no_crea(fake_reserva: ComandaFake) -> None:
    fake_reserva.reservas[5].fecha = date(2026, 10, 30)
    with pytest.raises(ReglaDeNegocioError, match="fecha"):
        fake_reserva.crear_desde_reserva(5, pedido().detalles)
    assert fake_reserva.reservas[5].estado == "ACTIVA"
    assert fake_reserva.listar_comandas().total == 0


def test_reserva_sin_productos_o_cantidad_invalida_no_muta(fake_reserva: ComandaFake) -> None:
    with pytest.raises(DatosInvalidosError, match="producto"):
        fake_reserva.crear_desde_reserva(5, [])
    with pytest.raises(DatosInvalidosError, match="producto"):
        fake_reserva.crear_desde_reserva(5, [DetalleComandaCrear(menu_ejecutivo_id=5, cantidad=1)])
    with pytest.raises(ValidationError):
        DetalleComandaCrear(producto_id=12, cantidad=0)
    assert (fake_reserva.reservas[5].estado, fake_reserva.listar_comandas().total) == ("ACTIVA", 0)


def test_aislamiento_reconstruccion_y_copias(fake: ComandaFake) -> None:
    otra = ComandaFake(fake.mesas, fake.catalogo, fake.reloj)
    creada = fake.crear_comanda(pedido())
    creada.detalles[0].cantidad = 99
    consultada = fake.consultar_comanda(1)
    consultada.detalles[0].cantidad = 50
    assert fake.consultar_comanda(1).detalles[0].cantidad == 2
    assert (otra.listar_comandas().total, otra.mesas[7]) == (0, "LIBRE")
    assert otra.crear_comanda(pedido()).id == 1


def test_aislamiento_ciclo_completo_con_pendiente_y_contexto_nuevo(
    fake_entregada: ComandaFake,
) -> None:
    otra = ComandaFake(
        fake_entregada.mesas,
        fake_entregada.catalogo,
        fake_entregada.reloj,
        comandas_iniciales=[fake_entregada.consultar_comanda(1)],
    )
    pendiente = fake_entregada.crear_comanda(pedido(8))
    assert (pendiente.estado, fake_entregada.consultar_comanda(pendiente.id).estado) == (
        "ABIERTA",
        "ABIERTA",
    )
    assert [c.id for c in fake_entregada.listar_comandas().items] == [2, 1]
    with pytest.raises(ReglaDeNegocioError, match="pendientes"):
        fake_entregada.cerrar_comanda(pendiente.id)
    assert fake_entregada.cerrar_comanda(1).estado == "CERRADA"
    assert fake_entregada.consultar_comanda(pendiente.id).estado == "ABIERTA"
    assert (otra.listar_comandas().total, otra.consultar_comanda(1).estado) == (1, "ABIERTA")


def test_aislamiento_reserva_no_filtra_cambios_entre_contextos(fake_reserva: ComandaFake) -> None:
    otra = ComandaFake(
        fake_reserva.mesas,
        fake_reserva.catalogo,
        fake_reserva.reloj,
        reservas=fake_reserva.reservas,
    )
    fake_reserva.crear_desde_reserva(5, pedido().detalles)
    assert (otra.reservas[5].estado, otra.mesas[8], otra.listar_comandas().total) == (
        "ACTIVA",
        "LIBRE",
        0,
    )


def test_aislamiento_catalogo_faltante_no_muta_estado(fake: ComandaFake) -> None:
    datos = ComandaCrear(
        mesa_id=7,
        detalles=[
            {"producto_id": 12, "cantidad": 1},
            {"producto_id": 99, "cantidad": 1},
        ],
    )
    with pytest.raises(NoEncontradoError, match="producto"):
        fake.crear_comanda(datos)
    assert (fake.mesas[7], fake.listar_comandas().total) == ("LIBRE", 0)


def test_aislamiento_reserva_catalogo_faltante_no_muta_estado(fake_reserva: ComandaFake) -> None:
    detalles = [DetalleComandaCrear(producto_id=99, cantidad=1)]
    with pytest.raises(NoEncontradoError, match="producto"):
        fake_reserva.crear_desde_reserva(5, detalles)
    assert (
        fake_reserva.reservas[5].estado,
        fake_reserva.mesas[8],
        fake_reserva.listar_comandas().total,
    ) == ("ACTIVA", "LIBRE", 0)


def test_aislamiento_comanda_no_existe(fake: ComandaFake) -> None:
    with pytest.raises(NoEncontradoError, match="comanda"):
        fake.consultar_comanda(8)
    assert fake.listar_comandas().total == 0


def test_aislamiento_fecha_mas_reciente_primero(fake: ComandaFake) -> None:
    fake.crear_comanda(pedido(7))
    fake.reloj = lambda: datetime(2026, 10, 30, 13, 0, tzinfo=UTC)
    fake.crear_comanda(pedido(8))
    assert [c.id for c in fake.listar_comandas().items] == [2, 1]


def test_aislamiento_objeto_de_entrada_alterado_no_crea(fake: ComandaFake) -> None:
    datos = pedido()
    datos.detalles[0].cantidad = 0
    with pytest.raises(ValidationError):
        fake.crear_comanda(datos)
    assert (fake.mesas[7], fake.listar_comandas().total) == ("LIBRE", 0)


def test_aislamiento_reserva_entrada_alterada_no_crea(fake_reserva: ComandaFake) -> None:
    detalles = pedido().detalles
    detalles[0].cantidad = 0
    with pytest.raises(ValidationError):
        fake_reserva.crear_desde_reserva(5, detalles)
    assert (fake_reserva.reservas[5].estado, fake_reserva.listar_comandas().total) == ("ACTIVA", 0)


def test_aislamiento_pedido_vaciado_antes_de_crear_no_muta(fake: ComandaFake) -> None:
    datos = pedido()
    datos.detalles.clear()
    with pytest.raises(DatosInvalidosError, match="detalle"):
        fake.crear_comanda(datos)
    assert (fake.mesas[7], fake.listar_comandas().total) == ("LIBRE", 0)


def test_alta_tras_cierre_conserva_historial(fake_entregada: ComandaFake) -> None:
    fake_entregada.cerrar_comanda(1)
    nueva = fake_entregada.crear_comanda(pedido(7))
    assert (nueva.id, [c.id for c in fake_entregada.listar_comandas(mesa_id=7).items]) == (
        2,
        [2, 1],
    )
