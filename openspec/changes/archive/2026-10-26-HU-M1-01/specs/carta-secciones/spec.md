# Delta para carta-secciones (HU-M1-01)

## MODIFIED Requirements

### Requisito: Listar secciones

`GET /secciones` DEBE devolver las secciones, paginadas y ordenadas por `orden` ascendente. El parámetro opcional `estado` (`HABILITADO` o `DESHABILITADO`) PUEDE filtrar el listado; sin él, DEBE devolver todas las secciones, igual que antes. El valor de `estado` fuera del enumerado DEBE responder 422. `total` DEBE contar solo las secciones que cumplen el filtro. La pestaña «Secciones» DEBE mostrar Orden, Nombre, cantidad de productos y Estado.

(Previously: el listado no admitía filtros; se agrega `estado` opcional y retrocompatible para el selector de sección del alta de platos, HU-M1-01.)

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
