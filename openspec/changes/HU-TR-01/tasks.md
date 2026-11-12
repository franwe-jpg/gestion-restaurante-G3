# Tareas: HU-TR-01 Inicio de sesión y usuarios con roles

Convenciones: `A#` y `P#` son las decisiones y pruebas de `design.md`; `S#` son los supuestos de `proposal.md`. Los escenarios y requisitos se citan por capacidad: **AS** `autenticacion-sesion`, **CA** `control-de-acceso`, **SC** `salon-chefs`, **SM** `salon-mozos-credenciales`. Strict TDD: cada RED se escribe y se ve fallar antes de su GREEN.

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 1350 (código 650 + pruebas 700); frontend ≈ 1600 (código 900 + pruebas 700) |
| Riesgo frente al límite de revisión | Alto (ambos lados superan 800), aceptado por decisión de la persona |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR, con un commit por unidad de trabajo (12 unidades) |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | none |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: High (aceptado)

Nota: la persona decidió un solo PR sin importar el tamaño. AGENTS.md §4 fija un PR por HU y el límite 800/800 es un punto de control, no un bloqueo. No se recomienda dividir ni solicitar `size:exception`. Para facilitar la revisión, cada unidad es un commit autónomo con su prueba focalizada.

### Unidades de trabajo (commits dentro del PR único)

| Unidad | Objetivo | Commit | Prueba focalizada | Arnés de ejecución | Límite de reversión |
|--------|----------|--------|-------------------|--------------------|---------------------|
| 1 | Base compartida: `Rol`, permisos, excepciones 401/403, tipos de credenciales, `bcrypt` y configuración | `feat` | `pytest tests/shared` | N/A | `shared/*`, `config.py`, `requirements.txt` |
| 2 | Migración y modelos de `usuarios` y `Chef` | `feat` | `pytest tests/modules/usuarios/test_migracion.py` | `alembic upgrade head` / `downgrade -1` en base temporal | Revisión Alembic y `models.py` |
| 3 | Módulo `usuarios` (repository, service, schemas, router `/sesion`) | `feat` | `pytest tests/modules/usuarios` | `TestClient` con base migrada | `modules/usuarios/` y `main.py` |
| 4 | `shared/seguridad.py`, `requiere()` y `conftest` con encargado por defecto | `feat` | `pytest tests/shared/test_seguridad.py` | App aislada con ruta de prueba | `seguridad.py`, `conftest.py` |
| 5 | Salón: `Chef` y credenciales de `Mozo` | `feat` | `pytest tests/modules/salon` | `TestClient` con base migrada | `modules/salon/` y sus pruebas |
| 6 | Permisos en los routers de los seis módulos y prueba de la matriz | `feat` | `pytest tests/shared/test_matriz_permisos.py` | `TestClient` con `cliente_con_rol` | `router.py` de cada módulo |
| 7 | Contratos de import-linter y script del primer encargado | `feat` | `lint-imports`; `pytest tests/scripts` | `python -m scripts.crear_encargado` en base temporal | `pyproject.toml`, `scripts/` |
| 8 | Frontend: matriz, almacén de sesión, `client.ts` y proveedor | `feat` | `npm test -- shared/auth shared/api` | N/A | `shared/auth/`, `client.ts` |
| 9 | Frontend: login, guardas de ruta, menú y encabezado | `feat` | `npm test -- shared` | `npm run dev` y flujo manual | `App.tsx`, `layout/`, `LoginPage` |
| 10 | Frontend: acciones ocultas en M1, M2, M4, M5 y M6 e inicio | `feat` | `npm test -- productos menus atencion reservas pagos` | `npm run dev` con cada rol | `pages/` y `components/` de cada módulo |
| 11 | Frontend: salón con pestañas Chefs, credenciales y solo lectura | `feat` | `npm test -- salon` | `npm run dev` y alta manual | `modules/salon/` |
| 12 | Documentación y verificación final | `docs` | Comandos de CI completos | N/A | `.drawio`, `FLUJO_DIARIO.md`, `.env.example`, `S0-05` |

