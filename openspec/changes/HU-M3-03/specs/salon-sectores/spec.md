# Delta para salon-sectores (HU-M3-03)

## Datos

La baja no recibe cuerpo ni cambia el esquema. Solo cambia `estado` del sector:

| Campo | Antes | Después |
| --- | --- | --- |
| `estado` | `HABILITADO` | `DESHABILITADO` |

`nombre`, `descripcion`, `nombre_normalizado` y las mesas del sector quedan intactos.

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /api/v1/sectores/{sector_id}/baja` | Sin cuerpo (D-24) | 200 `SectorSalida {id, nombre, descripcion, estado}` con `estado` `DESHABILITADO` | 404 sector inexistente; 409 sector ya deshabilitado; 409 sector con mesas asociadas; 422 `sector_id` no entero |

Formato de error: `{"detalle": "mensaje"}` (D-26). Mensajes de negocio: «El sector {id} no existe», «El sector ya está deshabilitado», «No se puede eliminar el sector {nombre} porque tiene mesas asociadas».

`GET /api/v1/sectores?estado=HABILITADO` NO DEBE devolver el sector dado de baja. `GET /api/v1/sectores` sin filtro SÍ DEBE devolverlo, con `estado` `DESHABILITADO`.

## ADDED Requirements

### Requisito: Dar de baja un sector

El sistema DEBE permitir eliminar un sector existente con `POST /api/v1/sectores/{sector_id}/baja`. La eliminación DEBE ser lógica: el sector pasa a `estado` `DESHABILITADO`, conserva sus datos y NO DEBE borrarse ninguna fila. La operación DEBE responder 404 si el sector no existe y 409 si ya estaba deshabilitado. Un sector con mesas asociadas NO DEBE poder darse de baja y DEBE responder 409 sin cambiar su estado ni sus mesas.

#### Escenario: Eliminar un sector existente (CA 1 de #35)

- DADO que existe el sector «Terraza» en estado `HABILITADO`
- CUANDO confirmo su eliminación
- ENTONCES responde 200 con el sector en estado `DESHABILITADO`
- Y el sector deja de aparecer en `GET /api/v1/sectores?estado=HABILITADO`
- Y sigue apareciendo en `GET /api/v1/sectores` con el badge «Deshabilitado»

#### Escenario: Confirmación en el listado

- DADO que el listado muestra el sector «Terraza» habilitado
- CUANDO presiono «Eliminar «Terraza»»
- ENTONCES se abre una confirmación con «¿Eliminar el sector «Terraza»?»
- Y al confirmar se envía `POST /api/v1/sectores/{id}/baja`, se avisa «Sector eliminado» y el listado se recarga

#### Escenario: Cancelar la eliminación

- DADO que la confirmación de «Terraza» está abierta
- CUANDO presiono «Cancelar»
- ENTONCES el diálogo se cierra, NO se envía ninguna solicitud y el sector sigue `HABILITADO`

#### Escenario: Sector con mesas asociadas (CA 2 de #35)

- DADO que el sector «Salón principal» tiene al menos una mesa
- CUANDO intento eliminarlo
- ENTONCES responde 409 con «No se puede eliminar el sector Salón principal porque tiene mesas asociadas»
- Y el sector sigue `HABILITADO` y la mesa se conserva
- Y el frontend muestra ese mensaje en un aviso de error

#### Escenario: Sector ya deshabilitado

- DADO que el sector «Reservado» está `DESHABILITADO`
- CUANDO intento eliminarlo
- ENTONCES responde 409 con «El sector ya está deshabilitado»
- Y la fila «Reservado» NO DEBE ofrecer la acción «Eliminar»

#### Escenario: Sector inexistente

- DADO un `sector_id` que no existe
- CUANDO se hace `POST /api/v1/sectores/{id}/baja`
- ENTONCES responde 404 con «El sector {id} no existe»

## Fuera de alcance

- Reactivación de un sector deshabilitado (`Supuesto:` S1 de la propuesta).
- Borrado físico de la fila.
- Eliminar o mover mesas.
