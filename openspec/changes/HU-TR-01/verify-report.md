```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f424c6b0c83ba6540d66c3940f10cefce5effc0e7b4130a2a055378fe84f4124
verdict: fail
blockers: 1
critical_findings: 1
requirements: 19/19
scenarios: 89/89
test_command: "backend: pytest (desde backend/) ; frontend: npm run test:coverage (desde frontend/)"
test_exit_code: 0
test_output_hash: sha256:2628798b97bcbbe708d4018b3a0c43f19653136b47602281e845d32f60db89c5
build_command: "frontend: npm run lint && npm run format:check && npm run typecheck && npm run build ; backend: ruff check . && ruff format --check . && lint-imports"
build_exit_code: 0
build_output_hash: sha256:532d32177e1854a6b657207d3d757ad6165ae640e91d41713997197eef5192fd
```

## Informe de verificación

**Cambio**: HU-TR-01 Inicio de sesión y usuarios con roles (issue #172)
**Rama**: `feature/HU-TR-01-login-y-roles` (HEAD `4a0c487`, árbol `4a5e8c3`)
**Modo**: Strict TDD
**Veredicto**: FAIL, por un único hallazgo CRITICAL de evidencia documental (falta la tabla «TDD Cycle Evidence»). Todo el comportamiento, las pruebas, el CI local y las migraciones están en verde. El arreglo no toca código.

### Completitud

| Métrica | Valor |
| --- | --- |
| Tareas totales | 89 (fases 1 a 3) + 5 (fase 4) |
| Tareas marcadas [x] | 89 de 89 en fases 1 a 3; la fase 4 (4.1 a 4.5) sigue sin marcar |
| Unidades de trabajo | 12 de 12 con commit |

Se verificó que cada tarea [x] tiene código y prueba. El recuento de `apply-progress.md` para el frontend dice «28 de 28» pero `tasks.md` tiene 24 tareas en las unidades 8 a 11 (6+5+7+6); el backend sí cuadra (37 de 37).

### Ejecución de build y pruebas (salida real)

**Backend** (desde `backend/`, venv compartido):

```text
ruff check .                  -> All checks passed!
ruff format --check .         -> 184 files already formatted
lint-imports                  -> Contracts: 13 kept, 0 broken.  (shared no importa modulos: KEPT, 1 ignored import)
pytest                        -> 2649 passed, 1 warning in 276.48s (0:04:36)   EXIT 0
                                 Required test coverage of 70% reached. Total coverage: 98.55%
```

La advertencia es `StarletteDeprecationWarning` (httpx en `starlette.testclient`), ajena al cambio.

**Frontend** (desde `frontend/`):

```text
npm run lint (--max-warnings=0) -> 0 errores, 0 advertencias
npm run format:check            -> All matched files use Prettier code style!
npm run typecheck               -> sin errores
npm run test:coverage           -> Test Files 146 passed (146); Tests 1550 passed (1550)
                                   Statements 88.22% | Branches 84.28% | Functions 83.63% | Lines 88.94%   (umbral 60%)
npm run build                   -> built in 314ms
```

**Migraciones** (base SQLite temporal en el directorio de scratchpad, con `DATABASE_URL` apuntando a ella; la base de desarrollo del proyecto no se tocó):

```text
alembic heads                  -> b8d0f2a4c6e8 (head)          (una sola cabeza)
alembic upgrade head           -> ... c3e5a7b9d1f2 -> b8d0f2a4c6e8, crea usuarios, sesiones y chefs
                                  tablas nuevas: chefs, sesiones, usuario_roles, usuarios
alembic downgrade -1           -> b8d0f2a4c6e8 -> c3e5a7b9d1f2 (tablas nuevas quitadas; mozos intacta)
alembic upgrade head           -> c3e5a7b9d1f2 -> b8d0f2a4c6e8
alembic current                -> b8d0f2a4c6e8 (head)
```

`git status` queda limpio tras todas las ejecuciones (solo se escribe este informe). `git diff HEAD...develop` vacío: la rama local `develop` no avanzó; no se pudo comprobar `origin/develop` (tarea 4.3 pendiente).

### Cumplimiento de la spec (matriz de escenarios)

Totales reales: 19 requisitos y 89 escenarios (AS 7/28, CA 3/19, SC 5/23, SM 4/19). Todos tienen código y al menos una prueba que pasó en tiempo de ejecución. Las pruebas de la matriz de permisos son parametrizadas por celda (método, ruta, rol) y recorren `app.routes`.

| Capacidad / requisito | Evidencia de prueba (pasó) | Resultado |
| --- | --- | --- |
| AS Iniciar sesión (6 esc.) | `usuarios/test_service.py`: `test_iniciar_sesion_guarda_solo_el_hash_del_token_y_vence_en_8_horas`, `..._ignora_mayusculas_y_espacios_del_correo`, `..._con_credenciales_invalidas_da_el_mismo_error` (parametrizado: clave mala, correo inexistente, deshabilitado, clave de 100 bytes; verifica sin sesión creada), `test_correo_inexistente_compara_contra_un_hash_ficticio`; `test_router.py`: 201 con forma, 401 genérico con `WWW-Authenticate`, 422 parametrizado (correo vacío, sin `@`, clave vacía, campo extra) | COMPLIANT |
| AS Contraseñas con hash (3 esc.) | `test_contrasena_hash_no_es_la_clave_y_valida_con_bcrypt`, `test_misma_clave_en_dos_usuarios_da_hashes_distintos`, `test_ninguna_respuesta_expone_la_contrasena` (sin `contrasena` ni `$2` en el cuerpo) | COMPLIANT |
| AS Exigir sesión en toda la API (5 esc.) | `tests/shared/test_seguridad.py` (sin encabezado, esquema distinto de Bearer, token desconocido), `test_usuario_de_token_respeta_el_vencimiento_de_8_horas` (7 h 59 min vigente, 8 h 1 s no), `test_get_sesion_vencida_responde_401`, `test_usuario_de_token_desconocido_o_deshabilitado_es_none`, `test_sin_sesion_toda_ruta_protegida_responde_401`, `test_salud_es_publica` | COMPLIANT |
| AS Consultar la sesión (2 esc.) | `test_get_sesion_devuelve_nombre_y_apellido_del_mozo_vinculado` (y chef, y nulos para el encargado), `test_get_sesion_sin_token_responde_401` | COMPLIANT |
| AS Cerrar sesión (3 esc.) | `test_delete_sesion_responde_204_y_el_token_deja_de_valer`, `test_delete_sesion_sin_token_responde_401`, `test_cerrar_sesion_borra_solo_esa_sesion` | COMPLIANT |
| AS Primer encargado (2 esc.) | `tests/scripts/test_crear_encargado.py` (alta con inicio de sesión, correo repetido y clave de 7 caracteres terminan con código distinto de cero sin cambiar la base, claves distintas, correo obligatorio) | COMPLIANT |
| AS Frontend inicio, restauración y cierre (7 esc.) | `LoginPage.test.tsx` (válido, 401 con correo conservado, vacíos sin envío), `SesionProvider.test.tsx` (recarga con `GET /sesion`, `DELETE /sesion` y borrado del token aunque falle, 401 deja la sesión vacía), `client.test.ts` (Bearer en GET, POST, formulario y PDF; 401 con token avisa al manejador; el 401 de `POST /sesion` no), `App.rutas.test.tsx` (sin sesión a `/login` sin llamadas de datos), `almacenSesion.test.ts` | COMPLIANT |
| CA Matriz única de permisos (3 esc.) | `test_permisos.py`, `test_cada_ruta_protegida_declara_un_permiso`, `test_get_y_delete_de_sesion_solo_exigen_una_sesion_valida`, `test_sin_sesion_toda_ruta_protegida_responde_401`, `test_el_usuario_con_mozo_y_chef_recibe_la_union_de_permisos`; frontend `permisos.test.ts` | COMPLIANT |
| CA Respuesta 403 sin permiso (9 esc.) | `test_celda_de_la_matriz` (una celda por método, ruta y rol: permitido no da 401 ni 403; negado da 403 con el `detalle` exacto y sin filas nuevas en ninguna tabla), más los escenarios con datos reales (`test_el_mozo_no_gestiona_el_catalogo`, `test_el_chef_no_entra_a_pagos_ni_salon`, `test_el_chef_ve_comandas_y_su_detalle_pero_no_las_modifica`, `test_el_mozo_cierra_una_comanda_de_otro_mozo`, `test_el_mozo_factura_y_cobra_una_comanda_ajena`, `test_los_reportes_son_solo_del_encargado_incluido_el_pdf`, `test_prohibido_antes_que_invalido_en_sectores`, `test_prohibido_responde_403_antes_que_el_422_del_cuerpo`) y la suite existente de M1 a M6 con el encargado por defecto | COMPLIANT |
| CA Visibilidad en la interfaz (7 esc.) | `Sidebar.test.tsx` (encargado todo, mozo sin Reportes, chef sin Salón, Pagos ni Reportes, unión de roles), `App.rutas.test.tsx` (chef a `/pagos` o `/salon` va al inicio sin llamar a pagos; mozo a reportes va al inicio), `guardas.test.tsx`, `SalonPage.roles.test.tsx`, `AtencionPage.roles.test.tsx`, `ReservasPage.roles.test.tsx`, `PagosPage.roles.test.tsx`, `Inicio.roles.test.tsx`, `client.test.ts` (403 conserva el `detalle` y la sesión) | COMPLIANT |
| SC Chefs (5 req., 23 esc.) | `salon/test_credenciales_service.py` (alta transaccional, DNI y correo repetidos sin huérfanos, carrera `IntegrityError` con rollback, conservar contraseña, cambio de clave invalida sesiones, 404, baja, baja repetida 409, correos en una consulta), `test_credenciales_router.py` (201, listado con `limit`/`estado`/`limit=101`, PUT, baja, el chef inicia sesión con `roles` y nombre), `test_credenciales_schemas.py`, `test_credenciales.py` (7, 8, 72 y 73 bytes, multibyte); frontend `ChefFormDialog.test.tsx`, `useFormularioChef.test.tsx`, `useBajaChef.test.tsx`, `ChefsTabla.test.tsx`, `SalonPage.test.tsx` («crea un chef desde la pestaña»), `validarPersona.test.ts` | COMPLIANT |
| SM Mozos con credenciales (4 req., 19 esc.) | mismos tests parametrizados por modelo (Mozo y Chef), `test_el_mozo_creado_inicia_sesion_con_su_rol_nombre_y_apellido`, `test_modificacion_de_persona_sin_usuario_y_sin_contrasena_es_422`, `..._con_contrasena_crea_su_usuario`, `test_baja_de_persona_sin_usuario_no_tiene_otros_efectos`; frontend `MozoFormDialog.test.tsx`, `useFormularioMozo.test.tsx`, `MozosTabla.test.tsx` («Sin usuario»), `SalonPage.roles.test.tsx` (mozo sin pestañas ni acciones) | COMPLIANT |

**Resumen**: 89 de 89 escenarios con prueba pasando. Ningún escenario UNTESTED ni FAILING.

### Auditoría de calidad de aserciones (Strict TDD, paso 5f)

Se revisaron los 63 archivos de prueba nuevos o modificados (backend y frontend, unas 600 pruebas). No hay tautologías, bucles fantasma, `toBeDefined()` solitarios ni pruebas sin llamada a código de producción. Las pruebas de la matriz comprueban valores concretos (código y `detalle`), no solo existencia. **Calidad de aserciones**: 0 CRITICAL, 0 WARNING.

### Cumplimiento TDD

| Verificación | Resultado | Detalle |
| --- | --- | --- |
| Evidencia TDD reportada | ❌ | `apply-progress.md` no tiene la tabla «TDD Cycle Evidence»; solo prosa («RED con módulo inexistente...») |
| Todas las tareas con prueba | ✅ | Cada unidad con comportamiento tiene archivo de pruebas existente |
| GREEN confirmado | ✅ | 2649 de 2649 (backend) y 1550 de 1550 (frontend) pasan hoy |
| RED confirmado | ⚠️ | Un commit por unidad: el RED previo no es verificable desde git. La tarea 10.7 declara que no tuvo RED propio (caracteriza lo construido en la unidad 8) |
| Triangulación | ✅ | Parametrización por rol, por modelo (Mozo y Chef) y por celda de la matriz |
| Safety net | ⚠️ | No reportado por tarea; la suite previa (1374 pruebas de frontend) se menciona como línea base |

**Distribución por capa**: backend unitarias y de integración con `TestClient` sobre SQLite migrado (sin pruebas E2E); frontend de integración con Testing Library (`render`, `screen`, `userEvent`) y unitarias de `permisos.ts`, `client.ts` y validadores. No hay E2E con navegador (no instalado).

**Cobertura de los archivos cambiados (backend)**: `usuarios/models.py`, `repository.py`, `schemas.py`, `shared/permisos.py`, `shared/seguridad.py`, `shared/credenciales.py`, `salon/{models,repository,router,schemas}.py` al 100 %; `usuarios/service.py` 96 % (líneas 120, 157, 170, 193-194); `usuarios/router.py` 96 % (36); `salon/service.py` 98 % (139-141); `salon/personas.py` 99 % (61). **Frontend**: `shared/auth` 98,14 % de líneas, `client.ts` 98,03 %, `LoginPage.tsx` 97,56 %, `Sidebar.tsx` 100 %. Todo por encima de 80 %.

### Corrección (evidencia estática)

| Punto pedido | Estado | Evidencia |
| --- | --- | --- |
| Matriz acordada en `shared/permisos.py` | ✅ | Encargado todo; Mozo: `CARTA_VER`, `MENUS_VER`, `SALON_VER`, `COMANDAS_VER/OPERAR`, `CLIENTES_GESTIONAR`, `RESERVAS_VER/OPERAR`, `PAGOS_OPERAR`; Chef: `CARTA_VER`, `MENUS_VER`, `COMANDAS_VER`, `RESERVAS_VER`. Sin M3 ni M6 para el chef; reportes y gestión solo del encargado |
| Routers coinciden con la matriz | ✅ | 89 `requiere(...)` sobre 92 decoradores: los 3 restantes son `POST/GET/DELETE /sesion` (públicas o solo con sesión). Se contrastó fila a fila con las tablas de `control-de-acceso`, incluidos todos los `/reportes/*` y sus `/pdf` con `REPORTES_VER`, `GET /medios-de-pago` y facturas con `PAGOS_OPERAR`, `/mozos` y `/chefs` (también GET) con `SALON_GESTIONAR` |
| Matriz espejo del frontend | ✅ | `shared/auth/permisos.ts` con los mismos 14 permisos y las mismas asignaciones por rol |
| Contraseñas con bcrypt, nunca devueltas ni registradas | ✅ | `bcrypt.hashpw` con sal; `UsuarioSalida` y las `*Salida` no tienen contraseña ni hash; el manejador 422 no repite el valor recibido; el único `logging` del backend es el aviso de transacción lenta; el script usa `getpass` y no imprime la clave |
| Tokens con hash y 8 h | ✅ | `secrets.token_urlsafe(32)`, se guarda `sha256` en `token_hash` (único), `vence_en = ahora + 8 h`, sin renovación, comparación `vence_en <= ahora` |
| 401 sin sesión y 403 sin permiso en cada endpoint | ✅ | Prueba de completitud sobre `app.routes` (solo `POST /sesion` y `GET /salud` públicas); `/media` queda público por S9 |
| Ruta prohibida redirige al inicio | ✅ | `RutaConPermiso` navega a `/`; probado con chef en `/pagos` y `/salon` |
| Inicio de sesión por correo | ✅ | `SesionCrear.correo`; comparación con `casefold()` y recorte |
| Cada página carga solo lo que su rol puede leer | ✅ | `Inicio` monta mapa y caja según permiso; Atención no pide `/clientes` ni `/mesas` sin `CLIENTES_GESTIONAR`/`COMANDAS_OPERAR`; Salón del mozo no consulta mozos ni chefs; Reservas usa `/reservas/mesas-disponibles` y solo busca clientes dentro del formulario de alta |
| Sin `fetch` en componentes ni `any` | ✅ | Los dos únicos `fetch(` están en `shared/api/client.ts`; sin `any` fuera de pruebas |
| Funciones de hasta 50 líneas y complejidad 10 | ✅ | Ruff (`PLR0915`, `C901`) y ESLint (`max-lines-per-function`, `complexity`) pasan; ver SUGGESTION 2 |
| Sin secretos en el repositorio | ✅ | Sin `.env` versionado; `.env.example` solo trae `BCRYPT_RONDAS=12`; sin correos ni claves reales fuera de pruebas |
| Contratos de import-linter | ✅ | 13 cumplidos, 0 rotos; `seguridad -> usuarios.service` es la única excepción declarada |
| Dependencia nueva con versión exacta | ✅ | `bcrypt==5.0.0` (§9.7; falta el acuerdo del equipo, ver WARNING 3) |

### Criterios de aceptación del issue #172 (texto real leído con `gh issue view 172`)

| # | Criterio | Estado |
| --- | --- | --- |
| 1 | Sin sesión no se puede usar el sistema, ni desde el frontend ni desde la API | ✅ `RutaProtegida` y 401 en toda la API, ambos con prueba |
| 2 | Cada rol accede solo a lo que le corresponde y un acceso no permitido devuelve 403 | ✅ matriz completa por celda |
| 3 | Las contraseñas se guardan con hash (RNF-SEG-03) | ✅ bcrypt con sal, probado |
| 4 | CI en verde y cobertura según RNF-MAN-04 | ✅ en local con los comandos de la CI: backend 98,55 % (≥ 70 %), frontend 88,22 % (≥ 60 %). La CI remota no se ejecutó en esta fase |

### Coherencia con el diseño

| Decisión | ¿Se siguió? | Notas |
| --- | --- | --- |
| A1 módulo `usuarios` con cinco capas | ✅ | |
| A2 `seguridad.py` importa solo `usuarios.service` | ✅ | Excepción explícita en import-linter |
| A3 matriz única sin FastAPI | ✅ | |
| A4 `dependencies=[requiere(...)]` por decorador | ✅ | Con prueba de completitud (P5) |
| A5 token opaco con hash y 8 h | ✅ | |
| A6 bcrypt directo y hash ficticio | ✅ | `_hash_ficticio` con `lru_cache` |
| A7 `usuario_roles` con PK compuesta | ✅ | |
| A8 `usuario_id` nulo y único en `mozos` y `chefs` | ✅ | Migración y prueba del índice único |
| A9 mixin `_DatosPersona` | ⚠️ | Se implementó con `salon/personas.py` parametrizado por tipo (documentado en `apply-progress.md`) |
| A10 `NoAutenticadoError` y `SinPermisoError` | ✅ | |
| A11 `flush` sin `commit` | ✅ | `test_registrar_usuario_no_confirma_la_transaccion` |
| A12 encargado por defecto en `conftest` | ✅ | |
| A13 contratos de import-linter | ✅ | |
| Contrato de `GET /sesion` | ⚠️ | Devuelve `UsuarioSalida` (la spec), no `UsuarioSesion` (el diseño); documentado |

### Problemas encontrados

**CRITICAL**

1. **Falta la tabla «TDD Cycle Evidence» en `apply-progress.md`.** El modo es Strict TDD y el módulo de verificación exige esa tabla por tarea (RED, GREEN, TRIANGULATE, SAFETY NET, REFACTOR). El archivo solo tiene resúmenes en prosa por lote, y los commits son uno por unidad, así que el orden RED a GREEN no se puede reconstruir desde git. Los datos sustantivos sí están verificados aquí (los archivos de prueba existen y pasan, hay triangulación), por lo que es un defecto de evidencia y no de comportamiento. Arreglo: completar la tabla en `apply-progress.md` (sin tocar código). Si la persona decide aceptar la prosa como evidencia, el resultado pasa a PASS WITH WARNINGS.

**WARNING**

1. Las tareas 4.1 a 4.5 de `tasks.md` siguen sin marcar. Esta verificación ejecutó y respalda 4.1 y 4.2 (salidas arriba) y 4.4 (tabla de criterios), pero falta `git pull origin develop` (4.3) y reunir las notas del PR (4.5). Marcarlas es trabajo del orquestador.
2. La tarea 10.7 (403 inesperado conserva el `detalle` y la sesión) caracteriza un comportamiento ya construido en la unidad 8 y no tuvo RED propio; está cubierta por `client.test.ts` pero no cumple el ciclo estricto.
3. `bcrypt==5.0.0` es una dependencia nueva que el equipo debe acordar antes de integrar (AGENTS.md §9.7, S11); la versión se tomó de `pip index versions` según `apply-progress.md`.
4. Diferencias entre el issue #172 y la spec que conviene anotar en el PR (S12): el issue habla de «nombre de usuario», de un rol «cajero» y de un «ABM de usuarios», y supone que el chef no tiene rol. La implementación usa correo, tiene los roles encargado, mozo y chef (sin cajero) y no ofrece un ABM de usuarios aparte (los usuarios nacen con el alta de mozos y chefs; los encargados se crean por script). Son decisiones previas de la persona, pero el issue no las refleja.
5. Cambios en archivos de otros responsables (routers de M1, M2, M4, M5 y M6, `main.py`, `pyproject.toml`, `requirements.txt`, `alembic/env.py`, y dos pruebas de M4 que armaban su propia app): AGENTS.md §9.3 exige avisarlo en el PR; la nota transversal ya está prevista en la tarea 4.5.
6. `apply-progress.md` dice «28 de 28» tareas del frontend; `tasks.md` tiene 24 en las unidades 8 a 11. Corregir el recuento.
7. Tamaño: `git diff --shortstat` contra `develop` da 185 archivos, 10014 inserciones y 1386 borrados (backend y frontend: 172 archivos, 8497 inserciones), muy por encima del punto de control de 800 líneas por lado. Aceptado por la persona (single-pr, AGENTS.md §4); se deja constancia para el PR.

**SUGGESTION**

1. FastAPI publica `/docs` (y `/openapi.json`) sin sesión (`FastAPI(..., docs_url="/docs")`). No expone datos, pero describe toda la API; evaluar protegerlo o desactivarlo fuera de desarrollo. Es anterior a esta HU.
2. La función `upgrade` de la migración `b8d0f2a4c6e8_crea_usuarios_sesiones_y_chefs.py` mide 53 líneas (ruff no la marca porque tiene menos de 50 sentencias). Dividirla en funciones por tabla la dejaría dentro de RNF-MAN-05 si la guía se aplica a migraciones.
3. No hay pruebas E2E con navegador; el flujo completo (login, recarga, cierre, URL prohibida) se cubre con integración de componentes y `fetch` simulado. Valdría una pasada manual con `npm run dev` por rol antes del PR.
4. La CI remota no se ejecutó aquí; confirmar que queda en verde en el PR.

### Veredicto

**FAIL** (1 CRITICAL, 7 WARNING, 4 SUGGESTION). La razón es solo la evidencia TDD ausente en `apply-progress.md`. La implementación cumple los 19 requisitos y los 89 escenarios con pruebas que pasan, la matriz de permisos coincide con la acordada, y los cuatro criterios del issue #172 se cumplen en local.
