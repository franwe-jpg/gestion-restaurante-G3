# Progreso de apply · HU-M6-02

- **Backend:** `FacturaResumenSalida`; `GET /facturas` paginado; `POST /facturas/{id}/cobros`; `listar_facturas`, `existe_cobro_con_medio` y `agregar_cobro`; `registrar_cobro` con validación de estado, saldo y medio repetido; actualización de `saldo_pendiente` y `estado` en una sola transacción.
- **Frontend:** tipos y API de facturas/cobros; `FacturasTabla`, `CobrarFacturaDialog`, `FacturasPanel` y sus hooks; pestañas «Medios de pago» y «Facturas» en `PagosPage`; refresco del listado al generar una factura.
- **Sin migración:** `Factura`, `Cobro` y `medio_pago_id` ya existían desde HU-M6-01. No se tocó `models.py` ni Alembic.
- **Decisiones durante apply:**
  - El listado se ordena por `fecha_emision` e `id` descendente y no filtra por estado: la pantalla muestra el historial y solo habilita «Cobrar» en las ADEUDADA.
  - El medio ya usado se deshabilita en el selector, pero la autoridad es el backend (409).
  - El comprobante de cada cobro sigue siendo `numero_comprobante = id`.
  - La columna Mesa de la maqueta no se implementa: la factura no guarda la mesa y no se hace una consulta cruzada por fila.
- **Diferencia con la maqueta:** el N° de factura se muestra como `#id` (no `0001-00000452`) y no hay columna Mesa. Se anota para el PR.
