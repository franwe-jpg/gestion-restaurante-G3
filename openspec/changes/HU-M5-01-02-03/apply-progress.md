# Progreso de apply: HU-M5-01-02-03 Crear, modificar y listar reservas

- **Rama:** `feature/HU-M5-01-02-03-abm-reservas`. **Modo:** Strict TDD. **Delivery strategy:** `single-pr` con `size:exception` (anotado por el orquestador).
- **Lote A (Fases 1 y 2, commits 1 y 2): COMPLETO.**
- **Lote B (Fase 3, commits 3 y 4, frontend del alta): COMPLETO.**
- **Lote C (Fase 4, commit 5, backend del listado `GET /reservas`): COMPLETO.**
- **Lote D (Fase 5, commits 6 y 7, frontend del listado del día `ReservasPage` con el panel de alta montado): COMPLETO salvo el humo manual de 5.11, que queda pendiente para la persona (el apply no levanta servidores). Línea base del lote D (sobre `e2103d4`): `npm run test:coverage` 44 archivos y 467 pruebas; `lint`, `format:check`, `typecheck` y `build` limpios. Pendientes: el humo manual de 5.11, Fases 6 a 8 (consulta y modificación del backend, modo edición del frontend, cierre) y las tareas «Antes del PR».
- **Lote E (Fase 6, commit 8, backend de la consulta `GET /reservas/{id}` y la modificación `PUT /reservas/{id}`, HU-M5-02): COMPLETO.** Línea base del lote E (sobre `0d02c8e`): `pytest` 724 pruebas pasando (informada por el orquestador); el módulo `reservas` tenía 143 al empezar (comprobado). Pendientes: Fase 7 (modo edición del frontend), Fase 8 (cierre), el humo manual de 5.11 (de la persona) y las tareas «Antes del PR».
- **Lote F (Fase 7, commit 9 `f1a210f`, frontend de la modificación de reservas con el panel en modo edición, HU-M5-02): COMPLETO salvo el humo manual de 7.8, que queda pendiente para la persona (el apply no levanta servidores).** Línea base del lote F (sobre `61acb81`): `vitest` 47 archivos y 506 pruebas pasando (75 en `src/modules/reservas`); `lint`, `format:check`, `typecheck` y `build` limpios. Al terminar: 47 archivos y 527 pruebas (96 en el módulo). Pendientes: los humos manuales de 5.11 y 7.8 (de la persona), la Fase 8 (cierre) y las tareas «Antes del PR».
- **Entorno:** todo comando de backend se corrió en Docker (`g3-backend-test`, sin red, `backend/` montado en `/app`), porque el host no tiene entorno virtual. Los comandos del frontend se corrieron en el host, desde `frontend/`, con el `node_modules` existente (sin instalar nada y sin red).
- **Línea base del backend, medida en develop antes de empezar:** `pytest` 581 pruebas pasando, cobertura 99,54 %, `alembic heads` = `b2d4f6a8c0e1`.
- **Línea base del frontend, medida al empezar el lote B (sobre `65d7948`, sin cambios de frontend):**
  - `npm run test:coverage`: 40 archivos y 431 pruebas pasando; cobertura 74,75 % de sentencias (382/511), 70,62 % de ramas (226/320), 71,2 % de funciones (178/250) y 76,68 % de líneas (365/476); umbral 60 %.
  - `npm run lint` (con `--max-warnings=0`): 0 errores y 0 advertencias. `npm run format:check`: «All matched files use Prettier code style!». `npm run typecheck`: sin errores. `npm run build`: terminó bien (`✓ built in 964ms`).
  - **Prueba intermitente en la línea base:** en una de las corridas de `test:coverage` falló 1 prueba (`1 failed | 430 passed`, 39 de 40 archivos); no se pudo identificar cuál (la salida se filtró) y no se reprodujo en las 6 corridas siguientes de la suite completa, todas sin fallos (4 con 431 pruebas, una con 450 y una con 467, estas dos con las pruebas de este lote). Se anota por si reaparece en la CI.
  - **La cobertura no mide `modules/`:** `frontend/vite.config.ts` solo incluye `src/App.tsx` y `src/shared/**`. Por eso la cobertura del frontend no cambia con este lote; la calidad de las pruebas de M5 se respalda con RED observado, triangulación y comprobaciones de mutación (ver evidencia).

## Tareas completadas

| Tarea | Estado | Resultado observado |
|-------|--------|---------------------|
| 1.1 | [x] | `test_migracion.py` (7 pruebas): RED = 7 fallos (`['b2d4f6a8c0e1'] != ['d6f8a0c2e4b6']`, `no such table: reservas`) |
| 1.2 | [x] | `test_models.py` (2 pruebas): RED = `ImportError: cannot import name 'EstadoReserva'` |
| 1.3 | [x] | `models.py`: GREEN de `test_estado_reserva_tiene_exactamente_los_cuatro_valores`; la prueba de valor por defecto falló (`no such table`) hasta crear la migración |
| 1.4 | [x] | Migración `d6f8a0c2e4b6`: GREEN, 9 pruebas del módulo |
| 1.5 | [x] | RED = 2 fallos de M3 (`'sectores' not in {...}` y `'mesas' not in {...}`); GREEN al cambiar exactamente 2 líneas (`"-2"` a `"c4e6a8b0d2f4"` y `"-1"` a `"f3a5c7e9b1d2"`); las aserciones no cambian |
| 1.6 | [x] | `alembic check` sobre la base migrada: «No new upgrade operations detected» (modelo y migración declaran lo mismo) |
| 1.7 | [x] | `ruff check .` y `ruff format --check .` limpios, 10 contratos de `lint-imports` cumplidos, `alembic heads` = `d6f8a0c2e4b6`, `pytest` 590 pasando, cobertura 99,66 % |
| 1.8 | [x] | Commit `3d4d57a` |
| 2.1 | [x] | `conftest.py` (reloj fijo `2026-11-02 12:00`, `fabrica_reserva`, `puente_sin_mesa`, `puente_sin_cliente`, `puente_con_capacidad`) y `ahora()` en `service.py` |
| 2.2 | [x] | `test_puente.py` (6): RED = `ImportError: cannot import name 'puente'`; GREEN con `puente.py` |
| 2.3 | [x] | `test_schemas.py` (40): RED = `ImportError: cannot import name 'ReservaCrear'`; GREEN con `schemas.py` |
| 2.4 | [x] | `test_service.py` reglas del alta: RED = `ImportError` por `puente`; GREEN con `repository.py` y `service.py` (30 de 33 pruebas, las 3 restantes son 2.5) |
| 2.5 | [x] | RED observado tras 2.10: 3 fallos con `sqlalchemy.exc.IntegrityError: UNIQUE constraint failed` sin traducir; GREEN con 2.11 (33 pasan) |
| 2.6 | [x] | `test_router.py` (21): RED = `404 == 201/409/422` (ruta inexistente) y errores de fixture por `puente`; GREEN con 2.12 (109 pasan en el módulo) |
| 2.7 | [x] | `schemas.py`: `_DatosDelTurno`, `ReservaCrear`, `ReservaSalida` |
| 2.8 | [x] | `puente.py`: `MesaReservable`, `obtener_mesa`, `existe_cliente` (stubs) |
| 2.9 | [x] | `repository.py`: `agregar`, `existe_reserva_activa` (sin `excluir_id`, queda para la Fase 6) |
| 2.10 | [x] | `service.crear_reserva` con el orden de la Decisión 6 |
| 2.11 | [x] | `_confirmar` traduce el `IntegrityError` en 409 con el mismo mensaje y sin detalles de la base |
| 2.12 | [x] | `POST /reservas` y registro en `main.py` |
| 2.13 | [x] | Refactor: el mensaje de conflicto quedó en un solo lugar (`_turno_ocupado`), usado por la verificación previa y por `_confirmar`; 109 pruebas siguen en verde |
| 2.14 | [x] | `ruff check .` y `ruff format --check .` limpios, 10 contratos cumplidos (`reservas` no importa `salon` ni `atencion`), `alembic heads` = `d6f8a0c2e4b6`, `pytest` 690 pasando, cobertura 99,70 % |
| 2.15 | [x] | Commit `55be2c6` |
| 3.1 | [x] | `fechas.test.ts` (3): RED = `Failed to resolve import "./fechas"` (archivo ausente); GREEN con `fechas.ts` |
| 3.2 | [x] | `api.test.ts` (1): RED = `TypeError: crearReserva is not a function`; GREEN con `crearReserva` en `api.ts` |
| 3.3 | [x] | `validarReserva.test.ts` (15): RED = `Failed to resolve import "./validarReserva"`; GREEN con `validarReserva.ts` |
| 3.4 | [x] | `types.ts` (reescrito), `api.ts` (reescrito, solo `crearReserva`), `fechas.ts` y `validarReserva.ts`: las 19 pruebas de 3.1 a 3.3 pasan |
| 3.5 | [x] | `lint`, `format:check`, `typecheck`, `test:coverage` (450 pasando) y `build` limpios; `V-TZ`: 19 pruebas pasan con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` |
| 3.6 | [x] | Commit 3 `af07415` |
| 3.7 | [x] | `ReservaFormulario.test.tsx` (17): RED = `Failed to resolve import "./ReservaFormulario"` (suite sin pruebas); GREEN con 3.8 |
| 3.8 | [x] | `useFormularioReserva.ts`, `ReservaFormulario.tsx` y `index.ts`: 17/17 en la primera corrida verde |
| 3.9 | [x] | Refactor: un solo `CampoReserva` para los cinco campos (en lugar de cinco `FormField` casi iguales), tipo de retorno explícito en `errorDeHora`; `max-lines-per-function` pidió partir un `describe` de 54 líneas en dos; 17/17 siguen en verde |
| 3.10 | [x] | `lint`, `format:check`, `typecheck`, `test:coverage` (467 pasando) y `build` limpios; `V-TZ` del módulo: 36 pruebas pasan en ambas zonas |
| 3.11 | [x] | Commit 4 `f65027f` |
| 4.1 | [x] | `test_schemas.py` filtro (+9 casos en 5 funciones): RED = `ImportError: cannot import name 'FiltroReservas'`; GREEN con 4.4 |
| 4.2 | [x] | `test_service.py` listado (12 pruebas): RED = el mismo `ImportError` al recolectar el módulo (la función `listar_reservas` ni el schema existían); GREEN con 4.4 |
| 4.3 | [x] | `test_router.py` listado (13 casos en 7 funciones): RED = 13 fallos, `405 == 200` (la ruta `/reservas` solo tenía `POST`) y `KeyError: 'limit'`; GREEN con 4.4 |
| 4.4 | [x] | `FiltroReservas`, `repository.listar_reservas`, `service.listar_reservas` y `GET /reservas`: 143 pasan en el módulo (109 previas más 34 nuevas) |
| 4.5 | [x] | `ruff check .` y `ruff format --check .` limpios, 10 contratos de `lint-imports` cumplidos, `alembic heads` = `d6f8a0c2e4b6`, `pytest` 724 pasando, cobertura 99,61 % (módulo `reservas`: 100 % en las 7 unidades) |
| 4.6 | [x] | Commit 5 `e2103d4` |
| 5.1 | [x] | `fechas.test.ts` (+7 casos: 6 de `sumarDias`, 1 de `formatearFechaReserva`): RED = `TypeError: sumarDias is not a function` y `formatearFechaReserva is not a function`; GREEN con 5.5 |
| 5.2 | [x] | `api.test.ts` (+3 casos de `listarReservas`): RED = `TypeError: listarReservas is not a function`; GREEN con 5.5 |
| 5.3 | [x] | `ReservasTabla.test.tsx` (6): RED = `Failed to resolve import "./ReservasTabla"` (suite sin pruebas); GREEN con 5.5 |
| 5.4 | [x] | `NavegadorFecha.test.tsx` (10 casos en 6 funciones): RED = `Failed to resolve import "./NavegadorFecha"`; GREEN con 5.5 |
| 5.5 | [x] | `listarReservas` (`URLSearchParams`, omite `estado` con `'TODAS'`), `sumarDias`, `formatearFechaReserva`, `estadosReserva.ts`, `ReservasTabla.tsx`, `NavegadorFecha.tsx` y `index.ts`: 62 pruebas del módulo pasan (30 de las 4 suites nuevas o ampliadas en la primera corrida verde) |
| 5.6 | [x] | `lint`, `format:check`, `typecheck`, `test:coverage` (493 pasando en 46 archivos) y `build` limpios; `V-TZ`: 62 pruebas pasan con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` |
| 5.7 | [x] | Commit 6 `af90732` |
| 5.8 | [x] | `ReservasPage.test.tsx` (13 casos en 11 funciones): RED = 13 fallos (`Unable to find an element with the text: Cliente n.º 7`, `No hay reservas…`, `No se pudieron cargar…`; el DOM mostraba el `EmptyState` «Módulo pendiente de implementación»); GREEN con 5.9 |
| 5.9 | [x] | `ReservasPage.tsx` reescrita: 13/13 en la primera corrida verde |
| 5.10 | [x] | RED de lint observado antes del refactor: `Function 'ReservasPage' has too many lines (84). Maximum allowed is 50`. Refactor: `SelectorEstadoReserva.tsx`, el hook `pages/useListadoReservas.ts` y el componente local `ListadoDelDia`; 75/75 siguen en verde y `eslint --max-warnings=0` limpio |
| 5.11 | [ ] | `V-FRONT` observado en verde (`lint`, `format:check`, `typecheck`, `test:coverage` 506 pasando en 47 archivos, `build`). **Humo manual con `npm run dev` pendiente para la persona** (ver «Pendiente»); la tarea sigue sin marcar en `tasks.md` |
| 5.12 | [x] | Commit 7 `0d02c8e` |
| 6.1 | [x] | `test_schemas.py` modificación (12 casos en 4 funciones): RED = `ImportError: cannot import name 'ReservaModificar'` al recolectar el módulo; GREEN con 6.5 |
| 6.2 | [x] | `test_service.py` consulta (3): RED = el mismo `ImportError` al recolectar; GREEN con `obtener_reserva` |
| 6.3 | [x] | `test_service.py` modificación (19 funciones, 21 casos). RED observado con la primera versión de `modificar_reserva` (sin `excluir_id` y con el `_confirmar` del alta): 4 fallos, 3 por `ReglaDeNegocioError: La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30` (la reserva chocaba consigo misma: `cambia_un_solo_valor`, `la_ultima_modificacion_prevalece`, `no_choca_consigo_misma`) y 1 por `AssertionError` en `traduce_conflicto_del_indice_en_409` (el 409 nombraba `22:00`, el horario viejo, en lugar de `21:30`, el pedido); GREEN con 6.5 |
| 6.4 | [x] | `test_router.py` consulta y modificación (12 funciones, 15 casos): RED = 15 fallos, `404 == 200/409/422` (rutas inexistentes) y `[404, 404, 404] == [404, 409, 422]`; GREEN con 6.5 |
| 6.5 | [x] | `ReservaModificar`, `repository.obtener`, `excluir_id` en `existe_reserva_activa`, `service.obtener_reserva` y `modificar_reserva`, `GET` y `PUT /reservas/{reserva_id}`: 194 pasan en el módulo (143 previas más 51 nuevas) |
| 6.6 | [x] | Refactor: la capacidad con la mesa de la reserva quedó en `_validar_capacidad_de_la_reserva` (S27) y `_confirmar` arma el mensaje de conflicto antes de escribir; 194 siguen en verde; `ruff check` y `ruff format --check` limpios |
| 6.7 | [x] | `ruff check .` y `ruff format --check .` limpios, 10 contratos de `lint-imports` cumplidos, `alembic heads` = `d6f8a0c2e4b6`, `pytest` 775 pasando, cobertura 99,62 % (módulo `reservas`: 100 % en las 7 unidades) |
| 6.8 | [x] | Commit 8 `61acb81` |
| 7.1 | [x] | `api.test.ts` (+1): RED = `TypeError: modificarReserva is not a function`; GREEN con 7.6 |
| 7.2 | [x] | `validarReserva.test.ts` (+3 en un `describe` de modo edición): RED = 1 fallo (`no valida Cliente ni Mesa, aunque estén vacíos o mal escritos`: devolvía `{cliente: 'El cliente es obligatorio.', mesa: 'La mesa debe ser un entero positivo.'}` en lugar de `{}`); las otras 2 pasaban ya en rojo porque fecha, hora y cantidad se validan igual en los dos modos (son la red de seguridad del GREEN); GREEN con 7.6 |
| 7.3 | [x] | `ReservaFormulario.test.tsx` (+11 casos en 3 `describe`): RED = 11 fallos y 17 pasando. Los 4 del panel fallan por la razón esperada (`Unable to find an accessible element with the role "heading" and name "Modificar reserva"`: el panel se titulaba «Nueva reserva» y traía los campos vacíos); los otros 7 fallan porque `modificarReserva` todavía no existe en el módulo `../api` simulado (`vi.mocked(modificarReserva)` es `undefined`); GREEN con 7.6 |
| 7.4 | [x] | `ReservasTabla.test.tsx` (+2 pruebas y 1 modificada): RED = 3 fallos (los encabezados no incluían `Acciones` y `Unable to find an accessible element with the role "button" and name "Modificar reserva"` x2); GREEN con 7.6 |
| 7.5 | [x] | `ReservasPage.test.tsx` (+4 pruebas en 2 `describe`): RED = 4 fallos (`Unable to find an accessible element with the role "button" and name "Modificar reserva"`); GREEN con 7.6 |
| 7.6 | [x] | `modificarReserva` (`PUT /reservas/{id}`), modo `'edicion'` de `validarReserva`, prop `reserva` del hook y del panel, columna de acciones de la tabla y panel `{ edicion: Reserva }` de la página: 96/96 en el módulo en la primera corrida con todo implementado |
| 7.7 | [x] | Refactor: `validarReserva` partida en `erroresDeClienteYMesa` y `erroresDelTurno`; un solo camino de errores del servidor (`TEXTOS` por modo + `errorDelServidor`) y un solo `guardar` que elige `crearReserva` o `modificarReserva`; la columna de acciones se agrega a `COLUMNAS` sin mover las demás (diff de 34 líneas en lugar de 71); `PanelDeReserva` extraído de la página; `lint` (`max-lines-per-function` 50 y complejidad 10) limpio |
| 7.8 | [ ] | `V-FRONT` observado en verde (`lint`, `format:check`, `typecheck`, `test:coverage` 527 pasando en 47 archivos, `build`) y `V-TZ` en UTC-3 y UTC (96 pruebas en el módulo). **Humo manual con `npm run dev` pendiente para la persona** (ver «Pendiente»); la tarea sigue sin marcar en `tasks.md` |
| 7.9 | [x] | Commit 9 `f1a210f` |

