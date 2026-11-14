# Exploración · HU-M6-01 Generar la factura de una comanda

- **Issue:** [#70](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/70) · **Épica:** #69 · **Responsable:** Héctor Sánchez · **Rama:** `feature/HU-M6-01-generar-factura`

## Hallazgos

1. **Comanda real disponible.** `develop` ya tiene `cerrar_comanda` (HU-M4-09) y `atencion.service.obtener_comanda`, que devuelve `ComandaSalida` (contrato `app/shared/contratos/comanda.py`) con `estado` y los detalles con `precio_unitario` y `descuento`. `pagos` puede importar el `service` de `atencion` (contrato de importación vigente).
2. **Modelo (diagrama de clases).** `Factura` (`id`, `fechaEmision`, `total`, `saldoPendiente`, `estado` ADEUDADA/PAGADA) 1..* `DetalleFactura` (cantidad, precioUnitario, descuento, subtotal, producto XOR menú ejecutivo) y 1..* `Cobro` (`numeroComprobante` único, `monto` > 0 y ≤ `saldoPendiente`, `fechaHora`, medio de pago). `Comanda` 1 — 0..1 `Factura`.
3. **Contradicción con el reparto.** #70 exige que la factura se genere «junto con su primer cobro (HU-M6-02)», pero `Cobro` es de HU-M6-02 (Giuliano), que todavía no hizo nada. **Decisión de la persona (2026-11-05): opción 2**, HU-M6-01 adelanta `Cobro` y el registro del primer cobro. Hay que avisar a Giuliano; HU-M6-02 construye sobre esa entidad (cobros posteriores, cobro de una factura adeudada).
4. **El detalle no trae nombres.** `DetalleComandaSalida` solo tiene `producto_id` / `menu_ejecutivo_id`. Para que el producto «siga figurando» (CA6, CA7) se guarda una copia del nombre al emitir (ver Supuesto S4).
5. **Maqueta** (`pagos.html`): tabla de facturas con N°, Comanda, Mesa, Emisión, Total, Saldo pendiente, Estado y «Cobrar». #70 no pide listado; no se implementa (Supuesto S6).
