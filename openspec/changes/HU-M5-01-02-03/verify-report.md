# Informe de verificación: HU-M5-01-02-03 Crear, modificar y listar reservas

> **Nota del 2026-10-30:** el requisito «Capacidad de la mesa (HU-M5-01 CA 8, S5)» se quitó después de este informe, por el issue #61 (la cantidad de personas no se valida contra la capacidad de la mesa; se resuelve en forma presencial). Las menciones de capacidad de este informe describen el estado verificado en `f1a210f` y ya no rigen; ver «Ajuste posterior» en `apply-progress.md`.

- **Cambio:** `HU-M5-01-02-03` (ABM de `Reserva`, módulo M5). **Rama:** `feature/HU-M5-01-02-03-abm-reservas`. **HEAD verificado:** `f1a210f` (10 commits sobre `develop`, que sigue en `0bff1e0`, el punto de partida de la rama).
- **Fecha:** 2026-10-29. **Modo:** Strict TDD. **Almacén de artefactos:** OpenSpec. **Rol:** verificación independiente de solo lectura; este archivo es lo único que se creó.
- **Alcance de la lectura:** `tasks.md`, `apply-progress.md`, `design.md`, `specs/reservas-gestion/spec.md`, todo el código de producción de `backend/app/modules/reservas/`, la migración, `main.py`, el código de producción de `frontend/src/modules/reservas/` y los nombres y el contenido clave de las pruebas.

## 1. Resumen ejecutivo y veredicto

**Veredicto: PASS WITH WARNINGS.** CRITICAL 0, WARNING 5, SUGGESTION 7.

- Los 31 requisitos de la spec están implementados y cubiertos por pruebas que pasan: **COMPLIANT 31, PARTIAL 0, UNTESTED 0, FAILING 0** (algunas filas llevan una salvedad, ver la matriz y los hallazgos).
- Todo lo que se pudo ejecutar quedó en verde: backend 775 pruebas (cobertura 99,62 %), `ruff`, `ruff format --check`, `lint-imports` (10 contratos cumplidos) y un único head de Alembic; frontend 527 pruebas en 47 archivos, `lint`, `format:check`, `typecheck`, `build`, y las 96 pruebas del módulo en `TZ=America/Argentina/Buenos_Aires` y en `TZ=UTC`.
- Lo que **no** se verificó: los humos manuales con navegador (5.11, 7.8, 8.4), el aspecto visual de la pantalla y la integración real frontend + backend. Siguen pendientes de la persona, como se acordó.
- Las 17 casillas sin marcar son las esperadas: 2 humos manuales, 7 de cierre (8.1 a 8.7) y 8 de «Antes del PR» (P.1 a P.8). No hay ninguna casilla sin marcar que sea un problema real.
- Aislamiento correcto: ningún archivo de `salon/`, `atencion/`, `shared/` (backend y frontend), `App.tsx`, `pyproject.toml`, `alembic/env.py` ni de CI cambió, salvo las 2 líneas de `backend/tests/modules/salon/test_migracion.py`. Sin dependencias nuevas.

## 2. Tareas (`tasks.md`)

Marcadas `[x]`: **67**. Sin marcar `[ ]`: **17**. `apply-progress.md` tiene 67 filas `[x]` y 2 filas `[ ]` (5.11 y 7.8), que coinciden con `tasks.md`.

| Casilla | Clasificación | Observación |
|---------|---------------|-------------|
| 5.11, 7.8 | Pendiente por diseño de la persona | Humo manual con `npm run dev` y el backend real. `V-FRONT` y `V-TZ` de esas tareas sí están en verde (reproducido en este informe). |
| 8.4 | Pendiente por diseño de la persona | Humo de punta a punta (alta, 409 visible, filtros, modificación, «Día siguiente» y «Hoy»). |
| 8.1 | Cierre del orquestador | CI completa. **Reproducida aquí en verde** (sección 3), pero la casilla es del orquestador. |
| 8.2 | Cierre del orquestador | `alembic heads` = `d6f8a0c2e4b6` observado. El ciclo subir, bajar, subir lo cubren `test_migracion.py:155` y `:173` (verdes) y el arnés de la unidad 1 de `apply-progress.md`. |
| 8.3 | Cierre del orquestador | Aislamiento comprobado con `git diff --name-only develop...HEAD` (sección 7). |
| 8.5 | Cierre del orquestador | Esta matriz (sección 5) es la trazabilidad. |
| 8.6 | Cierre del orquestador | Medido aquí: backend 2.285 líneas (2.281 + 4), frontend 1.822 (1.796 + 26). Ver W2. |
| 8.7 | Cierre del orquestador | Commit 10. `tasks.md` y `apply-progress.md` tienen cambios sin commitear (+281 −54) y este informe es un archivo nuevo. |
| P.1 a P.8 | Pendiente de la persona | `Closes #n`, confirmar criterios contra los issues, avisar a M3, validar S1 a S28, `git pull origin develop`, notas del PR (maqueta y tamaño). |

