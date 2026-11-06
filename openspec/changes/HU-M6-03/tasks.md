# Tareas · HU-M6-03 Generar el comprobante de pago

Strict TDD: cada tarea empieza con la prueba que falla.

## 1. Backend

- [ ] 1.1 Pruebas de C01–C10 en `tests/modules/pagos/test_comprobantes.py`.
- [ ] 1.2 `MedioPagoDelComprobante` y `ComprobanteSalida` en `schemas.py`.
- [ ] 1.3 `obtener_cobro_por_comprobante` en `repository.py`.
- [ ] 1.4 `obtener_comprobante` en `service.py`.
- [ ] 1.5 `comprobante_pdf.componer` y `generar_pdf_comprobante`.
- [ ] 1.6 `GET /comprobantes/{numero}` y `GET /comprobantes/{numero}/pdf` en `router.py`.

## 2. Frontend

- [ ] 2.1 `Comprobante` en `types.ts`; `obtenerComprobante` y `descargarComprobantePdf` en `api.ts` (con pruebas).
- [ ] 2.2 `useComprobantesDeFactura.ts` (con pruebas).
- [ ] 2.3 `ComprobantesDialog.tsx` (con pruebas: lista, detalle, PDF, error 404).
- [ ] 2.4 Acción «Comprobantes» en `FacturasTabla.tsx` y diálogo en `FacturasPanel.tsx` (con pruebas).

## 3. Verificación

- [ ] 3.1 `ruff check . && ruff format --check . && lint-imports && pytest`.
- [ ] 3.2 `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [ ] 3.3 Anotar en el PR la diferencia con la maqueta y los supuestos S1–S6.

## Presupuesto de revisión

| Lado | Pronóstico | Límite |
| --- | --- | --- |
| `backend/` | ~350 líneas (≈120 de código y ≈230 de pruebas) | 800 |
| `frontend/` | ~550 líneas (≈250 de código y ≈300 de pruebas) | 800 |
