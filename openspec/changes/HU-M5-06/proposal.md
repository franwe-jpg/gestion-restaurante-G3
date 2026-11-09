# Propuesta: HU-M5-06 Crear una comanda a partir de una reserva

- **HU:** HU-M5-06 ([issue #68](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/68)) «Crear una comanda a partir de una reserva». El PR lleva `Closes #68`.
- **Módulo:** M5 Reservas. **Responsable:** Federico Cabaña. **Rama:** `feature/HU-M5-06-comanda-desde-reserva`, creada desde `origin/develop`. Un solo cambio y un solo PR (AGENTS.md §4).
- **Exploración:** Engram `sdd/HU-M5-06/explore` (observación 20). Esta propuesta la referencia y no la repite.
- **Fuentes:** el texto del issue #68 manda (AGENTS.md §2). Lo complementan el supuesto 4 de `SPRINT-2/S2-02-supuestos-y-fecha.md` (ya adoptado por el equipo), el diagrama de clases (`Reserva.crearComanda(): Comanda`, relación «genera 0..1») y el contrato provisorio de Comanda de S2-01 (`backend/app/shared/contratos/comanda.py`, `backend/tests/shared/fakes/comanda.py`).

## Intención

Hoy una reserva `ACTIVA` no tiene forma de convertirse en atención: cuando el cliente llega, el mozo tiene que crear una comanda suelta cargando la mesa a mano, la comanda queda sin vínculo con la reserva y la reserva sigue `ACTIVA` para siempre. Ninguna función del sistema produce el estado `ATENDIDA` (confirmado en la exploración).

Este cambio permite que el mozo elija una reserva `ACTIVA` del día y cargue solo los productos: la comanda nace `ABIERTA`, en la mesa de la reserva, vinculada a ella (el cliente se conoce a través de la reserva), y la reserva pasa a `ATENDIDA`, todo en una sola operación atómica. Es además el último flujo de M5 que falta para el objetivo del Sprint 3 (`SPRINT-0/Plan-de-trabajo-Sprint.md`, línea 322) y la fuente del estado `ATENDIDA` que más adelante usa el reporte de HU-M5-07.

## Alcance

El cambio tiene dos partes de naturaleza distinta. **(A)** es el trabajo que este cambio ejecuta, todo dentro de `reservas/`. **(B)** es un contrato que M5 necesita de M4 y de `shared/`; se declara como dependencia con una firma propuesta, a acordar con su responsable, y **este cambio no lo ejecuta sin ese acuerdo** (AGENTS.md §9.3).

### (A) Incluido: alcance de M5

- **Backend, `reservas/service.py`:**
  - Una guarda nueva para atender (por ejemplo `_obtener_atendible`), con la forma de `_obtener_cancelable`: 404 si no existe, 409 si está cancelada, 409 si ya fue atendida, 409 si su `fecha` no es la de hoy según `ahora()` (UTC-3, S28).
  - La función de orquestación `crear_comanda(db, reserva_id, datos)` (nombre del diagrama: `Reserva.crearComanda()`): valida la reserva, exige al menos una línea de producto (ver S1), arma el pedido con la mesa de la reserva y su `id`, llama a la primitiva de M4 **sin confirmación**, pasa la reserva a `ATENDIDA` y hace **un único `db.commit()`**; ante cualquier error, `rollback` y no cambia nada (patrón de `registrar_cliente_para_reserva`, `reservas/puente.py:100-105`).
- **Backend, `reservas/puente.py`:** una función más que delega en la primitiva de M4 (único punto de contacto de M5 con `atencion.service`, como hoy con el cliente).
- **Backend, `reservas/schemas.py`:** el cuerpo de entrada `ComandaDesdeReservaCrear` con `detalles: list[DetalleComandaCrear]` (`min_length=1`) y `observaciones` opcional, reutilizando el DTO compartido de `shared/contratos/comanda.py` (sin editarlo). Sin `mesa_id`: la mesa sale de la reserva.
- **Backend, `reservas/router.py`:** `POST /api/v1/reservas/{reserva_id}/comanda`, que responde **201** con la `ComandaSalida` compartida (ver S4).
- **Frontend, `frontend/src/modules/reservas/`:**
  - Acción «Crear comanda» por fila en `ReservasTabla`, solo en reservas `ACTIVA`, junto a las acciones existentes.
  - Un modal propio (`Dialog` de `shared/components/ui/`, AGENTS.md §5) con la mesa de la reserva en solo lectura y las líneas de producto (producto y cantidad entera mayor que cero); aviso de éxito con `useToast` y recarga del listado; aviso `danger` con el `detalle` del backend ante 404, 409 o 422.
  - `api.ts` con `crearComandaDesdeReserva(reservaId, datos)` y los tipos de entrada y salida en `types.ts`.
  - No se importa `ComandaForm` ni `usePedido` de `atencion/` (AGENTS.md §9.4: un módulo del frontend no importa archivos de otro).
- **Pruebas (Strict TDD, `openspec/config.yaml`):** una por criterio de aceptación y sus límites. Mientras (B) no esté en `develop`, la orquestación de M5 se prueba contra un puerto con un doble (ver «Cómo avanza M5 sin esperar a M4»).

### (B) Contrato requerido a M4 y a `shared/` (dependencia, no trabajo de este cambio)

Responsable del módulo: Juan Ignacio Riquelme (M4). `crear_comanda` la introdujo Juan (commit `35d7478`, HU-M4-04-07-09), pero el plan reasignó HU-M4-04 a Franco Martín Soler (`SPRINT-0/Plan-de-trabajo-Sprint.md`, línea 304) y Franco también modificó `atencion/service.py`, así que conviene que el acuerdo incluya a los dos.

| # | Cambio pedido | Firma propuesta | Impacto en lo existente |
| --- | --- | --- | --- |
| B1 | `ComandaCrear` acepta el vínculo con la reserva | `reserva_id: StrictInt \| None = Field(default=None, gt=0)` en `backend/app/shared/contratos/comanda.py` | Aditivo: el valor por defecto es `None`, ningún llamador actual cambia. La columna `comandas.reserva_id` y `ComandaSalida.reserva_id` ya existen; `repository.crear_comanda` tiene que copiar el campo al `model`. |
| B2 | Crear la comanda sin confirmar la transacción | `atencion.service.crear_comanda_sin_confirmar(db: Session, datos: ComandaCrear) -> ComandaSalida`: misma validación que `crear_comanda` (comanda abierta en la mesa, mesa `LIBRE`, cotización, ocupar la mesa) y `db.flush()` en lugar de `db.commit()`; no hace `rollback`, lo hace quien llama. | `crear_comanda` pasa a llamarla y conserva su `commit`, su `rollback` y el manejo del `IntegrityError`, así que el endpoint y las pruebas de M4 no cambian. |
| B3 | Proveedores de los puertos dentro de M4 | La primitiva de B2 construye `MesasDeSalon()` y `CatalogoDeCarta()` internamente (o los recibe con esos valores por defecto). | M5 no puede importar `atencion.adaptadores` (AGENTS.md §9.4: solo el `service` de otro módulo). |

Si M4 prefiere otra forma (por ejemplo, un parámetro `confirmar: bool = True` en `crear_comanda`), la orquestación de M5 se adapta en `puente.py` sin cambiar nada más. Lo que no es negociable para los criterios de aceptación es que la primitiva **no confirme**: con dos `commit` separados, un fallo entre ambos deja una comanda sin reserva atendida o una reserva atendida sin comanda.

### Cómo avanza M5 sin esperar a M4

- `puente.py` es la costura: la orquestación del `service` de M5 depende de una función del puente con la firma de B2. Las pruebas del `service` y del `router` de M5 reemplazan esa función con un doble (`monkeypatch`) que imita el contrato acordado: crea la comanda en memoria o lanza el error de M4. Así se prueban de punta a punta las validaciones de la reserva, el orden de los códigos, la transición a `ATENDIDA` y la ausencia de cambios ante un error.
- El frontend no depende de M4: se prueba con la API simulada, como el resto del módulo.
- **Bloqueado hasta que B1 y B2 estén en `develop`:** la implementación real de la función del puente, la prueba de integración con SQLite real (comanda persistida con `reserva_id`, mesa `OCUPADA`, reserva `ATENDIDA`, y nada persistido si la cotización falla) y la apertura del PR. Si M4 acuerda que lo haga Federico, B1 y B2 entran en este mismo PR en commits separados, con la aprobación de M4 anotada en el PR; si no, este PR espera al de M4.

### Excluido

- Ejecutar B1, B2 o B3 sin acuerdo explícito del responsable de M4 (AGENTS.md §9.3). El pulgar arriba recibido en el grupo no se toma como acuerdo sobre quién lo hace.
- Columna `comanda_id` en `Reserva` y cualquier migración (ver S2).
- Clave foránea o índice nuevo sobre `comandas.reserva_id`.
- Cambios en M3 (`salon/`), en `ComandaForm` o en el endpoint general de comandas.
- Deshacer la atención (volver una reserva `ATENDIDA` a `ACTIVA`) o borrar el vínculo si luego se anula la comanda: ninguna HU lo pide.
- Mostrar en la pantalla de reservas la comanda generada, más allá del aviso de éxito con su número.
- El reporte de reservas y ausentismo (HU-M5-07).

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `reservas-gestion`: se agrega el requisito «Crear una comanda a partir de una reserva» (transición `ACTIVA → ATENDIDA`, contrato del endpoint, reglas y acción de la pantalla). **Observación:** esa capacidad todavía vive solo en cambios sin archivar (`openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md` y el delta de `HU-M5-04-05`); `openspec/specs/` no tiene spec de reservas. El delta de este cambio se escribe contra esa spec y se ajusta si se archiva antes.

## Enfoque

### Recomendado: M5 orquesta y M4 expone una primitiva sin confirmación

Es el Enfoque 1 de la exploración. La dependencia sigue en una sola dirección (`reservas → atencion`, nunca al revés), como ya hace `puente.py`; la atomicidad repite el patrón de `registrar_cliente_para_reserva` (M4 escribe sin confirmar y M5 confirma una sola vez); y la lógica de la HU vive en el módulo de su responsable. El costo es el contrato (B), que requiere coordinación.

Orden de las verificaciones:

| Paso | Caso | Código | Quién lo decide |
| --- | --- | --- | --- |
| 1 | Cuerpo inválido: sin detalles, cantidad no entera o no mayor que cero, producto y menú a la vez o ninguno | 422 | Pydantic, con el DTO compartido (antes de leer la reserva) |
| 2 | La reserva no existe | 404 | M5 |
| 3 | La reserva está cancelada (cualquiera de los dos estados) | 409 | M5 |
| 4 | La reserva ya fue atendida | 409 | M5 |
| 5 | La fecha de la reserva no es la de hoy | 409 | M5 |
| 6 | Ninguna línea es un producto (S1) | 422 | M5 |
| 7 | Producto inexistente o deshabilitado; mesa con otra comanda abierta o no `LIBRE` | 404 / 409 | M4 (primitiva de B2) |
| 8 | Todo válido | 201 | M5 confirma una vez |

El orden 2 a 6 coincide con el del doble de S2-01 (`test_contrato_comanda.py:277-410`). Que la validación del cuerpo vaya antes que la reserva es propio de FastAPI y no se puede invertir sin perder la validación declarativa; se registra para la spec.

### Alternativas descartadas

- **M4 orquesta (`atencion.service.crear_desde_reserva`):** es la forma literal del doble de S2-01, pero `atencion` tendría que importar `reservas.service` mientras `reservas.puente` ya importa `atencion.service`: dependencia circular entre paquetes, evitable solo con importaciones diferidas que ningún otro módulo usa. Además pone la lógica de esta HU en el archivo de otro responsable, que es lo que AGENTS.md §9.3 busca evitar.
- **Entidad o tabla de vínculo aparte:** innecesaria. `Comanda.reserva_id` ya existe de punta a punta (columna, migración `e7c9a1b3d5f0`, `ComandaSalida`, tipo del frontend) y no la usa nadie. Una tabla nueva sumaría migración y consultas sin que ninguna HU lo pida.
- **Dos `commit` separados (M4 confirma la comanda y M5 luego la reserva):** no necesita cambiar M4 más allá de B1, pero rompe la atomicidad que exige el CA1 y que el doble de S2-01 ya prueba.

## Supuestos a validar por el equipo

| # | Supuesto: |
| --- | --- |
| S1 | **«Al menos un producto» se lee en forma literal:** al menos una línea con `producto_id`; un pedido hecho solo de menús ejecutivos se rechaza con 422 («La comanda debe incluir al menos un producto»). Las líneas de menú se aceptan junto a un producto. Es lo que dice el issue #68 («Productos: lista con al menos un producto») y lo que ya fija el doble de S2-01 (`test_contrato_comanda.py:336-343`). La lectura genérica (cualquier línea, como HU-M4-04) haría innecesario el paso 6. **Decisión de producto pendiente.** |
| S2 | **El vínculo es solo `Comanda.reserva_id`;** `Reserva` no gana `comanda_id`. Alcanza para «genera 0..1» (la comanda de una reserva se obtiene filtrando por `reserva_id`), no necesita migración y evita mantener dos punteros sincronizados entre dos módulos. El doble de S2-01 modela `ReservaFake.comanda_id`: ese atributo se declara **superado** para la implementación real; el resto del doble (orden de validaciones, atomicidad, mesa heredada) se **adopta** como referencia de comportamiento. El doble no se edita en este cambio: es de `tests/shared/` y su ajuste se acuerda con M4. |
| S3 | **La mesa reservada está `LIBRE` en M3.** `EstadoMesa` solo tiene `LIBRE`, `OCUPADA` y `FUERA_DE_SERVICIO` (`shared/models/enums.py`); no existe «reservada», y las reservas nunca cambian el estado de la mesa (las cancelaciones de HU-M5-04-05 lo confirman). La verificación de M4 (mesa `LIBRE`, `atencion/adaptadores.py:25-28`) es correcta y no se relaja: si la mesa sigue `OCUPADA` por una comanda anterior o está fuera de servicio, la creación falla con el 409 de M4 y la reserva sigue `ACTIVA`. La comanda creada ocupa la mesa, igual que el alta general. |
| S4 | **Contrato de la API:** `POST /api/v1/reservas/{reserva_id}/comanda` (acción de negocio como `POST` sobre un subrecurso, D-24), cuerpo `{"detalles": [...], "observaciones": "..."}` y respuesta **201** con `ComandaSalida` (con `reserva_id` y la mesa de la reserva). Errores con `{"detalle": "mensaje"}`: 404 reserva inexistente; 409 reserva cancelada, ya atendida, de otra fecha, mesa no libre o con comanda abierta; 422 cuerpo inválido o sin productos. Los textos exactos se fijan en la spec. |
| S5 | **«Se advierte» que la reserva es de otra fecha significa rechazar** con 409 («La reserva {id} no corresponde al día de hoy»), no un aviso que permite seguir. Ver la contradicción C1. |
| S6 | **Selección de productos por su número (ID) en el modal,** igual que el formulario actual de comandas de M4 (`DetallePedidoFila.tsx`, «Referencia (ID)»). Un buscador de productos sería otro componente y otra HU. |
| S7 | **La acción se muestra en toda fila `ACTIVA`,** sin calcular la fecha en el navegador: el backend decide y el aviso muestra su mensaje (mismo criterio que S7 de HU-M5-04-05). |
| S8 | **Actor:** el issue habla del mozo; la pantalla de reservas es la misma para todos porque el sistema no tiene roles ni inicio de sesión. No se agrega control de acceso. |

## Contradicciones entre fuentes (señaladas, no resueltas)

- **C1:** el issue #68 dice que, con una reserva de otra fecha, «se advierte que no corresponde al día actual», y S2-02 dice «el sistema avisa». Las dos frases admiten un aviso no bloqueante. A la vez, el mismo issue fija como dato obligatorio una reserva «del día actual», y el doble de S2-01 la rechaza. La propuesta toma el rechazo (S5); el equipo debe confirmarlo.
- **C2:** el doble de S2-01 modela `Reserva.comanda_id`; el diagrama de clases solo indica la relación «genera 0..1», sin atributo. La propuesta no agrega el atributo (S2).
- **C3:** el alta general de HU-M4-04 acepta un pedido solo de menús; el issue #68 exige al menos un producto. La propuesta aplica la regla más estricta solo en este flujo (S1).

## Áreas afectadas

| Área | Impacto | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/service.py` | Modificado | Guarda para atender, regla de fecha de hoy, `crear_comanda` con un único `commit` |
| `backend/app/modules/reservas/puente.py` | Modificado | Delegación a la primitiva sin confirmación de M4 |
| `backend/app/modules/reservas/schemas.py` | Modificado | `ComandaDesdeReservaCrear` con el DTO compartido de detalle |
| `backend/app/modules/reservas/router.py` | Modificado | `POST /reservas/{reserva_id}/comanda` |
| `backend/app/modules/reservas/{models,repository}.py` | Sin cambios | `ATENDIDA` ya existe; sin columnas nuevas |
| `backend/tests/modules/reservas/` | Modificado | Pruebas del `service` y del `router` con el doble del puente; integración real cuando B esté en `develop` |
| `frontend/src/modules/reservas/api.ts`, `types.ts` (+ pruebas) | Modificado | Llamada y tipos de entrada y salida |
| `frontend/src/modules/reservas/components/` (modal y hook nuevos, + pruebas) | Nuevo | Formulario de líneas de producto y avisos |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx`, `pages/ReservasPage.tsx` (+ pruebas) | Modificado | Acción por fila y conexión del modal |
| `backend/app/shared/contratos/comanda.py` | Dependencia (B1) | Lo cambia M4 o se cambia con su acuerdo |
| `backend/app/modules/atencion/service.py`, `repository.py` | Dependencia (B2, B3) | Lo cambia M4 o se cambia con su acuerdo; hay conflicto posible con el PR #230 (HU-M4-06), que edita `service.py` |
| `backend/tests/shared/fakes/comanda.py`, `test_contrato_comanda.py` | Sin cambios | Referencia de comportamiento; `comanda_id` queda superado (S2) |
| Migraciones (`backend/alembic/`) | Sin cambios | No hay cambio de esquema |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| No hay acuerdo explícito con M4 sobre quién hace B1 a B3 ni sobre la firma; el PR queda trabado al final del sprint. | (a estimar por el equipo) | Pedir confirmación explícita con la tabla de (B) como propuesta concreta; mientras tanto, M5 avanza contra el doble del puente. Es una decisión de rumbo que requiere a la persona (AGENTS.md §4). |
| El PR #230 (HU-M4-06) edita `atencion/service.py` y choca con B2. | (a estimar por el equipo) | B2 es aditiva (una función nueva y una llamada desde `crear_comanda`); integrar después de #230 o rebasar sobre él. |
| Al separar el `commit` de `crear_comanda`, se pierde el manejo del `IntegrityError` de la comanda abierta duplicada en el flujo de M5. | (a estimar por el equipo) | M5 traduce ese error en su `rollback` al mismo 409 que M4, o M4 expone el traductor en su `service`; se fija en el diseño. |
| La mesa de la reserva está `OCUPADA` por la comanda anterior aún abierta y el mozo no puede atender. | (a estimar por el equipo) | Es el comportamiento esperado (S3): el aviso de M4 lo explica y la reserva sigue `ACTIVA` hasta que se cierre la otra comanda. |
| El equipo elige la lectura genérica de S1 o el aviso no bloqueante de S5 después de implementar. | (a estimar por el equipo) | Cada regla es una verificación aislada con su prueba; resolverlas antes de la spec. |
| El doble de S2-01 queda desalineado (modela `comanda_id`) y confunde a quien lo lea. | (a estimar por el equipo) | Declararlo superado en ese punto (S2) y proponer a M4 el ajuste del doble. |
| La spec de `reservas-gestion` sigue sin archivar. | (a estimar por el equipo) | Escribir el delta contra la spec abierta y ajustarlo al archivar. |

Los riesgos no llevan valores de probabilidad (AGENTS.md §9.9).

## Plan de reversión

El cambio **no toca el esquema**: no hay migración, y tanto `ATENDIDA` como `comandas.reserva_id` ya existían.

1. **Antes de integrar:** descartar la rama o revertir sus commits.
2. **Ya integrado en `develop`:** revertir el merge (`git revert -m 1 <merge>`). Si B1 y B2 entraron en este mismo PR, se revierten con él; como son aditivas, el endpoint general de comandas sigue funcionando igual. Si entraron por un PR de M4, ese PR se conserva y solo se revierte el de M5.
3. **Datos:** las comandas creadas desde una reserva siguen siendo comandas válidas con `reserva_id`, y las reservas `ATENDIDA` son un estado válido; no queda la base inconsistente. Volver alguna reserva a `ACTIVA` sería una corrección manual fuera de este plan.
4. **Verificación:** `pytest`, `lint-imports` y `npm test` en verde; `alembic heads` sin cambios.

## Dependencias

- **B1, B2 y B3** del contrato con M4 (Juan Ignacio Riquelme, responsable de M4; HU-M4-04 está reasignada a Franco Martín Soler). Bloquean la implementación real del puente, la prueba de integración y la apertura del PR, no el resto.
- **PR #230 (HU-M4-06):** coordinar el orden de integración por el solapamiento en `atencion/service.py`.
- **HU-M4-04 (crear comanda):** ya está en `develop`; es la base de B2.
- Respuesta del equipo a S1 y S5 antes de la spec.

## Presupuesto de revisión estimado (punto de control, no bloqueo)

| Lado | Límite | Estimación | Detalle |
| --- | --- | --- | --- |
| `backend/` | 800 | ~300 a 450 | `service` ~50, `puente` ~15, `schemas` ~15, `router` ~15, pruebas ~200 a 330; B1 a B3 sumarían ~40 a 80 más si entran en este PR |
| `frontend/` | 800 | ~450 a 600 | `api.ts` y `types.ts` ~30, modal y hook ~150 a 200, tabla y página ~30, pruebas ~240 a 340 |

La HU va en un solo PR aunque supere el límite (AGENTS.md §4).

## Criterios de éxito

- [ ] CA1: crear una comanda desde una reserva `ACTIVA` de hoy responde 201; la comanda queda `ABIERTA`, con `reserva_id` de la reserva y en su mesa (que pasa a `OCUPADA`), y la reserva queda `ATENDIDA`, en un único `commit`.
- [ ] CA2: con una reserva cancelada (anticipada o por ausencia) o ya atendida responde 409 con el aviso, no se crea comanda y nada cambia.
- [ ] CA3: con una reserva `ACTIVA` de otra fecha responde 409 con el aviso «no corresponde al día de hoy» (según S5) y nada cambia.
- [ ] CA4: una cantidad no entera, cero o negativa responde 422 con el aviso de cantidad inválida y nada cambia.
- [ ] Límites: 404 para una reserva inexistente; 422 para un pedido sin detalles o solo con menús (según S1); error de M4 (producto inexistente o mesa no libre) sin cambios en la reserva ni en la mesa.
- [ ] La acción «Crear comanda» aparece solo en las filas `ACTIVA`, el modal no pide la mesa y muestra los avisos del backend.
- [ ] Sin migración nueva; `lint-imports` pasa sin tocar contratos; M5 solo usa `atencion.service` a través de `puente.py`.
- [ ] Ningún archivo de M4 ni de `shared/` cambia sin el acuerdo explícito de su responsable, anotado en el PR.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, Vitest ≥ 60 %, lint, typecheck y build.
- [ ] El equipo valida S1 a S8 y las contradicciones C1 a C3.
- [ ] El PR lleva `Closes #68`.