Las 67 casillas `[x]` tienen evidencia en `apply-progress.md` (tabla «Tareas completadas», tabla «TDD Cycle Evidence» y una sección por unidad de trabajo). Las cifras de las líneas base son coherentes con lo medido aquí: backend 581 + 194 del módulo = 775; frontend 431 + 96 del módulo = 527.

## 3. Evidencia de ejecución (observada)

Backend, en Docker con la imagen `g3-backend-test`, sin red, con `backend/` montado en `/app`:

| Comando | Resultado observado |
|---------|---------------------|
| `ruff check .` | `All checks passed!` (exit 0) |
| `ruff format --check .` | `85 files already formatted` (exit 0) |
| `lint-imports` | `Contracts: 10 kept, 0 broken.` (exit 0). Incluye «Otros modulos solo usan el service de reservas» y «models solo importa shared» |
| `alembic heads` | `d6f8a0c2e4b6 (head)`, un solo head (exit 0) |
| `python -m pytest -q` | `775 passed, 1 warning in 85.65s`; cobertura total 99,62 % (umbral 70 %); las 7 unidades de `app/modules/reservas/` al 100 % (exit 0). La advertencia es de terceros (`StarletteDeprecationWarning` de `httpx` en `fastapi/testclient.py`) |

Frontend, desde `frontend/`, con el `node_modules` existente (sin instalar nada, sin red):

| Comando | Resultado observado |
|---------|---------------------|
| `npm run lint` (`eslint . --max-warnings=0`) | 0 errores y 0 advertencias (exit 0) |
| `npm run format:check` | `All matched files use Prettier code style!` (exit 0) |
| `npm run typecheck` | sin errores (exit 0) |
| `npm run test:coverage` | `Test Files 47 passed (47)`, `Tests 527 passed (527)`; sentencias 74,75 %, ramas 70,62 %, funciones 71,2 %, líneas 76,68 % (umbral 60 %) (exit 0). **0 fallos**: la prueba intermitente de la línea base no apareció en esta corrida |
| `npm run build` | `✓ built in 708ms` (exit 0); `ReservasPage-*.js` 8,95 kB |
| `TZ=America/Argentina/Buenos_Aires npx vitest run src/modules/reservas --coverage.enabled=false` | `Test Files 7 passed (7)`, `Tests 96 passed (96)` (exit 0). El reloj de la corrida marcó 20:35, lo que confirma que la zona se aplicó |
| `TZ=UTC npx vitest run src/modules/reservas --coverage.enabled=false` | `Test Files 7 passed (7)`, `Tests 96 passed (96)` (exit 0). Reloj 23:35 |

Comprobaciones con git:

| Comando | Resultado observado |
|---------|---------------------|
| `git diff develop...HEAD -- backend/requirements.txt frontend/package.json frontend/package-lock.json` | vacío: sin dependencias nuevas |
| `git diff --name-only develop...HEAD` | solo `backend/alembic/versions/d6f8a0c2e4b6_crea_reservas.py`, `backend/app/main.py`, `backend/app/modules/reservas/*`, `backend/tests/modules/reservas/*`, `backend/tests/modules/salon/test_migracion.py` (2 líneas), `frontend/src/modules/reservas/**` y `openspec/changes/HU-M5-01-02-03/*` |
| `git diff develop...HEAD -- backend/tests/modules/salon/test_migracion.py` | exactamente 2 líneas: `"-2"` pasa a `"c4e6a8b0d2f4"` y `"-1"` pasa a `"f3a5c7e9b1d2"` |
| `git log develop..HEAD` (búsqueda de «co-authored», «claude», «generated with», «anthropic») | sin coincidencias; los 10 asuntos son `feat:` o `docs:` en español con el ID de la HU |
| `git diff --shortstat develop...HEAD -- backend` y `-- frontend` | backend: 17 archivos, 2.281 inserciones y 4 eliminaciones; frontend: 20 archivos, 1.796 inserciones y 26 eliminaciones |

Sondas adicionales hechas para este informe (Docker, `backend/` montado en solo lectura, base SQLite descartable dentro del contenedor, sin tocar el repositorio): esquemas con fecha y hora numéricas o con formatos laxos, y rutas con identificadores enormes (ver S1 y S2).

## 4. Cumplimiento de Strict TDD

