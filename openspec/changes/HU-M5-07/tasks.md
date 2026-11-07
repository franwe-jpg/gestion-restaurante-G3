# Tareas: HU-M5-07 Reporte de reservas y ausentismo por período

- **Issue:** [#87](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/87) HU-M5-07. **Rama:**
  `feature/HU-M5-07-reporte-reservas-ausentismo`, creada desde `develop`. **Entrada:**
  `exploration.md`, `proposal.md`, `specs/reservas-reporte-ausentismo/spec.md` y `design.md`
  (Decisiones 39 a 49). Un solo cambio, una rama y un PR hacia `develop` (AGENTS.md §4).
- **Strict TDD activo** (`openspec/config.yaml:13-16`). Backend: `pytest` desde `backend/`
  (cobertura ≥ 70 %). Frontend: `npm test` (Vitest, cobertura ≥ 60 %). Cada tarea de código se
  planifica en orden **Rojo** (prueba que falla, y se comprueba que falla por el motivo correcto) →
  **Verde** (el código mínimo que la pasa) → **Refactor** (limpieza con las pruebas en verde). Nunca
  se escribe código de producción sin una prueba en rojo.
- **Una unidad de trabajo = un commit** (skill `work-unit-commits`): cada commit lleva su código,
  sus pruebas y su documentación juntos, y deja el repositorio verde. Conventional Commits en
  español con el ID de la HU, sin líneas de coautoría ni atribución de IA. Tipos permitidos:
  `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR hacia `develop`, sin PR encadenados
  (`single-pr`).
- **Dos unidades de trabajo, backend y frontend** (ver «Decisión de los work units» más abajo): la
  Fase 1 es un solo commit de backend con las cuatro capas nuevas/modificadas
  (`repository.py`, `reporte.py`, `schemas.py`, `service.py`, `reporte_pdf.py`, `router.py`); la
  Fase 2 es un solo commit de frontend con tipos, `api.ts`, `validarPeriodo.ts`, el hook, la página
  y el registro compartido (`reportes.ts`, `App.tsx`, `ReportesPage.test.tsx`).
- **Aislamiento** (AGENTS.md §9.3; proposal, «Excluido»): todo el trabajo queda dentro de
  `backend/app/modules/reservas/`, `backend/tests/modules/reservas/`,
  `frontend/src/modules/reservas/`, las tres líneas compartidas ya autorizadas por el diseño
  (`frontend/src/shared/components/reportes.ts`, `frontend/src/App.tsx` y
  `frontend/src/shared/components/ReportesPage.test.tsx`) y esta carpeta de `openspec/`. Sin
  cambios en `salon/`, `atencion/`, `menus/`, `productos/`, `pagos/`, `backend/app/shared/` (se usa
  `pdf.py:renderizar()` sin modificarlo), `backend/pyproject.toml` ni `backend/alembic/`. Sin
  migración nueva: los cuatro valores de `EstadoReserva` y el índice `ix_reservas_fecha_hora` ya
  existen.
- **Reloj y fábrica de las pruebas del backend:** `AHORA` (fixture `reloj`, autouse,
  `backend/tests/modules/reservas/conftest.py:128-130`) y `fabrica_reserva(fecha=..., estado=...)`
  (`:176-198`), que ya acepta cualquier estado, incluido `ATENDIDA` (sin HU-M5-06). **No hace falta
  ninguna fixture nueva.** El `cliente` de `TestClient` es el de `backend/tests/conftest.py`.
- **Matriz de amenazas:** N/A (el diseño la marca como no aplicable: dos rutas HTTP de solo
  lectura, una consulta parametrizada y una pantalla; sin subprocesos, shell ni automatización de
  VCS/PR).
- **Comandos de referencia** (se citan por nombre en las tareas):
  - `V-BACK` (desde `backend/`, con el entorno virtual activo): `ruff check --fix . && ruff format .`
    y luego `ruff check . && ruff format --check . && lint-imports && pytest`. Comando enfocado (sin
    cobertura): `pytest tests/modules/reservas --no-cov`.
  - `V-FRONT` (desde `frontend/`): `npm run format` y luego
    `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
    Comando enfocado: `npx vitest run src/modules/reservas src/shared/components/ReportesPage.test.tsx`.

## Pronóstico del presupuesto de revisión

| Field | Value |
|-------|-------|
| Estimated changed lines | backend ≈ 530 a 690; frontend ≈ 470 a 610 (código + pruebas, sin artefactos de `openspec/` en Markdown) |
| 400-line budget risk | High (frente al heurístico genérico de 400 líneas de la sesión) |
| Chained PRs recommended | No |
| Suggested split | Single PR, dos commits (Fase 1 backend, Fase 2 frontend) |
| Delivery strategy | single-pr |
| Chain strategy | pending |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High
```

**Por qué `No` a pesar del riesgo `High`:** `openspec/config.yaml` (`rules.tasks`) y AGENTS.md §4
fijan el presupuesto de revisión de este proyecto en **800 líneas por lado** como punto de control,
no como bloqueo, y establecen que **una HU nunca se divide en varios PR**. El propio `design.md`
(«Estimación de líneas») calcula backend ≈ 530 a 690 y frontend ≈ 470 a 610: los dos lados quedan
por debajo de 800. El heurístico genérico de 400 líneas de la sesión se reporta arriba por
transparencia (de ahí `High`), pero no activa el encadenamiento de PR ni pide `size:exception`: la
regla del proyecto, más específica, prevalece (mismo precedente que
`openspec/changes/HU-M5-04-05/tasks.md`, sección «Presupuesto de revisión»). No se recortan
pruebas para entrar en ningún número.

| Lado | Código (est.) | Pruebas (est.) | Total estimado | Límite del proyecto |
| --- | --- | --- | --- | --- |
| `backend/` | `repository` 15-20, `reporte.py` 45-55, `schemas` 18-22, `service` 30-35, `reporte_pdf.py` 55-65, `router` 20-25 | `test_repository_reporte` 60-80, `test_reporte` 70-90, `test_reporte_pdf` 50-70, `test_router_reporte` 150-200, `test_service` 15-25 | **530 a 690** | 800 |
| `frontend/` | `types` 12, `api.ts` 25-30, `validarPeriodo` 10, hook 60-70, página 80-100, `reportes.ts` 6, `App.tsx` 7 | `validarPeriodo.test` 25-30, `api.test` 25-35, hook 100-140, página 110-150, `ReportesPage.test` 10-20 | **470 a 610** | 800 |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|-----------------------|-----------------|-------------------|
| 1 | Backend: cuatro capas del reporte (repository, reporte.py, schemas, service, reporte_pdf, router) | PR 1 (commit 1) | `pytest tests/modules/reservas --no-cov` | `TestClient` de `backend/tests/conftest.py`, `GET /api/v1/reportes/reservas-ausentismo[/pdf]` | Revertir el commit 1; sin migración, no hace falta `alembic downgrade` |
| 2 | Frontend: tipos, `api.ts`, `validarPeriodo.ts`, hook, página y registro en `/reportes` | PR 1 (commit 2) | `npx vitest run src/modules/reservas src/shared/components/ReportesPage.test.tsx` | `MemoryRouter` + `vi.mock('../api')`, navegación manual `/reportes` → «Reservas y ausentismo» | Revertir el commit 2; `reportes.ts` y `App.tsx` vuelven a su estado anterior |

## Decisión de los work units (backend primero, frontend después)

- **Un solo commit para las seis capas del backend.** `repository.py`, `reporte.py`, `schemas.py`,
  `service.py`, `reporte_pdf.py` y `router.py` forman una sola conducta entregable (el reporte
  JSON y PDF): ninguna capa es útil por separado (el `router` sin `service` no responde nada; el
  PDF reutiliza la función JSON). Separarlas en varios commits obligaría a dejar el repositorio en
  un estado intermedio sin ruta funcional. Estimado ≈ 530 a 690 líneas, bajo el límite de 800.
- **Un solo commit para el frontend**, por el mismo motivo: la página no sirve sin el hook, el hook
  no sirve sin `api.ts`, y el registro en `reportes.ts`/`App.tsx` no tiene sentido sin la página que
  enlaza. Estimado ≈ 470 a 610 líneas.
- **Backend antes que frontend**, como en el orden de implementación de la propuesta y el precedente
  de `HU-M5-04-05`: el frontend llama a las dos rutas nuevas, así que la Fase 2 necesita el backend
  ya aplicado para poder probarlo de punta a punta si hace falta.
- Las mutaciones de prueba (1.12) se restauran a mano desde una copia de respaldo, no con
  `git restore`: el backend no tiene todavía un commit propio en esta rama en el momento de mutar
  (se mutila y se restaura **antes** del commit 1.14).

## Fase 1. Backend: reporte de reservas y ausentismo (`reservas/`)

- [x] 1.1 (Rojo) Crear `backend/tests/modules/reservas/test_repository_reporte.py`
  (Requisito «Calcular el resumen de reservas del período»; S2): casos de
  `contar_reservas_por_estado(db, desde, hasta)` con `fabrica_reserva`:
  - cuenta por estado dentro de `[desde, hasta]` con reservas en los cuatro estados;
  - un estado sin reservas en el período no aparece en el `dict` devuelto;
  - bordes: una reserva con `fecha == desde` y otra con `fecha == hasta` se cuentan; una reserva un
    día antes de `desde` y otra un día después de `hasta` no se cuentan;
  - la `hora` no influye (una reserva a las `23:59` del último día cuenta igual);
  - **una sola sentencia SQL** por llamada, verificada con
    `event.listen(engine, "before_cursor_execute", ...)` sobre la conexión de `db`.
  Falla por `ImportError`/`AttributeError`: `contar_reservas_por_estado` no existe en
  `repository.py`.
- [x] 1.2 (Rojo) Crear `backend/tests/modules/reservas/test_reporte.py`
  (Requisitos «Validación del período», «Cálculo del porcentaje de ausentismo», «Período sin
  reservas informa que no hay datos»; S1, S3, S4), puro y sin base:
  - `validar_periodo`: los cuatro mensajes literales en orden (faltan las dos, falta `desde`, falta
    `hasta`, `desde > hasta`), cada uno con `DatosInvalidosError`; `desde == hasta` es válido.
  - `calcular_porcentaje_ausentismo`: `2/10 → "20.00"`, `1/3 → "33.33"`, `2/3 → "66.67"` (redondeo
    hacia arriba, `ROUND_HALF_UP`), `0/5 → "0.00"`, `4/4 → "100.00"`, `total == 0 → None`.
  - `armar_resumen`: completa con `0` los estados ausentes; `total_reservas` incluye `ACTIVA`;
    invariante `total_reservas == 0 ⇔ porcentaje_ausentismo is None` parametrizada en los dos
    sentidos.
  Falla por `ModuleNotFoundError` (`reporte.py` no existe) y por `ImportError` de `ResumenReservas`
  (no existe todavía en `schemas.py`).
- [x] 1.3 (Rojo) Crear `backend/tests/modules/reservas/test_reporte_pdf.py`
  (Requisito «Exportación a PDF del reporte»; S5, S6), con un `ResumenReservas` armado a mano y
  `GENERADO` fijo:
  - `componer(...)` arma el título, el período en `dd/mm/aaaa` y `generado`;
  - con datos: una `TablaPdf` con las cinco filas y `"16,67 %"` formateado;
  - sin datos (`porcentaje_ausentismo is None`): sin tablas, `SIN_DATOS` en los párrafos y ningún
    carácter `%` en ningún texto;
  - `formatear_porcentaje(Decimal("33.33"))` devuelve `"33,33 %"`.
  Falla por `ModuleNotFoundError`: `reporte_pdf.py` no existe.
- [x] 1.4 (Rojo) Modificar `backend/tests/modules/reservas/test_service.py`
  (Requisito «Exportación a PDF del reporte», parte de servicio; Decisión 42 del diseño): un caso
  que comprueba que `generar_pdf_reservas_ausentismo` llama a `reporte_pdf.componer` con `AHORA`
  (fixture `reloj`) y arma el nombre `reservas-ausentismo_<desde>_<hasta>.pdf`, con
  `monkeypatch.setattr(reporte_pdf, "componer", <espía que delega en el original>)`. Falla por
  `AttributeError`: `generar_pdf_reservas_ausentismo` no existe en `service.py`.
- [x] 1.5 (Rojo) Crear `backend/tests/modules/reservas/test_router_reporte.py`
  (todos los requisitos de la spec con contrato HTTP; S1 a S7), con `TestClient`:
  - camino feliz con seis reservas en los cuatro estados (`total_reservas` 6, `atendidas` 1,
    `canceladas_anticipada` 2, `canceladas_por_ausencia` 1);
  - reservas fuera del período no se cuentan; período de un solo día;
  - sin reservas (dos variantes: ninguna reserva, y reservas solo fuera del período) → 200 con los
    cuatro contadores en `0` y `"porcentaje_ausentismo": null`;
  - los cuatro mensajes 422 de `validar_periodo` (incluido `desde == hasta` válido como contraste) y
    el 422 de formato inválido nombrando `fecha_desde`;
  - bordes: reserva en `fecha_desde`, reserva en `fecha_hasta`, un día antes y un día después;
  - `/pdf` con datos (`content-type` `application/pdf`, `content-disposition` con
    `2026-10-01` y `2026-10-31`, cuerpo `startswith(b"%PDF")`) y `/pdf` sin datos (200, PDF);
  - `/pdf` con período inverso responde el mismo 422 JSON, no un PDF;
  - un período inválido no ejecuta `contar_reservas_por_estado`
    (`monkeypatch.setattr(repository, "contar_reservas_por_estado", <falla si se llama>)`);
  - ninguna reserva cambia de estado, fecha ni ningún otro dato tras pedir el reporte en JSON y PDF.
  Falla con `404 Not Found`: las dos rutas no existen todavía en `router.py`.
- [x] 1.6 (Verde) `backend/app/modules/reservas/repository.py`, al final del archivo (Decisión 39):
  agregar `func` al import de `sqlalchemy` y `contar_reservas_por_estado(db: Session, desde: date,
  hasta: date) -> dict[EstadoReserva, int]` con `select(Reserva.estado, func.count(Reserva.id)).where(Reserva.fecha.between(desde, hasta)).group_by(Reserva.estado)`.
  Pasa 1.1.
- [x] 1.7 (Verde) `backend/app/modules/reservas/schemas.py`, al final del archivo (Decisión 41):
  `ResumenReservas` (`fecha_desde`, `fecha_hasta`, `total_reservas`, `atendidas`,
  `canceladas_anticipada`, `canceladas_por_ausencia`, `porcentaje_ausentismo: Decimal | None`) con
  `@field_serializer("porcentaje_ausentismo")` → texto con 2 decimales o `None`; y
  `backend/app/modules/reservas/reporte.py` (nuevo, Decisión 40): `validar_periodo` (mismo cuerpo y
  mensajes que `productos/reporte.py:24-36`), `calcular_porcentaje_ausentismo` y `armar_resumen`.
  Pasa 1.2.
- [x] 1.8 (Verde) Crear `backend/app/modules/reservas/reporte_pdf.py` (Decisión 43): constantes
  `TITULO`, `SIN_DATOS`, `_EXPLICACION`; `formatear_porcentaje` (pública); `_filas`; `componer`, que
  arma una `TablaPdf` con los cinco datos cuando hay porcentaje y, sin datos, solo los párrafos de
  explicación y `SIN_DATOS`. Pasa 1.3.
- [x] 1.9 (Verde) `backend/app/modules/reservas/service.py`, al final del archivo (Decisión 42):
  sumar `reporte`, `reporte_pdf` y `ResumenReservas` a los imports;
  `generar_reporte_reservas_ausentismo(db, fecha_desde, fecha_hasta)` (validar → consultar → armar);
  `ArchivoPdf` (`dataclass(frozen=True)` propio, no el de `productos`); y
  `generar_pdf_reservas_ausentismo(db, fecha_desde, fecha_hasta)`, que reutiliza la función JSON,
  compone el PDF con `ahora()` y nombra el archivo `reservas-ausentismo_<desde>_<hasta>.pdf`. Pasa
  1.4.
- [x] 1.10 (Verde) `backend/app/modules/reservas/router.py`, al final del archivo (Decisión 44):
  sumar `date`, `Response` y `ResumenReservas` a los imports; `GET /reportes/reservas-ausentismo`
  (JSON) y `GET /reportes/reservas-ausentismo/pdf` (con `Content-Disposition: attachment`), ambas
  con `fecha_desde: date | None = None` y `fecha_hasta: date | None = None`, solo delegando al
  `service`. Pasa 1.5.
- [x] 1.11 (Refactor) Revisar las seis capas: cada función hasta 50 líneas y complejidad ciclomática
  10 (RNF-MAN-05; el diseño ya las estima por debajo); `reporte.py` como única fuente de
  `validar_periodo` y del cálculo del porcentaje (sin duplicar la regla en `service.py` ni en el
  `router`); `reporte_pdf.formatear_porcentaje` pública solo porque la prueba la cubre directamente.
  Sin cambios de comportamiento; las pruebas de 1.1 a 1.5 siguen en verde.
- [x] 1.12 Mutaciones de las reglas clave, una por vez, cada una restaurada a mano desde una copia
  de respaldo del archivo (no `git restore`: nada de este cambio está commiteado todavía) antes de
  la siguiente mutación:
  - (a) en `reporte.py`, cambiar `if total == 0: return None` por `if total < 0: return None` en
    `calcular_porcentaje_ausentismo` y comprobar que los casos «total 0 → None» y la invariante
    parametrizada de `test_reporte.py` fallan;
  - (b) en `repository.py`, cambiar `Reserva.fecha.between(desde, hasta)` por
    `Reserva.fecha >= desde` (sin el límite superior) y comprobar que los escenarios de bordes y
    «fuera del período» de `test_repository_reporte.py` y `test_router_reporte.py` fallan.
  Restaurar el archivo original después de cada mutación.
- [x] 1.13 Verificar con `V-BACK`: `ruff check --fix . && ruff format .`, luego
  `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %). Comprobar
  además `alembic heads`: un único head, sin cambios (no se agrega ninguna migración).
