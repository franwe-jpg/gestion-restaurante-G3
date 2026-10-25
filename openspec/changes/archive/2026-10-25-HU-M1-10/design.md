# Diseño: HU-M1-10 Crear una sección de la carta

- **Issue:** #14 · **Rama:** `feature/HU-M1-10-crear-seccion` · **Entrada:** `proposal.md` (D1 a D3 decididas, supuestos S1 a S6).

## Enfoque técnico

Primer CRUD del repositorio: fija el patrón que copiarán los demás módulos. Capas `router → service → repository → models` (D-01, D-02), transacción abierta y cerrada en el `service` (D-10), errores con `shared/excepciones.py` (D-25, D-26) y listados paginados con `shared/paginacion.py` (D-27). `Producto`, `Estado` y `Categoria` van en `shared/models/` (D-05, D1); `Seccion` en `productos/models.py`. No hay endpoints de alta de productos: las pruebas los insertan directamente en la base.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| A1 | Nombre único sin distinguir mayúsculas (S1) | Columna técnica `nombre_normalizado = nombre.casefold()` con índice único; un `@validates("nombre")` del modelo la mantiene sincronizada | Índice sobre `lower(nombre)` o `COLLATE NOCASE` | En SQLite `lower` y `NOCASE` solo cubren ASCII («Ñ», tildes). El validador evita que HU-M1-11 olvide actualizarla. La columna no se expone en la API (D-06). |
| A2 | Orden único entre habilitadas (S2) | Índice único parcial `ux_secciones_orden_habilitada` (`WHERE estado = 'HABILITADO'`) más verificación previa en el `service` | Solo verificación en el `service` | El `service` da el mensaje claro (409); el índice protege ante escrituras concurrentes. |
| A3 | Carrera entre verificación y escritura | El `service` captura `IntegrityError` al confirmar, hace `rollback` y lanza `ReglaDeNegocioError` | Dejar que llegue como 500 | Mantiene el formato `{"detalle": ...}` (D-26). El `service` puede importar SQLAlchemy, no FastAPI. |
| A4 | Qué devuelve el `service` | Esquemas Pydantic (`SeccionSalida.model_validate(...)`) | Devolver modelos y que `response_model` los convierta | El listado combina sección y conteo; otros módulos (M2) reciben objetos de API y no modelos (RNF-MAN-09, D-06). |
| A5 | Paginación (D2) | `shared/paginacion.py` sin FastAPI: `ParametrosPaginacion` (Pydantic), `Pagina[T]` y dos funciones puras sobre `Select` (`contar`, `aplicar`) | Una función que ejecute la consulta, o `Query()` dentro de `shared` | Sirve tanto para consultas de una entidad como de tuplas; el router recibe los parámetros con `Annotated[ParametrosPaginacion, Query()]`. |
| A6 | Relación `Seccion` ↔ `Producto` | `Seccion.productos = relationship(Producto)` unidireccional; `Producto` solo tiene `seccion_id` (FK por nombre de tabla) | Relación bidireccional | `shared/` no debe importar ni nombrar clases de un módulo. |
| A7 | Mensajes de validación (422) | El formulario valida en español antes de enviar (criterios 2, 4 y 5); el 422 del backend queda como red de seguridad con el manejador actual de `main.py` | Traducir los mensajes de Pydantic en el manejador global | Evita cambiar un archivo compartido sin acuerdo del equipo; queda como pregunta abierta. |
| A8 | Confirmación del traslado (criterio 8, S4) | El selector muestra la sección actual de cada producto; al guardar con productos elegidos, `useConfirm` pide confirmar y se envía `confirmar_traslado: true`. El backend rechaza con 409 si llega `false` | Enviar primero con `false` y reintentar tras el 409 | El frontend ya conoce la sección actual (D3); un solo `POST`. El 409 protege a otros clientes de la API. |
| A9 | `base_repository.py` (D-05) | No se implementa en esta HU | Implementar un CRUD genérico ahora | Con un solo módulo no hay duplicación que lo justifique; se define cuando un segundo módulo lo necesite. |
| A10 | Base de pruebas | Una base SQLite temporal por prueba, creada con `alembic upgrade head` (patrón de `tests/test_database.py`) | `Base.metadata.create_all` | D-14; las pruebas validan también la migración. Si la suite se vuelve lenta, se migra una plantilla por sesión y se copia por prueba. |

