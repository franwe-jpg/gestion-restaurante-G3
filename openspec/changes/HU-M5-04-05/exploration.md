# Exploración: HU-M5-04-05 Cancelar una reserva (anticipada y por ausencia)

- **Módulo:** M5 Reservas. **Responsable:** Federico Cabaña.
- **Rama:** `feature/HU-M5-04-05-cancelaciones`, creada desde `feature/HU-M5-01-02-03-abm-reservas-v2` (ABM completo, PR #211 abierto y todavía no integrado en `develop`).
- **Issues:** [#65](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/65) (HU-M5-04) y [#66](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/66) (HU-M5-05).

## 1. Las dos HU

> **Nota de verificación:** en esta fase no se pudo ejecutar `gh issue view 65` ni `gh issue view 66` (la sesión no tenía acceso a la terminal). El texto de abajo es el que entregó el orquestador. Antes de la spec hay que confirmar que coincide con los issues.

**HU-M5-04 (#65) «Cancelar una reserva anticipadamente».** Como encargado, quiero cancelar una reserva anticipadamente para liberar la mesa.

- CA1: una reserva futura, al cancelarla, la mesa queda libre para ese horario.
- CA2: si ya fue cancelada, al intentar cancelarla de nuevo, se avisa.

**HU-M5-05 (#66) «Cancelar una reserva por ausencia».** Como encargado, quiero cancelar una reserva por ausencia para liberar la mesa y registrar el ausente.

- CA1: si el cliente no llegó a la hora de la reserva, al cancelarla por ausencia, la mesa queda libre y se registra que no vino.
- CA2: si todavía no llegó la hora de la reserva, al intentar cancelarla por ausencia, no se permite y se avisa.

Contexto del plan: `SPRINT-0/Plan-de-trabajo-Sprint.md:288` (tarjeta S3-M5) agrupa el ABM, las cancelaciones y la comanda desde una reserva; la línea 102 dice que el reporte de M5 es «Reservas y ausentismo por período» (HU-M5-07, Sprint 4). Este cambio solo deja disponible el dato (`CANCELADA_POR_AUSENCIA`); no arma el reporte.

## 2. Agrupamiento de las dos HU

- AGENTS.md §4 permite agrupar alta, baja, modificación y listado de una misma entidad con el mismo responsable, y da como ejemplo de nombre `HU-M5-01-02-04`: es decir, el propio archivo trata a HU-M5-04 como la baja de `Reserva`. M5 no tiene ninguna HU «Eliminar reserva»; la cancelación es su baja lógica.
- **Tensión a señalar:** el mismo §4 dice que no se juntan «flujos de estado (cerrar y reabrir una comanda, facturar y cobrar)», y el plan (línea 255) llama «flujos» a las cancelaciones. HU-M5-04 encaja como baja; HU-M5-05 es una segunda baja de la misma entidad con otra regla. El agrupamiento lo eligió la persona responsable; se deja registrado para que el equipo lo valide (ver la pregunta abierta P1).

## 3. Backend actual (rama de origen)

### Modelo (`backend/app/modules/reservas/models.py`)

- `EstadoReserva` ya tiene `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA` (líneas 12-16). Los dos estados de cancelación existen y hoy no se usan.
- `estado` se guarda con `sa.Enum(EstadoReserva, native_enum=False)`: acepta los cuatro valores sin cambios de esquema.
- Índice único parcial `ux_reservas_mesa_fecha_hora_activa` sobre `(mesa_id, fecha, hora)` con `WHERE estado = 'ACTIVA'` (líneas 24-31). Una reserva que deja de estar `ACTIVA` sale del índice, así que cancelar nunca puede violarlo.
- **Conclusión: no hace falta migración.**

### Diagrama de clases

`SPRINT-0/G3 - Diagrama de clases unificado.drawio` (línea 100) y `G3 - Diagramas por modulo.drawio` (líneas 753 y 756) declaran en `Reserva` dos operaciones separadas: `cancelarAnticipada()` y `cancelarPorAusencia()`.

### Service (`backend/app/modules/reservas/service.py`)

- `ahora()` (líneas 26-32): fecha y hora del restaurante en UTC-3 fija, sin zona; las pruebas la reemplazan (S28).
- `_validar_momento(fecha, hora)` (líneas 52-58): para el alta y la modificación, rechaza con 422 una fecha anterior a hoy y, si es hoy, una hora `<=` a la actual, comparando en minutos. HU-M5-05 necesita la regla **opuesta**: por ausencia solo se cancela cuando el horario de la reserva ya llegó.
- `_obtener(db, id)` (líneas 107-111): 404 `"La reserva {id} no existe"`. Reutilizable tal cual.
- `_validar_activa(reserva)` (líneas 114-117): 409 `"La reserva {id} no está activa y no se puede modificar"`. El mensaje habla de modificar; la cancelación necesita una guarda equivalente con un mensaje propio («ya fue cancelada», CA2 de HU-M5-04).
- `_confirmar(db, reserva)` (líneas 75-87) existe para atrapar la carrera del índice único al crear o modificar. Para cancelar no hay índice que violar: alcanza con `repository.agregar` + `db.commit()`, o se puede reutilizar `_confirmar` sabiendo que el `except` no se va a disparar.
- Hallazgo heredado (`openspec/changes/HU-M5-01-02-03/apply-progress.md:316`): tras un `rollback`, una entidad persistente se recarga con los valores de la base; los mensajes de error deben armarse antes de escribir. Aplica a la cancelación si se usa `_confirmar`.

### Repository (`backend/app/modules/reservas/repository.py`)

- `existe_reserva_activa` (líneas 22-37) e `ids_de_mesas_con_reserva_activa` (líneas 40-51) filtran `Reserva.estado == EstadoReserva.ACTIVA`.
- **«Liberar la mesa» es automático.** El alta, la modificación (`_validar_turno_libre`) y `GET /reservas/mesas-disponibles` (`listar_mesas_disponibles`) solo consideran ocupado un turno con una reserva `ACTIVA`. En cuanto la reserva cambia a `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA`, la mesa vuelve a figurar disponible para esa fecha y hora, y el índice parcial permite una reserva nueva en el mismo turno. No hay que diseñar ningún paso adicional para liberar la mesa; tampoco se toca el `estado` de la mesa en M3 (la reserva nunca lo cambió).
- No hace falta ninguna consulta nueva.

### Schemas (`backend/app/modules/reservas/schemas.py`)

- `ReservaSalida` ya expone `estado`. La respuesta de una cancelación puede ser la reserva actualizada con el schema existente. No hace falta schema de entrada si cada cancelación es su propio endpoint sin cuerpo.

### Router (`backend/app/modules/reservas/router.py`)

- Rutas actuales: `POST /reservas`, `GET /reservas`, `GET /reservas/mesas-disponibles`, `GET /reservas/{reserva_id}`, `PUT /reservas/{reserva_id}`.
- Convención del proyecto para transiciones de estado: **D-24** (`SPRINT-0/S0-05-arquitectura.md:196`) dice «Acciones de negocio como `POST` sobre un subrecurso verbal: `POST /comandas/{id}/cerrar`, `/reabrir`, `POST /reservas/{id}/cancelar`», y descarta «modificar el estado con un `PUT` genérico». El código lo sigue: `POST /comandas/{comanda_id}/cerrar` (`atencion/router.py:56`), `POST /sectores/{id}/baja`, `POST /mozos/{id}/baja`, `POST /platos/{id}/baja`, `POST /menus-del-dia/{id}/baja`. **Ningún módulo usa `PUT` para una transición.** La sugerencia inicial de `PUT /reservas/{id}/cancelar-...` contradice D-24.
- El ejemplo de D-24 nombra un solo `/cancelar`, pero es ilustrativo y anterior a la definición de las dos HU; el diagrama de clases sí separa las dos operaciones.

### Excepciones (`backend/app/shared/excepciones.py`)

- `NoEncontradoError` → 404; `ReglaDeNegocioError` → 409 («la operación choca con una regla de negocio»); `DatosInvalidosError` → 422 («los datos recibidos no cumplen una regla de forma o de contenido»).
- Precedentes en el módulo: reserva no `ACTIVA` al modificar → 409; mesa fuera de servicio → 409 (S31); fecha u hora pasadas en el alta → 422, porque son datos del pedido.
- En una cancelación el pedido no trae datos (solo el `id` de la ruta). Que la reserva ya esté cancelada, o que su hora todavía no haya llegado, depende del estado del recurso y del reloj, no de un dato mal formado: corresponde **409**.

### Contratos de importación

`backend/pyproject.toml`: `reservas` solo importa `app.modules.salon.service` (desde `puente.py`). La cancelación no necesita a M3 ni a M4: no se agregan importaciones.

## 4. Frontend actual (rama de origen)

- `frontend/src/modules/reservas/components/ReservasTabla.tsx`: `columnaAcciones(onModificar)` (líneas 44-61) muestra el botón «Modificar reserva» (ícono `Pencil`) solo cuando `r.estado === 'ACTIVA'`; en las demás filas devuelve `null`.
- `frontend/src/modules/reservas/pages/ReservasPage.tsx`: `ListadoDelDia` pasa `onModificar` a la tabla; `listado.reservas.recargar()` recarga la página actual después de guardar.
- `frontend/src/modules/reservas/api.ts`: `listarReservas`, `listarMesasDisponibles`, `crearReserva`, `modificarReserva`. Patrón del resto del proyecto para una acción sin cuerpo: `clienteHttp.post<T, Record<string, never>>(\`/.../${id}/baja\`, {})` (salon, menus, productos, `atencion/api.ts:50` para `/cerrar`).
- `frontend/src/modules/reservas/types.ts`: `EstadoReserva` ya incluye los cuatro estados; no hace falta tipo nuevo, la respuesta es `Reserva`.
- `frontend/src/modules/reservas/components/estadosReserva.ts`: las etiquetas «Cancelada anticipada» (`neutral`) y «Cancelada por ausencia» (`danger`) ya existen y el filtro de estado ya las ofrece.
- Patrón a replicar: `frontend/src/modules/salon/components/useBajaMesa.ts` — `useConfirm` (`titulo`, `descripcion`, `textoConfirmar`, `textoCancelar`, `variante: 'danger'`), estado `eliminando`, llamada al `api.ts`, `mostrarToast` de éxito y `onEliminada()`, o toast `danger` con `respuesta.error` (el `detalle` del backend).
- Maqueta (`SPRINT-2/S2-04-maqueta/reservas.html:115`): muestra **un solo** botón «Cancelar reserva» (ícono de círculo con cruz) por fila. Las HU piden dos cancelaciones distintas; la maqueta tiene prioridad más baja (AGENTS.md §2) y la diferencia se anota en el PR.

## 5. Preguntas que la propuesta debe resolver

| # | Pregunta | Evidencia | Inclinación |
| --- | --- | --- | --- |
| P1 | ¿Se agrupan HU-M5-04 y HU-M5-05 en un solo cambio? | AGENTS.md §4 (ejemplo `HU-M5-01-02-04` vs. «no se juntan flujos de estado») | Sí, como las dos bajas de `Reserva`; el equipo lo valida. |
| P2 | ¿Uno o dos endpoints? ¿`POST` o `PUT`? | D-24 exige `POST` sobre subrecurso verbal; el diagrama separa `cancelarAnticipada()` y `cancelarPorAusencia()`; reglas y CA distintos | Dos `POST` sin cuerpo. |
| P3 | ¿409 o 422 para «ya cancelada» y «todavía no es la hora»? | `excepciones.py`; precedentes 409 de S7 y S31 | 409 en los dos casos. |
| P4 | ¿La cancelación anticipada exige que la hora todavía no haya llegado? | La HU dice «anticipadamente» y su CA1 habla de «una reserva futura», pero ningún CA prohíbe cancelar anticipadamente una reserva vencida | Decisión de producto abierta; se propone un `Supuesto:`. |
| P5 | Límite exacto de «ya llegó la hora» | `ahora()` y precisión de minutos de S16 | Por ausencia se permite cuando `(fecha, hora) <= ahora()` en minutos; es el complemento exacto de la regla del alta. |
| P6 | ¿Qué significa «registrar el ausente»? | No hay contador de ausencias en `Cliente` (M4); el diagrama tiene `ReporteReservasAusentismo` en M5 | El estado `CANCELADA_POR_AUSENCIA` es el registro; sin tocar M4. |
| P7 | ¿Qué pasa con una reserva `ATENDIDA`? | Hoy ningún flujo produce `ATENDIDA` (lo hará HU-M5-06) | Se rechaza con 409, con un mensaje distinto del de «ya cancelada». |
| P8 | ¿El frontend muestra siempre los dos botones en las filas `ACTIVA`, u oculta el que no corresponde según la hora? | El reloj del navegador puede diferir del servidor (riesgo ya registrado en HU-M5-01-02-03) | Mostrar los dos en las filas `ACTIVA` y dejar que el backend decida; el 409 se ve en el aviso. |
