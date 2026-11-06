# Tareas: HU-M1-15 Reporte de productos más vendidos por período

- **Issue:** #79. Rama `feature/HU-M1-15-reporte-productos-mas-vendidos`. Responsable: Franco Martín Soler (M1).
- **Entrada:** `specs/carta-reporte-mas-vendidos/spec.md`, `design.md`, `proposal.md`.
- **Modo:** Strict TDD. Cada unidad va en orden RED (prueba que falla) → GREEN (código mínimo) → REFACTOR. Las pruebas se escriben primero y se comprueba que fallan por la razón esperada.
- **Entrega:** un solo PR (`single-pr`). El límite de 800 líneas por lado es un punto de control, no un bloqueo: no se divide la HU.

## Review Workload Forecast

| Lado | Alcance | Líneas estimadas (código + pruebas) |
| --- | --- | --- |
| Backend M4 | migración, `atencion/{models,repository,service}.py`, pruebas | ~300 |
| Backend shared | `shared/pdf.py`, `tests/shared/test_pdf.py`, `requirements.txt` | ~210 |
| Backend M1 | `productos/{schemas,reporte,reporte_pdf,service,router}.py`, pruebas | ~800 |
| **Backend total** | | **~1.310 (supera 800: punto de control, no se divide)** |
| Frontend shared | `client.ts`, `guardarArchivo.ts`, `navegacion.ts`, `ReportesPage.tsx`, `reportes.ts`, `App.tsx`, pruebas | ~250 |
| Frontend M1 | `types.ts`, `api.ts`, `validarPeriodo.ts`, `masVendidos.ts`, `useReporteMasVendidos.ts`, `GraficoMasVendidos.tsx`, `ReporteMasVendidosPage.tsx`, pruebas | ~620 |
| **Frontend total** | | **~870 (supera 800: punto de control, no se divide)** |

Estimación, no diff medido. Recalcular por lado al terminar el apply; no recortar pruebas para ajustar la cifra.

Decision needed before apply: Yes (solo las coordinaciones de la fase 1 y la revisión de la spec por la persona)
Chained PRs recommended: No (regla del proyecto: una HU, un PR)
Chain strategy: single-pr
Backend 800-line budget risk: High (informativo)
Frontend 800-line budget risk: Medium (informativo)

## Mapa de dependencias

- Fase 1 (coordinación) antes de todo el código que toca M4 o `shared/`.
- Fase 2 (M4) antes de la fase 4 (el service de M1 llama a `atencion.service`); la fase 4.A (funciones puras) puede empezar antes.
- Fase 3 (PDF shared) antes de 4.C (`reporte_pdf.py` usa `shared/pdf.py`).
- Fases 2 y 3 son independientes entre sí: pueden hacerse en paralelo.
- Fase 5 (frontend shared) es independiente del backend: puede hacerse en paralelo con las fases 2 a 4.
- Fase 6 (frontend M1) depende de la fase 5 (`obtenerArchivo`, `guardarArchivo`) y del contrato de la API de la fase 4.
- Fase 7 (verificación y PR) al final.

Numeración: las fases siguen el orden de ejecución sugerido (1 coordinación, 2 backend M4, 3 backend shared, 4 backend M1, 5 frontend shared, 6 frontend M1, 7 verificación y PR).

---

## Fase 1: Coordinación previa al apply (sin código)

Elementos de checklist no técnicos. Bloquean las fases indicadas; no se avanza en esas fases hasta confirmarlos. Ritmo automático: si falta respuesta, se deja anotado como `Supuesto:` en el PR.