- [x] 1.14 Commit 1: `feat: agrega el reporte de reservas y ausentismo en el backend (HU-M5-07)`.
  Incluye `repository.py`, `reporte.py`, `reporte_pdf.py`, `schemas.py`, `service.py`, `router.py`,
  `test_repository_reporte.py`, `test_reporte.py`, `test_reporte_pdf.py`, `test_router_reporte.py`
  y el ajuste de `test_service.py`. Rollback: revertir el commit; no hace falta `alembic downgrade`
  (sin migración). **Hecho:** commit `80b8549` en
  `feature/HU-M5-07-reporte-reservas-ausentismo`, 11 archivos, +761/-3. `ruff check`,
  `ruff format --check`, `lint-imports` y `pytest` (1934 passed, cobertura total 98.44 %,
  100 % en los seis archivos de `reservas/` tocados) en verde; `alembic heads` sin cambios
  (`a9c1e3f5b7d9`).

## Fase 2. Frontend: pantalla del reporte y registro en `/reportes` (depende de la Fase 1)

- [x] 2.1 (Rojo) Crear `frontend/src/modules/reservas/validarPeriodo.test.ts`
  (Requisito «Validación del período», lado frontend; S4): los cuatro mensajes literales, en el
  mismo orden que el backend, y el caso válido con `desde == hasta`. Falla: el módulo
  `validarPeriodo.ts` no existe.
