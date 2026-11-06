"""Ayudante común para generar los PDF de los reportes (HU-M1-15).

Es el único archivo que conoce fpdf2. Los módulos arman un `DocumentoPdf` con datos puros
y lo dibujan con `renderizar`. Usa Helvetica (latin-1): cubre á, ñ, ü, ¿, ¡, « y ».
"""

from dataclasses import dataclass, field
from datetime import datetime

from fpdf import FPDF
from fpdf.enums import Align, XPos, YPos
from fpdf.fonts import FontFace

_REEMPLAZOS = str.maketrans(
    {
        "’": "'",
        "‘": "'",
        "“": '"',
        "”": '"',
        "—": "-",
        "–": "-",
        "−": "-",
    }
)
_FUENTE = "Helvetica"
_MARCA = "Sistema de gestión de restaurante"
_PIZARRA_900 = (15, 23, 42)
_PIZARRA_700 = (51, 65, 85)
_PIZARRA_500 = (100, 116, 139)
_PIZARRA_200 = (226, 232, 240)
_PIZARRA_50 = (248, 250, 252)
_AMBAR_600 = (217, 119, 6)
_AMBAR_50 = (255, 251, 235)
_BLANCO = (255, 255, 255)


@dataclass(frozen=True)
class TablaPdf:
    titulo: str
    columnas: list[str]
    filas: list[list[str]]
    anchos: list[float] | None = None
    alinear_derecha: frozenset[int] = frozenset()


@dataclass(frozen=True)
class DocumentoPdf:
    titulo: str
    periodo: str
    generado: datetime
    parrafos: list[str] = field(default_factory=list)
    tablas: list[TablaPdf] = field(default_factory=list)
    resumen: list[tuple[str, str]] = field(default_factory=list)


def normalizar_texto(texto: str) -> str:
    """Deja el texto representable en latin-1: tipografía común a ASCII y el resto a «?»."""
    reemplazado = texto.translate(_REEMPLAZOS)
    return reemplazado.encode("latin-1", errors="replace").decode("latin-1")


class _Pagina(FPDF):
    """FPDF con el pie de marca y «Página n de N» en todas las páginas."""

    def footer(self) -> None:
        self.set_draw_color(*_PIZARRA_200)
        self.set_line_width(0.2)
        self.line(self.l_margin, self.h - 16, self.w - self.r_margin, self.h - 16)
        self.set_y(-14)
        self.set_font(_FUENTE, size=8)
        self.set_text_color(*_PIZARRA_500)
        self.cell(0, 6, normalizar_texto(_MARCA), align="L", new_x=XPos.LEFT, new_y=YPos.TOP)
        self.cell(0, 6, normalizar_texto(f"Página {self.page_no()} de {{nb}}"), align="R")


def _escribir_linea(
    pdf: FPDF, texto: str, tamano: int, color: tuple[int, int, int], negrita: bool = False
) -> None:
    pdf.set_font(_FUENTE, style="B" if negrita else "", size=tamano)
    pdf.set_text_color(*color)
    pdf.multi_cell(0, 6, normalizar_texto(texto), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="L")


def _dibujar_encabezado(pdf: FPDF, documento: DocumentoPdf) -> None:
    _escribir_linea(pdf, documento.titulo, 18, _PIZARRA_900, negrita=True)
    _escribir_linea(pdf, documento.periodo, 10, _PIZARRA_500)
    _escribir_linea(pdf, f"Generado el {documento.generado:%d/%m/%Y %H:%M}", 9, _PIZARRA_500)
    pdf.ln(1)
    pdf.set_draw_color(*_AMBAR_600)
    pdf.set_line_width(0.6)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.set_y(y + 4)


def _dibujar_resumen(pdf: FPDF, resumen: list[tuple[str, str]]) -> None:
    ancho = (pdf.w - pdf.l_margin - pdf.r_margin) / len(resumen)
    alto = 16
    if pdf.get_y() + alto > pdf.h - pdf.b_margin:
        pdf.add_page()
    x0, y0 = pdf.l_margin, pdf.get_y()
    pdf.set_fill_color(*_AMBAR_50)
    pdf.set_draw_color(*_AMBAR_600)
    pdf.set_line_width(0.3)
    pdf.rect(x0, y0, ancho * len(resumen), alto, style="DF")
    for n, (etiqueta, valor) in enumerate(resumen):
        pdf.set_xy(x0 + n * ancho + 3, y0 + 2)
        pdf.set_font(_FUENTE, size=8)
        pdf.set_text_color(*_PIZARRA_500)
        pdf.cell(ancho - 6, 4, normalizar_texto(etiqueta), new_x=XPos.LEFT, new_y=YPos.NEXT)
        pdf.set_font(_FUENTE, style="B", size=12)
        pdf.set_text_color(*_PIZARRA_900)
        pdf.cell(ancho - 6, 7, normalizar_texto(valor))
    pdf.set_xy(pdf.l_margin, y0 + alto + 4)


def _dibujar_tabla(pdf: FPDF, tabla: TablaPdf) -> None:
    pdf.ln(3)
    _escribir_linea(pdf, tabla.titulo, 12, _PIZARRA_900, negrita=True)
    pdf.ln(1)
    pdf.set_font(_FUENTE, size=9)
    pdf.set_text_color(*_PIZARRA_700)
    pdf.set_draw_color(*_PIZARRA_200)
    pdf.set_line_width(0.2)
    encabezado = FontFace(emphasis="BOLD", color=_BLANCO, fill_color=_AMBAR_600)
    with pdf.table(
        first_row_as_headings=True,
        text_align="LEFT",
        col_widths=tabla.anchos,
        headings_style=encabezado,
        padding=2,
        line_height=5,
    ) as dibujo:
        for n, fila in enumerate([tabla.columnas, *tabla.filas]):
            relleno = _PIZARRA_50 if n % 2 == 0 else _BLANCO
            estilo = None if n == 0 else FontFace(fill_color=relleno)
            celdas = dibujo.row()
            for columna, celda in enumerate(fila):
                alinear = Align.R if columna in tabla.alinear_derecha else Align.L
                celdas.cell(normalizar_texto(celda), align=alinear, style=estilo)


def renderizar(documento: DocumentoPdf, comprimir: bool = True) -> bytes:
    """Dibuja el documento en A4 vertical; el encabezado de cada tabla se repite por página."""
    pdf = _Pagina(orientation="P", unit="mm", format="A4")
    pdf.set_compression(comprimir)
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    _dibujar_encabezado(pdf, documento)
    if documento.resumen:
        _dibujar_resumen(pdf, documento.resumen)
    for parrafo in documento.parrafos:
        _escribir_linea(pdf, parrafo, 9, _PIZARRA_700)
    for tabla in documento.tablas:
        _dibujar_tabla(pdf, tabla)
    return bytes(pdf.output())
