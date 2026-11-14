# Diseño · HU-M6-02

## Datos

No hay migración: `Cobro`, `Factura.saldo_pendiente` y `Factura.estado` ya existen desde HU-M6-01. La HU solo escribe filas nuevas en `cobros` y actualiza la factura.

## Capas (`backend/app/modules/pagos/`)

- `schemas.py`:
  - `FacturaResumenSalida` (`from_attributes`): id, comanda_id, fecha_emision, total, saldo_pendiente, estado.
  - Se reutiliza `CobroCrear` (medio_pago_id > 0, monto > 0 con 2 decimales) y `CobroSalida`.
- `repository.py`:
  - `listar_facturas(db, parametros) -> tuple[list[Factura], int]`: `select(Factura)` ordenado por `fecha_emision` e `id` descendente, con `aplicar` y `contar`.
  - `existe_cobro_con_medio(db, factura_id, medio_pago_id) -> bool`: `select(Cobro.id)` filtrando ambos.
  - `agregar_cobro(db, cobro)`: `db.add` + `db.flush` para obtener el id; sin commit.
- `service.py`:
  - `listar_facturas(db, filtro) -> Pagina[FacturaResumenSalida]`.
  - `registrar_cobro(db, factura_id, datos) -> FacturaSalida`:
    1. `_obtener_factura_o_404` (helper compartido con `obtener_factura`).
    2. Estado PAGADA → `ReglaDeNegocioError`.
    3. `monto > saldo_pendiente` → `DatosInvalidosError`.
    4. `_validar_medio_utilizable` (404 inexistente/eliminado, 409 deshabilitado).
    5. `existe_cobro_con_medio` → `ReglaDeNegocioError`.
    6. Crea el `Cobro`, lo agrega a `factura.cobros`, recalcula `saldo_pendiente` con `quantize(CENTAVO)` y `estado`, hace flush, asigna `numero_comprobante = cobro.id` y un solo `commit`.
- `router.py`:
  - `GET /facturas` declarada antes de `/facturas/{factura_id}`.
  - `POST /facturas/{factura_id}/cobros` (`201`) delega al service.

## Frontend (`frontend/src/modules/pagos/`)

- `types.ts`: `FacturaResumen` y `CobroCrear`.
- `api.ts`: `listarFacturas(limit, offset)`, `obtenerFactura(id)` y `registrarCobro(facturaId, datos)`.
- `components/useFacturasDelModulo.ts`: `useApi` + `usePaginacion`, 50 por página.
- `components/FacturasTabla.tsx`: `DataTable` con N°, Comanda, Emisión, Total, Saldo, Estado y «Cobrar» solo en ADEUDADA.
- `components/useCobrarFactura.ts`: carga la factura completa con `obtenerFactura`, valida con `validarMontoCobro`, envía con `registrarCobro` y avisa con `useToast`.
- `components/CobrarFacturaDialog.tsx`: resumen de total/saldo, tabla de cobros ya registrados, selector de medios habilitados (deshabilita los ya usados), importe por defecto igual al saldo y errores visibles.
- `components/FacturasPanel.tsx`: tabla + paginación + estado del diálogo; recarga al terminar un cobro.
- `pages/PagosPage.tsx`: `Tabs` compartido con «Medios de pago» y «Facturas». El botón «Nuevo medio de pago» queda en la pestaña de medios.

## Pruebas

- Backend: `tests/modules/pagos/test_facturas.py` (F01–F14). Base migrada, comandas reales de la fábrica y medios de pago reales.
- Frontend: `api.test.ts`, `validarCobro.test.ts`, `FacturasTabla.test.tsx`, `CobrarFacturaDialog.test.tsx` y `PagosPage.test.tsx`.

## Riesgos

- El listado no debe romper `/facturas/{id}`: la ruta sin parámetro se registra antes.
- El diálogo deshabilita los medios ya usados, pero el backend es la autoridad (409).
- No se toca el contrato de `Comanda` ni se importan capas internas de otros módulos.
