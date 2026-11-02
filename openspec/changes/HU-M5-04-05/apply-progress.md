# Apply progress: HU-M5-04-05 Cancelar una reserva (anticipada y por ausencia)

## Fase 1 · Backend de cancelaciones

**Estado:** tareas 1.1 a 1.9 completas. 1.10 (el commit) queda para quien orquesta el cambio: este
lote no toca git en ninguna forma.

### Tareas completadas

- [x] 1.1 (Rojo) `test_service.py`: 7 casos de `cancelar_anticipada` (válida con liberación de la
  mesa comprobada en 1.3, un minuto después, hora igual a la actual, fecha anterior, ya cancelada
  parametrizada en los dos estados, atendida, inexistente).
- [x] 1.2 (Rojo) `test_service.py`: 6 casos de `cancelar_por_ausencia` (válida, límite exacto,
  hora todavía no llegada, día siguiente, ya cancelada/atendida parametrizada en 3 estados,
  inexistente).
- [x] 1.3 (Rojo) `test_service.py`: orden de verificación (atendida con hora futura responde «ya
  fue atendida»; cancelada con hora pasada responde «ya fue cancelada»; parametrizado sobre las
  dos funciones y, en el segundo caso, sobre los dos estados cancelados) y liberación automática
  (`repository.ids_de_mesas_con_reserva_activa` / `existe_reserva_activa`, con una reserva nueva en
  el mismo turno para la anticipada).
- [x] 1.4 (Rojo) `test_router.py`: 9 casos (200 con el estado nuevo en las dos rutas, 404 en las
  dos, 409 con detalle en las dos — ya cancelada para anticipada, hora no llegada para por
  ausencia —, no choca con `GET`/`PUT /reservas/{id}`, HU-M5-04 CA1 de punta a punta con
  `GET /reservas/mesas-disponibles`, `puente_real` confirma que `Mesa.estado` en M3 no cambia).
- [x] 1.5 (Verde) `service.py`: `_CANCELADAS`, `_obtener_cancelable`, `_llego_su_hora`,
  `cancelar_anticipada`, `cancelar_por_ausencia`, código idéntico a la Decisión 32 del diseño,
  insertado después de `modificar_reserva`.
- [x] 1.6 (Verde) `router.py`: dos rutas `POST /reservas/{reserva_id}/cancelar-anticipada` y
  `/cancelar-por-ausencia`, sin cuerpo, 200 por defecto, `ReservaSalida`, solo delegan al
  `service`. Insertadas al final del archivo (Decisión 33).
- [x] 1.7 (Refactor) Revisado: el código quedó idéntico al de la Decisión 32/33 del diseño (sin
  cambios de comportamiento necesarios). `_obtener_cancelable` es la única fuente de los mensajes
  «ya fue cancelada» y «ya fue atendida»; `_llego_su_hora` es el único predicado de la regla de
  hora (negado en `cancelar_anticipada`, afirmado en `cancelar_por_ausencia`). Cada función queda
  por debajo de 15 líneas y con complejidad 2 o 3 (confirmado con `ruff` en el chequeo de 1.9, sin
  reglas de complejidad violadas).
- [x] 1.8 Mutaciones, una por vez, restauradas a mano desde `service.py.backup` en el scratchpad
  (no `git restore`): ver evidencia abajo. Las tres hicieron fallar la prueba esperada; el archivo
  quedó restaurado byte a byte (`diff` sin salida) después de la tercera.
- [x] 1.9 Verificación completa con `V-BACK` (ver evidencia abajo): `ruff check --fix . && ruff
  format .` reformateó 2 archivos (cosmético: solo re-wrap de líneas largas); después
  `ruff check . && ruff format --check . && lint-imports && alembic heads && pytest` en un solo
  proceso, todo en verde.

### Evidencia RED → GREEN

**RED** (`pytest --no-cov -q -p no:cacheprovider tests/modules/reservas`, antes de tocar
`service.py`/`router.py`): `33 failed, 320 passed`. Las 24 pruebas de `test_service.py`
fallan con `AttributeError: module 'app.modules.reservas.service' has no attribute
'cancelar_anticipada'` (o `'cancelar_por_ausencia'`); las 9 de `test_router.py` fallan con
`assert 404 == 200` (ruta inexistente), confirmado para
`test_post_reservas_cancelar_anticipada_devuelve_200_con_el_estado`.