## TDD Cycle Evidence

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|-------|-------------------|------|------------|-----|-------|-------------|----------|
| 1.1, 1.4 | `tests/modules/reservas/test_migracion.py` | Integración (Alembic + SQLite) | N/A (nuevo); línea base 581/581 | Escrito y ejecutado: 7 fallos | 7/7 | 3 estados no activos, otra mesa y otra hora aceptadas, cantidad 1 aceptada y 0 rechazada | Limpio (`alembic check` sin diferencias) |
| 1.2, 1.3 | `tests/modules/reservas/test_models.py` | Unidad / integración | N/A (nuevo) | Escrito y ejecutado: `ImportError` | 2/2 | Enumerado más valor por defecto | Limpio |
| 1.5 | `tests/modules/salon/test_migracion.py` (modificado) | Integración | 13 de M3 verdes antes de la migración nueva | Ejecutado tras 1.4: 2 fallos | 22/22 (módulo M5 más M3) | N/A: ajuste de 2 líneas, sin lógica | Limpio |
| 2.2, 2.8 | `tests/modules/reservas/test_puente.py` | Unidad | N/A (nuevo) | Escrito y ejecutado: `ImportError` | 6/6 | id positivo, 0 y -1 para mesa y cliente | Limpio |
| 2.3, 2.7 | `tests/modules/reservas/test_schemas.py` | Unidad | N/A (nuevo) | Escrito y ejecutado: `ImportError` | 40/40 | Cada campo faltante y nulo, 13 tipos laxos, 4 formatos, 4 horas con segundos o zona, estado e id | Limpio |
| 2.4, 2.9, 2.10 | `tests/modules/reservas/test_service.py` | Integración (service + SQLite) | `ahora` sin cambios previos; N/A (nuevo) | Escrito y ejecutado: `ImportError` | 30/33 tras 2.10 | Límites de fecha y hora (11:30, 12:00, 12:01, otro día), capacidad (7 de 6, 6 de 6, stub), 3 estados no activos, otra mesa, otra hora, otra fecha, orden de validación en 6 pasos | Mensaje de conflicto extraído a `_turno_ocupado` |
| 2.5, 2.11 | `tests/modules/reservas/test_service.py` | Integración | 30/33 | Ejecutado tras 2.10: 3 fallos con `IntegrityError` crudo | 33/33 | Conflicto del índice, dos altas sin verificación previa, sin SQL en el detalle | Un solo mensaje compartido |
| 2.6, 2.12 | `tests/modules/reservas/test_router.py` | Integración (HTTP con `TestClient`) | N/A (nuevo) | Escrito y ejecutado: `404 == 201/409/422` y errores de fixture | 21/21 (109 en el módulo) | 201, 404 x2, 409, 422 x6 parametrizados, estado en el cuerpo, capacidad, forma de los errores | Limpio |
| 3.1, 3.4 | `frontend/src/modules/reservas/fechas.test.ts` | Unidad (Vitest, reloj simulado) | N/A (nuevo); suite de la línea base 431/431 | Escrito y ejecutado: `Failed to resolve import "./fechas"` | 3/3 | Fecha de mediodía, fecha cerca de la medianoche (22:00 local, que en UTC-3 ya es el día siguiente en UTC) y hora con cero a la izquierda (`09:05`). **Comprobación de mutación:** con `hoyLocal` cambiada a `new Date().toISOString().slice(0, 10)`, la prueba de la medianoche falla con `TZ=America/Argentina/Buenos_Aires` (`expected '2026-10-29' to be '2026-10-28'`) y pasa con `TZ=UTC`; se restauró el código real | Constante y `conCeros` compartidos entre las dos funciones |
| 3.2, 3.4 | `frontend/src/modules/reservas/api.test.ts` | Unidad (Vitest, `vi.spyOn(clienteHttp, 'post')`) | N/A (nuevo) | Escrito y ejecutado: `TypeError: crearReserva is not a function` | 1/1 | Ruta `/reservas`, cuerpo idéntico al de entrada y respuesta devuelta tal cual | Limpio |
| 3.3, 3.4 | `frontend/src/modules/reservas/components/validarReserva.test.ts` | Unidad (función pura) | N/A (nuevo) | Escrito y ejecutado: `Failed to resolve import "./validarReserva"` | 15/15 | Datos válidos, 5 campos vacíos, texto en blanco, cantidad 0, -2, `abc` y `2.5`, Cliente 0, Mesa -1, 1 persona (límite), fecha de ayer, hoy con 12:01 (límite), hoy con 11:30 y 12:00, otro día con hora anterior, error del servidor | `errorDeEntero` compartido entre Cliente, Mesa y Cantidad; tipo de retorno de `errorDeHora` |
| 3.7, 3.8 | `frontend/src/modules/reservas/components/ReservaFormulario.test.tsx` | Componente (Testing Library, `vi.mock('../api')`, reloj `Date` simulado) | N/A (nuevo) | Escrito y ejecutado: `Failed to resolve import "./ReservaFormulario"` (suite sin pruebas) | 17/17 | Panel completo, 2 formas de cerrar, vacíos (5 avisos), cantidad `0` y `abc`, Cliente 0 y Mesa -1, fecha de ayer, hoy 11:30 y 12:00 (rechazan), hoy 12:01 (envía), alta con números, doble envío, 3 errores del servidor (409, 404, 422) y error sin detalle. **Comprobación de mutación:** sin `disabled={formulario.enviando}` falla solo la prueba del doble envío (1 fallo, 16 pasan); se restauró | `CampoReserva` único para los cinco campos; `describe` partido en dos por `max-lines-per-function` |
| 4.1, 4.4 | `tests/modules/reservas/test_schemas.py` | Unidad | `test_schemas.py` 40/40 dentro de 109/109 en el módulo | Escrito y ejecutado: `ImportError` (`FiltroReservas`) | 9 casos nuevos | Fecha y estado juntos; defaults 50, 0, `None`; estado `ABIERTA` y `activa`; fecha `02/11/2026` y `2026-13-40`; `limit` 0 y 101, `offset` -1 (cada uno falla solo en su campo) | Limpio |
| 4.2, 4.4 | `tests/modules/reservas/test_service.py` | Integración (service + repository + SQLite) | 109/109 en el módulo | Escrito y ejecutado: `ImportError` al recolectar | 12/12 | Orden fecha, hora, id (ids 3, 2, 1) y empate con ids insertados en orden inverso; páginas 2+1 con `total` 3; fecha pasada, estado, fecha más estado, filtros más paginación (3 `ACTIVA`, 2 `ATENDIDA`, `limit=2`, `offset=2`); cuatro estados; vacío con base vacía y vacío con filtro sin coincidencias; sin cambios en los datos. **Comprobaciones de mutación:** sin `Reserva.hora` en el orden falla `..._ordena_por_fecha_hora_e_id`; con `fecha` descendente falla la misma; con el total contado sobre `select(Reserva)` (sin filtros) falla `test_get_reservas_pagina_y_filtra`. **Mutante equivalente:** quitar `Reserva.id` del orden NO falla ninguna prueba, porque SQLite recorre `ix_reservas_fecha_hora` y devuelve los empates por rowid (que es el id); se comprobó con el plan de consulta (`SCAN reservas USING INDEX ix`) y se conserva `Reserva.id` porque la spec (S8, CA 3) lo exige para que el orden sea determinado en cualquier motor | Extraídos `_listar`, `_ids` y `_tres_reservas_desordenadas`; sin cambios de comportamiento |
| 4.3, 4.4 | `tests/modules/reservas/test_router.py` | Integración (HTTP con `TestClient`) | 109/109 en el módulo | Escrito y ejecutado: 13 fallos, `405 == 200` y `KeyError: 'limit'` | 13/13 (143 en el módulo) | Primera y segunda página con filtros combinados que excluyen otro estado y otro día; 60 reservas con valores por defecto (50 de 60); `limit` 101 y 0, `offset` -1 y `abc`; `estado` `ABIERTA` y `activa`, `fecha` `02/11/2026` y `2026-13-40`, todos con la clave única `detalle`; vacío 200; fecha pasada con estado `ATENDIDA`; hora `04:05` | Limpio |
| 5.1, 5.5 | `frontend/src/modules/reservas/fechas.test.ts` | Unidad (Vitest, reloj simulado) | 3/3 de `hoyLocal` y `horaActualLocal` dentro de la suite de la línea base 467/467 | Escrito y ejecutado: 7 fallos, `TypeError: sumarDias is not a function` y `formatearFechaReserva is not a function` | 10/10 | `sumarDias`: +1 y -1 en un día común, fin de mes, fin de año, 1 de marzo no bisiesto (`2026-02-28`) y bisiesto (`2028-02-29`). **Comprobación de mutación:** con `formatearFechaReserva` cambiada a `new Date(fecha).toLocaleDateString('es-AR', …)` la prueba falla con `TZ=America/Argentina/Buenos_Aires` (`expected '23/10/2026' to be '24/10/2026'`) y pasa con `TZ=UTC`; se restauró el código real | `split('-').reverse().join('/')`: sin `Date` ni dependencia de la zona |
| 5.2, 5.5 | `frontend/src/modules/reservas/api.test.ts` | Unidad (`vi.spyOn(clienteHttp, 'get')`) | 1/1 de `crearReserva` | Escrito y ejecutado: 3 fallos, `TypeError: listarReservas is not a function` | 4/4 | `ACTIVA` en la primera página, `TODAS` (omite `estado`) y `ATENDIDA` con `offset` 50, y el orden `fecha`, `estado`, `limit`, `offset` | Limpio |
| 5.3, 5.5 | `frontend/src/modules/reservas/components/ReservasTabla.test.tsx` | Componente (Testing Library) | N/A (nuevo) | Escrito y ejecutado: `Failed to resolve import "./ReservasTabla"` (suite sin pruebas) | 6/6 | Encabezados exactos, fila completa con 2 reservas, 4 estados (texto y variante), vacío, cargando (sin vacío ni filas) y error (mensaje fijo, sin el texto de la API, `onReintentar` una vez). **Comprobación de mutación:** con `ACTIVA` en la variante `success` falla solo la prueba de los estados (1 fallo, 5 pasan); se restauró | Constante `COLUMNAS` del módulo; `ESTADOS_RESERVA` como única fuente del texto y la variante |
| 5.4, 5.5 | `frontend/src/modules/reservas/components/NavegadorFecha.test.tsx` | Componente (Testing Library, reloj `Date` simulado) | N/A (nuevo) | Escrito y ejecutado: `Failed to resolve import "./NavegadorFecha"` (suite sin pruebas) | 10/10 | Día mostrado, 5 cruces (día común, fin de mes, fin de año, 1 de marzo) por los dos botones, elegir un día, campo vaciado (no pide nada), «Hoy» a las 12:00 y «Hoy» a las 22:00 del 28/10. **Comprobación de mutación:** sin el guard `value !== ''` falla solo «vaciar el campo» (1 fallo, 9 pasan); se restauró | Limpio |
| 5.8, 5.9, 5.10 | `frontend/src/modules/reservas/pages/ReservasPage.test.tsx` | Página (Testing Library, `MemoryRouter`, `vi.mock('../api')`, reloj `Date` simulado) | 62/62 del módulo tras el commit 6 | Escrito y ejecutado: 13 fallos sobre el `EmptyState` de «pendiente» (`Unable to find an element with the text…`) | 13/13 | Apertura (consulta, día, estado, descripción legible), panel cerrado y abierto con la ruta intacta, una sola página sin paginación, día siguiente y anterior, campo y «Hoy», salto a la página 1 desde la 2 por cambio de día y por cambio de estado (`TODAS` y `ATENDIDA`), 5 opciones del selector, 60 reservas en 2 páginas (50 y 10 filas), guardar (cierra y recarga), vacío, error y reintento. **Comprobaciones de mutación:** sin `irAPagina(1)` en `cambiarFecha` falla solo la prueba del cambio de día; sin `irAPagina(1)` en `cambiarEstado` fallan las 2 del cambio de estado; sin `recargar()` al guardar falla solo la del guardado; se restauró | `max-lines-per-function` pidió partir `ReservasPage` (84 líneas): `SelectorEstadoReserva`, `useListadoReservas` y `ListadoDelDia` |
| 6.1, 6.5 | `tests/modules/reservas/test_schemas.py` | Unidad | 143/143 en el módulo | Escrito y ejecutado: `ImportError` (`ReservaModificar`) | 12 casos nuevos | Cada uno de los tres campos faltante (el error nombra solo ese campo); `mesa_id`, `cliente_id`, `estado` e `id` rechazados; hereda `cantidad_personas` 0, `"4"` y `true` y la hora `21:30:45` | Limpio |
| 6.2, 6.3, 6.5 | `tests/modules/reservas/test_service.py` | Integración (service + repository + SQLite) | 143/143 en el módulo | Escrito y ejecutado: `ImportError` al recolectar; con la primera versión de `modificar_reserva`, 4 fallos (autoconflicto x3 y mensaje con el horario viejo x1) | 24 casos nuevos (194 en el módulo con los otros dos archivos) | Consulta en `ACTIVA`, `ATENDIDA` e inexistente; cambio de los tres valores, de uno solo y dos `PUT` seguidos; mesa, cliente y estado conservados; fecha pasada, hora pasada, capacidad 7 de 6 y stub con 50; mesa y cliente sin existir (S27); mismo turno, turno de otra activa, de una `CANCELADA_ANTICIPADA`, de otra mesa y turno liberado; 3 estados no activos; activa con fecha pasada (422 con la misma fecha, 200 con otra); reserva inexistente; índice parcial sin verificación previa; orden de validación en 6 pasos. **Comprobaciones de mutación (11 mutantes sobre el código final del commit, todos detectados):** ignorar `excluir_id` en el repository (3 fallos), invertirlo a `==` (3), no pasarlo desde el service (3), exigir que la mesa exista (1: `no_consulta_mesa_ni_cliente`), no validar `ACTIVA` (6), armar el mensaje del conflicto después del rollback (1: `traduce_conflicto_del_indice_en_409`), asignar la hora antes de validar (4, gracias a `assert not db.dirty` en `_guardada`), omitir la capacidad (2), no asignar la cantidad (6), asignar el estado de más (5) y exigir `ACTIVA` en la consulta (2) | `_validar_capacidad_de_la_reserva` extraída; `_confirmar` arma el mensaje antes de escribir |
| 6.4, 6.5 | `tests/modules/reservas/test_router.py` | Integración (HTTP con `TestClient`) | 143/143 en el módulo | Escrito y ejecutado: 15 fallos, `404 == 200/409/422` | 15/15 (194 en el módulo) | Alta y consulta con los mismos datos; consulta de `ATENDIDA`, 404 y `abc` (422); `PUT` que se ve en la consulta por id y en el listado; 4 cuerpos inválidos (sin `hora`, con `mesa_id`, con `cliente_id` y con `estado`) que no cambian la reserva; 409 por no activa y por turno ocupado; 422 por fecha pasada; 404 y `abc`; 404, 409 y 422 con la clave única `detalle` | Limpio |
| 7.1, 7.6 | `frontend/src/modules/reservas/api.test.ts` | Unidad (`vi.spyOn(clienteHttp, 'put')`) | 4/4 de `crearReserva` y `listarReservas` dentro del módulo 75/75 | Escrito y ejecutado: 1 fallo, `TypeError: modificarReserva is not a function` | 5/5 | Ruta `/reservas/7` con id propio y cuerpo con exactamente `fecha`, `hora` y `cantidad_personas` (`toHaveBeenCalledWith` falla si sobra una clave); respuesta devuelta tal cual | Limpio |
| 7.2, 7.6 | `frontend/src/modules/reservas/components/validarReserva.test.ts` | Unidad (función pura) | 15/15 del modo alta | Escrito y ejecutado: 1 fallo de 3 nuevas (Cliente y Mesa se validaban en edición) | 18/18 | Edición: datos válidos; Cliente vacío y Mesa `abc` sin error; fecha de ayer, hora vacía y cantidad `0` con su error cada una; hoy con la hora actual rechazada. **Comprobación de mutación:** con `modo` ignorado (siempre valida Cliente y Mesa) falla solo la prueba nueva (1 fallo, 95 pasan en el módulo); se restauró | `erroresDeClienteYMesa` y `erroresDelTurno` |
| 7.3, 7.6 | `frontend/src/modules/reservas/components/ReservaFormulario.test.tsx` | Componente (Testing Library, `vi.mock('../api')`, reloj `Date` simulado) | 17/17 del modo alta | Escrito y ejecutado: 11 fallos (4 por el modo ausente y 7 por `modificarReserva` inexistente en el módulo simulado) | 28/28 | Título y datos de la fila; Cliente y Mesa deshabilitados (7 y 5) y los otros tres habilitados; «Cancelar» y «Cerrar formulario» sin `PUT`; envío con los tres datos cambiados y el id 12 (`toHaveBeenCalledExactlyOnceWith`), el aviso «Reserva modificada» y `crearReserva` sin llamarse; fecha de ayer y cantidad `0` sin `PUT`; 409 de conflicto, 409 de reserva no activa y 404 conservando la cantidad editada y los campos deshabilitados; respuesta sin detalle. **Comprobaciones de mutación:** sin `disabled` en Cliente y Mesa fallan 5; con `mesa_id` de más en el `PUT` fallan 2 (el formulario y la página); con el aviso de la edición igual al del alta falla 1; con la edición llamando a `crearReserva` fallan 6; sin el `return` ante errores locales fallan 9; con la hora de la fila en blanco fallan 8; se restauró cada vez | `TEXTOS` por modo, `datosIniciales` y un solo `guardar` |
| 7.4, 7.6 | `frontend/src/modules/reservas/components/ReservasTabla.test.tsx` | Componente (Testing Library) | 6/6 de filas, vacío, carga y error | Escrito y ejecutado: 3 fallos (encabezado `Acciones` ausente y acción ausente x2) | 8/8 | Cuatro reservas, una por estado: un solo botón y en la fila `ACTIVA`; dos filas `ACTIVA`: pulsar la segunda avisa con la reserva de esa fila (`toHaveBeenCalledExactlyOnceWith(otra)`). **Comprobación de mutación:** con la acción en todas las filas falla solo la prueba de las activas (1 fallo, 95 pasan); se restauró | Columna `acciones` aparte de `COLUMNAS` |
| 7.5, 7.6 | `frontend/src/modules/reservas/pages/ReservasPage.test.tsx` | Página (Testing Library, `MemoryRouter`, `vi.mock('../api')`, reloj `Date` simulado) | 13/13 del alta y el listado | Escrito y ejecutado: 4 fallos (acción «Modificar reserva» ausente) | 17/17 | Panel con los datos de la fila, ruta `/reservas`, una sola consulta de listado y ninguna llamada de alta ni de modificación; pasar de una fila a otra con el panel abierto; «Nueva reserva» después de editar con los cinco campos vacíos y habilitados; guardar la edición (`PUT` con el id 1, panel cerrado, tabla pedida de nuevo). **Comprobación de mutación:** sin la `key` del formulario fallan las 2 pruebas de cambio de fila y de «Nueva reserva» (2 fallos, 94 pasan); se restauró | `PanelDeReserva` extraído de la página |

### Test Summary

