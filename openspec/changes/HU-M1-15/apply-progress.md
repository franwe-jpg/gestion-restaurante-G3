# Apply progress: HU-M1-15

## Lote 1 de 3 (fases 2 y 3, backend M4 y shared)

Tareas hechas: 2.1 a 2.6 y 3.1 a 3.4 (10 de las tareas técnicas). Fase 1 (1.2 a 1.6) sigue sin marcar: son tareas humanas. Fases 4 a 7 pendientes.

### Archivos
- `backend/alembic/versions/a9c1e3f5b7d9_agrega_indices_reporte_comandas.py` (nueva, `down_revision = f1a3c5e7b9d2`, única cabeza).
- `backend/app/modules/atencion/{models,repository,service}.py`: índices declarados, consulta agregada parametrizada, `CantidadPedidaPorFranja` y `sumar_productos_pedidos`.
- `backend/app/shared/pdf.py` (nuevo), `backend/requirements.txt` (`fpdf2==2.9.0`, instalado en el venv).
- Pruebas: `tests/modules/atencion/{conftest,test_migracion,test_repository,test_service}.py`, `tests/shared/test_pdf.py`.

### Evidencia TDD
- RED fase 2: 9 pruebas fallaron (índices ausentes, `sumar_productos_pedidos` inexistente). La prueba de `downgrade` pasó en vacío porque aún no había índices; se vuelve significativa con la migración.
- GREEN fase 2: `pytest tests/modules/atencion` 296 passed. El `EXPLAIN QUERY PLAN` usa `ix_comandas_fecha_hora` e `ix_detalles_comanda_comanda_id`, sin `SCAN comandas` ni `SCAN detalles_comanda`.
- RED fase 3: `test_pdf.py` falló en la importación (`app.shared.pdf` inexistente).
- GREEN fase 3: 8 pruebas pasan (una se ajustó: fpdf2 escribe «Página 1 de » y el total en trozos `Tj` separados).
- Completo: `ruff check .`, `ruff format --check .`, `lint-imports` (10 contratos kept) y `pytest`: 1798 passed, cobertura 98,54 %.

### Desviaciones del diseño
- El repository devuelve tuplas `(producto_id, dia_semana, hora, cantidad)` y el service las convierte a `CantidadPedidaPorFranja` (el dataclass vive en el service, como pide el diseño; el repository no importa el service).
- `TablaPdf` lleva `titulo`, `columnas`, `filas`; `DocumentoPdf` además `tablas`/`parrafos` con listas por defecto. La API exacta no estaba fijada en el diseño.
- El `EXPLAIN` se hace capturando la sentencia y los parámetros reales con el evento `before_cursor_execute` (para respetar el tipo `InstanteUTC`) en lugar de armar la consulta aparte.
- Se agregó la fixture `sembrar_pedidos` en `tests/modules/atencion/conftest.py`.

### Diff backend
Modificados: 8 archivos, +268 -2 (models +2, repository +29, service +24, requirements +1, pruebas +239). Nuevos: migración (~25), `shared/pdf.py` (~95), `test_pdf.py` (~75).

## Lote 2 de 3 (fase 4, backend M1)

Tareas hechas: 4.1 a 4.12 (todas). Fases 1 (1.2 a 1.6), 5, 6 y 7 pendientes.

### Archivos
- Nuevos: `backend/app/modules/productos/reporte.py` (110 líneas), `reporte_pdf.py` (67).
- Modificados: `productos/schemas.py` (+38: `DiaSemana`, `FranjaHoraria`, `LineaReporteProductos`, `SeccionReporte`, `ReporteProductosMasVendidos`), `productos/service.py` (+41: `generar_reporte_mas_vendidos`, `ArchivoPdf`, `generar_pdf`), `productos/router.py` (+23: rutas JSON y `/pdf`).
- Pruebas nuevas: `tests/modules/productos/test_reporte.py` (183), `test_reporte_pdf.py` (104), `test_router_reporte.py` (341); `conftest.py` +63 (fixture `sembrar_comanda`).
- `main.py` sin cambios: el router de `productos` ya estaba montado y las rutas nuevas salen en él. `repository.py` sin cambios: se reutilizaron `obtener_productos` y `obtener_secciones_por_ids`.