## Flujo de datos (alta con traslado)

```
SeccionFormDialog ──POST /secciones──→ router.crear_seccion ──→ service.crear_seccion
  (confirmar_traslado)                                            │ 1. nombre casefold libre    → 409
                                                                  │ 2. orden libre (habilitadas) → 409
                                                                  │ 3. productos existen         → 404
                                                                  │ 4. productos habilitados     → 409
                                                                  │ 5. sin confirmar y con productos → 409
                                                                  │ 6. agregar sección + asignar seccion_id
                                                                  └ 7. commit único (IntegrityError → 409) → SeccionSalida (201)
```

Cada paso es un auxiliar privado del `service` para respetar 50 líneas y complejidad 10 (RNF-MAN-05).

## Contratos

**Modelos.** `Estado(StrEnum)`: `HABILITADO`, `DESHABILITADO`. `Categoria(StrEnum)`: `PLATO`, `POSTRE`, `BEBIDA`, `MENU_DEL_DIA`. Ambos con `sa.Enum(..., native_enum=False)`.

| Tabla | Columnas |
| --- | --- |
| `secciones` | `id` PK; `nombre` String(50) NOT NULL; `nombre_normalizado` String NOT NULL, índice único; `orden` Integer NOT NULL, `CHECK (orden > 0)`; `estado` NOT NULL, defecto `HABILITADO`; índice único parcial A2 |
| `productos` | `id` PK; `nombre` String(100); `categoria`; `precio` Numeric(10, 2); `ingredientes` JSON (lista, defecto `[]`); `descripcion` String(500) NULL; `imagen` String(255) NULL (ruta); `etiquetas` JSON (lista, defecto `[]`); `estado`; `seccion_id` FK `secciones.id` NOT NULL `ON DELETE RESTRICT` (S6), con índice. Supuesto: HU-M1-01 puede ajustar `precio`, `ingredientes`, `etiquetas` e `imagen`. |

**Esquemas (`productos/schemas.py`).**

```python
NombreSeccion = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]

class SeccionCrear(BaseModel):
    nombre: NombreSeccion
    orden: StrictInt = Field(gt=0)            # rechaza "3", 2.0 y true (S2)
    producto_ids: list[StrictInt] = Field(default_factory=list)  # repetidos → 422 (validador)
    confirmar_traslado: StrictBool = False
```

Salidas: `ProductoResumen {id, nombre}`; `SeccionSalida {id, nombre, orden, estado, productos: list[ProductoResumen]}` (S5); `SeccionListado {id, nombre, orden, estado, cantidad_productos}`; `ProductoSeleccionable {id, nombre, categoria, seccion: {id, nombre}}`; `Pagina[T] {items, total, limit, offset}` (`limit` 1 a 100, defecto 50; `offset` ≥ 0).

**API.**

| Ruta | Respuesta | Errores |
| --- | --- | --- |
| `POST /api/v1/secciones` | 201 `SeccionSalida` | 404, 409, 422 |
| `GET /api/v1/secciones?limit&offset` | 200 `Pagina[SeccionListado]`, orden `orden, id`; conteo con `COUNT` en la base (D-11) | 422 |
| `GET /api/v1/productos?limit&offset` | 200 `Pagina[ProductoSeleccionable]`, solo habilitados, orden `nombre` | 422 |

**Repository.** `existe_nombre_normalizado`, `buscar_habilitada_por_orden`, `obtener_productos(ids)`, `agregar(seccion)` (solo `add` y `flush`), `listar_secciones(parametros)`, `listar_productos_habilitados(parametros)`. Nunca hace `commit`.

## Cambios en archivos