- **Pruebas nuevas:** 109 (9 en el commit 1; 100 en el commit 2), más 2 de M3 modificadas.
- **Suite completa:** 690 pasando, 0 fallos. Cobertura 99,70 % (módulo `reservas`: 100 % en las 7 unidades). Línea base 581 y 99,54 %: no empeoró.
- **Capas usadas:** unidad (esquemas y puente), integración con base SQLite temporal (modelo, migración y service) e integración HTTP (router).
- **Pruebas de aproximación:** ninguna (no hubo refactor de código existente).
- **Frontend (lote B):** 36 pruebas nuevas (19 en el commit 3: `fechas` 3, `api` 1, `validarReserva` 15; 17 en el commit 4: `ReservaFormulario`). Suite completa: 467 pasando en 44 archivos (línea base 431 en 40). Cobertura sin cambios (74,75 % / 70,62 % / 71,2 % / 76,68 %), porque `vite.config.ts` solo mide `App.tsx` y `shared/`. `V-TZ`: las 36 pruebas de `src/modules/reservas` pasan con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC`.
- **Capas usadas en el frontend:** unidad (fechas, API simulada y validación pura) y componente (panel con el hook, la API simulada y el reloj simulado solo en `Date`, para que `waitFor` siga usando temporizadores reales).
- **Backend, lote C (commit 5):** 34 pruebas nuevas (schemas 9 casos en 5 funciones; service 12; router 13 casos en 7 funciones). Suite completa: 724 pasando, 0 fallos (690 antes). Cobertura 99,61 % (4 líneas sin cubrir, todas fuera de `reservas`: `app/database.py` 44 y 55-56, `app/modules/productos/service.py` 285; módulo `reservas` al 100 %). Capas: unidad (schemas), integración con SQLite (service y repository) e integración HTTP (router).
- **Frontend, lote D (commits 6 y 7):** 39 pruebas nuevas (26 en el commit 6: `fechas` 7, `api` 3, `ReservasTabla` 6, `NavegadorFecha` 10; 13 en el commit 7: `ReservasPage`). Suite completa: 506 pasando en 47 archivos, 0 fallos (467 en 44 antes). Cobertura sin cambios (74,75 % / 70,62 % / 71,2 % / 76,68 %) porque `vite.config.ts` solo mide `App.tsx` y `shared/`. `V-TZ`: las 75 pruebas de `src/modules/reservas` pasan con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC`. Capas: unidad (fechas y API), componente (tabla y navegador) y página (hook real, `DataTable`, `Pagination` y panel reales, API simulada, `MemoryRouter` y reloj `Date` simulado). **Prueba intermitente de la línea base:** no reapareció en las 2 corridas completas de este lote (493 y 506 pruebas, sin fallos).
- **Backend, lote E (commit 8):** 51 pruebas nuevas (schemas 12 casos en 4 funciones; service 24 casos en 22 funciones; router 15 casos en 12 funciones). Suite completa: 775 pasando, 0 fallos (724 antes). Cobertura 99,62 % (las 4 líneas sin cubrir son las mismas de antes, todas fuera de `reservas`; módulo `reservas` al 100 % en las 7 unidades; el lote C había medido 99,61 %). Capas: unidad (schemas), integración con SQLite (service y repository) e integración HTTP (router).
- **Frontend, lote F (commit 9):** 21 pruebas nuevas (`api` 1, `validarReserva` 3, `ReservaFormulario` 11, `ReservasTabla` 2, `ReservasPage` 4) y 1 modificada (los encabezados de `ReservasTabla` ahora incluyen `Acciones`). Suite completa: 527 pasando en 47 archivos, 0 fallos (506 antes). Cobertura sin cambios (74,75 % / 70,62 % / 71,2 % / 76,68 %) porque `vite.config.ts` solo mide `App.tsx` y `shared/`. `V-TZ`: las 96 pruebas de `src/modules/reservas` pasan con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC`. Capas: unidad (API y validación), componente (panel y tabla) y página (hook real, `DataTable` y panel reales, API simulada, `MemoryRouter` y reloj `Date` simulado). **Prueba intermitente de la línea base:** no reapareció en las 3 corridas completas de este lote (527 pruebas, sin fallos).

## Work Unit Evidence

### Unidad 1 (commit `3d4d57a`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `python -m pytest -q --no-cov tests/modules/reservas/test_migracion.py tests/modules/reservas/test_models.py tests/modules/salon/test_migracion.py` en Docker: `22 passed` |
| Arnés de ejecución | Sobre una base temporal (`DATABASE_URL=sqlite:////db/h.db`): `alembic upgrade head` termina en `d6f8a0c2e4b6`; `alembic heads` = `d6f8a0c2e4b6 (head)`; `alembic downgrade b2d4f6a8c0e1` deja `b2d4f6a8c0e1`; `alembic upgrade head` vuelve a `d6f8a0c2e4b6`; la tabla queda con los índices `ix_reservas_fecha_hora` y `ux_reservas_mesa_fecha_hora_activa`; `alembic check` sin diferencias |
| Rollback | Revertir el commit `3d4d57a`; si la migración ya se aplicó, antes `alembic downgrade b2d4f6a8c0e1` |

### Unidad 2 (commit `55be2c6`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `python -m pytest -q --no-cov tests/modules/reservas` en Docker: `109 passed` |
| Arnés de ejecución | `uvicorn app.main:app` sobre la base temporal migrada y `urllib` desde el mismo contenedor (sin red): el primer `POST /api/v1/reservas` responde `201` con `estado: ACTIVA` y `hora: "21:30"`; repetir el cuerpo responde `409` («La mesa 5 ya tiene una reserva activa el 2030-01-15 a las 21:30»); sin `fecha` responde `422` («Datos invalidos. fecha: Field required»); con `estado` responde `422`; con fecha pasada responde `422`. En la base queda una sola fila `ACTIVA` |
| Rollback | Revertir el commit `55be2c6`; la tabla queda creada y sin ruta |

### Unidad 3 (commit `af07415`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `npx vitest run src/modules/reservas/fechas.test.ts src/modules/reservas/api.test.ts src/modules/reservas/components/validarReserva.test.ts --coverage.enabled=false`: `3 passed (3)` archivos y `19 passed (19)` pruebas; igual con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` (`V-TZ`) |
| Arnés de ejecución | N/A: funciones puras y llamadas simuladas, sin pantalla ni ruta (como indica `tasks.md`). La mutación de `hoyLocal` con `toISOString()` hace de arnés de zona horaria: falla en UTC-3 y pasa en UTC |
| Rollback | Revertir el commit `af07415` (después del commit `f65027f`, que importa estos módulos): `types.ts` y `api.ts` vuelven a las versiones anteriores (con la `listarReservas` que nadie usaba) y `fechas.ts`, `validarReserva.ts` y sus pruebas desaparecen |

### Unidad 4 (commit `f65027f`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `npx vitest run src/modules/reservas/components/ReservaFormulario.test.tsx --coverage.enabled=false`: `1 passed (1)` archivo y `17 passed (17)` pruebas; el módulo completo (`src/modules/reservas`) pasa 36/36 con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` |
| Arnés de ejecución | N/A: el panel todavía no se monta en ninguna página (se ejercita de punta a punta en la unidad 7, como indica `tasks.md`); las pruebas de componente lo montan con el DOM real de jsdom, el hook real, la API simulada y el reloj simulado. `npm run build` incluye los tipos (`tsc --noEmit`) y termina bien |
| Rollback | Revertir el commit `f65027f`: desaparecen `useFormularioReserva.ts`, `ReservaFormulario.tsx` y su prueba, y `components/index.ts` vuelve a `export {}`; el panel no se usa todavía |

### Unidad 5 (commit `e2103d4`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `python -m pytest -q --no-cov tests/modules/reservas` en Docker: `143 passed` (109 previas más 34 nuevas) |
| Arnés de ejecución | `uvicorn app.main:app` (puerto local dentro del contenedor, sin red) sobre una base temporal migrada con 3 reservas creadas por `POST`: `GET /api/v1/reservas?limit=2&offset=0` responde `200` con los ids 3 y 2 (`2030-01-15` a las `21:30` y `22:00`), `total` 3, `limit` 2, `offset` 0; `limit=2&offset=2` trae el id 1 (`2030-01-16`, `10:00`) con `total` 3; `fecha=2030-01-15` trae 2 con `total` 2; `estado=ATENDIDA` responde `200` con `items` vacío y `total` 0; `fecha=2030-01-16&estado=ACTIVA` trae 1; `limit=101` responde `422` («Datos invalidos. limit: Input should be less than or equal to 100»); `estado=activa` y `fecha=02/11/2026` responden `422` con la clave única `detalle` |
| Rollback | Revertir el commit `e2103d4`: desaparecen `FiltroReservas`, `listar_reservas` (repository y service), `GET /reservas` y sus pruebas; el alta sigue funcionando |

### Unidad 6 (commit `af90732`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `npx vitest run src/modules/reservas/fechas.test.ts src/modules/reservas/api.test.ts src/modules/reservas/components --coverage.enabled=false`: `6 passed (6)` archivos y `62 passed (62)` pruebas; igual con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` (`V-TZ`) |
| Arnés de ejecución | N/A: los componentes todavía no se montan en ninguna página (se ejercitan en la unidad 7, como indica `tasks.md`). La mutación de `formatearFechaReserva` con `new Date(...)` hace de arnés de zona horaria: falla en UTC-3 y pasa en UTC |
| Rollback | Revertir el commit `af90732` (después del `0d02c8e`, que importa estos módulos): desaparecen `listarReservas`, `sumarDias`, `formatearFechaReserva`, `estadosReserva.ts`, `ReservasTabla`, `NavegadorFecha` y sus pruebas, y `components/index.ts` vuelve a exportar solo `ReservaFormulario` |

### Unidad 7 (commit `0d02c8e`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `npx vitest run src/modules/reservas --coverage.enabled=false`: `7 passed (7)` archivos y `75 passed (75)` pruebas; igual con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` |
| Arnés de ejecución | **Humo manual con `npm run dev` contra el backend real: PENDIENTE para la persona** (el apply no levanta servidores). Sustituto observado: `ReservasPage.test.tsx` monta la página completa (hook real, `DataTable`, `Pagination`, `NavegadorFecha` y panel de alta reales) con `MemoryRouter`, la API simulada y el reloj `Date` simulado; `npm run build` incluye los tipos (`tsc --noEmit`) y termina bien |
| Rollback | Revertir el commit `0d02c8e`: `ReservasPage` vuelve al `EmptyState` de «pendiente»; desaparecen `useListadoReservas`, `SelectorEstadoReserva`, `OPCIONES_FILTRO_ESTADO` y su prueba; los componentes del commit 6 y el panel de alta siguen sin montar |

### Unidad 8 (commit `61acb81`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `python -m pytest -q --no-cov tests/modules/reservas` en Docker: `194 passed` (143 previas más 51 nuevas) |
| Arnés de ejecución | `uvicorn app.main:app` (puerto local dentro del contenedor, sin red) sobre una base temporal migrada, con `urllib` desde el mismo contenedor y el reloj real (2026-10-29), con fechas de 2030. Alta de A (mesa 5, 21:30) y B (mesa 5, 22:00): `201` ambas. `GET /reservas/1` responde `200` con los siete campos y `hora: "21:30"`; `GET /reservas/999` responde `404` («La reserva 999 no existe»); `GET /reservas/abc` responde `422` («Datos invalidos. reserva_id: Input should be a valid integer…»). `PUT /reservas/2` al turno de A responde `409` («La mesa 5 ya tiene una reserva activa el 2030-01-15 a las 21:30»); `PUT /reservas/1` con sus mismos valores responde `200`; `PUT /reservas/2` a `2030-01-16` 20:00 con 6 personas responde `200` y `GET /reservas/2` y `GET /reservas?fecha=2030-01-16` (total 1) muestran los valores nuevos. `PUT` con `mesa_id` responde `422` («mesa_id: Extra inputs are not permitted»); sin `hora`, `422` («hora: Field required»); con fecha `2020-01-01`, `422` («La fecha de la reserva no puede ser anterior a hoy»); a `/reservas/999`, `404`; a `/reservas/abc`, `422`. `PUT /reservas/1` a las 22:30 responde `200` y un alta nueva en la mesa 5 a las 21:30 responde `201` (turno liberado). Con la reserva 2 pasada a `ATENDIDA` directo en la base, `PUT /reservas/2` responde `409` («La reserva 2 no está activa y no se puede modificar») y `GET /reservas/2` responde `200` con `estado: ATENDIDA`. En la base quedan 3 filas (1 y 3 `ACTIVA`, 2 `ATENDIDA`) con la hora guardada como `HH:MM:00.000000` (sin segundos distintos de cero) |
| Rollback | Revertir el commit `61acb81`: desaparecen `ReservaModificar`, `repository.obtener`, el parámetro `excluir_id`, `obtener_reserva`, `modificar_reserva`, las funciones privadas nuevas y las rutas `GET` y `PUT /reservas/{id}` (y `_confirmar` vuelve a armar el mensaje en el `except`); el alta y el listado siguen funcionando |

### Unidad 9 (commit `f1a210f`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `npx vitest run src/modules/reservas --coverage.enabled=false`: `7 passed (7)` archivos y `96 passed (96)` pruebas; igual con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` (`V-TZ`) |
| Arnés de ejecución | **Humo manual con `npm run dev` contra el backend real: PENDIENTE para la persona** (el apply no levanta servidores): pulsar «Modificar reserva» en una fila activa, cambiar la cantidad y ver el cambio en la tabla. Sustituto observado: `ReservasPage.test.tsx` monta la página completa (hook real, `DataTable`, `NavegadorFecha` y panel reales) con `MemoryRouter`, la API simulada y el reloj `Date` simulado, y ejercita abrir el panel de edición desde la fila, cambiar de fila, «Nueva reserva» después de editar y guardar la edición; `npm run build` incluye los tipos (`tsc --noEmit`) y termina bien. El contrato del `PUT` (solo `fecha`, `hora` y `cantidad_personas`; 404, 409 y 422 como `{"detalle": ...}`) ya se comprobó contra el backend real en la unidad 8 |
| Rollback | Revertir el commit `f1a210f`: desaparecen `modificarReserva`, el modo `'edicion'` de `validarReserva`, la prop `reserva` del hook y del panel, la columna de acciones de la tabla y el panel `{ edicion }` de la página (con `PanelDeReserva`); el alta y el listado siguen funcionando |

## Archivos cambiados

| Archivo | Acción | Qué se hizo |
|---------|--------|-------------|
| `backend/app/modules/reservas/models.py` | Modificado | `EstadoReserva` y `Reserva` con check e índices |
| `backend/alembic/versions/d6f8a0c2e4b6_crea_reservas.py` | Creado | Migración reversible de `reservas` |
| `backend/app/modules/reservas/schemas.py` | Modificado | `_DatosDelTurno`, `ReservaCrear`, `ReservaSalida` |
| `backend/app/modules/reservas/puente.py` | Creado | Stub de Mesa y Cliente |
| `backend/app/modules/reservas/repository.py` | Modificado | `agregar`, `existe_reserva_activa` |
| `backend/app/modules/reservas/service.py` | Modificado | `ahora`, `crear_reserva` y funciones privadas |
| `backend/app/modules/reservas/router.py` | Modificado | `POST /reservas` |
| `backend/app/main.py` | Modificado | Registro de `reservas_router` |
| `backend/tests/modules/reservas/{__init__,conftest,test_migracion,test_models,test_puente,test_schemas,test_service,test_router}.py` | Creados | Pruebas por capa |
| `backend/tests/modules/salon/test_migracion.py` | Modificado | 2 líneas: `downgrade` anclado a revisiones fijas (aviso a M3 en el PR) |
| `frontend/src/modules/reservas/types.ts` | Modificado | Reescrito con los tipos del diagrama: `EstadoReserva`, `FiltroEstadoReserva`, `Reserva`, `ReservaCrear`, `ReservaModificar` |
| `frontend/src/modules/reservas/api.ts` | Modificado | Reescrito: solo `crearReserva` (`POST /reservas`); la `listarReservas` anterior no la usaba nadie |
| `frontend/src/modules/reservas/fechas.ts` | Creado | `hoyLocal` y `horaActualLocal` con los métodos locales de `Date` |
| `frontend/src/modules/reservas/components/validarReserva.ts` | Creado | `validarReserva` (pura, con `hoy` y `horaActual` por parámetro), `errorDelServidor` y los tipos del formulario |
| `frontend/src/modules/reservas/components/useFormularioReserva.ts` | Creado | Estado, validación local, `crearReserva`, aviso de éxito y error general |
| `frontend/src/modules/reservas/components/ReservaFormulario.tsx` | Creado | Panel de alta en un `Card`, con un `CampoReserva` por campo; sin montar en ninguna página |
| `frontend/src/modules/reservas/components/index.ts` | Modificado | Reexporta `ReservaFormulario` |
| `frontend/src/modules/reservas/{fechas,api}.test.ts`, `components/{validarReserva.test.ts,ReservaFormulario.test.tsx}` | Creados | 36 pruebas |
| `backend/app/modules/reservas/schemas.py` | Modificado (lote C) | `FiltroReservas(ParametrosPaginacion)` con `fecha` y `estado` opcionales |
| `backend/app/modules/reservas/repository.py` | Modificado (lote C) | `listar_reservas`: filtros opcionales, orden `fecha`, `hora`, `id`, página con `aplicar` y total con `contar` |
| `backend/app/modules/reservas/service.py` | Modificado (lote C) | `listar_reservas(db, filtro) -> Pagina[ReservaSalida]` |
| `backend/app/modules/reservas/router.py` | Modificado (lote C) | `GET /reservas` con `Annotated[FiltroReservas, Query()]` |
| `backend/tests/modules/reservas/{test_schemas,test_service,test_router}.py` | Modificados (lote C) | 34 pruebas del listado |
| `frontend/src/modules/reservas/api.ts` | Modificado (lote D) | `listarReservas(fecha, estado, limit, offset)` con `URLSearchParams`; omite `estado` con `'TODAS'` |
| `frontend/src/modules/reservas/fechas.ts` | Modificado (lote D) | `sumarDias` (aritmética en UTC, sin depender de la zona) y `formatearFechaReserva` (separa el texto, sin `Date`) |
| `frontend/src/modules/reservas/components/estadosReserva.ts` | Creado (lote D) | `ESTADOS_RESERVA` (etiqueta y variante por estado, Decisión 12) y `OPCIONES_FILTRO_ESTADO` |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx` | Creado (lote D) | `DataTable` y `Badge` compartidos; columnas Hora, Cliente, Personas, Mesa y Estado; vacío, cargando y error con el mensaje fijo |
| `frontend/src/modules/reservas/components/NavegadorFecha.tsx` | Creado (lote D) | «Día anterior», campo «Día», «Día siguiente» y «Hoy» |
| `frontend/src/modules/reservas/components/SelectorEstadoReserva.tsx` | Creado (lote D) | `Select` compartido con las cuatro etiquetas de estado y «Todas» |
| `frontend/src/modules/reservas/components/index.ts` | Modificado (lote D) | Reexporta `NavegadorFecha`, `ReservasTabla` y `SelectorEstadoReserva` |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` | Reescrito (lote D) | `PageHeader` con «Nueva reserva», `ListadoDelDia` (navegador, selector, tabla con «Reservas del DD/MM/AAAA» y paginación) y el panel de alta al costado |
| `frontend/src/modules/reservas/pages/useListadoReservas.ts` | Creado (lote D) | Día (`hoyLocal`), estado (`ACTIVA`), página (`usePaginacion`, límite 50) y `useApi`; cambiar día o estado vuelve a la página 1 |
| `frontend/src/modules/reservas/{fechas,api}.test.ts`, `components/{ReservasTabla,NavegadorFecha}.test.tsx`, `pages/ReservasPage.test.tsx` | Modificados y creados (lote D) | 39 pruebas |
| `backend/app/modules/reservas/schemas.py` | Modificado (lote E) | `ReservaModificar(_DatosDelTurno)`: solo fecha, hora y cantidad |
| `backend/app/modules/reservas/repository.py` | Modificado (lote E) | `obtener` y `excluir_id` en `existe_reserva_activa` (con su docstring) |
| `backend/app/modules/reservas/service.py` | Modificado (lote E) | `obtener_reserva`, `modificar_reserva` y las privadas `_obtener`, `_validar_activa` y `_validar_capacidad_de_la_reserva`; `_validar_turno_libre` con `excluir_id`; `_confirmar` arma el mensaje de conflicto antes de escribir |
| `backend/app/modules/reservas/router.py` | Modificado (lote E) | `GET /reservas/{reserva_id}` y `PUT /reservas/{reserva_id}` |
| `backend/tests/modules/reservas/{test_schemas,test_service,test_router}.py` | Modificados (lote E) | 51 pruebas de la consulta y la modificación |
| `frontend/src/modules/reservas/api.ts` | Modificado (lote F) | `modificarReserva(id, datos)`: `PUT /reservas/{id}` |
| `frontend/src/modules/reservas/components/validarReserva.ts` | Modificado (lote F) | `ModoReserva = 'alta' \| 'edicion'`; `modo` ahora tiene efecto: en edición no se validan Cliente ni Mesa (`erroresDeClienteYMesa` y `erroresDelTurno`) |
| `frontend/src/modules/reservas/components/useFormularioReserva.ts` | Modificado (lote F) | Opción `reserva`: parte de los datos de la fila, envía `modificarReserva` con solo los tres datos y usa los textos de aviso y de error por modo |
| `frontend/src/modules/reservas/components/ReservaFormulario.tsx` | Modificado (lote F) | Prop `reserva`: título «Modificar reserva» y Cliente y Mesa deshabilitados |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx` | Modificado (lote F) | Columna `Acciones` con el botón «Modificar reserva» solo en filas `ACTIVA` (prop obligatoria `onModificar`) |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` | Modificado (lote F) | Panel `'cerrado' \| 'alta' \| { edicion: Reserva }` y `PanelDeReserva` con `key` por reserva |
| `frontend/src/modules/reservas/{api,components/validarReserva}.test.ts`, `components/{ReservaFormulario,ReservasTabla}.test.tsx`, `pages/ReservasPage.test.tsx` | Modificados (lote F) | 21 pruebas nuevas y 1 modificada |

## Desvíos del diseño y de las tareas

