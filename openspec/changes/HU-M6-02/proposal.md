# Propuesta · HU-M6-02 Cobrar una factura adeudada

- **Issue:** [#71](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/71) · **Épica:** #69
- **Rama:** `feature/HU-M6-02-cobrar-factura-adeudada`
- **Responsable:** Giuliano Giannoncelli (HU reasignada de M6; revisa Héctor Sánchez).

## Intención

Una factura puede quedar `ADEUDADA` cuando su primer cobro es parcial. El cajero necesita registrar cobros posteriores, cada uno con un medio de pago distinto, hasta saldar la deuda. Esta HU agrega ese registro y la pestaña «Facturas» de la pantalla `/pagos` para encontrar la factura a cobrar.

## Alcance

### Incluido

- `POST /api/v1/facturas/{factura_id}/cobros` para registrar un cobro sobre una factura adeudada.
- `GET /api/v1/facturas` paginado para que la pantalla muestre las facturas y el saldo pendiente.
- Actualización transaccional de `saldo_pendiente` y `estado` de la factura.
- Pestaña «Facturas» en `/pagos` con la tabla de la maqueta (sin la columna Mesa), botón «Cobrar» solo en las adeudadas y diálogo de cobro.
- Una prueba por criterio de aceptación de #71 (camino feliz y error o límite), más las del listado y del contrato de la API.

### Excluido

- El comprobante imprimible (HU-M6-03).
- La anulación o eliminación de cobros.
- El reporte de recaudación y deuda pendiente (HU-M6-08).
- La columna Mesa del listado: requiere datos de otro módulo por cada fila y no es un dato de la factura.

## Decisiones

- **D1. Contrato REST.** `POST /facturas/{id}/cobros` (201) devuelve la factura completa actualizada; `GET /facturas?limit&offset` (200) devuelve `Pagina[FacturaResumenSalida]` ordenada por fecha de emisión descendente. Verbos de D-23 y códigos de D-25.
- **D2. Reglas de negocio.** Factura inexistente 404; factura `PAGADA` 409; monto mayor al saldo 422; medio inexistente o eliminado 404; medio deshabilitado 409; medio ya usado en la factura 409.
- **D3. Un medio, un cobro por factura.** Todos los cobros de una factura usan medios distintos, incluido el primer cobro que crea HU-M6-01.
- **D4. Transacción única.** El `service` valida, agrega el cobro, actualiza saldo y estado, asigna `numero_comprobante = id` y confirma una sola vez. El `repository` no confirma (D-10).
- **D5. Listado instrumental.** `GET /facturas` nace para la pantalla de cobro, no como una HU nueva. No filtra por estado: la pantalla muestra todas y habilita «Cobrar» solo en las adeudadas.
- **D6. Pantalla por pestañas.** `PagosPage` usa el `Tabs` compartido: «Medios de pago» (lo existente) y «Facturas» (nuevo). El diálogo de cobro reutiliza `Dialog`, `FormField`, `Select`, `Input` y `Alert`.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | Se puede cobrar una factura aunque la comanda se haya reabierto después de facturarla: la factura es el documento a saldar y conserva su detalle. |
| S2 | El listado muestra todas las facturas, no solo las adeudadas, para que el cajero vea el historial; el botón «Cobrar» aparece solo en las `ADEUDADA`. |
| S3 | Los importes se reciben y devuelven como cadenas con 2 decimales, igual que la factura y los productos. |
| S4 | El monto de cada cobro es exacto hasta 2 decimales y nunca supera el saldo pendiente; no hay redondeos ni pagos a cuenta. |
| S5 | La columna Mesa se omite del listado porque la factura no la guarda y no se agrega una consulta cruzada por fila (RNF-MAN-09). Se anota en el PR. |
| S6 | El `numero_comprobante` de cada cobro sigue siendo igual a su `id`, como dejó HU-M6-01. |
| S7 | Si un medio de pago se elimina después de usarse, la factura conserva el cobro con su `medio_pago_id`; la pantalla lo muestra como «Medio #id». |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/pagos/{schemas,repository,service,router}.py` | Modificado |
| `backend/tests/modules/pagos/test_facturas.py` | Modificado |
| `frontend/src/modules/pagos/{api,types}.ts` | Modificado |
| `frontend/src/modules/pagos/components/` | Nuevo: pestaña, tabla de facturas, diálogo y hooks de cobro |
| `frontend/src/modules/pagos/pages/PagosPage.tsx` | Modificado: pestañas |
| `frontend/src/modules/pagos/**/*.test.tsx` | Modificado y nuevo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cobro que deja el saldo negativo o el estado incoherente (R14) | El `service` rechaza montos mayores al saldo y recalcula `estado` desde el saldo resultante; una prueba comprueba `saldo = total − suma de cobros`. |
| Cobro con un medio deshabilitado o eliminado (R22) | Se valida el medio antes de crear el cobro; pruebas con 404 y 409. |
| Pantalla desactualizada tras un cobro | El diálogo avisa y la pestaña recarga el listado al cerrarse. |
