# Tareas: HU-M6-04 a HU-M6-07 (ABM y listado de medios de pago)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 450 (código 140 + pruebas 310); frontend ≈ 700 (código 330 + pruebas 370) |
| Riesgo frente al límite de revisión | Bajo (ambos lados por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 2 commits de trabajo y 1 de documentación |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | none |

Decision needed before apply: No (solo la revisión de la spec)
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

Nota: AGENTS.md §4 fija un PR por cambio; el límite 800/800 es un punto de control, no un bloqueo.

### Unidades de trabajo (commits dentro del PR único)

| Unidad | Objetivo | Commit | Prueba focalizada | Límite de reversión |
|--------|----------|--------|-------------------|---------------------|
| 1 | Entidad, migración y API de medios de pago | `feat` | `pytest tests/modules/pagos` | `backend/app/modules/pagos/`, `main.py`, la migración y sus pruebas |
| 2 | Pantalla de medios de pago | `feat` | `npm test -- pagos` | `frontend/src/modules/pagos/` |
| 3 | Cierre documental (apply y verificación) | `docs` | — | `openspec/changes/HU-M6-04-05-06-07/` |

**Ruta de implementación:** dos escritores en paralelo (backend y frontend) con superficies de edición disjuntas, porque son unidades independientes y el contrato de la API ya está fijado en la spec. El padre revisa cada diff, corre las suites completas y la CI local, y hace los commits.

## Fase 1: Backend

- [x] 1.1 RED: `test_modelo.py` — normaliza el nombre; el índice único rechaza un duplicado entre no eliminados y admite reutilizar el nombre de uno eliminado.
- [x] 1.2 GREEN: `TipoMedioPago` y `MedioPago` en `pagos/models.py`.
- [x] 1.3 RED/GREEN: `test_migracion.py` y la migración `crea_medios_pago` (una sola cabeza, se aplica desde cero, `downgrade` limpio).
- [x] 1.4 RED: `test_schemas.py` — recorta el nombre; 3 a 50 caracteres; acentos y ñ válidos, `$` inválido; tipo obligatorio y de los cuatro valores; descripción vacía → `None` y 201 caracteres inválidos; `estado` extra prohibido en el alta y obligatorio en la modificación.
- [x] 1.5 GREEN: `MedioPagoCrear`, `MedioPagoModificar`, `MedioPagoSalida` y `FiltroMediosPago`.
- [x] 1.6 RED: `test_service.py` — un test por escenario de alta, modificación, eliminación y listado (409, 404, estado inicial, mismo nombre no es duplicado, eliminado no se modifica ni se elimina de nuevo, orden sin distinguir mayúsculas, filtro de estado, vacío).
- [x] 1.7 GREEN: `repository.py` y `service.py`.
- [x] 1.8 RED/GREEN: `test_router.py` (201, 200, 204, 404, 409, 422, `incluir_deshabilitados`, paginación) y `router.py` + `include_router` en `main.py`.
- [x] 1.9 Verificación: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).

## Fase 2: Frontend

- [x] 2.1 RED/GREEN: `types.ts`, `api.ts` y su prueba (rutas, cuerpo y manejo de 204).
- [x] 2.2 RED/GREEN: `validarMedioPago.ts` — mensajes de nombre obligatorio, largo, caracteres, tipo y descripción; traducción del 409 bajo Nombre.
- [x] 2.3 RED/GREEN: `useFormularioMedioPago.ts` y `MedioPagoFormDialog.tsx` — alta y edición; cancelar no llama a la API.
- [x] 2.4 RED/GREEN: `useBajaMedioPago.ts` — confirmar elimina; cancelar no llama a la API; avisos de éxito y de error.
- [x] 2.5 RED/GREEN: `useMediosPagoDelModulo.ts` y `MediosPagoTabla.tsx` — columnas, orden recibido, `EmptyState` «No hay medios de pago disponibles para cobrar.».
- [x] 2.6 RED/GREEN: `PagosPage.tsx` — encabezado, «Nuevo medio de pago», casilla «Mostrar deshabilitados», tabla y diálogos.
- [x] 2.7 Verificación: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).

## Fase 3: Cierre

- [x] 3.1 `apply-progress.md` y `verify-report.md`: un resultado por escenario y los diferidos (S5) marcados.
- [x] 3.2 Comprobación manual: levantar backend y frontend, crear, editar, deshabilitar, eliminar y listar desde `/pagos`.