| Comprobación | Resultado | Detalle |
|--------------|-----------|---------|
| Evidencia de TDD reportada | OK | `apply-progress.md` trae la tabla «TDD Cycle Evidence» con 28 filas (Rojo, Verde, Triangulación, Refactor y red de seguridad por tarea) |
| Todas las tareas de código tienen pruebas | OK | Backend: `test_migracion`, `test_models`, `test_puente`, `test_schemas`, `test_service`, `test_router` y `conftest.py`. Frontend: 7 archivos de prueba. Todos existen |
| Rojo confirmado (las pruebas existen) | OK, no reproducible | Los archivos existen. Las salidas del Rojo (`ImportError`, `404 == 201`, etc.) las informa el apply. Cada commit junta prueba y código, así que el historial de git no puede demostrar el Rojo |
| Verde confirmado (las pruebas pasan hoy) | OK | 775 de 775 y 527 de 527 |
| Triangulación | OK | Pruebas parametrizadas y límites: hora 11:30, 12:00 y 12:01; capacidad 7 de 6, 6 de 6 y stub con 50; tres estados no activos; 13 tipos laxos; etc. |
| Red de seguridad en archivos modificados | OK | `salon/test_migracion.py` (13 pruebas de M3 verdes antes de la migración nueva); las suites ampliadas partieron de su línea base |
| Comprobaciones de mutación | Informadas, no reproducidas | El apply reporta mutantes detectados (por ejemplo, 11 sobre el código final del commit 8) y un mutante equivalente conocido (`Reserva.id` en el orden). No se repitieron aquí |

Capas: unidad (esquemas, puente, `validarReserva`, `fechas`, `api`), integración con SQLite (modelo, migración, `service`, `repository`), integración HTTP (`TestClient`) y componente o página (Testing Library con API simulada). No hay pruebas E2E en el cambio.

Cobertura de los archivos cambiados: backend, las 7 unidades de `reservas/` al 100 %. Frontend: **no medida**; `frontend/vite.config.ts` solo incluye `src/App.tsx` y `src/shared/**` (ver W3).

## 5. Matriz de cumplimiento de la spec (31 requisitos)

Rutas de pruebas relativas a `backend/tests/modules/reservas/` (backend) y `frontend/src/modules/reservas/` (frontend); código relativo a `backend/app/modules/reservas/` o `frontend/src/modules/reservas/`. Todas las pruebas citadas pasan (sección 3).

### Backend (requisitos 1 a 25)