**Ruta de implementación:** las unidades 1 a 7 (backend) y 8 a 11 (frontend) tienen superficies de edición disjuntas y pueden asignarse a dos escritores paralelos. Dentro del backend el orden es secuencial (1 → 2 → 3 → 4 → 5 → 6 → 7). Dentro del frontend, 8 → 9, y luego 10 y 11 pueden ir en paralelo. El padre revisa cada diff, ejecuta la suite completa como chequeo de costura y hace los commits.

## Fase 1: Backend

### Unidad 1: Base compartida

- [x] 1.1 RED: `backend/tests/shared/test_permisos.py` — `permisos_de` por rol (E, M, C), unión de roles `MOZO`+`CHEF`, rol vacío sin permisos; cada permiso de la tabla de `design.md` asignado a los roles correctos (CA «Matriz única de permisos», «Unión de roles»; A3).
- [x] 1.2 GREEN: `Rol` en `shared/models/enums.py`; `shared/permisos.py` con `Permiso` (StrEnum), `PERMISOS_POR_ROL` y `permisos_de` (A3, sin FastAPI).
- [x] 1.3 RED: `tests/shared/test_credenciales.py` — `Correo` (recorte, 254, formato, `@` ausente) y `ContrasenaNueva` (7 → error, 8 → ok, 72 bytes → ok, 73 bytes → error, multibyte) (AS «Datos inválidos»; SC «Contraseña en el límite»; S2).
- [x] 1.4 GREEN: `shared/credenciales.py` y `shared/contratos/usuario.py` (`UsuarioSesion`).
- [x] 1.5 RED/GREEN: `NoAutenticadoError` (401, `WWW-Authenticate: Bearer`) y `SinPermisoError` (403) en `shared/excepciones.py`, con manejadores en `main.py` y prueba del formato `{"detalle"}` (AS «Sin sesión la API no se usa»; CA «Respuesta 403 sin permiso»; A10, S10).
- [x] 1.6 `Settings.bcrypt_rondas` (12; 4 en pruebas) en `config.py` y `bcrypt` con versión exacta en `requirements.txt`, tras confirmar la versión en PyPI (A6, S11, preguntas abiertas). Nota: dependencia nueva, acordar con el equipo (§9.7).

### Unidad 2: Migración y modelos

- [x] 2.1 RED: `tests/modules/usuarios/test_migracion.py` — `upgrade head` crea `usuarios`, `usuario_roles`, `sesiones` y `chefs`, agrega `mozos.usuario_id` con `ux_mozos_usuario_id`; `downgrade -1` los quita sin tocar datos de `mozos`; `alembic heads` con una sola cabeza (P6; AS «Datos»; CA «Pruebas existentes»).
- [x] 2.2 GREEN: `usuarios/models.py` (`Usuario`, `UsuarioRol`, `Sesion`; `correo_normalizado` con `@validates`, fechas UTC sin zona) (A1, A5, A7).
- [x] 2.3 GREEN: `Chef` con mixin `_DatosPersona` y `usuario_id` nulo en `mozos` y `chefs` (`ux_<tabla>_usuario_id`) en `salon/models.py` (A8, A9; SC «Datos»).
- [x] 2.4 GREEN: revisión `<rev>_crea_usuarios_sesiones_y_chefs.py` con `down_revision = "c3e5a7b9d1f2"` en modo batch y `downgrade` inverso; registrar `usuarios.models` en `alembic/env.py`. Verificar `alembic heads` y, si otra rama agregó revisiones, ajustar `down_revision`.
- [x] 2.5 Ajustar las pruebas de migración previas que usan `downgrade -1` para que bajen a su revisión previa explícita, como ocurrió con HU-M3-01 (consecuencia de la nueva cabeza, no un cambio de comportamiento).

### Unidad 3: Módulo `usuarios` y `/sesion`

