# Exploración · HU-M6-03 Generar el comprobante de pago

- **Issue:** [#72](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/72) · **Épica:** #69 · **Responsable:** Héctor Sánchez · **Rama:** `feature/HU-M6-03-comprobante-pago`

## Hallazgos

1. **La dependencia está en `develop`.** HU-M6-02 (#71, Giuliano) se integró con el PR #221. HU-M6-01 (#70) se integró con el PR #218.
2. **El comprobante no es una entidad aparte.** El diagrama de clases unificado pone `numeroComprobante: int {único}` como atributo de `Cobro` y le da la operación `verComprobante()`. `Cobro` (`backend/app/modules/pagos/models.py`) ya tiene `numero_comprobante` único, `monto`, `fecha_hora`, `medio_pago_id` y `factura_id`. El service lo asigna igual al `id` del cobro en la misma transacción que lo crea (HU-M6-01 y HU-M6-02).
3. **Toda factura tiene al menos un cobro.** HU-M6-01 exige el primer cobro al emitir la factura, así que «no hay ningún pago registrado» (CA3) solo ocurre cuando se pide un comprobante cuyo número no corresponde a ningún cobro.
4. **Ruta prevista.** `SPRINT-0/S0-05-arquitectura.md` (sección 5) reserva `/comprobantes` para M6.
5. **PDF disponible.** `backend/app/shared/pdf.py` (HU-M1-15) arma un PDF a partir de un `DocumentoPdf` con datos puros, y el frontend ya tiene `clienteHttp.obtenerArchivo` y `shared/lib/guardarArchivo.ts` para descargarlo.
6. **Pantalla.** La maqueta (`SPRINT-2/S2-04-maqueta/pagos.html`) no dibuja el comprobante. La pestaña «Facturas» (HU-M6-02) ya muestra el número de comprobante de cada cobro dentro del diálogo «Cobrar», pero solo para las facturas adeudadas; las pagadas no tienen forma de ver sus cobros.
7. **Contratos de importación.** No hace falta ningún dato de otro módulo: la comanda se identifica por `Factura.comanda_id`, que ya guarda pagos.

## Dependencias

- HU-M6-02 (#71) en `develop` (merge `1676f1d`, PR #221).
