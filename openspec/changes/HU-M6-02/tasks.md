# Tareas · HU-M6-02 Cobrar una factura adeudada

## Backend

- [x] Agregar `FacturaResumenSalida` en `schemas.py`.
- [x] Agregar `listar_facturas`, `existe_cobro_con_medio` y `agregar_cobro` en `repository.py`.
- [x] Agregar `listar_facturas` y `registrar_cobro` en `service.py`; extraer `_obtener_factura_o_404`.
- [x] Agregar `GET /facturas` y `POST /facturas/{factura_id}/cobros` en `router.py`.
- [x] Escribir las pruebas de F01–F14 en `tests/modules/pagos/test_facturas.py`.

## Frontend

- [x] Agregar `FacturaResumen` y `CobroCrear` en `types.ts`.
- [x] Agregar `listarFacturas`, `obtenerFactura` y `registrarCobro` en `api.ts`.
- [x] Crear `useFacturasDelModulo.ts`.
- [x] Crear `FacturasTabla.tsx`.
- [x] Crear `validarMontoCobro` en `validarCobro.ts`.
- [x] Crear `useCobrarFactura.ts` y `CobrarFacturaDialog.tsx`.
- [x] Crear `FacturasPanel.tsx`.
- [x] Agregar las pestañas «Medios de pago» y «Facturas» en `PagosPage.tsx`.
- [x] Escribir las pruebas de API, tabla, diálogo y página.

## Verificación

- [x] `ruff check . && ruff format --check . && lint-imports && pytest`.
- [x] `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [ ] Comprobar que el PR anota la diferencia con la maqueta (columna Mesa, formato de N°) y que la HU la implementó Giuliano.
