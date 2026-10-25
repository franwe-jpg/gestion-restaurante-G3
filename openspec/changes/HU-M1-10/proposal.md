# Propuesta: HU-M1-10 Crear una sección de la carta

- **Issue:** [#14](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/14) (épica #13). Tarea madre: #165. Rama: `feature/HU-M1-10-crear-seccion`.

## Intención

El encargado no puede agrupar los productos de la carta: no existen `Seccion` ni `Producto` en el código. Esta HU crea la sección y deja la tabla `productos`, de la que dependen HU-M1-01, 04 y 07 y los menús de M2 (camino crítico del Sprint 2).

## Alcance

### Incluido

- `POST /api/v1/secciones` (201) que cubre los 8 criterios de aceptación.
- `GET /api/v1/secciones` paginado (D-27), ordenado por `orden`, sin filtros (ver D2).
- `Producto` como modelo y tabla, con todas las columnas del diagrama y el enum `Categoria`. Su único endpoint en esta HU es `GET /api/v1/productos` de solo lectura (habilitados, con su sección actual), para alimentar el selector (ver D3). El alta, la modificación y la baja siguen en sus HU.
- Una migración de Alembic con `secciones` y `productos`.
- Frontend: pestaña «Secciones» en `ProductosPage` según la maqueta, tabla y diálogo «Nueva sección» (nombre, orden y selector de productos habilitados), con la confirmación del traslado del criterio 8. Mientras no exista HU-M1-01 el selector aparece vacío. Alinear `types.ts` con el diagrama.
- Una prueba por criterio de aceptación.

### Excluido

- Modificar, deshabilitar o habilitar secciones (HU-M1-11, HU-M1-12).
- Alta, modificación y baja de productos y sus reglas, como el nombre único por categoría (HU-M1-01, 04, 07).
- Vista de la carta (HU-M1-14), filtros del listado, autenticación y roles.

## Capacidades

### Nuevas

- `carta-secciones`: alta y listado de secciones, y asignación o traslado de productos a una sección.

### Modificadas

- Ninguna.

## Enfoque

Enfoque A de la exploración (decidido). Capas `router → service → repository → models`; errores de negocio con `shared/excepciones.py` (404, 409) y validación con Pydantic (422). Es el primer CRUD del repositorio: fija el patrón.

Ubicación recomendada: `Estado` (lo usan siete clases de M1, M2, M3 y M6), `Categoria` y `Producto` (referenciado por M2, M4 y M6) en `backend/app/shared/models/`, según D-05 y RNF-MAN-09. S0-09 no cerró otra lista. `Seccion` va en `productos/models.py`. Hay que avisar al equipo (AGENTS.md §9.3).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | Nombre: se aplica `strip()`; vacío o de más de 50 caracteres → 422. Único contra todas las secciones, también las deshabilitadas, comparando con `casefold()` → 409. |
| S2 | Orden: entero estricto mayor a cero (rechaza `"3"`, `2.0` y `true`) → 422. Ocupado por una sección habilitada → 409, sin desplazar a las demás. |
| S3 | Productos: lista opcional de ids. Inexistente → 404; deshabilitado → 409; ids repetidos → 422. |
| S4 | Criterio 8: campo `confirmar_traslado` (por defecto `false`). Con `false`, si algún producto pertenece a otra sección → 409 que nombra el producto y su sección actual; con `true`, se trasladan en la misma transacción. Como la sección del producto es obligatoria, toda selección es un traslado. |
| S5 | Respuesta 201: `id`, `nombre`, `orden`, `estado` y `productos` (`id`, `nombre`). |
| S6 | `productos.seccion_id` obligatorio, con `ON DELETE RESTRICT` (R17). |

## Decisiones tomadas

Decididas por el responsable del módulo el 25/10/2026.

- **D1.** `Producto`, `Estado` y `Categoria` van en `shared/models/` (D-05). `Seccion` queda en `productos/models.py`.
- **D2.** Se incluye el `GET /api/v1/secciones` paginado, porque la pestaña y el criterio 1 lo necesitan. Implica implementar `shared/paginacion.py`.
- **D3.** El selector de productos se implementa en esta HU, alimentado por un `GET /api/v1/productos` mínimo de solo lectura (paginado, solo habilitados, con su sección actual). Hasta HU-M1-01 aparece vacío; se acepta.

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/*` | Modificado |
| `backend/app/shared/models/` | Nuevo (D1) |
| `backend/app/shared/paginacion.py` | Modificado (D2) |
| `backend/app/main.py` | Modificado: primer `include_router` |
| `backend/alembic/versions/` | Nueva migración |
| `backend/tests/conftest.py`, `backend/tests/modules/productos/` | Nuevo |
| `frontend/src/modules/productos/*` | Modificado |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El backend se acerca al punto de control de 800 líneas (≈ 720). | Es un punto de control, no un bloqueo; la HU va en un solo PR y se revisan código y pruebas por separado. |
| Los demás módulos copian el patrón. | Revisión del equipo antes de integrar. |
| Se tocan archivos compartidos. | Avisar a los responsables antes del PR. |
| El equipo rechaza algún supuesto. | Validarlos en la revisión de la spec. |

## Plan de reversión

- `alembic downgrade -1` elimina `productos` y luego `secciones`. La migración anterior está vacía: no se pierden datos previos.
- Revertir el merge del PR en `develop`; ningún otro módulo usa todavía estas tablas.

## Dependencias

- Ninguna HU previa. Habilita HU-M1-01, 04 y 07 y las HU de M2 que usan secciones.

## Criterios de éxito

- [ ] Cada criterio de aceptación tiene una prueba que pasa.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] `alembic upgrade head` y `alembic downgrade -1` funcionan sobre una base vacía.
- [ ] El equipo valida S1 a S6.