- [x] 1.1 Revisión de la spec por la persona (una sola vez antes de `/sdd-apply`, AGENTS.md §4): confirmar S100 a S124, en especial S120 (la pantalla muestra solo los 5 más pedidos; el detalle va en el PDF) y S121. Bloquea: todo el apply.
- [ ] 1.2 Avisar a Juan Ignacio Riquelme (M4) y obtener su visto bueno sobre `atencion.service.sumar_productos_pedidos`, la consulta agregada y la migración con `ix_comandas_fecha_hora` e `ix_detalles_comanda_comanda_id` (S100, S122). AGENTS.md §9.3: tablas y módulo ajenos. Bloquea: fase 2.
- [ ] 1.3 Confirmar con Juan que la cabeza de Alembic sigue siendo `f1a3c5e7b9d2` en `develop` (`alembic heads`) antes de crear la migración; si cambió, ajustar `down_revision`. Bloquea: 2.4.
- [ ] 1.4 Acordar con el equipo la dependencia nueva `fpdf2==2.9.0` (S119, AGENTS.md §9.7; existe en PyPI, requiere Python ≥ 3.11, usa Pillow ≥ 8.3.2 y fonttools; Pillow 13.0.0 ya está fijado). Bloquea: fase 3.
- [ ] 1.5 Avisar al equipo y acordar los cambios en `shared/` y archivos comunes: `backend/app/shared/pdf.py`, `frontend/src/shared/api/client.ts` (`obtenerArchivo`), `frontend/src/shared/.../navegacion.ts` (ítem «Reportes»), página `/reportes` y `App.tsx` (S117, S124, AGENTS.md §9.3). Bloquea: fases 3 y 5.
- [ ] 1.6 Avisar al equipo que los demás módulos agregan su tarjeta en `shared/components/reportes.ts` en sus propias HU y que `shared/pdf.py` queda disponible para los seis reportes.

---

## Fase 2: Backend M4 (módulo de Juan): migración, repository y service

Cubre: spec «Índices de la consulta del reporte» y «Reporte de solo lectura sin efectos» (función de M4). Depende de 1.2 y 1.3.

- [x] 2.1 **RED:** en `backend/tests/modules/atencion/test_migracion.py`, probar que tras migrar a la última revisión existen `ix_comandas_fecha_hora` e `ix_detalles_comanda_comanda_id`, y que el `downgrade` los elimina sin cambiar los datos de `comandas` y `detalles_comanda` (escenarios «Reversión de la migración» y creación). Comprobar que falla por ausencia de los índices.
- [x] 2.2 **RED:** en `backend/tests/modules/atencion/test_repository.py`, probar el `EXPLAIN QUERY PLAN` de la consulta agregada sobre la base migrada con filas sembradas: usa `ix_comandas_fecha_hora`, sin `SCAN comandas` ni `SCAN detalles_comanda` (escenario «La consulta usa el índice»). Comprobar que falla.
- [x] 2.3 **RED:** en `backend/tests/modules/atencion/test_repository.py` y `test_service.py`, probar `sumar_productos_pedidos(db, desde, hasta, desplazamiento_horas)`:
  - solo filas `CantidadPedidaPorFranja` (`producto_id`, `dia_semana` con 0 = lunes, `hora`, `cantidad`), no líneas sueltas;
  - solo líneas con `producto_id` de comandas ABIERTA y CERRADA (excluye ANULADA y líneas de menú ejecutivo), con `desde <= fecha_hora < hasta`;
  - dos líneas (2 y 3) del mismo producto, día y hora locales dan una fila con `cantidad` 5;
  - 02:00 UTC de un viernes con desplazamiento −3 da `dia_semana` 3 y `hora` 23;
  - no hace `commit` (escenarios «Función de M4», «suma en la base», «día y hora locales»). Comprobar que fallan.
- [x] 2.4 **GREEN:** crear la migración `backend/alembic/versions/<rev>_agrega_indices_reporte_comandas.py` (`down_revision = "f1a3c5e7b9d2"`) con ambos índices y `downgrade` que los elimina; declarar los índices en `backend/app/modules/atencion/models.py`. Satisface 2.1.
- [x] 2.5 **GREEN:** agregar en `atencion/repository.py` la consulta agregada parametrizada (`GROUP BY producto_id, strftime('%w'...), strftime('%H'...)` con `SUM(cantidad)`, desplazamiento como parámetro, día convertido a 0 = lunes) y en `atencion/service.py` el dataclass `CantidadPedidaPorFranja` y `sumar_productos_pedidos` (solo lectura). Satisface 2.2 y 2.3.
- [x] 2.6 **REFACTOR:** simplificar la consulta y repetir `pytest tests/modules/atencion`; comprobar que `lint-imports` no marca nuevos cruces y que no se alteraron otras respuestas de M4.

---

## Fase 3: Backend shared: ayudante de PDF

Cubre: spec «Salida en PDF» (parte de dibujo). Depende de 1.4 y 1.5. Independiente de la fase 2.