- [x] 2.2 (Rojo) Modificar `frontend/src/modules/reservas/api.test.ts`, con `clienteHttp` simulado
  (Decisión 45): `obtenerReporteReservasAusentismo(desde, hasta)` llama a `clienteHttp.get` con
  `/reportes/reservas-ausentismo?fecha_desde=<desde>&fecha_hasta=<hasta>`;
  `descargarReporteReservasAusentismoPdf(desde, hasta)` llama a `clienteHttp.obtenerArchivo` con la
  misma query y `/pdf`. Falla: las dos funciones no existen en `api.ts`.
- [x] 2.3 (Rojo) Crear
  `frontend/src/modules/reservas/pages/useReporteReservasAusentismo.test.tsx`
  (Requisito «Pantalla del reporte»; Decisión 47), con `vi.mock('../api')` y
  `vi.mock('../../../shared/lib/guardarArchivo')`:
  - validación local inválida (falta `hasta`) no llama a la API y expone `error`;
  - éxito: `generar()` expone el `resultado` de la API;
  - 422: `error` queda igual al `detalle` de la respuesta; sin `error` en la respuesta, usa
    `ERROR_CARGA`;
  - `descargarPdf()` llama a `guardarArchivo` con `reservas-ausentismo_<desde>_<hasta>.pdf`
    (período del `resultado`, no de los campos del formulario);
  - un error de descarga expone `errorDescarga`, igual al `detalle` o a `ERROR_DESCARGA`.
  Falla: el archivo `useReporteReservasAusentismo.ts` no existe.
