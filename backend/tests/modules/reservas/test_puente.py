"""Pruebas del puente con Mesa (M3), Cliente y Comanda (M4): los lados reales usan la base."""

import ast
import importlib.util
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.atencion import service as atencion_service
from app.modules.atencion.models import Cliente, Comanda

# Los esquemas y el service de productos se importan solo en las pruebas (como los de salon).
from app.modules.productos import service as productos_service
from app.modules.productos.schemas import PlatoCrear, SeccionCrear
from app.modules.reservas import puente
from app.modules.salon import service as salon_service
from app.shared.contratos.comanda import (
    ComandaSalida,
    DetalleComandaCrear,
    EstadoComanda,
    EstadoEntrega,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.models.enums import EstadoMesa
from app.shared.paginacion import ParametrosPaginacion

RAIZ_RESERVAS = Path(puente.__file__).parent
PAQUETE_RESERVAS = "app.modules.reservas"
SALON = "app.modules.salon"
ATENCION = "app.modules.atencion"
SERVICE_DE_SALON = "app.modules.salon.service"
SERVICE_DE_ATENCION = "app.modules.atencion.service"


# S33: el puente lee todas las paginas de M3, no solo la primera
def test_listar_mesas_lee_todas_las_paginas_de_m3(db: Session, puente_real, mesas_en_m3) -> None:
    mesas_en_m3(120)

    mesas = puente.listar_mesas(db)

    assert [mesa.numero for mesa in mesas] == list(range(1, 121))
    assert mesas[-1].id == 120


def test_obtener_mesa_encuentra_la_mesa_de_la_segunda_pagina(
    db: Session, puente_real, mesas_en_m3
) -> None:
    ultima = mesas_en_m3(120)[-1]

    mesa = puente.obtener_mesa(db, 120)

    assert mesa == puente.MesaReservable(
        id=120,
        numero=120,
        capacidad=4,
        sector=puente.SectorDeMesa(ultima.sector_id, "Salón"),
        estado=EstadoMesa.LIBRE,
    )


def test_obtener_mesa_inexistente_devuelve_none(db: Session, puente_real, mesas_en_m3) -> None:
    mesas_en_m3(3)

    assert puente.obtener_mesa(db, 999) is None


def test_listar_mesas_incluye_fuera_de_servicio_con_su_estado(
    db: Session, puente_real, mesas_en_m3
) -> None:
    mesas = mesas_en_m3(2)
    mesas[0].estado = EstadoMesa.FUERA_DE_SERVICIO
    db.commit()

    estados = [mesa.estado for mesa in puente.listar_mesas(db)]

    assert estados == [EstadoMesa.FUERA_DE_SERVICIO, EstadoMesa.LIBRE]


# Contrato: lo que obtener_mesa informa de una mesa coincide con lo que listar_mesas ofrece
def test_obtener_mesa_y_listar_mesas_coinciden(db: Session, puente_real, mesas_en_m3) -> None:
    mesas = mesas_en_m3(3)
    mesas[1].estado = EstadoMesa.OCUPADA
    mesas[2].estado = EstadoMesa.FUERA_DE_SERVICIO
    db.commit()

    listadas = puente.listar_mesas(db)

    assert len(listadas) == 3
    assert [puente.obtener_mesa(db, mesa.id) for mesa in listadas] == listadas


# S33: si M3 falla en cualquier pagina, falla todo y no hay lista parcial
def test_listar_mesas_propaga_el_error_de_m3_en_la_segunda_pagina(
    db: Session, puente_real, mesas_en_m3, m3_falla_desde_la_segunda_pagina
) -> None:
    mesas_en_m3(120)

    with pytest.raises(RuntimeError, match="falla simulada de M3"):
        puente.listar_mesas(db)


def test_obtener_mesa_propaga_el_error_de_m3_en_la_segunda_pagina(
    db: Session, puente_real, mesas_en_m3, m3_falla_desde_la_segunda_pagina
) -> None:
    mesas_en_m3(120)

    # La mesa 5 esta en la primera pagina, pero el puente igual lee todas antes de responder.
    with pytest.raises(RuntimeError, match="falla simulada de M3"):
        puente.obtener_mesa(db, 5)


# Decision 14, corte del ciclo: una pagina vacia antes del total no deja el ciclo sin fin
def test_listar_mesas_termina_si_m3_devuelve_una_pagina_vacia_antes_del_total(
    db: Session, puente_real, mesas_en_m3, monkeypatch: pytest.MonkeyPatch
) -> None:
    mesas_en_m3(2)
    original = salon_service.listar_mesas
    offsets: list[int] = []

    def envoltura(db: Session, parametros):
        offsets.append(parametros.offset)
        assert len(offsets) <= 3, "el ciclo no termina"
        pagina = original(db, parametros)
        # M3 dice que hay 5 mesas, pero a partir de la tercera no devuelve ninguna
        restantes = pagina.items[: 2 - parametros.offset]
        return pagina.model_copy(update={"total": 5, "items": restantes})

    monkeypatch.setattr(salon_service, "listar_mesas", envoltura)

    mesas = puente.listar_mesas(db)

    assert [mesa.numero for mesa in mesas] == [1, 2]
    assert offsets == [0, 2]


# Contrato del doble: obtener_mesa y listar_mesas coinciden en el estado de cada mesa
def test_doble_puente_informa_el_mismo_estado_en_obtener_mesa_y_listar_mesas(
    db: Session, puente_doble
) -> None:
    puente_doble.poner(6, estado=EstadoMesa.FUERA_DE_SERVICIO)

    listada = next(mesa for mesa in puente.listar_mesas(db) if mesa.id == 6)

    assert puente.obtener_mesa(db, 6) == listada
    assert listada.estado == EstadoMesa.FUERA_DE_SERVICIO


# --- HU-M5-06: contrato del doble de la primitiva que crea la comanda de una reserva ---

LINEAS = [
    DetalleComandaCrear(producto_id=12, cantidad=2),
    DetalleComandaCrear(menu_ejecutivo_id=5, cantidad=1),
]


def test_doble_puente_crear_comanda_de_reserva_devuelve_una_comanda_abierta_y_registra_la_llamada(
    db: Session, puente_doble
) -> None:
    primera = puente.crear_comanda_de_reserva(db, 5, 10, 31, LINEAS, "Sin sal")
    segunda = puente.crear_comanda_de_reserva(db, 6, 11, 32, LINEAS[:1], None)

    assert isinstance(primera, ComandaSalida)
    assert [primera.id, segunda.id] == [1, 2]  # ids consecutivos desde 1
    assert primera.estado == EstadoComanda.ABIERTA
    assert (primera.mesa_id, primera.reserva_id, primera.observaciones) == (5, 10, "Sin sal")
    assert (segunda.mesa_id, segunda.reserva_id, segunda.observaciones) == (6, 11, None)
    assert (primera.mozo_id, segunda.mozo_id) == (31, 32)
    # un detalle por linea, en el mismo orden, con los importes y el estado del doble (D8)
    assert [(d.producto_id, d.menu_ejecutivo_id, d.cantidad) for d in primera.detalles] == [
        (12, None, 2),
        (None, 5, 1),
    ]
    for detalle in primera.detalles:
        assert detalle.precio_unitario == Decimal("100.00")
        assert detalle.descuento == Decimal("0.00")
        assert detalle.estado_entrega == EstadoEntrega.PENDIENTE
    assert puente_doble.comandas == [(5, 10, LINEAS, "Sin sal"), (6, 11, LINEAS[:1], None)]
    assert puente_doble.mozos_asignados == [31, 32]


def test_doble_puente_crear_comanda_de_reserva_lanza_la_falla_y_no_registra_la_llamada(
    db: Session, puente_doble
) -> None:
    puente_doble.falla = ReglaDeNegocioError("La mesa 5 no está libre")

    with pytest.raises(ReglaDeNegocioError, match="La mesa 5 no está libre"):
        puente.crear_comanda_de_reserva(db, 5, 10, 31, LINEAS, None)

    assert puente_doble.comandas == []


def test_doble_puente_crear_comanda_de_reserva_ejecuta_el_efecto_antes_de_fallar(
    db: Session, puente_doble
) -> None:
    sesiones = []
    puente_doble.efecto = sesiones.append  # el efecto recibe la sesion de quien llama
    puente_doble.falla = ReglaDeNegocioError("La mesa 5 no está libre")

    with pytest.raises(ReglaDeNegocioError):
        puente.crear_comanda_de_reserva(db, 5, 10, 31, LINEAS, None)

    assert sesiones == [db]
    assert puente_doble.comandas == []


# S39 y S20: con el puente real, un cliente existe si M4 lo tiene
def test_existe_cliente_real_conoce_al_cliente_de_m4(
    db: Session, puente_real, cliente_en_m4: int
) -> None:
    assert puente.existe_cliente(db, cliente_en_m4) is True


@pytest.mark.parametrize("cliente_id", [456, 0])
def test_existe_cliente_real_rechaza_al_que_m4_no_conoce(
    db: Session, puente_real, cliente_en_m4: int, cliente_id: int
) -> None:
    assert puente.existe_cliente(db, cliente_id) is False


# S41: el cliente nuevo queda en M4 una vez que quien llama confirma la transaccion
def test_registrar_cliente_real_devuelve_el_id_y_queda_en_m4(db: Session, puente_real) -> None:
    cliente_id = puente.registrar_cliente(db, "Luis Gómez", "+54 280 1234567")
    db.commit()

    assert cliente_id > 0
    assert atencion_service.existe_cliente(db, cliente_id) is True
    pagina = atencion_service.listar_clientes(db, ParametrosPaginacion(), "Luis")
    assert [(c.id, c.nombre) for c in pagina.items] == [(cliente_id, "Luis Gómez")]


# S42 y Decision 31: M4 rechaza los datos y el mensaje nombra el campo
@pytest.mark.parametrize(
    "nombre, telefono, campo", [("Luis3", "123", "nombre:"), ("Luis", "abc", "telefono:")]
)
def test_registrar_cliente_real_propaga_el_rechazo_de_m4(
    db: Session, puente_real, nombre: str, telefono: str, campo: str
) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        puente.registrar_cliente(db, nombre, telefono)

    assert campo in str(error.value)
    assert not db.new
    assert db.scalars(select(Cliente)).all() == []


# --- HU-M5-06: la comanda de una reserva con el puente real, sin doble (M4, M3 y M1) ---

RESERVA_ID = 10


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


# Decision 53: el puente arma el pedido de M4 con la mesa y pasa el vinculo con la reserva aparte
def test_crear_comanda_de_reserva_real_arma_la_comanda_con_la_mesa_y_el_vinculo(
    db: Session, puente_real, mesas_en_m3, mozo_habilitado_en_m3
) -> None:
    mesa = mesas_en_m3(1)[0]
    producto_id = _sembrar_producto_habilitado(db)
    lineas = [DetalleComandaCrear(producto_id=producto_id, cantidad=2)]

    salida = puente.crear_comanda_de_reserva(
        db, mesa.id, RESERVA_ID, mozo_habilitado_en_m3, lineas, "Sin sal"
    )
    db.commit()
    db.expire_all()

    assert isinstance(salida, ComandaSalida)
    assert (salida.mesa_id, salida.reserva_id, salida.mozo_id) == (
        mesa.id,
        RESERVA_ID,
        mozo_habilitado_en_m3,
    )
    assert salida.estado == EstadoComanda.ABIERTA
    assert [(d.producto_id, d.cantidad) for d in salida.detalles] == [(producto_id, 2)]
    guardada = db.get(Comanda, salida.id)
    assert (guardada.mesa_id, guardada.reserva_id) == (mesa.id, RESERVA_ID)
    assert guardada.observaciones == "Sin sal"
    assert salon_service.obtener_mesa(db, mesa.id).estado == EstadoMesa.OCUPADA


# Decision 53: el puente no confirma; quien llama decide el commit o el rollback
def test_crear_comanda_de_reserva_real_no_confirma(
    db: Session, puente_real, mesas_en_m3, mozo_habilitado_en_m3
) -> None:
    mesa = mesas_en_m3(1)[0]
    producto_id = _sembrar_producto_habilitado(db)

    puente.crear_comanda_de_reserva(
        db,
        mesa.id,
        RESERVA_ID,
        mozo_habilitado_en_m3,
        [DetalleComandaCrear(producto_id=producto_id, cantidad=1)],
        None,
    )
    db.rollback()

    assert db.scalars(select(Comanda)).all() == []
    assert salon_service.obtener_mesa(db, mesa.id).estado == EstadoMesa.LIBRE


# Los errores de M4 suben tal cual, sin traducir ni escribir nada
def test_crear_comanda_de_reserva_real_propaga_el_error_de_m4(
    db: Session, puente_real, mesas_en_m3, mozo_habilitado_en_m3
) -> None:
    mesa = mesas_en_m3(1)[0]

    with pytest.raises(NoEncontradoError, match="El producto 999 no existe"):
        puente.crear_comanda_de_reserva(
            db,
            mesa.id,
            RESERVA_ID,
            mozo_habilitado_en_m3,
            [DetalleComandaCrear(producto_id=999, cantidad=1)],
            None,
        )

    assert not db.new
    assert db.scalars(select(Comanda)).all() == []
    assert salon_service.obtener_mesa(db, mesa.id).estado == EstadoMesa.LIBRE


# --- Contratos de importacion (RNF-MAN-09): lint-imports no puede decir "solo desde el puente" ---


def _modulos_importados(archivo: Path) -> set[str]:
    """Modulos que importa el archivo; `from paquete import x` cuenta como `paquete.x`."""
    modulos: set[str] = set()
    for nodo in ast.walk(ast.parse(archivo.read_text(encoding="utf-8"))):
        if isinstance(nodo, ast.Import):
            modulos.update(alias.name for alias in nodo.names)
        elif isinstance(nodo, ast.ImportFrom):
            nombre = "." * nodo.level + (nodo.module or "")
            origen = importlib.util.resolve_name(nombre, PAQUETE_RESERVAS)
            modulos.update(f"{origen}.{alias.name}" for alias in nodo.names)
    return modulos


def _es_de(modulo: str, paquete: str) -> bool:
    return modulo == paquete or modulo.startswith(f"{paquete}.")


def test_solo_el_puente_importa_salon_y_atencion() -> None:
    archivos = sorted(RAIZ_RESERVAS.rglob("*.py"))
    assert RAIZ_RESERVAS / "puente.py" in archivos

    for archivo in archivos:
        modulos = _modulos_importados(archivo)
        for paquete, service in ((SALON, SERVICE_DE_SALON), (ATENCION, SERVICE_DE_ATENCION)):
            de_otro_modulo = {modulo for modulo in modulos if _es_de(modulo, paquete)}
            if archivo.name == "puente.py":
                assert all(_es_de(modulo, service) for modulo in de_otro_modulo), de_otro_modulo
            else:
                assert not de_otro_modulo, f"{archivo.name} importa {sorted(de_otro_modulo)}"
