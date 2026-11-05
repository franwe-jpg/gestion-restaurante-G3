"""Pruebas del service de promociones (HU-M2-07)."""

from datetime import date, time
from decimal import Decimal

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.modules.menus import service
from app.modules.menus.models import DiaSemana, Promocion, TipoPromocion
from app.modules.menus.schemas import FiltroPromociones, PromocionCrear, PromocionModificar
from app.shared.excepciones import NoEncontradoError, ReglaDeNegocioError
from app.shared.models import Categoria, Estado


def _datos(producto_ids: list[int], **cambios: object) -> PromocionCrear:
    base = {
        "nombre": "Happy hour",
        "tipo": "PORCENTAJE",
        "descripcion": "Descuento de tarde",
        "producto_ids": producto_ids,
        "fecha_desde": date(2026, 11, 1),
        "fecha_hasta": date(2026, 11, 30),
        "dias_semana": ["LUNES", "MARTES"],
        "hora_desde": time(17, 0),
        "hora_hasta": time(20, 30),
        "descuento_porcentaje": 15,
    }
    return PromocionCrear.model_validate(base | cambios)


def test_crear_promocion_porcentaje_asocia_productos(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto_1 = fabrica_producto(seccion, nombre="Milanesa")
    producto_2 = fabrica_producto(seccion, nombre="Papas")

    salida = service.crear_promocion(db, _datos([producto_1.id, producto_2.id]))

    assert salida.id > 0
    assert salida.estado == Estado.HABILITADO
    assert salida.tipo == TipoPromocion.PORCENTAJE
    assert salida.dias_semana == [DiaSemana.LUNES, DiaSemana.MARTES]
    assert [producto.id for producto in salida.productos] == [producto_1.id, producto_2.id]
    guardada = db.scalar(select(Promocion))
    assert guardada is not None
    assert guardada.descuento_porcentaje == 15


def test_crear_promocion_precio_fijo(db: Session, fabrica_seccion, fabrica_producto) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)

    salida = service.crear_promocion(
        db,
        _datos(
            [producto.id],
            tipo="PRECIO_FIJO",
            descuento_porcentaje=None,
            precio_fijo=Decimal("1200.00"),
        ),
    )

    assert salida.tipo == TipoPromocion.PRECIO_FIJO
    assert salida.precio_fijo == Decimal("1200.00")
    assert salida.descuento_porcentaje is None


def test_crear_promocion_nxm(db: Session, fabrica_seccion, fabrica_producto) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)

    salida = service.crear_promocion(
        db,
        _datos(
            [producto.id],
            tipo="NXM",
            descuento_porcentaje=None,
            cant_lleva=2,
            cant_paga=1,
        ),
    )

    assert salida.tipo == TipoPromocion.NXM
    assert (salida.cant_lleva, salida.cant_paga) == (2, 1)


def test_crear_promocion_permite_menu_del_dia(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion, categoria=Categoria.MENU_DEL_DIA)

    salida = service.crear_promocion(db, _datos([producto.id]))

    assert [item.id for item in salida.productos] == [producto.id]


def test_crear_promocion_con_nombre_repetido_lanza_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    service.crear_promocion(db, _datos([producto.id]))

    with pytest.raises(ReglaDeNegocioError, match="ya existe"):
        service.crear_promocion(db, _datos([producto.id], nombre="  HAPPY HOUR "))


def test_crear_promocion_con_producto_inexistente_lanza_no_encontrado(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)

    with pytest.raises(NoEncontradoError, match="no existe"):
        service.crear_promocion(db, _datos([producto.id, 9999]))


def test_crear_promocion_con_producto_deshabilitado_lanza_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion, estado=Estado.DESHABILITADO)

    with pytest.raises(ReglaDeNegocioError, match="habilitados"):
        service.crear_promocion(db, _datos([producto.id]))


def test_crear_promocion_no_guarda_nada_si_falla(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)

    with pytest.raises(NoEncontradoError):
        service.crear_promocion(db, _datos([producto.id, 9999]))

    assert db.scalars(select(Promocion)).all() == []


def test_listar_promociones_paginadas(db: Session, fabrica_seccion, fabrica_producto) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    service.crear_promocion(db, _datos([producto.id], nombre="Zeta"))
    service.crear_promocion(db, _datos([producto.id], nombre="Alfa"))

    pagina = service.listar_promociones(db, FiltroPromociones())

    assert pagina.total == 2
    assert [promocion.nombre for promocion in pagina.items] == ["Alfa", "Zeta"]


def _modificacion(producto_ids: list[int], **cambios: object) -> PromocionModificar:
    return PromocionModificar.model_validate(_datos(producto_ids, **cambios).model_dump())