- [x] 2.4 (Rojo) Crear
  `frontend/src/modules/reservas/pages/ReporteReservasAusentismoPage.test.tsx`
  (Decisión 48), con `MemoryRouter` y `vi.mock`:
  - con datos: muestra los cinco datos (`total_reservas`, `atendidas`, `canceladas_anticipada`,
    `canceladas_por_ausencia`) y `"33,33 %"` de ausentismo;
  - sin datos (`total_reservas === 0`): muestra «No hay datos para el período seleccionado» y
    **ningún** texto con `%`;
  - el botón «Descargar PDF» está presente en los dos casos anteriores;
  - sin elegir `fecha_hasta`, pedir el reporte muestra «Falta la fecha hasta.» y no llama a la API;
  - un 422 de la API muestra su `detalle`.
  Falla: el archivo `ReporteReservasAusentismoPage.tsx` no existe.
- [x] 2.5 (Rojo) Modificar `frontend/src/shared/components/ReportesPage.test.tsx`
  (Decisión 49, punto 3): ajustar las dos aserciones que usan
  `screen.getByRole('link', { name: 'Generar' })` (hoy únicas con una sola tarjeta) para que
  localicen el enlace dentro de la tarjeta de M1 (por ejemplo
  `within(screen.getAllByRole('listitem')[0])` o el equivalente que ya usa el archivo), de modo que
  sigan pasando con dos tarjetas en el catálogo; y agregar un caso nuevo: la tarjeta «Reservas y
  ausentismo» navega a `/reportes/reservas-ausentismo` (con una `<Route>` de prueba como la que ya
  usa el archivo para M1). Falla: la tarjeta nueva todavía no existe en `reportes.ts`, así que el
  caso nuevo no encuentra el enlace (las aserciones ajustadas de M1 ya pasan solas, sin esperar a la
  Fase 2, porque solo cambian *cómo* se busca el enlace existente, no agregan ninguna tarjeta).
