# Delta para salon-reporte-mozos (HU-M3-13)

## Datos

| Campo | Tipo | Origen |
| --- | --- | --- |
| `mozo_id` | entero | `mozos.id` |
| `nombre`, `apellido` | texto | `mozos.nombre`, `mozos.apellido` |
| `mesas_atendidas` | entero | cantidad de `comandas.mesa_id` distintos del mozo en el período |
| `total_ventas` | decimal (texto `"0.00"`) | suma de `cantidad * precio_unitario - descuento` de las líneas de sus comandas |
| `promedio_por_mesa` | decimal (texto) | `total_ventas / mesas_atendidas`; `0.00` si no hay mesas |
| `total_mesas_atendidas` | entero | suma de las mesas atendidas de las líneas |
| `total_ventas` | decimal (texto) | suma de las ventas de las líneas |
| `promedio_general` | decimal (texto) | `total_ventas / total_mesas_atendidas`; `0.00` si no hay mesas |

Cambio de esquema: `comandas.mozo_id` (`INTEGER`, nullable, sin FK entre módulos).

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/reportes/mesas-ventas-por-mozo` | `fecha_desde` y `fecha_hasta` (`date`, obligatorias); `mozo_id` y `sector_id` (`int > 0`, opcionales) | 200 `ReporteMesasVentasPorMozo` | 422 período faltante, inverso o con formato inválido; 422 `mozo_id`/`sector_id` ≤ 0 |

Formato de error: `{"detalle": "mensaje"}` (D-26). El reporte sin ventas es 200 con las líneas en cero, no es un error.

```json
{
  "fecha_desde": "2026-11-01",
  "fecha_hasta": "2026-11-05",
  "lineas": [
    {
      "mozo_id": 1,
      "nombre": "Ana",
      "apellido": "Pérez",
      "mesas_atendidas": 2,
      "total_ventas": "40.00",
      "promedio_por_mesa": "20.00"
    }
  ],
  "total_mesas_atendidas": 2,
  "total_ventas": "40.00",
  "promedio_general": "20.00"
}
```

## ADDED Requirements

### Requisito: Reporte de mesas atendidas y ventas por mozo

La pantalla `/reportes/mesas-ventas-por-mozo` DEBE permitir elegir un período obligatorio y, opcionalmente, un mozo y un sector. Al presionar «Generar» DEBE consultar `GET /api/v1/reportes/mesas-ventas-por-mozo` y mostrar una fila por mozo con su nombre y apellido, las mesas atendidas, el importe total de ventas y el promedio por mesa. DEBE mostrar además el total de mesas atendidas, el total vendido y el promedio general. Cuando el total vendido sea cero, DEBE informar «No hay datos disponibles para el período seleccionado» en lugar de la tabla. Cuando el período sea inválido o incompleto, DEBE informar el error y no generar el reporte.

#### Escenario: Período válido con actividad (CA 1)

- DADO que existen comandas con mozo en el período elegido
- CUANDO genero el reporte
- ENTONCES se muestra cada mozo con su cantidad de mesas atendidas y sus ventas

#### Escenario: Totales del período (CA 2)

- DADO que existen ventas en el período seleccionado
- CUANDO genero el reporte
- ENTONCES se muestran el total de mesas atendidas, el total vendido y el promedio general

#### Escenario: Mozo sin actividad (CA 3)

- DADO que un mozo no tuvo comandas en el período
- CUANDO genero el reporte
- ENTONCES ese mozo aparece con mesas atendidas, ventas y promedio en cero

#### Escenario: Varios mozos con actividad (CA 4)

- DADO que varios mozos tuvieron comandas en el período
- CUANDO genero el reporte
- ENTONCES cada mozo aparece en su propia fila, ordenados por apellido y nombre

#### Escenario: Ventas atribuidas al mozo (CA 5)

- DADO que un mozo tiene comandas con líneas en el período
- CUANDO genero el reporte
- ENTONCES su importe es la suma de esas líneas y no incluye comandas de otros mozos, anuladas ni fuera del período
- Y al elegir un mozo o un sector, solo se consideran sus comandas o las de las mesas del sector

#### Escenario: Sin ventas en el período (CA 6)

- DADO que no hay comandas con mozo en el período
- CUANDO genero el reporte
- ENTONCES se informa «No hay datos disponibles para el período seleccionado»

#### Escenario: Período inválido o incompleto (CA 7)

- DADO que falta una de las fechas o la fecha desde es posterior a la hasta
- CUANDO presiono «Generar»
- ENTONCES se informa el error y no se consulta el reporte

#### Escenario: Cambio de período (CA 8)

- DADO que ya generé el reporte para un período
- CUANDO cambio las fechas y vuelvo a generar
- ENTONCES los datos mostrados corresponden al nuevo período

## Fuera de alcance

- Asignar mozo a la comanda desde la API o la UI.
- Exportación a PDF.
- Ventas provenientes de facturas o cobros.
