# Informe de verificación: HU-M5-01-02-03 Crear, modificar y listar reservas

## Verificación de la Fase 10 · Mesas disponibles

- **Fecha:** 2026-11-01. **HEAD verificado:** `8d5d374`, 24 commits sobre el `origin/develop` local (`dfd151f`). El delta son los commits `a1ad33f` (Unidad A), `9f691ff` (Unidad B) y `8d5d374` (Unidad C), medidos desde `5c01d0e`.
- **Modo:** Strict TDD. **Almacén de artefactos:** OpenSpec. **Rol:** verificación independiente de solo lectura; este archivo es lo único que se escribió.
- **Estado del árbol:** limpio al empezar. A las 16:03 del mismo día el orquestador dejó sin commitear dos ediciones de cierre (`tasks.md`: marcas 10.35 a 10.38 y 10.41; `apply-progress.md`: sección de cierre del delta). No las hizo el verificador y no tocan el código verificado.
- **Alcance de la lectura:** la spec (33 requisitos, 170 escenarios, S1 a S35), `design.md` (Decisiones 13 a 20), `tasks.md` (Fase 10), `apply-progress.md` (Unidades A, B y C), el código de producción y las pruebas del delta en backend y frontend, y el informe anterior.

### 1. Veredicto

**PASS WITH WARNINGS.** CRITICAL 0, WARNING 7, SUGGESTION 8.

- **Requisitos nuevos o reescritos por el delta (8):** 6 COMPLIANT, 2 PARTIAL, 0 UNTESTED, 0 FAILING.
- **Escenarios de esos 8 requisitos (73):** 71 COMPLIANT, 2 PARTIAL, 0 UNTESTED, 0 FAILING. Los dos PARTIAL son «Cancelar o cerrar el alta» y «Cancelar la edición»: falta una prueba a nivel de página (S3). Riesgo bajo.
- **Requisitos sin cambios (25, con 97 escenarios):** la evidencia del informe anterior sigue en pie y las suites completas pasan. Se volvieron a leer las pruebas de 11 de ellos (sección 4).
- **Total de la spec:** 33 requisitos (31 COMPLIANT, 2 PARTIAL) y 170 escenarios (168 COMPLIANT, 2 PARTIAL, 0 UNTESTED, 0 FAILING).
- **Ejecución:** todos los comandos terminaron con salida 0 (sección 2). Backend 1.249 pruebas, cobertura 99,46 %; frontend 739 pruebas en 65 archivos; las 151 pruebas del módulo pasan en UTC-3 y en UTC.
- **No verificado:** el humo en navegador (tarea 10.40) y la integración real frontend + backend (sección 9).
- Los puntos conocidos (a) a (g) del encargo están declarados como hallazgos: (a) W3, (b) W2, (c) W1, (d) S1, (e) S2, (f) W4, (g) W5.

### 2. Comandos ejecutados (observados, de a uno)

Backend, en Docker con la imagen `g3-backend-test`, sin red, con `backend/` montado en `/app`:

| Comando | Resultado observado |
|---------|---------------------|
| `docker run --rm --network none --user "$(id -u):$(id -g)" -e HOME=/tmp -v …/backend:/app -w /app g3-backend-test sh -c 'ruff check . && ruff format --check . && lint-imports && alembic heads && pytest -q -p no:cacheprovider'` | Salida 0. `ruff check`: «All checks passed!». `ruff format --check`: «108 files already formatted». `lint-imports`: «Contracts: 10 kept, 0 broken.» (75 archivos, 195 dependencias). `alembic heads`: `d6f8a0c2e4b6 (head)`, un solo head. `pytest`: **1249 passed, 1 warning in 196,20 s**; cobertura total **99,46 %** (umbral 70 %) |
| Misma corrida, primera ejecución (terminó antes del corte de la sesión y se repitió desde cero) | Salida 0, **1249 passed in 155,10 s**, cobertura 99,46 %. Mismo resultado |
| Cobertura de los archivos del delta (misma corrida) | `puente.py` 45 sentencias, `repository.py` 27, `router.py` 24, `schemas.py` 47, `service.py` 76 y `models.py` 20: todos al 100 %. Las 10 sentencias sin cubrir están fuera del cambio: `database.py` 55-56, `menus/service.py` 200-203, `productos/service.py` 363 y `salon/service.py` 132-134 |
| Advertencia de `pytest` | Una, de terceros: `StarletteDeprecationWarning` por `httpx` en `fastapi/testclient.py` |
| `pytest -q --no-cov -p no:cacheprovider tests/modules/salon/test_migracion.py` (Docker) | Salida 0, **13 passed** |
| `pytest -q --no-cov -p no:cacheprovider tests/modules/reservas` (Docker) | Salida 0, **256 passed**, 1 advertencia |
| `pytest --collect-only -q … tests/modules/reservas` (Docker) | 256 recogidas: `test_service` 92, `test_router` 71, `test_schemas` 70, `test_puente` 14, `test_migracion` 7, `test_models` 2 |

Frontend, desde `frontend/`, con el `node_modules` existente:

| Comando | Resultado observado |
|---------|---------------------|
| `npm run lint` (`eslint . --max-warnings=0`) | Salida 0, sin hallazgos |
| `npm run format:check` | Salida 0: «All matched files use Prettier code style!» |
| `npm run typecheck` (`tsc --noEmit`) | Salida 0, sin errores |
| `npm run test:coverage` | Salida 0. `Test Files 65 passed (65)`, `Tests 739 passed (739)`. Sentencias 75,09 % (386/514), ramas 71,73 % (231/322), funciones 71,71 %, líneas 76,82 % (368/479); umbral 60 % |
| `npm run build` | Salida 0, `✓ built in 663ms` |
| `TZ=America/Argentina/Buenos_Aires npx vitest run src/modules/reservas --coverage.enabled=false` | Salida 0, `Test Files 9 passed (9)`, `Tests 151 passed (151)`. Con esa `TZ`, `getTimezoneOffset()` da 180 |
| `TZ=UTC npx vitest run src/modules/reservas --coverage.enabled=false` | Salida 0, `Test Files 9 passed (9)`, `Tests 151 passed (151)`. Con esa `TZ`, `getTimezoneOffset()` da 0 |

Git y búsquedas (solo lectura):

| Comando | Resultado observado |
|---------|---------------------|
| `git diff --name-only origin/develop...HEAD` filtrando `reservas/` y la carpeta del cambio | Solo `backend/alembic/versions/d6f8a0c2e4b6_crea_reservas.py` y `backend/app/main.py`. El diff con dos puntos da lo mismo |
| `git diff --shortstat origin/develop...HEAD` en `backend` y en `frontend` | Backend: 16 archivos, 3.194 inserciones y 2 eliminaciones (3.196). Frontend: 24 archivos, 2.653 inserciones y 26 eliminaciones (2.679) |
| `git diff --shortstat 5c01d0e..HEAD` en `backend` y en `frontend` (solo el delta) | Backend: 10 archivos, 1.044 y 50 (**1.094**). Frontend: 13 archivos, 918 y 61 (**979**) |
| `git diff --name-only 5c01d0e..HEAD` fuera de `reservas/` y la carpeta del cambio | Vacío |
| Búsqueda de «co-authored», «claude», «anthropic», «generated with» en `git log origin/develop..HEAD` | Sin coincidencias |
| `git status --short` al terminar | Solo las dos ediciones del orquestador (`tasks.md` y `apply-progress.md`) |

### 3. Matriz de cumplimiento del delta (8 requisitos, 73 escenarios)

Abreviaturas de las pruebas, con `archivo:línea` de la definición. Backend, en `backend/tests/modules/reservas/`: `svc` = `test_service.py`, `rtr` = `test_router.py`, `pte` = `test_puente.py`, `sch` = `test_schemas.py`. Frontend, en `frontend/src/modules/reservas/`: `Form` = `components/ReservaFormulario.test.tsx`, `Sel` = `components/SelectorMesa.test.tsx`, `Hook` = `components/useMesasDisponibles.test.ts`, `Val` = `components/validarReserva.test.ts`, `Page` = `pages/ReservasPage.test.tsx`, `Api` = `api.test.ts`. Todas las pruebas citadas pasan en las corridas de la sección 2.

