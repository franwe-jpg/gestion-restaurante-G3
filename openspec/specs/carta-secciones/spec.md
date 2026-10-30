# Especificación de carta-secciones

## Propósito

Alta, listado, consulta, modificación (incluida la reactivación) y baja de las secciones de la carta, y asignación o traslado de productos a una sección. Entidades del diagrama de clases: `Seccion`, `Producto`, `Estado`, `Categoria`.

Origen: HU-M1-10 (archivado 2026-10-25), HU-M1-01 (listado con filtro) y HU-M1-11-12 (archivados 2026-10-26)

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /secciones` | 201, `SeccionRespuesta` | 404, 409, 422 |
| `GET /secciones/{id}` | 200, `SeccionRespuesta` | 404 |
| `PUT /secciones/{id}` | 200, `SeccionRespuesta` | 404, 409, 422 |
| `POST /secciones/{id}/baja` (sin cuerpo) | 200, `SeccionRespuesta` | 404, 409 |
| `GET /secciones?limit&offset&estado` | 200, `Pagina[SeccionRespuesta]`, orden ascendente por `orden` | 422 |
| `GET /productos?estado&limit&offset` | 200, `Pagina[ProductoListado]`; sin `estado`, solo habilitados (contrato completo en `carta-productos`) | 422 |

Esquemas:

- `SeccionCrear`: `nombre: str`, `orden: int`, `producto_ids: list[int] = []`, `confirmar_traslado: bool = false`.
- `SeccionModificar`: `nombre: str` y `orden: int` obligatorios; `producto_ids: list[int] = []`, `confirmar_traslado: bool = false`, `estado: HABILITADO | DESHABILITADO` opcional (ausente conserva el actual).
- `SeccionRespuesta`: `id`, `nombre`, `orden`, `estado`, `productos: [{id, nombre}]`, `productos_habilitados: int` (HU-M1-11-12, S69).
- `ProductoRespuesta`: `id`, `nombre`, `categoria`, `estado`, `seccion: {id, nombre}`.
- `Pagina[T]`: `items`, `total`, `limit` (por defecto 50, máximo 100), `offset` (D-27).

Datos: `secciones(id, nombre ≤ 50, orden > 0, estado)` y `productos` con todas las columnas del diagrama, `seccion_id` obligatorio (S6). Una sola migración crea ambas tablas.

## Requisitos

### Requisito: Crear sección (CA 1)

El sistema DEBE crear la sección con estado `HABILITADO`, asignado por el sistema, y responder 201 con la sección y sus productos. La sección PUEDE crearse sin productos.

#### Escenario: Alta válida sin productos

- DADO un nombre y un orden válidos y libres
- CUANDO se hace `POST /secciones`
- ENTONCES responde 201 con `estado` `HABILITADO`, el `orden` pedido y `productos` vacío

#### Escenario: El estado no lo elige el cliente

- DADO un cuerpo que incluye `estado: DESHABILITADO`
- CUANDO se hace `POST /secciones`
- ENTONCES la sección se crea `HABILITADO`

### Requisito: Campos obligatorios (CA 2)

Faltar `nombre` o `orden`, o un nombre vacío tras `strip()`, DEBE responder 422 sin guardar, indicando el campo faltante. El formulario DEBE mostrar bajo cada campo qué falta.

#### Escenario: Falta el nombre

- DADO un cuerpo con `orden` y sin `nombre`
- CUANDO se hace `POST /secciones`
- ENTONCES responde 422, indica `nombre` y no se crea nada

#### Escenario: Falta el orden

- DADO un cuerpo con `nombre` y sin `orden`
- CUANDO se hace `POST /secciones`
- ENTONCES responde 422, indica `orden` y no se crea nada

#### Escenario: Formulario con campos vacíos

- DADO el diálogo «Nueva sección» con nombre y orden vacíos
- CUANDO la persona pulsa guardar
- ENTONCES no se envía la solicitud y cada campo muestra un mensaje de obligatorio

### Requisito: Nombre único (CA 3)

El nombre DEBE ser único contra todas las secciones, también las deshabilitadas, sin distinguir mayúsculas (`casefold()`) y tras `strip()` (S1). Si ya existe, responde 409 «la sección ya existe».

#### Escenario: Nombre repetido con otra capitalización

- DADO una sección «Postres»
- CUANDO se crea «  postres »
- ENTONCES responde 409 y el diálogo advierte que la sección ya existe

#### Escenario: Nombre usado por una sección deshabilitada

- DADO una sección «Entradas» deshabilitada
- CUANDO se crea «Entradas»
- ENTONCES responde 409

### Requisito: Largo del nombre (CA 4)

El nombre DEBE tener como máximo 50 caracteres tras `strip()`; más responde 422. Puede contener números.

#### Escenario: Nombre de 51 caracteres

- DADO un nombre de 51 caracteres
- CUANDO se hace `POST /secciones`
- ENTONCES responde 422 y el diálogo advierte que el nombre supera el largo permitido

#### Escenario: Nombre de 50 caracteres con números

- DADO un nombre de exactamente 50 caracteres que incluye dígitos
- CUANDO se hace `POST /secciones`
- ENTONCES responde 201

### Requisito: Orden válido (CA 5)

El orden DEBE ser un entero estricto mayor a cero. Cero, negativos, texto (`"3"`), decimales (`2.0`) y booleanos DEBEN responder 422.

#### Escenario: Orden no entero

- DADO un `orden` igual a `2.5`, `"3"` o `true`
- CUANDO se hace `POST /secciones`
- ENTONCES responde 422 y el diálogo advierte que el orden es inválido

#### Escenario: Orden cero o negativo

- DADO un `orden` igual a `0` o `-1`
- CUANDO se hace `POST /secciones`
- ENTONCES responde 422

### Requisito: Orden no repetido entre habilitadas (CA 6)

Si otra sección habilitada usa el orden, DEBE responder 409 «posición ocupada», sin desplazar a las demás. Un orden usado solo por una sección deshabilitada NO DEBE bloquear el alta.

#### Escenario: Orden ocupado

- DADO una sección habilitada en `orden` 1
- CUANDO se crea otra con `orden` 1
- ENTONCES responde 409, el diálogo advierte que la posición está ocupada y la existente no cambia

#### Escenario: Orden de una sección deshabilitada

- DADO una sección deshabilitada en `orden` 2
- CUANDO se crea otra con `orden` 2
- ENTONCES responde 201

### Requisito: Asignar productos habilitados (CA 7)

La lista `producto_ids` es opcional, sin repetidos (422). Cada id DEBE existir (404) y estar habilitado (409). Como todo producto ya pertenece a una sección, seleccionar un producto es siempre un traslado: DEBE pasar por la confirmación del CA 8. Con la confirmación, la respuesta DEBE listarlos en `productos`.

#### Escenario: Productos habilitados seleccionados y confirmados

- DADO dos productos habilitados de otra sección
- CUANDO se crea la sección con sus ids y `confirmar_traslado: true`
- ENTONCES responde 201 con ambos en `productos` y `GET /productos` los muestra en la nueva sección

#### Escenario: Producto inexistente

- DADO un id de producto que no existe
- CUANDO se hace `POST /secciones`
- ENTONCES responde 404 y no se crea la sección

#### Escenario: Producto deshabilitado

- DADO un producto deshabilitado
- CUANDO se envía su id
- ENTONCES responde 409 y no se crea la sección

#### Escenario: Ids repetidos

- DADO `producto_ids` con el mismo id dos veces
- CUANDO se hace `POST /secciones`
- ENTONCES responde 422

#### Escenario: Selector solo con habilitados

- DADO productos habilitados y deshabilitados
- CUANDO se hace `GET /productos`
- ENTONCES solo devuelve los habilitados, cada uno con su sección actual; sin productos, `items` es `[]` y el selector aparece vacío

### Requisito: Confirmar el traslado (CA 8)

Con `confirmar_traslado: false`, si algún producto seleccionado pertenece a otra sección, DEBE responder 409 con el producto y su sección actual en `detalle`, sin guardar nada. Con `true`, DEBE crear la sección y trasladar los productos en una sola transacción. El selector DEBE mostrar la sección actual de cada producto. Al guardar con productos seleccionados, el frontend DEBE mostrar, antes de enviar, un diálogo de confirmación que nombre cada producto y su sección actual; al aceptar envía el alta con `true`, y al cancelar no envía nada. El 409 protege a cualquier cliente de la API que envíe `false`.

#### Escenario: Traslado sin confirmar

- DADO el producto «Flan» en la sección «Postres»
- CUANDO se crea una sección con su id y `confirmar_traslado: false`
- ENTONCES responde 409 con «Flan» y «Postres» en `detalle`, y ni la sección ni el producto cambian

#### Escenario: Traslado confirmado

- DADO el mismo caso
- CUANDO se envía con `confirmar_traslado: true`
- ENTONCES responde 201 y «Flan» pasa a la nueva sección y deja «Postres»

#### Escenario: Falla a mitad del alta

- DADO una selección con un producto válido y otro deshabilitado, con `true`
- CUANDO se hace `POST /secciones`
- ENTONCES responde 409 y ningún producto cambia de sección

#### Escenario: Cancelar la confirmación

- DADO el diálogo de confirmación abierto
- CUANDO la persona cancela
- ENTONCES no se envía el alta y el formulario conserva sus datos

#### Escenario: Confirmación antes de enviar

- DADO el formulario con «Flan» (sección «Postres») seleccionado
- CUANDO la persona guarda
- ENTONCES aparece el diálogo que nombra «Flan» y «Postres» antes de que se envíe el alta; al aceptar, se envía una sola vez con `confirmar_traslado: true`

### Requisito: Listar secciones

`GET /secciones` DEBE devolver las secciones, paginadas y ordenadas por `orden` ascendente. El parámetro opcional `estado` (`HABILITADO` o `DESHABILITADO`) PUEDE filtrar el listado; sin él, DEBE devolver todas las secciones, igual que antes. El valor de `estado` fuera del enumerado DEBE responder 422. `total` DEBE contar solo las secciones que cumplen el filtro. Cada sección DEBE incluir `productos_habilitados`, la cantidad de sus productos habilitados. La pestaña «Secciones» DEBE mostrar Orden, Nombre, cantidad de productos y Estado, con las acciones «Editar» y «Dar de baja».

Contrato: `GET /secciones?limit&offset&estado` → 200 `Pagina[SeccionRespuesta]`; errores 422.

#### Escenario: Listado paginado

- DADO 3 secciones y `limit=2&offset=0`
- CUANDO se hace `GET /secciones`
- ENTONCES `items` trae 2 por `orden`, `total` es 3, `limit` 2 y `offset` 0

#### Escenario: Límite fuera de rango

- DADO `limit=101`
- CUANDO se hace `GET /secciones`
- ENTONCES responde 422

#### Escenario: Filtro por estado habilitado

- DADO dos secciones habilitadas y una deshabilitada
- CUANDO se hace `GET /secciones?estado=HABILITADO`
- ENTONCES `items` trae solo las dos habilitadas por `orden` y `total` es 2

#### Escenario: Estado inválido

- DADO `estado=ABIERTO`
- CUANDO se hace `GET /secciones`
- ENTONCES responde 422

#### Escenario: Sin filtro no cambia la respuesta

- DADO secciones habilitadas y deshabilitadas
- CUANDO se hace `GET /secciones` sin `estado`
- ENTONCES `items` incluye todas, como antes de esta HU

#### Escenario: Conteo de productos habilitados

- DADO una sección con dos productos habilitados y uno deshabilitado
- CUANDO se hace `GET /secciones`
- ENTONCES su `productos_habilitados` es 2

### Requisito: Consultar una sección

El sistema DEBE devolver la sección con sus productos en `GET /secciones/{id}`; si no existe, 404.

#### Escenario: Sección existente

- DADO una sección con dos productos
- CUANDO se hace `GET /secciones/{id}`
- ENTONCES responde 200 con la sección y sus dos productos

#### Escenario: Sección inexistente

- DADO un id que no existe
- CUANDO se hace `GET /secciones/{id}`, `PUT` o `POST .../baja`
- ENTONCES responde 404 y no cambia nada

### Requisito: Modificar nombre y orden (HU-M1-11 CA 1 y 2)

El sistema DEBE aplicar `PUT /secciones/{id}` con las reglas de nombre y orden de HU-M1-10 (CA 2 a 6), excluyendo la propia sección. El orden solo se valida contra otras secciones habilitadas si la sección queda habilitada. Ante un dato inválido NO DEBE aplicar ningún cambio e indica el dato. Guardar sin cambios DEBE responder 200.

#### Escenario: Cambio válido

- DADO una sección «Postres» con orden 2
- CUANDO se hace `PUT` con «Dulces» y orden 5, libres
- ENTONCES responde 200 y `GET /secciones` muestra «Dulces» en orden 5

#### Escenario: Valor inválido

- DADO nombre de 51 caracteres, `orden` 0 o `orden` `"3"`
- CUANDO se hace `PUT`
- ENTONCES responde 422 indicando el campo y la sección no cambia

#### Escenario: Nombre repetido de otra sección

- DADO las secciones «Postres» y «Entradas»
- CUANDO se modifica «Entradas» a « postres »
- ENTONCES responde 409 «la sección ya existe» y no cambia

#### Escenario: Mismo nombre con otra capitalización

- DADO la sección «Postres»
- CUANDO se modifica a «POSTRES»
- ENTONCES responde 200 y el nombre queda «POSTRES»

#### Escenario: Orden ocupado

- DADO otra sección habilitada en orden 1
- CUANDO se modifica esta a orden 1
- ENTONCES responde 409 «posición ocupada» y ninguna cambia

#### Escenario: Orden de una deshabilitada

- DADO una sección deshabilitada en orden 3
- CUANDO se modifica esta, también deshabilitada, a orden 4 o se mantiene el orden de otra deshabilitada
- ENTONCES responde 200

#### Escenario: Guardar sin cambios

- DADO una sección habilitada
- CUANDO se hace `PUT` con sus mismos valores
- ENTONCES responde 200 y nada cambia

### Requisito: Agregar productos a una sección (HU-M1-11 CA 3, 5 y 6)

`producto_ids` DEBE ser aditivo: agrega productos habilitados a la sección y los que ya pertenecen a ella se ignoran. Cada id DEBE existir (404) y estar habilitado (409). Un producto de otra sección DEBE exigir `confirmar_traslado: true`; sin ella, 409 con el producto y su sección actual, sin guardar nada. El selector DEBE ofrecer solo productos habilitados. Si la sección queda deshabilitada, agregar productos DEBE responder 409.

#### Escenario: Agregar productos habilitados

- DADO dos productos habilitados de otra sección
- CUANDO se hace `PUT` con sus ids y `confirmar_traslado: true`
- ENTONCES responde 200 con ambos en `productos` y `GET /productos` los muestra en esta sección

#### Escenario: Producto de otra sección sin confirmar

- DADO «Flan» en «Postres»
- CUANDO se hace `PUT` con su id y `confirmar_traslado: false`
- ENTONCES responde 409 con «Flan» y «Postres» y nada cambia; con `true`, pasa a esta sección

#### Escenario: Producto deshabilitado

- DADO un producto deshabilitado
- CUANDO se envía su id, o se consulta el selector
- ENTONCES el `PUT` responde 409 y `GET /productos` no lo ofrece

#### Escenario: Agregar a una sección que queda deshabilitada

- DADO una sección deshabilitada que sigue así
- CUANDO se hace `PUT` con `producto_ids` no vacío
- ENTONCES responde 409 y nada cambia

### Requisito: Todo producto pertenece a una sección (HU-M1-11 CA 4)

El sistema NO DEBE permitir quitar productos de una sección sin pasarlos a otra. La API no ofrece quitar; un producto ausente de `producto_ids` conserva su sección. El diálogo DEBE avisar «Todo producto debe pertenecer a una sección; para quitarlo, agréguelo a otra sección» si se intenta desmarcar uno.

#### Escenario: Omitir un producto

- DADO una sección con «Flan» y «Helado»
- CUANDO se hace `PUT` con `producto_ids` vacío
- ENTONCES responde 200 y ambos siguen en la sección

#### Escenario: Desmarcar en el diálogo

- DADO el diálogo de edición con «Flan» marcado
- CUANDO la persona lo desmarca
- ENTONCES se muestra el aviso y el producto sigue marcado

### Requisito: Reactivar una sección (HU-M1-11 CA 7)

`PUT` con `estado: HABILITADO` sobre una deshabilitada DEBE dejarla habilitada, de vuelta en la carta con sus productos habilitados. Si su orden está ocupado por otra habilitada, DEBE responder 409 «posición ocupada», corregible cambiando el orden en el mismo guardado.

#### Escenario: Reactivación

- DADO una sección deshabilitada con un producto habilitado
- CUANDO se hace `PUT` con `estado: HABILITADO` y orden libre
- ENTONCES responde 200 `HABILITADO` y la sección aparece con ese producto

#### Escenario: Reactivación con orden ocupado

- DADO una habilitada en orden 2 y una deshabilitada en orden 2
- CUANDO se reactiva sin cambiar el orden
- ENTONCES responde 409 «posición ocupada» y sigue deshabilitada; con orden libre, 200

### Requisito: Dar de baja una sección (HU-M1-12 CA 1 y 3)

`POST /secciones/{id}/baja` DEBE pasar la sección habilitada a `DESHABILITADO`, que deja de aparecer en la carta con sus productos. NO DEBE cambiar el estado ni la sección de sus productos. Dar de baja una ya deshabilitada DEBE responder 409.

#### Escenario: Baja confirmada

- DADO una sección habilitada con productos
- CUANDO se hace `POST .../baja`
- ENTONCES responde 200 `DESHABILITADO` y deja de figurar entre las habilitadas

#### Escenario: Los productos conservan su estado

- DADO la sección dada de baja con un producto habilitado
- CUANDO se consulta `GET /productos` y luego se la reactiva
- ENTONCES el producto sigue habilitado y en la sección, y vuelve a mostrarse al reactivarla

#### Escenario: Baja de una ya deshabilitada

- DADO una sección deshabilitada
- CUANDO se hace `POST .../baja`
- ENTONCES responde 409 y nada cambia

### Requisito: Confirmar la baja (HU-M1-12 CA 2 y 4)

Antes de confirmar, el frontend DEBE avisar cuántos productos habilitados dejarán de mostrarse (sin conteo si no hay). Cancelar NO DEBE enviar la baja.

#### Escenario: Aviso con productos

- DADO una sección con 3 productos habilitados
- CUANDO la persona pulsa «Dar de baja»
- ENTONCES el diálogo indica que 3 productos dejarán de mostrarse

#### Escenario: Cancelar

- DADO el diálogo de baja abierto
- CUANDO la persona cancela
- ENTONCES no se envía nada y la sección sigue habilitada

## Supuestos nuevos

- Supuesto: `Pagina[T]` tiene la forma `{items, total, limit, offset}`; D-27 no fija el cuerpo.
- Supuesto: `limit` o `offset` inválidos responden 422.
- Supuesto: el orden de validación es 422 (forma), 409 de nombre, 409 de orden, 404 de productos, 409 de deshabilitados y 409 de traslado.
- Supuesto: el 409 de traslado nombra solo el primer producto en conflicto.
- Supuesto: S1 a S6 de la propuesta de HU-M1-10 rigen sin cambios.
- Supuesto: S69. `productos_habilitados` se agrega a `SeccionRespuesta` en todas las respuestas; `productos` sigue listando todos los de la sección.
- Supuesto: S70. Orden de validación del `PUT` (diseño H3): 422 de forma (FastAPI valida el cuerpo antes de ejecutar la ruta, como en E6), 404 de la sección, 409 de nombre, 409 de orden (solo si la sección queda habilitada), 409 por agregar productos a una sección que queda deshabilitada, 404 de productos, 409 de productos deshabilitados y 409 de traslado sin confirmar.
- Supuesto: S71. El `PUT` es una sola transacción; ante cualquier error no cambia la sección ni los productos.
- Supuesto: S72. Ids ya presentes en la sección se ignoran sin exigir confirmación ni estar habilitados.
- Supuesto: S73. El 409 de baja doble usa «la sección ya está deshabilitada».
- Supuesto: S74. No cambia `carta-productos`; sus selectores ya listan solo secciones habilitadas (S68 de la propuesta de HU-M1-11-12).
