# Propuesta: HU-M3-13 (reporte de mesas atendidas y ventas por mozo)

- **Issue:** por confirmar · **Épica:** #82 · **Responsable:** Giuliano Giannoncelli
- **Rama:** `feature/HU-M3-13-reporte-mesas-ventas-mozo`

## Intención

El encargado necesita ver el desempeño del personal de salón: cuántas mesas atendió cada mozo y cuánto vendió en un período, con totales y promedios, para tomar decisiones del negocio.

## Alcance

### Incluido

- `mozo_id` nullable en `Comanda` (modelo + migración), sin cambiar el alta de comandas.
- `GET /api/v1/reportes/mesas-ventas-por-mozo?fecha_desde&fecha_hasta&mozo_id&sector_id` (200 JSON).
- Período obligatorio y validado; `mozo_id` y `sector_id` opcionales.
- Cálculo por mozo de mesas atendidas (mesas distintas), ventas, promedio por mesa; totales y promedio general.
- Inclusión de mozos sin actividad con valores en cero.
- Pantalla `/reportes/mesas-ventas-por-mozo` con filtros, tarjetas de totales, tabla por mozo y aviso de error o de «No hay datos disponibles».
- Entrada en el catálogo de reportes y en las rutas de React.
- Una prueba por criterio de aceptación.

### Excluido

- Asignar mozo a la comanda desde la API o la UI (queda para la HU de atención correspondiente).
- Exportación a PDF.
- Facturación o cobros: las ventas se calculan de las líneas de la comanda, no del módulo de pagos.
- Filtros por estado de la comanda o de la mesa.

## Capacidades

### Nuevas

- `salon-reporte-mozos`: reporte de mesas atendidas y ventas por mozo.

### Modificadas

- `atencion-comandas`: el modelo de `Comanda` suma la referencia opcional al mozo y una lectura pública agregada para reportes.

## Decisiones tomadas

- **D1. Contrato.** `GET /api/v1/reportes/mesas-ventas-por-mozo` con `fecha_desde` y `fecha_hasta` (`date`), `mozo_id` y `sector_id` (`int > 0`, opcionales).
- **D2. Ventas.** Se suman las líneas (`cantidad * precio_unitario - descuento`) de las comandas `ABIERTA` y `CERRADA` con `fecha_hora` en el período; se excluyen las `ANULADA`. Es el mismo importe que usaría la factura.
- **D3. Mesas atendidas.** Cantidad de `mesa_id` distintos con al menos una comanda del mozo en el período.
- **D4. Atribución.** Solo se consideran comandas con `mozo_id` no nulo. Las comandas sin mozo no se atribuyen a nadie.
- **D5. Mozos incluidos.** Todos los mozos (habilitados y deshabilitados), ordenados por apellido y nombre; con `mozo_id`, solo ese. Los que no tienen actividad quedan en cero.
- **D6. Sector.** Se resuelve en M3: se obtienen los `mesa_id` del sector y se pasan como filtro a la lectura de atención.
- **D7. Módulos.** `salon` importa solo `atencion.service` para la lectura agregada (RNF-MAN-09); `atencion` no importa nada de `salon`.
- **D8. Sin datos.** El backend devuelve las líneas en cero; el frontend muestra «No hay datos disponibles para el período seleccionado» cuando el total vendido es cero.
- **D9. Momento del cálculo.** El reporte se genera al presionar «Generar»; cambiar los filtros y volver a generar actualiza los datos.

## Supuestos

| # | Supuesto |
| --- | --- |
| S1 | Las comandas `ABIERTA` cuentan como venta del período, igual que en el reporte de HU-M1-15. |
| S2 | Un mozo deshabilitado sigue apareciendo en el reporte histórico. |
| S3 | El «promedio general» divide el total vendido por el total de mesas atendidas sumadas por mozo (la HU lo pide así). |
| S4 | Si el `mozo_id` o el `sector_id` no existen, el reporte responde 200 con las líneas en cero o vacías; no es un error. |
| S5 | El reporte se entrega en JSON; el PDF no está pedido por la HU. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/atencion/models.py` | `mozo_id` nullable |
| `backend/alembic/versions/` | Migración nueva |
| `backend/app/modules/atencion/{repository,service}.py` | Lectura agregada por mozo y mesa |
| `backend/app/modules/salon/{repository,service,router,schemas}.py` | Reporte |
| `backend/app/modules/salon/reporte.py` | Nuevo: cálculo puro |
| `backend/tests/modules/salon/test_reporte.py` | Nuevo |
| `frontend/src/modules/salon/{api,types}.ts` | Cliente del reporte |
| `frontend/src/modules/salon/{validarPeriodo.ts,components/useReporteMozos.ts,components/ReporteMozosTabla.tsx,pages/ReporteMozosPage.tsx}` | Nuevos |
| `frontend/src/App.tsx`, `frontend/src/shared/components/reportes.ts` | Ruta y catálogo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Sin asignación de mozo, el reporte queda en cero | Se documenta la dependencia; la columna queda lista |
| Duplicar la validación de período | Se replica el patrón existente y se anota la unificación pendiente |

## Plan de reversión

Revertir el merge elimina la ruta, la pantalla y la lectura agregada. La migración se revierte con `alembic downgrade`; la columna `mozo_id` se pierde y las comandas quedan intactas.

## Criterios de éxito

- [ ] Los ocho criterios de aceptación tienen una prueba.
- [ ] El reporte responde 422 ante período incompleto o inverso.
- [ ] CI en verde cuando se ejecute la verificación.
