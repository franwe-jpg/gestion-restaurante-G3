# Avance de implementación: HU-M4-01-02-03

**Estado actual:** #49 y #50 preparados técnicamente en M4 para revisión provisional; HU-M4-01 e integración M5 pendientes. **Modo:** Strict TDD. **Avance:** 12/20 tareas completas (1.2, 1.3, 1.4, 2.1–2.5, 3.1–3.3 y 4.2); 1.5 sigue pendiente del contrato M5. Los estados anteriores se conservan como historial abajo. **Entrega prevista:** `delivery_strategy: single-pr`, `chain_strategy: none`, excepción de tamaño (`size:exception`) aprobada por el responsable; no se creó ningún commit ni PR.

## Preflight focalizado de reanudación (tareas 1.2 y 1.3)

- Rama observada: `feature/HU-M4-01-02-03-clientes`; el cambio OpenSpec ya existía sin seguimiento en Git. Se mantiene pendiente 1.1 (coordinación M5), independiente de la migración M4.
- Desde `backend/`, el `PATH` del shell no encuentra `pytest`, `ruff` ni `alembic` y `/usr/bin/python3 -m pytest --version` responde `No module named pytest`. Sin embargo, `backend/.venv/bin/` contiene los ejecutables: `./.venv/bin/python --version` → `Python 3.12.3`; `./.venv/bin/pytest --version` → `pytest 9.1.1`; `./.venv/bin/ruff --version` → `ruff 0.17.1`; `./.venv/bin/alembic --version` → `alembic 1.20.0`. Se usarán los ejecutables locales, sin instalar ni modificar dependencias.
- `./.venv/bin/alembic heads` → `d6b7c8e9f0a1 (head)`. `atencion/models.py` solo contiene el stub; `alembic/env.py` ya importa `app.modules.atencion.models`. Las pruebas existentes de migración usan `DATABASE_URL` temporal, `get_settings.cache_clear()` y `command.upgrade`/`downgrade`.
- Pruebas focalizadas aisladas: usar el pytest del entorno virtual con `PYTHONDONTWRITEBYTECODE=1`, caché de pytest y cobertura deshabilitadas; las bases temporales de pytest quedan fuera del repositorio. Esto evita escribir artefactos de ejecución en las fuentes no autorizadas. El estado del bloqueo anterior se conserva abajo como antecedente, no como diagnóstico actual.

## Implementación de migración M4 (1.2 y 1.3)

- Se escribió primero `backend/tests/modules/atencion/test_migracion.py` con prueba de esquema, nombres/teléfonos duplicados, nulos y reversión; la primera ejecución falló por ausencia real de la tabla, no por falta de ejecutor. Se agregó antes de implementar una comprobación de correspondencia del modelo: la segunda ejecución falló en colección al no existir `Cliente`.
- Se creó `Cliente` con `id` primario, `nombre` y `telefono` como texto no nulo y sin unicidad; la revisión `e7a9c1d3f5b7` sucede a `d6b7c8e9f0a1` y solo crea/elimina `clientes`. No hay FK a reservas ni validación de nombres/teléfonos en el modelo: esos comportamientos pertenecen a tareas posteriores. Alembic tiene una cabeza única.
- **REFACTOR:** el primer control de Ruff detectó `I001` en el orden de imports de la nueva revisión. Se corrigió únicamente esa revisión y se volvieron a ejecutar las ocho pruebas y los controles focalizados: siguen verdes. No hizo falta otra refactorización del comportamiento.

### TDD Cycle Evidence (ejecuciones desde `backend/`)

| Tarea | Archivo y capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 1.2–1.3 | `tests/modules/atencion/test_migracion.py`, integración SQLite/Alembic | N/A: archivos de migración y pruebas nuevos; `models.py` era un stub sin comportamiento | `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_migracion.py -q`: **7 failed**, `sqlite3.OperationalError: no such table: clientes`; al agregar prueba del modelo antes del código: el mismo comando con `--maxfail=1`: **1 error en colección**, `cannot import name 'Cliente'` | Mismo comando sin `--maxfail`: **8 passed, 1 warning** (StarletteDeprecationWarning) | Tres variantes de duplicación, dos de nulos, inspección de columnas y upgrade→downgrade→upgrade real: ocho casos sin stubs | Tras corregir orden de imports: **8 passed, 1 warning**; Ruff y formato: verdes |

### Work Unit Evidence

