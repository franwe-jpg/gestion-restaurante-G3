"""Script de datos de demostracion: corre sobre la base temporal migrada con pocos dias."""

from collections.abc import Callable
from contextlib import nullcontext
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import crear_motor
from app.modules.atencion.models import Comanda
from app.modules.pagos.models import Factura
from app.modules.salon.models import Mesa
from app.modules.usuarios import service as usuarios_service
from app.modules.usuarios.models import Usuario
from app.shared.contratos.comanda import EstadoComanda
from app.shared.models.enums import EstadoMesa, Rol
from scripts import cargar_datos_demo

DIAS = 7  # el historial completo (91 dias) tarda unos segundos; la prueba usa una semana
TABLAS_DE_CADA_MODULO = (
    "usuarios",  # usuarios
    "productos",  # M1
    "secciones",
    "menus_ejecutivos",  # M2
    "promociones",
    "sectores",  # M3
    "mesas",
    "mozos",
    "chefs",
    "comandas",  # M4
    "detalles_comanda",
    "clientes",
    "reservas",  # M5
    "medios_pago",  # M6
    "facturas",
    "cobros",
)


@pytest.fixture
def ejecutar(db: Session, monkeypatch: pytest.MonkeyPatch) -> Callable[[], int]:
    """Corre `main` sobre la base de la prueba."""
    monkeypatch.setattr(cargar_datos_demo, "abrir_sesion", lambda: nullcontext(db))
    return lambda: cargar_datos_demo.main(["--dias", str(DIAS)])


@pytest.mark.parametrize(
    ("correo", "rol", "nombre"),
    [
        ("encargado@gmail.com", Rol.ENCARGADO, None),
        ("mozo@gmail.com", Rol.MOZO, "Martín"),
        ("chef@gmail.com", Rol.CHEF, "Laura"),
    ],
)
def test_main_crea_los_usuarios_obligatorios_que_inician_sesion(
    db: Session, ejecutar: Callable[[], int], correo: str, rol: Rol, nombre: str | None
) -> None:
    assert ejecutar() == 0

    sesion = usuarios_service.iniciar_sesion(db, correo, "Resto123!")

    assert sesion.usuario.roles == [rol]
    assert sesion.usuario.nombre == nombre  # mozo y chef vinculados a su usuario


def test_main_llena_las_tablas_principales_de_cada_modulo(
    db: Session, ejecutar: Callable[[], int]
) -> None:
    ejecutar()

    filas = cargar_datos_demo.contar_filas(db)

    assert {tabla: filas[tabla] for tabla in TABLAS_DE_CADA_MODULO if filas[tabla] == 0} == {}


def test_main_deja_comandas_abiertas_con_sus_mesas_ocupadas(
    db: Session, ejecutar: Callable[[], int]
) -> None:
    ejecutar()

    abiertas = db.scalars(select(Comanda).where(Comanda.estado == EstadoComanda.ABIERTA)).all()
    ocupadas = db.scalars(select(Mesa.id).where(Mesa.estado == EstadoMesa.OCUPADA)).all()

    assert len(abiertas) == cargar_datos_demo.COMANDAS_ABIERTAS
    assert sorted(comanda.mesa_id for comanda in abiertas) == sorted(ocupadas)


def test_main_factura_las_comandas_cerradas_con_su_total_y_sus_cobros(
    db: Session, ejecutar: Callable[[], int]
) -> None:
    ejecutar()

    for factura in db.scalars(select(Factura)).all():
        comanda = db.get(Comanda, factura.comanda_id)
        total = sum(
            (d.cantidad * d.precio_unitario - d.descuento for d in comanda.detalles), Decimal(0)
        )
        cobrado = sum((cobro.monto for cobro in factura.cobros), Decimal(0))
        assert comanda.estado == EstadoComanda.CERRADA
        assert factura.total == total
        assert factura.saldo_pendiente == factura.total - cobrado


def test_main_con_datos_avisa_y_no_cambia_nada(
    db: Session, ejecutar: Callable[[], int], capsys: pytest.CaptureFixture[str]
) -> None:
    ejecutar()
    antes = cargar_datos_demo.contar_filas(db)
    capsys.readouterr()

    codigo = ejecutar()

    assert codigo == 0
    assert "ya tiene datos" in capsys.readouterr().out
    assert cargar_datos_demo.contar_filas(db) == antes


def test_main_rechaza_menos_de_un_dia_de_historial() -> None:
    with pytest.raises(SystemExit) as salida:
        cargar_datos_demo.main(["--dias", "0"])

    assert salida.value.code != 0


@pytest.fixture
def base_en_archivo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """`DATABASE_URL` apunta a un archivo temporal que todavia no existe."""
    archivo = tmp_path / "demo.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{archivo}")
    get_settings.cache_clear()
    return archivo


def _correos(archivo: Path) -> set[str]:
    motor = crear_motor(f"sqlite:///{archivo}")
    with Session(motor) as sesion:
        correos = set(sesion.scalars(select(Usuario.correo)))
    motor.dispose()
    return correos


def test_main_reiniciar_crea_la_base_si_no_existe(base_en_archivo: Path) -> None:
    codigo = cargar_datos_demo.main(["--reiniciar", "--dias", "2"])

    assert codigo == 0
    assert "encargado@gmail.com" in _correos(base_en_archivo)


def test_main_reiniciar_reemplaza_los_datos_existentes(base_en_archivo: Path) -> None:
    cargar_datos_demo.main(["--reiniciar", "--dias", "2"])
    motor = crear_motor(f"sqlite:///{base_en_archivo}")
    with Session(motor) as sesion:
        usuarios_service.registrar_usuario(sesion, "viejo@resto.com", "Clave1234", Rol.MOZO)
        sesion.commit()
    motor.dispose()

    codigo = cargar_datos_demo.main(["--reiniciar", "--dias", "2"])

    correos = _correos(base_en_archivo)
    assert codigo == 0
    assert "viejo@resto.com" not in correos
    assert {"encargado@gmail.com", "mozo@gmail.com", "chef@gmail.com"} <= correos


@pytest.mark.parametrize(
    "url", ["sqlite:///:memory:", "sqlite://", "postgresql://usuario@localhost/restaurante"]
)
def test_main_reiniciar_rechaza_una_base_que_no_es_un_archivo_sqlite(
    url: str, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()

    codigo = cargar_datos_demo.main(["--reiniciar"])

    assert codigo != 0
    assert "solo admite una base SQLite en un archivo" in capsys.readouterr().err
