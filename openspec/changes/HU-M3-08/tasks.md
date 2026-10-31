# Tareas: HU-M3-08 (listar las mesas)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 185 (código 45 + pruebas 140); frontend ≈ 380 (código 150 + pruebas 230) |
| Riesgo frente al límite de revisión | Bajo (ambos lados muy por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 2 commits de trabajo y 1 de documentación |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

**Ruta de implementación:** directa en línea, backend y frontend. Motivo: cada unidad queda por debajo de las ~100 líneas de código; no hay unidades independientes que justifiquen escritores en paralelo (Writer trigger).

**Dependencia de rama:** apilada sobre `feature/HU-M3-03-eliminar-sector`, que a su vez se apila sobre HU-M3-02-04. `develop` todavía no tiene la pantalla de sectores con pestañas.

## Fase 1: Backend

- [x] 1.1 RED: `test_service.py` — `listar_mesas` devuelve mesas con su sector, ordenadas por nombre de sector y número; total correcto; respeta `limit` y `offset`; sin mesas → página vacía.
- [x] 1.2 GREEN: `repository.listar_mesas` con `select(Mesa, Sector).join(...)`, `aplicar` y `contar`.
- [x] 1.3 GREEN: `service.listar_mesas` con `_a_salida` y `Pagina[MesaSalida]`.
- [x] 1.4 RED: `test_router.py` — `GET /mesas` 200 con la forma de `MesaSalida`; vacío → `items: []`, `total: 0`; orden entre sectores; paginación con `total` estable; 422 por `limit` y `offset` inválidos.
- [x] 1.5 GREEN: `GET /mesas` en `salon/router.py`.
- [x] 1.6 REFACTOR: `ruff check --fix . && ruff format .` y `lint-imports`.

## Fase 2: Frontend

- [x] 2.1 RED/GREEN: `api.ts` — `listarMesas(limit, offset)` con `GET /mesas?limit=&offset=`, con prueba de ruta.
- [x] 2.2 RED/GREEN: `useMesasDelSalon.ts` — `limit=50`, `offset` de la paginación, sincronización de `total`, `recargar` y `refresco` en la clave.
- [x] 2.3 RED/GREEN: `MesasTabla.tsx` — Número, Sector, Capacidad y Estado con badges; vacío «No hay mesas disponibles»; error con «Reintentar».
- [x] 2.4 RED/GREEN: `SalonPage.tsx` — pestañas «Sectores»/«Mesas» con «Sectores» activa; listado de mesas con su sector; vacío; paginación; crear mesa activa Mesas y refresca. Se actualizan las pruebas del salón.
- [x] 2.5 REFACTOR: `npm run format`; contrastar con `SPRINT-2/S2-04-maqueta/salon.html` y anotar diferencias (filtros, columna «Mesas», botón «Nueva mesa» dentro de la pestaña).

## Fase 3: Verificación final y notas del PR

- [x] 3.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [x] 3.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 3.3 Notas del PR (sin crear issues ni comentarios):
  - Rama apilada sobre HU-M3-03/HU-M3-02-04.
  - Diferencia con la maqueta: sin filtros por sector ni estado; sin la columna «Mesas» en la pestaña de sectores.
  - La pestaña «Sectores» queda activa por defecto (la maqueta abre en Mesas).
  - `Closes #41`.
