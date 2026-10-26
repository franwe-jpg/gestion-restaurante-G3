# Delta para carta-secciones (HU-M1-11-12)

## Contrato de la API

Prefijo `/api/v1`. Errores `{"detalle": "mensaje"}` (D-26, D-25).

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /secciones/{id}` | 200, `SeccionRespuesta` | 404 |
| `PUT /secciones/{id}` | 200, `SeccionRespuesta` | 404, 409, 422 |
| `POST /secciones/{id}/baja` (sin cuerpo) | 200, `SeccionRespuesta` | 404, 409 |
| `GET /secciones?limit&offset&estado` | 200, `Pagina[SeccionRespuesta]` | 422 |

- `SeccionModificar`: `nombre: str` y `orden: int` obligatorios; `producto_ids: list[int] = []`, `confirmar_traslado: bool = false`, `estado: HABILITADO | DESHABILITADO` opcional (ausente conserva el actual).
- `SeccionRespuesta` suma `productos_habilitados: int`.

## ADDED Requirements

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

## MODIFIED Requirements

### Requisito: Listar secciones

`GET /secciones` DEBE devolver las secciones, paginadas y ordenadas por `orden` ascendente. El parámetro opcional `estado` (`HABILITADO` o `DESHABILITADO`) PUEDE filtrar el listado; sin él, DEBE devolver todas las secciones, igual que antes. El valor de `estado` fuera del enumerado DEBE responder 422. `total` DEBE contar solo las secciones que cumplen el filtro. Cada sección DEBE incluir `productos_habilitados`, la cantidad de sus productos habilitados. La pestaña «Secciones» DEBE mostrar Orden, Nombre, cantidad de productos y Estado, con las acciones «Editar» y «Dar de baja».
(Previously: sin `productos_habilitados` ni acciones por fila.)

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

## Supuestos

- Supuesto S69: `productos_habilitados` se agrega a `SeccionRespuesta` en todas las respuestas; `productos` sigue listando todos los de la sección.
- Supuesto S70: orden de validación del `PUT` (diseño H3): 422 de forma (FastAPI valida el cuerpo antes de ejecutar la ruta, como en E6), 404 de la sección, 409 de nombre, 409 de orden (solo si la sección queda habilitada), 409 por agregar productos a una sección que queda deshabilitada, 404 de productos, 409 de productos deshabilitados y 409 de traslado sin confirmar.
- Supuesto S71: el `PUT` es una sola transacción; ante cualquier error no cambia la sección ni los productos.
- Supuesto S72: ids ya presentes en la sección se ignoran sin exigir confirmación ni estar habilitados.
- Supuesto S73: el 409 de baja doble usa «la sección ya está deshabilitada».
- Supuesto S74: no cambia `carta-productos`; sus selectores ya listan solo secciones habilitadas (S68 de la propuesta).