**GREEN** (mismo comando, después de agregar `_CANCELADAS`, `_obtener_cancelable`,
`_llego_su_hora`, `cancelar_anticipada`, `cancelar_por_ausencia` en `service.py` y las dos rutas en
`router.py`): `353 passed` (320 + 33 nuevas).

### Mutaciones (1.8)

Copia de respaldo: `scratchpad/service.py.backup` (no versionado, fuera del repositorio).

| Mutación | Cambio | Comando enfocado | Resultado |
| --- | --- | --- | --- |
| (a) | `_llego_su_hora`: `<=` → `<` | `-k "test_cancelar_anticipada_rechaza_hora_igual_a_la_actual or test_cancelar_por_ausencia_limite_exacto_responde_200"` | **2 failed** (las dos pruebas del límite exacto, una por función) |
| (b) | Se quita `if reserva.estado in _CANCELADAS: ...` de `_obtener_cancelable` | `-k test_cancelar_anticipada_reserva_ya_cancelada_responde_409` | **2 failed** (las dos parametrizaciones, `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA`) |
| (c) | Se quita el `if reserva.estado == EstadoReserva.ATENDIDA: ...` de `_obtener_cancelable` | `-k test_cancelar_anticipada_reserva_atendida_responde_409` | **1 failed** |

Restaurado con `cp scratchpad/service.py.backup service.py` después de cada mutación; `diff`
contra el respaldo no mostró diferencias tras la restauración final. Suite enfocada en verde otra
vez (`353 passed`) antes de seguir a 1.9.

### Verificación completa (1.9)

Ejecutado en un solo proceso Docker (no en paralelo, por la advertencia de OOM):

```
ruff check . && ruff format --check . && lint-imports && alembic heads && pytest -q -p no:cacheprovider
```

- `ruff check .`: sin errores.
- `ruff format --check .`: sin diferencias (el `ruff format .` previo ya había reformateado
  `service.py` y `test_service.py`, solo re-wrap cosmético de líneas largas; confirmado con la
  suite en verde después).
- `lint-imports`: `Contracts: 10 kept, 0 broken.` (mismos 10 contratos que antes del cambio; ningún
  import nuevo hacia `salon` ni `atencion`).
- `alembic heads`: `d6f8a0c2e4b6 (head)` — el mismo head único que antes del cambio, sin ninguna
  migración nueva.
- `pytest` (con cobertura): **1658 passed** (línea base de la rama antes de esta fase: 1625
  passed; +33 por este cambio, exacto). Cobertura total **99.27 %** (línea base ≈ 99.26 %),
  requisito ≥ 70 % cumplido ampliamente. `app/modules/reservas/service.py`: 112 declaraciones, 0
  perdidas, **100 %**. `app/modules/reservas/router.py`: 30 declaraciones, 0 perdidas, **100 %**.

Ninguna prueba conocida falla en la base (`Known environmental failures: None`); no hubo que
descontar ningún fallo previo.

### Archivos tocados

| Archivo | Acción | Qué se hizo |
| --- | --- | --- |
| `backend/app/modules/reservas/service.py` | Modificado | `_CANCELADAS`, `_obtener_cancelable`, `_llego_su_hora`, `cancelar_anticipada`, `cancelar_por_ausencia` (+46 líneas) |
| `backend/app/modules/reservas/router.py` | Modificado | Dos rutas `POST` sin cuerpo que delegan al `service` (+10 líneas) |
| `backend/tests/modules/reservas/test_service.py` | Modificado | 24 pruebas nuevas de las dos funciones, sus límites, su orden y la liberación automática (+228 líneas) |
| `backend/tests/modules/reservas/test_router.py` | Modificado | 9 pruebas nuevas de las dos rutas, CA1 de punta a punta y la mesa de M3 sin cambios; import de `Mesa` de `salon.models` solo en la prueba (+130 líneas) |
| `openspec/changes/HU-M5-04-05/tasks.md` | Modificado | Tareas 1.1 a 1.9 marcadas `[x]` |
| `openspec/changes/HU-M5-04-05/apply-progress.md` | Creado | Este archivo |

