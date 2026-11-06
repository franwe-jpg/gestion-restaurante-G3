# Propuesta · HU-M6-01 Generar la factura de una comanda

## Qué
Un cajero factura una comanda **cerrada**: ve la vista previa (detalle, fecha de emisión y total), elige medio de pago e importe del primer cobro y confirma. Se registran en una sola transacción la `Factura`, su `DetalleFactura` y su primer `Cobro`.

## Alcance
- Backend (`pagos`): modelos `Factura`, `DetalleFactura`, `Cobro`; migración; `repository`, `service`, `schemas`, `router`.
- Frontend (`pagos`): diálogo «Facturar comanda» en `PagosPage` (vista previa → medio de pago e importe → confirmar).
- Pruebas: una por criterio de aceptación (7) más las reglas del primer cobro.

## Fuera de alcance
Cobros posteriores y cobro de una factura adeudada (HU-M6-02), comprobante (HU-M6-03), listado de facturas, reporte (HU-M6-08), liberar la mesa.

## Supuestos (a validar por el equipo)
- **S1.** Se adelanta `Cobro` y el primer cobro dentro de HU-M6-01 (opción 2). Avisar a Giuliano.
- **S2.** `numero_comprobante` = `id` del cobro (entero, único, correlativo).
- **S3.** El primer cobro puede ser parcial (`0 < monto ≤ total`): si `monto < total`, la factura queda ADEUDADA con `saldoPendiente = total − monto`; si `monto = total`, queda PAGADA.
- **S4.** `DetalleFactura.descripcion` guarda una copia del nombre del producto o menú al emitir.
- **S5.** El `descuento` de la comanda es un importe de la línea (no por unidad), según la fórmula `subtotal = cantidad × precioUnitario − descuento`.
- **S6.** No se implementa un listado de facturas (la maqueta lo muestra, #70 no lo pide).
- **S7.** El medio de pago debe existir (404) y estar HABILITADO (409).
- **S8.** Una comanda ANULADA tampoco se factura (409); solo CERRADA.

## Cumplimiento de reglas
Dependencias entre módulos solo por `service` (`atencion`, `productos`, `menus`). Errores `{"detalle": ...}` con 404/409/422. Migración Alembic con los `models` ya registrados en `alembic/env.py`.
