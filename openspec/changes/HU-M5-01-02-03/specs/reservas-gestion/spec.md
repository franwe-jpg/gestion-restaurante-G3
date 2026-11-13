# Delta para reservas-gestion (HU-M5-01-02-03)

## Propósito

Alta, consulta por id, modificación (fecha, hora y cantidad de personas) y listado paginado de reservas, con sus reglas de validación, el estado inicial `ACTIVA`, la consulta de las mesas disponibles para una fecha y hora y el contrato del puente con Mesa y Cliente. Entidades del diagrama de clases: `Reserva`, `EstadoReserva`; relaciones con `Mesa` (1 - 0..*) y `Cliente` (1 - `Reserva`).

La mesa de una reserva ya no se escribe por su número: la persona la elige de una lista de mesas disponibles para la fecha y la hora (issue #61, HU-M5-01). Por eso el lado Mesa del puente consulta a M3 de verdad. El cliente de la reserva también se resuelve de verdad: el lado Cliente del puente consulta a M4 y la persona elige un cliente registrado o carga uno nuevo en el mismo alta (issue #61, HU-M4-01; sección «Delta: cliente registrado o nuevo (issue #61)»).

Capacidad nueva: en `openspec/specs/` no hay ninguna spec de reservas, así que todo el contenido es `ADDED`, también los requisitos que se reescribieron o se agregaron por el issue #61 (la capacidad todavía no se archivó). No modifica `salon-mesas` ni ninguna otra capacidad.

Origen: HU-M5-01 (crear), HU-M5-02 (modificar) y HU-M5-03 (listar), un solo cambio, una rama y un PR.

Fuera de alcance: cancelación anticipada (HU-M5-04) y por ausencia (HU-M5-05), comanda desde la reserva (HU-M5-06) y reporte (HU-M5-07). Ninguna ruta de este cambio asigna `ATENDIDA`, `CANCELADA_ANTICIPADA` ni `CANCELADA_POR_AUSENCIA`: esos valores existen en el enumerado y en la base para los cambios posteriores. El criterio «cliente no registrado» del issue #61 ya no está fuera de alcance: lo cubre el delta «cliente registrado o nuevo». Siguen fuera de alcance de ese delta: mostrar el nombre del cliente en la tabla de reservas (sigue «Cliente n.º», S23), el apellido y el DNI del cliente (no figuran en HU-M4-01 ni en el diagrama de clases) y cambiar el cliente de una reserva ya creada.

Criterios de aceptación (CA): salvo el texto de la mesa del issue #61, no se leyeron los issues. Los CA se numeran en esta spec a partir de la propuesta (consigna, diagrama de clases, S1-07, S2-02 y maqueta) y se citan como «HU-M5-0x CA n». Lo que dice el issue #61 sobre la mesa se cita como «issue #61». Hay que confirmar los CA contra cada issue antes del PR.

Convención de los escenarios: salvo que se indique otra cosa, «hoy» es `2026-10-28` y la hora actual de la zona del restaurante (S28) son las `14:30`. El cliente 7 existe, porque el doble de prueba del puente lo ofrece (S20, S39); el doble registra además los clientes nuevos que se le piden, con ids a partir de 100, y valida nombre y teléfono con las reglas de M4 (S42). Las mesas salen de un doble de prueba del puente (S20) que ofrece solo dos: las mesas 5 y 6, ambas del sector «Salón», con `numero` igual a su `id`, capacidad 4 y estado `LIBRE`. Una mesa que el doble no ofrece (por ejemplo la 99 o la 123) no existe. Los escenarios que dicen «un puente que informa…», o que nombran otras mesas, otro estado, otro sector u otra capacidad, cambian lo que el doble ofrece. Los escenarios que dicen «el puente real» usan el puente de verdad sobre una base de prueba con mesas creadas en M3 (S33). «La lista» de un escenario es la respuesta de `GET /reservas/mesas-disponibles`.

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

- `ReservaCrear`: `mesa_id: int` (> 0), `fecha: date`, `hora: time`, `cantidad_personas: int` (> 0) y exactamente uno de `cliente_id: int` (estricto, > 0; cliente existente) o `cliente_nuevo: ClienteNuevo` (cliente que se registra con la reserva) (S39). Los cuatro primeros son obligatorios. Enviar los dos cliente o ninguno responde 422 nombrando el campo `cliente_id`/`cliente_nuevo`. Los campos extra están prohibidos (S15).
- `ClienteNuevo` (esquema de M5, de forma, S40): `nombre: str`, `telefono: str`, los dos obligatorios; los campos extra están prohibidos. Las reglas de contenido (nombre solo con letras y espacios, teléfono con dígitos, espacios, guiones y `+` solo al inicio, obligatoriedad) son de M4 y no se duplican en M5 (S42), con dos excepciones propias de M5: el nombre admite hasta 60 caracteres (S70) y el teléfono no admite espacios en el interior (S66).
- `ReservaModificar`: `fecha: date`, `hora: time`, `cantidad_personas: int` (> 0). Los tres son obligatorios (S19). Los campos extra están prohibidos (S15).
- `ReservaSalida`: `id: int`, `fecha: date` (`YYYY-MM-DD`), `hora` (`HH:MM`), `cantidad_personas: int`, `estado: ACTIVA | ATENDIDA | CANCELADA_ANTICIPADA | CANCELADA_POR_AUSENCIA`, `mesa_id: int`, `cliente_id: int`. No incluye nombres de mesa ni de cliente (S23).
- `MesaDisponible` (nombre de referencia): `id: int`, `numero: int`, `capacidad: int`, `sector: {id: int, nombre: str}`. No incluye el estado de la mesa. La respuesta es una lista de `MesaDisponible`, no una `Pagina[T]` (S29).
- `Pagina[T]`: `items`, `total`, `limit` (por defecto 50, mínimo 1, máximo 100), `offset` (por defecto 0, mínimo 0) según D-27, con `backend/app/shared/paginacion.py`.

Parámetros del listado: `fecha` (día exacto, `YYYY-MM-DD`) y `estado` (uno de los cuatro valores de `EstadoReserva`, con esa capitalización). Valores inválidos responden 422 (S22).

Mensajes de negocio de referencia (S18): 404 «La reserva {id} no existe», «La mesa {id} no existe» y «El cliente {id} no existe»; 409 «La mesa {mesa_id} ya tiene una reserva el {fecha} a las {hora}; cada reserva ocupa la mesa 2 horas» (`{fecha}` y `{hora}` son los de la reserva que conflicta, S69), «La mesa {id} está fuera de servicio» (S31) y «La reserva {id} no está activa y no se puede modificar»; 422 «La fecha de la reserva no puede ser anterior a hoy» y «La hora de la reserva debe ser posterior a la hora actual». Un `cliente_nuevo` con nombre o teléfono inválidos responde 422 con el mensaje de M4 (`Datos invalidos. nombre: …` o `telefono: …`), que nombra el campo. Los 422 de forma usan el manejador global existente (`Datos invalidos. <campo>: <mensaje>`), que nombra cada campo inválido.

Orden de validación (S17):

- Alta: 422 de forma (incluido «exactamente uno de `cliente_id` o `cliente_nuevo`»), 404 de mesa, 409 de mesa fuera de servicio, 404 de cliente (solo con `cliente_id`), 422 de fecha, 422 de hora, 409 de conflicto y, solo al final, el registro del `cliente_nuevo` (422 de M4 si sus datos son inválidos) y el guardado (S41).
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

- Índice único parcial sobre `(mesa_id, fecha, hora)` solo para las filas con `estado = 'ACTIVA'`. Es la defensa de la base contra la doble reserva de la misma mesa en el mismo turno exacto (riesgo R13 de `SPRINT-0/S0-10-riesgos.md`); las filas que no están `ACTIVA` no participan. Solo cubre el turno exacto: la ventana de 2 horas la verifica el `service` (S69) y no tiene una restricción equivalente en la base.
- La migración tiene `downgrade()`, que borra la tabla de reservas.

## Contrato del puente Mesa y Cliente

El `service` de `reservas` consulta a Mesa y a Cliente solo a través de un puente propio del módulo (nombres de referencia, el diseño los fija). El `service` DEBE llamar a cada operación como `puente.<operación>(...)`, para que las pruebas puedan sustituirla.

| Operación | Entrada | Resultado |
| --- | --- | --- |
| `obtener_mesa` | `mesa_id: int` | La mesa con su `id` y su `estado` (`LIBRE`, `OCUPADA` o `FUERA_DE_SERVICIO`), o ausencia si la mesa no existe. |
| `listar_mesas` | ninguna | Todas las mesas, cada una con `id`, `numero`, `capacidad`, `sector` (`id` y `nombre`) y `estado`, en el orden de M3: nombre del sector, `numero` e `id`. Incluye las mesas `FUERA_DE_SERVICIO`: descartarlas es una regla de `reservas`, no del puente. |
| `existe_cliente` | `cliente_id: int` | `true` si el cliente existe; `false` si no. Real: delega en `existe_cliente` de M4 (S39). |
| `registrar_cliente` | `nombre: str`, `telefono: str` | El `id` del cliente registrado. Delega en `registrar_cliente_para_reserva` de M4, que valida y agrega el cliente a la sesión sin confirmar ni deshacer; si los datos son inválidos propaga el error 422 de M4 (S39, S41). |

La capacidad que informa el puente sirve para mostrarla en el selector de mesas y, desde la corrección del 2026-11-11 (S67, pendiente de validación del equipo), también para validar la cantidad de personas con `obtener_mesa`. Antes la cantidad no se validaba contra ella (S5).

Implementación incluida en este cambio:

- Lado Mesa (real, S33): `obtener_mesa` y `listar_mesas` DEBEN consultar a M3 solo con `app.modules.salon.service.listar_mesas`, sin importar de `salon` ni su `router`, ni su `repository`, ni sus `models`, ni sus `schemas` (contrato de importación RNF-MAN-09), y sin modificar `salon`. Esa consulta es paginada (100 por página como máximo), no filtra por estado y no busca por `id`; por eso el puente DEBE leer todas las páginas, y `obtener_mesa` y `listar_mesas` DEBEN responder lo mismo para la misma mesa.
- Lado Cliente (real, S39; reemplaza al stub de S6 y S20): `existe_cliente` y `registrar_cliente` DEBEN consultar a M4 solo con `app.modules.atencion.service.existe_cliente` y `app.modules.atencion.service.registrar_cliente_para_reserva`, sin importar de `atencion` su `router`, su `repository`, sus `models` ni sus `schemas` (RNF-MAN-09), y sin modificar `atencion`. Ya no basta con que el id sea positivo: un cliente que M4 no tiene no existe.
- El puente no participa en la regla de la ventana de ocupación de la mesa (S69): esa regla usa solo la tabla `reservas`.

Doble de prueba (S20): sustituye al puente en las pruebas del `service` y de la API, sin usar la base de M3. Un doble DEBE ofrecer las cuatro operaciones con la forma de la tabla; `registrar_cliente` del doble guarda el cliente en una lista propia (para que las pruebas comprueben si quedó o no registrado) y valida los datos con las reglas de M4 (S42). Lo que `obtener_mesa` informa de una mesa DEBE coincidir con lo que `listar_mesas` ofrece de esa misma mesa (mismo `estado`). Una mesa que el doble no ofrece no existe. Para los escenarios, el doble por defecto es el de la «Convención de los escenarios».

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

Faltar `mesa_id`, `fecha`, `hora` o `cantidad_personas`, o enviar alguno con valor `null`, DEBE responder 422 sin guardar, indicando el campo. El cliente se indica con exactamente uno de `cliente_id` o `cliente_nuevo` (requisito «Alta con cliente existente o con cliente nuevo»); faltar ambos responde 422 nombrando el campo cliente. `mesa_id` y `cliente_id` DEBEN ser enteros estrictos mayores a cero; `fecha` DEBE tener el formato `YYYY-MM-DD` y `hora` el formato `HH:MM`, sin segundos distintos de cero (S16).

#### Escenario: Falta un campo obligatorio

- DADO un cuerpo sin `fecha`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422, el `detalle` nombra `fecha` y no se crea ninguna reserva

#### Escenario: Cada campo obligatorio se valida

- DADO cuerpos a los que les falta, uno por vez, `mesa_id`, `hora` o `cantidad_personas`, y un cuerpo sin `cliente_id` ni `cliente_nuevo`
- CUANDO se hace `POST /reservas`
- ENTONCES cada uno responde 422 nombrando el campo faltante (el último, el campo cliente) y no se crea nada

#### Escenario: Identificador no positivo o no entero

- DADO `mesa_id` igual a `0`, `-1`, `2.5`, `"5"` o `true`, o `cliente_id` con alguno de esos valores
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 y no se crea nada

#### Escenario: Formato de fecha u hora inválido

- DADO `fecha` `"02/11/2026"` o `"2026-13-40"`, u `hora` `"25:00"`, `"9pm"` o `"21:30:45"`
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 nombrando el campo y no se crea nada

### Requisito: Mesa y cliente existentes (HU-M5-01 CA 4)

El sistema DEBE consultar al puente que la mesa exista y, cuando el cuerpo trae `cliente_id`, que el cliente exista (con `cliente_nuevo` no hay nada que verificar: el cliente se registra, ver el delta). Si el puente informa que la mesa no existe, DEBE responder 404 «La mesa {id} no existe»; si informa que el cliente no existe, 404 «El cliente {id} no existe». En ambos casos NO DEBE guardar la reserva. La mesa se verifica antes que el cliente (S17). Una mesa que existe pero está fuera de servicio se rechaza con otro error (requisito «El alta rechaza una mesa fuera de servicio»), también antes de verificar al cliente.

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

#### Escenario: Un identificador positivo que M4 no conoce no se acepta

- DADO el doble de prueba del puente con la mesa 5, que no ofrece al cliente 456
- CUANDO se crea una reserva con `mesa_id` 5 y `cliente_id` 456
- ENTONCES responde 404 con «El cliente 456 no existe» y no se crea nada (S39: el stub ya no existe)

### Requisito: El alta rechaza una mesa fuera de servicio

`POST /reservas` con una mesa que el puente informa con estado `FUERA_DE_SERVICIO` DEBE responder 409 «La mesa {id} está fuera de servicio» y NO DEBE guardar nada. Es un conflicto con una regla de negocio (D-25, D-26) y no un error de forma (S31). Si la mesa no existe, sigue valiendo el 404 «La mesa {id} no existe». Una mesa `OCUPADA` NO DEBE rechazarse: ese estado describe el momento presente, no el turno pedido (S30). El orden de validación del alta es: forma, existencia de la mesa, mesa fuera de servicio, existencia del cliente, momento (fecha y hora) y turno libre, es decir, sin otra reserva dentro de la ventana de ocupación de la mesa (S17, S69). La modificación NO consulta al puente por la mesa (S27) y no cambia.

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

### Requisito: La cantidad de personas no puede superar la capacidad de la mesa (HU-M5-01 CA 8, S5, S67)

> Nota 2026-11-11 (corrección de HU-M5-01-02-03, **pendiente de validación del equipo**): esta regla **revierte** la que tenía este requisito, «La cantidad de personas no se valida contra la capacidad de la mesa» (S5, issue #61), por pedido de la responsable del módulo. El issue #61 todavía dice lo contrario («El sistema no la valida contra la capacidad de la mesa (se resuelve en forma presencial)») y debe actualizarse: lo hace una persona, no el agente. Supuesto: S67.

El sistema DEBE validar `cantidad_personas` contra la capacidad de la mesa, en el alta y en la modificación. Si la cantidad supera la capacidad, DEBE responder 409 «La mesa {mesa_id} admite hasta {capacidad} personas» (con «persona» si la capacidad es 1), con la misma excepción de negocio que la mesa fuera de servicio (S31), y NO DEBE guardar ni modificar nada. Una cantidad igual a la capacidad DEBE aceptarse. La capacidad sale de `obtener_mesa` del puente (S33): `reservas` no importa nada de `salon` ni de `atencion` fuera del puente. «Cantidad de personas positiva» sigue siendo la validación de forma (entero estricto mayor a cero).

- En el alta, la comprobación va después de la existencia de la mesa y de su estado y antes de la existencia del cliente (S17); con una mesa fuera de servicio gana el 409 de la mesa.
- En la modificación, la mesa es la de la reserva (no se edita). La comprobación va después de verificar que la reserva está `ACTIVA` y antes de la fecha y la hora. Si M3 ya no tiene esa mesa, responde 404 «La mesa {mesa_id} no existe»; el estado de la mesa no se revisa (S27).
- En el alta, el formulario DEBERÍA avisar antes de enviar con «La mesa elegida admite hasta {capacidad} personas.» bajo el campo Mesa, porque el selector ya conoce la capacidad de cada mesa. En la edición la fila no trae la capacidad, así que el aviso es el 409 de la API, que también se muestra bajo el campo Mesa. Nota 2026-11-13: antes el aviso local iba junto a Cantidad de personas y el 409, como error general; ahora ambos van bajo Mesa (S72).

#### Escenario: Cantidad muy grande en el alta

- DADO el doble de prueba del puente, con la mesa 5 de capacidad 4
- CUANDO se hace `POST /reservas` con la mesa 5 y `cantidad_personas` 100
- ENTONCES responde 409 con «La mesa 5 admite hasta 4 personas» y no se crea nada (S67; antes respondía 201, S5)

#### Escenario: Capacidad exacta en el alta

- DADO el doble de prueba del puente, con la mesa 5 de capacidad 4
- CUANDO se hace `POST /reservas` con la mesa 5 y `cantidad_personas` 4
- ENTONCES responde 201 y la reserva queda guardada

#### Escenario: Una persona más que la capacidad en el alta

- DADO el doble de prueba del puente, con la mesa 5 de capacidad 4
- CUANDO se hace `POST /reservas` con la mesa 5 y `cantidad_personas` 5
- ENTONCES responde 409 con «La mesa 5 admite hasta 4 personas» y no se crea nada

#### Escenario: Mesa de dos con ocho o quinientas personas en el alta

- DADO un puente que informa la mesa 5 con capacidad 2
- CUANDO se hace `POST /reservas` con la mesa 5 y `cantidad_personas` 8, y luego con 500
- ENTONCES las dos respuestas son 409 con «La mesa 5 admite hasta 2 personas» y no se crea nada

#### Escenario: Capacidad excedida con cliente nuevo

- DADO el doble de prueba del puente y un `cliente_nuevo` válido
- CUANDO se hace `POST /reservas` con la mesa 5 y `cantidad_personas` 5
- ENTONCES responde 409 y no se registra ningún cliente (S41)

#### Escenario: Capacidad excedida en el formulario del alta

- DADO el modal de alta con la mesa 5 elegida (capacidad 4) y `cantidad_personas` 5
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra «La mesa elegida admite hasta 4 personas.» bajo el campo Mesa (S72), sin error bajo Cantidad de personas, y no envía el `POST`

#### Escenario: Cantidad cero sigue rechazada

- DADO `cantidad_personas` igual a `0`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 nombrando `cantidad_personas` y no se crea nada (la única validación de la cantidad es «entero mayor a cero»)

### Requisito: Mesa sin otra reserva que la ocupe (HU-M5-01 CA 9, R13, S69)

Toda reserva `ACTIVA` o `ATENDIDA` ocupa su mesa durante una ventana fija de 2 horas que empieza en su `fecha` y `hora` (S69). Una reserva nueva en la mesa M, en el instante T (la `fecha` y la `hora` pedidas, combinadas), DEBE rechazarse si M ya tiene otra reserva `ACTIVA` o `ATENDIDA` en un instante E con |T − E| menor a 2 horas (comparación estricta): las 21:00 chocan con las 22:59 y no con las 23:00, y lo mismo hacia atrás (las 19:01 chocan con las 21:00 y las 19:00 no). La comparación usa instantes reales, así que también vale entre un día y el siguiente: las 23:30 del día D chocan con las 00:30 del día D+1. Las reservas `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA` NO DEBEN bloquear.

Si hay conflicto, DEBE responder 409 «La mesa {mesa_id} ya tiene una reserva el {fecha} a las {hora}; cada reserva ocupa la mesa 2 horas» sin guardar. `{fecha}` y `{hora}` son los de la reserva que conflicta, no los pedidos (coinciden cuando el turno es exactamente el mismo). El 2 sale de la constante única de la ventana (`VENTANA_DE_OCUPACION`, en el `service`) y no está escrito a mano en el texto. El mismo mensaje se usa en la verificación previa del `service` y cuando la base rechaza el duplicado exacto (R13).

La ventana tiene una sola definición, que comparten el alta, la modificación y `GET /reservas/mesas-disponibles` (requisito «Mesas disponibles para una fecha y hora»): la lista nunca ofrece una mesa que el alta rechazaría. El `repository` recibe la duración como parámetro. El índice único parcial sobre `(mesa_id, fecha, hora)` de las reservas `ACTIVA` se mantiene sin cambios y solo cubre el turno exacto; el resto de la ventana lo verifica el `service`. Si dos solicitudes simultáneas llegan para la misma mesa, fecha y hora, solo una DEBE crear la reserva. Si dos solicitudes simultáneas piden turnos distintos que se superponen, no se garantiza que una falle (S69).

#### Escenario: Segunda reserva activa en la misma mesa, fecha y hora

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra con la mesa 5, `2026-11-02`, `21:30` y otro cliente
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
- Y la primera reserva no cambia y no se crea la segunda

#### Escenario: Otra hora dentro de las 2 horas posteriores

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-02`, `22:45`, y por separado con `23:29` (119 minutos después)
- ENTONCES cada una responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas», con la hora de la reserva existente y no la de la pedida
- Y no se crea ninguna reserva nueva

#### Escenario: Otra hora dentro de las 2 horas anteriores

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-02`, `21:29`, y por separado con `19:31` (119 minutos antes)
- ENTONCES cada una responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»

#### Escenario: Justo a 2 horas de otra reserva

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-02`, `23:30`, y por separado con `19:30`
- ENTONCES cada una responde 201, porque la ventana es estricta (S69)

#### Escenario: La ventana cruza la medianoche

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `23:30`
- CUANDO se crea otra en la mesa 5, `2026-11-03`, `00:30`
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 23:30; cada reserva ocupa la mesa 2 horas»
- Y el caso inverso (reserva existente el `2026-11-03` a las `00:30` y alta el `2026-11-02` a las `23:30`) también responde 409 con la fecha y la hora de la existente
- Y con la existente a las `23:30` y el alta el `2026-11-03` a las `01:30` (exactamente 2 horas), responde 201

#### Escenario: Una reserva atendida sigue ocupando la mesa

- DADO una reserva `ATENDIDA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-02`, `22:30`
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas» (S69)

#### Escenario: Otra mesa en la misma fecha y hora

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 6, `2026-11-02`, `21:30`
- ENTONCES responde 201

#### Escenario: Otra fecha en la misma mesa y hora

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra en la mesa 5, `2026-11-03`, `21:30`
- ENTONCES responde 201

#### Escenario: La reserva existente está cancelada

- DADO una reserva `CANCELADA_ANTICIPADA` y otra `CANCELADA_POR_AUSENCIA`, las dos en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`, y por separado a las `22:30`
- ENTONCES cada una responde 201, porque una reserva cancelada libera la mesa también dentro de la ventana (S69)

#### Escenario: Mismo cliente en mesas distintas

- DADO una reserva `ACTIVA` del cliente 7 en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se crea otra del cliente 7 en la mesa 6, `2026-11-02`, `21:30`
- ENTONCES responde 201 (S21: la única regla de conflicto es la de mesa)

#### Escenario: Solicitudes simultáneas

- DADO que no hay reservas y dos solicitudes `POST /reservas` idénticas en mesa, fecha y hora
- CUANDO se procesan a la vez
- ENTONCES una responde 201 y la otra 409
- Y en los datos existe una sola reserva `ACTIVA` para esa mesa, fecha y hora
- Y esa garantía vale solo para el turno exacto: dos solicitudes simultáneas con horas distintas pero superpuestas (por ejemplo `21:30` y `22:30` en la misma mesa) pueden crearse las dos, porque el índice único no cubre la ventana y la verificación previa no ve la reserva que la otra solicitud todavía no confirmó. En SQLite, que serializa las escrituras, el margen es chico, pero no está garantizado (S69)

#### Escenario: La base rechaza el duplicado que el servicio no detectó

- DADO que la verificación previa del servicio no encuentra conflicto pero otra reserva `ACTIVA` igual en mesa, fecha y hora se confirma antes de guardar
- CUANDO la base rechaza la inserción por el índice único parcial
- ENTONCES el servicio responde 409 con el mismo mensaje de conflicto, con la fecha y la hora pedidas (que son las del turno exacto), y no queda ninguna reserva duplicada

### Requisito: Mesas disponibles para una fecha y hora (issue #61)

`GET /reservas/mesas-disponibles?fecha=YYYY-MM-DD&hora=HH:MM` DEBE responder 200 con una lista simple, no paginada (S29), de las mesas que se pueden reservar en esa fecha y hora. Cada elemento DEBE traer `id`, `numero`, `capacidad` y `sector` (con `id` y `nombre`), y nada más. Una mesa DEBE figurar en la lista si su estado no es `FUERA_DE_SERVICIO` y no está ocupada en ese turno, con la misma definición de «mesa ocupada» que usa el alta (requisito «Mesa sin otra reserva que la ocupe», S4 y S69): la mesa está ocupada si tiene una reserva `ACTIVA` o `ATENDIDA` a menos de 2 horas (estricto) del instante pedido, antes o después, también entre un día y el siguiente. La lista nunca ofrece una mesa que el alta rechazaría:

- Una mesa `FUERA_DE_SERVICIO` NO DEBE figurar (issue #61).
- Una mesa `OCUPADA` DEBE figurar: ese estado describe el momento presente, no el turno pedido (S30).
- Una reserva `ACTIVA` o `ATENDIDA` de la mesa a menos de 2 horas del turno pedido NO DEBE dejarla figurar.
- Una reserva `ACTIVA` o `ATENDIDA` de la mesa a exactamente 2 horas del turno pedido, o a más, o de otra fecha lejana NO DEBE ocultarla.
- Una reserva `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA` NO DEBE ocultarla.

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

#### Escenario: Una mesa con reserva dentro de las 2 horas no figura

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `22:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`, y por separado con la reserva a las `19:31` o a las `23:29`
- ENTONCES cada lista contiene solo la mesa 6 (S69)

#### Escenario: Una mesa con reserva atendida dentro de las 2 horas no figura

- DADO el doble de prueba del puente y una reserva `ATENDIDA` en la mesa 5, `2026-11-02`, `22:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene solo la mesa 6 (S69)

#### Escenario: Una mesa con reserva a exactamente 2 horas figura

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `23:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`, y por separado con la reserva a las `19:30`
- ENTONCES cada lista contiene las mesas 5 y 6, porque la ventana es estricta (S69)

#### Escenario: La ventana de una reserva cruza la medianoche

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `23:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-03&hora=00:30`
- ENTONCES la lista contiene solo la mesa 6
- Y con la reserva el `2026-11-03` a las `00:30` y la consulta del `2026-11-02` a las `23:30`, también contiene solo la mesa 6

#### Escenario: Una mesa reservada en otra fecha figura

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5 el `2026-11-03` a las `21:30`
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30`
- ENTONCES la lista contiene las mesas 5 y 6

#### Escenario: Una reserva cancelada no oculta la mesa

- DADO el doble de prueba del puente y dos reservas en la mesa 5, `2026-11-02`, `21:30`: una `CANCELADA_ANTICIPADA` y otra `CANCELADA_POR_AUSENCIA`
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

Al modificar, el sistema DEBE aplicar las mismas reglas de fecha no pasada, hora válida y no pasada y `cantidad_personas` positiva que el alta, y comparar la cantidad con la capacidad de la mesa de la reserva (S67; ver «La cantidad de personas no puede superar la capacidad de la mesa»). Si algún dato es inválido, DEBE responder 422 con el mismo mensaje del alta y NO DEBE aplicar ningún cambio. No consulta si el cliente existe ni el estado de la mesa (S27); desde S67 sí lee la mesa de la reserva, solo para conocer su capacidad.

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
- ENTONCES responde 409 con «La mesa 5 admite hasta 4 personas» y la reserva no cambia (S67; antes respondía 200, S5)

#### Escenario: Capacidad exacta y una persona más al modificar

- DADO el doble de prueba del puente y una reserva `ACTIVA` en la mesa 5 (capacidad 4)
- CUANDO se hace `PUT` con `cantidad_personas` 4, y luego con 5
- ENTONCES el primero responde 200 y el segundo, 409 con «La mesa 5 admite hasta 4 personas» sin cambiar la reserva

#### Escenario: Nueve personas en una mesa de capacidad 2

- DADO un puente que informa la mesa 5 con capacidad 2 y una reserva `ACTIVA` con 2 personas en esa mesa
- CUANDO se hace `PUT` con `cantidad_personas` 9
- ENTONCES responde 409 con «La mesa 5 admite hasta 2 personas» y la reserva no cambia

#### Escenario: La mesa de la reserva ya no existe en M3

- DADO una reserva `ACTIVA` en la mesa 5 y un puente que ya no ofrece esa mesa
- CUANDO se hace `PUT` con datos válidos
- ENTONCES responde 404 con «La mesa 5 no existe» y la reserva no cambia

### Requisito: Conflicto sin contar la propia reserva (HU-M5-02 CA 4)

Al modificar, el sistema DEBE revalidar la regla de la ventana de ocupación de la mesa (S4, S69) excluyendo la propia reserva, pero solo si cambian la `fecha` o la `hora` respecto de los valores guardados. Si otra reserva `ACTIVA` o `ATENDIDA` de la misma mesa queda a menos de 2 horas (estricto) de la `fecha` y `hora` nuevas, DEBE responder 409 con el mensaje de conflicto del alta, con la fecha y la hora de esa otra reserva, y no aplicar ningún cambio. Si la `fecha` y la `hora` no cambian (por ejemplo, solo cambia `cantidad_personas`), NO DEBE revisar la ventana: una reserva que ya se superponía con otra por datos anteriores a esta regla no queda bloqueada para editar los demás campos. La mesa no cambia al modificar (S27).

#### Escenario: Guardar los mismos valores

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se hace `PUT` con esos mismos `fecha` y `hora`
- ENTONCES responde 200, porque la reserva no choca consigo misma

#### Escenario: Mover dentro de la propia ventana

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`, y ninguna otra
- CUANDO se hace `PUT` con `hora` `22:30`
- ENTONCES responde 200, porque la propia reserva no cuenta para su conflicto (S69)

#### Escenario: Mover a un horario ocupado por otra reserva activa

- DADO una reserva `ACTIVA` A en la mesa 5, `2026-11-02`, `21:30`, y otra B en la mesa 5, `2026-11-02`, `23:30`
- CUANDO se hace `PUT` sobre B con `fecha` `2026-11-02` y `hora` `21:30`
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
- Y A y B no cambian

#### Escenario: Mover a un horario dentro de las 2 horas de otra reserva

- DADO una reserva `ACTIVA` A en la mesa 5, `2026-11-02`, `21:30`, y otra B en la mesa 5, `2026-11-03`, `21:30`
- CUANDO se hace `PUT` sobre B con `fecha` `2026-11-02` y `hora` `22:30`, y por separado con `19:31` o `23:29`
- ENTONCES cada pedido responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
- Y A y B no cambian

#### Escenario: Mover justo a 2 horas de otra reserva

- DADO una reserva `ACTIVA` A en la mesa 5, `2026-11-02`, `21:30`, y otra B en la mesa 5, `2026-11-03`, `21:30`
- CUANDO se hace `PUT` sobre B con `fecha` `2026-11-02` y `hora` `23:30`, y por separado con `19:30`
- ENTONCES cada pedido responde 200, porque la ventana es estricta (S69)

#### Escenario: Mover a un horario ocupado por una reserva atendida

- DADO una reserva `ATENDIDA` A en la mesa 5, `2026-11-02`, `21:30`, y una reserva `ACTIVA` B en la mesa 5, `2026-11-03`, `21:30`
- CUANDO se hace `PUT` sobre B con `fecha` `2026-11-02` y `hora` `22:30`
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas» (S69)

#### Escenario: Mover a un horario que cruza la medianoche

- DADO una reserva `ACTIVA` A en la mesa 5, `2026-11-02`, `23:30`, y otra B en la mesa 5, `2026-11-05`, `21:30`
- CUANDO se hace `PUT` sobre B con `fecha` `2026-11-03` y `hora` `00:30`
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 23:30; cada reserva ocupa la mesa 2 horas»
- Y B no cambia

#### Escenario: Mover a un horario ocupado por una reserva cancelada

- DADO una reserva `ACTIVA` B en la mesa 5, `2026-11-02`, `23:30`, y otra `CANCELADA_ANTICIPADA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se hace `PUT` sobre B con `hora` `21:30`
- ENTONCES responde 200

#### Escenario: Mover a un horario libre de otra mesa

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`, y otra `ACTIVA` B en la mesa 6, `2026-11-02`, `22:00`
- CUANDO se hace `PUT` sobre B con `hora` `21:30`
- ENTONCES responde 200, porque el conflicto es por mesa

#### Escenario: El horario liberado queda disponible

- DADO una reserva `ACTIVA` B en la mesa 5, `2026-11-02`, `22:00`
- CUANDO se mueve B a `2026-11-03` a las `22:00` y luego se crea otra reserva en la mesa 5, `2026-11-02`, `22:00`
- ENTONCES el `PUT` responde 200 y el alta responde 201

#### Escenario: Editar otro dato de una reserva que ya se superponía

- DADO una reserva `ACTIVA` A en la mesa 5, `2026-11-02`, `21:30`, y otra B en la mesa 5, `2026-11-02`, `22:00` (datos anteriores a la regla de la ventana)
- CUANDO se hace `PUT` sobre B con los mismos `fecha` y `hora` (`2026-11-02`, `22:00`) y `cantidad_personas` 6
- ENTONCES responde 200 con `cantidad_personas` 6, porque la ventana solo se revisa si cambian la fecha o la hora (S69)
- Y un `PUT` sobre B con `hora` `22:30` responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas», porque cambió la hora y sigue superpuesta

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

- DADO un 404 (reserva inexistente), un 409 (mesa ocupada por otra reserva dentro de su ventana, S69) y un 422 (cantidad cero)
- CUANDO se leen las tres respuestas
- ENTONCES cada una es un objeto JSON cuya única clave es `detalle`, con un texto

#### Escenario: Un error de base no filtra detalles

- DADO el rechazo de la base por el índice único parcial
- CUANDO el servicio responde
- ENTONCES el `detalle` no contiene SQL, nombres de tabla ni de índice

### Requisito: Puente con Mesa y Cliente (S6, S10, S20)

El `service` de `reservas` DEBE depender solo del puente definido en «Contrato del puente Mesa y Cliente», llamándolo como `puente.<operación>(...)`, y NO DEBE importar nada de `salon` ni de `atencion`. Solo el puente PUEDE importar de `salon` y de `atencion`, y únicamente sus `service` (`app.modules.salon.service` y `app.modules.atencion.service`). El lado Mesa del puente DEBE ser real: consulta a M3 solo con `listar_mesas` de ese `service` y lee todas sus páginas (S33). El lado Cliente DEBE ser real también: consulta a M4 solo con `existe_cliente` y `registrar_cliente_para_reserva` de su `service` (S39). El módulo DEBE poder sustituir el puente por un doble de prueba sin cambiar las reglas de esta spec ni los contratos de la API. La existencia de la mesa y del cliente viene solo del puente; la tabla no tiene claves foráneas hacia Mesa ni Cliente (S10).

#### Escenario: El puente real consulta a M4

- DADO el puente real y una base de prueba con el cliente 7 registrado en M4 y sin cliente 456
- CUANDO se consulta `existe_cliente` con 7, con 456 y con 0
- ENTONCES responde `true` para el 7 y `false` para el 456 y para el 0

#### Escenario: El puente real registra un cliente nuevo en M4

- DADO el puente real y una base de prueba sin clientes
- CUANDO se llama a `registrar_cliente` con nombre «Ana Pérez» y teléfono «+54 280 1234567» y se confirma la sesión
- ENTONCES devuelve el `id` del cliente y `GET /clientes?q=Ana` de M4 lo lista con ese nombre y teléfono

#### Escenario: El puente real propaga el rechazo de M4

- DADO el puente real
- CUANDO se llama a `registrar_cliente` con nombre «Ana3» o con teléfono vacío
- ENTONCES se produce el error 422 de M4 nombrando `nombre` o `telefono`, y no queda ningún cliente en la sesión

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

- DADO un doble del puente que ofrece `obtener_mesa`, `listar_mesas`, `existe_cliente` y `registrar_cliente`, sin base de M3 ni de M4
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
- ENTONCES la base las acepta, porque el índice solo cubre las filas `ACTIVA` en el turno exacto; la ventana de 2 horas y el hecho de que una reserva `ATENDIDA` también ocupe la mesa son reglas del `service` (S69), no de la base

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

(El delta del cliente también cumple esto: usa solo funciones que M4 ya expone en su `service`.) El cambio NO DEBE modificar el código de `salon/`, de `atencion/` ni de `shared/` (backend y frontend), ni los contratos de importación de `backend/pyproject.toml`. Fuera de M5, las únicas modificaciones DEBEN ser la migración nueva y el registro del `router` en `backend/app/main.py`. Tampoco DEBE modificar las pruebas de otros módulos: sus pruebas de migración ya usan revisiones fijas y no dependen del head, y la rama conserva la versión de `develop` de esos archivos.

#### Escenario: Contratos de importación

- DADO el módulo `reservas` terminado
- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos
- Y `reservas` solo importa `app.modules.salon.service` y `app.modules.atencion.service` (nada más de esos módulos), y solo desde el puente

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

El botón «Nueva reserva» DEBE abrir, como modal sobre la misma pantalla y sin cambiar de ruta, el modal «Nueva reserva», construido con el componente `Dialog` compartido (`frontend/src/shared/components/ui/dialog.tsx`): el título «Nueva reserva» (`title` del `Dialog`), los campos Cliente (selector de cliente, ver el delta), Fecha, Hora, Cantidad de personas y Mesa (selector) en el cuerpo del modal, y los botones «Cancelar» y «Guardar reserva» en el pie del modal (`footer`). El propio `Dialog` ya ofrece su botón de cerrar (la X); el modal NO necesita un botón «Cerrar formulario» aparte, igual que `MesaFormDialog` y `ClienteFormDialog` (AGENTS.md, sección 5). Cliente se elige con el selector del requisito «Selector de cliente en el modal del alta» y ya no se escribe como número (S13, S43). Antes de enviar, el modal DEBE validar localmente y mostrar bajo cada campo qué falla: Cliente obligatorio (un cliente elegido o los datos de un cliente nuevo válidos); Fecha obligatoria y no anterior a hoy; Hora obligatoria y, si la fecha es hoy, posterior a la hora actual (S3); Cantidad de personas entero positivo; Mesa obligatoria, es decir, una mesa elegida de la lista. Si hay algún error local, NO DEBE llamar a la API. Al guardar bien, DEBE enviar `POST /reservas`, mostrar un aviso de éxito, cerrar el modal y recargar la tabla. Si la API responde 404, 409 o 422, DEBE mostrar el `detalle` como error general del modal, conservar los datos escritos (también la mesa elegida) y dejar el modal abierto, salvo el 409 de capacidad «La mesa {mesa_id} admite hasta {capacidad} personas», que se muestra bajo el campo Mesa (S72). Cerrar el modal con la X, con la tecla Escape, haciendo clic en el fondo (fuera del modal) o con el botón «Cancelar» DEBE tener el mismo efecto: cerrar sin guardar y sin volver a pedir la tabla de reservas.

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

#### Escenario: Cliente sin elegir

- DADO el modal de alta con los demás campos válidos y ningún cliente elegido (ni la opción «Cliente nuevo»)
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y Cliente advierte que es obligatorio

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
- ENTONCES se envía `POST /reservas` con `mesa_id` 5 (el `id` de la mesa elegida), `cliente_id` (o `cliente_nuevo`, según lo elegido), `fecha`, `hora` y `cantidad_personas`
- Y se muestra el aviso de éxito, el modal se cierra y la tabla se vuelve a pedir

#### Escenario: Conflicto de mesa

- DADO el modal completo y una API que responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
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

La acción «Modificar reserva» de una fila `ACTIVA` DEBE abrir el mismo modal (el mismo `Dialog`), sin cambiar de ruta, con el título «Modificar reserva» y los datos de esa fila; el frontend NO necesita pedir `GET /reservas/{id}` (S24). Cliente y Mesa DEBEN verse deshabilitados y no validarse: en la edición Mesa NO es el selector del alta, sigue siendo un campo de solo lectura con el identificador de la fila y NO pide la lista de mesas disponibles. La persona solo puede cambiar Fecha, Hora y Cantidad de personas, con la misma validación local del alta. Al guardar DEBE enviar `PUT /reservas/{id}` con exactamente `fecha`, `hora` y `cantidad_personas`; si termina bien, mostrar un aviso de éxito, cerrar el modal y recargar la tabla. Si la API responde 404, 409 o 422, DEBE mostrar el `detalle` como error general del modal, conservar los datos y dejar el modal abierto, salvo el 409 de capacidad «La mesa {mesa_id} admite hasta {capacidad} personas», que se muestra bajo el campo Mesa (S72). Cerrar el modal con la X, con Escape, haciendo clic en el fondo o con «Cancelar» cierra sin guardar y sin pedir la reserva de nuevo, igual que en el alta.

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

- DADO una API que responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
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

## Delta: cliente registrado o nuevo (issue #61)

Origen: criterios de HU-M5-01 del issue #61 («Dado un cliente que no está registrado en el sistema, cuando cargo su nombre y teléfono y guardo la reserva, entonces el cliente queda registrado junto con la reserva (HU-M4-01)»). Este delta reemplaza el cliente stub y el campo «Cliente (número)». Los requisitos de esta sección son `ADDED` (la capacidad aún no se archivó, igual que el resto). Las reglas de contenido de nombre y teléfono son de M4 (HU-M4-01) y no se repiten acá más que como referencia.

Convención de los escenarios de este delta: el doble de prueba del puente ofrece al cliente 7 («Ana Pérez», «+54 280 1234567»), no ofrece al 99, y su `registrar_cliente` guarda en una lista propia (ids desde 100) con las reglas de M4 (S42). Los escenarios que dicen «el puente real» usan M4 de verdad sobre una base de prueba. «Cliente nuevo válido» es `{"nombre": "Luis Gómez", "telefono": "280-4556677"}`. «No queda ningún cliente» significa que ni la lista del doble ni `GET /clientes` de M4 (con el puente real) muestran un cliente nuevo.

### Requisito: Alta con cliente existente o con cliente nuevo (issue #61, HU-M5-01)

`POST /reservas` DEBE recibir exactamente uno de `cliente_id` (cliente existente) o `cliente_nuevo` (`nombre` y `telefono`). Con `cliente_id`, DEBE comprobar con el puente que el cliente exista (404 «El cliente {id} no existe» si no). Con `cliente_nuevo`, DEBE registrar el cliente con el puente (`registrar_cliente`) y asociar la reserva al `id` que se obtiene, de modo que reserva y cliente queden guardados juntos (HU-M4-01). La respuesta es la `ReservaSalida` de siempre, con el `cliente_id` del cliente (existente o recién registrado). Los demás campos y reglas del alta no cambian. `PUT /reservas/{id}` no cambia: el cliente no se modifica (S15).

#### Escenario: Alta con un cliente existente

- DADO el doble de prueba del puente con la mesa 5 y el cliente 7
- CUANDO se hace `POST /reservas` con `mesa_id` 5, `cliente_id` 7 y datos válidos
- ENTONCES responde 201 con `cliente_id` 7 y no se registra ningún cliente nuevo

#### Escenario: Alta con un cliente nuevo

- DADO el doble de prueba del puente con la mesa 5 y ningún cliente nuevo
- CUANDO se hace `POST /reservas` con `mesa_id` 5, datos válidos y `cliente_nuevo` válido
- ENTONCES responde 201 con `estado` `ACTIVA` y un `cliente_id` distinto de los existentes
- Y el cliente nuevo queda registrado con ese `id`, su nombre y su teléfono, y `GET /reservas/{id}` devuelve el mismo `cliente_id`

#### Escenario: Con el puente real el cliente nuevo queda en M4

- DADO el puente real, una mesa `LIBRE` en M3 y ningún cliente en M4
- CUANDO se hace `POST /reservas` con esa mesa, datos válidos y `cliente_nuevo` válido
- ENTONCES responde 201 y `GET /clientes?q=Luis` lista al cliente con su nombre y teléfono y el mismo `id` que trae la reserva en `cliente_id`

#### Escenario: Dos reservas con el mismo nombre de cliente nuevo

- DADO una reserva ya creada con `cliente_nuevo` válido
- CUANDO se crea otra, en otro turno, con el mismo `cliente_nuevo`
- ENTONCES responde 201 y quedan dos clientes distintos (M4 permite nombres repetidos, S42)

### Requisito: Exactamente un cliente por reserva (issue #61)

El cuerpo de `POST /reservas` DEBE traer `cliente_id` o `cliente_nuevo`, y no los dos ni ninguno. Si trae los dos o ninguno, DEBE responder 422 con un `detalle` que nombre el campo cliente (`cliente_id`/`cliente_nuevo`), sin guardar reserva ni cliente y sin consultar al puente. `cliente_id` DEBE ser un entero estricto mayor a cero (S16); `cliente_nuevo` DEBE traer `nombre` y `telefono` como texto y ningún otro campo (S40).

#### Escenario: Cliente existente y cliente nuevo juntos

- DADO un cuerpo válido con `cliente_id` 7 y `cliente_nuevo` válido
- CUANDO se hace `POST /reservas`
- ENTONCES responde 422 nombrando el campo cliente y no se crea ninguna reserva ni ningún cliente

#### Escenario: Ningún cliente

- DADO un cuerpo válido sin `cliente_id` ni `cliente_nuevo`, y otro con `cliente_nuevo` igual a `null`
- CUANDO se hace `POST /reservas`
- ENTONCES cada uno responde 422 nombrando el campo cliente y no se crea nada

#### Escenario: Forma inválida del cliente

- DADO `cliente_id` `0`, `"7"` o `true`, o `cliente_nuevo` sin `telefono`, con `nombre` numérico o con un campo extra (`dni`)
- CUANDO se hace `POST /reservas`
- ENTONCES cada caso responde 422 nombrando el campo y no se crea nada

### Requisito: Datos inválidos del cliente nuevo (issue #61, HU-M4-01)

Si el `cliente_nuevo` no cumple las reglas de M4 (nombre obligatorio y solo con letras y espacios, incluidos los acentos; teléfono obligatorio con dígitos, espacios, guiones y `+` solo al inicio), el alta DEBE responder 422 con el mensaje de M4, que nombra el campo (`nombre` o `telefono`), y NO DEBE guardar la reserva ni el cliente. Las reglas de contenido del nombre viven en M4: M5 no las vuelve a implementar (S42). **Nota 2026-11-11: el teléfono tiene además las reglas propias del requisito siguiente (S66), que desde el 2026-11-13 no admite espacios en el interior aunque M4 sí los admita. Nota 2026-11-13: el nombre tiene además el largo máximo de S70.**

#### Escenario: Nombre faltante, vacío o con símbolos

- DADO `cliente_nuevo` con `nombre` `""`, `"   "` o `"Luis3"` y teléfono válido
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con un `detalle` que nombra `nombre`, y no se crea ninguna reserva ni ningún cliente

#### Escenario: Teléfono faltante o inválido

- DADO `cliente_nuevo` con nombre válido y `telefono` `""`, `"abc"` o `"280+456"`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con un `detalle` que nombra `telefono`, y no se crea ninguna reserva ni ningún cliente

#### Escenario: Nombre con acentos y teléfono con prefijo

- DADO `cliente_nuevo` con `nombre` «María José Núñez» y `telefono` «+54-280-4-556677»
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 201 y el cliente queda registrado

### Requisito: Teléfono del cliente nuevo acotado (S66)

> Nota 2026-11-11 (corrección de HU-M5-01-02-03, **pendiente de validación del equipo**): el alta aceptaba teléfonos de 300 caracteres, sin ningún dígito (`"- - -"`) o con espacios al final. Los valores de abajo son un `Supuesto:` de la responsable del módulo (S66).

> Nota 2026-11-13 (corrección de HU-M5-01-02-03, **pendiente de validación del equipo**): a pedido de la responsable del módulo, el teléfono del cliente nuevo ya no admite espacios en el interior (la versión anterior de S66 los admitía, como M4). Los espacios de los extremos se siguen recortando. El texto de abajo ya incluye el cambio.

Con `cliente_nuevo`, el `telefono` DEBE cumplir, después de recortar los espacios de los extremos: un `+` opcional solo al inicio, dígitos y guiones, sin ningún espacio en blanco en el interior; entre 6 y 15 dígitos (15 es el máximo de E.164) y hasta 20 caracteres en total. El esquema propio de M5 (`ClienteNuevo`) lo valida antes de llamar a M4, y el teléfono recortado es el que se guarda. Si no se cumple, el alta DEBE responder 422 con «Datos invalidos. cliente_nuevo.telefono: {mensaje}» y NO DEBE guardar la reserva ni el cliente. Los mensajes, en el orden en que se comprueban: «telefono es obligatorio», «telefono solo admite dígitos, guiones y + al inicio», «telefono admite hasta 20 caracteres» y «telefono debe tener entre 6 y 15 dígitos».

En la pantalla, el campo Teléfono DEBE ser de tipo `tel` (`inputMode` `tel`), admitir hasta 20 caracteres y quitar al escribir o pegar todo lo que no sea dígito, guion o un `+` al inicio (los espacios también se descartan). La validación local DEBE aplicar la misma regla con los mismos textos, en la forma «El teléfono …» («El teléfono solo admite dígitos, guiones y + al inicio»), y el 422 que nombra `telefono` se sigue mostrando junto al campo (Decisión 31).

#### Escenario: Teléfonos en los límites

- DADO `cliente_nuevo` con `telefono` `"123456"` (6 dígitos), `"123456789012345"` (15 dígitos), `"+123-456-789-012-345"` (20 caracteres), `"+542801234567"` o `"280-4123456"`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 201 y el cliente queda registrado con ese teléfono

#### Escenario: Teléfono con espacios en los extremos

- DADO `cliente_nuevo` con `telefono` `"  2804123456   "`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 201 y el cliente queda registrado con `"2804123456"`

#### Escenario: Teléfono con un espacio en el interior

- DADO `cliente_nuevo` con `telefono` `"+54 280 1234567"`, `"28 04 12 34 56"` o `"280 4123456"`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con «Datos invalidos. cliente_nuevo.telefono: telefono solo admite dígitos, guiones y + al inicio» y no se crea ninguna reserva ni ningún cliente

#### Escenario: Pocos o demasiados dígitos

- DADO `cliente_nuevo` con `telefono` `"1"`, `"12345"`, `"---"` o `"1234567890123456"` (16 dígitos)
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con «telefono debe tener entre 6 y 15 dígitos» y no se crea ninguna reserva ni ningún cliente

#### Escenario: Más de 20 caracteres

- DADO `cliente_nuevo` con `telefono` de 21 caracteres (por ejemplo `"+123--456-789-012-345"`) o de 300 caracteres
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con «telefono admite hasta 20 caracteres» y no se crea ninguna reserva ni ningún cliente

#### Escenario: Letras o `+` fuera del inicio

- DADO `cliente_nuevo` con `telefono` `"abc123"`, `"2804abc123"`, `"+"` o `"280+456"`
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con «telefono solo admite dígitos, guiones y + al inicio» y no se crea ninguna reserva ni ningún cliente

#### Escenario: El campo filtra lo que se escribe

- DADO el modal de alta con «Cliente nuevo» abierto
- CUANDO la persona escribe `abc280+456` en Teléfono
- ENTONCES el campo muestra `280456` y no admite más de 20 caracteres

#### Escenario: El campo descarta los espacios

- DADO el modal de alta con «Cliente nuevo» abierto
- CUANDO la persona escribe o pega `+54 280 123-4567` en Teléfono
- ENTONCES el campo muestra `+54280123-4567`, sin espacios

### Requisito: Largo máximo del nombre del cliente nuevo (S70)

> Nota 2026-11-13 (corrección de HU-M5-01-02-03, **pendiente de validación del equipo**): el nombre del cliente nuevo no tenía largo máximo, ni en M5 ni en M4. Los 60 caracteres son un `Supuesto:` propuesto a pedido de la responsable del módulo (S70); no salen de la HU ni del diagrama de clases.

Con `cliente_nuevo`, el `nombre` DEBE tener hasta 60 caracteres, medidos sin los espacios de los extremos (constante `NOMBRE_LARGO_MAXIMO` del esquema). El esquema propio de M5 (`ClienteNuevo`) lo valida antes de llamar a M4 y NO modifica el valor: el recorte solo sirve para medir. Un nombre de exactamente 60 caracteres es válido y uno de 61 no. Si se supera, el alta DEBE responder 422 con «Datos invalidos. cliente_nuevo.nombre: nombre admite hasta 60 caracteres» y NO DEBE guardar la reserva ni el cliente. M5 NO valida el contenido del nombre (obligatorio, solo letras y espacios): sigue siendo de M4 (S42).

En la pantalla, el campo Nombre DEBE descartar al escribir o pegar todo lo que no sea una letra o un espacio (espejo de la regla de M4, S42), admitir hasta 60 caracteres (`maxLength` 60) y mostrar «El nombre admite hasta 60 caracteres» si se supera. El 422 que nombra `nombre` se sigue mostrando junto al campo (Decisión 31).

#### Escenario: Nombre de 60 caracteres

- DADO `cliente_nuevo` con `nombre` de exactamente 60 letras y teléfono válido
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 201 y el cliente queda registrado con ese nombre

#### Escenario: Nombre de 61 caracteres

- DADO `cliente_nuevo` con `nombre` de 61 letras y teléfono válido
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES responde 422 con «Datos invalidos. cliente_nuevo.nombre: nombre admite hasta 60 caracteres» y no se crea ninguna reserva ni ningún cliente

#### Escenario: Los espacios de los extremos no cuentan para el largo

- DADO `cliente_nuevo` con `nombre` de 60 letras con dos espacios al principio y tres al final
- CUANDO se hace `POST /reservas` con los demás datos válidos
- ENTONCES el esquema acepta el nombre y no lo modifica
- Y con 61 letras y los mismos espacios responde 422 con el mismo mensaje

#### Escenario: El campo filtra lo que se escribe

- DADO el modal de alta con «Cliente nuevo» abierto
- CUANDO la persona escribe o pega `Luis3 Gómez!` en Nombre
- ENTONCES el campo muestra `Luis Gómez` y no admite más de 60 caracteres

#### Escenario: El formulario avisa si el nombre supera los 60 caracteres

- DADO el modal con «Cliente nuevo», un Nombre de 61 caracteres que llega a la validación local (el campo ya lo limita al escribir) y los demás campos válidos
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES Nombre muestra «El nombre admite hasta 60 caracteres» y no se envía la solicitud

### Requisito: Una reserva fallida no deja un cliente huérfano (issue #61)

Cuando el alta trae `cliente_nuevo` y la reserva no se puede crear, NO DEBE quedar ningún cliente registrado. El `service` DEBE validar mesa, existencia (solo con `cliente_id`), fecha, hora y turno libre antes de registrar al cliente nuevo, y DEBE guardar reserva y cliente en una única confirmación; si esa confirmación falla (incluida la carrera por el índice único parcial, que responde 409), DEBE deshacer también el cliente (S41). El orden de errores del alta no cambia con `cliente_nuevo`: los errores de mesa, fecha, hora y turno tienen prioridad sobre los datos del cliente nuevo.

#### Escenario: La mesa no existe

- DADO un puente que informa que la mesa 99 no existe
- CUANDO se hace `POST /reservas` con `mesa_id` 99, datos válidos y `cliente_nuevo` válido
- ENTONCES responde 404 con «La mesa 99 no existe» y no queda ningún cliente

#### Escenario: La mesa está fuera de servicio

- DADO un puente que informa la mesa 6 `FUERA_DE_SERVICIO`
- CUANDO se hace `POST /reservas` con `mesa_id` 6, datos válidos y `cliente_nuevo` válido
- ENTONCES responde 409 con «La mesa 6 está fuera de servicio» y no queda ningún cliente

#### Escenario: La fecha o la hora son inválidas

- DADO que hoy es `2026-10-28` y son las `14:30`
- CUANDO se hace `POST /reservas` con `cliente_nuevo` válido y `fecha` `2026-10-27`, y por separado con `fecha` `2026-10-28` y `hora` `14:30`
- ENTONCES responden 422 (fecha y hora) y no queda ningún cliente

#### Escenario: El turno ya está reservado

- DADO una reserva `ACTIVA` en la mesa 5, `2026-11-02`, `21:30`
- CUANDO se hace `POST /reservas` con la misma mesa, fecha y hora y un `cliente_nuevo` válido
- ENTONCES responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas» y no queda ningún cliente

#### Escenario: La base rechaza el duplicado al confirmar

- DADO que la verificación previa no encuentra conflicto pero otra reserva `ACTIVA` igual se confirma antes de guardar, y un `cliente_nuevo` válido
- CUANDO la base rechaza la inserción por el índice único parcial
- ENTONCES el servicio responde 409 con el mensaje de conflicto y no queda la reserva duplicada ni el cliente nuevo

#### Escenario: Datos inválidos del cliente con mesa inexistente

- DADO un puente que informa que la mesa 99 no existe y un `cliente_nuevo` con nombre `"Luis3"`
- CUANDO se hace `POST /reservas` con `mesa_id` 99
- ENTONCES responde 404 con «La mesa 99 no existe» (la mesa se verifica antes de registrar al cliente)

### Requisito: Selector de cliente en el modal del alta (issue #61, HU-M5-01)

El modal «Nueva reserva» DEBE reemplazar el campo numérico «Cliente (número)» por un selector de cliente, sin importar nada del módulo `atencion` (AGENTS.md, sección 9.4): la búsqueda usa `GET /clientes?q=` a través del `api.ts` de `reservas` (S43). El selector DEBE ofrecer:

- Una caja de búsqueda por nombre o teléfono. Al escribir, DEBE pedir `GET /clientes?q=<texto>` (con un `limit` acotado) y listar las coincidencias como «Nombre · Teléfono». La persona elige una y queda elegida, visible en el campo.
- La opción «Cliente nuevo», que muestra los campos Nombre y Teléfono, obligatorios, con las reglas de M5 (nombre solo con letras y espacios, hasta 60 caracteres, S70; teléfono con dígitos, guiones y `+` solo al inicio, sin espacios, S66). Elegir un cliente de la búsqueda y «Cliente nuevo» son excluyentes: pasar de uno a otro descarta lo del anterior.
- Sin texto de búsqueda no se muestra ningún resultado ni se pide la lista. Si la búsqueda no encuentra a nadie, DEBE mostrar «No se encontraron clientes» y mantener disponible «Cliente nuevo». Si la consulta falla, DEBE mostrar el mensaje de la API junto al campo Cliente. Una respuesta vieja de la búsqueda NO DEBE pisar a la nueva (mismo mecanismo que S35).

Al guardar, DEBE enviar `cliente_id` si hay un cliente elegido, o `cliente_nuevo` con `nombre` y `telefono` (sin espacios sobrantes en los extremos) si está «Cliente nuevo»; nunca los dos. Si no hay ni uno ni otro, DEBE bloquear el guardado con un mensaje que nombre Cliente y no llamar a la API. Si hay errores locales en Nombre o Teléfono, DEBE mostrarlos bajo cada campo y no llamar a la API. Si la API responde 422 con un `detalle` que nombra `nombre` o `telefono`, DEBE mostrarlo junto a ese campo, conservar los datos y dejar el modal abierto; los demás 404, 409 y 422 siguen siendo error general del modal. El modal de edición NO cambia: Cliente sigue deshabilitado y de solo lectura con el `cliente_id` de la fila (la tabla sigue mostrando «Cliente n.º», S23).

#### Escenario: Buscar un cliente por nombre

- DADO el modal de alta y una API que, para `q=Ana`, devuelve al cliente 7 («Ana Pérez», «+54 280 1234567»)
- CUANDO la persona escribe «Ana» en la búsqueda de cliente
- ENTONCES se pide `GET /clientes?q=Ana` por el `api.ts` de reservas
- Y la lista muestra «Ana Pérez · +54 280 1234567»

#### Escenario: Buscar un cliente por teléfono

- DADO el modal de alta y una API que, para `q=1234567`, devuelve al cliente 7
- CUANDO la persona escribe «1234567»
- ENTONCES se pide `GET /clientes?q=1234567` y la lista muestra al cliente 7

#### Escenario: Elegir un cliente de la lista

- DADO la lista de coincidencias con «Ana Pérez · +54 280 1234567»
- CUANDO la persona la elige y pulsa «Guardar reserva» con los demás campos válidos
- ENTONCES el cliente queda visible como elegido
- Y se envía `POST /reservas` con `cliente_id` 7 y sin `cliente_nuevo`

#### Escenario: Búsqueda sin resultados

- DADO una API que devuelve la lista vacía para `q=Zzz`
- CUANDO la persona escribe «Zzz»
- ENTONCES se muestra «No se encontraron clientes» y la opción «Cliente nuevo» sigue disponible

#### Escenario: Falla la búsqueda

- DADO una API que responde con error al pedir `GET /clientes?q=Ana`
- CUANDO termina la consulta
- ENTONCES se muestra el mensaje de la API junto al campo Cliente y no se ofrece ningún cliente

#### Escenario: Una respuesta vieja de la búsqueda no pisa a la nueva

- DADO la búsqueda `q=An` sin responder
- CUANDO la persona sigue escribiendo hasta `q=Ana` y la respuesta de `q=An` llega después de la de `q=Ana`
- ENTONCES la lista muestra los resultados de `q=Ana`

#### Escenario: Cliente nuevo

- DADO el modal de alta
- CUANDO la persona elige «Cliente nuevo»
- ENTONCES se muestran los campos Nombre y Teléfono vacíos, y ninguna reserva ni cliente se crea todavía

#### Escenario: Guardar con un cliente nuevo

- DADO el modal con «Cliente nuevo», Nombre «Luis Gómez», Teléfono «280-4556677» y los demás campos válidos, incluida una mesa elegida
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES se envía `POST /reservas` con `cliente_nuevo` `{nombre: "Luis Gómez", telefono: "280-4556677"}` y sin `cliente_id`
- Y se muestra el aviso de éxito, el modal se cierra y la tabla se vuelve a pedir

#### Escenario: Pasar de un cliente elegido a «Cliente nuevo» (y al revés)

- DADO un cliente elegido de la búsqueda
- CUANDO la persona elige «Cliente nuevo», escribe Nombre y Teléfono y guarda
- ENTONCES se envía solo `cliente_nuevo`, sin `cliente_id`
- Y si después vuelve a elegir a un cliente de la búsqueda, se envía solo `cliente_id` y no `cliente_nuevo`

#### Escenario: Sin cliente

- DADO el modal con los demás campos válidos, sin cliente elegido y sin «Cliente nuevo»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y se muestra un error de Cliente obligatorio

#### Escenario: Datos inválidos del cliente nuevo en el modal

- DADO «Cliente nuevo» con Nombre «Luis3» o vacío, o Teléfono vacío o «280+456»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES no se envía la solicitud y Nombre o Teléfono muestra el mensaje de su regla (S66 y S70)

#### Escenario: La API rechaza los datos del cliente nuevo

- DADO el modal con «Cliente nuevo» completo y una API que responde 422 con un `detalle` que nombra `telefono`
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el mensaje se muestra junto al campo Teléfono, los datos se conservan y el modal sigue abierto

#### Escenario: La reserva falla con un cliente nuevo

- DADO el modal con «Cliente nuevo» completo y una API que responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra ese mensaje como error general, conserva Nombre, Teléfono y los demás datos, y sigue abierto

#### Escenario: La edición no cambia el cliente

- DADO una fila `ACTIVA` del cliente 7
- CUANDO la persona abre «Modificar reserva»
- ENTONCES Cliente muestra 7 deshabilitado, sin caja de búsqueda ni «Cliente nuevo», y no se pide `GET /clientes`

#### Escenario: Cerrar el modal descarta la elección

- DADO el modal con un cliente elegido o con «Cliente nuevo» escrito
- CUANDO la persona cierra el modal y vuelve a abrir «Nueva reserva»
- ENTONCES el selector de cliente aparece vacío

### Requisito: Desplegable de clientes registrados en el alta (S71)

> Nota 2026-11-13 (corrección de HU-M5-01-02-03, **pendiente de validación del equipo**): a pedido de la responsable del módulo, además del buscador hay un desplegable con los clientes registrados. Es solo frontend: no cambia el contrato de M4 ni agrega endpoints a M5 (S71).

El modal «Nueva reserva» DEBE ofrecer, junto a la caja de búsqueda y a la opción «Cliente nuevo», un desplegable «Clientes registrados» con los clientes que devuelve `GET /clientes?limit=100&offset=0` de M4 (la ruta exige el permiso `CLIENTES_GESTIONAR`), pedido a través del `api.ts` de `reservas` (S43). El frontend DEBE ordenarlos por nombre y mostrar como mucho 100, cada uno como «Nombre · Teléfono». Si hay más de 100 clientes (el `total` de la respuesta supera lo recibido), DEBE avisar que se muestran solo los primeros 100 y que para los demás hay que usar el buscador. Elegir un cliente del desplegable equivale a elegirlo en el buscador: queda elegido y visible en el campo, descarta «Cliente nuevo» y al guardar se envía solo `cliente_id`. Si la consulta falla, DEBE mostrar el mensaje de la API junto al campo Cliente, sin ofrecer clientes en el desplegable, y la búsqueda y «Cliente nuevo» siguen disponibles. El modal de edición NO muestra el desplegable (Cliente sigue deshabilitado) ni pide `GET /clientes`.

#### Escenario: Lista de clientes registrados ordenada por nombre

- DADO el modal de alta y una API que, para `GET /clientes?limit=100&offset=0`, devuelve a «Zoe Ruiz», «Ana Pérez» y «Beto Díaz» en ese orden
- CUANDO la persona abre el desplegable «Clientes registrados»
- ENTONCES se pidió `GET /clientes?limit=100&offset=0` por el `api.ts` de reservas
- Y la lista muestra, en este orden, «Ana Pérez · {teléfono}», «Beto Díaz · {teléfono}» y «Zoe Ruiz · {teléfono}»

#### Escenario: Elegir un cliente del desplegable

- DADO el desplegable con «Ana Pérez · +54 280 1234567» (cliente 7)
- CUANDO la persona la elige y pulsa «Guardar reserva» con los demás campos válidos
- ENTONCES el cliente queda visible como elegido, igual que si se hubiera elegido en el buscador
- Y se envía `POST /reservas` con `cliente_id` 7 y sin `cliente_nuevo`

#### Escenario: Más de 100 clientes

- DADO una API que devuelve 100 clientes con `total` 130
- CUANDO la persona abre el desplegable
- ENTONCES la lista muestra 100 clientes y un aviso de que hay más y de que debe usar el buscador

#### Escenario: Falla la lista de clientes registrados

- DADO una API que responde con error al pedir `GET /clientes?limit=100&offset=0`
- CUANDO termina la consulta
- ENTONCES se muestra el mensaje de la API junto al campo Cliente, el desplegable no ofrece clientes y la búsqueda y «Cliente nuevo» siguen disponibles

#### Escenario: La edición no muestra el desplegable

- DADO una fila `ACTIVA` del cliente 7
- CUANDO la persona abre «Modificar reserva»
- ENTONCES no se muestra el desplegable «Clientes registrados» y no se pide `GET /clientes`

### Requisito: El error de capacidad se muestra bajo el campo Mesa (S72)

> Nota 2026-11-13 (corrección de HU-M5-01-02-03, **pendiente de validación del equipo**): a pedido de la responsable del módulo, el error de capacidad deja de mostrarse bajo Cantidad de personas o como alerta general. El backend no cambia (S72).

Cuando la cantidad de personas supera la capacidad de la mesa, el modal DEBE mostrar el error bajo el campo Mesa y NO DEBE mostrarlo bajo Cantidad de personas ni como error general del modal. Vale para la validación local del alta («La mesa elegida admite hasta {capacidad} personas.») y para el 409 del servidor de S67 («La mesa {mesa_id} admite hasta {capacidad} personas»), tanto en el alta como en la modificación; en la modificación el campo Mesa es de solo lectura y muestra igualmente el error. El frontend distingue este 409 de los demás por su mensaje. Los demás 404, 409 y 422 de la API siguen siendo error general del modal, con las excepciones de `nombre` y `telefono` de S66 y S70.

#### Escenario: Capacidad excedida detectada por el formulario

- DADO el modal de alta con la mesa 5 elegida (capacidad 4) y `cantidad_personas` 5
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES «La mesa elegida admite hasta 4 personas.» aparece bajo el campo Mesa
- Y no aparece error bajo Cantidad de personas ni como error general, y no se envía el `POST`

#### Escenario: El servidor rechaza la capacidad en el alta

- DADO el modal de alta completo y una API que responde 409 con «La mesa 5 admite hasta 4 personas» (la capacidad cambió después de pedir la lista)
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra ese mensaje bajo el campo Mesa, conserva los datos y sigue abierto
- Y no aparece error bajo Cantidad de personas ni como error general

#### Escenario: El servidor rechaza la capacidad en la modificación

- DADO el modal de edición de una reserva de la mesa 5 y una API que responde 409 con «La mesa 5 admite hasta 4 personas»
- CUANDO la persona guarda con `cantidad_personas` 5
- ENTONCES el modal muestra ese mensaje bajo el campo Mesa, conserva los datos y sigue abierto
- Y no aparece error bajo Cantidad de personas ni como error general

#### Escenario: Otro 409 sigue siendo un error general

- DADO el modal de alta completo y una API que responde 409 con «La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas»
- CUANDO la persona pulsa «Guardar reserva»
- ENTONCES el modal muestra ese mensaje como error general y no bajo el campo Mesa

## Supuestos

Los supuestos S1 a S14 son los de la propuesta, con la misma numeración. S15 en adelante son nuevos de esta spec. Por el issue #61 se reescribieron S4, S5, S9, S10, S13, S17, S20 y S23 (sin cambiar su número) y se agregaron S29 a S35. Por la regla general de modales de AGENTS.md (sección 5) se reescribieron además S24 y S34 (sin cambiar su número, el panel lateral pasa a ser un modal) y se agregaron S36, S37 y S38. Por el delta «cliente registrado o nuevo» (issue #61, HU-M4-01) se reescribieron además S6, S13, S17, S20 y S34 (sin cambiar su número) y se agregaron S39 a S43. Por la corrección del 2026-11-11 (pedido de la responsable del módulo) se agregaron S66 y S67 y se anotaron S5, S27 y S42. Por la adenda 2026-11-12 («ocupación de la mesa») se reescribieron además S4, S7, S9, S17, S21 y S30 (sin cambiar su número) y se agregó S69. Por la adenda 2026-11-13 («validaciones del formulario de reserva») se reescribió S66 (sin cambiar su número), se anotaron S42 y S67 y se agregaron S70, S71 y S72; S68 pertenece al cambio HU-M5-06, así que S72 es el último supuesto de este archivo. Todos están marcados `Supuesto:` para que el equipo los valide (AGENTS.md, sección 9.2).

- Supuesto: S1. Estado inicial `ACTIVA`. Lo dicen el diagrama de clases, S2-02 y la maqueta. Contradicción de fuentes: S1-07 (CP-HU-M5-01) usa `PENDIENTE`. Se sigue el diagrama porque manda en nombres y valores; el equipo tiene que validarlo y corregir S1-07.
- Supuesto: S2. Horario de atención: ninguna fuente lo define, así que no se restringe la hora de la reserva (vale cualquier hora del día). Si el equipo define un horario, se agrega como validación 422 en un cambio posterior.
- Supuesto: S3. Fecha y hora pasadas: `fecha` tiene que ser hoy o posterior (diagrama `{>= hoy}`). Si `fecha` es hoy, `hora` tiene que ser posterior a la hora actual de la zona del restaurante (S28). Si no se cumple, responde 422. La hora se maneja en minutos (sin segundos).
- Supuesto: S4. Mesa «disponible» para una fecha y hora: la mesa existe según el puente, su estado en M3 no es `FUERA_DE_SERVICIO` y no está ocupada en ese turno: no tiene otra reserva `ACTIVA` o `ATENDIDA` a menos de 2 horas (estricto) del instante pedido, según la ventana de ocupación de S69. El estado `OCUPADA` no la excluye (S30). Cambio de la adenda 2026-11-12: la versión anterior decía que no se modelaba la duración y que solo contaba la misma fecha y hora exactas; se reemplaza por la ventana de S69, por pedido expreso del responsable del módulo. Cambio respecto de la propuesta: la primera versión de S4 decía que no se modelaba el estado de la mesa; el issue #61 dice que una mesa fuera de servicio no es una mesa disponible y gana sobre esa versión (AGENTS.md, sección 2).
- Supuesto: S5. Capacidad: resuelto por el issue #61 (HU-M5-01), que dice «Cantidad de personas (obligatoria): número entero mayor a cero. El sistema no la valida contra la capacidad de la mesa (se resuelve en forma presencial)». La cantidad de personas no se valida contra la capacidad de la mesa; se resuelve en forma presencial. S1-07 pedía `cantidadPersonas <= capacidad`, pero el issue manda sobre esa guía (AGENTS.md §2). La capacidad que devuelve `listar_mesas` del puente se usa solo para mostrarla en el selector de mesas; ninguna regla la compara con la cantidad de personas y no existe una respuesta 422 por capacidad excedida. **Nota 2026-11-11 (pendiente de validación del equipo): esta regla fue revertida por S67 a pedido de la responsable del módulo; la cantidad no puede superar la capacidad de la mesa. El issue #61 todavía dice lo contrario y debe actualizarse (lo hace una persona, no el agente).**
- Supuesto: S6. Cliente: se identifica por `cliente_id` entero. Existe si M4 lo tiene (`existe_cliente`, S39); la versión anterior daba por válido cualquier id positivo con un stub, que ya no existe. Una reserva puede crear al cliente al mismo tiempo con `cliente_nuevo` (S39). S1-07 no menciona al cliente; el diagrama sí (Cliente 1 - Reserva).
- Supuesto: S7. Modificar: solo se puede modificar una reserva `ACTIVA` (si no, 409). Se modifican `fecha`, `hora` y `cantidad_personas`. Se revalida S3 siempre y la ventana de ocupación de S4 y S69 solo si cambian `fecha` u `hora`, sin contar la propia reserva. La mesa y el cliente no cambian (diagrama). No hay control de concurrencia: gana la última modificación.
- Supuesto: S8. Listado: paginado (D-27); filtros opcionales `fecha` (día exacto) y `estado`; orden ascendente por `fecha`, `hora` e `id`. Sin filtros, la API devuelve todas las reservas. El frontend arranca con el filtro de estado `ACTIVA`.
- Supuesto: S9. Códigos de error: 404 si la reserva no existe, y también si la mesa o el cliente indicados no existen según el puente. 409 si la mesa está ocupada por otra reserva `ACTIVA` o `ATENDIDA` dentro de su ventana de ocupación (S69), si se intenta modificar una reserva que no está `ACTIVA` o si la mesa está fuera de servicio (S31). 422 para errores de validación (fecha u hora pasadas, `cantidad_personas <= 0`). Igual criterio que M1 y M3.
- Supuesto: S10. Sin claves foráneas: la tabla `clientes` no existe (M4 vacío) y `reservas` no declara claves foráneas hacia Mesa ni Cliente, aunque la mesa se consulte a M3 por el puente. La integridad referencial la cubre el puente; las FK se agregan con una migración posterior, cuando M3 y M4 estén integrados.
- Supuesto: S11. Fechas en el frontend: `formatearFecha` (`frontend/src/shared/lib/format.ts`) muestra el día anterior en UTC-3 con fechas `YYYY-MM-DD`. M5 formatea sus fechas dentro del módulo, sin tocar `shared/`, y se avisa al equipo para corregir la función compartida.
- Supuesto: S12. Insignia de estado: `StatusBadge` no conoce los estados de `EstadoReserva`. M5 asigna el texto y la variante dentro del módulo, sin modificar `shared/`.
- Supuesto: S13. Selección de mesa y cliente en el formulario: la Mesa se elige de la lista de mesas disponibles que arma la propia API de reservas a partir de M3 (issue #61), porque el `numero` de una mesa es único solo dentro de su sector (`ux_mesas_sector_numero`) y pedirlo a mano es ambiguo. El Cliente se elige con un selector que busca en M4 por nombre o teléfono, o se carga como cliente nuevo (S43); ya no se pide por su identificador. Las diferencias con la maqueta se anotan en el PR.
- Supuesto: S14. Nombre del atributo: la HU dice «comensales» y el diagrama `cantidadPersonas`. En el código se usa `cantidad_personas` / `cantidadPersonas` (gana el diagrama); en la pantalla dice «Cantidad de personas» (maqueta) o «Personas» en la tabla.
- Supuesto: S15. Los cuerpos de `ReservaCrear` y `ReservaModificar` prohíben campos extra (como `MesaCrear` de HU-M3-05): `estado` e `id` en el alta, y `mesa_id`, `cliente_id`, `estado` e `id` en la modificación responden 422 en lugar de ignorarse.
- Supuesto: S16. Formatos y tipos de la API: `fecha` en `YYYY-MM-DD` y `hora` en `HH:MM` (una hora con segundos distintos de cero responde 422; la respuesta siempre usa `HH:MM`). `cantidad_personas`, `mesa_id` y `cliente_id` son enteros estrictos mayores a cero (sin decimales, texto ni booleanos). El formato `DD/MM/AAAA` de S1-07 es solo de pantalla.
- Supuesto: S17. Orden de validación: el de «Contrato de la API». En el alta: forma (incluido exactamente uno de `cliente_id` o `cliente_nuevo`), existencia de la mesa, mesa fuera de servicio, existencia del cliente (solo con `cliente_id`), fecha, hora, turno libre (sin otra reserva dentro de la ventana de ocupación de la mesa, S69) y, al final, registro del cliente nuevo y guardado (S41). Un dato inválido nunca deja cambios parciales.
- Supuesto: S18. Los textos de los mensajes de negocio son los de referencia de «Contrato de la API»; el diseño puede ajustar el redactado sin cambiar el código de estado ni la clave `detalle`.
- Supuesto: S19. `PUT /reservas/{id}` exige los tres campos modificables (`fecha`, `hora`, `cantidad_personas`); no se ofrece una modificación parcial (`PATCH`).
- Supuesto: S20. Puente y pruebas. El lado Mesa del puente es real y consulta a M3 (S33); una mesa con id positivo ya no existe por el solo hecho de serlo. El lado Cliente también es real y consulta a M4 (S39): un id positivo ya no basta para que el cliente exista. Por eso las pruebas usan un doble de prueba del puente (ver «Convención de los escenarios») con las mesas y los clientes que cada escenario necesita, y los 404 de mesa o de cliente se prueban con el doble o con una implementación alternativa del puente.
- Supuesto: S21. Un mismo cliente PUEDE tener varias reservas `ACTIVA`, incluso en la misma fecha y hora en mesas distintas. La única regla de conflicto es la de la mesa y su ventana de ocupación (diagrama, S69); el cliente no interviene.
- Supuesto: S22. En el listado, `estado` distingue mayúsculas y minúsculas (`activa` responde 422, como en `GET /productos` y `GET /secciones`); `fecha` usa `YYYY-MM-DD`; el filtro de fecha acepta cualquier día, también pasado, a diferencia del alta.
- Supuesto: S23. `ReservaSalida` y la tabla de pantalla traen `mesa_id` y `cliente_id` y no nombres de mesa, sector, cliente ni teléfono. Este cambio no modifica `ReservaSalida` ni la tabla: mostrar el sector y el número de la mesa en el listado queda para un cambio posterior. La tabla muestra «Mesa n.º {mesa_id}» con el `id` interno de la mesa, que puede no coincidir con su `numero` (el selector del alta muestra el sector y el número). La maqueta muestra Cliente, Teléfono y Mesa con texto: la diferencia se anota en el PR.
- Supuesto: S24. El frontend es una sola pantalla: `ReservasPage` en la ruta `/reservas`, que ya existe. El alta y la edición se abren en un modal sobre esa misma pantalla, con el componente `Dialog` compartido (`frontend/src/shared/components/ui/dialog.tsx`), porque AGENTS.md (sección 5) pide que «los formularios de alta y edición se abren en un modal sobre la misma página», como ya hacen `MesaFormDialog`, `SectorFormDialog`, `ClienteFormDialog`, `ProductoFormDialog` y `MedioPagoFormDialog`. Cambio respecto de la propuesta: la maqueta `SPRINT-2/S2-04-maqueta/reservas.html` muestra el alta y la edición en una página aparte y con un panel lateral, pero esa regla general de AGENTS.md gana sobre la maqueta (AGENTS.md, sección 2: la maqueta tiene la prioridad más baja de todas las fuentes). No se agregan rutas ni se modifica `frontend/src/App.tsx` ni ningún archivo compartido. La edición parte de los datos de la fila, así que el frontend no usa `GET /reservas/{id}` (la ruta existe en el backend porque la pide HU-M5-02).
- Supuesto: S25. Fecha y filtros de la pantalla, según la maqueta: la tabla muestra las reservas de un día, que arranca en hoy (fecha local del navegador), con los botones «Día anterior» y «Día siguiente», el campo «Día» y el botón «Hoy». El estado arranca en `ACTIVA` (S8) y el selector ofrece además «Todas». Cambiar de día vuelve a la página 1. El día se maneja como texto `YYYY-MM-DD` (S11).
- Supuesto: S26. Los textos de los estados vacío y de error de la tabla son los de «Estados vacío y error del listado». El aviso de éxito del modal es un toast del sistema de avisos compartido, sin modificarlo.
- Supuesto: S27. Al modificar, el `service` no revalida que la mesa o el cliente existan, porque no cambian, y tampoco consulta al puente. **Nota 2026-11-11: desde S67 la modificación lee la mesa de la reserva con `obtener_mesa` solo para comprobar su capacidad; sigue sin revisar su estado ni al cliente.**
- Supuesto: S28. «Hoy» y «hora actual» son la fecha y la hora de la zona del restaurante: UTC-3 fija (Argentina no usa horario de verano desde 2009), calculadas a partir del reloj UTC del servidor. No dependen de `TZ` del proceso ni del contenedor. Reemplaza al supuesto anterior, «la hora local del servidor»: el 2026-10-31 se comprobó que Docker corre en UTC sin `TZ`, y eso rechazaba con 422 las reservas de las próximas 3 horas. La zona es una constante del módulo, sin variable de entorno ni dependencia nueva (se usa un desplazamiento fijo y no `zoneinfo`, que necesita la base de zonas del sistema). Las pruebas fijan el reloj para los escenarios con fecha de hoy.
- Supuesto: S29. La lista de mesas disponibles es una lista simple, sin paginar (no es una `Pagina[T]`). Un selector tiene que mostrar todas las mesas posibles, y un restaurante tiene muchas menos mesas que el tope de una página (100). Por eso la respuesta no trae `total`, `limit` ni `offset`.
- Supuesto: S30. El estado `OCUPADA` de una mesa no la excluye de la lista ni del alta. `OCUPADA` describe el momento presente (hay clientes sentados ahora) y no dice nada sobre el turno que se reserva para otra fecha u hora. Solo `FUERA_DE_SERVICIO` excluye. Si se reserva para hoy una mesa que ahora está ocupada, se acepta y el salón lo resuelve en el momento. Lo mismo vale con la ventana de S69: `OCUPADA` (el estado actual de la mesa en M3) sigue sin excluir una mesa por sí sola; la ocupación de un turno la deciden únicamente las reservas `ACTIVA` y `ATENDIDA` de la ventana, no el estado presente de la mesa.
- Supuesto: S31. Una mesa fuera de servicio en el alta responde 409 «La mesa {id} está fuera de servicio» y no 422. Se trata como un conflicto con una regla de negocio, igual que la doble reserva (D-25, D-26): los datos enviados están bien formados, pero el estado de la mesa impide la reserva. 422 queda para datos mal formados o fechas y horas pasadas. El issue #61 pide que no se cree la reserva y que se avise; no fija el código.
- Supuesto: S32. La consulta de mesas disponibles reutiliza las reglas de «no pasado» del alta (S3) con los mismos mensajes 422: un turno que no se podría reservar tampoco tiene mesas disponibles. La consulta de fechas pasadas del listado (S22) es otra cosa y no cambia.
- Supuesto: S33. El puente lee todas las páginas de `listar_mesas` del `service` de M3 y a partir de esa lectura resuelve `obtener_mesa` y `listar_mesas`. Es lo único que M3 ofrece (páginas de hasta 100, orden por sector, `numero` e `id`, sin filtro por estado ni búsqueda por `id`) y `reservas` no puede cambiar `salon` (AGENTS.md, sección 9.3). Cada alta y cada consulta de mesas disponibles leen todas las mesas; con las decenas de mesas de un restaurante el costo es aceptable. Si M3 agrega una búsqueda por `id` o un filtro por estado, se cambia el cuerpo del puente sin tocar las reglas.
- Supuesto: S34. Selector de mesa del modal. La lista se pide solo con Fecha y Hora válidas. La opción se escribe «Sector · Mesa N (capacidad personas)», con «personas» también cuando la capacidad es 1. Con la lista vacía, el botón «Guardar reserva» se deshabilita; no así mientras la lista carga ni cuando falló, porque en esos casos no hay mesa elegida y la validación local de Mesa impide el envío. Cliente se elige con el selector de S43. El modal no importa nada del módulo de M3: pide la lista a la API de reservas.
- Supuesto: S35. La lista de mesas disponibles es solo informativa: no reserva ni bloquea la mesa. Entre que se pide la lista y se guarda, otra persona puede reservar la mesa o M3 puede ponerla fuera de servicio; el alta vuelve a verificar la mesa, el estado y el turno libre y responde 404 o 409 con su mensaje, que el modal muestra como error general. Para ver la lista actualizada hay que cambiar Fecha u Hora, o cerrar y volver a abrir el modal.
- Supuesto: S36. Solo existe un modal de reserva a la vez: la pantalla guarda como mucho un modal abierto (cerrado, alta o edición de una fila), el mismo estado que ya tenía el panel lateral de la versión anterior. Mientras el modal de edición está abierto, el botón «Nueva reserva» se ve pero está deshabilitado: hay que cerrar la edición (con o sin guardar) antes de poder abrir el alta. Así nunca hay dos modales abiertos a la vez, sin cerrar en silencio cambios sin guardar; el `Dialog` compartido tampoco está pensado para montarse dos veces juntas.
- Supuesto: S37. El modal usa el tamaño por defecto del `Dialog` compartido, `size="md"` (`max-w-lg`), igual que `MesaFormDialog` y `ClienteFormDialog`. El formulario tiene solo cinco campos (Cliente, Fecha, Hora, Cantidad de personas y Mesa), con Fecha y Hora en la misma fila, así que no necesita el ancho mayor `size="lg"` que usa `ProductoFormDialog` para un formulario largo con desplazamiento interno.
- Supuesto: S38. Cerrar el modal no cancela una solicitud `POST` o `PUT` en curso: la solicitud sigue hasta el navegador, pero el formulario que la pidió se desentiende de su respuesta al desmontarse, con el mismo mecanismo que ya usa S35 para descartar una respuesta vieja de la consulta de mesas (una bandera que se apaga al desmontar). Por eso una respuesta tardía, llegue bien o mal, nunca muestra un aviso, nunca recarga la tabla y nunca toca el modal que esté abierto en ese momento, sea el mismo, ninguno o uno distinto abierto después. Antes de este ajuste, una respuesta tardía sí mostraba el aviso y recargaba la tabla aunque el modal ya estuviera cerrado, y podía cerrar un modal nuevo sin avisar; se corrige acá porque la conversión al modal lo hizo visible y el mecanismo ya existe en el propio módulo.
- Supuesto: S39. Puente de cliente real. `existe_cliente` y la operación nueva `registrar_cliente(db, nombre, telefono) -> int` del puente delegan en `app.modules.atencion.service` (`existe_cliente` y `registrar_cliente_para_reserva`, que M4 expone con esa firma). Reemplaza al stub de S6 y S20. `registrar_cliente_para_reserva` valida con las reglas de M4, agrega el cliente a la sesión y hace flush, pero nunca confirma ni deshace. `ReservaCrear` pasa de `cliente_id` obligatorio a exactamente uno de `cliente_id` o `cliente_nuevo`; si llegan los dos o ninguno, 422. El cambio depende de que M4 publique esas dos funciones (el cambio HU-M4-01-02-03 se actualiza en paralelo).
- Supuesto: S40. `ClienteNuevo` es un esquema propio de M5, solo de forma (`nombre` y `telefono` como texto, obligatorios, sin campos extra), para no importar los `schemas` de M4 (AGENTS.md, sección 9.4). Sin apellido ni DNI: no figuran en HU-M4-01 ni en el diagrama de clases.
- Supuesto: S41. Atomicidad del cliente nuevo. El `service` valida mesa, cliente existente, fecha, hora y turno libre antes de registrar al cliente nuevo, y después guarda reserva y cliente en un solo commit. Si ese commit falla (por ejemplo, la carrera por el índice único parcial), deshace la sesión completa, también el cliente, y responde 409. Nunca queda un cliente huérfano. Como M4 nunca confirma, la confirmación única es de M5. Quedan fuera los errores de la base ajenos a estos casos (responden 500 y también deshacen la sesión).
- Supuesto: S42. Las reglas de contenido de nombre y teléfono son únicamente las de M4 (nombre obligatorio, solo letras y espacios con acentos; teléfono obligatorio con dígitos, espacios, guiones y `+` solo al inicio; nombres repetidos permitidos): M5 no las copia en el backend. El frontend de M5 repite las mismas reglas y mensajes solo para avisar antes de enviar, porque no puede importar archivos de `atencion` (AGENTS.md, sección 9.4); si M4 cambia las reglas, hay que actualizar ese espejo. No se detectan duplicados de cliente: dos altas iguales crean dos clientes, igual que en M4. **Nota 2026-11-11: el teléfono tiene reglas propias de largo y de cantidad de dígitos que M5 sí valida en el backend (S66); el nombre sigue siendo solo de M4. Nota 2026-11-13: S66 revisado quita los espacios del teléfono nuevo, así que la regla de M5 y la de M4 (que sí admite espacios) difieren; y S70 agrega el largo máximo del nombre en M5, aunque su contenido sigue siendo de M4.**
- Supuesto: S43. Selector de cliente del modal. Reservas pide `GET /clientes?q=&limit=` a través de su propio `api.ts` (la ruta de M4 ya existe y es de solo lectura). Los resultados se leen como «Nombre · Teléfono», acotados a la primera página (sin paginar en pantalla; para afinar se sigue escribiendo). La búsqueda empieza con al menos un carácter escrito y espera una breve pausa al tipear (el diseño fija el valor). El modal de edición no cambia el cliente. Fuera de alcance: mostrar el nombre del cliente en la tabla de reservas (S23).
- Supuesto: S66. Teléfono del cliente nuevo (corrección 2026-11-11, pedido de la responsable del módulo, **pendiente de validación del equipo**; revisada el 2026-11-13, también a su pedido y pendiente de validación). `+` opcional solo al inicio, dígitos y guiones, sin ningún espacio en el interior; entre 6 y 15 dígitos (15 es el máximo de E.164) y hasta 20 caracteres en total; se recortan los espacios de los extremos antes de validar y de guardar (tolerancia de la API: el campo del frontend ya no deja escribir espacios). Lo valida el esquema propio `ClienteNuevo` de M5 antes de llamar a M4, porque la regla de M4 (`validar_telefono` de `atencion/schemas.py`, compartida con el alta y la modificación de clientes) no acota el largo ni exige dígitos y sí admite espacios; M5 no puede cambiar `atencion` (AGENTS.md, sección 9.3), así que la diferencia se avisa a su responsable. Precisa S42 solo para el teléfono: los clientes que ya están en M4 pueden tener espacios en el teléfono (por ejemplo «+54 280 1234567») y se siguen mostrando y eligiendo igual; solo el `cliente_nuevo` de M5 no los admite. El campo del frontend descarta los espacios al escribir o pegar, filtra el resto de lo no permitido y aplica la misma regla y los mismos textos (con «El teléfono …» en lugar de «telefono …»): «El teléfono solo admite dígitos, guiones y + al inicio». Los 6, 15 y 20 son valores propuestos, no salen de la HU ni del diagrama. Antes de la revisión del 2026-11-13, S66 admitía espacios y el mensaje decía «telefono solo admite dígitos, espacios, guiones y + al inicio».
- Supuesto: S67. Capacidad de la mesa (corrección 2026-11-11, pedido de la responsable del módulo, **pendiente de validación del equipo**). Revierte S5: `cantidad_personas` no puede superar la capacidad de la mesa, en el alta y en la modificación, con 409 «La mesa {mesa_id} admite hasta {capacidad} personas». El issue #61 todavía dice que no se valida y debe actualizarse (lo hace una persona, no el agente). Orden de validación (precisa S17): en el alta, después de la existencia y del estado de la mesa y antes del cliente; en la modificación, después del estado de la reserva y antes de la fecha y la hora. La capacidad sale de `puente.obtener_mesa`; al modificar se usa la mesa de la reserva y, si M3 ya no la tiene, responde 404 (Supuesto: no hay capacidad contra la cual comparar). Si M3 reduce la capacidad de una mesa con reservas, la próxima modificación de esa reserva debe ajustar la cantidad. En el frontend, el alta valida contra la capacidad de la mesa elegida (el selector ya la conoce); la edición no, porque la fila no la trae. El error de capacidad, local o 409 de la API, se muestra bajo el campo Mesa y no bajo Cantidad de personas ni como error general del modal (S72).
- Supuesto: S69. Ventana de ocupación de la mesa (reemplaza al «no se modela duración» de S4). Toda reserva `ACTIVA` o `ATENDIDA` ocupa su mesa durante una ventana fija de 2 horas que empieza en su `hora`; `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA` no cuentan. Una reserva nueva en la mesa M, en el instante T (`fecha` y `hora` combinadas), choca con otra de M en el instante E si |T − E| < 2 horas (comparación estricta): las 21:00 chocan con las 22:59 y no con las 23:00, y lo mismo hacia atrás (las 19:01 chocan con las 21:00; las 19:00 no). La comparación usa instantes reales y se miran las reservas del día anterior, del mismo día y del siguiente, así que las 23:30 del día D chocan con las 00:30 del día D+1. La duración vive en una sola constante (`VENTANA_DE_OCUPACION`, en el `service`) y el `repository` la recibe como parámetro, sin importar nada del `service`. Hay una sola definición de «mesa ocupada»: la usan el alta, la modificación y `GET /reservas/mesas-disponibles`, de modo que la lista nunca ofrece una mesa que el alta rechazaría. Error: 409 «La mesa {mesa_id} ya tiene una reserva el {fecha} a las {hora}; cada reserva ocupa la mesa 2 horas», con la fecha y la hora de la reserva que conflicta; el 2 sale de la constante. Modificación: se excluye la propia reserva y la ventana se revisa solo si cambian `fecha` u `hora`, para no bloquear la edición de otros datos (por ejemplo `cantidad_personas`) en una reserva que ya se superponía con otra por datos anteriores a esta regla; la mesa no cambia (S27). Una reserva `ATENDIDA` cuenta porque el cliente sigue sentado en la mesa durante su ventana, aunque la reserva ya no esté `ACTIVA`. La duración de 2 horas es un valor único para todas las mesas, sectores y cantidades de personas, y no figura en la HU ni en el diagrama de clases: el equipo tiene que validarla. Límite conocido: el índice único parcial de la base solo protege el turno exacto (misma mesa, fecha y hora, reserva `ACTIVA`); si dos solicitudes simultáneas piden turnos distintos que se superponen, la verificación previa de cada una puede no ver a la otra y las dos pueden guardarse. En SQLite, que ejecuta una escritura a la vez, el margen es angosto, pero no hay un bloqueo por mesa ni una restricción de la base para la ventana, y esta spec no los agrega (no hay migración ni cambio de modelo). El frontend no cambia: el selector ya consume `mesas-disponibles` y muestra el `detalle` del servidor.
- Supuesto: S70. Largo máximo del nombre del cliente nuevo (corrección 2026-11-13, pedido de la responsable del módulo, **pendiente de validación del equipo**). 60 caracteres, medidos sin los espacios de los extremos y sin modificar el valor: un nombre de 60 es válido y uno de 61 responde 422 «Datos invalidos. cliente_nuevo.nombre: nombre admite hasta 60 caracteres». Es un valor propuesto: no sale de la HU ni del diagrama de clases. Lo valida el esquema propio `ClienteNuevo` de M5 (constante `NOMBRE_LARGO_MAXIMO`) antes de llamar a M4. M4 tampoco acota el largo del nombre y M5 no puede cambiar `atencion` (AGENTS.md, sección 9.3), así que se avisa a su responsable. Precisa S42 solo para el largo: el contenido del nombre (obligatorio, solo letras y espacios) sigue siendo de M4 y M5 no lo copia en el backend. El frontend filtra al escribir o pegar todo lo que no sea una letra o un espacio (espejo de la regla de M4, que hay que actualizar si M4 cambia, como en S42), con `maxLength` de 60, y muestra «El nombre admite hasta 60 caracteres» si se supera.
- Supuesto: S71. Desplegable «Clientes registrados» en el alta (corrección 2026-11-13, pedido de la responsable del módulo, **pendiente de validación del equipo**). Solo frontend. Lista los clientes de `GET /clientes?limit=100&offset=0` de M4 (permiso `CLIENTES_GESTIONAR`), pedido por el `api.ts` de `reservas` (S43), ordenados por nombre en el frontend, hasta 100 (el máximo de una página). Si hay más de 100 se avisa y se usa el buscador de S43. Elegir un cliente del desplegable equivale a elegirlo en el buscador. No cambia el contrato de M4 ni agrega endpoints a M5. El modal de edición no lo muestra (S43).
- Supuesto: S72. Ubicación del error de capacidad (corrección 2026-11-13, pedido de la responsable del módulo, **pendiente de validación del equipo**). El error de capacidad de S67 se muestra bajo el campo Mesa y no bajo Cantidad de personas ni como alerta general del modal: la validación local del alta («La mesa elegida admite hasta N personas.») y el 409 del servidor «La mesa {id} admite hasta {capacidad} personas», en el alta y en la modificación (en la modificación el campo Mesa es de solo lectura y muestra el error). El frontend distingue este 409 de los demás por su mensaje; los demás 404, 409 y 422 siguen siendo error general. Precisa S34 y S67. El backend no cambia.

## Adenda 2026-11-12

Ocupación de la mesa por ventana de 2 horas, a pedido expreso del responsable del módulo M5. Esta adenda **revierte S4**: hasta ahora una mesa solo chocaba con otra reserva `ACTIVA` en exactamente la misma `fecha` y `hora`, y «no se modela duración». Desde ahora rige S69:

- Toda reserva `ACTIVA` o `ATENDIDA` ocupa su mesa 2 horas desde su `hora` (comparación estricta, también entre un día y el siguiente); las canceladas no cuentan.
- El alta, la modificación y `GET /reservas/mesas-disponibles` comparten una sola definición de «mesa ocupada»; la duración está en una constante única y el `repository` la recibe como parámetro.
- El 409 pasa a decir «La mesa {mesa_id} ya tiene una reserva el {fecha} a las {hora}; cada reserva ocupa la mesa 2 horas», con la fecha y la hora de la reserva que conflicta. El mensaje se arma en un solo lugar y lo comparten la verificación previa y la carrera por el índice único (R13).
- La modificación revisa la ventana solo si cambian `fecha` u `hora`, y la propia reserva no cuenta.
- El estado `OCUPADA` de la mesa en M3 (S30) sigue sin excluir una mesa por sí solo.
- Sin migración, sin cambio de modelo y sin cambio de frontend; el índice único parcial queda como está y sigue siendo la defensa del turno exacto. El límite conocido de las solicitudes simultáneas con turnos superpuestos pero distintos está en S69.
- Alcance de las reescrituras: S4, S7, S9, S17, S21 y S30 cambian de texto sin cambiar de número; se agrega S69. Se numeró S69 y no el siguiente de este archivo (S68) para evitar el choque con el supuesto S68 del PR #243, que sigue abierto y lo agrega en otro cambio. En este archivo el último número anterior es S67 (S66 y S67 llegaron con el PR #240); S44 a S65 están en los cambios hermanos de M5.
- Todo lo anterior es un `Supuesto:` para que el equipo lo valide (AGENTS.md, sección 9.2).

## Adenda 2026-11-13

Validaciones del formulario de reserva, a pedido expreso de la responsable del módulo M5. Esta adenda **revisa S66** y agrega S70, S71 y S72:

- El teléfono del cliente nuevo ya no admite espacios en el interior (S66 revisado): `+` opcional solo al inicio, dígitos y guiones; los espacios de los extremos se siguen recortando; 6 a 15 dígitos y 20 caracteres. El mensaje pasa a «telefono solo admite dígitos, guiones y + al inicio» y un espacio interior responde 422. El campo del frontend descarta los espacios al escribir o pegar.
- El nombre del cliente nuevo admite hasta 60 caracteres (S70): lo valida el esquema propio `ClienteNuevo` de M5 y responde 422 «nombre admite hasta 60 caracteres» con 61 o más; el contenido del nombre sigue siendo de M4 (S42). El campo del frontend filtra lo que no sea letra o espacio y limita a 60.
- El alta del formulario ofrece un desplegable «Clientes registrados» con los clientes de `GET /clientes?limit=100&offset=0` de M4 (S71). Es solo frontend.
- El error de capacidad (local o 409) se muestra bajo el campo Mesa y no bajo Cantidad de personas ni como alerta general (S72). El backend no cambia.
- Backend: solo cambia `ClienteNuevo` (la expresión regular del teléfono, su mensaje y un validador del largo del nombre). Sin migración, sin cambio de modelo, sin endpoints nuevos y sin cambios en M4 ni en `shared/`.
- Alcance de las reescrituras: S66 cambia de texto sin cambiar de número; S42 y S67 reciben una nota; se agregan S70, S71 y S72. S68 pertenece al cambio HU-M5-06 y S69 es de este archivo, así que los números nuevos siguen desde S70; el último de este archivo es S72.
- A avisar al responsable de M4: su regla de teléfono admite espacios y ni su regla de nombre ni la de teléfono acotan el largo; M5 no puede cambiar `atencion` (AGENTS.md, sección 9.3).
- Todo lo anterior es un `Supuesto:` para que el equipo lo valide (AGENTS.md, sección 9.2).