**3.1 Mesas disponibles para una fecha y hora (issue #61): 20 escenarios, 20 COMPLIANT**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | Una mesa libre figura en la lista | `svc:849`; `rtr:549` (lista JSON, forma exacta, sin `estado`, `total`, `limit` ni `offset`); `sch:312` | COMPLIANT |
| 2 | Una mesa fuera de servicio no figura | `svc:864`; `rtr:671` (puente real) | COMPLIANT |
| 3 | Una mesa con reserva activa en ese turno no figura | `svc:872`; `rtr:562` | COMPLIANT |
| 4 | Reservada a otra hora o en otra fecha figura | `svc:881` | COMPLIANT |
| 5 | Una reserva no activa no oculta la mesa | `svc:898` (`ATENDIDA`, `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA`) | COMPLIANT |
| 6 | Una mesa ocupada ahora figura para otro turno | `svc:907` | COMPLIANT |
| 7 | Falta la fecha | `rtr:583` [sin-fecha]; `sch:279` | COMPLIANT |
| 8 | Falta la hora | `rtr:583` [sin-hora]; `sch:279` | COMPLIANT |
| 9 | Formato de fecha inválido | `rtr:603` (`02/11/2026`, `2026-13-40`); `sch:305` | COMPLIANT |
| 10 | Formato de hora inválido | `rtr:603` (`25:00`, `9pm`, `21:30:45`); `sch:290`, `sch:305` | COMPLIANT |
| 11 | Fecha anterior a hoy | `rtr:632` (cuerpo exacto `{"detalle": …}`); `svc:1002` | COMPLIANT |
| 12 | Hoy con una hora igual o anterior a la actual | `rtr:632` (12:00 y 11:00); `svc:1010` | COMPLIANT |
| 13 | Turnos válidos que se parecen a los rechazados | `svc:1025` (hoy 12:01 y mañana 11:00). El router no repite esos dos turnos; el 200 por HTTP lo prueba `rtr:549` | COMPLIANT |
| 14 | Todas las mesas están reservadas | `svc:913`; `rtr:642` (200 con `[]`) | COMPLIANT |
| 15 | Ninguna mesa puede reservarse | `svc:937` (todas fuera de servicio y puente sin mesas); `rtr:642` | COMPLIANT |
| 16 | Orden por sector, número e id | `svc:946` (ids de sector invertidos para que ordenar por `sector.id` falle); `svc:956` (desempate por `id`) | COMPLIANT |
| 17 | El mismo número en sectores distintos | `svc:965`; `Sel:46` | COMPLIANT |
| 18 | La ruta no se confunde con la consulta por id | `rtr:562` (200 con la lista, `GET /abc` 422, `GET /{id}` 200). Mutación T1 del apply: 16 pruebas rojas | COMPLIANT |
| 19 | Reservar una mesa la saca de la lista | `svc:980`; `rtr:652` (120 pasan a 119) | COMPLIANT |
| 20 | La consulta no modifica datos | `svc:988` (`db.new` y `db.dirty` vacíos, reservas iguales) | COMPLIANT |

**3.2 El alta rechaza una mesa fuera de servicio: 6 escenarios, 6 COMPLIANT**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | Mesa fuera de servicio | `svc:174`; `rtr:103` (409 con el cuerpo exacto, nada creado) | COMPLIANT |
| 2 | Mesa inexistente sigue siendo 404 | `svc:143`, `svc:166`; `rtr:92`, `rtr:165` | COMPLIANT |
| 3 | Mesa ocupada ahora, reservada para otro turno | `svc:185`; `rtr:130` | COMPLIANT |
| 4 | Se rechaza antes que el cliente y que la fecha | `svc:195`; `svc:306` (orden completo de validación) | COMPLIANT |
| 5 | Mesa fuera de servicio con datos de forma inválidos | `rtr:116` (422 que nombra `fecha`) | COMPLIANT |
| 6 | Modificar una reserva cuya mesa pasó a fuera de servicio | `svc:696`; `svc:682` (las tres operaciones del puente fallan si se las llama) | COMPLIANT |

**3.3 Mesa y cliente existentes: 5 escenarios, 5 COMPLIANT**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | Mesa inexistente | `svc:143`; `rtr:92` | COMPLIANT |
| 2 | Cliente inexistente | `svc:150`; `rtr:142` | COMPLIANT |
| 3 | Mesa y cliente inexistentes a la vez | `svc:158` | COMPLIANT |
| 4 | Una mesa que M3 no conoce no se acepta | `svc:166` (mesa 123) | COMPLIANT |
| 5 | El stub de cliente acepta cualquier id positivo | `svc:207` (cliente 456); `pte:134` | COMPLIANT |

**3.4 La cantidad no se valida contra la capacidad de la mesa: 2 escenarios, 2 COMPLIANT**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | Cantidad muy grande en el alta | `svc:216`; `rtr:227` (100 personas en una mesa de capacidad 4: 201 y guardada); `svc:670` en la modificación | COMPLIANT |
| 2 | Cantidad cero sigue rechazada | `sch:69`; `rtr:205` [cantidad-cero] | COMPLIANT |

**3.5 Puente con Mesa y Cliente: 9 escenarios, 9 COMPLIANT**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | El stub de cliente acepta identificadores positivos | `pte:134` (7 y 456), `pte:139` (0 y -1) | COMPLIANT |
| 2 | El puente real encuentra una mesa de M3 | `rtr:153`; `pte:29` | COMPLIANT |
| 3 | El puente real no encuentra una mesa que M3 no tiene | `rtr:165`; `pte:45` | COMPLIANT |
| 4 | El puente real conserva el estado de la mesa | `rtr:671`; `pte:51`, `pte:64` | COMPLIANT |
| 5 | El puente real lee todas las páginas de M3 | `rtr:652` (120 mesas; el alta sobre la 120 responde 201); `pte:20`, `pte:29` | COMPLIANT |
| 6 | M3 falla mientras el puente lee sus páginas | `rtr:689` (500 en `GET` y en `POST`, el cuerpo no es una lista, tabla vacía); `pte:77`, `pte:86` (la excepción sube); `pte:97` (corte por página vacía) | COMPLIANT |
| 7 | Puente de reemplazo sin la mesa | `svc:306` («La mesa 5 no existe»); `rtr:253` | COMPLIANT |
| 8 | Un doble con tres operaciones alcanza | `pte:121`; `conftest.py:42-89` (`DoblePuente` autouse, usado por toda la suite de `reservas`) | COMPLIANT |
| 9 | El conflicto de mesa no depende del puente | `svc:295`; `rtr:59` | COMPLIANT |

**3.6 Aislamiento del módulo y sin regresión de M3: 3 escenarios, 3 COMPLIANT**

| # | Escenario | Evidencia | Estado |
|---|-----------|-----------|--------|
| 1 | Contratos de importación | `lint-imports`: 10 kept, 0 broken (observado). `pte:165` recorre el AST: ningún archivo importa `atencion` y de `salon` solo `puente.py` y solo `app.modules.salon.service` | COMPLIANT |
| 2 | Pruebas de migración de M3 | `tests/modules/salon/test_migracion.py`: 13 passed (observado) | COMPLIANT |
| 3 | Sin cambios en módulos ajenos | `git diff` contra `origin/develop`: solo `reservas/`, la carpeta del cambio, la migración y `main.py` (observado) | COMPLIANT |

**3.7 Formulario de alta (HU-M5-01): 21 escenarios, 20 COMPLIANT y 1 PARTIAL**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | Campos vacíos | `Form:138` (5 avisos de obligatorio, también Mesa; no llama a la API) | COMPLIANT |
| 2 | Cantidad inválida | `Form:148` (`0` y `abc`); `Val:44` | COMPLIANT |
| 3 | Cliente inválido | `Form:161` | COMPLIANT |
| 4 | Mesa sin elegir | `Form:171`; `Val:62` | COMPLIANT |
| 5 | Fecha anterior a hoy | `Form:184`; `Val:95` | COMPLIANT |
| 6 | Hoy con una hora pasada o igual a la actual | `Form:194` (11:30 y 12:00); `Val:103` | COMPLIANT |
| 7 | Hoy con una hora posterior | `Form:204` (12:01 envía) | COMPLIANT |
| 8 | El selector se llena con las mesas disponibles | `Form:234`; `Sel:35`; `Api:64` (`GET /reservas/mesas-disponibles`; `21:30` viaja como `21%3A30` y el servidor lo decodifica) | COMPLIANT |
| 9 | El mismo número en sectores distintos se distingue | `Sel:46`; `Form:369` (las mesas 5 y 12 envían su `id`, no su número) | COMPLIANT |
| 10 | El selector espera una fecha y una hora válidas | `Form:216` (4 casos, sin llamar a la API); `Hook:59`, `Hook:67` | COMPLIANT |
| 11 | Estado de carga de la lista | `Form:260` («Cargando mesas…», selector deshabilitado, «Guardar reserva» habilitado y marca «La mesa es obligatoria.»); `Sel:94`; `Hook:81` | COMPLIANT |
| 12 | Sin mesas disponibles | `Form:245` (aviso; selector y «Guardar reserva» deshabilitados); `Sel:101` | COMPLIANT |
| 13 | Cambiar la fecha o la hora recarga y borra la mesa que ya no está | `Form:314` [borra]; `Form:276` (no envía la mesa anterior mientras carga la lista nueva); `Form:329`; `Hook:137` | COMPLIANT |
| 14 | Cambiar la fecha o la hora conserva la mesa disponible | `Form:314` [conserva] | COMPLIANT |
| 15 | Una respuesta vieja no pisa a la nueva | `Hook:153` (promesas controladas, la vieja llega última), `Hook:168`; mutaciones H1 y H2 del apply | COMPLIANT |
| 16 | Falla la consulta de la lista | `Form:291`; `Sel:108`; `Hook:101` | COMPLIANT |
| 17 | Alta correcta | `Form:348`, `Form:369`; `Page:219` (página, panel, hook y API simulada: `POST` con `mesa_id` 5, panel cerrado, tabla pedida de nuevo) | COMPLIANT |
| 18 | Conflicto de mesa | `Form:399` (409 de turno ocupado) | COMPLIANT |
| 19 | Mesa inexistente o fecha rechazada por la API | `Form:399` (404 y 422) | COMPLIANT |
| 20 | Mesa fuera de servicio rechazada por la API | `Form:417` (409 «La mesa 6 está fuera de servicio», conserva la mesa elegida) | COMPLIANT |
| 21 | Cancelar o cerrar el alta | `Form:122`: «Cancelar» y «Cerrar formulario» llaman a `onCerrar` y no envían nada. Ninguna prueba de página los pulsa para comprobar que el panel desaparece y que la ruta sigue siendo `/reservas`; esa conexión (`ReservasPage.tsx:110`) solo se comprobó por lectura | **PARTIAL** |

**3.8 Formulario de edición (HU-M5-02): 7 escenarios, 6 COMPLIANT y 1 PARTIAL**

| # | Escenario | Pruebas | Estado |
|---|-----------|---------|--------|
| 1 | Panel con los datos actuales | `Form:444`, `Form:455`, `Form:477` (Mesa de solo lectura con el `mesa_id`); `Form:467` y `Page:256` (no se pide la lista ni nada más) | COMPLIANT |
| 2 | Modificación correcta | `Form:501` (exactamente `fecha`, `hora` y `cantidad_personas`); `Page:313` | COMPLIANT |
| 3 | Misma validación local que el alta | `Form:521` (fecha anterior y cantidad 0) | COMPLIANT |
| 4 | Conflicto al modificar | `Form:536` (409 de turno) | COMPLIANT |
| 5 | La reserva dejó de estar activa | `Form:536` (409 «no está activa») | COMPLIANT |
| 6 | La reserva ya no existe | `Form:536` (404) | COMPLIANT |
| 7 | Cancelar la edición | `Form:488`: ambos botones llaman a `onCerrar` y no se envía el `PUT`. Misma salvedad que en 3.7 #21 | **PARTIAL** |

**Resumen de la sección 3:** 73 escenarios: 71 COMPLIANT, 2 PARTIAL, 0 UNTESTED, 0 FAILING. Por requisito: 6 COMPLIANT («Mesas disponibles…», «El alta rechaza una mesa fuera de servicio», «Mesa y cliente existentes», «La cantidad… capacidad», «Puente con Mesa y Cliente», «Aislamiento del módulo») y 2 PARTIAL («Formulario de alta», «Formulario de edición»).

**Criterios del issue #61 (RNF-MAN-04, camino feliz y error o límite):**

| Criterio | Camino feliz | Error o límite |
|----------|--------------|----------------|
| Elegir la mesa de la lista de disponibles | `svc:849`, `rtr:549`, `Form:234`, `Page:219` | `svc:1002`, `svc:1010` (turno pasado), `rtr:603` (formato), `Form:245` (lista vacía), `Form:291` (consulta fallida) |
| La mesa fuera de servicio no figura | `svc:864`, `rtr:671` | `svc:937` (todas fuera de servicio: lista vacía) |
| El alta rechaza la mesa fuera de servicio | `svc:185` y `rtr:130` (la ocupada sí se acepta) | `svc:174`, `rtr:103` (409), `Form:417` (409 visible en el panel) |
| Cliente no registrado | No cubierto (depende de M4, W1) | No cubierto |

### 4. Requisitos sin cambios (25)

No cambiaron ni su texto ni su código. La evidencia del informe anterior (31 de 31 antes del delta) sigue vigente, y las suites completas pasan: backend 1.249, frontend 739. Se volvieron a leer o a ejecutar las pruebas de 11 requisitos (en 7 filas), con los números de línea actuales:

| Requisito | Pruebas revisadas | Resultado |
|-----------|-------------------|-----------|
| Mesa sin otra reserva activa (R13) | `svc:225` (409 con el mensaje exacto y la reserva original intacta), `svc:247` (3 estados no activos permiten el alta), `svc:258` (otra mesa); `test_migracion.py:123`, `:137` (índice único parcial) | Pasan |
| Modificar fecha, hora y cantidad | `svc:609`, `svc:618`, `svc:627` | Pasan |
| Mesa, cliente y estado no cambian | `svc:637`; `sch:242` (campos extra prohibidos) | Pasan |
| Formato uniforme de errores | `rtr:236` (409 y 422 con solo la clave `detalle`), `rtr:253` (404) | Pasan |
| Restricciones de datos y Migración reversible | `test_migracion.py:88`, `:110`, `:123`, `:137`, `:155`, `:173`; `alembic heads` | 7 pruebas de migración pasan; un solo head `d6f8a0c2e4b6` (`down_revision` `e7a9c1d3f5b7`) |
| Listado paginado y Filtros por fecha y estado | `rtr:269`, `rtr:286`, `rtr:305` | Pasan |
| Listado en pantalla, Navegador de fecha y Estados vacío y error | `Page:111`, `:121`, `:141`, `:154`, `:165`, `:204`, `:336`, `:344`; `ReservasTabla.test.tsx:48-50` | Pasan: 151 pruebas del módulo en UTC-3 y en UTC |

### 5. Coherencia con el diseño (Decisiones 13 a 20)

| Decisión | Resultado | Evidencia |
|----------|-----------|-----------|
| 13. Ruta `GET /reservas/mesas-disponibles` como lista simple, antes de `/{reserva_id}` | Cumple | `router.py:37-42` va entre `GET /reservas` (`:30`) y `GET /reservas/{reserva_id}` (`:45`), con un comentario que explica el orden. `ConsultaMesasDisponibles` con `Query()` y `_hora_en_minutos` compartida (`schemas.py:10-17`). Devuelve `list[MesaDisponible]` sin `estado`. `rtr:562` y la mutación T1 del apply (16 pruebas rojas) fijan el orden |
| 14. El puente lee todas las páginas de M3 y no traga errores | Cumple | `puente.py:66-80`: ciclo con `offset += len(items)`, corte por `offset >= total` o por página vacía, **sin `try`**. Importa solo `from app.modules.salon import service` (`:18`) y llama `salon_service.listar_mesas` a través del módulo. `listar_mesas` y `obtener_mesa` salen de `_leer_todas`. Un fallo de M3 produce el 500 de texto plano que el diseño documenta (`rtr:689`) |
| 15. Disponibilidad en el `service` con el índice `ix_reservas_fecha_hora` | Cumple | `repository.py:40-51`: una consulta parametrizada por `fecha`, `hora` y `estado == ACTIVA`. El índice está en `models.py:33` y en la migración. `service.py:138-153`: `_validar_momento` antes de leer M3 (`svc:1032`), filtro de `FUERA_DE_SERVICIO` y de ocupadas, orden en Python por `(sector.nombre, numero, id)`, solo lectura. No hay migración nueva |
| 16. 409 para la mesa fuera de servicio | Cumple | `service.py:27-36`: una sola lectura, 404 si no existe y 409 si está `FUERA_DE_SERVICIO`; `OCUPADA` se acepta. `main.py:49-51` ya mapea `ReglaDeNegocioError` a 409. La modificación no consulta al puente (`service.py:116-125`, `svc:682`) |
| 17. Doble autouse y semilla de M3 solo en pruebas | Cumple | `conftest.py:83-89` (autouse), `puente_real` (`:127`), `mesas_en_m3` (`:135`), `m3_falla_desde_la_segunda_pagina` (`:154`). Los modelos de `salon` se importan solo en `tests/` (`conftest.py:21`). `pte:165` cubre «solo el puente importa `salon`», que `lint-imports` no puede expresar |
| 18. Hook que descarta las respuestas viejas | Cumple | `useMesasDisponibles.ts:37-56`: clave `fecha hora` o `null`, bandera `vigente` que limpia el efecto, estado derivado en el render, sin `setState` sincrónico ni `AbortController`. `Hook:137`, `:153`, `:168` y las mutaciones H1 y H2 |
| 19. Selector sobre `Select` y `FormField`; la edición no lo usa | Cumple, con dos desvíos ya documentados | `SelectorMesa.tsx:1-2` importa de `shared/components/ui`, sin estilos nuevos. La edición muestra el campo de solo lectura y no pide la lista (`ReservaFormulario.tsx:54-59`, `Form:467`). Desvíos: `guardarDeshabilitado` no repite `modo === 'alta'` (redundante) y el error del campo lo resuelve `SelectorMesa` (apply-progress, desvíos 2 y 3) |
| 20. Reloj del servidor frente al del navegador | Riesgo documentado, **sin cambio de código** (confirmado) | `service.py:22-24` sigue usando `datetime.now()` (`svc:51` lo fija). `compose.yaml` y `backend/Dockerfile` no definen `TZ` (búsqueda con `rg`). Figura en `design.md` («Riesgos del delta» y «Preguntas abiertas») y en P.6. El efecto visible lo cubre `Form:291` |

### 6. Aislamiento (AGENTS.md secciones 9.3 y 9.4)

| Comprobación | Resultado |
|--------------|-----------|
| Archivos tocados contra `origin/develop` (`dfd151f`) | Solo `reservas/` (backend y frontend), `openspec/changes/HU-M5-01-02-03/`, la migración `d6f8a0c2e4b6` y `backend/app/main.py` (el registro del `router`) |
| `salon/`, `atencion/`, `shared/`, `App.tsx`, `pyproject.toml`, `alembic/env.py`, `compose.yaml`, CI, dependencias | Sin cambios (no aparecen en el diff) |
| Importaciones de `salon` desde `reservas` | Una sola: `puente.py:18`, `app.modules.salon.service` |
| Importaciones de `atencion` desde `reservas` | Ninguna |
| Frontend: importaciones de otro módulo | Ninguna. Lo único que sale del módulo es `../../../shared` (29 importaciones) |
| `any`, `fetch(`, `eslint-disable`, `ts-ignore`, `noqa`, `type: ignore` en el módulo y sus pruebas | Ninguno (la única coincidencia es el `any()` nativo de Python en `pte:173`) |
| Atribución de IA en los commits de la rama | Ninguna |

Límite: `origin/develop` es la referencia local, sin `git fetch` (sin red y sin modificar git). Si `develop` avanzó en el remoto, hay que repetir esta comprobación y `alembic heads` antes del PR (P.5).

### 7. Strict TDD y calidad

| Comprobación | Resultado | Detalle |
|--------------|-----------|---------|
| Evidencia de TDD reportada | OK | `apply-progress.md` trae «TDD Cycle Evidence» en las Unidades A, B y C |
| Todas las tareas de código tienen pruebas | OK | Los archivos de prueba citados en la sección 3 existen |
| Rojo confirmado | OK, no reproducible | El historial no puede mostrarlo: cada commit junta prueba y código. El apply informa fallos concretos y pruebas de guarda por tarea |
| Verde confirmado | OK | 256 de 256 en el módulo backend, 151 de 151 en el módulo frontend y las suites completas |
| Triangulación | OK | Pruebas parametrizadas (`svc:898`, `svc:937`, `svc:1010`, `rtr:603`, `Form:216`, `Form:314`) y límites 12:00 y 12:01 |
| Red de seguridad | OK | Unidad A: 191 pruebas del módulo al empezar y 202 al terminar; unidad B: 202 y 256; unidad C: 96 y 151 |
| Mutaciones | Informadas, no reproducidas | Apply: 5 en la Unidad A (todas detectadas), 18 en la B (todas detectadas) y 28 en la C (26 detectadas, 1 corregida con una prueba nueva, 1 equivalente: P3). El orquestador informa que una importación de `salon` en `service.py` rompe `pte:165`. El verificador no puede editar código, así que no las repitió |

**Distribución por capa.** Backend (256): esquemas sin base (`test_schemas` 70); integración con SQLite (`test_service` 92, `test_puente` 14, `test_migracion` 7, `test_models` 2); integración HTTP con `TestClient` (`test_router` 71). Frontend (151 casos): funciones puras (`api`, `fechas`, `validarReserva`), hook con `renderHook` (`useMesasDisponibles`) y componentes o página con Testing Library y la API simulada (`ReservaFormulario`, `SelectorMesa`, `NavegadorFecha`, `ReservasTabla`, `ReservasPage`). No hay pruebas E2E en el proyecto.

**Calidad de las aserciones.** 0 CRITICAL y 0 WARNING. Sin tautologías ni aserciones de solo tipo. Todos los bucles con aserciones recorren colecciones fijas y no vacías (`pte:169` se protege con una aserción previa). Cada aserción de lista vacía tiene una prueba compañera con la misma preparación y resultado no vacío (`svc:913` con `svc:849`, `rtr:642` con `rtr:549`, `Form:229` con `Form:241`). Los conteos de llamadas a la API simulada solo comprueban conductas de la spec («no se pidió la lista», «no se envió»).

**Cobertura de los archivos cambiados.** Backend: los seis archivos de producción del módulo al 100 % de sentencias. Frontend: no medida, porque `vite.config.ts` solo incluye `src/App.tsx` y `src/shared/**` (W6).

**Calidad estática.** `ruff`, `ruff format`, `eslint --max-warnings=0` y `tsc` sin hallazgos; las reglas de 50 líneas y complejidad 10 están activas en ambos lados.

### 8. Hallazgos

#### CRITICAL (0)

Ninguno.

#### WARNING (7)

- **W1. El criterio «cliente no registrado» del issue #61 no está cubierto.** El lado Cliente del puente sigue siendo un stub (`puente.py:93-95`, todo id positivo existe) hasta que M4 exponga `crear_cliente` y `obtener_cliente`; el panel pide el cliente por número. La spec lo declara fuera de alcance. Consecuencia para el PR: decidir con el equipo entre `Closes #61` y `Refs #61` (tarea P.1). Conocido (c).
- **W2. El reloj del servidor corre en UTC en Docker (Decisión 20).** `ahora()` usa `datetime.now()` y no hay `TZ` en `compose.yaml` ni en `backend/Dockerfile`. Con el restaurante en UTC-3, la regla de «hora posterior a la actual» para las reservas de hoy se desplaza tres horas durante todo el día, y entre las 21:00 y las 24:00 locales el servidor ya está en el día siguiente. El selector muestra el 422 junto a Mesa (`Form:291`), pero el problema es de despliegue. La persona decide entre fijar la zona en `ahora()` y definir `TZ` en `compose.yaml` (archivo compartido). Si se elige la zona fija en `ahora()`, hay que adaptar `svc:51`, que hoy exige un `datetime` sin zona. Conocido (b).
- **W3. La tabla de reservas sigue mostrando «Mesa n.º {id interno}» (S23).** `ReservasTabla.tsx:32` muestra `mesa_id`, mientras el selector del alta muestra «Sector · Mesa N». Una persona que elige «Salón · Mesa 1» puede ver «Mesa n.º 14» en la tabla. Aprobado para un cambio posterior; debe quedar anotado en el PR (P.6). Conocido (a).
- **W4. Humo manual pendiente y sin integración real.** Siguen pendientes 10.40, 5.11, 7.8 y 8.4. No se vio en un navegador el selector (deshabilitado hasta tener turno válido, textos, comportamiento del `<select>`), ni existe una prueba que una el frontend con el backend real; el contrato HTTP se probó por separado (`TestClient` y API simulada). Conocido (f).
- **W5. Tamaño muy por encima del pronóstico.** Delta medido: backend **1.094** líneas (pronóstico 500 a 780) y frontend **979** (pronóstico 390 a 630). Acumulado contra `develop`: backend 3.196 y frontend 2.679, contra el punto de control de 800 por lado y la política de 400 líneas. El PR necesita `size:exception` y la nota P.8 con estas cifras. Informativo. Conocido (g).
- **W6. La cobertura del frontend no mide `src/modules/**`.** `vite.config.ts:13` incluye solo `src/App.tsx` y `src/shared/**`; el 75,09 % no dice nada sobre M5. La calidad de las pruebas del módulo se apoya en las mutaciones que informa el apply. Es una configuración compartida, fuera de este cambio.
- **W7. Cierre del cambio pendiente.** Sin marcar: 10.8, 10.20 y 10.34 (los commits existen), 10.39 (este informe), 10.40, 10.42, 5.11, 7.8, 8.4 y las tareas P.1, P.2, P.4, P.6, P.7 y P.8 (15 casillas con las ediciones sin commitear del orquestador; 20 en `HEAD`). Los criterios de aceptación de la spec no se contrastaron con los issues, salvo el texto del issue #61 que cita la spec (P.2). Los supuestos S1 a S35 no están validados por el equipo (P.4), en particular S30 y S31 (ya aprobados por la persona responsable). `develop` no se pudo consultar en el remoto.

#### SUGGESTION (8)

- **S1. Posible rechazo sin manejar en `useMesasDisponibles` (conocido d): no hace falta cambiar nada.** `useMesasDisponibles.ts:44` encadena `.then` sin `.catch`, pero `ClienteApi.solicitar` envuelve todo el pedido, la lectura y la conversión del cuerpo en un `try/catch` (`frontend/src/shared/api/client.ts:31` y `:48`), de modo que `listarMesasDisponibles` siempre resuelve con `{ exito: false, error }`. Se recomienda dejarlo registrado (ya figura en el cierre de `apply-progress.md`). Si `api.ts` dejara de usar `clienteHttp`, habría que revisar este punto.
- **S2. «La mesa es obligatoria.» reemplaza al mensaje de la API (conocido e).** Si la consulta de la lista falló y se pulsa «Guardar reserva», el error local de Mesa gana sobre el mensaje de la API hasta el próximo envío (`SelectorMesa.tsx:53`, Decisión 19). Es lo que decidió el diseño y no bloquea. Junto con W2 puede ocultar el motivo real (el 422 del reloj).
- **S3. Dos escenarios quedan PARTIAL por falta de una prueba de página.** Agregar a `ReservasPage.test.tsx` una prueba que abra el panel (alta y edición), pulse «Cancelar» y «Cerrar formulario», y compruebe que el panel desaparece y que la ruta sigue siendo `/reservas`. Hoy solo se prueba que el componente llama a `onCerrar`.
- **S4. Lista de un turno repetido, vista antes de que llegue la respuesta nueva.** Por lectura de `useMesasDisponibles.ts:37-55` (no reproducido): si el turno válido pasa a inválido y vuelve al mismo `fecha hora`, el estado guardado conserva esa clave y el render muestra la lista anterior de ese mismo turno como `listo` hasta que llega la respuesta nueva, en lugar de `cargando`. No contradice la spec (la lista corresponde al turno actual) y la respuesta nueva la reemplaza, pero ninguna prueba cubre ese caso.
- **S5. Casillas y artefactos.** Marcar 10.8, 10.20 y 10.34 cuando se confirmen los commits `a1ad33f`, `9f691ff` y `8d5d374`, y versionar las dos ediciones de cierre del orquestador en el commit 14 (10.42).
- **S6. El texto de la spec sobre el aislamiento quedó desactualizado.** El requisito «Aislamiento del módulo…» todavía dice que la única modificación fuera de M5 debe ser el ajuste de los dos `downgrade` de `salon/test_migracion.py`. Tras los merges de `develop` la rama ya no toca ninguna prueba ajena (P.3: no aplica). El estado real es más estricto y cumple el escenario; conviene actualizar el texto al archivar.
- **S7. Textos que la spec no fija.** La opción «Seleccione una mesa» y el mensaje «No se pudieron cargar las mesas disponibles.» son `Supuesto:` del apply. Conviene que el equipo los valide junto con S29 a S35 (P.4).
- **S8. Costo de leer todas las páginas de M3 en cada alta y cada consulta (S33).** Aceptable con decenas de mesas. Seguimiento ya anotado (Seg-1): pedir a M3 una búsqueda por `id` o un filtro por estado, y avisar a Giuliano Giannoncelli de que `reservas` consume `salon.service.listar_mesas`.

### 9. No verificado y limitaciones

- Humo en navegador (10.40, 5.11, 7.8, 8.4) y el aspecto visual del selector y del panel.
- Integración real frontend + backend + M3 con datos reales. Todo el frontend se probó con la API simulada y todo el backend con `TestClient` y bases temporales.
- Rojo histórico de Strict TDD y las mutaciones: se tomaron del apply; el verificador no puede editar código para repetirlas.
- Estado de `origin/develop` en el remoto: sin red y sin tocar git; se usó la referencia local (`dfd151f`).
- Los issues de GitHub no se leyeron; los criterios de aceptación no se contrastaron con ellos, salvo el texto del issue #61 citado por la spec.
- Rendimiento con cientos de mesas (costo lineal por alta, S33) y carga concurrente.
- Los hallazgos W1 a W5 y S1 a S7 del informe anterior (pre-delta) no se reevaluaron; siguen descritos más abajo como historia.

### 10. Próximo paso recomendado

`sdd-archive`, una vez que la persona haga el humo de 10.40, decida la zona horaria (W2) y complete las tareas «Antes del PR». No hay trabajo de código pendiente que devuelva el cambio a `sdd-apply`. Este diagnóstico no bloquea el archivo.

---

## Verificación anterior (antes de las mesas disponibles)

> Cuerpo del informe del 2026-10-29, conservado sin cambios de redacción como historia. Solo se bajó un nivel cada encabezado y se quitó su título repetido. Sus conteos (31 de 31, 775 y 527 pruebas) describen el estado verificado en `f1a210f` y no rigen para el delta: valen los de la sección superior.

> **Nota del 2026-10-30:** el requisito «Capacidad de la mesa (HU-M5-01 CA 8, S5)» se quitó después de este informe, por el issue #61 (la cantidad de personas no se valida contra la capacidad de la mesa; se resuelve en forma presencial). Las menciones de capacidad de este informe describen el estado verificado en `f1a210f` y ya no rigen; ver «Ajuste posterior» en `apply-progress.md`.

- **Cambio:** `HU-M5-01-02-03` (ABM de `Reserva`, módulo M5). **Rama:** `feature/HU-M5-01-02-03-abm-reservas`. **HEAD verificado:** `f1a210f` (10 commits sobre `develop`, que sigue en `0bff1e0`, el punto de partida de la rama).
- **Fecha:** 2026-10-29. **Modo:** Strict TDD. **Almacén de artefactos:** OpenSpec. **Rol:** verificación independiente de solo lectura; este archivo es lo único que se creó.
- **Alcance de la lectura:** `tasks.md`, `apply-progress.md`, `design.md`, `specs/reservas-gestion/spec.md`, todo el código de producción de `backend/app/modules/reservas/`, la migración, `main.py`, el código de producción de `frontend/src/modules/reservas/` y los nombres y el contenido clave de las pruebas.

### 1. Resumen ejecutivo y veredicto

**Veredicto: PASS WITH WARNINGS.** CRITICAL 0, WARNING 5, SUGGESTION 7.

- Los 31 requisitos de la spec están implementados y cubiertos por pruebas que pasan: **COMPLIANT 31, PARTIAL 0, UNTESTED 0, FAILING 0** (algunas filas llevan una salvedad, ver la matriz y los hallazgos).
- Todo lo que se pudo ejecutar quedó en verde: backend 775 pruebas (cobertura 99,62 %), `ruff`, `ruff format --check`, `lint-imports` (10 contratos cumplidos) y un único head de Alembic; frontend 527 pruebas en 47 archivos, `lint`, `format:check`, `typecheck`, `build`, y las 96 pruebas del módulo en `TZ=America/Argentina/Buenos_Aires` y en `TZ=UTC`.
- Lo que **no** se verificó: los humos manuales con navegador (5.11, 7.8, 8.4), el aspecto visual de la pantalla y la integración real frontend + backend. Siguen pendientes de la persona, como se acordó.
- Las 17 casillas sin marcar son las esperadas: 2 humos manuales, 7 de cierre (8.1 a 8.7) y 8 de «Antes del PR» (P.1 a P.8). No hay ninguna casilla sin marcar que sea un problema real.
- Aislamiento correcto: ningún archivo de `salon/`, `atencion/`, `shared/` (backend y frontend), `App.tsx`, `pyproject.toml`, `alembic/env.py` ni de CI cambió, salvo las 2 líneas de `backend/tests/modules/salon/test_migracion.py`. Sin dependencias nuevas.

### 2. Tareas (`tasks.md`)

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

### 3. Evidencia de ejecución (observada)

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

### 4. Cumplimiento de Strict TDD

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

### 5. Matriz de cumplimiento de la spec (31 requisitos)

Rutas de pruebas relativas a `backend/tests/modules/reservas/` (backend) y `frontend/src/modules/reservas/` (frontend); código relativo a `backend/app/modules/reservas/` o `frontend/src/modules/reservas/`. Todas las pruebas citadas pasan (sección 3).

#### Backend (requisitos 1 a 25)

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

#### Frontend (requisitos 26 a 31)

| # | Requisito | Pruebas (ruta:línea) | Código (ruta:línea) | Estado |
|---|-----------|----------------------|---------------------|--------|
| 26 | Listado de reservas en pantalla | `pages/ReservasPage.test.tsx:101`, `:112`, `:195`, `:238`, `:272`; `components/ReservasTabla.test.tsx:41`, `:92`, `:104` | `pages/ReservasPage.tsx:83-113` (panel cerrado al entrar); `components/ReservasTabla.tsx:24-61` (columnas y acción solo en `ACTIVA`, `:50`); `pages/useListadoReservas.ts:15-39` | COMPLIANT (el layout «al costado» no se vio en un navegador) |
| 27 | Navegador de fecha y filtro de estado | `components/NavegadorFecha.test.tsx:21-66`; `pages/ReservasPage.test.tsx:101`, `:132`, `:145`, `:156`, `:168`, `:183`, `:195`; `fechas.test.ts:13`, `:20`, `:35`; `api.test.ts:30` | `components/NavegadorFecha.tsx:14-47`; `fechas.ts:9-27`; `pages/useListadoReservas.ts:16-17` (hoy local, `ACTIVA`), `:28-36` (vuelve a la página 1); `components/SelectorEstadoReserva.tsx:16-32`; `api.ts:6-17` (`TODAS` no envía `estado`) | COMPLIANT |
| 28 | Estado y fecha legibles | `components/ReservasTabla.test.tsx:55`; `fechas.test.ts:48` (96 pruebas verdes en UTC-3 y en UTC) | `components/estadosReserva.ts:10-15`; `fechas.ts:33-35` (separa el texto, sin `Date`); `components/ReservasTabla.tsx:36-40` | COMPLIANT |
| 29 | Formulario de alta | `components/ReservaFormulario.test.tsx:81`, `:94`, `:110`, `:119`, `:129`, `:140`, `:150`, `:160`, `:172`, `:193`, `:209`, `:228`; `components/validarReserva.test.ts:21-75`, `:107` | `components/ReservaFormulario.tsx:64-111`; `components/useFormularioReserva.ts:68-97`; `components/validarReserva.ts:75-97` | COMPLIANT |
| 30 | Formulario de edición | `components/ReservaFormulario.test.tsx:239`, `:251`, `:263`, `:275`, `:296`, `:310`, `:329`; `components/validarReserva.test.ts:80-105`; `api.test.ts:44`; `pages/ReservasPage.test.tsx:238`, `:257`, `:272`, `:289` | `components/ReservaFormulario.tsx:67`, `:87`, `:98` (Cliente y Mesa deshabilitados); `components/useFormularioReserva.ts:53-66` (solo tres campos); `pages/ReservasPage.tsx:61-81` (`key` en `:74`); `components/validarReserva.ts:82` | COMPLIANT |
| 31 | Estados vacío y error del listado | `components/ReservasTabla.test.tsx:67`, `:80`; `pages/ReservasPage.test.tsx:312`, `:320` | `components/ReservasTabla.tsx:21`, `:76-83` | COMPLIANT |

**Conteo de la matriz: COMPLIANT 31, PARTIAL 0, UNTESTED 0, FAILING 0.**

#### Cobertura por HU (camino feliz y error o límite, RNF-MAN-04)

| HU | Camino feliz | Error o límite |
|----|--------------|----------------|
| HU-M5-01 (crear) | `test_router.py:29`, `test_service.py:59`; `ReservaFormulario.test.tsx:172` | Límites de hora `test_service.py:98`/`:106`; capacidad `:172`/`:185`; 404 `test_router.py:90`; 409 `:57`; 422 `:70`, `:138` |
| HU-M5-02 (modificar) | `test_service.py:586`, `test_router.py:348`; `ReservaFormulario.test.tsx:275` | 409 no activa `test_router.py:394`; 409 turno `:406`; 422 `:379`, `:419`; 404 `:429`; autoconflicto `test_service.py:680` |
| HU-M5-03 (listar) | `test_service.py:447`, `test_router.py:208`; `ReservasPage.test.tsx:101` | 422 de paginación `test_router.py:244`; filtros inválidos `:263`; vacío `:274`; error de carga `ReservasPage.test.tsx:320` |

### 6. Aspectos a los que se pidió atención especial

- **R13 (doble reserva):** defensa en dos capas, comprobada. Consulta previa `repository.existe_reserva_activa` (`repository.py:22-37`) más índice único parcial `ux_reservas_mesa_fecha_hora_activa` con `sqlite_where="estado = 'ACTIVA'"` (`models.py:24-31`, migración `:49-55`). `_confirmar` (`service.py:69-81`) envuelve `agregar` y `commit`, hace `rollback` y lanza 409 con el mismo mensaje. Pruebas: `test_service.py:342`, `:356`, `:370`, `test_migracion.py:123`, `:137`. El mensaje del conflicto se arma antes de escribir (`service.py:75`), porque tras el `rollback` una reserva persistente se recarga con los valores viejos.
- **`PUT` con tres campos y sin extras:** `ReservaModificar` hereda `extra="forbid"` y exige `fecha`, `hora` y `cantidad_personas` (`schemas.py:11-35`). Probado con `mesa_id`, `cliente_id`, `estado` y sin `hora` (`test_router.py:379`).
- **Solo `ACTIVA`, con exclusión de la propia reserva:** `service.py:128` y `:131`; `repository.py:35-36`.
- **Listado:** `FiltroReservas` hereda los límites (50 por defecto, máximo 100); orden `fecha, hora, id` (`repository.py:55`); `total` cuenta con los mismos filtros (`repository.py:57`).
- **Puente stub (S20, S27):** `puente.py`; la modificación no exige que el puente encuentre la mesa (`service.py:115-119`); `test_service.py:671`.
- **Aislamiento:** sin imports de `salon` ni `atencion` en `reservas`; `lint-imports` cumple los 10 contratos.
- **Frontend:** el panel se monta con `key={reserva?.id ?? 'alta'}` (`ReservasPage.tsx:74`); Cliente y Mesa deshabilitados en edición (`ReservaFormulario.tsx:87`, `:98`); «Modificar reserva» solo en filas `ACTIVA` (`ReservasTabla.tsx:50`); día inicial `hoyLocal()` con métodos locales de `Date` (`fechas.ts:9-12`, `useListadoReservas.ts:16`); estado inicial `ACTIVA` (`useListadoReservas.ts:17`). El `Button` compartido trae `type='button'` por defecto (`button.tsx:14`), de modo que «Cancelar» dentro del `<form>` no envía el formulario.

### 7. Coherencia con el diseño

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

### 8. Calidad

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

### 9. Seguridad y robustez (breve)

- **Validación de entrada:** enteros estrictos (`StrictInt`, `gt=0`), `extra="forbid"`, hora sin segundos ni zona, estado del filtro sensible a mayúsculas. Los valores numéricos en `fecha` y `hora` (por ejemplo `1788000000` o `3600`) se rechazan con 422.
- **Mensajes de error sin SQL ni rutas internas:** `test_service.py:370` comprueba que el `detalle` del conflicto no contiene `insert`, `unique`, `constraint`, `sqlite`, `reservas`, `ux_` ni `ix_`.
- **`IntegrityError`:** se traduce a 409 con `rollback` y la sesión queda usable (`test_service.py:342`).
- **Hallazgos de robustez:** S1 (identificadores enormes devuelven 500, igual que en M1 y M3) y S2 (fecha con formato de fecha y hora aceptada).

### 10. Hallazgos

#### CRITICAL (0)

Ninguno.

#### WARNING (5)

- **W1. Humos manuales y integración real sin verificar.** 5.11, 7.8 y 8.4 siguen pendientes. No se vio en un navegador el aspecto de la pantalla (panel `lg:w-96`, ícono de lápiz, alineación de la columna de acciones, botones de día con solo ícono), y no existe una prueba automatizada que una el frontend con el backend real; el contrato HTTP se comprobó por separado (arnés del apply en backend, API simulada en frontend). Riesgo: una diferencia de contrato o de presentación solo aparecería en el humo manual.
- **W2. Tamaño del cambio muy por encima del presupuesto.** Medido: backend 2.285 líneas (439 de producción y 1.846 de pruebas) y frontend 1.822 (740 de producción y 1.082 de pruebas); total ≈ 4.107 contra el pronóstico de 1.850 a 1.950, el punto de control de 800 por lado y la política de revisión de 400 líneas. El PR necesita `size:exception` y la nota de tamaño (P.8) con estas cifras. Ya estaba anticipado en `tasks.md` y `apply-progress.md`; se deja constancia como carga de revisión.
- **W3. La cobertura del frontend no mide `src/modules/**`.** `frontend/vite.config.ts` incluye solo `src/App.tsx` y `src/shared/**`; el 74,75 % no dice nada sobre M5. La calidad de las pruebas de M5 se apoya en las comprobaciones de mutación que informa el apply (no reproducidas aquí). Es una configuración compartida del proyecto, fuera de este cambio.
- **W4. Hora del servidor sin zona (S28, Seg-6).** `ahora()` usa `datetime.now()` local (`service.py:20-22`). Si el servidor se despliega en UTC y el restaurante está en UTC-3, a partir de las 21:00 locales «hoy» ya es el día siguiente para el servidor y las reglas de fecha y hora pasada darían resultados erróneos (el frontend, en cambio, usa la fecha del navegador). Está documentado como supuesto y no contradice la spec; se anota como riesgo operativo para el despliegue.
- **W5. Cierre del cambio pendiente.** Quedan las tareas 8.1 a 8.7 y P.1 a P.8. En particular: `tasks.md` y `apply-progress.md` tienen cambios sin commitear; los criterios de aceptación («HU-M5-0x CA n») salen de la consigna y no se contrastaron con los issues (P.2); los supuestos S1 a S28 no están validados por el equipo (P.4), en especial S1 (`ACTIVA` frente a `PENDIENTE`); falta avisar a M3 del ajuste de 2 líneas (P.3); y `git pull origin develop` no se pudo comprobar contra el remoto (sin red): el `develop` local no avanzó desde el punto de partida de la rama.

#### SUGGESTION (7)

- **S1. Identificadores enteros fuera del rango de 64 bits devuelven 500.** Reproducido en una base descartable: `GET` y `PUT /reservas/99999999999999999999`, `POST /reservas` con `mesa_id` o `cantidad_personas` de ese tamaño responden `500 Internal Server Error` (texto plano, no `{"detalle": ...}`). El mismo comportamiento se reprodujo en M1 (`GET /platos/99999999999999999999`) y en M3 (`POST /mesas` con `sector_id` enorme), así que no lo introduce este cambio. Una cota superior (`le=2**63-1`) en los schemas y en los parámetros de ruta, idealmente en `shared/`, lo evitaría.
- **S2. `fecha` acepta `"2026-11-02T00:00:00"`.** Pydantic convierte una cadena de fecha y hora con hora cero en `date`; la spec pide `YYYY-MM-DD`. Impacto bajo; un validador de formato estricto lo cerraría.
- **S3. El desempate por `id` del orden no es detectable por las pruebas.** Quitar `Reserva.id` de `order_by` (`repository.py:55`) no rompe ninguna prueba porque SQLite recorre el índice `ix_reservas_fecha_hora` y devuelve los empates por rowid (mutante equivalente, documentado por el apply). Se podría afirmar sobre el SQL compilado (`ORDER BY reservas.fecha, reservas.hora, reservas.id`) para fijar el requisito en cualquier motor.
- **S4. `_confirmar` traduce todo `IntegrityError` al mensaje de turno ocupado.** Hoy solo el índice parcial puede dispararse (el `CHECK` lo evita el schema), pero una restricción futura quedaría mal rotulada. Es el mismo patrón de `salon.service._guardar_mesa`.
- **S5. Accesibilidad de la acción de la tabla.** Todas las filas `ACTIVA` ofrecen un botón con el mismo nombre accesible «Modificar reserva» (desvío 28). La spec fija ese texto; se podría agregar contexto con `title` o `aria-describedby`.
- **S6. R13 simultáneo solo se prueba con una carrera simulada.** `test_service.py:356` anula la consulta previa y `test_migracion.py:123` prueba el índice en la base; no hay una prueba con dos solicitudes concurrentes reales. Es razonable para SQLite y para una prueba determinista.
- **S7. Mejoras menores de experiencia ya anotadas por el apply.** Un alta de otro día o de otro estado no aparece en la tabla hasta navegar a ella; `useApi` no marca «cargando» al cambiar de día, estado o página (comportamiento del hook compartido); «Nueva reserva» con el alta abierta no limpia lo escrito. Ninguno contradice la spec.

### 11. No verificado y limitaciones

- Humos manuales con navegador (5.11, 7.8, 8.4) y el aspecto visual contra la maqueta `SPRINT-2/S2-04-maqueta/reservas.html`.
- Integración real del frontend con el backend (no hay pruebas E2E en el proyecto para este cambio).
- Rojo histórico de Strict TDD y comprobaciones de mutación: se tomaron del informe del apply; no se reprodujeron.
- Prueba intermitente de la línea base de `develop` (`1 failed | 430 passed`): **no apareció** en esta verificación (una corrida completa con cobertura y dos corridas del módulo, todas sin fallos). Sigue sin identificarse; si reaparece en la CI conviene guardar la salida completa.
- Estado de `origin/develop`: sin red, no se consultó. Solo se comprobó el `develop` local (`0bff1e0`, igual al punto de partida de la rama).
- Los issues de GitHub no se leyeron (los criterios de aceptación de la spec no se contrastaron con ellos).
- Rendimiento y carga: fuera del alcance de esta verificación.

### 12. Pendientes de la persona

1. Humo manual de 5.11 y 7.8 con el backend real y `npm run dev` (comandos en `FLUJO_DIARIO.md`): crear una reserva, verla en la tabla, pulsar el lápiz, cambiar la cantidad y ver el cambio. Mirar el alineado de la columna de acciones y el layout de dos columnas.
2. Humo de punta a punta de 8.4 (alta, 409 visible en el panel, filtros `ACTIVA` y «Todas», modificación, «Día siguiente» y «Hoy») y anotar las diferencias con la maqueta.
3. «Antes del PR»: P.1 (`Closes #n` por HU), P.2 (criterios contra los issues), P.3 (avisar a Giuliano Giannoncelli por las 2 líneas de M3), P.4 (validar S1 a S28), P.5 (`git pull origin develop` y revisar `alembic heads`), P.6 (diferencias con la maqueta en el PR), P.7 (CI local en verde, ya reproducida aquí) y P.8 (nota de tamaño con `size:exception` y las cifras de W2).
4. Cierre del orquestador: 8.1 a 8.3, 8.5 y 8.6 (las cifras de esta verificación sirven de insumo) y el commit 10 con `tasks.md`, `apply-progress.md` y este informe (8.7).

### 13. Próximo paso recomendado

`sdd-archive` cuando la persona termine los humos manuales y las tareas de «Antes del PR». No hay trabajo de código pendiente que devuelva el cambio a `sdd-apply`. Este diagnóstico no bloquea el archivo.

---

## Verificación de la Fase 13 · Cliente registrado o nuevo (delta, issue #61, S39 a S43)

**Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 3 WARNING, 2 SUGGESTION). Modo: Strict TDD, openspec.

