# Delta para reservas-gestion (HU-M5-01-02-03)

## Propósito

Alta, consulta por id, modificación (fecha, hora y cantidad de personas) y listado paginado de reservas, con sus reglas de validación, el estado inicial `ACTIVA` y el contrato del puente con Mesa y Cliente. Entidades del diagrama de clases: `Reserva`, `EstadoReserva`; relaciones con `Mesa` (1 - 0..*) y `Cliente` (1 - `Reserva`).

Capacidad nueva: en `openspec/specs/` no hay ninguna spec de reservas, así que todo el contenido es `ADDED`. No modifica `salon-mesas` ni ninguna otra capacidad.

Origen: HU-M5-01 (crear), HU-M5-02 (modificar) y HU-M5-03 (listar), un solo cambio, una rama y un PR.

Fuera de alcance: cancelación anticipada (HU-M5-04) y por ausencia (HU-M5-05), comanda desde la reserva (HU-M5-06) y reporte (HU-M5-07). Ninguna ruta de este cambio asigna `ATENDIDA`, `CANCELADA_ANTICIPADA` ni `CANCELADA_POR_AUSENCIA`: esos valores existen en el enumerado y en la base para los cambios posteriores.

Criterios de aceptación (CA): no se leyeron los issues. Los CA se numeran en esta spec a partir de la propuesta (consigna, diagrama de clases, S1-07, S2-02 y maqueta) y se citan como «HU-M5-0x CA n». Hay que confirmarlos contra cada issue antes del PR.

Convención de los escenarios: salvo que se indique otra cosa, «hoy» es `2026-10-28`, la hora actual del servidor son las `14:30` y el puente es el stub (S20), para el cual la mesa 5 y el cliente 7 existen. Los escenarios que dicen «un puente que informa…» usan una implementación alternativa del puente.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `POST /reservas` | JSON `ReservaCrear` | 201, `ReservaSalida` | 404, 409, 422 |
| `GET /reservas/{id}` | id entero en la ruta | 200, `ReservaSalida` | 404, 422 |
| `PUT /reservas/{id}` | JSON `ReservaModificar` | 200, `ReservaSalida` | 404, 409, 422 |
| `GET /reservas?limit&offset&fecha&estado` | parámetros de consulta, todos opcionales | 200, `Pagina[ReservaSalida]`, orden ascendente por `fecha`, `hora` e `id` | 422 |

No hay ruta de baja ni de cancelación (HU-M5-04 y HU-M5-05).

Esquemas (nombres JSON en `snake_case`; `cantidad_personas` es el `cantidadPersonas` del diagrama, S14):

- `ReservaCrear`: `mesa_id: int` (> 0), `cliente_id: int` (> 0), `fecha: date`, `hora: time`, `cantidad_personas: int` (> 0). Los cinco son obligatorios. Los campos extra están prohibidos (S15).
- `ReservaModificar`: `fecha: date`, `hora: time`, `cantidad_personas: int` (> 0). Los tres son obligatorios (S19). Los campos extra están prohibidos (S15).
- `ReservaSalida`: `id: int`, `fecha: date` (`YYYY-MM-DD`), `hora` (`HH:MM`), `cantidad_personas: int`, `estado: ACTIVA | ATENDIDA | CANCELADA_ANTICIPADA | CANCELADA_POR_AUSENCIA`, `mesa_id: int`, `cliente_id: int`. No incluye nombres de mesa ni de cliente (S23).
- `Pagina[T]`: `items`, `total`, `limit` (por defecto 50, mínimo 1, máximo 100), `offset` (por defecto 0, mínimo 0) según D-27, con `backend/app/shared/paginacion.py`.

Parámetros del listado: `fecha` (día exacto, `YYYY-MM-DD`) y `estado` (uno de los cuatro valores de `EstadoReserva`, con esa capitalización). Valores inválidos responden 422 (S22).

Mensajes de negocio de referencia (S18): 404 «La reserva {id} no existe», «La mesa {id} no existe» y «El cliente {id} no existe»; 409 «La mesa {mesa_id} ya tiene una reserva activa el {fecha} a las {hora}» y «La reserva {id} no está activa y no se puede modificar»; 422 «La fecha de la reserva no puede ser anterior a hoy» y «La hora de la reserva debe ser posterior a la hora actual». Los 422 de forma usan el manejador global existente (`Datos invalidos. <campo>: <mensaje>`), que nombra cada campo inválido.

Orden de validación (S17):

- Alta: 422 de forma, 404 de mesa, 404 de cliente, 422 de fecha, 422 de hora y 409 de conflicto.
- Modificación: 422 de forma, 404 de la reserva, 409 por no estar `ACTIVA`, 422 de fecha, 422 de hora y 409 de conflicto.

## Datos

Tabla `reservas`, creada por una sola migración nueva con `down_revision = e7a9c1d3f5b7`:

| Columna | Tipo | Regla |
| --- | --- | --- |
| `id` | entero | Clave primaria, asignada por la base; no se recibe. |
| `fecha` | fecha | Obligatoria. En el alta y en la modificación, mayor o igual a hoy (S3). |
| `hora` | hora | Obligatoria. Precisión de minutos, sin segundos (S3, S16). Sin restricción de horario de atención (S2). |
| `cantidad_personas` | entero | Obligatoria. `CHECK (cantidad_personas > 0)`. |
| `estado` | `EstadoReserva` | Obligatoria. Uno de `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA`. Valor por defecto `ACTIVA`. |
| `mesa_id` | entero | Obligatoria. Sin clave foránea (S10). No cambia después del alta. |
| `cliente_id` | entero | Obligatoria. Sin clave foránea (S10). No cambia después del alta. |

Restricciones adicionales:

- Índice único parcial sobre `(mesa_id, fecha, hora)` solo para las filas con `estado = 'ACTIVA'`. Es la defensa de la base contra la doble reserva de la misma mesa (riesgo R13 de `SPRINT-0/S0-10-riesgos.md`); las filas que no están `ACTIVA` no participan.
- La migración tiene `downgrade()`, que borra la tabla de reservas.

## Contrato del puente Mesa y Cliente

El `service` de `reservas` consulta a Mesa y a Cliente solo a través de un puente propio del módulo (nombres de referencia, el diseño los fija):

| Operación | Entrada | Resultado |
| --- | --- | --- |
| `obtener_mesa` | `mesa_id: int` | La mesa con su `id`, o ausencia si la mesa no existe. No informa la capacidad: la cantidad de personas no se valida contra ella (S5). |
| `existe_cliente` | `cliente_id: int` | `true` si el cliente existe; `false` si no. |

Implementación incluida en este cambio (stub, S6, S20): toda mesa con id positivo existe; todo cliente con id positivo existe. El puente no participa en la regla de doble reserva: esa regla usa solo la tabla `reservas`. Las implementaciones reales (llamadas a los `service` de M3 y M4) quedan para un cambio posterior y no deben exigir cambios en las reglas de esta spec.

## ADDED Requirements

### Requisito: Crear una reserva activa (HU-M5-01 CA 1)

El sistema DEBE crear una reserva con `mesa_id`, `cliente_id`, `fecha`, `hora` y `cantidad_personas` válidos, dejarla en estado `ACTIVA` y responder 201 con la `ReservaSalida` completa y su `id`. La reserva guardada DEBE poder consultarse después con `GET /reservas/{id}` con los mismos datos.

#### Escenario: Alta válida

- DADO el stub del puente, la mesa 5 y el cliente 7, y ninguna reserva
- CUANDO se hace `POST /reservas` con `mesa_id` 5, `cliente_id` 7, `fecha` `2026-11-02`, `hora` `21:30` y `cantidad_personas` 4
- ENTONCES responde 201 con `id`, `estado` `ACTIVA` y los cinco datos enviados
- Y `GET /reservas/{id}` devuelve la misma reserva

