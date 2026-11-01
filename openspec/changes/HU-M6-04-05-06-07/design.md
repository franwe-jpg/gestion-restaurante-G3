# Diseño: HU-M6-04 a HU-M6-07 (ABM y listado de medios de pago)

## Enfoque técnico

Se replica el patrón del ABM de sectores del módulo Salón, con tres diferencias: la baja es lógica con una columna `eliminado`, la modificación recibe el estado y el listado filtra por estado y excluye los eliminados. Backend por capas (`router → service → repository → models`, D-01 a D-03) y frontend por módulo (`modules/pagos/`).

## Decisiones de arquitectura

| # | Decisión | Alternativa descartada | Motivo |
| --- | --- | --- | --- |
| A1 | Baja lógica con `eliminado` y índice único parcial `WHERE eliminado = 0`. | Borrar la fila. | El diagrama pide baja lógica y los cobros futuros referencian el medio (#76, criterio 3). El índice parcial deja reutilizar el nombre de uno eliminado (S3). |
| A2 | `DELETE /medios-de-pago/{id}` con 204. | `POST /{id}/baja` como en sectores. | Aquí «eliminar» es lo que pide el issue y D-23 asigna `DELETE` a eliminar. Sectores usa `/baja` porque su baja es deshabilitar. |
| A3 | `PUT` con reemplazo completo, incluido `estado`. | `PATCH` parcial o un endpoint aparte para habilitar. | #75 incluye el estado entre los datos modificables y obligatorios. |
| A4 | `incluir_deshabilitados: bool = False` en el listado. | Parámetro `estado` abierto. | Es la forma más simple de cubrir #77 (solo habilitados) y #75 (volver a habilitar) sin ampliar el contrato. |
| A5 | `TipoMedioPago` en `pagos/models.py`. | Moverlo a `shared/models/enums.py`. | Lo usa solo Pagos; `shared/` queda sin cambios (AGENTS.md §9.3). |
| A6 | Pydantic valida forma y largo; el `service` valida la unicidad. | Todo en el `service`. | Mismo reparto que sectores y que RNF-SEG-01. |

## Flujo de datos

```text
Cliente → router (valida con schemas) → service (reglas, commit) → repository (consultas) → models → SQLite
```

- **Alta:** `MedioPagoCrear` → `service.crear_medio_pago` valida nombre libre (409) → `repository.agregar` → `commit` (un `IntegrityError` por carrera se traduce a 409) → `MedioPagoSalida`.
- **Modificación:** `repository.obtener_medio_pago` (404 si falta o está eliminado) → nombre libre excluyendo el propio id (409) → asignar campos → `commit`.
- **Eliminación:** obtener (404) → `eliminado = True` → `commit`. Un segundo `DELETE` no encuentra el medio y da 404.
- **Listado:** consulta con `eliminado = 0` y, salvo `incluir_deshabilitados`, `estado = HABILITADO`; ordenada por `nombre_normalizado` y `id`; paginada con `aplicar` y `contar`.

## Contratos

### Modelo (`pagos/models.py`)

```python
class TipoMedioPago(StrEnum):
    EFECTIVO = "EFECTIVO"
    TARJETA = "TARJETA"
    TRANSFERENCIA = "TRANSFERENCIA"
    BILLETERA_VIRTUAL = "BILLETERA_VIRTUAL"

class MedioPago(Base):
    __tablename__ = "medios_pago"
    __table_args__ = (
        sa.Index("ux_medios_pago_nombre_normalizado", "nombre_normalizado", unique=True,
                 sqlite_where=sa.text("eliminado = 0")),
    )
    id, nombre (String 50), nombre_normalizado (String), tipo (Enum non-native),
    descripcion (String 200, nulo), estado (Enum Estado, default HABILITADO),
    eliminado (Boolean, default False)
```

El validador de `nombre` mantiene `nombre_normalizado = nombre.strip().casefold()`, igual que `Sector`.

### Esquemas (`pagos/schemas.py`)

```python
NombreMedioPago = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=3, max_length=50, pattern=r"^[\p{L}\p{N} .\-]+$")]
DescripcionMedioPago = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]

class MedioPagoCrear(BaseModel):        # extra="forbid"; sin estado
    nombre: NombreMedioPago
    tipo: TipoMedioPago
    descripcion: DescripcionMedioPago | None = None   # vacía -> None

class MedioPagoModificar(MedioPagoCrear):
    estado: Estado                       # obligatorio

class MedioPagoSalida(BaseModel):        # from_attributes
    id: int; nombre: str; tipo: TipoMedioPago; descripcion: str | None; estado: Estado

class FiltroMediosPago(ParametrosPaginacion):
    incluir_deshabilitados: bool = False
```

### Repository, service y router

```python
# repository (nunca confirma)
existe_nombre_normalizado(db, nombre_normalizado, excluir_id=None) -> bool   # solo no eliminados
obtener_medio_pago(db, medio_pago_id) -> MedioPago | None                    # None si eliminado
agregar(db, medio_pago) -> None
listar_medios_pago(db, parametros, incluir_deshabilitados) -> tuple[list[MedioPago], int]

# service (confirma la transaccion)
crear_medio_pago(db, datos) -> MedioPagoSalida
modificar_medio_pago(db, medio_pago_id, datos) -> MedioPagoSalida
eliminar_medio_pago(db, medio_pago_id) -> None
listar_medios_pago(db, filtro) -> Pagina[MedioPagoSalida]

# router (solo delega)   prefijo /api/v1, registrado en main.py
POST   /medios-de-pago          201
PUT    /medios-de-pago/{id}     200
DELETE /medios-de-pago/{id}     204
GET    /medios-de-pago          200
```

### Migración

Una revisión nueva con `down_revision = '0e9f2fe2e157'` (la cabeza actual). Crea `medios_pago` y el índice único parcial con `op.create_index(..., unique=True, sqlite_where=sa.text("eliminado = 0"))`. `downgrade` borra el índice y la tabla.

## Frontend

```text
frontend/src/modules/pagos/
├── types.ts                      # MedioPago, TipoMedioPago, MedioPagoCrear, MedioPagoModificar
├── api.ts                        # crearMedioPago, modificarMedioPago, eliminarMedioPago, listarMediosPago
├── components/
│   ├── validarMedioPago.ts       # reglas locales y traduccion del 409
│   ├── useFormularioMedioPago.ts # estado del formulario, alta y edicion
│   ├── MedioPagoFormDialog.tsx   # dialogo de alta y edicion (nombre, tipo, descripcion, estado)
│   ├── useBajaMedioPago.ts       # confirmacion con useConfirm y DELETE
│   ├── useMediosPagoDelModulo.ts # listado con useApi + usePaginacion
│   ├── MediosPagoTabla.tsx       # DataTable: Nombre, Tipo, Descripcion, Estado, Acciones
│   └── index.ts
└── pages/PagosPage.tsx           # encabezado con «Nuevo medio de pago», casilla, tabla y dialogo
```

- Los textos de la maqueta se respetan: título «Pagos», descripción «Formas de cobro que acepta el local.», botón «Nuevo medio de pago», ayuda del nombre «De 3 a 50 caracteres. No se puede repetir.» y los cuatro tipos como «Billetera virtual», «Efectivo», «Tarjeta» y «Transferencia».
- La casilla «Mostrar deshabilitados» pasa `incluir_deshabilitados=true`. Con la lista vacía y sin la casilla, el `EmptyState` dice «No hay medios de pago disponibles para cobrar.»
- Las acciones de la fila son botones con nombre accesible: «Editar «nombre»» y «Eliminar «nombre»».
- Se quitan `listarPagos` y `ComprobantePago` de relleno si ninguna otra pieza los usa (se comprueba al aplicar).

## Cambios en código compartido

Ninguno. Se usan `Estado`, `Pagina`, `ParametrosPaginacion`, `clienteHttp`, `useApi`, `usePaginacion`, `useConfirm`, `useToast` y los componentes `ui/` tal como están.

## Cambios en archivos

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/pagos/{models,schemas,repository,service,router}.py` | Implementación |
| `backend/app/main.py` | `include_router` del router de pagos |
| `backend/alembic/versions/<id>_crea_medios_pago.py` | Nuevo |
| `backend/tests/modules/pagos/` | `conftest.py`, `test_modelo.py`, `test_migracion.py`, `test_schemas.py`, `test_service.py`, `test_router.py` |
| `frontend/src/modules/pagos/**` | Según el árbol anterior, con una prueba junto a cada componente y hook |

## Estrategia de pruebas

Strict TDD: cada unidad empieza con la prueba en rojo.

| Capa | Qué se prueba | Herramienta |
| --- | --- | --- |
| Modelo | Normalización del nombre, índice único parcial, reutilización del nombre de un eliminado | `pytest` con base temporal |
| Migración | Se aplica desde cero y crea la tabla y el índice | `alembic` + `pytest` |
| Schemas | Largo, caracteres (acentos y ñ sí; `$` no), tipo, descripción vacía, `estado` extra en el alta | `pytest` |
| Service y router | Un test por escenario de la spec: 201, 200, 204, 404, 409, 422, orden y filtro de estado | `TestClient` con base migrada |
| Frontend | Validador, hook de formulario, diálogo, hook de baja, tabla y pantalla (cancelar no llama a la API) | Vitest + Testing Library |

Los escenarios diferidos (S5) no tienen prueba hasta el Sprint 3; se listan en `verify-report.md`.

## Matriz de amenazas

| Amenaza | Control |
| --- | --- |
| Inyección SQL por el nombre | Consultas con el ORM, nunca armadas con texto (RNF-SEG-05). |
| Datos inválidos o caracteres de control en el nombre | Patrón de Pydantic y largo máximo; 422 antes de llegar a la base (RNF-SEG-01). |
| Mensajes que filtran detalles internos | Formato `{"detalle": ...}` con textos propios (RNF-SEG-09). |
| Carrera entre dos altas con el mismo nombre | Índice único parcial y captura de `IntegrityError` → 409. |

## Migración y despliegue

`alembic upgrade head` crea la tabla; en Docker corre al arrancar. No hay datos previos que migrar.

## Tamaño estimado

Backend ≈ 450 líneas (código 140 + pruebas 310); frontend ≈ 700 (código 330 + pruebas 370). Ambos por debajo del punto de control de 800.
