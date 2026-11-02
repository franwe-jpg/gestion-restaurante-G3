# Delta para reservas-gestion (HU-M5-04-05)

Origen: HU-M5-04 (cancelar una reserva anticipadamente, issue #65) y HU-M5-05 (cancelar una
reserva por ausencia, issue #66), un solo cambio, una rama y un PR (S39). Delta sobre
`openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md`, que hoy es el texto completo
de la capacidad `reservas-gestion` porque ese cambio todavía no se archivó.

No modifica ningún requisito existente de esa spec: agrega las dos cancelaciones, el efecto
automático de liberar la mesa y las dos acciones nuevas de la pantalla. No toca `salon-mesas` ni
ninguna otra capacidad.

Convención de los escenarios de este delta: salvo que se indique otra cosa, se reutiliza el
mismo reloj fijo de las pruebas del `service` y de la API (`backend/tests/modules/reservas/conftest.py`,
fixture `AHORA`) y el mismo doble de prueba del puente (`DoblePuente`, mesas 5 y 6, ambas del
sector «Salón», `LIBRE`, capacidad 4, `numero` igual a su `id`) que ya usan las pruebas del
módulo. Con ese reloj, «hoy» es `2026-11-02` y la hora actual de la zona del restaurante es
`12:00`. No se inventa ningún dato de fixture nuevo: todas las fechas, horas y mesas de los
escenarios de este delta son compatibles con `AHORA` y con `DoblePuente` tal como ya existen en
el código.

**Nota de contradicción (para que el equipo la resuelva, no se decide acá):** la «Convención de
los escenarios» de la spec base (`HU-M5-01-02-03/specs/reservas-gestion/spec.md`) dice que «hoy»
es `2026-10-28` y la hora actual son las `14:30`, pero el `AHORA` real del `conftest.py` (y el
comentario de `test_service.py`, «El reloj de las pruebas marca el 2026-11-02 a las 12:00») usan
otro valor. El código y las pruebas ya avanzaron sobre ese reloj; este delta sigue el valor real
del fixture (S39) y no el texto de la spec base, que quedó desactualizado.

## Contrato de la API (agregado)

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25, igual
que el resto de la capacidad.

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `POST /reservas/{reserva_id}/cancelar-anticipada` | ninguna (sin cuerpo) | 200, `ReservaSalida` con `estado` `CANCELADA_ANTICIPADA` | 404, 409 |
| `POST /reservas/{reserva_id}/cancelar-por-ausencia` | ninguna (sin cuerpo) | 200, `ReservaSalida` con `estado` `CANCELADA_POR_AUSENCIA` | 404, 409 |

Ninguna de las dos rutas valida datos de forma (no hay cuerpo), así que no agregan ningún 422
nuevo.

## ADDED Requirements

### Requisito: Cancelar una reserva anticipadamente (HU-M5-04)

`POST /api/v1/reservas/{reserva_id}/cancelar-anticipada`, sin cuerpo, DEBE pasar una reserva
`ACTIVA` a `CANCELADA_ANTICIPADA` y responder 200 con la `ReservaSalida` actualizada. El sistema
DEBE verificar en este orden: la reserva existe (404 «La reserva {id} no existe», el `_obtener`
ya existente); no está ya cancelada, en ninguno de los dos estados de cancelación (409 «La
reserva {id} ya fue cancelada»); no está `ATENDIDA` (409 «La reserva {id} ya fue atendida y no se
puede cancelar»); su `(fecha, hora)` todavía no llegó, comparada con `ahora()` en minutos (S41) —
si ya llegó o coincide exactamente con la hora actual, DEBE responder 409 «La reserva {id} ya
llegó a su hora; si el cliente no vino, cancélela por ausencia».

#### Escenario: Cancelación anticipada válida y la mesa queda disponible

- DADO una reserva `ACTIVA` con `id` 10 en la mesa 5 para `2026-11-02` a las `21:30` (hora futura,
  son las `12:00`)
- CUANDO se hace `POST /reservas/10/cancelar-anticipada`
- ENTONCES responde 200 con `estado` `CANCELADA_ANTICIPADA`
- Y `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30` incluye la mesa 5 en la lista

#### Escenario: Reserva ya cancelada, en cualquiera de los dos estados

- DADO una reserva `CANCELADA_ANTICIPADA` con `id` 11, y por separado otra
  `CANCELADA_POR_AUSENCIA` con `id` 12
- CUANDO se hace `POST /reservas/11/cancelar-anticipada`, y por separado `POST
  /reservas/12/cancelar-anticipada`
- ENTONCES las dos responden 409 con «La reserva {id} ya fue cancelada» y ninguna cambia de
  estado

#### Escenario: Reserva ya atendida

- DADO una reserva `ATENDIDA` con `id` 13
- CUANDO se hace `POST /reservas/13/cancelar-anticipada`
- ENTONCES responde 409 con «La reserva 13 ya fue atendida y no se puede cancelar» y la reserva
  sigue `ATENDIDA`

#### Escenario: La hora de la reserva ya llegó

- DADO una reserva `ACTIVA` con `id` 14 en la mesa 5 para `2026-11-02` a las `12:00` (coincide
  exactamente con la hora actual)
- CUANDO se hace `POST /reservas/14/cancelar-anticipada`
- ENTONCES responde 409 con «La reserva 14 ya llegó a su hora; si el cliente no vino, cancélela
  por ausencia» y la reserva sigue `ACTIVA`

#### Escenario: Un minuto después todavía se puede cancelar anticipadamente

- DADO una reserva `ACTIVA` con `id` 15 en la mesa 5 para `2026-11-02` a las `12:01` (un minuto
  después de la hora actual, todavía futura)
- CUANDO se hace `POST /reservas/15/cancelar-anticipada`
- ENTONCES responde 200 con `estado` `CANCELADA_ANTICIPADA`

#### Escenario: Reserva inexistente

- DADO que no existe la reserva 999
- CUANDO se hace `POST /reservas/999/cancelar-anticipada`
- ENTONCES responde 404 con «La reserva 999 no existe»

### Requisito: Cancelar una reserva por ausencia (HU-M5-05)

`POST /api/v1/reservas/{reserva_id}/cancelar-por-ausencia`, sin cuerpo, DEBE pasar una reserva
`ACTIVA` a `CANCELADA_POR_AUSENCIA` y responder 200 con la `ReservaSalida` actualizada. El sistema
DEBE verificar en este orden: la reserva existe (404 «La reserva {id} no existe»); no está ya
cancelada, en ninguno de los dos estados de cancelación (409 «La reserva {id} ya fue
cancelada»); no está `ATENDIDA` (409 «La reserva {id} ya fue atendida y no se puede cancelar»);
su `(fecha, hora)` ya llegó, es decir `(fecha, hora) <= ahora()` comparada en minutos (S42, el
complemento exacto de la regla de HU-M5-04) — una reserva llega a su propia hora en el minuto
exacto, sin minutos de gracia. Si todavía no llegó, DEBE responder 409 «La reserva {id} todavía
no llegó a su hora y no se puede cancelar por ausencia».

#### Escenario: Cancelación por ausencia válida y la mesa queda disponible

- DADO una reserva `ACTIVA` con `id` 20 en la mesa 6 para `2026-11-02` a las `11:30` (ya pasó; son
  las `12:00`)
- CUANDO se hace `POST /reservas/20/cancelar-por-ausencia`
- ENTONCES responde 200 con `estado` `CANCELADA_POR_AUSENCIA`
- Y `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=11:30` incluye la mesa 6 en la lista

#### Escenario: Límite exacto — la reserva llega a su hora en el minuto justo

- DADO una reserva `ACTIVA` con `id` 21 en la mesa 5 para `2026-11-02` a las `12:00` (coincide
  exactamente con la hora actual)
- CUANDO se hace `POST /reservas/21/cancelar-por-ausencia`
- ENTONCES responde 200 con `estado` `CANCELADA_POR_AUSENCIA` (S42: sin minutos de gracia)

#### Escenario: La hora todavía no llegó

- DADO una reserva `ACTIVA` con `id` 22 en la mesa 5 para `2026-11-02` a las `12:01` (un minuto
  después de la hora actual, todavía no llegó)
- CUANDO se hace `POST /reservas/22/cancelar-por-ausencia`
- ENTONCES responde 409 con «La reserva 22 todavía no llegó a su hora y no se puede cancelar por
  ausencia» y la reserva sigue `ACTIVA`

#### Escenario: Reserva ya cancelada o ya atendida

- DADO una reserva `CANCELADA_ANTICIPADA` con `id` 23, otra `CANCELADA_POR_AUSENCIA` con `id` 24
  y otra `ATENDIDA` con `id` 25
- CUANDO se hace `POST /reservas/{id}/cancelar-por-ausencia` sobre cada una
- ENTONCES las dos primeras responden 409 con «La reserva {id} ya fue cancelada» y la tercera
  responde 409 con «La reserva 25 ya fue atendida y no se puede cancelar»

#### Escenario: Reserva inexistente

- DADO que no existe la reserva 999
- CUANDO se hace `POST /reservas/999/cancelar-por-ausencia`
- ENTONCES responde 404 con «La reserva 999 no existe»

### Requisito: El estado cancelado excluye la mesa de la disponibilidad automáticamente

No DEBE existir ningún paso explícito de «liberar la mesa»: `repository.ids_de_mesas_con_reserva_activa`,
la verificación de turno libre del alta y el índice único parcial `ux_reservas_mesa_fecha_hora_activa`
ya cuentan solo las reservas `ACTIVA` (hallazgo de `exploration.md`, sección 3). En cuanto una
reserva pasa a `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA`, DEBE volver a figurar disponible
para esa fecha y hora en `GET /reservas/mesas-disponibles` y DEBE admitir una reserva nueva en el
mismo turno, sin ningún cambio adicional en el `service` ni en el `repository` de este requisito.

#### Escenario: Una mesa cancelada anticipadamente admite una reserva nueva en el mismo turno

- DADO una reserva `ACTIVA` con `id` 30 en la mesa 5 para `2026-11-02` a las `21:30`, cancelada
  anticipadamente (`POST /reservas/30/cancelar-anticipada`)
- CUANDO se hace `POST /reservas` con `mesa_id` 5, otro `cliente_id`, `fecha` `2026-11-02` y
  `hora` `21:30`
- ENTONCES responde 201 con `estado` `ACTIVA`, sin ningún paso adicional para liberar la mesa

#### Escenario: Una mesa cancelada por ausencia figura en la lista de disponibles de inmediato

- DADO una reserva `ACTIVA` con `id` 31 en la mesa 6 para `2026-11-02` a las `11:30` (ya pasó),
  cancelada por ausencia (`POST /reservas/31/cancelar-por-ausencia`)
- CUANDO se hace `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=11:30`
- ENTONCES la mesa 6 figura en la lista inmediatamente después de cancelar, sin ningún paso
  adicional

### Requisito: Aislamiento del módulo (HU-M5-04-05, AGENTS.md sección 9.3)

El cambio NO DEBE modificar el código de `salon/` (M3), de `atencion/` (M4) ni de `shared/`
(backend y frontend), ni los contratos de importación de `backend/pyproject.toml`. La cancelación
NO DEBE cambiar el `estado` de la mesa en M3: solo cambia `Reserva.estado`, que la cancelación
nunca tocó antes y que es lo único que cambia ahora. El cambio NO DEBE agregar ninguna migración
de Alembic: los cuatro valores de `EstadoReserva`, incluidos `CANCELADA_ANTICIPADA` y
`CANCELADA_POR_AUSENCIA`, ya existen en el enumerado y en la columna `estado` de la tabla
`reservas` desde HU-M5-01-02-03.

#### Escenario: Contratos de importación

- DADO el módulo `reservas` con las dos cancelaciones terminadas
- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos
- Y `reservas` no agrega ninguna importación nueva de `salon` ni de `atencion`

#### Escenario: El estado de la mesa en M3 no cambia

- DADO una mesa `LIBRE` en M3 con una reserva `ACTIVA` en la mesa 5
- CUANDO se cancela esa reserva, anticipadamente o por ausencia
- ENTONCES el `estado` de la mesa en M3 sigue `LIBRE`: la cancelación nunca lo tocó

#### Escenario: Sin migración nueva

- DADO el repositorio con el cambio terminado
- CUANDO se ejecuta `alembic heads`
- ENTONCES muestra el mismo head que antes del cambio, sin ninguna migración nueva

#### Escenario: Sin cambios en módulos ajenos

- DADO el conjunto de archivos modificados por el cambio
- CUANDO se revisa
- ENTONCES no hay cambios en `backend/app/modules/salon/`, `backend/app/modules/atencion/`,
  `frontend/src/modules/salon/`, `frontend/src/modules/atencion/` ni en `shared/`

### Requisito: Dos acciones nuevas en el listado de reservas (frontend)

En cada fila `ACTIVA` de `ReservasTabla` DEBEN aparecer dos acciones nuevas, además de
«Modificar reserva»: «Cancelar reserva» (cancelación anticipada) y «Cancelar por ausencia», cada
una con su propio `aria-label` igual a su texto. Ninguna fila que no esté `ACTIVA` DEBE mostrar
alguna de las dos acciones, con la misma regla que ya usa «Modificar reserva» (HU-M5-02 CA 5).
Cada acción DEBE pedir confirmación con `useConfirm` (`variante: 'danger'`) antes de llamar a la
API, con el mismo patrón que `useBajaMesa` (`frontend/src/modules/salon/components/useBajaMesa.ts`).
Al confirmar, DEBE llamar al endpoint correspondiente de `api.ts` (`cancelarReservaAnticipada` o
`cancelarReservaPorAusencia`, sin cuerpo) y, si la API responde 200, DEBE mostrar un aviso de
éxito y volver a pedir el listado. Si la API responde 404 o 409, DEBE mostrar su `detalle` como
aviso de error (`danger`) y NO DEBE modificar la fila ni volver a pedir el listado. Cancelar el
diálogo de confirmación NO DEBE llamar a la API ni cambiar nada.

Supuesto: S47 fija los textos exactos de los diálogos y de los avisos, porque la propuesta
(sección «Frontend») solo fija los `aria-label` de los botones y el patrón de `useConfirm`, no el
`titulo`, la `descripcion` ni el texto del aviso de éxito de cada acción.

#### Escenario: Las acciones aparecen solo en las filas activas

- DADO una reserva `ACTIVA` y otra `ATENDIDA` en la tabla
- CUANDO se muestran las filas
- ENTONCES solo la `ACTIVA` ofrece «Cancelar reserva» y «Cancelar por ausencia», además de
  «Modificar reserva», y la `ATENDIDA` no ofrece ninguna de las tres

#### Escenario: Confirmar la cancelación anticipada

- DADO una fila `ACTIVA` con `id` 1
- CUANDO la persona pulsa «Cancelar reserva» y confirma el diálogo
- ENTONCES se llama a `POST /reservas/1/cancelar-anticipada`
- Y se muestra un aviso de éxito y se vuelve a pedir el listado

#### Escenario: Confirmar la cancelación por ausencia

- DADO una fila `ACTIVA` con `id` 2
- CUANDO la persona pulsa «Cancelar por ausencia» y confirma el diálogo
- ENTONCES se llama a `POST /reservas/2/cancelar-por-ausencia`
- Y se muestra un aviso de éxito y se vuelve a pedir el listado

#### Escenario: Cancelar el diálogo de confirmación no hace nada

- DADO una fila `ACTIVA` y el diálogo de confirmación de cualquiera de las dos acciones abierto
- CUANDO la persona lo cancela
- ENTONCES no se llama a ninguna API, la fila no cambia y el listado no se vuelve a pedir

#### Escenario: Un 409 muestra el aviso y no cambia la fila

- DADO una fila `ACTIVA` que, mientras tanto, ya fue cancelada por otra persona (la API responde
  409 con «La reserva {id} ya fue cancelada»)
- CUANDO la persona confirma «Cancelar reserva»
- ENTONCES se muestra el aviso `danger` con ese `detalle`, la fila sigue igual y el listado no se
  vuelve a pedir

## Supuestos

Los supuestos S39 a S47 son los de este delta. S39 a S46 vienen de la propuesta
(`openspec/changes/HU-M5-04-05/proposal.md`, sección «Supuestos a validar por el equipo», S1 a
S8), renumerados para continuar la secuencia de la capacidad `reservas-gestion` (que termina en
S38 en la spec de HU-M5-01-02-03). S39, S40 y S41 ya están confirmados por la persona responsable
el 2026-11-02; S42 a S47 quedan `Supuesto:` para que el equipo los valide (AGENTS.md, sección 9.2).

- Supuesto: S39 (proposal S1, confirmado 2026-11-02). HU-M5-04 y HU-M5-05 van en un solo cambio,
  como las dos bajas lógicas de `Reserva` (AGENTS.md §4 usa `HU-M5-01-02-04` como ejemplo, con
  HU-M5-04 como baja). El mismo §4 excluye «flujos de estado» y el plan llama «flujos» a las
  cancelaciones; se mantienen juntas porque no hay una HU de baja aparte y las dos tocan el mismo
  estado de la misma entidad.
- Supuesto: S40 (proposal S2, confirmado 2026-11-02). Dos rutas, `POST /reservas/{id}/cancelar-anticipada`
  y `POST /reservas/{id}/cancelar-por-ausencia`, en lugar del `/cancelar` único del ejemplo de
  D-24, porque el diagrama de clases declara dos operaciones separadas (`cancelarAnticipada()` y
  `cancelarPorAusencia()`) con reglas de tiempo opuestas.
- Supuesto: S41 (proposal S3, confirmado 2026-11-02). Cancelar anticipadamente una reserva cuya
  hora ya llegó se rechaza con 409 «La reserva {id} ya llegó a su hora; si el cliente no vino,
  cancélela por ausencia», porque «anticipadamente» y «una reserva futura» (CA1 de HU-M5-04)
  indican que es antes del horario, y así el ausentismo no se pierde.
- Supuesto: S42 (proposal S4). Sin tolerancia ni límite superior para la cancelación por
  ausencia: se cancela desde el minuto exacto de la reserva (`(fecha, hora) <= ahora()`), sin
  minutos de gracia y sin límite de días hacia atrás.
- Supuesto: S43 (proposal S5). Mensajes y códigos: 404 si la reserva no existe; 409 si ya fue
  cancelada, si fue atendida o si no se cumple la regla de hora de cada endpoint. Respuesta 200
  con la reserva actualizada en los dos endpoints.
- Supuesto: S44 (proposal S6). «Registrar el ausente» se cumple con el estado
  `CANCELADA_POR_AUSENCIA` de la reserva; no se agrega un contador en `Cliente` (M4) ni un campo
  nuevo. El reporte de ausentismo (HU-M5-07) queda para un cambio posterior.
- Supuesto: S45 (proposal S7). Las dos acciones de la pantalla se muestran en toda reserva
  `ACTIVA`, sin calcular la hora en el navegador: la regla de hora la aplica el backend y el
  aviso muestra su mensaje, para no depender del reloj del navegador (que puede diferir del
  servidor).
- Supuesto: S46 (proposal S8). Sin concurrencia especial: si dos personas cancelan la misma
  reserva a la vez, la segunda recibe 409 «ya fue cancelada» si lee después del `commit` de la
  primera; no se agrega bloqueo.
- Supuesto: S47 (nuevo de esta spec). Textos de pantalla que la propuesta no fija: los diálogos
  de confirmación usan `titulo` «¿Cancelar la reserva?» (anticipada) y «¿Cancelar por ausencia?»
  (por ausencia); `descripcion` «La mesa quedará disponible para ese turno.» (anticipada) y «La
  mesa quedará disponible para ese turno y se registra que el cliente no vino.» (por ausencia);
  `textoConfirmar: 'Cancelar'` y `textoCancelar: 'Volver'` en los dos, siguiendo el patrón de
  `DESCRIPCION_BAJA` de `useBajaMesa`. El aviso de éxito dice «Reserva cancelada» (anticipada) y
  «Reserva cancelada por ausencia» (por ausencia), variante `success`. El equipo valida estos
  textos antes de implementarlos.