#### Escenario: Alta para hoy con una hora posterior a la actual

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se crea una reserva con `fecha` `2026-10-28` y `hora` `14:31`
- ENTONCES responde 201 con estado `ACTIVA`

### Requisito: El estado lo asigna el sistema (HU-M5-01 CA 2)

El estado inicial DEBE ser `ACTIVA` (S1) y NO DEBE recibirse en el cuerpo. Si `ReservaCrear` incluye `estado` o `id`, DEBE responder 422 sin guardar nada (S15).

#### Escenario: Estado inicial

- DADO un cuerpo válido sin `estado`
- CUANDO se hace `POST /reservas`
- ENTONCES la reserva queda `ACTIVA`

#### Escenario: El cliente de la API intenta elegir el estado

- DADO un cuerpo válido que además incluye `estado: ATENDIDA`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 indicando `estado` y no se crea ninguna reserva

### Requisito: Campos obligatorios y tipos (HU-M5-01 CA 3)

Faltar `mesa_id`, `cliente_id`, `fecha`, `hora` o `cantidad_personas`, o enviar alguno con valor `null`, DEBE responder 422 sin guardar, indicando el campo. `mesa_id` y `cliente_id` DEBEN ser enteros estrictos mayores a cero; `fecha` DEBE tener el formato `YYYY-MM-DD` y `hora` el formato `HH:MM`, sin segundos distintos de cero (S16).

#### Escenario: Falta un campo obligatorio

- DADO un cuerpo sin `fecha`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422, el `detalle` nombra `fecha` y no se crea ninguna reserva

#### Escenario: Cada campo obligatorio se valida

- DADO cuerpos a los que les falta, uno por vez, `mesa_id`, `cliente_id`, `hora` o `cantidad_personas`
- CUANDO se hace `POST /reservas`
- ENTONCES cada uno responde 422 nombrando el campo faltante y no se crea nada

#### Escenario: Identificador no positivo o no entero

- DADO `mesa_id` igual a `0`, `-1`, `2.5`, `"5"` o `true`, o `cliente_id` con alguno de esos valores
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 y no se crea nada

#### Escenario: Formato de fecha u hora inválido

- DADO `fecha` `"02/11/2026"` o `"2026-13-40"`, u `hora` `"25:00"`, `"9pm"` o `"21:30:45"`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 nombrando el campo y no se crea nada

### Requisito: Mesa y cliente existentes (HU-M5-01 CA 4)

El sistema DEBE consultar al puente que la mesa exista y que el cliente exista. Si el puente informa que la mesa no existe, DEBE responder 404 «La mesa {id} no existe»; si informa que el cliente no existe, 404 «El cliente {id} no existe». En ambos casos NO DEBE guardar la reserva. La mesa se verifica antes que el cliente (S17).

#### Escenario: Mesa inexistente

- DADO un puente que informa que la mesa 99 no existe
- CUANDO se hace `POST /reservas` con `mesa_id` 99 y datos válidos
- ENTONCES responde 404 con «La mesa 99 no existe» y no se crea nada

#### Escenario: Cliente inexistente

- DADO un puente que informa que el cliente 99 no existe
- CUANDO se hace `POST /reservas` con `cliente_id` 99, una mesa existente y datos válidos
- ENTONCES responde 404 con «El cliente 99 no existe» y no se crea nada

#### Escenario: Mesa y cliente inexistentes a la vez

- DADO un puente que informa que la mesa 99 y el cliente 98 no existen
- CUANDO se hace `POST /reservas` con ambos
- ENTONCES responde 404 con «La mesa 99 no existe»

#### Escenario: El stub acepta cualquier identificador positivo

- DADO el stub del puente
- CUANDO se crea una reserva con `mesa_id` 123 y `cliente_id` 456
- ENTONCES responde 201 (S20; el control real de existencia se activa al conectar M3 y M4)

### Requisito: Fecha no pasada (HU-M5-01 CA 5)

La `fecha` DEBE ser hoy o posterior (diagrama `{>= hoy}`). Una fecha anterior a hoy DEBE responder 422 «La fecha de la reserva no puede ser anterior a hoy» sin guardar. «Hoy» es la fecha del servidor (S28).

#### Escenario: Fecha de ayer

- DADO que hoy es `2026-10-28`
- CUANDO se crea una reserva con `fecha` `2026-10-27`
- ENTONCES responde 422 con «La fecha de la reserva no puede ser anterior a hoy» y no se crea nada

#### Escenario: Fecha de hoy

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se crea una reserva con `fecha` `2026-10-28` y `hora` `20:00`
- ENTONCES responde 201

#### Escenario: Fecha futura

- DADO una `fecha` posterior a hoy
- CUANDO se crea la reserva con una hora cualquiera, incluida `00:00`
- ENTONCES responde 201

### Requisito: Hora válida y no pasada (HU-M5-01 CA 6)

La `hora` DEBE tener formato `HH:MM` (S16). Ninguna fuente define el horario de atención, por lo que el sistema NO DEBE restringir la hora a un horario (S2): cualquier hora del día es válida. Si la `fecha` es hoy, la `hora` DEBE ser posterior a la hora actual del servidor; si es igual o anterior, DEBE responder 422 «La hora de la reserva debe ser posterior a la hora actual» sin guardar (S3). La hora se compara en minutos.

#### Escenario: Hora ya pasada hoy

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se crea una reserva con `fecha` `2026-10-28` y `hora` `13:00`
- ENTONCES responde 422 con «La hora de la reserva debe ser posterior a la hora actual» y no se crea nada

#### Escenario: Hora igual a la actual hoy

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se crea una reserva con `fecha` `2026-10-28` y `hora` `14:30`
- ENTONCES responde 422

#### Escenario: La misma hora en otro día

- DADO que son las `14:30`
- CUANDO se crea una reserva con `fecha` `2026-10-29` y `hora` `13:00`
- ENTONCES responde 201, porque la regla de la hora solo aplica cuando la fecha es hoy

#### Escenario: Hora fuera de un horario comercial habitual

- DADO una `fecha` futura
- CUANDO se crea una reserva con `hora` `04:15`
- ENTONCES responde 201 (S2: no hay horario de atención definido; S1-07 la daba por inválida y el equipo tiene que validarlo)

### Requisito: Cantidad de personas positiva (HU-M5-01 CA 7)

`cantidad_personas` DEBE ser un entero estricto mayor a cero. Cero, negativos, decimales, texto y booleanos DEBEN responder 422 sin guardar. La base DEBE reforzar la regla con `CHECK (cantidad_personas > 0)`.

#### Escenario: Cantidad válida mínima

- DADO `cantidad_personas` igual a `1`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 201

#### Escenario: Cantidad cero o negativa

- DADO `cantidad_personas` igual a `0` o `-3`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 nombrando `cantidad_personas` y no se crea nada

#### Escenario: Cantidad no entera

- DADO `cantidad_personas` igual a `2.5`, `"4"` o `true`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 y no se crea nada

### Requisito: La cantidad de personas no se valida contra la capacidad de la mesa (HU-M5-01 CA 8, S5)

