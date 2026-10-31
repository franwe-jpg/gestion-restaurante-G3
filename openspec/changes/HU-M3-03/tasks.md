# Tareas: HU-M3-03 (eliminar un sector)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 170 (código 40 + pruebas 130); frontend ≈ 310 (código 120 + pruebas 190) |
| Riesgo frente al límite de revisión | Bajo (ambos lados muy por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 2 commits de trabajo y 1 de documentación |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | pending |

Decision needed before apply: Sí — confirmar `Supuesto:` S1 (alcance sin reactivación).
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

**Ruta de implementación:** directa en línea, backend y frontend. Motivo: cada unidad queda por debajo de las ~100 líneas de código; no hay dos unidades independientes que justifiquen escritores en paralelo (Writer trigger).

**Dependencia de rama:** la rama se apila sobre `feature/HU-M3-02-04-modificar-listar-sector`; `develop` todavía no tiene la tabla de sectores.

## Fase 1: Backend

- [x] 1.1 RED: `test_service.py` — `contar_mesas_del_sector` cuenta solo las mesas del sector y devuelve 0 sin mesas.
- [x] 1.2 GREEN: `repository.contar_mesas_del_sector` con `select(func.count())` filtrado por `sector_id`.
- [x] 1.3 RED: `test_service.py` — `dar_de_baja_sector` pasa a `DESHABILITADO` y conserva nombre y descripción; con mesa → 409 sin cambios; ya deshabilitado → 409; inexistente → 404; después de la baja el sector no aparece en `listar_sectores(estado=HABILITADO)`.
- [x] 1.4 GREEN: `service.dar_de_baja_sector` con el orden 404 → 409 estado → 409 mesas → `commit`.
- [x] 1.5 RED: `test_router.py` — `POST /sectores/{id}/baja` responde 200 con `SectorSalida` y persiste; 404; 409 ya deshabilitado; 409 con mesas y la mesa sigue existiendo; `sector_id` no entero → 422; `GET /sectores?estado=HABILITADO` deja de listarlo.
- [x] 1.6 GREEN: `POST /sectores/{sector_id}/baja` en `salon/router.py`.
- [x] 1.7 REFACTOR: `ruff check --fix . && ruff format .` y `lint-imports`.

## Fase 2: Frontend

- [x] 2.1 RED/GREEN: `api.ts` — `eliminarSector(id)` con `POST /sectores/{id}/baja`, con prueba de ruta y método.
- [x] 2.2 RED/GREEN: `useBajaSector.ts` — confirmación con los textos de M9, éxito con «Sector eliminado» y `onEliminado`, cancelación sin envío, error con el `detalle` del backend.
- [x] 2.3 RED/GREEN: `SectoresTabla.tsx` — acción «Eliminar «nombre»» solo en filas habilitadas, junto a «Editar «nombre»»; se actualizan las pruebas del listado.
- [x] 2.4 RED/GREEN: `SalonPage.tsx` — conecta la baja, recarga el listado y muestra el resultado; se cubren los dos criterios de #35.
- [x] 2.5 REFACTOR: `npm run format`; verificar que `SalonPage` sigue por debajo de 50 líneas por función.

## Fase 3: Verificación final y notas del PR

- [x] 3.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [x] 3.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 3.3 Notas del PR (sin crear issues ni comentarios):
  - Rama apilada sobre HU-M3-02-04 porque `develop` aún no tiene `SectoresTabla`.
  - `Supuesto:` S1: la reactivación del issue #35 no entra en este cambio.
  - Baja lógica, sin migración y sin borrado de filas.
  - Diferencia con la maqueta: la baja pide confirmación y muestra el mensaje del backend; la maqueta no los define.
  - `Closes #35`.
