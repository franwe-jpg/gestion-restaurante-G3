# Delta para autenticacion-sesion (HU-TR-01)

Criterios de aceptación de la HU (issue #172; texto provisto por la persona, el issue no se pudo leer en esta fase):

- **CA-1:** sin sesión no se puede usar el sistema, ni desde el frontend ni desde la API.
- **CA-2:** cada rol accede solo a lo que le corresponde y un acceso prohibido responde 403 (ver `control-de-acceso`).
- **CA-3:** las contraseñas se guardan con hash (RNF-SEG-03).
- **CA-4:** CI en verde y cobertura según RNF-MAN-04.

Supuesto: los criterios se contrastan con el texto del issue antes de `/sdd-apply` (S12 de la propuesta).

## Datos

### Usuario

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base; no se recibe. |
| `correo` | texto | Obligatorio. Se recorta y se normaliza con `casefold()`. Formato `local@dominio` validado sin dependencias nuevas. Hasta 254 caracteres. Único sin distinguir mayúsculas. |
| `contrasena_hash` | texto | Hash `bcrypt` con sal. Nunca contiene la contraseña original y nunca sale por la API. |
| `estado` | `HABILITADO` \| `DESHABILITADO` | Un usuario `DESHABILITADO` no puede iniciar sesión. |
| `roles` | conjunto no vacío de `ENCARGADO` \| `MOZO` \| `CHEF` | El modelo admite varios roles; recibe la suma de sus permisos. |
| vínculo | `Mozo` o `Chef` opcional | Un usuario con rol `MOZO` queda vinculado a un `Mozo` (M3) y uno con rol `CHEF`, a un `Chef` (M3). El encargado no tiene vínculo. Cada `Mozo` o `Chef` tiene a lo sumo un `Usuario`. |

Supuesto: contraseña entre 8 y 72 bytes UTF-8 (límite de bcrypt; S2). Supuesto: el nombre del campo del vínculo y su ubicación se deciden en el diseño.

### Sesión

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base. |
| `usuario_id` | entero | Usuario dueño de la sesión. |
| `token_hash` | texto | SHA-256 del token. El token en claro NO se guarda. |
| `creada_en`, `vence_en` | fecha y hora | `vence_en` = `creada_en` + 8 horas. No se renueva. |

El token es opaco (`secrets.token_urlsafe`), viaja en `Authorization: Bearer <token>` y el servidor controla el vencimiento.

## Contrato de la API

Prefijo `/api/v1`. Supuesto: la ruta de sesión es `/sesion` y su ubicación en el código se decide en el diseño.

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /sesion` (público) | JSON `SesionCrear {correo, contrasena}`; campos extra prohibidos | 201 `SesionSalida {token, tipo: "bearer", vence_en, usuario: UsuarioSalida}` | 401 credenciales inválidas o usuario deshabilitado; 422 datos inválidos |
| `GET /sesion` | Bearer | 200 `UsuarioSalida {id, correo, roles, nombre, apellido}` (`nombre` y `apellido` del `Mozo` o `Chef` vinculado; nulos para el encargado) | 401 |
| `DELETE /sesion` | Bearer | 204 sin cuerpo; la sesión se borra en el servidor | 401 |

`/salud` y `/media` siguen públicos (S9). Todo otro endpoint de `/api/v1` exige sesión.

Errores (D-25, D-26): `{"detalle": "mensaje"}`. Se agregan `401` (no autenticado) y `403` (sin permiso) a D-25 (S10).

| Caso | Código | `detalle` |
| --- | --- | --- |
| Credenciales inválidas, correo inexistente o usuario deshabilitado | 401 | «Correo o contraseña incorrectos» |
| Falta el encabezado, token desconocido, sesión vencida o borrada, o usuario deshabilitado | 401 | «Sesión no válida o vencida» |

Supuesto: los textos exactos de `detalle` para el 401 de sesión son los de la tabla; el de credenciales es el fijado por S10.

## ADDED Requirements

### Requisito: Iniciar sesión

El sistema DEBE permitir iniciar sesión con correo y contraseña. Con credenciales válidas de un usuario `HABILITADO` DEBE crear una sesión que vence a las 8 horas, guardar solo el hash SHA-256 del token y responder 201 con el token, su vencimiento y el usuario. El correo DEBE compararse sin distinguir mayúsculas ni espacios en los extremos. Si el correo no existe, la contraseña no coincide o el usuario está deshabilitado, DEBE responder 401 con el mismo mensaje genérico, sin revelar cuál fue la causa. La comparación DEBE hacerse con `bcrypt`. El `router` NO DEBE consultar la base.

#### Escenario: Inicio de sesión válido (CA-1)

- DADO un usuario habilitado con correo «ana@resto.com» y su contraseña
- CUANDO envía `POST /sesion` con esos datos
- ENTONCES el sistema responde 201 con `token`, `vence_en` (8 horas después) y el usuario con sus roles
- Y existe una fila en `sesiones` cuyo `token_hash` es el SHA-256 del token y no el token

#### Escenario: Correo con otras mayúsculas

- DADO el usuario «ana@resto.com»
- CUANDO inicia sesión con « ANA@Resto.com »
- ENTONCES el sistema responde 201

#### Escenario: Contraseña incorrecta (CA-1)

- DADO un usuario habilitado
- CUANDO envía una contraseña equivocada
- ENTONCES el sistema responde 401 con `{"detalle": "Correo o contraseña incorrectos"}` y NO crea sesión

#### Escenario: Correo inexistente

- DADO que no existe un usuario con el correo «nadie@resto.com»
- CUANDO intenta iniciar sesión
- ENTONCES el sistema responde 401 con el mismo mensaje que para una contraseña incorrecta

#### Escenario: Usuario deshabilitado (límite)

- DADO un usuario `DESHABILITADO`
- CUANDO envía su correo y su contraseña correctos
- ENTONCES el sistema responde 401 con «Correo o contraseña incorrectos» y NO crea sesión

#### Escenario: Datos inválidos

- DADO un cuerpo con el correo vacío, sin `@` o la contraseña vacía, o con un campo extra
- CUANDO se envía `POST /sesion`
- ENTONCES el sistema responde 422

### Requisito: Contraseñas con hash

El sistema DEBE guardar las contraseñas solo como hash `bcrypt` con sal (RNF-SEG-03). NO DEBE guardar, registrar ni devolver la contraseña original ni su hash en ninguna respuesta.

#### Escenario: La columna no contiene la contraseña (CA-3)

- DADO un usuario creado con la contraseña «Clave1234»
- CUANDO se lee `contrasena_hash` de la base
- ENTONCES el valor no es «Clave1234», comienza con el prefijo de bcrypt (`$2`) y `bcrypt.checkpw` lo valida contra «Clave1234»

#### Escenario: Mismo texto, hashes distintos (límite)

- DADO dos usuarios con la misma contraseña
- CUANDO se comparan sus `contrasena_hash`
- ENTONCES son distintos (sal por hash)

#### Escenario: Ninguna respuesta expone la contraseña

- DADO cualquier respuesta de `/sesion`, `/mozos` o `/chefs`
- CUANDO se inspecciona el cuerpo
- ENTONCES no contiene los campos `contrasena` ni `contrasena_hash`

### Requisito: Exigir sesión en toda la API

El sistema DEBE exigir una sesión válida en todo endpoint de `/api/v1` excepto `POST /sesion`; `/media` y `/salud` quedan públicos (S9). Sin encabezado `Authorization`, con un token desconocido, con una sesión vencida o con un usuario deshabilitado, DEBE responder 401 antes de ejecutar cualquier lógica. La exigencia DEBE resolverse con una dependencia de FastAPI en `shared/seguridad.py` aplicada por los `router`; los `service` de M1, M2, M4, M5 y M6 NO DEBEN cambiar (D-13, RNF-SEG-02).

#### Escenario: Sin sesión la API no se usa (CA-1)

- DADO una petición sin encabezado `Authorization`
- CUANDO se llama a cualquier endpoint de la matriz (por ejemplo `GET /carta`, `POST /comandas`, `GET /facturas`)
- ENTONCES el sistema responde 401 con `{"detalle": "Sesión no válida o vencida"}`

#### Escenario: Token desconocido

- DADO el encabezado `Authorization: Bearer abc`
- CUANDO se llama a `GET /carta`
- ENTONCES el sistema responde 401

#### Escenario: Sesión vencida a las 8 horas (CA-1, límite)

- DADO una sesión creada hace 8 horas y un segundo
- CUANDO se llama a `GET /sesion`
- ENTONCES el sistema responde 401 y la sesión no se renueva
- Y con una sesión de 7 horas y 59 minutos responde 200

#### Escenario: Endpoints públicos

- DADO una petición sin sesión
- CUANDO se llama a `GET /salud`
- ENTONCES el sistema responde 200

#### Escenario: Usuario deshabilitado con sesión previa (límite)

- DADO un usuario con una sesión vigente
- CUANDO su usuario pasa a `DESHABILITADO` (baja del mozo o chef) y usa el token
- ENTONCES el sistema responde 401 y sus sesiones ya no existen

### Requisito: Consultar la sesión actual

El sistema DEBE responder `GET /sesion` con el usuario de la sesión: `id`, `correo`, `roles` y, si tiene vínculo, `nombre` y `apellido`. El frontend DEBE usarlo para restaurar la sesión al recargar la página.

#### Escenario: Sesión vigente

- DADO una sesión vigente de un mozo
- CUANDO se llama a `GET /sesion`
- ENTONCES el sistema responde 200 con su correo, `roles: ["MOZO"]`, nombre y apellido

#### Escenario: Sin sesión

- DADO una petición sin token
- CUANDO se llama a `GET /sesion`
- ENTONCES el sistema responde 401

### Requisito: Cerrar sesión

El sistema DEBE permitir cerrar la sesión con `DELETE /sesion`: DEBE borrar la sesión en el servidor y responder 204. El token borrado NO DEBE volver a ser válido. Cerrar una sesión NO DEBE afectar las otras sesiones del mismo usuario.

#### Escenario: Cierre de sesión

- DADO una sesión vigente
- CUANDO se llama a `DELETE /sesion`
- ENTONCES el sistema responde 204
- Y el mismo token responde 401 en `GET /sesion`

#### Escenario: Cerrar sin sesión (error)

- DADO una petición sin token o con el token ya borrado
- CUANDO se llama a `DELETE /sesion`
- ENTONCES el sistema responde 401

#### Escenario: Otra sesión del mismo usuario sigue vigente (límite)

- DADO un usuario con dos sesiones
- CUANDO cierra una
- ENTONCES la otra sigue respondiendo 200 en `GET /sesion`

### Requisito: Creación del primer encargado

El sistema DEBE ofrecer un script en `backend/scripts/` que cree un usuario con rol `ENCARGADO` a partir del correo y la contraseña recibidos al ejecutarse (argumentos o entrada interactiva). El repositorio NO DEBE contener correos ni contraseñas reales (RNF-SEG-04). Si el correo ya existe, el script DEBE informarlo y no modificar nada. El procedimiento DEBE quedar documentado en `FLUJO_DIARIO.md`. Los encargados no se gestionan desde la interfaz (S6).

#### Escenario: Crear el primer encargado

- DADO una base sin usuarios
- CUANDO se ejecuta el script con un correo y una contraseña válidos
- ENTONCES se crea un usuario `HABILITADO` con rol `ENCARGADO`, con la contraseña guardada con hash, y puede iniciar sesión

#### Escenario: Correo repetido o contraseña inválida (error)

- DADO un encargado ya creado
- CUANDO se ejecuta el script con el mismo correo, o con una contraseña de 7 caracteres
- ENTONCES el script informa el motivo, termina con código distinto de cero y no cambia la base

### Requisito: Frontend: inicio, restauración y cierre de sesión

El frontend DEBE mostrar una pantalla de inicio de sesión (correo y contraseña) en una ruta pública `/login`. Toda otra ruta DEBE estar protegida: sin sesión redirige a `/login`. Al iniciar sesión DEBE guardar el token en `sessionStorage` (se pierde al cerrar la pestaña) y llevar al inicio. `client.ts` DEBE enviar `Authorization: Bearer` en toda llamada y, ante un 401 distinto del de `POST /sesion`, DEBE borrar el token y volver a `/login`. El encabezado DEBE mostrar el correo o el nombre del usuario y el botón «Cerrar sesión», que llama a `DELETE /sesion`, borra el token y vuelve a `/login`. Si el inicio falla por 401, DEBE mostrar «Correo o contraseña incorrectos» sin vaciar el correo. Los componentes NO DEBEN usar `fetch` (D-16).

#### Escenario: Sin sesión se muestra el inicio de sesión (CA-1)

- DADO que no hay token guardado
- CUANDO abro cualquier ruta, por ejemplo `/mesas`
- ENTONCES el sistema me redirige a `/login` y no se hace ninguna llamada de datos

#### Escenario: Inicio de sesión correcto

- DADO la pantalla `/login`
- CUANDO ingreso un correo y una contraseña válidos y envío
- ENTONCES se guarda el token en `sessionStorage` y se muestra la pantalla de inicio con el encabezado del usuario

#### Escenario: Credenciales incorrectas (error)

- DADO la pantalla `/login`
- CUANDO ingreso una contraseña incorrecta
- ENTONCES se muestra «Correo o contraseña incorrectos», el correo se conserva y no se guarda token

#### Escenario: Campos vacíos

- DADO la pantalla `/login`
- CUANDO envío con el correo o la contraseña vacíos
- ENTONCES se informan los campos obligatorios y no se envía la solicitud

#### Escenario: Cerrar sesión desde el encabezado

- DADO una sesión iniciada
- CUANDO presiono «Cerrar sesión»
- ENTONCES se llama a `DELETE /sesion`, se borra el token y se muestra `/login`

#### Escenario: Sesión vencida en medio del uso (límite)

- DADO una sesión iniciada cuyo token venció
- CUANDO cualquier llamada responde 401
- ENTONCES se borra el token y se vuelve a `/login`

#### Escenario: Recarga con sesión vigente

- DADO un token guardado y vigente
- CUANDO recargo la página
- ENTONCES el frontend consulta `GET /sesion` y mantiene la sesión sin pedir credenciales
