# Diseño: HU-TR-01 Inicio de sesión y usuarios con roles

- **Issue:** #172 · **Rama:** `feature/HU-TR-01-login-y-roles` · **Entrada:** `proposal.md` (matriz de permisos, S1 a S12), D-13, D-25, D-26 y S0-05 §3.3.

## Enfoque técnico

Un módulo nuevo `app/modules/usuarios/` es dueño de `Usuario`, sus roles y `Sesion`, con sus cinco capas y el router `/sesion`. `shared/seguridad.py` es el adaptador HTTP de D-13: lee `Authorization: Bearer`, resuelve el usuario con `usuarios.service` y verifica un `Permiso`. La matriz rol → permisos vive en un único archivo sin FastAPI (`shared/permisos.py`). Cada `router` declara un permiso por endpoint. Los `service` de M1, M2, M4, M5 y M6 no cambian. El `service` de salón crea, actualiza y deshabilita el `Usuario` vinculado mediante `usuarios.service`, dentro de su propia transacción. En el frontend, `shared/auth/` tiene el proveedor de sesión, la matriz espejo y los guardas de ruta; `client.ts` agrega el token y reacciona al 401.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| A1 | Ubicación de `Usuario` y `Sesion` | Módulo `modules/usuarios/` (router, service, repository, models, schemas) | `shared/models/` con consultas en `shared/seguridad.py` | Las consultas tienen que vivir en un `repository` (D-02). Un módulo propio queda cubierto por los contratos de importación existentes. |
| A2 | Dependencia de seguridad | `shared/seguridad.py` importa solo `app.modules.usuarios.service` | Dependencia dentro de `usuarios/` | D-13 la ubica en `shared/`. Si estuviera en `usuarios/`, los otros routers importarían algo que no es un `service` (§3.3). La excepción se declara de forma explícita en import-linter (A13). |
| A3 | Matriz única (backend) | `shared/permisos.py`: `Permiso` (StrEnum), `PERMISOS_POR_ROL` y `permisos_de(roles)`; `Rol` en `shared/models/enums.py` | Roles en cada endpoint (`roles=[...]`) | Si los routers declaran capacidades y no roles, cambiar quién puede hacer qué toca un solo archivo. `usuarios.service` la usa sin importar FastAPI. |
| A4 | Declaración en routers | `dependencies=[requiere(Permiso.X)]` en cada decorador | Matriz por ruta y método aplicada en `include_router` | Es explícita y sobrevive a un cambio de ruta. La alternativa no toca los routers, pero un endpoint renombrado queda fuera de la matriz sin aviso. Un test de completitud (P5) cubre el olvido. |
| A5 | Token | `secrets.token_urlsafe(32)`; se guarda `sha256(token).hexdigest()` en `sesiones.token_hash` (único); `vence_en = creada_en + 8 h`, sin renovación | JWT | Decidido en la propuesta. Con un token opaco, el cierre de sesión y la baja lo invalidan en el servidor. Si se filtra la base, el hash no sirve como token. |
| A6 | Contraseñas | `bcrypt.hashpw`/`checkpw` directo; rondas en `Settings.bcrypt_rondas` (12; 4 en pruebas) | `passlib` | Es una sola dependencia (S11). `passlib` no tiene mantenimiento. **Supuesto:** `bcrypt==5.0.0`; confirmar la versión exacta en PyPI antes de fijarla (§9.7). Con un correo inexistente se compara contra un hash ficticio para igualar los tiempos. |
| A7 | Roles múltiples | Tabla `usuario_roles(usuario_id, rol)` con PK compuesta | Derivar el rol del vínculo con `Mozo`/`Chef` | Para derivarlo, `usuarios` tendría que consultar tablas de salón. La tabla admite varios roles sin cambiar el esquema (S3). |
| A8 | Vínculo con la persona | `mozos.usuario_id` y `chefs.usuario_id`: FK nula y única hacia `usuarios.id` | `usuarios.mozo_id` | El que conoce a la persona es salón, y `usuarios` no depende de M3. La FK se declara como texto (`"usuarios.id"`) y no importa modelos ajenos. |
| A9 | `Chef` | Mixin `_DatosPersona` en `salon/models.py`; helpers del `service` y del `repository` parametrizados por modelo (`Mozo`/`Chef`) | Copiar todo el código de `Mozo` | Evita duplicar código (RNF-MAN-10). Las tablas siguen separadas (S1). |
| A10 | Errores 401 y 403 | `NoAutenticadoError` (401, con `WWW-Authenticate: Bearer`) y `SinPermisoError` (403) en `shared/excepciones.py`, con sus manejadores en `main.py` | `HTTPException` | Mantiene un solo mecanismo y el formato `{"detalle"}` (D-26, S10). |
| A11 | Transacción | `usuarios.service.registrar_usuario`, `actualizar_credenciales` y `deshabilitar_usuario` hacen `flush` sin `commit`; confirma el que llama | Que cada `service` confirme por su cuenta | Así la persona y su usuario se guardan juntos o no se guarda ninguno (D-10). Hay un precedente: `salon.service.ocupar_mesa`. |
| A12 | Pruebas existentes | `conftest.cliente` reemplaza `usuario_actual` por un encargado (`dependency_overrides`) | Iniciar sesión en cada prueba | No hay que tocar las pruebas de los seis módulos. `requiere()` sigue verificando el permiso. |