| # | Requisito | Pruebas (ruta:línea) | Código (ruta:línea) | Estado |
|---|-----------|----------------------|---------------------|--------|
| 1 | Crear una reserva activa (HU-M5-01 CA 1) | `test_router.py:29`, `:49`; `test_service.py:59`, `:75`, `:106`; `test_router.py:314` (el `GET` devuelve los mismos datos) | `router.py:23-25`; `service.py:84-99`; `repository.py:16-19`; `schemas.py:38-51` | COMPLIANT |
| 2 | El estado lo asigna el sistema (CA 2) | `test_service.py:59`; `test_models.py:20`; `test_schemas.py:117`, `:121`; `test_router.py:149` | `service.py:96`; `schemas.py:14` (`extra="forbid"`); `models.py:43-45` | COMPLIANT |
| 3 | Campos obligatorios y tipos (CA 3) | `test_schemas.py:49`, `:59`, `:88`, `:101`, `:106`, `:111`; `test_router.py:138` | `schemas.py:11-31` (`StrictInt`, `gt=0`, validador de hora) | COMPLIANT |
| 4 | Mesa y cliente existentes (CA 4) | `test_service.py:141`, `:148`, `:156`, `:164`; `test_router.py:90`, `:100`; `test_puente.py:10`, `:17`, `:22`, `:27` | `service.py:25-34`, `:85-86`; `puente.py:20-27` | COMPLIANT |
| 5 | Fecha no pasada (CA 5) | `test_service.py:82`, `:106`, `:126`; `test_router.py:70` | `service.py:37-41` | COMPLIANT |
| 6 | Hora válida y no pasada (CA 6) | `test_service.py:90`, `:98`, `:106`, `:114` (minutos), `:126`, `:134` (04:15); `test_router.py:79` | `service.py:42-43` (compara `(hora, minuto)`) | COMPLIANT |
| 7 | Cantidad de personas positiva (CA 7) | `test_schemas.py:65`, `:88`; `test_service.py:75`; `test_migracion.py:110` | `schemas.py:18`; `models.py:22`; migración `:45` | COMPLIANT |
| 8 | Capacidad de la mesa (CA 8, S5) | `test_service.py:172`, `:185`, `:194`; `test_router.py:160` | `service.py:46-52` | COMPLIANT |
| 9 | Mesa sin otra reserva activa (CA 9, R13) | `test_service.py:201`, `:223`, `:234`, `:247`, `:259`, `:271`, `:342`, `:356`, `:370`; `test_router.py:57`; `test_migracion.py:123`, `:137` | `service.py:55-81`; `repository.py:22-37`; `models.py:24-31`; migración `:49-55` | COMPLIANT (la carrera se simula; ver S6) |
| 10 | Consultar una reserva | `test_service.py:560`, `:574`, `:580`; `test_router.py:314`, `:324`, `:333`, `:340` | `service.py:102-106`, `:122-123`; `router.py:35-37` | COMPLIANT |
| 11 | Modificar fecha, hora y cantidad (HU-M5-02 CA 1) | `test_service.py:586`, `:595`, `:604`; `test_schemas.py:217`, `:227`; `test_router.py:348`, `:379` | `service.py:126-136`; `router.py:40-42`; `schemas.py:34-35` | COMPLIANT |
| 12 | Mesa, cliente y estado no cambian (CA 2) | `test_service.py:614`; `test_schemas.py:238`; `test_router.py:379` (mesa, cliente y estado) | `schemas.py:14`, `:34-35`; `service.py:132-134` (solo asigna los tres campos) | COMPLIANT |
| 13 | Revalidar las reglas del alta (CA 3) | `test_service.py:626`, `:636`, `:646`, `:662`, `:671` (S27); `test_schemas.py:252`; `test_router.py:419` | `service.py:129-130`, `:115-119` | COMPLIANT |
| 14 | Conflicto sin contar la propia reserva (CA 4) | `test_service.py:680`, `:690`, `:702`, `:709`, `:716`, `:767`; `test_router.py:406` | `repository.py:22-37` (`excluir_id`); `service.py:131` | COMPLIANT |
| 15 | Solo se modifican reservas activas (CA 5) | `test_service.py:734` (3 estados), `:748`; `test_router.py:394` | `service.py:109-112`, `:128` | COMPLIANT |
| 16 | Reserva inexistente al modificar (CA 6) | `test_service.py:759`; `test_router.py:429`, `:437` | `service.py:102-106` | COMPLIANT |
| 17 | Listado paginado (HU-M5-03 CA 1) | `test_service.py:447`, `:513`; `test_router.py:208`, `:225` (60 reservas, 50 y 60), `:244` (101, 0, -1, `abc`); `test_schemas.py:164`, `:171`, `:200` | `repository.py:40-57`; `service.py:139-146`; `schemas.py:54-58` | COMPLIANT |
| 18 | Filtros por fecha y estado (CA 2) | `test_service.py:458`, `:469`, `:481`, `:491`, `:519`; `test_router.py:208`, `:263`, `:282`; `test_schemas.py:180`, `:188` | `repository.py:50-54`; `schemas.py:57-58` (`estado` distingue mayúsculas) | COMPLIANT |
| 19 | Orden del listado (CA 3) | `test_service.py:402`, `:419`, `:437` (el orden se prueba en la capa de `service`; el router no tiene una prueba propia de orden) | `repository.py:55` (`fecha`, `hora`, `id`) | COMPLIANT (el desempate por `id` no es detectable en SQLite; ver S3) |
| 20 | Listado sin filtros y sin resultados (CA 4) | `test_service.py:503`, `:513`, `:519`, `:529`; `test_router.py:274` | `repository.py:50-57`; `service.py:139-146` | COMPLIANT |
| 21 | Formato uniforme de errores (D-25, D-26) | `test_router.py:175`, `:192`, `:445`, `:340`, `:437`; `test_service.py:370` (sin SQL) | `main.py:40-70` (manejadores globales, existentes); `service.py:69-81` | COMPLIANT (ver S1 para los identificadores enormes) |
| 22 | Puente con Mesa y Cliente | `test_puente.py:10-27`; `test_service.py:141`, `:172`, `:271`, `:671` | `puente.py:14-27`; `service.py:8`, `:26`, `:33`, `:117` (siempre `puente.obtener_mesa(...)`) | COMPLIANT |
| 23 | Restricciones de datos | `test_migracion.py:88`, `:110`, `:123`, `:137`; `test_models.py:11`, `:20` | `models.py:12-45`; migración `:36-56` | COMPLIANT |
| 24 | Migración reversible | `test_migracion.py:74`, `:155`, `:173`; `alembic heads` observado | migración `:16-17` (`d6f8a0c2e4b6` sobre `b2d4f6a8c0e1`), `:59-63`; `alembic/env.py:19`; `main.py:14`, `:29` | COMPLIANT |
| 25 | Aislamiento del módulo y sin regresión de M3 | `lint-imports` (observado); `git diff --name-only` (observado); `salon/test_migracion.py:116`, `:258`; suite completa verde | `puente.py` sin imports de `salon` ni `atencion` (búsqueda con `rg`: sin resultados) | COMPLIANT |

### Frontend (requisitos 26 a 31)