El sistema NO DEBE validar `cantidad_personas` contra la capacidad de la mesa, ni en el alta ni en la modificación: la capacidad se resuelve en forma presencial (issue #61). La única regla sobre la cantidad es la de «Cantidad de personas positiva» (entero estricto mayor a cero); cualquier entero positivo, por grande que sea, DEBE aceptarse. El puente NO informa la capacidad de la mesa y ninguna respuesta del sistema DEBE rechazar una reserva por exceder la capacidad.

#### Escenario: Cantidad muy grande en el alta

- DADO el stub del puente y la mesa 5
- CUANDO se hace `POST /reservas` con la mesa 5 y `cantidad_personas` 100
- ENTONCES responde 201 con `cantidad_personas` 100 y la reserva queda guardada (S5: sin control contra la capacidad)

#### Escenario: Cantidad cero sigue rechazada

- DADO `cantidad_personas` igual a `0`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 nombrando `cantidad_personas` y no se crea nada (la única validación de la cantidad es «entero mayor a cero»)

### Requisito: Mesa sin otra reserva activa (HU-M5-01 CA 9, R13)

No DEBE existir otra reserva `ACTIVA` con la misma `mesa_id`, la misma `fecha` y la misma `hora` exactas. Si existe, DEBE responder 409 «La mesa {mesa_id} ya tiene una reserva activa el {fecha} a las {hora}» sin guardar. No se modela la duración de la reserva: solo cuenta la coincidencia exacta (S4). Las reservas que no están `ACTIVA` NO DEBEN bloquear. La regla DEBE seguir valiendo cuando dos solicitudes simultáneas llegan para la misma mesa, fecha y hora: solo una DEBE crear la reserva.

#### Escenario: Segunda reserva activa en la misma mesa, fecha y hora

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra con la mesa 5, `2026-11-02`, `21:30` y otro cliente
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30»
- Y la primera reserva no cambia y no se crea la segunda

#### Escenario: Otra hora en la misma mesa

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-02`, `22:00`
- ENTONCES responde 201, porque no se modela duración

#### Escenario: Otra mesa en la misma fecha y hora

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 6, `2026-11-02`, `21:30`
- ENTONCES responde 201

#### Escenario: Otra fecha en la misma mesa y hora

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-03`, `21:30`
- ENTONCES responde 201

#### Escenario: La reserva existente no está activa

- DADO una reserva `ATENDIDA`, otra `CANCELADA_ANTICIPADA` y otra `CANCELADA_POR_AUSENCIA`, las tres en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- ENTONCES responde 201

#### Escenario: Mismo cliente en mesas distintas

- DADO una reserva `ACTIVA` del cliente 7 en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra del cliente 7 en la mesa 6, `2026-11-02`, `21:30`
- ENTONCES responde 201 (S21: la única regla de conflicto es la de mesa)

#### Escenario: Solicitudes simultáneas

- DADO que no hay reservas y dos solicitudes `POST /reservas` idénticas en mesa, fecha y hora
- CUANDO se procesan a la vez
- ENTONCES una responde 201 y la otra 409
- Y en los datos existe una sola reserva `ACTIVA` para esa mesa, fecha y hora

#### Escenario: La base rechaza el duplicado que el servicio no detectó

- DADO que la verificación previa del servicio no encuentra conflicto pero otra reserva `ACTIVA` igual se confirma antes de guardar
- CUANDO la base rechaza la inserción por el índice único parcial
- ENTONCES el servicio responde 409 con el mismo mensaje de conflicto y no queda ninguna reserva duplicada

### Requisito: Consultar una reserva (HU-M5-02)

`GET /reservas/{id}` DEBE devolver la `ReservaSalida` de la reserva en cualquier estado. Si no existe, DEBE responder 404 «La reserva {id} no existe». Un `id` que no sea entero DEBE responder 422.

#### Escenario: Reserva existente

- DADO una reserva `ACTIVA` con `id` 1
- CUANDO se hace `GET /reservas/1`
- ENTONCES responde 200 con todos sus datos

#### Escenario: Reserva que no está activa

- DADO una reserva `ATENDIDA` con `id` 2
- CUANDO se hace `GET /reservas/2`
- ENTONCES responde 200 con `estado` `ATENDIDA`

#### Escenario: Reserva inexistente

- DADO que no existe la reserva 999
- CUANDO se hace `GET /reservas/999`
- ENTONCES responde 404 con «La reserva 999 no existe»

#### Escenario: Identificador no numérico

- DADO el identificador `abc`
- CUANDO se hace `GET /reservas/abc`
- ENTONCES responde 422

### Requisito: Modificar fecha, hora y cantidad de personas (HU-M5-02 CA 1)

`PUT /reservas/{id}` DEBE aplicar `fecha`, `hora` y `cantidad_personas` nuevos a una reserva `ACTIVA` y responder 200 con la `ReservaSalida` actualizada. El cuerpo DEBE traer los tres campos (S19). No hay control de concurrencia: ante dos modificaciones sucesivas gana la última (S7).

#### Escenario: Cambio válido

- DADO una reserva `ACTIVA` en la mesa 5 para `2026-11-02`, `21:30`, 4 personas
- CUANDO se hace `PUT` con `fecha` `2026-11-03`, `hora` `22:00` y `cantidad_personas` 5
- ENTONCES responde 200 con esos tres valores
- Y `GET /reservas/{id}` y `GET /reservas` muestran los valores nuevos

#### Escenario: Cambiar un solo valor

- DADO una reserva `ACTIVA`
- CUANDO se hace `PUT` con la misma `fecha` y `hora` y otra `cantidad_personas`
- ENTONCES responde 200 con la cantidad nueva y la fecha y la hora iguales

#### Escenario: Falta un campo en el cuerpo

- DADO una reserva `ACTIVA`
- CUANDO se hace `PUT` sin `hora`
- ENTONCES responde 422 nombrando `hora` y la reserva no cambia

#### Escenario: La última modificación prevalece

- DADO una reserva `ACTIVA`
- CUANDO se hacen dos `PUT` sucesivos con `cantidad_personas` 3 y luego 5
- ENTONCES `GET /reservas/{id}` devuelve 5

### Requisito: Mesa, cliente y estado no cambian (HU-M5-02 CA 2)

La modificación NO DEBE cambiar `mesa_id`, `cliente_id`, `estado` ni `id`. Si `ReservaModificar` incluye alguno de esos campos u otro desconocido, DEBE responder 422 sin aplicar ningún cambio (S15).

#### Escenario: Intento de cambiar la mesa

- DADO una reserva `ACTIVA` en la mesa 5
- CUANDO se hace `PUT` con datos válidos y además `mesa_id` 6
- ENTONCES responde 422 indicando `mesa_id` y la reserva sigue en la mesa 5 sin cambios

#### Escenario: Intento de cambiar el cliente o el estado

- DADO una reserva `ACTIVA` del cliente 7
- CUANDO se hace `PUT` con datos válidos y además `cliente_id` 8 o `estado` `ATENDIDA`
- ENTONCES responde 422 y la reserva conserva cliente 7 y estado `ACTIVA`

#### Escenario: Mesa, cliente y estado se conservan en una modificación válida

- DADO una reserva `ACTIVA` en la mesa 5 del cliente 7
- CUANDO se modifica su fecha, hora y cantidad de personas
- ENTONCES la respuesta conserva `mesa_id` 5, `cliente_id` 7 y `estado` `ACTIVA`

### Requisito: Revalidar las reglas del alta (HU-M5-02 CA 3)

Al modificar, el sistema DEBE aplicar las mismas reglas de fecha no pasada, hora válida y no pasada y `cantidad_personas` positiva que el alta, sin compararla con la capacidad de la mesa (S5). Si algún dato es inválido, DEBE responder 422 con el mismo mensaje del alta y NO DEBE aplicar ningún cambio. No consulta si la mesa o el cliente existen (S27).

#### Escenario: Fecha pasada

- DADO una reserva `ACTIVA`
- CUANDO se hace `PUT` con `fecha` `2026-10-27`
- ENTONCES responde 422 con «La fecha de la reserva no puede ser anterior a hoy» y la reserva no cambia

#### Escenario: Hora pasada hoy

- DADO que son las `14:30` y una reserva `ACTIVA`
- CUANDO se hace `PUT` con `fecha` `2026-10-28` y `hora` `14:00`
- ENTONCES responde 422 con «La hora de la reserva debe ser posterior a la hora actual» y la reserva no cambia

#### Escenario: Cantidad no positiva

- DADO una reserva `ACTIVA`
- CUANDO se hace `PUT` con `cantidad_personas` `0`
- ENTONCES responde 422 nombrando `cantidad_personas` y la reserva no cambia

#### Escenario: Cantidad muy grande

- DADO el stub del puente y una reserva `ACTIVA` con 4 personas
- CUANDO se hace `PUT` con `cantidad_personas` 100
- ENTONCES responde 200 con `cantidad_personas` 100 y `GET /reservas/{id}` devuelve 100 (S5: sin control contra la capacidad)

### Requisito: Conflicto sin contar la propia reserva (HU-M5-02 CA 4)

Al modificar, el sistema DEBE revalidar la regla de doble reserva (S4) excluyendo la propia reserva. Si otra reserva `ACTIVA` ocupa la misma mesa, fecha y hora nuevas, DEBE responder 409 con el mensaje de conflicto del alta y no aplicar ningún cambio.

#### Escenario: Guardar los mismos valores

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se hace `PUT` con esos mismos `fecha` y `hora`
- ENTONCES responde 200, porque la reserva no choca consigo misma

#### Escenario: Mover a un horario ocupado por otra reserva activa

- DADO una reserva `ACTIVA` A en la mesa 5, `2026-11-02`, `21:30`, y otra B en la mesa 5, `2026-11-02`, `22:00`
- CUANDO se hace `PUT` sobre B con `fecha` `2026-11-02` y `hora` `21:30`
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30»
- Y A y B no cambian

#### Escenario: Mover a un horario ocupado por una reserva no activa

- DADO una reserva `ACTIVA` B en la mesa 5, `2026-11-02`, `22:00`, y otra `CANCELADA_ANTICIPADA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se hace `PUT` sobre B con `hora` `21:30`
- ENTONCES responde 200

#### Escenario: Mover a un horario libre de otra mesa

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`, y otra `ACTIVA` B en la mesa 6, `2026-11-02`, `22:00`
- CUANDO se hace `PUT` sobre B con `hora` `21:30`
- ENTONCES responde 200, porque el conflicto es por mesa

#### Escenario: El horario liberado queda disponible

- DADO una reserva `ACTIVA` B en la mesa 5, `2026-11-02`, `22:00`
- CUANDO se mueve B a `22:30` y luego se crea otra reserva en la mesa 5, `2026-11-02`, `22:00`
- ENTONCES el `PUT` responde 200 y el alta responde 201

### Requisito: Solo se modifican reservas activas (HU-M5-02 CA 5)

El sistema DEBE modificar únicamente reservas `ACTIVA`. Si la reserva está `ATENDIDA`, `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA`, DEBE responder 409 «La reserva {id} no está activa y no se puede modificar» sin aplicar cambios (S7). Una reserva `ACTIVA` cuya `fecha` ya pasó solo se puede modificar si la nueva `fecha` y `hora` cumplen las reglas del alta (S7).

#### Escenario: Reserva atendida

- DADO una reserva `ATENDIDA` con `id` 2
- CUANDO se hace `PUT /reservas/2` con datos válidos
- ENTONCES responde 409 con «La reserva 2 no está activa y no se puede modificar» y la reserva no cambia

#### Escenario: Reservas canceladas

- DADO una reserva `CANCELADA_ANTICIPADA` y otra `CANCELADA_POR_AUSENCIA`
- CUANDO se hace `PUT` sobre cada una con datos válidos
- ENTONCES ambas responden 409 y ninguna cambia

#### Escenario: Reserva activa con fecha pasada

- DADO una reserva `ACTIVA` con `fecha` `2026-10-27` (anterior a hoy)
- CUANDO se hace `PUT` con la misma `fecha` y otra `cantidad_personas`
- ENTONCES responde 422 con «La fecha de la reserva no puede ser anterior a hoy»
- Y con `fecha` `2026-10-29` responde 200

### Requisito: Reserva inexistente al modificar (HU-M5-02 CA 6)

Si la reserva no existe, `PUT /reservas/{id}` DEBE responder 404 «La reserva {id} no existe» sin crear ninguna reserva. Un `id` no entero DEBE responder 422.

#### Escenario: Modificar una reserva que no existe

- DADO que no existe la reserva 999
- CUANDO se hace `PUT /reservas/999` con datos válidos
- ENTONCES responde 404 con «La reserva 999 no existe» y no se crea nada

#### Escenario: Identificador no numérico

- DADO el identificador `abc`
- CUANDO se hace `PUT /reservas/abc`
- ENTONCES responde 422

### Requisito: Listado paginado (HU-M5-03 CA 1)

`GET /reservas` DEBE devolver `Pagina[ReservaSalida]` con `items`, `total`, `limit` y `offset`. `limit` vale 50 por defecto y 100 como máximo; `offset` vale 0 por defecto (D-27). `limit` fuera de 1 a 100 u `offset` negativo o no numérico DEBEN responder 422. `total` DEBE contar todas las reservas que cumplen los filtros, no solo las de la página.

#### Escenario: Primera página

- DADO 3 reservas
- CUANDO se hace `GET /reservas?limit=2&offset=0`
- ENTONCES `items` trae 2 reservas, `total` es 3, `limit` 2 y `offset` 0

#### Escenario: Segunda página

- DADO las mismas 3 reservas
- CUANDO se hace `GET /reservas?limit=2&offset=2`
- ENTONCES `items` trae la tercera reserva, `total` sigue siendo 3 y `offset` es 2

#### Escenario: Valores por defecto

- DADO 60 reservas
- CUANDO se hace `GET /reservas` sin parámetros
- ENTONCES `limit` es 50, `offset` es 0, `items` trae 50 y `total` es 60

#### Escenario: Paginación inválida

- DADO `limit=101`, `limit=0`, `offset=-1` u `offset=abc`
- CUANDO se hace `GET /reservas`
- ENTONCES responde 422

### Requisito: Filtros por fecha y estado (HU-M5-03 CA 2)

`GET /reservas` PUEDE filtrar por `fecha` (día exacto) y por `estado`, de forma independiente o combinada; combinados, se aplican con Y. `estado` DEBE ser uno de los cuatro valores de `EstadoReserva`, con esa capitalización (S22). Un `estado` o una `fecha` inválidos DEBEN responder 422. El filtro por `fecha` acepta cualquier día, también pasado (S22). `total` DEBE contar solo las reservas que cumplen los filtros.

#### Escenario: Filtro por estado

- DADO dos reservas `ACTIVA` y una `CANCELADA_ANTICIPADA`
- CUANDO se hace `GET /reservas?estado=ACTIVA`
- ENTONCES `items` trae solo las dos `ACTIVA` y `total` es 2

#### Escenario: Filtro por fecha

- DADO reservas el `2026-11-02` y el `2026-11-03`
- CUANDO se hace `GET /reservas?fecha=2026-11-02`
- ENTONCES `items` trae solo las del `2026-11-02`

#### Escenario: Filtros combinados

- DADO una reserva `ACTIVA` y otra `ATENDIDA` el `2026-11-02`, y una `ACTIVA` el `2026-11-03`
- CUANDO se hace `GET /reservas?fecha=2026-11-02&estado=ACTIVA`
- ENTONCES `items` trae solo la `ACTIVA` del `2026-11-02` y `total` es 1

#### Escenario: Fecha pasada en el filtro

- DADO una reserva `ATENDIDA` del `2026-10-20`
- CUANDO se hace `GET /reservas?fecha=2026-10-20`
- ENTONCES `items` trae esa reserva

#### Escenario: Estado inválido

- DADO `estado=ABIERTA` o `estado=activa`
- CUANDO se hace `GET /reservas`
- ENTONCES responde 422

#### Escenario: Fecha inválida

- DADO `fecha=02/11/2026` o `fecha=2026-13-40`
- CUANDO se hace `GET /reservas`
- ENTONCES responde 422

#### Escenario: Los filtros y la paginación juntos

- DADO 3 reservas `ACTIVA` y 2 `ATENDIDA`
- CUANDO se hace `GET /reservas?estado=ACTIVA&limit=2&offset=2`
- ENTONCES `items` trae 1 reserva y `total` es 3

### Requisito: Orden del listado (HU-M5-03 CA 3)

El listado DEBE ordenarse de forma ascendente por `fecha`, luego `hora` y luego `id` (S8), de modo que la posición de cada reserva sea determinada, también con empates.

#### Escenario: Orden por fecha y hora

- DADO reservas creadas en este orden: `2026-11-03` `10:00` (id 1), `2026-11-02` `22:00` (id 2) y `2026-11-02` `21:30` (id 3)
- CUANDO se hace `GET /reservas`
- ENTONCES `items` trae los ids 3, 2 y 1

#### Escenario: Empate de fecha y hora

- DADO dos reservas con la misma `fecha` y `hora` en mesas distintas (ids 4 y 5)
- CUANDO se hace `GET /reservas` varias veces
- ENTONCES el id 4 figura siempre antes que el 5

#### Escenario: El orden se mantiene entre páginas

- DADO 3 reservas ordenadas con ids 3, 2 y 1
- CUANDO se piden `limit=2&offset=0` y `limit=2&offset=2`
- ENTONCES las páginas traen en conjunto los ids 3, 2 y 1 en ese orden, sin repetir ni omitir

### Requisito: Listado sin filtros y sin resultados (HU-M5-03 CA 4)

Sin filtros, la API DEBE devolver todas las reservas de cualquier estado y fecha (S8). Si ninguna cumple los filtros, DEBE responder 200 con `items` vacío y `total` 0.

#### Escenario: Sin filtros

- DADO una reserva en cada uno de los cuatro estados
- CUANDO se hace `GET /reservas`
- ENTONCES `items` trae las cuatro y `total` es 4

#### Escenario: Sin reservas

- DADO que no hay reservas
- CUANDO se hace `GET /reservas`
- ENTONCES responde 200 con `items` vacío, `total` 0, `limit` 50 y `offset` 0

#### Escenario: Filtros sin coincidencias

- DADO reservas solo `ACTIVA`
- CUANDO se hace `GET /reservas?estado=ATENDIDA`
- ENTONCES responde 200 con `items` vacío y `total` 0

#### Escenario: La consulta no modifica datos

- DADO reservas en distintos estados
- CUANDO se hace `GET /reservas` con cualquier filtro
- ENTONCES las reservas no cambian

### Requisito: Formato uniforme de errores (D-25, D-26)

Toda respuesta 404, 409 o 422 de estas rutas DEBE tener el cuerpo `{"detalle": "mensaje"}`, con un texto legible en español, sin trazas, rutas internas ni SQL. Un error de negocio NO DEBE responder 200 con un campo de error.

#### Escenario: Cuerpo de cada error

- DADO un 404 (reserva inexistente), un 409 (doble reserva) y un 422 (cantidad cero)
- CUANDO se leen las tres respuestas
- ENTONCES cada una es un objeto JSON cuya única clave es `detalle`, con un texto

#### Escenario: Un error de base no filtra detalles

- DADO el rechazo de la base por el índice único parcial
- CUANDO el servicio responde
- ENTONCES el `detalle` no contiene SQL, nombres de tabla ni de índice

### Requisito: Puente con Mesa y Cliente (S6, S10, S20)

El `service` de `reservas` DEBE depender solo del puente definido en «Contrato del puente Mesa y Cliente» y NO DEBE importar nada de `salon` ni de `atencion`. El módulo DEBE incluir la implementación stub de S20 y DEBE poder sustituirla por otra sin cambiar las reglas de esta spec ni los contratos de la API. La existencia de la mesa y del cliente viene solo del puente; la tabla no tiene claves foráneas hacia Mesa ni Cliente (S10).

#### Escenario: El stub acepta identificadores positivos

- DADO el stub del puente
- CUANDO se consulta la mesa 5 y el cliente 7
- ENTONCES la mesa existe y el cliente existe

#### Escenario: Puente de reemplazo sin la mesa

- DADO una implementación alternativa que informa que la mesa 5 no existe
- CUANDO se crea una reserva en la mesa 5
- ENTONCES responde 404 «La mesa 5 no existe»

#### Escenario: El conflicto de mesa no depende del puente

- DADO el stub del puente y una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra igual
- ENTONCES responde 409, porque el conflicto se resuelve solo con la tabla `reservas`

### Requisito: Restricciones de datos (HU-M5-01 CA 7 y 9, R13)

La tabla `reservas` DEBE imponer en la base `CHECK (cantidad_personas > 0)` y el índice único parcial sobre `(mesa_id, fecha, hora)` para las filas `ACTIVA`, de modo que ni siquiera una inserción directa pueda violar esas dos reglas. El enumerado `EstadoReserva` DEBE tener exactamente los valores `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA`.

#### Escenario: Cantidad no positiva en la base

- DADO una inserción directa en `reservas` con `cantidad_personas` 0
- CUANDO se confirma
- ENTONCES la base la rechaza

#### Escenario: Segunda reserva activa igual en la base

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se inserta directamente otra `ACTIVA` igual
- ENTONCES la base la rechaza

#### Escenario: Filas no activas repetidas en la base

- DADO una reserva `ACTIVA` y otras dos, `ATENDIDA` y `CANCELADA_POR_AUSENCIA`, en la misma mesa, fecha y hora
- CUANDO se insertan directamente
- ENTONCES la base las acepta, porque el índice solo cubre las filas `ACTIVA`

#### Escenario: Valores del enumerado

- DADO el enumerado `EstadoReserva`
- CUANDO se leen sus valores
- ENTONCES son exactamente `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA`, y `PENDIENTE` (valor de S1-07) no figura (S1)

### Requisito: Migración reversible

Una sola migración Alembic nueva, con `down_revision = e7a9c1d3f5b7`, DEBE crear la tabla `reservas` con sus restricciones y su `downgrade()` DEBE borrarla. Tras aplicarla, `alembic heads` DEBE mostrar un único head. Los `models` de `reservas` DEBEN estar registrados en `backend/alembic/env.py` (RNF-MAN-06).

#### Escenario: Subir, bajar y subir otra vez

- DADA una base en `e7a9c1d3f5b7`
- CUANDO se ejecuta `upgrade head`, `downgrade e7a9c1d3f5b7` y `upgrade head`
- ENTONCES los tres pasos terminan sin error
- Y tras `upgrade head` existe `reservas` con sus restricciones, y tras `downgrade` no existe

#### Escenario: Un solo head

- DADO el repositorio con la migración nueva
- CUANDO se ejecuta `alembic heads`
- ENTONCES muestra un único head, el de la migración de reservas

### Requisito: Aislamiento del módulo y sin regresión de M3 (AGENTS.md, sección 9.3)

El cambio NO DEBE modificar el código de `salon/`, de `atencion/` ni de `shared/` (backend y frontend), ni los contratos de importación de `backend/pyproject.toml`. La única modificación fuera de M5 DEBE ser el ajuste mínimo de los dos `downgrade` relativos de `backend/tests/modules/salon/test_migracion.py`, que pasan a anclarse a la revisión de M3 en lugar de un desplazamiento atado al head, y se anota en el PR para avisar al responsable de M3.

#### Escenario: Contratos de importación

- DADO el módulo `reservas` terminado
- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos y `reservas` no importa `salon` ni `atencion`

#### Escenario: Pruebas de migración de M3

- DADO la nueva revisión sobre `e7a9c1d3f5b7`
- CUANDO se ejecuta `pytest backend/tests/modules/salon/test_migracion.py`
- ENTONCES las pruebas pasan, porque no dependen del head actual

#### Escenario: Sin cambios en módulos ajenos

- DADO el conjunto de archivos modificados por el cambio
- CUANDO se revisa
- ENTONCES no hay cambios en `backend/app/modules/salon/`, `backend/app/modules/atencion/`, `frontend/src/modules/salon/`, `frontend/src/modules/atencion/`, `frontend/src/App.tsx` ni en `shared/`, salvo el ajuste de los tests de migración de M3

### Requisito: Listado de reservas en pantalla (HU-M5-03)

La ruta `/reservas`, que ya existe, DEBE mostrar una sola pantalla con el navegador de fecha, la tabla de las reservas del día elegido y, al costado, un panel con el formulario de alta y edición, como la maqueta `SPRINT-2/S2-04-maqueta/reservas.html` (S24). La tabla DEBE tener las columnas Hora, Cliente, Personas, Mesa, Estado y acciones, y mostrar Cliente y Mesa como «Cliente n.º {cliente_id}» y «Mesa n.º {mesa_id}» (S6, S13, S23). La acción «Modificar reserva» DEBE aparecer solo en las filas `ACTIVA`. La pantalla DEBE ofrecer el botón «Nueva reserva», mostrar el panel cerrado al entrar y paginar con `limit` 50 y `offset` de la API. Toda llamada DEBE pasar por el `api.ts` del módulo. El módulo NO DEBE agregar rutas ni modificar `frontend/src/App.tsx`.

#### Escenario: Tabla con reservas

- DADO reservas `ACTIVA` del día que devuelve la API
- CUANDO se abre `/reservas`
- ENTONCES se muestra una fila por reserva con hora, «Cliente n.º 7», personas, «Mesa n.º 5» y estado

#### Escenario: Panel cerrado al entrar

- DADO la ruta `/reservas` recién abierta
- CUANDO se muestra la pantalla
- ENTONCES el panel del formulario está cerrado y se ve el botón «Nueva reserva»

#### Escenario: Acción solo para activas

- DADO una reserva `ACTIVA` y otra `ATENDIDA` en la tabla
- CUANDO se muestran las filas
- ENTONCES solo la `ACTIVA` ofrece «Modificar reserva»

#### Escenario: Abrir el panel de edición

- DADO una fila `ACTIVA` con id 1
- CUANDO la persona pulsa «Modificar reserva»
- ENTONCES se abre el panel «Modificar reserva» con los datos de esa fila
- Y la ruta sigue siendo `/reservas` y no se pide `GET /reservas/1`

#### Escenario: Abrir el panel de alta

- DADO la pantalla de reservas
- CUANDO la persona pulsa «Nueva reserva»
- ENTONCES se abre el panel «Nueva reserva» con los campos vacíos y la ruta sigue siendo `/reservas`

#### Escenario: Cambiar de página

- DADO un `total` de 60 con páginas de 50
- CUANDO la persona pasa a la página siguiente
- ENTONCES se pide `GET /reservas` con `offset` 50 y `limit` 50 y se muestran las 10 restantes

### Requisito: Navegador de fecha y filtro de estado (HU-M5-03 CA 2)

La pantalla DEBE arrancar mostrando las reservas del día de hoy, tomado de la fecha local del navegador, con el filtro de estado en `ACTIVA` (S8, S25). El navegador de fecha DEBE ofrecer los botones «Día anterior» y «Día siguiente», un campo de fecha con la etiqueta accesible «Día» y el botón «Hoy». Cada cambio de día DEBE pedir `GET /reservas` con la `fecha` del día elegido y volver a la página 1. El día se maneja como texto `YYYY-MM-DD`, sin depender de la zona horaria del navegador (S11). El selector de estado DEBE ofrecer `Activa`, `Atendida`, `Cancelada anticipada`, `Cancelada por ausencia` y «Todas»; «Todas» NO DEBE enviar `estado`. Cambiar el estado DEBE volver a pedir la primera página.

#### Escenario: Apertura en el día de hoy con estado activa

- DADO que hoy, según el navegador, es el `2026-11-02`
- CUANDO se abre `/reservas`
- ENTONCES la solicitud lleva `fecha=2026-11-02`, `estado=ACTIVA`, `limit=50` y `offset=0`
- Y el campo «Día» muestra `2026-11-02` y el selector muestra «Activa»

#### Escenario: Día siguiente y día anterior

- DADO la pantalla en el día `2026-11-02`
- CUANDO la persona pulsa «Día siguiente» y luego «Día anterior»
- ENTONCES se piden `fecha=2026-11-03` y después `fecha=2026-11-02`

#### Escenario: Cambio de día entre fin de mes y fin de año

- DADO el día `2026-10-31`, y por separado el día `2026-12-31`
- CUANDO la persona pulsa «Día siguiente»
- ENTONCES el día pasa a `2026-11-01` y a `2027-01-01`
- Y desde `2026-03-01`, «Día anterior» lleva a `2026-02-28`

#### Escenario: Elegir un día en el campo

- DADO la pantalla abierta
- CUANDO la persona elige el `2026-11-10` en el campo «Día»
- ENTONCES se pide `GET /reservas` con `fecha=2026-11-10`

#### Escenario: Volver a hoy

- DADO la pantalla en el día `2026-11-10` y que hoy es el `2026-11-02`
- CUANDO la persona pulsa «Hoy»
- ENTONCES el día pasa a `2026-11-02` y se pide `fecha=2026-11-02`

#### Escenario: Botón Hoy cerca de la medianoche

- DADO que el navegador está en UTC-3 y son las 22:00 del `2026-10-28` (ya es el 29 en UTC)
- CUANDO la persona pulsa «Hoy», o se abre la pantalla
- ENTONCES el campo «Día» muestra `2026-10-28` y la solicitud lleva `fecha=2026-10-28` (S11)

#### Escenario: Cambiar de día vuelve a la primera página

- DADO la pantalla en la segunda página (`offset` 50)
- CUANDO la persona pulsa «Día siguiente»
- ENTONCES se pide el día siguiente con `offset` 0

#### Escenario: Elegir Todas

- DADO la pantalla con el filtro en «Activa» y la segunda página abierta
- CUANDO la persona elige «Todas»
- ENTONCES se pide `GET /reservas` con la `fecha` del día y sin `estado`, con `offset` 0

### Requisito: Estado y fecha legibles en pantalla (S11, S12)

La tabla DEBE mostrar el estado de cada reserva con un texto legible y una insignia propia del módulo, sin modificar `shared/`: `ACTIVA` como «Activa», `ATENDIDA` como «Atendida», `CANCELADA_ANTICIPADA` como «Cancelada anticipada» y `CANCELADA_POR_AUSENCIA` como «Cancelada por ausencia». La variante visual sale de la maqueta. Toda fecha `YYYY-MM-DD` que el módulo muestre con formato legible DEBE verse como `DD/MM/AAAA`, armada a partir del texto y sin crear un `Date` con él, de modo que no se corra un día en ninguna zona horaria; el módulo NO DEBE usar `formatearFecha` de `shared/` (S11).

#### Escenario: Texto de cada estado

- DADO una reserva en cada uno de los cuatro estados
- CUANDO se muestra la tabla
- ENTONCES cada una lleva su texto legible

#### Escenario: Fecha en UTC-3

- DADO la zona horaria UTC-3
- CUANDO el módulo da formato a la fecha `2026-10-24`
- ENTONCES obtiene `24/10/2026`, no `23/10/2026`

#### Escenario: Fecha en UTC

- DADO la zona horaria UTC
- CUANDO el módulo da formato a la fecha `2026-10-24`
- ENTONCES obtiene `24/10/2026`

### Requisito: Formulario de alta (HU-M5-01)

El botón «Nueva reserva» DEBE abrir, al costado de la tabla y sin cambiar de ruta, el panel «Nueva reserva» con los campos Cliente (número), Fecha, Hora, Cantidad de personas y Mesa (número), el botón «Cerrar formulario» y los botones «Cancelar» y «Guardar reserva». Mientras M3 y M4 no exponen sus listados, Cliente y Mesa se piden por su identificador (S13). Antes de enviar, el panel DEBE validar localmente y mostrar bajo cada campo qué falla: Cliente y Mesa enteros positivos; Fecha obligatoria y no anterior a hoy; Hora obligatoria y, si la fecha es hoy, posterior a la hora actual (S3); Cantidad de personas entero positivo. Si hay algún error local, NO DEBE llamar a la API. Al guardar bien, DEBE enviar `POST /reservas`, mostrar un aviso de éxito, cerrar el panel y recargar la tabla. Si la API responde 404, 409 o 422, DEBE mostrar el `detalle` como error general del panel, conservar los datos escritos y dejar el panel abierto.

#### Escenario: Campos vacíos

- DADO el panel de alta con algún campo vacío
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y cada campo vacío muestra un mensaje de obligatorio

#### Escenario: Cantidad inválida

- DADO el panel de alta con la cantidad de personas `0`, o con un texto no numérico
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y se advierte que la cantidad debe ser un entero positivo

#### Escenario: Cliente o mesa inválidos

- DADO el panel de alta con Cliente `0` o Mesa `-1`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y cada campo advierte que debe ser un entero positivo

#### Escenario: Fecha anterior a hoy

- DADO que hoy es el `2026-11-02` y el panel con `fecha` `2026-11-01`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y el campo Fecha advierte que no puede ser anterior a hoy

#### Escenario: Hoy con una hora pasada o igual a la actual

- DADO que hoy es el `2026-11-02`, son las `12:00` y el panel con `fecha` `2026-11-02` y `hora` `11:30`, o `12:00`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y el campo Hora advierte que debe ser posterior a la hora actual

#### Escenario: Hoy con una hora posterior

- DADO que hoy es el `2026-11-02`, son las `12:00` y el panel con `fecha` `2026-11-02` y `hora` `12:01`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía la solicitud

#### Escenario: Alta correcta

- DADO el panel de alta completo con datos válidos
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía `POST /reservas` con `mesa_id`, `cliente_id`, `fecha`, `hora` y `cantidad_personas`
- Y se muestra el aviso de éxito, el panel se cierra y la tabla se vuelve a pedir

#### Escenario: Conflicto de mesa

- DADO el panel completo y una API que responde 409 con «La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el panel muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: Mesa inexistente o fecha rechazada por la API

- DADO el panel completo y una API que responde 404 con «La mesa 99 no existe», o 422 con «La fecha de la reserva no puede ser anterior a hoy»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el panel muestra el mensaje, conserva los datos y sigue abierto

#### Escenario: Cancelar o cerrar el alta

- DADO el panel de alta con datos escritos
- CUANDO la persona pulsa «Cancelar» o «Cerrar formulario»
- ENTONCES el panel se cierra, la ruta sigue siendo `/reservas` y no se envía ninguna solicitud

### Requisito: Formulario de edición (HU-M5-02)

La acción «Modificar reserva» de una fila `ACTIVA` DEBE abrir el mismo panel, sin cambiar de ruta, con el título «Modificar reserva» y los datos de esa fila; el frontend NO necesita pedir `GET /reservas/{id}` (S24). Cliente y Mesa DEBEN verse deshabilitados y no validarse. La persona solo puede cambiar Fecha, Hora y Cantidad de personas, con la misma validación local del alta. Al guardar DEBE enviar `PUT /reservas/{id}` con exactamente `fecha`, `hora` y `cantidad_personas`; si termina bien, mostrar un aviso de éxito, cerrar el panel y recargar la tabla. Si la API responde 404, 409 o 422, DEBE mostrar el `detalle` como error general del panel, conservar los datos y dejar el panel abierto.

#### Escenario: Panel con los datos actuales

- DADO una fila `ACTIVA` de la mesa 5 y el cliente 7
- CUANDO la persona pulsa «Modificar reserva»
- ENTONCES el panel «Modificar reserva» trae Fecha, Hora y Cantidad de personas de la fila
- Y Cliente y Mesa muestran 7 y 5 deshabilitados

#### Escenario: Modificación correcta

- DADO el panel de edición con una cantidad nueva
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía `PUT /reservas/{id}` con exactamente `fecha`, `hora` y `cantidad_personas`
- Y se muestra el aviso de éxito, el panel se cierra y la tabla se vuelve a pedir

#### Escenario: Misma validación local que el alta

- DADO el panel de edición con una `fecha` anterior a hoy, o con la cantidad `0`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía el `PUT` y el campo correspondiente muestra qué falla

#### Escenario: Conflicto al modificar

- DADO una API que responde 409 con «La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30»
- CUANDO la persona guarda
- ENTONCES el panel muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: La reserva dejó de estar activa

- DADO el panel de edición de una reserva que, mientras tanto, pasó a `ATENDIDA`
- CUANDO la persona guarda y la API responde 409 «La reserva {id} no está activa y no se puede modificar»
- ENTONCES el panel muestra ese mensaje y sigue abierto

#### Escenario: La reserva ya no existe

- DADO el panel de edición de la reserva 999, que dejó de existir
- CUANDO la persona guarda y el `PUT` responde 404 «La reserva 999 no existe»
- ENTONCES el panel muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: Cancelar la edición

- DADO el panel de edición con cambios sin guardar
- CUANDO la persona pulsa «Cancelar» o «Cerrar formulario»
- ENTONCES el panel se cierra y no se envía el `PUT`

### Requisito: Estados vacío y error del listado

La tabla DEBE mostrar «No hay reservas para los filtros elegidos.» cuando la API devuelve `items` vacío y «No se pudieron cargar las reservas.» cuando la consulta falla, con una acción para reintentar la carga (S26).

#### Escenario: Sin resultados

- DADO una API que devuelve `items` vacío y `total` 0
- CUANDO se abre `/reservas`
- ENTONCES se muestra «No hay reservas para los filtros elegidos.»

#### Escenario: Error de carga

- DADO que la consulta a la API falla
- CUANDO se abre `/reservas`
- ENTONCES se muestra «No se pudieron cargar las reservas.» con una acción para reintentar

#### Escenario: Reintentar la carga

- DADO el error de carga mostrado
- CUANDO la persona pulsa la acción para reintentar y la API responde bien
- ENTONCES se vuelve a pedir la misma consulta y se muestra la tabla

## Supuestos

Los supuestos S1 a S14 son los de la propuesta, con la misma numeración. S15 en adelante son nuevos de esta spec.

- Supuesto: S1. Estado inicial `ACTIVA`. Lo dicen el diagrama de clases, S2-02 y la maqueta. Contradicción de fuentes: S1-07 (CP-HU-M5-01) usa `PENDIENTE`. Se sigue el diagrama porque manda en nombres y valores; el equipo tiene que validarlo y corregir S1-07.
- Supuesto: S2. Horario de atención: ninguna fuente lo define, así que no se restringe la hora de la reserva (vale cualquier hora del día). Si el equipo define un horario, se agrega como validación 422 en un cambio posterior.
- Supuesto: S3. Fecha y hora pasadas: `fecha` tiene que ser hoy o posterior (diagrama `{>= hoy}`). Si `fecha` es hoy, `hora` tiene que ser posterior a la hora actual del servidor. Si no se cumple, responde 422. La hora se maneja en minutos (sin segundos).
- Supuesto: S4. Mesa «disponible»: la mesa existe según el puente y no tiene otra reserva `ACTIVA` con la misma fecha y hora exactas. No se modela duración ni el estado físico de la mesa (`LIBRE`/`OCUPADA`/`FUERA_DE_SERVICIO` de M3).
- Supuesto: S5. Capacidad: resuelto por el issue #61 (HU-M5-01), que dice «Cantidad de personas (obligatoria): número entero mayor a cero. El sistema no la valida contra la capacidad de la mesa (se resuelve en forma presencial)». La cantidad de personas no se valida contra la capacidad de la mesa; se resuelve en forma presencial. S1-07 pedía `cantidadPersonas <= capacidad`, pero el issue manda sobre esa guía (AGENTS.md §2). El puente no informa la capacidad y no existe una respuesta 422 por capacidad excedida.
- Supuesto: S6. Cliente: se identifica por `cliente_id` entero. El stub da por válido cualquier id positivo hasta que M4 exponga Cliente. S1-07 no menciona al cliente; el diagrama sí (Cliente 1 - Reserva).
- Supuesto: S7. Modificar: solo se puede modificar una reserva `ACTIVA` (si no, 409). Se modifican `fecha`, `hora` y `cantidad_personas`. Se revalidan S3 y S4 sin contar la propia reserva. La mesa y el cliente no cambian (diagrama). No hay control de concurrencia: gana la última modificación.
- Supuesto: S8. Listado: paginado (D-27); filtros opcionales `fecha` (día exacto) y `estado`; orden ascendente por `fecha`, `hora` e `id`. Sin filtros, la API devuelve todas las reservas. El frontend arranca con el filtro de estado `ACTIVA`.
- Supuesto: S9. Códigos de error: 404 si la reserva no existe, y también si la mesa o el cliente indicados no existen según el puente. 409 si hay conflicto con otra reserva `ACTIVA` o si se intenta modificar una reserva que no está `ACTIVA`. 422 para errores de validación (fecha u hora pasadas, `cantidad_personas <= 0`). Igual criterio que M1 y M3.
- Supuesto: S10. Sin claves foráneas: la tabla `clientes` no existe (M4 vacío) y el módulo es autocontenido. La integridad referencial la cubre el puente; las FK se agregan con una migración posterior, cuando M3 y M4 estén integrados.
- Supuesto: S11. Fechas en el frontend: `formatearFecha` (`frontend/src/shared/lib/format.ts`) muestra el día anterior en UTC-3 con fechas `YYYY-MM-DD`. M5 formatea sus fechas dentro del módulo, sin tocar `shared/`, y se avisa al equipo para corregir la función compartida.
- Supuesto: S12. Insignia de estado: `StatusBadge` no conoce los estados de `EstadoReserva`. M5 asigna el texto y la variante dentro del módulo, sin modificar `shared/`.
- Supuesto: S13. Selección de mesa y cliente en el formulario: mientras M3 no exponga `GET /mesas` y M4 no exponga clientes, el formulario pide la mesa y el cliente por su identificador. Las diferencias con la maqueta se anotan en el PR.
- Supuesto: S14. Nombre del atributo: la HU dice «comensales» y el diagrama `cantidadPersonas`. En el código se usa `cantidad_personas` / `cantidadPersonas` (gana el diagrama); en la pantalla dice «Cantidad de personas» (maqueta) o «Personas» en la tabla.
- Supuesto: S15. Los cuerpos de `ReservaCrear` y `ReservaModificar` prohíben campos extra (como `MesaCrear` de HU-M3-05): `estado` e `id` en el alta, y `mesa_id`, `cliente_id`, `estado` e `id` en la modificación responden 422 en lugar de ignorarse.
- Supuesto: S16. Formatos y tipos de la API: `fecha` en `YYYY-MM-DD` y `hora` en `HH:MM` (una hora con segundos distintos de cero responde 422; la respuesta siempre usa `HH:MM`). `cantidad_personas`, `mesa_id` y `cliente_id` son enteros estrictos mayores a cero (sin decimales, texto ni booleanos). El formato `DD/MM/AAAA` de S1-07 es solo de pantalla.
- Supuesto: S17. Orden de validación: el de «Contrato de la API» (forma, 404, 422 de negocio, 409). Un dato inválido nunca deja cambios parciales.
- Supuesto: S18. Los textos de los mensajes de negocio son los de referencia de «Contrato de la API»; el diseño puede ajustar el redactado sin cambiar el código de estado ni la clave `detalle`.
- Supuesto: S19. `PUT /reservas/{id}` exige los tres campos modificables (`fecha`, `hora`, `cantidad_personas`); no se ofrece una modificación parcial (`PATCH`).
- Supuesto: S20. El stub del puente da por existente toda mesa con id positivo y no informa su capacidad (S5). Por eso los 404 de mesa o cliente se prueban con una implementación alternativa del puente.
- Supuesto: S21. Un mismo cliente PUEDE tener varias reservas `ACTIVA`, incluso en la misma fecha y hora en mesas distintas. La única regla de conflicto es la de mesa, fecha y hora (diagrama).
- Supuesto: S22. En el listado, `estado` distingue mayúsculas y minúsculas (`activa` responde 422, como en `GET /productos` y `GET /secciones`); `fecha` usa `YYYY-MM-DD`; el filtro de fecha acepta cualquier día, también pasado, a diferencia del alta.
- Supuesto: S23. `ReservaSalida` y la tabla de pantalla traen `mesa_id` y `cliente_id` y no nombres de mesa, sector, cliente ni teléfono, porque el puente stub no los devuelve. La maqueta muestra Cliente, Teléfono y Mesa con texto: la diferencia se anota en el PR.
- Supuesto: S24. El frontend es una sola pantalla: `ReservasPage` en la ruta `/reservas`, que ya existe, con un panel lateral para el alta y la edición, como muestra la maqueta. No se agregan rutas ni se modifica `frontend/src/App.tsx` ni ningún archivo compartido. La edición parte de los datos de la fila, así que el frontend no usa `GET /reservas/{id}` (la ruta existe en el backend porque la pide HU-M5-02).
- Supuesto: S25. Fecha y filtros de la pantalla, según la maqueta: la tabla muestra las reservas de un día, que arranca en hoy (fecha local del navegador), con los botones «Día anterior» y «Día siguiente», el campo «Día» y el botón «Hoy». El estado arranca en `ACTIVA` (S8) y el selector ofrece además «Todas». Cambiar de día vuelve a la página 1. El día se maneja como texto `YYYY-MM-DD` (S11).
- Supuesto: S26. Los textos de los estados vacío y de error de la tabla son los de «Estados vacío y error del listado». El aviso de éxito del panel es un toast del sistema de avisos compartido, sin modificarlo.
- Supuesto: S27. Al modificar, el `service` no revalida que la mesa o el cliente existan, porque no cambian, y tampoco consulta al puente.
- Supuesto: S28. «Hoy» y «hora actual» son la fecha y la hora locales del servidor. Las pruebas fijan ese reloj para los escenarios con fecha de hoy.
