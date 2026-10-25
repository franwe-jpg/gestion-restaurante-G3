import io
import re
from pathlib import Path

import pillow_heif
import pytest
from PIL import Image

from app.modules.productos import imagenes
from app.shared.excepciones import DatosInvalidosError

MAXIMO = 5 * 1024 * 1024
NOMBRE_VALIDO = re.compile(r"^[0-9a-f]{32}\.(jpg|png)$")

pillow_heif.register_heif_opener()


def _imagen(formato: str, tamano: tuple[int, int] = (8, 4), **opciones) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", tamano, "red").save(buffer, formato, **opciones)
    return buffer.getvalue()


def _abrir(datos: bytes) -> Image.Image:
    imagen = Image.open(io.BytesIO(datos))
    imagen.load()
    return imagen


def _exif_orientacion(valor: int) -> Image.Exif:
    exif = Image.Exif()
    exif[0x0112] = valor
    return exif


# CA 10 y CA 12: formatos validos
def test_procesar_jpg_valido_devuelve_jpeg() -> None:
    resultado = imagenes.procesar(_imagen("JPEG"))

    assert resultado.extension == "jpg"
    assert _abrir(resultado.datos).format == "JPEG"


def test_procesar_png_valido_devuelve_png() -> None:
    resultado = imagenes.procesar(_imagen("PNG"))

    assert resultado.extension == "png"
    assert _abrir(resultado.datos).format == "PNG"


def test_procesar_heic_valido_se_convierte_a_jpeg() -> None:
    resultado = imagenes.procesar(_imagen("HEIF"))

    assert resultado.extension == "jpg"
    convertida = _abrir(resultado.datos)
    assert convertida.format == "JPEG"
    assert convertida.size == (8, 4)


def test_procesar_aplica_la_orientacion_exif_y_no_la_conserva() -> None:
    original = _imagen("JPEG", (8, 4), exif=_exif_orientacion(6))

    resultado = imagenes.procesar(original)

    final = _abrir(resultado.datos)
    assert final.size == (4, 8)
    assert len(final.getexif()) == 0


def test_procesar_imagen_sin_exif_conserva_las_medidas() -> None:
    resultado = imagenes.procesar(_imagen("JPEG", (8, 4)))

    assert _abrir(resultado.datos).size == (8, 4)


def test_procesar_png_con_metadatos_los_descarta() -> None:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 4)).save(buffer, "PNG", exif=_exif_orientacion(1))

    resultado = imagenes.procesar(buffer.getvalue())

    assert len(_abrir(resultado.datos).getexif()) == 0


# CA 10: formatos y contenido no permitidos
@pytest.mark.parametrize(
    "contenido",
    [
        b"esto es solo texto con extension .jpg",
        b"%PDF-1.4\n1 0 obj\n<< >>\nendobj\n",
        _imagen("GIF"),
        _imagen("BMP"),
        _imagen("JPEG")[:40],  # truncada
    ],
    ids=["texto", "pdf", "gif", "bmp", "jpeg-truncado"],
)
def test_procesar_rechaza_contenido_que_no_es_jpg_png_ni_heic(contenido: bytes) -> None:
    with pytest.raises(DatosInvalidosError) as error:
        imagenes.procesar(contenido)

    assert "JPG, PNG o HEIC" in str(error.value)
    assert "5 MB" in str(error.value)


def test_procesar_rechaza_un_archivo_vacio() -> None:
    with pytest.raises(DatosInvalidosError, match="JPG, PNG o HEIC"):
        imagenes.procesar(b"")


def test_procesar_rechaza_5_mb_mas_un_byte() -> None:
    with pytest.raises(DatosInvalidosError, match="5 MB"):
        imagenes.procesar(_imagen("JPEG") + b"\0" * (MAXIMO + 1 - len(_imagen("JPEG"))))


def test_procesar_acepta_exactamente_5_mb() -> None:
    base = _imagen("JPEG")

    resultado = imagenes.procesar(base + b"\0" * (MAXIMO - len(base)))

    assert resultado.extension == "jpg"


def test_procesar_rechaza_una_imagen_de_60_megapixeles() -> None:
    buffer = io.BytesIO()
    Image.new("1", (10_000, 6_000)).save(buffer, "PNG")
    assert len(buffer.getvalue()) < MAXIMO  # entra por tamano: la rechaza el limite de pixeles

    with pytest.raises(DatosInvalidosError, match="JPG, PNG o HEIC"):
        imagenes.procesar(buffer.getvalue())


# CA 12: guardado
def test_guardar_escribe_con_nombre_hexadecimal_y_crea_la_carpeta(directorio_media: Path) -> None:
    assert not directorio_media.exists()
    procesada = imagenes.procesar(_imagen("PNG"))

    nombre = imagenes.guardar(procesada)

    assert NOMBRE_VALIDO.match(nombre)
    assert nombre.endswith(".png")
    assert (directorio_media / nombre).read_bytes() == procesada.datos


def test_guardar_dos_veces_genera_nombres_distintos(directorio_media: Path) -> None:
    procesada = imagenes.procesar(_imagen("JPEG"))

    primero = imagenes.guardar(procesada)
    segundo = imagenes.guardar(procesada)

    assert primero != segundo
    assert sorted(path.name for path in directorio_media.iterdir()) == sorted([primero, segundo])


def test_borrar_elimina_el_archivo_y_tolera_que_no_exista(directorio_media: Path) -> None:
    nombre = imagenes.guardar(imagenes.procesar(_imagen("JPEG")))

    imagenes.borrar(nombre)
    imagenes.borrar(nombre)

    assert list(directorio_media.iterdir()) == []
