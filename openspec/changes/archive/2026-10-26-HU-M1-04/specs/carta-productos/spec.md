# Especificación de carta-productos (HU-M1-04)

## Propósito

Alta de postres de la carta. Delta sobre `carta-productos` de HU-M1-01 (aún sin archivar; HU-M1-01 se archiva antes que HU-M1-04). Los datos, las reglas de campos, las reglas de imagen y el orden de validación son los de `POST /platos`; esta spec solo agrega lo que cambia para postres y prueba cada criterio de aceptación sobre ellos. Entidades del diagrama de clases: `Producto`, `Seccion`, `Estado`, `Categoria`.

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /postres` (multipart/form-data) | 201, `ProductoSalida` | 404, 409, 422 |

- La solicitud tiene las mismas partes (`datos` JSON e `imagen` opcional), los mismos campos y las mismas reglas que `POST /platos`. Diferencias: `ingredientes` es obligatorio (al menos 1) y el sistema asigna `categoria` `POSTRE` y `estado` `HABILITADO`.
- `categoria` y `estado` dentro de `datos` responden 422 (campo desconocido); como partes sueltas del formulario se ignoran.
- Respuesta: `ProductoSalida`, igual que en platos, con `categoria` `POSTRE`.
- Orden de validación: 422 de forma, 422 de imagen, 404 de sección, 409 de sección deshabilitada, 409 de nombre repetido. Nada se guarda si algo falla.
- Datos: sin cambios de esquema. El índice único (`categoria`, `nombre_normalizado`) ya hace que el nombre sea único por categoría.
- Frontend: rutas por categoría `/productos/platos/nuevo` y `/productos/postres/nuevo`; `/productos/nuevo` sigue funcionando o redirige a la de platos. Una sola página, `hook` y validador parametrizados por una configuración de categoría (título, migas, endpoint, mensaje de nombre repetido, ingredientes obligatorios). Los nombres técnicos los fija el diseño.

## Requisitos

### Requisito: Crear postre (CA 1)

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

### Requisito: Campos obligatorios (CA 2)

Faltar `nombre`, `seccion_id`, `precio` o `ingredientes`, o un nombre vacío tras `strip()`, DEBE responder 422 sin guardar e indicar el campo faltante. El formulario DEBE mostrar bajo cada campo obligatorio vacío qué falta y NO DEBE enviar la solicitud.

#### Escenario: Faltan campos obligatorios

- DADO una solicitud sin `nombre`, o con `nombre` igual a `"   "`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422, indica `nombre` y no se crea nada

#### Escenario: Faltan sección y precio

- DADO una solicitud sin `seccion_id` ni `precio`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica ambos campos

#### Escenario: Formulario de postre con campos vacíos

- DADO el formulario «Nuevo postre» con nombre, sección, precio e ingredientes vacíos
- CUANDO la persona pulsa «Guardar postre»
- ENTONCES no se envía la solicitud y cada campo muestra un mensaje de obligatorio

### Requisito: Nombre único entre postres (CA 3)

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

### Requisito: Largo del nombre (CA 4)

El nombre DEBE tener como máximo 100 caracteres tras `strip()`; más responde 422. PUEDE contener números.

#### Escenario: Nombre de 101 caracteres

- DADO un nombre de 101 caracteres
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 y el formulario advierte que el nombre supera el largo permitido

#### Escenario: Nombre de 100 caracteres con números

- DADO un nombre de exactamente 100 caracteres que incluye dígitos
- CUANDO se hace `POST /postres`
- ENTONCES responde 201

### Requisito: Precio válido (CA 5)

El precio DEBE ser un decimal mayor a 0, con hasta 8 dígitos enteros y 2 decimales. Cero, negativos, texto, más de 2 decimales o más de 8 enteros DEBEN responder 422. El formulario DEBE aceptar la coma como separador decimal (por ejemplo `12.500,50`), convertirlo a punto antes de enviar y mostrar que el precio es inválido cuando no cumple.

#### Escenario: Precio con dos decimales

- DADO `precio` igual a `1500.50`
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con el precio `"1500.50"`

#### Escenario: Precio inválido

- DADO `precio` igual a `0`, `-5`, `mil` o `1500.555`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `precio`

#### Escenario: Precio con coma en el formulario de postre

- DADO el precio `12.500,50` escrito en el formulario «Nuevo postre»
- CUANDO la persona guarda
- ENTONCES se envía `precio` igual a `12500.50`, y con `abc` no se envía la solicitud y el campo muestra que el precio es inválido

### Requisito: Ingredientes obligatorios y sin repetidos (CA 6)

El postre DEBE tener al menos un ingrediente; la lista vacía responde 422. Cada ingrediente DEBE tener de 1 a 100 caracteres tras `strip()` y no repetirse (`casefold()`); un repetido o vacío responde 422. En el formulario, los ingredientes se cargan como chips con las mismas reglas que en platos y son obligatorios para esta categoría.

#### Escenario: Sin ingredientes

- DADO una solicitud sin ingredientes
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `ingredientes`

#### Escenario: Ingredientes repetidos

- DADO `ingredientes` igual a «Huevo» y « huevo »
- CUANDO se hace `POST /postres`
- ENTONCES responde 422

#### Escenario: Chips de ingredientes en el formulario de postre

- DADO el formulario «Nuevo postre» con el chip «Huevo» agregado
- CUANDO la persona escribe «huevo» o solo espacios y pulsa Enter
- ENTONCES no se agrega ningún chip y se muestra un mensaje bajo el campo
- Y al quitar el chip «Huevo» no queda ninguno y guardar se rechaza por ingredientes obligatorios

### Requisito: Descripción opcional (CA 7)

La descripción es opcional y DEBE tener como máximo 500 caracteres tras `strip()`; más responde 422. Una descripción vacía se guarda como `null`. El formulario DEBE mostrar el contador de caracteres.

#### Escenario: Sin descripción

- DADO una solicitud sin `descripcion`
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con `descripcion` `null`

#### Escenario: Descripción demasiado larga

- DADO una descripción de 501 caracteres
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `descripcion`

### Requisito: Sin secciones habilitadas (CA 8)

Si no existe ninguna sección habilitada, el formulario de postre DEBE mostrar el aviso «Primero hay que crear una sección» con un enlace a la pestaña «Secciones» y DEBE deshabilitar «Guardar postre».

#### Escenario: No hay secciones habilitadas

- DADO que `GET /secciones?estado=HABILITADO` devuelve `items` vacío
- CUANDO se abre `/productos/postres/nuevo`
- ENTONCES se muestra el aviso con el enlace a «Secciones» y «Guardar postre» está deshabilitado

### Requisito: Sección habilitada y existente (CA 9)

La sección DEBE existir (404 si no) y estar habilitada (409 si no). El selector DEBE listar solo las secciones habilitadas, ordenadas por `orden`.

#### Escenario: Sección inexistente

- DADO un `seccion_id` que no existe
- CUANDO se hace `POST /postres`
- ENTONCES responde 404 y no se crea el postre

#### Escenario: Sección deshabilitada

- DADO una sección deshabilitada
- CUANDO se hace `POST /postres` con su id
- ENTONCES responde 409 y no se crea el postre

#### Escenario: Selector solo con habilitadas

- DADO secciones habilitadas y deshabilitadas
- CUANDO se abre el formulario «Nuevo postre»
- ENTONCES el selector muestra solo las habilitadas

### Requisito: Imagen válida por contenido (CA 10)

La imagen es opcional y se valida por contenido con las mismas reglas que en platos: JPG, PNG o HEIC de hasta 5 MB. Otro formato, un archivo corrupto o un tamaño mayor DEBE responder 422 con un mensaje que nombre los formatos y el tamaño permitidos, y cancelar el alta completa, sin crear el postre ni dejar archivo. El formulario DEBE rechazar antes de enviar un archivo de más de 5 MB.

#### Escenario: Formato no permitido o extensión falsa

- DADO un PDF, o un archivo de texto llamado `postre.jpg`, enviado como `imagen`
- CUANDO se hace `POST /postres`
- ENTONCES responde 422, no se crea el postre y no queda archivo en `MEDIA_DIR`

#### Escenario: Imagen de más de 5 MB

- DADO una imagen válida de 5 MB más 1 byte
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 y no se crea el postre

#### Escenario: Imagen de tamaño permitido

- DADO una imagen PNG válida de 2 MB
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 y `GET` de su `imagen_url` devuelve 200

#### Escenario: Rechazo en el formulario de postre

- DADO un archivo de 6 MB elegido en el selector de «Nuevo postre»
- CUANDO la persona lo elige
- ENTONCES no se acepta, se muestra el mensaje de tamaño y no se envía nada

### Requisito: Elegir imagen de archivo o cámara (CA 11)

El selector de imagen del formulario de postre DEBE ofrecer «Elegir archivo» y «Sacar foto» (`capture="environment"`), mostrar una vista previa y permitir quitar la imagen antes de guardar. En HEIC sin vista previa DEBE mostrar el nombre y el tamaño.

#### Escenario: Selector de imagen en postres

- DADO el formulario «Nuevo postre» abierto
- CUANDO se observa el selector de imagen
- ENTONCES existen los botones «Elegir archivo» y «Sacar foto», este último con captura de cámara

#### Escenario: Vista previa y quitar

- DADO una imagen JPG elegida en el formulario de postre
- CUANDO se muestra el selector y la persona la quita
- ENTONCES se ve la vista previa antes de quitarla y el alta se envía sin `imagen`

#### Escenario: HEIC sin vista previa

- DADO un archivo HEIC elegido en un navegador que no lo muestra
- CUANDO se muestra el selector
- ENTONCES se ven el nombre y el tamaño del archivo en lugar de la vista previa

### Requisito: HEIC se guarda como JPEG (CA 12)

Una imagen HEIC válida DEBE guardarse y servirse como JPEG, con la orientación aplicada. JPG y PNG DEBEN reguardarse sin metadatos. El nombre del archivo lo decide el servidor (`uuid4().hex` más extensión).

#### Escenario: Alta de postre con HEIC

- DADO una imagen HEIC válida de menos de 5 MB
- CUANDO se hace `POST /postres`
- ENTONCES responde 201, `imagen_url` termina en `.jpg` y el archivo servido es un JPEG válido

#### Escenario: Nombre elegido por el servidor

- DADO una imagen llamada `../../mi foto.png`
- CUANDO se hace `POST /postres`
- ENTONCES `imagen_url` es `/media/<32 hexadecimales>.png` sin rastro del nombre original

### Requisito: Etiquetas opcionales y sin repetidas (CA 13)

Las etiquetas son opcionales; cada una DEBE tener de 1 a 30 caracteres tras `strip()` y no repetirse (`casefold()`); un repetido, vacío o más largo responde 422. En el formulario se cargan como chips con las mismas reglas que los ingredientes, y también rechazan un texto de más de 30 caracteres.

#### Escenario: Etiquetas válidas

- DADO las etiquetas «Sin TACC» y «Vegano»
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con ambas en `etiquetas`

#### Escenario: Etiqueta repetida

- DADO las etiquetas «casero» y «Casero»
- CUANDO se hace `POST /postres`
- ENTONCES responde 422

#### Escenario: Etiqueta de 31 caracteres

- DADO una etiqueta de 31 caracteres
- CUANDO se hace `POST /postres`
- ENTONCES responde 422 e indica `etiquetas`

#### Escenario: Chip de etiqueta repetido en el formulario

- DADO el chip «Vegano» ya agregado en «Nuevo postre»
- CUANDO la persona escribe «vegano» y pulsa Enter
- ENTONCES no se agrega y se muestra un mensaje bajo el campo

### Requisito: Alta sin datos opcionales (CA 14)

El postre DEBE registrarse aunque no se carguen descripción, imagen ni etiquetas.

#### Escenario: Sin descripción, imagen ni etiquetas

- DADO un nombre libre, un precio válido, un ingrediente y una sección habilitada, sin descripción, imagen ni etiquetas
- CUANDO se hace `POST /postres`
- ENTONCES responde 201 con `descripcion` `null`, `imagen_url` `null` y `etiquetas` vacío

#### Escenario: Guardar desde el formulario sin datos opcionales

- DADO el formulario «Nuevo postre» con solo los datos obligatorios completos
- CUANDO la persona guarda
- ENTONCES el postre se registra y se muestra el aviso de alta exitosa

### Requisito: Estado asignado por el sistema

El postre DEBE crearse siempre `HABILITADO`; el cliente no elige el estado. El formulario DEBE mostrar el estado como texto fijo «Habilitado», sin interruptor.

#### Escenario: El estado no lo elige el cliente

- DADO una solicitud con `estado=DESHABILITADO` como parte suelta del formulario
- CUANDO se hace `POST /postres`
- ENTONCES el postre se crea `HABILITADO`

#### Escenario: Estado fijo en el formulario

- DADO el formulario «Nuevo postre»
- CUANDO se observa el campo «Estado»
- ENTONCES muestra el texto «Habilitado» y ningún control para cambiarlo

### Requisito: Atomicidad del alta

Si falla cualquier validación, la escritura del archivo o el `commit`, NO DEBE quedar postre en la base. Si el `commit` falla después de escribir la imagen, el archivo DEBE borrarse.

#### Escenario: Falla el commit

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

## Supuestos nuevos

- Supuesto: S1 a S12 de HU-M1-01 rigen sin cambios para postres.
- Supuesto: S13. El mensaje de nombre repetido es «El postre ya está registrado», análogo al de platos.
- Supuesto: S14. Un plato y un postre pueden llamarse igual; la unicidad es por categoría.
- Supuesto: las rutas del frontend son `/productos/platos/nuevo` y `/productos/postres/nuevo`; `/productos/nuevo` sigue funcionando o redirige. Los nombres técnicos los fija el diseño.
