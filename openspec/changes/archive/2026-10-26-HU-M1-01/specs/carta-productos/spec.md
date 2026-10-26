# Especificación de carta-productos (HU-M1-01)

## Propósito

Alta de platos de la carta con sus datos, sección, ingredientes, etiquetas e imagen. Capacidad nueva. Entidades del diagrama de clases: `Producto`, `Seccion`, `Estado`, `Categoria`. El `service` de alta queda compartido para HU-M1-04 (postres) y HU-M1-07 (bebidas), que solo agregan su ruta y su esquema.

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /platos` (multipart/form-data) | 201, `ProductoSalida` | 404, 409, 422 |
| `GET /secciones?estado=HABILITADO` | 200, `Pagina[SeccionRespuesta]` (delta de `carta-secciones`) | 422 |
| `GET /media/<archivo>` | 200, imagen guardada | 404 |

La solicitud `POST /platos` es multipart/form-data con dos partes: `datos` (texto JSON con los campos de la tabla) e `imagen` (archivo, opcional). Campos de `datos`:

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | texto | sí | 1 a 100 caracteres tras `strip()` (S5) |
| `seccion_id` | entero | sí | sección existente y habilitada |
| `precio` | decimal con punto | sí | mayor a 0, hasta 8 enteros y 2 decimales (S4) |
| `ingredientes` | lista de textos | sí | al menos 1, hasta 50, cada uno de 1 a 100 caracteres, sin repetidos (S2, S3) |
| `descripcion` | texto | no | hasta 500 caracteres |
| `etiquetas` | lista de textos | no | hasta 20, cada una de 1 a 30 caracteres, sin repetidas (S2, S3) |

La parte `imagen` es un archivo JPG, PNG o HEIC de hasta 5 MB, validado por su contenido. Un JSON inválido en `datos` o un campo desconocido responden 422 (diseño B2 y B3).
- `categoria` y `estado` NO se reciben: el sistema asigna `PLATO` y `HABILITADO`. Dentro de `datos` son campos desconocidos y responden 422, como cualquier otro campo no previsto; enviados como partes sueltas del formulario, se ignoran.
- `ProductoSalida`: `id`, `nombre`, `categoria`, `precio`, `ingredientes: [str]`, `descripcion` (puede ser `null`), `etiquetas: [str]`, `estado`, `imagen_url` (`/media/<archivo>` o `null`), `seccion: {id, nombre}`.
- Supuesto: `precio` se serializa como cadena decimal con dos decimales (por ejemplo `"12500.00"`).
- Datos: usa la tabla `productos` existente. Se agrega `nombre_normalizado` (`casefold()` del nombre recortado, no se expone) con un índice único sobre (`categoria`, `nombre_normalizado`): el nombre es único dentro de cada categoría, así que un postre puede llamarse igual que un plato (diseño B1). Se agrega mediante una revisión de Alembic posterior a `a1c3e5f7b9d1`. `productos.imagen` guarda el nombre de archivo.
- Orden de validación: 422 de forma (campos, largos, precio, listas), 422 de imagen, 404 de sección, 409 de sección deshabilitada, 409 de nombre repetido. La imagen se procesa antes de consultar la base (diseño B6). Nada se guarda si algo falla (S7).

## Requisitos

### Requisito: Crear plato (CA 1)

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

### Requisito: Campos obligatorios (CA 2)

Faltar `nombre`, `seccion_id`, `precio` o `ingredientes`, o un nombre vacío tras `strip()`, DEBE responder 422 sin guardar e indicar el campo faltante. El formulario DEBE mostrar bajo cada campo obligatorio vacío qué falta y NO DEBE enviar la solicitud.

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

### Requisito: Nombre único entre platos (CA 3)

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

### Requisito: Largo del nombre (CA 4)

El nombre DEBE tener como máximo 100 caracteres tras `strip()`; más responde 422. PUEDE contener números.

#### Escenario: Nombre de 101 caracteres

- DADO un nombre de 101 caracteres
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 y el formulario advierte que el nombre supera el largo permitido

#### Escenario: Nombre de 100 caracteres con números

- DADO un nombre de exactamente 100 caracteres que incluye dígitos
- CUANDO se hace `POST /platos`
- ENTONCES responde 201

### Requisito: Precio válido (CA 5)

El precio DEBE ser un decimal mayor a 0, con hasta 8 dígitos enteros y 2 decimales (S4). Cero, negativos, texto, más de 2 decimales o más de 8 enteros DEBEN responder 422. El formulario DEBE aceptar la coma como separador decimal (por ejemplo `12.500,50`) y convertirlo a punto antes de enviar, y DEBE mostrar que el precio es inválido cuando no cumple.

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

### Requisito: Ingredientes obligatorios y sin repetidos (CA 6)

El plato DEBE tener al menos un ingrediente; la lista vacía responde 422. Cada ingrediente DEBE tener de 1 a 100 caracteres tras `strip()` y no repetirse (`casefold()`, S2); un repetido o vacío responde 422. En el formulario, los ingredientes se cargan como chips: «Enter» agrega el texto escrito; un texto vacío o repetido NO DEBE agregarse y DEBE mostrar un mensaje; cada chip DEBE poder quitarse.

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

### Requisito: Descripción opcional (CA 7)

La descripción es opcional y DEBE tener como máximo 500 caracteres tras `strip()` (lo fija el issue #2); más responde 422. Una descripción vacía se guarda como `null`. El formulario DEBE mostrar el contador de caracteres.

#### Escenario: Sin descripción

- DADO una solicitud sin `descripcion`
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con `descripcion` `null`

#### Escenario: Descripción demasiado larga

- DADO una descripción de 501 caracteres
- CUANDO se hace `POST /platos`
- ENTONCES responde 422 e indica `descripcion`

### Requisito: Sin secciones habilitadas (CA 8)

Si no existe ninguna sección habilitada, el formulario DEBE mostrar el aviso «Primero hay que crear una sección» con un enlace a la pestaña «Secciones» y DEBE deshabilitar «Guardar plato».

#### Escenario: No hay secciones habilitadas

- DADO que `GET /secciones?estado=HABILITADO` devuelve `items` vacío
- CUANDO se abre `/productos/nuevo`
- ENTONCES se muestra el aviso con el enlace a «Secciones» y «Guardar plato» está deshabilitado

#### Escenario: Solo hay secciones deshabilitadas

- DADO que todas las secciones están deshabilitadas
- CUANDO se abre `/productos/nuevo`
- ENTONCES se muestra el mismo aviso

### Requisito: Sección habilitada y existente (CA 9)

La sección DEBE existir (404 si no) y estar habilitada (409 si no). El selector de sección DEBE listar solo las secciones habilitadas, ordenadas por `orden`, obtenidas con `GET /secciones?estado=HABILITADO`.

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

### Requisito: Imagen válida por contenido (CA 10)

La imagen es opcional. El sistema DEBE validar por contenido (no por extensión ni `Content-Type`) que sea JPG, PNG o HEIC y que pese como máximo 5 MB (5 242 880 bytes). Otro formato, un archivo corrupto o un tamaño mayor DEBE responder 422 con un mensaje que nombre los formatos y el tamaño permitidos, y cancelar el alta completa, sin crear el plato ni dejar archivo (S7). El formulario DEBE rechazar antes de enviar un archivo de más de 5 MB y mostrar el mismo mensaje.

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

### Requisito: Elegir imagen de archivo o cámara (CA 11)

El selector de imagen DEBE ofrecer dos opciones: «Elegir archivo» (galería o archivos) y «Sacar foto» (cámara del dispositivo, `capture="environment"`). DEBE mostrar una vista previa y permitir quitar la imagen elegida antes de guardar. En HEIC la vista previa PUEDE no estar disponible (S11); en ese caso DEBE mostrar el nombre y el tamaño.

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

### Requisito: HEIC se guarda como JPEG (CA 12)

Una imagen HEIC válida DEBE guardarse y servirse como JPEG, con la orientación aplicada, de modo que `imagen_url` abra en cualquier navegador. JPG y PNG DEBEN reguardarse sin metadatos (S6). El nombre del archivo lo decide el servidor (`uuid4().hex` más extensión) y el nombre original NO DEBE usarse. La vista de la carta pertenece a otra HU (S12).

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

### Requisito: Etiquetas opcionales y sin repetidas (CA 13)

Las etiquetas son opcionales; cada una DEBE tener de 1 a 30 caracteres tras `strip()` y no repetirse (`casefold()`, S2); un repetido, vacío o más largo responde 422. En el formulario se cargan como chips con las mismas reglas que los ingredientes: un texto vacío, repetido o de más de 30 caracteres NO DEBE agregarse y DEBE mostrar un mensaje.

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

### Requisito: Alta sin datos opcionales (CA 14)

El plato DEBE registrarse aunque no se carguen descripción, imagen ni etiquetas.

#### Escenario: Sin descripción, imagen ni etiquetas

- DADO un nombre libre, un precio válido, un ingrediente y una sección habilitada, sin descripción, imagen ni etiquetas
- CUANDO se hace `POST /platos`
- ENTONCES responde 201 con `descripcion` `null`, `imagen_url` `null` y `etiquetas` vacío

#### Escenario: Guardar desde el formulario sin datos opcionales

- DADO el formulario «Nuevo plato» con solo los datos obligatorios completos
- CUANDO la persona guarda
- ENTONCES el plato se registra y se muestra el aviso de alta exitosa

### Requisito: Estado asignado por el sistema

El plato DEBE crearse siempre `HABILITADO`; el cliente no elige el estado (S10). El formulario DEBE mostrar el estado como texto fijo «Habilitado», sin interruptor.

#### Escenario: El estado no lo elige el cliente

- DADO una solicitud con `estado=DESHABILITADO` como parte suelta del formulario
- CUANDO se hace `POST /platos`
- ENTONCES el plato se crea `HABILITADO`

#### Escenario: Estado fijo en el formulario

- DADO el formulario «Nuevo plato»
- CUANDO se observa el campo «Estado»
- ENTONCES muestra el texto «Habilitado» y ningún control para cambiarlo

### Requisito: Atomicidad del alta

Si falla cualquier validación, la escritura del archivo o el `commit`, NO DEBE quedar plato en la base. Si el `commit` falla después de escribir la imagen, el archivo DEBE borrarse (S7).

#### Escenario: Falla el commit

- DADO una imagen válida y un fallo simulado al confirmar la transacción
- CUANDO se hace `POST /platos`
- ENTONCES no queda plato en la base ni archivo en `MEDIA_DIR`

## Supuestos nuevos

- Supuesto: S1 a S12 de la propuesta rigen sin cambios.
- Supuesto: `precio` se serializa como cadena decimal con dos decimales.
- Supuesto: 5 MB equivalen a 5 242 880 bytes; el servidor también limita los píxeles para evitar imágenes decompresoras.
- Supuesto: un `estado` o `categoria` enviado como parte suelta del formulario se ignora; dentro de `datos` responde 422 por campo desconocido.
- Supuesto: el orden de validación es 422 de forma, 422 de imagen, 404 de sección, 409 de sección deshabilitada, 409 de nombre.
- Supuesto: una parte `imagen` vacía (sin archivo) equivale a no enviar imagen.
- Supuesto: tras el alta exitosa, la pantalla vuelve a la pestaña «Productos» con un aviso.
- Supuesto: los textos de las listas se recortan y se guardan con su capitalización original; la comparación de repetidos usa `casefold()`.