**Total autorado (código + pruebas, sin este archivo de Markdown):** 414 líneas agregadas, 0
quitadas (`git diff --stat`). Dentro del pronóstico del diseño/tareas (330 a 445 para este lado);
no se pidió `size:exception`.

### No tocado (confirmado)

`models.py`, `schemas.py`, `repository.py`, `puente.py`, `conftest.py` del módulo `reservas`:
sin cambios (Decisión 34). Ningún archivo de `salon/`, `atencion/`, `shared/` (backend ni
frontend) ni `backend/pyproject.toml`. Ninguna migración nueva de Alembic (confirmado con
`alembic heads` arriba). `_obtener`, `_validar_activa`, `ahora()` y `ReservaSalida` quedaron
exactamente como estaban antes de esta fase (leídos primero, confirmados sin cambios). El código
de selección de cliente del PR #212 (`_validar_un_cliente`, `_id_del_cliente`, etc.) no se tocó.

### Desviaciones del diseño

Ninguna. El código de `service.py` y `router.py` quedó idéntico al de las Decisiones 32 y 33 del
diseño (solo se recortó un comentario redundante del docstring de `_obtener_cancelable` que
duplicaba el sufijo «HU-M5-04-05» ya implícito en el módulo). Las pruebas cubren cada escenario de
la spec listado en las tareas 1.1 a 1.4; los ids de reserva son los que devuelve `fabrica_reserva`
(no los ids ilustrativos 10 a 31 de la spec), como indica la «Estrategia de pruebas» del diseño.

### Trabajo pendiente de esta fase

- [ ] 1.10 Commit 1 (lo hace quien orquesta el cambio; este lote de `apply` no ejecuta git en
  ninguna forma, ni `add`, ni `commit`, ni `restore`).

### Próximo paso

Fase 2 (frontend, tareas 2.1 a 2.12): depende de esta fase, ya aplicada y verificada. Fase 3
(cierre, 3.1 y 3.2) queda para después de la Fase 2.

## Fase 2 · Frontend de cancelaciones

**Estado:** tareas 2.1 a 2.11 completas. 2.12 (el commit) queda para quien orquesta el cambio:
este lote no toca git en ninguna forma (ni `add`, ni `commit`, ni `restore`; las restauraciones de
las mutaciones de 2.10 se hicieron con `cp` desde una copia de respaldo en el scratchpad, no con
`git`).

**Línea base de referencia:** `npx vitest run` (todo el repo, antes de tocar ningún archivo de
esta fase): **75 archivos de prueba, 896 pruebas, todas en verde**. Al final de la fase (con
`test:coverage`, que corre la misma suite con cobertura): **76 archivos, 911 pruebas** (+1 archivo
nuevo, `useCancelarReserva.test.tsx`; +15 pruebas: 2 en `api.test.ts`, 7 en
`useCancelarReserva.test.tsx`, 3 en `ReservasTabla.test.tsx`, 3 en `ReservasPage.test.tsx`).

### Tareas completadas

- [x] 2.1 (Rojo) `api.test.ts`: dos casos nuevos en un `describe` «cancelaciones (HU-M5-04-05)»,
  con `vi.spyOn(clienteHttp, 'post')` (mismo patrón que `modificarReserva`):
  `cancelarReservaAnticipada(1)` llama con `'/reservas/1/cancelar-anticipada'` y `{}`;
  `cancelarReservaPorAusencia(2)` llama con `'/reservas/2/cancelar-por-ausencia'` y `{}`. Falló
  con `TypeError: cancelarReservaAnticipada is not a function` (y el equivalente para la otra),
  confirmado abajo.