## Matriz de permisos (API)

| Permiso | Endpoints | E | M | C |
| --- | --- | --- | --- | --- |
| `CARTA_VER` / `CARTA_GESTIONAR` | GET de platos, postres, bebidas, secciones, `/productos` y `/carta` / POST, PUT y baja | ✓/✓ | ✓/– | ✓/– |
| `MENUS_VER` / `MENUS_GESTIONAR` | GET de menús y promociones / POST, PUT, baja y finalizar | ✓/✓ | ✓/– | ✓/– |
| `SALON_VER` / `SALON_GESTIONAR` | GET `/mesas` y `/sectores` / todo lo demás de M3, incluidos `/mozos` y `/chefs` | ✓/✓ | ✓/– | –/– |
| `COMANDAS_VER` / `COMANDAS_OPERAR` | GET de `/comandas` (lista, detalle, `detalles`, `pendientes`) / POST, PUT, cerrar, reabrir, anular y entrega | ✓/✓ | ✓/✓ | ✓/– |
| `CLIENTES_GESTIONAR` | GET y PUT de `/clientes` | ✓ | ✓ | – |
| `RESERVAS_VER` / `RESERVAS_OPERAR` | GET de reservas y `mesas-disponibles` / POST, PUT, cancelaciones y `/comanda` | ✓/✓ | ✓/✓ | ✓/– |
| `PAGOS_OPERAR` / `PAGOS_GESTIONAR` | GET de medios, facturas (incluida `previsualizar`) y comprobantes con su PDF; POST de facturas y cobros / POST, PUT y DELETE de medios (S7) | ✓/✓ | ✓/– | –/– |
| `REPORTES_VER` | Todo `/reportes/*`, incluidos los PDF y `caja-del-dia` (S7) | ✓ | – | – |

Públicos (S9): `GET /salud`, `POST /sesion` y `/media`. `GET` y `DELETE /sesion` solo exigen una sesión válida.

## Flujo de datos

```
LoginPage ─POST /sesion {correo, contrasena}─→ usuarios.router → service.iniciar_sesion
   1. repository.obtener_por_correo_normalizado → bcrypt.checkpw (hash ficticio si no existe)
   2. usuario inexistente, DESHABILITADO o clave mala → NoAutenticadoError «Correo o contraseña incorrectos»
   3. borra sesiones vencidas; agrega Sesion(token_hash, vence_en); commit
   └→ 201 SesionIniciada {token, vence_en, usuario}

Solicitud protegida ─Bearer─→ requiere(P) → usuario_actual
   usuarios.service.usuario_de_token(db, token): hash → sesión vigente y usuario HABILITADO, o None → 401
   P ∉ usuario.permisos → 403 · si pasa → router → service del módulo (sin cambios)

salon.service.crear_mozo(datos) → validar DNI y correo libres → usuarios.service.registrar_usuario
   (flush, rol MOZO) → Mozo(usuario_id) → commit · IntegrityError → rollback + 409
```

## Contratos

