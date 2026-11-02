# Delta para reservas-gestion (HU-M5-01-02-03)

## Propósito

Alta, consulta por id, modificación (fecha, hora y cantidad de personas) y listado paginado de reservas, con sus reglas de validación, el estado inicial `ACTIVA`, la consulta de las mesas disponibles para una fecha y hora y el contrato del puente con Mesa y Cliente. Entidades del diagrama de clases: `Reserva`, `EstadoReserva`; relaciones con `Mesa` (1 - 0..*) y `Cliente` (1 - `Reserva`).

La mesa de una reserva ya no se escribe por su número: la persona la elige de una lista de mesas disponibles para la fecha y la hora (issue #61, HU-M5-01). Por eso el lado Mesa del puente consulta a M3 de verdad. El lado Cliente sigue siendo un stub hasta que M4 exponga Cliente.

Capacidad nueva: en `openspec/specs/` no hay ninguna spec de reservas, así que todo el contenido es `ADDED`, también los requisitos que se reescribieron o se agregaron por el issue #61 (la capacidad todavía no se archivó). No modifica `salon-mesas` ni ninguna otra capacidad.

Origen: HU-M5-01 (crear), HU-M5-02 (modificar) y HU-M5-03 (listar), un solo cambio, una rama y un PR.

Fuera de alcance: cancelación anticipada (HU-M5-04) y por ausencia (HU-M5-05), comanda desde la reserva (HU-M5-06) y reporte (HU-M5-07). Ninguna ruta de este cambio asigna `ATENDIDA`, `CANCELADA_ANTICIPADA` ni `CANCELADA_POR_AUSENCIA`: esos valores existen en el enumerado y en la base para los cambios posteriores. También queda fuera el criterio «cliente no registrado» del issue #61: depende de M4, que todavía no ofrece ni la búsqueda ni el alta de un cliente, y Cliente sigue siendo un número en el modal.

Criterios de aceptación (CA): salvo el texto de la mesa del issue #61, no se leyeron los issues. Los CA se numeran en esta spec a partir de la propuesta (consigna, diagrama de clases, S1-07, S2-02 y maqueta) y se citan como «HU-M5-0x CA n». Lo que dice el issue #61 sobre la mesa se cita como «issue #61». Hay que confirmar los CA contra cada issue antes del PR.

Convención de los escenarios: salvo que se indique otra cosa, «hoy» es `2026-10-28` y la hora actual de la zona del restaurante (S28) son las `14:30`. El cliente 7 existe, porque el stub de cliente da por válido todo id positivo (S20). Las mesas salen de un doble de prueba del puente (S20) que ofrece solo dos: las mesas 5 y 6, ambas del sector «Salón», con `numero` igual a su `id`, capacidad 4 y estado `LIBRE`. Una mesa que el doble no ofrece (por ejemplo la 99 o la 123) no existe. Los escenarios que dicen «un puente que informa…», o que nombran otras mesas, otro estado, otro sector u otra capacidad, cambian lo que el doble ofrece. Los escenarios que dicen «el puente real» usan el puente de verdad sobre una base de prueba con mesas creadas en M3 (S33). «La lista» de un escenario es la respuesta de `GET /reservas/mesas-disponibles`.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `POST /reservas` | JSON `ReservaCrear` | 201, `ReservaSalida` | 404, 409, 422 |
| `GET /reservas/{id}` | id entero en la ruta | 200, `ReservaSalida` | 404, 422 |
| `PUT /reservas/{id}` | JSON `ReservaModificar` | 200, `ReservaSalida` | 404, 409, 422 |
| `GET /reservas?limit&offset&fecha&estado` | parámetros de consulta, todos opcionales | 200, `Pagina[ReservaSalida]`, orden ascendente por `fecha`, `hora` e `id` | 422 |
| `GET /reservas/mesas-disponibles?fecha&hora` | parámetros de consulta, los dos obligatorios: `fecha` (`YYYY-MM-DD`) y `hora` (`HH:MM`) | 200, lista de `MesaDisponible` sin paginar (S29), orden ascendente por nombre del sector, `numero` e `id` | 422 |

No hay ruta de baja ni de cancelación (HU-M5-04 y HU-M5-05).

La ruta `GET /reservas/mesas-disponibles` DEBE declararse de modo que `GET /reservas/{id}` no la capture: pedirla responde la lista y no un 422 por un `id` que no es entero.

Esquemas (nombres JSON en `snake_case`; `cantidad_personas` es el `cantidadPersonas` del diagrama, S14):

- `ReservaCrear`: `mesa_id: int` (> 0), `cliente_id: int` (> 0), `fecha: date`, `hora: time`, `cantidad_personas: int` (> 0). Los cinco son obligatorios. Los campos extra están prohibidos (S15).
- `ReservaModificar`: `fecha: date`, `hora: time`, `cantidad_personas: int` (> 0). Los tres son obligatorios (S19). Los campos extra están prohibidos (S15).
- `ReservaSalida`: `id: int`, `fecha: date` (`YYYY-MM-DD`), `hora` (`HH:MM`), `cantidad_personas: int`, `estado: ACTIVA | ATENDIDA | CANCELADA_ANTICIPADA | CANCELADA_POR_AUSENCIA`, `mesa_id: int`, `cliente_id: int`. No incluye nombres de mesa ni de cliente (S23).
- `MesaDisponible` (nombre de referencia): `id: int`, `numero: int`, `capacidad: int`, `sector: {id: int, nombre: str}`. No incluye el estado de la mesa. La respuesta es una lista de `MesaDisponible`, no una `Pagina[T]` (S29).
- `Pagina[T]`: `items`, `total`, `limit` (por defecto 50, mínimo 1, máximo 100), `offset` (por defecto 0, mínimo 0) según D-27, con `backend/app/shared/paginacion.py`.

Parámetros del listado: `fecha` (día exacto, `YYYY-MM-DD`) y `estado` (uno de los cuatro valores de `EstadoReserva`, con esa capitalización). Valores inválidos responden 422 (S22).

Mensajes de negocio de referencia (S18): 404 «La reserva {id} no existe», «La mesa {id} no existe» y «El cliente {id} no existe»; 409 «La mesa {mesa_id} ya tiene una reserva activa el {fecha} a las {hora}», «La mesa {id} está fuera de servicio» (S31) y «La reserva {id} no está activa y no se puede modificar»; 422 «La fecha de la reserva no puede ser anterior a hoy» y «La hora de la reserva debe ser posterior a la hora actual». Los 422 de forma usan el manejador global existente (`Datos invalidos. <campo>: <mensaje>`), que nombra cada campo inválido.

Orden de validación (S17):

- Alta: 422 de forma, 404 de mesa, 409 de mesa fuera de servicio, 404 de cliente, 422 de fecha, 422 de hora y 409 de conflicto.
- Modificación: 422 de forma, 404 de la reserva, 409 por no estar `ACTIVA`, 422 de fecha, 422 de hora y 409 de conflicto. No consulta al puente (S27).
- Mesas disponibles: 422 de forma (falta `fecha` u `hora`, o su formato es inválido), 422 de fecha y 422 de hora. Usa los mismos mensajes que el alta (S32).

## Datos

Tabla `reservas`, creada por una sola migración nueva con `down_revision = a8c0e2b4d6f8`:

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

El `service` de `reservas` consulta a Mesa y a Cliente solo a través de un puente propio del módulo (nombres de referencia, el diseño los fija). El `service` DEBE llamar a cada operación como `puente.<operación>(...)`, para que las pruebas puedan sustituirla.

| Operación | Entrada | Resultado |
| --- | --- | --- |
| `obtener_mesa` | `mesa_id: int` | La mesa con su `id` y su `estado` (`LIBRE`, `OCUPADA` o `FUERA_DE_SERVICIO`), o ausencia si la mesa no existe. |
| `listar_mesas` | ninguna | Todas las mesas, cada una con `id`, `numero`, `capacidad`, `sector` (`id` y `nombre`) y `estado`, en el orden de M3: nombre del sector, `numero` e `id`. Incluye las mesas `FUERA_DE_SERVICIO`: descartarlas es una regla de `reservas`, no del puente. |
| `existe_cliente` | `cliente_id: int` | `true` si el cliente existe; `false` si no. |

La capacidad que informa `listar_mesas` sirve solo para mostrarla en el selector de mesas: la cantidad de personas no se valida contra ella (S5).

Implementación incluida en este cambio:

- Lado Mesa (real, S33): `obtener_mesa` y `listar_mesas` DEBEN consultar a M3 solo con `app.modules.salon.service.listar_mesas`, sin importar de `salon` ni su `router`, ni su `repository`, ni sus `models`, ni sus `schemas` (contrato de importación RNF-MAN-09), y sin modificar `salon`. Esa consulta es paginada (100 por página como máximo), no filtra por estado y no busca por `id`; por eso el puente DEBE leer todas las páginas, y `obtener_mesa` y `listar_mesas` DEBEN responder lo mismo para la misma mesa.
- Lado Cliente (stub, S6, S20): todo cliente con id positivo existe. La implementación real (llamada al `service` de M4) queda para un cambio posterior y no debe exigir cambios en las reglas de esta spec.
- El puente no participa en la regla de doble reserva: esa regla usa solo la tabla `reservas`.

Doble de prueba (S20): sustituye al puente en las pruebas del `service` y de la API, sin usar la base de M3. Un doble DEBE ofrecer las tres operaciones con la forma de la tabla. Lo que `obtener_mesa` informa de una mesa DEBE coincidir con lo que `listar_mesas` ofrece de esa misma mesa (mismo `estado`). Una mesa que el doble no ofrece no existe. Para los escenarios, el doble por defecto es el de la «Convención de los escenarios».

## ADDED Requirements

### Requisito: Crear una reserva activa (HU-M5-01 CA 1)

El sistema DEBE crear una reserva con `mesa_id`, `cliente_id`, `fecha`, `hora` y `cantidad_personas` válidos, dejarla en estado `ACTIVA` y responder 201 con la `ReservaSalida` completa y su `id`. La reserva guardada DEBE poder consultarse después con `GET /reservas/{id}` con los mismos datos.

#### Escenario: Alta válida

- DADO el doble de prueba del puente con la mesa 5 y el cliente 7, y ninguna reserva
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

El sistema DEBE consultar al puente que la mesa exista y que el cliente exista. Si el puente informa que la mesa no existe, DEBE responder 404 «La mesa {id} no existe»; si informa que el cliente no existe, 404 «El cliente {id} no existe». En ambos casos NO DEBE guardar la reserva. La mesa se verifica antes que el cliente (S17). Una mesa que existe pero está fuera de servicio se rechaza con otro error (requisito «El alta rechaza una mesa fuera de servicio»), también antes de verificar al cliente.

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

#### Escenario: Una mesa que M3 no conoce no se acepta aunque su id sea positivo

- DADO el doble de prueba del puente, que no ofrece la mesa 123
- CUANDO se hace `POST /reservas` con `mesa_id` 123 y datos válidos
- ENTONCES responde 404 con «La mesa 123 no existe» y no se crea nada (S20: ya no basta con que el id sea positivo)

#### Escenario: El stub de cliente acepta cualquier identificador positivo

- DADO el doble de prueba del puente con la mesa 5
- CUANDO se crea una reserva con `mesa_id` 5 y `cliente_id` 456
- ENTONCES responde 201 (S20; el control real de existencia del cliente se activa al conectar M4)

### Requisito: El alta rechaza una mesa fuera de servicio

`POST /reservas` con una mesa que el puente informa con estado `FUERA_DE_SERVICIO` DEBE responder 409 «La mesa {id} está fuera de servicio» y NO DEBE guardar nada. Es un conflicto con una regla de negocio (D-25, D-26) y no un error de forma (S31). Si la mesa no existe, sigue valiendo el 404 «La mesa {id} no existe». Una mesa `OCUPADA` NO DEBE rechazarse: ese estado describe el momento presente, no el turno pedido (S30). El orden de validación del alta es: forma, existencia de la mesa, mesa fuera de servicio, existencia del cliente, momento (fecha y hora) y turno libre (S17). La modificación NO consulta al puente por la mesa (S27) y no cambia.

#### Escenario: Mesa fuera de servicio

- DADO un puente que informa la mesa 6 con estado `FUERA_DE_SERVICIO`
- CUANDO se hace `POST /reservas` con `mesa_id` 6 y datos válidos
- ENTONCES responde 409 con el cuerpo `{"detalle": "La mesa 6 está fuera de servicio"}`
- Y no se crea ninguna reserva

#### Escenario: Mesa inexistente sigue siendo 404

- DADO el doble de prueba del puente, que no ofrece la mesa 99
- CUANDO se hace `POST /reservas` con `mesa_id` 99 y datos válidos
- ENTONCES responde 404 con «La mesa 99 no existe» y no se crea nada

#### Escenario: Mesa ocupada ahora, reservada para otro turno

- DADO un puente que informa la mesa 5 con estado `OCUPADA`
- CUANDO se hace `POST /reservas` con `mesa_id` 5 y datos válidos para una fecha futura
- ENTONCES responde 201 con estado `ACTIVA` (S30)

#### Escenario: La mesa fuera de servicio se rechaza antes que el cliente y que la fecha

- DADO un puente que informa la mesa 6 `FUERA_DE_SERVICIO` y que el cliente 98 no existe
- CUANDO se hace `POST /reservas` con `mesa_id` 6, `cliente_id` 98 y `fecha` `2026-10-27` (anterior a hoy)
- ENTONCES responde 409 con «La mesa 6 está fuera de servicio» (S17)

#### Escenario: Mesa fuera de servicio con datos de forma inválidos

- DADO un puente que informa la mesa 6 `FUERA_DE_SERVICIO`
- CUANDO se hace `POST /reservas` con `mesa_id` 6 y sin `fecha`
- ENTONCES responde 422 nombrando `fecha`, porque la forma se valida primero

#### Escenario: Modificar una reserva cuya mesa pasó a fuera de servicio

- DADO una reserva `ACTIVA` en la mesa 5 y un puente que ahora informa la mesa 5 `FUERA_DE_SERVICIO`
- CUANDO se hace `PUT` con una `fecha` y una `hora` válidas y libres
- ENTONCES responde 200 y la reserva cambia, porque la modificación no consulta la mesa al puente (S27)

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

La `hora` DEBE tener formato `HH:MM` (S16). Ninguna fuente define el horario de atención, por lo que el sistema NO DEBE restringir la hora a un horario (S2): cualquier hora del día es válida. Si la `fecha` es hoy, la `hora` DEBE ser posterior a la hora actual de la zona del restaurante (S28); si es igual o anterior, DEBE responder 422 «La hora de la reserva debe ser posterior a la hora actual» sin guardar (S3). La hora se compara en minutos.

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

### Requisito: «Hoy» y la hora actual se calculan en la zona del restaurante (S28)

La fecha de «hoy» y la hora actual que usan «Fecha no pasada» y «Hora válida y no pasada», tanto en el alta como en la consulta de mesas disponibles, DEBEN ser las de la zona del restaurante: UTC-3 fija. DEBEN calcularse a partir del reloj UTC del servidor y NO DEBEN depender de la zona horaria del proceso ni del contenedor (`TZ`). La función `ahora()` DEBE devolver un `datetime` sin zona con esa fecha y esa hora.

#### Escenario: El servidor ya está en el día siguiente en UTC

- DADO el reloj UTC del servidor en `2026-11-02 02:30` (en la zona del restaurante son las `2026-11-01 23:30`) y la zona del proceso en UTC
- CUANDO se crea una reserva para `2026-11-01` a las `23:45`
- ENTONCES responde 201: «hoy» es el `2026-11-01` y la hora es posterior a la actual

#### Escenario: La hora ya pasó en la zona del restaurante

- DADO el mismo reloj (`2026-11-01 23:30` en la zona del restaurante)
- CUANDO se crea una reserva para `2026-11-01` a las `23:00`
- ENTONCES responde 422 con «La hora de la reserva debe ser posterior a la hora actual» y no se crea nada

#### Escenario: Ayer en la zona del restaurante

- DADO el mismo reloj
- CUANDO se crea una reserva para `2026-10-31`
- ENTONCES responde 422 con «La fecha de la reserva no puede ser anterior a hoy» y no se crea nada

#### Escenario: No depende de la zona del proceso

- DADO el mismo instante UTC y la zona del proceso, primero en `UTC` y después en `America/Argentina/Buenos_Aires`
- CUANDO se llama a `ahora()`
- ENTONCES devuelve `2026-11-01 23:30`, sin zona, en los dos casos

#### Escenario: La consulta de mesas disponibles usa el mismo «hoy»

- DADO el mismo reloj y una mesa libre
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-01&hora=23:45`
- ENTONCES responde 200 con esa mesa en la lista

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

El sistema NO DEBE validar `cantidad_personas` contra la capacidad de la mesa, ni en el alta ni en la modificación: la capacidad se resuelve en forma presencial (issue #61). La única regla sobre la cantidad es la de «Cantidad de personas positiva» (entero estricto mayor a cero); cualquier entero positivo, por grande que sea, DEBE aceptarse. El puente informa la capacidad de cada mesa solo para mostrarla en el selector de mesas (S5): ninguna regla la compara con la cantidad de personas y ninguna respuesta del sistema DEBE rechazar una reserva por exceder la capacidad.

#### Escenario: Cantidad muy grande en el alta

- DADO el doble de prueba del puente, con la mesa 5 de capacidad 4
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

### Requisito: Mesas disponibles para una fecha y hora (issue #61)

`GET /reservas/mesas-disponibles?fecha=YYYY-MM-DD&hora=HH:MM` DEBE responder 200 con una lista simple, no paginada (S29), de las mesas que se pueden reservar en esa fecha y hora. Cada elemento DEBE traer `id`, `numero`, `capacidad` y `sector` (con `id` y `nombre`), y nada más. Una mesa DEBE figurar en la lista si su estado no es `FUERA_DE_SERVICIO` y no tiene ninguna reserva `ACTIVA` con exactamente esa `fecha` y esa `hora`:

- Una mesa `FUERA_DE_SERVICIO` NO DEBE figurar (issue #61).
- Una mesa `OCUPADA` DEBE figurar: ese estado describe el momento presente, no el turno pedido (S30).
- Una reserva `ACTIVA` de la mesa con otra hora u otra fecha NO DEBE ocultarla (no se modela duración, S4).
- Una reserva `ATENDIDA`, `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA` NO DEBE ocultarla.

La lista DEBE ordenarse de forma ascendente por nombre del sector, `numero` e `id`. Los datos de las mesas vienen del puente, que lee todas las páginas de M3 (S33). La consulta es de solo lectura.

`fecha` y `hora` son obligatorias. Si falta alguna, o su formato es inválido (los formatos de S16), DEBE responder 422 nombrando el campo. El turno pedido DEBE cumplir las mismas reglas de «no pasado» del alta (S32): una `fecha` anterior a hoy responde 422 «La fecha de la reserva no puede ser anterior a hoy» y, si la `fecha` es hoy, una `hora` igual o anterior a la actual responde 422 «La hora de la reserva debe ser posterior a la hora actual». Que no haya ninguna mesa disponible NO es un error: DEBE responder 200 con la lista vacía. La lista es una ayuda para elegir, no una reserva: no bloquea la mesa (S35).

#### Escenario: Una mesa libre figura en la lista

- DADO el doble de prueba del puente (mesas 5 y 6, ambas `LIBRE`) y ninguna reserva
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES responde 200 con una lista de dos elementos, la mesa 5 y luego la 6
- Y la mesa 5 trae exactamente `id` 5, `numero` 5, `capacidad` 4 y `sector` con su `id` y el `nombre` «Salón»

#### Escenario: Una mesa fuera de servicio no figura

- DADO un puente con la mesa 5 `LIBRE` y la mesa 6 `FUERA_DE_SERVICIO`, y ninguna reserva
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene solo la mesa 5 (issue #61: una mesa fuera de servicio no aparece entre las mesas disponibles)

#### Escenario: Una mesa con reserva activa en ese turno no figura

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene solo la mesa 6

#### Escenario: Una mesa reservada a otra hora o en otra fecha figura

- DADO el doble de prueba del puente y dos reservas `ACTIVA` en la mesa 5: una el `2026-11-02` a las `22:00` y otra el `2026-11-03` a las `21:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene las mesas 5 y 6

#### Escenario: Una reserva que no está activa no oculta la mesa

- DADO el doble de prueba del puente y tres reservas en la mesa 5, `2026-11-02`, `21:30`: una `ATENDIDA`, otra `CANCELADA_ANTICIPADA` y otra `CANCELADA_POR_AUSENCIA`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene las mesas 5 y 6

#### Escenario: Una mesa ocupada ahora figura para otro turno

- DADO un puente con la mesa 5 `OCUPADA` y la mesa 6 `LIBRE`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene las mesas 5 y 6 (S30)

#### Escenario: Falta la fecha

- DADO una solicitud con `hora=21:30` y sin `fecha`
- CUANDO se hace `GET /reservas/mesas-disponibles`
- ENTONCES responde 422 y el `detalle` nombra `fecha`

#### Escenario: Falta la hora

- DADO una solicitud con `fecha=2026-11-02` y sin `hora`
- CUANDO se hace `GET /reservas/mesas-disponibles`
- ENTONCES responde 422 y el `detalle` nombra `hora`

#### Escenario: Formato de fecha inválido

- DADO una `hora` válida (`hora=21:30`)
- CUANDO se hace `GET /reservas/mesas-disponibles`, cada vez con una `fecha` distinta: `02/11/2026` y `2026-13-40`
- ENTONCES cada pedido responde 422 con un detalle que nombra el campo `fecha`

#### Escenario: Formato de hora inválido

- DADO una `fecha` válida y posterior a hoy (`fecha=2026-11-02`)
- CUANDO se hace `GET /reservas/mesas-disponibles`, cada vez con una `hora` distinta: `25:00`, `9pm` y `21:30:45` (los segundos distintos de cero no se aceptan, S16)
- ENTONCES cada pedido responde 422 con un detalle que nombra el campo `hora`

#### Escenario: Fecha anterior a hoy

- DADO que hoy es `2026-10-28`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-10-27&hora=21:30`
- ENTONCES responde 422 con «La fecha de la reserva no puede ser anterior a hoy»

#### Escenario: Hoy con una hora igual o anterior a la actual

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-10-28&hora=14:30`, y por separado con `hora=13:00`
- ENTONCES ambas responden 422 con «La hora de la reserva debe ser posterior a la hora actual»

#### Escenario: Turnos válidos que se parecen a los rechazados

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-10-28&hora=14:31`, y por separado con `fecha=2026-10-29&hora=13:00`
- ENTONCES ambas responden 200 (la regla de la hora solo aplica cuando la fecha es hoy)

#### Escenario: Todas las mesas están reservadas en ese turno

- DADO el doble de prueba del puente y una reserva `ACTIVA` en cada una de las mesas 5 y 6, `2026-11-02`, `21:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES responde 200 con la lista vacía

#### Escenario: Ninguna mesa puede reservarse

- DADO un puente con la mesa 5 y la mesa 6, ambas `FUERA_DE_SERVICIO`, y otro caso en el que el puente no ofrece ninguna mesa
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES los dos casos responden 200 con la lista vacía

#### Escenario: Orden por sector, número e id

- DADO un puente con la mesa 12 (sector «Terraza», número 1), la mesa 15 (sector «Salón», número 2) y la mesa 14 (sector «Salón», número 1), todas `LIBRE`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista trae las mesas en el orden 14, 15 y 12

#### Escenario: El mismo número en sectores distintos

- DADO un puente con la mesa 14 (sector «Salón», número 1) y la mesa 12 (sector «Terraza», número 1)
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista trae las dos mesas, distintas por su `id` y por el `nombre` de su sector

#### Escenario: La ruta no se confunde con la consulta por id

- DADO la API en marcha
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES responde 200 con la lista y no un 422 por un `id` no entero
- Y `GET /reservas/abc` sigue respondiendo 422 y `GET /reservas/1` sigue consultando la reserva 1

#### Escenario: Reservar una mesa la saca de la lista

- DADO el doble de prueba del puente y la lista de `2026-11-02` a las `21:30` con las mesas 5 y 6
- CUANDO se crea una reserva en la mesa 5 para `2026-11-02` a las `21:30` y se vuelve a pedir la lista
- ENTONCES la lista contiene solo la mesa 6

#### Escenario: La consulta no modifica datos

- DADO reservas existentes y un puente con mesas
- CUANDO se hace `GET /reservas/mesas-disponibles` con una `fecha` y una `hora` válidas
- ENTONCES las reservas no cambian y no se crea ninguna

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

- DADO el doble de prueba del puente y una reserva `ACTIVA` con 4 personas en la mesa 5 (capacidad 4)
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

El `service` de `reservas` DEBE depender solo del puente definido en «Contrato del puente Mesa y Cliente», llamándolo como `puente.<operación>(...)`, y NO DEBE importar nada de `salon` ni de `atencion`. Solo el puente PUEDE importar de `salon`, y únicamente `app.modules.salon.service`. El lado Mesa del puente DEBE ser real: consulta a M3 solo con `listar_mesas` de ese `service` y lee todas sus páginas (S33). El lado Cliente PUEDE seguir siendo el stub de S20 hasta que M4 exponga Cliente. El módulo DEBE poder sustituir el puente por un doble de prueba sin cambiar las reglas de esta spec ni los contratos de la API. La existencia de la mesa y del cliente viene solo del puente; la tabla no tiene claves foráneas hacia Mesa ni Cliente (S10).

#### Escenario: El stub de cliente acepta identificadores positivos

- DADO el lado Cliente del puente (stub)
- CUANDO se consulta el cliente 7, el cliente 456 y el cliente 0
- ENTONCES el 7 y el 456 existen y el 0 no existe

#### Escenario: El puente real encuentra una mesa de M3

- DADO el puente real y una mesa creada en M3 con `LIBRE` como estado
- CUANDO se hace `POST /reservas` con el `id` de esa mesa y datos válidos
- ENTONCES responde 201

#### Escenario: El puente real no encuentra una mesa que M3 no tiene

- DADO el puente real y ninguna mesa con `id` 999 en M3
- CUANDO se hace `POST /reservas` con `mesa_id` 999 y datos válidos
- ENTONCES responde 404 con «La mesa 999 no existe» y no se crea nada

#### Escenario: El puente real conserva el estado de la mesa

- DADO el puente real, una mesa de M3 en estado `FUERA_DE_SERVICIO` y otra `LIBRE`
- CUANDO se pide la lista de mesas disponibles y se hace `POST /reservas` sobre la mesa fuera de servicio
- ENTONCES la lista trae solo la mesa `LIBRE` y el alta responde 409 «La mesa {id} está fuera de servicio»

#### Escenario: El puente real lee todas las páginas de M3

- DADO el puente real y 120 mesas `LIBRE` creadas en M3, sin ninguna reserva
- CUANDO se hace `GET /reservas/mesas-disponibles` con una `fecha` y una `hora` válidas
- ENTONCES la lista trae las 120 mesas, también las que M3 devuelve después de su primera página de 100
- Y `POST /reservas` con el `id` de la última mesa del listado de M3 (la número 120) responde 201

#### Escenario: M3 falla mientras el puente lee sus páginas

- DADO el puente real, 120 mesas `LIBRE` en M3 y una consulta a M3 que falla al leer la segunda página
- CUANDO se hace `GET /reservas/mesas-disponibles` con una `fecha` y una `hora` válidas
- ENTONCES responde un error del servidor (500) y NO devuelve una lista parcial con las 100 mesas de la primera página
- Y `POST /reservas` en las mismas condiciones responde un error del servidor (500) y no crea ninguna reserva
- Y el puente NO captura el error ni completa la lectura con lo que alcanzó a leer

#### Escenario: Puente de reemplazo sin la mesa

- DADO una implementación alternativa que informa que la mesa 5 no existe
- CUANDO se crea una reserva en la mesa 5
- ENTONCES responde 404 «La mesa 5 no existe»

#### Escenario: Un doble de prueba con tres operaciones alcanza

- DADO un doble del puente que ofrece `obtener_mesa`, `listar_mesas` y `existe_cliente`, sin base de M3
- CUANDO se crea una reserva y se pide la lista de mesas disponibles
- ENTONCES ambas operaciones responden según lo que el doble ofrece, y `obtener_mesa` y `listar_mesas` coinciden en el estado de cada mesa

#### Escenario: El conflicto de mesa no depende del puente

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
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

Una sola migración Alembic nueva, con `down_revision = a8c0e2b4d6f8`, DEBE crear la tabla `reservas` con sus restricciones y su `downgrade()` DEBE borrarla. Tras aplicarla, `alembic heads` DEBE mostrar un único head. Los `models` de `reservas` DEBEN estar registrados en `backend/alembic/env.py` (RNF-MAN-06).

#### Escenario: Subir, bajar y subir otra vez

- DADA una base en `a8c0e2b4d6f8`
- CUANDO se ejecuta `upgrade head`, `downgrade a8c0e2b4d6f8` y `upgrade head`
- ENTONCES los tres pasos terminan sin error
- Y tras `upgrade head` existe `reservas` con sus restricciones, y tras `downgrade` no existe

#### Escenario: Un solo head

- DADO el repositorio con la migración nueva
- CUANDO se ejecuta `alembic heads`
- ENTONCES muestra un único head, el de la migración de reservas

### Requisito: Aislamiento del módulo y sin regresión de M3 (AGENTS.md, sección 9.3)

El cambio NO DEBE modificar el código de `salon/`, de `atencion/` ni de `shared/` (backend y frontend), ni los contratos de importación de `backend/pyproject.toml`. Fuera de M5, las únicas modificaciones DEBEN ser la migración nueva y el registro del `router` en `backend/app/main.py`. Tampoco DEBE modificar las pruebas de otros módulos: sus pruebas de migración ya usan revisiones fijas y no dependen del head, y la rama conserva la versión de `develop` de esos archivos.

#### Escenario: Contratos de importación

- DADO el módulo `reservas` terminado
- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos
- Y `reservas` no importa nada de `atencion` y, de `salon`, solo importa `app.modules.salon.service`, y solo desde el puente

#### Escenario: Pruebas de migración de M3

- DADO la nueva revisión sobre `a8c0e2b4d6f8`
- CUANDO se ejecuta `pytest backend/tests/modules/salon/test_migracion.py`
- ENTONCES las pruebas pasan, porque no dependen del head actual

#### Escenario: Sin cambios en módulos ajenos

- DADO el conjunto de archivos modificados por el cambio
- CUANDO se revisa
- ENTONCES no hay cambios en `backend/app/modules/salon/`, `backend/app/modules/atencion/`, `frontend/src/modules/salon/`, `frontend/src/modules/atencion/`, `frontend/src/App.tsx` ni en `shared/`, ni en las pruebas de esos módulos

### Requisito: Listado de reservas en pantalla (HU-M5-03)

La ruta `/reservas`, que ya existe, DEBE mostrar una sola pantalla con el navegador de fecha y la tabla de las reservas del día elegido. El formulario de alta y edición NO DEBE mostrarse al costado de la tabla: DEBE abrirse en un modal sobre la misma pantalla, construido con el componente `Dialog` compartido (`frontend/src/shared/components/ui/dialog.tsx`), según la regla general de formularios de AGENTS.md (sección 5) y no según la maqueta `SPRINT-2/S2-04-maqueta/reservas.html`, que los muestra en una página aparte (S24). La tabla DEBE tener las columnas Hora, Cliente, Personas, Mesa, Estado y acciones, y mostrar Cliente y Mesa como «Cliente n.º {cliente_id}» y «Mesa n.º {mesa_id}» (S6, S13, S23). La acción «Modificar reserva» DEBE aparecer solo en las filas `ACTIVA`. La pantalla DEBE ofrecer el botón «Nueva reserva», no mostrar ningún modal abierto al entrar y paginar con `limit` 50 y `offset` de la API. Solo puede haber un modal de reserva abierto a la vez: mientras el modal de edición está abierto, el botón «Nueva reserva» DEBE verse pero estar deshabilitado, así que no se puede abrir el de alta hasta cerrar la edición (S36). Toda llamada DEBE pasar por el `api.ts` del módulo. El módulo NO DEBE agregar rutas ni modificar `frontend/src/App.tsx`.

#### Escenario: Tabla con reservas

- DADO reservas `ACTIVA` del día que devuelve la API
- CUANDO se abre `/reservas`
- ENTONCES se muestra una fila por reserva con hora, «Cliente n.º 7», personas, «Mesa n.º 5» y estado

#### Escenario: Modal cerrado al entrar

- DADO la ruta `/reservas` recién abierta
- CUANDO se muestra la pantalla
- ENTONCES no hay ningún modal abierto y se ve el botón «Nueva reserva»

#### Escenario: Acción solo para activas

- DADO una reserva `ACTIVA` y otra `ATENDIDA` en la tabla
- CUANDO se muestran las filas
- ENTONCES solo la `ACTIVA` ofrece «Modificar reserva»

#### Escenario: Abrir el modal de edición

- DADO una fila `ACTIVA` con id 1
- CUANDO la persona pulsa «Modificar reserva»
- ENTONCES se abre el modal «Modificar reserva» con los datos de esa fila
- Y la ruta sigue siendo `/reservas` y no se pide `GET /reservas/1`

#### Escenario: Abrir el modal de alta

- DADO la pantalla de reservas
- CUANDO la persona pulsa «Nueva reserva»
- ENTONCES se abre el modal «Nueva reserva» con los campos vacíos y la ruta sigue siendo `/reservas`

#### Escenario: El botón «Nueva reserva» se deshabilita durante la edición

- DADO el modal de edición abierto
- CUANDO se muestra la pantalla detrás del modal
- ENTONCES el botón «Nueva reserva» está deshabilitado (S36)
- Y pulsarlo no hace nada: el modal de edición sigue abierto, con sus datos, y no se abre un segundo modal

#### Escenario: El botón «Nueva reserva» se habilita de nuevo al cerrar la edición

- DADO el modal de edición abierto y el botón «Nueva reserva» deshabilitado
- CUANDO la persona cierra el modal de edición, con o sin guardar
- ENTONCES el botón «Nueva reserva» vuelve a estar habilitado

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

El botón «Nueva reserva» DEBE abrir, como modal sobre la misma pantalla y sin cambiar de ruta, el modal «Nueva reserva», construido con el componente `Dialog` compartido (`frontend/src/shared/components/ui/dialog.tsx`): el título «Nueva reserva» (`title` del `Dialog`), los campos Cliente (número), Fecha, Hora, Cantidad de personas y Mesa (selector) en el cuerpo del modal, y los botones «Cancelar» y «Guardar reserva» en el pie del modal (`footer`). El propio `Dialog` ya ofrece su botón de cerrar (la X); el modal NO necesita un botón «Cerrar formulario» aparte, igual que `MesaFormDialog` y `ClienteFormDialog` (AGENTS.md, sección 5). Mientras M4 no expone clientes, Cliente se pide por su identificador (S13). Antes de enviar, el modal DEBE validar localmente y mostrar bajo cada campo qué falla: Cliente entero positivo; Fecha obligatoria y no anterior a hoy; Hora obligatoria y, si la fecha es hoy, posterior a la hora actual (S3); Cantidad de personas entero positivo; Mesa obligatoria, es decir, una mesa elegida de la lista. Si hay algún error local, NO DEBE llamar a la API. Al guardar bien, DEBE enviar `POST /reservas`, mostrar un aviso de éxito, cerrar el modal y recargar la tabla. Si la API responde 404, 409 o 422, DEBE mostrar el `detalle` como error general del modal, conservar los datos escritos (también la mesa elegida) y dejar el modal abierto. Cerrar el modal con la X, con la tecla Escape, haciendo clic en el fondo (fuera del modal) o con el botón «Cancelar» DEBE tener el mismo efecto: cerrar sin guardar y sin volver a pedir la tabla de reservas.

El campo Mesa DEBE ser un selector que se llena con `GET /reservas/mesas-disponibles`, pedido por el `api.ts` del módulo, y no un número escrito a mano (S13, S34):

- La lista se pide cuando Fecha y Hora pasan la validación local. Mientras alguna no la pase, el selector queda deshabilitado, sin opciones y sin pedir la lista.
- Cada opción DEBE leerse «Sector · Mesa N (capacidad personas)», por ejemplo «Salón · Mesa 5 (4 personas)», y su valor DEBE ser el `id` de la mesa. Ese `id` es el `mesa_id` que se envía.
- Mientras la lista se carga, el selector DEBE estar deshabilitado y mostrar «Cargando mesas…» como única opción.
- Si la lista llega vacía, DEBE mostrar «No hay mesas disponibles para esa fecha y hora» y el botón «Guardar reserva» DEBE quedar deshabilitado.
- Si la consulta falla, DEBE mostrar el mensaje de error de la API junto al campo Mesa y no ofrecer mesas.
- Al cambiar Fecha u Hora, DEBE volver a pedir la lista. Si la mesa elegida ya no figura en la lista nueva, DEBE borrar la elección; si todavía figura, DEBE conservarla.
- La lista mostrada DEBE corresponder siempre a la Fecha y la Hora que el modal tiene en ese momento.

La lista es una ayuda: la API vuelve a verificar la mesa al guardar (S35). El modal solo usa la API de reservas para esto; no importa nada del módulo de M3 (S34). No se agregan estilos nuevos: se reutilizan los componentes compartidos existentes.

#### Escenario: Campos vacíos

- DADO el modal de alta con algún campo vacío, incluida la mesa sin elegir
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y cada campo vacío, también Mesa, muestra un mensaje de obligatorio

#### Escenario: Cantidad inválida

- DADO el modal de alta con la cantidad de personas `0`, o con un texto no numérico
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y se advierte que la cantidad debe ser un entero positivo

#### Escenario: Cliente inválido

- DADO el modal de alta con Cliente `0`, o con un texto no numérico
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y Cliente advierte que debe ser un entero positivo

#### Escenario: Mesa sin elegir

- DADO el modal de alta con todos los campos válidos, la lista de mesas cargada y ninguna mesa elegida
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y Mesa advierte que es obligatoria

#### Escenario: Fecha anterior a hoy

- DADO que hoy es el `2026-11-02` y el modal con `fecha` `2026-11-01`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y el campo Fecha advierte que no puede ser anterior a hoy

#### Escenario: Hoy con una hora pasada o igual a la actual

- DADO que hoy es el `2026-11-02`, son las `12:00` y el modal con `fecha` `2026-11-02` y `hora` `11:30`, o `12:00`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y el campo Hora advierte que debe ser posterior a la hora actual

#### Escenario: Hoy con una hora posterior

- DADO que hoy es el `2026-11-02`, son las `12:00` y el modal con `fecha` `2026-11-02`, `hora` `12:01` y los demás campos válidos, incluida una mesa elegida
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía la solicitud

#### Escenario: El selector se llena con las mesas disponibles

- DADO el modal de alta con `fecha` `2026-11-02` y `hora` `21:30`, y una API que devuelve la mesa 5 (sector «Salón», número 5, capacidad 4) y la mesa 12 (sector «Terraza», número 1, capacidad 2)
- CUANDO el modal tiene Fecha y Hora válidas
- ENTONCES se pide `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- Y el selector ofrece las opciones «Salón · Mesa 5 (4 personas)» y «Terraza · Mesa 1 (2 personas)», con los valores 5 y 12

#### Escenario: El mismo número en sectores distintos se distingue

- DADO una API que devuelve la mesa 14 (sector «Salón», número 1, capacidad 4) y la mesa 12 (sector «Terraza», número 1, capacidad 2)
- CUANDO se llena el selector
- ENTONCES las opciones son «Salón · Mesa 1 (4 personas)» con valor 14 y «Terraza · Mesa 1 (2 personas)» con valor 12, y no hay dos opciones iguales

#### Escenario: El selector espera una fecha y una hora válidas

- DADO el modal de alta recién abierto, o con `fecha` anterior a hoy, o con `hora` vacía
- CUANDO se muestra el selector de Mesa
- ENTONCES está deshabilitado, sin opciones, y no se pidió `GET /reservas/mesas-disponibles`

#### Escenario: Estado de carga de la lista

- DADO el modal con Fecha y Hora válidas y una API que todavía no respondió
- CUANDO se muestra el selector de Mesa
- ENTONCES el selector está deshabilitado y su única opción dice «Cargando mesas…», sin ninguna mesa para elegir
- Y el botón «Guardar reserva» sigue habilitado, pero pulsarlo no envía nada y marca el error de Mesa obligatoria (S34)

#### Escenario: Sin mesas disponibles

- DADO el modal con Fecha y Hora válidas y una API que devuelve la lista vacía
- CUANDO termina de cargar
- ENTONCES el selector muestra «No hay mesas disponibles para esa fecha y hora»
- Y el botón «Guardar reserva» está deshabilitado

#### Escenario: Cambiar la fecha o la hora recarga la lista y borra la mesa que ya no está

- DADO el modal con `fecha` `2026-11-02`, `hora` `21:30` y la mesa 5 elegida
- CUANDO la persona cambia `hora` a `22:00` y la API devuelve una lista sin la mesa 5
- ENTONCES se pide `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=22:00`
- Y el selector muestra la lista nueva y la elección queda vacía

#### Escenario: Cambiar la fecha o la hora conserva la mesa que sigue disponible

- DADO el modal con `fecha` `2026-11-02`, `hora` `21:30` y la mesa 5 elegida
- CUANDO la persona cambia `hora` a `22:00` y la API devuelve una lista que incluye la mesa 5
- ENTONCES se pide la lista de nuevo y la mesa 5 sigue elegida

#### Escenario: Una respuesta vieja no pisa a la nueva

- DADO el modal con `fecha` `2026-11-02` y `hora` `21:30`, y la consulta de ese turno todavía sin responder
- CUANDO la persona cambia `hora` a `22:00`, se pide la lista del turno nuevo y la respuesta del turno viejo llega después que la del nuevo
- ENTONCES el selector muestra la lista del turno de las `22:00`
- Y la respuesta del turno de las `21:30` se descarta, aunque haya llegado última

#### Escenario: Falla la consulta de la lista

- DADO el modal con Fecha y Hora válidas para el navegador y una API que responde 422 con «La hora de la reserva debe ser posterior a la hora actual» al pedir las mesas disponibles (el navegador puede estar en otra zona horaria que la del restaurante)
- CUANDO termina la consulta
- ENTONCES se muestra ese mensaje junto al campo Mesa y el selector no ofrece mesas

#### Escenario: Alta correcta

- DADO el modal de alta completo con datos válidos y la mesa 5 elegida de la lista
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía `POST /reservas` con `mesa_id` 5 (el `id` de la mesa elegida), `cliente_id`, `fecha`, `hora` y `cantidad_personas`
- Y se muestra el aviso de éxito, el modal se cierra y la tabla se vuelve a pedir

#### Escenario: Conflicto de mesa

- DADO el modal completo y una API que responde 409 con «La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: Mesa inexistente o fecha rechazada por la API

- DADO el modal completo y una API que responde 404 con «La mesa 99 no existe», o 422 con «La fecha de la reserva no puede ser anterior a hoy»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra el mensaje, conserva los datos y sigue abierto

#### Escenario: Mesa fuera de servicio rechazada por la API

- DADO el modal completo con la mesa 6 elegida y una API que responde 409 con «La mesa 6 está fuera de servicio» (la mesa cambió de estado después de pedir la lista)
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: Cancelar o cerrar el alta

- DADO el modal de alta con datos escritos
- CUANDO la persona pulsa «Cancelar», la X del modal, la tecla Escape o hace clic en el fondo (fuera del modal)
- ENTONCES el modal se cierra sin guardar, la ruta sigue siendo `/reservas`, no se envía ninguna solicitud y la tabla no se vuelve a pedir

#### Escenario: Cerrar mientras se guarda (S38)

- DADO el modal de alta con «Guardar reserva» ya pulsado y la solicitud `POST /reservas` todavía sin responder
- CUANDO la persona cierra el modal con la X, Escape, el fondo o «Cancelar» antes de que la solicitud termine
- ENTONCES la solicitud sigue en curso: no se cancela
- Y cuando termine, sea cual sea el resultado, NO muestra el aviso de éxito, NO recarga la tabla y NO toca el modal que esté abierto en ese momento, aunque sea uno distinto abierto después

#### Escenario: Una respuesta de guardado tardía no cierra un modal distinto

- DADO que se cerró un modal de edición con un `PUT` todavía sin responder y después se abrió el modal «Nueva reserva»
- CUANDO el `PUT` tardío termina bien
- ENTONCES el modal «Nueva reserva» sigue abierto, con sus datos intactos, y la tabla no se recarga por esa respuesta

#### Escenario: Lo mismo al revés, con un alta tardía

- DADO que se cerró el modal «Nueva reserva» con un `POST` todavía sin responder y después se abrió el modal de edición de otra fila
- CUANDO el `POST` tardío termina bien
- ENTONCES el modal de edición sigue abierto, con sus datos intactos, y la tabla no se recarga por esa respuesta

### Requisito: Formulario de edición (HU-M5-02)

La acción «Modificar reserva» de una fila `ACTIVA` DEBE abrir el mismo modal (el mismo `Dialog`), sin cambiar de ruta, con el título «Modificar reserva» y los datos de esa fila; el frontend NO necesita pedir `GET /reservas/{id}` (S24). Cliente y Mesa DEBEN verse deshabilitados y no validarse: en la edición Mesa NO es el selector del alta, sigue siendo un campo de solo lectura con el identificador de la fila y NO pide la lista de mesas disponibles. La persona solo puede cambiar Fecha, Hora y Cantidad de personas, con la misma validación local del alta. Al guardar DEBE enviar `PUT /reservas/{id}` con exactamente `fecha`, `hora` y `cantidad_personas`; si termina bien, mostrar un aviso de éxito, cerrar el modal y recargar la tabla. Si la API responde 404, 409 o 422, DEBE mostrar el `detalle` como error general del modal, conservar los datos y dejar el modal abierto. Cerrar el modal con la X, con Escape, haciendo clic en el fondo o con «Cancelar» cierra sin guardar y sin pedir la reserva de nuevo, igual que en el alta.

#### Escenario: Modal con los datos actuales

- DADO una fila `ACTIVA` de la mesa 5 y el cliente 7
- CUANDO la persona pulsa «Modificar reserva»
- ENTONCES el modal «Modificar reserva» trae Fecha, Hora y Cantidad de personas de la fila
- Y Cliente y Mesa muestran 7 y 5 deshabilitados
- Y no se pidió `GET /reservas/mesas-disponibles`

#### Escenario: Modificación correcta

- DADO el modal de edición con una cantidad nueva
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía `PUT /reservas/{id}` con exactamente `fecha`, `hora` y `cantidad_personas`
- Y se muestra el aviso de éxito, el modal se cierra y la tabla se vuelve a pedir

#### Escenario: Misma validación local que el alta

- DADO el modal de edición con una `fecha` anterior a hoy, o con la cantidad `0`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía el `PUT` y el campo correspondiente muestra qué falla

#### Escenario: Conflicto al modificar

- DADO una API que responde 409 con «La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30»
- CUANDO la persona guarda
- ENTONCES el modal muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: La reserva dejó de estar activa

- DADO el modal de edición de una reserva que, mientras tanto, pasó a `ATENDIDA`
- CUANDO la persona guarda y la API responde 409 «La reserva {id} no está activa y no se puede modificar»
- ENTONCES el modal muestra ese mensaje y sigue abierto

#### Escenario: La reserva ya no existe

- DADO el modal de edición de la reserva 999, que dejó de existir
- CUANDO la persona guarda y el `PUT` responde 404 «La reserva 999 no existe»
- ENTONCES el modal muestra ese mensaje como error general, conserva los datos y sigue abierto

#### Escenario: Cancelar la edición

- DADO el modal de edición con cambios sin guardar
- CUANDO la persona pulsa «Cancelar», la X del modal, Escape o hace clic en el fondo (fuera del modal)
- ENTONCES el modal se cierra sin guardar, no se envía el `PUT` y la tabla no se vuelve a pedir

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

Los supuestos S1 a S14 son los de la propuesta, con la misma numeración. S15 en adelante son nuevos de esta spec. Por el issue #61 se reescribieron S4, S5, S9, S10, S13, S17, S20 y S23 (sin cambiar su número) y se agregaron S29 a S35. Por la regla general de modales de AGENTS.md (sección 5) se reescribieron además S24 y S34 (sin cambiar su número, el panel lateral pasa a ser un modal) y se agregaron S36, S37 y S38. Todos están marcados `Supuesto:` para que el equipo los valide (AGENTS.md, sección 9.2).

- Supuesto: S1. Estado inicial `ACTIVA`. Lo dicen el diagrama de clases, S2-02 y la maqueta. Contradicción de fuentes: S1-07 (CP-HU-M5-01) usa `PENDIENTE`. Se sigue el diagrama porque manda en nombres y valores; el equipo tiene que validarlo y corregir S1-07.
- Supuesto: S2. Horario de atención: ninguna fuente lo define, así que no se restringe la hora de la reserva (vale cualquier hora del día). Si el equipo define un horario, se agrega como validación 422 en un cambio posterior.
- Supuesto: S3. Fecha y hora pasadas: `fecha` tiene que ser hoy o posterior (diagrama `{>= hoy}`). Si `fecha` es hoy, `hora` tiene que ser posterior a la hora actual de la zona del restaurante (S28). Si no se cumple, responde 422. La hora se maneja en minutos (sin segundos).
- Supuesto: S4. Mesa «disponible» para una fecha y hora: la mesa existe según el puente, su estado en M3 no es `FUERA_DE_SERVICIO` y no tiene otra reserva `ACTIVA` con la misma fecha y hora exactas. El estado `OCUPADA` no la excluye (S30). No se modela duración. Cambio respecto de la propuesta: la primera versión de S4 decía que no se modelaba el estado de la mesa; el issue #61 dice que una mesa fuera de servicio no es una mesa disponible y gana sobre esa versión (AGENTS.md, sección 2).
- Supuesto: S5. Capacidad: resuelto por el issue #61 (HU-M5-01), que dice «Cantidad de personas (obligatoria): número entero mayor a cero. El sistema no la valida contra la capacidad de la mesa (se resuelve en forma presencial)». La cantidad de personas no se valida contra la capacidad de la mesa; se resuelve en forma presencial. S1-07 pedía `cantidadPersonas <= capacidad`, pero el issue manda sobre esa guía (AGENTS.md §2). La capacidad que devuelve `listar_mesas` del puente se usa solo para mostrarla en el selector de mesas; ninguna regla la compara con la cantidad de personas y no existe una respuesta 422 por capacidad excedida.
- Supuesto: S6. Cliente: se identifica por `cliente_id` entero. El stub da por válido cualquier id positivo hasta que M4 exponga Cliente. S1-07 no menciona al cliente; el diagrama sí (Cliente 1 - Reserva).
- Supuesto: S7. Modificar: solo se puede modificar una reserva `ACTIVA` (si no, 409). Se modifican `fecha`, `hora` y `cantidad_personas`. Se revalidan S3 y S4 sin contar la propia reserva. La mesa y el cliente no cambian (diagrama). No hay control de concurrencia: gana la última modificación.
- Supuesto: S8. Listado: paginado (D-27); filtros opcionales `fecha` (día exacto) y `estado`; orden ascendente por `fecha`, `hora` e `id`. Sin filtros, la API devuelve todas las reservas. El frontend arranca con el filtro de estado `ACTIVA`.
- Supuesto: S9. Códigos de error: 404 si la reserva no existe, y también si la mesa o el cliente indicados no existen según el puente. 409 si hay conflicto con otra reserva `ACTIVA`, si se intenta modificar una reserva que no está `ACTIVA` o si la mesa está fuera de servicio (S31). 422 para errores de validación (fecha u hora pasadas, `cantidad_personas <= 0`). Igual criterio que M1 y M3.
- Supuesto: S10. Sin claves foráneas: la tabla `clientes` no existe (M4 vacío) y `reservas` no declara claves foráneas hacia Mesa ni Cliente, aunque la mesa se consulte a M3 por el puente. La integridad referencial la cubre el puente; las FK se agregan con una migración posterior, cuando M3 y M4 estén integrados.
- Supuesto: S11. Fechas en el frontend: `formatearFecha` (`frontend/src/shared/lib/format.ts`) muestra el día anterior en UTC-3 con fechas `YYYY-MM-DD`. M5 formatea sus fechas dentro del módulo, sin tocar `shared/`, y se avisa al equipo para corregir la función compartida.
- Supuesto: S12. Insignia de estado: `StatusBadge` no conoce los estados de `EstadoReserva`. M5 asigna el texto y la variante dentro del módulo, sin modificar `shared/`.
- Supuesto: S13. Selección de mesa y cliente en el formulario: la Mesa se elige de la lista de mesas disponibles que arma la propia API de reservas a partir de M3 (issue #61), porque el `numero` de una mesa es único solo dentro de su sector (`ux_mesas_sector_numero`) y pedirlo a mano es ambiguo. Mientras M4 no exponga clientes, el Cliente se pide por su identificador. Las diferencias con la maqueta se anotan en el PR.
- Supuesto: S14. Nombre del atributo: la HU dice «comensales» y el diagrama `cantidadPersonas`. En el código se usa `cantidad_personas` / `cantidadPersonas` (gana el diagrama); en la pantalla dice «Cantidad de personas» (maqueta) o «Personas» en la tabla.
- Supuesto: S15. Los cuerpos de `ReservaCrear` y `ReservaModificar` prohíben campos extra (como `MesaCrear` de HU-M3-05): `estado` e `id` en el alta, y `mesa_id`, `cliente_id`, `estado` e `id` en la modificación responden 422 en lugar de ignorarse.
- Supuesto: S16. Formatos y tipos de la API: `fecha` en `YYYY-MM-DD` y `hora` en `HH:MM` (una hora con segundos distintos de cero responde 422; la respuesta siempre usa `HH:MM`). `cantidad_personas`, `mesa_id` y `cliente_id` son enteros estrictos mayores a cero (sin decimales, texto ni booleanos). El formato `DD/MM/AAAA` de S1-07 es solo de pantalla.
- Supuesto: S17. Orden de validación: el de «Contrato de la API». En el alta: forma, existencia de la mesa, mesa fuera de servicio, existencia del cliente, fecha, hora y turno libre. Un dato inválido nunca deja cambios parciales.
- Supuesto: S18. Los textos de los mensajes de negocio son los de referencia de «Contrato de la API»; el diseño puede ajustar el redactado sin cambiar el código de estado ni la clave `detalle`.
- Supuesto: S19. `PUT /reservas/{id}` exige los tres campos modificables (`fecha`, `hora`, `cantidad_personas`); no se ofrece una modificación parcial (`PATCH`).
- Supuesto: S20. Puente y pruebas. El lado Mesa del puente es real y consulta a M3 (S33); una mesa con id positivo ya no existe por el solo hecho de serlo. El lado Cliente sigue siendo un stub: todo cliente con id positivo existe. Por eso las pruebas usan un doble de prueba del puente (ver «Convención de los escenarios») con las mesas que cada escenario necesita, y los 404 de mesa o de cliente se prueban con una implementación alternativa del puente.
- Supuesto: S21. Un mismo cliente PUEDE tener varias reservas `ACTIVA`, incluso en la misma fecha y hora en mesas distintas. La única regla de conflicto es la de mesa, fecha y hora (diagrama).
- Supuesto: S22. En el listado, `estado` distingue mayúsculas y minúsculas (`activa` responde 422, como en `GET /productos` y `GET /secciones`); `fecha` usa `YYYY-MM-DD`; el filtro de fecha acepta cualquier día, también pasado, a diferencia del alta.
- Supuesto: S23. `ReservaSalida` y la tabla de pantalla traen `mesa_id` y `cliente_id` y no nombres de mesa, sector, cliente ni teléfono. Este cambio no modifica `ReservaSalida` ni la tabla: mostrar el sector y el número de la mesa en el listado queda para un cambio posterior. La tabla muestra «Mesa n.º {mesa_id}» con el `id` interno de la mesa, que puede no coincidir con su `numero` (el selector del alta muestra el sector y el número). La maqueta muestra Cliente, Teléfono y Mesa con texto: la diferencia se anota en el PR.
- Supuesto: S24. El frontend es una sola pantalla: `ReservasPage` en la ruta `/reservas`, que ya existe. El alta y la edición se abren en un modal sobre esa misma pantalla, con el componente `Dialog` compartido (`frontend/src/shared/components/ui/dialog.tsx`), porque AGENTS.md (sección 5) pide que «los formularios de alta y edición se abren en un modal sobre la misma página», como ya hacen `MesaFormDialog`, `SectorFormDialog`, `ClienteFormDialog`, `ProductoFormDialog` y `MedioPagoFormDialog`. Cambio respecto de la propuesta: la maqueta `SPRINT-2/S2-04-maqueta/reservas.html` muestra el alta y la edición en una página aparte y con un panel lateral, pero esa regla general de AGENTS.md gana sobre la maqueta (AGENTS.md, sección 2: la maqueta tiene la prioridad más baja de todas las fuentes). No se agregan rutas ni se modifica `frontend/src/App.tsx` ni ningún archivo compartido. La edición parte de los datos de la fila, así que el frontend no usa `GET /reservas/{id}` (la ruta existe en el backend porque la pide HU-M5-02).
- Supuesto: S25. Fecha y filtros de la pantalla, según la maqueta: la tabla muestra las reservas de un día, que arranca en hoy (fecha local del navegador), con los botones «Día anterior» y «Día siguiente», el campo «Día» y el botón «Hoy». El estado arranca en `ACTIVA` (S8) y el selector ofrece además «Todas». Cambiar de día vuelve a la página 1. El día se maneja como texto `YYYY-MM-DD` (S11).
- Supuesto: S26. Los textos de los estados vacío y de error de la tabla son los de «Estados vacío y error del listado». El aviso de éxito del modal es un toast del sistema de avisos compartido, sin modificarlo.
- Supuesto: S27. Al modificar, el `service` no revalida que la mesa o el cliente existan, porque no cambian, y tampoco consulta al puente.
- Supuesto: S28. «Hoy» y «hora actual» son la fecha y la hora de la zona del restaurante: UTC-3 fija (Argentina no usa horario de verano desde 2009), calculadas a partir del reloj UTC del servidor. No dependen de `TZ` del proceso ni del contenedor. Reemplaza al supuesto anterior, «la hora local del servidor»: el 2026-10-31 se comprobó que Docker corre en UTC sin `TZ`, y eso rechazaba con 422 las reservas de las próximas 3 horas. La zona es una constante del módulo, sin variable de entorno ni dependencia nueva (se usa un desplazamiento fijo y no `zoneinfo`, que necesita la base de zonas del sistema). Las pruebas fijan el reloj para los escenarios con fecha de hoy.
- Supuesto: S29. La lista de mesas disponibles es una lista simple, sin paginar (no es una `Pagina[T]`). Un selector tiene que mostrar todas las mesas posibles, y un restaurante tiene muchas menos mesas que el tope de una página (100). Por eso la respuesta no trae `total`, `limit` ni `offset`.
- Supuesto: S30. El estado `OCUPADA` de una mesa no la excluye de la lista ni del alta. `OCUPADA` describe el momento presente (hay clientes sentados ahora) y no dice nada sobre el turno que se reserva para otra fecha u hora. Solo `FUERA_DE_SERVICIO` excluye. Si se reserva para hoy una mesa que ahora está ocupada, se acepta y el salón lo resuelve en el momento.
- Supuesto: S31. Una mesa fuera de servicio en el alta responde 409 «La mesa {id} está fuera de servicio» y no 422. Se trata como un conflicto con una regla de negocio, igual que la doble reserva (D-25, D-26): los datos enviados están bien formados, pero el estado de la mesa impide la reserva. 422 queda para datos mal formados o fechas y horas pasadas. El issue #61 pide que no se cree la reserva y que se avise; no fija el código.
- Supuesto: S32. La consulta de mesas disponibles reutiliza las reglas de «no pasado» del alta (S3) con los mismos mensajes 422: un turno que no se podría reservar tampoco tiene mesas disponibles. La consulta de fechas pasadas del listado (S22) es otra cosa y no cambia.
- Supuesto: S33. El puente lee todas las páginas de `listar_mesas` del `service` de M3 y a partir de esa lectura resuelve `obtener_mesa` y `listar_mesas`. Es lo único que M3 ofrece (páginas de hasta 100, orden por sector, `numero` e `id`, sin filtro por estado ni búsqueda por `id`) y `reservas` no puede cambiar `salon` (AGENTS.md, sección 9.3). Cada alta y cada consulta de mesas disponibles leen todas las mesas; con las decenas de mesas de un restaurante el costo es aceptable. Si M3 agrega una búsqueda por `id` o un filtro por estado, se cambia el cuerpo del puente sin tocar las reglas.
- Supuesto: S34. Selector de mesa del modal. La lista se pide solo con Fecha y Hora válidas. La opción se escribe «Sector · Mesa N (capacidad personas)», con «personas» también cuando la capacidad es 1. Con la lista vacía, el botón «Guardar reserva» se deshabilita; no así mientras la lista carga ni cuando falló, porque en esos casos no hay mesa elegida y la validación local de Mesa impide el envío. Cliente sigue siendo un número (M4). El modal no importa nada del módulo de M3: pide la lista a la API de reservas.
- Supuesto: S35. La lista de mesas disponibles es solo informativa: no reserva ni bloquea la mesa. Entre que se pide la lista y se guarda, otra persona puede reservar la mesa o M3 puede ponerla fuera de servicio; el alta vuelve a verificar la mesa, el estado y el turno libre y responde 404 o 409 con su mensaje, que el modal muestra como error general. Para ver la lista actualizada hay que cambiar Fecha u Hora, o cerrar y volver a abrir el modal.
- Supuesto: S36. Solo existe un modal de reserva a la vez: la pantalla guarda como mucho un modal abierto (cerrado, alta o edición de una fila), el mismo estado que ya tenía el panel lateral de la versión anterior. Mientras el modal de edición está abierto, el botón «Nueva reserva» se ve pero está deshabilitado: hay que cerrar la edición (con o sin guardar) antes de poder abrir el alta. Así nunca hay dos modales abiertos a la vez, sin cerrar en silencio cambios sin guardar; el `Dialog` compartido tampoco está pensado para montarse dos veces juntas.
- Supuesto: S37. El modal usa el tamaño por defecto del `Dialog` compartido, `size="md"` (`max-w-lg`), igual que `MesaFormDialog` y `ClienteFormDialog`. El formulario tiene solo cinco campos (Cliente, Fecha, Hora, Cantidad de personas y Mesa), con Fecha y Hora en la misma fila, así que no necesita el ancho mayor `size="lg"` que usa `ProductoFormDialog` para un formulario largo con desplazamiento interno.
- Supuesto: S38. Cerrar el modal no cancela una solicitud `POST` o `PUT` en curso: la solicitud sigue hasta el navegador, pero el formulario que la pidió se desentiende de su respuesta al desmontarse, con el mismo mecanismo que ya usa S35 para descartar una respuesta vieja de la consulta de mesas (una bandera que se apaga al desmontar). Por eso una respuesta tardía, llegue bien o mal, nunca muestra un aviso, nunca recarga la tabla y nunca toca el modal que esté abierto en ese momento, sea el mismo, ninguno o uno distinto abierto después. Antes de este ajuste, una respuesta tardía sí mostraba el aviso y recargaba la tabla aunque el modal ya estuviera cerrado, y podía cerrar un modal nuevo sin avisar; se corrige acá porque la conversión al modal lo hizo visible y el mecanismo ya existe en el propio módulo.
