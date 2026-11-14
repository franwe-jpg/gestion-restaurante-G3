# Diseño · HU-M6-01

## Datos (migración nueva sobre la cabeza `b5d7f9a1c3e5`)
- `facturas`: `id`, `comanda_id` (**único**, entero sin FK ORM a atención: es una referencia por id, RNF-MAN-09), `fecha_emision`, `total` Numeric(10,2), `saldo_pendiente` Numeric(10,2), `estado` (`ADEUDADA`/`PAGADA`, no nativo).
- `detalles_factura`: `id`, `factura_id` FK, `producto_id` null, `menu_ejecutivo_id` null (CHECK uno solo), `descripcion`, `cantidad`, `precio_unitario`, `descuento`, `subtotal`.
- `cobros`: `id`, `factura_id` FK, `medio_pago_id` FK a `medios_pago`, `monto`, `fecha_hora`, `numero_comprobante` (**único**; = `id`, S2).
- Sin borrado en cascada: las filas son históricas.

## Capas (`backend/app/modules/pagos/`)
- `models.py`: `EstadoFactura`, `Factura`, `DetalleFactura`, `Cobro`.
- `schemas.py`: `FacturaCrear`, `CobroCrear`, `FacturaPrevia`, `FacturaSalida`, `DetalleFacturaSalida`, `CobroSalida`.
- `repository.py`: `obtener_factura`, `existe_factura_de_comanda`, `agregar_factura` (flush, sin commit).
- `service.py`: `previsualizar_factura`, `generar_factura`, `obtener_factura`.
  - Lee la comanda con `atencion.service.obtener_comanda` (404 si no existe) y valida `estado == CERRADA`.
  - Nombres con `productos.service.obtener_productos_por_ids` y `menus.service.obtener_menu_ejecutivo`. **A verificar en apply:** que respondan también para productos dados de baja; si no, se agrega el pedido al responsable de M1 (AGENTS §9.3), no se toca su módulo.
  - Construye líneas y total con `Decimal`; valida monto (422) y medio de pago (404/409) con `repository` de medios; guarda todo y un solo `commit`; `IntegrityError` por `comanda_id` repetido → `ReglaDeNegocioError` (409).
- `router.py`: tres rutas finas que delegan al service; `GET /facturas/previsualizar` declarada antes de `/facturas/{factura_id}`.

## Frontend (`frontend/src/modules/pagos/`)
`types.ts`, `api.ts` (`previsualizarFactura`, `generarFactura`), `components/FacturarComandaDialog.tsx` (+ hook), botón en `PagosPage.tsx`. Sin `fetch` en componentes (D-16), sin `any`; reutiliza `useMediosPagoDelModulo`.

## Pruebas
Backend: `tests/modules/pagos/test_service_facturas.py` y `test_router_facturas.py`, con comandas reales creadas por el service de atención en la base de pruebas (F01–F13, un test por escenario). Frontend: `api.test.ts` ampliado y `FacturarComandaDialog.test.tsx`.

## Riesgos
Migración nueva (dato persistido). Coordinar con Giuliano: HU-M6-02 parte de `Cobro` y `Factura.saldo_pendiente`.
