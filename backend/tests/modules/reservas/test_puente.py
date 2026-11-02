"""Pruebas del puente con Mesa y Cliente: lado Mesa real (M3) y lado Cliente stub (M4)."""

import ast
import importlib.util
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.modules.reservas import puente
from app.modules.salon import service as salon_service
from app.shared.models.enums import EstadoMesa

RAIZ_RESERVAS = Path(puente.__file__).parent
PAQUETE_RESERVAS = "app.modules.reservas"
SERVICE_DE_SALON = "app.modules.salon.service"


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


# S6 y S20: todo cliente con id positivo existe (el stub real, no el doble)
@pytest.mark.parametrize("cliente_id", [7, 456])
def test_existe_cliente_stub_acepta_id_positivo(db: Session, puente_real, cliente_id: int) -> None:
    assert puente.existe_cliente(db, cliente_id) is True


@pytest.mark.parametrize("cliente_id", [0, -1])
def test_existe_cliente_stub_rechaza_id_no_positivo(
    db: Session, puente_real, cliente_id: int
) -> None:
    assert puente.existe_cliente(db, cliente_id) is False


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


def test_solo_el_puente_importa_salon() -> None:
    archivos = sorted(RAIZ_RESERVAS.rglob("*.py"))
    assert RAIZ_RESERVAS / "puente.py" in archivos

    for archivo in archivos:
        modulos = _modulos_importados(archivo)
        de_salon = {modulo for modulo in modulos if _es_de(modulo, "app.modules.salon")}

        assert not any(_es_de(modulo, "app.modules.atencion") for modulo in modulos), archivo.name
        if archivo.name == "puente.py":
            assert all(_es_de(modulo, SERVICE_DE_SALON) for modulo in de_salon), de_salon
        else:
            assert not de_salon, f"{archivo.name} importa {sorted(de_salon)}"