1. **`_confirmar` envuelve también `repository.agregar`.** La tarea 2.11 describe `_confirmar` con `commit()` y `IntegrityError`. El índice único parcial se viola en el `flush` de `agregar`, antes del `commit`, así que ambos deben ir dentro del `try` (igual que `salon.service._guardar_mesa`). Si no, el `IntegrityError` sale sin traducir.
2. **El router usa la anotación de retorno `-> ReservaSalida`** en lugar de `response_model=ReservaSalida` (patrón de `salon/router.py`). El comportamiento es idéntico.
3. **Pruebas agregadas a lo listado** (todas sobre comportamiento de la spec): `test_reserva_nueva_queda_activa_por_defecto`, `test_ahora_devuelve_la_fecha_y_hora_locales_sin_zona` (nació con el soporte de 2.1, sin RED propio porque la tarea 2.1 pide crear `ahora()` antes; cubre su única línea), `test_crear_reserva_compara_la_hora_en_minutos`, `test_reserva_crear_acepta_hora_con_segundos_en_cero`, `test_reserva_crear_rechaza_campos_nulos` (separada de los faltantes), `test_reserva_salida_serializa_horas_con_cero_a_la_izquierda`, `test_post_reservas_error_404_tiene_solo_la_clave_detalle` (el 404 necesita el reemplazo del puente, por eso va aparte de 409 y 422).
4. **La hora con zona** (`21:30+03:00`, `21:30Z`) también se rechaza, como indica la Decisión 7.
5. **`validarReserva` ya recibe `modo`, pero solo existe `'alta'`.** La tarea 3.3 fija la firma `validarReserva(datos, modo, hoy, horaActual)` y la 7.2 pide una prueba en rojo del modo edición («fallan porque el modo edición no existe»). Para no cambiar la firma ni a quienes la llaman en la Fase 7, el parámetro ya está (`_modo`, tipo `ModoReserva = 'alta'`), pero no tiene efecto todavía. Es la única parte sin comportamiento propio de este lote; la Fase 7 amplía el tipo con su prueba en rojo.
6. **Los campos numéricos son de texto con `inputMode="numeric"`, no `type="number"`.** La maqueta usa `type="number" min="1"` para la cantidad, pero la spec exige advertir el texto no numérico («Cantidad inválida»), y un `type="number"` no deja escribir texto (el navegador y jsdom lo descartan). Se siguió el patrón del campo Orden de `SeccionFormDialog`. Cliente y Mesa también son de texto numérico por S13.
7. **Orden de los campos:** el de la maqueta (Cliente; Fecha y Hora en dos columnas; Cantidad de personas; Mesa).
8. **`api.test.ts` usa `vi.spyOn(clienteHttp, 'post')`** en lugar de `vi.mock`, que es lo que hace `productos/api.test.ts`. El efecto es el mismo (el cliente compartido no hace red).
9. **El reloj de las pruebas del panel simula solo `Date`** (`vi.useFakeTimers({ toFake: ['Date'] })`): con `useFakeTimers()` completo, `waitFor` y `findBy` de Testing Library se quedan colgados porque los temporizadores también quedan simulados.
10. **Prueba agregada a lo listado en 3.7:** `mientras envía deshabilita «Guardar reserva» para no duplicar el alta` (un doble clic no debe crear dos reservas; el servidor lo frenaría con 409, pero la interfaz no debe provocarlo) y `si la respuesta no trae detalle muestra un error general`.

11. **(Lote C) El router usa la anotación de retorno `-> Pagina[ReservaSalida]`** en lugar de `response_model=Pagina[ReservaSalida]` que cita 4.4 (mismo criterio que el desvío 2 y que `salon/router.py`). El comportamiento es idéntico.
12. **(Lote C) Pruebas agregadas a lo listado:** `test_filtro_reservas_sin_parametros_usa_los_valores_por_defecto` (los valores por defecto 50, 0 y `None` van aparte de la prueba parametrizada de límites, para no repetir la comprobación en cada caso) y `test_listar_reservas_filtros_sin_coincidencias_devuelve_pagina_vacia` (escenario «Filtros sin coincidencias» de la spec; la prueba de la base vacía sola no demostraría que el filtro es quien vacía el resultado).
13. **(Lote C) `repository.listar_reservas` recibe `(db, parametros, fecha, estado)`**, como pide 4.4, y el `service` le pasa el mismo `FiltroReservas` como `parametros` (es una subclase de `ParametrosPaginacion`), igual que `salon.service.listar_sectores`.

14. **(Lote D) `ReservasTabla` todavía no tiene la columna de acciones.** La spec lista «Hora, Cliente, Personas, Mesa, Estado y acciones», pero 5.5 pide la tabla «sin la acción de modificar todavía» y 5.3 fija los encabezados exactos (Hora, Cliente, Personas, Mesa y Estado). La columna y la acción «Modificar reserva» llegan con la Fase 7 (7.4 y 7.6); agregar ahora una columna vacía no tendría comportamiento ni prueba.
15. **(Lote D) El error de carga muestra siempre el mensaje fijo de S26.** `DataTable` usa su prop `error` como descripción del `ErrorState`, así que `ReservasTabla` le pasa «No se pudieron cargar las reservas.» y descarta el texto que trae la API (una prueba lo fija). El título del `ErrorState` compartido sigue siendo «No se pudieron cargar los datos» y la acción es «Reintentar» (ambos de `shared/`, sin modificar).
16. **(Lote D) El estado vacío usa título «Sin reservas» y la frase de la spec como descripción** («No hay reservas para los filtros elegidos.»), porque `EmptyState` exige los dos textos.
17. **(Lote D) El refactor 5.10 extrajo más de lo previsto.** 5.10 prevé el selector de estado; además hizo falta partir el resto (84 líneas contra el máximo de 50): `pages/useListadoReservas.ts` (día, estado, página y consulta) y el componente local `ListadoDelDia` en `ReservasPage.tsx`. `design.md` no los lista; están dentro de `frontend/src/modules/reservas/`. El selector toma sus opciones de `OPCIONES_FILTRO_ESTADO`, en `estadosReserva.ts`.
18. **(Lote D) Pruebas agregadas a lo listado en 5.1 a 5.8:** `NavegadorFecha`: `vaciar el campo no pide ningún día` (el campo de fecha emite `''` al borrarlo y no debe pedir `fecha=`); `ReservasTabla`: `mientras carga no muestra el mensaje de vacío ni las reservas` y la variante visual de cada estado; `ReservasPage`: `con una sola página no muestra la paginación` y `elegir ATENDIDA` además de `TODAS` (el cambio de estado vuelve a la primera página con cualquier opción).
19. **(Lote D) «Nueva reserva» sigue visible con el panel abierto** (la maqueta lo alterna). Pulsarlo con el alta abierta no limpia lo escrito; el caso «Nueva reserva después de editar abre el panel vacío» es de 7.5 y se resolverá en la Fase 7.

20. **(Lote E) El router usa la anotación de retorno `-> ReservaSalida`** en las dos rutas nuevas (mismo criterio que los desvíos 2 y 11).
21. **(Lote E) `_confirmar` cambió, aunque 6.5 dice que «se reutiliza».** Con la primera versión de `modificar_reserva` el 409 del índice nombraba el horario viejo: el `rollback` expira la reserva ya persistente y, al leerla de nuevo para armar el mensaje, trae los valores de la base. Se resolvió armando el `ReglaDeNegocioError` antes del `try` (una línea más y un docstring); no hizo falta una variante de `_confirmar` ni de `repository.agregar`, porque `db.add` sobre una reserva persistente no hace nada y `flush` envía el `UPDATE`, que es donde salta el índice. El alta no cambia de comportamiento (las 143 pruebas previas del módulo siguen en verde).
22. **(Lote E) Si el puente no encuentra la mesa de la reserva, la modificación no controla la capacidad** (`_validar_capacidad_de_la_reserva`) en lugar de responder 404: es la lectura de S27 («no consulta si la mesa o el cliente existen») y la fija `test_modificar_reserva_no_consulta_mesa_ni_cliente`.
23. **(Lote E) Dos pruebas del router de 6.4 se fusionaron:** `test_put_reserva_falta_un_campo_devuelve_422` y `test_put_reserva_con_mesa_cliente_o_estado_devuelve_422` son una sola función parametrizada, `test_put_reserva_con_cuerpo_invalido_devuelve_422` (cuatro casos: sin `hora`, con `mesa_id`, con `cliente_id` y con `estado`), porque comparten el arreglo y las aserciones (el `detalle` nombra el campo y la reserva no cambia).
24. **(Lote E) `test_modificar_reserva_permite_turno_de_reserva_no_activa` usa solo `CANCELADA_ANTICIPADA`**, que es el escenario de la spec; los tres estados no activos ya se triangulan en el alta con la misma consulta.
25. **(Lote E) Aserción agregada en el apoyo de las pruebas:** `_guardada` comprueba `assert not db.dirty` antes de leer la base. Con `autoflush=False` y `expire_all()` la asignación temprana de los campos no se notaba, y esa aserción es lo que detecta el mutante «modifica antes de validar» (decisión de `modificar_seccion` de M1). Se comprobó el contrafactual: sin la aserción el mismo mutante sobrevive (`194 passed`); con ella fallan 4 pruebas.

26. **(Lote F) `validarReserva` ya tiene el modo `'edicion'` con efecto propio** (resuelve el desvío 5 y la observación no bloqueante de la revisión del tramo anterior): en edición no se validan Cliente ni Mesa, y la prueba `no valida Cliente ni Mesa, aunque estén vacíos o mal escritos` falla si `modo` se ignora (mutación comprobada).
27. **(Lote F) `ReservasTabla` recibe `onModificar` como prop obligatoria** y siempre tiene la columna `Acciones` (encabezado accesible oculto, como la maqueta). Con eso se resuelve el desvío 14. La prueba de los encabezados existente se modificó para incluir `Acciones`; el resto de las pruebas de la tabla pasan un manejador vacío mediante un `mostrar` local.
28. **(Lote F) La acción es un botón de ícono (lápiz) con `aria-label="Modificar reserva"`** igual en cada fila activa, como la maqueta y como fija la spec; el nombre accesible no distingue la fila (hora o cliente). Queda como posible mejora de accesibilidad si el equipo la pide.
29. **(Lote F) `PanelDeReserva` usa `key={reserva?.id ?? 'alta'}` en el formulario.** Sin la clave, «Nueva reserva» después de editar conservaría los datos de la fila (el estado del hook sobrevive mientras el componente sigue montado) y pulsar «Modificar reserva» en otra fila con el panel abierto mostraría los datos de la anterior; dos pruebas de la página lo fijan (mutación comprobada). «Nueva reserva» con el alta ya abierta sigue sin limpiar lo escrito (desvío 19).
30. **(Lote F) Pruebas agregadas a lo listado en 7.1 a 7.5:** cambiar de fila con el panel abierto, la respuesta sin detalle en edición («No se pudo modificar la reserva»), Cliente y Mesa deshabilitados en una prueba aparte de la del título, y `crearReserva` sin llamarse al modificar. «No se pide `GET /reservas/1`» está garantizado por construcción (`api.ts` no tiene una función para esa ruta) y por la prueba de la página, que comprueba una sola llamada a `listarReservas` y ninguna de alta ni de modificación al abrir el panel.
31. **(Lote F) El 404 de 7.3 usa «La reserva 12 no existe»** en lugar de «La reserva 999 no existe», para que el texto simulado sea coherente con el id de la fila abierta (12); el comportamiento probado es el mismo (error general, datos conservados, panel abierto).
32. **(Lote F) El `modo` que el hook pasa a `validarReserva` es un mutante equivalente a nivel de formulario:** en edición Cliente y Mesa llegan precargados con los números de una fila ya guardada, así que la validación del alta nunca los rechazaría. El efecto del modo lo prueba la unidad `validarReserva`, no el formulario (se comprobó que cambiar el hook a `'alta'` deja las 96 pruebas en verde).

## Problemas encontrados

- **Tamaño por encima del pronóstico.** Commit 1: 323 líneas (321 agregadas, 2 eliminadas; pronóstico 190). Commit 2: 1.038 líneas (1.036 y 2; pronóstico 440), de las cuales ≈ 200 son código de producción y ≈ 835 son pruebas. Backend acumulado ≈ 1.361 líneas contra el pronóstico de ≈ 905 y el punto de control de 800. No se recortó nada: las pruebas son parametrizadas, cubren un caso por escenario de la spec y los límites que exige Strict TDD (triangulación), y `ruff format` expande las listas parametrizadas en vertical. El PR ya lleva `size:exception`.
- **Tamaño del lote B.** Commit 3 `af07415`: 273 líneas (261 agregadas, 12 eliminadas; pronóstico 185). Commit 4 `f65027f`: 383 líneas (382 y 1; pronóstico 220), de las cuales ≈ 150 son código de producción y 231 son pruebas. Frontend acumulado: 656 líneas contra el pronóstico de ≈ 405 para estas dos unidades; ninguno de los dos commits pasa de las ≈ 400 de la heurística. No se recortó nada: las pruebas siguen un caso por escenario de la spec y los límites que exige Strict TDD.
- **Tamaño del lote C.** Commit 5 `e2103d4`: 367 líneas (358 agregadas, 9 eliminadas; pronóstico 115), de las cuales ≈ 55 son código de producción y ≈ 312 son pruebas (schemas 48, service 161, router 104). Backend acumulado: ≈ 1.728 líneas contra el pronóstico de ≈ 745 para las unidades 1, 2 y 5 (≈ 905 con la unidad 8). Se superó otra vez el pronóstico de pruebas: 4.1 a 4.3 enumeran 22 funciones de prueba (con parametrización, 34 casos), un caso por escenario de la spec, y `ruff format` expande en vertical las listas parametrizadas. No se recortó nada y no se agregaron casos equivalentes; el PR ya lleva `size:exception`.
- **El `Reserva.id` del orden es un mutante equivalente en SQLite.** Quitarlo del `order_by` no rompe ninguna prueba porque SQLite resuelve los empates por rowid (que es el id) al recorrer `ix_reservas_fecha_hora`; el plan de consulta lo confirma (`SCAN reservas USING INDEX ix`, también con filtros de `fecha` y `estado`). Se conserva porque la spec (S8, CA 3) exige un orden determinado; la prueba del empate documenta el escenario y fija el resultado esperado, pero no puede detectar esa regresión con este motor.
- **`formatearFecha` de `shared/` no se usó** (S11): `fechas.ts` arma `YYYY-MM-DD` con los métodos locales de `Date`. La corrección de la función compartida sigue pendiente de avisar al equipo en el PR.
- Las herramientas `bat`, `fd`, `eza` y `sd` no están instaladas en el host; se leyó con la herramienta de lectura y se editó con scripts de Python. No se instaló nada.

- **Tamaño del lote D.** Commit 6 `af90732`: 350 líneas (346 agregadas, 4 eliminadas; pronóstico 300 para la unidad), de las cuales ≈ 160 son código de producción y ≈ 190 son pruebas. Commit 7 `0d02c8e`: 409 líneas (396 y 13; pronóstico 150), de las cuales ≈ 170 son código de producción (la página, el hook y el selector) y 241 son pruebas (`ReservasPage.test.tsx`: 13 casos, un escenario de la spec por prueba y los saltos a la primera página con sus mutaciones). Frontend acumulado: 1.415 líneas (656 + 350 + 409) contra el pronóstico de ≈ 1.040 para las 5 unidades de frontend (la Fase 7 todavía no se hizo) y el punto de control de 800. No se recortó nada y no se agregaron casos equivalentes; el PR ya lleva `size:exception`.
- **`useApi` no marca «cargando» al cambiar de día, de estado o de página** (solo lo hace `recargar`): la tabla conserva las filas anteriores hasta que llega la respuesta nueva. Es el comportamiento del hook compartido (`shared/`, de solo lectura) y el mismo que tienen las demás tablas paginadas del repositorio (`SeccionesTab`); se anota por si el equipo quiere un indicador de carga entre consultas.
- **Un alta de otro día no aparece en la tabla.** Al guardar, el panel se cierra y la tabla recarga el día que se está viendo; si la reserva nueva es de otra fecha o de otro estado, no se ve hasta navegar a ella. La spec no pide saltar al día de la reserva nueva.

- **Tamaño del lote E.** Commit 8 `61acb81`: 601 líneas (588 agregadas, 13 eliminadas; pronóstico 160), de las cuales ≈ 96 son código de producción y ≈ 505 son pruebas (router 165, schemas 58, service 282). Backend acumulado: ≈ 2.329 líneas contra el pronóstico de ≈ 905 y el punto de control de 800. Acumulado de las 8 unidades: ≈ 3.744 líneas (backend ≈ 2.329, frontend ≈ 1.415). 6.1 a 6.4 enumeran 39 funciones de prueba (38 tras fusionar dos del router, desvío 23), que con la parametrización son 51 casos: un escenario de la spec por prueba y los límites que exige Strict TDD, y `ruff format` expande en vertical las listas parametrizadas. No se recortó nada y no se agregaron casos equivalentes; el PR ya lleva `size:exception`.
- **Observación del tramo anterior sobre el desempate por `id` del listado:** la prueba con ids explícitos en orden inverso ya existe desde el lote C (`test_listar_reservas_empate_de_fecha_y_hora_ordena_por_id`, ids 5 y 4 insertados en ese orden) y sigue sin detectar la regresión en SQLite (mutante equivalente confirmado en el lote C: el motor recorre `ix_reservas_fecha_hora` y devuelve los empates por rowid). No se agregó nada.
- **El `rollback` recarga las reservas persistentes con los valores de la base.** Hallazgo del lote E (ver el desvío 21): cualquier mensaje de error que se arme después de un `rollback` con datos de una entidad ya guardada nombra los valores viejos. Aplica a futuras modificaciones del módulo (por ejemplo la cancelación de HU-M5-04 y HU-M5-05).
- **La modificación solo se puede aplicar mientras `fecha` y `hora` son futuras** (consecuencia aceptada de la Decisión 6 y S7): una reserva `ACTIVA` cuyo turno ya pasó se modifica únicamente con una fecha y una hora válidas hoy.

- **Tamaño del lote F.** Commit 9 `f1a210f`: 549 líneas (482 agregadas, 67 eliminadas; pronóstico 185), de las cuales 237 son código de producción (hook 54, tabla 34, validación 53, página 45, panel 41, API 10) y 312 son pruebas (formulario 124, página 92, tabla 47, validación 27, API 22). Frontend acumulado: 1.964 líneas (656 + 350 + 409 + 549) contra el pronóstico de ≈ 1.040 y el punto de control de 800. Acumulado de las 9 unidades: ≈ 4.293 líneas (backend ≈ 2.329, frontend ≈ 1.964). Se mantuvo la columna de acciones fuera de `COLUMNAS` para no reindentar la tabla (diff de 34 líneas en lugar de 71); no se recortó nada y no se agregaron casos equivalentes; el PR ya lleva `size:exception`.
- **Editar una reserva `ACTIVA` cuyo turno ya pasó** abre el panel con la fecha y la hora pasadas, y el formulario exige una fecha y una hora válidas antes de enviar (misma regla local del alta, Decisión 6 y S7, igual que el backend). No es un defecto; se anota porque la persona verá el aviso al guardar sin cambiarlas.
- **Los humos manuales de 5.11 y 7.8 siguen pendientes** y conviene hacerlos juntos: con el backend real y `npm run dev`, crear una reserva, verla en la tabla, pulsar el lápiz de «Modificar reserva», cambiar la cantidad y ver el cambio. Además de lo ya pedido para la maqueta, mirar el alineado a la derecha de la columna de acciones y el ícono de lápiz (se armaron sin verlos en un navegador).

## Pendiente

