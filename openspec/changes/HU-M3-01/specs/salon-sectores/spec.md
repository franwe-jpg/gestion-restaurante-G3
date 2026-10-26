# Delta para salon-sectores (HU-M3-01)

## Datos

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Asignado por la base; no se recibe. |
| `nombre` | texto | Obligatorio. Se recorta antes de medir. Entre 1 y 30 caracteres. Único sin distinguir mayúsculas ni espacios (`strip().casefold()`). |
| `descripcion` | texto o nulo | Opcional. Hasta 200 caracteres. Vacía se guarda como `null`. |
| `estado` | `HABILITADO` \| `DESHABILITADO` | Lo asigna el sistema: toda alta queda `HABILITADO`. No se recibe. |

## Contrato de la API

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `POST /api/v1/sectores` | JSON `SectorCrear {nombre, descripcion?}`; campos extra prohibidos | 201 `SectorSalida {id, nombre, descripcion, estado}` | 409 nombre repetido; 422 datos inválidos |

Formato de error: `{"detalle": "mensaje"}` (D-26). El nombre repetido responde 409 con `{"detalle": "El sector ya existe"}`.

## ADDED Requirements

### Requisito: Crear un sector

El sistema DEBE permitir crear un sector con nombre obligatorio de hasta 30 caracteres y descripción opcional. Al guardar con datos válidos, DEBE registrarlo y responder 201 con el sector creado. El `service` DEBE recortar el nombre, rechazar el nombre repetido sin distinguir mayúsculas y confirmar la transacción; el `router` NO DEBE consultar la base.

#### Escenario: Alta con los datos obligatorios (CA 1)

- DADO que estoy en el formulario de creación de sector
- CUANDO ingreso el nombre «Salón principal» y guardo
- ENTONCES el sistema responde 201, el sector queda registrado y el formulario se cierra con un aviso de éxito

#### Escenario: Alta con descripción (CA 1)

- DADO que estoy en el formulario de creación de sector
- CUANDO ingreso el nombre «Terraza» y la descripción «Al aire libre» y guardo
- ENTONCES el sector se registra con esa descripción y estado `HABILITADO`

#### Escenario: Dato obligatorio vacío (CA 2)

- DADO que estoy en el formulario de creación
- CUANDO dejo el nombre vacío o solo con espacios y guardo
- ENTONCES el sector NO se registra y se informa «El nombre es obligatorio.»

#### Escenario: Nombre repetido (CA 3)

- DADO que ya existe un sector llamado «Salón principal»
- CUANDO intento registrar « salón PRINCIPAL »
- ENTONCES el sector NO se crea y se responde 409 con «El sector ya existe», que se muestra bajo el campo Nombre

#### Escenario: Cancelar el alta (CA 4)

- DADO que el formulario contiene datos
- CUANDO presiono «Cancelar»
- ENTONCES el diálogo se cierra, el sector NO se crea y no se envía ninguna solicitud

#### Escenario: Nombre que supera el máximo (CA 5)

- DADO un nombre de 31 caracteres
- CUANDO intento guardar
- ENTONCES el sector NO se registra y se advierte «El nombre supera los 30 caracteres permitidos.»

#### Escenario: Estado asignado por el sistema (CA 6)

- DADO un sector nuevo con datos válidos
- CUANDO se guarda
- ENTONCES queda en estado `HABILITADO`
- Y si el cuerpo de la petición incluye `estado`, el sistema responde 422 porque ese campo no se recibe

#### Escenario: Descripción que supera el máximo

- DADO una descripción de 201 caracteres
- CUANDO intento guardar
- ENTONCES el sector NO se registra y se informa que la descripción supera el máximo

#### Escenario: Nombre recortado

- DADO el nombre «  Terraza  »
- CUANDO se guarda
- ENTONCES el sector se registra con el nombre «Terraza»