- [x] 2.6 (Verde) `frontend/src/modules/reservas/types.ts`, al final (Decisión 45): interfaz
  `ResumenReservas` con los nombres de campo del backend
  (`porcentaje_ausentismo: string | null`); y `frontend/src/modules/reservas/api.ts`, al final:
  `consultaPeriodo`, `obtenerReporteReservasAusentismo` (`clienteHttp.get`) y
  `descargarReporteReservasAusentismoPdf` (`clienteHttp.obtenerArchivo`). Pasa 2.2.
- [x] 2.7 (Verde) Crear `frontend/src/modules/reservas/validarPeriodo.ts` (Decisión 46), en la raíz
  del módulo: `validarPeriodo(desde: string, hasta: string): string | null` con los cuatro mensajes
  literales, en el mismo orden que el backend. Pasa 2.1.
- [x] 2.8 (Verde) Crear `frontend/src/modules/reservas/pages/useReporteReservasAusentismo.ts`
  (Decisión 47): estados `desde`, `hasta`, `resultado`, `error`, `errorDescarga`, `cargando`,
  `descargando`; `generar()` (valida local → llama a la API → `respuesta.error ?? ERROR_CARGA`) y
  `descargarPdf()` (usa el período de `resultado`, llama a `guardarArchivo`). Pasa 2.3.