- [x] 2.2 (Rojo) Creado `useCancelarReserva.test.tsx`, patrón de `useBajaMesa.test.tsx`
  (`renderHook` con `ConfirmContext.Provider` + `ToastContext.Provider`, `confirmar = vi.fn()`,
  `mostrarToast = vi.fn()`, `vi.mock('../api')`): 7 casos — por cada acción (anticipada y por
  ausencia), confirmar→llama a su función de `api.ts` con el `id`→toast `success` con su
  texto→`onCancelada` una vez (2 casos); los textos exactos pasados a `confirmar` por acción (2
  casos); un 409 con `detalle` muestra el toast `danger` «No se pudo cancelar la reserva» con ese
  `detalle` y no llama a `onCancelada`, por acción (2 casos); cancelar el diálogo no llama a
  ninguna API ni a `onCancelada`, para las dos acciones (1 caso). Falló con
  `Error: Failed to resolve import "./useCancelarReserva"` (el archivo no existe), confirmado
  abajo.
- [x] 2.3 (Rojo) `ReservasTabla.test.tsx`: `mostrar(...)` ahora exige `onCancelarAnticipada` y
  `onCancelarPorAusencia` además de `onModificar` (con `vi.fn()` por defecto); 3 casos nuevos en un
  `describe` de las dos acciones — se ofrecen solo en la fila `ACTIVA` (con `Modificar reserva`),
  ninguna de las tres en las demás filas; cada botón nuevo llama a su callback con la reserva de su
  fila. Falló: el botón `aria-label="Cancelar reserva"` (y el de «Cancelar por ausencia») no existe
  todavía, confirmado abajo.
- [x] 2.4 (Rojo) `ReservasPage.test.tsx`: `abrir()` ahora envuelve con un
  `ConfirmContext.Provider` (`confirmar = vi.fn().mockResolvedValue(aceptado)`, `aceptado = true`
  por defecto, patrón `renderConConfirmacion` de `SalonPage.test.tsx`) y devuelve el mock; además de
  `ToastContext.Provider`, sin cambiar las pruebas existentes. Nuevo `describe('ReservasPage:
  cancelar una reserva (HU-M5-04-05)')` con 3 casos: confirmar «Cancelar reserva» llama a
  `cancelarReservaAnticipada(1)` y pide el listado otra vez (2 llamadas a `listarReservas`);
  confirmar «Cancelar por ausencia» llama a `cancelarReservaPorAusencia(1)` e igual; un 409 no
  vuelve a pedir el listado (`listarReservas` sigue en 1 llamada). Falló con `TypeError: Cannot read
  properties of undefined (reading 'mockResolvedValue')` (las dos funciones de `api.ts` no
  existían todavía desde el mock de `vi.mock('../api')`); las 23 pruebas preexistentes del archivo
  siguieron en verde con el `ConfirmContext.Provider` nuevo, confirmado abajo.
- [x] 2.5 (Verde) `api.ts`, después de `modificarReserva`: `cancelarReservaAnticipada(id)` y
  `cancelarReservaPorAusencia(id)`, cada una `clienteHttp.post<Reserva, Record<string,
  never>>(url, {})`, código idéntico a la Decisión 35 del diseño (copiado del patrón de
  `salon/api.ts:18` y `atencion/api.ts:50`). Pasa 2.1 (12/12 en `api.test.ts`).
- [x] 2.6 (Verde) Creado `useCancelarReserva.ts` con el código exacto de la Decisión 36 del
  diseño: tipo `Cancelacion`, constantes `ANTICIPADA` y `POR_AUSENCIA` con los textos de S52,
  función privada `cancelar` y el hook `useCancelarReserva({ onCancelada })` que devuelve
  `{ cancelando, cancelarAnticipada, cancelarPorAusencia }`. Pasa 2.2 (7/7).
- [x] 2.7 (Verde) `ReservasTabla.tsx` (Decisión 37): `ReservasTablaProps` suma
  `onCancelarAnticipada` y `onCancelarPorAusencia`, obligatorias; `columnaAcciones` recibe un
  objeto `AccionesDeFila` (`Pick<ReservasTablaProps, 'onModificar' | 'onCancelarAnticipada' |
  'onCancelarPorAusencia'>`) y, dentro de la misma condición `r.estado === 'ACTIVA'` que ya ocultaba
  «Modificar reserva» (sin duplicarla), agrega un `<div className="flex justify-end gap-1">` con
  los botones `aria-label="Cancelar reserva"` (`CalendarX`) y `aria-label="Cancelar por ausencia"`
  (`UserX`), ambos con `aria-hidden="true"` en el ícono. Pasa 2.3 (11/11).
