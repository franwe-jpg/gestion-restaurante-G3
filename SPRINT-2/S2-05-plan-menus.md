# S2-05 · Plan de implementación de M2 · Menús y Promociones

| Campo | Valor |
| --- | --- |
| Módulo | M2 Menús y Promociones (`backend/app/modules/menus/`, `frontend/src/modules/menus/`) |
| Responsable | Joaquín Cardoso Díaz |
| Historias | HU-M2-01 a HU-M2-06 (issues #21, #22, #23, #25, #26, #27; épica #20) |
| Método | SDD con Strict TDD (AGENTS.md §4, `openspec/config.yaml`) |
| Entrega mínima | Crear y listar de cada entidad; el resto si el tiempo alcanza (riesgo R01) |

## 1. Qué es este documento

Es el plan de trabajo del módulo: el orden de las fases, las decisiones de diseño, los contratos de la API, los supuestos que hay que validar con el equipo y la trazabilidad entre criterios de aceptación y pruebas.

**No es** un artefacto de SDD. Los artefactos formales los genera `/sdd-ff` en `openspec/changes/<cambio>/` (`proposal.md`, `specs/`, `design.md`, `tasks.md`). Este plan es la entrada para esos comandos y la guía para no improvisar durante `/sdd-apply`.

## 2. Punto de partida verificado

| Elemento | Estado real |
| --- | --- |
| `backend/app/modules/menus/*.py` | Cinco archivos vacíos (solo docstring). Sin modelos, sin rutas. |
| `backend/app/modules/menus/router.py` en `main.py` | **No registrado**: `main.py` solo incluye `productos_router` y `salon_router`. |
| `backend/app/modules/menus/models.py` en `alembic/env.py` | **Ya registrado** (`MODULOS_CON_MODELOS`). No hay que tocarlo. |
| `frontend/src/modules/menus/` | `MenusPage.tsx` con un `EmptyState` de «pendiente»; `api.ts` llama a `/menus` (ruta inexistente); `types.ts` con un `MenuPromocion` inventado. |
| `Categoria.MENU_DEL_DIA` | **Ya existe** en `app/shared/models/enums.py`. La tabla `productos` ya soporta la categoría; el mínimo único es por `(categoria, nombre_normalizado)`. |
| `Producto` | Entidad **compartida** (`app/shared/models/producto.py`), usada por menús, atención y pagos (D-05). |
| `/api/v1/carta` | Lista los productos de las secciones **sin filtrar categoría**, así que un menú del día aparece solo. |
| Contrato de importaciones | `app.modules.menus` puede importar `app.modules.productos.service` (y `productos.imagenes`), pero **no** `productos.router/repository/models/schemas` (`pyproject.toml`, import-linter). |
| Entorno local | La base estaba sin migrar (`alembic current` vacío). Antes de empezar: `alembic upgrade head` desde `backend/`. |

## 3. Decisiones de diseño

| # | Decisión | Alternativa descartada | Por qué |
| --- | --- | --- | --- |
| M2-D1 | **Dos cambios de SDD**, no uno: `HU-M2-01-02-03` (Menú Ejecutivo) y `HU-M2-04-05-06` (Menú del día). | Un cambio único con las seis HU. | AGENTS.md §4 prohíbe juntar entidades distintas en un mismo cambio, aunque el responsable sea el mismo. |
| M2-D2 | `MenuEjecutivo` es tabla propia en `menus/models.py` (nombre, descripción, precio fijo, estado, `seccion_id`, productos por tabla intermedia). | Guardar los productos como `JSON`. | El diagrama define la asociación con `Producto`; un `JSON` no permite validar contra `productos` ni mantener la integridad referencial (RNF-SEG-06). |
| M2-D3 | **Menú del día = `Producto` con `Categoria.MENU_DEL_DIA`**, expuesto por M2 en `/api/v1/menus-del-dia`. | Tabla `MenuDelDia` propia en `menus/models.py`. | Los datos de HU-M2-04 son exactamente los de `Producto`; la categoría ya existe en el enum y en el índice único, y así el menú del día aparece en la carta sin tocar M1. |
| M2-D4 | Para escribir un menú del día, M2 llama a **funciones públicas nuevas de `productos.service`**, que reciben valores simples y devuelven el producto. | M2 importa `productos.schemas` y construye el `ProductoCrear`; o M2 escribe directo sobre `Producto`. | El contrato de importaciones prohíbe importar `productos.schemas`, y duplicar validaciones y manejo de imágenes en M2 rompe D-03 y RNF-MAN-10. |
| M2-D5 | Unicidad de `nombre` del menú ejecutivo con `nombre_normalizado` + índice único, igual que `secciones` y `sectores`. | `UNIQUE` sobre `nombre`. | El CA compara nombres «que ya pertenecen a otro menú» sin distinguir mayúsculas ni tildes; `casefold()` es el criterio ya usado en el proyecto. |
| M2-D6 | La baja es `POST /{id}/baja` que pasa a `DESHABILITADO`; la reactivación es `PUT` con `estado: HABILITADO`. | `DELETE` físico, o una ruta `/reactivar`. | D-24 (acción sobre subrecurso verbal) y consistencia con `productos` y `salon`: nunca se borra, porque comandas y facturas referencian. |
| M2-D7 | El «precio y composición históricos» **no** se copian en M2: los copian M4 (`DetalleComanda.precioUnitario`) y M6 (`DetalleFactura.precioUnitario`), como dice el diagrama. | Tabla de versiones del menú en M2. | El diagrama marca `{copia al pedir}` / `{copia al emitir}` en M4 y M6. M2 solo debe garantizar que modificar no altera filas ajenas. |
| M2-D8 | M2 consulta los productos del selector con su **propia** función de `menus/api.ts` contra `GET /api/v1/productos`. | Importar `productos/api.ts`. | Un módulo no importa archivos internos de otro (D-15). La duplicación es de una línea de URL, no de lógica. |
| M2-D9 | La pantalla replica la maqueta `SPRINT-2/S2-04-maqueta/menus.html`: tres pestañas, lista y formulario lateral, chips de productos. La pestaña «Promociones» queda visible y deshabilitada. | Una sola lista sin pestañas. | La maqueta es guía visual; Promociones no tiene HU en este sprint. |

## 4. Contradicciones y supuestos a validar

| # | Punto | Supuesto propuesto |
| --- | --- | --- |
| S-M2-01 | La propuesta de M1 (`openspec/changes/archive/2026-10-26-HU-M1-02-03-13/proposal.md`, S26) trata al menú del día como «entidad de M2 aún sin implementar», distinta de `Producto`. HU-M2-04 dice «categoría MENU_DEL_DIA, la asigna el sistema al crear **el producto**». | Gana la HU: menú del día es `Producto` con `Categoria.MENU_DEL_DIA` (M2-D3). **Avisar a Franco (M1)**: su listado de productos va a incluir los menús del día cuando estén implementados, porque `GET /productos` no filtra categoría. |
| S-M2-02 | HU-M2-01 pide que el menú ejecutivo «se muestre en una sección de la carta», pero `/carta` es de M1 y devuelve `SeccionCarta` con productos solamente. | Fuera de alcance: este sprint registra el menú con su sección y estado. Mostrarlo en `/carta` requiere extender el `schema` de M1 y va como pedido aparte a Franco. El CA 1 no lo exige (solo «queda registrado… dentro de la sección elegida»). |
| S-M2-03 | No hay HU de «listar menús». | El listado entra en cada cambio ABM, como pide el objetivo del sprint («como mínimo, crear y listar»). |
| S-M2-04 | El CA 3 de HU-M2-01 habla de nombre único «en todo el sistema»; el índice de `productos` es por categoría. | El menú ejecutivo es su propia tabla: la unicidad es global sobre `menus_ejecutivos` y no colisiona con nombres de productos. |
| S-M2-05 | Los criterios de «precio inválido» no fijan la precisión. | `Numeric(10,2)` y `> 0`, igual que `Producto` (S4 de M1). |
| S-M2-06 | HU-M2-04 exige foto con cámara del celular (`capture`), pero no define el tamaño del formulario. | `input type="file" accept="image/*" capture="environment"` en la variante móvil; el backend no cambia: `productos.imagenes` ya acepta JPG, PNG y HEIC y recodifica HEIC a JPEG. |
| S-M2-07 | ¿Un producto deshabilitado dentro de un menú ejecutivo vigente bloquea la baja del producto (M1)? | No. M2 solo valida al crear o modificar el menú. Se coordina con M1, que ya asumió lo mismo (S20 de su propuesta). |
| S-M2-08 | ¿Se puede dar de baja un menú ya deshabilitado? | Sí con 409 «El menú ejecutivo ya está deshabilitado», consistente con productos y secciones. |
| S-M2-09 | El filtro de la lista de menús no está en la HU. | Se agrega `estado` (Habilitado / Deshabilitado / Todos), por consistencia con `GET /productos` (D-27 y M1-D). |

**Decisión que bloquea el arranque de HU-M2-04** (AGENTS.md §4, caso 1): M2-D4 toca `productos.service`, que es de otro integrante. Hay que acordarlo con Franco antes de `/sdd-apply` del segundo cambio.

## 5. Contratos de la API

### Cambio A · `/api/v1/menus-ejecutivos`

| Método y ruta | Cuerpo | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /menus-ejecutivos` | `MenuEjecutivoCrear` (JSON) | `201` `MenuEjecutivoSalida` | `422` datos inválidos · `404` producto o sección inexistente · `409` nombre repetido, producto deshabilitado, producto `MENU_DEL_DIA`, sección deshabilitada |
| `GET /menus-ejecutivos?estado=&limit=&offset=` | — | `200` `Pagina[MenuEjecutivoListado]` | `422` filtro inválido |
| `GET /menus-ejecutivos/{id}` | — | `200` `MenuEjecutivoSalida` | `404` |
| `PUT /menus-ejecutivos/{id}` | `MenuEjecutivoModificar` | `200` `MenuEjecutivoSalida` | iguales a `POST` |
| `POST /menus-ejecutivos/{id}/baja` | — | `200` `MenuEjecutivoSalida` | `404` · `409` ya deshabilitado |

`MenuEjecutivoCrear`: `nombre` (1..100), `precio_fijo` (`Decimal > 0`, 2 decimales), `producto_ids` (`list[int]`, mínimo 1), `seccion_id` (`> 0`), `descripcion` (0..500, opcional).
`MenuEjecutivoModificar`: lo anterior + `estado: Estado | None` (ausente conserva).
`MenuEjecutivoSalida`: `id`, `nombre`, `descripcion`, `precio_fijo` (serializado con 2 decimales), `estado`, `seccion` (`SeccionResumen`), `productos` (`list[ProductoResumen]`).

### Cambio B · `/api/v1/menus-del-dia`

| Método y ruta | Cuerpo | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /menus-del-dia` | multipart: `datos` (JSON) + `imagen` (opcional) | `201` `MenuDelDiaSalida` | `422` · `404` sección inexistente · `409` nombre repetido en la categoría, sección deshabilitada |
| `GET /menus-del-dia?estado=&limit=&offset=` | — | `200` `Pagina[MenuDelDiaListado]` | `422` |
| `GET /menus-del-dia/{id}` | — | `200` `MenuDelDiaSalida` | `404` |
| `PUT /menus-del-dia/{id}` | multipart: `datos` + `imagen` + `quitar_imagen` | `200` `MenuDelDiaSalida` | iguales a `POST` |
| `POST /menus-del-dia/{id}/baja` | — | `200` `MenuDelDiaSalida` | `404` · `409` ya deshabilitado |

`MenuDelDiaCrear`: los mismos campos que un producto (`nombre`, `precio`, `ingredientes` mínimo 1, `descripcion`, `etiquetas`, `seccion_id`), sin `categoria` ni `estado` (`extra="forbid"`), igual que `ProductoCrear`. La categoría y el estado los fija el sistema.

## 6. Cambio A · HU-M2-01-02-03 · Menú Ejecutivo

**Rama:** `feature/HU-M2-01-02-03-abm-menu-ejecutivo` · **PR:** uno solo, con `Closes #21`, `Closes #22`, `Closes #23`.

### 6.1 Fase 0 · Spec

- `/sdd-ff HU-M2-01-02-03` con este documento como entrada: `exploration.md`, `proposal.md`, `specs/menus-ejecutivos/spec.md` (un escenario por CA), `design.md`, `tasks.md`.
- Revisión de la spec con el equipo **antes** de `/sdd-apply` (AGENTS.md §4).

### 6.2 Fase 1 · Modelo y migración

- `menus/models.py`: `MenuEjecutivo` con `nombre`, `nombre_normalizado` (validador `@validates`, como `Seccion`), `descripcion`, `precio_fijo` (`Numeric(10,2)`), `estado` (default `HABILITADO`), `seccion_id` (`ForeignKey("secciones.id", ondelete="RESTRICT")`, indexado) y la tabla intermedia `menu_ejecutivo_productos(menu_ejecutivo_id, producto_id)` con clave primaria compuesta y `ondelete="CASCADE"` del lado del menú.
- Restricciones: `CheckConstraint("precio_fijo > 0")` y `Index(unique=True)` sobre `nombre_normalizado`.
- Migración `d6b7c8e9f0a1_crea_menus_ejecutivos.py` con `down_revision = "b2d4f6a8c0e1"` (la cabeza actual) y `downgrade` completo. `alembic/versions` está excluido de ruff: no hace falta formatearla.
- Pruebas: `tests/modules/menus/test_migracion.py` (tabla, índice único, FK, `CheckConstraint`), `test_modelo.py` (normaliza el nombre; precio negativo lo rechaza la base).
- **No** se toca `alembic/env.py`: el módulo ya está registrado.

### 6.3 Fase 2 · Backend de alta y listado (lo mínimo entregable)

| Tarea | Detalle |
| --- | --- |
| 2.1 Rojo · `test_schemas.py` | `nombre` vacío y de 101 caracteres; `precio_fijo` `0`, negativo y con 3 decimales; `producto_ids` vacío; `descripcion` de 501; `categoria` o `estado` en el alta → `extra="forbid"`. |
| 2.2 Rojo · `test_router.py` | CA 1 crear 201 · CA 2 falta un obligatorio 422 · CA 3 nombre repetido 409 · CA 4 precio ≤ 0 422 · CA 5 sin productos 422 · CA 6 producto deshabilitado 409 · CA 7 producto `MENU_DEL_DIA` 409 · `GET` lista paginada y filtrada por estado. |
| 2.3 Rojo · `test_service.py` | `test_crear_menu_ejecutivo_orden_de_validacion`, `test_crear_menu_ejecutivo_seccion_inexistente_404`, `test_crear_menu_ejecutivo_seccion_deshabilitada_409`, `test_crear_menu_ejecutivo_no_escribe_si_falla` (atomicidad: nada queda guardado). |
| 2.4 Verde | `schemas.py`, `repository.py` (`obtener`, `existe_nombre_normalizado`, `listar` con join a sección, `agregar`), `service.py` (`crear_menu_ejecutivo`, `listar_menus_ejecutivos`, helpers de validación), `router.py` (`POST`, `GET`). |
| 2.5 Verde · `main.py` | Registrar `menus_router` con `prefix=API_PREFIX`. **Archivo compartido**: avisar en el PR (AGENTS.md §9.3). |
| 2.6 Verificación | `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`. |
| 2.7 Commit | `feat: permite crear y listar menús ejecutivos (HU-M2-01)` |

### 6.4 Fase 3 · Modificar y dar de baja

| Tarea | Detalle |
| --- | --- |
| 3.1 Rojo | CA 1 de HU-M2-02 (datos nuevos) · CA 2 (agregar y quitar productos, mínimo uno) · CA 3 (cada validación del alta, con 422/409) · CA 4 (modificar no altera filas relacionadas: tabla de prueba con FK a `menus_ejecutivos.id`) · CA 5 (reactivar un deshabilitado) · HU-M2-03 CA 1 a 4 (baja, cancelación en el frontend, datos conservados, productos del menú intactos). |
| 3.2 Verde | `PUT` y `POST /{id}/baja` en `service` y `router`; `MenuEjecutivoModificar`. |
| 3.3 Commit | `feat: permite modificar y dar de baja un menú ejecutivo (HU-M2-02-03)` |

### 6.5 Fase 4 · Frontend

| Tarea | Detalle |
| --- | --- |
| 4.1 Rojo · `api.test.ts` | Las cinco funciones con `vi.mock` del cliente: rutas, métodos y cuerpo. |
| 4.2 Verde · `types.ts` y `api.ts` | `MenuEjecutivo`, `MenuEjecutivoCrear`, `MenuEjecutivoModificar`, `MenuEjecutivoListado`; se borra el `MenuPromocion` inventado. `listarProductosHabilitados()` propio (M2-D8), filtrando `MENU_DEL_DIA` en el cliente. |
| 4.3 Rojo/Verde · `MenusPage.tsx` | Pestañas «Menús ejecutivos / Menú del día / Promociones (Sprint 3)» con `tabs.tsx`; la pestaña de ejecutivos reemplaza el `EmptyState`. |
| 4.4 Rojo/Verde · lista | `MenuEjecutivosTabla.tsx` (nombre, sección, chips de «incluye», precio fijo, estado, acciones) con `data-table`, `status-badge` y `pagination`. Estado vacío propio. |
| 4.5 Rojo/Verde · formulario | `FormularioMenuEjecutivo.tsx` + `SelectorProductosMenu.tsx` (buscador y chips, como la maqueta), `validarMenuEjecutivo.ts`, `useFormularioMenuEjecutivo.ts`. El formulario no envía si la validación local falla; el 409 se muestra bajo el nombre. |
| 4.6 Rojo/Verde · edición y baja | `useEdicionMenuEjecutivo.ts` y `useBajaMenuEjecutivo.ts` con `ConfirmDialog`; el interruptor de estado aparece solo en edición. |
| 4.7 Verificación | `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`. |
| 4.8 Commit | `feat: agrega la pantalla de menús ejecutivos (HU-M2-01-02-03)` |

### 6.6 Trazabilidad de criterios de aceptación (cambio A)

| HU | CA | Prueba |
| --- | --- | --- |
| M2-01 | 1 alta válida | `test_crear_menu_ejecutivo_201` |
| M2-01 | 2 falta obligatorio | `test_crear_menu_ejecutivo_sin_nombre_422`, `..._sin_precio_422`, `..._sin_productos_422`, `..._sin_seccion_422` |
| M2-01 | 3 nombre repetido | `test_crear_menu_ejecutivo_nombre_duplicado_409` (incluye uno deshabilitado y distinto de mayúsculas) |
| M2-01 | 4 precio inválido | `test_crear_menu_ejecutivo_precio_cero_422`, `..._precio_negativo_422` |
| M2-01 | 5 sin productos | `test_crear_menu_ejecutivo_sin_productos_422` |
| M2-01 | 6 producto deshabilitado | `test_crear_menu_ejecutivo_producto_deshabilitado_409` |
| M2-01 | 7 producto MENU_DEL_DIA | `test_crear_menu_ejecutivo_producto_menu_del_dia_409` |
| M2-02 | 1 datos generales | `test_modificar_menu_ejecutivo_datos_200` |
| M2-02 | 2 composición | `test_modificar_menu_ejecutivo_agrega_y_quita_productos_200` |
| M2-02 | 3 validaciones | `test_modificar_menu_ejecutivo_nombre_duplicado_409`, `..._precio_invalido_422`, `..._sin_seccion_422`, `..._sin_productos_422` |
| M2-02 | 4 histórico intacto | `test_modificar_menu_ejecutivo_conserva_filas_relacionadas` |
| M2-02 | 5 reactivar | `test_modificar_menu_ejecutivo_reactiva_200` |
| M2-03 | 1 baja | `test_dar_de_baja_menu_ejecutivo_200` (sale de la lista de habilitados) |
| M2-03 | 2 cancelar | `useBajaMenuEjecutivo.test.tsx`: cancelar no envía |
| M2-03 | 3 datos conservados | `test_dar_de_baja_menu_ejecutivo_conserva_datos` |
| M2-03 | 4 productos intactos | `test_dar_de_baja_menu_ejecutivo_no_toca_los_productos` |

## 7. Cambio B · HU-M2-04-05-06 · Menú del día

**Rama:** `feature/HU-M2-04-05-06-abm-menu-del-dia` · **PR:** uno solo, con `Closes #25`, `Closes #26`, `Closes #27`.
**Requisito previo:** M2-D4 acordado con el responsable de M1.

### 7.1 Fase 0 · Spec

`/sdd-ff HU-M2-04-05-06`. La spec fija el contrato de `/menus-del-dia` y deja escrito que la entidad es `Producto` (S-M2-01).

### 7.2 Fase 1 · Extensión acordada de `productos.service`

- Funciones públicas nuevas (≈30 líneas, sin `fastapi`, sin consultas: delegan en lo que ya existe): `crear_producto_de_categoria(db, categoria, datos, imagen)`, `modificar_producto_de_categoria(db, categoria, id, datos, imagen, quitar_imagen)` y `obtener_productos_por_ids(db, ids)`.
- Aceptan valores simples o un `ProductoCrear` construido **dentro** de `productos.service`, para que `menus` nunca importe `productos.schemas`.
- Pruebas en `backend/tests/modules/productos/`: las nuevas funciones se comportan igual que las de plato (unicidad, sección habilitada, imagen). La suite existente debe seguir verde.
- Commit aparte: `feat: expone en productos.service las operaciones que usa menús (HU-M2-04)`.

### 7.3 Fase 2 · Backend de alta y listado

| Tarea | Detalle |
| --- | --- |
| 2.1 Rojo · router | CA 1 alta 201 en estado `HABILITADO` · CA 2 falta obligatorio 422 · CA 3 nombre repetido en `MENU_DEL_DIA` 409 (sin distinguir mayúsculas) · CA 4 nombre de 101 → 422 · CA 5 precio `0`, negativo o con 3 decimales → 422 · CA 6 ingrediente vacío o repetido → 422 · CA 7 sin ingredientes → 422 · CA 8 descripción de 501 → 422 · CA 9 sin secciones habilitadas (frontend) · CA 10 sección deshabilitada 409 · CA 11 imagen de otro formato o de más de 5 MB → 422 · CA 13 HEIC se guarda como JPEG y se sirve · CA 14 etiqueta vacía, larga o repetida → 422 · CA 15 sin descripción, imagen ni etiquetas 201. |
| 2.2 Verde | `menus/schemas.py` (`MenuDelDiaCrear`, `MenuDelDiaModificar`, `MenuDelDiaSalida`, `MenuDelDiaListado`, filtros), `repository.py` (listado por categoría con join a sección), `service.py` (traduce a `productos.service`), `router.py` (multipart con la dependencia `datos_de`, como en `productos/router.py`). |
| 2.3 Carta | `test_router.py`: un menú del día habilitado aparece en `GET /api/v1/carta` sin cambios en M1. |
| 2.4 Verificación y commit | `ruff … && lint-imports && pytest`; `feat: permite crear y listar menús del día (HU-M2-04)`. |

### 7.4 Fase 3 · Modificar y dar de baja

- CA 1 a 5 de HU-M2-05: datos nuevos, ingredientes/etiquetas/imagen, validaciones completas, precio histórico intacto, reactivación.
- CA 1 a 4 de HU-M2-06: baja a `DESHABILITADO`, cancelación, datos conservados, filtro por Deshabilitados que lo encuentra para reactivarlo.
- `PUT` con `quitar_imagen` reutiliza el comportamiento de productos (borra el archivo anterior después del `commit`).
- Commit: `feat: permite modificar y dar de baja un menú del día (HU-M2-05-06)`.

### 7.5 Fase 4 · Frontend

- Pestaña «Menú del día»: tabla (nombre, descripción, sección, precio, estado, acciones) y formulario con ingredientes, etiquetas e imagen.
- Reutilización: `data-table`, `status-badge`, `pagination`, `tabs`, `dialog`, `switch`, `useConfirm`, `useApi`, `usePaginacion`.
- **Imagen:** `SelectorImagen` vive en `modules/productos/components/` y no se puede importar (D-15). Decisión pendiente: promoverlo a `shared/components/ui/` como componente neutro (cambio compartido, coordinado con M1) o escribir `SelectorImagenMenuDia.tsx` en M2 y anotar la duplicación como deuda. Recomendado: promoverlo, en un commit propio y avisado en el PR.
- CA 9 (sin secciones habilitadas) y CA 12 (cámara en el celular) se resuelven en el formulario: aviso con enlace a Secciones y `capture="environment"`.
- Commits: `feat: agrega la capa de datos de menús del día (HU-M2-04)` y `feat: agrega la pantalla de menú del día (HU-M2-04-05-06)`.

## 8. Verificación antes de cada commit

Desde `backend/`, con el entorno activo:

```bash
ruff check --fix . && ruff format .
ruff check . && ruff format --check . && lint-imports && pytest
```

Desde `frontend/`:

```bash
npm run format
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build
```

| Control | Umbral |
| --- | --- |
| `ruff`, `npm run lint` | 0 errores, 0 advertencias |
| `lint-imports` | `menus` no importa `productos.{router,repository,models,schemas}` |
| `pytest` | cobertura ≥ 70 % |
| `npm run test:coverage` | cobertura ≥ 60 % |

## 9. Presupuesto de revisión (informativo)

| Cambio | Backend | Frontend |
| --- | --- | --- |
| A · Menú Ejecutivo | ≈ 950 líneas (≈ 380 de código, ≈ 570 de pruebas) | ≈ 1.150 líneas (≈ 450 de código, ≈ 700 de pruebas) |
| B · Menú del día | ≈ 800 líneas, más ≈ 80 en `productos.service` | ≈ 1.000 líneas |

Ambos superan el punto de control de 800 líneas por lado. Es informativo: una HU nunca se divide en varios PR (AGENTS.md §4). El número final se anota en el PR.

## 10. Coordinación y dependencias

| Con | Qué | Cuándo |
| --- | --- | --- |
| Franco (M1) | M2-D4: funciones públicas en `productos.service`; S-M2-01: el listado de productos incluirá menús del día; S-M2-02: menús ejecutivos en la carta queda para otra HU | Antes de `/sdd-apply` del cambio B |
| Franco (M1) | `main.py` registra `menus_router`; posible promoción de `SelectorImagen` a `shared/` | Durante el cambio A |
| Héctor (M6) y Juan Ignacio (M4) | D-07: ellos copian precio y composición al pedir y al emitir; M2 no versiona | Informativo |
| Equipo | Revisión de la spec antes de `/sdd-apply` y aprobación del PR (otro integrante, CI en verde) | Cada cambio |

## 11. Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Atraso del sprint (R01): no llega el ABM completo | Alta | Orden Crear y Listar → Modificar → Dar de baja. Si el 26/10 hay atraso, se entrega solo la Fase 2 de cada cambio y se avisa en la daily. |
| La extensión de `productos.service` no se acuerda a tiempo | Media | Empezar el cambio A (no depende de M1 más allá de lo ya integrado) mientras se negocia. |
| Menús del día aparecen en la lista de productos de M1 antes de lo previsto | Media | S-M2-01 avisado; no rompe nada porque `ProductosPage` ya etiqueta `MENU_DEL_DIA`. |
| Duplicación del selector de imagen | Media | Promoverlo a `shared/` si hay acuerdo; si no, deuda anotada en el PR. |
| El índice único de nombre choca con datos de prueba | Baja | Cada prueba usa su base temporal (D-14). |
| Superar el límite de 800 líneas por lado | Alta | Informativo; revisión por capas, un commit por fase. |

## 12. Checklist de cierre

- [ ] Cada HU de la tabla tiene su spec, su código y sus pruebas en `develop` (como mínimo, crear y listar).
- [ ] Existe una prueba por criterio de aceptación; al menos una de camino feliz y una de error o límite por HU.
- [ ] Las dependencias con M1 se usan solo a través de su `service` y `lint-imports` pasa.
- [ ] `menus.models` sigue registrado en `backend/alembic/env.py` y `alembic upgrade head` aplica sin errores sobre una base vacía.
- [ ] CI en verde y cobertura ≥ 70 % (backend) y ≥ 60 % (frontend).
- [ ] Las tarjetas se movieron a «In Progress» y, al integrarse cada PR, a «En Testing».
- [ ] Los supuestos S-M2-01 a S-M2-09 quedaron validados por el equipo.