- [x] 3.1 Agregar `fpdf2==2.9.0` a `backend/requirements.txt` con versión exacta (sin fijar `fonttools` ni `defusedxml`, según el encabezado del archivo) e instalarlo en el entorno.
- [x] 3.2 **RED:** crear `backend/tests/shared/test_pdf.py`:
  - `normalizar_texto`: `’`→`'`, `“”`→`"`, `—–−`→`-`, otros caracteres no latin-1→`?`, y conserva á, ñ, ü, ¿, ¡, « y »;
  - `renderizar(doc, comprimir=False)` devuelve bytes que empiezan con `%PDF-` y contienen `"Ñoquis".encode("latin-1")`;
  - el pie «Página n de N» está presente;
  - una tabla de más filas que una página repite el encabezado de columnas en la página siguiente (escenario «Tabla de más de una página»). Comprobar que fallan.
- [x] 3.3 **GREEN:** crear `backend/app/shared/pdf.py` con `normalizar_texto`, `DocumentoPdf` (título, período, fecha de generación, párrafos, `TablaPdf`) y `renderizar(doc, comprimir=True) -> bytes`; A4 vertical, Helvetica, encabezado de tabla repetido y pie de página. fpdf2 queda aislado en este archivo (S123).
- [x] 3.4 **REFACTOR:** funciones de hasta 50 líneas y complejidad 10; `ruff check . && ruff format .`.

---

## Fase 4: Backend M1: reporte, service, PDF, schemas y router

Cubre: spec «Reporte por sección y producto», «Período sin pedidos», «Fechas obligatorias», «Período inválido», «Productos deshabilitados incluidos», «Empates de día y franja», «Qué comandas y líneas cuentan», «Zona horaria y límites», «Desempate», «Reporte de solo lectura», «Salida en PDF». Depende de las fases 2 y 3.

### 4.A Funciones puras (`productos/reporte.py`)

- [x] 4.1 **RED:** crear `backend/tests/modules/productos/test_reporte.py` sin base de datos:
  - `validar_periodo`: falta de `fecha_desde` («Falta la fecha desde.»), de `fecha_hasta` («Falta la fecha hasta.»), de ambas (nombra las dos), `desde > hasta` («El período es inválido: la fecha desde es posterior a la fecha hasta.») y `desde == hasta` válido; los errores son `DatosInvalidosError`;
  - `intervalo_utc`: `[00:00 local de desde, 00:00 local de hasta+1)` en UTC (UTC−3); `fecha_hasta` incluye 02:59:59 UTC del día siguiente y excluye 03:00:00; `desde` incluye 03:00:00 UTC y excluye 02:59:59; recorte del desborde de `date.max`;
  - días y franjas más pedidos con suma de `cantidad` (no de líneas): un solo día, empate de día (viernes y sábado, orden lunes a domingo), empate de franja (orden ascendente), línea de 5 un lunes contra tres de 1 un jueves, franja `23 → 0`;
  - `armar_secciones`: productos por `cantidad_pedida` descendente, desempate por nombre y luego `producto_id` (Ensalada antes que Tarta), secciones por `orden`, `nombre`, `id`, solo productos con pedidos y solo secciones con alguno, productos y secciones DESHABILITADO incluidos con su `estado`, período sin datos da `secciones` vacía. Comprobar que fallan.
- [x] 4.2 **GREEN:** crear `backend/app/modules/productos/reporte.py` con la constante de zona UTC−3 (S116), `validar_periodo`, `intervalo_utc`, el cálculo de días y franjas y `armar_secciones`. Satisface 4.1.
- [x] 4.3 **REFACTOR:** revisar longitud y complejidad de las funciones; `ruff`.

### 4.B Schemas, service y router (JSON)

