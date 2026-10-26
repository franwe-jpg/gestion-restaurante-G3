# Especificación de carta-productos (HU-M1-02 y HU-M1-03)

## Propósito

Consultar, modificar (incluida la reactivación) y dar de baja un plato de la carta. Delta sobre `carta-productos` de HU-M1-01 y HU-M1-04 (aún sin archivar; se archivan antes que este cambio). Los campos, las reglas de validación, las reglas de imagen y el orden de validación son los de `POST /platos`; esta spec solo agrega lo que cambia y prueba cada criterio de aceptación. Entidades del diagrama de clases: `Producto`, `Seccion`, `Estado`, `Categoria`.

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /platos/{id}` | 200, `ProductoSalida` | 404 |
| `PUT /platos/{id}` (multipart/form-data) | 200, `ProductoSalida` | 404, 409, 422 |
| `POST /platos/{id}/baja` (D-24) | 200, `ProductoSalida` con `estado` `DESHABILITADO` | 404, 409 |

- Un `id` inexistente, o que pertenece a un producto de otra categoría, responde 404 en las tres rutas.
- `PUT /platos/{id}` tiene las mismas partes que `POST /platos`: `datos` (JSON) e `imagen` (archivo, opcional). Los campos de `datos` y sus reglas son los del alta (`nombre`, `seccion_id`, `precio`, `ingredientes`, `descripcion`, `etiquetas`), con estas diferencias:
  - Es un reemplazo completo: `nombre`, `seccion_id`, `precio` e `ingredientes` siguen siendo obligatorios; `descripcion` y `etiquetas` ausentes equivalen a vacíos y los reemplazan (`descripcion` `null`, `etiquetas` vacío).
  - `estado` es opcional (`HABILITADO` o `DESHABILITADO`); si falta, se conserva el actual. Otro valor responde 422. `categoria` sigue siendo un campo desconocido (422).
  - `quitar_imagen` es un booleano opcional (por defecto `false`). Supuesto: S24.
- Imagen en la modificación: sin parte `imagen` y `quitar_imagen` `false`, se conserva la imagen actual; con parte `imagen` válida, reemplaza a la actual; con `quitar_imagen` `true` y sin parte `imagen`, el plato queda sin imagen (`imagen_url` `null`); con ambas, responde 422. Las reglas de contenido, formato y tamaño son las del alta (JPG, PNG o HEIC, hasta 5 MB; HEIC se guarda como JPEG; el servidor decide el nombre).
- `ProductoSalida` es el mismo del alta: `id`, `nombre`, `categoria`, `precio`, `ingredientes`, `descripcion`, `etiquetas`, `estado`, `imagen_url`, `seccion: {id, nombre}`.
- Orden de validación de `PUT`: 422 de forma (`datos`), 422 de imagen (incluye `imagen` junto con `quitar_imagen` `true`), 404 del plato, 404 de sección y 409 de sección deshabilitada (solo si `seccion_id` cambia, S19), 409 de nombre repetido (excluyendo al propio plato). Nada se guarda si algo falla.
- Baja: `POST /platos/{id}/baja` no recibe cuerpo y cambia solo `estado` a `DESHABILITADO`. Es una acción de negocio con regla propia, por eso va como `POST` sobre un subrecurso verbal (D-24). Supuesto: S25.
- Datos: sin cambios de esquema ni migraciones; se usa la columna `estado` existente y no se borra ninguna fila.
- Frontend: página de edición en `/productos/platos/:id/editar` (S16), que reutiliza el formulario, el `hook` y el validador del alta en modo edición. El estado es editable solo en edición. `GET /api/v1/productos` no incluye los productos `DESHABILITADO`.

## Requisitos

### Requisito: Consultar un plato

El sistema DEBE devolver el plato con `GET /platos/{id}` para cargar el formulario de edición. El formulario DEBE mostrar los datos actuales del plato (nombre, sección, precio, ingredientes, descripción, etiquetas, imagen y estado).

#### Escenario: Plato existente

- DADO un plato existente
- CUANDO se hace `GET /platos/{id}`
- ENTONCES responde 200 con su `ProductoSalida`

#### Escenario: Id inexistente o de otra categoría

- DADO un id que no existe, o que corresponde a un postre
- CUANDO se hace `GET /platos/{id}`
- ENTONCES responde 404 con `{"detalle": ...}`

#### Escenario: Formulario cargado

- DADO un plato existente
- CUANDO se abre `/productos/platos/:id/editar`
- ENTONCES los campos muestran los datos actuales, con título «Editar plato» y botón «Guardar cambios»

### Requisito: Modificar los datos del plato (HU-M1-02 CA 1)

El sistema DEBE actualizar el plato con los valores válidos recibidos y responder 200 con `ProductoSalida` con los datos nuevos. Al guardar con éxito el frontend DEBE avisar y volver al listado de productos.

#### Escenario: Cambio válido de datos

- DADO un plato existente
- CUANDO se hace `PUT /platos/{id}` con otro nombre, precio, descripción y sección habilitada
- ENTONCES responde 200 con los datos nuevos y un `GET /platos/{id}` posterior los devuelve iguales

#### Escenario: Guardar sin cambiar el nombre

- DADO un plato «Milanesa»
- CUANDO se hace `PUT` con el mismo nombre y otro precio
- ENTONCES responde 200 (el nombre propio no cuenta como repetido)

#### Escenario: Modificación desde la pantalla

- DADO el formulario de edición con un precio nuevo
- CUANDO la persona pulsa «Guardar cambios»
- ENTONCES se envía una sola solicitud multipart `PUT`, se muestra un aviso de éxito y se vuelve a «Productos»

### Requisito: Modificar ingredientes, etiquetas e imagen (HU-M1-02 CA 2)

El sistema DEBE permitir agregar o quitar ingredientes y etiquetas, y mantener, reemplazar o quitar la imagen. Las listas enviadas reemplazan a las actuales. Al reemplazar o quitar la imagen, el archivo anterior DEBE borrarse después del `commit` (S22). El formulario DEBE permitir quitar chips, agregar chips con las reglas del alta, y elegir, cambiar o quitar la imagen con vista previa.

#### Escenario: Agregar y quitar ingredientes y etiquetas

- DADO un plato con ingredientes «Pan» y «Huevo» y etiqueta «Casero»
- CUANDO se hace `PUT` con ingredientes «Pan» y «Queso» y sin etiquetas
- ENTONCES responde 200 con `ingredientes` «Pan» y «Queso» y `etiquetas` vacío

#### Escenario: Imagen conservada

- DADO un plato con imagen
- CUANDO se hace `PUT` sin parte `imagen` y sin `quitar_imagen`
- ENTONCES `imagen_url` es el mismo y el archivo sigue existiendo

#### Escenario: Imagen reemplazada

- DADO un plato con imagen
- CUANDO se hace `PUT` con una imagen PNG válida
- ENTONCES `imagen_url` cambia, el archivo nuevo se sirve con 200 y el archivo anterior ya no está en `MEDIA_DIR`

#### Escenario: Imagen quitada

- DADO un plato con imagen
- CUANDO se hace `PUT` con `quitar_imagen` `true`
- ENTONCES `imagen_url` es `null` y el archivo anterior ya no está en `MEDIA_DIR`

#### Escenario: Quitar y reemplazar a la vez

- DADO `quitar_imagen` `true` y una parte `imagen` válida
- CUANDO se hace `PUT`
- ENTONCES responde 422 y el plato no cambia

#### Escenario: Cambios en el formulario

- DADO el formulario de edición con un chip quitado, otro agregado y la imagen quitada
- CUANDO la persona guarda
- ENTONCES se envían las listas resultantes y `quitar_imagen` igual a `true`

### Requisito: Reglas de validación del alta (HU-M1-02 CA 3)

Un valor que no cumple las reglas de HU-M1-01 DEBE responder 422 (formato, obligatoriedad, largo, imagen) o 409 (nombre repetido, sección deshabilitada), sin aplicar ningún cambio y indicando qué dato es inválido. Las reglas son: nombre de 1 a 100 caracteres tras `strip()`; precio mayor a 0 con hasta 8 enteros y 2 decimales; al menos 1 ingrediente, sin repetidos, de 1 a 100 caracteres; descripción de hasta 500; etiquetas sin repetidas, de 1 a 30; imagen JPG, PNG o HEIC de hasta 5 MB. El nombre DEBE ser único entre los platos, también los deshabilitados, sin distinguir mayúsculas, excluyendo al propio plato; el mensaje es «El plato ya está registrado». La sección DEBE existir (404) y estar habilitada (409), y esto se comprueba solo si `seccion_id` cambia (S19). El formulario DEBE mostrar bajo cada campo inválido qué dato falla y NO DEBE enviar la solicitud si la validación local falla.

#### Escenario: Nombre vacío o demasiado largo

- DADO un plato existente
- CUANDO se hace `PUT` con `nombre` igual a `"   "` o de 101 caracteres
- ENTONCES responde 422, indica `nombre` y el plato conserva sus datos

#### Escenario: Precio inválido

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `precio`, y el plato conserva su precio

#### Escenario: Ingredientes vacíos o repetidos

- DADO `ingredientes` vacío, o «Huevo» y « huevo »
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Etiquetas y descripción inválidas

- DADO una etiqueta de 31 caracteres, etiquetas «casero» y «Casero», o una descripción de 501 caracteres
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `etiquetas` o `descripcion`

#### Escenario: Imagen inválida

- DADO un PDF, un archivo de texto llamado `plato.jpg` o una imagen de 5 MB más 1 byte
- CUANDO se hace `PUT`
- ENTONCES responde 422, el plato conserva su imagen y no queda archivo nuevo en `MEDIA_DIR`

#### Escenario: Nombre duplicado

- DADO los platos «Milanesa» y «Flan casero» (este último deshabilitado)
- CUANDO se modifica «Milanesa» con el nombre « flan casero »
- ENTONCES responde 409 con «El plato ya está registrado» y «Milanesa» no cambia

#### Escenario: Mismo nombre que un postre

- DADO un postre «Tiramisú»
- CUANDO se modifica un plato con el nombre «Tiramisú»
- ENTONCES responde 200

#### Escenario: Sección inexistente o deshabilitada

- DADO un `seccion_id` inexistente, o de una sección deshabilitada
- CUANDO se hace `PUT`
- ENTONCES responde 404 o 409 respectivamente y el plato no cambia

#### Escenario: Error indicado en el formulario

- DADO el formulario de edición con el precio `abc` y el nombre vacío
- CUANDO la persona guarda
- ENTONCES no se envía la solicitud y cada campo muestra qué dato es inválido

#### Escenario: Nombre duplicado en el formulario

- DADO que el servidor responde 409 por nombre repetido
- CUANDO la persona guarda
- ENTONCES el formulario muestra la advertencia «El plato ya está registrado» bajo el nombre y los datos escritos se conservan

### Requisito: Atomicidad de la modificación

Si falla cualquier validación, la escritura del archivo o el `commit`, el plato DEBE conservar todos sus datos e imagen. Si el `commit` falla después de escribir una imagen nueva, el archivo nuevo DEBE borrarse y el anterior DEBE conservarse. El archivo anterior se borra solo después de un `commit` exitoso (S22).

#### Escenario: Falla el commit

- DADO un plato con imagen y una imagen nueva válida, con un fallo simulado al confirmar la transacción
- CUANDO se hace `PUT`
- ENTONCES el plato conserva sus datos, su `imagen_url` anterior sigue sirviéndose y no queda el archivo nuevo en `MEDIA_DIR`

### Requisito: Las facturas conservan el precio (HU-M1-02 CA 4, Supuesto S18)

Modificar el precio de un plato NO DEBE borrar ni alterar ninguna fila que lo referencie. `Factura` no existe todavía (M6); el diagrama define `precioUnitario {copia al emitir}`, de modo que M6 copia el precio al emitir y no lo lee del plato. Este cambio solo DEBE garantizar que la modificación actualiza el plato en su fila (mismo `id`) sin tocar tablas ajenas.

#### Escenario: El plato conserva su identidad al cambiar el precio

- DADO un plato con `id` N referenciado por una fila de otra tabla (por ejemplo, una fila de prueba con clave foránea a `productos.id`)
- CUANDO se hace `PUT` con un precio nuevo
- ENTONCES el plato sigue con el mismo `id` N, el precio nuevo, y la fila que lo referencia permanece intacta

### Requisito: Reactivar un plato deshabilitado (HU-M1-02 CA 5)

El sistema DEBE permitir cambiar el estado de `DESHABILITADO` a `HABILITADO` con `PUT` y, desde ese momento, el plato DEBE volver a figurar en `GET /api/v1/productos`. Aparece en la carta si su sección está habilitada; reactivar un plato en una sección deshabilitada NO se bloquea (S19), y el plato no aparece en la carta hasta que la sección se habilite. El formulario DEBE mostrar el estado como un interruptor editable «Habilitado» solo en edición.

#### Escenario: Reactivación

- DADO un plato `DESHABILITADO` en una sección habilitada
- CUANDO se hace `PUT` con `estado` `HABILITADO`
- ENTONCES responde 200 con `estado` `HABILITADO` y el plato vuelve a figurar en `GET /api/v1/productos`

#### Escenario: Reactivar en una sección deshabilitada

- DADO un plato `DESHABILITADO` cuya sección está deshabilitada
- CUANDO se hace `PUT` con `estado` `HABILITADO` y la misma `seccion_id`
- ENTONCES responde 200 y el plato queda `HABILITADO`, sin aparecer en la carta mientras la sección esté deshabilitada

#### Escenario: Estado inválido

- DADO `estado` igual a `ANULADO`
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `estado`

#### Escenario: Reactivar desde el formulario

- DADO el formulario de edición de un plato deshabilitado
- CUANDO la persona activa «Habilitado» y guarda
- ENTONCES se envía `estado` `HABILITADO` y se muestra el aviso de éxito

#### Escenario: El estado no se edita en el alta

- DADO el formulario «Nuevo plato»
- CUANDO se observa el campo «Estado»
- ENTONCES sigue mostrando el texto fijo «Habilitado», sin interruptor

### Requisito: Dar de baja un plato (HU-M1-03 CA 1)

El sistema DEBE pasar el plato `HABILITADO` a `DESHABILITADO` con `POST /platos/{id}/baja` y responder 200 con `ProductoSalida`. El plato DEJA de figurar en `GET /api/v1/productos` y en la carta. Dar de baja un plato ya `DESHABILITADO` responde 409 (S21). La baja NO se bloquea por menús ni comandas (S20). El frontend DEBE ofrecer el botón «Dar de baja» en la pantalla de edición, que abre un `ConfirmDialog` y, al confirmar, avisa y vuelve al listado de productos.

#### Escenario: Baja confirmada

- DADO un plato `HABILITADO`
- CUANDO se hace `POST /platos/{id}/baja`
- ENTONCES responde 200 con `estado` `DESHABILITADO` y el plato ya no figura en `GET /api/v1/productos`

#### Escenario: Baja de un plato ya deshabilitado

- DADO un plato `DESHABILITADO`
- CUANDO se hace `POST /platos/{id}/baja`
- ENTONCES responde 409 con `{"detalle": ...}` y el plato no cambia

#### Escenario: Baja de un id inexistente

- DADO un id que no existe o que es de un postre
- CUANDO se hace `POST /platos/{id}/baja`
- ENTONCES responde 404

#### Escenario: Baja de un plato usado por un menú o una comanda

- DADO un plato referenciado por otra tabla
- CUANDO se hace `POST /platos/{id}/baja`
- ENTONCES responde 200 y la fila que lo referencia permanece intacta

#### Escenario: Baja desde la pantalla

- DADO la pantalla de edición de un plato habilitado
- CUANDO la persona pulsa «Dar de baja» y confirma en el diálogo
- ENTONCES se envía `POST /platos/{id}/baja`, se muestra el aviso de éxito y se vuelve a «Productos»

### Requisito: Cancelar la baja (HU-M1-03 CA 2)

Si la persona cancela el diálogo de confirmación, el sistema NO DEBE enviar ninguna solicitud y el plato DEBE seguir `HABILITADO`.

#### Escenario: Cancelar la confirmación

- DADO el diálogo de baja abierto
- CUANDO la persona pulsa «Cancelar»
- ENTONCES se cierra el diálogo, no se envía ninguna solicitud y el plato sigue `HABILITADO`

### Requisito: La baja conserva los datos (HU-M1-03 CA 3, Supuesto S18)

Un plato `DESHABILITADO` DEBE conservar todos sus datos (nombre, precio, ingredientes, etiquetas, descripción, imagen, sección) y su fila. La baja NO borra filas ni archivos. Que siga figurando en facturas y reportes anteriores lo garantiza que `Factura` copia el precio al emitir y que la fila del plato nunca se elimina; `Factura` no existe todavía (S18).

#### Escenario: Datos intactos tras la baja

- DADO un plato con todos sus datos e imagen
- CUANDO se da de baja
- ENTONCES `GET /platos/{id}` responde 200 con los mismos datos, `estado` `DESHABILITADO` y la imagen sigue sirviéndose

#### Escenario: Filas relacionadas intactas

- DADO un plato referenciado por una fila de otra tabla
- CUANDO se da de baja
- ENTONCES la fila del plato y la que lo referencia siguen presentes

### Requisito: Reactivar un plato dado de baja (HU-M1-03 CA 4, Supuesto S17)

Un plato `DESHABILITADO` DEBE poder reactivarse desde la modificación (`PUT` con `estado` `HABILITADO`), según el requisito «Reactivar un plato deshabilitado». El filtro de la lista de productos por Deshabilitados es de HU-M1-13 y queda fuera de este cambio. La pantalla de edición DEBE abrirse para un plato deshabilitado y permitir reactivarlo.

#### Escenario: Plato deshabilitado consultable

- DADO un plato `DESHABILITADO`
- CUANDO se hace `GET /platos/{id}`
- ENTONCES responde 200 con `estado` `DESHABILITADO`

#### Escenario: Reactivar tras la baja

- DADO un plato dado de baja
- CUANDO se hace `PUT` con `estado` `HABILITADO`
- ENTONCES responde 200 y el plato vuelve a figurar en `GET /api/v1/productos`

#### Escenario: Pantalla de edición de un plato deshabilitado

- DADO un plato `DESHABILITADO`
- CUANDO se abre `/productos/platos/:id/editar`
- ENTONCES el interruptor de estado aparece apagado, se puede activar y el botón «Dar de baja» no se ofrece

### Requisito: El alta de platos y postres no cambia (regresión)

El modo edición NO DEBE alterar el alta. `POST /platos` y `POST /postres` DEBEN conservar su contrato, sus categorías y sus mensajes; los formularios de alta DEBEN conservar títulos, botones y el estado fijo «Habilitado».

#### Escenario: Alta tras agregar el modo edición

- DADO el formulario «Nuevo plato» o «Nuevo postre» completo
- CUANDO la persona guarda
- ENTONCES se envía una sola solicitud multipart `POST`, se muestra el aviso de éxito y se vuelve a «Productos»

#### Escenario: Pruebas existentes

- DADO las pruebas de alta de platos y postres
- CUANDO se corre la suite
- ENTONCES pasan, adaptadas solo por nombres o rutas

## Supuestos nuevos

- Supuesto: S15 a S23 de la propuesta rigen sin cambios.
- Supuesto: S24. La imagen se quita enviando `quitar_imagen` `true` dentro de `datos`; enviarlo junto con una parte `imagen` responde 422. El archivo anterior, reemplazado o quitado, se borra recién después del `commit`; si ese borrado falla, la respuesta no cambia y el archivo queda huérfano (diseño, E3).
- Supuesto: S25. La baja usa `POST /api/v1/platos/{id}/baja`, sin cuerpo: es una acción de negocio con regla propia (409 si ya está deshabilitado), y D-24 fija `POST` sobre un subrecurso verbal.
- Supuesto: `PUT` es un reemplazo completo de los campos del alta; `estado` ausente conserva el actual.
- Supuesto: `GET /api/v1/productos` ya existe y devuelve solo productos `HABILITADO`; si no, el diseño lo define.
- Supuesto: los textos «Editar plato», «Guardar cambios» y «Dar de baja» son los de la pantalla; los fija el diseño en español neutro (S23).