| Unidad | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- |
| Persistencia y migración M4 (solo 1.2–1.3) | `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_migracion.py -q`: **8 passed, 1 warning**, tras refactor | El mismo archivo ejecutó `command.upgrade(config, "head")`, insertó filas reales en SQLite temporal, verificó nulos y duplicados, ejecutó `command.downgrade(config, "d6b7c8e9f0a1")` y volvió a subir a `head`: **8 passed**. `./.venv/bin/alembic heads`: `e7a9c1d3f5b7 (head)`. | Revertir exclusivamente `backend/app/modules/atencion/models.py`, `backend/alembic/versions/e7a9c1d3f5b7_crea_clientes.py` y `backend/tests/modules/atencion/test_migracion.py`; antes de revertir una base con datos, respaldar clientes y coordinar dependencias de reservas. |

**Calidad focalizada:** `./.venv/bin/ruff check app/modules/atencion/models.py tests/modules/atencion/test_migracion.py alembic/versions/e7a9c1d3f5b7_crea_clientes.py && ./.venv/bin/ruff format --check app/modules/atencion/models.py tests/modules/atencion/test_migracion.py alembic/versions/e7a9c1d3f5b7_crea_clientes.py` → `All checks passed!`, `3 files already formatted`. No se corrió la suite completa, `lint-imports` ni controles frontend: están fuera de esta unidad; la cobertura del proyecto sigue sin verificarse.

## Preparación realizada

