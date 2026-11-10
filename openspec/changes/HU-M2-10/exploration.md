# Exploración: HU-M2-10

## Contexto encontrado

- S4-02 ya guarda `promocion_id` y `descuento` en cada `DetalleComanda`, por lo que el reporte
  puede separar ventas promocionales de las demás sin recalcular la promoción.
- Los reportes de M1 y M3 usan `atencion.service` como lectura pública agregada; el contrato de
  importaciones prohíbe que `menus` importe `atencion.repository` o `atencion.models`.
- El patrón de reportes del proyecto es: cálculo puro en `<modulo>/reporte.py`, schemas con
  decimales serializados como texto, endpoint `GET /api/v1/reportes/...`, página React con
  `DateRangePicker`, `DataTable` y aviso de sin datos.
- La zona horaria de todos los reportes es UTC-3 fija y los períodos son inclusivos por fecha
  local.

## Huecos y decisiones

- La HU no define si los días se cuentan por rango nominal o por días con ventas; se usa la
  segunda opción porque el texto dice «días en los que la promoción aplicó y generó ventas».
- Tampoco define qué pasa si no quedan días fuera; se usa 1 como divisor para evitar una división
  por cero y se documenta como supuesto.
- El reporte no debe filtrar por estado actual: se incluyen productos y promociones deshabilitados
  con movimientos históricos.
- No se implementa PDF porque la HU no lo pide.