- **Humo manual de 5.11 (para la persona):** con el backend de la Fase 4 y `npm run dev` (comandos en `FLUJO_DIARIO.md`), abrir `/reservas`, crear una reserva en el panel y verla en la tabla del día; anotar el resultado y, de paso, las diferencias visibles con la maqueta (el layout de dos columnas del panel, el ancho `lg:w-96` y los botones de día con solo ícono se armaron sin verlos en un navegador).
- **Humo manual de 7.8 (para la persona):** con el backend de la Fase 6 y `npm run dev`, pulsar «Modificar reserva» en una fila activa, cambiar la cantidad y ver el cambio en la tabla; anotar el resultado (y, de paso, el alineado de la columna de acciones, que se armó sin verlo en un navegador).
- Fase 8 de `tasks.md` (cierre y verificación global) y las tareas «Antes del PR» (P.1 a P.8). La Fase 7 está hecha en el código (commit 9 `f1a210f`).
- Los artefactos de SDD (`openspec/changes/HU-M5-01-02-03/`) siguen sin versionar: van en el commit 10 del plan.
- Antes del PR: `git pull origin develop` y revisar que `alembic heads` siga mostrando una sola cabeza (si `develop` trae otra revisión sobre `b2d4f6a8c0e1`, hay que rebasar `down_revision` y el ancla de la prueba de migración de M5).

## Workload / PR Boundary

- Modo: `single-pr` con `size:exception`.
- Unidades actuales: 1 (tabla y modelo), 2 (alta del backend), 3 (capa de datos y validación del frontend), 4 (panel de alta), 5 (listado paginado del backend), 6 (tabla de reservas y navegador de fecha), 7 (`ReservasPage` con el panel de alta montado), 8 (consulta y modificación del backend) y 9 (modo edición del panel y acción «Modificar reserva»).
- Límite: el lote A parte de `develop` (`0bff1e0`) y termina en `55be2c6`; el lote B parte de `65d7948` y termina en `f65027f`, solo en `frontend/src/modules/reservas/`; el lote C parte de `f65027f` y termina en `e2103d4`, solo en `backend/app/modules/reservas/` y `backend/tests/modules/reservas/`.
- Impacto en el presupuesto de revisión: ≈ 1.361 líneas de backend acumuladas (el pronóstico decía ≈ 905) y 656 de frontend (pronóstico de estas dos unidades: ≈ 405; total de frontend previsto ≈ 1.040). Lote C: 367 líneas (pronóstico 115). Acumulado de las 5 unidades: ≈ 2.384 líneas (backend ≈ 1.728, frontend 656).
- Lote D: parte de `e2103d4` y termina en `0d02c8e`, solo en `frontend/src/modules/reservas/`. Commit 6 `af90732`: 350 líneas (pronóstico 300). Commit 7 `0d02c8e`: 409 líneas (pronóstico 150). Acumulado de las 7 unidades: ≈ 3.143 líneas (backend ≈ 1.728, frontend ≈ 1.415). `size:exception` ya anotado.
- Lote E: parte de `0d02c8e` y termina en `61acb81`, solo en `backend/app/modules/reservas/` y `backend/tests/modules/reservas/`. Commit 8 `61acb81`: 601 líneas (pronóstico 160). Acumulado de las 8 unidades: ≈ 3.744 líneas (backend ≈ 2.329, frontend ≈ 1.415). `size:exception` ya anotado.
- Lote F: parte de `61acb81` y termina en `f1a210f`, solo en `frontend/src/modules/reservas/`. Commit 9 `f1a210f`: 549 líneas (pronóstico 185). Acumulado de las 9 unidades: ≈ 4.293 líneas (backend ≈ 2.329, frontend ≈ 1.964). `size:exception` ya anotado. Quedan la Fase 8 (cierre, commit 10 con estos artefactos) y las tareas «Antes del PR».

## Cierre (Fase 8, orquestador)

Evidencia observada al cierre, con HEAD `f1a210f` sobre `develop` local (`0bff1e0`). Backend en Docker (`g3-backend-test`, sin red).

| Tarea | Resultado observado |
| --- | --- |
| 8.1 CI de ambos lados | Backend: `ruff check .` y `ruff format --check .` limpios, `lint-imports` 10 contratos cumplidos, `pytest` 775 pruebas pasando con cobertura 99,62 %. Frontend: `lint`, `format:check`, `typecheck` y `build` limpios, `test:coverage` 47 archivos y 527 pruebas pasando; pruebas de fechas del módulo (96) pasan con `TZ=America/Argentina/Buenos_Aires` y con `TZ=UTC` |
| 8.2 Migración | `alembic heads`: un solo head `d6f8a0c2e4b6`. Sobre una base temporal: subir a `d6f8a0c2e4b6`, bajar a `b2d4f6a8c0e1`, volver a subir y `alembic check` («No new upgrade operations detected») |
| 8.3 Aislamiento | `git diff --name-only develop...HEAD` fuera de M5 y de `openspec/`: solo `backend/app/main.py` (registro del router) y las 2 líneas de `backend/tests/modules/salon/test_migracion.py` |
| 8.4 Humo de punta a punta | **Pendiente de la persona** (necesita navegador), junto con 5.11 y 7.8 |
| 8.5 Trazabilidad | `verify-report.md`: 31 de 31 requisitos de la spec COMPLIANT, con prueba y código citados; veredicto PASS WITH WARNINGS, 0 críticos |
| 8.6 Líneas reales | Backend 17 archivos, 2.281 inserciones y 4 eliminaciones (≈ 2.285 líneas); frontend 20 archivos, 1.796 y 26 (≈ 1.822); documentos de SDD 2.026 líneas aparte. Pronóstico: backend ≈ 905 y frontend ≈ 1.040 contra el punto de control de 800 por lado. El PR necesita `size:exception` |
| 8.7 Commit 10 | Documentos de SDD con el informe de verificación |

Revisiones nativas (Gentle AI, lente de confiabilidad) de los tramos de código, todas aprobadas y con la autoridad cerrada: frontend del alta (`af07415` y `f65027f`), listado (`e2103d4`, `af90732` y `0d02c8e`), `PUT` y `GET` por id (`61acb81`) y modificación del frontend (`f1a210f`). Los commits `3d4d57a` y `55be2c6` (tabla, migración y alta del backend) no pudieron revisarse: el candidato excedió el presupuesto del revisor y no se creó autoridad.

## Ajuste posterior: se quita la validación de capacidad (issue #61)

- **Motivo:** el issue #61 (HU-M5-01, fuente de verdad según AGENTS.md §2) dice: «Cantidad de personas (obligatoria): número entero mayor a cero. El sistema no la valida contra la capacidad de la mesa (se resuelve en forma presencial)». La implementación anterior contradecía esa regla: `service.py` tenía `_validar_capacidad` y `_validar_capacidad_de_la_reserva` (alta y modificación), y `puente.MesaReservable` llevaba un campo `capacidad` (el stub devolvía `None`, así que el control estaba dormido, pero un puente real habría empezado a responder 422). Decisión aprobada por la persona: quitar la validación por completo, incluido el campo del puente.
- **Modo:** Strict TDD (`strict_tdd: true` en `openspec/config.yaml`). Comandos en Docker (`g3-backend-test`, sin red, `backend/` montado en `/app`).
- **Este ajuste no cambia los totales de la spec:** siguen siendo 31 requisitos. El requisito «Capacidad de la mesa (HU-M5-01 CA 8, S5)» conservó su lugar y su numeración, y pasó a enunciar la regla nueva. Los escenarios pasaron de 129 a 126 (se quitaron 6 de capacidad y se agregaron 3: cantidad muy grande en el alta, cantidad cero sigue rechazada y cantidad muy grande en la modificación). El supuesto S5 conserva su número.

### Evidencia RED → GREEN → REFACTOR

| Paso | Comando | Resultado observado |
| --- | --- | --- |
| RED | `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas` con las pruebas ya editadas y el código de producción sin tocar | **3 fallos, 188 pasan.** Los 3 fallos son `TypeError: MesaReservable.__init__() missing 1 required positional argument: 'capacidad'`: `test_obtener_mesa_stub_devuelve_la_mesa_con_su_id`, `test_crear_reserva_conflicto_no_depende_del_puente` y `test_crear_reserva_orden_de_validacion` |
| GREEN | el mismo comando, tras quitar la validación y el campo del puente | **191 pasan**, 1 advertencia (`httpx` en `starlette.testclient`, ya existente) |
| REFACTOR | `_obtener_mesa` pasó a `_validar_mesa(db, mesa_id) -> None`, simétrica con `_validar_cliente` | Sin la validación de capacidad, `mesa` quedaba como variable sin uso en `crear_reserva`; el cambio evita eso sin tocar el comportamiento. Una pasada de `ruff format --check` detectó un salto de línea de más en `test_service.py` (`1 file would be reformatted`) y se corrigió a mano |

Observación honesta sobre el RED: las 4 pruebas nuevas de «100 personas» (`test_crear_reserva_acepta_una_cantidad_muy_grande_de_personas`, `test_modificar_reserva_acepta_una_cantidad_muy_grande_de_personas`, `test_post_reservas_cantidad_muy_grande_devuelve_201` y `test_put_reserva_cantidad_muy_grande_devuelve_200`) **ya pasaban en el RED**, porque el stub nunca informaba la capacidad y el control estaba dormido. Quedan como pruebas de límite que fijan la regla del issue #61 y como red de seguridad ante una reactivación; el RED real del ajuste fue el contrato del puente (`MesaReservable(id=5)` sin `capacidad`).

### Verificación final (ejecutada sola, sin otras corridas de Docker en paralelo)

| Comando | Resultado observado |
| --- | --- |
| `sh -c 'ruff check . && ruff format --check . && lint-imports && pytest -q -p no:cacheprovider'` (desde `backend/`) | Salida 0. `ruff check`: «All checks passed!». `ruff format --check`: «99 files already formatted». `lint-imports`: «Contracts: 10 kept, 0 broken.». `pytest`: **958 pasan**, 1 advertencia; cobertura 99,47 % (umbral 70 %) |

La línea base antes de este ajuste era de 961 pruebas y 99,47 %. La diferencia de −3 sale de quitar 7 casos (3 de capacidad del alta en `test_service.py`, el caso `capacidad-excedida` de la prueba parametrizada de datos inválidos, 2 de capacidad de la modificación y 1 de `test_router.py`) y agregar 4.

### Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/reservas/service.py` | Se borraron `_validar_capacidad` y `_validar_capacidad_de_la_reserva` y sus llamadas en el alta y en la modificación; `_obtener_mesa` pasó a `_validar_mesa`. El resto (fecha y hora no pasadas, mesa existente, R13 con la verificación previa y `IntegrityError` → 409) no cambió |
| `backend/app/modules/reservas/puente.py` | `MesaReservable` lleva solo `id`; `obtener_mesa` devuelve `MesaReservable(id=mesa_id)` para ids positivos y `None` en los demás casos; se corrigieron el docstring del módulo y los de las funciones |
| `backend/tests/modules/reservas/conftest.py` | Se quitaron la fixture `puente_con_capacidad` y el alias `ConfigurarCapacidad` |
| `backend/tests/modules/reservas/test_puente.py` | `MesaReservable(id=5)`; la prueba pasó a llamarse `test_obtener_mesa_stub_devuelve_la_mesa_con_su_id` |
| `backend/tests/modules/reservas/test_service.py` | Se quitaron las pruebas y los casos de capacidad (alta y modificación); `test_crear_reserva_orden_de_validacion` y `test_modificar_reserva_orden_de_validacion` sin el paso de capacidad; pruebas nuevas con 100 personas en el alta y en la modificación |
| `backend/tests/modules/reservas/test_router.py` | Se quitó la prueba del 422 por capacidad; pruebas nuevas `test_post_reservas_cantidad_muy_grande_devuelve_201` y `test_put_reserva_cantidad_muy_grande_devuelve_200` |
| `openspec/changes/HU-M5-01-02-03/{proposal,design,tasks}.md` y `specs/reservas-gestion/spec.md` | Reescritos los enunciados que exigían o planificaban el control de capacidad; S5 resuelto por el issue #61; nueva Fase 9 en `tasks.md` y filas de trazabilidad actualizadas |
| `openspec/changes/HU-M5-01-02-03/verify-report.md` | Una nota fechada al comienzo; el cuerpo del informe no se reescribió |

No se tocó `exploration.md` (registro histórico), ni `frontend/` (no tenía ningún control de capacidad), ni migraciones, ni otro módulo ni `shared/`.

### Menciones que quedan de «capacidad»

- Código y pruebas de `reservas/`: solo comentarios y docstrings que dicen que la cantidad **no** se valida contra la capacidad (`puente.py:6`, `test_router.py`, `test_puente.py`, `test_service.py`).
- Artefactos del cambio: el requisito y los escenarios nuevos de la spec, el supuesto S5 (propuesta y spec), el contrato del puente y S20, y el nombre del requisito en la trazabilidad; en `design.md`, la Decisión 2 y una fila de la tabla de diferencias con la maqueta (la maqueta muestra la mesa con sector y capacidad: es una descripción de la maqueta, no una regla); en `proposal.md`, el título de sección «Capacidades» (término de SDD, no la capacidad de la mesa). Los textos históricos de este archivo, de `verify-report.md` (cuerpo) y de `exploration.md` describen lo que se hizo y verificó antes del issue #61, y se conservan como registro.

## Fase 10 · Unidad A (puente real de Mesa)

- **Alcance:** tareas 10.1 a 10.7 de la Unidad A (commit 11, Decisiones 14 y 17 del diseño). La tarea 10.8 (el commit) queda para el orquestador, que es el dueño de git: este lote no usó git para escribir nada.
- **Modo:** Strict TDD (`strict_tdd: true` en `openspec/config.yaml`). Comandos en Docker (`g3-backend-test`, sin red, `backend/` montado en `/app`).
- **Línea base:** `pytest` 1184 pruebas pasando, cobertura 99,44 %, un solo head `d6f8a0c2e4b6` y `lint-imports` con 10 contratos cumplidos (informada por el orquestador). El módulo `reservas` tenía 191 pruebas al empezar (comprobado con `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas`: «191 passed»).
- **Estado:** 7 de 7 tareas del lote completas (10.1 a 10.7). Quedan 10.8 (commit) y las unidades B y C.

### Tareas completadas

| Tarea | Estado | Resultado observado |
| --- | --- | --- |
| 10.1 Soporte de pruebas y Rojo | Hecha | `conftest.py` reescrito (`DoblePuente`, `puente_doble` autouse, `puente_sin_mesa`, `puente_sin_cliente`, `puente_real`, `mesas_en_m3`). Rojo observado: toda la suite de `reservas` falla al cargar el `conftest.py` |
| 10.2 Verde (contrato) | Hecha | `puente.py` con `SectorDeMesa`, `MesaReservable` completo y `listar_mesas` y `obtener_mesa` con `NotImplementedError`. La suite vuelve a ejecutarse con el doble |
| 10.3 Rojo (`test_puente.py`) | Hecha | Casi reescritura: 14 casos, 8 rojos por `NotImplementedError` y 6 de guarda |
| 10.4 Rojo (pruebas existentes) | Hecha | `test_service.py` y `test_router.py` adaptados según la tabla del diseño; 2 pruebas nuevas del `router` con `puente_real` |
| 10.5 Verde (cuerpo real) | Hecha | `puente.py` lee todas las páginas de `salon.service.listar_mesas`; 202 pruebas de `reservas` pasan |
| 10.6 Refactor | Hecha | Revisión de `puente.py` y `conftest.py`; `ruff format` ajustó 3 firmas de `test_puente.py` |
| 10.7 Verificación | Hecha | Comando enfocado y `V-BACK` completo en verde (ver «Verificación final») |
| 10.8 Commit 11 | **Pendiente (orquestador)** | No es parte de este lote |

### TDD Cycle Evidence

| Tarea | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 10.1 a 10.2 | `conftest.py` nuevo: `ImportError: cannot import name 'SectorDeMesa' from 'app.modules.reservas.puente'` (toda la suite no carga) | Contrato en `puente.py`: la suite carga; 4 fallos, 187 pasan | n/a |
| 10.3 | `test_puente.py` nuevo: 8 fallos, 6 pasan | (con 10.5) | n/a |
| 10.4 | pruebas existentes adaptadas y 2 nuevas del `router`: 10 fallos (8 del puente y 2 del `router`), 192 pasan | (con 10.5) | n/a |
| 10.5 | (los 10 fallos de arriba) | cuerpo real de `puente.py`: **202 pasan**, 0 fallos | n/a |
| 10.6 | n/a | 202 pasan antes y después | `ruff format` en `test_puente.py` (3 firmas en una línea); revisión de nombres, docstrings y complejidad |

### Evidencia RED y GREEN por paso

Comando enfocado de todos los pasos: `docker run --rm --network none --user "$(id -u):$(id -g)" -e HOME=/tmp -v …/backend:/app -w /app g3-backend-test pytest --no-cov -q -p no:cacheprovider tests/modules/reservas`.

- **10.1 (Rojo, por importación):** `ImportError while loading conftest '/app/tests/modules/reservas/conftest.py'` → `ImportError: cannot import name 'SectorDeMesa' from 'app.modules.reservas.puente'`. Es el motivo correcto: el contrato nuevo del puente todavía no existe.
- **10.2 (contrato):** `4 failed, 187 passed`. Fallan `test_obtener_mesa_stub_devuelve_la_mesa_con_su_id` (el doble devuelve la mesa completa, no `MesaReservable(id=5)`), `test_crear_reserva_conflicto_no_depende_del_puente` y `test_crear_reserva_orden_de_validacion` (`TypeError: MesaReservable.__init__() missing 4 required positional arguments`), **y además** `test_crear_reserva_acepta_cualquier_id_positivo_con_el_stub` (la mesa 123 ya no existe para el doble: 404). Las tareas listaban solo las tres primeras; la cuarta es la que 10.4 divide, así que no es un hallazgo nuevo.
- **10.3 (Rojo):** `8 failed, 6 passed` en `test_puente.py`. Los 6 fallos de lectura real son `NotImplementedError` (`test_listar_mesas_lee_todas_las_paginas_de_m3`, `test_obtener_mesa_encuentra_la_mesa_de_la_segunda_pagina`, `test_obtener_mesa_inexistente_devuelve_none`, `test_listar_mesas_incluye_fuera_de_servicio_con_su_estado`, `test_obtener_mesa_y_listar_mesas_coinciden` y `test_listar_mesas_termina_si_m3_devuelve_una_pagina_vacia_antes_del_total`). Las dos de propagación fallan por el `match`: `NotImplementedError` es subclase de `RuntimeError`, así que el tipo coincide pero el mensaje no («Regex pattern did not match. Expected 'falla simulada de M3', actual ''»); sin `match` habrían pasado por error.
  - **Pruebas de guarda (ya pasan en el Rojo, como anticipa la tarea):** `test_solo_el_puente_importa_salon` (hoy nadie importa `salon`), `test_doble_puente_informa_el_mismo_estado_en_obtener_mesa_y_listar_mesas` (el doble ya es coherente) y las 4 del stub de cliente (el stub ya existía). Se vuelven exigentes con 10.5; la mutación de abajo comprueba que la de arquitectura falla de verdad.
- **10.4 (Rojo):** `10 failed, 192 passed`. Los 8 de `test_puente.py` y las 2 nuevas del `router` (`test_puente_real_alta_en_una_mesa_de_m3_devuelve_201` y `test_puente_real_mesa_inexistente_devuelve_404`), todas por `NotImplementedError`. **Guardas (ya pasan con el doble):** `test_crear_reserva_rechaza_mesa_que_m3_no_conoce` (mesa 123: 404), `test_crear_reserva_acepta_cualquier_cliente_positivo_con_el_stub` (mesa 5 y cliente 456: 201), `test_crear_reserva_conflicto_no_depende_del_puente`, `test_crear_reserva_orden_de_validacion` (sin el paso «fuera de servicio», que llega en 10.9) y `test_modificar_reserva_no_consulta_mesa_ni_cliente` (S27: la modificación ya no consulta al puente).
- **10.5 (Verde):** `202 passed, 1 warning` (la advertencia de `httpx` en `starlette.testclient` ya existía).

### Comprobación de mutaciones del puente (para que las pruebas no sean decorativas)

Se alteró solo `puente.py`, se corrió `test_puente.py` en Docker y se restauró el archivo original (comparado con `diff`: idéntico).

