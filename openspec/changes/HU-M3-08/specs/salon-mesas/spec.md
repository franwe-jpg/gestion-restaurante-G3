# Delta para salon-mesas (HU-M3-08)

## Datos

La lectura usa la entidad `Mesa` y el resumen del sector ya definidos en HU-M3-05:

| Campo | Tipo | Origen |
| --- | --- | --- |
| `id` | entero | `mesas.id` |
| `numero` | entero | `mesas.numero` |
| `capacidad` | entero | `mesas.capacidad` |
| `sector` | `{id, nombre}` | `sectores.id`, `sectores.nombre` por `mesas.sector_id` |
| `estado` | `LIBRE` \| `OCUPADA` \| `FUERA_DE_SERVICIO` | `mesas.estado` |

No hay cambios de esquema.

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/mesas` | `limit` (1..100, por defecto 50) y `offset` (≥ 0) | 200 `Pagina[MesaSalida]` ordenada por `sector.nombre`, `numero` y `id` | 422 parámetros inválidos |

Formato de error: `{"detalle": "mensaje"}` (D-26). Una página vacía es 200 con `items: []` y `total: 0`; no es un error.

## ADDED Requirements

### Requisito: Listar las mesas

La pantalla `/salon` DEBE ofrecer una pestaña «Mesas» con una tabla de las mesas registradas y las columnas Número, Sector, Capacidad y Estado. El listado DEBE obtener los datos de `GET /api/v1/mesas`, DEBE paginar de a 50 registros y DEBE mostrar `Pagination` cuando haya más de una página. Cada mesa DEBE mostrar el nombre del sector al que pertenece. Cuando no haya mesas registradas, DEBE informar «No hay mesas disponibles» en lugar de la tabla. La pestaña «Sectores» DEBE seguir existiendo con el contenido de HU-M3-04.

#### Escenario: Listado con mesas (CA 1 de #41)

- DADO que existen las mesas 1 y 2 del sector «Salón principal» con capacidad 4, una `LIBRE` y otra `OCUPADA`
- CUANDO ingreso a la pestaña «Mesas» de `/salon`
- ENTONCES se muestran sus números, capacidades, sectores y estados

#### Escenario: Sin mesas registradas (CA 2 de #41)

- DADO que no hay mesas registradas
- CUANDO ingreso a la pestaña «Mesas» de `/salon`
- ENTONCES se informa «No hay mesas disponibles» y no se muestran filas

#### Escenario: Mesas en distintos sectores (CA 3 de #41)

- DADO que la mesa 1 pertenece a «Salón principal» y la mesa 1 a «Terraza»
- CUANDO ingreso al listado
- ENTONCES cada fila muestra el nombre de su sector
- Y las mesas se agrupan por sector, ordenadas por número dentro de cada uno

#### Escenario: Paginación

- DADO que hay 120 mesas registradas
- CUANDO ingreso al listado
- ENTONCES se muestran 50 y el control «Página 1 de 3»
- Y al pedir la página 2 se consulta con `offset=50`

#### Escenario: Error de carga

- DADO que el backend no responde
- CUANDO ingreso a la pestaña «Mesas»
- ENTONCES se muestra el error con una acción «Reintentar» que vuelve a consultar

#### Escenario: Mesa creada desde el salón

- DADO que estoy en la pestaña «Sectores»
- CUANDO creo una mesa con datos válidos
- ENTONCES se muestra el aviso «Mesa creada», la pestaña «Mesas» queda activa y el listado incluye la mesa nueva

## Fuera de alcance

- Filtros por sector o estado (diferencia con la maqueta, se anota en el PR).
- La columna «Mesas» de la pestaña de sectores.
- Modificar, eliminar, ocupar o liberar mesas.
