# Tareas: HU-M5-06 Crear una comanda a partir de una reserva

- **Issue:** [#68](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/68) (HU-M5-06). **Rama:**
  `feature/HU-M5-06-comanda-desde-reserva`, creada desde `origin/develop`. **Entrada:** `proposal.md`
  (alcance A y B, orden de verificaciones, supuestos S1 a S8), `specs/reservas-gestion/spec.md` (20
  requisitos, 81 escenarios, 11 marcados «[Integración, condicionado a B1 y B2]»; supuestos S53 a S65) y
  `design.md` (Decisiones 50 a 61). Un solo cambio, una rama y un PR hacia `develop` (AGENTS.md §4,
  estrategia `single-pr`).
- **Strict TDD activo** (`openspec/config.yaml`). Backend: `pytest` desde `backend/` (cobertura >= 70 %).
  Frontend: Vitest, `npm test` (cobertura >= 60 %). Cada tarea de código se planifica en orden **Rojo**
  (prueba que falla, y se comprueba que falla por el motivo correcto) -> **Verde** (el código mínimo que la
  pasa) -> **Refactor** (limpieza con las pruebas en verde). Una tarea no se cierra sin evidencia
  observada: el campo `Evidencia:` de cada tarea queda vacío y lo completa `sdd-apply` con el comando y
  el resultado real.
- **Una unidad de trabajo = un commit** (skill `work-unit-commits`): código, pruebas y documentación
  juntos, y el repositorio queda en verde. Conventional Commits en español con el ID `HU-M5-06`, sin líneas
  de coautoría ni atribución de IA. Tipos: `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR, sin PR
  encadenados. Los commits los hace la persona o el agente con su confirmación explícita (AGENTS.md §8).
- **Tareas de la persona y tareas del agente.** Las tareas 0.2 a 0.6, 6.1, 6.8 y las `P.*` son de la
  persona (no son código). El resto las ejecuta `sdd-apply`. Una tarea marcada **BLOQUEADA** no se empieza
  hasta que se cumpla la dependencia que nombra.
- **Aislamiento (AGENTS.md §9.3).** Fases 1 a 4: todo el trabajo queda dentro de
  `backend/app/modules/reservas/`, `backend/tests/modules/reservas/`, `frontend/src/modules/reservas/` y
  esta carpeta de `openspec/`. Ninguna de esas fases toca los módulos atencion y salon, las carpetas shared
  (backend ni frontend), el archivo de configuración del backend ni las migraciones de Alembic. Sin
  migración. **Únicamente la Fase 5** (B1 a B3) edita el módulo atencion y el contrato compartido del
  backend, y solo con el acuerdo explícito de M4 (tarea 0.2), en commits separados.
- **Reloj de las pruebas del backend:** `AHORA = datetime(2026, 11, 2, 12, 0)` (fixture `reloj`, autouse,
  `backend/tests/modules/reservas/conftest.py`): «hoy» es `2026-11-02`. `fabrica_reserva(mesa_id=...,
  fecha=..., hora=..., estado=...)` ya acepta `fecha` y `estado`; `DoblePuente` ya ofrece las mesas 5 y 6
  `LIBRE` y el cliente 7 (confirmado en el código).
- **Matriz de amenazas:** N/A (el diseño la marca como no aplicable: ruta HTTP de la API en proceso, modal y
  hook; sin procesos, shell ni VCS; consultas parametrizadas con SQLAlchemy).
- **Comandos de referencia** (se citan por nombre en las tareas). El backend se corre en Docker, como en los
  otros cambios; el frontend, desde `frontend/` en el equipo (o con `docker compose run --rm frontend ...`).
  - `V-BACK-ENF` (enfocado, sin cobertura):
    `docker compose run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp backend pytest --no-cov -q -p no:cacheprovider tests/modules/reservas`
  - `V-BACK-FIX` (corrige estilo):
    `docker compose run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp backend sh -c "ruff check --fix . && ruff format ."`
  - `V-BACK` (lo que valida la CI, cobertura >= 70 %):
    `docker compose run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp backend sh -c "ruff check . && ruff format --check . && lint-imports && pytest -p no:cacheprovider"`
  - `V-ALEMBIC`: `docker compose run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp backend alembic heads`
    (un único head, igual que antes del cambio).
  - `V-FRONT-ENF` (desde `frontend/`): `npx vitest run src/modules/reservas`
  - `V-FRONT` (desde `frontend/`): `npm run format` y luego
    `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`
    (cobertura >= 60 %, 0 advertencias).
  - `MEDIR` (punto de control de revisión; desde la raíz, sin los artefactos de SDD):
    `git diff --shortstat origin/develop...HEAD -- backend/` y `git diff --shortstat origin/develop...HEAD -- frontend/`
    (se mide cada lado por separado contra 800 líneas; AGENTS.md §4).
  - Equivalente del backend usado en cambios anteriores: imagen `g3-backend-test`, `--network none`,
    `backend/` montado en `/app`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | backend ≈ 550 a 755 (hasta ≈ 650 a 935 si B1 a B3 entran en este PR); frontend ≈ 620 a 850; total ≈ 1 170 a 1 605 (hasta ≈ 1 785 con B), sin los artefactos de SDD en Markdown |
| 400-line budget risk | High |
| Chained PRs recommended | No: una HU nunca se divide en varios PR (AGENTS.md §4) |
| Suggested split | un solo PR hacia `develop`; seis commits de unidad de trabajo (0, 1, 2, 3, 4 y 6), más el de documentación final y los de M4 si corresponden |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Lectura del pronóstico:

- El presupuesto genérico de 400 líneas se supera con holgura. La política del proyecto lo cubre: el punto
  de control es de **800 líneas por lado** (backend y frontend se miden por separado) y es una guía para
  mirar cómo va el cambio, **no un bloqueo ni una razón para dividir la HU** (AGENTS.md §4; `openspec/config.yaml`,
  `rules.tasks`). Por eso `Chained PRs recommended` es `No` y la cadena es `size-exception`.
- La decisión pendiente antes de apply es solo confirmar esa excepción de tamaño. Se confirma junto con la
  revisión previa a apply que ya exige AGENTS.md §4 y las tareas 0.2 a 0.5: no agrega una parada nueva.
- La estimación del diseño (backend 530 a 725, frontend 620 a 850) supera la de la propuesta (300 a 450 y 450 a
  600) porque incluye el doble, la validación local y las pruebas de integración. El frontend puede quedar
  apenas por encima de 800 y el backend se acerca si entra B. **No se recortan pruebas** ni se divide el
  cambio para entrar en el número; se anota en el PR (tarea P.6).
- **Dónde se mide:** la tarea **4.3** mide el lado backend y el lado frontend de lo ejecutable ahora (con
  `MEDIR`); las tareas 2.4 y 3.17 dejan una medición parcial; la tarea **6.10** repite la medición con B
  (si entró) y con las pruebas de integración; la tarea **P.6** vuelca las cifras finales en la nota de
  tamaño del PR.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 0 | Artefactos de planificación aprobados (propuesta, spec, diseño, tareas) | PR único | N/A (solo Markdown) | N/A: sin código; se comprueba que los cuatro archivos existan en la carpeta del cambio | Revertir el commit de documentación |
| 1 | Backend: puente, esquema de entrada y `service.crear_comanda` contra el doble | PR único | `pytest --no-cov -q tests/modules/reservas` (V-BACK-ENF) | `TestClient` y SQLite temporal por prueba (fixtures `db`, `cliente`), con el doble del puente | `puente.py`, `schemas.py`, `service.py`, `conftest.py` y sus pruebas, sin tocar el router |
| 2 | Backend: `POST /reservas/{id}/comanda` | PR único | `pytest --no-cov -q tests/modules/reservas/test_router.py` (dentro de V-BACK-ENF) | `TestClient` con el doble: 201, 404, 409, 422 y 500 de punta a punta, sin M4 real | `router.py` y `test_router.py` (el service sigue válido solo) |
| 3 | Frontend: tipos, `api.ts`, validación local y hook | PR único | `npx vitest run src/modules/reservas` (V-FRONT-ENF) | Vitest + Testing Library con la API simulada (`vi.mock('../api')`) | Los archivos nuevos y las funciones agregadas a `api.ts` y `types.ts` |
| 4 | Frontend: modal, acción por fila y conexión en la página | PR único | `npx vitest run src/modules/reservas` (V-FRONT-ENF) | Vitest + Testing Library: página completa con la API simulada | `ReservasTabla.tsx`, `ReservasPage.tsx`, modal e `index.ts` |
| 5 | (Condicionada a 0.2) B1 y B2/B3 en M4 y `shared/`, en commits separados | PR único | `pytest --no-cov -q tests/modules/atencion tests/shared` | SQLite real con M3 sembrado y los puertos de M4 | Cada commit de M4 por separado; el endpoint general de comandas no cambia |
| 6 | (BLOQUEADA por B1 y B2) Puente real e integración con SQLite real | PR único | `pytest --no-cov -q tests/modules/reservas/test_puente.py tests/modules/reservas/test_integracion_comanda.py` | SQLite real con M3, M4 y M1 sembrados; humo manual con `docker compose up --build` | `test_puente.py` y `test_integracion_comanda.py` (solo pruebas) |

Estado: las unidades 1 a 4 son **ejecutables ya**. Las unidades 5 y 6 y la apertura del PR dependen de M4.

## Divergencias entre la spec y el diseño que estas tareas resuelven (a confirmar en 0.5)

El diseño avisa que la spec se escribió en paralelo y se reconcilia después. Estas tareas toman la columna
«Se adopta» salvo que la persona indique otra cosa en 0.5; los artefactos no se editan desde esta fase.

| # | Punto | Spec | Diseño | Se adopta en estas tareas |
| --- | --- | --- | --- | --- |
| D1 | Operación del puente | `puente.crear_comanda_sin_confirmar(db, datos: ComandaCrear)`; el `service` arma el DTO. La spec llama al nombre «de referencia: el diseño lo fija» | `puente.crear_comanda_de_reserva(db, mesa_id, reserva_id, detalles, observaciones)`; el puente arma el `ComandaCrear` (Decisión 53: antes de B1 `reserva_id` se ignoraría en silencio) | **Diseño.** El escenario «El service llama al puente y se puede sustituir» se prueba con un doble que recibe `mesa_id` 5, `reserva_id` 10, los detalles y las observaciones, no un `ComandaCrear` |
| D2 | Texto del 409 de reserva cancelada | «La reserva {id} ya fue cancelada» (S61, el mismo de HU-M5-04-05) | «La reserva {id} fue cancelada y no se puede atender» | **Spec** (el diseño dice que los textos los fija la spec) |
| D3 | Observaciones en el modal | El modal no las pide (S64) | Un `Textarea` y `observaciones` en el hook | **Spec.** El tipo de entrada conserva `observaciones?` opcional, pero la pantalla no la envía |
| D4 | Textos del modal | «Guardar comanda», «Producto {n} (ID)», «Cantidad {n}», «Quitar producto {n}», «Mesa n.º {id}» (S64) | «Crear comanda» como botón de envío, «Producto (número)», «Quitar» | **Spec** |
| D5 | Aviso de error | Aviso `danger` con el título «No se pudo crear la comanda» y el `detalle` como descripción | `Alert variant="danger"` dentro del modal, sin título | **Ambos:** `Alert variant="danger"` con `titulo="No se pudo crear la comanda"` dentro del modal, que queda abierto |
| D6 | Resumen de la reserva (hora y cliente) en el modal | No figura | Figura | **Se omite** (la spec no lo pide) |
| D7 | Descripción del aviso de éxito | Solo «Comanda n.º {id} creada» | Agrega «La reserva quedó atendida.» | **Spec:** solo el título |
| D8 | `precio_unitario` del doble | 100.00 | 1000.00 | **Spec** (100.00); ningún escenario lo comprueba |
| D9 | Reloj del escenario «“Hoy” es el de la zona del restaurante» | `2026-11-03 02:30` UTC | La fixture real usa `INSTANTE_UTC = 2026-11-02 02:30` UTC (`2026-11-01 23:30` en el restaurante) | **Fixture real:** la reserva del `2026-11-01` se atiende y la del `2026-11-02` responde 409 |

## Paralelismo y orden

- La **Fase 0** es de la persona y corre en paralelo con las Fases 1 a 3, con dos puertas: **0.3** (S53 y S57)
  se resuelve antes de empezar la Fase 1; **0.4** (textos de pantalla, S64) se resuelve antes de la Fase 3.
- **Secuencial:** Fase 1 -> Fase 2 (el router usa el `service`). Dentro de la Fase 3, la unidad 3 (tareas 3.1
  a 3.8) va antes que la unidad 4 (3.9 a 3.18): el modal usa el hook.
- **Paralelo:** la Fase 3 (frontend, API simulada) no depende de las Fases 1 y 2 y puede hacerse en paralelo con
  ellas.
- **Fase 4** cierra lo ejecutable ya y depende de las Fases 1 a 3.
- **Fase 5** (B1 a B3 dentro de este PR) es opcional y condicionada a 0.2. **Fase 6** depende de las Fases 1
  y 2 y de que B1 y B2 estén en `develop` o en esta rama (Fase 5). **Fase 7** (PR) depende de todo lo anterior.

```text
0.x (persona) ........ en paralelo ........
1 -> 2 ----\
3 (3.1-3.8 -> 3.9-3.18) ---> 4 ---> [BLOQUEO: B1 y B2 en develop] ---> 6 ---> P.*
                             5 (solo si M4 acuerda que lo hace esta persona) --^
```

## Fase 0. Coordinación y decisiones previas (tareas de la persona)

- [x] 0.1 Comprobaciones previas (AGENTS.md §3), persona o agente con confirmación: la rama actual es
  la de la cabecera (feature/HU-M5-06-comanda-desde-reserva) y no `main` ni `develop`; las dependencias del issue #68
  («Depende de») están cerradas (HU-M4-04, crear comanda, ya está en `develop` según la propuesta);
  `git status` limpio salvo esta carpeta de `openspec/`; la imagen de Docker del backend arma
  (`docker compose build backend`); se registra el head de partida con `V-ALEMBIC` para compararlo en 1.15.
  - Evidencia (2026-11-09): rama `feature/HU-M5-06-comanda-desde-reserva` (no `main` ni `develop`), 0 commits sobre
    `origin/develop` y `develop` sin cambios tras `git fetch`; issue #52 (HU-M4-04 Crear una comanda) en estado
    CLOSED; `git status --short` solo muestra `?? openspec/changes/HU-M5-06/`; `V-ALEMBIC` ejecutó en Docker (la
    imagen del backend arma) y devolvió un único head, `a9c1e3f5b7d9 (head)`.
- [x] 0.2 **Coordinación con M4** (persona; no es código). Confirmar por escrito con Juan Ignacio Riquelme
  (responsable de M4) y Franco Martín Soler (a quien el plan reasignó HU-M4-04 y que también modificó
  `atencion/service.py` (read-only)); un pulgar arriba en el grupo no cuenta como acuerdo sobre quién lo hace
  (propuesta, «Excluido»):
  - (a) **Quién implementa B1, B2 y B3** (propuesta, tabla de la sección B; Decisión 55). Si lo hace esta
    persona, se ejecuta la Fase 5 en commits separados; si lo hace M4, se omite la Fase 5 y el PR espera al
    de M4.
  - (b) **La forma de B2.** Firma propuesta: `crear_comanda_sin_confirmar(db, datos: ComandaCrear) ->
    ComandaSalida`, con `flush` en lugar de `commit`. Alternativa de M4 (por ejemplo, un parámetro `confirmar:
    bool = True` en `crear_comanda`): solo cambia el cuerpo de la función del puente (Decisión 53).
  - (c) **Requisito no negociable de B2:** que la primitiva **no haga `commit` ni `rollback`** y que **deje
    subir el `IntegrityError` del `flush` sin traducirlo** (Decisión 55, punto 2), para que M5 lo traduzca en
    su propio `rollback` (Decisión 52). `crear_comanda` conserva su `commit`, su `rollback` y su traducción
    a `ComandaAbiertaError` para el alta general.
  - (d) **Choque con el PR #230** (HU-M4-06), que según la propuesta edita `atencion/service.py` (read-only):
    definir el orden de integración (B2 es aditiva; integrar después de #230 o rebasar sobre él).
  - (e) **Ampliación del DTO compartido por B1:** `reserva_id` en `ComandaCrear`
    (`backend/app/shared/contratos/comanda.py` (read-only)) hace que `POST /api/v1/comandas` también acepte
    `reserva_id`. Decidir si el endpoint general lo ignora, lo rechaza o lo admite (la propuesta no lo cubre).
  - (f) **ID de tarea para los commits de M4** (por ejemplo `HU-M4-04`) y proveedores de los puertos dentro de
    M4 (B3), para no importar `atencion.adaptadores` desde M5 (AGENTS.md §9.4).
  - (g) Informar, sin pedir cambio: el texto en inglés de `ComandaAbiertaError` («An ABIERTA Comanda already
    exists for this Mesa») y de los mensajes de cotización, que aparecerán en el flujo de M5 (paso 7); y que el
    doble de S2-01 (`backend/tests/shared/fakes/comanda.py` (read-only)) modela `comanda_id`, superado por S54.
  - Salida: el acuerdo queda escrito (mensaje o comentario) y se cita en el PR (tarea P.2). Bloquea las Fases
    5 y 6 y la apertura del PR; **no bloquea** las Fases 1 a 4.
  - Evidencia (2026-11-11): **cumplida de hecho por el PR #236**, no por un acuerdo escrito previo. Franco
    Martín Soler lo mergeó en `develop` (2026-11-10T11:38:29Z, merge `760dfce`; ya está en esta rama por el
    merge `ae68602`) con la interfaz de M4 `atencion.service.crear_comanda_para_reserva(db, datos:
    ComandaCrear, reserva_id: int) -> ComandaSalida`. Frente a los puntos de arriba: (a) lo implementó M4, así
    que la Fase 5 no aplica; (b) la forma es otra (nombre `crear_comanda_para_reserva` y `reserva_id` como
    argumento aparte, no dentro de `ComandaCrear`) y solo cambia el cuerpo del puente (6.3); (c) cumple: no
    hace `commit` ni `rollback` y deja subir el `IntegrityError` sin traducir (lo comprueba la prueba de
    integración de la comanda duplicada, 6.4); (e) B1 no se hizo, así que `POST /comandas` no cambia. **Salvedad:
    no hay un acuerdo escrito de Juan Ignacio Riquelme; «queda pendiente la revisión de Juan, pedida en el
    PR».** Se cita en el PR (P.2). Ver la adenda 2026-11-11 de `design.md`.
- [x] 0.3 **Validación del equipo de S53 (S1 de la propuesta) y S57 (S5 de la propuesta)** (persona), antes de
  empezar apply. S53: «al menos un producto» se lee en forma literal (un pedido solo de menús responde 422).
  S57: «se advierte» una reserva de otra fecha significa rechazar con 409. Cada regla vive aislada
  (`_validar_al_menos_un_producto` y la última condición de `_obtener_atendible`). Si el equipo elige otra
  lectura, **se vuelve a la spec** antes de apply: con la lectura genérica de S53 se eliminan 1.7, 1.8 y las
  pruebas del paso 6 (2.1); con el aviso no bloqueante de S57 hace falta un requisito nuevo que defina cómo
  lo confirma la persona (ninguna fuente lo define). Si la persona decide avanzar sin respuesta, rige la
  lectura adoptada y queda anotado en el PR (P.2).
  - Evidencia (2026-11-09): Federico decidió avanzar con las lecturas adoptadas de S53 y S57 («si» a arrancar
    las Fases 1 a 4 con S53 y S57 «como están»). **El equipo no respondió**: no hay validación de nadie más.
    Queda para anotar en el PR (P.2).
- [ ] 0.4 **Validación del resto de los supuestos** (persona): S64 (textos y comportamientos de la pantalla)
  **antes de la Fase 3**, porque fija etiquetas, avisos y comportamiento del modal; S54, S55, S56, S58, S59,
  S60, S61, S62, S63 y S65 y las contradicciones C1 a C3, antes del PR. Si cambia algún texto, el ajuste
  queda en el hook y el modal (3.6 y 3.10) y en sus pruebas (3.5 y 3.9), sin tocar el backend; si cambia un
  mensaje del backend (S61), queda en `_obtener_atendible` y en las pruebas de 1.5, 1.9 y 2.1.
  - Evidencia (2026-11-09): **parcial, la tarea sigue abierta.** S64 (textos de la pantalla) se adopta por
    defecto tal como está en la spec para poder empezar la Fase 3; nadie del equipo la validó. S54, S55, S56,
    S58 a S63, S65 y C1 a C3 siguen sin validar y se validan antes del PR.
- [x] 0.5 **Reconciliar las divergencias D1 a D9** entre la spec y el diseño (tabla de arriba): la persona
  confirma la columna «Se adopta» o indica otra, y decide si se corrigen la spec y el diseño (con `sdd-spec` y
  `sdd-design`, no con esta fase). Bloquea el inicio de apply para los puntos que cambien una prueba.
  - Evidencia (2026-11-09): se adopta la columna «Se adopta en estas tareas» sin cambios. La confirmación de
    Federico fue la respuesta «si» a la pregunta de arrancar las Fases 1 a 4, después de ver el resumen de
    D1 a D9; no se corrigieron la spec ni el diseño. Si alguna divergencia cambia una prueba, se reabre.
- [x] 0.6 Commit 0 de los artefactos de planificación, después de la revisión de la persona: carpeta
  `openspec/changes/HU-M5-06/` (`proposal.md`, `specs/reservas-gestion/spec.md`, `design.md`, `tasks.md`).
  Mensaje: `docs: agrega la propuesta, la spec, el diseño y las tareas de la comanda desde una reserva (HU-M5-06)`.
  Rollback: revertir el commit (solo documentación).
  - Evidencia (2026-11-09): Commit `8a76a75` (docs): `proposal.md`, `specs/reservas-gestion/spec.md`,
    `design.md` y `tasks.md`.

## Fase 1. Backend ejecutable ya: puente, esquema y `service.crear_comanda` contra el doble (unidad 1)

Depende de 0.3 (S53 y S57) y de 0.5 en lo que cambie una prueba. Todo corre contra el doble del puente: no
requiere B1 ni B2. Allowed edit surfaces de la unidad: `backend/app/modules/reservas/puente.py`,
`backend/app/modules/reservas/schemas.py`, `backend/app/modules/reservas/service.py`,
`backend/tests/modules/reservas/conftest.py`, `backend/tests/modules/reservas/test_puente.py`,
`backend/tests/modules/reservas/test_schemas.py`, `backend/tests/modules/reservas/test_service.py`.

- [x] 1.1 (Rojo) `backend/tests/modules/reservas/test_puente.py`, pruebas del doble de la primitiva (hay
  precedente: `test_doble_puente_informa_el_mismo_estado_en_obtener_mesa_y_listar_mesas`). Importan
  `DetalleComandaCrear` y `ComandaSalida` de los contratos compartidos:
  - `test_doble_puente_crear_comanda_de_reserva_devuelve_una_comanda_abierta_y_registra_la_llamada` (ids
    consecutivos desde 1; `estado` `ABIERTA`; `mesa_id`, `reserva_id` y `observaciones` iguales a los
    recibidos; un detalle por línea en el mismo orden con `precio_unitario` `100.00`, `descuento` `0.00` y
    `estado_entrega` `PENDIENTE`; la llamada queda en `comandas` como tupla
    `(mesa_id, reserva_id, detalles, observaciones)`).
  - `test_doble_puente_crear_comanda_de_reserva_lanza_la_falla_y_no_registra_la_llamada` (atributo `falla`).
  - `test_doble_puente_crear_comanda_de_reserva_ejecuta_el_efecto_antes_de_fallar` (atributo `efecto`: una
    función que recibe la sesión; permite simular una escritura de M4 con `flush` y una sesión concurrente).
  Fallan por `AttributeError`: el doble y la función del puente todavía no existen. Allowed edit surface:
  `backend/tests/modules/reservas/test_puente.py`.
  - Evidencia (sdd-apply, 2026-11-09): 3 pruebas del doble en `test_puente.py`: 3 failed con
    `AttributeError: module 'app.modules.reservas.puente' has no attribute 'crear_comanda_de_reserva'` (Rojo
    por el motivo correcto).
- [x] 1.2 (Verde) Dos archivos. (1) `backend/app/modules/reservas/puente.py`: `crear_comanda_de_reserva(db,
  mesa_id, reserva_id, detalles, observaciones) -> ComandaSalida` con el cuerpo definitivo de la Decisión 53
  (arma `ComandaCrear(mesa_id=..., reserva_id=..., detalles=..., observaciones=...)` y delega en
  `atencion_service.crear_comanda_sin_confirmar`); importa `ComandaCrear`, `ComandaSalida` y
  `DetalleComandaCrear` de `app.shared.contratos.comanda`; el docstring del módulo menciona el lado Comanda.
  (2) `backend/tests/modules/reservas/conftest.py`: `DoblePuente` suma `comandas`, `falla` y `efecto` y el
  método `crear_comanda_de_reserva`; `puente_doble` (autouse) lo reemplaza; `CREAR_COMANDA_DE_RESERVA_REAL`
  se guarda al importar y `puente_real` la restaura. Pasa 1.1 y toda la suite existente del módulo sigue en
  verde. **Excepción de Strict TDD declarada (Decisión 53, «Antes de B2»):** el cuerpo de la función real
  llama a `crear_comanda_sin_confirmar`, que todavía no existe en M4; ninguna prueba lo ejecuta mientras el
  doble autouse lo reemplace, y su prueba en rojo es la tarea 6.2 (las tres líneas quedan sin cubrir hasta
  entonces; impacto despreciable sobre el 70 %).
  - Evidencia (sdd-apply, 2026-11-09): `puente.crear_comanda_de_reserva` y `DoblePuente` ampliado
    (`comandas`, `falla`, `efecto`; `precio_unitario` 100.00, D8). `test_puente.py` 19 passed; `V-BACK-ENF`
    356 passed. Excepción de Strict TDD declarada: el cuerpo real queda sin prueba hasta 6.2 y 6.5(a) no se
    ejecutó.
- [x] 1.3 (Rojo) `backend/tests/modules/reservas/test_schemas.py`, `ComandaDesdeReservaCrear` (Requisitos
  «Forma del pedido», «Cantidad entera mayor que cero», «La mesa sale de la reserva»):
  - `test_comanda_desde_reserva_acepta_detalles_con_observaciones_opcionales` (`observaciones` por defecto
    nulo; líneas de producto y de menú).
  - `test_comanda_desde_reserva_rechaza_detalles_ausentes_vacios_o_nulos` (`{}`, `[]` y `null`).
  - `test_comanda_desde_reserva_rechaza_cantidad_invalida` (parametrizada: `0`, `-3`, `1.5`, `"2"`, `true`,
    `null` y campo ausente; el error nombra `detalles.0.cantidad`).
  - `test_comanda_desde_reserva_rechaza_producto_no_positivo_o_no_entero` (`0`, `-1`, `2.5`, `"12"`, `true`;
    nombra `detalles.0.producto_id`).
  - `test_comanda_desde_reserva_rechaza_producto_y_menu_a_la_vez_o_ninguno` (mensaje «Indique un producto o
    un menú ejecutivo, exclusivamente»).
  - `test_comanda_desde_reserva_prohibe_campos_extra` (`mesa_id`, `reserva_id`, `estado`, `cliente_id`; S62).
  - `test_comanda_desde_reserva_no_declara_mesa_id` (no figura entre los campos del esquema).
  Fallan por `ImportError`: `ComandaDesdeReservaCrear` no existe. Allowed edit surface:
  `backend/tests/modules/reservas/test_schemas.py`.
  - Evidencia (sdd-apply, 2026-11-09): 9 funciones en `test_schemas.py`; falla de recolección `ImportError:
    cannot import name 'ComandaDesdeReservaCrear'`.
- [x] 1.4 (Verde) `backend/app/modules/reservas/schemas.py`: `ComandaDesdeReservaCrear(BaseModel)` con
  `model_config = ConfigDict(extra="forbid")`, `detalles: list[DetalleComandaCrear] = Field(min_length=1)` y
  `observaciones: str | None = None` (Decisión 54), importando `DetalleComandaCrear` de
  `app.shared.contratos.comanda` (sin editarlo). Pasa 1.3.
  - Evidencia (sdd-apply, 2026-11-09): `ComandaDesdeReservaCrear` (`extra="forbid"`, `detalles` con
    `min_length=1`); `test_schemas.py` 109 passed.
- [x] 1.5 (Rojo) `backend/tests/modules/reservas/test_service.py`, guarda para atender (pasos 2 a 5; Requisitos
  «Reserva inexistente», «Una reserva cancelada o ya atendida no se atiende», «Verificación aislada, la
  reserva es del día de hoy», «Orden de las verificaciones»). Todas llaman a `service.crear_comanda(db,
  reserva_id, PEDIDO)` con un pedido de referencia (producto 12 por 2) y comprueban que el doble no recibió
  llamadas y que la reserva no cambió:
  - `test_crear_comanda_reserva_inexistente_responde_404` (id `999`, `NoEncontradoError` «La reserva 999 no
    existe»).
  - `test_crear_comanda_reserva_cancelada_responde_409` (parametrizada con `CANCELADA_ANTICIPADA` y
    `CANCELADA_POR_AUSENCIA`: «La reserva {id} ya fue cancelada»; D2).
  - `test_crear_comanda_reserva_atendida_responde_409` («La reserva {id} ya fue atendida»).
  - `test_crear_comanda_reserva_de_otra_fecha_responde_409` (parametrizada con `2026-11-03` y `2026-11-01`:
    «La reserva {id} no corresponde al día de hoy»; sigue `ACTIVA`).
  - `test_crear_comanda_cancelada_de_otra_fecha_responde_ya_fue_cancelada` y
    `test_crear_comanda_atendida_de_otra_fecha_responde_ya_fue_atendida` (cruces de orden: escenario
    «Atendida gana a otra fecha»).
  Fallan por `AttributeError`: `service.crear_comanda` no existe. Los casos que necesitan el camino feliz
  («hoy» de la zona del restaurante y «la hora no se verifica») van en 1.9. Allowed edit surface:
  `backend/tests/modules/reservas/test_service.py`.
  - Evidencia (sdd-apply, 2026-11-09): 8 failed con `AttributeError` por `service.crear_comanda`
    inexistente.
- [x] 1.6 (Verde) `backend/app/modules/reservas/service.py`, después de `cancelar_por_ausencia`:
  `_obtener_atendible(db, reserva_id)` con el orden de la Decisión 50 (existencia 404; cancelada, atendida y
  fecha distinta de `ahora().date()`, 409), reutilizando `_obtener`, `_CANCELADAS` y `ahora()`, con los
  mensajes de la spec (D2), y un esqueleto de `crear_comanda(db, reserva_id, datos)` que solo llama a la
  guarda y termina con `raise NotImplementedError` (se completa en 1.8 y 1.10). Pasa 1.5.
  - Evidencia (sdd-apply, 2026-11-09): `_obtener_atendible` (mensajes de la spec, D2) y esqueleto de
    `crear_comanda` con `NotImplementedError`; 8 passed.
- [x] 1.7 (Rojo) `backend/tests/modules/reservas/test_service.py`, regla del paso 6 (S53; Requisito
  «Verificación aislada, el pedido incluye al menos un producto»):
  - `test_crear_comanda_solo_menus_responde_422` (`DatosInvalidosError` «La comanda debe incluir al menos un
    producto»; la reserva sigue `ACTIVA`; el doble no se llamó).
  - `test_crear_comanda_varias_lineas_de_menu_responde_422`.
  - `test_crear_comanda_solo_menus_gana_a_los_errores_de_m4` (doble con `falla`: se responde 422 y el doble no
    fue invocado).
  - `test_crear_comanda_cancelada_con_solo_menus_responde_409` y
    `test_crear_comanda_otra_fecha_con_solo_menus_responde_409` (escenario «Otra fecha gana a un pedido sin
    productos»). Estas dos protegen el orden y **pasan desde el principio**, porque la guarda ya existe; no
    pueden estar en rojo.
  Las tres primeras fallan: el esqueleto de 1.6 lanza `NotImplementedError`, no `DatosInvalidosError`.
  - Evidencia (sdd-apply, 2026-11-09): 3 failed con `NotImplementedError` (motivo anticipado por la tarea);
    las 2 pruebas de orden pasaron desde el principio, como declara la tarea.
- [x] 1.8 (Verde) `backend/app/modules/reservas/service.py`: `_validar_al_menos_un_producto(detalles)`
  (Decisión 51: `all(detalle.producto_id is None ...)` lanza `DatosInvalidosError`) y su llamada en
  `crear_comanda` justo después de la guarda. Pasa 1.7.
  - Evidencia (sdd-apply, 2026-11-09): `_validar_al_menos_un_producto`; 13 passed.
- [x] 1.9 (Rojo) `backend/tests/modules/reservas/test_service.py`, camino feliz y atomicidad (Requisitos
  «Crear una comanda desde una reserva activa de hoy», «La mesa sale de la reserva», «Errores de M4 sin cambios
  en la reserva ni en la mesa», «Atomicidad», «Una reserva genera a lo sumo una comanda», «M5 consume la interfaz
  de M4 solo a través del puente»):
  - `test_crear_comanda_reserva_activa_de_hoy_queda_atendida_y_devuelve_la_comanda` (el doble recibe una sola
    llamada con `mesa_id` 5, `reserva_id` 10 y los detalles y observaciones en el mismo orden (D1: argumentos
    sueltos, no un `ComandaCrear`); se devuelve la `ComandaSalida` `ABIERTA`; la reserva releída está
    `ATENDIDA` y conserva `mesa_id`, `cliente_id`, `fecha`, `hora` y `cantidad_personas`).
  - `test_crear_comanda_hace_un_unico_commit_despues_del_puente_y_de_atender` (espía sobre `db.commit`: una
    sola llamada, posterior a la del doble y al cambio de estado).
  - `test_crear_comanda_hereda_la_mesa_de_la_reserva` (reserva 11 en la mesa 6).
  - `test_crear_comanda_varias_lineas_con_producto_y_menu_conserva_el_orden` y
    `test_crear_comanda_un_producto_junto_a_menus_alcanza` (S53).
  - `test_crear_comanda_observaciones_son_opcionales` (`"Sin sal"` y nulo).
  - `test_crear_comanda_no_agrega_un_cliente_propio` (la `ComandaSalida` no tiene clave de cliente; el
    `cliente_id` de la reserva no cambia).
  - `test_crear_reserva_no_crea_ninguna_comanda` (`service.crear_reserva`: el doble no fue invocado).
  - `test_crear_comanda_no_consulta_la_mesa_al_puente` (espías sobre `obtener_mesa` y `listar_mesas`).
  - `test_crear_comanda_no_verifica_la_hora_de_la_reserva` (parametrizada: hoy a las `21:30` y hoy a las
    `08:00`; S63).
  - `test_crear_comanda_hoy_es_el_de_la_zona_del_restaurante` (fixture `reloj_utc_fijo`, trasladado a su
    `INSTANTE_UTC` (D9): la reserva del `2026-11-01` se atiende y la del `2026-11-02` responde 409).
  - `test_crear_comanda_segundo_envio_responde_ya_fue_atendida` (la primera llamada atiende; la segunda lanza
    «La reserva 10 ya fue atendida»; el doble tiene una sola llamada).
  - `test_crear_comanda_error_de_m4_se_propaga_y_deja_la_reserva_activa` (parametrizada con el error que lanza
    el doble: `NoEncontradoError` «El producto 99 no existe», `ReglaDeNegocioError` «El producto Milanesa está
    deshabilitado», `ReglaDeNegocioError` «La mesa 5 no está libre», `ComandaAbiertaError` y
    `NoEncontradoError` «La mesa 5 no existe»: sube la misma excepción, `db.commit` no se llamó y la reserva
    releída sigue `ACTIVA`).
  - `test_crear_comanda_error_de_m4_revierte_lo_que_m4_ya_escribio` (el `efecto` del doble hace una escritura
    con `flush` y luego falla: la escritura no queda y la sesión sigue usable).
  - `test_crear_comanda_misma_reserva_se_atiende_cuando_la_mesa_se_libera` (primero «La mesa 5 no está libre»;
    luego el doble acepta; la segunda llamada deja la reserva `ATENDIDA`).
  - `test_crear_comanda_falla_el_commit_deshace_la_sesion` (`db.commit` lanza un error de base de datos:
    se llama a `rollback`, se propaga el error y la reserva sigue `ACTIVA`).
  Fallan: el esqueleto lanza `NotImplementedError`.
  - Evidencia (sdd-apply, 2026-11-09): 21 failed con `NotImplementedError`;
    `test_crear_reserva_no_crea_ninguna_comanda` pasa desde el principio porque protege un comportamiento ya
    existente (no tenía Rojo posible).
- [x] 1.10 (Verde) `backend/app/modules/reservas/service.py`: `crear_comanda` completa según la Decisión 51:
  lee `mesa_id = reserva.mesa_id` antes del `try`; dentro del `try` llama a
  `puente.crear_comanda_de_reserva(db, mesa_id, reserva.id, datos.detalles, datos.observaciones)`, pasa la
  reserva a `ATENDIDA` y hace un único `db.commit()`; `except Exception: db.rollback(); raise`; devuelve la
  `ComandaSalida` de M4. Importa `ComandaSalida`, `DetalleComandaCrear` y `ComandaDesdeReservaCrear`. Quita
  el `NotImplementedError`. Pasa 1.9. Todavía no traduce el `IntegrityError` (1.12).
  - Evidencia (sdd-apply, 2026-11-09): `crear_comanda` completa (un solo `commit`, `rollback` ante cualquier
    error); 35 passed a la primera.
- [x] 1.11 (Rojo) `backend/tests/modules/reservas/test_service.py`, carrera sobre la mesa (Decisión 52; Requisito
  «Una reserva genera a lo sumo una comanda»):
  - `test_crear_comanda_integrity_error_con_la_reserva_activa_responde_conflicto_de_mesa` (el doble lanza un
    `IntegrityError` simulado: `ReglaDeNegocioError` «La mesa 5 ya tiene una comanda abierta»; hubo
    `rollback`; la reserva sigue `ACTIVA`).
  - `test_crear_comanda_integrity_error_con_la_reserva_atendida_por_otra_sesion_responde_ya_fue_atendida` (el
    `efecto` abre una segunda sesión con `sessionmaker(bind=db.get_bind())`, pasa la misma reserva a
    `ATENDIDA`, confirma y el doble lanza el `IntegrityError`: se responde «La reserva 10 ya fue atendida»).
  - `test_crear_comanda_integrity_error_deja_la_sesion_usable_y_sin_cambios`.
  Fallan: el `IntegrityError` sube sin traducir.
  - Evidencia (sdd-apply, 2026-11-09): 3 failed con `IntegrityError ... UNIQUE constraint failed:
    comandas.mesa_id` sin traducir.
- [x] 1.12 (Verde) `backend/app/modules/reservas/service.py`: `_conflicto_al_atender(db, reserva_id, mesa_id)`
  (Decisión 52: vuelve a evaluar `_obtener_atendible`; si ya no es atendible devuelve ese error, y si lo
  sigue siendo, «La mesa {mesa_id} ya tiene una comanda abierta») y la rama `except IntegrityError` de
  `crear_comanda` con `db.rollback()` y `raise ... from error`, antes de `except Exception`. Pasa 1.11.
  - Evidencia (sdd-apply, 2026-11-09): `_conflicto_al_atender` y rama `except IntegrityError`. Primer
    intento: 37 passed y 1 failed por la prueba, no por el código (el doble no emite SQL y con
    `expire_on_commit=False` el `rollback()` sin transacción abierta no expira nada); se corrigió el
    `efecto` de esa prueba (un SELECT previo, como haría M4 real) y el código de producción no cambio.
    Segundo intento: 38 passed.
- [x] 1.13 (Refactor) Revisar `service.py`, `puente.py` y `schemas.py`: cada función hasta 50 líneas y
  complejidad ciclomática 10 (RNF-MAN-05; el diseño estima ≈ 20 líneas y complejidad 3 para
  `crear_comanda`); `_obtener_atendible` es la única fuente de los mensajes de los pasos 3 a 5;
  `_validar_al_menos_un_producto` es la única fuente del paso 6; el `service` no importa nada de `atencion` ni
  de `salon` (solo el puente). Sin cambios de comportamiento; las pruebas de 1.1 a 1.11 siguen en verde.
  - Evidencia (sdd-apply, 2026-11-09): `ruff` sin errores de complejidad ni de sentencias; mensajes con
    fuente única; `service.py` y `schemas.py` no importan `atencion` ni `salon`; se quitaron 7 parámetros
    `puente_doble` sin uso. `V-BACK-ENF`: 418 passed.
- [x] 1.14 Mutaciones de las reglas clave, una por vez, cada una restaurada a mano desde una copia de
  respaldo del archivo (no `git restore`: nada de esta unidad está commiteado todavía) antes de la siguiente:
  (a) quitar la comparación de fecha en `_obtener_atendible` y comprobar que
  `test_crear_comanda_reserva_de_otra_fecha_responde_409` falla; (b) poner la fecha antes de la verificación
  de `ATENDIDA` y comprobar que `test_crear_comanda_atendida_de_otra_fecha_responde_ya_fue_atendida` falla;
  (c) quitar `db.rollback()` de `except Exception` y comprobar que
  `test_crear_comanda_error_de_m4_revierte_lo_que_m4_ya_escribio` falla; (d) quitar
  `_validar_al_menos_un_producto` y comprobar que `test_crear_comanda_solo_menus_responde_422` falla;
  (e) quitar la rama `except IntegrityError` y comprobar que las pruebas de 1.11 fallan. Restaurar el
  archivo original después de la quinta mutación.
  - Evidencia (sdd-apply, 2026-11-09): Cinco mutaciónes, una por vez, restauradas desde copia (sha256 de
    `service.py` idéntico antes y después): (a) 4 failed; (b) 1 failed; (c) 2 failed; (d) 3 failed; (e) 3
    failed. Todas detectadas.
- [x] 1.15 Verificar con `V-BACK-FIX` y luego `V-BACK` (ruff, formato, `lint-imports` sin cambios en los
  contratos y `pytest` con cobertura >= 70 %), más `V-ALEMBIC` (el mismo head registrado en 0.1: no hay
  migración). El existente `test_solo_el_puente_importa_salon_y_atencion` sigue en verde.
  - Evidencia (2026-11-09): Verificado por el padre sobre el árbol completo ya commiteado (unidades 1 a 4):
    `ruff check` All checks passed; `ruff format --check` 136 files already formatted; `lint-imports`
    Contracts: 10 kept, 0 broken; `pytest` 2002 passed en 9:56, cobertura 98.51 % (umbral 70 %);
    `test_solo_el_puente_importa_salon_y_atencion` en verde. `V-ALEMBIC`: `a9c1e3f5b7d9 (head)`, igual que
    en 0.1 (sin migración). Desvío de comando: se agregó `-e RUFF_CACHE_DIR=/tmp/ruff_cache` porque
    `backend/.ruff_cache` es propiedad de root por corridas previas en Docker.
- [x] 1.16 Commit 1 (unidad 1): `feat: agrega la guarda y el servicio para crear una comanda desde una reserva (HU-M5-06)`.
  Incluye `puente.py`, `schemas.py`, `service.py`, `conftest.py`, `test_puente.py`, `test_schemas.py` y
  `test_service.py` juntos. Rollback: revertir el commit; no hace falta `alembic downgrade` (sin migración).
  - Evidencia (2026-11-09): Commit `d295e59`: `puente.py`, `schemas.py`, `service.py`, `conftest.py`,
    `test_puente.py`, `test_schemas.py` y `test_service.py`; sin líneas de coautoría.

## Fase 2. Backend ejecutable ya: `POST /reservas/{reserva_id}/comanda` (unidad 2, depende de la Fase 1)

Allowed edit surfaces de la unidad: `backend/app/modules/reservas/router.py` y
`backend/tests/modules/reservas/test_router.py`.

- [x] 2.1 (Rojo) `backend/tests/modules/reservas/test_router.py`, una prueba HTTP por grupo de escenarios, con
  el doble del puente y el cliente de prueba (`cliente`). Cada error comprueba el código y el cuerpo exacto
  `{"detalle": ...}` (D-25, D-26), que la reserva siguió igual y que el doble no fue invocado:
  - **CA1 (Requisito «Crear una comanda desde una reserva activa de hoy»):**
    `test_post_comanda_de_reserva_devuelve_201_con_la_comanda_abierta_y_atiende_la_reserva` (`estado`
    `ABIERTA`, `mesa_id` 5, `reserva_id` 10, un detalle con producto 12 y cantidad 2; `GET /reservas/10`
    devuelve `ATENDIDA` con los demás campos iguales), `test_post_comanda_de_reserva_hereda_la_mesa_de_la_reserva`,
    `test_post_comanda_de_reserva_varias_lineas_con_producto_y_menu` (tres detalles en orden),
    `test_post_comanda_de_reserva_observaciones_opcionales`,
    `test_post_comanda_de_reserva_no_trae_cliente_propio_ni_agrega_comanda_id_a_la_reserva` (escenario «La
    reserva no gana ningún atributo»: las claves de `ReservaSalida` no cambian) y
    `test_post_reservas_no_crea_ninguna_comanda`.
  - **CA2:** `test_post_comanda_de_reserva_cancelada_devuelve_409` (los dos estados),
    `test_post_comanda_de_reserva_atendida_devuelve_409` y `test_post_comanda_de_reserva_doble_envio_201_y_409`.
  - **CA3 (S57):** `test_post_comanda_de_reserva_de_otra_fecha_devuelve_409` (mañana y día anterior),
    `test_post_comanda_de_reserva_hoy_es_el_de_la_zona_del_restaurante` (`reloj_utc_fijo`, D9) y
    `test_post_comanda_de_reserva_no_verifica_la_hora` (`21:30` y `08:00` responden 201).
  - **CA4 y forma del pedido (paso 1, antes de leer la reserva):**
    `test_post_comanda_de_reserva_cantidad_invalida_devuelve_422` (parametrizada: `0`, `-3`, `1.5`, `"2"`,
    `true`, `null` y ausente; el `detalle` empieza con «Datos invalidos.» y nombra `detalles.0.cantidad`),
    `test_post_comanda_de_reserva_una_linea_invalida_anula_todo_el_pedido` (`detalles.1.cantidad`; reserva
    `ACTIVA`, doble sin llamadas), `test_post_comanda_de_reserva_sin_detalles_devuelve_422` (`{}`, `[]`,
    `null`), `test_post_comanda_de_reserva_producto_y_menu_o_ninguno_devuelve_422`,
    `test_post_comanda_de_reserva_producto_id_invalido_devuelve_422`,
    `test_post_comanda_de_reserva_id_no_numerico_devuelve_422` (`POST /reservas/abc/comanda` nombra `reserva_id`) y
    `test_post_comanda_de_reserva_con_campos_extra_devuelve_422` (`mesa_id`, `reserva_id`, `estado`,
    `cliente_id`; S62).
  - **Existencia, S53 y orden:** `test_post_comanda_de_reserva_inexistente_devuelve_404`,
    `test_post_comanda_de_reserva_solo_menus_devuelve_422` (una línea y varias líneas de menú),
    `test_post_comanda_de_reserva_orden_de_las_verificaciones` (cuerpo inválido gana a reserva inexistente y a
    reserva cancelada; atendida gana a otra fecha; otra fecha gana a un pedido sin productos; un pedido sin
    productos gana a los errores de M4).
  - **Errores de M4 (paso 7) sin cambios en la reserva:** `test_post_comanda_de_reserva_error_de_m4_conserva_codigo_y_detalle`
    (parametrizada: 404 producto inexistente, 409 producto deshabilitado, 409 menú deshabilitado, 409 mesa no
    libre, 409 comanda abierta de M4, 404 mesa inexistente; la reserva sigue `ACTIVA`) y
    `test_post_comanda_de_reserva_se_atiende_cuando_la_mesa_se_libera` (409 y luego 201).
  - **Atomicidad:** `test_post_comanda_de_reserva_falla_el_commit_devuelve_500_y_deshace` (cliente
    `TestClient(app, raise_server_exceptions=False)`, como `test_puente_real_falla_de_m3_en_la_segunda_pagina_devuelve_500_sin_guardar`;
    la reserva sigue `ACTIVA`).
  - **La atención es terminal (Requisito «La reserva atendida deja de ser modificable y cancelable»):**
    `test_post_comanda_de_reserva_deja_la_reserva_terminal` (`PUT` 409 «no está activa y no se puede
    modificar»; las dos cancelaciones 409 «ya fue atendida y no se puede cancelar»; `GET
    /reservas?fecha=2026-11-02&estado=ATENDIDA` la incluye y `estado=ACTIVA` no).
  Fallan con `404 Not Found` (la ruta no existe).
  - Evidencia (sdd-apply, 2026-11-09): 29 funciones (51 casos) en `test_router.py`: 50 failed con `assert
    404 == 201/409/422/500` (ruta inexistente) y 1 passed (`test_post_reservas_no_crea_ninguna_comanda`,
    protege un comportamiento existente). Una prueba pasaba en Rojo por no exigir el 201: se reforzó y
    volvió a Rojo.
- [x] 2.2 (Verde) `backend/app/modules/reservas/router.py`, al final del archivo (Decisión 54):
  `@router.post("/reservas/{reserva_id}/comanda", status_code=status.HTTP_201_CREATED)` con
  `crear_comanda(reserva_id: int, datos: ComandaDesdeReservaCrear, db: Sesion) -> ComandaSalida` que solo
  delega en `service.crear_comanda`; importa `ComandaDesdeReservaCrear` y `ComandaSalida`. No captura nada:
  los manejadores globales de `main.py` dan el formato `{"detalle": ...}`. Pasa 2.1.
  - Evidencia (sdd-apply, 2026-11-09): Endpoint `POST /reservas/{reserva_id}/comanda` con `status_code=201`,
    solo delega; 51 passed a la primera.
- [x] 2.3 (Refactor y mutación) Revisar `router.py` (solo delega; ninguna función supera las 50 líneas).
  Mutación, restaurada a mano desde una copia de respaldo: quitar `status_code=status.HTTP_201_CREATED` y
  comprobar que la prueba de 201 falla. Sin cambios de comportamiento; las pruebas de 2.1 siguen en verde.
  - Evidencia (sdd-apply, 2026-11-09): Mutación: quitar `status_code=201` da 10 failed (`assert 200 ==
    201`); restaurado, hash idéntico. `router.py` solo delega.
- [x] 2.4 Verificar con `V-BACK-FIX` y luego `V-BACK` (cobertura >= 70 %, `lint-imports` sin cambios) y
  `V-ALEMBIC`. Medición parcial del lado backend con `MEDIR` (se registra; el punto de control formal es 4.3).
  - Evidencia (2026-11-09): `V-BACK` como en 1.15: 2002 passed, cobertura 98.51 %. Medición parcial del
    backend con `git diff --shortstat origin/develop...HEAD -- backend/`: 9 files changed, 1291
    insertions(+), 4 deletions(-), unas 1 295 líneas, de las cuales unas 101 son de producción (`puente` 22,
    `schemas` 10, `service` 62, `router` 7). Supera el punto de control de 800 y la estimación; solo se
    anota (P.6).
- [x] 2.5 Commit 2 (unidad 2): `feat: expone POST /reservas/{id}/comanda (HU-M5-06)`. Incluye `router.py` y
  `test_router.py`. Rollback: revertir el commit (el `service` de la unidad 1 sigue válido y sin ruta).
  - Evidencia (2026-11-09): Commit `008a4a7`: `router.py` y `test_router.py`.

## Fase 3. Frontend ejecutable ya: tipos, API, validación, hook, modal, acción y página

Independiente de las Fases 1 y 2 (API simulada). Depende de **0.4** (textos de S64). Las pruebas se escriben en
`*.test.ts` o `*.test.tsx` junto al archivo que prueban. Sin `any`; sin `fetch` en los componentes (D-16);
nada se importa del módulo atencion (AGENTS.md §9.4); sin cambios en la carpeta shared del frontend. Allowed
edit surfaces de las unidades 3 y 4: solo archivos de `frontend/src/modules/reservas/`.

### Unidad 3: tipos, `api.ts`, validación local y hook

- [x] 3.1 (Rojo) `frontend/src/modules/reservas/api.test.ts`, con `clienteHttp` simulado (mismo patrón que la
  prueba de `modificarReserva`): `crearComandaDesdeReserva(10, { detalles: [{ producto_id: 12, cantidad: 2 }] })`
  llama a `clienteHttp.post` con la ruta `POST /reservas/10/comanda` y ese cuerpo, y devuelve la comanda como éxito; si
  la respuesta simulada es un error con `detalle` («La reserva 10 ya fue atendida»), devuelve ese error
  (escenario «Llamada de la API del módulo»). Falla porque la función no existe.
  - Evidencia (sdd-apply, 2026-11-09): `api.test.ts`: 2 failed con `TypeError: crearComandaDesdeReserva is
    not a function`.
- [x] 3.2 (Verde) `frontend/src/modules/reservas/types.ts` (`LineaComandaDesdeReserva`,
  `ComandaDesdeReservaCrear` con `observaciones?` opcional por D3, y `ComandaCreada` con `id`, `mesa_id`,
  `reserva_id` y `estado`; Decisión 57) y `frontend/src/modules/reservas/api.ts` (`crearComandaDesdeReserva(reservaId,
  datos)` con `clienteHttp.post<ComandaCreada, ComandaDesdeReservaCrear>`, después de
  `cancelarReservaPorAusencia`). Pasa 3.1.
  - Evidencia (sdd-apply, 2026-11-09): `types.ts` y `api.ts`; `api.test.ts` 14/14.
- [x] 3.3 (Rojo) Crear `frontend/src/modules/reservas/components/validarComandaDesdeReserva.test.ts`
  (Requisito «Validación local de las líneas»; patrón de `validarReserva.test.ts`): cantidad `0`, `-2`, `1.5` y
  vacía dan «La cantidad debe ser un número entero mayor que cero»; producto vacío, `0`, `-1`, `2.5` y `abc`
  dan «El producto debe ser un número entero mayor que cero»; enteros positivos no dan error; con la línea 1
  válida y la línea 2 con cantidad `0`, el error aparece solo en la línea 2 y campo cantidad. Falla porque el
  archivo `validarComandaDesdeReserva.ts` no existe.
  - Evidencia (sdd-apply, 2026-11-09): La suite no carga: `Failed to resolve import
    "./validarComandaDesdeReserva"`.
- [x] 3.4 (Verde) Crear `frontend/src/modules/reservas/components/validarComandaDesdeReserva.ts`: función pura
  que recibe las líneas escritas (`{ clave, producto, cantidad }` como texto) y devuelve los errores por línea
  y campo, con los dos textos de S64. Pasa 3.3.
  - Evidencia (sdd-apply, 2026-11-09): `validarComandaDesdeReserva.test.ts` 23/23.
- [x] 3.5 (Rojo) Crear `frontend/src/modules/reservas/components/useComandaDesdeReserva.test.tsx` (patrón de
  `useCancelarReserva.test.tsx`: `renderHook` con `ToastContext.Provider`, `mostrarToast = vi.fn()`,
  `api.ts` simulado con `vi.mock`) para `useComandaDesdeReserva({ reserva, onCreada })` (Requisitos «Envío, avisos y
  recarga» y «Modal “Crear comanda”»):
  - Estado inicial: una línea con producto vacío y cantidad `1`; `agregarLinea` suma otra; `quitarLinea` la
    elimina; la última línea no se puede quitar.
  - Éxito: llama a `crearComandaDesdeReserva(reserva.id, ...)` con `{ detalles: [{ producto_id: 12, cantidad: 2 },
    { producto_id: 13, cantidad: 1 }] }`, sin `mesa_id` y sin `observaciones`; muestra el aviso `success`
    «Comanda n.º 31 creada» (D7: solo el título) y llama a `onCreada` una vez.
  - Error local (cantidad `0`): no llama a la API, no llama a `onCreada` y deja el error en la línea.
  - Error de la API (404, 409 y 422, por separado): `errores.general` es el `detalle` recibido, sin cambios; no
    llama a `onCreada`; las líneas escritas siguen.
  - `enviando` es `true` mientras la solicitud está en curso y un segundo `enviar()` seguido no llama otra vez.
  - Si el modal se desmonta mientras la respuesta viaja, la respuesta no toca el estado (guarda de vigencia
    con `useRef`, como `useFormularioReserva`, S38).
  Fallan porque `useComandaDesdeReserva.ts` no existe.
  - Evidencia (sdd-apply, 2026-11-09): La suite no carga: el módulo `useComandaDesdeReserva` no existe.
- [x] 3.6 (Verde) Crear `frontend/src/modules/reservas/components/useComandaDesdeReserva.ts` (Decisión 58,
  ajustada por D3: sin `observaciones`): estado de las líneas, `agregarLinea`, `quitarLinea`, `cambiarLinea`,
  `errores` (por línea y `general`), `enviando` y `enviar()`; valida con `validarComandaDesdeReserva`,
  convierte con `Number(...)`, muestra el toast de éxito con `useToast` y llama a `onCreada`. Pasa 3.5.
  - Evidencia (sdd-apply, 2026-11-09): `useComandaDesdeReserva.test.tsx` 14/14. Control extra: sin las
    guardas `enCurso` y `vigente` fallan justo las 2 pruebas que las cubren; restaurado y comprobado con
    `cmp`.
- [x] 3.7 (Refactor) Revisar el hook y la validación: funciones de hasta 50 líneas y complejidad 10 (RNF-MAN-05);
  los textos de S64 solo en `validarComandaDesdeReserva.ts` y en el hook, sin duplicarlos en las pruebas más
  que para comparar. Verificar con `V-FRONT-ENF` y luego `V-FRONT`.
  - Evidencia (sdd-apply, 2026-11-09): ESLint 0 errores y 0 advertencias (50 líneas y complejidad 10
    incluidos), `tsc` limpio; módulo `reservas`: 14 archivos y 282 pruebas en verde.
- [x] 3.8 Commit 3 (unidad 3): `feat: agrega la llamada, la validación y el hook para crear una comanda desde una reserva (HU-M5-06)`.
  Incluye `types.ts`, `api.ts`, `api.test.ts`, `validarComandaDesdeReserva.ts` y su prueba,
  `useComandaDesdeReserva.ts` y su prueba. Rollback: revertir el commit.
  - Evidencia (2026-11-09): Commit `cc80e82`: `types.ts`, `api.ts`, `api.test.ts`,
    `validarComandaDesdeReserva` e `useComandaDesdeReserva` con sus pruebas.

### Unidad 4: modal, acción por fila y conexión en la página (depende de la unidad 3)

- [x] 3.9 (Rojo) Crear `frontend/src/modules/reservas/components/ComandaDesdeReservaDialog.test.tsx`
  (Requisitos «Modal “Crear comanda”», «Validación local de las líneas» y «Envío, avisos y recarga»; patrón de
  `ReservaFormDialog.test.tsx`): título «Crear comanda»; campo «Mesa» de solo lectura con «Mesa n.º 5»
  (deshabilitado y no editable); una línea con «Producto 1 (ID)» vacío y «Cantidad 1» en `1`; botones
  «Cancelar» y «Guardar comanda»; «Agregar producto» suma «Producto 2 (ID)» y «Cantidad 2»; «Quitar producto 2»
  la elimina; «Quitar producto 1» no está disponible (deshabilitado) con una sola línea; el modal no pide
  observaciones (D3); «Cancelar» llama a `onOpenChange(false)` sin llamar a la API; el error local aparece bajo
  el campo; el error del backend aparece en un `Alert` `danger` con el título «No se pudo crear la comanda»
  (D5) y el modal sigue abierto con las líneas; «Guardar comanda» queda deshabilitado mientras envía.
  Fallan porque el modal no existe.
  - Evidencia (sdd-apply, 2026-11-09): La suite `ComandaDesdeReservaDialog.test.tsx` no carga: el modal no
    existe.
- [x] 3.10 (Verde) Crear `frontend/src/modules/reservas/components/ComandaDesdeReservaDialog.tsx` (Decisión 58,
  ajustada por D3 a D6): `Dialog` compartido con título «Crear comanda», campo «Mesa» (`Input disabled`,
  valor «Mesa n.º {mesa_id}»), componente local `LineaProducto` (`FormField` + `Input` «Producto {n} (ID)» y
  «Cantidad {n}», botón «Quitar producto {n}» deshabilitado cuando queda una sola línea), «Agregar producto»,
  `Alert variant="danger"` con `titulo="No se pudo crear la comanda"` para `errores.general`, y en el pie
  «Cancelar» y «Guardar comanda» (`type="submit"`). Exportarlo desde
  `frontend/src/modules/reservas/components/index.ts`. Reutiliza `Dialog`, `Button`, `FormField`, `Input` y
  `Alert` de la carpeta compartida de componentes de interfaz (solo lectura); no crea componentes compartidos.
  Pasa 3.9.
  - Evidencia (sdd-apply, 2026-11-09): `ComandaDesdeReservaDialog.test.tsx` 15/15.
- [x] 3.11 (Rojo) `frontend/src/modules/reservas/components/ReservasTabla.test.tsx`: la función auxiliar
  `mostrar(...)` recibe `onCrearComanda` (`vi.fn()` por defecto, obligatoria como `onModificar`); la prueba
  `se ofrecen solo en las filas ACTIVA` pasa a exigir cuatro acciones («Crear comanda», «Modificar reserva»,
  «Cancelar reserva», «Cancelar por ausencia») solo en la fila `ACTIVA` y ninguna en las otras tres; una fila
  `ACTIVA` de una fecha distinta de hoy también ofrece «Crear comanda» (S59); al pulsar «Crear comanda» se
  llama a `onCrearComanda` con la reserva de esa fila. Fallan porque la prop y el botón no existen (el
  `typecheck` también falla).
  - Evidencia (sdd-apply, 2026-11-09): `ReservasTabla.test.tsx`: 4 failed con `Unable to find ... button
    "Crear comanda"` (Rojo medido con Vitest; el `typecheck` fallido que menciona la tarea no se midió).
- [x] 3.12 (Verde) `frontend/src/modules/reservas/components/ReservasTabla.tsx` (Decisión 59):
  `ReservasTablaProps` suma `onCrearComanda`, obligatoria; `columnaAcciones` la recibe y, dentro de la misma
  condición `r.estado === 'ACTIVA'`, agrega primero un botón `variant="ghost" size="sm"` con
  `aria-label="Crear comanda"` e ícono `ClipboardList` de `lucide-react` con `aria-hidden="true"`. Sin lógica
  de fecha. Pasa 3.11.
  - Evidencia (sdd-apply, 2026-11-09): `ReservasTabla.test.tsx` 14/14.
- [x] 3.13 (Rojo) `frontend/src/modules/reservas/pages/ReservasPage.test.tsx`: el proveedor de `abrir()`
  comparte un `mostrarToast` simulado para poder comprobar el aviso, y el `vi.mock` de `api.ts` cubre
  `crearComandaDesdeReserva`. Un nuevo `describe('ReservasPage: crear una comanda')`:
  - pulsar «Crear comanda» abre el modal de esa fila (título «Crear comanda», «Mesa n.º 5») sin llamar a la API
    y sin salir de la ruta de reservas;
  - escribir producto `12` y cantidad `2` y pulsar «Guardar comanda» llama a `crearComandaDesdeReserva(10,
    { detalles: [{ producto_id: 12, cantidad: 2 }] })`, muestra «Comanda n.º 31 creada», cierra el modal y
    vuelve a pedir el listado; si el segundo listado ya no trae la fila `ACTIVA`, la acción desaparece
    (escenario «Tras el éxito la reserva sale de las activas»);
  - un 409 («La reserva 10 ya fue atendida») deja el modal abierto con el aviso y las líneas, y no vuelve a
    pedir el listado;
  - con el modal abierto «Nueva reserva» está visible y deshabilitado, y se habilita al cerrar;
  - cerrar con «Cancelar» no llama a la API ni vuelve a pedir el listado;
  - cerrar el modal de la fila 10 con datos y abrir el de la fila 11 (mesa 6) muestra «Mesa n.º 6» y una sola
    línea vacía con cantidad `1`;
  - un doble clic en «Guardar comanda» con la API lenta llama una sola vez.
  Fallan porque la página no pasa `onCrearComanda`.
  - Evidencia (sdd-apply, 2026-11-09): `ReservasPage.test.tsx`: 7 failed de 33 (heading "Crear comanda" no
    encontrado y `TypeError: onCrearComanda is not a function`).
- [x] 3.14 (Verde) `frontend/src/modules/reservas/pages/ReservasPage.tsx` (Decisión 59): el tipo `Panel` suma
  `{ comanda: Reserva }`; `ListadoDelDia` recibe `onCrearComanda` y la pasa a `ReservasTabla`;
  `ModalDeReserva` monta `ComandaDesdeReservaDialog` (con `key` por reserva) cuando el panel es `{ comanda }`
  y `ReservaFormDialog` en los demás casos; `onCreada` es el `alGuardar` existente (cierra el panel y llama a
  `listado.reservas.recargar()`); «Nueva reserva» sigue deshabilitado con cualquier panel objeto. Pasa 3.13.
  - Evidencia (sdd-apply, 2026-11-09): `ReservasPage.test.tsx` 33/33.
- [x] 3.15 (Refactor) Revisar `ComandaDesdeReservaDialog.tsx`, `ReservasTabla.tsx` y `ReservasPage.tsx`:
  funciones de hasta 50 líneas (el modal se divide en `LineaProducto` y el cuerpo); la condición
  `r.estado === 'ACTIVA'` no se repite más de una vez en la tabla. Sin cambios de comportamiento; las
  pruebas de 3.1 a 3.13 siguen en verde.
  - Evidencia (sdd-apply, 2026-11-09): ESLint marcó 3 errores `max-lines-per-function` (modal de 55 líneas y
    dos `describe` de 56 y 112): se dividió el modal en `LineaProducto`, `FormularioComanda` y el cascarón y
    se partieron los `describe`, sin cambio de comportamiento. Módulo: 15 archivos y 307 pruebas en verde
    (el padre repitio `npx vitest run src/modules/reservas`: 15 archivos y 307 passed).
- [x] 3.16 Mutaciones, una por vez, restauradas a mano desde una copia de respaldo del archivo (el frontend de
  esta unidad no tiene commit propio todavía): (a) en `ReservasTabla.tsx`, cambiar la condición del botón
  «Crear comanda» a `true` y comprobar que `se ofrecen solo en las filas ACTIVA` falla; (b) en
  `useComandaDesdeReserva.ts`, quitar la validación local y comprobar que la prueba de «error local no llama
  a la API» falla; (c) en `ReservasPage.tsx`, llamar a `recargar()` también ante el error y comprobar que la
  prueba del 409 falla. Restaurar el archivo original después de la tercera mutación.
  - Evidencia (sdd-apply, 2026-11-09): Mutaciónes, una por vez, restauradas con `cp` y comprobadas con
    `sha256sum -c`: (a) `r.estado === 'ACTIVA'` por `true` en `ReservasTabla.tsx`: 3 failed; (b) sin
    validación local en el hook: 5 failed; (c) llamar a `onCreada()` también ante el error, aplicada en la
    rama de error del hook porque la página solo recibe `onCreada` y nunca ve el error: falla la prueba del
    409 de la página; (d) extra, `setPanel({ comanda })` por `setPanel({ edicion })`: 6 failed.
- [x] 3.17 Verificar con `V-FRONT` (`npm run format`, luego `npm run lint && npm run format:check && npm run
  typecheck && npm run test:coverage && npm run build`; cobertura >= 60 %, 0 advertencias). Medición parcial
  del lado frontend con `MEDIR` (se registra; el punto de control formal es 4.3).
  - Evidencia (2026-11-09): Verificado por el padre: `npm run lint` 0 errores y 0 advertencias; `npm run
    format:check` y `npm run typecheck` sin errores; `npm run test:coverage` en una corrida limpia, sin
    carga: 99 archivos y 1158 pruebas en verde, cobertura 77.73 % sentencias, 73.45 % ramas, 74.01 %
    funciones y 79.39 % líneas (umbral 60 %); `build` OK, `ReservasPage` 21.15 kB. Desvíos:
    `frontend/coverage/` y `frontend/dist/assets` son de root, así que se usaron
    `--coverage.reportsDirectory` y `vite build --outDir` fuera del repositorio. Una corrida anterior,
    simultánea con la suite del backend, falló `FacturarComandaDialog.test.tsx` (M6, intermitente por
    carga): aislado pasa 7/7 y la corrida limpia pasa; la rama no toca `pagos`. Medición parcial: `git diff
    --shortstat origin/develop...HEAD -- frontend/`: 14 files changed, 1246 insertions(+), 11 deletions(-),
    unas 1 257 líneas. Supera el punto de control de 800; solo se anota (P.6).
- [x] 3.18 Commit 4 (unidad 4): `feat: agrega el modal y la acción Crear comanda en el listado de reservas (HU-M5-06)`.
  Incluye `ComandaDesdeReservaDialog.tsx` y su prueba, `index.ts`, `ReservasTabla.tsx` y su prueba,
  `ReservasPage.tsx` y su prueba. Rollback: revertir el commit (la unidad 3 sigue válida, sin pantalla).
  - Evidencia (2026-11-09): Commit `07b2bd9`: `ComandaDesdeReservaDialog`, `ReservasTabla`, `ReservasPage` e
    `index.ts` con sus pruebas.

## Fase 4. Cierre de lo ejecutable ya

Depende de las Fases 1 a 3. No requiere B1 ni B2.

- [x] 4.1 Verificación consolidada: `V-BACK` (`ruff check`, `ruff format --check`, `lint-imports` con los
  mismos contratos y 0 rotos, `pytest` con cobertura >= 70 %), `V-ALEMBIC` (un único head, el de 0.1) y
  `V-FRONT` (`lint`, `format:check`, `typecheck`, `test:coverage`, `build`). Se registran los conteos de
  pruebas y la cobertura de cada lado.
  - Evidencia (2026-11-09): Backend: ver 1.15 (2002 passed, 98.51 %, `ruff`, formato y `lint-imports`
    limpios). Frontend: ver 3.17 (1158 passed, 77.73 % sentencias, `lint`, `format:check`, `typecheck` y
    `build` limpios). `V-ALEMBIC`: un único head, `a9c1e3f5b7d9`, el de 0.1. Pruebas nuevas del backend: 116
    casos (65 de la unidad 1 y 51 del router, según el informe de sdd-apply); en el frontend, el módulo
    `reservas` pasó de 243 pruebas en 12 archivos a 307 en 15.
- [x] 4.2 Aislamiento (Requisitos «Aislamiento del módulo y sin migración» y «Aislamiento del frontend»):
  `git diff --name-only origin/develop...HEAD` contiene solo archivos de `backend/app/modules/reservas/`,
  `backend/tests/modules/reservas/`, `frontend/src/modules/reservas/` y `openspec/changes/HU-M5-06/`. Ningún
  cambio en los módulos salon y atencion, en las carpetas shared (backend ni frontend), en el archivo de
  configuración del backend, en las migraciones de Alembic, en el doble de S2-01
  (`backend/tests/shared/fakes/comanda.py` (read-only)) ni en sus pruebas
  (`backend/tests/shared/test_contrato_comanda.py` (read-only)). La búsqueda `rg "modules/atencion"` sobre
  el código del frontend de reservas no devuelve resultados, y los únicos imports de `atencion` y `salon` en
  el backend de reservas están en `puente.py`.
  - Evidencia (2026-11-09): `git diff --name-only origin/develop...HEAD` filtrado con `rg -v` por las cuatro
    carpetas permitidas no devuelve nada; `backend/tests/shared`, `backend/app/shared`,
    `backend/pyproject.toml`, `backend/alembic` y `frontend/src/shared` sin cambios (0 archivos). Los únicos
    imports de `atencion` y `salon` en el código del backend de reservas están en `puente.py` (líneas 20 y
    21). `rg "modules/atencion"` sobre el frontend de reservas devuelve un solo resultado: un comentario que
    ya estaba en `develop` (`components/validarReserva.ts:79`, archivo que este cambio no toca), no un
    import.
- [x] 4.3 **Punto de control de revisión (no bloquea ni divide la HU).** Medir con `MEDIR` el lado backend y el
  lado frontend por separado, sin los artefactos de SDD, y compararlos con el pronóstico de esta tarea
  (backend de lo ejecutable ya ≈ 435 a 590; frontend ≈ 620 a 850) y con el límite de 800 por lado. Registrar
  las cifras en `apply-progress.md`. Si algún lado supera 800, solo se anota (tarea P.6): no se recortan
  pruebas, no se divide el cambio y no se desactiva ninguna regla.
  - Evidencia (2026-11-09): Medición con `MEDIR` sobre los commits de código (sin artefactos de SDD):
    backend 9 archivos, +1291/-4 (unas 1 295 líneas); frontend 14 archivos, +1246/-11 (unas 1 257 líneas).
    Ambos lados superan el límite de 800 y el pronóstico (backend 435 a 590; frontend 620 a 850). Se debe
    sobre todo a las pruebas: en el backend unas 101 líneas son de producción y en el frontend unas 390. No
    se recortaron pruebas, no se dividió el cambio y no se desactivo ninguna regla; va a la nota de tamaño
    del PR (P.6).
- [ ] 4.4 Escribir `openspec/changes/HU-M5-06/apply-progress.md` con el avance por tarea (evidencia observada,
  comandos y resultados reales, estado de las tareas BLOQUEADAS y cifras de 4.3). Se confirma con la persona
  antes de incluirlo en un commit (se agrega en 6.9 o en el commit de documentación final).
  - Evidencia (2026-11-11): escrito en `openspec/changes/HU-M5-06/apply-progress.md`. **Sigue abierta:** falta
    la confirmación de la persona para incluirlo en un commit; hasta entonces queda sin commitear.

## Fase 5. CONDICIONADA a la tarea 0.2: B1 y B2/B3 dentro de este PR

**No aplica: resuelta por Franco en #236 con `crear_comanda_para_reserva`; esta rama no toca atencion ni
shared.** (2026-11-11.) M4 entregó la interfaz con otra forma que la de las tareas de abajo: no agregó
`reserva_id` a `ComandaCrear` (B1) y el nombre y la firma de B2 son `crear_comanda_para_reserva(db, datos,
reserva_id)`; B3 lo resolvió M4 con un import diferido. Las tareas 5.1 a 5.6 quedan **sin tildar** porque no
se hicieron en esta rama; el texto de abajo se conserva como historia. Ver la adenda 2026-11-11 de `design.md`.

**Solo se ejecuta si M4 acuerda por escrito que esta persona implementa B1 a B3** (Decisión 55; AGENTS.md
§9.3). Si M4 lo hace en su propio PR, esta fase se omite: se borra o se marca «No aplica» y el PR espera al de
M4. Son tareas **separadas, en commits separados y con el ID de tarea que indique M4**; los archivos del
módulo atencion y del contrato compartido del backend quedan fuera de las áreas autorizadas del resto del
cambio, por lo que el estado del cambio puede informar `blocked(edit_authority_missing)` hasta que la persona
otorgue la autoridad de edición (o hasta que se borre esta fase porque M4 lo hace en su PR). La forma exacta
(nombre, parámetros por defecto, helper privado) la fija M4 en 0.2; lo que sigue es el contrato mínimo. Las
pruebas existentes de M4 y de la carpeta compartida de pruebas deben seguir en verde sin cambios, y
`backend/tests/shared/test_contrato_comanda.py` (read-only) no se edita.

- [ ] 5.1 **No aplica (resuelta en #236).** (Rojo, B1) Crear `backend/tests/modules/atencion/test_comanda_reserva.py`
  (o el archivo que indique M4), escenarios «B1, sin vínculo todo sigue igual» y «B1, el vínculo debe ser un
  entero positivo»: `test_comanda_crear_sin_reserva_id_queda_en_none`;
  `test_comanda_crear_rechaza_reserva_id_no_positivo_o_no_entero` (`0`, `-1`, `2.5`, `"3"`);
  `test_crear_comanda_con_reserva_id_lo_persiste_y_lo_devuelve` (`repository.crear_comanda` copia el campo y
  `ComandaSalida.reserva_id` lo trae); `test_crear_comanda_sin_reserva_id_deja_reserva_id_nulo`; y la prueba que
  corresponda a la decisión de 0.2(e) sobre `POST /comandas` con `reserva_id` en el cuerpo (ignora, rechaza o
  admite). Fallan: `ComandaCrear` ignora `reserva_id` en silencio.
  - Evidencia:
- [ ] 5.2 **No aplica (resuelta en #236).** (Verde, B1) `backend/app/shared/contratos/comanda.py`: `reserva_id:
  StrictInt | None = Field(default=None, gt=0)` en `ComandaCrear`; `backend/app/modules/atencion/repository.py`:
  `crear_comanda` copia `reserva_id` al `model`. Pasa 5.1; corren `pytest --no-cov -q tests/modules/atencion
  tests/shared` y `V-BACK`.
  - Evidencia:
- [ ] 5.3 **No aplica (resuelta en #236).** Commit M4-a (B1): `feat: permite vincular una comanda con una reserva (<ID de M4>)`.
  Solo `comanda.py`, `repository.py` y `test_comanda_reserva.py`. La aprobación de M4 se anota en el PR (P.2).
  - Evidencia:
- [ ] 5.4 **No aplica (resuelta en #236).** (Rojo, B2 y B3) En `backend/tests/modules/atencion/test_comanda_reserva.py`
  (siembra de M3 con el patrón de las fixtures existentes de `atencion`): escenarios «B2, la primitiva no
  confirma» y «B2, `crear_comanda` conserva su comportamiento»:
  `test_crear_comanda_sin_confirmar_no_confirma_y_el_rollback_la_descarta` (sin comanda y mesa `LIBRE`);
  `test_crear_comanda_sin_confirmar_con_commit_persiste_la_comanda_con_su_reserva_id_y_ocupa_la_mesa`;
  `test_crear_comanda_sin_confirmar_deja_subir_el_integrity_error_sin_traducir` (0.2(c));
  `test_crear_comanda_sin_confirmar_construye_los_proveedores_internamente` (B3: firma `(db, datos)`); y
  `crear_comanda` mantiene su `commit`, su `rollback` y la traducción a `ComandaAbiertaError`. Fallan:
  `crear_comanda_sin_confirmar` no existe.
  - Evidencia:
- [ ] 5.5 **No aplica (resuelta en #236).** (Verde, B2 y B3) `backend/app/modules/atencion/service.py`:
  `crear_comanda_sin_confirmar(db, datos: ComandaCrear) -> ComandaSalida` con la misma validación que
  `crear_comanda` (comanda abierta, mesa `LIBRE`, cotización, ocupar la mesa), `db.flush()` en lugar de
  `db.commit()`, sin `rollback`, con `MesasDeSalon()` y `CatalogoDeCarta()` construidos adentro; `crear_comanda`
  pasa a apoyarse en esa lógica y conserva su `commit`, su `rollback` y el manejo del `IntegrityError`. Pasa
  5.4; todas las pruebas de M4 existentes pasan sin cambios; `V-BACK` en verde (incluye `lint-imports`).
  - Evidencia:
- [ ] 5.6 **No aplica (resuelta en #236).** Commit M4-b (B2 y B3): `feat: agrega crear_comanda_sin_confirmar (<ID de M4>)`.
  Solo el `service.py` de M4 y su prueba. Rollback: revertir cada commit de M4 por separado; el
  endpoint general de comandas no cambia.
  - Evidencia:

## Fase 6. BLOQUEADA hasta que B1 y B2 estén en `develop` (o en esta rama, por la Fase 5)

**Desbloqueada (2026-11-11):** M4 entregó su interfaz en #236, con otra forma que la de B1 y B2
(`crear_comanda_para_reserva(db, datos, reserva_id)`; ver la adenda 2026-11-11 de `design.md`), y ya está en
esta rama. Las tareas 6.1 a 6.6 y la parte enfocada de 6.7 se hicieron con esa forma; quedan pendientes el
resto de 6.7, 6.8 (humo manual), 6.9 (commits) y 6.10 (medición).

**Dependencia común: B1 y B2 acordados con M4 (tarea 0.2) e integrados.** Hasta entonces el PR no se abre. Las
pruebas de esta fase se escriben recién ahora, sin `skipif` (Decisión 61): un `skipif` por atributo las dejaría
verdes en silencio si M4 elige otro nombre. Allowed edit surfaces: `backend/app/modules/reservas/puente.py`
(solo si cambia la forma de B2), `backend/tests/modules/reservas/test_puente.py` y
`backend/tests/modules/reservas/test_integracion_comanda.py`.

- [x] 6.1 **Desbloqueada por #236.** Puerta (persona): `git pull origin develop` y resolver
  los conflictos en la rama (en particular con el PR #230 sobre el `service.py` de M4); buscando con `rg`
  `crear_comanda_sin_confirmar` en el módulo atencion y `reserva_id` en el contrato compartido de comanda,
  confirmar que B1 y B2 existen y leer la **firma real**. Si coincide con la Decisión 55, las tareas siguientes
  corren tal cual; si difiere (por ejemplo `confirmar: bool`), solo cambia el cuerpo de
  `crear_comanda_de_reserva` en la tarea 6.3.
  - Evidencia (2026-11-11): `git log --oneline` muestra el merge `760dfce` (PR #236) y el merge `ae68602`
    (`develop` ya incorporado en esta rama). Búsqueda con `grep -rn` (`rg` no está instalado en este entorno):
    `crear_comanda_sin_confirmar` aparecía solo en `backend/app/modules/reservas/puente.py` (la llamada y su
    docstring) y no está definida en `backend/app/modules/atencion/`; `def crear_comanda_para_reserva` está en
    `backend/app/modules/atencion/service.py:163`. **Firma real:** `crear_comanda_para_reserva(db: Session,
    datos: ComandaCrear, reserva_id: int) -> ComandaSalida`: valida, cotiza y ocupa la mesa con
    `_registrar_comanda`, no hace `commit` ni `rollback`, exige `reserva_id > 0` (`DatosInvalidosError`) y arma
    `MesasDeSalon()` y `CatalogoDeCarta()` con un import diferido (B3 resuelto). `ComandaCrear`
    (`backend/app/shared/contratos/comanda.py:33-36`) sigue con `mesa_id`, `detalles` y `observaciones`, sin
    `reserva_id` y sin `extra="forbid"`: un `reserva_id=` se ignora en silencio. `ComandaSalida.reserva_id`
    existe (línea 59). **Diferencias con la Decisión 55:** el nombre (`crear_comanda_para_reserva`, no
    `crear_comanda_sin_confirmar`) y que el vínculo entra como argumento aparte, no dentro de `ComandaCrear`
    (B1 no se hizo). Solo cambia el cuerpo de `crear_comanda_de_reserva` (6.3): la firma del puente, el
    `service`, el doble y sus pruebas no cambian.
- [x] 6.2 **Desbloqueada por #236.** (Rojo) `backend/tests/modules/reservas/test_puente.py`, función
  real con `puente_real`, M3 sembrado con `mesas_en_m3` y un producto habilitado de M1 sembrado con un
  ayudante local (sin importar fixtures de otro módulo): `test_crear_comanda_de_reserva_real_arma_la_comanda_con_la_mesa_y_el_vinculo`
  (tras `db.commit()`, la comanda tiene `reserva_id` y `mesa_id`; la `ComandaSalida` trae `reserva_id`);
  `test_crear_comanda_de_reserva_real_no_confirma` (tras `db.rollback()` no existe la comanda y la mesa sigue
  `LIBRE`); `test_crear_comanda_de_reserva_real_propaga_el_error_de_m4` (producto inexistente:
  `NoEncontradoError`). Como el cuerpo se escribió en 1.2, estas pruebas pueden pasar de inmediato: la
  evidencia de Rojo es la mutación de 6.5(a).
  - Evidencia (2026-11-11): **Rojo real, antes de tocar `puente.py`:** las tres pruebas nuevas de
    `test_puente.py` no pasaron de inmediato, porque el cuerpo viejo llamaba a una función inexistente.
    `docker compose run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp backend pytest --no-cov -q
    -p no:cacheprovider tests/modules/reservas/test_puente.py`: `3 failed, 19 passed`, las tres con
    `AttributeError: module 'app.modules.atencion.service' has no attribute 'crear_comanda_sin_confirmar'`.
    Verde: ver 6.3. Ayudante local `_sembrar_producto_habilitado` (sección y producto de M1 con los servicios
    reales de `productos`, sin importar fixtures de otro módulo). La mutación de 6.5(a) vuelve a hacer fallar
    la primera prueba.
- [x] 6.3 **Desbloqueada por #236.** (Verde, condicional) Solo si la firma real difiere: ajustar el cuerpo
  de `crear_comanda_de_reserva` en `backend/app/modules/reservas/puente.py` (Decisión 53); el `service`, el
  doble y sus pruebas no cambian. Si no difiere, queda «sin cambios» con la evidencia de que 6.2 pasa.
  - Evidencia (2026-11-11): la firma real difiere (6.1), así que se ajustó el cuerpo de
    `crear_comanda_de_reserva` en `puente.py`: arma `ComandaCrear(mesa_id=..., detalles=...,
    observaciones=...)` sin `reserva_id` y llama a `atencion_service.crear_comanda_para_reserva(db, datos,
    reserva_id)`; el docstring ya no cita B1, B2 ni `crear_comanda_sin_confirmar`. Nada más cambió en el
    archivo (+5 -6 líneas). `... pytest --no-cov -q -p no:cacheprovider tests/modules/reservas/test_puente.py`:
    `22 passed` (19 previas y las 3 de 6.2). `git diff --stat` sobre `service.py` de reservas, `conftest.py`,
    `atencion`, `salon`, `shared` y `pyproject.toml`: vacío.
- [x] 6.4 **Desbloqueada por #236.** (Rojo y Verde) Crear
  `backend/tests/modules/reservas/test_integracion_comanda.py` con SQLite real, el puente real, M3 sembrado y
  un producto habilitado de M1, a través de `POST /reservas/{id}/comanda` (escenarios «[Integración,
  condicionado a B1 y B2]»; los modelos de `productos`, `salon` y `atencion` se importan solo desde `tests/`):
  - `test_post_comanda_de_reserva_persiste_la_comanda_con_el_vinculo_y_ocupa_la_mesa` (CA1: 201; una sola
    comanda `ABIERTA` con `reserva_id` y `mesa_id`; mesa `OCUPADA`; reserva `ATENDIDA`).
  - `test_post_comanda_de_reserva_con_la_mesa_ocupada_devuelve_409_sin_cambios` y
    `test_post_comanda_de_reserva_con_la_mesa_fuera_de_servicio_devuelve_409` («La mesa {numero} no está
    libre»; reserva `ACTIVA`).
  - `test_post_comanda_de_reserva_con_producto_inexistente_no_persiste_nada` (404; 0 comandas ni detalles;
    mesa `LIBRE`; reserva `ACTIVA`).
  - `test_post_comanda_de_reserva_falla_el_commit_no_deja_comanda` (500; nada persistido).
  - `test_post_comanda_de_reserva_con_la_base_rechazando_la_comanda_duplicada_devuelve_409` (entrelazado
    determinista: otra sesión confirma una comanda `ABIERTA` en la mesa mientras la verificación previa de M4
    no la ve, y la base rechaza la inserción por `ux_comandas_mesa_abierta`; 409; reserva `ACTIVA`; sin
    duplicada).
  - `test_post_comanda_de_reserva_dos_solicitudes_para_la_misma_reserva_una_201_y_otra_409` (S65; el
    entrelazado hace que la otra sesión atienda la misma reserva antes del `flush`: una responde 201 y la otra
    409 «ya fue atendida»; una sola comanda). Si el entrelazado no se puede reproducir de forma determinista,
    se cubre la traducción con 1.11 y se anota como pendiente en el PR (riesgo del diseño).
  Se escriben en rojo contra el puente real (o pasan de inmediato si 6.2 y la implementación ya cumplen) y
  se registra el resultado real.
  - Evidencia (2026-11-11): `test_integracion_comanda.py` nuevo (314 líneas, 8 pruebas): SQLite migrada, puente
    real (`puente_real`), M3 con `mesas_en_m3` y un producto habilitado de M1 con un ayudante local. Cubre:
    persistencia con vínculo y mesa `OCUPADA` (201, reserva `ATENDIDA`); mesa `OCUPADA` y mesa
    `FUERA_DE_SERVICIO` (409 «La mesa {numero} no está libre», reserva `ACTIVA`, sin comandas); mesa con una
    comanda `ABIERTA` previa (la `ComandaAbiertaError` de M4: 409 con su texto, una sola comanda, reserva
    `ACTIVA`); producto inexistente en la segunda línea (404, 0 comandas y 0 detalles, mesa `LIBRE`, reserva
    `ACTIVA`); falla del commit (500; se comprueba que la comanda ya estaba en la transacción y que no queda
    nada); base que rechaza la comanda duplicada (409 «La mesa {mesa_id} ya tiene una comanda abierta», reserva
    `ACTIVA`, solo la comanda ajena); dos solicitudes para la misma reserva (una atiende y la otra responde 409
    «La reserva {id} ya fue atendida»; una sola comanda con `reserva_id`). **Rojo real:** con el cuerpo viejo de
    `puente.py` (copia de `HEAD`), `pytest --no-cov -q -p no:cacheprovider
    tests/modules/reservas/test_integracion_comanda.py tests/modules/reservas/test_puente.py` dio `10 failed,
    20 passed`: las 3 de 6.2 y 7 de las 8 de integración, todas con el `AttributeError` de 6.2. La octava, la
    de la falla del commit, pasaba por el 500 del `AttributeError` y no por el motivo previsto; se le agregó la
    comprobación de que la comanda llega a la transacción, y con el cuerpo viejo falla (`assert [] == [1]`).
    **Verde:** `8 passed`; repetida 6 veces junto con `test_puente.py`: `30 passed` cada vez, sin pruebas
    inestables. **Entrelazados deterministas:** los dos de carrera ejecutan una función dentro de la
    solicitud, al volver la consulta de `salon_service.obtener_mesa` que hace M4 (después de su verificación
    previa de comanda abierta y antes del insert), y esa función confirma desde otra sesión lo que haría una
    solicitud concurrente (sin hilos ni esperas). **Limitaciones:** en el de dos solicitudes la ganadora es una
    llamada a `service.crear_comanda` con su propia sesión y no un segundo `POST`, porque el cliente HTTP de
    las pruebas comparte una sola sesión; y el entrelazado depende del orden interno de M4 (verificación
    previa, consulta a M3, insert): si M4 lo cambia, las dos pruebas fallan de forma visible, no en silencio.
    El texto del 409 de la base duplicada es el de la Decisión 52, no «el mismo mensaje que M4» de la
    spec (que remite al diseño).
- [x] 6.5 **Desbloqueada por #236.** Mutaciones, una por vez, restauradas a mano desde una copia de
  respaldo: (a) quitar `reserva_id=reserva_id` del `ComandaCrear` en `puente.py` y comprobar que 6.2 falla (da
  el Rojo que 1.2 no pudo dar); (b) quitar la rama `except IntegrityError` de `service.crear_comanda` y
  comprobar que la prueba de la comanda duplicada de 6.4 falla.
  - Evidencia (2026-11-11): copias de respaldo de `puente.py` y `service.py` fuera del repositorio; una
    mutación por vez y restauración a mano con `cp` y `cmp` (idénticos). **(a)** `puente.py` con
    `reserva_id + 1` en la llamada a `crear_comanda_para_reserva` (el vínculo deja de ser el de la reserva):
    `pytest --no-cov -q -p no:cacheprovider tests/modules/reservas/test_integracion_comanda.py
    tests/modules/reservas/test_puente.py` dio `3 failed, 27 passed`:
    `test_crear_comanda_de_reserva_real_arma_la_comanda_con_la_mesa_y_el_vinculo` (`assert (1, 11) == (1, 10)`),
    `test_post_comanda_de_reserva_persiste_la_comanda_con_el_vinculo_y_ocupa_la_mesa` y
    `test_post_comanda_de_reserva_dos_solicitudes_para_la_misma_reserva_una_201_y_otra_409`
    (`assert [2] == [1]`). Restaurado. **(b)** `service.crear_comanda` sin la rama `except IntegrityError`:
    `... pytest ... tests/modules/reservas/test_integracion_comanda.py` dio `2 failed, 6 passed`:
    `test_post_comanda_de_reserva_con_la_base_rechazando_la_comanda_duplicada_devuelve_409` y la de dos
    solicitudes, ambas con `sqlalchemy.exc.IntegrityError: UNIQUE constraint failed: comandas.mesa_id` sin
    traducir. Restaurado: `git diff --stat -- backend/app/modules/reservas/service.py` vacío.
- [x] 6.6 **Desbloqueada por #236.** Escenario «B3, M5 no importa los adaptadores de M4»: `lint-imports`
  pasa sin cambios en los contratos de importación (el archivo de configuración del backend no se edita), y `reservas` solo importa
  `app.modules.atencion.service` y `app.modules.salon.service`, y solo desde `puente.py` (el existente
  `test_solo_el_puente_importa_salon_y_atencion` sigue en verde).
  - Evidencia (2026-11-11): `docker compose run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e
    RUFF_CACHE_DIR=/tmp/ruff_cache backend sh -c "ruff check . && ruff format --check . && lint-imports"`:
    `Contracts: 10 kept, 0 broken` (87 archivos, 351 dependencias), sin cambios en `backend/pyproject.toml`
    (`git diff --stat` vacío). `grep -rn` de `modules.atencion` y `modules.salon` sobre
    `backend/app/modules/reservas`: solo `puente.py`, líneas 20 y 21 (`app.modules.atencion.service` y
    `app.modules.salon.service`); no importa `adaptadores`. `test_solo_el_puente_importa_salon_y_atencion` pasa
    dentro de `tests/modules/reservas` (ver 6.7: `528 passed`).
- [x] 6.7 **Desbloqueada por #236.** `git pull origin develop` (de nuevo, si avanzó) y verificación
  completa del repositorio con `V-BACK`, `V-ALEMBIC` y `V-FRONT`: CI local en verde, sin migración nueva.
  - Evidencia (2026-11-11). Escritor, enfocado: `pytest --no-cov -q tests/modules/reservas`: `528 passed`.
    **Padre, completo e independiente**, sobre la rama con `origin/develop` (760dfce) ya integrado (merge
    `ae68602`, 4 conflictos aditivos en `reservas/` resueltos conservando ambos lados):
    - Backend (`V-BACK` + `V-ALEMBIC`, un solo comando en Docker con `RUFF_CACHE_DIR=/tmp/ruff_cache`):
      `ruff check .` `All checks passed!`; `ruff format --check .` `151 files already formatted`;
      `lint-imports` `Contracts: 10 kept, 0 broken`; `pytest`: `2163 passed, 1 warning in 0:16:55`,
      `Required test coverage of 70% reached. Total coverage: 98.43%`; `alembic heads`:
      `c3e5a7b9d1f2 (head)` (un único head, el mismo de `develop`; ninguna migración nueva).
    - Frontend (`V-FRONT`, desde `frontend/`, con `VITE_API_URL` sin definir y salidas de cobertura y
      build en el scratchpad por los directorios de root): `eslint . --max-warnings=0` sin hallazgos;
      `format:check` `All matched files use Prettier code style!`; `typecheck` sin errores;
      `test:coverage` `Test Files 122 passed (122)`, `Tests 1349 passed (1349)`, cobertura `All files`
      86,58 % de líneas (el umbral aplica a `src/App.tsx` y `src/shared/**`); `vite build` `built in 706ms`.
- [ ] 6.8 **PARCIAL (la parte de la interfaz sigue pendiente).** Humo manual (persona), con `docker compose up --build` (si la
  base local es vieja, `docker compose down -v` antes): crear una reserva `ACTIVA` de hoy en una mesa `LIBRE`;
  pulsar «Crear comanda»; cargar un producto y una cantidad; comprobar el aviso «Comanda n.º {id} creada», que
  la fila deja de estar `ACTIVA`, que la mesa figura `OCUPADA` y que la comanda aparece en la pantalla de
  comandas de M4 con la reserva; probar una reserva de otra fecha (aviso del backend dentro del modal) y una
  mesa ocupada (409 de M4). Anotar lo observado.
  - Evidencia (2026-11-11), **parcial:** humo contra la API real, no contra la pantalla. Se levantó `uvicorn`
    de verdad en un contenedor descartable (`docker compose run --no-deps`, `DATABASE_URL=sqlite:////tmp/humo.db`,
    `alembic upgrade head`), sin tocar `docker compose down -v` ni la base ni el volumen locales, y un script
    externo al repositorio llamó a la API HTTP: **30 de 30 pasos OK** (`RESULTADO: TODO OK`).
    Observado: reserva `ACTIVA` de hoy → `POST /reservas/{id}/comanda` `201`, comanda `ABIERTA` con
    `reserva_id` y `mesa_id`; la reserva pasa a `ATENDIDA`; la mesa queda `OCUPADA`; `GET /comandas/{id}` de M4
    trae el `reserva_id`; segundo intento sobre la misma reserva `409` «ya fue atendida»; reserva de mañana
    `409` «no corresponde al día de hoy»; reserva cancelada `409`; cantidad 0 `422`, con la reserva todavía
    `ACTIVA`. Siguió el recorrido de S4-05: entrega, cierre (la mesa vuelve a `LIBRE`), factura de `2700.90`
    (2 × 1500.50 menos 10 % de una promoción) `PAGADA` con su cobro, y los reportes de caja, productos más
    vendidos, reservas y ausentismo (4 reservas, 1 atendida, 1 cancelada), impacto de promociones y las
    versiones PDF respondieron `200`.
    **No observado (pendiente, es de la persona):** el modal «Crear comanda», el aviso «Comanda n.º {id}
    creada», que la fila deje de estar `ACTIVA` en la pantalla y la pantalla de comandas de M4 (requieren un
    navegador); lo cubren las pruebas de Vitest con la API simulada. Tampoco se probó con un mozo: la comanda
    no recibe `mozo_id` en `develop`, y `mesas-ventas-por-mozo` devolvió `lineas: []`.
- [x] 6.9 **Desbloqueada (depende de 6.2 a 6.7).** Commit 6 (unidad 6): `test: agrega pruebas del puente real y de integración de la comanda desde una reserva (HU-M5-06)`.
  Incluye `test_puente.py`, `test_integracion_comanda.py` y, si 6.3 lo exigió, `puente.py`. Después, un commit
  de documentación con `apply-progress.md` (4.4): `docs: registra el avance y la verificación de HU-M5-06`.
  Rollback: revertir el commit (solo pruebas).
  - Evidencia (2026-11-11): commit `243d6aa` `feat: conecta el puente de reservas con la comanda para reserva
    de atención y agrega sus pruebas de integración (HU-M5-06)` (`puente.py`, `test_puente.py` y
    `test_integracion_comanda.py`). Como la firma real difería, el cambio de `puente.py` es de comportamiento
    (la comanda sin vínculo se perdía en silencio), por eso el tipo es `feat` y no `test`. El commit de
    documentación (`tasks.md`, `design.md`, `spec.md` y `apply-progress.md`) es el que sigue a este. No hay
    atribución de IA en ningún mensaje de la rama.
- [x] 6.10 **Desbloqueada (depende de 6.9).** Medición final con `MEDIR` (backend y frontend por separado, con B si
  entró en este PR, y con las pruebas de integración) contra el pronóstico y el límite de 800 por lado. Las
  cifras pasan a la nota de tamaño del PR (P.6).
  - Evidencia (2026-11-11), `git diff --shortstat origin/develop...HEAD -- <lado>` (el merge de `develop` no
    cuenta: la base ya es `origin/develop`): backend `10 files changed, 1683 insertions(+), 6 deletions(-)`;
    frontend `14 files changed, 1246 insertions(+), 11 deletions(-)`. Sin pruebas: backend 100 y 2 líneas
    (4 archivos), frontend 391 y 6 (8 archivos); el resto son pruebas. Los dos lados superan el punto de
    control de 800 (excepción de tamaño, `single-pr`): la HU toca dos capas, no se recortaron pruebas y B1 a B3
    no entran (los hizo M4 en #236). El pronóstico del backend (550 a 755, hasta 935 con B) quedó por encima
    porque las pruebas de integración y del puente real suman unas 400 líneas.

## Fase 7. Antes del PR (persona; desbloqueada, la Fase 6 está hecha salvo la parte de la interfaz de 6.8)

Estas tareas las hace la persona responsable (o el agente con su confirmación explícita). Ninguna crea, cierra
ni edita issues, comentarios, PR ni tarjetas sin confirmación (AGENTS.md §8). El push y el PR los decide la
persona. **B1 y B2 ya están en `develop`** (PR #236, con otra forma: `crear_comanda_para_reserva`), así que el
PR ya se puede abrir; en P.2 la «aprobación de M4» es ese PR y la revisión de Juan que se pidió en él.

- [ ] P.1 **Desbloqueada (Fase 6 hecha).** Completar `Closes #68` en la descripción del PR, usando la
  plantilla `.github/pull_request_template.md` (read-only), con el PR hacia `develop` y el ID `HU-M5-06` en la rama
  y el título.
  - Evidencia:
- [ ] P.2 **Desbloqueada (0.2 resuelta por #236).** Mencionar en el PR (a) **la aprobación de M4**: el acuerdo escrito
  sobre B1 a B3, quién los implementó, el ID de sus commits y, si corresponde, el orden respecto del PR #230;
  y (b) **los supuestos pendientes de validación del equipo**: S53 y S57 (decisiones de producto), S54, S55,
  S56, S58 a S65 y las contradicciones C1 a C3, indicando cuáles siguen sin respuesta.
  - Evidencia:
- [ ] P.3 Anotar en el PR las diferencias con la maqueta (AGENTS.md §5): la pantalla de reservas de la maqueta
  (`SPRINT-2/S2-04-maqueta/reservas.html` (read-only)) no muestra una acción «Crear comanda» por fila (solo
  enlaza a la pantalla de comandas desde el menú), y el formulario de alta de la comanda se abre en un modal
  sobre la misma página en lugar de la página aparte de la maqueta (comanda-nueva.html).
  - Evidencia:
- [ ] P.4 `git pull origin develop` y resolver los conflictos en la rama; revisar `V-ALEMBIC` otra vez después del
  `pull` (un único head, sin cambios).
  - Evidencia:
- [ ] P.5 Correr los comandos de verificación de AGENTS.md §7, con la CI en verde: `V-BACK` (ruff, formato,
  `lint-imports`, `pytest` >= 70 %) y `V-FRONT` (`lint`, `format:check`, `typecheck`, `test:coverage` >= 60 %,
  `build`).
  - Evidencia:
- [ ] P.6 Redactar la nota de tamaño del PR con las cifras de 6.10, medidas con `MEDIR`, para `backend/` y
  `frontend/` por separado, frente al punto de control de 800 líneas por lado (AGENTS.md §4). Si algún lado
  lo supera (el diseño estima 620 a 850 en el frontend y hasta ≈ 935 en el backend con B), se explica que es
  una HU con dos capas y pruebas de integración, que no se divide y que no se recortaron pruebas; no es un
  bloqueo.
  - Evidencia:
- [ ] P.7 Pasar la tarjeta del tablero a «In Progress» al empezar y a «En Testing» cuando el PR se integre en
  `develop` (a mano; AGENTS.md §8). Revisión y aprobación de **otro integrante**, con la CI en verde
  (RNF-MAN-08).
  - Evidencia:

## Trazabilidad

| Requisito de la spec | Escenarios (resumen) | Tareas |
| --- | --- | --- |
| Crear una comanda desde una reserva activa de hoy (CA 1) | Comanda válida; A M4 se le pide la mesa y el vínculo; Un único commit; Varias líneas con producto y menú; Observaciones opcionales; Sin cliente propio; Crear una reserva no crea comanda; [Integración] persistencia y mesa ocupada | 1.9, 1.10, 2.1, 2.2, 6.4 |
| La mesa sale de la reserva (CA 1) | Hereda la mesa; Un cuerpo con mesa se rechaza; Otros campos extra se rechazan; El flujo no consulta la mesa | 1.3, 1.4, 1.9, 2.1 |
| Una reserva cancelada o ya atendida no se atiende (CA 2) | Cancelada anticipada; Cancelada por ausencia; Ya atendida; Doble envío | 1.5, 1.6, 1.9, 2.1 |
| Verificación aislada, la reserva es del día de hoy (CA 3, S57) | De mañana; De un día anterior; «Hoy» de la zona del restaurante; La hora no se verifica | 1.5, 1.6, 1.9, 1.14, 2.1 |
| Cantidad entera mayor que cero (CA 4) | Cero o negativa; No entera; Falta o nula; Una línea inválida anula todo | 1.3, 1.4, 2.1 |
| Forma del pedido | Sin detalles; Producto y menú en la misma línea; Línea sin producto ni menú; Identificador no positivo o no entero; Identificador de reserva no numérico | 1.3, 1.4, 2.1 |
| Verificación aislada, el pedido incluye al menos un producto (S53) | Solo menús; Varias líneas de menú; Un producto junto a menús alcanza | 1.7, 1.8, 1.9, 1.14, 2.1 |
| Reserva inexistente | Reserva inexistente | 1.5, 1.6, 2.1 |
| Orden de las verificaciones | Cuerpo inválido gana a inexistente y a cancelada; Atendida gana a otra fecha; Otra fecha gana a sin productos; Sin productos gana a M4 | 1.5, 1.7, 2.1 |
| Errores de M4 sin cambios en la reserva ni en la mesa | Producto inexistente; Producto o menú deshabilitado; Mesa no libre; Otra comanda abierta; Mesa inexistente; Se atiende al liberar la mesa; [Integración] mesa ocupada, fuera de servicio, cotización falla, base rechaza duplicada | 1.9, 1.10, 1.11, 1.12, 2.1, 6.4 |
| Atomicidad | Un error de M4 no deja la reserva atendida; Falla el commit; [Integración] falla tras crear la comanda | 1.9, 1.10, 1.14, 2.1, 6.4 |
| Una reserva genera a lo sumo una comanda (S65) | [Integración] Dos solicitudes simultáneas (con la traducción cubierta con el doble en 1.11) | 1.11, 1.12, 6.4 |
| La reserva atendida deja de ser modificable y cancelable | Una reserva atendida es terminal | 2.1 |
| M5 consume la interfaz de M4 solo a través del puente (B1 a B3) | El service llama al puente y se puede sustituir (D1); [Integración] B1 sin vínculo; B1 entero positivo; B2 no confirma; B2 conserva `crear_comanda`; B3 sin adaptadores | 1.1, 1.2, 1.9, 5.1 a 5.6, 6.2, 6.3, 6.6 |
| Aislamiento del módulo y sin migración | Sin migración nueva; La reserva no gana ningún atributo; Sin cambios en módulos ajenos sin acuerdo | 1.15, 2.1, 4.1, 4.2, 5.3, 5.6 |
| Acción «Crear comanda» en las filas activas | Solo en las filas activas; No depende de la fecha del navegador; Abre el modal sin llamar a la API | 3.11, 3.12, 3.13, 3.14, 3.16 |
| Modal «Crear comanda» | Contenido inicial; La mesa no se puede editar; Agregar y quitar líneas; Cerrar sin guardar; Un solo modal a la vez; Al abrir otra fila arranca limpio | 3.5, 3.6, 3.9, 3.10, 3.13, 3.14 |
| Validación local de las líneas (CA 4) | Cantidad inválida; Producto inválido; Un error bloquea todo el envío | 3.3, 3.4, 3.5, 3.6, 3.9, 3.10, 3.16 |
| Envío, avisos y recarga | Envío válido; Tras el éxito sale de las activas; Error del backend con su detalle; Atendida por otra persona; Doble clic; Llamada de la API del módulo | 3.1, 3.2, 3.5, 3.6, 3.9, 3.10, 3.13, 3.14, 3.16 |
| Aislamiento del frontend | Sin importaciones de otro módulo | 3.17, 4.1, 4.2 |

Cierre: la verificación de lo ejecutable ya es 4.1 y 4.2 (con 1.15, 2.4 y 3.17); la medición de tamaño está en
4.3 (parcial en 2.4 y 3.17, final en 6.10 y P.6); la puerta de M4 está en 0.2 y 6.1; la validación de supuestos,
en 0.3, 0.4 y P.2; las diferencias con la maqueta, en P.3.