- [x] 3.1 RED: `tests/modules/usuarios/test_service.py` — `iniciar_sesion` válido guarda solo `sha256(token)` y `vence_en` = +8 h; correo con otras mayúsculas y espacios; contraseña mala, correo inexistente y usuario deshabilitado dan el mismo `NoAutenticadoError` «Correo o contraseña incorrectos»; hash ficticio con correo inexistente (AS «Iniciar sesión», escenarios de contraseña incorrecta, correo inexistente y deshabilitado; A5, A6).
- [x] 3.2 RED: pruebas del hash — `contrasena_hash` distinto de la clave, prefijo `$2`, `checkpw` válido; dos usuarios con la misma clave tienen hashes distintos (AS «Contraseñas con hash», escenarios «La columna no contiene la contraseña» y «Mismo texto, hashes distintos»).
- [x] 3.3 RED: vigencia de token — sesión de 7 h 59 min vigente y de 8 h 1 s → `None`; usuario deshabilitado → `None`; cierre borra solo esa sesión; las sesiones vencidas se borran al iniciar (AS «Sesión vencida a las 8 horas», «Otra sesión del mismo usuario sigue vigente»).
- [x] 3.4 GREEN: `usuarios/repository.py` (`obtener_por_correo_normalizado`, `agregar`, sesiones, `correos_por_id`), `usuarios/service.py` (`iniciar_sesion`, `usuario_de_token`, `cerrar_sesion`, `registrar_usuario`, `actualizar_credenciales`, `deshabilitar_usuario`, `correos_por_id`, `crear_encargado`) con `flush` sin `commit` en los tres métodos de escritura de personas (A11), y `usuarios/schemas.py`.
- [x] 3.5 RED: `test_service.py` — `registrar_usuario` con correo repetido → `ConflictoError` «Ya existe un usuario con el correo {correo}»; `actualizar_credenciales` con el mismo correo propio no cuenta como repetido; contraseña nueva borra sesiones; `deshabilitar_usuario` borra sesiones (SM «Guardar con el mismo correo», «Cambiar correo y contraseña»; SC «Baja correcta»).
- [x] 3.6 RED: `tests/modules/usuarios/test_router.py` con `cliente_sin_sesion` — `POST /sesion` 201 y forma de la respuesta; 401 genérico; 422 parametrizado (correo vacío, sin `@`, contraseña vacía, campo extra); `GET /sesion` 200 con `nombre` y `apellido` del mozo o chef vinculado y nulos para el encargado, 401 sin token; `DELETE /sesion` 204 y el token deja de valer; 401 sin token; ninguna respuesta expone `contrasena` ni `contrasena_hash` (P1; AS «Consultar la sesión actual», «Cerrar sesión», «Ninguna respuesta expone la contraseña»).
- [x] 3.7 GREEN: `usuarios/router.py` con `/sesion` e `include_router` en `main.py` (compartido); `POST` sin dependencia de sesión, `GET`/`DELETE` solo con sesión válida (S9).

### Unidad 4: Seguridad y `conftest`

- [x] 4.1 RED: `tests/shared/test_seguridad.py` en una app aislada — sin encabezado, esquema distinto de Bearer y token desconocido → 401 con `WWW-Authenticate` y «Sesión no válida o vencida»; sin permiso → 403 con «No tiene permiso para realizar esta acción»; varios roles suman permisos; el 403 precede al 422 del cuerpo (P2; AS «Exigir sesión en toda la API»; CA «Prohibido antes que inválido»).
- [x] 4.2 GREEN: `shared/seguridad.py` con `usuario_actual` (HTTPBearer con `auto_error=False`) y `requiere(permiso)`, cuyo verificador expone `.permiso` (A2, A4). Importa solo `usuarios.service`.
- [x] 4.3 GREEN: `tests/conftest.py` — `BCRYPT_RONDAS=4`, `cliente` con `dependency_overrides[usuario_actual]` = encargado, `cliente_sin_sesion` y `cliente_con_rol(rol)` con `UsuarioSesion` del rol (A12; CA «Pruebas existentes con encargado por defecto»).

### Unidad 5: Salón (Chef y credenciales)