| Archivo | Acción | Compartido |
| --- | --- | --- |
| `backend/app/shared/models/__init__.py`, `enums.py`, `producto.py` | Crear | **Sí** (M2, M3, M4, M6) |
| `backend/app/shared/paginacion.py` | Implementar | **Sí** |
| `backend/app/main.py` | `include_router` del módulo con `API_PREFIX` | **Sí** |
| `backend/alembic/versions/<rev>_crea_secciones_y_productos.py` | Crear (`down_revision = "efdafc2a164c"`) | **Sí** |
| `backend/tests/conftest.py` | Crear fixtures `db` y `cliente` (`app.dependency_overrides[get_db]`) | **Sí** |
| `frontend/src/shared/types/index.ts` | Agregar `Pagina<T>` | **Sí** |
| `backend/app/modules/productos/{models,schemas,repository,service,router}.py` | Implementar | No |
| `backend/tests/modules/__init__.py`, `productos/{__init__,conftest,test_service,test_router,test_migracion}.py` | Crear | No |
| `frontend/src/modules/productos/{types,api}.ts` | Reescribir (se quitan los tipos falsos `Producto` y `FiltrosProductos`) | No |
| `frontend/src/modules/productos/pages/ProductosPage.tsx` | Pestañas «Productos» (placeholder actual) y «Secciones» | No |
| `frontend/src/modules/productos/components/{SeccionesTab,SeccionesTabla,SeccionFormDialog,SelectorProductos}.tsx`, `validarSeccion.ts` y sus pruebas | Crear | No |

Componentes compartidos reutilizados: `Tabs`, `DataTable`, `Dialog`, `FormField`, `Input`, `Checkbox`, `Badge`, `Alert`, `Pagination`, `useApi`, `usePaginacion`, `useConfirm`, `useToast`. El estado se muestra con `Badge` y etiquetas del módulo («Habilitada», «Deshabilitada», según la maqueta) para no cambiar `StatusBadge`.

## Estrategia de pruebas

| Capa | Qué | Cómo |
| --- | --- | --- |
| Backend `service` | Criterios 1, 3 (casefold y contra deshabilitadas), 6 (habilitada ocupa; deshabilitada no), 7, 8 (sin confirmar → 409; con confirmar → traslado atómico), S3 (404, 409) | `pytest` con la fixture `db`; fábricas en `tests/modules/productos/conftest.py` |
| Backend `router` | 201 y forma de S5; 422 de criterios 2, 4 y 5 (parametrizado: `"3"`, `2.0`, `true`, `0`, `-1`); ids repetidos; listados paginados; `limit=101` → 422 | `TestClient` con la fixture `cliente` |
| Migración | `upgrade head` crea ambas tablas; `downgrade -1` las elimina | `test_migracion.py` |
| Frontend | `validarSeccion` (criterios 2, 4 y 5), diálogo (envío, 409 mostrado, confirmación del criterio 8), tabla y `api.ts` | Vitest y Testing Library con `vi.mock('../api')` |

## Matriz de amenazas

N/A: no hay enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables.

## Migración y despliegue

Una revisión nueva crea `secciones` y luego `productos`; el `downgrade` elimina `productos` y después `secciones`. La revisión anterior está vacía: no hay datos que perder. `alembic/env.py` no cambia.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 420 (incluye ≈ 70 de migración) | ≈ 300 | ≈ 720 | 800: dentro |
| Frontend | ≈ 400 | ≈ 300 | ≈ 700 | 800: dentro |

## Preguntas abiertas

- [ ] ¿Traducir al español los mensajes 422 de Pydantic en `main.py` (A7)? Afecta a todos los módulos.
- [ ] El selector carga una sola página (`limit=100`). Con más de 100 productos habilitados hará falta búsqueda; se propone resolverlo en HU-M1-01.
- [ ] Avisar a los responsables de M2, M3, M4 y M6 sobre `shared/models/` (`Estado`, `Categoria`, `Producto`) antes del PR (AGENTS.md §9.3).
