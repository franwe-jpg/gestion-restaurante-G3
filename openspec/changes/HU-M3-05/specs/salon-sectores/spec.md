# Delta para salon-sectores (HU-M3-05)

## MODIFIED Requirements

### Requisito: Listar sectores para el selector

`GET /api/v1/sectores` DEBE devolver los sectores paginados y ordenados por `nombre`. El parámetro opcional `estado` (`HABILITADO` o `DESHABILITADO`) PUEDE filtrar el listado; sin él, DEBE devolver todos. `limit` DEBE valer entre 1 y 100 y `offset` NO DEBE ser negativo. `total` DEBE contar solo los sectores que cumplen el filtro. La respuesta DEBE usar `Pagina[SectorSalida]`.

Esta lectura existe para el selector del alta de mesas (HU-M3-05). La pantalla de listado de sectores y su columna «Mesas» siguen siendo HU-M3-04; esta HU NO las implementa.

(Previously: la capacidad `salon-sectores` solo definía el alta; se agrega la lectura paginada con filtro opcional `estado`.)

Contrato: `GET /sectores?limit&offset&estado` → 200 `Pagina[SectorSalida]`; errores 422.

#### Escenario: Sectores habilitados para el selector

- DADO dos sectores habilitados y uno deshabilitado
- CUANDO se hace `GET /sectores?estado=HABILITADO&limit=100&offset=0`
- ENTONCES `items` trae solo los dos habilitados por `nombre` y `total` es 2

#### Escenario: Sin filtro

- DADO sectores habilitados y deshabilitados
- CUANDO se hace `GET /sectores` sin `estado`
- ENTONCES `items` incluye todos y `total` coincide con la cantidad total

#### Escenario: Paginación fuera de rango

- DADO `limit=101` o `offset=-1`
- CUANDO se hace `GET /sectores`
- ENTONCES responde 422

#### Escenario: Estado inválido

- DADO `estado=ABIERTO`
- CUANDO se hace `GET /sectores`
- ENTONCES responde 422