- [x] 5.1 RED: `tests/modules/salon/test_schemas.py` — `MozoCrear`/`ChefCrear` exigen `correo` y `contrasena`; `*Modificar` exige `correo` y acepta `contrasena` vacía o ausente; `estado` extra → 422; `*Salida` agrega `correo` y no trae `contrasena` (SM «Falta correo o contraseña»; SC «Datos inválidos»).
- [x] 5.2 GREEN: esquemas de Mozo y Chef en `salon/schemas.py` usando `Correo` y `ContrasenaNueva`.
- [x] 5.3 RED: `test_service.py` (Mozo y Chef, parametrizado por modelo) — alta crea persona y usuario en una transacción con el rol correcto y vínculo; DNI repetido → 409 sin usuario huérfano; correo repetido → 409 sin persona; `IntegrityError` → rollback y 409; modificación con contraseña vacía conserva la actual; con contraseña nueva invalida sesiones; mozo sin usuario sin contraseña → `DatosInvalidosError` 422; mozo sin usuario con contraseña crea su `Usuario` (S5); baja deshabilita el usuario y borra sesiones; baja de mozo sin usuario sin efectos; baja repetida de chef → 409; chef inexistente → 404 «El chef 999 no existe» (SM «Crear», «Modificar», «Baja»; SC «Crear», «Modificar», «Dar de baja»; P4).
- [x] 5.4 GREEN: helpers de `repository` y `service` parametrizados por modelo, `crear_chef`, `modificar_chef`, `baja_chef`, `listar_chefs` y credenciales de Mozo, con `usuarios.service` dentro de la misma transacción (A9, A11) y `correos_por_id` en una sola consulta para el listado.
- [x] 5.5 RED: `test_router.py` — `/chefs` (POST 201, GET paginado con `limit=2` y total 3, filtro `estado`, `limit=101` → 422, PUT 200, baja 200) y `/mozos` con correo; el chef y el mozo creados inician sesión con `roles` correctos, nombre y apellido (SC «Listar chefs», «El chef creado puede iniciar sesión»; SM «El mozo creado inicia sesión»).
- [x] 5.6 GREEN: `salon/router.py` con `/chefs` y los cambios de `/mozos`.
- [x] 5.7 Actualizar las pruebas existentes de Mozo (`fabrica_mozo` y datos de alta con correo y contraseña) para el contrato nuevo.

### Unidad 6: Permisos en los routers

- [x] 6.1 RED: `tests/shared/test_matriz_permisos.py` — una fila por celda (método, ruta, rol) para M1 a M6 y `/reportes/*` según las tablas de `control-de-acceso`; permitido → ni 401 ni 403 (con datos válidos o con el 404 propio); negado → 403 con `{"detalle"}` y sin cambios en la base (P3; CA «Cada celda prohibida», «Cada celda permitida»).
- [x] 6.2 RED: escenarios con datos reales — mozo no gestiona catálogo (`POST /platos`), chef no entra a pagos ni salón, chef ve comandas y su detalle pero no cierra ni registra entregas, mozo cierra una comanda de otro mozo, mozo factura y cobra una comanda ajena, reportes solo encargado incluidos `/pdf`, prohibido antes que inválido en `POST /sectores` (CA escenarios homónimos).
- [x] 6.3 RED: `test_matriz_permisos.py` — completitud (P5): cada `APIRoute` de `/api/v1`, salvo `POST /sesion`, tiene un verificador con `.permiso`; sin sesión toda ruta responde 401; `/salud` responde 200 (CA «Ninguna ruta queda sin protección»; AS «Endpoints públicos»); unión `MOZO`+`CHEF` (CA «Unión de roles»).
- [x] 6.4 GREEN: `dependencies=[requiere(Permiso.X)]` en cada decorador de `productos`, `menus`, `salon`, `atencion`, `reservas` y `pagos` y en todos los `/reportes/*`, según la matriz de `design.md`. Los `service` no se tocan. Archivos compartidos de otros responsables: anotar en el PR (§9.3).
- [x] 6.5 Ejecutar la suite completa de M1 a M6 sin cambios de comportamiento (CA «Pruebas existentes con encargado por defecto»).

### Unidad 7: import-linter y script

