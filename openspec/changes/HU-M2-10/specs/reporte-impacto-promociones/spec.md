# Delta para reporte-impacto-promociones (HU-M2-10)

Capacidad nueva. No modifica los contratos existentes de promociones ni de comandas.

## Datos

| Campo | Tipo | Origen |
| --- | --- | --- |
| `promocion.id` | entero | `promociones.id` |
| `promocion.nombre` | texto | Nombre de la promoción elegida |
| `promocion.estado` | `HABILITADO` o `DESHABILITADO` | Estado actual, solo informativo |
| `promocion.hora_desde`, `promocion.hora_hasta` | hora o nulo | Franja de la promoción |
| `fecha_desde`, `fecha_hasta` | fecha | Período consultado |
| `dias_promocion` | entero | Días del período programados para la promoción |
| `dias_fuera` | entero | Días del período no programados |
| `horas_promocion_por_dia` | decimal (texto) o nulo | Duración de la franja diaria |
| `unidad_promedio` | `DIA` o `HORA` | Base de los promedios |
| `hay_datos` | booleano | `false` si la promoción no tuvo ventas en el período |
| `lineas[].producto_id` | entero | `productos.id` |
| `lineas[].nombre` | texto | Nombre del producto |
| `lineas[].estado` | `HABILITADO` o `DESHABILITADO` | Estado actual, solo informativo |
| `lineas[].promedio_durante` | decimal (texto) o nulo | Unidades por día u hora con la promoción |
| `lineas[].promedio_fuera` | decimal (texto) o nulo | Unidades por día u hora fuera de la promoción |
| `lineas[].diferencia_promedio` | decimal (texto) o nulo | Diferencia absoluta entre ambos promedios |
| `lineas[].impacto_estimado` | decimal (texto) o nulo | Diferencia por la exposición con promoción |
| `lineas[].variacion_porcentual` | decimal (texto) o nulo | Variación; nula si la base no alcanza |
| `lineas[].cantidad_durante` | entero | Unidades vendidas con la promoción |
| `lineas[].cantidad_fuera` | entero | Unidades vendidas fuera de la promoción |
| `lineas[].dias_con_ventas_promocion` | entero | Días con ventas de la promoción |

## Contrato HTTP

`GET /api/v1/reportes/impacto-promociones?fecha_desde=AAAA-MM-DD&fecha_hasta=AAAA-MM-DD&promocion_id=N`

- **200**: reporte completo, aunque no haya datos (`hay_datos = false` y `lineas = []`).
- **422**: falta una fecha, falta la promoción o el período es inverso.
- **404**: la promoción no existe.

## Cálculos

- **Días de promoción:** fechas del período que caen dentro de `fecha_desde`/`fecha_hasta` de la
  promoción y en uno de sus `dias_semana`. No dependen de que haya ventas.
- **Días fuera:** días totales del período menos días de promoción.
- **Exposición con promoción:** días de promoción. Si hay franja horaria, días de promoción
  multiplicados por las horas diarias de la franja.
- **Exposición fuera:** días fuera. Si hay franja horaria, horas totales del período menos horas
  de promoción.
- **Promedio durante:** unidades con `promocion_id` igual a la consultada / exposición con
  promoción.
- **Promedio fuera:** unidades del mismo producto con otra promoción o sin promoción / exposición
  fuera.
- **Diferencia:** `promedio_durante - promedio_fuera`, en unidades por día o por hora.
- **Impacto estimado:** `diferencia * exposición con promoción`, en unidades del período.
- **Variación:** `(durante - fuera) / fuera * 100`, con dos decimales y `ROUND_HALF_UP`. Solo se
  calcula si el promedio fuera llega a 1 unidad/día o 0,10 unidades/hora; si no, es `null`.

## ADDED Requirements

### Requisito: Reporte con datos

El sistema DEBE devolver una línea por cada producto de la promoción que tenga ventas en el
período, con promedios, diferencia, impacto y variación.

- **DADO** un período válido y una promoción con ventas,
  **CUANDO** se pide el reporte,
  **ENTONCES** se ven los productos con las métricas y la base de días usada.

### Requisito: Días de promoción por calendario

El sistema DEBE calcular los días de promoción desde la vigencia y los días de la semana, no desde
los días con ventas.

- **DADO** una promoción que aplica solo los lunes,
  **CUANDO** el período contiene un lunes,
  **ENTONCES** `dias_promocion = 1` aunque no haya ventas ese día.

### Requisito: Filtros obligatorios

El sistema NO DEBE generar el reporte si falta la fecha desde, la fecha hasta o la promoción, y
DEBE indicar cuál falta.

- **DADO** que falta la promoción,
  **CUANDO** se pide el reporte,
  **ENTONCES** responde 422 con un mensaje que la nombra.

### Requisito: Período inválido

El sistema NO DEBE aceptar una fecha desde posterior a la fecha hasta.

- **DADO** un período inverso,
  **CUANDO** se pide el reporte,
  **ENTONCES** responde 422 con el aviso de período inválido.

### Requisito: Sin ventas fuera de la promoción

El sistema DEBE mostrar cero en el promedio fuera y avisar que todas las ventas fueron
promocionales cuando el producto no tuvo ventas fuera de la promoción.

- **DADO** un producto con ventas con la promoción y cero ventas fuera,
  **CUANDO** se pide el reporte,
  **ENTONCES** `promedio_fuera = "0.00"` y la pantalla muestra el aviso de 100 % promocional.

### Requisito: Sin datos

El sistema DEBE informar que no hay datos para comparar cuando la promoción no tuvo ventas en el
período.

- **DADO** un período donde la promoción no tuvo ventas,
  **CUANDO** se pide el reporte,
  **ENTONCES** `hay_datos = false` y la pantalla muestra el aviso.

### Requisito: Histórico de deshabilitados

El sistema DEBE incluir productos y promociones hoy deshabilitados si tuvieron movimientos en el
período consultado.

- **DADO** un producto o una promoción deshabilitados con ventas en el período,
  **CUANDO** se pide el reporte,
  **ENTONCES** sus datos aparecen con el estado actual informado.

### Requisito: Variación sin base suficiente

El sistema NO DEBE mostrar un porcentaje cuando el promedio fuera es demasiado bajo para que el
porcentaje sea interpretable.

- **DADO** un promedio fuera de 0,44 unidades por día,
  **CUANDO** se pide el reporte,
  **ENTONCES** la variación es `null` y la pantalla muestra «—».
