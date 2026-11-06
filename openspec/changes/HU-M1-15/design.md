# Diseño: HU-M1-15 Reporte de productos más vendidos por período

## Enfoque técnico

El reporte tiene dos rutas de solo lectura en el router de `productos` (D-28): `GET /reportes/productos-mas-vendidos` devuelve JSON y `…/pdf` devuelve el PDF. SQLite suma `cantidad` por producto, día y hora local dentro de `atencion.service.sumar_productos_pedidos` (D-11, RNF-REN-05), apoyado en dos índices nuevos. Con esas sumas, M1 arma las secciones con funciones puras. El PDF se compone en `productos/reporte_pdf.py` y se dibuja con un ayudante común, `shared/pdf.py` (fpdf2). En el frontend, la página compartida `/reportes` enlaza la pantalla de M1 (ruta `/reportes/productos-mas-vendidos`, migas «Reportes › Productos más vendidos», período «Del dd/mm/aaaa al dd/mm/aaaa» con un ayudante puro `formatoPeriodo.ts`; el PDF usa anchos [2.8, 1.6, 2, 2.4]), que muestra los 5 productos más pedidos y descarga el PDF.

## Decisiones

| Tema | Elegida | Descartada | Justificación |
| --- | --- | --- | --- |
| Agregación | `GROUP BY producto_id, strftime('%w'/'%H', fecha_hora, :desplazamiento)` con `SUM(cantidad)` | Líneas sueltas sumadas en Python | D-11 y RNF-REN-05. Como máximo productos × 168 filas. |
| Función de M4 | `sumar_productos_pedidos(db, desde, hasta, desplazamiento_horas) -> list[CantidadPedidaPorFranja]`, un dataclass en `atencion/service.py` | DTO en `shared/contratos` | Import-linter solo permite `atencion.service` (D-04). Devuelve `dia_semana` con 0 = lunes. |
| Índices | `ix_comandas_fecha_hora` **y** `ix_detalles_comanda_comanda_id`, en una migración y declarados en `atencion/models.py` | Solo `fecha_hora` | Sin el segundo, el `JOIN` recorre `detalles_comanda` completa (`SCAN`) o arma un índice automático, y el `EXPLAIN` de RNF-REN-05 falla. **Tablas de Juan (M4): se coordina con él.** |
| Zona horaria e intervalo | Constante UTC−3 en `productos/reporte.py`; intervalo semiabierto `[00:00 local de desde, 00:00 local de hasta+1)` en UTC | Importar `reservas.service` | No acopla M1 con M5 (`Supuesto:` S116). Un desborde de `date.max` se recorta a `datetime.max`. |
| Fechas obligatorias | Parámetros `date \| None = None`; el service lanza `DatosInvalidosError` | `Query(...)` obligatorio | Así se usan los textos de la spec (S115). Las dos rutas comparten la validación. |
| Biblioteca de PDF | `fpdf2==2.9.0` aislada en `shared/pdf.py`; `fonttools` y `defusedxml` **no se fijan** | Generar el PDF en el frontend | `requirements.txt` fija solo dependencias directas (lo dice su encabezado). Pillow 13.0.0 ya está. `Supuesto:` S119: el equipo acepta la dependencia (AGENTS.md §9.7). |
| Fuente | Helvetica de fpdf2 (latin-1) y `normalizar_texto` en `shared/pdf.py`: `’`→`'`, `“”`→`"`, `—–−`→`-`, el resto→`?` | DejaVu TTF incluida en el repositorio | Latin-1 cubre á, ñ, ü, ¿, ¡, « y ». Sin binarios ni licencia, y con `compress=False` el texto queda legible en los bytes. Con TTF, fpdf2 escribe identificadores de glifo y las pruebas necesitarían `pypdf`. |
| Diseño del PDF | `shared/pdf.py`: `DocumentoPdf` (título, período, fecha de generación, párrafos, `TablaPdf`) y `renderizar(doc, comprimir=True) -> bytes`; bloque de título con línea ámbar, resumen opcional (`DocumentoPdf.resumen`, S125), tablas con encabezado ámbar, filas cebradas, `anchos` y `alinear_derecha` opcionales, encabezado repetido y pie con la marca y «Página n de N» | Que cada módulo arme fpdf2 por su cuenta | Lo pueden usar los seis reportes. Componer (datos puros) queda separado de dibujar. |
| Contenido M1 | `reporte_pdf.componer(reporte, generado) -> DocumentoPdf`: aclaración (UTC−3, sin ANULADA ni menú ejecutivo, cómo se calculan días y franjas) y un resumen «Unidades pedidas / Productos distintos / Más vendido» cuando hay datos (S125), período `dd/mm/aaaa` y una tabla por sección (anchos 3 / 1,3 / 2 / 2,4, cantidad a la derecha); «(deshabilitado)» junto al nombre; sin datos: un párrafo «No hay datos para el período elegido.» | — | Se prueba sin dibujar. |
| Respuesta del PDF | El service devuelve `ArchivoPdf(contenido, nombre)`; el router arma `Response(media_type="application/pdf")` con `Content-Disposition: attachment; filename="productos-mas-vendidos_<desde>_<hasta>.pdf"` | `StreamingResponse` | El service no importa FastAPI. El nombre sale solo de fechas ya validadas. |
| Página `/reportes` | `shared/components/ReportesPage.tsx` y el catálogo `shared/components/reportes.ts` (título, descripción, ruta), una `Card` con un `Link` «Generar» por reporte; ítem «Reportes» en `navegacion.ts` | Botón en `ProductosPage` (antes S117) | Un solo punto de entrada para los seis módulos. `shared` solo conoce rutas, no importa módulos (§9.4). Se descarta el botón para no duplicar la entrada. |
| Descarga | `ClienteApi.obtenerArchivo(endpoint) -> RespuestaApi<Blob>` en `client.ts` (único lugar con `fetch`, D-16) y `shared/lib/guardarArchivo.ts` | `fetch` en el módulo | ESLint prohíbe `fetch` fuera de `client.ts`. El error 422 se sigue leyendo como `{"detalle"}`. |
| Pantalla M1 | `DateRangePicker` y «Generar»; `masVendidos(reporte, 5)` (función pura, mismo orden que el backend); barras horizontales hechas a mano en `ChartContainer` (`vacio`); «El detalle completo está en el reporte PDF.»; «Descargar PDF» en `acciones`, con el período mostrado | Biblioteca de gráficos; exportar a CSV | Decisión de la persona. Sin dependencias nuevas en el frontend. |

