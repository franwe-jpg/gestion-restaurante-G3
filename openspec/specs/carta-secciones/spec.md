# Especificación de carta-secciones (HU-M1-10)

## Propósito

Alta y listado de secciones de la carta, y asignación o traslado de productos a una sección. Capacidad nueva: no hay spec previa. Entidades del diagrama de clases: `Seccion`, `Producto`, `Estado`, `Categoria`.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /secciones` | 201, `SeccionRespuesta` | 404, 409, 422 |
| `GET /secciones?limit&offset&estado` | 200, `Pagina[SeccionRespuesta]`, orden ascendente por `orden` | 422 |
| `GET /productos?limit&offset` | 200, `Pagina[ProductoRespuesta]`, solo habilitados | 422 |

Esquemas:

- `SeccionCrear`: `nombre: str`, `orden: int`, `producto_ids: list[int] = []`, `confirmar_traslado: bool = false`.
- `SeccionRespuesta`: `id`, `nombre`, `orden`, `estado`, `productos: [{id, nombre}]`.
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

`GET /secciones` DEBE devolver las secciones, paginadas y ordenadas por `orden` ascendente. El parámetro opcional `estado` (`HABILITADO` o `DESHABILITADO`) PUEDE filtrar el listado; sin él, DEBE devolver todas las secciones, igual que antes. El valor de `estado` fuera del enumerado DEBE responder 422. `total` DEBE contar solo las secciones que cumplen el filtro. La pestaña «Secciones» DEBE mostrar Orden, Nombre, cantidad de productos y Estado.

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

## Supuestos nuevos

- Supuesto: `Pagina[T]` tiene la forma `{items, total, limit, offset}`; D-27 no fija el cuerpo.
- Supuesto: `limit` o `offset` inválidos responden 422.
- Supuesto: el orden de validación es 422 (forma), 409 de nombre, 409 de orden, 404 de productos, 409 de deshabilitados y 409 de traslado.
- Supuesto: el 409 de traslado nombra solo el primer producto en conflicto.
- Supuesto: S1 a S6 de la propuesta rigen sin cambios.
