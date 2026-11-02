# Propuesta: HU-M5-04-05 Cancelar una reserva (anticipada y por ausencia)

- **HU incluidas:**
  - **HU-M5-04** ([issue #65](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/65)) «Cancelar una reserva anticipadamente»: «Como encargado, quiero cancelar una reserva anticipadamente para liberar la mesa.»
  - **HU-M5-05** ([issue #66](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/66)) «Cancelar una reserva por ausencia»: «Como encargado, quiero cancelar una reserva por ausencia para liberar la mesa y registrar el ausente.»
- **Issues:** el PR lleva `Closes #65` y `Closes #66`, uno por línea. En esta fase no se pudieron leer los issues con `gh` (sin acceso a la terminal); el texto y los criterios salen del pedido del orquestador y hay que confirmarlos contra los issues antes de la spec.
- **Módulo:** M5 Reservas. **Responsable:** Federico Cabaña. **Rama:** `feature/HU-M5-04-05-cancelaciones`, creada desde `feature/HU-M5-01-02-03-abm-reservas-v2` (PR #211, todavía sin integrar). Un solo cambio con un solo PR: las dos cancelaciones son las bajas lógicas de `Reserva` y tienen el mismo responsable (AGENTS.md §4, ver S1).
- **Exploración:** `openspec/changes/HU-M5-04-05/exploration.md`.

## Intención

Hoy una reserva `ACTIVA` no puede dejar de estarlo: si el cliente avisa que no viene, o directamente no viene, la mesa queda tomada para ese turno y no se puede volver a reservar. Este cambio agrega las dos cancelaciones que pide el módulo:

- **Anticipada (HU-M5-04):** el encargado cancela una reserva futura y la mesa queda libre para ese horario. Si la reserva ya estaba cancelada, se avisa.
- **Por ausencia (HU-M5-05):** llegada la hora de la reserva, el encargado la cancela porque el cliente no vino; la mesa queda libre y queda registrado que no vino. Si la hora todavía no llegó, no se permite y se avisa.

El registro de la ausencia es el estado `CANCELADA_POR_AUSENCIA`, que más adelante usa el reporte de ausentismo (HU-M5-07, Sprint 4), sin construirlo ahora.

## Alcance

### Incluido

- **Backend:** dos funciones nuevas en `reservas/service.py` (`cancelar_anticipada` y `cancelar_por_ausencia`, nombres del diagrama de clases) y dos endpoints en `reservas/router.py`.
- **HU-M5-04:** `POST /api/v1/reservas/{reserva_id}/cancelar-anticipada`, que pasa una reserva `ACTIVA` a `CANCELADA_ANTICIPADA`.
- **HU-M5-05:** `POST /api/v1/reservas/{reserva_id}/cancelar-por-ausencia`, que pasa una reserva `ACTIVA` cuyo horario ya llegó a `CANCELADA_POR_AUSENCIA`.
- **Frontend:** dos acciones nuevas por fila en `ReservasTabla`, visibles solo en las reservas `ACTIVA` (igual que «Modificar reserva»), cada una con su diálogo de confirmación (`useConfirm`, variante `danger`), su aviso de resultado (`useToast`) y la recarga del listado; dos funciones nuevas en `api.ts`.
- Una prueba por criterio de aceptación de cada HU (camino feliz y error o límite), con Strict TDD.

### Excluido

- Generar una comanda desde una reserva (HU-M5-06): es otro cambio. La transición a `ATENDIDA` es parte de esa HU.
- El reporte de reservas y ausentismo (HU-M5-07).
- Cualquier cambio de esquema o migración: los cuatro estados ya existen en `EstadoReserva` y en la columna `estado`.
- Contadores de ausencias en `Cliente` u otros cambios en M4 (`atencion/`); cambios en M3 (`salon/`) o en `shared/`.
- Deshacer una cancelación (volver a `ACTIVA`): ninguna HU lo pide.
- Un paso explícito para «liberar la mesa»: no hace falta (ver Enfoque).

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `reservas-gestion`: se agregan los requisitos de cancelación anticipada y por ausencia (transiciones `ACTIVA → CANCELADA_ANTICIPADA` y `ACTIVA → CANCELADA_POR_AUSENCIA`, sus reglas, códigos y acciones de la pantalla). **Observación:** esa capacidad todavía vive solo en `openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md` (cambio sin archivar); `openspec/specs/` no tiene ninguna spec de reservas. Por eso la spec de este cambio es un delta sobre una capacidad aún no archivada; si HU-M5-01-02-03 se archiva antes, el delta se aplica sobre `openspec/specs/reservas-gestion/spec.md`.

## Enfoque

### Decisión: dos endpoints `POST`, sin cuerpo

Se proponen `POST /reservas/{reserva_id}/cancelar-anticipada` y `POST /reservas/{reserva_id}/cancelar-por-ausencia`, que responden **200** con la `ReservaSalida` actualizada.

- **`POST` y no `PUT`:** D-24 (`SPRINT-0/S0-05-arquitectura.md`) fija las acciones de negocio como `POST` sobre un subrecurso verbal y descarta cambiar el estado con un `PUT`. Todo el proyecto lo sigue (`/comandas/{id}/cerrar`, `/sectores/{id}/baja`, `/mozos/{id}/baja`, `/platos/{id}/baja`); ningún módulo usa `PUT` para una transición.
- **Dos rutas y no una con un motivo:** el diagrama de clases declara dos operaciones separadas en `Reserva` (`cancelarAnticipada()` y `cancelarPorAusencia()`); cada HU tiene sus criterios y su regla de tiempo (opuestas entre sí); D-24 pide que el cambio de estado sea «explícito en la API y en los servicios». Con dos rutas, cada endpoint, cada función del `service` y cada prueba corresponden a una sola HU, y no hace falta un schema de entrada ni validar un motivo desconocido (un 422 más que probar).
- **Diferencia con el ejemplo de D-24:** D-24 menciona `POST /reservas/{id}/cancelar` como ejemplo, escrito antes de que existieran las dos HU. Se registra como S2 para que el equipo lo valide; la alternativa (una ruta con `{"motivo": "ANTICIPADA" | "AUSENCIA"}`) es viable, pero mezcla las dos reglas en un mismo endpoint.

### Reglas de negocio

Orden de las verificaciones en las dos funciones: existencia (404), estado (409), hora (409). Cada una lee la reserva una sola vez con `_obtener`, decide con `ahora()` y confirma con un `commit`.

| Caso | Anticipada | Por ausencia | Código |
| --- | --- | --- | --- |
| La reserva no existe | `"La reserva {id} no existe"` (el `_obtener` actual) | igual | 404 |
| Ya está `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA` | `"La reserva {id} ya fue cancelada"` | igual | 409 |
| Está `ATENDIDA` | `"La reserva {id} ya fue atendida y no se puede cancelar"` | igual | 409 |
| El horario todavía no llegó: `(fecha, hora) > ahora()` | se cancela | `"La reserva {id} todavía no llegó a su hora y no se puede cancelar por ausencia"` | 200 / 409 |
| El horario ya llegó: `(fecha, hora) <= ahora()` | ver S3 | se cancela | 200 |

- **Límite de la hora:** la comparación es en minutos, con la misma `ahora()` (UTC-3 fija, S28) y la misma precisión que el alta. A las 21:00 en punto, una reserva de las 21:00 ya «llegó a su hora» y se puede cancelar por ausencia. Es el complemento exacto de `_validar_momento`, que en el alta rechaza `hora <= ahora`. No se agrega tolerancia (S4).
- **409 y no 422:** según `app/shared/excepciones.py`, 422 es para datos del pedido que no cumplen una regla de forma o de contenido; acá el pedido no trae datos. Que la reserva ya esté cancelada o que su hora no haya llegado depende del estado del recurso y del reloj: es un choque con una regla de negocio, como «modificar una reserva no activa» (S7) o «mesa fuera de servicio» (S31), ambos 409.
- **Mensajes:** la guarda actual `_validar_activa` dice «no se puede modificar»; la cancelación usa su propia guarda con los mensajes de la tabla, para que el aviso de CA2 de HU-M5-04 diga «ya fue cancelada». Los textos exactos se fijan en la spec (S5).

### Liberar la mesa es automático

No hay paso de «liberar la mesa». El alta y la modificación (`repository.existe_reserva_activa`), la lista de mesas disponibles (`repository.ids_de_mesas_con_reserva_activa`) y el índice único parcial `ux_reservas_mesa_fecha_hora_activa` solo cuentan las reservas `ACTIVA`. En cuanto la reserva pasa a un estado cancelado, la mesa vuelve a figurar disponible para esa fecha y hora y admite una reserva nueva en el mismo turno. El `estado` de la mesa en M3 no se toca (las reservas nunca lo cambiaron). La spec prueba esta consecuencia de punta a punta para el CA1 de cada HU: después de cancelar, la mesa aparece en `GET /reservas/mesas-disponibles` para ese turno.

### Registro de la ausencia

El estado `CANCELADA_POR_AUSENCIA` es el registro de que el cliente no vino (S6). La reserva conserva `cliente_id`, `fecha` y `hora`, que es lo que necesita el reporte por período de HU-M5-07. El listado ya filtra por ese estado.

### Frontend

- `api.ts`: `cancelarReservaAnticipada(id)` y `cancelarReservaPorAusencia(id)`, con el patrón del proyecto para acciones sin cuerpo (`clienteHttp.post<Reserva, Record<string, never>>(..., {})`).
- Un hook nuevo en `components/` (por ejemplo `useCancelarReserva`, uno solo con las dos acciones, o dos hooks si el diseño lo prefiere), copiado de `salon/components/useBajaMesa.ts`: confirmación con `useConfirm` (`variante: 'danger'`), estado de «cancelando», llamada al `api.ts`, aviso de éxito y recarga del listado, o aviso `danger` con el `detalle` del backend (por ejemplo, el 409 de «todavía no llegó a su hora»).
- `ReservasTabla`: la columna de acciones suma dos botones con `aria-label` propios («Cancelar reserva» y «Cancelar por ausencia»), solo en las filas `ACTIVA`, junto a «Modificar reserva». Las props nuevas (`onCancelarAnticipada`, `onCancelarPorAusencia`) se conectan en `ReservasPage`.
- Los dos botones se muestran en toda fila `ACTIVA`, sin calcular la hora en el navegador: el backend decide y el aviso muestra su mensaje (S7).
- La maqueta tiene un solo botón «Cancelar reserva»; las HU piden dos cancelaciones distintas, así que se agregan dos y la diferencia se anota en el PR (AGENTS.md §2 y §5).

## Supuestos a validar por el equipo

| # | Supuesto: |
| --- | --- |
| S1 | **Agrupamiento, confirmado por la persona (2026-11-02).** HU-M5-04 y HU-M5-05 van juntas como las dos bajas lógicas de `Reserva` (AGENTS.md §4 usa `HU-M5-01-02-04` como ejemplo, con HU-M5-04 como baja). El mismo §4 excluye «flujos de estado» y el plan llama «flujos» a las cancelaciones; se mantienen juntas porque no hay una HU de baja aparte y las dos tocan el mismo estado de la misma entidad. |
| S2 | **Dos rutas en lugar del `/cancelar` del ejemplo de D-24, confirmado por la persona (2026-11-02).** Se usan `/cancelar-anticipada` y `/cancelar-por-ausencia`, ambas `POST` sin cuerpo, por las dos operaciones del diagrama de clases y sus reglas de tiempo opuestas. |
| S3 | **Cancelación anticipada de una reserva cuya hora ya llegó, confirmado por la persona (2026-11-02).** Se rechaza con 409 `"La reserva {id} ya llegó a su hora; si el cliente no vino, cancélela por ausencia"`, porque «anticipadamente» y «una reserva futura» indican que es antes del horario, y así el ausentismo no se pierde. |
| S4 | **Sin tolerancia ni límite superior para la ausencia.** Por ausencia se cancela desde el minuto exacto de la reserva (`(fecha, hora) <= ahora()`), sin minutos de gracia y sin límite de días hacia atrás. |
| S5 | **Mensajes y códigos:** 404 si la reserva no existe; 409 si ya fue cancelada, si fue atendida o si no se cumple la regla de hora. Respuesta 200 con la reserva actualizada. |
| S6 | **«Registrar el ausente»** se cumple con el estado `CANCELADA_POR_AUSENCIA` de la reserva; no se agrega un contador en `Cliente` (M4) ni un campo nuevo. |
| S7 | **Botones en la pantalla:** las dos acciones se muestran en toda reserva `ACTIVA`; la regla de hora la aplica el backend y el aviso muestra su mensaje. Evita depender del reloj del navegador (que puede diferir del servidor). |
| S8 | **Sin concurrencia especial:** si dos personas cancelan la misma reserva a la vez, la segunda recibe el 409 «ya fue cancelada» si lee después del `commit` de la primera; no se agrega bloqueo. |

### Preguntas abiertas (decisiones de producto)

Ninguna: S1, S2 y S3 quedaron confirmadas por la persona el 2026-11-02 (ver la tabla de arriba). Quedan los supuestos S4 a S8 para validar con el equipo, como cualquier otro `Supuesto:` de la spec (AGENTS.md §9.2).

## Áreas afectadas

| Área | Impacto | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/service.py` | Modificado | `cancelar_anticipada`, `cancelar_por_ausencia` y una guarda de estado con mensajes de cancelación |
| `backend/app/modules/reservas/router.py` | Modificado | Dos rutas `POST /reservas/{reserva_id}/cancelar-anticipada` y `/cancelar-por-ausencia` |
| `backend/app/modules/reservas/schemas.py` | Sin cambios | Se reutiliza `ReservaSalida`; no hay cuerpo de entrada |
| `backend/app/modules/reservas/{models,repository,puente}.py` | Sin cambios | Los estados y las consultas ya existen |
| `backend/tests/modules/reservas/test_service.py`, `test_router.py` | Modificado | Escenarios de los CA, límites de hora y la mesa liberada |
| `frontend/src/modules/reservas/api.ts` (+ `api.test.ts`) | Modificado | `cancelarReservaAnticipada` y `cancelarReservaPorAusencia` |
| `frontend/src/modules/reservas/types.ts` | Sin cambios previstos | `EstadoReserva` y `Reserva` ya cubren la respuesta |
| `frontend/src/modules/reservas/components/useCancelarReserva.ts` (+ prueba) | Nuevo | Confirmación, llamada y avisos, como `useBajaMesa` |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx` (+ prueba) | Modificado | Dos acciones nuevas en las filas `ACTIVA` |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` (+ prueba) y `components/index.ts` | Modificado | Conexión de las acciones y recarga del listado |
| Migraciones, `alembic/`, `shared/`, M3, M4 | Sin cambios | No hay cambio de esquema ni de otros módulos |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| La redacción de «ya llegó la hora» se interpreta distinto (por ejemplo, con tolerancia) y el equipo pide otro límite. | (a estimar por el equipo) | Regla explícita en S4 con pruebas en el minuto exacto, un minuto antes y un minuto después; cambiar la tolerancia es local a una función. |
| La decisión de S3 cambia después de implementar. | (a estimar por el equipo) | Es una sola verificación con su prueba; se resuelve antes de la spec. |
| El reloj del servidor difiere del restaurante. | (a estimar por el equipo) | `ahora()` ya calcula UTC-3 desde el reloj UTC, sin depender de `TZ` (S28). |
| La rama nace de otra rama sin integrar (PR #211); si ese PR cambia por la revisión, hay que rebasar. | (a estimar por el equipo) | Abrir este PR después de integrar #211, o rebasar sobre `develop` una vez integrado; el cambio toca pocas líneas del código heredado. |
| La spec de `reservas-gestion` no está archivada y el delta se apoya en un cambio abierto. | (a estimar por el equipo) | Escribir el delta contra la spec de HU-M5-01-02-03 y ajustarlo si se archiva antes. |
| La pantalla difiere de la maqueta (dos botones en lugar de uno). | (a estimar por el equipo) | Diferencia justificada por las HU y anotada en el PR. |

Los riesgos no llevan valores de probabilidad (AGENTS.md §9.9). Ninguno involucra el esquema.

## Plan de reversión

El cambio **no toca el esquema**: no hay migración nueva ni cambia ningún `model`. Los estados `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA` ya existían y eran válidos en la columna `estado`.

1. **Antes de integrar:** descartar la rama o revertir sus commits; ni `develop` ni la base cambian.
2. **Ya integrado en `develop`:** revertir el merge (`git revert -m 1 <merge>`). No hace falta ningún `alembic downgrade`.
3. **Datos:** las reservas que se cancelaron mientras el cambio estuvo activo siguen con su estado cancelado, que es válido con o sin este código; no se pierden datos ni queda la base inconsistente. Si hiciera falta reactivar alguna, es una corrección manual y puntual, fuera de este plan.
4. **Verificación:** `pytest` y `npm test` en verde, y `alembic heads` sin cambios.

## Dependencias

- PR #211 (HU-M5-01-02-03, ABM de reservas): este cambio parte de su rama y no se integra antes que él.
- Confirmar el texto de los issues #65 y #66 antes de la spec.
- **Seguimiento (fuera de este PR):** HU-M5-06 (comanda desde reserva, transición a `ATENDIDA`) y HU-M5-07 (reporte de reservas y ausentismo, que consume `CANCELADA_POR_AUSENCIA`).

## Orden de implementación sugerido

1. **HU-M5-04:** guarda de estado y `cancelar_anticipada` en el `service`, ruta, pruebas (incluida la mesa liberada); después la función del `api.ts`, el hook y la acción en la tabla.
2. **HU-M5-05:** `cancelar_por_ausencia` con la regla de hora y sus límites, ruta y pruebas; después la segunda acción.

## Presupuesto de revisión estimado (punto de control, no bloqueo)

| Lado | Límite | Estimación | Detalle |
| --- | --- | --- | --- |
| `backend/` | 800 | ~200 a 300 | `service` ~40, `router` ~15, pruebas ~150 a 250 |
| `frontend/` | 800 | ~350 a 500 | `api.ts` ~15, hook ~60 a 80, tabla y página ~40, pruebas ~230 a 360 |

## Criterios de éxito

- [ ] HU-M5-04 CA1: cancelar anticipadamente una reserva futura `ACTIVA` responde 200, la deja `CANCELADA_ANTICIPADA` y la mesa vuelve a figurar disponible para ese turno.
- [ ] HU-M5-04 CA2: cancelar una reserva ya cancelada responde 409 «ya fue cancelada» y la pantalla muestra el aviso.
- [ ] HU-M5-05 CA1: cancelar por ausencia una reserva `ACTIVA` cuya hora ya llegó responde 200, la deja `CANCELADA_POR_AUSENCIA` y la mesa vuelve a figurar disponible para ese turno.
- [ ] HU-M5-05 CA2: cancelar por ausencia una reserva cuya hora todavía no llegó responde 409 y la pantalla muestra el aviso; la reserva sigue `ACTIVA`.
- [ ] Límites probados: un minuto antes, el minuto exacto y un minuto después de la hora de la reserva; 404 para una reserva inexistente; 409 para una `ATENDIDA`.
- [ ] Las acciones aparecen solo en las filas `ACTIVA` y cada una pide confirmación antes de llamar a la API.
- [ ] Sin migración nueva; sin cambios en M3, M4 ni `shared/`; `lint-imports` pasa sin tocar contratos.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, Vitest ≥ 60 %, lint, typecheck y build.
- [ ] El equipo valida S1 a S8 y resuelve las preguntas abiertas.
- [ ] El PR enlaza los dos issues (`Closes #65` y `Closes #66`, uno por línea) y anota la diferencia con la maqueta.
