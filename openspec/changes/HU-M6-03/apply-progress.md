# Avance del apply · HU-M6-03

Strict TDD: en cada lado se escribieron primero las pruebas y se comprobó que fallaban (backend: error de importación de `ComprobanteSalida` y `comprobante_pdf`; frontend: 4 pruebas en rojo) antes de escribir el código.

## Backend

- `schemas.py`: `MedioPagoDelComprobante` y `ComprobanteSalida`.
- `repository.py`: `obtener_cobro_por_comprobante` (con la factura precargada) y `obtener_medio_pago_aunque_eliminado` (S4).
- `service.py`: `obtener_comprobante` (404 «No hay un pago registrado con el comprobante N») y `generar_pdf_comprobante`.
- `comprobante_pdf.py`: `componer` arma el `DocumentoPdf`; usa `shared/pdf.py` sin modificarlo.
- `router.py`: `GET /comprobantes/{numero_comprobante}` y `GET /comprobantes/{numero_comprobante}/pdf`.
- Pruebas: `tests/modules/pagos/test_comprobantes.py`, 14 pruebas (C01–C10, más 422, S4, service y documento).

## Frontend

- `types.ts`: `Comprobante` y `MedioPagoDelComprobante`. `api.ts`: `obtenerComprobante` y `descargarComprobantePdf`.
- `components/useComprobantesDeFactura.ts` y `components/ComprobantesDialog.tsx`: lista de cobros, detalle del comprobante, «Volver» y «Descargar PDF».
- `FacturasTabla.tsx`: acción «Comprobantes» en todas las filas. `FacturasPanel.tsx`: monta el diálogo.
- Pruebas: `ComprobantesDialog.test.tsx` (8), `api.test.ts` (+2) y `FacturasTabla.test.tsx` (+1).

## Desvíos respecto del diseño

- No hizo falta un componente aparte para la lista: vive dentro de `ComprobantesDialog.tsx`.
- La lista de cobros pide los medios de pago incluyendo los deshabilitados, para mostrar el nombre de un medio que se deshabilitó después del cobro.
