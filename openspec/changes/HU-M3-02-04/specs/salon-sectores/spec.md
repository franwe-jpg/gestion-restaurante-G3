# Delta para salon-sectores (HU-M3-02 y HU-M3-04)

## Datos

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base; no se recibe en la modificación. |
| `nombre` | texto | Obligatorio. Se recorta antes de medir. Entre 1 y 30 caracteres. Único sin distinguir mayúsculas ni espacios (`strip().casefold()`), excluyendo al propio sector. |
| `descripcion` | texto o nulo | Opcional. Hasta 200 caracteres. Vacía se guarda como `null`. |
| `estado` | `HABILITADO` \| `DESHABILITADO` | No se recibe: lo asigna el sistema. La modificación lo conserva; cambiarlo es de HU-M3-03. |

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `PUT /api/v1/sectores/{sector_id}` | JSON `SectorModificar {nombre, descripcion?}`; campos extra prohibidos | 200 `SectorSalida {id, nombre, descripcion, estado}` | 404 sector inexistente; 409 nombre de otro sector; 422 datos inválidos |
| `GET /api/v1/sectores?limit&offset` | — | 200 `Pagina[SectorSalida]` ordenada por `nombre` | 422 paginación inválida |

Formato de error: `{"detalle": "mensaje"}` (D-26). El nombre repetido responde 409 con `{"detalle": "El sector ya existe"}`; el sector inexistente, 404 con `{"detalle": "El sector {id} no existe"}`.

## ADDED Requirements

### Requisito: Modificar un sector

El sistema DEBE permitir modificar el nombre y la descripción de un sector existente. El `service` DEBE cargar el sector (404 si no existe), DEBE validar que el nombre no pertenezca a otro sector sin distinguir mayúsculas (409) y DEBE confirmar la transacción; el `router` NO DEBE consultar la base. La modificación DEBE conservar el `estado` del sector y NO DEBE aceptar `estado` en el cuerpo. Si el nombre enviado es el mismo que ya tiene el sector, la operación DEBE completarse sin conflicto.

#### Escenario: Modificación con valores válidos (CA 1 de #34)

- DADO que existe el sector «Salón principal» con descripción «Planta baja»
- CUANDO modifico el nombre a «Salón central» y la descripción a «Planta alta» y guardo
- ENTONCES el sistema responde 200 con los datos nuevos, la fila del listado los muestra y el diálogo se cierra con un aviso de éxito

#### Escenario: Dato obligatorio vacío (CA 2 de #34)

- DADO que estoy editando el sector «Terraza»
- CUANDO dejo el nombre vacío o solo con espacios y guardo
- ENTONCES el cambio NO se guarda, se informa «El nombre es obligatorio.» y el sector conserva su nombre anterior

#### Escenario: Nombre de otro sector (CA 3 de #34)

- DADO que existen los sectores «Salón principal» y «Terraza»
- CUANDO intento cambiar el nombre de «Terraza» por « salón PRINCIPAL »
- ENTONCES el cambio NO se guarda, se responde 409 con «El sector ya existe», el mensaje se muestra bajo el campo Nombre y el sector conserva sus datos

#### Escenario: Cancelar la modificación (CA 4 de #34)

- DADO que estoy editando el sector «Terraza» y cambié el nombre en el formulario
- CUANDO presiono «Cancelar»
- ENTONCES el diálogo se cierra, NO se envía ninguna solicitud y la fila del listado mantiene los datos originales

#### Escenario: Mismo nombre con otra descripción

- DADO que existe el sector «Terraza»
- CUANDO guardo el mismo nombre «Terraza» con la descripción «Al aire libre»
- ENTONCES el sistema responde 200 y solo cambia la descripción

#### Escenario: Sector inexistente

- DADO un id de sector que no existe
- CUANDO intento modificar ese sector
- ENTONCES el sistema responde 404 con «El sector {id} no existe»

#### Escenario: Sector deshabilitado

- DADO que existe el sector «Reservado» en estado `DESHABILITADO`
- CUANDO modifico su descripción con valores válidos
- ENTONCES el sistema responde 200, la descripción cambia y el estado sigue siendo `DESHABILITADO`

#### Escenario: Estado enviado en el cuerpo

- DADO el cuerpo `{"nombre": "Terraza", "estado": "DESHABILITADO"}`
- CUANDO se envía a `PUT /api/v1/sectores/{sector_id}`
- ENTONCES el sistema responde 422 porque ese campo no se recibe

#### Escenario: Límites de longitud

- DADO un nombre de 31 caracteres o una descripción de 201 caracteres
- CUANDO intento guardar la modificación
- ENTONCES el cambio NO se guarda: el frontend advierte el máximo sin enviar y la API responde 422 si se envía igual

#### Escenario: Nombre recortado

- DADO el nombre «  Terraza  »
- CUANDO se guarda la modificación
- ENTONCES el sector queda con el nombre «Terraza»

#### Escenario: Descripción ausente

- DADO un cuerpo con solo el nombre
- CUANDO se envía a `PUT /api/v1/sectores/{sector_id}`
- ENTONCES el sector queda con `descripcion` en `null`

### Requisito: Listar los sectores

La pantalla `/salon` DEBE mostrar una tabla con los sectores registrados, con las columnas Nombre, Descripción y Estado, ordenada por nombre, y DEBE ofrecer por fila la acción «Editar «nombre»», que abre el diálogo de modificación con los datos del sector. Cuando no haya sectores, DEBE informar «No hay sectores disponibles» en lugar de la tabla. El listado DEBE obtener los datos de `GET /api/v1/sectores` sin filtro de estado y DEBE paginar de a 50 registros con `Pagination` cuando haya más de una página.

#### Escenario: Listado con sectores (CA 1 de #36)

- DADO que existen sectores registrados
- CUANDO ingreso a `/salon`
- ENTONCES se muestran sus nombres, descripciones (o «—» si no tienen) y estados

#### Escenario: Listado vacío (CA 2 de #36)

- DADO que no existen sectores registrados
- CUANDO ingreso a `/salon`
- ENTONCES se informa «No hay sectores disponibles» y no se muestra la tabla

#### Escenario: Varios sectores (CA 3 de #36)

- DADO que existen varios sectores habilitados y deshabilitados
- CUANDO ingreso a `/salon`
- ENTONCES se muestran todos los sectores de la página, ordenados por nombre

#### Escenario: Editar desde la fila

- DADO que el listado muestra el sector «Terraza»
- CUANDO presiono «Editar «Terraza»»
- ENTONCES se abre el diálogo de modificación con «Terraza» y su descripción precargados

#### Escenario: Paginación

- DADO que existen más de 50 sectores
- CUANDO ingreso a `/salon`
- ENTONCES se muestra la primera página de 50 y los controles de paginación, que permiten ir a las siguientes

#### Escenario: Error de carga

- DADO que la API del listado responde con error
- CUANDO ingreso a `/salon`
- ENTONCES se informa el error con la opción de reintentar