- [x] 2.9 (Verde) Crear
  `frontend/src/modules/reservas/pages/ReporteReservasAusentismoPage.tsx` (Decisión 48):
  `Breadcrumbs`, `PageHeader`, `DateRangePicker`, botón «Generar»/«Generando…», `Alert` para
  `error`/`errorDescarga`; con `resultado.total_reservas === 0` muestra `EmptyState`; si no, cinco
  `StatCard` con `formatearPorcentaje` local; botón «Descargar PDF» en los dos casos. Pasa 2.4.
- [x] 2.10 (Verde) `frontend/src/shared/components/reportes.ts`: una entrada nueva («Reservas y
  ausentismo», `/reportes/reservas-ausentismo`), después de la de M1 (Decisión 49, punto 1); y
  `frontend/src/App.tsx`: un `lazy` nuevo para `ReporteReservasAusentismoPage` y una `<Route
  path="reportes/reservas-ausentismo">` hermana de las rutas de M1 (no anidada bajo
  `path="reportes"`, Decisión 49, punto 2). Pasa 2.5.
- [x] 2.11 (Refactor) Revisar: la página queda por debajo de 50 líneas (extraer una función privada
  `TarjetasDelResumen({ resumen })` si hace falta, RNF-MAN-05); el hook sin lógica repetida entre
  `generar` y `descargarPdf`; `validarPeriodo.ts` sin importar nada de `productos/` (AGENTS.md
  §9.4). Sin cambios de comportamiento; las pruebas de 2.1 a 2.5 siguen en verde. **Hecho:** se
  extrajo además `ResultadoReporte({ resultado, descargando, onDescargarPdf })` para que
  `ReporteReservasAusentismoPage` quede en 36 líneas de cuerpo (por debajo de 50); los archivos de
  prueba se dividieron en varios `describe` para cumplir `max-lines-per-function` de ESLint (50
  líneas), sin cambiar ningún caso.
