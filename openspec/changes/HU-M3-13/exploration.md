# Exploración: HU-M3-13 (reporte de mesas atendidas y ventas por mozo)

- **Issue:** #83 · **Épica:** #82 · **Responsable:** Joaquín Cardoso Díaz (JotaDiaz)
- **Rama:** `feature/HU-M3-13-reporte-mesas-ventas-mozo`, creada desde `develop`.
- **Cambio de una sola HU:** el reporte no comparte entidad ni flujo con las HU de ABM del salón.

## Estado del repositorio

| Pieza | Estado |
| --- | --- |
| `Mozo` (`salon/models.py`) | `id`, `dni`, `nombre`, `apellido`, `telefono`, `estado` |
| `Mesa` / `Sector` | `mesa.sector_id` permite acotar el reporte por sector |
| `Comanda` (`atencion/models.py`) | `id`, `mesa_id`, `mozo_id` (nuevo, nullable), `estado`, `fecha_hora` |
| `DetalleComanda` | `cantidad`, `precio_unitario`, `descuento`; el total de una línea es `cantidad * precio_unitario - descuento` |
| Asignación de mozo a la comanda | **No existe flujo**. `mozo_id` queda `NULL` en las comandas creadas por la API |
| Reporte en el backend | No existe |
| Reporte en el frontend | No existe; `/reportes` lista solo «Productos más vendidos» |

## Patrón de referencia

HU-M1-15 fija el camino de un reporte:

- Backend: ruta de solo lectura bajo `/api/v1/reportes/...` (D-28), validación del período con `DatosInvalidosError` → 422, cálculo puro en un módulo `reporte.py`, y lectura de datos de otro módulo a través de su `service` (M1 llama a `atencion.service`).
- Frontend: página propia en `/reportes/...`, `Breadcrumbs`, `DateRangePicker`, botón «Generar», `Alert` para errores y una tabla o tarjetas para el resultado.

## Huecos y contradicciones

1. **No hay datos para atribuir ventas a un mozo.** El diagrama define `Mozo 1 —atiende→ 0..* Comanda`, pero la API de comandas no recibe `mozo_id`. Esta HU agrega la columna al modelo (nullable) y el reporte agrupa por ella; mientras no exista el flujo de asignación, las comandas nuevas quedan en `NULL` y no suman.
2. **«Ventas» no está definido en la HU.** Se toma el total de la comanda calculado de sus líneas (mismo criterio que la factura), sin consultar el módulo de pagos. Se anota como supuesto.
3. **«No hay datos» convive con «mozos en cero».** Se resuelve en el frontend: si el total vendido es cero se informa «No hay datos disponibles»; si hay ventas, se listan todos los mozos incluidos, incluso los que quedaron en cero.
4. **La maqueta no tiene esta pantalla.** Se reutiliza el estilo de la página de reportes existente.
5. **La zona horaria está duplicada.** `productos/reporte.py` y `reservas/service.py` ya repiten UTC-3; este cambio hace lo mismo en `salon/reporte.py` para no tocar `shared/`.

## Alcance verificado de la HU

| Criterio | Qué implica |
| --- | --- |
| Período válido | Filas por mozo con mesas atendidas, ventas y promedio |
| Hay ventas | Totales de mesas y ventas, y promedio general |
| Mozo sin actividad | Fila con ceros |
| Varios mozos | Una fila independiente por mozo |
| Ventas de un mozo | El importe sale solo de sus comandas en el período |
| Sin ventas | Aviso «No hay datos disponibles» |
| Período inválido o incompleto | 422 con `detalle`, sin reporte |
| Cambio de período | Al generar de nuevo, los datos corresponden al nuevo período |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Sin flujo de asignación, el reporte siempre muestra ceros | Se documenta en la spec y el PR; la columna queda lista para cuando exista la asignación |
| Sumar «mesas atendidas» por mozo puede contar dos veces una mesa atendida por dos mozos | Es lo que pide la HU (suma de los totales por mozo); se documenta |
| Duplicar la validación del período | Se replica el patrón de HU-M1-15 y se anota la unificación pendiente en `shared/` |