**Modelos (`usuarios/models.py`):** `Usuario(id, correo String(254), correo_normalizado String(254) único (casefold con @validates, como Sector), contrasena_hash String(60), estado Estado)`; `UsuarioRol(usuario_id FK CASCADE, rol Enum(Rol, native_enum=False))` con PK compuesta; `Sesion(id, token_hash String(64) único, usuario_id FK CASCADE con índice, creada_en, vence_en)`. Las fechas son `DateTime` sin zona horaria, en UTC (`datetime.now(UTC).replace(tzinfo=None)`). **Salón:** `Chef` con los mismos campos que `Mozo` (`ux_chefs_dni`); `usuario_id` nulo en `mozos` y `chefs` (`ux_<tabla>_usuario_id`).

**Contrato compartido (`shared/contratos/usuario.py`):** `UsuarioSesion(id, correo, roles: list[Rol], permisos: list[Permiso], vence_en)`; lo usan `seguridad.py` y `usuarios.router`. **Tipos (`shared/credenciales.py`):** `Correo` (recortado, 254 como máximo, patrón simple `^[^@\s]+@[^@\s]+\.[^@\s]+$`, S2) y `ContrasenaNueva` (de 8 a 72 bytes en UTF-8, con un `field_validator`).

```python
# shared/seguridad.py
def usuario_actual(cred: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))], db: Sesion) -> UsuarioSesion: ...
def requiere(permiso: Permiso) -> params.Depends:  # el verificador expone .permiso para el test P5
```

**API (`usuarios/router.py`):**

| Ruta | Respuesta | Errores |
| --- | --- | --- |
| `POST /api/v1/sesion` | 201 `SesionIniciada` | 401 genérico; 422 |
| `GET /api/v1/sesion` | 200 `UsuarioSesion` | 401 |
| `DELETE /api/v1/sesion` | 204 (borra la sesión del token) | 401 |
| `POST/PUT /mozos`, `POST/GET/PUT /chefs`, `POST /chefs/{id}/baja` | Igual que en Mozo; `*Salida` agrega `correo: str \| None` | 409 si el DNI o el correo se repiten; 422 |

`MozoCrear`/`ChefCrear` exigen `correo` y `contrasena`. `*Modificar` exige `correo`; si `contrasena` llega vacía, conserva la actual (S2). Si la persona todavía no tiene usuario (S5), la contraseña es obligatoria: `DatosInvalidosError`, 422. La baja deshabilita el usuario y borra sus sesiones (S4). El listado trae los correos en una sola consulta: `usuarios.service.correos_por_id(ids)`.

## Frontend

| Pieza | Diseño |
| --- | --- |
| `shared/auth/permisos.ts` | `Rol`, `Permiso` (los mismos nombres que en el backend), `PERMISOS_POR_ROL`, `permisosDe(roles)`. Es la única matriz del frontend. |
| `shared/auth/almacenSesion.ts` | `leerToken`, `guardarToken`, `borrarToken` sobre `sessionStorage`; el token se pierde al cerrar la pestaña, como decidió la propuesta. |
| `shared/auth/api.ts` | `iniciarSesion`, `obtenerSesion`, `cerrarSesion` con `clienteHttp` (D-16). |
| `shared/auth/{sesion-context.ts,SesionProvider.tsx,useSesion.ts}` | `{usuario, cargando, iniciarSesion, cerrarSesion, puede(permiso)}`. Al montarse, si hay token, llama a `GET /sesion`. Si no hay proveedor, `useSesion` lanza un error: si falta, no se concede nada en silencio. |
| `shared/api/client.ts` | `solicitar` y `obtenerArchivo` (los PDF) agregan `Authorization: Bearer` cuando hay token. Si llega un 401 a una solicitud que llevaba token, borra el token y llama al manejador que registró el proveedor (`registrarSesionVencida`). El 401 de `POST /sesion` no dispara ese manejador. `urlDelBackend` (`<img src>` de `/media`) no lleva token, porque `/media` es público (S9). |
| `shared/auth/{LoginPage,RutaProtegida,RutaConPermiso}.tsx` | `/login` va fuera de `AppShell`. `RutaProtegida` redirige a `/login` y conserva la ruta de origen. `RutaConPermiso` redirige al inicio (decisión de la persona: sin pantalla de «acceso denegado»). `App.tsx` envuelve cada ruta con su permiso de VER y los reportes con `REPORTES_VER`. |
| `layout/navegacion.ts`, `Sidebar`, `Navbar`, `AppShell` | `ElementoNavegacion.permiso`. `Sidebar` filtra los elementos con `puede`. Título: «Salón, Mozos y Chefs» (S8). `MenuUsuario` en `acciones` muestra el correo, los roles y el botón «Cerrar sesión». |
| `Inicio` | **Supuesto:** `MapaDelLocal` se muestra solo con `SALON_VER` y `RESERVAS_VER`; `EstadoDeCaja`, solo con `REPORTES_VER`; cada acceso rápido, solo con su permiso de operación. |
| Páginas de M1, M2, M4, M5 y M6 | Las acciones de alta, edición y baja se ocultan con `puede(...)`; las tablas reciben `onEditar` u `onEliminar` como `undefined` y no muestran la columna de acciones. Una página que combina datos de varios módulos carga solo lo que el rol puede leer: por ejemplo, el catálogo de mesas de la comanda se carga solo con `COMANDAS_OPERAR`. |
| Salón | Pestaña «Chefs». `CamposCredenciales` es compartido. Hooks genéricos `useFormularioPersona` y `useBajaPersona`, con envoltorios para Mozo y Chef. `validarPersona.ts` amplía `validarMozo`. `SeccionesDelSalon` pasa a su propio archivo, para que `SalonPage` no supere el límite de RNF-MAN-05. El mozo solo ve las pestañas Sectores y Mesas, sin acciones. |

