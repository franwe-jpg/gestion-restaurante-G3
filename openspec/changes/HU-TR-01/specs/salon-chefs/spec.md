# Delta para salon-chefs (HU-TR-01)

Nueva entidad `Chef` en M3 (autorizado por la persona; nota transversal en el PR). Se agrega al diagrama de clases junto con `Usuario`. Solo el encargado gestiona chefs.

## Datos

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base; no se recibe. |
| `dni` | texto | Mismas reglas que `Mozo.dni`. Único entre chefs. |
| `nombre`, `apellido` | texto | Mismas reglas que en `Mozo`. |
| `telefono` | texto o nulo | Opcional; vacío se guarda como `null`. Mismas reglas que en `Mozo`. |
| `estado` | `HABILITADO` \| `DESHABILITADO` | Lo asigna el sistema: toda alta queda `HABILITADO`. No se recibe. |
| `correo` | texto | Obligatorio al crear. Es el correo del `Usuario` vinculado (ver `autenticacion-sesion`). |
| `contrasena` | texto | Solo entrada. Entre 8 y 72 bytes UTF-8. Obligatoria al crear. Nunca se devuelve. |

Supuesto (S1): `Chef` tiene los mismos atributos que `Mozo`. Supuesto: el DNI de un chef no se compara con el de los mozos (son entidades distintas).

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /api/v1/chefs` | JSON `ChefCrear {dni, nombre, apellido, telefono?, correo, contrasena}`; campos extra prohibidos | 201 `ChefSalida {id, dni, nombre, apellido, telefono, estado, correo}` | 401; 403; 409 DNI o correo repetido; 422 datos inválidos |
| `GET /api/v1/chefs` | `limit`, `offset` (D-27), `estado?` | 200 página de `ChefSalida` | 401; 403; 422 parámetros inválidos |
| `PUT /api/v1/chefs/{id}` | JSON `ChefModificar` (mismos campos que el alta; `contrasena` opcional) | 200 `ChefSalida` | 401; 403; 404; 409; 422 |
| `POST /api/v1/chefs/{id}/baja` | sin cuerpo | 200 `ChefSalida` con `estado: DESHABILITADO` | 401; 403; 404; 409 ya dado de baja |

Errores: `{"detalle": "mensaje"}` (D-26). Mensajes: «Ya existe un chef con el DNI {dni}», «Ya existe un usuario con el correo {correo}», «El chef {id} no existe», «El chef ya está dado de baja».

## ADDED Requirements

### Requisito: Crear un chef con sus credenciales

El sistema DEBE permitir al encargado crear un chef con DNI, nombre, apellido, teléfono opcional, correo y contraseña. El `service` DEBE crear el `Chef` y su `Usuario` (rol `CHEF`, vinculado al chef, `HABILITADO`, contraseña con hash) en una sola transacción: si falla uno, no se crea ninguno. El correo DEBE ser único entre todos los usuarios sin distinguir mayúsculas.

#### Escenario: Alta con datos válidos (CA-1)

- DADO un encargado en la pestaña «Chefs»
- CUANDO completa DNI, nombre, apellido, correo «chef@resto.com» y una contraseña de 8 o más caracteres y guarda
- ENTONCES el sistema responde 201, el chef queda `HABILITADO` y existe un usuario con rol `CHEF` vinculado

#### Escenario: El chef creado puede iniciar sesión (CA-1)

- DADO un chef recién creado con su correo y contraseña
- CUANDO inicia sesión
- ENTONCES el sistema responde 201 con `roles: ["CHEF"]`

#### Escenario: DNI repetido (error)

- DADO un chef con DNI «30111222»
- CUANDO el encargado intenta crear otro con ese DNI
- ENTONCES el sistema responde 409 «Ya existe un chef con el DNI 30111222» y no se crea ni el chef ni el usuario

#### Escenario: Correo repetido (error)

- DADO un usuario con correo «ana@resto.com» (de cualquier rol)
- CUANDO el encargado crea un chef con « ANA@resto.com »
- ENTONCES el sistema responde 409 «Ya existe un usuario con el correo ana@resto.com» y no se crea el chef

#### Escenario: Contraseña en el límite

- DADO el alta de un chef
- CUANDO la contraseña tiene 7 caracteres el sistema responde 422; con 8 caracteres se crea; con más de 72 bytes responde 422

#### Escenario: Datos inválidos

- DADO el alta de un chef
- CUANDO falta el correo, el correo no tiene formato válido, falta un dato obligatorio o el cuerpo incluye `estado`
- ENTONCES el sistema responde 422

#### Escenario: Sin permiso (CA-2)

- DADO un mozo, un chef o ninguna sesión
- CUANDO se envía `POST /chefs`
- ENTONCES responde 403 para mozo y chef, y 401 sin sesión

### Requisito: Modificar un chef y sus credenciales

El sistema DEBE permitir al encargado modificar los datos del chef y su correo. Si `contrasena` viene vacía o ausente, DEBE conservarse la contraseña actual (S2); si viene con valor, DEBE reemplazarse con un nuevo hash. Cambiar la contraseña DEBE invalidar las sesiones del usuario. Un correo que pertenece a otro usuario DEBE responder 409.

#### Escenario: Modificación de datos conservando la contraseña (CA-1)

- DADO un chef con usuario
- CUANDO el encargado cambia el teléfono y deja la contraseña vacía
- ENTONCES el sistema responde 200 y el chef sigue iniciando sesión con la contraseña anterior

#### Escenario: Cambio de correo y de contraseña

- DADO un chef con usuario
- CUANDO el encargado cambia el correo y escribe una contraseña nueva
- ENTONCES el chef inicia sesión con el correo y la contraseña nuevos, y no con los anteriores

#### Escenario: Correo de otro usuario (error)

- DADO que el correo «ana@resto.com» pertenece a otro usuario
- CUANDO el encargado lo asigna al chef
- ENTONCES el sistema responde 409 y no cambia nada

#### Escenario: Chef inexistente (error)

- DADO un `id` que no existe
- CUANDO el encargado envía `PUT /chefs/999`
- ENTONCES el sistema responde 404 «El chef 999 no existe»

#### Escenario: El mismo correo y DNI del propio chef (límite)

- DADO un chef con su correo y DNI
- CUANDO el encargado guarda sin cambiarlos
- ENTONCES el sistema responde 200 (no cuenta como repetido)

### Requisito: Dar de baja un chef

El sistema DEBE permitir al encargado dar de baja un chef: pasa a `DESHABILITADO`, su `Usuario` pasa a `DESHABILITADO` y se borran sus sesiones (S4). Supuesto: en esta HU no hay reactivación de un chef dado de baja.

#### Escenario: Baja correcta (CA-1)

- DADO un chef con usuario y una sesión vigente
- CUANDO el encargado lo da de baja
- ENTONCES el sistema responde 200 con `estado: DESHABILITADO`, el usuario queda `DESHABILITADO` y el token del chef responde 401

#### Escenario: Un chef dado de baja no inicia sesión

- DADO un chef dado de baja
- CUANDO intenta iniciar sesión con sus credenciales
- ENTONCES el sistema responde 401 «Correo o contraseña incorrectos»

#### Escenario: Baja repetida (error)

- DADO un chef ya dado de baja
- CUANDO el encargado repite la baja
- ENTONCES el sistema responde 409 «El chef ya está dado de baja»

### Requisito: Listar chefs

El sistema DEBE permitir al encargado listar los chefs con paginación (`limit` por defecto 50 y máximo 100, `offset`) y filtrar por `estado`. Cada elemento DEBE incluir el `correo` y NO DEBE incluir la contraseña ni su hash.

#### Escenario: Listado paginado (CA-1)

- DADO tres chefs
- CUANDO el encargado llama a `GET /chefs?limit=2`
- ENTONCES recibe 2 elementos y el total 3

#### Escenario: Filtro por estado

- DADO un chef habilitado y otro deshabilitado
- CUANDO el encargado llama a `GET /chefs?estado=DESHABILITADO`
- ENTONCES recibe solo el deshabilitado

#### Escenario: Límite fuera de rango (error)

- DADO `limit=101`
- CUANDO se llama a `GET /chefs`
- ENTONCES el sistema responde 422

### Requisito: Pestaña «Chefs» en el frontend

El frontend DEBE agregar la pestaña «Chefs» junto a «Mozos» en el módulo de salón, visible solo para el encargado, con listado, alta, modificación y baja. Los formularios de alta y modificación DEBEN abrirse en un `Dialog` sobre la misma página (como `MozoFormDialog`), con los campos del chef más correo y contraseña. En la modificación, la contraseña vacía conserva la actual y el formulario lo indica. El título del módulo en el menú y en la página DEBE ser «Salón, Mozos y Chefs» (S8). Toda llamada pasa por el `api.ts` del módulo.

#### Escenario: El encargado crea un chef desde la pestaña (CA-1)

- DADO un encargado en la pestaña «Chefs»
- CUANDO abre «Nuevo chef», completa el formulario y guarda
- ENTONCES el diálogo se cierra, se muestra un aviso de éxito y el chef aparece en el listado

#### Escenario: Error de correo repetido

- DADO el formulario de alta
- CUANDO el servidor responde 409 por el correo
- ENTONCES el mensaje se muestra bajo el campo Correo y el diálogo sigue abierto

#### Escenario: Contraseña obligatoria al crear y opcional al editar

- DADO el formulario de alta y el de modificación
- CUANDO se envía el alta sin contraseña
- ENTONCES se informa «La contraseña es obligatoria.» y no se envía la solicitud
- Y en la modificación, la contraseña vacía se acepta

#### Escenario: Cancelar

- DADO el formulario con datos
- CUANDO presiono «Cancelar»
- ENTONCES el diálogo se cierra y no se envía ninguna solicitud

#### Escenario: Otros roles no ven la pestaña (CA-2)

- DADO un mozo o un chef con sesión
- CUANDO se muestra el módulo de salón (o el menú)
- ENTONCES no aparece la pestaña «Chefs»
