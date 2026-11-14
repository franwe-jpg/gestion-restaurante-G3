# Especificación: atencion-reporte-comandas

## Propósito

El encargado consulta cantidad, importe total y ticket promedio de comandas cerradas por fecha y turno (HU-M4-11, issue #85). El reporte es de solo lectura.

## Contrato de API

Prefijo `/api/v1`. Errores de validación responden 422 con `{"detalle": "mensaje"}`.

| Ruta | Entrada | Respuesta |
| --- | --- | --- |
| `GET /reportes/comandas-ticket-promedio` | `fecha_desde`, `fecha_hasta` obligatorias (`YYYY-MM-DD`); `turno` opcional (`ALMUERZO` o `NOCHE`) | 200 `ReporteComandasTicketPromedio`; 422 ante fechas inválidas, período inverso o turno desconocido |

`ReporteComandasTicketPromedio` contiene `fecha_desde`, `fecha_hasta`, `turno` (filtro aplicado o `null`), `grupos`, `total_comandas`, `importe_total` y `ticket_promedio`. Los importes son `Decimal` serializados como texto con dos decimales.

Cada grupo contiene `fecha`, `turno`, `cantidad_comandas`, `importe_total` y `ticket_promedio`. `turno` en filas es `ALMUERZO` o `NOCHE`.

## Requisitos

### Requisito: filtrar período y turno

El sistema DEBE exigir ambas fechas y rechazar `fecha_desde > fecha_hasta`. Fechas iguales representan consulta de un día. El filtro `turno` PUEDE omitirse para incluir ambos turnos; cuando se envía, DEBE ser `ALMUERZO` o `NOCHE`.

#### Escenario: fecha específica

- DADO un día válido `2026-11-12`
- CUANDO se consulta con `fecha_desde=2026-11-12&fecha_hasta=2026-11-12`
- ENTONCES se devuelven solo grupos de ese día local.

#### Escenario: período inverso

- DADO `fecha_desde=2026-11-13` y `fecha_hasta=2026-11-12`
- CUANDO se consulta el endpoint
- ENTONCES responde 422 con `detalle` y no ejecuta la consulta de reporte.

#### Escenario: turno desconocido

- DADO `turno=DESAYUNO`
- CUANDO se consulta el endpoint
- ENTONCES responde 422.

### Requisito: agrupar comandas cerradas por turno local

El sistema DEBE considerar únicamente comandas `CERRADA`. Debe excluir `ABIERTA` y `ANULADA`. Almuerzo incluye la hora local `[12:00, 16:00)`; Noche incluye `[20:00, 00:00)`. El turno Noche pertenece al día local en que comienza. Al omitir filtro se consideran ambos turnos y se excluyen horas no cubiertas.

**Decisión confirmada por la persona:** el día y el turno se determinan por `Comanda.fecha_hora` de creación, convertida de UTC a UTC−3. El estado se evalúa al consultar: solo cuentan las comandas que están `CERRADA` en ese momento. Una comanda creada durante un turno pertenece a ese turno aunque cierre después. El turno Noche se asigna al día local en que comienza. El modelo no tiene `fecha_hora_cierre`; no se agrega una migración.

**Zona:** UTC−3 fija, coherente con la zona del restaurante usada por `pagos/comprobante_pdf.py` y `salon/reporte.py`.

#### Escenario: límites de Almuerzo

- DADO comandas cerradas a las 11:59:59, 12:00, 15:59:59 y 16:00 locales
- CUANDO se consulta el turno Almuerzo
- ENTONCES cuentan solo las de 12:00 y 15:59:59.

#### Escenario: límites de Noche y día de asignación

- DADO comandas cerradas a las 19:59:59, 20:00 y 23:59:59 locales del 12 de noviembre
- CUANDO se consulta Noche para el 12 de noviembre
- ENTONCES cuentan las de 20:00 y 23:59:59 y ambas se agrupan en el 12 de noviembre.

#### Escenario: estados excluidos

- DADO comandas ABIERTA y ANULADA dentro de un turno, y una CERRADA en el mismo horario
- CUANDO se consulta el reporte
- ENTONCES solo la CERRADA contribuye al conteo y los importes.

### Requisito: calcular total y promedio

El repository DEBE agregar en SQL por día local/turno, contar comandas distintas y sumar las líneas como `cantidad * precio_unitario - descuento`. El servicio DEBE calcular con `Decimal`; `ticket_promedio` es `importe_total / cantidad_comandas`, redondeado a dos decimales `ROUND_HALF_UP`. El resumen general usa la suma y cuenta totales de los grupos incluidos.

#### Escenario: total y promedio por grupo y período

- DADO dos comandas CERRADA del mismo turno con importes `10.00` y `20.00`
- CUANDO se consulta el día y turno
- ENTONCES el grupo y el resumen indican cantidad 2, importe `30.00` y promedio `15.00`.

#### Escenario: promedio redondeado

- DADO tres comandas cuyos importes suman `10.00`
- CUANDO se calcula el ticket promedio
- ENTONCES se devuelve `3.33`.

### Requisito: período sin datos

Si no hay comandas cerradas en los turnos incluidos, el endpoint DEBE responder 200 con `grupos: []`, `total_comandas: 0`, `importe_total: "0.00"` y `ticket_promedio: "0.00"`. La pantalla DEBE informar «No hay datos para el período seleccionado».

#### Escenario: sin comandas

- DADO un rango sin comandas CERRADA dentro de los turnos
- CUANDO se genera el reporte
- ENTONCES los totales son cero, los grupos vacíos y la interfaz muestra el estado sin datos.

### Requisito: consulta de pantalla

La pantalla `/reportes/comandas-ticket-promedio` DEBE ofrecer fechas desde/hasta y selector opcional de turno, botón Generar, tres tarjetas de resumen y una tabla con fecha, turno, cantidad, importe total y ticket promedio. Los errores deben mostrarse y la validación local debe impedir consultas con período incompleto/inverso.

#### Escenario: consultar y presentar

- DADO un período válido y el turno Almuerzo
- CUANDO la persona genera el reporte
- ENTONCES la pantalla presenta cantidad, importe, promedio y grupos recibidos.

#### Escenario: fechas incompletas

- DADO que falta una fecha
- CUANDO se presiona Generar
- ENTONCES se muestra un error y no se llama a la API.

## Trazabilidad issue #85

| Criterio | Escenarios |
| --- | --- |
| Ver cantidad e importe promedio por día/turno | fecha específica, período, total y promedio, pantalla |
| Excluir abiertas y anuladas | estados excluidos |
| Sin datos | período sin datos |

## Supuestos a validar

- Los grupos sin actividad se omiten; solo se devuelve una fila cuando existe al menos una comanda incluida.
- Fuera de las dos franjas, las comandas no pertenecen a un turno y no entran en el reporte.