- [x] 7.1 Contratos de import-linter en `backend/pyproject.toml` (A13): «Otros modulos solo usan el service de usuarios», `app.modules.usuarios` como origen en los seis contratos existentes, «Solo los router usan seguridad (D-13)» y «shared no importa modulos» con el `ignore_imports` de `seguridad -> usuarios.service`. Verificar con `lint-imports`. Archivo compartido: documentar el cambio en `SPRINT-1/S1-03-estandares-backend.md` si corresponde (§9.8).
- [x] 7.2 RED: `tests/scripts/test_crear_encargado.py` — `getpass` simulado crea un encargado `HABILITADO` con hash y rol `ENCARGADO` que puede iniciar sesión; correo repetido y contraseña de 7 caracteres terminan con código distinto de cero sin cambiar la base; las dos contraseñas deben coincidir (P6; AS «Creación del primer encargado»).
- [x] 7.3 GREEN: `backend/scripts/crear_encargado.py` (`python -m scripts.crear_encargado --correo <correo>`, `getpass` dos veces) que llama a `usuarios.service.crear_encargado`. Sin secretos en el repositorio (RNF-SEG-04).
- [x] 7.4 REFACTOR: `ruff check --fix . && ruff format .`, `lint-imports`, funciones de hasta 50 líneas y complejidad 10.

## Fase 2: Frontend

### Unidad 8: Matriz, almacén, cliente y proveedor

- [x] 8.1 RED/GREEN: `shared/auth/permisos.ts` + prueba — `Rol`, `Permiso` con los mismos nombres que el backend, `PERMISOS_POR_ROL` y `permisosDe` (unión de roles) (CA «Matriz única», «Un usuario con dos roles ve la unión»).
- [x] 8.2 RED/GREEN: `shared/auth/almacenSesion.ts` + prueba — `leerToken`, `guardarToken` y `borrarToken` sobre `sessionStorage` (AS «Inicio de sesión correcto»).
- [x] 8.3 RED/GREEN: `shared/api/client.ts` + prueba — `solicitar` y `obtenerArchivo` (PDF) envían `Authorization: Bearer` con token; 401 con token borra el token y llama al manejador de `registrarSesionVencida`; el 401 de `POST /sesion` no lo dispara; sin token no hay encabezado; `urlDelBackend` no lleva token; el 403 conserva el `detalle` y no cierra la sesión (AS «Sesión vencida en medio del uso»; CA «403 inesperado de la API»; D-16).
- [x] 8.4 RED/GREEN: `shared/auth/api.ts` (`iniciarSesion`, `obtenerSesion`, `cerrarSesion`) + prueba de rutas y cuerpos.
- [x] 8.5 RED/GREEN: `sesion-context.ts`, `SesionProvider.tsx`, `useSesion.ts` + prueba — con token consulta `GET /sesion` al montar (recarga); sin token no llama; `puede(permiso)`; `cerrarSesion` llama a `DELETE /sesion` y borra el token aunque falle; `useSesion` sin proveedor lanza error (AS «Recarga con sesión vigente», «Cerrar sesión desde el encabezado»; A8 del diseño frontend).
- [x] 8.6 `AppProviders.tsx` con el proveedor; `test/setup.ts` simula `useSesion` con un encargado por defecto y `test/sesionDePrueba.ts` (`sesionDePrueba(roles)`). Verificar que `vi.mock` en `setupFiles` aplica a todos los archivos (pregunta abierta); si no, usar un envoltorio por prueba. Las pruebas de `shared/auth` usan `vi.unmock`.

### Unidad 9: Login, guardas, menú y encabezado

- [x] 9.1 RED/GREEN: `shared/auth/LoginPage.tsx` + prueba — envío válido guarda el token y navega al inicio; 401 muestra «Correo o contraseña incorrectos» y conserva el correo; campos vacíos informan obligatorios y no envían; sin `fetch` en componentes (AS «Inicio de sesión correcto», «Credenciales incorrectas», «Campos vacíos»).
- [x] 9.2 RED/GREEN: `RutaProtegida.tsx` y `RutaConPermiso.tsx` + prueba — sin sesión redirige a `/login` conservando el origen y sin llamadas de datos; sin permiso se resuelve la ruta prohibida (AS «Sin sesión se muestra el inicio de sesión»; CA «Ruta prohibida abierta por URL»). Decidido: la ruta prohibida redirige al inicio, sin pantalla de «acceso denegado».
- [x] 9.3 RED/GREEN: `App.tsx` — `/login` fuera de `AppShell`; cada ruta con su permiso de VER y `/reportes` con `REPORTES_VER`; prueba de enrutado por rol.
- [x] 9.4 RED/GREEN: `layout/navegacion.ts` con `ElementoNavegacion.permiso`, `Sidebar` filtrado con `puede` y título «Salón, Mozos y Chefs»; prueba por rol (encargado todo, mozo sin Reportes, chef sin Salón, Pagos ni Reportes) (CA «El menú del encargado/mozo/chef…»; S8).
- [x] 9.5 RED/GREEN: `MenuUsuario` en `Navbar`/`AppShell` — correo o nombre, roles y botón «Cerrar sesión» que vuelve a `/login` (AS «Cerrar sesión desde el encabezado»).

