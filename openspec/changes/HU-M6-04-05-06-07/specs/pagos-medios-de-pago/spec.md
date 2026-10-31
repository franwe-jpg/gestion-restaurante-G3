# Capacidad pagos-medios-de-pago (HU-M6-04, HU-M6-05, HU-M6-06 y HU-M6-07)

## Datos

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base. |
| `nombre` | texto | Obligatorio. Se recorta antes de medir. Entre 3 y 50 caracteres. Solo letras (con acentos y ñ), números, espacios, punto y guion. Único sin distinguir mayúsculas ni espacios (`strip().casefold()`) entre los medios no eliminados; en la modificación se excluye al propio medio. |
| `tipo` | `EFECTIVO` \| `TARJETA` \| `TRANSFERENCIA` \| `BILLETERA_VIRTUAL` | Obligatorio. |
| `descripcion` | texto o nulo | Opcional. Hasta 200 caracteres. Vacía se guarda como `null`. |
| `estado` | `HABILITADO` \| `DESHABILITADO` | Al crear lo asigna el sistema (`HABILITADO`). La modificación lo recibe y es obligatorio. |
| `eliminado` | booleano | Interno (baja lógica), por defecto `false`. No se expone en la API. |

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /api/v1/medios-de-pago` | JSON `MedioPagoCrear {nombre, tipo, descripcion?}`; campos extra prohibidos | 201 `MedioPagoSalida {id, nombre, tipo, descripcion, estado}` | 409 nombre repetido; 422 datos inválidos |
| `PUT /api/v1/medios-de-pago/{id}` | JSON `MedioPagoModificar {nombre, tipo, descripcion?, estado}`; campos extra prohibidos | 200 `MedioPagoSalida` | 404 inexistente o eliminado; 409 nombre de otro medio; 422 datos inválidos |
| `DELETE /api/v1/medios-de-pago/{id}` | — | 204 sin cuerpo | 404 inexistente o ya eliminado |
| `GET /api/v1/medios-de-pago?incluir_deshabilitados&limit&offset` | — | 200 `Pagina[MedioPagoSalida]` ordenada por nombre | 422 parámetros inválidos |

Formato de error: `{"detalle": "mensaje"}` (D-26). Inexistente o eliminado: 404 con «El medio de pago {id} no existe». Nombre repetido: 409 con «El medio de pago ya existe».

## ADDED Requirements

### Requisito: Crear un medio de pago (#74)

El sistema DEBE permitir crear un medio de pago con nombre, tipo y descripción opcional, y DEBE dejarlo en estado `HABILITADO`. El `service` DEBE validar que el nombre normalizado no exista entre los no eliminados (409) y DEBE confirmar la transacción; el `router` NO DEBE consultar la base. El alta NO DEBE recibir `estado`.

#### Escenario: Alta con nombre y tipo (CA 1 de #74)

- DADO que cargo el nombre «Efectivo» y el tipo `EFECTIVO`
- CUANDO lo guardo
- ENTONCES el sistema responde 201 con el medio creado y queda disponible para cobrar (aparece en el listado)

#### Escenario: Nombre repetido (CA 2 de #74)

- DADO que ya existe el medio de pago «Efectivo»
- CUANDO intento crear otro con el nombre «Efectivo»
- ENTONCES NO se crea, se responde 409 con «El medio de pago ya existe» y el mensaje se muestra bajo el campo Nombre

#### Escenario: Nombre vacío (CA 3 de #74)

- DADO que dejo el nombre vacío o solo con espacios
- CUANDO intento guardar
- ENTONCES NO se crea; el formulario informa «El nombre es obligatorio.» y el backend responde 422

#### Escenario: Largo del nombre (CA 4 de #74)

- DADO un nombre con menos de 3 o más de 50 caracteres
- CUANDO intento guardar
- ENTONCES NO se crea; el formulario informa «El nombre debe tener entre 3 y 50 caracteres.» y el backend responde 422

#### Escenario: Caracteres no permitidos (CA 5 de #74)

- DADO un nombre con caracteres fuera de letras, números, espacios, punto y guion (por ejemplo «Tarjeta $»)
- CUANDO intento guardar
- ENTONCES NO se crea; el formulario informa «El nombre solo admite letras, números, espacios, punto y guion.» y el backend responde 422

#### Escenario: Tipo no elegido (CA 6 de #74)

- DADO que no elijo un tipo
- CUANDO intento guardar
- ENTONCES NO se crea; el formulario informa «El tipo es obligatorio.» y el backend responde 422 si el tipo falta o no es uno de los cuatro permitidos

#### Escenario: Descripción demasiado larga (CA 7 de #74)

- DADO una descripción de más de 200 caracteres
- CUANDO intento guardar
- ENTONCES NO se crea; el formulario informa el largo máximo y el backend responde 422

#### Escenario: Estado inicial (CA 8 de #74)

- DADO un medio de pago nuevo
- CUANDO se guarda
- ENTONCES queda en estado `HABILITADO`, aunque la solicitud intente enviar `estado` (campo extra prohibido: 422)

#### Escenario: Duplicado por mayúsculas o espacios (CA 9 de #74)

- DADO que existe «Efectivo»
- CUANDO intento crear «efectivo » (minúscula y espacio sobrante)
- ENTONCES se lo considera duplicado y se responde 409

#### Escenario: Nombre de un medio eliminado (S3)

- DADO que «Efectivo» fue eliminado
- CUANDO creo un nuevo medio llamado «Efectivo»
- ENTONCES se crea, porque la unicidad solo cuenta los no eliminados

### Requisito: Modificar un medio de pago (#75)

El sistema DEBE permitir reemplazar nombre, tipo, descripción y estado de un medio de pago existente y no eliminado. El `service` DEBE cargarlo (404 si no existe o está eliminado), DEBE validar el nombre excluyendo al propio medio (409) y DEBE confirmar la transacción.

#### Escenario: Cambio de datos (CA 1 de #75)

- DADO que existe «Tarjeta» con tipo `TARJETA`
- CUANDO cambio el nombre a «Tarjeta de crédito», la descripción y guardo
- ENTONCES el sistema responde 200 con los datos nuevos y el listado los muestra

#### Escenario: Nombre vacío (CA 2 de #75)

- DADO que dejo el nombre vacío
- CUANDO guardo
- ENTONCES el cambio NO se aplica, el formulario informa «El nombre es obligatorio.» y el medio conserva sus datos

#### Escenario: Largo del nombre (CA 3 de #75)

- DADO un nombre con menos de 3 o más de 50 caracteres
- CUANDO guardo
- ENTONCES el cambio NO se aplica y se informa el largo permitido

#### Escenario: Caracteres no permitidos (CA 4 de #75)

- DADO un nombre con caracteres no permitidos
- CUANDO guardo
- ENTONCES el cambio NO se aplica y se informa

#### Escenario: Nombre de otro medio (CA 5 de #75)

- DADO que existen «Efectivo» y «Tarjeta»
- CUANDO cambio «Tarjeta» por « EFECTIVO »
- ENTONCES el cambio NO se aplica, se responde 409 con «El medio de pago ya existe» y el mensaje se muestra bajo el campo Nombre

#### Escenario: Mismo nombre no es duplicado de sí mismo (CA 6 de #75)

- DADO que existe «Tarjeta»
- CUANDO guardo «Tarjeta» con otra descripción
- ENTONCES el sistema responde 200 y solo cambia lo demás

#### Escenario: Tipo vacío (CA 7 de #75)

- DADO que dejo el tipo vacío
- CUANDO guardo
- ENTONCES el cambio NO se aplica y se informa «El tipo es obligatorio.»

#### Escenario: Descripción demasiado larga (CA 8 de #75)

- DADO una descripción de más de 200 caracteres
- CUANDO guardo
- ENTONCES el cambio NO se aplica y se informa el largo máximo

#### Escenario: Deshabilitar y volver a habilitar (CA 9 de #75)

- DADO un medio habilitado
- CUANDO lo deshabilito y guardo
- ENTONCES deja de aparecer en el listado por defecto (no se puede elegir para cobrar) y, con `incluir_deshabilitados`, puedo verlo y volver a habilitarlo

#### Escenario: Cancelar la modificación (CA 10 de #75)

- DADO que estoy editando un medio y cambié el nombre en el formulario
- CUANDO presiono «Cancelar»
- ENTONCES el diálogo se cierra, NO se envía ninguna solicitud y la fila conserva sus datos

#### Escenario: Medio eliminado (CA 11 de #75)

- DADO que el medio fue eliminado
- CUANDO intento guardar cambios
- ENTONCES el sistema responde 404 con «El medio de pago {id} no existe» y no aplica el cambio

#### Escenario: Nombre actualizado en cobros anteriores (CA 12 de #75, diferido S5)

- DADO que un medio fue usado en cobros anteriores
- CUANDO cambio su nombre
- ENTONCES los cobros muestran el nombre actualizado
- Hoy se comprueba que la modificación cambia el nombre sobre la misma fila (mismo `id`). El escenario completo se ejercita con `Cobro` (Sprint 3).

### Requisito: Eliminar un medio de pago (#76)

El sistema DEBE eliminar un medio de pago con baja lógica: marca `eliminado = true`, conserva la fila y deja de mostrarlo y de permitir su uso. El `service` DEBE responder 404 si no existe o ya está eliminado.

#### Escenario: Eliminar con confirmación (CA 1 de #76)

- DADO que existe un medio de pago
- CUANDO lo elimino y confirmo
- ENTONCES el sistema responde 204, no se puede usar para cobrar y deja de aparecer en el listado

#### Escenario: Cancelar la eliminación (CA 2 de #76)

- DADO que existe un medio de pago
- CUANDO inicio la eliminación y cancelo la confirmación
- ENTONCES NO se envía ninguna solicitud y el medio no se modifica

#### Escenario: Cobros anteriores (CA 3 de #76, diferido S5)

- DADO que el medio se usó en cobros anteriores
- CUANDO lo elimino
- ENTONCES esos cobros siguen mostrando con qué se pagaron
- Hoy se comprueba que la fila se conserva (`eliminado = true`) con su nombre y tipo. El escenario completo se ejercita con `Cobro` (Sprint 3).

#### Escenario: Eliminar de nuevo (CA 4 de #76)

- DADO que el medio ya fue eliminado
- CUANDO intento eliminarlo otra vez
- ENTONCES el sistema responde 404 con «El medio de pago {id} no existe»

#### Escenario: Cobro en curso (CA 5 de #76, diferido S5)

- DADO que el medio está siendo usado en un cobro en curso
- CUANDO intento eliminarlo
- ENTONCES se informa que no se puede eliminar hasta que el cobro termine (409)
- Se implementa con `Cobro` (Sprint 3).

#### Escenario: Eliminar un medio deshabilitado (CA 6 de #76)

- DADO un medio deshabilitado
- CUANDO lo elimino y confirmo
- ENTONCES deja de aparecer en todos los listados (también con `incluir_deshabilitados`) y no se puede volver a habilitarlo (modificarlo da 404)

### Requisito: Listar los medios de pago (#77)

El sistema DEBE devolver los medios de pago no eliminados, paginados y ordenados por nombre sin distinguir mayúsculas. Por defecto DEBE incluir solo los habilitados; con `incluir_deshabilitados=true`, también los deshabilitados (S2).

#### Escenario: Medios habilitados (CA 1 de #77)

- DADO que hay medios de pago habilitados
- CUANDO pido la lista
- ENTONCES veo todos los habilitados con su nombre y tipo

#### Escenario: Deshabilitados y eliminados (CA 2 de #77)

- DADO que hay medios deshabilitados o eliminados
- CUANDO pido la lista sin parámetros
- ENTONCES no aparecen

#### Escenario: Sin medios habilitados (CA 3 de #77)

- DADO que no hay medios de pago habilitados
- CUANDO pido la lista
- ENTONCES el sistema responde 200 con `items` vacío y la pantalla informa «No hay medios de pago disponibles para cobrar.»

#### Escenario: Orden por nombre (CA 4 de #77)

- DADO que hay varios medios habilitados («tarjeta», «Efectivo», «Billetera»)
- CUANDO pido la lista
- ENTONCES se muestran ordenados por nombre sin distinguir mayúsculas: «Billetera», «Efectivo», «tarjeta»

#### Escenario: Incluir deshabilitados (S2)

- DADO que hay medios habilitados y deshabilitados
- CUANDO pido la lista con `incluir_deshabilitados=true`
- ENTONCES aparecen todos los no eliminados, con su estado

#### Escenario: Paginación

- DADO más de 50 medios de pago
- CUANDO pido la lista sin `limit`
- ENTONCES recibo 50 por página y el `total` completo; un `limit` mayor a 100 responde 422