def test_modificar_promocion_reemplaza_datos_y_productos(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto_1 = fabrica_producto(seccion, nombre="Milanesa")
    producto_2 = fabrica_producto(seccion, nombre="Papas")
    creada = service.crear_promocion(db, _datos([producto_1.id]))

    salida = service.modificar_promocion(
        db,
        creada.id,
        _modificacion(
            [producto_2.id],
            nombre="Noche de papas",
            tipo="NXM",
            descripcion=None,
            fecha_desde=date(2026, 12, 1),
            fecha_hasta=date(2026, 12, 15),
            dias_semana=["VIERNES"],
            hora_desde=None,
            hora_hasta=None,
            descuento_porcentaje=None,
            cant_lleva=3,
            cant_paga=1,
        ),
    )

    assert salida.nombre == "Noche de papas"
    assert salida.tipo == TipoPromocion.NXM
    assert salida.fecha_desde == date(2026, 12, 1)
    assert salida.hora_desde is None
    assert salida.descuento_porcentaje is None
    assert (salida.cant_lleva, salida.cant_paga) == (3, 1)
    assert [producto.id for producto in salida.productos] == [producto_2.id]


def test_modificar_promocion_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="no existe"):
        service.modificar_promocion(db, 9999, _modificacion([1]))


def test_modificar_promocion_finalizada_lanza_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id]))
    promocion = db.get(Promocion, creada.id)
    promocion.estado = Estado.DESHABILITADO
    db.commit()

    with pytest.raises(ReglaDeNegocioError, match="finalizada"):
        service.modificar_promocion(db, creada.id, _modificacion([producto.id]))


def test_modificar_promocion_aplicada_lanza_conflicto(
    db: Session, fabrica_seccion, fabrica_producto, monkeypatch: pytest.MonkeyPatch
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id]))
    monkeypatch.setattr(
        "app.modules.menus.service.atencion_service.promocion_fue_aplicada",
        lambda _db, _id: True,
    )

    with pytest.raises(ReglaDeNegocioError, match="aplicada"):
        service.modificar_promocion(db, creada.id, _modificacion([producto.id]))


def test_modificar_promocion_con_nombre_repetido_lanza_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    service.crear_promocion(db, _datos([producto.id], nombre="Happy hour"))
    segunda = service.crear_promocion(db, _datos([producto.id], nombre="Noche"))

    with pytest.raises(ReglaDeNegocioError, match="ya existe"):
        service.modificar_promocion(
            db, segunda.id, _modificacion([producto.id], nombre="  HAPPY HOUR ")
        )


def test_modificar_promocion_conserva_su_mismo_nombre(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id], nombre="Happy hour"))

    salida = service.modificar_promocion(
        db, creada.id, _modificacion([producto.id], nombre="HAPPY HOUR")
    )

    assert salida.nombre == "HAPPY HOUR"


def test_modificar_promocion_no_guarda_si_falla(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id], nombre="Original"))

    with pytest.raises(NoEncontradoError):
        service.modificar_promocion(
            db, creada.id, _modificacion([producto.id, 9999], nombre="Cambiada")
        )

    db.expire_all()
    assert db.get(Promocion, creada.id).nombre == "Original"


def test_finalizar_promocion_cambia_estado_y_registra_instante(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id]))

    salida = service.finalizar_promocion(db, creada.id)

    assert salida.estado == Estado.DESHABILITADO
    assert salida.fecha_hora_finalizacion is not None
    db.expire_all()
    guardada = db.get(Promocion, creada.id)
    assert guardada.estado == Estado.DESHABILITADO
    assert guardada.fecha_hora_finalizacion is not None


def test_finalizar_promocion_ya_finalizada_lanza_conflicto(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id]))
    service.finalizar_promocion(db, creada.id)

    with pytest.raises(ReglaDeNegocioError, match="finalizada"):
        service.finalizar_promocion(db, creada.id)


def test_finalizar_promocion_inexistente_lanza_no_encontrado(db: Session) -> None:
    with pytest.raises(NoEncontradoError, match="no existe"):
        service.finalizar_promocion(db, 9999)


def test_finalizar_promocion_no_toca_importes_historicos(
    db: Session, fabrica_seccion, fabrica_producto
) -> None:
    seccion = fabrica_seccion()
    producto = fabrica_producto(seccion)
    creada = service.crear_promocion(db, _datos([producto.id]))
    db.execute(
        text(
            "INSERT INTO sectores (id, nombre, nombre_normalizado, estado) "
            "VALUES (1, 'Sala', 'sala', 'HABILITADO')"
        )
    )
    db.execute(
        text(
            "INSERT INTO mesas (id, numero, capacidad, sector_id, estado) "
            "VALUES (1, 1, 4, 1, 'LIBRE')"
        )
    )
    db.execute(
        text(
            "INSERT INTO comandas (id, mesa_id, estado, fecha_hora) "
            "VALUES (1, 1, 'CERRADA', '2026-11-01T12:00:00+00:00')"
        )
    )
    db.execute(
        text(
            "INSERT INTO detalles_comanda "
            "(id, comanda_id, producto_id, cantidad, cantidad_entregada, estado_entrega, "
            "precio_unitario, descuento, promocion_id) "
            "VALUES (1, 1, :producto_id, 2, 2, 'ENTREGADO', 100.00, 20.00, :promocion_id)"
        ),
        {"producto_id": producto.id, "promocion_id": creada.id},
    )
    db.commit()

    service.finalizar_promocion(db, creada.id)

    fila = db.execute(
        text("SELECT precio_unitario, descuento FROM detalles_comanda WHERE id = 1")
    ).one()
    assert fila == (Decimal("100.00"), Decimal("20.00"))