- [x] 4.4 Agregar en `productos/schemas.py` `DiaSemana`, `FranjaHoraria`, `LineaReporteProductos`, `SeccionReporte` y `ReporteProductosMasVendidos` según el contrato (nombres en `snake_case`, `hora_hasta = (hora_desde + 1) % 24`). Se cubren con las pruebas de 4.5.
- [x] 4.5 **RED:** en `backend/tests/modules/productos/test_router.py` (y `test_service.py` si hace falta), con comandas sembradas por la base de prueba, un caso por escenario de la spec:
  - `GET /reportes/productos-mas-vendidos`: Ñoquis (9) antes que Milanesa (5) y secciones en el orden de la carta; cantidad suma cantidades (Flan 3 + 2 = 5); solo productos con pedidos; período sin comandas y período con solo ANULADAS dan 200 y `secciones` vacía; un día (`desde == hasta`);
  - 422 con `{"detalle": ...}` para falta de `fecha_desde`, de `fecha_hasta`, de ambas, formato `31-12-2026` y período inválido;
  - producto DESHABILITADO y sección DESHABILITADA con pedidos figuran con su `estado`;
  - exclusiones: ANULADA, líneas de menú ejecutivo; cuentan ABIERTA, CERRADA, líneas con `promocion_id` y todas las categorías;
  - zona horaria: comanda 2026-11-06 02:00 UTC cuenta el 2026-11-05 con `JUEVES` y `{23, 0}` y no el 2026-11-06; franja 21:30 local para 00:30 UTC;
  - solo lectura: las respuestas de `GET /carta`, `GET /productos` y `GET /secciones` y los datos no cambian. Comprobar que fallan.
- [x] 4.6 **GREEN:** en `productos/service.py` agregar `generar_reporte_mas_vendidos(db, fecha_desde, fecha_hasta)` (validar → intervalo UTC → `atencion_service.sumar_productos_pedidos` con desplazamiento −3 → `repository.obtener_productos` y `obtener_secciones_por_ids` → `armar_secciones`); en `productos/repository.py` agregar las consultas por IDs si no existen (parametrizadas); en `productos/router.py` la ruta `GET /reportes/productos-mas-vendidos` con parámetros `date | None = None` (S115) que delega al service. Satisface 4.5. El service no importa FastAPI.
- [x] 4.7 **REFACTOR:** `lint-imports` (solo `atencion.service`, nunca `atencion.router/repository/models/schemas`), funciones de hasta 50 líneas.

### 4.C PDF del reporte

- [x] 4.8 **RED:** crear `backend/tests/modules/productos/test_reporte_pdf.py` sin dibujar:
  - `componer(reporte, generado)` devuelve un `DocumentoPdf` con título «Productos más vendidos por período», período, fecha de generación en hora local, y el texto explicativo (menciona hora local UTC−3, comandas anuladas y menús ejecutivos excluidos, y criterio de empates);
  - una tabla por sección con columnas «Producto», «Cantidad pedida», «Días más pedidos», «Franjas más pedidas» y una fila por producto en orden de cantidad;
  - días en español con tilde («Miércoles», «Sábado») y empates separados por coma («Viernes, Sábado»); franjas «13:00 a 14:00, 21:00 a 22:00»;
  - producto DESHABILITADO con «(Deshabilitado)» junto al nombre;
  - período sin datos: título, período y párrafo «No hay datos para el período elegido.» sin tablas;
  - mismos datos que el JSON. Comprobar que fallan.