| Mutación | Resultado |
| --- | --- |
| Quitar el corte por página vacía (`if offset >= pagina.total`) | Falla `test_listar_mesas_termina_si_m3_devuelve_una_pagina_vacia_antes_del_total` (por «el ciclo no termina», sin colgarse) |
| Leer solo la primera página (`if True`) | Fallan 5: las dos de 120 mesas, las dos de propagación y la de página vacía |
| Capturar el error de M3 y devolver lo leído (`try/except RuntimeError`) | Fallan las dos de propagación |
| `puente.py` importa `app.modules.salon.schemas` | Falla `test_solo_el_puente_importa_salon` |
| `puente.py` importa `app.modules.atencion.service` | Falla `test_solo_el_puente_importa_salon` |

La validación de `test_solo_el_puente_importa_salon` sobre un archivo que no es `puente.py` (otra mutación que 10.36 planifica) no se hizo aquí: exigiría editar `service.py` u otro archivo fuera de las superficies permitidas de este lote.

### Verificación final (ejecutada sola, sin otras corridas de Docker en paralelo)

| Comando | Resultado observado |
| --- | --- |
| `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas` | **202 pasan**, 1 advertencia (191 al empezar) |
| `sh -c 'ruff check . && ruff format --check . && lint-imports && alembic heads && pytest -q -p no:cacheprovider'` (desde `backend/`) | Salida 0. `ruff check`: «All checks passed!». `ruff format --check`: «108 files already formatted». `lint-imports`: «Contracts: 10 kept, 0 broken.». `alembic heads`: `d6f8a0c2e4b6 (head)`, un solo head. `pytest`: **1195 pasan**, 1 advertencia, 2 min 26 s; cobertura 99,39 % (umbral 70 %), `puente.py` 100 % (45 sentencias) y `service.py` 100 % |

**Diferencia de conteo:** 1195 − 1184 = +11, igual que en `reservas` (202 − 191). `test_puente.py` pasa de 6 casos a 14 (+8: se quitan los 3 casos del stub de mesa y se agregan 11, entre ellos el cliente 456), `test_service.py` suma 1 (la mesa 123 y el cliente 456 pasan de una prueba a dos) y `test_router.py` suma 2: 8 + 1 + 2 = +11.

**Cobertura:** 99,39 % contra 99,44 % de la línea base. Las 11 sentencias sin cubrir están todas fuera de `reservas` y de los archivos que se tocaron: `app/database.py` 44 y 55-56, `app/modules/menus/service.py` 200-203, `app/modules/productos/service.py` 363 y `app/modules/salon/service.py` 132-134. La línea base no listaba esas líneas, así que no puedo afirmar cuál era la diferencia; la sospecha es `database.py:44` (la advertencia de «transacción lenta» depende del tiempo de la máquina). No se verificó contra una corrida de la línea base, porque este lote no usa git para volver atrás.

### Work Unit Evidence

| Evidence | Valor |
| --- | --- |
| Comando enfocado y resultado | `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas` (Docker): 202 pasan, 0 fallos |
| Runtime harness | Las pruebas del `router` con `TestClient`, el `puente_real` y una base SQLite migrada con mesas creadas con los modelos de M3 recorren el camino real `POST /reservas` → `service` → `puente` → `salon.service.listar_mesas` → base. `V-BACK` completo en verde |
| Rollback boundary | Revertir el commit 11 (`puente.py`, `conftest.py`, `test_puente.py`, `test_service.py` y `test_router.py`); vuelven el stub de mesa y las pruebas anteriores. Sin `alembic downgrade` y sin cambios en M3 |

### Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/reservas/puente.py` | `SectorDeMesa`, `MesaReservable` completo, `listar_mesas` y `obtener_mesa` reales sobre `_leer_todas` (todas las páginas de `salon.service.listar_mesas`, sin `try`), `_a_mesa_reservable` y dos `Protocol` privados; `existe_cliente` sigue siendo el stub; docstring nuevo |
| `backend/tests/modules/reservas/conftest.py` | `DoblePuente`, `puente_doble` (autouse), `puente_sin_mesa`, `puente_sin_cliente`, `puente_real`, `mesas_en_m3` y constantes `*_REAL`; docstring actualizado; ya no importa el puente de forma diferida |
| `backend/tests/modules/reservas/test_puente.py` | Reescrito: puente real (120 mesas, estado, coincidencia, propagación del error de M3, página vacía), doble, stub de cliente y prueba de arquitectura con `ast` |
| `backend/tests/modules/reservas/test_service.py` | División de la prueba de la mesa 123 y el cliente 456; `..._no_depende_del_puente` y `..._orden_de_validacion` sobre el doble; refuerzo de `test_modificar_reserva_no_consulta_mesa_ni_cliente` |
| `backend/tests/modules/reservas/test_router.py` | `test_puente_real_alta_en_una_mesa_de_m3_devuelve_201` y `test_puente_real_mesa_inexistente_devuelve_404` |
| `openspec/changes/HU-M5-01-02-03/tasks.md` | 10.1 a 10.7 marcadas `[x]` (10.8 sigue abierta) |

No se tocó `service.py`, `router.py`, `schemas.py`, `repository.py`, otro módulo, `shared/`, `pyproject.toml`, migraciones ni el frontend.

### Desvíos y decisiones

1. **Cuarto fallo en 10.2.** Ver arriba: la prueba de la mesa 123 también falla en cuanto el doble reemplaza al stub. Es la que 10.4 divide; no cambia el plan.
2. **Stub de cliente probado de verdad.** Las pruebas `test_existe_cliente_stub_*` piden `puente_real` (con el doble autouse probarían el doble, no el stub) y la de ids positivos suma el cliente 456 del escenario «El stub de cliente acepta identificadores positivos». La tarea decía solo «se conservan».
3. **Prueba de página vacía más fuerte que la del diseño.** La envoltura deja pasar la primera página real (2 mesas) y declara `total` 5, de modo que «lo ya leído» no es una lista vacía; además la envoltura falla si se la llama más de 3 veces, para que quitar el corte dé un fallo claro y no un cuelgue (comprobado con la mutación).
4. **`mesas_en_m3` hace un `flush` extra.** El sector necesita su `id` antes de crear las mesas y la sesión de prueba tiene `autoflush=False`; el resto cumple «un `add_all` y un `commit`». Devuelve la lista de `Mesa` y recibe el estado de todas; para mezclar estados las pruebas asignan sobre el modelo (como pide la tarea para `FUERA_DE_SERVICIO`).
5. **Dos `Protocol` privados en `puente.py`** (`_MesaDeM3` y `_SectorDeM3`) para tipar el parámetro `item` de `_a_mesa_reservable`. El diseño lo muestra sin tipo, pero `ANN` (Ruff) lo exige en `app/`. Alternativas descartadas: `Any` (`ANN401`) y `salon_service.MesaSalida` (dependería de que M3 reexporte un nombre que no es de su contrato). Los `Protocol` dicen exactamente qué lee el puente de M3 y no importan nada de `salon`.
6. **La prueba de arquitectura resuelve importaciones relativas** (`from ..salon import service`) con `importlib.util.resolve_name` y recorre los archivos con `rglob`; así no hay una puerta trasera por la que un archivo de `reservas` importe `salon` sin que la prueba lo vea. No se agregó la exigencia positiva «`puente.py` importa el `service` de `salon`» porque la tarea la describe como guarda que pasa en el Rojo; esa exigencia ya la cubren las pruebas del puente real.
7. **`test_modificar_reserva_no_consulta_mesa_ni_cliente`** dejó de usar `puente_sin_mesa` y `puente_sin_cliente`: ahora las tres operaciones del puente fallan con `AssertionError` si se las llama (S27), que es el refuerzo que pide la tarea.
8. **Nombres y comentarios sin tildes en el código** (salvo el literal «Salón»), como el resto de `reservas/`.

### Tamaño de la unidad (honestidad sobre el presupuesto)

Mediciones de solo lectura sobre el árbol de trabajo (`git diff --numstat`, antes del commit): `puente.py` +75 −7, `conftest.py` +95 −10, `test_puente.py` +177 −12, `test_service.py` +31 −13 y `test_router.py` +25 −0. Total backend: **403 inserciones y 42 eliminaciones (≈ 445 líneas escritas)**, por encima de la estimación de 240 a 380 de la unidad y de la heurística orientativa de ≈ 400. Por archivo, `test_puente.py` (≈ 189 contra 90 a 140) y `conftest.py` (≈ 105 contra 50 a 80) superan el rango; el puente (≈ 82 contra 50 a 70) también, por los dos `Protocol` y los docstrings. No se recortó nada para entrar en el límite (la unidad ya cuenta con `size:exception`).

### Pendiente

- 10.8: commit 11 (`feat: lee las mesas de M3 en el puente de reservas (HU-M5-01)`), a cargo del orquestador.
- Unidades B (commit 12) y C (commit 13), y el cierre (14).

## Fase 10 · Unidad B (mesas disponibles y mesa fuera de servicio)

- **Alcance:** tareas 10.9 a 10.19 de la Unidad B (commit 12, Decisiones 13, 15 y 16 del diseño). La tarea 10.20 (el commit) queda para el orquestador, que es el dueño de git: este lote no usó git para nada (las mediciones de tamaño se hicieron con `diff` contra copias del árbol de trabajo hechas al empezar).
- **Modo:** Strict TDD (`strict_tdd: true` en `openspec/config.yaml`). Comandos en Docker (`g3-backend-test`, sin red, `backend/` montado en `/app`).
- **Línea base:** `pytest` 1195 pruebas pasando, cobertura 99,39 %, un solo head `d6f8a0c2e4b6`, `lint-imports` con 10 contratos cumplidos (informada por el orquestador y confirmada al empezar: el módulo `reservas` tenía 202 pruebas, «202 passed»).
- **Estado:** 11 de 11 tareas del lote completas (10.9 a 10.19). Queda 10.20 (commit) y la unidad C.

### Tareas completadas

| Tarea | Estado | Resultado observado |
| --- | --- | --- |
| 10.9 Rojo (alta con mesa fuera de servicio) | Hecha | 8 pruebas (7 nuevas y la de orden de validación, modificada): 4 fallan por el motivo correcto y 4 son guardas (ver abajo) |
| 10.10 Verde (`_validar_mesa`) | Hecha | `service.py` lee la mesa una vez y rechaza `FUERA_DE_SERVICIO` con 409; 209 pasan |
| 10.11 Rojo (`test_schemas.py`) | Hecha | `ImportError: cannot import name 'ConsultaMesasDisponibles'` al cargar el archivo (clases ausentes) |
| 10.12 Verde (`schemas.py`) | Hecha | `_hora_en_minutos`, `ConsultaMesasDisponibles`, `SectorResumenMesa` y `MesaDisponible`; `test_schemas.py` 70 pasan |
| 10.13 y 10.14 Rojo (`listar_mesas_disponibles`) | Hecha | 22 pruebas nuevas del `service`: todas fallan con `AttributeError: module 'app.modules.reservas.service' has no attribute 'listar_mesas_disponibles'` |
| 10.15 Verde (`repository` y `service`) | Hecha | `ids_de_mesas_con_reserva_activa` y `listar_mesas_disponibles`; 240 pasan en `reservas` |
| 10.16 Rojo (`router`) | Hecha | 16 pruebas nuevas, las 16 fallan: `GET /reservas/mesas-disponibles` lo captura `GET /reservas/{reserva_id}` y responde 422 «reserva_id: Input should be a valid integer» |
| 10.17 Verde (ruta) | Hecha | `GET /reservas/mesas-disponibles` entre `GET /reservas` y `GET /reservas/{reserva_id}`; 256 pasan |
| 10.18 Refactor | Hecha | Revisión de `service.py`, `schemas.py`, `router.py` y `repository.py`; se quitó una constante sin uso de la prueba; 256 pasan antes y después; `ruff` sin hallazgos |
| 10.19 Verificación | Hecha | Comando enfocado y `V-BACK` completo en verde (ver «Verificación final») |
| 10.20 Commit 12 | **Pendiente (orquestador)** | No es parte de este lote |

### TDD Cycle Evidence

| Tarea | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 10.9 a 10.10 | `4 failed, 205 passed` (2 pruebas del 409, la de «antes que el cliente y la fecha» y la de orden de validación) | `_validar_mesa` con el 409: **209 pasan** | n/a |
| 10.11 a 10.12 | `ImportError` al cargar `test_schemas.py` (clases ausentes) | `test_schemas.py`: **70 pasan** | n/a |
| 10.13 a 10.15 | `22 failed, 70 passed` en `test_service.py` (`AttributeError`, función ausente) | `repository` + `service`: **240 pasan** en `reservas` | n/a |
| 10.16 a 10.17 | `16 failed, 55 passed` en `test_router.py` (la ruta nueva responde 422 por `reserva_id`) | ruta declarada antes de `/{reserva_id}`: **256 pasan** en `reservas` | n/a |
| 10.18 | n/a | 256 pasan antes y después | constante sin uso quitada de `test_service.py`; revisión de longitud y complejidad (`ruff`: `C901` y `PLR0915` activos, 0 hallazgos) |

### Evidencia RED y GREEN por paso

Comando enfocado de todos los pasos: `docker run --rm --network none --user "$(id -u):$(id -g)" -e HOME=/tmp -v …/backend:/app -w /app g3-backend-test pytest --no-cov -q -p no:cacheprovider tests/modules/reservas`.

- **10.9 (Rojo):** `4 failed, 205 passed`. Fallan por el motivo correcto: `test_crear_reserva_rechaza_mesa_fuera_de_servicio` (`Failed: DID NOT RAISE ReglaDeNegocioError`), `test_post_reservas_mesa_fuera_de_servicio_devuelve_409_con_detalle` (`assert 201 == 409`), `test_crear_reserva_mesa_fuera_de_servicio_se_rechaza_antes_que_cliente_y_fecha` (gana el error del cliente: `NoEncontradoError: El cliente 98 no existe`) y `test_crear_reserva_orden_de_validacion` (el paso nuevo no existe: `NoEncontradoError: El cliente 7 no existe`).
  - **Pruebas de guarda (ya pasan en el Rojo):** `test_crear_reserva_acepta_mesa_ocupada` y `test_post_reservas_mesa_ocupada_devuelve_201` (S30), `test_modificar_reserva_con_mesa_fuera_de_servicio_se_modifica` (S27: la modificación ya no consulta al puente desde la unidad A) y `test_post_reservas_mesa_fuera_de_servicio_con_forma_invalida_devuelve_422` (la forma se valida primero). La tarea anticipaba solo tres fallos («los dos de 409 y el de orden»): la prueba «antes que el cliente y la fecha» también falla en el Rojo, porque con la mesa sin controlar gana el 404 del cliente. Es un fallo genuino, no una guarda.
- **10.10 (Verde):** `209 passed, 1 warning` (la advertencia de `httpx` en `starlette.testclient` ya existía).
- **10.11 (Rojo):** `ImportError: cannot import name 'ConsultaMesasDisponibles' from 'app.modules.reservas.schemas'`, el archivo `test_schemas.py` no carga. Es el motivo correcto: las clases no existen.
- **10.12 (Verde):** `70 passed` en `test_schemas.py`, con las pruebas de segundos de `ReservaCrear` y `ReservaModificar` en verde (regresión de mover el validador).
- **10.13 y 10.14 (Rojo):** `22 failed, 70 passed` en `test_service.py`, todos `AttributeError: module 'app.modules.reservas.service' has no attribute 'listar_mesas_disponibles'`. No hay guardas en este paso.
- **10.15 (Verde):** `240 passed, 1 warning` en `reservas` (202 + 7 de 10.9 + 9 de 10.11 + 22 de 10.13 y 10.14).
- **10.16 (Rojo):** `16 failed, 55 passed` en `test_router.py`. La causa es la prevista: `GET /reservas/mesas-disponibles` lo captura `GET /reservas/{reserva_id}` y responde `422 «Datos invalidos. reserva_id: Input should be a valid integer, unable to parse string as an integer»`. Eso deja observado el problema del orden de rutas; las de 422 de forma fallan porque el `detalle` nombra `reserva_id` y no `fecha` ni `hora`. No hay guardas.
- **10.17 (Verde):** `256 passed, 1 warning` en `reservas`.

### Comprobación de mutaciones (para que las pruebas no sean decorativas)

Se alteró un archivo de producción por vez, se corrió toda la carpeta `tests/modules/reservas` en Docker, se restauró el archivo copiándolo desde la copia de respaldo del árbol final y se comparó con `diff` (idéntico en las 18). **Las 18 mutaciones fueron detectadas; ninguna sobrevivió.** (La suite sana tiene 256 pruebas.)

| Mutación | Pruebas que fallan |
| --- | --- |
| S1 · `listar_mesas_disponibles` sin el filtro de `FUERA_DE_SERVICIO` | 3: `..._excluye_la_mesa_fuera_de_servicio`, `..._sin_mesas_reservables_devuelve_lista_vacia[todas-fuera-de-servicio]` y `test_puente_real_fuera_de_servicio_no_figura_y_el_alta_responde_409` |
| S2 · sin la exclusión de las mesas con reserva en el turno | 5: `..._excluye_la_mesa_con_reserva_activa_en_el_turno`, `..._con_todas_las_mesas_reservadas_...`, `..._una_reserva_nueva_saca_la_mesa_de_la_lista`, `test_get_mesas_disponibles_no_se_confunde_con_la_consulta_por_id` y `test_puente_real_mesas_disponibles_y_alta_con_120_mesas` |
| S3 · excluye también las `OCUPADA` (`estado == LIBRE`) | 1: `..._incluye_la_mesa_ocupada` |
| S4 · orden por `sector.id` en lugar de `sector.nombre` | 2: `..._ordena_por_sector_numero_e_id` y `..._distingue_el_mismo_numero_en_sectores_distintos` |
| S5 · orden sin el desempate por `id` | 1: `..._desempata_por_id` |
| S6 · sin `_validar_momento` en la lista | 7: 3 del `router` (`..._turno_pasado_devuelve_422`) y 4 del `service` (fecha pasada, hora igual y anterior, y «no consulta al puente») |
| S7 · `_validar_momento` después de leer M3 | 1: `..._con_turno_pasado_no_consulta_al_puente` |
| A1 · el alta sin el 409 de mesa fuera de servicio | 5: las 2 del 409 por `router`, la del `service`, «antes que el cliente y la fecha» y el orden de validación |
| A2 · el alta rechaza también `OCUPADA` | 2: `test_crear_reserva_acepta_mesa_ocupada` y `test_post_reservas_mesa_ocupada_devuelve_201` |
| A3 · el 409 se comprueba después del cliente | 2: «antes que el cliente y la fecha» y el orden de validación |
| A4 · `modificar_reserva` consulta la mesa al puente | 2: `test_modificar_reserva_no_consulta_mesa_ni_cliente` y `test_modificar_reserva_con_mesa_fuera_de_servicio_se_modifica` |
| R1 · el `repository` sin `estado == ACTIVA` | 3: `..._no_excluye_reservas_no_activas[ATENDIDA, CANCELADA_ANTICIPADA, CANCELADA_POR_AUSENCIA]` |
| R2 · el `repository` sin el filtro de `hora` | 1: `..._no_excluye_reservas_de_otra_hora_u_otra_fecha` |
| R3 · el `repository` sin el filtro de `fecha` | 1: la misma |
| C1 · `MesaDisponible` expone `estado` | 3: `test_mesa_disponible_no_expone_el_estado`, la forma exacta del `service` y `test_get_mesas_disponibles_devuelve_200_con_la_lista` |
| C2 · `ConsultaMesasDisponibles` sin la validación de minutos | 2: `..._rechaza_hora_con_segundos` (schema) y `test_get_mesas_disponibles_formato_invalido_devuelve_422_nombrando_el_campo[hora-21:30:45]` |
| C3 · `fecha` opcional en `ConsultaMesasDisponibles` | 2: `..._exige_fecha_y_hora[fecha]` y `..._sin_fecha_o_sin_hora_...[sin-fecha]` |
| T1 · la ruta declarada **después** de `GET /reservas/{reserva_id}` | **16**: todas las pruebas nuevas del `router` (422 por `reserva_id`), incluida `test_get_mesas_disponibles_no_se_confunde_con_la_consulta_por_id`. El orden de rutas está realmente cubierto |

