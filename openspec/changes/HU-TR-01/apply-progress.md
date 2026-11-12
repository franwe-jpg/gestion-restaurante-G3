# Progreso de implementación: HU-TR-01 Inicio de sesión y usuarios con roles

Modo: Strict TDD. Rama `feature/HU-TR-01-login-y-roles`. Un commit por unidad de trabajo.

## Lote 1: backend, unidades 1 a 7 (completo, 37 de 37 tareas)

| Unidad | Commit | Estado |
| --- | --- | --- |
| 1 Base compartida | `feat: agrega la base compartida de roles, permisos, credenciales y errores 401 y 403` | Hecha |
| 2 Migración y modelos | `feat: agrega la migración y los modelos de usuarios, sesiones y chefs` | Hecha |
| 3 Módulo `usuarios` y `/sesion` | `feat: agrega el módulo usuarios con inicio, consulta y cierre de sesión` | Hecha |
| 4 Seguridad y `conftest` | `feat: agrega la dependencia requiere de seguridad y el encargado por defecto en las pruebas` | Hecha |
| 5 Salón (Chef y credenciales) | `feat: agrega chefs y credenciales de mozos al módulo salón` | Hecha |
| 6 Permisos en los routers | `feat: exige sesión y permiso por rol en los routers de los seis módulos` | Hecha |
| 7 import-linter y script | `feat: agrega los contratos de importación de seguridad y el script del primer encargado` | Hecha |

Pendiente: documentación (3.x) y verificación final (4.x). Las unidades 8 a 11 (frontend) están en el lote 2.

## Supuestos y desviaciones para validar

- Supuesto: `bcrypt==5.0.0`, la última versión estable en PyPI al 11/11/2026 (`pip index versions bcrypt`). Es una dependencia nueva (AGENTS.md §9.7, S11): el equipo debe acordarla.
- `ConflictoError` no existe en `shared/excepciones.py`: el 409 usa `ReglaDeNegocioError`, como el resto de los módulos.
- `GET /sesion` devuelve `UsuarioSalida {id, correo, roles, nombre, apellido}` (la spec), no `UsuarioSesion` (el diseño). `UsuarioSesion` queda como contrato interno entre `seguridad.py` y `usuarios.service`. El frontend deriva los permisos de los roles con su matriz espejo.
- `usuarios.repository` lee `nombre` y `apellido` de `mozos` y `chefs` con `sa.table()` (sin importar los modelos de salón), para no violar el contrato de importación ni crear un ciclo con `salon.service`.
- Los mensajes 409 de correo repetido usan el correo normalizado (en minúsculas y sin espacios), como en el ejemplo de la spec.
- Para el primer encargado, `crear_encargado` valida con los mismos tipos `Correo` y `ContrasenaNueva` y devuelve `DatosInvalidosError`; el script informa el motivo por `stderr` y termina con código 1.
- Orden de las unidades 3 y 4: el router `/sesion` necesita `usuario_actual`, así que `shared/seguridad.py` (con `usuario_actual` y `esquema_bearer`) y la fixture `cliente_sin_sesion` se adelantaron a la unidad 3. La unidad 4 agregó `requiere()`, su prueba en app aislada y el encargado por defecto en `cliente`. Además, la fixture `fabrica_usuario` vive en `tests/conftest.py` (no en `tests/modules/usuarios/`) para que la usen también `tests/shared`.
- Lógica compartida de Mozo y Chef en `salon/personas.py` (parte del service, parametrizada por tipo), con `service.py` como fachada. El contrato de importación «service no importa FastAPI» se mantiene.
- La baja de chef se llama `dar_de_baja_chef` (igual que `dar_de_baja_mozo`), no `baja_chef`.
- Tarea 2.5: no hizo falta ajustar pruebas previas; ninguna usaba `downgrade -1`.
- Las dos pruebas de M4 que armaban su propia app (`cliente_m4` y `test_app_principal_registra_get_put_sin_alta_ni_baja`) necesitaron el override de `usuario_actual`; es la única prueba existente que se tocó fuera de Mozo (archivo de otro responsable: anotar en el PR).
- Las pruebas existentes de Mozo (`test_mozo_service`, `test_mozo_router`, `test_mozo_schemas`) se actualizaron al contrato nuevo (correo y contraseña en el alta y la modificación; `correo` en la salida).
- `.env.example` ya incluye `BCRYPT_RONDAS=12` (tarea 3.3 de documentación, adelantada con la unidad 1).
- `S1-03-estandares-backend.md` actualizado con los contratos nuevos (AGENTS.md regla 8).
- Se instaló `bcrypt==5.0.0` en el entorno virtual compartido del repositorio principal para poder correr las pruebas.

## Tamaño aproximado

Backend de este lote: 53 archivos, +3148 -179 líneas (código ≈ 1250 y pruebas ≈ 1900). Supera las 800 líneas, aceptado por decisión de la persona (single-pr).