- [x] 2.8 (Verde) `ReservasPage.tsx` (Decisión 38): `ListadoDelDiaProps` suma
  `onCancelarAnticipada` y `onCancelarPorAusencia` y `ListadoDelDia` las pasa a `ReservasTabla`;
  `ReservasPage` instancia `useCancelarReserva({ onCancelada: listado.reservas.recargar })` y
  conecta `onCancelarAnticipada={(reserva) => void cancelarAnticipada(reserva)}` y el equivalente
  para `cancelarPorAusencia`, mismo patrón que `onEliminar={(mesa) => void eliminar(mesa)}` de
  `SalonPage.tsx:104`. Pasa 2.4 (26/26, incluidas las 23 preexistentes). Suite completa de
  `src/modules/reservas`: 12 archivos, 242 pruebas, todas en verde.
- [x] 2.9 (Refactor) Revisado `useCancelarReserva.ts` y `ReservasTabla.tsx`: los textos de S52
  están solo en `ANTICIPADA` y `POR_AUSENCIA` (la prueba los repite solo para comparar, como pide
  la tarea); `r.estado === 'ACTIVA'` aparece una sola vez en `ReservasTabla.tsx`, compartida por las
  tres acciones (no se duplicó). Sin cambios de comportamiento necesarios: el código ya coincidía
  con las Decisiones 36 y 37 del diseño. Suite de `src/modules/reservas` reconfirmada en verde
  (12 archivos, 242 pruebas) después de la revisión.
- [x] 2.10 Mutaciones, una por vez, restauradas a mano desde una copia de respaldo en el
  scratchpad (`cp`, no `git restore`): ver evidencia abajo. Las tres hicieron fallar la prueba
  esperada; los dos archivos quedaron restaurados byte a byte (`diff` contra el respaldo sin
  salida) después de cada mutación.
- [x] 2.11 Verificación completa con `V-FRONT` (ver evidencia abajo): `npm run format` reformateó
  1 archivo (`ReservasTabla.tsx`, cosmético: re-wrap de la línea larga de `columnas={[...]}`);
  después `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage &&
  npm run build`, todo en verde.

### Evidencia RED → GREEN

**RED, tarea por tarea** (confirmado arriba, uno por uno con `npx vitest run <archivo>` al crear
cada prueba, antes de escribir el código de producción correspondiente):

| Tarea | Archivo | Comando | Resultado RED |
| --- | --- | --- | --- |
| 2.1 | `api.test.ts` | `npx vitest run src/modules/reservas/api.test.ts` | 2 failed / 10 passed — `TypeError: cancelarReservaAnticipada is not a function` (y el equivalente para `cancelarReservaPorAusencia`) |
| 2.2 | `useCancelarReserva.test.tsx` | `npx vitest run src/modules/reservas/components/useCancelarReserva.test.tsx` | 1 archivo falló al resolver, `Error: Failed to resolve import "./useCancelarReserva"` (0 pruebas corridas: el archivo no existe) |
| 2.3 | `ReservasTabla.test.tsx` | `npx vitest run src/modules/reservas/components/ReservasTabla.test.tsx` | 3 failed / 8 passed — los botones `aria-label="Cancelar reserva"` y `"Cancelar por ausencia"` no se encuentran (`TestingLibraryElementError`) |
| 2.4 | `ReservasPage.test.tsx` | `npx vitest run src/modules/reservas/pages/ReservasPage.test.tsx` | 3 failed / 23 passed — `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')`; las 23 preexistentes siguieron en verde con el `ConfirmContext.Provider` nuevo |

**GREEN, tarea por tarea** (mismo comando, después de escribir cada pieza de código):

