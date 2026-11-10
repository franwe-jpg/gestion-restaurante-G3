# Tareas: HU-M3-13 (reporte de mesas atendidas y ventas por mozo)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 410 (código 180 + pruebas 230); frontend ≈ 420 (código 260 + pruebas 160) |
| Riesgo frente al límite de revisión | Bajo (ambos lados por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR: modelo + migración, backend, frontend y documentación |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | none |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

**Ruta de implementación:** directa en línea. Motivo: cada unidad queda por debajo de las ~100 líneas de código y las dependencias entre backend y frontend son secuenciales.

**Dependencia:** la rama parte de `develop` y suma la columna `mozo_id`; no hay flujo que la complete todavía.

## Fase 1: Modelo y migración

- [x] 1.1 Agregar `mozo_id` nullable a `Comanda` (referencia por id, sin FK entre módulos).
- [x] 1.2 Migración `c3e5a7b9d1f2` con `add_column` / `drop_column`.
- [x] 1.3 Pruebas de la migración: columna nullable y downgrade.

## Fase 2: Backend

- [x] 2.1 RED/GREEN: `atencion.repository.sumar_ventas_por_mozo_mesa` (SUM por mozo y mesa; ABIERTA y CERRADA; filtro opcional por mesas).
- [x] 2.2 RED/GREEN: `atencion.service.sumar_ventas_por_mozo_mesa` con el DTO `VentaPorMozoMesa`.
- [x] 2.3 RED/GREEN: `salon.reporte` con `validar_periodo`, `intervalo_utc`, `promedio`, `armar_lineas` y `armar_reporte`.
- [x] 2.4 RED/GREEN: `salon.repository.mozos_para_reporte` e `ids_mesas_del_sector`.
- [x] 2.5 RED/GREEN: `salon.schemas` con `LineaReporteMozo` y `ReporteMesasVentasPorMozo` (importes como texto).
- [x] 2.6 RED/GREEN: `salon.service.generar_reporte_mozos`.
- [x] 2.7 RED/GREEN: `GET /reportes/mesas-ventas-por-mozo` en `salon.router`.
- [x] 2.8 Pruebas de service y router en `tests/modules/salon/test_reporte.py`.

## Fase 3: Frontend

- [x] 3.1 RED/GREEN: tipos del reporte en `salon/types.ts`.
- [x] 3.2 RED/GREEN: `obtenerReporteMozos` en `salon/api.ts` (+ prueba de URL).
- [x] 3.3 RED/GREEN: `validarPeriodo` en `salon/validarPeriodo.ts`.
- [x] 3.4 RED/GREEN: `useReporteMozos` (filtros, opciones de mozos y sectores, consulta).
- [x] 3.5 RED/GREEN: `ReporteMozosTabla` con `DataTable` y `formatearMoneda`.
- [x] 3.6 RED/GREEN: `ReporteMozosPage` con período, filtros, «Generar», tarjetas, tabla, error y «No hay datos disponibles».
- [x] 3.7 Ruta `/reportes/mesas-ventas-por-mozo` en `App.tsx` y entrada en el catálogo `reportes.ts`.
- [x] 3.8 Pruebas de la página en `ReporteMozosPage.test.tsx`.

## Fase 4: Verificación pendiente

- [ ] 4.1 Backend: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [ ] 4.2 Frontend: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [ ] 4.3 Revisar la spec con la persona responsable antes de integrar.
- [ ] 4.4 Notas del PR:
  - Requiere coordinar con el responsable de M4 por la lectura agregada en `atencion.service` y por `mozo_id` en `Comanda`.
  - Sin flujo de asignación de mozo, el reporte muestra ceros.
  - Sin exportación a PDF: no está pedida por la HU.
  - `Closes #<número del issue>` (confirmar).