## Cambios en archivos

| Archivo | Acción | Compartido |
| --- | --- | --- |
| `backend/app/modules/usuarios/{__init__,models,schemas,repository,service,router}.py` | Crear | No |
| `backend/app/shared/{seguridad,permisos,credenciales}.py`, `shared/contratos/usuario.py`, `shared/models/enums.py` (`Rol`), `shared/excepciones.py` | Crear o modificar | **Sí** |
| `backend/app/main.py` (router y manejadores 401/403), `config.py` (`bcrypt_rondas`), `alembic/env.py` | Modificar | **Sí** |
| `backend/alembic/versions/<rev>_crea_usuarios_sesiones_y_chefs.py` | Crear (`down_revision = "c3e5a7b9d1f2"`) | **Sí** |
| `backend/app/modules/salon/{models,schemas,repository,service,router}.py` | `Chef`, credenciales, `usuario_id` | No |
| `backend/app/modules/{productos,menus,atencion,reservas,pagos}/router.py` | `dependencies=[requiere(...)]` | **Sí** (otros responsables) |
| `backend/pyproject.toml` | Contratos de import-linter (A13) | **Sí** |
| `backend/requirements.txt`, `.env.example`, `backend/scripts/crear_encargado.py` | Modificar o crear | **Sí** |
| `backend/tests/conftest.py`, `tests/shared/test_{seguridad,matriz_permisos}.py`, `tests/modules/usuarios/*`, `tests/modules/salon/*` | Crear o modificar | Sí / No |
| `frontend/src/shared/{auth/*,api/client.ts,components/layout/*,components/Inicio.tsx,components/inicio/AccesosRapidos.tsx}`, `App.tsx`, `AppProviders.tsx`, `test/setup.ts`, `test/sesionDePrueba.ts` | Crear o modificar | **Sí** |
| `frontend/src/modules/salon/**` | Chefs y credenciales | No |
| `frontend/src/modules/{productos,menus,atencion,reservas,pagos}/pages` y `components` | Ocultar acciones | **Sí** |
| `SPRINT-0/G3 - Diagrama de clases unificado.drawio`, `SPRINT-0/S0-05-arquitectura.md` (D-25: 401 y 403), `FLUJO_DIARIO.md` | Modificar | **Sí** |

**A13. Contratos de import-linter:** (1) «Otros modulos solo usan el service de usuarios»: los seis módulos y `app.shared` no pueden importar `usuarios.{router,repository,models,schemas}`. (2) `app.modules.usuarios` se agrega como origen en los seis contratos que ya existen. (3) «Solo los router usan seguridad (D-13)»: `app.modules.*.{service,repository,models,schemas}` no pueden importar `app.shared.seguridad`. (4) «shared no importa modulos»: `app.shared` no puede importar `app.modules`, con `ignore_imports = ["app.shared.seguridad -> app.modules.usuarios.service"]`. Hoy ningún archivo de `shared/` importa módulos.