| # | Requisito | Pruebas (ruta:línea) | Código (ruta:línea) | Estado |
|---|-----------|----------------------|---------------------|--------|
| 26 | Listado de reservas en pantalla | `pages/ReservasPage.test.tsx:101`, `:112`, `:195`, `:238`, `:272`; `components/ReservasTabla.test.tsx:41`, `:92`, `:104` | `pages/ReservasPage.tsx:83-113` (panel cerrado al entrar); `components/ReservasTabla.tsx:24-61` (columnas y acción solo en `ACTIVA`, `:50`); `pages/useListadoReservas.ts:15-39` | COMPLIANT (el layout «al costado» no se vio en un navegador) |
| 27 | Navegador de fecha y filtro de estado | `components/NavegadorFecha.test.tsx:21-66`; `pages/ReservasPage.test.tsx:101`, `:132`, `:145`, `:156`, `:168`, `:183`, `:195`; `fechas.test.ts:13`, `:20`, `:35`; `api.test.ts:30` | `components/NavegadorFecha.tsx:14-47`; `fechas.ts:9-27`; `pages/useListadoReservas.ts:16-17` (hoy local, `ACTIVA`), `:28-36` (vuelve a la página 1); `components/SelectorEstadoReserva.tsx:16-32`; `api.ts:6-17` (`TODAS` no envía `estado`) | COMPLIANT |
| 28 | Estado y fecha legibles | `components/ReservasTabla.test.tsx:55`; `fechas.test.ts:48` (96 pruebas verdes en UTC-3 y en UTC) | `components/estadosReserva.ts:10-15`; `fechas.ts:33-35` (separa el texto, sin `Date`); `components/ReservasTabla.tsx:36-40` | COMPLIANT |
| 29 | Formulario de alta | `components/ReservaFormulario.test.tsx:81`, `:94`, `:110`, `:119`, `:129`, `:140`, `:150`, `:160`, `:172`, `:193`, `:209`, `:228`; `components/validarReserva.test.ts:21-75`, `:107` | `components/ReservaFormulario.tsx:64-111`; `components/useFormularioReserva.ts:68-97`; `components/validarReserva.ts:75-97` | COMPLIANT |
| 30 | Formulario de edición | `components/ReservaFormulario.test.tsx:239`, `:251`, `:263`, `:275`, `:296`, `:310`, `:329`; `components/validarReserva.test.ts:80-105`; `api.test.ts:44`; `pages/ReservasPage.test.tsx:238`, `:257`, `:272`, `:289` | `components/ReservaFormulario.tsx:67`, `:87`, `:98` (Cliente y Mesa deshabilitados); `components/useFormularioReserva.ts:53-66` (solo tres campos); `pages/ReservasPage.tsx:61-81` (`key` en `:74`); `components/validarReserva.ts:82` | COMPLIANT |
| 31 | Estados vacío y error del listado | `components/ReservasTabla.test.tsx:67`, `:80`; `pages/ReservasPage.test.tsx:312`, `:320` | `components/ReservasTabla.tsx:21`, `:76-83` | COMPLIANT |

**Conteo de la matriz: COMPLIANT 31, PARTIAL 0, UNTESTED 0, FAILING 0.**

### Cobertura por HU (camino feliz y error o límite, RNF-MAN-04)

| HU | Camino feliz | Error o límite |
|----|--------------|----------------|
| HU-M5-01 (crear) | `test_router.py:29`, `test_service.py:59`; `ReservaFormulario.test.tsx:172` | Límites de hora `test_service.py:98`/`:106`; capacidad `:172`/`:185`; 404 `test_router.py:90`; 409 `:57`; 422 `:70`, `:138` |
| HU-M5-02 (modificar) | `test_service.py:586`, `test_router.py:348`; `ReservaFormulario.test.tsx:275` | 409 no activa `test_router.py:394`; 409 turno `:406`; 422 `:379`, `:419`; 404 `:429`; autoconflicto `test_service.py:680` |
| HU-M5-03 (listar) | `test_service.py:447`, `test_router.py:208`; `ReservasPage.test.tsx:101` | 422 de paginación `test_router.py:244`; filtros inválidos `:263`; vacío `:274`; error de carga `ReservasPage.test.tsx:320` |

## 6. Aspectos a los que se pidió atención especial

- **R13 (doble reserva):** defensa en dos capas, comprobada. Consulta previa `repository.existe_reserva_activa` (`repository.py:22-37`) más índice único parcial `ux_reservas_mesa_fecha_hora_activa` con `sqlite_where="estado = 'ACTIVA'"` (`models.py:24-31`, migración `:49-55`). `_confirmar` (`service.py:69-81`) envuelve `agregar` y `commit`, hace `rollback` y lanza 409 con el mismo mensaje. Pruebas: `test_service.py:342`, `:356`, `:370`, `test_migracion.py:123`, `:137`. El mensaje del conflicto se arma antes de escribir (`service.py:75`), porque tras el `rollback` una reserva persistente se recarga con los valores viejos.
- **`PUT` con tres campos y sin extras:** `ReservaModificar` hereda `extra="forbid"` y exige `fecha`, `hora` y `cantidad_personas` (`schemas.py:11-35`). Probado con `mesa_id`, `cliente_id`, `estado` y sin `hora` (`test_router.py:379`).
- **Solo `ACTIVA`, con exclusión de la propia reserva:** `service.py:128` y `:131`; `repository.py:35-36`.
- **Listado:** `FiltroReservas` hereda los límites (50 por defecto, máximo 100); orden `fecha, hora, id` (`repository.py:55`); `total` cuenta con los mismos filtros (`repository.py:57`).
- **Puente stub (S20, S27):** `puente.py`; la modificación no exige que el puente encuentre la mesa (`service.py:115-119`); `test_service.py:671`.
- **Aislamiento:** sin imports de `salon` ni `atencion` en `reservas`; `lint-imports` cumple los 10 contratos.
- **Frontend:** el panel se monta con `key={reserva?.id ?? 'alta'}` (`ReservasPage.tsx:74`); Cliente y Mesa deshabilitados en edición (`ReservaFormulario.tsx:87`, `:98`); «Modificar reserva» solo en filas `ACTIVA` (`ReservasTabla.tsx:50`); día inicial `hoyLocal()` con métodos locales de `Date` (`fechas.ts:9-12`, `useListadoReservas.ts:16`); estado inicial `ACTIVA` (`useListadoReservas.ts:17`). El `Button` compartido trae `type='button'` por defecto (`button.tsx:14`), de modo que «Cancelar» dentro del `<form>` no envía el formulario.

