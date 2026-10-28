# Tareas: HU-M3-02 y HU-M3-04 (modificar y listar sectores)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 400 (código 130 + pruebas 270); frontend ≈ 640 (código 290 + pruebas 350) |
| Riesgo frente al límite de revisión | Bajo (ambos lados por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 3 commits de trabajo y 2 de documentación |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

Nota: AGENTS.md §4 y `openspec/config.yaml` fijan un PR por cambio; el límite 800/800 es un punto de control, no un bloqueo.

### Unidades de trabajo (commits dentro del PR único)

| Unidad | Objetivo | Commit | Prueba focalizada | Arnés de ejecución | Límite de reversión |
|--------|----------|--------|-------------------|--------------------|---------------------|
| 1 | Modificación de sectores en el backend | `feat` | `pytest tests/modules/salon` | `TestClient` con base migrada | `schemas.py`, `repository.py`, `service.py`, `router.py` y sus pruebas |
| 2 | Listado y edición de sectores en el salón | `feat` | `npm test -- salon` | `npm run dev` y edición manual | `types.ts`, `api.ts`, `components/`, `pages/` y `shared/api/client.ts` |
| 3 | Cierre documental (apply y verificación) | `docs` | — | — | `openspec/changes/HU-M3-02-04/` |

**Ruta de implementación:** delegado en dos escritores en paralelo, uno para el backend (unidad 1) y otro para el frontend (unidad 2), con superficies de edición disjuntas. El padre revisa cada diff, corre la suite completa como chequeo de costura y hace los commits. Motivo: dos unidades independientes de varios cientos de líneas cada una (Writer trigger, paralelismo). El contrato que consume el frontend está fijado en `design.md`.

**Prerrequisito de entorno:** `frontend/package.json` exige Node `>=22.12.0`. Antes de la fase 2 hay que actualizar Node (nvm con Node 22, o NodeSource); con Node 18 Vitest 5 no arranca.

**Dependencia de rama:** `develop` en `0bff1e0` ya contiene HU-M3-01 (PR #187) y HU-M3-05 (PR #188), así que la rama no se apila.

## Fase 1: Backend

- [ ] 1.1 RED: `test_schemas.py` — `SectorModificar` recorta el nombre, exige 1..30 caracteres, convierte la descripción vacía en `None`, rechaza 201 caracteres y `estado` extra.
- [ ] 1.2 GREEN: `SectorModificar(SectorCrear)` en `salon/schemas.py`.
- [ ] 1.3 RED: `test_service.py` — `existe_nombre_normalizado` con `excluir_id` (no encuentra el propio, sí otro); `modificar_sector` cambia nombre y descripción; mismo nombre con otra descripción → 200; nombre de otro sector, incluso deshabilitado → 409 sin cambios; sector inexistente → 404; sector deshabilitado se modifica sin cambiar de estado; `IntegrityError` en `commit` → 409 y `rollback`; descripción ausente → `null`.
- [ ] 1.4 GREEN: `repository.existe_nombre_normalizado(..., excluir_id=None)`, `service._validar_nombre_libre(..., excluir_id=None)`, `service._actualizar` y `service.modificar_sector`.
- [ ] 1.5 RED: `test_router.py` — `PUT /sectores/{id}` responde 200 con `SectorSalida` y persiste (verificado con `GET /sectores`); 404 y 409 con `detalle`; 422 por nombre vacío, 31 caracteres, descripción de 201, `estado` enviado y `sector_id` no entero; el listado sin `estado` devuelve habilitados y deshabilitados ordenados por nombre.
- [ ] 1.6 GREEN: `PUT /sectores/{sector_id}` en `salon/router.py`.
- [ ] 1.7 REFACTOR: `ruff check --fix . && ruff format .`, `lint-imports` y funciones de hasta 50 líneas.

## Fase 2: Frontend

- [ ] 2.1 RED/GREEN: `shared/api/client.ts` suma `put<T, B>` con prueba (método, `Content-Type` y cuerpo; los métodos existentes no cambian).
- [ ] 2.2 RED/GREEN: `types.ts` (`SectorModificar`) y `api.ts` (`modificarSector`, `listarSectores`) con prueba de rutas, método y cuerpo.
- [ ] 2.3 RED/GREEN: `useFormularioSector.ts` acepta `sector` y `onGuardado`; inicializa los campos, elige `crearSector` o `modificarSector`, emite «Sector creado» o «Sector modificado» y conserva lo escrito ante un 409. Prueba de los dos modos.
- [ ] 2.4 RED/GREEN: `SectorFormDialog.tsx` en modo edición: título, «Guardar cambios», datos precargados y estado real; cancelar no llama a la API. Se actualizan las pruebas del alta.
- [ ] 2.5 RED/GREEN: `SectoresTabla.tsx` con Nombre, Descripción («—» si es nula), Estado y «Editar «nombre»»; vacío «No hay sectores disponibles»; error con «Reintentar».
- [ ] 2.6 RED/GREEN: `useSectoresDelSalon.ts` (`limit=50`, `offset` de la paginación, sincronización de `total`, `recargar`).
- [ ] 2.7 RED/GREEN: `SalonPage.tsx` muestra la tabla, abre el diálogo desde la fila, recarga tras guardar y mantiene el alta y la mesa. Se actualiza la prueba del aviso «HU-M3-04» y se cubren los criterios de #36 y #34.
- [ ] 2.8 REFACTOR: `npm run format`; buscar componentes reutilizables en `shared/components/`; contrastar con `SPRINT-2/S2-04-maqueta/salon.html` y anotar diferencias (columna «Mesas», acciones de baja, íconos).

## Fase 3: Verificación final y notas del PR

- [ ] 3.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %); `alembic heads` con una sola cabeza.
- [ ] 3.2 Frontend desde `frontend/`, con Node 22: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [ ] 3.3 Reunir notas del PR (sin crear issues ni comentarios):
  - Archivo compartido tocado (§9.3): `frontend/src/shared/api/client.ts` (método `put`).
  - Diferencia con la maqueta: sin columna «Mesas» (HU-M3-08), sin acción de baja (HU-M3-03) y sin filtros ni pestañas.
  - `GET /api/v1/sectores` se reutiliza sin cambios.
  - Cambio agrupado HU-M3-02 + HU-M3-04 según AGENTS.md §4; `Closes #34` y `Closes #36`.
  - Tamaño por lado frente a 800/800.
