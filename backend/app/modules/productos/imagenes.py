"""productos: validacion, recodificacion y guardado de imagenes (B5, B6).

No importa FastAPI ni la base: recibe bytes y devuelve bytes o un nombre de archivo.
"""

import io
import uuid
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

from app.config import get_settings
from app.shared.excepciones import DatosInvalidosError

register_heif_opener()

TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024
PIXELES_MAXIMOS = 50_000_000  # Supuesto: evita imagenes "bomba" que ocupan poco y pesan en RAM
CALIDAD_JPEG = 90
MENSAJE_IMAGEN_INVALIDA = "La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB"

# Formato detectado por contenido -> extension guardada. HEIF se guarda como JPEG; MPO es el
# JPEG con datos extra que graban muchos celulares.
EXTENSIONES = {"JPEG": "jpg", "MPO": "jpg", "PNG": "png", "HEIF": "jpg"}


@dataclass(frozen=True)
class ImagenProcesada:
    datos: bytes
    extension: str


def _abrir(contenido: bytes) -> Image.Image:
    imagen = Image.open(io.BytesIO(contenido))
    ancho, alto = imagen.size
    if imagen.format not in EXTENSIONES or ancho * alto > PIXELES_MAXIMOS:
        raise DatosInvalidosError(MENSAJE_IMAGEN_INVALIDA)
    imagen.load()  # detecta archivos truncados o corruptos
    return imagen


def _recodificar(imagen: Image.Image) -> ImagenProcesada:
    extension = EXTENSIONES[imagen.format or ""]
    orientada = ImageOps.exif_transpose(imagen)
    if extension == "jpg":
        # Se guarda sin `exif`: no quedan GPS ni datos de la camara (S6).
        salida = orientada.convert("RGB") if orientada.mode not in ("RGB", "L") else orientada
        formato, opciones = "JPEG", {"quality": CALIDAD_JPEG}
    else:
        salida, formato, opciones = orientada, "PNG", {}
    buffer = io.BytesIO()
    salida.save(buffer, formato, **opciones)
    return ImagenProcesada(datos=buffer.getvalue(), extension=extension)


def procesar(contenido: bytes) -> ImagenProcesada:
    """Valida por contenido y recodifica sin metadatos. Lanza `DatosInvalidosError` (422)."""
    if not contenido or len(contenido) > TAMANO_MAXIMO_BYTES:
        raise DatosInvalidosError(MENSAJE_IMAGEN_INVALIDA)
    try:
        return _recodificar(_abrir(contenido))
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
    ) as error:
        raise DatosInvalidosError(MENSAJE_IMAGEN_INVALIDA) from error


def guardar(imagen: ImagenProcesada) -> str:
    """Escribe el archivo con un nombre del servidor y devuelve ese nombre."""
    carpeta = Path(get_settings().media_dir)
    carpeta.mkdir(parents=True, exist_ok=True)
    nombre = f"{uuid.uuid4().hex}.{imagen.extension}"
    (carpeta / nombre).write_bytes(imagen.datos)
    return nombre


def borrar(nombre: str) -> None:
    (Path(get_settings().media_dir) / nombre).unlink(missing_ok=True)
