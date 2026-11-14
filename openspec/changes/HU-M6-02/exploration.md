# Exploración · HU-M6-02 Cobrar una factura adeudada

- **Issue:** [#71](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/71) · **Épica:** #69 · **Responsable:** Giuliano Giannoncelli (HU reasignada de M6; revisa Héctor Sánchez) · **Rama:** `feature/HU-M6-02-cobrar-factura-adeudada`

## Hallazgos

1. **La factura ya está en `develop`.** HU-M6-01 (#70) dejó `Factura` con `total`, `saldo_pendiente`, `estado` (`ADEUDADA`/`PAGADA`), `DetalleFactura` y `Cobro` (`backend/app/modules/pagos/models.py`). También dejó `POST /facturas` con su primer cobro y `GET /facturas/{id}`.
2. **El primer cobro ya existe.** `generar_factura` crea un `Cobro` con `numero_comprobante = id` y deja la factura `PAGADA` o `ADEUDADA` según el saldo. HU-M6-02 registra los cobros posteriores.
3. **No hay listado de facturas.** El repository solo tiene `obtener_factura` y `existe_factura_de_comanda`. La pantalla de cobro necesita localizar la factura; se agrega `GET /facturas` paginado como parte instrumental de esta HU (decisión de la persona, 2026-11-06).
4. **Medios de pago reutilizables.** `_validar_medio_utilizable` ya distingue inexistente/eliminado (404) de deshabilitado (409). `Cobro.medio_pago_id` permite comprobar si el medio ya se usó en la factura.
5. **Maqueta** (`SPRINT-2/S2-04-maqueta/pagos.html`): pestaña «Facturas» con N°, Comanda, Mesa, Emisión, Total, Saldo pendiente, Estado y «Cobrar» solo en las adeudadas. La factura no guarda la mesa y no se hace una consulta cruzada por fila: la columna Mesa se omite y la diferencia se anota en el PR.
6. **Contrato de Comanda.** `pagos` sigue usando solo `atencion.service` (RNF-MAN-09). Esta HU no cambia el contrato de `Comanda`.

## Dependencias

- HU-M6-01 (#70) en `develop` (commit `29e7f42`), con `Factura`, `Cobro` y `MedioPago`.
- HU-M6-03 (#72, comprobante) espera esta HU: cada cobro ya devuelve su `numero_comprobante`.
