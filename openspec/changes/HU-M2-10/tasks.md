# Tareas: HU-M2-10 (reporte de impacto de promociones)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 360 (código 190 + pruebas 170); frontend ≈ 470 (código 330 + pruebas 140) |
| Riesgo frente al límite de revisión | Bajo (ambos lados por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR: lectura de atención, reporte, pantalla y pruebas |
| Estrategia de entrega | single-pr |

## Fase 1: Backend

- [x] 1.1 Lectura `atencion.repository.sumar_ventas_de_promocion_por_producto_y_fecha`.
- [x] 1.2 DTO `VentaProductoFecha` y lectura pública en `atencion.service`.
- [x] 1.3 `menus.reporte` con validaciones, días programados, exposición, promedios, diferencia, impacto y variación acotada.
- [x] 1.4 Schemas `PromocionReporte`, `LineaImpactoPromocion`, `UnidadPromedio` y `ReporteImpactoPromociones`.
- [x] 1.5 `menus.service.generar_reporte_impacto_promociones`.
- [x] 1.6 `GET /reportes/impacto-promociones` en `menus.router`.
- [x] 1.7 Pruebas de cálculo y contrato HTTP en `tests/modules/menus/test_reporte_promociones.py`.

## Fase 2: Frontend

- [x] 2.1 Tipos del reporte en `menus/types.ts`.
- [x] 2.2 `obtenerReporteImpactoPromociones` en `menus/api.ts`.
- [x] 2.3 `validarFiltrosReporte`.
- [x] 2.4 `useReporteImpactoPromociones` con carga de promociones y consulta.
- [x] 2.5 `ReporteImpactoPromocionesTabla` con unidades, promedios, diferencia, impacto, variación y avisos.
- [x] 2.6 `ReporteImpactoPromocionesPage` con filtros, días de promoción, error, sin datos y tabla.
- [x] 2.7 Ruta en `App.tsx` y entrada en `reportes.ts`.
- [x] 2.8 Pruebas de validación y de la página.

## Fase 3: Verificación

- [x] 3.1 `ruff check .` y `ruff format --check .`.
- [x] 3.2 `lint-imports`.
- [x] 3.3 `npm run lint` y `npm run typecheck`.
- [ ] 3.4 `pytest` (no ejecutado por pedido de la persona; se corre en CI).
- [ ] 3.5 `npm run test:coverage` (no ejecutado por pedido de la persona; se corre en CI).
- [ ] 3.6 Revisar la spec con la persona responsable antes de integrar.