### Unidad 10: Acciones ocultas en M1, M2, M4, M5, M6 e inicio

- [x] 10.1 RED/GREEN: M1 Productos y Carta — alta, modificar y baja solo con `CARTA_GESTIONAR`; tablas con `onEditar`/`onEliminar` indefinidos y sin columna de acciones; botones de reporte y PDF solo con `REPORTES_VER` (CA tabla «Productos y Carta», «Menú y botones de reporte»).
- [x] 10.2 RED/GREEN: M2 Menús y Promociones — alta, modificar, baja y finalizar solo con `MENUS_GESTIONAR`; reporte con `REPORTES_VER`.
- [x] 10.3 RED/GREEN: M4 Atención — crear, editar, entregas −/+, cerrar, reabrir y anular solo con `COMANDAS_OPERAR`; clientes con `CLIENTES_GESTIONAR`; el chef ve el detalle sin botones; el catálogo de mesas de la comanda se carga solo con `COMANDAS_OPERAR` para no provocar un 403 (CA «El chef ve comandas sin botones de acción»; preguntas abiertas).
- [x] 10.4 RED/GREEN: M5 Reservas — crear, modificar, cancelar y abrir comanda solo con `RESERVAS_OPERAR`; no cargar `/clientes` si el rol no tiene `CLIENTES_GESTIONAR`; reporte con `REPORTES_VER`.
- [x] 10.5 RED/GREEN: M6 Pagos — facturar y cobrar con `PAGOS_OPERAR`, gestión de medios de pago con `PAGOS_GESTIONAR`, caja y recaudación con `REPORTES_VER` (S7).
- [x] 10.6 RED/GREEN: `Inicio.tsx` y `AccesosRapidos.tsx` — `MapaDelLocal` con `SALON_VER` y `RESERVAS_VER`, `EstadoDeCaja` con `REPORTES_VER`, cada acceso con su permiso de operación; no se solicita lo prohibido (CA «Inicio: tarjetas, accesos y datos solo de lo que el rol puede ver»; supuesto del diseño).
- [x] 10.7 Prueba transversal: ante un 403 inesperado se muestra el `detalle` y la sesión se conserva (CA «403 inesperado de la API»).

### Unidad 11: Salón (Chefs, credenciales y solo lectura)

- [x] 11.1 RED/GREEN: `modules/salon/types.ts` y `api.ts` — tipos y funciones de `Chef` y correo en `Mozo`; prueba de rutas y cuerpos.
- [x] 11.2 RED/GREEN: `components/validarPersona.ts` (amplía `validarMozo`) + prueba — correo obligatorio y con formato, contraseña obligatoria al crear («La contraseña es obligatoria.»), mínimo 8, opcional al editar salvo mozo «Sin usuario», `errorDelServidor` del 409 bajo Correo (SM «Contraseña obligatoria al crear», «Mozo sin usuario en la modificación»; SC «Contraseña obligatoria al crear y opcional al editar»).
- [x] 11.3 RED/GREEN: `CamposCredenciales`, `useFormularioPersona` y `useBajaPersona` genéricos con envoltorios para Mozo y Chef + pruebas (envío, toast, 409 bajo Correo con el diálogo abierto, cancelar sin llamadas; el formulario indica que la contraseña vacía conserva la actual) (SM «Error 409…»; SC «Error de correo repetido», «Cancelar»).
- [x] 11.4 RED/GREEN: `ChefFormDialog`, `ChefesTabla`/listado y pestaña «Chefs»; el listado de mozos muestra el correo o «Sin usuario» (SM «Alta de mozo con credenciales desde el formulario»; SC «El encargado crea un chef desde la pestaña»).
- [x] 11.5 RED/GREEN: `SeccionesDelSalon` en su propio archivo; `SalonPage` por rol — encargado todas las pestañas con acciones; mozo solo Sectores y Mesas sin acciones; título «Salón, Mozos y Chefs» (SM «Un mozo no ve la gestión de mozos»; SC «Otros roles no ven la pestaña»; CA «El menú del mozo omite reportes y gestión»; RNF-MAN-05).
- [x] 11.6 REFACTOR: `npm run format`; reutilizar `shared/components/`; contrastar con `SPRINT-2/S2-04-maqueta/salon.html` y anotar diferencias (formularios en `Dialog`, no en página aparte).

