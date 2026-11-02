# Tareas: HU-M5-04-05 Cancelar una reserva (anticipada y por ausencia)

- **Issues:** [#65](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/65) (HU-M5-04) y
  [#66](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/66) (HU-M5-05). **Rama:**
  `feature/HU-M5-04-05-cancelaciones`, ya integrada con `develop` (merge `73d2c54`, incluye el PR
  #211 de ABM y el PR #212 de selección de cliente). **Entrada:** `proposal.md` (aprobada,
  `242ad11`), `specs/reservas-gestion/spec.md` (aprobada, `9f14816`, corregida en `ffa67de`) y
  `design.md` (aprobado, `ffa67de`; Decisiones 32 a 38). Un solo cambio, una rama y un PR hacia
  `develop` (AGENTS.md §4, S44).
- **Strict TDD activo.** Backend: `pytest` desde `backend/` (cobertura ≥ 70 %). Frontend: `npm test`
  (Vitest, cobertura ≥ 60 %). Cada tarea de código se planifica en orden **Rojo** (prueba que
  falla, y se comprueba que falla por el motivo correcto) → **Verde** (el código mínimo que la
  pasa) → **Refactor** (limpieza con las pruebas en verde). Nunca se escribe código de producción
  sin una prueba en rojo.
- **Una unidad de trabajo = un commit** (skill `work-unit-commits`): cada commit lleva su código,
  sus pruebas y su documentación juntos, y deja el repositorio verde. Conventional Commits en
  español con el ID de la HU, sin líneas de coautoría ni atribución de IA. Tipos permitidos:
  `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR hacia `develop`, sin PR encadenados.
- **Dos unidades de trabajo, backend y frontend** (ver «Decisión de los work units» más abajo):
  la Fase 1 es un solo commit de backend con las dos cancelaciones juntas (comparten la guarda
  `_obtener_cancelable` y el predicado `_llego_su_hora`, Decisión 32: separarlas por HU duplicaría
  mensajes y orden); la Fase 2 es un solo commit de frontend con el hook, la tabla y la página
  (Decisión 36: un solo hook con dos acciones, no dos hooks). Las dos quedan muy por debajo de las
  800 líneas de AGENTS.md §4 (ver «Presupuesto de revisión» más abajo): no hace falta
  `size:exception`.
- **Aislamiento (AGENTS.md §9.3, spec «Aislamiento del módulo»):** todo el trabajo queda dentro de
  `backend/app/modules/reservas/`, `backend/tests/modules/reservas/`,
  `frontend/src/modules/reservas/` y esta carpeta de `openspec/`. Sin cambios en `salon/`,
  `atencion/`, `shared/` (backend y frontend), `backend/pyproject.toml` ni `backend/alembic/`. Sin
  migración nueva: los cuatro valores de `EstadoReserva` ya existen.
- **Reloj de las pruebas del backend:** `AHORA = datetime(2026, 11, 2, 12, 0)` (fixture `reloj`,
  autouse, `backend/tests/modules/reservas/conftest.py`), confirmado tal cual en el código. Los
  escenarios de la spec usan ese mismo reloj; no hace falta ninguna fixture nueva.
  `fabrica_reserva(mesa_id=..., fecha=..., hora=..., estado=...)` ya acepta el `estado` inicial
  (confirmado en `conftest.py`); `DoblePuente` ya tiene las mesas 5 y 6 `LIBRE` (sector «Salón») y
  el cliente 7 (confirmado).
- **Matriz de amenazas:** N/A (el diseño la marca como no aplicable). Las consultas son por clave
  primaria y los errores no exponen trazas.
- **Comandos de referencia** (se citan por nombre en las tareas):
  - `V-BACK` (desde `backend/`, con el entorno virtual activo, patrón Docker de
    `HU-M5-01-02-03/apply-progress.md` si el host no tiene entorno virtual: imagen
    `g3-backend-test`, sin red, `backend/` montado en `/app`): `ruff check --fix . && ruff format .`
    y luego `ruff check . && ruff format --check . && lint-imports && pytest`. Comando enfocado
    (sin cobertura): `pytest tests/modules/reservas --no-cov` (o, en Docker,
    `python -m pytest -q --no-cov tests/modules/reservas` desde `backend/`).
  - `V-FRONT` (desde `frontend/`): `npm run format` y luego
    `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
    Comando enfocado: `npx vitest run src/modules/reservas`.

## Decisión de los work units (backend primero, frontend después)

Dos commits, no uno ni cuatro (uno por HU):

- **Un solo commit para HU-M5-04 y HU-M5-05 en el backend.** Las dos funciones comparten la guarda
  `_obtener_cancelable` (existencia, cancelada, atendida) y el predicado `_llego_su_hora`, que
  define un único límite para las dos reglas opuestas (Decisión 32). Separarlas en dos commits
  obligaría a escribir primero una función que usa una guarda que todavía no existe, o a duplicar
  esa guarda y corregirla después; ninguna de las dos HU es útil para el aviso sin la otra (el
  diálogo de «ya fue atendida», por ejemplo, lo prueban las dos). El estimado del diseño para este
  lado (`service` 35 a 45 líneas, `router` 8 a 10, pruebas 290 a 390) es una sola conducta
  entregable de ≈ 330 a 445 líneas, bien por debajo de 800.
- **Un solo commit para el frontend.** El hook `useCancelarReserva` expone las dos acciones con un
  solo flujo compartido (Decisión 36); separarlo en dos hooks duplicaría ≈ 30 líneas y sus pruebas.
  La tabla y la página también suman las dos acciones juntas, con la misma regla de visibilidad.
  Estimado del diseño: ≈ 350 a 490 líneas.
- **Backend antes que frontend**, como en el orden de implementación de la propuesta y en el patrón
  de `HU-M5-01-02-03` (cada HU, primero backend y después frontend): el frontend llama a los dos
  endpoints nuevos, así que el humo manual de la Fase 2 necesita el backend ya aplicado.
- Las mutaciones de prueba (1.8 y 2.10) se restauran a mano desde una copia de respaldo, no con
  `git restore`: ninguno de los dos lados tiene todavía un commit propio en esta rama en el momento
  de mutar (el backend se mutila y se restaura **antes** de su propio commit 1.9; el frontend,
  antes de 2.11).

## Fase 1. Backend: `cancelar_anticipada` y `cancelar_por_ausencia` (HU-M5-04 y HU-M5-05)

- [x] 1.1 (Rojo) `backend/tests/modules/reservas/test_service.py`, HU-M5-04 (`cancelar_anticipada`),
  un caso por escenario de la spec (Requisito «Cancelar una reserva anticipadamente»):
  - `test_cancelar_anticipada_reserva_activa_queda_cancelada_y_libera_la_mesa` (escenario
    «Cancelación anticipada válida y la mesa queda disponible»: mesa 5, `2026-11-02` `21:30`, hora
    futura; se cancela con `service.cancelar_anticipada(db, id)`, se relee con `db.get` y se
    comprueba `estado == CANCELADA_ANTICIPADA` y que `mesa_id`, `cliente_id`, `fecha`, `hora` y
    `cantidad_personas` no cambiaron; la liberación de punta a punta vía
    `GET /mesas-disponibles` queda en 1.3, porque ese escenario es de `test_router.py`).
  - `test_cancelar_anticipada_un_minuto_despues_de_la_hora_actual_es_valida` (escenario «Un minuto
    después todavía se puede cancelar anticipadamente»: `hora=time(12, 1)`, responde `200`
    equivalente, `CANCELADA_ANTICIPADA`).
  - `test_cancelar_anticipada_rechaza_hora_igual_a_la_actual` (escenario «La hora de la reserva ya
    llegó»: `hora=time(12, 0)`, `ReglaDeNegocioError` con
    `"La reserva {id} ya llegó a su hora; si el cliente no vino, cancélela por ausencia"`; la
    reserva sigue `ACTIVA`).
  - `test_cancelar_anticipada_rechaza_fecha_anterior` (límite del diseño, «Estrategia de pruebas»:
    `fecha=date(2026, 11, 1)`, incluida en `_llego_su_hora` sin código aparte por `datetime.combine`;
    mismo mensaje y código que el caso anterior).
  - `test_cancelar_anticipada_reserva_ya_cancelada_responde_409` (escenario «Reserva ya cancelada,
    en cualquiera de los dos estados», parametrizada con `CANCELADA_ANTICIPADA` y
    `CANCELADA_POR_AUSENCIA`: `"La reserva {id} ya fue cancelada"`, sin cambiar el estado).
  - `test_cancelar_anticipada_reserva_atendida_responde_409` (escenario «Reserva ya atendida»:
    `"La reserva {id} ya fue atendida y no se puede cancelar"`, la reserva sigue `ATENDIDA`).
  - `test_cancelar_anticipada_reserva_inexistente_responde_404` (escenario «Reserva inexistente»:
    id `999`, `NoEncontradoError` con `"La reserva 999 no existe"`).
  Fallan por `AttributeError`/`ImportError`: `cancelar_anticipada` no existe todavía.
- [x] 1.2 (Rojo) `backend/tests/modules/reservas/test_service.py`, HU-M5-05
  (`cancelar_por_ausencia`), un caso por escenario de la spec (Requisito «Cancelar una reserva por
  ausencia»):
  - `test_cancelar_por_ausencia_reserva_activa_queda_cancelada` (escenario «Cancelación por ausencia
    válida y la mesa queda disponible»: mesa 6, `2026-11-02` `11:30`, ya pasó; `estado ==
    CANCELADA_POR_AUSENCIA`, demás campos sin cambios; la liberación vía `repository` queda en
    1.3, porque ese escenario usa `ids_de_mesas_con_reserva_activa`/`existe_reserva_activa` y no
    `GET /mesas-disponibles`, que rechaza con 422 un turno pasado, S32).
  - `test_cancelar_por_ausencia_limite_exacto_responde_200` (escenario «Límite exacto — la reserva
    llega a su hora en el minuto justo»: `hora=time(12, 0)`, `200` equivalente,
    `CANCELADA_POR_AUSENCIA`, S47: sin minutos de gracia).
  - `test_cancelar_por_ausencia_rechaza_hora_que_todavia_no_llego` (escenario «La hora todavía no
    llegó»: `hora=time(12, 1)`, `ReglaDeNegocioError` con
    `"La reserva {id} todavía no llegó a su hora y no se puede cancelar por ausencia"`, sigue
    `ACTIVA`).
  - `test_cancelar_por_ausencia_rechaza_dia_siguiente` (límite del diseño: `fecha=date(2026, 11, 3)`
    con la hora de hoy, mismo mensaje y código que el caso anterior).
  - `test_cancelar_por_ausencia_reserva_ya_cancelada_o_atendida_responde_409` (escenario «Reserva ya
    cancelada o ya atendida»: parametrizada con los ids 23, 24 y 25 de la spec —
    `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA` y `ATENDIDA`—, con los mismos dos mensajes que
    1.1).
  - `test_cancelar_por_ausencia_reserva_inexistente_responde_404` (escenario «Reserva inexistente»:
    id `999`, `"La reserva 999 no existe"`).
  Fallan por `AttributeError`: `cancelar_por_ausencia` no existe todavía.
- [x] 1.3 (Rojo) `backend/tests/modules/reservas/test_service.py`, orden de verificación y
  liberación automática (Requisito «El estado cancelado excluye la mesa de la disponibilidad
  automáticamente»), parametrizadas sobre las dos funciones:
  - `test_cancelar_atendida_con_hora_futura_responde_ya_atendida` y
    `test_cancelar_cancelada_con_hora_pasada_responde_ya_cancelada` (el orden importa: una reserva
    `ATENDIDA` con hora futura responde «ya fue atendida» y no la regla de hora; una ya cancelada
    con hora pasada responde «ya fue cancelada» y no se reevalúa la hora; cada prueba corre contra
    `cancelar_anticipada` y `cancelar_por_ausencia`).
  - `test_cancelar_anticipada_libera_la_mesa_en_repository` y
    `test_cancelar_por_ausencia_libera_la_mesa_en_repository` (escenarios «Una mesa cancelada
    anticipadamente admite una reserva nueva en el mismo turno» y «Una mesa cancelada por ausencia
    deja de contar como ocupada de inmediato»: tras cancelar, `repository.ids_de_mesas_con_reserva_activa`
    ya no trae esa mesa para esa fecha y hora y `repository.existe_reserva_activa` devuelve
    `False`; la primera además verifica, con `service.crear_reserva`, que se puede reservar de
    nuevo el mismo turno con otro cliente, sin ningún paso adicional).
  Fallan junto con 1.1 y 1.2: las dos funciones del `service` no existen.
- [x] 1.4 (Rojo) `backend/tests/modules/reservas/test_router.py`, las dos rutas nuevas:
  - `test_post_reservas_cancelar_anticipada_devuelve_200_con_el_estado` y
    `test_post_reservas_cancelar_por_ausencia_devuelve_200_con_el_estado` (`POST
    /reservas/{id}/cancelar-anticipada` y `/cancelar-por-ausencia` sin cuerpo; `200` con
    `ReservaSalida` y el `estado` nuevo).
  - `test_post_reservas_cancelar_anticipada_reserva_inexistente_devuelve_404` y el equivalente para
    `cancelar-por-ausencia` (`{"detalle": "La reserva 999 no existe"}`).
  - `test_post_reservas_cancelar_anticipada_ya_cancelada_devuelve_409_con_detalle` y el equivalente
    para `cancelar-por-ausencia` con la hora todavía no llegada (cada cuerpo es solo
    `{"detalle": ...}`, D-25 y D-26).
  - `test_post_reservas_cancelar_anticipada_no_choca_con_get_ni_put_por_id` (una reserva con `id`
    numérico: `POST .../cancelar-anticipada` no la confunde con `GET /reservas/{id}` ni con
    `PUT /reservas/{id}`, porque son rutas de tres segmentos con otro método; Decisión 33 — no
    hace falta comentario de orden, a diferencia de `GET /mesas-disponibles`).
  - `test_post_reservas_cancelar_anticipada_hu_m5_04_ca1_de_punta_a_punta` (escenario «Cancelación
    anticipada válida...»: tras `POST /reservas/{id}/cancelar-anticipada`,
    `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30` incluye la mesa 5).
  - `test_puente_real_cancelar_no_cambia_el_estado_de_la_mesa_en_m3` (escenario «El estado de la
    mesa en M3 no cambia»: con `puente_real` y `mesas_en_m3(1)`, se crea una reserva en esa mesa,
    se cancela con cualquiera de las dos rutas y se relee `Mesa.estado == LIBRE` en la base; cubre
    también «Contratos de importación», junto con 1.9 que corre `lint-imports`).
  Fallan con `404 Not Found` (las rutas no existen).
- [x] 1.5 (Verde) `backend/app/modules/reservas/service.py`, después de `modificar_reserva`
  (Decisión 32): constante `_CANCELADAS`, `_obtener_cancelable(db, reserva_id)`,
  `_llego_su_hora(reserva)`, `cancelar_anticipada(db, reserva_id) -> ReservaSalida` y
  `cancelar_por_ausencia(db, reserva_id) -> ReservaSalida`, con el código exacto de la Decisión 32
  del diseño (orden: existencia 404, cancelada 409, atendida 409, hora 409; `db.commit()` directo,
  sin `_confirmar`, porque pasar de `ACTIVA` a cancelada saca la fila del índice único parcial y el
  `IntegrityError` es imposible en esta transición). Pasa 1.1, 1.2 y 1.3.
- [x] 1.6 (Verde) `backend/app/modules/reservas/router.py`, al final del archivo (Decisión 33): dos
  rutas `@router.post("/reservas/{reserva_id}/cancelar-anticipada")` y
  `@router.post("/reservas/{reserva_id}/cancelar-por-ausencia")`, sin `status_code` (200 por
  defecto), `response_model` `ReservaSalida` por el tipo de retorno, que solo delegan al `service`.
  Pasa 1.4.
- [x] 1.7 (Refactor) Revisar `service.py` y `router.py`: cada función hasta 50 líneas y complejidad
  ciclomática 10 (RNF-MAN-05, ya cumplido según el diseño: menos de 15 líneas y complejidad 2 o 3);
  que `_obtener_cancelable` sea la única fuente de los mensajes «ya fue cancelada» y «ya fue
  atendida»; que `_llego_su_hora` sea el único predicado de la regla de hora, usado negado en un
  lado y afirmado en el otro. Sin cambios de comportamiento; las pruebas de 1.1 a 1.4 siguen en
  verde.
- [x] 1.8 Mutaciones de las reglas clave, una por vez, cada una restaurada a mano desde una copia de
  respaldo del archivo (no `git restore`: nada de este cambio está commiteado todavía) antes de la
  siguiente mutación: (a) invertir el signo de `_llego_su_hora` (`<=` por `<`) y comprobar que
  `test_cancelar_anticipada_rechaza_hora_igual_a_la_actual` y
  `test_cancelar_por_ausencia_limite_exacto_responde_200` fallan; (b) quitar la verificación de
  `_CANCELADAS` de `_obtener_cancelable` y comprobar que
  `test_cancelar_anticipada_reserva_ya_cancelada_responde_409` falla; (c) quitar la verificación de
  `ATENDIDA` y comprobar que `test_cancelar_anticipada_reserva_atendida_responde_409` falla.
  Restaurar el archivo original después de la tercera mutación.
- [x] 1.9 Verificar con `V-BACK`: `ruff check --fix . && ruff format .`, luego
  `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %). Comprobar
  además `alembic heads` (desde `backend/`): un único head, sin cambios (no se agrega ninguna
  migración). La suite completa del módulo y de M3 (vía `puente_real`) siguen en verde.
- [ ] 1.10 Commit 1: `feat: agrega la cancelación anticipada y por ausencia en el backend (HU-M5-04-05)`.
  Incluye `service.py`, `router.py`, `test_service.py` y `test_router.py` juntos. Rollback: revertir
  el commit; no hace falta `alembic downgrade` (sin migración).

## Fase 2. Frontend: dos acciones nuevas en el listado de reservas (depende de la Fase 1)

- [ ] 2.1 (Rojo) `frontend/src/modules/reservas/api.test.ts`, con `clienteHttp` simulado (mismo
  patrón que la prueba de `modificarReserva`): `cancelarReservaAnticipada(1)` llama a
  `clienteHttp.post` con `'/reservas/1/cancelar-anticipada'` y `{}`, y devuelve la respuesta;
  `cancelarReservaPorAusencia(2)` llama con `'/reservas/2/cancelar-por-ausencia'` y `{}`. Fallan
  porque las dos funciones no existen en `api.ts`.
- [ ] 2.2 (Rojo) Crear `frontend/src/modules/reservas/components/useCancelarReserva.test.tsx`, con
  el patrón de `useBajaMesa.test.tsx` (`renderHook` con un envoltorio de
  `ConfirmContext.Provider` y `ToastContext.Provider`, `confirmar = vi.fn()`,
  `mostrarToast = vi.fn()`, `vi.mock('../api')`):
  - Por cada acción (`cancelarAnticipada` y `cancelarPorAusencia`), un caso que confirma y llama a
    su función de `api.ts` con el `id` de la reserva, muestra el toast `success` con su texto
    («Reserva cancelada» o «Reserva cancelada por ausencia») y llama a `onCancelada` una vez.
  - Un caso por acción que comprueba los textos exactos pasados a `confirmar` (S52: `titulo`,
    `descripcion`, `textoConfirmar: 'Cancelar'`, `textoCancelar: 'Volver'`, `variante: 'danger'`).
  - Un caso que, al no confirmar (`confirmar` resuelve `false`), no llama a ninguna función de
    `api.ts` ni a `onCancelada`, para cualquiera de las dos acciones (escenario «Cancelar el
    diálogo de confirmación no hace nada»).
  - Un caso por acción en el que la API responde `409` con un `detalle`: muestra el toast `danger`
    con el título «No se pudo cancelar la reserva» y ese `detalle` como descripción, y no llama a
    `onCancelada` (escenario «Un 409 muestra el aviso y no cambia la fila»).
  Fallan porque el archivo `useCancelarReserva.ts` no existe.
- [ ] 2.3 (Rojo) `frontend/src/modules/reservas/components/ReservasTabla.test.tsx`, con el patrón de
  `mostrar(...)` ya existente (`vi.fn()` por defecto para las props nuevas, obligatorias como
  `onModificar`):
  - `se ofrecen solo en las filas ACTIVA` (escenario «Las acciones aparecen solo en las filas
    activas»): sobre `UNA_POR_ESTADO`, solo la fila `ACTIVA` tiene los botones `aria-label`
    `'Cancelar reserva'` y `'Cancelar por ausencia'`, junto con `'Modificar reserva'`; las otras
    tres filas no tienen ninguno de los tres.
  - `al pulsar «Cancelar reserva» avisa con la reserva de esa fila` y el equivalente para `«Cancelar
    por ausencia»`: cada botón llama a su callback (`onCancelarAnticipada` u
    `onCancelarPorAusencia`) con la reserva de la fila, igual que la prueba existente de
    `onModificar`.
  Fallan porque `ReservasTablaProps` no tiene las dos props nuevas y los botones no existen.
- [ ] 2.4 (Rojo) `frontend/src/modules/reservas/pages/ReservasPage.test.tsx`: agregar un
  `ConfirmContext.Provider` a `abrir()` con un `confirmar` simulado (hoy el archivo solo envuelve
  con `ToastContext.Provider`; sin ese proveedor, `useConfirm` devuelve siempre `false` y ningún
  flujo de confirmación se puede probar, Decisión 36 del diseño), con el patrón de
  `renderConConfirmacion` de `SalonPage.test.tsx` (un `vi.fn().mockResolvedValue(aceptado)`, por
  defecto `true` para no romper las pruebas existentes de alta y edición que no usan confirmación).
  Después, un nuevo `describe('ReservasPage: cancelar una reserva')` con:
  - `confirmar «Cancelar reserva» llama a POST .../{id}/cancelar-anticipada y vuelve a pedir el
    listado` (pulsar el botón de la primera fila, `listarReservas` se llama una vez más).
  - el equivalente para `«Cancelar por ausencia»`.
  - `un 409 muestra el aviso y no vuelve a pedir el listado` (la API simulada responde
    `{ exito: false, error: '...' }`; `listarReservas` no se llama de nuevo).
  Fallan porque `ReservasPage` no pasa `onCancelarAnticipada` ni `onCancelarPorAusencia` a la
  tabla.
- [ ] 2.5 (Verde) `frontend/src/modules/reservas/api.ts`, después de `modificarReserva` (Decisión
  35): `cancelarReservaAnticipada(id)` y `cancelarReservaPorAusencia(id)`, cada una
  `clienteHttp.post<Reserva, Record<string, never>>(url, {})`, con el mismo patrón que
  `salon/api.ts` (`/sectores/{id}/baja`). Pasa 2.1.
- [ ] 2.6 (Verde) Crear `frontend/src/modules/reservas/components/useCancelarReserva.ts` con el
  código exacto de la Decisión 36 del diseño: tipo `Cancelacion`, constantes `ANTICIPADA` y
  `POR_AUSENCIA` con los textos de S52, función privada `cancelar` y el hook
  `useCancelarReserva({ onCancelada })` que devuelve `{ cancelando, cancelarAnticipada,
  cancelarPorAusencia }`. Pasa 2.2.
- [ ] 2.7 (Verde) `frontend/src/modules/reservas/components/ReservasTabla.tsx` (Decisión 37):
  `ReservasTablaProps` suma `onCancelarAnticipada` y `onCancelarPorAusencia`, obligatorias;
  `columnaAcciones` recibe las tres funciones y, en la fila `ACTIVA`, agrega los botones
  `aria-label="Cancelar reserva"` y `aria-label="Cancelar por ausencia"` junto al de «Modificar
  reserva», cada uno con su ícono (`CalendarX` y `UserX` de `lucide-react`, ya dependencia) y
  `aria-hidden="true"`. La condición `r.estado === 'ACTIVA'` no cambia. Pasa 2.3.
- [ ] 2.8 (Verde) `frontend/src/modules/reservas/pages/ReservasPage.tsx` (Decisión 38):
  `ListadoDelDiaProps` suma `onCancelarAnticipada` y `onCancelarPorAusencia` y las pasa a
  `ReservasTabla`; `ReservasPage` instancia `useCancelarReserva({ onCancelada:
  listado.reservas.recargar })` y conecta los dos callbacks con `void cancelarAnticipada(reserva)`
  y `void cancelarPorAusencia(reserva)`, el mismo patrón que `onEliminar` de `SalonPage.tsx`. Pasa
  2.4.
- [ ] 2.9 (Refactor) Revisar `useCancelarReserva.ts`: que los textos de S52 estén solo en
  `ANTICIPADA` y `POR_AUSENCIA`, sin duplicarlos en la prueba más que para comparar; que
  `ReservasTabla.tsx` no repita la condición `r.estado === 'ACTIVA'` más de una vez. Sin cambios de
  comportamiento; las pruebas de 2.1 a 2.4 siguen en verde.
- [ ] 2.10 Mutaciones de las reglas clave, una por vez, restauradas a mano desde una copia de
  respaldo del archivo (no `git restore`: el frontend de este cambio tampoco tiene commit propio
  todavía) antes de la siguiente: (a) en `ReservasTabla.tsx`, cambiar la condición de alguno de los
  dos botones nuevos de `r.estado === 'ACTIVA'` a `true` y comprobar que
  `se ofrecen solo en las filas ACTIVA` falla; (b) en `useCancelarReserva.ts`, quitar el `if
  (!aceptado) return;` y comprobar que el caso de «cancelar el diálogo no hace nada» falla.
  Restaurar el archivo original después de la segunda mutación.
- [ ] 2.11 Verificar con `V-FRONT`: `npm run format`, luego
  `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`
  (cobertura ≥ 60 %).
- [ ] 2.12 Commit 2: `feat: agrega las acciones de cancelar una reserva en el listado (HU-M5-04-05)`.
  Incluye `api.ts`, `api.test.ts`, `useCancelarReserva.ts` y su prueba, `ReservasTabla.tsx` y su
  prueba, `ReservasPage.tsx` y su prueba. Rollback: revertir el commit.

## Fase 3. Cierre

- [ ] 3.1 Verificación completa: `V-BACK` y `V-FRONT` otra vez, de punta a punta, sobre el árbol
  final de las dos fases (no solo los comandos enfocados de 1.9 y 2.11). `alembic heads` (desde
  `backend/`): el mismo head único que antes del cambio, sin ninguna migración nueva (Requisito
  «Aislamiento del módulo», escenario «Sin migración nueva»).
- [ ] 3.2 Aislamiento: `git diff --name-only develop...HEAD` (o el equivalente contra la base del
  PR) no incluye ningún archivo de `backend/app/modules/salon/`, `backend/app/modules/atencion/`,
  `frontend/src/modules/salon/`, `frontend/src/modules/atencion/`, `shared/` (backend y frontend)
  ni `backend/pyproject.toml`; solo archivos de `backend/app/modules/reservas/`,
  `backend/tests/modules/reservas/`, `frontend/src/modules/reservas/` y
  `openspec/changes/HU-M5-04-05/` (escenario «Sin cambios en módulos ajenos»). `lint-imports` (ya
  corrido en 1.9) confirma que no se agregó ninguna importación nueva de `salon` ni de `atencion`
  (escenario «Contratos de importación»).

## Antes del PR

Estas tareas las hace la persona responsable (o el agente con su confirmación explícita). Ninguna
crea, cierra ni edita issues, comentarios, PR ni tarjetas sin confirmación (AGENTS.md §8). El push
y el PR los decide la persona.

- [ ] P.1 Completar `Closes #65` y `Closes #66` en la descripción del PR, uno por línea (con
  `Closes #65, #66` GitHub cierra solo el primero).
- [ ] P.2 Humo manual en el navegador, con el backend y el frontend reales (comandos de
  `FLUJO_DIARIO.md`, read-only): `uvicorn app.main:app` desde `backend/` y `npm run dev` desde
  `frontend/`. Abrir `/reservas`, con una reserva `ACTIVA` futura pulsar «Cancelar reserva»,
  confirmar y comprobar el aviso de éxito y que la fila cambia (o desaparece, si el filtro es
  «Activas»); con una reserva `ACTIVA` ya pasada (o cambiando el reloj del sistema, o editando una
  reserva a una hora ya pasada si el formulario lo permite) pulsar «Cancelar por ausencia» y
  comprobar el mismo flujo; cancelar un diálogo de confirmación y comprobar que no pasa nada;
  provocar un 409 (cancelar la misma reserva dos veces) y comprobar el aviso `danger` con el
  mensaje del backend.
- [ ] P.3 Validar con el equipo los supuestos S47 a S52 de la spec (S44, S45 y S46 ya los confirmó
  la persona responsable el 2026-11-02): S47 (sin tolerancia para la ausencia), S48 (mensajes y
  códigos), S49 («registrar el ausente» es el estado, sin contador en `Cliente`), S50 (los dos
  botones se muestran siempre en las filas `ACTIVA`, sin calcular la hora en el navegador), S51
  (sin concurrencia especial) y S52 (los textos exactos de los diálogos y de los avisos: títulos,
  descripciones, `textoConfirmar`/`textoCancelar` y los dos avisos de éxito). Validar también el
  `Supuesto:` del diseño sobre el título del aviso de error («No se pudo cancelar la reserva»,
  Decisión 36). Si el equipo cambia algún texto, el ajuste queda en `useCancelarReserva.ts` y su
  prueba (2.6, 2.2), sin tocar el backend.
- [ ] P.4 Anotar en el PR la diferencia con la maqueta: `SPRINT-2/S2-04-maqueta/reservas.html`
  muestra un solo botón «Cancelar reserva» por fila; este cambio agrega dos, porque HU-M5-04 y
  HU-M5-05 son dos acciones distintas con reglas opuestas (AGENTS.md §2 y §5; propuesta, sección
  «Frontend»).
- [ ] P.5 `git pull origin develop` y resolver los conflictos en la rama, si `develop` avanzó desde
  el merge `73d2c54`. Revisar `alembic heads` otra vez después del `pull` (un único head, sin
  cambios).
- [ ] P.6 Correr los comandos de verificación de AGENTS.md §7, con la CI en verde: backend desde
  `backend/` con el entorno virtual activo
  (`ruff check --fix . && ruff format . && ruff check . && ruff format --check . && lint-imports && pytest`)
  y frontend desde `frontend/`
  (`npm run format && npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`).
- [ ] P.7 Redactar la nota de tamaño del PR (plantilla `.github/pull_request_template.md`,
  read-only, hacia `develop`): las cifras medidas con `git diff --shortstat develop...HEAD` para
  `backend/` y para `frontend/`, frente al punto de control de 800 líneas por lado (AGENTS.md §4):
  el pronóstico del diseño (backend ≈ 330 a 445, frontend ≈ 350 a 490) deja los dos lados muy por
  debajo del límite; no se pide `size:exception`.

## Presupuesto de revisión (punto de control, no bloqueo)

| Lado | Código | Pruebas | Total estimado | Límite del proyecto |
| --- | --- | --- | --- | --- |
| `backend/` (commit 1) | `service` 35 a 45, `router` 8 a 10 | `test_service` 170 a 220, `test_router` 120 a 170 | **330 a 445** | 800 |
| `frontend/` (commit 2) | `api.ts` 12 a 16, hook 60 a 70, tabla 25 a 40, página 10 a 15 | `api.test` 25 a 40, hook 120 a 160, tabla 35 a 55, página 60 a 90 | **350 a 490** | 800 |

| Campo | Valor |
|-------|-------|
| Backend | ≈ 330 a 445 líneas (un solo commit, Fase 1) |
| Frontend | ≈ 350 a 490 líneas (un solo commit, Fase 2) |
| Total del PR | ≈ 680 a 935 líneas, sin los artefactos de SDD en Markdown |
| 400-line budget risk | Low a Medium: cada lado queda por debajo o cerca del heurístico de 400 líneas por tarea de la sesión (orientativo, no un tope); los dos lados quedan muy por debajo del límite de 800 de AGENTS.md §4 |
| Chained PRs recommended | No: una HU nunca se divide en varios PR (AGENTS.md §4); aquí además no hace falta, los dos lados entran bajo 800 |
| Delivery strategy | single-pr |
| Decision needed before apply | No: ningún lado supera 800 líneas; no se solicita `size:exception` |

Igual que todo cambio del repositorio, este PR pasa por el flujo nativo de revisión (RDD) de
AGENTS.md y de las instrucciones del orquestador cuando el interruptor de revisión del usuario
está activo: el presupuesto de líneas de arriba es un punto de control de tamaño, no un sustituto
de esa revisión ni de la aprobación humana de otro integrante que exige AGENTS.md §8.

## Trazabilidad

| Requisito de la spec | Escenario | Tareas |
| --- | --- | --- |
| Cancelar una reserva anticipadamente (HU-M5-04) | Cancelación anticipada válida y la mesa queda disponible | 1.1, 1.4, 1.5, 1.6, 2.4 |
| | Reserva ya cancelada, en cualquiera de los dos estados | 1.1, 1.5 |
| | Reserva ya atendida | 1.1, 1.3, 1.5 |
| | La hora de la reserva ya llegó | 1.1, 1.5, 1.8 |
| | Un minuto después todavía se puede cancelar anticipadamente | 1.1, 1.5, 1.8 |
| | Reserva inexistente | 1.1, 1.4, 1.5, 1.6 |
| Cancelar una reserva por ausencia (HU-M5-05) | Cancelación por ausencia válida y la mesa queda disponible | 1.2, 1.3, 1.5 |
| | Límite exacto — la reserva llega a su hora en el minuto justo | 1.2, 1.5, 1.8 |
| | La hora todavía no llegó | 1.2, 1.5, 1.8 |
| | Reserva ya cancelada o ya atendida | 1.2, 1.3, 1.5 |
| | Reserva inexistente | 1.2, 1.4, 1.5, 1.6 |
| El estado cancelado excluye la mesa de la disponibilidad automáticamente | Una mesa cancelada anticipadamente admite una reserva nueva en el mismo turno | 1.3, 1.4 |
| | Una mesa cancelada por ausencia deja de contar como ocupada de inmediato | 1.3 |
| Aislamiento del módulo (HU-M5-04-05, AGENTS.md §9.3) | Contratos de importación | 1.4, 1.9, 3.2 |
| | El estado de la mesa en M3 no cambia | 1.4 |
| | Sin migración nueva | 1.9, 3.1 |
| | Sin cambios en módulos ajenos | 3.2 |
| Dos acciones nuevas en el listado de reservas (frontend) | Las acciones aparecen solo en las filas activas | 2.3, 2.7, 2.10 |
| | Confirmar la cancelación anticipada | 2.2, 2.4, 2.6, 2.8 |
| | Confirmar la cancelación por ausencia | 2.2, 2.4, 2.6, 2.8 |
| | Cancelar el diálogo de confirmación no hace nada | 2.2, 2.6, 2.10 |
| | Un 409 muestra el aviso y no cambia la fila | 2.2, 2.4, 2.6 |

Cierre: la verificación completa es 3.1 y 1.9/2.11; el aislamiento final es 3.2; la validación de
S47 a S52 y la diferencia con la maqueta quedan en P.3 y P.4, a cargo del equipo.
