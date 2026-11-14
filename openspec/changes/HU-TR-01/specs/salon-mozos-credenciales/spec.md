# Delta para salon-mozos-credenciales (HU-TR-01)

Agrega correo y contraseña al alta y a la modificación de `Mozo` (M3) y vincula cada mozo con un `Usuario`. Solo el encargado gestiona mozos. Los datos y reglas de `Usuario` están en `autenticacion-sesion`.

## Datos

Campos que se agregan a la entrada de `Mozo`:

| Campo | Tipo | Regla |
| --- | --- | --- |
| `correo` | texto | Obligatorio al crear. Mismas reglas que `Usuario.correo`; único entre todos los usuarios sin distinguir mayúsculas. |
| `contrasena` | texto | Solo entrada, entre 8 y 72 bytes UTF-8. Obligatoria al crear. En la modificación: opcional si el mozo ya tiene usuario; obligatoria si no lo tiene (S5). |

`MozoSalida` agrega `correo` (texto o `null` si el mozo aún no tiene usuario). Nunca devuelve `contrasena` ni su hash. El formulario crea un usuario con un solo rol, `MOZO` (S3).

## Contrato de la API

| Ruta | Cambio | Errores nuevos |
| --- | --- | --- |
| `POST /api/v1/mozos` | `MozoCrear` suma `correo` y `contrasena` obligatorios. Crea el `Mozo` y su `Usuario` en una transacción. | 401; 403; 409 correo repetido; 422 |
| `PUT /api/v1/mozos/{id}` | `MozoModificar` suma `correo` (obligatorio) y `contrasena` (opcional, ver Datos). Crea o actualiza el `Usuario` vinculado. | 401; 403; 409 correo repetido; 422 |
| `GET /api/v1/mozos` | `MozoSalida` suma `correo`. | 401; 403 |
| `POST /api/v1/mozos/{id}/baja` | Además deshabilita el `Usuario` y borra sus sesiones (S4). | 401; 403 |

Mensajes: «Ya existe un usuario con el correo {correo}». Errores: `{"detalle": "mensaje"}` (D-26).

## ADDED Requirements

### Requisito: Crear un mozo con sus credenciales

El sistema DEBE crear el `Mozo` y su `Usuario` (rol `MOZO`, `HABILITADO`, contraseña con hash, vinculado) en una sola transacción: si falla uno, no se crea ninguno. DEBE rechazar con 409 un correo que ya pertenezca a otro usuario.

#### Escenario: Alta con correo y contraseña (CA-1)

- DADO un encargado en el formulario de alta de mozo
- CUANDO completa los datos del mozo, el correo «mozo@resto.com» y una contraseña válida y guarda
- ENTONCES el sistema responde 201 con el mozo y su `correo`, y existe un usuario con rol `MOZO` vinculado

#### Escenario: El mozo creado inicia sesión (CA-1)

- DADO un mozo recién creado
- CUANDO inicia sesión con su correo y contraseña
- ENTONCES el sistema responde 201 con `roles: ["MOZO"]`, su nombre y su apellido

#### Escenario: Correo repetido (error)

- DADO un usuario con el correo «ana@resto.com»
- CUANDO el encargado crea un mozo con ese correo
- ENTONCES el sistema responde 409 y no crea ni el mozo ni el usuario

#### Escenario: DNI repetido no deja usuario huérfano (error)

- DADO un mozo con DNI «30111222»
- CUANDO el encargado crea otro mozo con ese DNI y un correo nuevo
- ENTONCES el sistema responde 409 y no existe un usuario con ese correo

#### Escenario: Falta correo o contraseña, o es inválida

- DADO el alta de un mozo
- CUANDO falta el correo, tiene formato inválido, falta la contraseña, o tiene 7 caracteres o más de 72 bytes
- ENTONCES el sistema responde 422 y no se crea nada

#### Escenario: Sin permiso (CA-2)

- DADO un mozo, un chef o ninguna sesión
- CUANDO se envía `POST /mozos`
- ENTONCES responde 403 para mozo y chef, y 401 sin sesión

### Requisito: Modificar un mozo y sus credenciales