### Evidencia TDD
- RED 4.1: `test_reporte.py` falló en la importación (`reporte` y los schemas no existían). GREEN: 21 pruebas pasan.
- RED 4.5: `test_router_reporte.py` 17 de 18 fallaron (ruta inexistente, 404; la restante, de solo lectura, pasaba en vacío). GREEN con 4.6: 18 pasan.
- RED 4.8 y 4.10: `test_reporte_pdf.py` falló en la importación y las pruebas de `/pdf` aún no tenían ruta. GREEN con 4.9 y 4.11: pasan.
- Completo desde `backend/`: `ruff check .`, `ruff format --check .`, `lint-imports` (10 contratos kept) y `pytest`: 1847 passed, cobertura 98,60 %. `reporte.py` y `reporte_pdf.py` al 100 %.

### Desviaciones y supuestos
- Mensaje de ambas fechas faltantes: «Faltan la fecha desde y la fecha hasta.» (la spec pedía nombrar las dos).
- Las pruebas de API están en un archivo nuevo `test_router_reporte.py` en lugar de `test_router.py` (ya tiene más de 2.000 líneas).
- `reporte_pdf.componer` devuelve el párrafo explicativo y, sin datos, un segundo párrafo con «No hay datos para el período elegido.». La fecha de generación va como `datetime` local sin zona; `shared/pdf.py` la dibuja.
- El service pasa a `armar_secciones` los productos cargados con `obtener_productos`; las secciones con `obtener_secciones_por_ids`. Sin pedidos no hay consultas a productos.

### Diff backend de este lote
Modificados 4 archivos (+163 -2); nuevos 805 líneas incluidas pruebas (código ~177, pruebas ~628 con el conftest).

## Lote 3 de 3 (fases 5 y 6, frontend shared y M1)

Tareas hechas: 5.1 a 5.7 y 6.1 a 6.8. Siguen sin marcar 1.2 a 1.6 (humanas) y la fase 7.

### Archivos
- Shared: `shared/api/client.ts` (`obtenerArchivo`, `detalleDeError` compartido con `solicitar`), `shared/lib/guardarArchivo.ts`, `shared/components/{ReportesPage.tsx,reportes.ts}`, `layout/navegacion.ts` (ítem «Reportes»), `App.tsx` (`/reportes` y `/reportes/productos-mas-vendidos`, esta última lazy).
- M1: `types.ts`, `api.ts` (`obtenerReporteMasVendidos`, `descargarReportePdf`), `validarPeriodo.ts`, `masVendidos.ts`, `components/{useReporteMasVendidos.ts,GraficoMasVendidos.tsx}`, `pages/ReporteMasVendidosPage.tsx`, más sus pruebas junto a cada archivo y casos nuevos en `App.test.tsx`, `client.test.ts`, `api.test.ts`.

### Evidencia TDD
- RED fase 5: 3 pruebas de `obtenerArchivo` (no es una función), `guardarArchivo.test.ts` y `ReportesPage.test.tsx` fallaron por módulos o métodos inexistentes.
- GREEN fase 5: `vitest run src/shared` 38 passed.
- RED fase 6: `api.test.ts` (2 fallos: funciones inexistentes), `validarPeriodo`/`masVendidos` y las pruebas del gráfico y la página fallaron por módulos inexistentes.
- GREEN fase 6: tras ajustar el selector de las pruebas (las migas de pan también son `listitem`; se acotó a la lista «Productos más pedidos») todo pasa.
- Final: `npm run lint` 0 advertencias, `format:check`, `typecheck` y `build` OK; `test:coverage` 92 archivos, 1057 pruebas, cobertura global 77,65 % líneas/sentencias (umbral 60 %). Bundle: `ReporteMasVendidosPage` 3,71 kB (1,64 kB gzip), `index` 330,99 kB (100,20 kB gzip).

