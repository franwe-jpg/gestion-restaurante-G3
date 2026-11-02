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
