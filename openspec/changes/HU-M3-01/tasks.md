# Tareas: HU-M3-01 Agregar un sector

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 435 (código 185 + pruebas 250); frontend ≈ 430 (código 230 + pruebas 200) |
| Riesgo frente al límite de revisión | Bajo (ambos lados, muy por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 5 commits por unidad de trabajo |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

Nota: AGENTS.md §4 y `openspec/config.yaml` fijan un PR por HU; el límite 800/800 es un punto de control, no un bloqueo.

### Unidades de trabajo (commits dentro del PR único)

| Unidad | Objetivo | Commit | Prueba focalizada | Arnés de ejecución | Límite de reversión |
|--------|----------|--------|-------------------|--------------------|---------------------|
| 1 | Migración y modelo `Sector` | `feat` | `pytest tests/modules/salon/test_migracion.py tests/modules/salon/test_modelo.py` | `alembic upgrade head` / `downgrade -1` en base temporal | Revisión, `models.py` y sus pruebas |
| 2 | Esquemas de entrada y salida | `feat` | `pytest tests/modules/salon/test_schemas.py` | N/A | `schemas.py` y su prueba |
| 3 | Repositorio, servicio, router y registro en `main.py` | `feat` | `pytest tests/modules/salon` | `TestClient` con base migrada | Capas de `salon/`, `main.py` y sus pruebas |
| 4 | Cliente, tipos y formulario (lógica) | `feat` | `npm test -- salon` | N/A: sin pantalla todavía | `types.ts`, `api.ts`, `components/`, `validarSector.ts` |
| 5 | Diálogo y página del salón | `feat` | `npm test -- salon` | `npm run dev` y alta manual | `SectorFormDialog.tsx`, `SalonPage.tsx` y pruebas |

**Ruta de implementación:** delegado en dos escritores paralelos para las unidades 1 a 3 (backend) y 4 a 5 (frontend), con superficies de edición disjuntas; el padre revisa cada diff, ejecuta la suite completa como chequeo de costura y hace los commits. Motivo: dos unidades independientes de varios cientos de líneas cada una (Writer trigger, paralelismo).

## Fase 1: Backend

- [x] 1.1 RED: `backend/tests/modules/salon/test_migracion.py` — `upgrade head` crea `sectores` con sus columnas e índice único; `downgrade -1` la elimina y conserva las tablas de M1. Verificar `alembic heads` con una sola cabeza.
- [x] 1.2 GREEN: `Sector` en `backend/app/modules/salon/models.py` (A1, A4) y revisión Alembic `<rev>_crea_sectores.py` con `down_revision = "c4e6a8b0d2f4"` en modo batch.
- [x] 1.3 RED: `test_schemas.py` — nombre de 30 y 31, vacío y solo espacios, descripción de 200 y 201, `""` → `None`, `estado` extra → 422.
- [x] 1.4 GREEN: `SectorCrear` y `SectorSalida` en `salon/schemas.py` (A2, A3).
- [x] 1.5 RED: `test_service.py` con `fabrica_sector` en `conftest.py` — alta mínima y con descripción; estado `HABILITADO`; nombre recortado; repetido con otra capitalización y con tilde; repetido contra uno deshabilitado; `IntegrityError` → 409 sin fila.
- [x] 1.6 GREEN: `repository.existe_nombre_normalizado`, `repository.agregar` y `service.crear_sector`.
- [x] 1.7 RED: `test_router.py` — 201 y forma de `SectorSalida`; 422 parametrizado por campo; `estado` enviado → 422; 409 con `detalle`.
- [x] 1.8 GREEN: `router.py` con `POST /sectores` e `include_router` del salón en `main.py` (compartido, A6).
- [x] 1.9 REFACTOR: `ruff check --fix . && ruff format .`, `lint-imports` y funciones de hasta 50 líneas.

## Fase 2: Frontend

- [x] 2.1 RED/GREEN: `types.ts` (`Estado`, `Sector`, `SectorCrear`) y `crearSector` en `api.ts` con prueba (ruta, cuerpo e `id`).
- [x] 2.2 RED/GREEN: `components/validarSector.ts` + prueba (nombre vacío, 30/31, descripción 200/201, `errorDelServidor` del 409).
- [x] 2.3 RED/GREEN: `components/useFormularioSector.ts` + prueba (envío con nombre recortado y descripción nula, toast, 409 bajo Nombre, no envía con errores locales).
- [x] 2.4 RED/GREEN: `components/SectorFormDialog.tsx` + prueba (campos, «Estado: Habilitado» fijo, cancelar sin llamada, guardar).
- [x] 2.5 RED/GREEN: `SalonPage.tsx` + prueba (encabezado, botón «Nuevo sector», apertura y cierre del diálogo, `EmptyState` del listado pendiente).
- [x] 2.6 REFACTOR: `npm run format`; buscar componentes reutilizables en `shared/components/`; contrastar con `SPRINT-2/S2-04-maqueta/salon.html` y anotar diferencias.

## Fase 3: Verificación final y notas del PR

- [x] 3.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %); `alembic upgrade head`, `alembic downgrade -1` y `alembic heads`.
- [x] 3.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 3.3 Reunir notas del PR (sin crear issues ni comentarios):
  - Archivo compartido tocado (§9.3): `backend/app/main.py`.
  - Supuestos S1 (unicidad sin distinguir mayúsculas) y S2 (descripción de 200).
  - Diferencias con la maqueta: sin tabla de sectores, sin columna «Mesas», sin pestañas; alta en diálogo.
  - Tamaño por lado frente a 800/800.

## Notas del apply

- La revisión de Alembic generada es `f3a5c7e9b1d2_crea_sectores.py` (`down_revision = "c4e6a8b0d2f4"`).
- Se ajustó `backend/tests/modules/productos/test_migracion.py` para bajar a `REVISION_PREVIA` (`a1c3e5f7b9d1`) en lugar de `-1`: la cabeza de Alembic ahora es la migración de sectores, así que `-1` ya no deshace la migración de productos. Es una consecuencia de la entidad nueva, no un cambio de comportamiento de productos.
- Se quitaron de `frontend/src/modules/salon/api.ts` las funciones provisorias `listarMesas` y `listarMozos`, que llamaban a rutas inexistentes (`/salon/mesas`, `/salon/mozos`). Las reemplazan HU-M3-05 y HU-M3-08 con sus contratos reales. Los tipos `Mesa`/`Mozo` se conservan para esas HU.
- Resultado: backend 390 pruebas en verde, cobertura 99,39 %; frontend 25 pruebas del módulo en verde, cobertura global 76,48 % de líneas, lint, formato, typecheck y build en verde.
