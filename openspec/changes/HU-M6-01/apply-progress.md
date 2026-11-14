# Progreso de apply · HU-M6-01

- **Backend:** modelos `Factura`, `DetalleFactura`, `Cobro`; migración `f1a3c5e7b9d2` sobre `b5d7f9a1c3e5`; schemas, repository, service y router (`/facturas/previsualizar`, `POST /facturas`, `GET /facturas/{id}`). Commit `feat: agrega la factura de una comanda ...` (backend).
- **Frontend:** tipos, `api.ts`, `validarCobro.ts`, `useFacturarComanda.ts`, `FacturarComandaDialog.tsx` y botón «Facturar comanda» en `PagosPage`.
- **Verificado en el diseño:** `obtener_productos_por_ids` devuelve también los productos deshabilitados, así que no hizo falta tocar `productos`.
- **Decisiones durante apply:**
  - `numero_comprobante` es nullable en la tabla porque se asigna con el `id` del cobro tras el `flush` (S2); el service lo completa en la misma transacción.
  - Mensajes: `La comanda no está cerrada`, `La comanda ya fue facturada`, `El medio de pago está deshabilitado`, `El monto no puede superar el total de la factura`.