**Script del primer encargado:** `python -m scripts.crear_encargado --correo <correo>` pide la contraseña con `getpass` dos veces, así que no queda en el historial ni en el repositorio (S6, RNF-SEG-04). Llama a `usuarios.service.crear_encargado`, que valida y confirma. **Supuesto:** si el correo ya existe, el script termina con un error y no agrega el rol.

## Estrategia de pruebas (Strict TDD)

| # | Capa | Qué | Cómo |
| --- | --- | --- | --- |
| P1 | `usuarios` (service y router) | Inicio correcto; clave incorrecta, correo inexistente y usuario deshabilitado responden el mismo 401; el hash es distinto de la clave; sesión vencida → 401 (`vence_en` modificado en la base); cierre de sesión → el token deja de valer; `GET /sesion` | Tokens reales con `cliente_sin_sesion`; `BCRYPT_RONDAS=4` en `conftest` |
| P2 | `seguridad` | Sin encabezado, con un esquema que no es Bearer o con un token desconocido → 401 con `WWW-Authenticate`; sin el permiso → 403 `{"detalle"}`; con varios roles se suman los permisos | Una ruta de prueba montada en una app aislada |
| P3 | Matriz | Una fila por celda (método, ruta, rol): permitido → ni 401 ni 403; negado → 403 | `cliente_con_rol(rol)` reemplaza `usuario_actual` con un `UsuarioSesion` del rol |
| P4 | Salón | Alta, modificación, baja y listado de Chef; credenciales de Mozo y Chef; correo repetido → 409; contraseña vacía en la modificación conserva la actual; mozo sin usuario (S5); la baja invalida las sesiones; contraseña de 7 y 73 bytes → 422 | Fixtures de `tests/modules/salon/conftest.py`; se actualizan las pruebas de Mozo que ya existen |
| P5 | Completitud | Cada `APIRoute` de `/api/v1`, salvo las públicas, tiene un verificador con `.permiso` | Recorre `app.routes` |
| P6 | Migración y script | `upgrade head`/`downgrade -1`; `crear_encargado` con `getpass` simulado | Igual que `test_migracion` |
| P7 | Frontend | `client.ts` (encabezado, 401 → manejador, el 401 del inicio de sesión no lo dispara); `permisos.ts`; proveedor de sesión; `LoginPage`; guardas; `Sidebar` por rol; `SalonPage` por rol; formularios de Chef y credenciales | `setup.ts` simula `useSesion` con un encargado por defecto; `sesionDePrueba(roles)` cambia el rol en cada prueba; las pruebas de `shared/auth` usan `vi.unmock` |

## Matriz de amenazas

No aplica: el cambio no incluye comandos de shell, subprocesos, automatización de VCS o PR, ni clasificación de ejecutables. Los riesgos propios de la autenticación se cubren en P1, P2, P3 y P5.

## Migración y despliegue

Una revisión crea `usuarios`, `usuario_roles`, `sesiones` y `chefs`. En `mozos` agrega `usuario_id` con `batch_alter_table`, `fk_mozos_usuario_id` y `ux_mozos_usuario_id`. `downgrade` lo hace en orden inverso. Antes del PR: `alembic heads` y `git pull origin develop`, por si otro PR agregó revisiones. Una base existente queda sin usuarios hasta que se corre `crear_encargado`; se documenta en `FLUJO_DIARIO.md` (S5, S6).

## Tamaño estimado

| Lado | Código | Pruebas | Total |
| --- | --- | --- | --- |
| Backend | ≈ 650 | ≈ 700 | ≈ 1350 |
| Frontend | ≈ 900 | ≈ 700 | ≈ 1600 |

Un solo PR por decisión de la persona; supera el punto de control de 800 líneas por lado.

## Preguntas abiertas

- [ ] Versión exacta de `bcrypt` y el acuerdo del equipo (A6, S11).
- [ ] Confirmar que `vi.mock` en `setupFiles` aplica a todos los archivos de prueba; si no, usar un envoltorio en cada prueba afectada.
- [ ] Inicio para el chef y el mozo (supuesto de la tabla Frontend) y el comportamiento del script si el correo ya existe.
- [ ] Revisar en la implementación las páginas que combinan endpoints de varios módulos (Reservas → `/clientes`, Atención → `/mesas`) para que el chef no reciba un 403 al ver.