- [x] 2.12 Verificar con `V-FRONT`: `npm run format`, luego
  `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`
  (cobertura ≥ 60 %). **Hecho:** `npm run format` sin cambios pendientes;
  `npm run lint` (0 errores), `npm run format:check`, `npm run typecheck` y `npm run build` en
  verde; `npm run test:coverage`: 1116/1116 pruebas en verde (99 archivos), cobertura global
  77,48 % statements / 73,45 % branches / 73,43 % funcs / 79,11 % lines (umbral 60 % en
  `src/App.tsx` y `src/shared/**`, que es lo que mide `vite.config.ts`; los módulos no están en el
  umbral de cobertura del proyecto). Enfocado:
  `npx vitest run src/modules/reservas src/shared/components/ReportesPage.test.tsx` → 271/271 en
  verde (16 archivos). Una prueba preexistente y ajena a este cambio
  (`ReservasPage.test.tsx > cambiar de día desde la segunda página vuelve a la primera`, y en otra
  corrida `App.test.tsx`) quedó en rojo por timeout al correr la suite completa bajo carga; pasa en
  verde al aislarla (`-t`) y en una tercera corrida completa de `test:coverage` (1116/1116). No se
  tocó ningún archivo de esas pruebas.
- [x] 2.13 Commit 2: `feat: agrega la pantalla del reporte de reservas y ausentismo (HU-M5-07)`.
  Incluye `types.ts`, `api.ts`, `api.test.ts`, `validarPeriodo.ts` (+ prueba),
  `pages/useReporteReservasAusentismo.ts` (+ prueba),
  `pages/ReporteReservasAusentismoPage.tsx` (+ prueba), `reportes.ts`, `App.tsx` y
  `ReportesPage.test.tsx`. Rollback: revertir el commit.

## Fase 3. Cierre

- [ ] 3.1 `git pull origin develop` y resolver los conflictos en la rama, si `develop` avanzó desde
  que se creó la rama (riesgo ya anotado en `proposal.md`, sección «Riesgos»: posible conflicto en
  `frontend/src/shared/components/reportes.ts`, `frontend/src/App.tsx` y
  `frontend/src/shared/components/ReportesPage.test.tsx` con reportes de otros módulos integrados
  en paralelo). Si otro módulo ya ajustó `ReportesPage.test.tsx` con su propia tarjeta, conservar su
  versión y sumar solo la prueba de M5. Revisar `alembic heads` otra vez después del `pull` (un
  único head, sin cambios).
- [ ] 3.2 Correr los dos juegos de chequeos completos de AGENTS.md §7, con la CI en verde: backend
  desde `backend/` con el entorno virtual activo
  (`ruff check --fix . && ruff format . && ruff check . && ruff format --check . && lint-imports && pytest`)
  y frontend desde `frontend/`
  (`npm run format && npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`).
