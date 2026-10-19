# S1-03 · Estándares y guía de estilo del backend

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Héctor Sánchez · Sprint 1, semana 1 · Issue #98 · Depende de S1-01 (#148)

Reglas para escribir el código Python del backend (`backend/`), de modo que los seis módulos parezcan escritos por una sola persona, aunque los generen agentes distintos. Parte de `SPRINT-0/S0-05-arquitectura.md` (secciones 3 y 5) y de `SPRINT-0/S0-04-rnf.md`. Cada regla indica la decisión (D-xx) o el RNF que la respalda.

## 1. Nombres

- Funciones, variables, módulos y archivos en `snake_case`. Clases en `PascalCase`. Constantes en `MAYUSCULAS`.
- Los nombres del dominio van en español (`crear_reserva`, `Mesa`), igual que la API. Las palabras técnicas quedan en inglés (`router`, `service`, `repository`).
- Los recursos de la API van en plural y en español: `/api/v1/mesas` (D-21).

```python
# Bien
MAX_COMANDAS_ABIERTAS = 3

class Reserva: ...

def crear_reserva(datos: ReservaCrear) -> Reserva: ...
```

```python
# Mal
maxComandas = 3

class reserva: ...

def CrearReserva(d): ...        # y la ruta "/api/v1/getMesa"
```

## 2. Estructura y capas

Cada archivo tiene un solo trabajo (D-01, D-02, D-03):

| Archivo | Hace | No hace |
| --- | --- | --- |
| `router.py` | Recibe la solicitud HTTP, delega al service y devuelve la respuesta. | Consultar la base ni importar `repository` o `models`. |
| `service.py` | Aplica las reglas de negocio y confirma la transacción. | Depender de FastAPI ni escribir consultas. |
| `repository.py` | Ejecuta consultas sobre los modelos. | Tener reglas de negocio ni confirmar transacciones. |

Un módulo solo puede llamar al `service` de otro, nunca a su `router`, `repository`, `models` ni `schemas` (RNF-MAN-09). La CI lo verifica con `import-linter` (D-04).

```python
# Bien: el router solo delega
@router.get("/{mesa_id}", response_model=MesaSalida)
def obtener_mesa(mesa_id: int, db: Session = Depends(get_db)) -> Mesa:
    return service.obtener_mesa(db, mesa_id)
```

```python
# Mal: el router consulta la base
@router.get("/{mesa_id}")
def obtener_mesa(mesa_id: int, db: Session = Depends(get_db)):
    return db.query(Mesa).filter(Mesa.id == mesa_id).first()
```

## 3. Funciones

- Hacen una sola cosa. Máximo **50 líneas** y complejidad ciclomática **10** (RNF-MAN-05).
- Ruff controla la complejidad (`C901`). Para el largo no hay una regla de líneas: se aproxima con un máximo de 50 sentencias (`PLR0915`).
- Se reduce la complejidad con retornos tempranos y funciones auxiliares.

```python
# Bien
def cerrar_comanda(db: Session, comanda_id: int) -> Comanda:
    comanda = repository.obtener(db, comanda_id)
    if comanda is None:
        raise NoEncontradoError(f"La comanda {comanda_id} no existe")
    if comanda.cerrada:
        raise ReglaDeNegocioError("La comanda ya está cerrada")
    comanda.cerrada = True
    db.commit()
    return comanda
```

```python
# Mal: anidado, sin retornos tempranos
def cerrar_comanda(db, comanda_id):
    comanda = repository.obtener(db, comanda_id)
    if comanda is not None:
        if not comanda.cerrada:
            comanda.cerrada = True
            db.commit()
            return comanda
        else:
            raise ReglaDeNegocioError("La comanda ya está cerrada")
    else:
        raise NoEncontradoError("No existe")
```

## 4. Tipos y validación

- Type hints en **todas** las funciones, parámetros y retorno (Ruff `ANN`).
- Todo dato que entra se valida con esquemas Pydantic de `schemas.py`. La API nunca devuelve un modelo de la base: devuelve un esquema (D-06, RNF-SEG-01).

```python
# Bien
class MesaCrear(BaseModel):
    numero: int = Field(gt=0)
    capacidad: int = Field(gt=0, le=20)

@router.post("", response_model=MesaSalida, status_code=201)
def crear_mesa(datos: MesaCrear, db: Session = Depends(get_db)) -> Mesa:
    return service.crear_mesa(db, datos)
```

```python
# Mal: datos sin validar y sin tipos
@router.post("")
def crear_mesa(datos: dict, db=Depends(get_db)):
    return service.crear_mesa(db, datos)
```

