# Especificación de carta-vista

## Propósito

Consulta de solo lectura de la carta: las secciones en su orden, cada una con sus productos (nombre, precio, descripción, imagen y etiquetas), con un filtro de estado, y la pantalla que la muestra al mozo para presentarla al cliente. Entidades del diagrama de clases: `Seccion`, `Producto`, `Estado`, `Categoria`.

Origen: HU-M1-14 (archivado 2026-10-26). Capacidad nueva; no modifica `carta-productos` ni `carta-secciones`.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /carta?estado&limit&offset` | 200, `Pagina[SeccionCarta]`, secciones por `orden`, `nombre` e `id` | 422 |

Parámetros:

- `estado`: `HABILITADO` (por defecto), `DESHABILITADO` o `TODOS`. Otro valor responde 422.
- `limit` (por defecto 50, máximo 100) y `offset` (por defecto 0) según D-27. Valores inválidos responden 422.

Esquemas:

- `SeccionCarta`: `id`, `nombre`, `orden`, `estado`, `productos: list[ProductoCarta]`.
- `ProductoCarta`: `id`, `nombre`, `categoria`, `precio`, `descripcion`, `etiquetas`, `imagen_url`, `estado`.
- `Pagina[T]`: `items`, `total`, `limit`, `offset` (D-27). `total` cuenta las secciones que cumplen el filtro.

Datos: sin cambios de esquema ni migraciones. La ruta es de solo lectura y reutiliza las tablas `secciones` y `productos`.

## Requisitos

### Requisito: Carta por secciones con sus productos (HU-M1-14 CA 1)

`GET /carta` DEBE devolver las secciones habilitadas que tengan productos habilitados, ordenadas por `orden`, y en cada una sus productos habilitados con `nombre`, `precio`, `descripcion`, `imagen_url` y `etiquetas`. Los productos DEBEN ordenarse por `nombre` e `id`. Cada sección DEBE mostrar todos sus productos, sin filtrar por categoría. El frontend DEBE mostrar cada sección con su nombre y, debajo, una tarjeta por producto con imagen, nombre, precio, descripción y etiquetas.

#### Escenario: Secciones en orden con sus productos

- DADO las secciones habilitadas «Postres» (orden 2) y «Entradas» (orden 1), cada una con productos habilitados
- CUANDO se hace `GET /carta`
- ENTONCES `items` trae primero «Entradas» y luego «Postres»
- Y cada sección trae sus productos con `nombre`, `precio`, `descripcion`, `imagen_url` y `etiquetas`, ordenados por `nombre`

#### Escenario: Productos de todas las categorías en una sección

- DADO una sección habilitada con un plato, un postre y una bebida habilitados
- CUANDO se hace `GET /carta`
- ENTONCES la sección trae los tres productos, cada uno con su `categoria`

#### Escenario: Producto con imagen

- DADO un producto habilitado con imagen cargada
- CUANDO se hace `GET /carta`
- ENTONCES su `imagen_url` es la URL de la imagen
- Y la tarjeta del frontend muestra la imagen

#### Escenario: Producto sin imagen

- DADO un producto habilitado sin imagen
- CUANDO se hace `GET /carta`
- ENTONCES su `imagen_url` es `null`
- Y la tarjeta del frontend muestra un marcador en lugar de la imagen

#### Escenario: Producto sin descripción

- DADO un producto habilitado sin descripción
- CUANDO se muestra su tarjeta
- ENTONCES la tarjeta muestra nombre, precio y etiquetas, y omite la descripción

#### Escenario: Pantalla con la carta

- DADO secciones habilitadas con productos habilitados
- CUANDO se abre `CartaPage`
- ENTONCES se muestra cada sección en su orden con la tarjeta de cada uno de sus productos

### Requisito: Filtro inicial en Habilitados (HU-M1-14 CA 2)

Si `estado` no se envía, `GET /carta` DEBE comportarse como `estado=HABILITADO`. Con Habilitados NO DEBE aparecer ninguna sección ni producto deshabilitado. La pantalla DEBE abrir con el filtro en Habilitados cada vez que se entra, sin recordar la elección anterior.

#### Escenario: Sin parámetro `estado`

- DADO secciones y productos habilitados y deshabilitados
- CUANDO se hace `GET /carta` sin `estado`
- ENTONCES la respuesta es igual a la de `estado=HABILITADO`

#### Escenario: No aparecen bajas con Habilitados

- DADO una sección deshabilitada con un producto habilitado y una sección habilitada con un producto habilitado y otro deshabilitado
- CUANDO se hace `GET /carta?estado=HABILITADO`
- ENTONCES no aparece la sección deshabilitada ni, en la habilitada, el producto deshabilitado

#### Escenario: La pantalla abre en Habilitados

- DADO una persona que eligió «Todos» en una visita anterior
- CUANDO abre `CartaPage` de nuevo
- ENTONCES el filtro está en «Habilitados» y la carta pedida usa `estado=HABILITADO`

### Requisito: Ocultar secciones sin productos habilitados (HU-M1-14 CA 3)

Con Habilitados, una sección habilitada sin ningún producto habilitado NO DEBE aparecer, ni contar en `total`.

#### Escenario: Sección habilitada sin productos habilitados

- DADO una sección habilitada cuyos productos están todos deshabilitados y otra habilitada con un producto habilitado
- CUANDO se hace `GET /carta?estado=HABILITADO`
- ENTONCES `items` trae solo la segunda sección y `total` es 1

#### Escenario: Sección habilitada sin productos

- DADO una sección habilitada sin productos
- CUANDO se hace `GET /carta?estado=HABILITADO`
- ENTONCES no figura en `items`

### Requisito: Filtro Deshabilitados (HU-M1-14 CA 4)

Con `estado=DESHABILITADO`, `GET /carta` DEBE devolver solo productos deshabilitados. DEBE incluir todas las secciones deshabilitadas, con sus productos deshabilitados (posiblemente ninguno), y las secciones habilitadas que tengan algún producto deshabilitado, como agrupador de esos productos. NO DEBE devolver productos habilitados, tampoco los de una sección deshabilitada. La pantalla DEBE mostrar, en una sección deshabilitada sin productos dados de baja, el aviso «Sin productos dados de baja».

#### Escenario: Solo productos dados de baja

- DADO una sección habilitada con un producto habilitado y otro deshabilitado
- CUANDO se hace `GET /carta?estado=DESHABILITADO`
- ENTONCES la sección figura con solo el producto deshabilitado

#### Escenario: Sección habilitada sin bajas

- DADO una sección habilitada cuyos productos están todos habilitados
- CUANDO se hace `GET /carta?estado=DESHABILITADO`
- ENTONCES no figura en `items`

#### Escenario: Sección deshabilitada con productos habilitados

- DADO una sección deshabilitada con un producto habilitado y otro deshabilitado
- CUANDO se hace `GET /carta?estado=DESHABILITADO`
- ENTONCES la sección figura con `estado` `DESHABILITADO` y solo el producto deshabilitado

#### Escenario: Sección deshabilitada sin productos dados de baja

- DADO una sección deshabilitada cuyos productos están todos habilitados, o sin productos
- CUANDO se hace `GET /carta?estado=DESHABILITADO`
- ENTONCES la sección figura con `productos` vacío
- Y la pantalla muestra bajo ella «Sin productos dados de baja»

### Requisito: Filtro Todos (HU-M1-14 CA 5)

Con `estado=TODOS`, `GET /carta` DEBE devolver todas las secciones, también las vacías, con todos sus productos, y cada sección y cada producto DEBE traer su `estado`. La pantalla DEBE indicar el estado de cada sección y de cada producto en Deshabilitados y en Todos.

#### Escenario: Todas las secciones y productos

- DADO una sección habilitada con un producto habilitado y otro deshabilitado, una sección deshabilitada con un producto habilitado y una sección habilitada sin productos
- CUANDO se hace `GET /carta?estado=TODOS`
- ENTONCES `items` trae las tres secciones con todos sus productos y `total` es 3
- Y cada sección y cada producto trae su `estado`

#### Escenario: La pantalla indica el estado

- DADO el filtro «Todos» con secciones y productos habilitados y deshabilitados
- CUANDO se muestra la carta
- ENTONCES cada sección y cada producto muestra una indicación visible de su estado

#### Escenario: Habilitados no muestra indicación de estado

- DADO el filtro «Habilitados»
- CUANDO se muestra la carta
- ENTONCES las secciones y los productos no muestran indicación de estado

### Requisito: Orden estable de las secciones (HU-M1-14, S85)

Las secciones DEBEN ordenarse por `orden`, luego `nombre` y luego `id`, de modo que una sección deshabilitada que repite el orden de otra tenga posición determinada.

#### Escenario: Empate de orden

- DADO una sección habilitada «Postres» y una deshabilitada «Dulces», ambas con `orden` 2, y el filtro `TODOS`
- CUANDO se hace `GET /carta?estado=TODOS`
- ENTONCES «Dulces» figura antes que «Postres» por `nombre`

#### Escenario: Empate de orden y nombre

- DADO dos secciones con el mismo `orden` y el mismo `nombre`
- CUANDO se hace `GET /carta?estado=TODOS` varias veces
- ENTONCES el orden es siempre el de `id` ascendente

### Requisito: Paginación por sección (HU-M1-14, S80)

`GET /carta` DEBE paginar por sección: `limit` y `offset` se aplican a las secciones que cumplen el filtro y los productos van anidados sin paginar. `total` DEBE contar las secciones que cumplen el filtro. El frontend DEBE pedir páginas de 100 hasta reunir `total` secciones.

#### Escenario: Página de secciones

- DADO 3 secciones habilitadas con productos y `limit=2&offset=0`
- CUANDO se hace `GET /carta`
- ENTONCES `items` trae 2 secciones por `orden`, cada una con todos sus productos, `total` es 3, `limit` 2 y `offset` 0

#### Escenario: Segunda página

- DADO las mismas 3 secciones y `limit=2&offset=2`
- CUANDO se hace `GET /carta`
- ENTONCES `items` trae la tercera sección y `total` sigue siendo 3

#### Escenario: `total` cuenta solo las que pasan el filtro

- DADO 2 secciones habilitadas con productos habilitados y 1 habilitada sin productos habilitados
- CUANDO se hace `GET /carta?estado=HABILITADO`
- ENTONCES `total` es 2

#### Escenario: Paginación inválida

- DADO `limit=101`, `limit=0` u `offset=-1`
- CUANDO se hace `GET /carta`
- ENTONCES responde 422

#### Escenario: El frontend completa todas las páginas

- DADO más de 100 secciones que cumplen el filtro
- CUANDO se abre la carta
- ENTONCES el frontend pide páginas de 100 con `offset` creciente hasta reunir `total` secciones y las muestra todas

### Requisito: Estado inválido (HU-M1-14, S79)

Un valor de `estado` fuera de `HABILITADO`, `DESHABILITADO` y `TODOS` DEBE responder 422 con `{"detalle": ...}`, sin devolver datos.

#### Escenario: Valor desconocido

- DADO `estado=ABIERTO`
- CUANDO se hace `GET /carta`
- ENTONCES responde 422

#### Escenario: Capitalización distinta

- DADO `estado=habilitado`
- CUANDO se hace `GET /carta`
- ENTONCES responde 422

### Requisito: Carta de solo lectura sin efectos (HU-M1-14, S79)

`GET /carta` NO DEBE modificar secciones ni productos, y NO DEBE alterar las respuestas de `GET /productos` ni de `GET /secciones`.

#### Escenario: Consulta sin cambios

- DADO secciones y productos en cualquier estado
- CUANDO se hace `GET /carta` con cualquier filtro
- ENTONCES los datos no cambian y `GET /productos` y `GET /secciones` responden como antes

### Requisito: Entrada «Ver carta» y ruta (HU-M1-14, S87)

El encabezado de Productos y Carta DEBE ofrecer el botón «Ver carta», que lleva a `/productos/carta`, donde se muestra `CartaPage` dentro del diseño de la aplicación.

#### Escenario: Botón en el encabezado

- DADO la pantalla de Productos y Carta
- CUANDO se muestra el encabezado
- ENTONCES figura el botón «Ver carta»

#### Escenario: Navegar a la carta

- DADO la pantalla de Productos y Carta
- CUANDO la persona pulsa «Ver carta»
- ENTONCES navega a `/productos/carta` y se muestra la carta con el filtro en Habilitados

### Requisito: Filtro de estado en la pantalla (HU-M1-14 CA 2, 4 y 5)

`CartaPage` DEBE ofrecer el filtro con las opciones Habilitados, Deshabilitados y Todos, tomadas de `filtrosEstado.ts`. Al cambiar de opción DEBE volver a pedir la carta con el `estado` correspondiente.

#### Escenario: Cambiar a Deshabilitados

- DADO la carta abierta en Habilitados
- CUANDO la persona elige «Deshabilitados»
- ENTONCES se pide `GET /carta?estado=DESHABILITADO` y se muestran solo los productos dados de baja

#### Escenario: Cambiar a Todos

- DADO la carta abierta en Habilitados
- CUANDO la persona elige «Todos»
- ENTONCES se pide `GET /carta?estado=TODOS` y se muestran todas las secciones y productos con su estado

### Requisito: Navegación por secciones (HU-M1-14, S87)

La pantalla DEBE mostrar una píldora por cada sección visible, en el orden de la carta, que al pulsarla desplaza la vista hasta esa sección. NO DEBE mostrar píldoras de secciones ocultas por el filtro.

#### Escenario: Pulsar una píldora

- DADO la carta con las secciones «Entradas» y «Postres»
- CUANDO la persona pulsa la píldora «Postres»
- ENTONCES la vista se desplaza hasta la sección «Postres»

#### Escenario: Píldoras según el filtro

- DADO una sección habilitada sin productos habilitados
- CUANDO el filtro es Habilitados
- ENTONCES no hay píldora para esa sección

### Requisito: Estados vacíos y error (HU-M1-14, S88)

La pantalla DEBE mostrar un mensaje según el filtro cuando no hay secciones que mostrar: «No hay productos habilitados en la carta.» en Habilitados, «No hay secciones ni productos dados de baja.» en Deshabilitados y «No hay secciones cargadas.» en Todos. Si la consulta falla, DEBE mostrar «No se pudo cargar la carta.».

#### Escenario: Sin productos habilitados

- DADO ninguna sección con productos habilitados
- CUANDO se abre la carta en Habilitados
- ENTONCES se muestra «No hay productos habilitados en la carta.»

#### Escenario: Sin bajas

- DADO ninguna sección deshabilitada ni producto deshabilitado
- CUANDO se elige «Deshabilitados»
- ENTONCES se muestra «No hay secciones ni productos dados de baja.»

#### Escenario: Sin secciones

- DADO ninguna sección cargada
- CUANDO se elige «Todos»
- ENTONCES se muestra «No hay secciones cargadas.»

#### Escenario: Error de carga

- DADO que la consulta a la API falla
- CUANDO se abre la carta
- ENTONCES se muestra «No se pudo cargar la carta.»

## Supuestos

- Supuesto: S79 a S89 de la propuesta de HU-M1-14 rigen sin cambios (contrato, paginación, esquemas, reglas de filtro, orden, categorías, pantalla, mensajes y acceso sin roles).
- Supuesto: S90. `imagen_url` es `null` cuando el producto no tiene imagen y la URL tal como está guardada cuando la tiene; `GET /carta` no valida ni resuelve la URL.
- Supuesto: S91. Con Habilitados, una sección deshabilitada no aparece aunque tenga productos habilitados; con Deshabilitados, una sección habilitada aparece solo si tiene algún producto deshabilitado (consecuencia de S82 y S83).
- Supuesto: S92. `estado` distingue mayúsculas y minúsculas, como en `GET /productos` y `GET /secciones`; `habilitado` responde 422.
- Supuesto: S93. La indicación de estado en la pantalla es una etiqueta visible («Habilitado» o «Deshabilitado») en cada sección y cada producto, solo en Deshabilitados y Todos.
- Supuesto: S94. Las píldoras de navegación listan las secciones cargadas en pantalla, en el orden de la carta, y se ocultan si no hay secciones.
- Supuesto: S95. Los textos exactos de los estados vacíos y del error son los de S88; el aviso de una sección deshabilitada sin productos dados de baja es «Sin productos dados de baja» (S83).