| Tarea | Comando | Resultado GREEN |
| --- | --- | --- |
| 2.5 | `npx vitest run src/modules/reservas/api.test.ts` | 12/12 passed |
| 2.6 | `npx vitest run src/modules/reservas/components/useCancelarReserva.test.tsx` | 7/7 passed |
| 2.7 | `npx vitest run src/modules/reservas/components/ReservasTabla.test.tsx` | 11/11 passed |
| 2.8 | `npx vitest run src/modules/reservas/pages/ReservasPage.test.tsx` (implícito en la corrida completa de 2.8) | 26/26 passed |
| 2.8 (completa) | `npx vitest run src/modules/reservas` | 12 archivos, 242 passed |
| 2.9 (post-refactor) | `npx vitest run src/modules/reservas` | 12 archivos, 242 passed (sin cambios de resultado) |

### Mutaciones (2.10)

Copias de respaldo: `scratchpad/ReservasTabla.tsx.backup` y `scratchpad/useCancelarReserva.ts.backup`
(no versionadas, fuera del repositorio).

| Mutación | Archivo | Cambio | Comando enfocado | Resultado |
| --- | --- | --- | --- | --- |
| (a) | `ReservasTabla.tsx` | La condición compartida `r.estado === 'ACTIVA'` de la columna de acciones se cambió a `true` (afecta a los tres botones, incluidos los dos nuevos: el diseño comparte una sola condición para las tres acciones, Decisión 37) | `npx vitest run src/modules/reservas/components/ReservasTabla.test.tsx` | **2 failed** (`se ofrecen solo en las filas ACTIVA` del `describe` nuevo y `se ofrece solo en las filas ACTIVA` de «Modificar reserva», que comparten la misma condición mutada) |
| (b) | `useCancelarReserva.ts` | Se quita `if (!aceptado) return;` de `cancelar` | `npx vitest run src/modules/reservas/components/useCancelarReserva.test.tsx` | **3 failed** (el caso «cancelar el diálogo… no llama a ninguna API», que la tarea pedía cubrir, y dos casos más que la mutación rompió de paso al intentar leer `respuesta.exito` de una llamada nunca simulada) |
| (c) | `useCancelarReserva.ts` | `ANTICIPADA.llamar` pasa de `cancelarReservaAnticipada` a `cancelarReservaPorAusencia` (intercambio de endpoints) | `npx vitest run src/modules/reservas/components/useCancelarReserva.test.tsx` | **2 failed** (los dos casos de «cancelación anticipada» que esperaban que se llamara a `cancelarReservaAnticipada`) |

Restaurado con `cp scratchpad/<archivo>.backup <archivo>` después de cada mutación; `diff` contra
el respaldo no mostró diferencias tras cada restauración (confirmado tarea por tarea, no solo al
final). Suite de `src/modules/reservas` reconfirmada en verde (12 archivos, 242 pruebas) después de
restaurar la última mutación, antes de seguir a 2.11.

### Verificación completa (2.11)

Línea base del repo completo antes de tocar cualquier archivo de esta fase:
`npx vitest run` → **75 archivos de prueba, 896 pruebas, todas en verde** (duración 43.44 s).

`V-FRONT`, en orden, desde `frontend/`:

- `npm run format`: reformateó **1 archivo** (`ReservasTabla.tsx`; re-wrap cosmético de la línea
  larga de `columnas={[...COLUMNAS, columnaAcciones({...})]}`, sin cambio de comportamiento).
- `npm run lint`: **0 errores, 0 advertencias** (`eslint . --max-warnings=0`, sin salida).
- `npm run format:check`: **«All matched files use Prettier code style!»**
- `npm run typecheck`: **`tsc --noEmit` sin errores.**
- `npm run test:coverage`: **76 archivos de prueba, 911 pruebas, todas en verde** (+1 archivo, +15
  pruebas sobre la línea base de 75/896). Umbral de cobertura (60 %) cumplido sin fallo (`exit
  0`); el `include` de `coverage` en `vite.config.ts` (preexistente, no tocado por esta fase) mide
  solo `src/App.tsx` y `src/shared/**`, así que el reporte de cobertura no incluye
  `src/modules/reservas/**` por diseño del proyecto — el umbral de 60 % se evalúa sobre ese alcance
  preexistente, no sobre este módulo.
- `npm run build`: **`tsc --noEmit && vite build`** — `2114 modules transformed`, build exitoso
  (`dist/assets/ReservasPage-DJoR0MPJ.js`, 16.80 kB), sin errores.

