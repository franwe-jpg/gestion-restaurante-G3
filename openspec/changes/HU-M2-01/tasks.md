# Tareas: HU-M2-01 Crear un menú ejecutivo

## Review Workload Forecast

| Campo | Valor |
|---|---|
| Líneas cambiadas estimadas | Backend ≈ 650 (código 250 + pruebas 400); frontend ≈ 550 (código 250 + pruebas 300) |
| Presupuesto por lado | Dentro del punto de control de 800 líneas por lado |
| PR encadenados | No; el repo fija un solo PR por HU |
| Estrategia de entrega | `single-pr` |

## Estado previo

La exploración, propuesta, especificación, diseño y tareas fueron preparadas y el usuario autorizó aplicar la propuesta tal como está. Proceder con Strict TDD; registrar cada resultado en `apply-progress.md`.

## Fase 1: Backend — persistencia

- [x] 1.1 RED: pruebas de migración para tabla, índices, FK, precio positivo, upgrade y downgrade que conserva tablas M1.
- [x] 1.2 RED: pruebas del modelo para normalización y restricciones.
- [x] 1.3 GREEN: modelo `MenuEjecutivo`, tabla de asociación y migración con downgrade completo.
- [x] 1.4 REFACTOR: `ruff check --fix .` y `ruff format .`; ejecutar las pruebas de migración/modelo.

## Fase 2: Backend — alta y consulta

- [x] 2.1 RED: schemas para obligatorios, límites acordados, extras prohibidos y lista de productos.
- [x] 2.2 RED: service y router para los siete criterios, sección inexistente/deshabilitada, integridad y atomicidad.
- [x] 2.3 GREEN: repository, service, schemas, `POST`/`GET` paginado y registro de `menus_router` en `main.py`.
- [x] 2.4 REFACTOR: verificar import-linter y errores `{"detalle": ...}`.

## Fase 3: Frontend — alta y listado

- [x] 3.1 RED/GREEN: tipos y pruebas de cliente para alta, listado, productos y secciones.
- [x] 3.2 RED/GREEN: validación local y formulario con productos como chips, errores del servidor y estado inicial asignado por backend.
- [x] 3.3 RED/GREEN: pantalla/listado vacío y con registros, estado de carga/error y actualización tras alta.
- [x] 3.4 REFACTOR: `npm run format`; comprobar límites entre módulos y contraste con la maqueta.

## Fase 4: Verificación y cierre

- [x] 4.1 Backend: `ruff check . && ruff format --check . && lint-imports && pytest`; `alembic heads` con una sola cabeza y upgrade/downgrade en base temporal.
- [x] 4.2 Frontend: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] 4.3 Revisar diff y cerrar con `Risk: item 1 (nueva migración y datos persistentes)`.