**Incidente de herramientas (sin efecto en el código):** la primera corrida de mutaciones llamaba a `rg` desde `sh`, donde no existe; el *pipe* roto dejó de leer la salida y `docker run` terminó mientras el contenedor seguía vivo, de modo que se acumularon 7 contenedores `g3-backend-test` en paralelo durante unos segundos. Se detuvieron todos los contenedores de esa imagen (el de `gestion-restaurante-g3-backend` y el del frontend, que no se llaman así, no se tocaron), se restauró `service.py` desde la copia de respaldo (había quedado con la mutación S7) y se comprobó con `diff` que los cuatro archivos de producción eran idénticos a la copia. Los resultados de arriba son de la corrida **repetida desde cero** con el filtro hecho en Python, de a un contenedor por vez. No hubo OOM.

### Verificación final (ejecutada sola, sin otras corridas de Docker en paralelo)

| Comando | Resultado observado |
| --- | --- |
| `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas` | **256 pasan**, 1 advertencia (202 al empezar) |
| `sh -c 'ruff check . && ruff format --check . && lint-imports && alembic heads && pytest -q -p no:cacheprovider'` (desde `backend/`) | Salida 0. `ruff check`: «All checks passed!». `ruff format --check`: «108 files already formatted». `lint-imports`: «Contracts: 10 kept, 0 broken.». `alembic heads`: `d6f8a0c2e4b6 (head)`, un solo head (sin migración nueva). `pytest`: **1249 pasan**, 1 advertencia, 2 min 33 s; cobertura 99,40 % (umbral 70 %), con `service.py`, `schemas.py`, `repository.py`, `router.py` y `puente.py` al 100 % |

**Diferencia de conteo:** 1249 − 1195 = +54, igual que en `reservas` (256 − 202). Se reparte así: `test_service.py` +26 (4 de 10.9 y 22 de 10.13 y 10.14), `test_router.py` +19 (3 de 10.9 y 16 de 10.16) y `test_schemas.py` +9 (la prueba parametrizada de «exige fecha y hora» cuenta 2 casos y la de formatos 4: 1 + 2 + 1 + 4 + 1).

**Cobertura:** 99,40 % contra 99,39 % de la unidad A (99,44 % en la unidad anterior). Las líneas sin cubrir siguen siendo las de siempre y están fuera de `reservas`: `app/database.py` 44 y 55-56, `app/modules/menus/service.py` 200-203, `app/modules/productos/service.py` 363 y `app/modules/salon/service.py` 132-134. Todos los archivos que toca esta unidad están al 100 %.

### Work Unit Evidence

| Evidence | Valor |
| --- | --- |
| Comando enfocado y resultado | `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas` (Docker): 256 pasan, 0 fallos |
| Runtime harness | Las pruebas del `router` con `TestClient`, el `puente_real` y una base SQLite migrada con 120 mesas creadas con los modelos de M3 recorren el camino real `GET /reservas/mesas-disponibles` → `service` → `repository` (reservas del turno) y `puente` → `salon.service.listar_mesas` (2 páginas) → base, y el `POST /reservas` sobre la mesa 120 y sobre una mesa `FUERA_DE_SERVICIO` (409). Con la envoltura que falla en la segunda página, `GET` y `POST` responden 500 con `TestClient(app, raise_server_exceptions=False)`, el cuerpo no es una lista y `reservas` queda vacía. `V-BACK` completo en verde |
| Rollback boundary | Revertir el commit 12 (`schemas.py`, `repository.py`, `service.py`, `router.py`, `conftest.py`, `test_schemas.py`, `test_service.py`, `test_router.py` y `test_puente.py`), solo después de revertir el commit 13. El puente real de la unidad A sigue. Sin `alembic downgrade` y sin cambios en M3 |

### Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/reservas/schemas.py` | `_hora_en_minutos(hora)` pasa a función de módulo (mismo mensaje) y la usan `_DatosDelTurno` y `ConsultaMesasDisponibles` con `field_validator("hora")(_hora_en_minutos)`; clases nuevas `ConsultaMesasDisponibles`, `SectorResumenMesa` y `MesaDisponible` (sin `estado`) |
| `backend/app/modules/reservas/repository.py` | `ids_de_mesas_con_reserva_activa(db, fecha, hora) -> set[int]` (una consulta parametrizada sobre `fecha`, `hora` y `estado == ACTIVA`) |
| `backend/app/modules/reservas/service.py` | `_validar_mesa` lee la mesa una vez y rechaza `FUERA_DE_SERVICIO` con 409; `listar_mesas_disponibles(db, fecha, hora)`; importa `EstadoMesa` y `MesaDisponible` |
| `backend/app/modules/reservas/router.py` | `GET /reservas/mesas-disponibles` entre `GET /reservas` y `GET /reservas/{reserva_id}` |
| `backend/tests/modules/reservas/conftest.py` | Fixture `m3_falla_desde_la_segunda_pagina` y constante `PAGINA_DE_M3` (movidas desde `test_puente.py` para compartirlas con `test_router.py`); docstring |
| `backend/tests/modules/reservas/test_puente.py` | Usa la fixture compartida en las dos pruebas de propagación del error de M3 (sin cambio de aserciones) |
| `backend/tests/modules/reservas/test_schemas.py` | 5 pruebas nuevas de `ConsultaMesasDisponibles` y `MesaDisponible` (9 casos) |
| `backend/tests/modules/reservas/test_service.py` | 4 pruebas nuevas del alta y de la modificación, `test_crear_reserva_orden_de_validacion` con el paso «fuera de servicio» y 22 de `listar_mesas_disponibles` |
| `backend/tests/modules/reservas/test_router.py` | 3 pruebas nuevas del 409/422/201 del alta y 16 de `GET /reservas/mesas-disponibles` (3 con `puente_real`) |
| `openspec/changes/HU-M5-01-02-03/tasks.md` | 10.9 a 10.19 marcadas `[x]` (10.20 sigue abierta) |

No se tocó `puente.py`, otro módulo, `shared/`, `main.py`, `pyproject.toml`, CI, `compose`, migraciones ni el frontend.

### Desvíos y decisiones

1. **Cuarto fallo en 10.9.** Ver arriba: «antes que el cliente y la fecha» falla en el Rojo (la tarea anticipaba tres fallos). No cambia el plan.
2. **`conftest.py` y `test_puente.py` entran en el commit 12.** La tarea 10.20 no los lista. La prueba de 500 de la segunda página (10.16) reutiliza la envoltura de 10.3, que vivía como función privada de `test_puente.py`; para no duplicarla se movió a una fixture de `conftest.py` y las dos pruebas del puente la piden (las aserciones no cambian). El commit 12 debe incluir esos dos archivos; si no, `test_router.py` falla por la fixture ausente. La línea 10.20 de `tasks.md` no se editó (es del orquestador).
3. **Ruta con anotación de retorno en lugar de `response_model=`.** La tarea 10.17 dice `response_model=list[MesaDisponible]`; el resto de `router.py` usa la anotación de retorno (`-> ReservaSalida`, `-> Pagina[...]`), que FastAPI toma como `response_model`. El comportamiento es el mismo y el archivo conserva un solo estilo.
4. **`field_validator("hora")(_hora_en_minutos)` como atributo de clase.** Es el patrón de Pydantic para reutilizar una función de módulo como validador (el nombre `_hora_con_precision_de_minutos` empieza con guion bajo, pero Pydantic ignora los `PydanticDescriptorProxy` al buscar atributos privados). La función recibe solo el valor, así que no es un `classmethod`. La mutación C2 y las pruebas de segundos de los tres esquemas demuestran que el validador se aplica.
5. **Pruebas no listadas en la tarea** (cada una chica): `test_consulta_mesas_disponibles_acepta_fecha_y_hora` (camino feliz del esquema, ≈ 6 líneas), `test_listar_mesas_disponibles_desempata_por_id` (el orden por `id` de la spec; sin ella la mutación S5 sobrevive) y la comprobación, en `test_puente_real_mesas_disponibles_y_alta_con_120_mesas`, de que tras el alta la lista baja a 119 (S35). En el orden por sector, el doble usa ids de sector invertidos (Salón 7, Terraza 3) para que ordenar por `sector.id` falle (mutación S4).
6. **Dos pruebas cuentan más de un caso.** `test_consulta_mesas_disponibles_exige_fecha_y_hora` comprueba la falta y el `null` de cada campo en la misma función; `test_listar_mesas_disponibles_sin_mesas_reservables_devuelve_lista_vacia` recibe la preparación del doble como parámetro (`todas-fuera-de-servicio` y `el-puente-no-ofrece-mesas`).
7. **Nombres y comentarios sin tildes en el código** (salvo los literales de usuario: «Salón», «está fuera de servicio»), como el resto de `reservas/`.
8. **Herramientas:** `bat`, `fd` y `sd` no están instalados en esta máquina; se usaron `Read` y scripts de Python para leer y editar.

### Tamaño de la unidad (honestidad sobre el presupuesto)

Mediciones con `diff` contra las copias hechas al empezar (sin git): `schemas.py` +40 −7, `repository.py` +14, `service.py` +28 −1, `router.py` +10, `conftest.py` +19 −1, `test_schemas.py` +75, `test_service.py` +262 −1, `test_router.py` +211 y `test_puente.py` +2 −18. Total: **661 líneas agregadas y 28 borradas (≈ 689 escritas)**. La producción (≈ 100 con las borradas) queda dentro de la estimación de la unidad (68 a 107), y las pruebas (≈ 589) superan por mucho la de 195 a 290: la unidad pide 22 pruebas de `service` (varias parametrizadas) y 16 de `router`, y cada una lleva su encabezado de escenario. Por encima de la heurística orientativa de ≈ 400 y de la estimación de 260 a 400; no se recortó ni se partió nada para entrar en el límite (la unidad ya cuenta con `size:exception`).

### Pendiente

- 10.20: commit 12 (`feat: agrega las mesas disponibles y rechaza la mesa fuera de servicio en el alta (HU-M5-01)`), a cargo del orquestador, con `conftest.py` y `test_puente.py` incluidos (ver desvío 2).
- Unidad C (commit 13) y el cierre (14).

## Fase 10 · Unidad C (selector de mesas disponibles)

- **Alcance:** tareas 10.21 a 10.33 de la Unidad C (commit 13, Decisiones 18 y 19 del diseño, frontend). La tarea 10.34 (el commit) queda para el orquestador, dueño de git: este lote no usó git para nada (las mediciones de tamaño y las restauraciones de las mutaciones se hicieron con copias en el directorio temporal y `diff`). No se levantó ningún servidor: el humo manual (10.40) queda para la persona.
- **Modo:** Strict TDD (`strict_tdd: true` en `openspec/config.yaml`, ejecutor Vitest). Comandos desde `frontend/`, de a uno por vez.
- **Línea base:** `npx vitest run src/modules/reservas`: 96 pruebas en 7 archivos pasando (red de seguridad antes de tocar nada). Suite completa informada por el orquestador y confirmada al terminar la unidad: 684 pruebas en 63 archivos antes del lote.
- **Estado:** 13 de 13 tareas del lote completas (10.21 a 10.33). Queda 10.34 (commit).

### Tareas completadas

| Tarea | Estado | Resultado observado |
| --- | --- | --- |
| 10.21 Rojo (`api.test.ts`) | Hecha | `TypeError: listarMesasDisponibles is not a function`; 1 falla, 5 pasan |
| 10.22 Verde (`types.ts`, `api.ts`) | Hecha | `SectorResumenMesa`, `MesaDisponible` y `listarMesasDisponibles` con `URLSearchParams`; 6 pasan |
| 10.23 Rojo (`validarReserva.test.ts`) | Hecha | 11 fallan, 20 pasan: 8 por `turnoValido is not a function` y 3 por Mesa `abc`, `-1` y `0` (la regla de entero positivo sigue vigente) |
| 10.24 Verde (`validarReserva.ts`) | Hecha | `turnoValido` reutiliza `errorDeFecha` y `errorDeHora`; Mesa del alta solo obligatoria; 31 pasan |
| 10.25 Rojo (`useMesasDisponibles.test.ts`) | Hecha | El archivo no carga: `Failed to resolve import "./useMesasDisponibles"` (módulo ausente) |
| 10.26 Verde (`useMesasDisponibles.ts`) | Hecha | Estado derivado en el render, bandera `vigente` en la limpieza del efecto, sin `AbortController`; 10 pasan |
| 10.27 Rojo (`SelectorMesa.test.tsx`) | Hecha | El archivo no carga: `Failed to resolve import "./SelectorMesa"` |
| 10.28 Verde (`SelectorMesa.tsx`) | Hecha | `FormField` + `Select`, sin estilos nuevos; 13 pasan |
| 10.29 y 10.30 Rojo (`ReservaFormulario.test.tsx`, `ReservasPage.test.tsx`) | Hecha | 29 fallan, 33 pasan (62): ver «Evidencia RED y GREEN por paso» |
| 10.31 Verde (`useFormularioReserva.ts`, `ReservaFormulario.tsx`) | Hecha | Módulo `reservas`: 150 pasan (después, con la prueba de la mutación F2, 151) |
| 10.32 Refactor | Hecha | `useMesasDelTurno` extraído (hook privado); 150 pasan antes y después; `eslint` y `tsc` sin hallazgos; sin `any`, sin textos repetidos |
| 10.33 Verificación | Hecha | Comando enfocado, `V-FRONT` completo y `V-TZ` en verde (ver «Verificación final») |
| 10.34 Commit 13 | **Pendiente (orquestador)** | No es parte de este lote |

### TDD Cycle Evidence

| Tarea | Archivo de prueba | Capa | Red de seguridad | RED | GREEN | TRIANGULAR | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10.21 y 10.22 | `api.test.ts` | Unidad (HTTP simulado) | 5/5 | 1 falla | 6/6 | Un solo pedido: se compara ruta y parámetros ya decodificados | Sin cambios |
| 10.23 y 10.24 | `validarReserva.test.ts` | Unidad (funciones puras) | 18/18 | 11 fallan | 31/31 | 5 casos `false` y 3 `true` de `turnoValido`; 4 valores de Mesa | Sin cambios |
| 10.25 y 10.26 | `useMesasDisponibles.test.ts` | Hook (`renderHook`) | N/A (nuevo) | No carga | 10/10 | Éxito, vacía, error con y sin detalle, datos nulos, cambio de turno, dos respuestas fuera de orden | Sin cambios |
| 10.27 y 10.28 | `SelectorMesa.test.tsx` | Componente | N/A (nuevo) | No carga | 13/13 | Cinco estados, mismo número en dos sectores, capacidad 1, precedencia del error | Sin cambios |
| 10.29 a 10.31 | `ReservaFormulario.test.tsx`, `ReservasPage.test.tsx` | Integración (formulario y página con la API simulada) | 96/96 del módulo | 29 fallan | 150/150 (151 con la prueba de F2) | Mesas 5 y 12 (id distinto del número), lista nueva con y sin la mesa elegida, vuelta al turno anterior | Ver 10.32 |
| 10.32 | Las anteriores | N/A | 150/150 | N/A | 150/150 | N/A | `useMesasDelTurno` extraído |

### Evidencia RED y GREEN por paso

Comando enfocado de todos los pasos: `npx vitest run <archivo>` (y `src/modules/reservas` para el módulo), desde `frontend/`.

- **10.21 (Rojo):** `api.test.ts`: `1 failed | 5 passed`, `TypeError: listarMesasDisponibles is not a function`. Motivo correcto: la función no existe. **Desvío menor de la aserción:** `URLSearchParams.toString()` escribe `:` como `%3A`, así que el pedido real es `?fecha=2026-11-02&hora=21%3A30`, que el servidor decodifica a `21:30`; la prueba compara la ruta y los parámetros ya decodificados (`new URL(...)`) en lugar de un texto con `:` literal.
- **10.22 (Verde):** `6 passed (6)`.
- **10.23 (Rojo):** `11 failed | 20 passed` en `validarReserva.test.ts`. Fallan: los 8 casos de `turnoValido` (`TypeError: turnoValido is not a function`) y los 3 casos de Mesa `abc`, `-1` y `0` (`expected { Object (mesa) } to deeply equal {}`). **Guardas (ya pasan en el Rojo):** «pide la mesa cuando está vacía» y Mesa `5` sin error (la regla actual ya los cumple), más las 18 pruebas existentes (entre ellas «rechaza Cliente 0», que antes era «Cliente 0 y Mesa -1»).
- **10.24 (Verde):** `31 passed (31)`.
- **10.25 (Rojo):** `Failed to resolve import "./useMesasDisponibles"`; `Tests no tests`.
- **10.26 (Verde):** `10 passed (10)`. `eslint src/modules/reservas` sin hallazgos de `react-hooks` (sin `setState` sincrónico en el efecto).
- **10.27 (Rojo):** `Failed to resolve import "./SelectorMesa"`.
- **10.28 (Verde):** `13 passed (13)`.
- **10.29 y 10.30 (Rojo):** `29 failed | 33 passed (62)` sobre los dos archivos, con el campo Mesa numérico todavía vigente. Los motivos observados: `expect(element).toBeDisabled()` recibe el `<input id="reserva-mesa" inputmode="numeric">` (recién abierto, fecha pasada, hora vacía y «Nueva reserva» después de editar, tanto en el formulario como en la página); `Unable to find an accessible element with the role "option" and name "Cargando mesas…"`; y el ayudante `elegirMesa`, que espera la opción `option[value="5"]` en el selector, agota su espera de 1 s en todas las pruebas que eligen una mesa (alta correcta de la página incluida). **Guardas (pasan en el Rojo):** «con campos vacíos…» (Mesa ya marcaba «obligatoria»), las pruebas con fecha o hora inválidas (no eligen mesa, como pide la tarea), `la edición no pide la lista de mesas`, `la edición muestra Mesa de solo lectura…`, todas las demás de la edición y las de la página que no tocan el alta. La tarea 10.30 anticipaba que en la página solo fallaba la prueba de alta; también falla «Nueva reserva» después de editar (ver desvío 7).
- **10.31 (Verde):** primera corrida `1 failed | 149 passed` en el módulo: «Nueva reserva» después de editar fallaba por un defecto de **la prueba**, no del código (`toHaveValue('')` sobre un `<select>` sin opciones devuelve `undefined`); se corrigió la aserción (es un `SELECT`, está deshabilitado y no ofrece mesas). Segunda corrida: `150 passed (150)`.
- **10.32 (Refactor):** `useMesasDelTurno` (hook privado con el turno válido, la lista, la mesa vigente y el borrado de la elección); `150 passed` antes y después; `eslint src/modules/reservas --max-warnings=0` y `tsc --noEmit` sin salida; `rg` no encuentra `any`, `fetch(`, `AbortController` ni imports de `modules/salon` o `modules/atencion` en `reservas/`. Cada texto del selector y de Mesa vive en un solo archivo.
- **Lint durante la unidad:** `max-lines-per-function` (50) marcó dos bloques `describe` de prueba (`api.test.ts` con 58 y `ReservaFormulario.test.tsx` con 55); se partieron en dos `describe` cada uno, sin tocar las aserciones.

### Comprobación de mutaciones (para que las pruebas no sean decorativas)

Se alteró un archivo de producción por vez (28 mutaciones, script en el directorio temporal), se corrió `npx vitest run src/modules/reservas` completo, se restauró el archivo copiándolo desde la copia de respaldo del árbol final (no con git) y se comparó con `diff` (idéntico después de cada una y al final). La suite sana tenía 150 pruebas. **26 se detectaron de entrada, 1 sobrevivió por una prueba que faltaba (F2, corregida) y 1 sobrevive por ser equivalente (P3).**