### Comandos ejecutados (observados)

| Lado | Comando | Resultado |
|------|---------|-----------|
| Backend | `ruff check .` · `ruff format --check .` · `lint-imports` · `pytest` | 0 errores; 120 archivos formateados; 10 contratos kept, 0 broken; 1625 passed, cobertura 99,26 % (umbral 70 %) |
| Frontend | `npm run lint` · `format:check` · `typecheck` · `test:coverage` · `build` | todos en verde; cobertura 78,01 % líneas / 76,37 % sentencias (umbral 60 %); build OK |
| Frontend enfocado | `npx vitest run src/modules/reservas` | 11 archivos, 227 passed |

### Tareas

Fase 13 completa salvo 13.14, 13.29 y 13.33 (commits 17, 18 y 19, pendientes por diseño) y 13.32 (humo manual, pendiente de la persona). Los ítems P.* de «Antes del PR» siguen abiertos (son de la persona).

### Matriz de escenarios del delta (todos con prueba que pasa)

| Escenario | Pruebas |
|-----------|---------|
| Alta con cliente existente | `test_crear_reserva_con_cliente_existente_no_registra_clientes`, `test_post_reservas_con_cliente_existente_no_registra_clientes` |
| Alta con cliente nuevo | `test_crear_reserva_con_cliente_nuevo_lo_registra`, `test_post_reservas_con_cliente_nuevo_devuelve_201` |
| El puente real deja el cliente en M4 | `test_puente_real_alta_con_cliente_nuevo_lo_registra_en_m4`, `test_registrar_cliente_real_devuelve_el_id_y_queda_en_m4` |
| Mismo nombre, dos altas | `test_crear_reserva_dos_altas_con_cliente_nuevo_crean_dos_clientes` |
| Los dos clientes / ninguno | `test_crear_reserva_rechaza_los_dos_clientes`, `..._ningun_cliente`, `..._se_valida_antes_que_la_mesa`, `test_post_reservas_sin_exactamente_un_cliente_devuelve_422`, `test_reserva_crear_*` |
| Forma inválida del cliente | `test_post_reservas_cliente_nuevo_con_forma_invalida_devuelve_422`, `test_reserva_crear_toma_null_del_cliente_como_ausente` |
| Nombre/teléfono faltante o inválido, acentos y prefijo | `test_crear_reserva_rechaza_datos_invalidos_del_cliente_nuevo`, `test_crear_reserva_acepta_cliente_nuevo_con_acentos_y_prefijo`, `test_post_reservas_cliente_nuevo_valida_el_contenido_con_m4`, `test_puente_real_nombre_invalido_devuelve_422_sin_cliente`, `test_puente_real_dato_obligatorio_faltante_...`, `test_registrar_cliente_para_reserva_*` (M4) |
| Atomicidad (mesa inexistente, fuera de servicio, fecha/hora, turno ocupado, carrera del índice único, sin huérfano) | `test_crear_reserva_fallida_con_cliente_nuevo_no_registra_al_cliente`, `test_crear_reserva_mesa_inexistente_con_cliente_nuevo_invalido_informa_la_mesa`, `test_puente_real_reserva_fallida_no_deja_cliente_huerfano`, `test_puente_real_carrera_por_el_indice_unico_no_deja_cliente_nuevo`, `test_registrar_cliente_para_reserva_rollback_posterior_no_deja_cliente` |
| Puente: existe/propaga rechazo/cliente 456 → 404 | `test_existe_cliente_real_*`, `test_registrar_cliente_real_propaga_el_rechazo_de_m4`, `test_puente_real_cliente_existente_que_m4_no_conoce_devuelve_404`, `test_crear_reserva_rechaza_cliente_positivo_que_m4_no_conoce` |
| Aislamiento de importaciones | `test_solo_el_puente_importa_salon_y_atencion`, `lint-imports` |
| Selector: buscar por nombre/teléfono, elegir, sin resultados, falla, respuesta vieja, debounce | `SelectorCliente.test.tsx`, `useBuscarClientes.test.ts`, `api.test.ts` (URL `/clientes?q=&limit=10&offset=0`, codificación) |
| Cliente nuevo, pasar de uno a otro, sin cliente, datos inválidos | `ReservaFormDialog.test.tsx` (guardar con elegido/nuevo, alternar), `validarReserva.test.ts` (paridad con M4), `SelectorCliente.test.tsx` |
| La API rechaza (422 telefono, 409) | `ReservaFormDialog.test.tsx` «errores de la API con un cliente nuevo», `validarReserva.test.ts` (422 cliente_id/cliente_nuevo) |
| La edición no cambia el cliente | `ReservaFormDialog.test.tsx` (sin «Cliente nuevo» en edición, cliente de solo lectura) |
| Cerrar el modal descarta la elección | `ReservasPage.test.tsx` |

