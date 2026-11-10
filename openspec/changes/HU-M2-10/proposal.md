# Propuesta: HU-M2-10 (reporte de impacto de promociones)

- **Issue:** #81 · **Épica:** #79 · **Responsable:** Joaquín Cardoso Díaz (JotaDiaz)
- **Rama:** `feature/HU-M2-10-reporte-impacto-promociones`
- **Depende de:** S4-02 (#81 usa `promocion_id` y `descuento` guardados en la línea de comanda).

## Intención

El encargado necesita saber si una promoción aumentó o redujo las ventas de sus productos. El
reporte compara las unidades vendidas por día con la promoción contra las vendidas fuera de ella.

## Alcance

### Incluido

- `GET /api/v1/reportes/impacto-promociones?fecha_desde&fecha_hasta&promocion_id` (200 JSON).
- Período y promoción obligatorios; fechas válidas y promoción existente.
- Días programados de promoción, unidades, promedios por día u hora, diferencia absoluta,
  impacto estimado y variación porcentual acotada.
- Aviso de «sin datos» cuando la promoción no tuvo ventas en el período.
- Inclusión de productos y promociones hoy deshabilitados con sus datos históricos.
- Pantalla `/reportes/impacto-promociones` con filtros, tabla y notas.
- Entrada en el catálogo de reportes y en las rutas de React.

### Excluido

- Exportación a PDF (no la pide la HU).
- Menús ejecutivos: la promoción solo se asocia a productos y el menú ejecutivo no recibe descuento.
- Edición o recálculo de comandas históricas.

## Decisiones tomadas

- **D1. Contrato.** `GET /api/v1/reportes/impacto-promociones` con `fecha_desde`, `fecha_hasta` y
  `promocion_id` obligatorios.
- **D2. Fuente de datos.** Se usan las líneas de comanda con `promocion_id` igual a la promoción
  consultada. La comparación es contra las demás ventas del mismo producto en el período.
- **D3. Período.** Se cuentan comandas `ABIERTA` y `CERRADA`; se excluyen `ANULADA`. El día local
  se calcula con UTC-3, igual que los otros reportes.
- **D4. Exposición.** Los días con promoción se calculan por calendario: fechas del período que
  caen dentro de `fecha_desde`/`fecha_hasta` y en un día de `dias_semana`. No dependen de que
  haya ventas. Con franja horaria, la comparación pasa a unidades por hora.
- **D5. Promedios.** Durante = unidades con la promoción / exposición con promoción. Fuera =
  unidades sin esa promoción / exposición restante. La UI muestra la base usada.
- **D6. Diferencia e impacto.** Se muestra primero la diferencia absoluta de unidades por día (u
  hora) y el impacto estimado en unidades del período. La variación porcentual queda como dato
  secundario y se oculta si la base fuera es menor a 1 unidad/día o 0,10 unidades/hora.
- **D7. Sin datos.** Si la promoción no tuvo ventas en el período, `hay_datos = false` y no se
  listan líneas, aunque haya ventas regulares.
- **D8. Estados.** El reporte no filtra por estado actual de productos ni promociones: muestra el
  histórico y solo informa el estado vigente como referencia.

## Supuestos

| # | Supuesto |
| --- | --- |
| S1 | «Días fuera» son los días del período que no están programados para la promoción. |
| S2 | «Fuera de la promoción» incluye las líneas sin esa promoción, aunque hayan usado otra. |
| S3 | Los productos de la promoción sin ninguna venta en el período no generan fila. |
| S4 | El reporte se entrega en JSON; el PDF no está pedido por la HU. |
| S5 | La variación porcentual se considera confiable desde 1 unidad/día o 0,10 unidades/hora; debajo de eso se informa «sin base suficiente». |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/atencion/{repository,service}.py` | Lectura agregada por producto, fecha y promoción |
| `backend/app/modules/menus/reporte.py` | Nuevo: cálculo puro |
| `backend/app/modules/menus/{schemas,service,router}.py` | Reporte y endpoint |
| `backend/tests/modules/menus/test_reporte_promociones.py` | Nuevo |
| `frontend/src/modules/menus/{api,types,validarFiltrosReporte}.ts` | Cliente, tipos y validación |
| `frontend/src/modules/menus/components/{useReporteImpactoPromociones.ts,ReporteImpactoPromocionesTabla.tsx}` | Nuevos |
| `frontend/src/modules/menus/pages/ReporteImpactoPromocionesPage.tsx` | Nuevo |
| `frontend/src/App.tsx`, `frontend/src/shared/components/reportes.ts` | Ruta y catálogo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Depende de que las líneas guarden `promocion_id` | S4-02 ya lo persiste; sin ese dato el reporte no puede separar las ventas |
| Cambio en `atencion.service` (módulo de M4) | Se agrega solo una lectura pública y se avisa en el PR |
| Promedio fuera con pocos días | Se documenta el supuesto S1 y se muestran los días usados en la respuesta |

## Criterios de éxito

- [ ] Los seis criterios de aceptación tienen cobertura.
- [ ] El reporte responde 422 ante filtros faltantes o período inverso y 404 ante promoción inexistente.
- [ ] La pantalla informa «sin datos» cuando no hay ventas promocionales.