## 7. Coherencia con el diseño

| Decisión | Resultado | Evidencia |
|----------|-----------|-----------|
| 1. `EstadoReserva` y `Reserva` en `reservas/models.py` | Cumple | `models.py:12-45`; `schemas.py:7` importa del propio módulo |
| 2. Puente en `puente.py`, funciones reemplazables | Cumple | `puente.py`; el `service` llama siempre `puente.obtener_mesa(...)` y `puente.existe_cliente(...)` (`service.py:26`, `:33`, `:117`) |
| 3. `ahora()` parcheable, sin `freezegun` | Cumple | `service.py:20-22`; `conftest.py` lo parchea; sin dependencias nuevas |
| 4. Sin horario de atención | Cumple | `test_service.py:134` (04:15); no hay constante ni variable de entorno |
| 5. Índice único parcial `ux_reservas_mesa_fecha_hora_activa` e `IntegrityError` a 409 | Cumple | `models.py:24-31`, migración `:49-55`, `service.py:69-81` |
| 6. Orden de validación | Cumple | `service.py:84-99` (mesa, cliente, momento, capacidad, turno) y `:126-136` (existe, activa, momento, capacidad, turno); `test_service.py:280` y `:783` |
| 7. Hora en minutos | Cumple | `schemas.py:20-26`, `:49-51` |
| 8. `FiltroReservas` con `Query()` y orden fijo | Cumple | `schemas.py:54-58`; `router.py:30` |
| 9. Sin claves foráneas | Cumple | `test_migracion.py:88` verifica `foraneas == []` |
| 10. Una sola página con panel lateral, sin rutas nuevas | Cumple | `ReservasPage.tsx`; `App.tsx` sin cambios |
| 11. Fechas como texto | Cumple | `fechas.ts` completo; probado en UTC-3 y UTC |
| 12. Insignia con `Badge` directo | Cumple | `estadosReserva.ts:10-15`; no se usa `StatusBadge` |
| Migración `d6f8a0c2e4b6`, `down_revision = b2d4f6a8c0e1` | Cumple | migración `:16-17`; `alembic heads` observado |
| `alembic/env.py` sin cambios (ya registra `reservas.models`) | Cumple | `env.py:19`; fuera del `git diff` |

**Desvíos documentados en `apply-progress.md` (32) y su relación con la spec.** Ninguno contradice la spec. Los más relevantes:

- 1 y 21: `_confirmar` envuelve también `repository.agregar` y arma el mensaje antes del `try`. Necesario para que el 409 salga bien en el alta y en la modificación. Compatible con los escenarios de R13.
- 2, 11 y 20: el router usa la anotación de retorno en lugar de `response_model`. Mismo comportamiento que `salon/router.py`.
- 6: campos numéricos como texto con `inputMode="numeric"` en lugar de `type="number"`. Necesario para advertir el texto no numérico, que la spec exige.
- 14 y 27: la columna de acciones llegó en la Fase 7. La spec la pide completa y ya está.
- 15: el error de carga muestra el mensaje fijo de la spec, aunque el título del `ErrorState` compartido sigue siendo «No se pudieron cargar los datos».
- 22: si el puente no encuentra la mesa de la reserva, la modificación no controla la capacidad en lugar de responder 404. Es la lectura de S27.
- 23 y 24: dos pruebas del router se fusionaron en una parametrizada, y una prueba usa solo `CANCELADA_ANTICIPADA`. Los escenarios de la spec siguen cubiertos.
- 28: el botón de acción tiene el mismo `aria-label` en todas las filas (ver S5).
- 17 y 29: refactor más amplio de lo previsto y `PanelDeReserva` con `key`; dentro de `frontend/src/modules/reservas/`.

## 8. Calidad

