# Especificación de carta-productos (HU-M1-02, HU-M1-03 y HU-M1-13)

## Propósito

Consultar, modificar (incluida la reactivación) y dar de baja un plato de la carta, y listar los productos con filtro de estado (HU-M1-13). Delta sobre `carta-productos` de HU-M1-01 y HU-M1-04 (aún sin archivar; se archivan antes que este cambio). Los campos, las reglas de validación, las reglas de imagen y el orden de validación son los de `POST /platos`; esta spec solo agrega lo que cambia y prueba cada criterio de aceptación. Entidades del diagrama de clases: `Producto`, `Seccion`, `Estado`, `Categoria`.

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /platos/{id}` | 200, `ProductoSalida` | 404 |
| `PUT /platos/{id}` (multipart/form-data) | 200, `ProductoSalida` | 404, 409, 422 |
| `POST /platos/{id}/baja` (D-24) | 200, `ProductoSalida` con `estado` `DESHABILITADO` | 404, 409 |
| `GET /productos` sin `estado` (existente) | 200, `Pagina[ProductoListado]`, solo `HABILITADO` (mismos ítems, orden y total que antes; solo se agregan campos) | 422 (paginación) |
| `GET /productos?estado=...` (HU-M1-13, S29) | 200, `Pagina[ProductoListado]` | 422 |

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
- Frontend: página de edición en `/productos/platos/:id/editar` (S16), que reutiliza el formulario, el `hook` y el validador del alta en modo edición. El estado es editable solo en edición. `GET /api/v1/productos` sin `estado` no incluye los productos `DESHABILITADO`.
- Lista (HU-M1-13), Supuesto S29: `GET /productos` acepta el parámetro opcional `estado` con valores `HABILITADO`, `DESHABILITADO` o `TODOS`, además de `limit` y `offset` (D-27, `ParametrosPaginacion`). Otro valor de `estado` responde 422. La ruta siempre devuelve `Pagina[ProductoListado]`; `ProductoListado` extiende `ProductoSeleccionable` y agrega `precio`, `etiquetas` y `estado` (E14). Sin `estado`, el valor por defecto es `HABILITADO` y la respuesta trae los mismos ítems, orden y total que antes; solo se agregan campos, por lo que `SeccionesTab` sigue funcionando. Los ítems tienen `id`, `nombre`, `categoria` (`PLATO`, `POSTRE` o `BEBIDA`), `seccion`, `precio`, `etiquetas` (lista de textos) y `estado`. Orden estable por nombre y luego `id`. La lista no tiene efectos de escritura.

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

Un plato `DESHABILITADO` DEBE poder reactivarse desde la modificación (`PUT` con `estado` `HABILITADO`), según el requisito «Reactivar un plato deshabilitado». El criterio queda cubierto por completo con HU-M1-13: la persona filtra la lista por Deshabilitados, encuentra el plato, abre su pantalla de edición desde la fila y lo reactiva. La pantalla de edición DEBE abrirse para un plato deshabilitado y permitir reactivarlo.

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

#### Escenario: Reactivar desde la lista filtrada

- DADO un plato dado de baja y la lista abierta
- CUANDO la persona elige el filtro «Deshabilitados», abre la edición desde la fila del plato, activa «Habilitado» y guarda
- ENTONCES se envía `PUT` con `estado` `HABILITADO`, y al volver a «Productos» el plato aparece con el filtro «Habilitados» y ya no con «Deshabilitados»

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

### Requisito: Listar los productos con su detalle (HU-M1-13 CA 1)

El frontend DEBE mostrar, en la pestaña «Productos» de `ProductosPage`, una lista que reemplaza el `EmptyState` de «pendiente» y conserva los botones «Nuevo plato» y «Nuevo postre». La tabla DEBE tener las columnas nombre, categoría (Plato, Postre o Bebida), sección, precio, etiquetas, estado y acciones (E19). La lista incluye `PLATO`, `POSTRE` y `BEBIDA`; los menús del día son de M2 y se suman cuando M2 los exponga por su `service` (S26, sin tocar M2). El sistema NO DEBE modificar datos al listar.

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

### Requisito: Lista vacía (HU-M1-13 CA 2)

Si no hay productos para el filtro elegido, el sistema DEBE responder 200 con `items` vacío y `total` 0, y el frontend DEBE informar que la lista está vacía (un `EmptyState` con un mensaje propio de cada filtro, sin tabla ni paginación).

#### Escenario: Sin productos para el filtro

- DADO que no hay productos deshabilitados
- CUANDO la persona elige el filtro «Deshabilitados»
- ENTONCES se muestra el mensaje de lista vacía para ese filtro

#### Escenario: Base sin productos

- DADO que no existe ningún producto
- CUANDO se hace `GET /productos?estado=TODOS`
- ENTONCES responde 200 con `items` vacío y `total` 0, y la pantalla muestra el mensaje de lista vacía

### Requisito: Filtro de estado por defecto Habilitados (HU-M1-13 CA 3)

Al abrir la lista, el filtro de estado DEBE estar en «Habilitados» y la primera solicitud DEBE pedir `estado` `HABILITADO`. El filtro es un `Select` (`aria-label` «Filtrar por estado», E18) con las opciones «Habilitados», «Deshabilitados» y «Todos».

#### Escenario: Filtro inicial

- DADO la pestaña «Productos» recién abierta
- CUANDO se observa el filtro de estado
- ENTONCES está en «Habilitados» y la solicitud enviada lleva `estado=HABILITADO`

#### Escenario: Opciones del filtro

- DADO la lista abierta
- CUANDO se despliega el filtro
- ENTONCES ofrece «Habilitados», «Deshabilitados» y «Todos»

### Requisito: Filtrar por Habilitados (HU-M1-13 CA 4)

Con `estado` `HABILITADO` el sistema DEBE devolver solo los productos `HABILITADO`.

#### Escenario: Solo habilitados

- DADO un plato habilitado y un plato deshabilitado
- CUANDO se hace `GET /productos?estado=HABILITADO`
- ENTONCES solo figura el habilitado

#### Escenario: Habilitados en pantalla

- DADO productos de ambos estados y el filtro «Habilitados»
- CUANDO se ve la lista
- ENTONCES solo aparecen los habilitados

### Requisito: Filtrar por Deshabilitados (HU-M1-13 CA 5)

Con `estado` `DESHABILITADO` el sistema DEBE devolver solo los productos dados de baja.

#### Escenario: Solo deshabilitados

- DADO un plato habilitado y un plato deshabilitado
- CUANDO se hace `GET /productos?estado=DESHABILITADO`
- ENTONCES solo figura el deshabilitado

#### Escenario: Deshabilitados en pantalla

- DADO productos de ambos estados
- CUANDO la persona elige «Deshabilitados»
- ENTONCES se pide `estado=DESHABILITADO` y solo aparecen los dados de baja

### Requisito: Filtrar por Todos con su estado (HU-M1-13 CA 6)

Con `estado` `TODOS` el sistema DEBE devolver todos los productos, y cada fila DEBE indicar su estado (insignia «Habilitado» o «Deshabilitado»).

#### Escenario: Todos los productos

- DADO un plato habilitado y un plato deshabilitado
- CUANDO se hace `GET /productos?estado=TODOS`
- ENTONCES figuran ambos, cada uno con su `estado`

#### Escenario: Todos en pantalla

- DADO productos de ambos estados
- CUANDO la persona elige «Todos»
- ENTONCES aparecen todos y cada fila muestra su estado

### Requisito: Estado inválido en el listado

Un valor de `estado` distinto de `HABILITADO`, `DESHABILITADO` y `TODOS` DEBE responder 422 con `{"detalle": ...}` (S29).

#### Escenario: Estado desconocido

- DADO `estado` igual a `ANULADO`
- CUANDO se hace `GET /productos?estado=ANULADO`
- ENTONCES responde 422

### Requisito: Paginación del listado (D-27)

El listado DEBE paginarse con `limit` (por defecto 50, máximo 100) y `offset`, y responder `items`, `total`, `limit` y `offset`. El orden DEBE ser estable (nombre, luego `id`). El frontend DEBE mostrar 50 filas por página y el componente de paginación cuando hay más de una página, y al cambiar el filtro DEBE volver a la página 1. Si tras una baja la página actual queda vacía y no es la primera, DEBE retroceder una página (E22).

#### Escenario: Segunda página

- DADO 3 productos habilitados
- CUANDO se hace `GET /productos?estado=HABILITADO&limit=2&offset=2`
- ENTONCES `items` trae 1 producto, `total` es 3, `limit` 2 y `offset` 2

#### Escenario: Límite fuera de rango

- DADO `limit` igual a 0 o 101
- CUANDO se hace `GET /productos?estado=TODOS`
- ENTONCES responde 422

#### Escenario: Cambio de filtro reinicia la página

- DADO la lista en la segunda página
- CUANDO la persona cambia el filtro
- ENTONCES se pide `offset` 0

#### Escenario: Página vacía tras una baja

- DADO la lista en la segunda página con un solo plato, con el filtro «Habilitados»
- CUANDO la persona da de baja ese plato
- ENTONCES la lista se recarga y retrocede a la página anterior, sin mostrar «lista vacía»

### Requisito: Enlace de editar solo en platos (HU-M1-13, S27)

Cada fila de plato DEBE ofrecer «Editar», un enlace a `/productos/platos/:id/editar`. Las filas de postres y bebidas NO DEBEN ofrecer «Editar» ni «Dar de baja» hasta HU-M1-05 y HU-M1-08 (E21).

#### Escenario: Editar un plato

- DADO una fila de plato en la lista
- CUANDO la persona pulsa «Editar»
- ENTONCES navega a `/productos/platos/:id/editar` con el `id` del plato

#### Escenario: Postres y bebidas sin editar

- DADO una fila de postre y una de bebida
- CUANDO se observan sus acciones
- ENTONCES no ofrecen «Editar»

### Requisito: Dar de baja desde la fila (HU-M1-13, S28, E13)

Las filas de platos habilitados DEBEN ofrecer «Dar de baja», con el mismo `ConfirmDialog`, la misma solicitud `POST /platos/{id}/baja` y la misma cancelación que en la pantalla de edición; al confirmar, la lista se recarga. El texto de confirmación es «El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.» Las filas de platos deshabilitados, postres y bebidas NO DEBEN ofrecer «Dar de baja».

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

### Requisito: El selector de productos de secciones no cambia (regresión)

`GET /api/v1/productos` sin el parámetro `estado` DEBE seguir devolviendo los mismos ítems (solo `HABILITADO`), en el mismo orden y con el mismo total que antes; solo se agregan campos (`ProductoListado` extiende `ProductoSeleccionable`, E14). Lo consume el selector de `SeccionesTab` (`listarProductosHabilitados`), que DEBE seguir funcionando.

#### Escenario: Sin parámetro estado

- DADO un producto habilitado y uno deshabilitado
- CUANDO se hace `GET /productos` sin `estado`
- ENTONCES responde 200 con `Pagina[ProductoListado]`, solo con el habilitado, con los mismos ítems, orden y total; solo se agregan campos

#### Escenario: Selector de secciones

- DADO la pestaña «Secciones» con el selector de productos
- CUANDO se abre el selector
- ENTONCES carga con `listarProductosHabilitados` sin enviar `estado` y muestra solo habilitados

## Supuestos nuevos

- Supuesto: S15 a S23 y S26 a S28 de la propuesta rigen sin cambios.
- Supuesto: S29. El listado de HU-M1-13 extiende `GET /api/v1/productos` con el parámetro opcional `estado` (`HABILITADO`, `DESHABILITADO`, `TODOS`, por defecto `HABILITADO`). La ruta siempre devuelve `Pagina[ProductoListado]`; sin `estado` trae los mismos ítems, orden y total que antes, con campos agregados (E14).
- Supuesto: S24. La imagen se quita enviando `quitar_imagen` `true` dentro de `datos`; enviarlo junto con una parte `imagen` responde 422. El archivo anterior, reemplazado o quitado, se borra recién después del `commit`; si ese borrado falla, la respuesta no cambia y el archivo queda huérfano (diseño, E3).
- Supuesto: S25. La baja usa `POST /api/v1/platos/{id}/baja`, sin cuerpo: es una acción de negocio con regla propia (409 si ya está deshabilitado), y D-24 fija `POST` sobre un subrecurso verbal.
- Supuesto: `PUT` es un reemplazo completo de los campos del alta; `estado` ausente conserva el actual.
- Supuesto: `GET /api/v1/productos` ya existe y devuelve solo productos `HABILITADO`; si no, el diseño lo define.
- Supuesto: los textos «Editar plato», «Guardar cambios» y «Dar de baja» son los de la pantalla; los fija el diseño en español neutro (S23).