Ningún comando requerido falló; ninguna prueba conocida falla en la base
(`Known environmental failures: None` del encargo, confirmado con la línea base de 75/896 antes de
empezar).

### Archivos tocados

| Archivo | Acción | Qué se hizo | Líneas (`git diff --numstat`, agregadas/quitadas) |
| --- | --- | --- | --- |
| `frontend/src/modules/reservas/api.ts` | Modificado | `cancelarReservaAnticipada`, `cancelarReservaPorAusencia` | +16 / -0 |
| `frontend/src/modules/reservas/api.test.ts` | Modificado | 2 pruebas nuevas de las dos funciones | +38 / -1 |
| `frontend/src/modules/reservas/components/useCancelarReserva.ts` | Creado | Hook de la Decisión 36 | +72 / -0 |
| `frontend/src/modules/reservas/components/useCancelarReserva.test.tsx` | Creado | 7 pruebas del hook | +148 / -0 |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx` | Modificado | Dos props y dos botones en la fila `ACTIVA` | +47 / -11 |
| `frontend/src/modules/reservas/components/ReservasTabla.test.tsx` | Modificado | 3 pruebas nuevas de visibilidad y callbacks | +52 / -3 |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` | Modificado | Hook y conexión con la tabla | +21 / -2 |
| `frontend/src/modules/reservas/pages/ReservasPage.test.tsx` | Modificado | `ConfirmContext.Provider` en `abrir()` y 3 pruebas de los dos flujos de cancelación | +56 / -7 |
| `openspec/changes/HU-M5-04-05/tasks.md` | Modificado | Tareas 2.1 a 2.11 marcadas `[x]` |  |
| `openspec/changes/HU-M5-04-05/apply-progress.md` | Modificado | Esta sección, agregada después de «Fase 1» |  |

**Total autorado (código + pruebas de este módulo, sin los dos archivos de Markdown):** 450
líneas agregadas, 24 quitadas (`git diff --numstat` sobre los archivos modificados + el conteo de
líneas de los dos archivos nuevos) = **474 líneas**. Dentro del pronóstico del diseño/tareas (350 a
490 para este lado); no se pidió `size:exception`.

### No tocado (confirmado)

`types.ts` y `components/index.ts` del módulo `reservas`: sin cambios (Decisión 35 — `Reserva` y
`EstadoReserva` ya cubren la respuesta; Decisión 36 — `useCancelarReserva` se importa directo de
`../components/useCancelarReserva`, igual que `SalonPage` importa `useBajaMesa`, sin pasar por
`components/index.ts`, que solo exporta componentes). Ningún archivo de `salon/`, `atencion/` ni
`shared/` (frontend). El código de selección de cliente del PR #212 (`SelectorCliente`,
`useBuscarClientes`) no se tocó: se leyó para no reorganizarlo, y la nueva conexión de cancelación
se agregó al lado, sin modificar su lógica ni sus props.

### Desviaciones del diseño

Ninguna. El código de `api.ts` y `useCancelarReserva.ts` quedó idéntico al de las Decisiones 35 y
36 del diseño (textos de S52, endpoints y estructura del hook, tal cual). `ReservasTabla.tsx` y
`ReservasPage.tsx` siguen exactamente las Decisiones 37 y 38 (misma condición de visibilidad,
mismo patrón `void cancelarAnticipada(reserva)` que `onEliminar` de `SalonPage.tsx`). Los textos
exactos de S52 (títulos, descripciones, `textoConfirmar`/`textoCancelar`, avisos de éxito y el
`Supuesto:` del título del aviso de error) quedan pendientes de validación del equipo en P.3, como
indica el diseño; no se cambió nada en este lote a la espera de esa validación.

### Trabajo pendiente de esta fase

- [ ] 2.12 Commit 2 (lo hace quien orquesta el cambio; este lote de `apply` no ejecuta git en
  ninguna forma, ni `add`, ni `commit`, ni `restore`).

### Próximo paso

Fase 3 (cierre, 3.1 y 3.2): verificación completa de punta a punta sobre el árbol final de las dos
fases y el chequeo de aislamiento (`git diff --name-only` contra la base del PR y `lint-imports`),
después de que el commit 2 (2.12) quede hecho.
