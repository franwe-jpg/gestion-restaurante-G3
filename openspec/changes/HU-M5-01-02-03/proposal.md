# Propuesta: HU-M5-01-02-03 Crear, modificar y listar reservas

- **HU incluidas** (textos de la hoja «Story Map» de `G3_Backlog.xlsx`):
  - **HU-M5-01:** «Como encargado, quiero crear una reserva para asegurar una mesa al cliente.»
  - **HU-M5-02:** «Como encargado, quiero modificar una reserva para cambiar fecha, hora o comensales.»
  - **HU-M5-03:** «Como encargado, quiero listar las reservas para planificar el servicio.»
- **Issues:** no se leyeron en esta fase (no hubo autorización). Hay que completar el número de cada issue antes del PR (`Closes #<HU-M5-01>`, `Closes #<HU-M5-02>`, `Closes #<HU-M5-03>`); se buscan en el [GitHub Project #2](https://github.com/users/franwe-jpg/projects/2). Los criterios de aceptación de abajo salen de la consigna, el diagrama de clases, S1-07, S2-02 y la maqueta. Lo que no está definido se marca `Supuesto:`. Excepción posterior: se consultó el issue #61 (HU-M5-01), que resolvió la capacidad de la mesa (S5) y, en un delta posterior a la primera implementación, pidió elegir la mesa de una lista de mesas disponibles y excluir las mesas fuera de servicio (S4, S13).
- **Módulo:** M5 Reservas. **Responsable:** Federico Cabaña. **Rama:** `feature/HU-M5-01-02-03-abm-reservas` (desde `develop`). Es un solo cambio con un solo PR, porque es el grupo ABM de una entidad con un mismo responsable (AGENTS.md §4).
- **Exploración:** `openspec/changes/HU-M5-01-02-03/exploration.md`.

## Intención

Hoy el módulo `reservas` es un esqueleto vacío en el backend y en el frontend: el encargado no tiene forma de asegurar una mesa para un cliente ni de ver qué reservas tiene cada día. Este cambio crea la entidad `Reserva` con sus reglas (fecha no pasada, cantidad de personas positiva, sin dos reservas `ACTIVA` en la misma mesa, fecha y hora), la forma de modificar fecha, hora y cantidad de personas, y un listado paginado para planificar el servicio.

M3 (Mesa) y M4 (Cliente) todavía no exponían lo que M5 necesita. Por eso el módulo se hizo **autocontenido**: guarda los identificadores y valida Mesa y Cliente con un puente propio que se reemplaza cuando esos módulos estén listos.

**Delta del issue #61 (después de la primera implementación):** la mesa ya no se escribe por su número; la persona la elige de una lista de mesas disponibles para la fecha y la hora. Por eso el lado Mesa del puente pasa a consultar a M3 de verdad, con el `listar_mesas` que M3 ya expone en su `service`, y el alta rechaza una mesa fuera de servicio. El lado Cliente sigue siendo un stub hasta que M4 exponga Cliente.

## Alcance

### Incluido

- **Backend:** `models` (`Reserva` y enum `EstadoReserva` con `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA`), `schemas`, `repository`, `service` y `router` de `reservas`, y registro del `router` en `backend/app/main.py`.
- **Migración Alembic** nueva sobre el head `a8c0e2b4d6f8` (cantidad entregada de M4; antes `b2d4f6a8c0e1`), que crea la tabla de reservas.
- **Puente Mesa/Cliente** dentro de `reservas/`: una función o protocolo del `service` con una implementación stub, aislada y fácil de reemplazar. Con el delta del issue #61, el lado Mesa es real: consulta a M3 solo con `app.modules.salon.service.listar_mesas` y lee todas sus páginas (S33); el lado Cliente sigue como stub.
- **HU-M5-01:** crear una reserva (mesa, cliente, fecha, hora, cantidad de personas) que queda en estado `ACTIVA`. Con el delta, el alta rechaza con 409 una mesa fuera de servicio (S31).
- **Mesas disponibles (delta del issue #61):** `GET /reservas/mesas-disponibles?fecha&hora`, una lista simple de las mesas que no están fuera de servicio y no tienen una reserva `ACTIVA` en esa fecha y hora exactas (S4, S29, S30, S32), y un selector de mesa en el formulario de alta que se llena con esa lista (S13, S34).
- **HU-M5-02:** consultar una reserva por id y modificar su fecha, hora y cantidad de personas. Las reglas del alta se revalidan sin contar la propia reserva. La mesa y el cliente no cambian.
- **HU-M5-03:** listado paginado (D-27, `backend/app/shared/paginacion.py`) con filtros opcionales por fecha y estado.
- **Frontend:** listado, formulario de alta y formulario de edición en `frontend/src/modules/reservas/` (`pages`, `components`, `api.ts`, `types.ts`), guiados por `SPRINT-2/S2-04-maqueta/reservas.html`.
- **Ajuste mínimo fuera de M5:** los 2 tests de migración de M3 (`backend/tests/modules/salon/test_migracion.py`, cerca de las líneas 116 y 258) hacen `downgrade` relativo atado al head actual y se rompen con la nueva revisión. Se corrigen con el cambio más chico posible (anclar la revisión de M3 en lugar del desplazamiento relativo) y se anota en el PR para avisar a Giuliano (AGENTS.md §9.3).
- Una prueba por criterio de aceptación de cada HU (camino feliz y error o límite), con Strict TDD.

### Excluido

- Cancelaciones: anticipada (HU-M5-04) y por ausencia (HU-M5-05).
- Generar una comanda desde la reserva (HU-M5-06).
- Reporte de reservas (HU-M5-07).
- Cualquier cambio en el código de M3 (`backend/app/modules/salon/`, `frontend/src/modules/salon/`) o de M4 (`atencion/`), salvo el ajuste de los tests de migración de arriba.
- Cambios en `shared/` (backend y frontend): `formatearFecha` y `StatusBadge` no se tocan. Ver S11 y S12.
- Claves foráneas hacia `mesas` y `clientes` (ver S10).

## Capacidades

### Nuevas

- `reservas-gestion`: alta, consulta por id, modificación y listado paginado de reservas, con sus reglas de validación, el estado inicial, la consulta de las mesas disponibles para una fecha y hora (delta del issue #61) y el contrato del puente con Mesa (real, sobre M3) y Cliente (stub).

### Modificadas

- Ninguna. En `openspec/specs/` no hay ninguna spec de reservas, y `salon-mesas` (de HU-M3-05, aún sin archivar) no cambia a nivel de requisitos.

## Enfoque

- **Capas:** `router → service → repository → models`, siguiendo el patrón de M1 `productos` y M3 `salon`. El `service` no importa FastAPI y usa las excepciones de `backend/app/shared/excepciones.py`. Los errores responden `{"detalle": "mensaje"}` (D-25, D-26).
- **API** (las rutas exactas se fijan en la spec): `POST /api/v1/reservas`, `GET /api/v1/reservas` (paginado, filtros `fecha` y `estado`), `GET /api/v1/reservas/{id}` y `PUT /api/v1/reservas/{id}`. El delta del issue #61 agrega `GET /api/v1/reservas/mesas-disponibles?fecha&hora`, declarada antes de `GET /api/v1/reservas/{id}`.
- **Puente:** el `service` depende de una abstracción mínima (`obtener_mesa`, `listar_mesas` y `existe_cliente`) dentro de `reservas/`. En la primera implementación las dos operaciones eran stubs y no se importaba nada de `salon` ni de `atencion`. Con el delta, el lado Mesa llama a `app.modules.salon.service.listar_mesas`, que es lo único que M3 ofrece (paginado, sin búsqueda por `id` ni filtro por estado), y lee todas sus páginas; el puente es el único archivo que importa de `salon`. Los contratos de importación (`lint-imports`) se cumplen sin cambios, porque permiten importar el `service` de otro módulo. Cuando M4 exponga Cliente, solo se cambia `existe_cliente`.
- **Datos:** la tabla guarda `mesa_id` y `cliente_id` como enteros, sin FK (S10). Las columnas siguen el diagrama: `fecha`, `hora`, `cantidad_personas`, `estado`.
- **Regla de conflicto:** coincidencia exacta de mesa, fecha y hora entre reservas `ACTIVA` (diagrama, sin duración). Se valida en el `service`, consultando el `repository`.
- **Frontend:** `api.ts` y `types.ts` propios; una página de listado con filtros y paginación, y una página de formulario que sirve para alta y edición (como en M1), reutilizando los componentes de `frontend/src/shared/components/`. La fecha se formatea dentro del módulo para no mostrar el día anterior en UTC-3 (S11). (El diseño resolvió una sola pantalla con panel lateral, sin rutas nuevas.) Con el delta, el campo Mesa del alta es un selector que se llena con la lista de mesas disponibles pedida al `api.ts` de `reservas`, sin importar nada del módulo `salon` del frontend; en la edición, Mesa sigue siendo de solo lectura.

## Supuestos a validar por el equipo

| # | Supuesto: |
| --- | --- |
| S1 | **Estado inicial `ACTIVA`.** Lo dicen el diagrama de clases, S2-02 y la maqueta. **Contradicción de fuentes:** S1-07 (CP-HU-M5-01) usa `PENDIENTE`. Se sigue el diagrama porque manda en nombres y valores; el equipo tiene que validarlo y corregir S1-07. |
| S2 | **Horario de atención:** ninguna fuente lo define, así que no se restringe la hora de la reserva (vale cualquier hora del día). Si el equipo define un horario, se agrega como validación 422 en un cambio posterior. |
| S3 | **Fecha y hora pasadas:** `fecha` tiene que ser hoy o posterior (diagrama `{>= hoy}`). Si `fecha` es hoy, `hora` tiene que ser posterior a la hora actual del servidor. Si no se cumple, responde 422. La hora se maneja en minutos (sin segundos). |
| S4 | **Mesa «disponible» (reescrito por el issue #61):** la mesa existe según el puente, su estado en M3 no es `FUERA_DE_SERVICIO` y no tiene otra reserva `ACTIVA` con la misma fecha y hora exactas. El estado `OCUPADA` no la excluye (S30). No se modela duración. La primera versión decía que no se modelaba el estado de la mesa; el issue #61 dice que una mesa fuera de servicio no está disponible y gana sobre esa versión (AGENTS.md §2). |
| S5 | **Capacidad:** resuelto por el issue #61 (HU-M5-01): «Cantidad de personas (obligatoria): número entero mayor a cero. El sistema no la valida contra la capacidad de la mesa (se resuelve en forma presencial)». La cantidad de personas no se valida contra la capacidad de la mesa; se resuelve en forma presencial. S1-07 pedía `cantidadPersonas <= capacidad`, pero el issue manda sobre esa guía (AGENTS.md §2). Con el delta, el puente informa la capacidad solo para mostrarla en el selector de mesas; ninguna regla la compara con la cantidad de personas. |
| S6 | **Cliente:** se identifica por `cliente_id` entero. El stub da por válido cualquier id positivo hasta que M4 exponga Cliente. S1-07 no menciona al cliente; el diagrama sí (Cliente 1 - Reserva). |
| S7 | **Modificar:** solo se puede modificar una reserva `ACTIVA` (si no, 409). Se modifican `fecha`, `hora` y `cantidadPersonas`. Se revalidan S3 y S4 sin contar la propia reserva. La mesa y el cliente no cambian (diagrama). No hay control de concurrencia: gana la última modificación. |
| S8 | **Listado:** paginado (D-27); filtros opcionales `fecha` (día exacto) y `estado`; orden ascendente por `fecha`, `hora` e `id`. Sin filtros, la API devuelve todas las reservas. El frontend arranca con el filtro de estado `ACTIVA`. |
| S9 | **Códigos de error:** 404 si la reserva no existe, y también si la mesa o el cliente indicados no existen según el puente. 409 si hay conflicto con otra reserva `ACTIVA`, si se intenta modificar una reserva que no está `ACTIVA` o, con el delta, si la mesa está fuera de servicio (S31). 422 para errores de validación (fecha u hora pasadas, `cantidadPersonas <= 0`). El diseño lo alinea con el criterio que usaron M1 y M3. |
| S10 | **Sin claves foráneas:** la tabla `clientes` no existe (M4 vacío) y `reservas` no declara claves foráneas hacia Mesa ni Cliente, aunque con el delta la mesa se consulte a M3 por el puente. La integridad referencial la cubre el puente; las FK se agregan con una migración posterior, cuando M3 y M4 estén integrados. |
| S11 | **Fechas en el frontend:** `formatearFecha` (`frontend/src/shared/lib/format.ts:9-18`) muestra el día anterior en UTC-3 con fechas `YYYY-MM-DD`. M5 formatea sus fechas dentro del módulo, sin tocar `shared/`, y se avisa al equipo para corregir la función compartida. |
| S12 | **Insignia de estado:** `StatusBadge` no conoce los estados de `EstadoReserva`. M5 asigna el texto y la variante dentro del módulo, sin modificar `shared/`. |
| S13 | **Selección de mesa y cliente en el formulario (reescrito por el issue #61):** la Mesa se elige de la lista de mesas disponibles que arma la propia API de reservas a partir de M3, porque el `numero` de una mesa es único solo dentro de su sector y pedirlo a mano es ambiguo. Mientras M4 no exponga clientes, el Cliente se pide por su identificador. La primera implementación pedía también la mesa por su identificador. Las diferencias con la maqueta se anotan en el PR. |
| S14 | **Nombre del atributo:** la HU dice «comensales» y el diagrama `cantidadPersonas`. En el código se usa `cantidad_personas` / `cantidadPersonas` (gana el diagrama); en la pantalla puede decir «Comensales» o «Personas», según la maqueta. |

Supuestos de la spec (S15 en adelante) que el delta del issue #61 reescribe o agrega; el texto completo está en `specs/reservas-gestion/spec.md`:

- **S20 (reescrito):** el lado Mesa del puente es real; una mesa con id positivo ya no existe por el solo hecho de serlo. El lado Cliente sigue siendo un stub. Las pruebas usan un doble del puente con las mesas que cada escenario necesita.
- **S23 (reescrito):** `ReservaSalida` y la tabla no cambian; la tabla sigue mostrando «Mesa n.º {mesa_id}» con el `id` interno, que puede no coincidir con el `numero`. Mostrar sector y número en el listado queda para un cambio posterior.
- **S29 a S35 (nuevos):** lista de mesas disponibles sin paginar (S29); `OCUPADA` no excluye (S30); mesa fuera de servicio en el alta responde 409 (S31); la consulta reutiliza las reglas de «no pasado» del alta (S32); el puente lee todas las páginas de M3 (S33); textos y comportamiento del selector (S34); la lista es informativa y el alta vuelve a verificar (S35).

## Áreas afectadas

| Área | Impacto | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/{models,schemas,repository,service,router}.py` | Nuevo (hoy solo docstrings) | Entidad, reglas, puente stub y API |
| `backend/alembic/versions/<nueva>.py` | Nuevo | Tabla de reservas; `down_revision = a8c0e2b4d6f8` |
| `backend/app/main.py` | Modificado | Registrar el `router` de reservas |
| `backend/tests/modules/reservas/` | Nuevo | Pruebas de `service`, `router` y migración |
| `backend/tests/modules/salon/test_migracion.py` | Modificado (mínimo; módulo de M3, avisar a Giuliano) | Anclar el `downgrade` a la revisión de M3 |
| `frontend/src/modules/reservas/{pages,components,api.ts,types.ts}` | Nuevo / Modificado | Listado y formulario de alta y edición |
| Rutas del frontend (`frontend/src/App.tsx` o equivalente) | Modificado si hace falta (compartido, avisar) | Rutas de alta y edición, si la ruta del módulo no las cubre (el diseño resolvió no modificarlo) |
| `backend/app/modules/reservas/{puente,schemas,repository,service,router}.py` | Modificado (delta del issue #61) | Puente real con M3, `GET /reservas/mesas-disponibles`, 409 por mesa fuera de servicio |
| `backend/tests/modules/reservas/` | Modificado (delta) | Doble del puente por defecto, pruebas del puente real (120 mesas, falla de M3) y de mesas disponibles; tres pruebas existentes se adaptan |
| `frontend/src/modules/reservas/{api.ts,types.ts,components/}` | Modificado y nuevo (delta) | `listarMesasDisponibles`, `MesaDisponible`, `useMesasDisponibles`, `SelectorMesa`; cambios en el formulario y su validación |
| `backend/app/modules/salon/`, `frontend/src/modules/salon/`, `shared/`, `compose.yaml`, migraciones | Sin cambios (delta) | El delta solo consume `salon.service.listar_mesas`; no hay migración nueva |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| La nueva revisión de Alembic rompe los tests de migración de M3. | (a estimar por el equipo) | Ajuste mínimo previsto en el alcance; avisar a Giuliano en el PR. |
| Otro PR (por ejemplo, de M3) agrega una revisión sobre `b2d4f6a8c0e1` al mismo tiempo y deja dos heads. | (a estimar por el equipo) | Antes del PR, `git pull origin develop` y rebasar `down_revision` sobre el head vigente; comprobar con `alembic heads`. |
| El stub del puente deja pasar mesas o clientes inexistentes hasta conectar M3/M4. | (a estimar por el equipo) | Abstracción explícita y tareas de seguimiento; S6 y S10 visibles para el equipo. Con el delta, el lado Mesa ya consulta a M3; el riesgo queda solo para el cliente. |
| (Delta) El puente lee todas las páginas de M3 en cada alta y en cada consulta de mesas disponibles. | (a estimar por el equipo) | Costo aceptable con las decenas de mesas de un restaurante (S33); seguimiento: pedir a M3 una búsqueda por `id` o un filtro por estado. |
| (Delta) M3 cambia el contrato de `salon.service.listar_mesas`. | (a estimar por el equipo) | Las pruebas del puente real usan el `service` verdadero de M3 y fallan en la CI; se avisa a Giuliano en el PR que `reservas` lo consume. |
| (Delta) M3 falla mientras el puente lee sus páginas. | (a estimar por el equipo) | El error no se captura: 500, sin lista parcial y sin guardar la reserva (exigido por la spec). |
| (Delta) El reloj del servidor (UTC en Docker, `compose.yaml` sin `TZ`) difiere del navegador (UTC-3). | (a estimar por el equipo) | El selector muestra el 422 de la API. Se propone fijar `TZ` en `compose.yaml` en un cambio aparte y coordinado con el equipo; no es parte de este cambio. |
| (Delta) La tabla muestra «Mesa n.º {id interno}», que puede no coincidir con el número elegido en el selector (S23). | (a estimar por el equipo) | Limitación aprobada; se anota en el PR y queda como seguimiento. |
| El equipo elige `PENDIENTE` (S1-07) en lugar de `ACTIVA`. | (a estimar por el equipo) | El valor vive en un solo enum; cambiarlo es local, más un ajuste de migración si ya se integró. |
| El frontend supera el punto de control de 800 líneas. | (a estimar por el equipo) | Informativo: un solo PR, nunca se divide; la nota del PR informa el total. |
| Fechas corridas un día por zona horaria. | (a estimar por el equipo) | Formateo propio del módulo con pruebas en UTC-3 (S11). |

Los riesgos no llevan valores de probabilidad (AGENTS.md §9.9).

## Plan de reversión

El cambio **toca el esquema** (nueva migración Alembic):

1. **Antes de integrar:** descartar la rama; `develop` no cambia.
2. **Ya integrado en `develop`:** en cada base que haya aplicado la migración, ejecutar `alembic downgrade a8c0e2b4d6f8` desde `backend/` (bajar a `b2d4f6a8c0e1` borraría también las tablas de otros módulos (menús, mozos, clientes, comandas y medios de pago)). El `downgrade()` de la revisión borra la tabla de reservas (se pierden las reservas cargadas; exportarlas antes si hay datos que conservar). Después, revertir el merge en `develop` (`git revert -m 1 <merge>`), que también deshace el registro del `router`, el frontend y el ajuste de los tests de M3.
3. **Verificación:** `alembic heads` muestra `a8c0e2b4d6f8` como único head, y `pytest` (incluido `salon/test_migracion.py`) queda en verde.

El `downgrade()` de la migración se prueba en `backend/tests/modules/reservas/` (upgrade, downgrade y upgrade otra vez).

**Delta del issue #61:** no cambia el esquema ni agrega migraciones. Para deshacer solo el delta antes de integrar, se revierten sus commits en la rama; no hace falta ningún `alembic downgrade`. Ya integrado, el plan de arriba no cambia: revertir el merge deshace también el delta.

## Dependencias

- Ninguna bloqueante: el módulo es autocontenido gracias al puente. Con el delta, el puente depende de `salon.service.listar_mesas` (HU-M3-08), que ya existe en el código de M3 y no se modifica.
- **Seguimiento (tareas posteriores, fuera de este PR):**
  - ~~Reemplazar el stub de Mesa por `salon.service`~~: resuelto por el delta del issue #61 con `salon.service.listar_mesas`. Sigue pendiente pedir a M3 un `obtener_mesa` por `id` o un filtro por estado, para que el puente no lea todas las páginas (S33).
  - Reemplazar el stub de Cliente por el `service` de Cliente cuando M4 lo exponga (S6).
  - Agregar las FK `mesa_id` y `cliente_id` con una migración nueva (S10).
  - Cambiar el formulario a selectores de mesa y cliente (S13): la mesa quedó resuelta por el delta; falta el cliente (búsqueda y alta, criterio «cliente no registrado» del issue #61, depende de M4).
  - Mostrar el sector y el número de la mesa en la tabla en lugar del `id` interno (S23).
  - Proponer al equipo fijar `TZ` en `compose.yaml` para que el reloj del servidor coincida con el del restaurante.
  - Proponer al equipo la corrección de `formatearFecha` y de `StatusBadge` en `shared/` (S11, S12).

## Orden de implementación sugerido

1. **HU-M5-01 (crear):** migración, `models`, `schemas`, puente stub, `repository`, `service`, `router`, ajuste de los tests de M3; después el formulario de alta y el `api.ts`.
2. **HU-M5-03 (listar):** consulta paginada con filtros en el backend; después la página de listado (enlaces a alta y edición).
3. **HU-M5-02 (modificar):** `GET` y `PUT` por id con revalidación sin contar la propia reserva; después el formulario en modo edición.

## Presupuesto de revisión estimado (punto de control, no bloqueo)

| Lado | Límite | Estimación | Detalle |
| --- | --- | --- | --- |
| `backend/` | 800 | ~650 a 800 | Código del módulo ~280, migración ~50, `main.py` y tests de M3 ~15, pruebas ~350 a 450 |
| `frontend/` | 800 | ~750 a 950 | Páginas y componentes ~350, `api.ts` y `types.ts` ~80, pruebas ~350 a 500 |

El frontend puede superar el punto de control. Es informativo: la HU va en un solo PR.

El delta del issue #61 suma, según el diseño, unas ~500 a 780 líneas en el backend y ~390 a 630 en el frontend (código y pruebas). Con eso los dos lados superan el punto de control de 800; sigue siendo informativo, la HU no se divide y la nota del PR informa el total real.

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M5-01, HU-M5-02 y HU-M5-03 (definidos en la spec) tiene una prueba que pasa: al menos una del camino feliz y una de error o de límite por HU.
- [ ] Una reserva nueva queda `ACTIVA`; una segunda reserva `ACTIVA` en la misma mesa, fecha y hora responde 409.
- [ ] Modificar revalida sin contar la propia reserva y rechaza reservas que no están `ACTIVA`.
- [ ] El listado está paginado con `shared/paginacion.py` y respeta los filtros y el orden de S8.
- [ ] La migración sube y baja sin errores; `salon/test_migracion.py` sigue en verde con el ajuste mínimo.
- [ ] No hay cambios en el código de M3, M4 ni `shared/`; `lint-imports` pasa sin tocar contratos.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, Vitest ≥ 60 %, lint, typecheck y build.
- [ ] El equipo valida S1 a S14 y la contradicción `ACTIVA` / `PENDIENTE`.
- [ ] El PR enlaza los tres issues con un `Closes #<n>` por issue e incluye el aviso a Giuliano.
- [ ] (Delta) `GET /reservas/mesas-disponibles` excluye las mesas fuera de servicio y las que tienen una reserva `ACTIVA` en ese turno, y el puente real lee todas las páginas de M3 (prueba con 120 mesas).
- [ ] (Delta) El alta rechaza con 409 una mesa fuera de servicio y acepta una mesa `OCUPADA`.
- [ ] (Delta) El formulario de alta elige la mesa de la lista, descarta respuestas viejas y no importa nada del módulo `salon` del frontend.
