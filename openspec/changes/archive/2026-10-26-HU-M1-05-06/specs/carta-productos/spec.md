# Especificación de carta-productos (HU-M1-05 y HU-M1-06)

## Propósito

Consultar, modificar (incluida la reactivación) y dar de baja un postre de la carta. Delta sobre `carta-productos` de HU-M1-01, HU-M1-04 y HU-M1-02-03-13 (aún sin archivar; se archivan antes que este cambio). Es el equivalente para postres de lo que HU-M1-02-03-13 define para platos: los campos, las reglas de validación, las reglas de imagen, el orden de validación y la atomicidad son los de `PUT /platos/{id}` y `POST /platos/{id}/baja`, con «postre» en lugar de «plato». Las reglas de creación de un postre son las de HU-M1-04 (`POST /postres`, `PostreCrear`): los ingredientes son obligatorios (al menos 1), igual que en el plato. Esta spec solo agrega lo que cambia y prueba cada criterio de aceptación. Entidades del diagrama de clases: `Producto`, `Seccion`, `Estado`, `Categoria`.

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /postres/{id}` | 200, `ProductoSalida` | 404 |
| `PUT /postres/{id}` (multipart/form-data) | 200, `ProductoSalida` | 404, 409, 422 |
| `POST /postres/{id}/baja` (D-24) | 200, `ProductoSalida` con `estado` `DESHABILITADO` | 404, 409 |

- Un `id` inexistente, o que pertenece a un producto de otra categoría (plato o bebida), responde 404 en las tres rutas. Recíprocamente, `/platos/{id}` responde 404 para el `id` de un postre.
- `PUT /postres/{id}` tiene las mismas partes que `POST /postres`: `datos` (JSON) e `imagen` (archivo, opcional). `PostreModificar` extiende `PostreCrear` y `ProductoModificar`, igual que `PlatoModificar`:
  - Reemplazo completo: `nombre`, `seccion_id`, `precio` e `ingredientes` (al menos 1) son obligatorios; `descripcion` y `etiquetas` ausentes equivalen a vacíos y reemplazan a los actuales.
  - `estado` opcional (`HABILITADO` o `DESHABILITADO`); si falta, se conserva el actual. Otro valor responde 422. `categoria` es un campo desconocido (422).
  - `quitar_imagen` booleano opcional (por defecto `false`); junto con una parte `imagen` responde 422 (S24). Los ingredientes obligatorios son S33.
- Reglas de contenido (HU-M1-04): nombre de 1 a 100 caracteres tras `strip()`; precio mayor a 0 con hasta 8 enteros y 2 decimales; ingredientes sin repetidos, de 1 a 100 caracteres; descripción de hasta 500; etiquetas sin repetidas, de 1 a 30; imagen JPG, PNG o HEIC de hasta 5 MB.
- El nombre es único entre los postres, también los deshabilitados, sin distinguir mayúsculas, excluyendo al propio postre; el mensaje es «El postre ya está registrado» (S13). Un plato o una bebida con el mismo nombre no cuenta como repetido.
- `ProductoSalida` es el del alta. Orden de validación de `PUT`: 422 de forma, 422 de imagen, 404 del postre, 404 de sección y 409 de sección deshabilitada (solo si `seccion_id` cambia, S19), 409 de nombre repetido. Nada se guarda si algo falla.
- Baja: `POST /postres/{id}/baja` no recibe cuerpo y cambia solo `estado` a `DESHABILITADO`; 409 si ya estaba deshabilitado (S21). No se bloquea por menús ni comandas (S20).
- Datos: sin cambios de esquema ni migraciones; no se borra ninguna fila. Backend: solo `schemas.py` y `router.py`; el `service` es el mismo que el de platos (E5).
- Frontend: página de edición en `/productos/postres/:id/editar` (S31), con `ProductoEditarPage`, `useEdicionProducto` y `useBajaProducto` reutilizados. Textos (S32): «Editar postre», «Guardar cambios», «Postre modificado», «Postre dado de baja», «El postre no existe.» y confirmación «El postre quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.»

## Requisitos

### Requisito: Consultar un postre

El sistema DEBE devolver el postre con `GET /postres/{id}` para cargar el formulario de edición, que DEBE mostrar sus datos actuales (nombre, sección, precio, ingredientes, descripción, etiquetas, imagen y estado).

#### Escenario: Postre existente

- DADO un postre existente
- CUANDO se hace `GET /postres/{id}`
- ENTONCES responde 200 con su `ProductoSalida` con `categoria` `POSTRE`

#### Escenario: Id inexistente o de otra categoría

- DADO un id que no existe, o que corresponde a un plato o una bebida
- CUANDO se hace `GET /postres/{id}`
- ENTONCES responde 404 con `{"detalle": ...}`

#### Escenario: Un postre no se consulta como plato

- DADO un postre existente
- CUANDO se hace `GET /platos/{id}`, `PUT /platos/{id}` o `POST /platos/{id}/baja` con su id
- ENTONCES responde 404 y el postre no cambia

#### Escenario: Formulario cargado

- DADO un postre existente
- CUANDO se abre `/productos/postres/:id/editar`
- ENTONCES los campos muestran los datos actuales, con título «Editar postre» y botón «Guardar cambios»

### Requisito: Modificar los datos del postre (HU-M1-05 CA 1)

El sistema DEBE actualizar el postre con los valores válidos recibidos y responder 200 con `ProductoSalida` con los datos nuevos. Al guardar con éxito el frontend DEBE avisar «Postre modificado» y volver al listado de productos.

#### Escenario: Cambio válido de datos

- DADO un postre existente
- CUANDO se hace `PUT /postres/{id}` con otro nombre, precio, descripción y sección habilitada
- ENTONCES responde 200 con los datos nuevos y un `GET /postres/{id}` posterior los devuelve iguales

#### Escenario: Guardar sin cambiar el nombre

- DADO un postre «Flan»
- CUANDO se hace `PUT` con el mismo nombre y otro precio
- ENTONCES responde 200 (el nombre propio no cuenta como repetido)

#### Escenario: Modificación desde la pantalla

- DADO el formulario de edición de un postre con un precio nuevo
- CUANDO la persona pulsa «Guardar cambios»
- ENTONCES se envía una sola solicitud multipart `PUT /postres/{id}`, se muestra el aviso de éxito y se vuelve a «Productos»

### Requisito: Modificar ingredientes, etiquetas e imagen del postre (HU-M1-05 CA 2)

El sistema DEBE permitir agregar o quitar ingredientes y etiquetas, y mantener, reemplazar o quitar la imagen, con las mismas reglas que el plato: las listas enviadas reemplazan a las actuales; sin parte `imagen` y `quitar_imagen` `false` se conserva la imagen; con parte `imagen` válida la reemplaza; con `quitar_imagen` `true` y sin parte `imagen` queda sin imagen. El archivo anterior se borra solo después del `commit` (S22).

#### Escenario: Agregar y quitar ingredientes y etiquetas

- DADO un postre con ingredientes «Leche» y «Huevo» y etiqueta «Casero»
- CUANDO se hace `PUT` con ingredientes «Leche» y «Azúcar» y sin etiquetas
- ENTONCES responde 200 con `ingredientes` «Leche» y «Azúcar» y `etiquetas` vacío

#### Escenario: Imagen conservada

- DADO un postre con imagen
- CUANDO se hace `PUT` sin parte `imagen` y sin `quitar_imagen`
- ENTONCES `imagen_url` es el mismo y el archivo sigue existiendo

#### Escenario: Imagen reemplazada

- DADO un postre con imagen
- CUANDO se hace `PUT` con una imagen PNG válida
- ENTONCES `imagen_url` cambia, el archivo nuevo se sirve con 200 y el anterior ya no está en `MEDIA_DIR`

#### Escenario: Imagen quitada

- DADO un postre con imagen
- CUANDO se hace `PUT` con `quitar_imagen` `true`
- ENTONCES `imagen_url` es `null` y el archivo anterior ya no está en `MEDIA_DIR`

#### Escenario: Quitar y reemplazar a la vez

- DADO `quitar_imagen` `true` y una parte `imagen` válida
- CUANDO se hace `PUT`
- ENTONCES responde 422 y el postre no cambia

#### Escenario: Cambios en el formulario

- DADO el formulario de edición de un postre con un chip quitado, otro agregado y la imagen quitada
- CUANDO la persona guarda
- ENTONCES se envían las listas resultantes y `quitar_imagen` igual a `true`

### Requisito: Reglas de validación del alta en la modificación del postre (HU-M1-05 CA 3)

Un valor que no cumple las reglas de HU-M1-04 DEBE responder 422 (formato, obligatoriedad, largo, imagen) o 409 (nombre repetido, sección deshabilitada), sin aplicar ningún cambio e indicando qué dato es inválido. La sección DEBE existir (404) y estar habilitada (409), solo si `seccion_id` cambia (S19). El formulario DEBE mostrar bajo cada campo inválido qué dato falla y NO DEBE enviar la solicitud si la validación local falla.

#### Escenario: Nombre vacío o demasiado largo

- DADO un postre existente
- CUANDO se hace `PUT` con `nombre` igual a `"   "` o de 101 caracteres
- ENTONCES responde 422, indica `nombre` y el postre conserva sus datos

#### Escenario: Precio inválido

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `precio`, y el postre conserva su precio

#### Escenario: Ingredientes vacíos o repetidos

- DADO `ingredientes` vacío, o «Huevo» y « huevo »
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Etiquetas y descripción inválidas

- DADO una etiqueta de 31 caracteres, etiquetas «casero» y «Casero», o una descripción de 501 caracteres
- CUANDO se hace `PUT`
- ENTONCES responde 422 e indica `etiquetas` o `descripcion`

#### Escenario: Imagen inválida

- DADO un PDF, un archivo de texto llamado `postre.jpg` o una imagen de 5 MB más 1 byte
- CUANDO se hace `PUT`
- ENTONCES responde 422, el postre conserva su imagen y no queda archivo nuevo en `MEDIA_DIR`

#### Escenario: Nombre duplicado

- DADO los postres «Flan» y «Tiramisú» (este último deshabilitado)
- CUANDO se modifica «Flan» con el nombre « tiramisú »
- ENTONCES responde 409 con «El postre ya está registrado» y «Flan» no cambia

#### Escenario: Mismo nombre que un plato

- DADO un plato «Milanesa»
- CUANDO se modifica un postre con el nombre «Milanesa»
- ENTONCES responde 200

#### Escenario: Sección inexistente o deshabilitada

- DADO un `seccion_id` inexistente, o de una sección deshabilitada
- CUANDO se hace `PUT`
- ENTONCES responde 404 o 409 respectivamente y el postre no cambia

#### Escenario: Error indicado en el formulario

- DADO el formulario de edición con el precio `abc` y el nombre vacío
- CUANDO la persona guarda
- ENTONCES no se envía la solicitud y cada campo muestra qué dato es inválido

#### Escenario: Nombre duplicado en el formulario

- DADO que el servidor responde 409 por nombre repetido
- CUANDO la persona guarda
- ENTONCES el formulario muestra «El postre ya está registrado» bajo el nombre y los datos escritos se conservan

### Requisito: Atomicidad de la modificación del postre

Si falla cualquier validación, la escritura del archivo o el `commit`, el postre DEBE conservar todos sus datos e imagen; si el `commit` falla tras escribir una imagen nueva, el archivo nuevo DEBE borrarse y el anterior conservarse (S22).

#### Escenario: Falla el commit

- DADO un postre con imagen y una imagen nueva válida, con un fallo simulado al confirmar la transacción
- CUANDO se hace `PUT`
- ENTONCES el postre conserva sus datos, su `imagen_url` anterior sigue sirviéndose y no queda el archivo nuevo en `MEDIA_DIR`

### Requisito: Las facturas conservan el precio del postre (HU-M1-05 CA 4, S18)

Modificar el precio de un postre NO DEBE borrar ni alterar ninguna fila que lo referencie. `Factura` no existe todavía (M6) y copia el precio al emitir (`precioUnitario {copia al emitir}`); este cambio solo DEBE garantizar que la modificación actualiza el postre en su fila (mismo `id`) sin tocar tablas ajenas.

#### Escenario: El postre conserva su identidad al cambiar el precio

- DADO un postre con `id` N referenciado por una fila de otra tabla (fila de prueba con clave foránea a `productos.id`)
- CUANDO se hace `PUT` con un precio nuevo
- ENTONCES el postre sigue con el mismo `id` N, el precio nuevo, y la fila que lo referencia permanece intacta

### Requisito: Reactivar un postre deshabilitado (HU-M1-05 CA 5)

El sistema DEBE permitir cambiar el estado de `DESHABILITADO` a `HABILITADO` con `PUT` y, desde ese momento, el postre DEBE volver a figurar en `GET /api/v1/productos`. Aparece en la carta si su sección está habilitada; reactivarlo en una sección deshabilitada NO se bloquea (S19). El formulario DEBE mostrar el estado como interruptor editable «Habilitado» solo en edición.

#### Escenario: Reactivación

- DADO un postre `DESHABILITADO` en una sección habilitada
- CUANDO se hace `PUT` con `estado` `HABILITADO`
- ENTONCES responde 200 con `estado` `HABILITADO` y el postre vuelve a figurar en `GET /api/v1/productos`

#### Escenario: Reactivar en una sección deshabilitada

- DADO un postre `DESHABILITADO` cuya sección está deshabilitada
- CUANDO se hace `PUT` con `estado` `HABILITADO` y la misma `seccion_id`
- ENTONCES responde 200 y queda `HABILITADO`, sin aparecer en la carta mientras la sección esté deshabilitada

#### Escenario: Estado inválido

- DADO `estado` igual a `ANULADO`
- CUANDO se hace `PUT /postres/{id}`
- ENTONCES responde 422 e indica `estado`

#### Escenario: Reactivar desde el formulario

- DADO el formulario de edición de un postre deshabilitado
- CUANDO la persona activa «Habilitado» y guarda
- ENTONCES se envía `estado` `HABILITADO` y se muestra el aviso de éxito

### Requisito: Dar de baja un postre (HU-M1-06 CA 1)

El sistema DEBE pasar el postre `HABILITADO` a `DESHABILITADO` con `POST /postres/{id}/baja` y responder 200 con `ProductoSalida`. El postre DEJA de figurar en `GET /api/v1/productos` (lista de habilitados) y en la carta. Dar de baja un postre ya `DESHABILITADO` responde 409 (S21). La baja NO se bloquea por menús ni comandas (S20). El frontend DEBE ofrecer «Dar de baja» en la pantalla de edición, que abre un `ConfirmDialog` y, al confirmar, avisa «Postre dado de baja» y vuelve al listado de productos.

#### Escenario: Baja confirmada

- DADO un postre `HABILITADO`
- CUANDO se hace `POST /postres/{id}/baja`
- ENTONCES responde 200 con `estado` `DESHABILITADO` y el postre ya no figura en `GET /api/v1/productos`

#### Escenario: Baja de un postre ya deshabilitado

- DADO un postre `DESHABILITADO`
- CUANDO se hace `POST /postres/{id}/baja`
- ENTONCES responde 409 con `{"detalle": ...}` y el postre no cambia

#### Escenario: Baja de un id inexistente o de otra categoría

- DADO un id que no existe o que es de un plato o una bebida
- CUANDO se hace `POST /postres/{id}/baja`
- ENTONCES responde 404

#### Escenario: Baja de un postre usado por un menú o una comanda

- DADO un postre referenciado por otra tabla
- CUANDO se hace `POST /postres/{id}/baja`
- ENTONCES responde 200 y la fila que lo referencia permanece intacta

#### Escenario: Baja desde la pantalla

- DADO la pantalla de edición de un postre habilitado
- CUANDO la persona pulsa «Dar de baja» y confirma en el diálogo
- ENTONCES se envía `POST /postres/{id}/baja`, se muestra el aviso de éxito y se vuelve a «Productos»

### Requisito: Cancelar la baja del postre (HU-M1-06 CA 2)

Si la persona cancela el diálogo de confirmación, el sistema NO DEBE enviar ninguna solicitud y el postre DEBE seguir `HABILITADO`.

#### Escenario: Cancelar la confirmación

- DADO el diálogo de baja de un postre abierto
- CUANDO la persona pulsa «Cancelar»
- ENTONCES se cierra el diálogo, no se envía ninguna solicitud y el postre sigue `HABILITADO`

### Requisito: La baja conserva los datos del postre (HU-M1-06 CA 3, S18)

Un postre `DESHABILITADO` DEBE conservar todos sus datos (nombre, precio, ingredientes, etiquetas, descripción, imagen, sección) y su fila. La baja NO borra filas ni archivos. Que siga figurando en facturas y reportes anteriores lo garantiza que `Factura` copia el precio al emitir y que la fila del postre nunca se elimina.

#### Escenario: Datos intactos tras la baja

- DADO un postre con todos sus datos e imagen
- CUANDO se da de baja
- ENTONCES `GET /postres/{id}` responde 200 con los mismos datos, `estado` `DESHABILITADO` y la imagen sigue sirviéndose

#### Escenario: Filas relacionadas intactas

- DADO un postre referenciado por una fila de otra tabla
- CUANDO se da de baja
- ENTONCES la fila del postre y la que lo referencia siguen presentes

### Requisito: Reactivar un postre dado de baja (HU-M1-06 CA 4)

Un postre `DESHABILITADO` DEBE poder reactivarse desde la modificación (`PUT` con `estado` `HABILITADO`). La persona filtra la lista por Deshabilitados (HU-M1-13), encuentra el postre, abre su edición desde la fila y lo reactiva. La pantalla de edición DEBE abrirse para un postre deshabilitado y NO DEBE ofrecer «Dar de baja».

#### Escenario: Postre deshabilitado consultable

- DADO un postre `DESHABILITADO`
- CUANDO se hace `GET /postres/{id}`
- ENTONCES responde 200 con `estado` `DESHABILITADO`

#### Escenario: Postre deshabilitado en el filtro

- DADO un postre dado de baja
- CUANDO se hace `GET /productos?estado=DESHABILITADO`
- ENTONCES el postre figura en la lista

#### Escenario: Pantalla de edición de un postre deshabilitado

- DADO un postre `DESHABILITADO`
- CUANDO se abre `/productos/postres/:id/editar`
- ENTONCES el interruptor de estado aparece apagado, se puede activar y el botón «Dar de baja» no se ofrece

#### Escenario: Reactivar desde la lista filtrada

- DADO un postre dado de baja y la lista abierta
- CUANDO la persona elige el filtro «Deshabilitados», abre la edición desde la fila del postre, activa «Habilitado» y guarda
- ENTONCES se envía `PUT /postres/{id}` con `estado` `HABILITADO`, y al volver a «Productos» el postre aparece con el filtro «Habilitados» y ya no con «Deshabilitados»

## MODIFIED Requirements

### Requisito: Enlace de editar en platos y postres (HU-M1-13, S27, S31)

Reemplaza a «Enlace de editar solo en platos» de HU-M1-02-03-13. Cada fila de plato DEBE ofrecer «Editar», un enlace a `/productos/platos/:id/editar`, y cada fila de postre un enlace a `/productos/postres/:id/editar`; la ruta se deriva de la categoría de la fila. Las filas de bebidas NO DEBEN ofrecer «Editar» ni «Dar de baja» hasta HU-M1-08 (E21).

#### Escenario: Editar un plato

- DADO una fila de plato en la lista
- CUANDO la persona pulsa «Editar»
- ENTONCES navega a `/productos/platos/:id/editar` con el `id` del plato

#### Escenario: Editar un postre

- DADO una fila de postre en la lista
- CUANDO la persona pulsa «Editar»
- ENTONCES navega a `/productos/postres/:id/editar` con el `id` del postre

#### Escenario: Bebidas sin acciones

- DADO una fila de bebida
- CUANDO se observan sus acciones
- ENTONCES no ofrece «Editar» ni «Dar de baja»

### Requisito: Dar de baja desde la fila de platos y postres (HU-M1-13, S28, E13, S31)

Reemplaza a «Dar de baja desde la fila» de HU-M1-02-03-13. Las filas de platos y postres habilitados DEBEN ofrecer «Dar de baja», con el mismo `ConfirmDialog`, la misma cancelación y la solicitud `POST /platos/{id}/baja` o `POST /postres/{id}/baja` según la categoría; al confirmar, la lista se recarga. El texto de confirmación de un postre es el de S32. Las filas de platos y postres deshabilitados, y las de bebidas, NO DEBEN ofrecer «Dar de baja».

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

### Requisito: El alta y la edición de platos no cambian (regresión)

Ampliar la edición a postres NO DEBE alterar `POST /platos`, `POST /postres`, `PUT /platos/{id}` ni `POST /platos/{id}/baja`, ni la pantalla de edición de platos.

#### Escenario: Pruebas existentes

- DADO las pruebas de alta de platos y postres, de edición y baja de platos, y de la lista
- CUANDO se corre la suite
- ENTONCES pasan, adaptadas solo por nombres o rutas

## Supuestos nuevos

- Supuesto: S15, S18 a S25 y S27 a S29 rigen para postres; S13 define el mensaje «El postre ya está registrado». S27 deja de regir para postres (S31).
- Supuesto: S30 a S32 de la propuesta rigen sin cambios (criterios equivalentes a los de #3 y #4; edición en `/productos/postres/:id/editar`; textos análogos a los del plato).
- Supuesto: S33. Los ingredientes de un postre son obligatorios (al menos 1) en la modificación, igual que en el alta (`PostreCrear`); si el equipo decide que son opcionales, cambia el alta y la modificación juntas en otra HU.
- Supuesto: S34. `PUT /postres/{id}` no permite cambiar la categoría del producto; un `id` de otra categoría responde 404 en lugar de 409 o 422 (E5).