## Fase 3: Documentación

- [x] 3.1 Agregar `Usuario` y `Chef` a `SPRINT-0/G3 - Diagrama de clases unificado.drawio` y a `G3 - Diagramas por modulo.drawio` (relaciones con `Mozo`, `Chef`, roles y sesión).
- [x] 3.2 `FLUJO_DIARIO.md`: crear el primer encargado con `python -m scripts.crear_encargado --correo <correo>`, que las bases existentes quedan sin usuarios y que los mozos anteriores necesitan credenciales (S5, S6; AS «Creación del primer encargado»).
- [x] 3.3 `.env.example`: `BCRYPT_RONDAS` con valor de ejemplo, sin secretos (RNF-SEG-04).
- [x] 3.4 `SPRINT-0/S0-05-arquitectura.md`: agregar 401 y 403 a D-25 y registrar `shared/seguridad.py` y el módulo `usuarios` (S10, A10, A13).

## Fase 4: Verificación final y notas del PR

- [ ] 4.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %); `alembic upgrade head`, `alembic downgrade -1`, `alembic heads` con una sola cabeza.
- [ ] 4.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %, 0 advertencias).
- [ ] 4.3 Antes del PR: `git pull origin develop`, `alembic heads` y resolver conflictos en la rama; con otros PR abiertos, revisar los routers compartidos.
- [ ] 4.4 Contrastar los criterios CA-1 a CA-4 con el texto real del issue #172 (S12) y anotar diferencias.
- [ ] 4.5 Reunir notas del PR (sin crear issues ni comentarios):
  - Nota transversal autorizada (§9.3): `shared/`, los seis módulos y la entidad `Chef` en M3.
  - Archivos compartidos tocados: `shared/{seguridad,permisos,credenciales,excepciones}.py`, `shared/models/enums.py`, `main.py`, `config.py`, `alembic/env.py`, `pyproject.toml`, `requirements.txt`, routers de M1, M2, M4, M5 y M6, `client.ts`, `App.tsx`, layout y páginas.
  - Supuestos S1 a S12 para que el equipo los valide, en especial S3 (sin vía de interfaz para varios roles), S5 y S11 (`bcrypt`).
  - Diferencias con la maqueta (formularios en `Dialog`, pestaña «Chefs», pantalla de inicio de sesión sin maqueta).
  - Tamaño por lado frente a 800/800 (single-pr por decisión de la persona).

## Riesgos y puntos abiertos

- Resuelto: quien abre una ruta prohibida es llevado al inicio (spec y diseño alineados por decisión de la persona).
- `GET /sesion` devuelve `nombre` y `apellido` en la spec; `UsuarioSesion` del diseño no los incluye. Resolver al implementar 3.6 con un esquema de salida propio de `usuarios.router`.
- Versión exacta de `bcrypt` y acuerdo del equipo (tarea 1.6).
- El comportamiento de `vi.mock` en `setupFiles` (tarea 8.6) puede obligar a un envoltorio por prueba.
- Reservas y Atención combinan endpoints de otros módulos; verificar que el chef no reciba 403 al ver (tareas 10.3 y 10.4).
- Conflictos con PR abiertos por tocar los routers de otros responsables (tarea 4.3).