### Desviaciones y notas
- El botón «Generar» de `/reportes` es un `Link` con las clases del botón (no existe `buttonVariants` ni `asChild`).
- La prueba de no importar de `modules/` lee los archivos con `?raw` (el proyecto no tiene `@types/node`).
- Errores de consulta: mensaje fijo «No se pudo cargar el reporte.» / «No se pudo descargar el PDF.» (el detalle del backend no se muestra; la validación previa evita los 422).
- Etiqueta «Deshabilitado» con la forma «(Deshabilitado)». Nombre del PDF descargado: `productos-mas-vendidos_<desde>_<hasta>.pdf`, con el período de la consulta mostrada.
- Maqueta: no hay pantalla de reportes en `SPRINT-2/S2-04-maqueta/`; se usó el estilo de la carta (migas, `PageHeader`, tarjeta). Barras horizontales a mano, sin biblioteca.

### Tamaño (frontend)
`git diff --stat -- frontend`: 8 archivos modificados, +176 −5. Archivos nuevos: 14 con 698 líneas (código ≈ 310, pruebas ≈ 390). Total frontend ≈ 870 líneas (checkpoint de 800: superado, informativo; la HU no se divide).

## Lote 4 (corrección: PDF más prolijo)

### Cambios
- `shared/pdf.py`: bloque de título (18 pt, pizarra) con período y «Generado el …» y línea ámbar; recuadro de resumen opcional (`DocumentoPdf.resumen`); tablas con título de 12 pt, encabezado ámbar, filas cebradas, bordes finos, relleno y encabezado repetido; `TablaPdf.anchos` y `alinear_derecha`; párrafos en pizarra; pie con la marca a la izquierda y «Página n de N» a la derecha sobre una línea fina.
- `productos/reporte_pdf.py`: período «Período: dd/mm/aaaa al dd/mm/aaaa»; resumen (Unidades pedidas, Productos distintos, Más vendido) solo con datos; anchos [3, 1.3, 2, 2.4] y cantidad alineada a la derecha.
- Nuevo `Supuesto:` S125 (resumen del PDF, no lo pide la HU) en spec, proposal y design; S123 actualizado.

### Evidencia TDD
- RED: 10 pruebas nuevas o ajustadas fallaron (campos inexistentes, período ISO, sin resumen). GREEN: `tests/shared/test_pdf.py` y `tests/modules/productos` pasan.
- Muestra visual revisada con `pdftoppm`; el PDF de ejemplo no está en el repositorio.

## Lote 5 (correcciones tras ver las capturas)

### Cambios
- PDF: `_ANCHOS` de la tabla pasa de (3, 1.3, 2, 2.4) a (2.8, 1.6, 2, 2.4); verificado con `pdftoppm`: encabezado en una línea y «14:00 a 15:00, 21:00 a 22:00» entra en una línea.
- Ruta de la pantalla: `/reportes/productos-mas-vendidos` (antes `/productos/reportes/mas-vendidos`) en `App.tsx` y `shared/components/reportes.ts`. El `NavLink` del menú coincide por prefijo, así que «Reportes» queda activo sin tocar la lógica compartida. Migas: «Reportes» (enlace a `/reportes`) › «Productos más vendidos».
- Subtítulo: nuevo `modules/productos/formatoPeriodo.ts` (`formatearFechaIso`, `formatearPeriodo`) que formatea `YYYY-MM-DD` por texto, sin `Date`; el formateador compartido no se tocó.
- Docs: spec, design, tasks, proposal y apply-progress con la ruta nueva.

### Evidencia TDD
- RED: 5 pruebas de frontend fallaron (ruta, menú activo, migas, período, módulo `formatoPeriodo` inexistente) y la de anchos del backend. GREEN tras implementar.