- [x] 4.9 **GREEN:** crear `backend/app/modules/productos/reporte_pdf.py` con `componer` (S114, S123). Satisface 4.8.
- [x] 4.10 **RED:** en `test_router.py` probar `GET /reportes/productos-mas-vendidos/pdf`:
  - 200, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="productos-mas-vendidos_2026-11-01_2026-11-05.pdf"`, cuerpo que empieza con `%PDF`;
  - período sin datos: 200 con PDF (S118);
  - 422 con `{"detalle": ...}` y sin PDF para falta de `fecha_desde` y para período inválido (mismas validaciones que el JSON). Comprobar que fallan.
- [x] 4.11 **GREEN:** en `productos/service.py` agregar `generar_pdf(db, fecha_desde, fecha_hasta) -> ArchivoPdf(contenido, nombre)` (reutiliza el service del JSON, `componer` y `shared.pdf.renderizar`; el nombre sale de fechas ya validadas) y en `router.py` la ruta `/pdf` que arma `Response(media_type="application/pdf")` con `Content-Disposition`. Satisface 4.10.
- [x] 4.12 **REFACTOR:** `ruff check --fix . && ruff format .`; revisar nombres de negocio en español y que `router` solo delega.

---

## Fase 5: Frontend shared (archivos comunes: avisar al equipo)

Cubre: spec «Página compartida de reportes» y la base de la descarga. Depende de 1.5. Independiente del backend.

- [x] 5.1 **RED:** pruebas Vitest junto a `client.ts`: `ClienteApi.obtenerArchivo(endpoint)` devuelve `RespuestaApi<Blob>` en éxito y, ante 422, lee `{"detalle"}` como error (D-16). Comprobar que fallan.
- [x] 5.2 **GREEN:** agregar `obtenerArchivo` a `frontend/src/shared/api/client.ts` (único lugar con `fetch`). Satisface 5.1.
- [x] 5.3 **RED:** prueba de `frontend/src/shared/lib/guardarArchivo.test.ts`: crea una URL de objeto, dispara la descarga con el nombre indicado y la revoca. Comprobar que falla.
- [x] 5.4 **GREEN:** crear `guardarArchivo.ts`. Satisface 5.3.
- [x] 5.5 **RED:** pruebas de `ReportesPage.test.tsx`:
  - figura la tarjeta «Productos más vendidos» con su descripción y el botón «Generar»;
  - «Generar» navega a `/reportes/productos-mas-vendidos`;
  - dos o más tarjetas del catálogo se muestran en una fila (`flex`/`grid` en fila);
  - el ítem «Reportes» del menú lateral lleva a `/reportes`;
  - `ReportesPage.tsx` y `reportes.ts` no importan nada de `frontend/src/modules/` (comprobación por texto del archivo o por regla de ESLint existente). Comprobar que fallan.
- [x] 5.6 **GREEN:** crear `frontend/src/shared/components/reportes.ts` (catálogo estático: título, descripción, ruta; S124) y `ReportesPage.tsx` (una `Card` por reporte con un `Link` «Generar»); agregar el ítem «Reportes» en `navegacion.ts`; registrar `/reportes` en `App.tsx`. Reutilizar componentes de `frontend/src/shared/components/` y revisar `/componentes` antes de crear nada nuevo. Satisface 5.5.
- [x] 5.7 **REFACTOR:** `npm run format` y `npm run lint` sin advertencias.

---

## Fase 6: Frontend M1 (`frontend/src/modules/productos/`)

Cubre: spec «Pantalla del reporte con los 5 más pedidos» y los CA 2, 3 y 4 en pantalla. Depende de las fases 4 (contrato) y 5.

- [x] 6.1 Agregar en `types.ts` los tipos del reporte (`DiaSemana`, `FranjaHoraria`, `LineaReporteProductos`, `SeccionReporte`, `ReporteProductosMasVendidos`), sin `any`. Se verifican con `npm run typecheck`.
- [x] 6.2 **RED:** pruebas de `api.ts` (`api.test.ts`): `obtenerReporteMasVendidos(fechaDesde, fechaHasta)` llama a `GET /reportes/productos-mas-vendidos` con los parámetros; `descargarReportePdf` usa `obtenerArchivo` con `.../pdf` y el mismo período. Comprobar que fallan.
- [x] 6.3 **GREEN:** agregar ambas funciones a `api.ts` del módulo. Satisface 6.2.
- [x] 6.4 **RED:** pruebas de funciones puras:
  - `validarPeriodo.test.ts`: «Falta la fecha desde.», «Falta la fecha hasta.», faltan ambas, período inválido, un día válido;
  - `masVendidos.test.ts`: `masVendidos(reporte, 5)` toma los 5 de mayor `cantidad_pedida` entre todas las secciones, de mayor a menor, desempate por nombre y luego `producto_id`, corta en 5 con empate en el puesto 5, devuelve los que haya si son menos de 5 y marca «(Deshabilitado)» en la etiqueta. Comprobar que fallan.
- [x] 6.5 **GREEN:** crear `validarPeriodo.ts` y `masVendidos.ts`. Satisface 6.4.
- [x] 6.6 **RED:** pruebas de `GraficoMasVendidos.test.tsx` y `ReporteMasVendidosPage.test.tsx` (API simulada), un caso por escenario:
  - pantalla recién abierta: «Fecha desde», «Fecha hasta» y «Generar», sin resultado ni «Descargar PDF»;
  - 8 productos en tres secciones: el gráfico muestra exactamente los 5 mayores con su cantidad y no muestra secciones, días ni franjas;
  - 3 productos: muestra los 3;
  - deshabilitado entre los 5: etiqueta con «(Deshabilitado)»;
  - con datos: «El detalle completo está en el reporte PDF.» y «Descargar PDF»;
  - «Descargar PDF» pide `.../pdf?fecha_desde=2026-11-01&fecha_hasta=2026-11-05` y llama a `guardarArchivo`;
  - `secciones` vacía: «No hay datos para el período elegido.» sin gráfico;
  - fecha faltante («Falta la fecha desde.») o período inválido: no se llama a la API y se muestra el mensaje (y no hay resultado);
  - consulta fallida: «No se pudo cargar el reporte.»;
  - la ruta `/reportes/productos-mas-vendidos` muestra `ReporteMasVendidosPage`. Comprobar que fallan.
- [x] 6.7 **GREEN:** crear `useReporteMasVendidos.ts` (estado, validación previa, consulta, descarga), `GraficoMasVendidos.tsx` (barras horizontales a mano dentro de `ChartContainer`, con `vacio`) y `ReporteMasVendidosPage.tsx` (`DateRangePicker`, «Generar», texto del PDF, «Descargar PDF» en `acciones`, período mostrado, estados de error y vacío); registrar la ruta en `App.tsx` dentro del diseño de la aplicación. Toda llamada pasa por `api.ts` del módulo; sin `fetch` ni `any`; sin dependencias nuevas.
- [x] 6.8 **REFACTOR:** funciones de hasta 50 líneas, `npm run format`, `npm run lint`; anotar las diferencias con la maqueta (no hay pantalla de reportes en `SPRINT-2/S2-04-maqueta/`).

---

## Fase 7: Verificación y notas del PR

- [ ] 7.1 Backend, desde `backend/` con el entorno activo: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %). Confirmar un solo head de Alembic y que `EXPLAIN` no muestra `SCAN comandas` ni `SCAN detalles_comanda`.
- [ ] 7.2 Frontend, desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %, 0 advertencias).
- [ ] 7.3 Medir el diff real por lado y registrarlo en el PR contra el punto de control de 800 líneas por lado (backend ~1.310 y frontend ~870 estimados). Aclarar que no se divide la HU.
- [ ] 7.4 Verificar la trazabilidad: cada requisito de la spec tiene al menos una prueba del camino feliz y una de error o límite (RNF-MAN-04, AGENTS.md §9.5).
- [ ] 7.5 Preparar el PR hacia `develop` con `.github/pull_request_template.md` y `Closes #79`. Antes: `git pull origin develop`. Commits convencionales en español con el ID `(HU-M1-15)`.
- [ ] 7.6 En el cuerpo del PR dejar anotado:
  - diferencias con la maqueta: no existe pantalla de reportes; se sigue el estilo de las pantallas existentes, y `/reportes` es una página nueva;
  - cambios fuera de M1 para revisión: M4 (`atencion/{models,repository,service}.py` y migración con dos índices, revisa Juan), `backend/app/shared/pdf.py`, `backend/requirements.txt` (`fpdf2==2.9.0`), `client.ts` (`obtenerArchivo`), `guardarArchivo.ts`, `navegacion.ts`, `ReportesPage.tsx`, `reportes.ts` y `App.tsx`;
  - lista de `Supuesto:` para validar: S100 a S124 (en especial S100, S101/S116 constante UTC−3 duplicada, S110 sin amplitud máxima, S118 PDF vacío con 200, S119 `fpdf2`, S120 pantalla solo con los 5 más pedidos, S121 corte en 5, S122 índices en tablas de M4, S123 PDF A4 vertical);
  - pasos de reversión: `alembic downgrade -1` si el índice ya se aplicó, quitar `fpdf2` de `requirements.txt`;
  - los criterios de aceptación de #79 no se pudieron leer al escribir la propuesta: contrastar la spec con el issue antes de integrar.
- [ ] 7.7 Mover la tarjeta a «In Progress» al empezar y a «En Testing» cuando el PR se integre (manual, sin crear ni editar issues sin confirmación de la persona).

## Lote 5 (correcciones tras la revisión visual)

- [x] 7.1 PDF: anchos [2.8, 1.6, 2, 2.4] para que «Cantidad pedida» quede en una línea.
- [x] 7.2 Pantalla en `/reportes/productos-mas-vendidos` (menú «Reportes» activo), migas «Reportes › Productos más vendidos» con «Reportes» hacia `/reportes`.
- [x] 7.3 Período del subtítulo como «Del 01/10/2026 al 31/10/2026» con `formatoPeriodo.ts`.