No hay escenarios sin prueba. El humo manual (13.32) no es requisito de la spec.

### Arquitectura y calidad

- Backend: `reservas` solo importa `atencion.service` (en `puente.py`); contrato `lint-imports` KEPT.
- Frontend: nada importa de `modules/atencion` (solo comentarios que citan la ruta de M4); sin `any`; ESLint 0 advertencias; complejidad y largo de función dentro de los límites (ruff/ESLint en verde).
- Diseño (Decisiones 25 a 31 con la Enmienda): «exactamente uno» es la primera comprobación del `service`; el schema acepta ninguno o los dos; coherente.

### Hallazgos

**CRITICAL (0)**

**WARNING (3)**
1. Tamaño: el diff sin confirmar es 1.214 inserciones en backend+frontend (frontend ≈ 1.096, sobre el límite de 800). Informativo; anotar `size:exception` en el PR (AGENTS.md §4).
2. Humo manual 13.32 pendiente de la persona (no se levantaron servidores ni navegador).
3. Commits 17, 18 y 19 pendientes (13.14, 13.29, 13.33): todo el delta sigue sin confirmar en la rama.

**SUGGESTION (2)**
1. `aClienteDeReserva` devuelve `cliente_id: 0` para `ninguno`. Es inalcanzable (la validación local lo frena) y queda cubierto por el 422 de la API; se podría tipar para que `ninguno` no compile o lanzar un error explícito.
2. Cobertura del frontend (78 % líneas) tiene módulos compartidos bajos (`dropdown-menu`, `popover`); ajenos al delta.

### Próximo paso

`sdd-archive` tras el humo manual y los commits 17 a 19 (o commitear primero y archivar con la persona).