- **Funciones de hasta 50 líneas y complejidad 10:** `ruff` (`C901`, `PLR0915`) y `eslint` (`max-lines-per-function` 50, `complexity` 10) pasan sin advertencias. Por lectura, la función más larga del backend es `crear_reserva` (16 líneas). Nota: `ruff` limita sentencias (50), no líneas; ESLint sí limita líneas.
- **Sin `any`:** búsqueda en `frontend/src/modules/reservas` (producción y pruebas): sin resultados.
- **Sin `fetch` en componentes:** sin resultados; toda llamada pasa por `api.ts` (`clienteHttp`).
- **Sin secretos:** búsqueda de `password`, `secret`, `token`, `api key` y claves: sin resultados.
- **Sin supresiones:** sin `eslint-disable`, `noqa`, `ts-ignore` ni `type: ignore` en el módulo ni en sus pruebas.
- **Consultas parametrizadas:** todo el acceso a datos usa `select()` de SQLAlchemy. La única aparición de `sa.text` es la cláusula estática `estado = 'ACTIVA'` del índice parcial (DDL, sin entrada del usuario).
- **La API devuelve schemas, nunca models:** `router.py` anota `ReservaSalida` y `Pagina[ReservaSalida]`; el `service` convierte con `model_validate`.
- **Capas:** el `router` solo delega; el `service` no importa FastAPI y usa `shared/excepciones.py`; el `repository` no confirma (`flush` sin `commit`).
- **Sin dependencias nuevas:** `git diff` de `requirements.txt` y `package.json` vacío.
- **Commits:** Conventional Commits en español con el ID de la HU; sin líneas de coautoría ni atribución de IA.

## 9. Seguridad y robustez (breve)

- **Validación de entrada:** enteros estrictos (`StrictInt`, `gt=0`), `extra="forbid"`, hora sin segundos ni zona, estado del filtro sensible a mayúsculas. Los valores numéricos en `fecha` y `hora` (por ejemplo `1788000000` o `3600`) se rechazan con 422.
- **Mensajes de error sin SQL ni rutas internas:** `test_service.py:370` comprueba que el `detalle` del conflicto no contiene `insert`, `unique`, `constraint`, `sqlite`, `reservas`, `ux_` ni `ix_`.
- **`IntegrityError`:** se traduce a 409 con `rollback` y la sesión queda usable (`test_service.py:342`).
- **Hallazgos de robustez:** S1 (identificadores enormes devuelven 500, igual que en M1 y M3) y S2 (fecha con formato de fecha y hora aceptada).

## 10. Hallazgos

### CRITICAL (0)

Ninguno.

### WARNING (5)

- **W1. Humos manuales y integración real sin verificar.** 5.11, 7.8 y 8.4 siguen pendientes. No se vio en un navegador el aspecto de la pantalla (panel `lg:w-96`, ícono de lápiz, alineación de la columna de acciones, botones de día con solo ícono), y no existe una prueba automatizada que una el frontend con el backend real; el contrato HTTP se comprobó por separado (arnés del apply en backend, API simulada en frontend). Riesgo: una diferencia de contrato o de presentación solo aparecería en el humo manual.
- **W2. Tamaño del cambio muy por encima del presupuesto.** Medido: backend 2.285 líneas (439 de producción y 1.846 de pruebas) y frontend 1.822 (740 de producción y 1.082 de pruebas); total ≈ 4.107 contra el pronóstico de 1.850 a 1.950, el punto de control de 800 por lado y la política de revisión de 400 líneas. El PR necesita `size:exception` y la nota de tamaño (P.8) con estas cifras. Ya estaba anticipado en `tasks.md` y `apply-progress.md`; se deja constancia como carga de revisión.
- **W3. La cobertura del frontend no mide `src/modules/**`.** `frontend/vite.config.ts` incluye solo `src/App.tsx` y `src/shared/**`; el 74,75 % no dice nada sobre M5. La calidad de las pruebas de M5 se apoya en las comprobaciones de mutación que informa el apply (no reproducidas aquí). Es una configuración compartida del proyecto, fuera de este cambio.
- **W4. Hora del servidor sin zona (S28, Seg-6).** `ahora()` usa `datetime.now()` local (`service.py:20-22`). Si el servidor se despliega en UTC y el restaurante está en UTC-3, a partir de las 21:00 locales «hoy» ya es el día siguiente para el servidor y las reglas de fecha y hora pasada darían resultados erróneos (el frontend, en cambio, usa la fecha del navegador). Está documentado como supuesto y no contradice la spec; se anota como riesgo operativo para el despliegue.
- **W5. Cierre del cambio pendiente.** Quedan las tareas 8.1 a 8.7 y P.1 a P.8. En particular: `tasks.md` y `apply-progress.md` tienen cambios sin commitear; los criterios de aceptación («HU-M5-0x CA n») salen de la consigna y no se contrastaron con los issues (P.2); los supuestos S1 a S28 no están validados por el equipo (P.4), en especial S1 (`ACTIVA` frente a `PENDIENTE`); falta avisar a M3 del ajuste de 2 líneas (P.3); y `git pull origin develop` no se pudo comprobar contra el remoto (sin red): el `develop` local no avanzó desde el punto de partida de la rama.

### SUGGESTION (7)

