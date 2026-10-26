# Delta para carta-productos

Cambio `HU-M1-07-08-09` (issues #10, #11 y #12): crear, consultar, modificar, reactivar y dar de baja una bebida. Las reglas que son las mismas de platos y postres se generalizan en los requisitos existentes (MODIFIED, con el encabezado exacto); lo propio de las bebidas va como requisito nuevo (ADDED). La única regla distinta de las bebidas es que los ingredientes son opcionales (S44). El `service` no cambia (E5): solo se agregan `BebidaCrear`, `BebidaModificar` y las rutas.

## ADDED Requirements

### Requisito: Contrato de la API de bebidas

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25. Las rutas de bebidas se suman a las de platos y postres; las solicitudes de `POST` y `PUT` son multipart/form-data con las partes `datos` (texto JSON) e `imagen` (archivo, opcional), igual que las de las otras categorías.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /bebidas` (multipart/form-data) | 201, `ProductoSalida` con `categoria` `BEBIDA` | 404, 409, 422 |
| `GET /bebidas/{id}` | 200, `ProductoSalida` | 404 |
| `PUT /bebidas/{id}` (multipart/form-data) | 200, `ProductoSalida` | 404, 409, 422 |
| `POST /bebidas/{id}/baja` (D-24) | 200, `ProductoSalida` con `estado` `DESHABILITADO` | 404, 409 |

Reglas del contrato:

- Los campos de `datos` son los de platos y postres (`nombre`, `seccion_id`, `precio`, `ingredientes`, `descripcion`, `etiquetas`) con una diferencia: `ingredientes` es opcional, con hasta 50 textos de 1 a 100 caracteres, sin repetidos; ausente equivale a lista vacía (S44, S47).
- `categoria` y `estado` no se reciben en el alta: el sistema asigna `BEBIDA` y `HABILITADO`. Dentro de `datos` son campos desconocidos y responden 422.
- `PUT /bebidas/{id}` es un reemplazo completo: `nombre`, `seccion_id` y `precio` son obligatorios; `ingredientes`, `descripcion` y `etiquetas` ausentes equivalen a vacíos y reemplazan a los actuales; `estado` opcional (si falta se conserva); `quitar_imagen` booleano opcional (S24). `BebidaModificar` extiende `BebidaCrear` y `ProductoModificar`.
- Un `id` inexistente, o que pertenece a un plato o un postre, responde 404 en las tres rutas con `id` (S34). Recíprocamente, `/platos/{id}` y `/postres/{id}` responden 404 para el `id` de una bebida.
- Orden de validación, igual que en las otras categorías: 422 de forma, 422 de imagen, 404 de sección, 409 de sección deshabilitada, 409 de nombre repetido; en `PUT`, 404 de la bebida antes del 404 de sección, y la sección se comprueba solo si `seccion_id` cambia (S19). Nada se guarda si algo falla.
- Datos: sin cambios de esquema ni migraciones; `BEBIDA` ya existe en el enum y el índice único (`categoria`, `nombre_normalizado`) separa las categorías. Backend: solo `schemas.py` y `router.py`.

#### Escenario: Rutas de bebidas disponibles

- DADA una bebida existente
- CUANDO se llama a `POST /bebidas`, `GET /bebidas/{id}`, `PUT /bebidas/{id}` y `POST /bebidas/{id}/baja`
- ENTONCES responden 201, 200, 200 y 200 respectivamente, todas con `ProductoSalida` con `categoria` `BEBIDA`

#### Escenario: Error con formato de la API

- DADO un `id` de bebida inexistente
- CUANDO se hace `GET /bebidas/{id}`
- ENTONCES responde 404 con `{"detalle": ...}`

### Requisito: Crear bebida (HU-M1-07 CA 1)

El sistema DEBE crear la bebida con categoría `BEBIDA` y estado `HABILITADO`, y responder 201 con `ProductoSalida`, con el nombre recortado, la sección elegida y los ingredientes y etiquetas enviados. El frontend DEBE ofrecer la página `/productos/bebidas/nuevo`, accesible con el botón «Nueva bebida» de la pestaña «Productos», junto a «Nuevo plato» y «Nuevo postre» (S45). El título y las migas DEBEN decir «Nueva bebida» y el botón de envío «Guardar bebida». Al guardar con éxito DEBE avisar «Bebida creada» y volver al listado de productos (S46).

#### Escenario: Alta válida mínima

- DADO un nombre libre, una sección habilitada y un precio válido
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con `categoria` `BEBIDA`, `estado` `HABILITADO`, `ingredientes` vacío, `imagen_url` `null`, `descripcion` `null` y `etiquetas` vacío

#### Escenario: Alta completa

- DADO todos los campos válidos, con ingredientes, descripción, etiquetas e imagen
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con todos los datos enviados y un `imagen_url` que empieza con `/media/`

#### Escenario: Botón «Nueva bebida»

- DADO la pestaña «Productos»
- CUANDO se observan las acciones de alta
- ENTONCES existen los botones «Nuevo plato», «Nuevo postre» y «Nueva bebida», y este último abre `/productos/bebidas/nuevo`

#### Escenario: Formulario con título de bebida

- DADO la ruta `/productos/bebidas/nuevo`
- CUANDO se abre la página
- ENTONCES el título y las migas dicen «Nueva bebida» y el botón de envío dice «Guardar bebida»

#### Escenario: Alta de bebida desde la pantalla

- DADO el formulario «Nueva bebida» completo
- CUANDO la persona pulsa «Guardar bebida»
- ENTONCES se envía una sola solicitud multipart a `/bebidas`, se muestra el aviso «Bebida creada» y se vuelve a la pestaña «Productos»

### Requisito: Nombre único entre bebidas (HU-M1-07 CA 3)

El nombre DEBE ser único entre las bebidas, también las deshabilitadas, sin distinguir mayúsculas (`casefold()`) y tras `strip()`. Si ya existe, responde 409 «La bebida ya está registrada» (S43). Un producto de otra categoría con el mismo nombre NO DEBE bloquear el alta (S14).

#### Escenario: Nombre repetido con otra capitalización

- DADO una bebida «Agua»
- CUANDO se crea «  agua »
- ENTONCES responde 409 con el detalle «La bebida ya está registrada» y el formulario muestra esa advertencia

#### Escenario: Nombre de una bebida deshabilitada

- DADO una bebida «Limonada» deshabilitada
- CUANDO se crea «Limonada»
- ENTONCES responde 409

#### Escenario: Una bebida puede llamarse igual que un plato o un postre

- DADO un plato o un postre «Tiramisú»
- CUANDO se crea una bebida «Tiramisú»
- ENTONCES responde 201
- Y crear después otra bebida «Tiramisú» responde 409 «La bebida ya está registrada»

### Requisito: Consultar una bebida

El sistema DEBE devolver la bebida con `GET /bebidas/{id}` para cargar el formulario de edición, que DEBE mostrar sus datos actuales (nombre, sección, precio, ingredientes, descripción, etiquetas, imagen y estado).

#### Escenario: Bebida existente

- DADO una bebida existente
- CUANDO se hace `GET /bebidas/{id}`
- ENTONCES responde 200 con su `ProductoSalida` con `categoria` `BEBIDA`

#### Escenario: Id inexistente o de otra categoría

- DADO un id que no existe, o que corresponde a un plato o un postre
- CUANDO se hace `GET /bebidas/{id}`
- ENTONCES responde 404 con `{"detalle": ...}`

#### Escenario: Una bebida no se consulta como plato ni como postre

- DADO una bebida existente
- CUANDO se hace `GET`, `PUT` o `POST .../baja` sobre `/platos/{id}` o `/postres/{id}` con su id
- ENTONCES responde 404 y la bebida no cambia

#### Escenario: Formulario cargado

- DADO una bebida existente
- CUANDO se abre `/productos/bebidas/:id/editar`
- ENTONCES los campos muestran los datos actuales, con título «Editar bebida» y botón «Guardar cambios»

#### Escenario: Bebida inexistente en la pantalla

- DADO un id de bebida inexistente
- CUANDO se abre `/productos/bebidas/:id/editar`
- ENTONCES se muestra «La bebida no existe.» y, mientras carga, «Cargando bebida...»

### Requisito: Modificar los datos de la bebida (HU-M1-08 CA 1)

El sistema DEBE actualizar la bebida con los valores válidos recibidos y responder 200 con `ProductoSalida` con los datos nuevos. Al guardar con éxito el frontend DEBE avisar «Bebida modificada» y volver al listado de productos.

#### Escenario: Cambio válido de datos

- DADO una bebida existente
- CUANDO se hace `PUT /bebidas/{id}` con otro nombre, precio, descripción y sección habilitada
- ENTONCES responde 200 con los datos nuevos y un `GET /bebidas/{id}` posterior los devuelve iguales

#### Escenario: Guardar sin cambiar el nombre

- DADO una bebida «Agua»
- CUANDO se hace `PUT` con el mismo nombre y otro precio
- ENTONCES responde 200 (el nombre propio no cuenta como repetido)

#### Escenario: Modificación desde la pantalla

- DADO el formulario de edición de una bebida con un precio nuevo
- CUANDO la persona pulsa «Guardar cambios»
- ENTONCES se envía una sola solicitud multipart `PUT /bebidas/{id}`, se muestra el aviso de éxito y se vuelve a «Productos»

### Requisito: Modificar ingredientes, etiquetas e imagen de la bebida (HU-M1-08 CA 2)

El sistema DEBE permitir agregar o quitar ingredientes y etiquetas, y mantener, reemplazar o quitar la imagen, con las mismas reglas que el plato: las listas enviadas reemplazan a las actuales; sin parte `imagen` y `quitar_imagen` `false` se conserva la imagen; con parte `imagen` válida la reemplaza; con `quitar_imagen` `true` y sin parte `imagen` queda sin imagen. Los ingredientes son opcionales: una lista vacía es válida y reemplaza a la actual (S44). El archivo anterior se borra solo después del `commit` (S22).

#### Escenario: Agregar y quitar ingredientes y etiquetas

- DADO una bebida con ingredientes «Limón» y «Azúcar» y etiqueta «Casero»
- CUANDO se hace `PUT` con ingredientes «Limón» y «Menta» y sin etiquetas
- ENTONCES responde 200 con `ingredientes` «Limón» y «Menta» y `etiquetas` vacío

#### Escenario: Quitar todos los ingredientes

- DADO una bebida con ingredientes «Limón» y «Azúcar»
- CUANDO se hace `PUT` con `ingredientes` vacío o ausente
- ENTONCES responde 200 con `ingredientes` vacío

#### Escenario: Imagen conservada

- DADO una bebida con imagen
- CUANDO se hace `PUT` sin parte `imagen` y sin `quitar_imagen`
- ENTONCES `imagen_url` es el mismo y el archivo sigue existiendo

#### Escenario: Imagen reemplazada

- DADO una bebida con imagen
- CUANDO se hace `PUT` con una imagen PNG válida
- ENTONCES `imagen_url` cambia, el archivo nuevo se sirve con 200 y el anterior ya no está en `MEDIA_DIR`

#### Escenario: Imagen quitada

- DADO una bebida con imagen
- CUANDO se hace `PUT` con `quitar_imagen` `true`
- ENTONCES `imagen_url` es `null` y el archivo anterior ya no está en `MEDIA_DIR`

#### Escenario: Quitar y reemplazar a la vez

- DADO `quitar_imagen` `true` y una parte `imagen` válida
- CUANDO se hace `PUT`
- ENTONCES responde 422 y la bebida no cambia

#### Escenario: Cambios en el formulario

- DADO el formulario de edición de una bebida con un chip quitado, otro agregado y la imagen quitada
- CUANDO la persona guarda
- ENTONCES se envían las listas resultantes y `quitar_imagen` igual a `true`

#### Escenario: Formulario sin ingredientes

- DADO el formulario de edición de una bebida en el que se quitan todos los chips de ingredientes
- CUANDO la persona guarda
- ENTONCES se envía la solicitud con `ingredientes` vacío y se muestra el aviso de éxito

### Requisito: Reglas de validación del alta en la modificación de la bebida (HU-M1-08 CA 3)

Un valor que no cumple las reglas de HU-M1-07 DEBE responder 422 (formato, obligatoriedad, largo, imagen) o 409 (nombre repetido, sección deshabilitada), sin aplicar ningún cambio e indicando qué dato es inválido. Las reglas son las del plato y del postre, salvo que los ingredientes son opcionales (una lista vacía es válida; un ingrediente repetido o de más de 100 caracteres responde 422). El nombre DEBE ser único entre las bebidas, también las deshabilitadas, sin distinguir mayúsculas, excluyendo a la propia bebida; el mensaje es «La bebida ya está registrada». La sección DEBE existir (404) y estar habilitada (409), solo si `seccion_id` cambia (S19). El formulario DEBE mostrar bajo cada campo inválido qué dato falla y NO DEBE enviar la solicitud si la validación local falla.

#### Escenario: Nombre vacío o demasiado largo

- DADO una bebida existente
- CUANDO se hace `PUT` con `nombre` igual a `"   "` o de 101 caracteres
- ENTONCES responde 422, indica `nombre` y la bebida conserva sus datos

#### Escenario: Precio inválido

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `precio`, y la bebida conserva su precio

#### Escenario: Ingredientes repetidos

- DADO `ingredientes` igual a «Limón» y « limón »
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Etiquetas y descripción inválidas

- DADO una etiqueta de 31 caracteres, etiquetas «casero» y «Casero», o una descripción de 501 caracteres
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `etiquetas` o `descripcion`

#### Escenario: Imagen inválida

- DADO un PDF, un archivo de texto llamado `bebida.jpg` o una imagen de 5 MB más 1 byte
- CUANDO se hace `PUT`
- ENTONCES responde 422, la bebida conserva su imagen y no queda archivo nuevo en `MEDIA_DIR`

#### Escenario: Nombre duplicado

- DADO las bebidas «Agua» y «Limonada» (esta última deshabilitada)
- CUANDO se modifica «Agua» con el nombre « limonada »
- ENTONCES responde 409 con «La bebida ya está registrada» y «Agua» no cambia

#### Escenario: Mismo nombre que un plato o un postre

- DADO un plato «Milanesa»
- CUANDO se modifica una bebida con el nombre «Milanesa»
- ENTONCES responde 200

#### Escenario: Sección inexistente o deshabilitada

- DADO un `seccion_id` inexistente, o de una sección deshabilitada
- CUANDO se hace `PUT`
- ENTONCES responde 404 o 409 respectivamente y la bebida no cambia

#### Escenario: Error indicado en el formulario

- DADO el formulario de edición con el precio `abc` y el nombre vacío
- CUANDO la persona guarda
- ENTONCES no se envía la solicitud y cada campo muestra qué dato es inválido

#### Escenario: Nombre duplicado en el formulario

- DADO que el servidor responde 409 por nombre repetido
- CUANDO la persona guarda
- ENTONCES el formulario muestra «La bebida ya está registrada» bajo el nombre y los datos escritos se conservan

### Requisito: Atomicidad de la modificación de la bebida

Si falla cualquier validación, la escritura del archivo o el `commit`, la bebida DEBE conservar todos sus datos e imagen; si el `commit` falla tras escribir una imagen nueva, el archivo nuevo DEBE borrarse y el anterior conservarse (S22).

#### Escenario: Falla el commit

- DADO una bebida con imagen y una imagen nueva válida, con un fallo simulado al confirmar la transacción
- CUANDO se hace `PUT`
- ENTONCES la bebida conserva sus datos, su `imagen_url` anterior sigue sirviéndose y no queda el archivo nuevo en `MEDIA_DIR`

### Requisito: Las facturas conservan el precio de la bebida (HU-M1-08 CA 4, S18)

Modificar el precio de una bebida NO DEBE borrar ni alterar ninguna fila que la referencie. `Factura` no existe todavía (M6) y copia el precio al emitir (`precioUnitario {copia al emitir}`); este cambio solo DEBE garantizar que la modificación actualiza la bebida en su fila (mismo `id`) sin tocar tablas ajenas.

#### Escenario: La bebida conserva su identidad al cambiar el precio

- DADO una bebida con `id` N referenciada por una fila de otra tabla (fila de prueba con clave foránea a `productos.id`)
- CUANDO se hace `PUT` con un precio nuevo
- ENTONCES la bebida sigue con el mismo `id` N, el precio nuevo, y la fila que la referencia permanece intacta

### Requisito: Reactivar una bebida deshabilitada (HU-M1-08 CA 5)

El sistema DEBE permitir cambiar el estado de `DESHABILITADO` a `HABILITADO` con `PUT` y, desde ese momento, la bebida DEBE volver a figurar en `GET /api/v1/productos`. Aparece en la carta si su sección está habilitada; reactivarla en una sección deshabilitada NO se bloquea (S19). El formulario DEBE mostrar el estado como interruptor editable «Habilitado» solo en edición.

#### Escenario: Reactivación

- DADO una bebida `DESHABILITADO` en una sección habilitada
- CUANDO se hace `PUT` con `estado` `HABILITADO`
- ENTONCES responde 200 con `estado` `HABILITADO` y la bebida vuelve a figurar en `GET /api/v1/productos`

#### Escenario: Reactivar en una sección deshabilitada

- DADO una bebida `DESHABILITADO` cuya sección está deshabilitada
- CUANDO se hace `PUT` con `estado` `HABILITADO` y la misma `seccion_id`
- ENTONCES responde 200 y queda `HABILITADO`, sin aparecer en la carta mientras la sección esté deshabilitada

#### Escenario: Estado inválido

- DADO `estado` igual a `ANULADO`
- CUANDO se hace `PUT /bebidas/{id}`
- ENTONCES responde 422 e indica `estado`

#### Escenario: Reactivar desde el formulario

- DADO el formulario de edición de una bebida deshabilitada
- CUANDO la persona activa «Habilitado» y guarda
- ENTONCES se envía `estado` `HABILITADO` y se muestra el aviso de éxito

### Requisito: Dar de baja una bebida (HU-M1-09 CA 1)

El sistema DEBE pasar la bebida `HABILITADO` a `DESHABILITADO` con `POST /bebidas/{id}/baja` y responder 200 con `ProductoSalida`. La bebida DEJA de figurar en `GET /api/v1/productos` (lista de habilitados) y en la carta. Dar de baja una bebida ya `DESHABILITADO` responde 409 (S21). La baja NO se bloquea por menús ni comandas (S20). El frontend DEBE ofrecer «Dar de baja» en la pantalla de edición, que abre un `ConfirmDialog` y, al confirmar, avisa «Bebida dada de baja» y vuelve al listado de productos.

#### Escenario: Baja confirmada

- DADO una bebida `HABILITADO`
- CUANDO se hace `POST /bebidas/{id}/baja`
- ENTONCES responde 200 con `estado` `DESHABILITADO` y la bebida ya no figura en `GET /api/v1/productos`

#### Escenario: Baja de una bebida ya deshabilitada

- DADO una bebida `DESHABILITADO`
- CUANDO se hace `POST /bebidas/{id}/baja`
- ENTONCES responde 409 con `{"detalle": ...}` y la bebida no cambia

#### Escenario: Baja de un id inexistente o de otra categoría

- DADO un id que no existe o que es de un plato o un postre
- CUANDO se hace `POST /bebidas/{id}/baja`
- ENTONCES responde 404

#### Escenario: Baja de una bebida usada por un menú o una comanda

- DADO una bebida referenciada por otra tabla
- CUANDO se hace `POST /bebidas/{id}/baja`
- ENTONCES responde 200 y la fila que la referencia permanece intacta

#### Escenario: Baja desde la pantalla

- DADO la pantalla de edición de una bebida habilitada
- CUANDO la persona pulsa «Dar de baja» y confirma en el diálogo
- ENTONCES se envía `POST /bebidas/{id}/baja`, se muestra el aviso «Bebida dada de baja» y se vuelve a «Productos»

### Requisito: Cancelar la baja de la bebida (HU-M1-09 CA 2)

Si la persona cancela el diálogo de confirmación, el sistema NO DEBE enviar ninguna solicitud y la bebida DEBE seguir `HABILITADO`. El texto de confirmación es «La bebida quedará deshabilitada y dejará de mostrarse en la carta. Puede volver a habilitarla desde la pantalla de edición.» (S46, S48).

#### Escenario: Cancelar la confirmación

- DADO el diálogo de baja de una bebida abierto
- CUANDO la persona pulsa «Cancelar»
- ENTONCES se cierra el diálogo, no se envía ninguna solicitud y la bebida sigue `HABILITADO`

### Requisito: La baja conserva los datos de la bebida (HU-M1-09 CA 3, S18)

Una bebida `DESHABILITADO` DEBE conservar todos sus datos (nombre, precio, ingredientes, etiquetas, descripción, imagen, sección) y su fila. La baja NO borra filas ni archivos. Que siga figurando en facturas y reportes anteriores lo garantiza que `Factura` copia el precio al emitir y que la fila de la bebida nunca se elimina.

#### Escenario: Datos intactos tras la baja

- DADO una bebida con todos sus datos e imagen
- CUANDO se da de baja
- ENTONCES `GET /bebidas/{id}` responde 200 con los mismos datos, `estado` `DESHABILITADO` y la imagen sigue sirviéndose

#### Escenario: Filas relacionadas intactas

- DADO una bebida referenciada por una fila de otra tabla
- CUANDO se da de baja
- ENTONCES la fila de la bebida y la que la referencia siguen presentes

### Requisito: Reactivar una bebida dada de baja (HU-M1-09 CA 4)

Una bebida `DESHABILITADO` DEBE poder reactivarse desde la modificación (`PUT` con `estado` `HABILITADO`, HU-M1-08). La persona filtra la lista por Deshabilitados (HU-M1-13), encuentra la bebida, abre su edición desde la fila y la reactiva. La pantalla de edición DEBE abrirse para una bebida deshabilitada y NO DEBE ofrecer «Dar de baja».

#### Escenario: Bebida deshabilitada consultable

- DADO una bebida `DESHABILITADO`
- CUANDO se hace `GET /bebidas/{id}`
- ENTONCES responde 200 con `estado` `DESHABILITADO`

#### Escenario: Bebida deshabilitada en el filtro

- DADO una bebida dada de baja
- CUANDO se hace `GET /productos?estado=DESHABILITADO`
- ENTONCES la bebida figura en la lista

#### Escenario: Pantalla de edición de una bebida deshabilitada

- DADO una bebida `DESHABILITADO`
- CUANDO se abre `/productos/bebidas/:id/editar`
- ENTONCES el interruptor de estado aparece apagado, se puede activar y el botón «Dar de baja» no se ofrece

#### Escenario: Reactivar desde la lista filtrada

- DADO una bebida dada de baja y la lista abierta
- CUANDO la persona elige el filtro «Deshabilitados», abre la edición desde la fila de la bebida, activa «Habilitado» y guarda
- ENTONCES se envía `PUT /bebidas/{id}` con `estado` `HABILITADO`, y al volver a «Productos» la bebida aparece con el filtro «Habilitados» y ya no con «Deshabilitados»

### Requisito: El alta y la edición de platos y postres no cambian con las bebidas (regresión)

Agregar las bebidas NO DEBE alterar `POST`, `PUT` ni `POST .../baja` de `/platos` y `/postres`, ni sus formularios, títulos, botones y mensajes. Los ingredientes siguen siendo obligatorios (al menos 1) para platos y postres. El `service` y los tipos compartidos del frontend se amplían sin cambiar el comportamiento de las categorías existentes.

#### Escenario: Ingredientes obligatorios en platos y postres

- DADO una solicitud sin ingredientes
- CUANDO se hace `POST /platos` o `POST /postres`
- ENTONCES responde 422 e indica `ingredientes`, y los formularios de plato y de postre siguen exigiéndolos

#### Escenario: Pruebas existentes

- DADO las pruebas de alta, edición y baja de platos y postres, y las de la lista
- CUANDO se corre la suite
- ENTONCES pasan, adaptadas solo por nombres o rutas

## MODIFIED Requirements

### Requisito: Campos obligatorios (HU-M1-01 CA 2, HU-M1-04 CA 2)

En `POST /platos`, `POST /postres` y `POST /bebidas`, faltar `nombre`, `seccion_id` o `precio`, o un nombre vacío tras `strip()`, DEBE responder 422 sin guardar e indicar el campo faltante; en platos y postres también `ingredientes` es obligatorio, y en bebidas no lo es (S44; HU-M1-07 CA 2). El formulario de alta de cada categoría DEBE mostrar bajo cada campo obligatorio vacío qué falta y NO DEBE enviar la solicitud.

#### Escenario: Falta el nombre

- DADO una solicitud sin `nombre`
- CUANDO se hace `POST /platos`
- ENTONCES responde 422, indica `nombre` y no se crea nada

#### Escenario: Nombre solo con espacios

- DADO `nombre` igual a `"   "`
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica `nombre`

#### Escenario: Faltan sección y precio

- DADO una solicitud sin `seccion_id` ni `precio`
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica ambos campos

#### Escenario: Formulario con campos vacíos

- DADO el formulario con nombre, sección, precio e ingredientes vacíos
- CUANDO la persona pulsa «Guardar plato»
- ENTONCES no se envía la solicitud y cada campo muestra un mensaje de obligatorio

#### Escenario: Faltan campos obligatorios

- DADO una solicitud sin `nombre`, o con `nombre` igual a `"   "`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422, indica `nombre` y no se crea nada

#### Escenario: Faltan sección y precio (postre)

- DADO una solicitud sin `seccion_id` ni `precio`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica ambos campos

#### Escenario: Formulario de postre con campos vacíos

- DADO el formulario «Nuevo postre» con nombre, sección, precio e ingredientes vacíos
- CUANDO la persona pulsa «Guardar postre»
- ENTONCES no se envía la solicitud y cada campo muestra un mensaje de obligatorio

#### Escenario: Falta el nombre (bebida)

- DADO una solicitud sin `nombre`, o con `nombre` igual a `"   "`
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422, indica `nombre` y no se crea nada

#### Escenario: Faltan sección y precio (bebida)

- DADO una solicitud sin `seccion_id` ni `precio`
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 e indica ambos campos

#### Escenario: Formulario de bebida con campos vacíos

- DADO el formulario «Nueva bebida» con nombre, sección y precio vacíos
- CUANDO la persona pulsa «Guardar bebida»
- ENTONCES no se envía la solicitud y cada campo obligatorio muestra un mensaje de obligatorio, y el campo de ingredientes no muestra ninguno

### Requisito: Largo del nombre (HU-M1-01 CA 4, HU-M1-04 CA 4)

El nombre del plato, del postre o de la bebida DEBE tener como máximo 100 caracteres tras `strip()`; más responde 422. PUEDE contener números (HU-M1-07 CA 4).

#### Escenario: Nombre de 101 caracteres

- DADO un nombre de 101 caracteres
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 y el formulario advierte que el nombre supera el largo permitido

#### Escenario: Nombre de 100 caracteres con números

- DADO un nombre de exactamente 100 caracteres que incluye dígitos
- CUANDO se hace `POST /platos`
- ENTONCES responde 201

#### Escenario: Nombre de 101 caracteres (postre)

- DADO un nombre de 101 caracteres
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 y el formulario advierte que el nombre supera el largo permitido

#### Escenario: Nombre de 100 caracteres con números (postre)

- DADO un nombre de exactamente 100 caracteres que incluye dígitos
- CUANDO se hace `POST /postres`
- ENTONCES responde 201

#### Escenario: Nombre de 101 caracteres (bebida)

- DADO un nombre de 101 caracteres
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 y el formulario advierte que el nombre supera el largo permitido

#### Escenario: Nombre de 100 caracteres con números (bebida)

- DADO un nombre de exactamente 100 caracteres que incluye dígitos
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201

### Requisito: Precio válido (HU-M1-01 CA 5, HU-M1-04 CA 5)

El precio del plato, del postre o de la bebida DEBE ser un decimal mayor a 0, con hasta 8 dígitos enteros y 2 decimales (S4; HU-M1-07 CA 5). Cero, negativos, texto, más de 2 decimales o más de 8 enteros DEBEN responder 422. El formulario de cada categoría DEBE aceptar la coma como separador decimal (por ejemplo `12.500,50`) y convertirlo a punto antes de enviar, y DEBE mostrar que el precio es inválido cuando no cumple.

#### Escenario: Precio con dos decimales

- DADO `precio` igual a `1500.50`
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con el precio `"1500.50"`

#### Escenario: Precio inválido

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica `precio`

#### Escenario: Precio con coma en el formulario

- DADO el precio `12.500,50` escrito en el formulario
- CUANDO la persona guarda
- ENTONCES se envía `precio` igual a `12500.50`

#### Escenario: Precio inválido en el formulario

- DADO el precio `abc` en el formulario
- CUANDO la persona guarda
- ENTONCES no se envía la solicitud y el campo muestra que el precio es inválido

#### Escenario: Precio con dos decimales (postre)

- DADO `precio` igual a `1500.50`
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con el precio `"1500.50"`

#### Escenario: Precio inválido (postre)

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `precio`

#### Escenario: Precio con coma en el formulario de postre

- DADO el precio `12.500,50` escrito en el formulario «Nuevo postre»
- CUANDO la persona guarda
- ENTONCES se envía `precio` igual a `12500.50`, y con `abc` no se envía la solicitud y el campo muestra que el precio es inválido

#### Escenario: Precio con dos decimales (bebida)

- DADO `precio` igual a `1500.50`
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con el precio `"1500.50"`

#### Escenario: Precio inválido (bebida)

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 e indica `precio`

#### Escenario: Precio con coma en el formulario de bebida

- DADO el precio `12.500,50` escrito en el formulario «Nueva bebida»
- CUANDO la persona guarda
- ENTONCES se envía `precio` igual a `12500.50`, y con `abc` no se envía la solicitud y el campo muestra que el precio es inválido

### Requisito: Ingredientes obligatorios y sin repetidos (HU-M1-01 CA 6, HU-M1-04 CA 6)

El plato o el postre DEBE tener al menos un ingrediente; la lista vacía responde 422. La bebida es la excepción: sus ingredientes son opcionales (S44; HU-M1-07 CA 6), una lista vacía o ausente es válida y la bebida se registra igual. En las tres categorías, cada ingrediente DEBE tener de 1 a 100 caracteres tras `strip()` y no repetirse (`casefold()`, S2); un repetido o vacío responde 422. En el formulario de las tres categorías, los ingredientes se cargan como chips: «Enter» agrega el texto escrito; un texto vacío o repetido NO DEBE agregarse y DEBE mostrar un mensaje; cada chip DEBE poder quitarse. En platos y postres el formulario exige al menos un chip; en bebidas no.

#### Escenario: Sin ingredientes

- DADO una solicitud sin ingredientes
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Ingredientes repetidos

- DADO `ingredientes` igual a «Huevo» y « huevo »
- CUANDO se hace `POST /platos`
- ENTONCES responde 422

#### Escenario: Chip vacío o repetido

- DADO el chip «Huevo» ya agregado
- CUANDO la persona escribe «huevo» o solo espacios y pulsa Enter
- ENTONCES no se agrega ningún chip y se muestra un mensaje bajo el campo

#### Escenario: Quitar un chip

- DADO los chips «Huevo» y «Pan»
- CUANDO la persona quita «Huevo»
- ENTONCES queda solo «Pan» y se enviará únicamente ese ingrediente

#### Escenario: Sin ingredientes (postre)

- DADO una solicitud sin ingredientes
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Ingredientes repetidos (postre)

- DADO `ingredientes` igual a «Huevo» y « huevo »
- CUANDO se hace `POST /postres`
- ENTONCES responde 422

#### Escenario: Chips de ingredientes en el formulario de postre

- DADO el formulario «Nuevo postre» con el chip «Huevo» agregado
- CUANDO la persona escribe «huevo» o solo espacios y pulsa Enter
- ENTONCES no se agrega ningún chip y se muestra un mensaje bajo el campo
- Y al quitar el chip «Huevo» no queda ninguno y guardar se rechaza por ingredientes obligatorios

#### Escenario: Sin ingredientes (bebida)

- DADO una solicitud sin `ingredientes`, o con `ingredientes` vacío
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con `ingredientes` vacío

#### Escenario: Ingredientes repetidos o vacíos (bebida)

- DADO `ingredientes` igual a «Limón» y « limón », o con un texto vacío
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Chips de ingredientes en el formulario de bebida

- DADO el formulario «Nueva bebida» con el chip «Limón» agregado
- CUANDO la persona escribe «limón» o solo espacios y pulsa Enter
- ENTONCES no se agrega ningún chip y se muestra un mensaje bajo el campo
- Y al quitar el chip «Limón» no queda ninguno y guardar se permite, sin mensaje de ingredientes obligatorios

### Requisito: Descripción opcional (HU-M1-01 CA 7, HU-M1-04 CA 7)

La descripción del plato, del postre o de la bebida es opcional y DEBE tener como máximo 500 caracteres tras `strip()` (lo fija el issue #2; HU-M1-07 CA 7); más responde 422. Una descripción vacía se guarda como `null`. El formulario DEBE mostrar el contador de caracteres.

#### Escenario: Sin descripción

- DADO una solicitud sin `descripcion`
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con `descripcion` `null`

#### Escenario: Descripción demasiado larga

- DADO una descripción de 501 caracteres
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica `descripcion`

#### Escenario: Sin descripción (postre)

- DADO una solicitud sin `descripcion`
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con `descripcion` `null`

#### Escenario: Descripción demasiado larga (postre)

- DADO una descripción de 501 caracteres
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `descripcion`

#### Escenario: Sin descripción (bebida)

- DADO una solicitud sin `descripcion`
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con `descripcion` `null`

#### Escenario: Descripción demasiado larga (bebida)

- DADO una descripción de 501 caracteres
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 e indica `descripcion`

### Requisito: Sin secciones habilitadas (HU-M1-01 CA 8, HU-M1-04 CA 8)

Si no existe ninguna sección habilitada, el formulario de alta de plato, de postre o de bebida (HU-M1-07 CA 8) DEBE mostrar el aviso «Primero hay que crear una sección» con un enlace a la pestaña «Secciones» y DEBE deshabilitar su botón de envío («Guardar plato», «Guardar postre» o «Guardar bebida»).

#### Escenario: No hay secciones habilitadas

- DADO que `GET /secciones?estado=HABILITADO` devuelve `items` vacío
- CUANDO se abre `/productos/nuevo`
- ENTONCES se muestra el aviso con el enlace a «Secciones» y «Guardar plato» está deshabilitado

#### Escenario: Solo hay secciones deshabilitadas

- DADO que todas las secciones están deshabilitadas
- CUANDO se abre `/productos/nuevo`
- ENTONCES se muestra el mismo aviso

#### Escenario: No hay secciones habilitadas (postre)

- DADO que `GET /secciones?estado=HABILITADO` devuelve `items` vacío
- CUANDO se abre `/productos/postres/nuevo`
- ENTONCES se muestra el aviso con el enlace a «Secciones» y «Guardar postre» está deshabilitado

#### Escenario: No hay secciones habilitadas (bebida)

- DADO que `GET /secciones?estado=HABILITADO` devuelve `items` vacío
- CUANDO se abre `/productos/bebidas/nuevo`
- ENTONCES se muestra el aviso con el enlace a «Secciones» y «Guardar bebida» está deshabilitado

### Requisito: Sección habilitada y existente (HU-M1-01 CA 9, HU-M1-04 CA 9)

En el alta de un plato, de un postre o de una bebida (HU-M1-07 CA 9), la sección DEBE existir (404 si no) y estar habilitada (409 si no). El selector de sección DEBE listar solo las secciones habilitadas, ordenadas por `orden`, obtenidas con `GET /secciones?estado=HABILITADO`; una sección deshabilitada NO DEBE aparecer.

#### Escenario: Sección inexistente

- DADO un `seccion_id` que no existe
- CUANDO se hace `POST /platos`
- ENTONCES responde 404 y no se crea el plato

#### Escenario: Sección deshabilitada

- DADO una sección deshabilitada
- CUANDO se hace `POST /platos` con su id
- ENTONCES responde 409 y no se crea el plato

#### Escenario: Selector solo con habilitadas

- DADO secciones habilitadas y deshabilitadas
- CUANDO se abre el formulario
- ENTONCES el selector muestra solo las habilitadas

#### Escenario: Sección inexistente (postre)

- DADO un `seccion_id` que no existe
- CUANDO se hace `POST /postres`
- ENTONCES responde 404 y no se crea el postre

#### Escenario: Sección deshabilitada (postre)

- DADO una sección deshabilitada
- CUANDO se hace `POST /postres` con su id
- ENTONCES responde 409 y no se crea el postre

#### Escenario: Selector solo con habilitadas (postre)

- DADO secciones habilitadas y deshabilitadas
- CUANDO se abre el formulario «Nuevo postre»
- ENTONCES el selector muestra solo las habilitadas

#### Escenario: Sección inexistente (bebida)

- DADO un `seccion_id` que no existe
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 404 y no se crea la bebida

#### Escenario: Sección deshabilitada (bebida)

- DADO una sección deshabilitada
- CUANDO se hace `POST /bebidas` con su id
- ENTONCES responde 409 y no se crea la bebida

#### Escenario: Selector solo con habilitadas (bebida)

- DADO secciones habilitadas y deshabilitadas
- CUANDO se abre el formulario «Nueva bebida»
- ENTONCES el selector muestra solo las habilitadas

### Requisito: Imagen válida por contenido (HU-M1-01 CA 10, HU-M1-04 CA 10)

La imagen es opcional, con las mismas reglas para platos, postres y bebidas (HU-M1-07 CA 10). El sistema DEBE validar por contenido (no por extensión ni `Content-Type`) que sea JPG, PNG o HEIC y que pese como máximo 5 MB (5 242 880 bytes). Otro formato, un archivo corrupto o un tamaño mayor DEBE responder 422 con un mensaje que nombre los formatos y el tamaño permitidos, y cancelar el alta completa, sin crear el plato, el postre ni la bebida y sin dejar archivo (S7). El formulario de cada categoría DEBE rechazar antes de enviar un archivo de más de 5 MB y mostrar el mismo mensaje.

#### Escenario: Formato no permitido

- DADO un PDF enviado como `imagen`
- CUANDO se hace `POST /platos`
- ENTONCES responde 422, no se crea el plato y no queda archivo en `MEDIA_DIR`

#### Escenario: Extensión falsa

- DADO un archivo de texto llamado `plato.jpg`
- CUANDO se hace `POST /platos`
- ENTONCES responde 422

#### Escenario: Imagen de más de 5 MB

- DADO una imagen válida de 5 MB más 1 byte
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 y no se crea el plato

#### Escenario: Imagen de tamaño permitido

- DADO una imagen PNG válida de 2 MB
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 y `GET` de su `imagen_url` devuelve 200

#### Escenario: Rechazo en el formulario

- DADO un archivo de 6 MB elegido en el selector
- CUANDO la persona lo elige
- ENTONCES no se acepta, se muestra el mensaje de tamaño y no se envía nada

#### Escenario: Formato no permitido o extensión falsa

- DADO un PDF, o un archivo de texto llamado `postre.jpg`, enviado como `imagen`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422, no se crea el postre y no queda archivo en `MEDIA_DIR`

#### Escenario: Imagen de más de 5 MB (postre)

- DADO una imagen válida de 5 MB más 1 byte
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 y no se crea el postre

#### Escenario: Imagen de tamaño permitido (postre)

- DADO una imagen PNG válida de 2 MB
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 y `GET` de su `imagen_url` devuelve 200

#### Escenario: Rechazo en el formulario de postre

- DADO un archivo de 6 MB elegido en el selector de «Nuevo postre»
- CUANDO la persona lo elige
- ENTONCES no se acepta, se muestra el mensaje de tamaño y no se envía nada

#### Escenario: Formato no permitido o extensión falsa (bebida)

- DADO un PDF, o un archivo de texto llamado `bebida.jpg`, enviado como `imagen`
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422, no se crea la bebida y no queda archivo en `MEDIA_DIR`

#### Escenario: Imagen de más de 5 MB (bebida)

- DADO una imagen válida de 5 MB más 1 byte
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 y no se crea la bebida

#### Escenario: Imagen de tamaño permitido (bebida)

- DADO una imagen PNG válida de 2 MB
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 y `GET` de su `imagen_url` devuelve 200

#### Escenario: Rechazo en el formulario de bebida

- DADO un archivo de 6 MB elegido en el selector de «Nueva bebida»
- CUANDO la persona lo elige
- ENTONCES no se acepta, se muestra el mensaje de tamaño y no se envía nada

### Requisito: Elegir imagen de archivo o cámara (HU-M1-01 CA 11, HU-M1-04 CA 11)

El selector de imagen de los formularios de plato, de postre y de bebida (HU-M1-07 CA 11) DEBE ofrecer dos opciones: «Elegir archivo» (galería o archivos) y «Sacar foto» (cámara del dispositivo, `capture="environment"`). DEBE mostrar una vista previa y permitir quitar la imagen elegida antes de guardar. En HEIC la vista previa PUEDE no estar disponible (S11); en ese caso DEBE mostrar el nombre y el tamaño.

#### Escenario: Dos opciones disponibles

- DADO el formulario abierto
- CUANDO se observa el selector de imagen
- ENTONCES existen los botones «Elegir archivo» y «Sacar foto», este último con captura de cámara

#### Escenario: Vista previa y quitar

- DADO una imagen JPG elegida
- CUANDO se muestra el selector
- ENTONCES se ve la vista previa y, al quitarla, el alta se envía sin `imagen`

#### Escenario: HEIC sin vista previa

- DADO un archivo HEIC elegido en un navegador que no lo muestra
- CUANDO se muestra el selector
- ENTONCES se ven el nombre y el tamaño del archivo en lugar de la vista previa

#### Escenario: Selector de imagen en postres

- DADO el formulario «Nuevo postre» abierto
- CUANDO se observa el selector de imagen
- ENTONCES existen los botones «Elegir archivo» y «Sacar foto», este último con captura de cámara

#### Escenario: Vista previa y quitar (postre)

- DADO una imagen JPG elegida en el formulario de postre
- CUANDO se muestra el selector y la persona la quita
- ENTONCES se ve la vista previa antes de quitarla y el alta se envía sin `imagen`

#### Escenario: Selector de imagen en bebidas

- DADO el formulario «Nueva bebida» abierto
- CUANDO se observa el selector de imagen
- ENTONCES existen los botones «Elegir archivo» y «Sacar foto», este último con captura de cámara

#### Escenario: Vista previa y quitar (bebida)

- DADO una imagen JPG elegida en el formulario de bebida
- CUANDO se muestra el selector y la persona la quita
- ENTONCES se ve la vista previa antes de quitarla y el alta se envía sin `imagen`

### Requisito: HEIC se guarda como JPEG (HU-M1-01 CA 12, HU-M1-04 CA 12)

Una imagen HEIC válida de un plato, de un postre o de una bebida (HU-M1-07 CA 12) DEBE guardarse y servirse como JPEG, con la orientación aplicada, de modo que `imagen_url` abra en cualquier navegador. JPG y PNG DEBEN reguardarse sin metadatos (S6). El nombre del archivo lo decide el servidor (`uuid4().hex` más extensión) y el nombre original NO DEBE usarse. La vista de la carta pertenece a otra HU (S12).

#### Escenario: Alta con HEIC

- DADO una imagen HEIC válida de menos de 5 MB
- CUANDO se hace `POST /platos`
- ENTONCES responde 201, `imagen_url` termina en `.jpg` y el archivo servido es un JPEG válido

#### Escenario: Nombre elegido por el servidor

- DADO una imagen llamada `../../mi foto.png`
- CUANDO se hace `POST /platos`
- ENTONCES `imagen_url` es `/media/<32 hexadecimales>.png` sin rastro del nombre original

#### Escenario: Imagen servida tras guardar

- DADO un alta con HEIC ya guardada
- CUANDO se abre la pantalla de éxito o se pide `imagen_url`
- ENTONCES la imagen se ve como JPEG

#### Escenario: Alta de postre con HEIC

- DADO una imagen HEIC válida de menos de 5 MB
- CUANDO se hace `POST /postres`
- ENTONCES responde 201, `imagen_url` termina en `.jpg` y el archivo servido es un JPEG válido

#### Escenario: Nombre elegido por el servidor (postre)

- DADO una imagen llamada `../../mi foto.png`
- CUANDO se hace `POST /postres`
- ENTONCES `imagen_url` es `/media/<32 hexadecimales>.png` sin rastro del nombre original

#### Escenario: Alta de bebida con HEIC

- DADO una imagen HEIC válida de menos de 5 MB
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201, `imagen_url` termina en `.jpg` y el archivo servido es un JPEG válido

#### Escenario: Nombre elegido por el servidor (bebida)

- DADO una imagen llamada `../../mi foto.png`
- CUANDO se hace `POST /bebidas`
- ENTONCES `imagen_url` es `/media/<32 hexadecimales>.png` sin rastro del nombre original

### Requisito: Etiquetas opcionales y sin repetidas (HU-M1-01 CA 13, HU-M1-04 CA 13)

Las etiquetas del plato, del postre o de la bebida (HU-M1-07 CA 13) son opcionales; cada una DEBE tener de 1 a 30 caracteres tras `strip()` y no repetirse (`casefold()`, S2); un repetido, vacío o más largo responde 422. En el formulario de cada categoría se cargan como chips con las mismas reglas que los ingredientes: un texto vacío, repetido o de más de 30 caracteres NO DEBE agregarse y DEBE mostrar un mensaje.

#### Escenario: Etiquetas válidas

- DADO las etiquetas «Sin TACC» y «Vegano»
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con ambas en `etiquetas`

#### Escenario: Etiqueta repetida

- DADO las etiquetas «casero» y «Casero»
- CUANDO se hace `POST /platos`
- ENTONCES responde 422

#### Escenario: Etiqueta de 31 caracteres

- DADO una etiqueta de 31 caracteres
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica `etiquetas`

#### Escenario: Chip de etiqueta repetido en el formulario

- DADO el chip «Vegano» ya agregado
- CUANDO la persona escribe «vegano» y pulsa Enter
- ENTONCES no se agrega y se muestra un mensaje bajo el campo

#### Escenario: Etiquetas válidas (postre)

- DADO las etiquetas «Sin TACC» y «Vegano»
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con ambas en `etiquetas`

#### Escenario: Etiqueta repetida (postre)

- DADO las etiquetas «casero» y «Casero»
- CUANDO se hace `POST /postres`
- ENTONCES responde 422

#### Escenario: Etiqueta de 31 caracteres (postre)

- DADO una etiqueta de 31 caracteres
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `etiquetas`

#### Escenario: Chip de etiqueta repetido en el formulario (postre)

- DADO el chip «Vegano» ya agregado en «Nuevo postre»
- CUANDO la persona escribe «vegano» y pulsa Enter
- ENTONCES no se agrega y se muestra un mensaje bajo el campo

#### Escenario: Etiquetas válidas (bebida)

- DADO las etiquetas «Sin alcohol» y «Light»
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con ambas en `etiquetas`

#### Escenario: Etiqueta repetida (bebida)

- DADO las etiquetas «casero» y «Casero»
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422

#### Escenario: Etiqueta de 31 caracteres (bebida)

- DADO una etiqueta de 31 caracteres
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 422 e indica `etiquetas`

#### Escenario: Chip de etiqueta vacío o repetido en el formulario (bebida)

- DADO el chip «Light» ya agregado en «Nueva bebida»
- CUANDO la persona escribe «light», solo espacios o un texto de 31 caracteres y pulsa Enter
- ENTONCES no se agrega ningún chip y se muestra un mensaje bajo el campo

### Requisito: Alta sin datos opcionales (HU-M1-01 CA 14, HU-M1-04 CA 14)

El plato o el postre DEBE registrarse aunque no se carguen descripción, imagen ni etiquetas. La bebida DEBE registrarse aunque no se carguen ingredientes, descripción, imagen ni etiquetas (HU-M1-07 CA 14; los ingredientes son opcionales, S44).

#### Escenario: Sin descripción, imagen ni etiquetas

- DADO un nombre libre, un precio válido, un ingrediente y una sección habilitada, sin descripción, imagen ni etiquetas
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con `descripcion` `null`, `imagen_url` `null` y `etiquetas` vacío

#### Escenario: Guardar desde el formulario sin datos opcionales

- DADO el formulario «Nuevo plato» con solo los datos obligatorios completos
- CUANDO la persona guarda
- ENTONCES el plato se registra y se muestra el aviso de alta exitosa

#### Escenario: Sin descripción, imagen ni etiquetas (postre)

- DADO un nombre libre, un precio válido, un ingrediente y una sección habilitada, sin descripción, imagen ni etiquetas
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con `descripcion` `null`, `imagen_url` `null` y `etiquetas` vacío

#### Escenario: Guardar desde el formulario sin datos opcionales (postre)

- DADO el formulario «Nuevo postre» con solo los datos obligatorios completos
- CUANDO la persona guarda
- ENTONCES el postre se registra y se muestra el aviso de alta exitosa

#### Escenario: Sin ingredientes, descripción, imagen ni etiquetas (bebida)

- DADO un nombre libre, un precio válido y una sección habilitada, sin ingredientes, descripción, imagen ni etiquetas
- CUANDO se hace `POST /bebidas`
- ENTONCES responde 201 con `ingredientes` vacío, `descripcion` `null`, `imagen_url` `null` y `etiquetas` vacío

#### Escenario: Guardar desde el formulario sin datos opcionales (bebida)

- DADO el formulario «Nueva bebida» con solo nombre, sección y precio completos
- CUANDO la persona guarda
- ENTONCES la bebida se registra y se muestra el aviso «Bebida creada»

### Requisito: Estado asignado por el sistema

El plato, el postre o la bebida DEBE crearse siempre `HABILITADO`; el cliente no elige el estado (S10). El formulario de alta de cada categoría DEBE mostrar el estado como texto fijo «Habilitado», sin interruptor.

#### Escenario: El estado no lo elige el cliente

- DADO una solicitud con `estado=DESHABILITADO` como parte suelta del formulario
- CUANDO se hace `POST /platos`
- ENTONCES el plato se crea `HABILITADO`

#### Escenario: Estado fijo en el formulario

- DADO el formulario «Nuevo plato»
- CUANDO se observa el campo «Estado»
- ENTONCES muestra el texto «Habilitado» y ningún control para cambiarlo

#### Escenario: El estado no lo elige el cliente (postre)

- DADO una solicitud con `estado=DESHABILITADO` como parte suelta del formulario
- CUANDO se hace `POST /postres`
- ENTONCES el postre se crea `HABILITADO`

#### Escenario: Estado fijo en el formulario (postre)

- DADO el formulario «Nuevo postre»
- CUANDO se observa el campo «Estado»
- ENTONCES muestra el texto «Habilitado» y ningún control para cambiarlo

#### Escenario: El estado no lo elige el cliente (bebida)

- DADO una solicitud con `estado=DESHABILITADO` como parte suelta del formulario
- CUANDO se hace `POST /bebidas`
- ENTONCES la bebida se crea `HABILITADO`

#### Escenario: Estado fijo en el formulario (bebida)

- DADO el formulario «Nueva bebida»
- CUANDO se observa el campo «Estado»
- ENTONCES muestra el texto «Habilitado» y ningún control para cambiarlo

### Requisito: Atomicidad del alta

Si falla cualquier validación, la escritura del archivo o el `commit`, NO DEBE quedar plato, postre ni bebida en la base. Si el `commit` falla después de escribir la imagen, el archivo DEBE borrarse (S7).

#### Escenario: Falla el commit

- DADO una imagen válida y un fallo simulado al confirmar la transacción
- CUANDO se hace `POST /platos`
- ENTONCES no queda plato en la base ni archivo en `MEDIA_DIR`

#### Escenario: Falla el commit (postre)

- DADO una imagen válida y un fallo simulado al confirmar la transacción
- CUANDO se hace `POST /postres`
- ENTONCES no queda postre en la base ni archivo en `MEDIA_DIR`

#### Escenario: Falla el commit (bebida)

- DADO una imagen válida y un fallo simulado al confirmar la transacción
- CUANDO se hace `POST /bebidas`
- ENTONCES no queda bebida en la base ni archivo en `MEDIA_DIR`

### Requisito: Listar los productos con su detalle (HU-M1-13 CA 1)

El frontend DEBE mostrar, en la pestaña «Productos» de `ProductosPage`, una lista que reemplaza el `EmptyState` de «pendiente» y conserva los botones «Nuevo plato» y «Nuevo postre», a los que se suma «Nueva bebida». La tabla DEBE tener las columnas nombre, categoría (Plato, Postre o Bebida), sección, precio, etiquetas, estado y acciones (E19). La lista incluye `PLATO`, `POSTRE` y `BEBIDA`; los menús del día son de M2 y se suman cuando M2 los exponga por su `service` (S26, sin tocar M2). El sistema NO DEBE modificar datos al listar.

#### Escenario: Lista de productos habilitados

- DADO un plato «Milanesa» con etiqueta «Casero», un postre «Flan» y una bebida «Agua», todos habilitados
- CUANDO se abre la pestaña «Productos»
- ENTONCES cada producto aparece con su nombre, categoría, precio y etiquetas

#### Escenario: Ítems del listado en la API

- DADO productos habilitados de las tres categorías
- CUANDO se hace `GET /productos?estado=HABILITADO`
- ENTONCES responde 200 con `Pagina[ProductoListado]` y cada ítem trae `id`, `nombre`, `categoria`, `precio`, `etiquetas` y `estado`

#### Escenario: Menús del día fuera de la lista

- DADO que M2 aún no expone menús del día
- CUANDO se abre la lista
- ENTONCES solo aparecen platos, postres y bebidas, sin error ni mensaje de menús (S26)

#### Escenario: Botones de alta en la pestaña

- DADO la pestaña «Productos»
- CUANDO se observan las acciones de alta
- ENTONCES están «Nuevo plato», «Nuevo postre» y «Nueva bebida», y cada uno abre el formulario de su categoría

### Requisito: Enlace de editar en platos y postres (HU-M1-13, S27, S31)

Cada fila de producto DEBE ofrecer «Editar», un enlace a la edición de su categoría: `/productos/platos/:id/editar` para los platos, `/productos/postres/:id/editar` para los postres y `/productos/bebidas/:id/editar` para las bebidas (S45); la ruta se deriva de la categoría de la fila. S27 (bebidas sin acciones) deja de regir: las bebidas ofrecen «Editar» desde HU-M1-08 (E21).

#### Escenario: Editar un plato

- DADO una fila de plato en la lista
- CUANDO la persona pulsa «Editar»
- ENTONCES navega a `/productos/platos/:id/editar` con el `id` del plato

#### Escenario: Editar un postre

- DADO una fila de postre en la lista
- CUANDO la persona pulsa «Editar»
- ENTONCES navega a `/productos/postres/:id/editar` con el `id` del postre

#### Escenario: Editar una bebida

- DADO una fila de bebida en la lista, habilitada o deshabilitada
- CUANDO la persona pulsa «Editar»
- ENTONCES navega a `/productos/bebidas/:id/editar` con el `id` de la bebida

### Requisito: Dar de baja desde la fila de platos y postres (HU-M1-13, S28, E13, S31)

Las filas de platos, postres y bebidas habilitados DEBEN ofrecer «Dar de baja», con el mismo `ConfirmDialog`, la misma cancelación y la solicitud `POST /platos/{id}/baja`, `POST /postres/{id}/baja` o `POST /bebidas/{id}/baja` según la categoría; al confirmar, la lista se recarga. El texto de confirmación de un plato es «El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.»; el de un postre es el de S32 y el de una bebida es el de S46 y S48. Las filas de productos deshabilitados, de cualquier categoría, NO DEBEN ofrecer «Dar de baja».

#### Escenario: Baja desde la lista

- DADO una fila de plato habilitado y el filtro «Habilitados»
- CUANDO la persona pulsa «Dar de baja» y confirma
- ENTONCES se envía `POST /platos/{id}/baja`, se avisa el éxito y el plato deja de aparecer en la lista

#### Escenario: Cancelar la baja desde la lista

- DADO el diálogo de baja abierto desde una fila
- CUANDO la persona pulsa «Cancelar»
- ENTONCES no se envía ninguna solicitud y la fila no cambia

#### Escenario: Plato deshabilitado sin «Dar de baja»

- DADO una fila de plato deshabilitado (filtro «Deshabilitados» o «Todos»)
- CUANDO se observan sus acciones
- ENTONCES ofrece «Editar» y no ofrece «Dar de baja»

#### Escenario: Baja de un postre desde la lista

- DADO una fila de postre habilitado y el filtro «Habilitados»
- CUANDO la persona pulsa «Dar de baja» y confirma
- ENTONCES se envía `POST /postres/{id}/baja`, se avisa el éxito y el postre deja de aparecer en la lista

#### Escenario: Cancelar la baja de un postre desde la lista

- DADO el diálogo de baja abierto desde una fila de postre
- CUANDO la persona pulsa «Cancelar»
- ENTONCES no se envía ninguna solicitud y la fila no cambia

#### Escenario: Postre deshabilitado sin «Dar de baja»

- DADO una fila de postre deshabilitado (filtro «Deshabilitados» o «Todos»)
- CUANDO se observan sus acciones
- ENTONCES ofrece «Editar» y no ofrece «Dar de baja»

#### Escenario: Baja de un plato desde la lista no cambia

- DADO una fila de plato habilitado
- CUANDO la persona pulsa «Dar de baja» y confirma
- ENTONCES se envía `POST /platos/{id}/baja`, como antes de este cambio

#### Escenario: Baja de una bebida desde la lista

- DADO una fila de bebida habilitada y el filtro «Habilitados»
- CUANDO la persona pulsa «Dar de baja» y confirma
- ENTONCES se envía `POST /bebidas/{id}/baja`, se avisa el éxito y la bebida deja de aparecer en la lista

#### Escenario: Cancelar la baja de una bebida desde la lista

- DADO el diálogo de baja abierto desde una fila de bebida
- CUANDO la persona pulsa «Cancelar»
- ENTONCES no se envía ninguna solicitud y la fila no cambia

#### Escenario: Bebida deshabilitada sin «Dar de baja»

- DADO una fila de bebida deshabilitada (filtro «Deshabilitados» o «Todos»)
- CUANDO se observan sus acciones
- ENTONCES ofrece «Editar» y no ofrece «Dar de baja»

## Supuestos

- Nota: «Bebidas sin acciones» no es un requisito propio de la spec consolidada (es un escenario de «Enlace de editar en platos y postres (HU-M1-13, S27, S31)»), por eso no hay bloque REMOVED: el requisito se reemplaza completo en MODIFIED y el escenario desaparece.

- Supuesto: S42 a S46 de la propuesta de HU-M1-07-08-09 rigen sin cambios (criterios de #11 y #12 equivalentes a los de #7 y #8; mensaje «La bebida ya está registrada»; ingredientes opcionales; rutas `/productos/bebidas/nuevo` y `/productos/bebidas/:id/editar`; textos en femenino).
- Supuesto: S47. En `POST /bebidas` y `PUT /bebidas/{id}`, un `ingredientes` ausente equivale a una lista vacía y, en el `PUT`, reemplaza a los actuales, igual que `descripcion` y `etiquetas` ausentes.
- Supuesto: S48. El texto de confirmación de la baja de una bebida concuerda en género: «La bebida quedará deshabilitada y dejará de mostrarse en la carta. Puede volver a habilitarla desde la pantalla de edición.»
- Supuesto: S1 a S12, S14, S15, S18 a S25, S29 y S34 rigen para bebidas; S27 deja de regir (S45).
