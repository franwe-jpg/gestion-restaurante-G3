# Tareas: HU-M6-08 Reporte de recaudación por medio de pago y deuda pendiente

- **Issue:** [#89](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/89) HU-M6-08. **Rama:** la del
  worktree de este cambio (`feature/HU-M6-08-...`), creada desde `develop`. **Entrada:** `proposal.md`,
  `specs/pagos-reporte-recaudacion/spec.md` y `design.md` (Decisiones 1 a 10). Un solo cambio, una rama y un
  PR hacia `develop` (AGENTS.md §4).
- **Strict TDD activo** (`openspec/config.yaml`). Backend: `pytest` desde `backend/` (cobertura ≥ 70 %).
  Frontend: `npm run test:coverage` (Vitest, cobertura ≥ 60 %). Cada tarea de código se planifica en orden
  **Rojo** (prueba que falla, y se comprueba que falla por el motivo correcto) → **Verde** (el código mínimo
  que la pasa) → **Refactor** (limpieza con las pruebas en verde). Nunca se escribe código de producción sin
  una prueba en rojo.
- **Una unidad de trabajo = un commit** (skill `work-unit-commits`): cada commit lleva su código, sus pruebas
  y su documentación juntos, y deja el repositorio verde. Conventional Commits en español con el ID de la HU,
  sin líneas de coautoría ni atribución de IA. Tipos permitidos: `feat`, `fix`, `docs`, `test`, `ci`,
  `chore`. Un solo PR hacia `develop`, sin PR encadenados (`single-pr`).
- **Dos unidades de trabajo, backend y frontend:** la Fase 1 es un commit de backend (repository, schemas,
  `reporte.py`, `reporte_pdf.py`, `service.py`, `router.py` y pruebas); la Fase 2 es un commit de frontend
  (tipos, `api.ts`, `validarPeriodo.ts`, hook, página y registro en `/reportes`).
- **Aislamiento** (AGENTS.md §9.3; spec, «Aislamiento del módulo y del esquema»): el trabajo queda dentro de
  `backend/app/modules/pagos/`, `backend/tests/modules/pagos/`, `frontend/src/modules/pagos/`, las tres
  líneas compartidas autorizadas por el diseño (`frontend/src/shared/components/reportes.ts`,
  `frontend/src/App.tsx`, `frontend/src/shared/components/ReportesPage.test.tsx`) y esta carpeta de
  `openspec/`. Sin cambios en otros módulos, `backend/app/shared/` (se usa `pdf.py:renderizar()` sin
  modificarlo), `backend/pyproject.toml`, `main.py` ni `backend/alembic/`. Sin migración ni índices (S7).
- **No se toca `ArchivoComprobante`** (pertenece a HU-M6-03): se agrega `ArchivoReporte` aparte en
  `service.py`, igual que `ArchivoPdf` en HU-M5-07 (corrección del orquestador al diseño, ya aplicada en
  `design.md`).
- **Cruce spec vs. diseño (hecho antes de escribir estas tareas):** rutas, nombre del PDF
  `recaudacion-medio-pago_<desde>_<hasta>.pdf`, campos de `ResumenRecaudacion`, textos («No hay datos para el
  período seleccionado», «Sin cobros en el período») y reglas coinciden. Matiz sin conflicto: el diseño habla
  de «4 mensajes» de `validar_periodo`; la spec los fija literalmente y estas tareas usan los literales de la
  spec («Faltan la fecha desde y la fecha hasta.», «Falta la fecha desde.», «Falta la fecha hasta.», «El
  período es inválido: la fecha desde es posterior a la fecha hasta.»). Si hubiera desacuerdo, gana la spec.
- **Matriz de amenazas:** N/A (dos rutas HTTP de solo lectura, consultas parametrizadas y una pantalla; sin
  subprocesos, shell ni automatización de VCS/PR).
- **Comandos de referencia:**
  - `V-BACK` (desde `backend/`, entorno virtual activo): `ruff check --fix . && ruff format .` y luego
    `ruff check . && ruff format --check . && lint-imports && pytest`. Enfocado:
    `pytest tests/modules/pagos --no-cov`.
  - `V-FRONT` (desde `frontend/`): `npm run format` y luego
    `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
    Enfocado: `npx vitest run src/modules/pagos src/shared/components/ReportesPage.test.tsx`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | backend ≈ 620 a 760; frontend ≈ 520 a 640 (código + pruebas, sin Markdown de `openspec/`) |
| 800-line budget risk | Medium en backend (cerca del punto de control por el movimiento de fábricas); Low en frontend |
| Chained PRs recommended | No |
| Suggested split | Single PR, dos commits (Fase 1 backend, Fase 2 frontend) |
| Delivery strategy | single-pr |
| Chain strategy | pending |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
800-line budget risk: Medium (backend), Low (frontend)
```

**Por qué `No`:** `openspec/config.yaml` y AGENTS.md §4 fijan 800 líneas por lado como punto de control, no
como bloqueo, y establecen que una HU nunca se divide en varios PR. Cada lado se mide por separado y ambos
quedan por debajo de 800 según el diseño. No se recortan pruebas para entrar en ningún número; si el backend
supera 800, se informa en el PR sin dividirlo. Al final se mide con `git diff --shortstat develop...HEAD` por
carpeta.

| Lado | Código (est.) | Pruebas (est.) | Total estimado | Límite |
| --- | --- | --- | --- | --- |
| `backend/` | repository 10, schemas 12, `reporte.py` 45, `reporte_pdf.py` 85, service 45, router 20 (≈ 215) | conftest 45, caja 45 (movimiento), `test_reporte` 70, `test_reporte_pdf` 90, `test_reporte_recaudacion` 220 (≈ 470) | **620 a 760** | 800 |
| `frontend/` | types 20, api 25, validarPeriodo 10, hook 65, página 130, reportes.ts 6, App.tsx 7 (≈ 265) | validarPeriodo 25, api 30, hook 120, página 130, ReportesPage 15 (≈ 320) | **520 a 640** | 800 |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|-----------------------|-----------------|-------------------|
| 1 | Backend: consulta de deuda por período, `reporte.py`, `reporte_pdf.py`, service y las dos rutas | PR 1 (commit 1) | `pytest tests/modules/pagos --no-cov` | `TestClient`, `GET /api/v1/reportes/recaudacion-por-medio-de-pago[/pdf]` | Revertir el commit 1; sin migración |
| 2 | Frontend: tipos, `api.ts`, `validarPeriodo.ts`, hook, página y registro en `/reportes` | PR 1 (commit 2) | `npx vitest run src/modules/pagos src/shared/components/ReportesPage.test.tsx` | `MemoryRouter` + `vi.mock('../api')` | Revertir el commit 2 |

## Fase 1. Backend: reporte de recaudación (`pagos/`)

- [ ] 1.1 (Refactor previo, sin cambio de comportamiento) Mover `fabrica_factura`, `fabrica_cobro` y
  `HOY_A_LAS_10` de `backend/tests/modules/pagos/test_caja_del_dia.py` a
  `backend/tests/modules/pagos/conftest.py` (Decisión 9), sumando a `fabrica_factura` el parámetro opcional
  `fecha_emision: datetime | None = None`; `test_caja_del_dia.py` las importa de `conftest`. Comprobar con
  `pytest tests/modules/pagos/test_caja_del_dia.py --no-cov` que sigue en verde (protege el snapshot de
  `caja-del-dia`: escenario «`caja-del-dia` conserva su snapshot»).
- [ ] 1.2 (Rojo) Crear `backend/tests/modules/pagos/test_reporte.py` (requisitos «Validación del período» y
  «Límites inclusivos del período en UTC-3»; S1, S9), lógica pura y sin base:
  - `validar_periodo`: los cuatro mensajes literales de la spec en orden, cada uno con
    `DatosInvalidosError`; `desde == hasta` es válido y devuelve las dos fechas;
  - `intervalo_utc(2026-10-01, 2026-10-31)` → `(2026-10-01 03:00, 2026-11-01 03:00)` UTC;
  - `armar_resumen`: `total_cobrado` = suma de los montos de `por_medio_pago`; lista vacía → `0.00`;
    eco de `fecha_desde` y `fecha_hasta` y `adeudado` sin cambios.
  Falla por `ModuleNotFoundError` (`reporte.py` no existe) y `ImportError` de `ResumenRecaudacion`.
- [ ] 1.3 (Rojo) Crear `backend/tests/modules/pagos/test_reporte_pdf.py` (requisito «Exportación a PDF»;
  S2, S5, S6, S8), con un `ResumenRecaudacion` armado a mano y `GENERADO` fijo:
  - `componer`: título «Recaudación por medio de pago», «Período: dd/mm/aaaa al dd/mm/aaaa» y `generado`;
  - con datos: recuadro de tres datos («Total cobrado», «Total adeudado», «Facturas adeudadas»), tabla
    «Cobrado por medio de pago» con una fila por medio y fila final `Total`, tipo «Billetera virtual», y el
    párrafo `_EXPLICACION` (deuda = saldo pendiente actual de las facturas emitidas en el período);
  - solo deuda (sin cobros): sin tabla, con `SIN_COBROS` y con el recuadro;
  - sin datos: sin tabla ni recuadro y con `SIN_DATOS` («No hay datos para el período seleccionado.»);
  - `formatear_importe(Decimal("1234.5"))` → `"$ 1.234,50"` y `Decimal("0")` → `"$ 0,00"`.
  Falla por `ModuleNotFoundError`: `reporte_pdf.py` no existe.
- [ ] 1.4 (Rojo) Crear `backend/tests/modules/pagos/test_reporte_recaudacion.py` (todos los requisitos con
  contrato HTTP, repository y service; S1 a S9), con `db`, `cliente`, `fabrica_medio_pago`,
  `fabrica_factura` y `fabrica_cobro`. Grupos de casos:
  - **Cobrado por medio (CA 1 y 3):** dos medios agrupados, ordenados por nombre, con `cantidad_cobros`,
    `monto` y `total_cobrado` (`3500.00`); cobros del `2026-09-30 23:59` y del `2026-11-01 00:00` locales no
    cuentan; un medio sin cobros no aparece; un medio con `eliminado = true` con cobros sí aparece (S3).
  - **Límites UTC-3 (S1):** cobro a las 00:00 local de `desde` (03:00 UTC) cuenta; cobro a las 23:59 local de
    `hasta` (02:59 UTC del día siguiente) cuenta; 02:59:59 UTC del día `desde` y 03:00 UTC del día `hasta + 1`
    no cuentan; `desde == hasta` incluye un cobro del `2026-10-15 12:00`.
  - **Deuda (CA 1 y 4; S2):** dos facturas `ADEUDADA` emitidas en el período con saldos `800.00` y `450.50` →
    `adeudado` `{"cantidad_facturas": 2, "monto": "1250.50"}`; cobrado y adeudado en la misma respuesta;
    factura `PAGADA` no suma; factura con cobro parcial (total `1000.00`, saldo `600.00`) cuenta 1 con `600.00`;
    `ADEUDADA` emitidas el `2026-09-30` y el `2026-11-01` no cuentan; la deuda usa el mismo intervalo
    (`2026-10-31 23:30` local cuenta, `2026-11-01 00:00` local no).
  - **Sin datos (CA 2; S5):** período sin cobros ni deuda → 200 con `por_medio_pago` `[]`, `total_cobrado`
    `0.00` y `adeudado` `{"cantidad_facturas": 0, "monto": "0.00"}`; deuda sin cobros → `[]`, `0.00` y
    `adeudado.monto` `800.00`; cobros sin deuda → `adeudado` en cero.
  - **Validación (S9):** los cuatro mensajes 422 con `{"detalle": ...}` (sin parámetros, solo `fecha_hasta`,
    solo `fecha_desde`, período inverso); formato inválido (`fecha_desde=15/10/2026`) → 422 nombrando
    `fecha_desde`; un período inválido no ejecuta consultas (`monkeypatch` de
    `repository.sumar_cobros_por_medio` y `repository.resumir_facturas_adeudadas` con funciones que fallan).
  - **PDF (S8):** `/pdf` con datos → 200, `content-type` `application/pdf`, `content-disposition` exacto
    `attachment; filename="recaudacion-medio-pago_2026-10-01_2026-10-31.pdf"` y cuerpo `startswith(b"%PDF")`;
    `/pdf` sin datos → 200 `application/pdf`; `/pdf` con período inverso → el mismo 422 JSON, no un PDF.
  - **Retrocompatibilidad (Decisión 1):** `resumir_facturas_adeudadas(db)` sin argumentos cuenta todas las
    `ADEUDADA` de cualquier fecha; con `desde`/`hasta` filtra por `[desde, hasta)`.
  - **Solo lectura:** ningún cobro ni factura cambia tras pedir el reporte en JSON y PDF.
  Falla con `404 Not Found` (rutas inexistentes) y `TypeError` (la consulta de deuda aún no acepta `desde` ni
  `hasta`).
- [ ] 1.5 (Verde) `backend/app/modules/pagos/repository.py` (Decisión 1): `resumir_facturas_adeudadas(db,
  desde=None, hasta=None)` filtra `fecha_emision` en `[desde, hasta)` solo cuando el argumento no es `None`.
  `sumar_cobros_por_medio` queda sin cambios (Decisión 2). Pasa el grupo de retrocompatibilidad de 1.4 y 1.1.
- [ ] 1.6 (Verde) `backend/app/modules/pagos/schemas.py`: `ResumenRecaudacion` (`fecha_desde`, `fecha_hasta`,
  `por_medio_pago`, `total_cobrado`, `adeudado`) y docstring de `CobradoPorMedio`; y
  `backend/app/modules/pagos/reporte.py` (nuevo, Decisión 3): `validar_periodo` e `intervalo_utc` copiados de
  `reservas/reporte.py` y `productos/reporte.py` (no se importa de otro módulo; `ZONA_DEL_RESTAURANTE` sale de
  `pagos/comprobante_pdf.py`) y `armar_resumen`. Pasa 1.2.
- [ ] 1.7 (Verde) Crear `backend/app/modules/pagos/reporte_pdf.py`: constantes `TITULO`, `SIN_DATOS`,
  `SIN_COBROS`, `_EXPLICACION` y `_TIPOS`; `formatear_importe` (pública, es-AR); `componer`, que delega en
  `_resumen`, `_parrafos` y `_tablas`. Pasa 1.3.
- [ ] 1.8 (Verde) `backend/app/modules/pagos/service.py`: extraer `_cobrados_por_medio(filas)` de
  `obtener_caja_del_dia` (Decisión 4, sin cambio de comportamiento); agregar el dataclass
  `ArchivoReporte(contenido, nombre)` con `frozen=True` (Decisión 5; `ArchivoComprobante` queda intacto);
  `generar_reporte_recaudacion(db, fecha_desde, fecha_hasta)` (validar → intervalo → consultas → armar) y
  `generar_pdf_recaudacion`, que reutiliza la función JSON, compone con la fecha de `_ahora()` en hora del
  restaurante (Decisión 7) y nombra el archivo `recaudacion-medio-pago_<desde>_<hasta>.pdf`. Pasa los casos de
  service de 1.4 y mantiene en verde `test_caja_del_dia.py`.
- [ ] 1.9 (Verde) `backend/app/modules/pagos/router.py`: sumar `date` y `ResumenRecaudacion` a los imports;
  `GET /reportes/recaudacion-por-medio-de-pago` y `GET /reportes/recaudacion-por-medio-de-pago/pdf` (con
  `Content-Disposition: attachment`), ambas con `fecha_desde: date | None = None` y
  `fecha_hasta: date | None = None`, solo delegando al `service`. Pasa 1.4.
- [ ] 1.10 (Refactor) Revisar las capas: cada función hasta 50 líneas y complejidad ciclomática 10
  (RNF-MAN-05); `reporte.py` como única fuente de `validar_periodo` e `intervalo_utc` dentro de `pagos`; el
  `service` sin importar FastAPI y sin duplicar la comprensión de `CobradoPorMedio`. Sin cambios de
  comportamiento; 1.1 a 1.4 siguen en verde.
- [ ] 1.11 Mutaciones de las reglas clave, una por vez, cada una restaurada a mano desde una copia de
  respaldo (nada de este cambio está commiteado todavía):
  - (a) en `repository.py`, quitar el filtro `Factura.fecha_emision < hasta` y comprobar que fallan los casos
    de deuda fuera del período y del límite superior;
  - (b) en `reporte.py`, cambiar `+ 1 día` por `+ 0` en el fin de `intervalo_utc` y comprobar que fallan los
    casos de «último instante de `fecha_hasta`» y de `desde == hasta`;
  - (c) en `repository.py`, filtrar la deuda por `PAGADA` en vez de `ADEUDADA` y comprobar que fallan los
    casos de factura pagada y de cobro parcial.
- [ ] 1.12 Verificar con `V-BACK` (`ruff check --fix . && ruff format .`, luego
  `ruff check . && ruff format --check . && lint-imports && pytest`, cobertura ≥ 70 %) y comprobar
  `alembic heads`: un único head, sin cambios.
- [ ] 1.13 Commit 1: `feat: agrega el reporte de recaudación por medio de pago en el backend (HU-M6-08)`.
  Rollback: revertir el commit (sin migración).

## Fase 2. Frontend: pantalla del reporte y registro en `/reportes` (depende de la Fase 1)

- [ ] 2.1 (Rojo) Crear `frontend/src/modules/pagos/validarPeriodo.test.ts` (requisito «Validación del
  período», lado frontend; S9): los cuatro mensajes literales, en el mismo orden que el backend, y el caso
  válido con `desde == hasta`. Falla: `validarPeriodo.ts` no existe.
- [ ] 2.2 (Rojo) Modificar `frontend/src/modules/pagos/api.test.ts`, con `clienteHttp` simulado:
  `obtenerReporteRecaudacion(desde, hasta)` llama a `clienteHttp.get` con
  `/reportes/recaudacion-por-medio-de-pago?fecha_desde=<desde>&fecha_hasta=<hasta>`;
  `descargarReporteRecaudacionPdf(desde, hasta)` llama a `clienteHttp.obtenerArchivo` con la misma query y
  `/pdf`. Falla: las dos funciones no existen en `api.ts`.
- [ ] 2.3 (Rojo) Crear `frontend/src/modules/pagos/pages/useReporteRecaudacion.test.tsx` (requisito «Pantalla
  del reporte»), con `vi.mock('../api')` y `vi.mock('../../../shared/lib/guardarArchivo')`:
  - validación local inválida (falta `hasta`) no llama a la API y expone «Falta la fecha hasta.»;
  - éxito: `generar()` expone el `resultado`;
  - 422: `error` igual al `detalle`; sin texto en la respuesta, `ERROR_CARGA`;
  - `descargarPdf()` llama a `guardarArchivo(blob, "recaudacion-medio-pago_<d>_<h>.pdf")` con el período del
    `resultado`;
  - error de descarga: `errorDescarga` igual al `detalle` o a `ERROR_DESCARGA`, y el `resultado` se conserva.
  Falla: `useReporteRecaudacion.ts` no existe.
- [ ] 2.4 (Rojo) Crear `frontend/src/modules/pagos/pages/ReporteRecaudacionPage.test.tsx`, con
  `MemoryRouter` y `vi.mock`. Los importes se comparan con `formatearMoneda` (Intl usa espacio duro):
  - con datos (Efectivo y Tarjeta, deuda de 2 facturas): tarjetas de total cobrado y total adeudado con «2
    facturas», tabla con una fila por medio, tipo y montos, y la nota de la deuda;
  - solo deuda (sin cobros): muestra la deuda y «Sin cobros en el período», no «No hay datos para el período
    seleccionado»;
  - cobros sin deuda: tabla por medio, no el estado vacío;
  - sin datos: «No hay datos para el período seleccionado», sin tabla ni tarjetas;
  - «Descargar PDF» presente con datos y sin datos;
  - sin elegir `fecha_hasta`: «Falta la fecha hasta.» y sin llamada a la API;
  - un 422 de la API muestra su `detalle`;
  - falla la descarga: aviso de error y el resultado sigue visible.
  Falla: `ReporteRecaudacionPage.tsx` no existe.
- [ ] 2.5 (Rojo) Modificar `frontend/src/shared/components/ReportesPage.test.tsx`: agregar el caso «la tarjeta
  5 (índice 4, recaudación por medio de pago) navega a `/reportes/recaudacion-por-medio-de-pago`» con una
  `<Route>` de prueba, siguiendo el patrón de las tarjetas existentes y sin alterar sus aserciones. Falla: la
  entrada no existe en `reportes.ts`.
- [ ] 2.6 (Verde) `frontend/src/modules/pagos/types.ts`: `CobradoPorMedio`, `Adeudado` y
  `ResumenRecaudacion` con los nombres del backend; y `frontend/src/modules/pagos/api.ts`: `consultaPeriodo`
  (privada, `URLSearchParams`), `obtenerReporteRecaudacion` y `descargarReporteRecaudacionPdf`. Pasa 2.2.
- [ ] 2.7 (Verde) Crear `frontend/src/modules/pagos/validarPeriodo.ts` (copia local, S9) con
  `validarPeriodo(desde, hasta): string | null`. Pasa 2.1.
- [ ] 2.8 (Verde) Crear `frontend/src/modules/pagos/pages/useReporteRecaudacion.ts`: estados `desde`,
  `hasta`, `resultado`, `error`, `errorDescarga`, `cargando`, `descargando`; `generar()` y `descargarPdf()`;
  constantes `ERROR_CARGA` y `ERROR_DESCARGA`. Pasa 2.3.
- [ ] 2.9 (Verde) Crear `frontend/src/modules/pagos/pages/ReporteRecaudacionPage.tsx` (Diseño de la
  pantalla): `Breadcrumbs`, `PageHeader`, `DateRangePicker`, botón «Generar»/«Generando…», `Alert` para
  `error` y `errorDescarga`; línea «Del dd/mm/aaaa al dd/mm/aaaa»; sin datos (`por_medio_pago` vacío y
  `adeudado.cantidad_facturas === 0`) `EmptyState`; con datos, dos `StatCard`, `DataTable` con `vacio` =
  «Sin cobros en el período» y la nota de S2; «Descargar PDF» en ambos casos. Funciones privadas
  `TarjetasDelResumen`, `TablaPorMedio` y `ResultadoReporte`. Pasa 2.4.
- [ ] 2.10 (Verde) `frontend/src/shared/components/reportes.ts`: entrada nueva al final («Recaudación por
  medio de pago», ruta `/reportes/recaudacion-por-medio-de-pago`); y `frontend/src/App.tsx`: un `lazy` de
  `ReporteRecaudacionPage` después de `PagosPage` y una `<Route path="reportes/recaudacion-por-medio-de-pago">`
  después de la de `pagos`, hermana de las demás rutas de reportes. Pasa 2.5.
- [ ] 2.11 (Refactor) Cada función de la página y del hook por debajo de 50 líneas (RNF-MAN-05);
  `validarPeriodo.ts` sin importar de otro módulo (AGENTS.md §9.4); archivos de prueba divididos en `describe`
  si `max-lines-per-function` lo exige. Sin cambios de comportamiento.
- [ ] 2.12 Verificar con `V-FRONT`: `npm run format`, luego
  `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`
  (0 errores y 0 advertencias de lint; cobertura ≥ 60 %).
- [ ] 2.13 Commit 2: `feat: agrega la pantalla del reporte de recaudación por medio de pago (HU-M6-08)`.
  Rollback: revertir el commit.

## Fase 3. Cierre

- [ ] 3.1 `git pull origin develop` y resolver conflictos en la rama, si `develop` avanzó (riesgo en
  `reportes.ts`, `App.tsx` y `ReportesPage.test.tsx` con reportes de otros módulos; conservar sus entradas y
  sumar solo la de M6). Revisar `alembic heads` otra vez: un único head, sin cambios.
- [ ] 3.2 **Verificación final con los comandos de CI de AGENTS.md §7**, con la CI en verde:
  - Backend, desde `backend/` con el entorno virtual activo:
    `ruff check . && ruff format --check . && lint-imports && pytest` (tras `ruff check --fix . && ruff format .`).
  - Frontend, desde `frontend/`:
    `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`
    (tras `npm run format`).
  No se bajan umbrales ni se desactivan reglas.
- [ ] 3.3 Aislamiento: `git diff --name-only origin/develop...HEAD` y confirmar que solo aparecen archivos de
  `backend/app/modules/pagos/`, `backend/tests/modules/pagos/`, `frontend/src/modules/pagos/`, las tres rutas
  compartidas autorizadas y `openspec/changes/HU-M6-08/`. Nada de otros módulos, `backend/app/shared/`,
  `backend/pyproject.toml` ni migraciones; `ArchivoComprobante` sin tocar.
- [ ] 3.4 Abrir el PR hacia `develop` con la plantilla `.github/pull_request_template.md` (lo hace la persona
  o el agente con su confirmación explícita; AGENTS.md §8):
  - `Closes #89`;
  - lista de los supuestos **S1 a S9** de `proposal.md`, en especial S2 (deuda por `fecha_emision` con saldo
    actual), para que el equipo los valide;
  - aviso: M6 sin responsable en S4 (lo implementa Franco con autorización) y archivos compartidos
    (`reportes.ts`, `App.tsx`, `ReportesPage.test.tsx`);
  - nota de formato de importes: este reporte usa es-AR en pantalla y PDF (S6), a diferencia de
    `FacturasTabla` y del comprobante, que no se cambian;
  - nota de la maqueta: `SPRINT-2/S2-04-maqueta/` no tiene pantalla de reportes; se siguió el estilo de los
    reportes ya integrados;
  - presupuesto de revisión medido con `git diff --shortstat develop...HEAD` para `backend/` y `frontend/`
    frente a 800 líneas por lado.

## Trazabilidad

| Requisito de la spec | Escenario | Tareas |
| --- | --- | --- |
| Cobrado por medio de pago en el período | Cobros agrupados por medio con total cobrado | 1.4, 1.6, 1.8, 1.9 |
| | Los cobros fuera del período no cuentan | 1.4, 1.11 |
| | Un medio sin cobros no aparece | 1.4 |
| | Un medio dado de baja con cobros aparece | 1.4 |
| Deuda del período | El reporte incluye el total adeudado | 1.4, 1.5, 1.11 |
| | Cobrado y adeudado en la misma respuesta | 1.4, 1.6 |
| | Una factura pagada no es deuda | 1.4, 1.11 |
| | Factura con cobro parcial cuenta por su saldo | 1.4, 1.11 |
| | Deuda emitida fuera del período no cuenta | 1.4, 1.11 |
| | `caja-del-dia` conserva su snapshot | 1.1, 1.4, 1.5, 1.8 |
| Período sin datos | Período sin cobros ni deuda | 1.2, 1.4, 1.6 |
| | La pantalla informa que no hay datos | 2.4, 2.9 |
| | Deuda con cero cobros | 1.4, 1.3, 2.4, 2.9 |
| | Cobros sin deuda | 1.4, 2.4, 2.9 |
| Validación del período | Faltan las dos / falta desde / falta hasta / período inverso | 1.2, 1.4, 1.6, 1.9, 2.1, 2.7 |
| | Fechas iguales son un período válido | 1.2, 1.4, 2.1 |
| | Formato de fecha inválido | 1.4, 1.9 |
| | La ruta `/pdf` valida igual que la ruta JSON | 1.4, 1.8, 1.9 |
| Límites inclusivos del período en UTC-3 | Primer instante de `fecha_desde` | 1.2, 1.4, 1.11 |
| | Último instante de `fecha_hasta` | 1.2, 1.4, 1.11 |
| | Un instante antes y uno después no cuentan | 1.4 |
| | La deuda usa el mismo intervalo | 1.4, 1.5, 1.11 |
| Exportación a PDF | Descarga del PDF con datos | 1.3, 1.4, 1.7, 1.8, 1.9 |
| | Descarga del PDF sin datos | 1.3, 1.4, 1.7 |
| Pantalla del reporte y tarjeta en el hub | La tarjeta abre la pantalla | 2.5, 2.10 |
| | La pantalla muestra cobrado por medio y adeudado | 2.4, 2.9 |
| | Validación local sin llamar a la API | 2.1, 2.3, 2.4, 2.7, 2.8 |
| | Un 422 de la API se muestra | 2.3, 2.4, 2.8 |
| | El botón de descarga está disponible sin datos | 2.4, 2.9 |
| | Falla la descarga | 2.3, 2.4, 2.8 |
| Aislamiento del módulo y del esquema | Sin migración nueva | 1.12, 3.1 |
| | Contratos de importación | 1.12, 3.2, 3.3 |
| | El reporte no modifica datos | 1.4 |

Cierre: la verificación completa es 1.12/2.12 y 3.2; el aislamiento final es 3.3; la validación de S1 a S9 y
los avisos de M6 quedan en 3.4, a cargo del equipo.
