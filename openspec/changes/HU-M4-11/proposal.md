# Propuesta: HU-M4-11 Reporte de comandas y ticket promedio por día/turno

- **Issue:** [#85](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/85), HU-M4-11, módulo M4 Atención al Público.
- **Estado:** implementación directa autorizada por la persona debido al bloqueo del dispatcher SDD; estos artefactos registran alcance y decisiones para revisión.
- **Preflight conocido:** Automatic, OpenSpec, Single PR; presupuesto de revisión según reglas del proyecto.

## Intención

Permitir al encargado consultar por una fecha o un rango la cantidad de comandas cerradas, su importe total y el ticket promedio, agrupados por día y turno.

## Alcance

### Incluido

- Endpoint de solo lectura en el módulo M4 con período obligatorio y filtro opcional por turno.
- Agrupación por día local y turno; conteo de comandas cerradas, suma monetaria y promedio redondeado a dos decimales.
- Pantalla accesible desde el catálogo de reportes, con rango de fechas, filtro de turno, tarjetas de resumen, tabla y estado sin datos.
- Pruebas backend y frontend focalizadas con Strict TDD (RED → GREEN).

### Excluido

- Cambios de esquema/migraciones, PDF, gráficos y exportación.
- Cambios en otros módulos o en `backend/app/shared/`.
- Incluir comandas abiertas, anuladas o comandas cuya hora esté fuera de ambos turnos.

## Enfoque

El `router` delega en `service`, `service` valida el período y arma la salida, `repository` agrega en SQL y el módulo M4 presenta la respuesta mediante su API/hook/página. Se reutilizan `Decimal`, componentes compartidos de fecha, tabla, tarjeta, alerta y estado vacío, y la zona del restaurante UTC−3 ya usada por reportes del proyecto.

## Decisión confirmada y supuestos

**Decisión confirmada por la persona:** la fecha y el turno se determinan por `Comanda.fecha_hora` (creación) convertida de UTC a UTC−3. Se cuentan únicamente las comandas en estado `CERRADA` al consultar. Una comanda creada durante un turno conserva ese día/turno aunque se cierre después. El turno Noche pertenece al día en que comienza.

| # | Supuesto: |
| --- | --- |
| S1 | Se muestran grupos con datos; no se generan filas vacías para días/turnos sin comandas. Una respuesta sin coincidencias devuelve listas vacías y totales en cero. |
| S2 | Al no elegir turno se incluyen ambos turnos válidos. Se excluyen horarios fuera de Almuerzo y Noche, porque no pertenecen a ninguno de los turnos solicitados. |
| S3 | El total de cada comanda es la suma de `cantidad * precio_unitario - descuento` por detalle, conforme al cálculo de M6 para facturar. |
| S4 | Rango de fechas inclusivo por fecha local; fecha específica se representa con `fecha_desde = fecha_hasta`. |

## Riesgos

- La atribución del día/turno sigue la creación, aunque el cierre ocurra luego. Es la decisión funcional confirmada; cambiarla a fecha de cierre exigiría otra decisión y persistir ese instante.
- La operación de `SUM` en SQLite/NUMERIC debe mantenerse como `Decimal` al preparar la respuesta; pruebas focalizadas cubren importes y redondeo.
- Los archivos de catálogo/rutas compartidos pueden tener conflictos de integración; solo se agrega una entrada y una ruta.

## Reversión

No hay cambios de esquema ni escrituras de datos. Se pueden retirar el endpoint y sus capas, las pruebas M4, los archivos de frontend, la ruta y la tarjeta de catálogo junto con este cambio.

## Criterios de éxito

- [ ] Fecha única y rango válido devuelven grupos y totales de comandas CERRADA.
- [ ] Turnos respetan los límites inclusivos/exclusivos, fecha de inicio de turno y UTC−3.
- [ ] ABIERTA y ANULADA no se cuentan; turnos no seleccionados no se mezclan.
- [ ] Totales en Decimal y ticket promedio redondeado a dos decimales.
- [ ] Sin datos informa claramente y responde correctamente con totales cero.
- [ ] Filtros, cálculos, límites horarios, estados, validación y pantalla tienen pruebas focalizadas.
- [ ] Sin cambios fuera de M4 excepto el registro común indispensable del reporte.
