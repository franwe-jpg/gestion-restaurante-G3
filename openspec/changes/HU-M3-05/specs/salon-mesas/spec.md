# Delta para salon-mesas (HU-M3-05)

## Datos

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base; no se recibe. |
| `numero` | entero | Obligatorio. Mayor a cero. Único dentro del sector. Sin tope superior (S3). |
| `capacidad` | entero | Obligatorio. Mayor a cero. Sin tope superior (S3). |
| `sector_id` | entero | Obligatorio. Debe existir y estar `HABILITADO`. |
| `estado` | `LIBRE` \| `OCUPADA` \| `FUERA_DE_SERVICIO` | Lo asigna el sistema: toda alta queda `LIBRE`. No se recibe. |

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /api/v1/mesas` | JSON `MesaCrear {numero, capacidad, sector_id}`; campos extra prohibidos | 201 `MesaSalida {id, numero, capacidad, sector: {id, nombre}, estado}` | 404 sector inexistente; 409 número repetido en el sector o sector deshabilitado; 422 datos inválidos |
| `GET /api/v1/sectores` | `limit`, `offset`, `estado?` | 200 `Pagina[SectorSalida]` | 422 parámetros inválidos |

Formato de error: `{"detalle": "mensaje"}` (D-26). Mensajes de negocio: «El sector {id} no existe», «El sector {nombre} está deshabilitado», «La mesa {numero} ya existe en el sector {nombre}».

## ADDED Requirements

### Requisito: Crear una mesa

El sistema DEBE permitir crear una mesa con número entero mayor a cero, capacidad entera mayor a cero y sector existente y habilitado. Al guardar con datos válidos, DEBE registrarla con estado `LIBRE` y responder 201. El número NO DEBE repetirse dentro del mismo sector y PUEDE repetirse en sectores distintos. El `router` NO DEBE consultar la base.

#### Escenario: Alta con los datos obligatorios (CA 1)

- DADO que estoy en el formulario de creación de mesa
- CUANDO elijo el sector «Salón principal», ingreso el número 13 y la capacidad 4, y guardo
- ENTONCES el sistema responde 201, la mesa queda registrada en ese sector y el formulario se cierra con un aviso de éxito

#### Escenario: Dato obligatorio vacío (CA 2)

- DADO que estoy en el formulario de creación
- CUANDO dejo vacío el número, la capacidad o el sector y guardo
- ENTONCES la mesa NO se registra y se informa el error de cada campo obligatorio

#### Escenario: Mesa repetida en el sector (CA 3)

- DADO que el sector «Salón principal» ya tiene la mesa 3
- CUANDO intento registrar la mesa 3 en «Salón principal»
- ENTONCES la mesa NO se crea y se responde 409 con «La mesa 3 ya existe en el sector Salón principal», que se muestra bajo Número

#### Escenario: El mismo número en otro sector (CA 3, límite)

- DADO que «Salón principal» ya tiene la mesa 3
- CUANDO registro la mesa 3 en «Terraza»
- ENTONCES la mesa se crea porque la unicidad es por sector

#### Escenario: Cancelar el alta (CA 4)

- DADO que el formulario contiene datos
- CUANDO presiono «Cancelar»
- ENTONCES el diálogo se cierra, la mesa NO se crea y no se envía ninguna solicitud

#### Escenario: Número con formato incorrecto (CA 5)

- DADO un número con letras, decimal o menor o igual a cero
- CUANDO intento guardar
- ENTONCES la mesa NO se registra y se advierte que el número debe ser un número entero mayor a cero

#### Escenario: Capacidad inválida (CA 6)

- DADO una capacidad con letras, decimal o menor o igual a cero
- CUANDO intento guardar
- ENTONCES la mesa NO se registra y se advierte que la capacidad debe ser un número entero mayor a cero

#### Escenario: Estado asignado por el sistema (CA 7)

- DADO una mesa nueva con datos válidos
- CUANDO se guarda
- ENTONCES queda en estado `LIBRE`
- Y si el cuerpo de la petición incluye `estado`, el sistema responde 422 porque ese campo no se recibe

#### Escenario: Sector inexistente

- DADO un `sector_id` que no existe
- CUANDO intento crear la mesa
- ENTONCES responde 404 con «El sector {id} no existe»

#### Escenario: Sector deshabilitado

- DADO un sector en estado `DESHABILITADO`
- CUANDO intento crear una mesa en ese sector
- ENTONCES responde 409 con «El sector {nombre} está deshabilitado» y la mesa no se crea