- Se regularizó localmente la rama `feat/m4-clientes` a `feature/HU-M4-01-02-03-clientes` sin modificar la referencia remota.
- Se actualizó la especificación, el diseño y las tareas existentes con el formato telefónico técnico provisional confirmado: `str` obligatorio no único, dígitos, espacios, guiones y `+` solo al inicio, sin otros límites. La propuesta no se regeneró.
- Se confirmó que el módulo M5 permanece como stub y que sus archivos están fuera del alcance autorizado; la integración de la primera reserva (#48 CA1) queda pendiente de coordinación y ejecución real.

## Evidencia histórica del bloqueo (sesión anterior, ya resuelto para backend)

| Comando ejecutado | Resultado exacto |
| --- | --- |
| `pytest tests/modules/atencion` desde `backend/` | Salida 127: `/bin/bash: line 1: pytest: command not found`. |
| `python3 -m pytest --version` y `python3 -m ruff --version` desde `backend/` | Ambos fallan: `No module named pytest` y `No module named ruff`. Python 3.12.3 está instalado, pero faltan las dependencias de pruebas. |
| `npm ci --offline --no-audit --no-fund` desde `frontend/` | Falló `ENOTCACHED`: falta `zod-4.6.7.tgz` en la caché local. No se hizo instalación en red. |
| `npm test -- --run src/modules/atencion` desde `frontend/` | Falla: `vitest` no se reconoce; el npm disponible invoca Windows CMD desde una ruta UNC de WSL. |
| `ruff check . && ruff format --check . && lint-imports && pytest` desde `backend/` | Salida 127 en el primer paso: `ruff: command not found`; no se ejecutaron los pasos restantes por `&&`. |
| `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` desde `frontend/` | Falla el primer paso: `eslint` no se reconoce en CMD con ruta UNC; los siguientes pasos no se ejecutaron por `&&`. |

## TDD Cycle Evidence histórico (antes de esta unidad)

| Tareas | RED | GREEN | REFACTOR | Motivo |
| --- | --- | --- | --- | --- |
| 1.4–4.2 | No iniciado entonces | No iniciado entonces | No iniciado entonces | Estado de la sesión anterior; la disponibilidad actual de Vitest no se volvió a comprobar. |

## Work Unit Evidence

| Unidad | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- |
| Datos y migración M4 (estado anterior) | Entonces bloqueada: `pytest` no disponible en PATH. | Entonces bloqueado: Alembic no disponible en PATH. | No se modificó ningún archivo de implementación en aquella sesión. |
| Edición y búsqueda M4 | Bloqueada: `pytest` no disponible; 0 pruebas escritas o ejecutadas. | Bloqueado: no se pudo ejecutar `TestClient`. | No se modificó ningún archivo de implementación. |
| Interfaz M4 | Bloqueada: `vitest` no disponible; 0 pruebas escritas o ejecutadas. | Bloqueado: no se pudo ejecutar la página en el entorno de pruebas. | No se modificó ningún archivo de implementación. |

## Pendientes

Al cierre de la unidad de migración, solo 1.2 y 1.3 estaban verificadas; el avance posterior se registra abajo. La coordinación 1.1 y la integración real con M5 siguen pendientes. No se ejecutaron formateadores mutantes globales, comandos remotos, commits ni PR.

## Unidad focalizada posterior: validación de cliente nuevo (#48 CA2–CA3)

- **Alcance:** `ClienteNuevo` valida `nombre` y `telefono` requeridos y no vacíos; rechaza números y caracteres especiales en nombres; acepta letras Unicode y espacios sin resolver de forma restrictiva nombres compuestos o acentuados. El teléfono sigue exclusivamente el formato provisional confirmado: dígitos ASCII, espacios, guiones y `+` solo al inicio, sin longitud mínima ni unicidad. El esquema no persiste nada ni define una interfaz M4–M5; la asociación, el aviso HTTP y la ausencia de registros tras un error solo podrán acreditarse con el flujo real acordado con M5.
- **Alcance pendiente de 1.4–1.5:** pruebas #49 CA2/CA4, `ClienteModificar`, `ClienteSalida` y contrato del servicio de alta vinculado. Ambas casillas permanecen sin marcar; avance acumulado **2/20**.

### TDD Cycle Evidence (ejecuciones desde `backend/`)

| Tarea parcial | Archivo y capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 1.4–1.5, solo #48 CA2–CA3 | `tests/modules/atencion/test_schemas.py`, unidad Pydantic | `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_migracion.py -q` → **8 passed, 1 warning**; `schemas.py` era solo un stub y el archivo de pruebas es nuevo. | Tras escribir las pruebas y antes del esquema: `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_schemas.py -q` → **14 failed, 1 warning**, todas por `AttributeError: module 'app.modules.atencion.schemas' has no attribute 'ClienteNuevo'` (comportamiento ausente, ejecutor disponible). | Mismo comando tras la implementación mínima → **14 passed, 1 warning**. | 14 variantes: omisiones, vacíos, nombres inválidos, teléfonos inválidos, nombres con acentos/espacios, valores permitidos y repetición sin unicidad; no se usaron stubs ni mocks. | No fue necesario refactorizar: los validadores son breves y separados; reejecución focalizada más regresión → **22 passed, 1 warning**; Ruff y formato correctos. |

### Work Unit Evidence

| Unidad | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- |
| Entrada de cliente nuevo (solo #48 CA2–CA3; parcial de 1.4–1.5) | `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_schemas.py -q` → **14 passed, 1 warning**. Regresión con `tests/modules/atencion/test_schemas.py tests/modules/atencion/test_migracion.py -q` → **22 passed, 1 warning**. | Invocación real de validación Pydantic de `ClienteNuevo` para 14 entradas, sin base ni HTTP; no corresponde ejecutar arnés de reserva porque M5 y su contrato siguen bloqueados. La prueba de migración ejecuta Alembic real sobre SQLite temporal: **8 passed** en la regresión. | Revertir solo `backend/app/modules/atencion/schemas.py` y `backend/tests/modules/atencion/test_schemas.py` para retirar la validación nueva; no revertir modelo, migración ni pruebas previas. |

**Calidad focalizada de esta unidad:** `./.venv/bin/ruff check app/modules/atencion/schemas.py tests/modules/atencion/test_schemas.py && ./.venv/bin/ruff format --check app/modules/atencion/schemas.py tests/modules/atencion/test_schemas.py` → `All checks passed!`, `2 files already formatted`. No se ejecutó suite completa ni controles del frontend; las pruebas de #48 CA1 y la integración real M4–M5 siguen pendientes.

## Unidad posterior: edición y listado backend independientes (#49 y #50)

**Estado acumulado:** 6/20 tareas completas (1.2, 1.3, 2.1, 2.2, 2.4 y 2.5). La excepción `size:exception` y el PR único se conservan; no se creó PR ni commit. `main.py` es infraestructura compartida y exige coordinación según `AGENTS.md`: se inspeccionó sin editar. Por eso 2.3 NO está completa; las rutas funcionan solo con inclusión explícita del router M4 en un arnés local. 1.4–1.5 permanecen parcialmente hechas: `ClienteModificar` y `ClienteSalida` existen, pero la interfaz de alta vinculada depende del acuerdo con M5. 4.2 cubre rechazos concretos de teléfono inválido en esquema y HTTP con preservación, pero permanece sin marcar porque su RED observada fue ausencia de `ClienteModificar`/router, no una ejecución individual de la regla con un cliente existente.

### TDD Cycle Evidence (desde `backend/`)

| Tareas | Capa / prueba | Safety net | RED observado | GREEN observado | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 1.4–1.5 parcial (#49) | `test_schemas.py`, Pydantic | Migración y esquemas previos: **22 passed, 1 warning** | `PYTHONDOTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_schemas.py -q`: **13 failed, 14 passed**, ausencia de `ClienteModificar` (la variable de entorno contiene una errata solo en esta ejecución; el ejecutor sí corrió). | Con `PYTHONDWRITEBYTECODE=1`: **27 passed, 1 warning** | 13 variantes de campos omitidos/vacíos, nombre/teléfono inválidos y salida; rechazos de teléfono no prueban todavía integración M5. | Herencia de validadores existentes sin cambio de comportamiento; **27 passed**. |
| 2.1–2.2 y 2.3 parcial | `test_service.py`, `test_router.py`, SQLite y HTTP | **22 passed, 1 warning** | Pruebas escritas antes de implementar; ejecución focalizada de ambos archivos con `--maxfail=1`: **1 error en colección**, importación de `router` inexistente. No se observó RED por caso de 422 de forma aislada. | `test_service.py test_router.py test_repository.py -q --maxfail=1`: **30 passed, 1 warning** tras resolver GET. | PUT 200 y consulta posterior, ID ausente 404, 8 entradas inválidas 422 con `detalle` y ambos datos intactos. | Corrección de formato de la prueba; `test_router.py -q`: **19 passed, 1 warning**. |
| 2.4–2.5 | `test_repository.py`, `test_router.py`, SQLite y HTTP | **27 passed, 1 warning** de esquemas | `test_repository.py -q --maxfail=1`: **1 failed**, `repository.listar_clientes` ausente. Tras implementación inicial, `test_service.py test_router.py test_repository.py -q --maxfail=1`: **1 failed, 2 passed**, GET 422 por modelo de consulta anidado. | Tras agrupar `q`, `limit` y `offset` en `FiltroClientes`: **30 passed, 1 warning**. | Nombre total/parcial, teléfono no único, `%`/`_` literales, página fuera de rango, sin coincidencias, tabla vacía, 422 paginación. | Formato focalizado corregido sin cambio funcional; `test_router.py -q`: **19 passed, 1 warning**. |
| 4.2 parcial | `test_schemas.py`, `test_router.py` | Validación de `ClienteNuevo` previa: **14 passed** | La prueba de teléfono incorrecto se escribió antes de `ClienteModificar` y del router, pero el fallo observado fue por ausencia de esas piezas, no por permitir un teléfono inválido. | Pruebas parametrizadas de `12a3` y `12+34`, `detalle` incluye `telefono` y SQLite conserva ambos valores: incluidas en **65 passed**. | Letra, `+` intermedio y paréntesis rechazados; valor `+54 456-789` aceptado. | No se marcó completa la tarea por la limitación del RED observado. |

### Work Unit Evidence

| Unidad | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- |
| Edición y búsqueda backend M4, sin registro global de rutas | `PYTHONDWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py tests/modules/atencion/test_repository.py -q --maxfail=1`: **30 passed, 1 warning**. Suite M4 `tests/modules/atencion/ -q`: **65 passed, 1 warning**. | `TestClient` de FastAPI con router M4 incluido explícitamente, manejadores HTTP del aplicativo y `get_db` sobre sesión SQLite temporal migrada por prueba: **19 pruebas HTTP passed**. NO prueba registro en `app.main`. | Retirar solo `backend/app/modules/atencion/{repository,service,router}.py`, las clases `ClienteModificar`, `ClienteSalida`, `FiltroClientes` de `schemas.py` y las pruebas nuevas de M4; preservar `ClienteNuevo`, modelo, migración y su evidencia previa. |

**Calidad:** primer `./.venv/bin/ruff check` focalizado: **2 E501**; corregidos. Primer `ruff format --check`: **1 archivo sin formato** (`test_router.py`); corregido. Control focalizado final sobre los ocho archivos Python modificados: `./.venv/bin/ruff check ... && ./.venv/bin/ruff format --check ...` → `All checks passed!`, `8 files already formatted`. `./.venv/bin/lint-imports` → **10 contratos conservados, 0 rotos**. `PYTHONDWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/ -q` → **65 passed, 1 warning** (advertencia de deprecación Starlette/httpx). No se ejecutó suite completa del backend ni cobertura; 4.4 permanece pendiente.

**Desviación de alcance controlada:** `backend/app/main.py` requiere edición compartida coordinada; no se modificó, por lo que los endpoints aún NO están registrados en la aplicación principal. No se tocó M5, `shared/` ni el frontend; tampoco se expuso alta/baja HTTP de clientes. El formato telefónico sigue siendo provisional y se hereda de `ClienteNuevo` sin restricciones adicionales.

## Reanudación de la unidad frontend (3.1–3.3): bloqueada antes de RED

**Estado acumulado:** 6/20 tareas completas; no se modificaron casillas de `tasks.md`. Strict TDD continúa activo. No se escribieron pruebas ni código frontend: el ejecutor de pruebas no inicia en el entorno Linux disponible, por lo que no existe un RED válido ni un GREEN verificable. La tarea 4.2 sigue pendiente; no se observó un RED específico de la regla telefónica frontend.

| Comando (desde `frontend/`) | Resultado observado |
| --- | --- |
| `node --version && npm --version` | `v18.19.1` y `11.19.0`; `frontend/package.json` exige Node `>=22.12.0`. |
| `command -v node; command -v npm` | `/usr/bin/node` (Linux) y `/mnt/c/Program Files/nodejs/npm` (Windows); no se encontró un ejecutable Linux Node 22+ en las ubicaciones locales inspeccionadas. |
| `npm test -- atencion` | Fallo de infraestructura: el npm de Windows abre CMD en ruta WSL UNC, cambia de directorio y no reconoce `vitest`. No ejecutó ninguna prueba. |
| `node node_modules/vitest/vitest.mjs run src/modules/atencion` | Fallo al iniciar: `SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'` en rolldown; Node 18 no satisface el requisito. No ejecutó ninguna prueba. |

### TDD Cycle Evidence (frontend)

| Tareas | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- |
| 3.1–3.3; 4.2 condicional | Imposible: ejecutor no inicia | No iniciado; el fallo de infraestructura no es RED | No iniciado | No iniciado | No iniciado |

### Work Unit Evidence (frontend)

| Unidad | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- |
| Interfaz M4, todavía sin iniciar | `npm test -- atencion` y la invocación Linux directa de Vitest fallaron antes de ejecutar pruebas; **0 pruebas**. | Bloqueado además para extremo a extremo: el router M4 no está incluido en `backend/app/main.py`. Los tests de componentes podrán simular HTTP, pero no sustituyen la integración real. | No hubo archivos frontend modificados, por lo que no hay cambios de esta unidad que revertir. |

**Próximo paso:** habilitar localmente Node Linux >=22.12.0 con npm Linux y las dependencias ya instaladas compatibles, sin instalaciones de red no autorizadas; volver a ejecutar el safety net y empezar cada tarea por su prueba RED. Permanecen pendientes `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:coverage` y `npm run build` para esta unidad; no se consideran aprobados. La entrega sigue siendo un solo PR con `size:exception`, sin acciones de PR ni remotas.

## Reanudación frontend: listado y edición M4 (#49 y #50)

**Estado acumulado: 9/20 tareas completas** (las seis backend anteriores y 3.1–3.3). Los errores previos de Node 18/npm Windows son históricos: todos los comandos frontend siguientes usaron `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH"` desde `frontend/`, sin instalaciones. `npm test -- atencion` inicial salió 1 con cero archivos; no fue RED (no existían pruebas M4).

### TDD Cycle Evidence (comandos desde frontend con el PATH anterior)

| Tarea | Prueba y capa | Safety net | RED observado | GREEN observado | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1 | `api.test.ts`, `clienteHttp` simulado | Ningún test M4 existente | `npm test -- src/modules/atencion/api.test.ts`: **3 failed** por funciones inexistentes | Mismo comando: **3 passed** | Sin filtro, filtro codificado/paginado y PUT con error conservado | Prettier focalizado; suite M4 **17 passed** |
| 3.2 | `pages/AtencionPage.test.tsx`, Testing Library | Página stub sin tests anteriores | `npm test -- src/modules/atencion/pages/AtencionPage.test.tsx`: **7 failed** por ausencia de lista y estados | Mismo comando: **7 passed** | Nombre completo/parcial, teléfono compartido, páginas y tres estados vacíos más error | Extracción de panel/hook y formato; suite M4 **17 passed** |
| 3.3 | `components/ClienteFormDialog.test.tsx` y escenario de página, Testing Library | Página 3.2: **7 passed** | `npm test -- src/modules/atencion/components/ClienteFormDialog.test.tsx`: **1 suite fallida, 0 tests**, import ausente. Tras diálogo verde, `npm test -- src/modules/atencion/pages/AtencionPage.test.tsx -t 'permite editar'`: **1 failed, 7 skipped** por botón ausente | Diálogo **6 passed** y suite completa M4 **17 passed** | PUT válido y reflejo en lista, dos nombres inválidos, ambos obligatorios vacíos, error del servidor | Extracción de campos y validación, separación de grupos de pruebas; M4 **17 passed** tras refactor |

### Work Unit Evidence

| Unidad | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- |
| Listado y edición frontend M4; PR único `size:exception` | `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH" npm test -- src/modules/atencion`: **3 archivos, 17 passed** después del refactor. | Testing Library monta página y diálogo reales en jsdom con `api.ts` simulado; `api.test.ts` espía el cliente HTTP. No es E2E: el router M4 aún no está registrado en `backend/app/main.py`. | Solo `frontend/src/modules/atencion/{types.ts,api.ts,api.test.ts,pages/AtencionPage.tsx,pages/AtencionPage.test.tsx,components/ClienteFormDialog.tsx,components/ClienteFormDialog.test.tsx}` más las casillas y esta sección de OpenSpec. |

**Calidad final:** `npm run lint`: salida 0 (primero falló por funciones >50 líneas, corregido); `npm run format:check`: salida 0; `npm run typecheck`: salida 0 (primero falló porque `Alert` no acepta prop `role`, retirada; ya define `role="alert"`); `npm run test:coverage`: **50 archivos, 505 passed**, líneas **76.68 %**, sentencias **74.95 %**, sobre 60 %; `npm run build`: salida 0, **2074 módulos**. Solo se formatearon archivos M4 con Prettier explícito, seguido de suite M4 verde. La tarea global 4.4 queda pendiente por controles backend y demás integración no ejecutados en esta unidad.

**Pendientes:** 1.1/2.6/2.7/4.1 requieren acuerdo con M5; 2.3 requiere coordinación para registrar rutas en `backend/app/main.py`. 1.4–1.5 son parciales. 4.2 sigue pendiente: esta unidad no produjo un RED específico de teléfono inválido frontend; los errores HTTP del backend se muestran pero no son E2E. No declarar HU-M4-01 completa. Sin commits, PR ni operaciones remotas.

## Reanudación focalizada: propuesta, teléfono #49 CA3 y rutas M4

**Estado acumulado: 11/20 tareas completas.** Las afirmaciones anteriores sobre 2.3 y 4.2 describen el estado histórico antes de esta reanudación. Se reconciliaron en `proposal.md` el formato provisional confirmado y su carácter no definitivo, sin imponer longitud ni unicidad. La autorización para editar `backend/app/main.py` en esta unidad permite completar 2.3; la integración de la primera reserva con M5 continúa pendiente.

### TDD Cycle Evidence

| Tarea | Prueba y capa | Safety net | RED observado | GREEN observado | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| 4.2 (#49 CA3) | `frontend/src/modules/atencion/components/ClienteFormDialog.test.tsx`, interacción en jsdom; rechazo y preservación backend ya probados en `backend/tests/modules/atencion/test_router.py` | Desde `frontend/`, `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH" npm test -- src/modules/atencion/components/ClienteFormDialog.test.tsx`: **6 passed**. | Misma orden con `-t 'rechaza teléfono con formato inválido'`: **2 failed, 6 skipped**; el diálogo no ofrecía ningún aviso de campo al enviar `12a3` y `12+34`. La primera ejecución además tuvo errores asíncronos por mock sin respuesta; se corrigió el mock y se repitió RED limpio, con 2 fallos reales por ausencia del aviso. | Se aplicó exclusivamente el patrón provisional al campo en el diálogo antes de llamar a la API; prueba focalizada: **8 passed**. `modificarCliente` y `onGuardado` no se invocan ante ambos errores; el backend conserva los dos valores anteriores en las pruebas HTTP ya registradas (65 passed en la unidad previa). | Dos rutas inválidas distintas: letra y `+` intermedio; la prueba de edición válida existente conserva el uso de `456-789`. | Se mejoró el formato del mock y se retiró una aserción constante sin valor conductual; el archivo terminó en **8 passed**, Prettier y ESLint focalizados sin errores. |
| 2.3 (registro final) | `backend/tests/modules/atencion/test_router.py`, integración HTTP con `TestClient(app_principal)` y SQLite migrada | Desde `backend/`, `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_router.py -q`: **19 passed, 1 warning**. | Nueva prueba de aplicación real: mismo comando con `-k app_principal`: **1 failed, 19 deselected, 1 warning**; `GET /api/v1/clientes` respondía 404 antes de registrar el router. | Se agregó `atencion_router` con `prefix=API_PREFIX` en `backend/app/main.py`; mismo comando focalizado: **1 passed, 19 deselected, 1 warning**. GET devuelve lista real, PUT actualiza y devuelve el mismo ID; POST y DELETE devuelven 405. | Los cuatro métodos en dos rutas se prueban con una fila real (GET no vacío y PUT), además del contraste 405; las pruebas anteriores cubren datos inválidos y búsquedas. | Se añadió una consulta GET tras PUT para acreditar persistencia; repetición focalizada: **1 passed, 19 deselected, 1 warning**. Prueba completa previa: **20 passed, 1 warning**. Ruff check y format --check focalizados: sin errores, 2 archivos formateados. |

### Work Unit Evidence

| Unidad | Prueba focalizada y resultado | Arnés de ejecución y resultado | Límite de reversión |
| --- | --- | --- | --- |
| Teléfono inválido (#49 CA3) | `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH" npm test -- src/modules/atencion/components/ClienteFormDialog.test.tsx` desde `frontend/`: **8 passed**. | Testing Library abre el diálogo real y verifica el aviso del campo, la ausencia de petición PUT y la falta de notificación de actualización ante `12a3` y `12+34`. La preservación en SQLite ante ambos errores ya está cubierta por `test_router.py` con router local; NO es una prueba E2E del navegador contra servidor real. | Revertir solo las pruebas nuevas de `ClienteFormDialog.test.tsx` y la validación telefónica nueva en `ClienteFormDialog.tsx`; preservar la edición, el listado y las pruebas previas. |
| Registro de router M4 (2.3) | `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_router.py -q` desde `backend/`: **20 passed, 1 warning**; tras añadir la consulta de persistencia, mismo comando con `-k app_principal`: **1 passed, 19 deselected, 1 warning**. | La prueba usa `TestClient(app_principal)` real, sobrescribe temporalmente `get_db` para una SQLite migrada y comprueba GET 200 con fila, PUT 200 seguido de GET con datos nuevos, POST/DELETE 405; los 19 tests previos usan el router local. | Revertir solo la importación/inclusión de `atencion_router` en `backend/app/main.py` y la prueba `test_app_principal_registra_get_put_sin_alta_ni_baja` en `backend/tests/modules/atencion/test_router.py`; preservar las capas M4 ya implementadas. |

**Controles adicionales focalizados:** desde `frontend/`, `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH" ./node_modules/.bin/prettier --check src/modules/atencion/components/ClienteFormDialog.tsx src/modules/atencion/components/ClienteFormDialog.test.tsx` → formato correcto; `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH" ./node_modules/.bin/eslint src/modules/atencion/components/ClienteFormDialog.tsx src/modules/atencion/components/ClienteFormDialog.test.tsx` → salida 0. Desde `backend/`, `./.venv/bin/ruff check app/main.py tests/modules/atencion/test_router.py && ./.venv/bin/ruff format --check app/main.py tests/modules/atencion/test_router.py` → sin errores, dos archivos formateados. **No** se ejecutaron suites completas, cobertura global ni verificaciones completas de CI en esta reanudación; 4.4 queda pendiente para comprobación manual en WSL. 1.1, 2.6, 2.7 y 4.1 de M5 permanecen pendientes; tampoco se modificaron otros módulos, `shared/` ni PR.

## Revisión de preparación local para PR provisional: #49 y #50

**Resultado:** 12/20 tareas completas; se reconoció 1.4 como RED ya documentado, sin alterar código ni fabricar otro fallo. El PR único hacia `develop` permanece como intención documental, con `size:exception` aprobada; no se creó commit, push ni PR. Esta revisión no acredita #48 ni la calidad global de 4.4.

| Criterio | Evidencia local vigente |
| --- | --- |
| #49 CA1 | `test_modificar_cliente_devuelve_200_y_consulta_posterior`, `test_app_principal_registra_get_put_sin_alta_ni_baja` y `AtencionPage.test.tsx`: PUT 200, mismo ID y datos actualizados visibles. |
| #49 CA2, CA4 | `test_modificar_cliente_invalido_devuelve_422_y_conserva_ambos_datos`, `test_cliente_modificar_exige_ambos_datos`, `test_cliente_modificar_rechaza_nombre_invalido` y `ClienteFormDialog.test.tsx`: aviso del campo, 422 para solicitudes inválidas y ambos valores persistidos intactos. |
| #49 CA3 | La misma prueba HTTP rechaza `12a3` y `12+34` con 422 y preserva ambos valores; el diálogo avisa antes del PUT para ambos formatos. Solo rige el formato provisional confirmado. |
| #50 CA1–CA3 | `test_listar_clientes_pagina_con_contacto_y_total`, `test_listar_clientes_busca_nombre_o_telefono`, `test_listar_clientes_filtra_literal_y_cuenta`, `api.test.ts` y `AtencionPage.test.tsx`: paginación, contacto, nombres completos/parciales y teléfono compartido. |
| #50 CA4–CA5 | `test_listar_clientes_busca_nombre_o_telefono`, `test_listar_clientes_registro_vacio` y `AtencionPage.test.tsx`: respuesta 200 con lista vacía y avisos distintos para filtro y registro; página fuera de rango distinguida con `total`. |

**Compatibilidad examinada:** `backend/app/main.py` incluye el router M4 con `API_PREFIX`; la prueba con `TestClient(app_principal)` usa SQLite aislada y ejercita GET y PUT reales, con POST/DELETE 405. `frontend/src/modules/atencion/api.ts` construye `/clientes?limit=...&offset=...` y `/clientes/{id}` sobre `clienteHttp`, cuyo prefijo es `/api/v1` y cuyo lector de errores usa `detalle`; los tipos `PaginaCliente` y `Cliente` corresponden a `Pagina[ClienteSalida]`. `frontend/src/App.tsx` ya registra `/atencion`, y `frontend/src/shared/components/layout/navegacion.ts` e `Inicio.tsx` enlazan esa ruta; no hubo cambios en archivos compartidos. No se ejecutó un navegador real contra un servidor.

### Evidencia TDD y de unidad de trabajo (revisión sin implementación nueva)

| Tarea/unidad | RED previo | GREEN y refactor previos | Prueba focalizada actual | Arnés y límite de reversión |
| --- | --- | --- | --- | --- |
| 1.4, reclasificación documental | `test_schemas.py` produjo **14 failed** sin `ClienteNuevo`; después **13 failed, 14 passed** sin `ClienteModificar` (véanse las tablas históricas anteriores). Incluyen los casos expresos de 1.4; la errata histórica `PYTHONDOTWRITEBYTECODE` no impidió ejecutar pytest. | **14 passed** y luego **27 passed**; reutilización de validadores, sin refactor conductual nuevo. | Desde `backend/`: `PYTHONDONTWRITEBYTECODE=1 PYTEST_ADDOPTS='-p no:cacheprovider --no-cov' ./.venv/bin/pytest tests/modules/atencion/test_schemas.py tests/modules/atencion/test_router.py tests/modules/atencion/test_repository.py -q` → **56 passed, 1 warning** de deprecación Starlette/httpx. | Pydantic valida todos los casos y `TestClient(app_principal)` ejercita GET/PUT sobre SQLite aislada; solo se revierte la casilla 1.4 y esta anotación de OpenSpec si se cuestiona la reclasificación. No se tocó código. |
| Compatibilidad frontend de #49/#50 | RED y GREEN ya registrados para 3.1–3.3 y 4.2; no se inventó RED nuevo. | **19 passed** actuales; no se hizo refactor adicional. | Desde `frontend/`: `PATH="/home/juano/.nvm/versions/node/v22.23.4/bin:$PATH" npm test -- src/modules/atencion/api.test.ts src/modules/atencion/pages/AtencionPage.test.tsx src/modules/atencion/components/ClienteFormDialog.test.tsx` → **3 archivos, 19 passed**. | Testing Library monta página/diálogo y `api.test.ts` comprueba el cliente HTTP simulado; no es integración navegador-servidor. Límite de reversión de esta revisión: solo documentación en `tasks.md` y `apply-progress.md`. |

**Pendientes antes de cerrar el cambio agrupado:** 1.1, 1.5, 2.6, 2.7 y 4.1 requieren acuerdo del DTO/interfaz pública y prueba real de alta vinculada con M5; no inferirlos de `ClienteNuevo`. 4.3 sigue abierta: las discrepancias de los dos diagramas y `SPRINT-1/S1-07-casos-de-prueba.md` constan en la propuesta/spec/diseño, pero no se coordinó aún su actualización posterior. 4.4 sigue abierta: la persona ejecutará controles y coberturas completos en WSL; esta revisión solo ejecutó pruebas focalizadas. 4.5 no se marca completa: excepción y rama local constan previamente, pero no se ha acreditado el cierre de dependencias #61/M3. Los textos históricos de progreso sobre ruta ausente o ejecutores no disponibles describen estados anteriores, no bloqueos actuales de #49/#50.