- [ ] 3.3 Aislamiento: `git diff --name-only origin/develop...HEAD` contra todo el cambio y
  confirmar que solo aparecen archivos de `backend/app/modules/reservas/`,
  `backend/tests/modules/reservas/`, `frontend/src/modules/reservas/`, las tres rutas compartidas
  ya autorizadas (`frontend/src/shared/components/reportes.ts`, `frontend/src/App.tsx`,
  `frontend/src/shared/components/ReportesPage.test.tsx`) y `openspec/changes/HU-M5-07/`. Nada de
  `salon/`, `atencion/`, `menus/`, `productos/`, `pagos/`, `backend/app/shared/` ni
  `backend/pyproject.toml`. `lint-imports` (3.2) confirma los contratos sin romper.
- [ ] 3.4 Abrir el PR hacia `develop` con la plantilla `.github/pull_request_template.md` (esta
  tarea la hace la persona responsable, o el agente con su confirmación explícita; AGENTS.md §8 —
  ninguna tarea crea, cierra ni edita un PR sin esa confirmación):
  - `Closes #87`;
  - lista de los supuestos **S1 a S7** de `proposal.md` (sección «Supuestos a validar por el
    equipo»), para que el equipo los valide en el PR;
  - nota de que el diagrama de clases (`SPRINT-0/G3 - Diagrama de clases unificado.drawio`, celda
    `rep-rM5dto`) no tiene el campo `atendidas` ni refleja la nulabilidad de `porcentajeAusentismo`
    (proposal, sección «Decisión: el DTO incluye `atendidas`»), para que el equipo lo actualice;
  - nota de la diferencia con la maqueta: `SPRINT-2/S2-04-maqueta/` no tiene pantalla de reportes;
    se siguió el estilo de la pantalla ya integrada de M1 (proposal, sección «Frontend»);
  - presupuesto de revisión medido con `git diff --shortstat develop...HEAD` para `backend/` y para
    `frontend/`, frente al punto de control de 800 líneas por lado (AGENTS.md §4).

## Trazabilidad

| Requisito de la spec | Escenario | Tareas |
| --- | --- | --- |
| Calcular el resumen de reservas del período | Camino feliz con reservas en los cuatro estados | 1.1, 1.5, 1.6, 1.7, 1.9, 1.10 |
| | Reservas fuera del período no se cuentan | 1.1, 1.5, 1.6, 1.12 |
| | Período de un solo día | 1.1, 1.5 |
| Período sin reservas informa que no hay datos | Período sin ninguna reserva | 1.2, 1.5, 1.7, 1.12 |
| | Período sin reservas propias, aunque existan reservas en otras fechas | 1.2, 1.5 |
| | La pantalla no muestra ningún porcentaje cuando no hay datos | 2.4, 2.9 |
| Cálculo del porcentaje de ausentismo | Porcentaje exacto, redondeo, cero y 100 % | 1.2, 1.7, 1.12 |
| Validación del período | Faltan las dos fechas, falta `desde`, falta `hasta`, `desde > hasta` | 1.2, 1.5, 1.7, 1.10, 2.1, 2.7 |
| | Las dos fechas iguales son un período válido | 1.2, 1.5, 2.1 |
| | Formato de fecha inválido | 1.5, 1.10 |
| | La ruta `/pdf` valida el período igual que la ruta JSON | 1.5, 1.9, 1.10 |
| Los bordes del período cuentan, los días fuera no | Reserva en `fecha_desde`/`fecha_hasta`; un día antes/después | 1.1, 1.5, 1.6, 1.12 |
| Exportación a PDF del reporte | Descarga con datos / sin datos | 1.3, 1.4, 1.5, 1.8, 1.9 |
| Pantalla del reporte | La tarjeta abre la pantalla del reporte | 2.5, 2.10 |
| | Muestra los cinco datos de un período con reservas | 2.4, 2.9 |
| | Validación local sin llamar a la API | 2.3, 2.4, 2.8 |
| | Un 422 de la API se muestra igual que el de la validación local | 2.3, 2.4, 2.8 |
| | El botón de descarga está disponible aunque no haya datos | 2.4, 2.9 |
| Aislamiento del módulo y del esquema | Sin migración nueva | 1.13, 3.1 |
| | Contratos de importación | 1.13, 3.3 |
| | El reporte no modifica ninguna reserva | 1.5 |

Cierre: la verificación completa es 1.13/2.12 y 3.2; el aislamiento final es 3.3; la validación de
S1 a S7, la nota del diagrama y la diferencia con la maqueta quedan en 3.4, a cargo del equipo.
