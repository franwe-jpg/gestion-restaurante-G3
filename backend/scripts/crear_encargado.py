"""Crea el primer encargado: `python -m scripts.crear_encargado --correo <correo>`.

La contrasena se pide con `getpass` (dos veces): no queda en el historial de la terminal ni en el
repositorio (RNF-SEG-04). Usa la base de `DATABASE_URL`. Si el correo ya existe, informa el error
y no cambia nada (S6).
"""

import argparse
import getpass
import sys
from contextlib import AbstractContextManager

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.modules.usuarios import service
from app.shared.excepciones import DatosInvalidosError, ReglaDeNegocioError


def abrir_sesion() -> AbstractContextManager[Session]:
    return SessionLocal()


def _pedir_contrasena() -> str | None:
    contrasena = getpass.getpass("Contraseña: ")
    if getpass.getpass("Repita la contraseña: ") != contrasena:
        print("Error: las contraseñas no coinciden.", file=sys.stderr)
        return None
    return contrasena


def main(argumentos: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Crea un usuario con el rol ENCARGADO.")
    parser.add_argument("--correo", required=True, help="correo del encargado")
    datos = parser.parse_args(argumentos)

    contrasena = _pedir_contrasena()
    if contrasena is None:
        return 1
    with abrir_sesion() as db:
        try:
            service.crear_encargado(db, datos.correo, contrasena)
        except (DatosInvalidosError, ReglaDeNegocioError) as error:
            print(f"Error: {error}", file=sys.stderr)
            return 1
    print(f"Encargado {datos.correo} creado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