- **S1. Identificadores enteros fuera del rango de 64 bits devuelven 500.** Reproducido en una base descartable: `GET` y `PUT /reservas/99999999999999999999`, `POST /reservas` con `mesa_id` o `cantidad_personas` de ese tamaño responden `500 Internal Server Error` (texto plano, no `{"detalle": ...}`). El mismo comportamiento se reprodujo en M1 (`GET /platos/99999999999999999999`) y en M3 (`POST /mesas` con `sector_id` enorme), así que no lo introduce este cambio. Una cota superior (`le=2**63-1`) en los schemas y en los parámetros de ruta, idealmente en `shared/`, lo evitaría.
- **S2. `fecha` acepta `"2026-11-02T00:00:00"`.** Pydantic convierte una cadena de fecha y hora con hora cero en `date`; la spec pide `YYYY-MM-DD`. Impacto bajo; un validador de formato estricto lo cerraría.
- **S3. El desempate por `id` del orden no es detectable por las pruebas.** Quitar `Reserva.id` de `order_by` (`repository.py:55`) no rompe ninguna prueba porque SQLite recorre el índice `ix_reservas_fecha_hora` y devuelve los empates por rowid (mutante equivalente, documentado por el apply). Se podría afirmar sobre el SQL compilado (`ORDER BY reservas.fecha, reservas.hora, reservas.id`) para fijar el requisito en cualquier motor.
- **S4. `_confirmar` traduce todo `IntegrityError` al mensaje de turno ocupado.** Hoy solo el índice parcial puede dispararse (el `CHECK` lo evita el schema), pero una restricción futura quedaría mal rotulada. Es el mismo patrón de `salon.service._guardar_mesa`.
- **S5. Accesibilidad de la acción de la tabla.** Todas las filas `ACTIVA` ofrecen un botón con el mismo nombre accesible «Modificar reserva» (desvío 28). La spec fija ese texto; se podría agregar contexto con `title` o `aria-describedby`.
- **S6. R13 simultáneo solo se prueba con una carrera simulada.** `test_service.py:356` anula la consulta previa y `test_migracion.py:123` prueba el índice en la base; no hay una prueba con dos solicitudes concurrentes reales. Es razonable para SQLite y para una prueba determinista.
- **S7. Mejoras menores de experiencia ya anotadas por el apply.** Un alta de otro día o de otro estado no aparece en la tabla hasta navegar a ella; `useApi` no marca «cargando» al cambiar de día, estado o página (comportamiento del hook compartido); «Nueva reserva» con el alta abierta no limpia lo escrito. Ninguno contradice la spec.

## 11. No verificado y limitaciones

- Humos manuales con navegador (5.11, 7.8, 8.4) y el aspecto visual contra la maqueta `SPRINT-2/S2-04-maqueta/reservas.html`.
- Integración real del frontend con el backend (no hay pruebas E2E en el proyecto para este cambio).
- Rojo histórico de Strict TDD y comprobaciones de mutación: se tomaron del informe del apply; no se reprodujeron.
- Prueba intermitente de la línea base de `develop` (`1 failed | 430 passed`): **no apareció** en esta verificación (una corrida completa con cobertura y dos corridas del módulo, todas sin fallos). Sigue sin identificarse; si reaparece en la CI conviene guardar la salida completa.
- Estado de `origin/develop`: sin red, no se consultó. Solo se comprobó el `develop` local (`0bff1e0`, igual al punto de partida de la rama).
- Los issues de GitHub no se leyeron (los criterios de aceptación de la spec no se contrastaron con ellos).
- Rendimiento y carga: fuera del alcance de esta verificación.

## 12. Pendientes de la persona

1. Humo manual de 5.11 y 7.8 con el backend real y `npm run dev` (comandos en `FLUJO_DIARIO.md`): crear una reserva, verla en la tabla, pulsar el lápiz, cambiar la cantidad y ver el cambio. Mirar el alineado de la columna de acciones y el layout de dos columnas.
2. Humo de punta a punta de 8.4 (alta, 409 visible en el panel, filtros `ACTIVA` y «Todas», modificación, «Día siguiente» y «Hoy») y anotar las diferencias con la maqueta.
3. «Antes del PR»: P.1 (`Closes #n` por HU), P.2 (criterios contra los issues), P.3 (avisar a Giuliano Giannoncelli por las 2 líneas de M3), P.4 (validar S1 a S28), P.5 (`git pull origin develop` y revisar `alembic heads`), P.6 (diferencias con la maqueta en el PR), P.7 (CI local en verde, ya reproducida aquí) y P.8 (nota de tamaño con `size:exception` y las cifras de W2).
4. Cierre del orquestador: 8.1 a 8.3, 8.5 y 8.6 (las cifras de esta verificación sirven de insumo) y el commit 10 con `tasks.md`, `apply-progress.md` y este informe (8.7).

## 13. Próximo paso recomendado

`sdd-archive` cuando la persona termine los humos manuales y las tareas de «Antes del PR». No hay trabajo de código pendiente que devuelva el cambio a `sdd-apply`. Este diagnóstico no bloquea el archivo.
