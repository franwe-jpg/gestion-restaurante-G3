# Especificación de carta-productos

## Propósito

Alta de platos y postres de la carta con sus datos, sección, ingredientes, etiquetas e imagen; consulta, modificación (incluida la reactivación) y baja de platos; y listado de los productos con filtro de estado. Entidades del diagrama de clases: `Producto`, `Seccion`, `Estado`, `Categoria`. El `service` de alta es compartido por categoría: los postres (HU-M1-04) solo agregan su ruta y su esquema, y las bebidas (HU-M1-07) harán lo mismo.

Origen: HU-M1-01, HU-M1-04 y HU-M1-02-03-13 (archivados 2026-10-26)

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /platos` (multipart/form-data) | 201, `ProductoSalida` | 404, 409, 422 |
| `GET /platos/{id}` | 200, `ProductoSalida` | 404 |
| `PUT /platos/{id}` (multipart/form-data) | 200, `ProductoSalida` | 404, 409, 422 |
| `POST /platos/{id}/baja` (D-24) | 200, `ProductoSalida` con `estado` `DESHABILITADO` | 404, 409 |
| `POST /postres` (multipart/form-data) | 201, `ProductoSalida` | 404, 409, 422 |
| `GET /productos?estado&limit&offset` (HU-M1-13, S29) | 200, `Pagina[ProductoListado]`; sin `estado`, solo `HABILITADO` (mismos ítems, orden y total que antes de HU-M1-13; solo se agregan campos) | 422 |
| `GET /secciones?estado=HABILITADO` | 200, `Pagina[SeccionRespuesta]` (delta de `carta-secciones`) | 422 |
| `GET /media/<archivo>` | 200, imagen guardada | 404 |

Las solicitudes `POST /platos` y `POST /postres` son multipart/form-data con dos partes, iguales para ambas categorías: `datos` (texto JSON con los campos de la tabla) e `imagen` (archivo, opcional). Campos de `datos`:

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | texto | sí | 1 a 100 caracteres tras `strip()` (S5) |
| `seccion_id` | entero | sí | sección existente y habilitada |
| `precio` | decimal con punto | sí | mayor a 0, hasta 8 enteros y 2 decimales (S4) |
| `ingredientes` | lista de textos | sí | al menos 1, hasta 50, cada uno de 1 a 100 caracteres, sin repetidos (S2, S3) |
| `descripcion` | texto | no | hasta 500 caracteres |
| `etiquetas` | lista de textos | no | hasta 20, cada una de 1 a 30 caracteres, sin repetidas (S2, S3) |

La parte `imagen` es un archivo JPG, PNG o HEIC de hasta 5 MB, validado por su contenido. Un JSON inválido en `datos` o un campo desconocido responden 422 (diseño B2 y B3).
- `categoria` y `estado` NO se reciben: el sistema asigna `PLATO` en `POST /platos` o `POSTRE` en `POST /postres`, y `HABILITADO`. Dentro de `datos` son campos desconocidos y responden 422, como cualquier otro campo no previsto; enviados como partes sueltas del formulario, se ignoran.
- `ProductoSalida`: `id`, `nombre`, `categoria`, `precio`, `ingredientes: [str]`, `descripcion` (puede ser `null`), `etiquetas: [str]`, `estado`, `imagen_url` (`/media/<archivo>` o `null`), `seccion: {id, nombre}`. Es el mismo para ambas categorías, con `categoria` `PLATO` o `POSTRE`.
- Supuesto: `precio` se serializa como cadena decimal con dos decimales (por ejemplo `"12500.00"`).
- Datos: usa la tabla `productos` existente. Se agrega `nombre_normalizado` (`casefold()` del nombre recortado, no se expone) con un índice único sobre (`categoria`, `nombre_normalizado`): el nombre es único dentro de cada categoría, así que un postre puede llamarse igual que un plato (diseño B1). Se agrega mediante una revisión de Alembic posterior a `a1c3e5f7b9d1`. `productos.imagen` guarda el nombre de archivo. El alta de postres no cambia el esquema.
- Orden de validación, igual en ambas rutas: 422 de forma (campos, largos, precio, listas), 422 de imagen, 404 de sección, 409 de sección deshabilitada, 409 de nombre repetido. La imagen se procesa antes de consultar la base (diseño B6). Nada se guarda si algo falla (S7).
- Frontend: rutas por categoría `/productos/platos/nuevo` y `/productos/postres/nuevo`; `/productos/nuevo` sigue funcionando o redirige a la de platos. Una sola página, `hook` y validador parametrizados por una configuración de categoría (título, migas, endpoint, mensaje de nombre repetido, ingredientes obligatorios). Los nombres técnicos los fija el diseño.

Consulta, modificación y baja de platos (HU-M1-02 y HU-M1-03):

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

Listado de productos (HU-M1-13):

- Supuesto S29: `GET /productos` acepta el parámetro opcional `estado` con valores `HABILITADO`, `DESHABILITADO` o `TODOS`, además de `limit` y `offset` (D-27, `ParametrosPaginacion`). Otro valor de `estado` responde 422. La ruta siempre devuelve `Pagina[ProductoListado]`; `ProductoListado` extiende `ProductoSeleccionable` y agrega `precio`, `etiquetas` y `estado` (E14). Sin `estado`, el valor por defecto es `HABILITADO` y la respuesta trae los mismos ítems, orden y total que antes; solo se agregan campos, por lo que `SeccionesTab` sigue funcionando. Los ítems tienen `id`, `nombre`, `categoria` (`PLATO`, `POSTRE` o `BEBIDA`), `seccion`, `precio`, `etiquetas` (lista de textos) y `estado`. Orden estable por nombre y luego `id`. La lista no tiene efectos de escritura.

## Requisitos
### Requisito: Crear plato (HU-M1-01 CA 1)

El sistema DEBE crear el plato con categoría `PLATO` y responder 201 con `ProductoSalida`, con el nombre recortado, la sección elegida y los ingredientes y etiquetas enviados. El frontend DEBE ofrecer la página `/productos/nuevo`, accesible con el botón «Nuevo plato» de la pestaña «Productos»; al guardar con éxito DEBE avisar y volver al listado de productos.

#### Escenario: Alta válida mínima

- DADO un nombre libre, una sección habilitada, un precio válido y un ingrediente
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con `categoria` `PLATO`, `imagen_url` `null`, `descripcion` `null` y `etiquetas` vacío

#### Escenario: Alta completa

- DADO todos los campos válidos, con descripción, etiquetas e imagen
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con todos los datos enviados y un `imagen_url` que empieza con `/media/`

#### Escenario: Alta desde la pantalla

- DADO el formulario «Nuevo plato» completo
- CUANDO la persona pulsa «Guardar plato»
- ENTONCES se envía una sola solicitud multipart, se muestra un aviso de éxito y se vuelve a la pestaña «Productos»

### Requisito: Crear postre (HU-M1-04 CA 1)

El sistema DEBE crear el postre con categoría `POSTRE` y responder 201 con `ProductoSalida`, con el nombre recortado, la sección elegida y los ingredientes y etiquetas enviados. El frontend DEBE ofrecer la página `/productos/postres/nuevo`, accesible con el botón «Nuevo postre» de la pestaña «Productos», junto a «Nuevo plato». El título y las migas DEBEN decir «Nuevo postre» y el botón de envío «Guardar postre». Al guardar con éxito DEBE avisar y volver al listado de productos.

#### Escenario: Alta válida mínima

- DADO un nombre libre, una sección habilitada, un precio válido y un ingrediente
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con `categoria` `POSTRE`, `imagen_url` `null`, `descripcion` `null` y `etiquetas` vacío

#### Escenario: Alta completa

- DADO todos los campos válidos, con descripción, etiquetas e imagen
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con todos los datos enviados y un `imagen_url` que empieza con `/media/`

#### Escenario: Botón «Nuevo postre»

- DADO la pestaña «Productos»
- CUANDO se observan las acciones de alta
- ENTONCES existen los botones «Nuevo plato» y «Nuevo postre», y este último abre `/productos/postres/nuevo`

#### Escenario: Formulario con título de postre

- DADO la ruta `/productos/postres/nuevo`
- CUANDO se abre la página
- ENTONCES el título y las migas dicen «Nuevo postre» y el botón de envío dice «Guardar postre»

#### Escenario: Alta de postre desde la pantalla

- DADO el formulario «Nuevo postre» completo
- CUANDO la persona pulsa «Guardar postre»
- ENTONCES se envía una sola solicitud multipart a `/postres`, se muestra un aviso de éxito y se vuelve a la pestaña «Productos»

### Requisito: Campos obligatorios (HU-M1-01 CA 2, HU-M1-04 CA 2)

En `POST /platos` y en `POST /postres`, faltar `nombre`, `seccion_id`, `precio` o `ingredientes`, o un nombre vacío tras `strip()`, DEBE responder 422 sin guardar e indicar el campo faltante. El formulario de alta de cada categoría DEBE mostrar bajo cada campo obligatorio vacío qué falta y NO DEBE enviar la solicitud.

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

### Requisito: Nombre único entre platos (HU-M1-01 CA 3)

El nombre DEBE ser único entre los platos, también los deshabilitados, sin distinguir mayúsculas (`casefold()`) y tras `strip()` (S1). Si ya existe, responde 409 «El plato ya está registrado». Un producto de otra categoría con el mismo nombre NO DEBE bloquear el alta.

#### Escenario: Nombre repetido con otra capitalización

- DADO un plato «Milanesa»
- CUANDO se crea «  milanesa »
- ENTONCES responde 409 y el formulario advierte que el plato ya está registrado

#### Escenario: Nombre de un plato deshabilitado

- DADO un plato «Flan casero» deshabilitado
- CUANDO se crea «Flan casero»
- ENTONCES responde 409

#### Escenario: Mismo nombre en otra categoría

- DADO un producto de categoría distinta de `PLATO` llamado «Tiramisú»
- CUANDO se crea un plato «Tiramisú»
- ENTONCES responde 201

### Requisito: Nombre único entre postres (HU-M1-04 CA 3)

El nombre DEBE ser único entre los postres, también los deshabilitados, sin distinguir mayúsculas (`casefold()`) y tras `strip()`. Si ya existe, responde 409 «El postre ya está registrado» (S13). Un producto de otra categoría con el mismo nombre NO DEBE bloquear el alta (S14).

#### Escenario: Nombre repetido con otra capitalización

- DADO un postre «Flan»
- CUANDO se crea «  flan »
- ENTONCES responde 409 con el detalle «El postre ya está registrado» y el formulario muestra esa advertencia

#### Escenario: Nombre de un postre deshabilitado

- DADO un postre «Flan casero» deshabilitado
- CUANDO se crea «Flan casero»
- ENTONCES responde 409

#### Escenario: Un plato y un postre pueden llamarse igual

- DADO un plato «Tiramisú»
- CUANDO se crea un postre «Tiramisú»
- ENTONCES responde 201
- Y crear después un plato «Tiramisú» sigue respondiendo 409 «El plato ya está registrado»

### Requisito: Largo del nombre (HU-M1-01 CA 4, HU-M1-04 CA 4)

El nombre del plato o del postre DEBE tener como máximo 100 caracteres tras `strip()`; más responde 422. PUEDE contener números.

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

### Requisito: Precio válido (HU-M1-01 CA 5, HU-M1-04 CA 5)

El precio del plato o del postre DEBE ser un decimal mayor a 0, con hasta 8 dígitos enteros y 2 decimales (S4). Cero, negativos, texto, más de 2 decimales o más de 8 enteros DEBEN responder 422. El formulario de cada categoría DEBE aceptar la coma como separador decimal (por ejemplo `12.500,50`) y convertirlo a punto antes de enviar, y DEBE mostrar que el precio es inválido cuando no cumple.

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

### Requisito: Ingredientes obligatorios y sin repetidos (HU-M1-01 CA 6, HU-M1-04 CA 6)

El plato o el postre DEBE tener al menos un ingrediente; la lista vacía responde 422. Cada ingrediente DEBE tener de 1 a 100 caracteres tras `strip()` y no repetirse (`casefold()`, S2); un repetido o vacío responde 422. En el formulario de ambas categorías, los ingredientes son obligatorios y se cargan como chips: «Enter» agrega el texto escrito; un texto vacío o repetido NO DEBE agregarse y DEBE mostrar un mensaje; cada chip DEBE poder quitarse.

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

### Requisito: Descripción opcional (HU-M1-01 CA 7, HU-M1-04 CA 7)

La descripción del plato o del postre es opcional y DEBE tener como máximo 500 caracteres tras `strip()` (lo fija el issue #2); más responde 422. Una descripción vacía se guarda como `null`. El formulario DEBE mostrar el contador de caracteres.

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

### Requisito: Sin secciones habilitadas (HU-M1-01 CA 8, HU-M1-04 CA 8)

Si no existe ninguna sección habilitada, el formulario de alta de plato o de postre DEBE mostrar el aviso «Primero hay que crear una sección» con un enlace a la pestaña «Secciones» y DEBE deshabilitar su botón de envío («Guardar plato» o «Guardar postre»).

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

### Requisito: Sección habilitada y existente (HU-M1-01 CA 9, HU-M1-04 CA 9)

En el alta de un plato o de un postre, la sección DEBE existir (404 si no) y estar habilitada (409 si no). El selector de sección DEBE listar solo las secciones habilitadas, ordenadas por `orden`, obtenidas con `GET /secciones?estado=HABILITADO`.

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

### Requisito: Imagen válida por contenido (HU-M1-01 CA 10, HU-M1-04 CA 10)

La imagen es opcional, con las mismas reglas para platos y postres. El sistema DEBE validar por contenido (no por extensión ni `Content-Type`) que sea JPG, PNG o HEIC y que pese como máximo 5 MB (5 242 880 bytes). Otro formato, un archivo corrupto o un tamaño mayor DEBE responder 422 con un mensaje que nombre los formatos y el tamaño permitidos, y cancelar el alta completa, sin crear el plato o el postre ni dejar archivo (S7). El formulario de cada categoría DEBE rechazar antes de enviar un archivo de más de 5 MB y mostrar el mismo mensaje.

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

### Requisito: Elegir imagen de archivo o cámara (HU-M1-01 CA 11, HU-M1-04 CA 11)

El selector de imagen de los formularios de plato y de postre DEBE ofrecer dos opciones: «Elegir archivo» (galería o archivos) y «Sacar foto» (cámara del dispositivo, `capture="environment"`). DEBE mostrar una vista previa y permitir quitar la imagen elegida antes de guardar. En HEIC la vista previa PUEDE no estar disponible (S11); en ese caso DEBE mostrar el nombre y el tamaño.

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

### Requisito: HEIC se guarda como JPEG (HU-M1-01 CA 12, HU-M1-04 CA 12)

Una imagen HEIC válida de un plato o de un postre DEBE guardarse y servirse como JPEG, con la orientación aplicada, de modo que `imagen_url` abra en cualquier navegador. JPG y PNG DEBEN reguardarse sin metadatos (S6). El nombre del archivo lo decide el servidor (`uuid4().hex` más extensión) y el nombre original NO DEBE usarse. La vista de la carta pertenece a otra HU (S12).

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

### Requisito: Etiquetas opcionales y sin repetidas (HU-M1-01 CA 13, HU-M1-04 CA 13)

Las etiquetas del plato o del postre son opcionales; cada una DEBE tener de 1 a 30 caracteres tras `strip()` y no repetirse (`casefold()`, S2); un repetido, vacío o más largo responde 422. En el formulario de cada categoría se cargan como chips con las mismas reglas que los ingredientes: un texto vacío, repetido o de más de 30 caracteres NO DEBE agregarse y DEBE mostrar un mensaje.

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

### Requisito: Alta sin datos opcionales (HU-M1-01 CA 14, HU-M1-04 CA 14)

El plato o el postre DEBE registrarse aunque no se carguen descripción, imagen ni etiquetas.

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

### Requisito: Estado asignado por el sistema

El plato o el postre DEBE crearse siempre `HABILITADO`; el cliente no elige el estado (S10). El formulario de alta de cada categoría DEBE mostrar el estado como texto fijo «Habilitado», sin interruptor.

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

### Requisito: Atomicidad del alta

Si falla cualquier validación, la escritura del archivo o el `commit`, NO DEBE quedar plato ni postre en la base. Si el `commit` falla después de escribir la imagen, el archivo DEBE borrarse (S7).

#### Escenario: Falla el commit

- DADO una imagen válida y un fallo simulado al confirmar la transacción
- CUANDO se hace `POST /platos`
- ENTONCES no queda plato en la base ni archivo en `MEDIA_DIR`

#### Escenario: Falla el commit (postre)

- DADO una imagen válida y un fallo simulado al confirmar la transacción
- CUANDO se hace `POST /postres`
- ENTONCES no queda postre en la base ni archivo en `MEDIA_DIR`

### Requisito: El alta de platos no cambia (regresión)

El refactor del formulario NO DEBE alterar el alta de platos. `POST /platos` DEBE conservar su contrato y la categoría `PLATO`. El formulario de platos DEBE conservar su título «Nuevo plato», el botón «Guardar plato» y el mensaje «El plato ya está registrado», en `/productos/platos/nuevo`; la ruta `/productos/nuevo` DEBE seguir funcionando o redirigir a ella.

#### Escenario: Alta de plato tras el refactor

- DADO el formulario «Nuevo plato» completo en `/productos/platos/nuevo`
- CUANDO la persona pulsa «Guardar plato»
- ENTONCES se envía una sola solicitud multipart a `/platos`, se muestra el aviso de éxito y se vuelve a «Productos»

#### Escenario: Ruta anterior de platos

- DADO la ruta `/productos/nuevo`
- CUANDO se abre
- ENTONCES se muestra el formulario «Nuevo plato» (directo o por redirección)

#### Escenario: Pruebas existentes de platos

- DADO las pruebas de platos de HU-M1-01
- CUANDO se corre la suite
- ENTONCES pasan, adaptadas solo por nombres o rutas

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

## Supuestos

- Supuesto: S1 a S12 de la propuesta de HU-M1-01 rigen sin cambios, también para postres (HU-M1-04).
- Supuesto: `precio` se serializa como cadena decimal con dos decimales.
- Supuesto: 5 MB equivalen a 5 242 880 bytes; el servidor también limita los píxeles para evitar imágenes decompresoras.
- Supuesto: un `estado` o `categoria` enviado como parte suelta del formulario se ignora; dentro de `datos` responde 422 por campo desconocido.
- Supuesto: el orden de validación es 422 de forma, 422 de imagen, 404 de sección, 409 de sección deshabilitada, 409 de nombre.
- Supuesto: una parte `imagen` vacía (sin archivo) equivale a no enviar imagen.
- Supuesto: tras el alta exitosa, la pantalla vuelve a la pestaña «Productos» con un aviso.
- Supuesto: los textos de las listas se recortan y se guardan con su capitalización original; la comparación de repetidos usa `casefold()`.
- Supuesto: S13. El mensaje de nombre repetido es «El postre ya está registrado», análogo al de platos.
- Supuesto: S14. Un plato y un postre pueden llamarse igual; la unicidad es por categoría.
- Supuesto: las rutas del frontend son `/productos/platos/nuevo` y `/productos/postres/nuevo`; `/productos/nuevo` sigue funcionando o redirige. Los nombres técnicos los fija el diseño.
- Supuesto: S15 a S23 y S26 a S28 de la propuesta de HU-M1-02-03-13 rigen sin cambios.
- Supuesto: S29. El listado de HU-M1-13 extiende `GET /api/v1/productos` con el parámetro opcional `estado` (`HABILITADO`, `DESHABILITADO`, `TODOS`, por defecto `HABILITADO`). La ruta siempre devuelve `Pagina[ProductoListado]`; sin `estado` trae los mismos ítems, orden y total que antes, con campos agregados (E14).
- Supuesto: S24. La imagen se quita enviando `quitar_imagen` `true` dentro de `datos`; enviarlo junto con una parte `imagen` responde 422. El archivo anterior, reemplazado o quitado, se borra recién después del `commit`; si ese borrado falla, la respuesta no cambia y el archivo queda huérfano (diseño, E3).
- Supuesto: S25. La baja usa `POST /api/v1/platos/{id}/baja`, sin cuerpo: es una acción de negocio con regla propia (409 si ya está deshabilitado), y D-24 fija `POST` sobre un subrecurso verbal.
- Supuesto: `PUT` es un reemplazo completo de los campos del alta; `estado` ausente conserva el actual.
- Supuesto: `GET /api/v1/productos` ya existe y devuelve solo productos `HABILITADO`; si no, el diseño lo define.
- Supuesto: los textos «Editar plato», «Guardar cambios» y «Dar de baja» son los de la pantalla; los fija el diseño en español neutro (S23).