| Mutación | Pruebas que fallan |
| --- | --- |
| H1 · `useMesasDisponibles` sin la bandera `vigente` (guarda siempre) | 2: `una respuesta vieja que llega después de la nueva se descarta` y `una respuesta que llega después de que el turno dejó de ser válido se descarta` |
| H2 · sin comparar la clave del turno (muestra el último resultado guardado) | 1: `al cambiar la hora vuelve a pedir y, mientras llega la respuesta nueva, está cargando y no muestra la lista del turno anterior` |
| H3 · el efecto pide aunque no haya turno válido | 14, entre ellas `sin un turno válido no pide la lista y queda inactivo`, las 4 de «no pide la lista», `la edición no pide la lista de mesas…` y las de la página |
| H4 · `inactivo` pasa a `cargando` | 7 (las de «inactivo» y «no pide la lista») |
| H5 · el error pierde el mensaje de la API | 2: `si la consulta falla queda en error con el mensaje de la API` y `si la consulta de la lista falla muestra el mensaje junto a Mesa` |
| S1 · el texto usa la capacidad en lugar del número | 5 (texto de la opción, capacidad 1, mismo número en dos sectores, alta de la página) |
| S2 · el valor de la opción es el número y no el `id` | 6, entre ellas `elegir la mesa 12 y guardar envía su id como mesa_id` |
| S3 · la lista vacía deja el selector habilitado | 2 |
| S4 · «cargando» deja el selector habilitado | 4 |
| S5 · gana el mensaje de la consulta sobre el error local | 1 |
| S6 · el error de la consulta no se muestra | 2 |
| F1 · no se borra la elección que ya no figura | 1: `la mesa borrada no vuelve al volver al turno anterior` |
| **F2 · se valida con el texto guardado y no con la mesa vigente** | **0 al principio: sobrevivió.** Faltaba la prueba de «mesa elegida, cambio de hora y Guardar mientras carga la lista nueva». Se agregó `con una mesa elegida, al cambiar la hora y guardar mientras carga la lista nueva no envía la mesa anterior` (pasa sobre el código real, falla bajo F2) y la mutación se repitió: **1 falla, detectada** |
| F3 · el alta pide la lista sin exigir un turno válido | 9 |
| F4 · la edición también pide la lista | 4: `la edición no pide la lista de mesas…`, `«Modificar reserva» abre el panel…` y otras 2 de la página |
| F5 · «Guardar reserva» no se deshabilita con la lista vacía | 1: `con la lista vacía muestra el aviso y deshabilita Guardar reserva` |
| F6 · «Guardar reserva» se deshabilita también mientras carga | 14 (incluida `mientras la lista carga, Guardar reserva no envía nada…`, y todas las de la edición, porque el estado es `inactivo`) |
| F7 · la mesa vigente es siempre el texto guardado | 1: `la mesa borrada no vuelve al volver al turno anterior` |
| V1 · Mesa del alta vuelve a exigir un entero positivo | 3: Mesa `abc`, `-1` y `0` |
| V2 · `turnoValido` ignora la hora | 9 |
| V3 · `turnoValido` ignora la fecha | 3 |
| V4 · hoy con la hora igual a la actual pasa a valer (`<` en lugar de `<=`) | 4 |
| A1 · el pedido usa otro nombre de parámetro para la hora | 1 |
| A2 · el pedido va a otra ruta | 1 |
| P1 · la edición muestra el selector | 28 |
| P2 · el botón no usa `guardarDeshabilitado` | 1 |
| **P3 · el selector recibe el texto guardado y no la mesa vigente** | **0: sobrevive, equivalente.** Cuando el texto guardado difiere de la mesa vigente (cargando, error o sin turno válido) el `<select>` no tiene ninguna opción con ese valor, así que muestra lo mismo; con la lista lista, el ajuste de estado durante el render borra la elección antes de que se pinte. No hay una conducta observable que una prueba pueda distinguir, así que no se agregó ninguna |

Cubren las dos mutaciones que pide la tarea 10.36 para el frontend: «quitar la bandera `vigente`» (H1) y «quitar la comparación con la clave del turno» (H2) fallan exactamente en las pruebas que nombra la tarea. En 10.36 solo queda repetirlas con el árbol limpio después del commit 13.

### Verificación final (ejecutada sola, sin otras corridas en paralelo)

| Comando (desde `frontend/`) | Resultado observado |
| --- | --- |
| `npx vitest run src/modules/reservas` | Salida 0: **151 pasan** en 9 archivos (96 al empezar) |
| `npm run format` | Salida 0. Solo reescribió archivos de `reservas/` (los 5 que Prettier marcó antes: `ReservaFormulario.tsx`, `validarReserva.ts` y tres de prueba); `prettier --check .` marcaba solo esos antes de correrlo |
| `npm run lint` | Salida 0 (`eslint . --max-warnings=0`, sin hallazgos) |
| `npm run format:check` | Salida 0: «All matched files use Prettier code style!» |
| `npm run typecheck` | Salida 0 (`tsc --noEmit`) |
| `npm run test:coverage` | Salida 0: **739 pruebas pasan en 65 archivos**. Cobertura: sentencias 75,09 % (386/514), ramas 71,73 %, funciones 71,71 %, líneas 76,82 % (umbral 60 %) |
| `npm run build` | Salida 0 (`tsc --noEmit && vite build`, «✓ built») |
| `V-TZ`: `TZ=America/Argentina/Buenos_Aires npx vitest run src/modules/reservas/components/useMesasDisponibles.test.ts src/modules/reservas/components/validarReserva.test.ts src/modules/reservas/components/ReservaFormulario.test.tsx src/modules/reservas/pages/ReservasPage.test.tsx` | Salida 0: 104 pasan en 4 archivos |
| `V-TZ`: el mismo comando con `TZ=UTC` | Salida 0: 104 pasan en 4 archivos |

**Diferencia de conteo:** 739 − 684 = **+55**, y los archivos pasan de 63 a 65 (`useMesasDisponibles.test.ts` y `SelectorMesa.test.tsx`). Se reparte así: `api.test.ts` +1, `validarReserva.test.ts` +13 (Mesa del alta: 1 + 4 casos; `turnoValido`: 5 + 3; la de «Cliente 0 y Mesa -1» pasó a «Cliente 0», sin cambio de cantidad), `useMesasDisponibles.test.ts` +10, `SelectorMesa.test.tsx` +13 y `ReservaFormulario.test.tsx` +18 (4 de «no pide la lista», 1 de «pide la lista», lista vacía, carga, mesa elegida con cambio de hora y Guardar, error de la consulta, 2 de cambio de hora, «la mesa borrada no vuelve», mesa sin elegir, 2 de `mesa_id` con las mesas 5 y 12, 409 de la mesa 6, y 2 de la edición). `ReservasPage.test.tsx` no suma pruebas: se adaptaron tres.

**Cobertura:** 75,09 % contra 75,09 % de la línea base. No cambia porque `vite.config.ts` mide solo `src/App.tsx` y `src/shared/**`: el código de `reservas/` no entra en el porcentaje (RNF-MAN-04 se cumple por las pruebas, no por esa cifra). Los umbrales no se tocaron.

### Work Unit Evidence

| Evidence | Valor |
| --- | --- |
| Comando enfocado y resultado | `npx vitest run src/modules/reservas` (desde `frontend/`): 151 pasan en 9 archivos, 0 fallos |
| Runtime harness | N/A para el navegador: el apply no levanta servidores (el humo manual con `npm run dev` es la tarea 10.40, de la persona). El camino de punta a punta dentro de Vitest es `ReservasPage.test.tsx` (página → panel → hook → `api.ts` simulado): abre «Nueva reserva», escribe Fecha y Hora, pide `listarMesasDisponibles('2026-11-03', '21:30')`, elige «Salón · Mesa 5 (4 personas)», guarda con `crearReserva({ mesa_id: 5, … })`, cierra el panel y vuelve a pedir la tabla. `V-FRONT` y `V-TZ` en verde |
| Rollback boundary | Revertir el commit 13 (`types.ts`, `api.ts`, `validarReserva.ts`, `useMesasDisponibles.ts`, `SelectorMesa.tsx`, `useFormularioReserva.ts`, `ReservaFormulario.tsx` y las pruebas `api.test.ts`, `validarReserva.test.ts`, `useMesasDisponibles.test.ts`, `SelectorMesa.test.tsx`, `ReservaFormulario.test.tsx` y `ReservasPage.test.tsx`). Vuelve el campo numérico de Mesa; la ruta del backend queda sin uso |

### Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/reservas/types.ts` | `SectorResumenMesa` y `MesaDisponible`, propios de `reservas` |
| `frontend/src/modules/reservas/api.ts` | `listarMesasDisponibles(fecha, hora)` con `URLSearchParams` |
| `frontend/src/modules/reservas/components/validarReserva.ts` | `turnoValido`; `errorDeMesa` (Mesa del alta solo obligatoria); desaparece «La mesa debe ser un entero positivo.» |
| `frontend/src/modules/reservas/components/useMesasDisponibles.ts` | Nuevo: hook con estados `inactivo`, `cargando`, `listo` y `error` (Decisión 18) |
| `frontend/src/modules/reservas/components/SelectorMesa.tsx` | Nuevo: campo Mesa del alta sobre `FormField` y `Select` (Decisión 19) |
| `frontend/src/modules/reservas/components/useFormularioReserva.ts` | `useMesasDelTurno`, `mesaVigente`, borrado de la elección, `estadoMesas`, `mesaVigente` y `guardarDeshabilitado` |
| `frontend/src/modules/reservas/components/ReservaFormulario.tsx` | `CampoMesa`: `SelectorMesa` en el alta, campo de solo lectura en la edición; el botón usa `guardarDeshabilitado` |
| `frontend/src/modules/reservas/api.test.ts` | Prueba de `listarMesasDisponibles` y `describe` aparte |
| `frontend/src/modules/reservas/components/validarReserva.test.ts` | Pruebas de `turnoValido` y de Mesa del alta; «Cliente 0 y Mesa -1» pasa a «Cliente 0» |
| `frontend/src/modules/reservas/components/useMesasDisponibles.test.ts` | Nuevo: 10 pruebas del hook |
| `frontend/src/modules/reservas/components/SelectorMesa.test.tsx` | Nuevo: 13 pruebas del selector |
| `frontend/src/modules/reservas/components/ReservaFormulario.test.tsx` | Reescrita con `completar` asíncrono y las pruebas nuevas del selector |
| `frontend/src/modules/reservas/pages/ReservasPage.test.tsx` | `beforeEach` simula la lista; el alta elige la mesa en el selector; dos pruebas adaptadas |
| `openspec/changes/HU-M5-01-02-03/tasks.md` | 10.21 a 10.33 marcadas `[x]` (10.34 sigue abierta) |

No se tocó `frontend/src/shared/`, `App.tsx`, `index.ts` de `components/`, otro módulo, el backend, la configuración de ESLint, Vite o `package.json`, ni las dependencias. El módulo no importa nada de `modules/salon` ni de `modules/atencion`.

### Desvíos y decisiones

1. **Ruta decodificada en la prueba de `api.ts`.** Ver 10.21: `URLSearchParams` envía `hora=21%3A30`; es el mismo valor que `21:30` para el servidor. La tarea y la spec escriben el pedido con `:` literal; la prueba compara el pedido decodificado.
2. **El error del campo lo resuelve `SelectorMesa`.** La tarea 10.31 deja a `ReservaFormulario` pasar «`errores.mesa` o, si no lo hay, el mensaje del estado `error`»; la 10.27 pide que el selector muestre el mensaje del estado `error`. Se implementó en el selector (`error ?? mensaje`), y el formulario solo pasa `errores.mesa`. La conducta visible es la misma y el componente se prueba solo.
3. **`guardarDeshabilitado = enviando || listaVacia(estado)`, sin `modo === 'alta' &&`.** La condición es redundante: fuera del alta `habilitado` es `false`, el estado es `inactivo` y nunca `listo`. Se dejó afuera para no tener una rama inalcanzable (la mutación F6 comprueba que, si se deshabilitara con otros estados, la edición se rompe).
4. **El hook del formulario expone también `mesaVigente`** (el texto del `id` o `''`), además de `estadoMesas` y `guardarDeshabilitado`, porque el selector muestra la mesa vigente (Decisión 19). Ver la mutación P3.
5. **Hook privado `useMesasDelTurno` en `useFormularioReserva.ts`.** `useFormularioReserva` quedaba en ≈ 46 líneas efectivas (dentro del límite de 50); se extrajo igual el turno, la lista y el borrado de la elección para que el hook principal siga siendo legible. Sin cambio de conducta.
6. **Pruebas y comportamientos no listados en las tareas.** `useMesasDisponibles`: error sin detalle («No se pudieron cargar las mesas disponibles.», `Supuesto:` el texto no está en la spec) y respuesta exitosa con `datos: null` como lista vacía (`RespuestaApi` lo permite; la lista vacía deshabilita «Guardar reserva», que es el lado seguro). `SelectorMesa`: rótulo «Mesa» obligatorio, mesa elegida según el valor recibido, sin error no hay aviso y precedencia del error local. Formulario: `la mesa borrada no vuelve al volver al turno anterior` (distingue borrar la elección de solo ocultarla; mata F1 y F7), `elegir la mesa 5 y 12 envía su id` (el 12 tiene número 1: demuestra que se envía el `id` y no el número) y `con una mesa elegida, al cambiar la hora y guardar mientras carga…` (mata F2). La edición se comprueba con una fila de `mesa_id` 9 para no depender del 5.
7. **Adaptación extra en `ReservasPage.test.tsx` (no listada en 10.30).** «`Nueva reserva` después de editar abre el panel vacío» exigía los cinco campos habilitados; el selector de Mesa queda deshabilitado hasta tener Fecha y Hora válidas (spec, «El selector espera una fecha y una hora válidas»). Se sacó Mesa del bucle y se comprueba aparte que es un `SELECT` deshabilitado, sin opciones y que no se pidió la lista. Las aserciones de Cliente, Fecha, Hora y Cantidad no se debilitaron.
8. **Mesa y el aviso de error de la consulta.** Por diseño (Decisión 19) el error del campo es `errores.mesa` y, solo si no lo hay, el mensaje de la consulta. Consecuencia a decidir: si la consulta falló (por ejemplo, el 422 por la diferencia de relojes de la Decisión 20) y la persona pulsa «Guardar reserva», `errores.mesa` («La mesa es obligatoria.») reemplaza al mensaje de la API y se queda hasta el próximo envío. No se cambió porque es lo que dice el diseño; se deja como pregunta abierta para el orquestador.
9. **Sin `aria-invalid` ni `aria-describedby` en el selector.** `FormField` no los conecta y los otros campos del panel (`CampoReserva`) tampoco los usan; se mantuvo la misma convención.
10. **Herramientas:** `bat`, `fd` y `sd` no están instalados; se usaron `Read`, `Edit`, `rg` y scripts de Python. `npm run format` reescribió solo los 5 archivos de `reservas/` que Prettier marcaba (se comprobó antes con `prettier --check .`).

### Tamaño de la unidad (honestidad sobre el presupuesto)

Mediciones con `difflib` contra la copia de `reservas/` hecha al empezar (sin git): `api.ts` +16 −1, `types.ts` +14, `validarReserva.ts` +19 −6, `useMesasDisponibles.ts` +56, `SelectorMesa.tsx` +66, `useFormularioReserva.ts` +53 −3, `ReservaFormulario.tsx` +24 −8 (producción: **248 agregadas y 18 borradas, ≈ 266**); `api.test.ts` +24 −2, `validarReserva.test.ts` +36 −4, `useMesasDisponibles.test.ts` +186, `SelectorMesa.test.tsx` +138, `ReservaFormulario.test.tsx` +272 −47 y `ReservasPage.test.tsx` +29 −5 (pruebas: **685 agregadas y 58 borradas, ≈ 743**). Total: **933 líneas agregadas y 76 borradas (1009)**. Es más que el pronóstico de la unidad (390 a 630; código 140 a 220, pruebas 250 a 410) y que la heurística de ≈ 400. Las causas: el hook (10 pruebas con promesas controladas a mano y un ayudante), el selector (13 pruebas, una por estado y por regla de texto), el formulario (`completar` pasó a asíncrono y se reescribió el archivo con 18 pruebas nuevas, y Prettier expande cada `it.each` largo) y la prueba que agregó la mutación F2. No se recortó, no se minificó ni se partió nada para entrar en el límite; la unidad es una sola conducta entregable y ya cuenta con `size:exception` (P.8).

### Pendiente

- 10.34: commit 13 (`feat: elige la mesa del alta de reservas entre las mesas disponibles (HU-M5-01)`), a cargo del orquestador, con los 13 archivos de `frontend/src/modules/reservas/` de «Archivos tocados».
- 10.35 a 10.42: cierre del delta (CI completa de ambos lados, mutaciones con el árbol limpio —en 10.36 las del frontend ya tienen evidencia aquí—, aislamiento, `verify`, humo manual de la persona y medición de líneas).
- Decisión abierta (desvío 8): qué debe verse junto a Mesa cuando falló la consulta de la lista y se pulsa «Guardar reserva».

## Fase 10 · Cierre del delta (mesas disponibles, issue #61)

Cierre hecho por el orquestador (2026-11-01), con los comandos corridos por él y no solo los reportados por cada unidad.

### Commits del delta

| Commit | Contenido |
| --- | --- |
| `cfd594b`, `460568e` | Spec: mesas disponibles, 409 de la mesa fuera de servicio, puente real y selector; aclaraciones tras la revisión nativa |
| `377e0b9` | Diseño y propuesta (Decisiones 13 a 20) |
| `5c01d0e` | Tareas de la Fase 10 (base para medir el delta) |
| `a1ad33f` | Unidad A: puente real que lee las mesas de M3 |
| `9f691ff` | Unidad B: `GET /reservas/mesas-disponibles` y 409 de la mesa fuera de servicio |
| `8d5d374` | Unidad C: selector de mesas del panel de alta |

### Verificación del orquestador

- Backend (Docker, sin red, a solas): `ruff check`, `ruff format --check`, `lint-imports` (10 contratos mantenidos, 0 rotos), `alembic heads` (un solo head, `d6f8a0c2e4b6`) y `pytest`: **1249 pruebas**, cobertura **99,40 %**.
- Frontend: `lint`, `format:check`, `typecheck`, `test:coverage` (**739 pruebas** en 65 archivos; cobertura de la configuración vigente: sentencias 75,09 %, ramas 71,73 %) y `build`, todos con salida 0. `V-TZ`: 151 pruebas del módulo en `America/Argentina/Buenos_Aires` y en `UTC`.
- Mutación del test de imports: un `import` de `app.modules.salon` en `service.py` hace fallar `test_solo_el_puente_importa_salon`; el archivo se restauró idéntico al original.
- Aislamiento contra `origin/develop`: solo `reservas/`, la carpeta de `openspec/` de este cambio, la migración `d6f8a0c2e4b6` y el registro del `router` en `main.py`.
- Tamaño real del delta (base `5c01d0e`): backend ≈ 1.094 líneas y frontend ≈ 979, por encima del pronóstico de 500 a 780 y 390 a 630. Acumulado contra `develop`: backend ≈ 3.196 y frontend ≈ 2.679 (informativo, `size:exception`).
- Revisión nativa: las unidades A, B y C se aprobaron sin hallazgos bloqueantes. El candidato de toda la rama contra `main` supera el presupuesto del revisor y no genera revisión.

### Decisiones y observaciones del cierre

1. **Advertencia de la revisión de la Unidad C sobre `useMesasDisponibles` (promesa sin manejo de rechazo).** No se cambia el hook: `clienteHttp.get` envuelve todo el pedido en `try/catch` (`frontend/src/shared/api/client.ts`, líneas 31 y 48) y devuelve `{ exito: false, error }` ante cualquier falla, también la de red, así que `listarMesasDisponibles` no puede rechazar.
2. **Mensaje de error del campo Mesa (pregunta abierta de la Unidad C).** Si la consulta de la lista falló y la persona pulsa «Guardar reserva», «La mesa es obligatoria.» reemplaza el mensaje de la API hasta el siguiente intento. Se acepta, como dice la Decisión 19: la mesa sigue siendo obligatoria y el mensaje de la consulta vuelve al reabrir o cambiar el turno.
3. **Riesgo del reloj (Decisión 20).** El contenedor corre en UTC y el restaurante en UTC-3, así que la regla de la hora de hoy se desplaza tres horas en todo el día. Sin cambio de código en este delta; la persona decide entre una zona fija en `ahora()` y `TZ` en `compose.yaml`.
4. **Pendientes fuera de este delta:** el humo manual en el navegador (10.40, de la persona); el alta de cliente nuevo y el nombre del cliente dependen de que M4 exponga `crear_cliente` y `obtener_cliente` en su `service`; el listado sigue mostrando «Mesa n.º» con el id interno (S23).