## 5. Errores

- Los errores de negocio se lanzan con las excepciones de `shared/excepciones.py`. Un manejador global las convierte en respuesta.
- Formato de la respuesta: `{"detalle": "mensaje"}`, sin trazas, rutas ni SQL (D-26, RNF-SEG-09).
- Códigos (D-25): `404` no existe (`NoEncontradoError`), `409` choca con una regla de negocio (`ReglaDeNegocioError`), `422` datos inválidos (lo devuelve Pydantic).

```python
# Bien: el service no conoce HTTP
raise NoEncontradoError(f"La mesa {mesa_id} no existe")
```

```python
# Mal: HTTP dentro del service, o un error con código 200
raise HTTPException(status_code=404, detail="no existe")
return {"error": "no existe"}
```

## 6. Base de datos

- Consultas con el ORM o parametrizadas. **Nunca** armadas con texto (RNF-SEG-05).
- Transacciones cortas: el `service` las abre y las cierra, y el `repository` no confirma (D-10, RNF-REN-03).
- El esquema cambia solo con migraciones de Alembic. No se modifica la base a mano (RNF-MAN-06).
- Los reportes agregan en la base (`GROUP BY`, `SUM`), no en Python (D-11).

```python
# Bien
def buscar_por_numero(db: Session, numero: int) -> Mesa | None:
    return db.scalar(select(Mesa).where(Mesa.numero == numero))
```

```python
# Mal: SQL armado con texto
def buscar_por_numero(db, numero):
    return db.execute(text(f"SELECT * FROM mesas WHERE numero = {numero}"))
```

## 7. Pruebas

- Se usa `pytest`. Las pruebas viven en `tests/`, con la misma estructura que `modules/` (D-14).
- Nombre: `test_<función>_<caso>`. Cada HU tiene al menos una prueba de camino feliz y una de error o de límite (RNF-MAN-04).
- Cada prueba usa su propia base SQLite temporal y no depende del orden de ejecución.

```python
# Bien: tests/modules/salon/test_service.py
def test_cerrar_comanda_ya_cerrada_lanza_regla_de_negocio(db: Session) -> None:
    comanda = crear_comanda_cerrada(db)
    with pytest.raises(ReglaDeNegocioError):
        service.cerrar_comanda(db, comanda.id)
```

```python
# Mal: nombre vago, usa la base de desarrollo y no comprueba nada concreto
def test_1():
    db = abrir_base("restaurante.db")
    service.cerrar_comanda(db, 1)
```

## 8. Lint y formato

- **Ruff** revisa y formatea (reemplaza a Flake8 y Black). Un PR con errores no se integra (RNF-MAN-02).
- Antes de cada commit, desde `backend/`:

```bash
ruff check --fix .
ruff format .
```

- La CI corre `ruff check .` y `ruff format --check .` (S1-10).

```python
# Bien: ordenado por Ruff
import pytest
from sqlalchemy import select

from app.modules.salon import service
```

```python
# Mal: imports desordenados y sin usar
from app.modules.salon import service
import os, pytest
```

## Configuración de Ruff (`backend/pyproject.toml`)

Lista para copiar en el esqueleto del backend (S1-05).

```toml
[tool.ruff]
line-length = 100
target-version = "py312"
src = ["."]
extend-exclude = ["alembic/versions"]

[tool.ruff.lint]
select = [
    "E", "W",   # estilo PEP 8
    "F",        # errores (imports sin usar, nombres no definidos)
    "I",        # orden de imports
    "N",        # nombres
    "UP",       # sintaxis moderna de Python
    "B",        # errores comunes
    "C90",      # complejidad ciclomática
    "ANN",      # type hints
    "S",        # seguridad (incluye SQL armado con texto)
    "SIM",      # simplificaciones
    "PLR0915",  # máximo de sentencias por función
]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.pylint]
max-statements = 50

[tool.ruff.lint.flake8-bugbear]
# FastAPI usa Depends() y Query() como valores por defecto
extend-immutable-calls = [
    "fastapi.Depends", "fastapi.Query", "fastapi.Path", "fastapi.Body",
]

[tool.ruff.lint.isort]
known-first-party = ["app"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101", "ANN"]   # assert y funciones de prueba sin tipos de retorno
```

## Supuestos

- `Supuesto:` Python 3.12 y largo de línea de 100 caracteres (se valida en S1-05 con la versión instalada).
- `Supuesto:` el máximo de 50 líneas por función se controla con `PLR0915` (50 sentencias), porque Ruff no tiene una regla por líneas.