El sistema DEBE permitir al encargado editar los datos del mozo, su correo y su contraseña. La contraseña vacía o ausente conserva la actual cuando el mozo ya tiene usuario. Si el mozo no tiene usuario (mozos anteriores a esta HU, S5), el sistema DEBE exigir correo y contraseña y crear el usuario en la modificación. Cambiar la contraseña DEBE invalidar las sesiones del usuario.

#### Escenario: Modificar sin tocar la contraseña (CA-1)

- DADO un mozo con usuario
- CUANDO el encargado cambia el teléfono y deja la contraseña vacía
- ENTONCES el sistema responde 200 y el mozo sigue iniciando sesión con su contraseña

#### Escenario: Cambiar correo y contraseña

- DADO un mozo con usuario
- CUANDO el encargado cambia el correo y la contraseña
- ENTONCES el mozo inicia sesión solo con las credenciales nuevas y sus sesiones anteriores responden 401

#### Escenario: Mozo existente sin usuario (S5)

- DADO un mozo anterior a esta HU, sin usuario, que no puede iniciar sesión
- CUANDO el encargado lo modifica con un correo y una contraseña válidos
- ENTONCES se crea su `Usuario` con rol `MOZO` y el mozo puede iniciar sesión

#### Escenario: Mozo sin usuario y sin contraseña (error)

- DADO un mozo sin usuario
- CUANDO el encargado guarda sin contraseña
- ENTONCES el sistema responde 422 y no cambia nada

#### Escenario: Correo de otro usuario (error)

- DADO que el correo pertenece a otro usuario
- CUANDO el encargado lo asigna al mozo
- ENTONCES el sistema responde 409 y no cambia nada

#### Escenario: Guardar con el mismo correo (límite)

- DADO un mozo con usuario
- CUANDO el encargado guarda con su propio correo, sin cambios
- ENTONCES el sistema responde 200 (no cuenta como repetido)

### Requisito: Baja de mozo deshabilita su usuario

Al dar de baja un mozo el sistema DEBE pasar su `Usuario` a `DESHABILITADO` y borrar sus sesiones, en la misma transacción que la baja (S4). Un mozo sin usuario se da de baja sin otros efectos.

#### Escenario: Baja con sesión vigente (CA-1)

- DADO un mozo con usuario y una sesión vigente
- CUANDO el encargado lo da de baja
- ENTONCES el token del mozo responde 401 y no puede volver a iniciar sesión

#### Escenario: Baja de un mozo sin usuario (límite)

- DADO un mozo sin usuario
- CUANDO el encargado lo da de baja
- ENTONCES el sistema responde 200 y no se crea ni se modifica ningún usuario

### Requisito: Mozos con credenciales en el frontend

Los formularios de alta y de modificación de mozo (`Dialog` existente) DEBEN pedir correo y contraseña. En la modificación, la contraseña vacía conserva la actual (el formulario lo indica) salvo que el mozo no tenga usuario, caso en que es obligatoria. El listado de mozos DEBE mostrar el correo, o «Sin usuario» cuando es nulo (Supuesto: texto). La pestaña «Mozos», sus botones y acciones DEBEN verse solo para el encargado.

#### Escenario: Alta de mozo con credenciales desde el formulario (CA-1)

- DADO un encargado en el formulario de alta de mozo
- CUANDO completa todos los campos, incluidos correo y contraseña, y guarda
- ENTONCES el diálogo se cierra, se muestra un aviso de éxito y el mozo aparece en el listado con su correo

#### Escenario: Error 409 de correo repetido

- DADO el formulario de alta o modificación
- CUANDO el servidor responde 409 por el correo
- ENTONCES el mensaje se muestra bajo el campo Correo y el diálogo queda abierto

#### Escenario: Contraseña obligatoria al crear (error)

- DADO el formulario de alta
- CUANDO la contraseña está vacía o tiene menos de 8 caracteres
- ENTONCES se informa el error y no se envía la solicitud

#### Escenario: Mozo sin usuario en la modificación (límite)

- DADO un mozo que se muestra como «Sin usuario»
- CUANDO el encargado abre su modificación
- ENTONCES la contraseña es obligatoria; en un mozo con usuario es opcional

#### Escenario: Un mozo no ve la gestión de mozos (CA-2)

- DADO un mozo con sesión
- CUANDO se muestra el módulo de salón
- ENTONCES no aparece la pestaña «Mozos» ni ninguna acción de alta, modificación o baja de mozos