## Verificación del lote (desde `backend/`)

- `ruff check .`: All checks passed. `ruff format --check .`: 184 files already formatted.
- `lint-imports`: 13 contratos cumplidos, 0 rotos.
- `pytest` (suite completa): 2649 passed, cobertura 98,55 % (mínimo 70 %).
- `alembic upgrade head` / `downgrade -1` / `upgrade head`: sin errores; `alembic heads`: una sola cabeza (`b8d0f2a4c6e8`).

## Lote 2: frontend, unidades 8 a 11 (completo, 28 de 28 tareas)

Modo: Strict TDD (RED con módulo inexistente o prueba nueva que falla, GREEN, refactor de lint). Commits: unidad 8 `2aaf68c`, 9 `8755fc1`, 10 `b180471`, 11 el commit de salón.

| Unidad | Qué quedó |
| --- | --- |
| 8 | `shared/auth` (permisos espejo, almacén en `sessionStorage`, `api.ts`, `SesionProvider`, `useSesion`), `client.ts` con Bearer y 401, `test/setup.ts` con `useSesion` simulado (encargado por defecto) y `sesionDePrueba` (`usarRoles`, `sinSesion`). `vi.mock` en `setupFiles` aplica a todos los archivos (resuelve la pregunta abierta). |
| 9 | `LoginPage`, `RutaProtegida`, `RutaConPermiso` (redirige al inicio), `App.tsx`, menú filtrado, `MenuUsuario` con «Cerrar sesión». |
| 10 | Acciones ocultas en M1, M2, M4, M5, M6 e inicio; Atención del chef con «Ver detalle» de solo lectura; sin `/clientes` ni `/mesas` para el chef; `Inicio` sin mapa ni caja si el rol no los lee. |
| 11 | `Chef` y credenciales en salón: `types`/`api`, `validarPersona` (renombra `validarMozo`), `useFormularioPersona`/`useBajaPersona`/`usePersonasDelSalon` genéricos con envoltorios Mozo y Chef, `CamposCredenciales`, `CamposPersona`, `PersonaFormDialog`, `ChefFormDialog`, `PersonasTabla`, `ChefsTabla`, `SeccionesDelSalon`, `DialogosSalon`, `SalonPage` por rol. |

Supuestos y desviaciones del lote:
- Tarea 10.1: no existen botones de reporte o PDF dentro de los módulos; los reportes se protegen con la ruta (`REPORTES_VER`) y el menú.
- Tarea 10.7: la prueba del 403 inesperado caracteriza un comportamiento ya construido en la unidad 8 (no tuvo RED propio).
- Facturar en Atención exige además `PAGOS_OPERAR`. La página de Pagos exige `PAGOS_OPERAR` en la ruta, por eso no se repite dentro.
- El chef abre el detalle de una comanda con «Ver detalle» (mismo diálogo de entregas en solo lectura); la spec habla de «detalle» y no existía otra vista.
- Supuesto: textos nuevos («Sin usuario», «Ver detalle», ayudas de contraseña, «Elegí un módulo del menú lateral…» en el inicio del chef) para validar con el equipo.
- Diferencias con la maqueta (anotar en el PR): formularios en `Dialog`, pestaña «Chefs», columna «Correo» en Mozos y Chefs, pantalla de login con «Correo» en lugar de «Usuario».
- `node_modules` se copió del repositorio principal al worktree (ignorado por git); sin dependencias nuevas.
- El directorio `openspec/changes/HU-TR-01/` sigue sin versionar (no se incluyó en los commits del lote).

Verificación del lote (desde `frontend/`): `npm run lint` 0 errores y 0 advertencias; `format:check` limpio; `typecheck` limpio; `test:coverage` 146 archivos y 1550 pruebas pasan, cobertura 88,22 % de líneas (mínimo 60 %); `npm run build` correcto. Línea base previa: 125 archivos y 1374 pruebas.

## Lote 3: documentación (unidad 12, tareas 3.1 a 3.4)

- 3.1: `Usuario`, `Sesion`, `Chef` y el enum `Rol` en `G3 - Diagrama de clases unificado.drawio` (con las relaciones Mozo/Chef 0..1 - 1 Usuario y Usuario 1 - 0..* Sesion; `Mozo` gana `usuario`) y en la página M3 de `G3 - Diagramas por modulo.drawio`. XML validado con un parser.
- 3.2: `FLUJO_DIARIO.md` con la sección «Inicio de sesión y roles» (primer encargado, bases existentes, mozos sin usuario, `BCRYPT_RONDAS`).
- 3.3: `backend/.env.example` ya tenía `BCRYPT_RONDAS=12` (unidad 1); sin cambios.
- 3.4: `S0-05-arquitectura.md`: 401 y 403 en D-25, D-13 implementada, `usuarios/` y `shared/permisos.py` en el árbol.
- Las tareas de la fase 4 (verificación final y notas del PR) quedan para el orquestador.
