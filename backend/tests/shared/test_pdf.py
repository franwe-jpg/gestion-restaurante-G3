"""Pruebas del ayudante de PDF compartido (HU-M1-15)."""

from datetime import datetime

from app.shared.pdf import DocumentoPdf, TablaPdf, normalizar_texto, renderizar

GENERADO = datetime(2026, 11, 6, 10, 30)


def _documento(tablas: list[TablaPdf] | None = None) -> DocumentoPdf:
    return DocumentoPdf(
        titulo="Reporte de prueba",
        periodo="Del 2026-11-01 al 2026-11-05",
        generado=GENERADO,
        parrafos=["Ñoquis y más."],
        tablas=tablas or [],
    )


def test_normalizar_texto_reemplaza_tipografia_fuera_de_latin1() -> None:
    assert normalizar_texto("’") == "'"
    assert normalizar_texto("“a”") == '"a"'
    assert normalizar_texto("a—b–c−d") == "a-b-c-d"


def test_normalizar_texto_cambia_por_interrogacion_lo_no_representable() -> None:
    assert normalizar_texto("日本") == "??"


def test_normalizar_texto_conserva_los_caracteres_latin1() -> None:
    texto = "áñü¿¡«»"

    assert normalizar_texto(texto) == texto


def test_renderizar_devuelve_un_pdf_con_el_texto_en_latin1() -> None:
    contenido = renderizar(_documento(), comprimir=False)

    assert contenido.startswith(b"%PDF-")
    assert "Ñoquis".encode("latin-1") in contenido
    assert "Reporte de prueba".encode("latin-1") in contenido


def test_renderizar_comprime_por_defecto() -> None:
    sin = renderizar(_documento(), comprimir=False)

    assert renderizar(_documento()).startswith(b"%PDF-")
    assert len(renderizar(_documento())) < len(sin)


def test_renderizar_incluye_el_pie_pagina_n_de_total() -> None:
    contenido = renderizar(_documento(), comprimir=False)

    assert b"P\xe1gina 1 de " in contenido  # fpdf2 escribe el total como un trozo aparte
    assert b"{nb}" not in contenido


def test_renderizar_dibuja_encabezado_y_filas_de_la_tabla() -> None:
    tabla = TablaPdf(titulo="Platos", columnas=["Producto", "Cantidad"], filas=[["Milanesa", "5"]])

    contenido = renderizar(_documento([tabla]), comprimir=False)

    assert b"Producto" in contenido
    assert b"Milanesa" in contenido


def test_renderizar_repite_el_encabezado_de_la_tabla_en_la_pagina_siguiente() -> None:
    filas = [[f"Producto {n}", "1"] for n in range(120)]
    tabla = TablaPdf(titulo="Platos", columnas=["Producto", "ColumnaUnica"], filas=filas)

    contenido = renderizar(_documento([tabla]), comprimir=False)

    assert b"P\xe1gina 2 de " in contenido
    assert contenido.count(b"ColumnaUnica") >= 2


def test_tabla_pdf_tiene_anchos_y_alineacion_opcionales() -> None:
    tabla = TablaPdf(titulo="T", columnas=["A"], filas=[])

    assert tabla.anchos is None
    assert tabla.alinear_derecha == frozenset()


def test_documento_pdf_tiene_resumen_vacio_por_defecto() -> None:
    assert _documento().resumen == []


def test_renderizar_dibuja_el_resumen_con_etiquetas_y_valores() -> None:
    documento = DocumentoPdf(
        titulo="Reporte",
        periodo="Período: 01/10/2026 al 31/10/2026",
        generado=GENERADO,
        resumen=[("Unidades pedidas", "311"), ("Más vendido", "Agua sin gas")],
    )

    contenido = renderizar(documento, comprimir=False)

    assert b"Unidades pedidas" in contenido
    assert b"311" in contenido
    assert "Más vendido".encode("latin-1") in contenido
    assert b"Agua sin gas" in contenido


def test_renderizar_dibuja_periodo_fecha_de_generacion_y_pie_de_la_marca() -> None:
    contenido = renderizar(_documento(), comprimir=False)

    assert b"Generado el 06/11/2026 10:30" in contenido
    assert "Sistema de gestión de restaurante".encode("latin-1") in contenido


def test_renderizar_acepta_anchos_y_columnas_alineadas_a_la_derecha() -> None:
    tabla = TablaPdf(
        titulo="Platos",
        columnas=["Producto", "Cantidad"],
        filas=[["Milanesa", "5"]],
        anchos=[3, 1],
        alinear_derecha=frozenset({1}),
    )

    contenido = renderizar(_documento([tabla]), comprimir=False)

    assert b"Milanesa" in contenido
    assert contenido.startswith(b"%PDF-")