## Flujo de datos

```text
router ─ JSON → service.generar_reporte_mas_vendidos
        └ PDF → service.generar_pdf → (lo anterior) → reporte_pdf.componer → shared.pdf.renderizar
service: reporte.validar_periodo → intervalo_utc → atencion_service.sumar_productos_pedidos
         → repository.obtener_productos/obtener_secciones_por_ids → reporte.armar_secciones
```

## Archivos y pronóstico de líneas (código y pruebas)

| Lado | Archivos | Líneas |
| --- | --- | --- |
| Backend M4 | migración `<rev>_agrega_indices_reporte_comandas.py` (`down_revision = "f1a3c5e7b9d2"`, la cabeza actual; verificar en `develop`), `atencion/{models,repository,service}.py` y pruebas (`test_migracion`, `test_repository` con `EXPLAIN`, `test_service`) | ~300 |
| Backend M1 | `productos/{schemas,reporte,reporte_pdf,service,router}.py` y pruebas | ~800 |
| Backend shared | `shared/pdf.py`, `tests/shared/test_pdf.py`, `requirements.txt` | ~210 |
| **Backend total** | | **~1.310 (supera 800: punto de control, no se divide)** |
| Frontend shared | `client.ts`, `guardarArchivo.ts`, `navegacion.ts`, `ReportesPage.tsx`, `reportes.ts`, `App.tsx` y pruebas | ~250 |
| Frontend M1 | `types.ts`, `api.ts`, `validarPeriodo.ts`, `masVendidos.ts`, `useReporteMasVendidos.ts`, `GraficoMasVendidos.tsx`, `ReporteMasVendidosPage.tsx` y pruebas | ~620 |
| **Frontend total** | | **~870** |

## Pruebas (Strict TDD)

| Capa | Qué | Cómo |
| --- | --- | --- |
| `EXPLAIN` | La consulta de M4 sin `SCAN comandas` ni `SCAN detalles_comanda`, y con `USING INDEX ix_comandas_fecha_hora` | La consulta sale de una función del repository; `EXPLAIN QUERY PLAN` sobre la base migrada con filas sembradas |
| Unidad | `reporte.py` (bordes, empates, `23 → 0`), `componer` (párrafos, filas, vacío), `normalizar_texto` | Sin base de datos |
| PDF | Empieza con `%PDF-`; contiene `"Ñoquis".encode("latin-1")` con `comprimir=False`; tiene pie de página | `tests/shared/test_pdf.py` |
| API | Los CA, los 422 en las dos rutas, `content-type`, `Content-Disposition`, PDF vacío con 200 | `test_router.py` |
| Frontend | Cliente `blob` y su error, página `/reportes`, validación, top 5, gráfico vacío, descarga | Vitest junto a cada archivo |

## Matriz de amenazas

No aplica: el cambio no toca enrutamiento de agentes, shell, subprocesos, automatización de VCS o PR, clasificación de ejecutables ni integración de procesos.

## Migración

Solo agrega índices; el `downgrade` los elimina. No modifica datos.

## Preguntas abiertas

- [ ] Juan aprueba la función, la consulta y los dos índices.
- [ ] El equipo acepta `fpdf2` y los cambios en `shared/` (`pdf.py`, `client.ts`, `navegacion.ts`, `/reportes`).
- [ ] La spec menciona solo `ix_comandas_fecha_hora`: falta agregar `ix_detalles_comanda_comanda_id`.
- [ ] Confirmar en PyPI que existe `fpdf2==2.9.0` y que acepta Pillow 13.
