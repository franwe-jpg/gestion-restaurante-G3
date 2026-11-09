# Delta para reservas-gestion (HU-M5-06)

Origen: HU-M5-06, «Crear una comanda a partir de una reserva» ([issue #68](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/68)), un solo cambio, una rama y un PR (`Closes #68`). Delta sobre `openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md`, que hoy es el texto completo de la capacidad `reservas-gestion` porque ese cambio todavía no se archivó, y sobre el delta `openspec/changes/HU-M5-04-05/specs/reservas-gestion/spec.md` (cancelaciones). Si alguno de los dos se archiva antes, este delta se ajusta (propuesta, sección «Capacidades»).

No modifica ningún requisito existente: agrega la creación de una comanda desde una reserva, la verificación de cada regla, la interfaz que M5 asume de M4 y la acción nueva de la pantalla. Es la primera ruta de la capacidad que asigna el estado `ATENDIDA` (que el enumerado y la columna ya admitían desde HU-M5-01-02-03). No toca `salon-mesas` ni ninguna otra capacidad.

Fuera de alcance (propuesta, sección «Excluido»): ejecutar el contrato con M4 sin su acuerdo explícito; la columna `comanda_id` en `Reserva` y cualquier migración; una clave foránea o un índice sobre `comandas.reserva_id`; cambios en `salon/`, en `ComandaForm` o en el endpoint general de comandas; deshacer la atención o borrar el vínculo si luego se anula la comanda; mostrar la comanda generada en la pantalla de reservas más allá del aviso de éxito; el reporte de ausentismo (HU-M5-07).

## Criterios de aceptación del issue #68

El issue manda sobre el diagrama de clases y sobre la maqueta (AGENTS.md, sección 2). Datos del issue: la reserva `ACTIVA` del día que elige el mozo; los productos (una lista con al menos un producto, cada uno con una cantidad entera mayor que cero); la mesa sale de la reserva; la comanda queda vinculada a la reserva; el estado de la comanda es `ABIERTA`. Los criterios se citan en esta spec como «HU-M5-06 CA n» (el texto íntegro está en el issue):

| CA | Resumen |
| --- | --- |
| CA 1 | Con una reserva `ACTIVA` del día y los productos cargados, la comanda queda vinculada a la reserva y en la mesa reservada, y la reserva pasa a `ATENDIDA`. |
| CA 2 | Con una reserva cancelada o ya atendida no se permite crear la comanda y se avisa. |
| CA 3 | Con una reserva de otra fecha se advierte que no corresponde al día actual. |
| CA 4 | Con una cantidad que no es un entero mayor que cero se informa que la cantidad es inválida. |

## Convención de los escenarios

Salvo que se indique otra cosa, los escenarios reutilizan el reloj fijo `AHORA` de `backend/tests/modules/reservas/conftest.py` y el `DoblePuente` de ese mismo archivo, como el delta de HU-M5-04-05. Con ese reloj, «hoy» es `2026-11-02` y la hora actual de la zona del restaurante (S28) es `12:00`. El `DoblePuente` ofrece las mesas 5 y 6 (sector «Salón», `LIBRE`, capacidad 4) y el cliente 7. El valor del reloj es el del fixture real y no el de la «Convención» de la spec base, que quedó desactualizada (ver la nota del delta de HU-M5-04-05).

- «La reserva de referencia» es la reserva `ACTIVA` con `id` 10, mesa 5, cliente 7, `fecha` `2026-11-02`, `hora` `21:30` y 4 personas.
- «El pedido de referencia» es el cuerpo `{"detalles": [{"producto_id": 12, "cantidad": 2}]}`.
- «El doble» es el `DoblePuente` ampliado con la operación `crear_comanda_sin_confirmar` (sección «Interfaz asumida de M4»). Esa operación no escribe en la base: devuelve una `ComandaSalida` con `id` consecutivo desde 1, `mesa_id` y `reserva_id` iguales a los del `ComandaCrear` recibido, `estado` `ABIERTA`, las `observaciones` recibidas y un detalle por línea en el mismo orden (`precio_unitario` `100.00`, `descuento` `0.00`, `estado_entrega` `PENDIENTE`). Guarda las llamadas recibidas, para comprobar si fue invocada y con qué datos, y, si el escenario lo indica, lanza en cambio el error de M4 que se nombra. «El doble no fue invocado» quiere decir que esa lista está vacía.
- Los escenarios marcados **[Integración, condicionado a B1 y B2]** usan la primitiva real de M4 sobre una base SQLite de prueba con las mesas de M3, y solo son ejecutables cuando B1 y B2 estén en `develop`. Hasta entonces quedan pendientes y no bloquean al resto de la spec.
- En los escenarios de frontend, «la API» es la API simulada de las pruebas del módulo, como en el resto de la pantalla.

## Contradicciones entre fuentes (señaladas, no resueltas)

- **C1.** El issue #68 dice que, con una reserva de otra fecha, «se advierte que no corresponde al día actual», y `SPRINT-2/S2-02-supuestos-y-fecha.md` dice «el sistema avisa». Las dos frases admiten un aviso no bloqueante. A la vez, el mismo issue fija como dato obligatorio una reserva «del día actual», y el doble de S2-01 la rechaza. Esta spec toma el rechazo (S57); el equipo debe confirmarlo.
- **C2.** El doble de S2-01 modela `Reserva.comanda_id`; el diagrama de clases solo indica la relación «genera 0..1», sin atributo. Esta spec no agrega el atributo (S54).
- **C3.** El alta general de comandas (HU-M4-04) acepta un pedido hecho solo de menús ejecutivos; el issue #68 exige al menos un producto. Esta spec aplica la regla más estricta solo en este flujo (S53).

## Contrato de la API (agregado)

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25, igual que el resto de la capacidad.

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `POST /reservas/{reserva_id}/comanda` | `reserva_id` entero en la ruta; JSON `ComandaDesdeReservaCrear` | 201, `ComandaSalida` | 404, 409, 422 |

Es una acción de negocio como `POST` sobre un subrecurso de la reserva (D-24, S56), igual que las dos cancelaciones.

Esquemas (nombres JSON en `snake_case`):

- `ComandaDesdeReservaCrear` (esquema de M5): `detalles: list[DetalleComandaCrear]`, obligatorio y con al menos un elemento, y `observaciones: str | None`, opcional (por defecto nulo). NO lleva `mesa_id`: la mesa sale de la reserva. Los campos extra están prohibidos (S62).
- `DetalleComandaCrear` (DTO compartido de `backend/app/shared/contratos/comanda.py`, que M5 reutiliza sin editarlo): exactamente uno de `producto_id` o `menu_ejecutivo_id`, enteros estrictos mayores que cero, y `cantidad`, entero estricto mayor que cero.
- `ComandaSalida` (DTO compartido): en este flujo, `mesa_id` es la mesa de la reserva, `reserva_id` es el `id` de la reserva, `estado` es `ABIERTA` y `detalles` conserva el orden enviado. Los demás campos (`id`, `fecha_hora`, precios, descuentos, `estado_entrega`) los define M4.

Orden de las verificaciones (S56). Cada paso se evalúa solo si el anterior no falló, y ningún paso anterior al 7 escribe en la base:

| Paso | Caso | Código | Quién lo decide |
| --- | --- | --- | --- |
| 1 | Ruta o cuerpo inválidos: `reserva_id` no entero; sin detalles; cantidad no entera o no mayor que cero; producto y menú a la vez o ninguno; campos extra | 422 | FastAPI y el DTO compartido, antes de leer la reserva |
| 2 | La reserva no existe | 404 | M5 |
| 3 | La reserva está cancelada (cualquiera de los dos estados) | 409 | M5 |
| 4 | La reserva ya fue atendida | 409 | M5 |
| 5 | La `fecha` de la reserva no es la de hoy | 409 | M5 |
| 6 | Ninguna línea es un producto | 422 | M5 |
| 7 | Producto o menú inexistente o deshabilitado; mesa inexistente, con otra comanda abierta o no `LIBRE`; cualquier otro error de M4 | 404, 409 o 422 | M4 (primitiva de B2) |
| 8 | Todo válido: comanda creada, reserva `ATENDIDA` y un único `commit` | 201 | M5 |

Que la validación del cuerpo (paso 1) vaya antes que la lectura de la reserva es propio de FastAPI y no se invierte sin perder la validación declarativa. Por eso una lista de detalles vacía responde 422 aunque la reserva esté cancelada, a diferencia del doble de S2-01 (ver «Reconciliación con el contrato provisorio de S2-01»).

Mensajes de negocio de M5 (S61):

| Paso | Código | `detalle` |
| --- | --- | --- |
| 1 | 422 | `Datos invalidos. <campo>: <mensaje>`, del manejador global existente; nombra cada campo inválido (por ejemplo `detalles.0.cantidad`) |
| 2 | 404 | La reserva {id} no existe |
| 3 | 409 | La reserva {id} ya fue cancelada |
| 4 | 409 | La reserva {id} ya fue atendida |
| 5 | 409 | La reserva {id} no corresponde al día de hoy |
| 6 | 422 | La comanda debe incluir al menos un producto |

Los errores del paso 7 salen de M4 con su código y su `detalle`, sin que M5 los reescriba. Textos que M4 y los módulos que consulta devuelven hoy, solo como referencia: 404 «El producto {id} no existe», 404 «El menú ejecutivo {id} no existe», 409 «El producto {nombre} está deshabilitado», 409 «El menú ejecutivo {nombre} está deshabilitado», 409 «La mesa {numero} no está libre» (con el `numero` de la mesa) y 409 «An ABIERTA Comanda already exists for this Mesa» (en inglés, y con la clave extra `comanda_id` en el cuerpo, por el manejador de M4). Los fija M4, no esta spec.

## Datos

Este cambio no modifica el esquema: no hay tabla ni columna nueva, ni migración (S54).

- `comandas.reserva_id`: entero nulo, sin clave foránea ni índice, creado por la migración `e7c9a1b3d5f0`. Es el único vínculo entre la comanda y la reserva. Lo escribe la primitiva de M4 a partir de B1.
- `reservas.estado`: `ATENDIDA` ya está entre los cuatro valores de `EstadoReserva`; la columna es de texto, sin restricción de base sobre los valores.
- `Reserva` NO gana `comanda_id`. La comanda de una reserva se obtiene filtrando por `comandas.reserva_id` («genera 0..1» del diagrama de clases). Que una reserva genere a lo sumo una comanda lo garantiza la transición `ACTIVA` a `ATENDIDA`, que ocurre una sola vez, y no una restricción de la base.
- La comanda no guarda un cliente propio: el cliente se conoce a través de la reserva (`reserva.cliente_id`).
- La comanda nueva y el cambio de estado de la reserva se escriben en la misma transacción.

## Interfaz asumida de M4 y de `shared/` (B1 a B3)

> **ESTADO: INTERFAZ ASUMIDA, DEPENDENCIA A ACORDAR CON SU RESPONSABLE.** Nada de lo que sigue existe hoy en `develop`: `crear_comanda_sin_confirmar` y el campo `reserva_id` de `ComandaCrear` no están. Son archivos de M4 (Juan Ignacio Riquelme, que introdujo `crear_comanda` en el commit `35d7478`, HU-M4-04-07-09) y de `shared/`. HU-M4-04 está reasignada a Franco Martín Soler, que también modificó `atencion/service.py`; el acuerdo debe incluir a los dos. Este cambio NO ejecuta B1, B2 ni B3 sin ese acuerdo explícito (AGENTS.md, sección 9.3). Un pulgar arriba en el grupo no se toma como acuerdo sobre quién lo hace.

Condicionamiento: hasta que B1 y B2 estén en `develop`, (a) las pruebas del `service` y del `router` de M5 usan el doble, (b) los escenarios **[Integración, condicionado a B1 y B2]** quedan pendientes y (c) el PR no se abre. Si M4 acuerda que lo haga Federico, B1 y B2 entran en este mismo PR en commits separados, con la aprobación de M4 anotada en el PR; si no, este PR espera al de M4.

| # | Interfaz asumida | Firma propuesta | Efecto sobre lo existente |
| --- | --- | --- | --- |
| B1 | `ComandaCrear` acepta el vínculo con la reserva | `reserva_id: StrictInt \| None = Field(default=None, gt=0)` en `backend/app/shared/contratos/comanda.py` | Aditivo: el valor por defecto es `None`, ningún llamador actual cambia. La columna y `ComandaSalida.reserva_id` ya existen; `repository.crear_comanda` tiene que copiar el campo al `model`. |
| B2 | Crear la comanda sin confirmar la transacción | `atencion.service.crear_comanda_sin_confirmar(db: Session, datos: ComandaCrear) -> ComandaSalida`: misma validación que `crear_comanda` (comanda abierta en la mesa, mesa `LIBRE`, cotización, ocupar la mesa) y `db.flush()` en lugar de `db.commit()`; no hace `rollback`, lo hace quien llama. | `crear_comanda` pasa a llamarla y conserva su `commit`, su `rollback` y el manejo del `IntegrityError`, así que el endpoint y las pruebas de M4 no cambian. |
| B3 | Proveedores de los puertos dentro de M4 | La primitiva de B2 construye `MesasDeSalon()` y `CatalogoDeCarta()` internamente, o los recibe con esos valores por defecto. | M5 no puede importar `atencion.adaptadores` (AGENTS.md, sección 9.4: de otro módulo solo se importa el `service`). |

La interfaz que M5 consume dentro de su propio módulo es una sola operación del puente (nombre de referencia, el diseño lo fija), con la firma de B2:

| Operación | Entrada | Resultado |
| --- | --- | --- |
| `crear_comanda_sin_confirmar` | `db: Session`, `datos: ComandaCrear` (con la `mesa_id` de la reserva, su `id` como `reserva_id`, los `detalles` y las `observaciones`) | La `ComandaSalida`. Delega en `atencion.service.crear_comanda_sin_confirmar`, que agrega la comanda a la sesión y ocupa la mesa sin confirmar ni deshacer. Propaga tal cual los errores de M4. |

El `service` de M5 DEBE llamar a esa operación como `puente.crear_comanda_sin_confirmar(...)`, para que las pruebas puedan sustituirla, y es el único punto de contacto de M5 con `atencion.service` para este flujo.

Lo que no es negociable para los criterios de aceptación es que la primitiva **no confirme**: con dos `commit` separados, un fallo entre ambos deja una comanda sin reserva atendida o una reserva atendida sin comanda. Si M4 prefiere otra forma (por ejemplo, un parámetro `confirmar: bool = True` en `crear_comanda`), cambia el cuerpo de la operación del puente y nada más.

Puntos que el acuerdo con M4 tiene que decidir y que esta spec no resuelve:

- B1 amplía el DTO compartido, así que `POST /api/v1/comandas` también aceptaría `reserva_id` en su cuerpo. La propuesta no lo cubre: hay que decidir si el endpoint general lo ignora, lo rechaza o lo admite.
- Al separar el `commit` de `crear_comanda`, el manejo del `IntegrityError` de la comanda abierta duplicada tiene que quedar a cargo de M5 o expuesto por M4. Lo fija el diseño (propuesta, sección «Riesgos»).

## Reconciliación con el contrato provisorio de S2-01

El doble `backend/tests/shared/fakes/comanda.py` (`ComandaFake.crear_desde_reserva`) y sus pruebas `backend/tests/shared/test_contrato_comanda.py:277-410` son una referencia de comportamiento anterior a la implementación. No se editan en este cambio: son de `tests/shared/` y su ajuste se acuerda con M4.

| Punto del doble | Estado en esta spec | Nota |
| --- | --- | --- |
| La firma recibe solo `(reserva_id, detalles)` y la mesa se hereda de la reserva | Adoptado | Requisito «La mesa sale de la reserva». |
| Orden: reserva inexistente, no activa, otra fecha, sin productos, catálogo | Adoptado, con una diferencia | En la API el cuerpo se valida antes de leer la reserva (paso 1), así que una lista vacía responde 422 de forma antes que cualquier 409; el doble la valida después de la fecha. |
| Reserva `CANCELADA` o `ATENDIDA`: un solo error 409 | Refinado | Dos mensajes distintos: «ya fue cancelada» y «ya fue atendida» (pasos 3 y 4). |
| La reserva gana `comanda_id` | Superado | S54: el vínculo es solo `Comanda.reserva_id`. |
| Producto y menú en el mismo pedido se aceptan; un pedido de solo menús se rechaza | Adoptado | S53. |
| Todo error deja intactos la reserva, la mesa y la lista de comandas | Adoptado | Requisito «Atomicidad». |
| La comanda no agrega un cliente propio; crear la reserva no crea ninguna comanda | Adoptado | Requisitos «Crear una comanda desde una reserva activa de hoy» y «La mesa sale de la reserva». |
| El error de fecha espera un mensaje que contiene «fecha» (`match="fecha"`) | Diferencia de redactado | El texto de esta spec, «La reserva {id} no corresponde al día de hoy», no contiene esa palabra. El doble no se ejecuta contra la implementación real, así que no hay conflicto; se registra para quien ajuste el doble. |

## ADDED Requirements

### Requisito: Crear una comanda desde una reserva activa de hoy (HU-M5-06 CA 1)

`POST /api/v1/reservas/{reserva_id}/comanda` DEBE, con una reserva `ACTIVA` cuya `fecha` es hoy y un pedido válido con al menos un producto, crear una comanda `ABIERTA` en la mesa de la reserva, vinculada a ella (el `reserva_id` de la comanda es el `id` de la reserva), pasar la reserva a `ATENDIDA` y responder 201 con la `ComandaSalida`. La comanda y el cambio de estado DEBEN ser una sola operación atómica y confirmarse con un único `commit`. La reserva solo cambia de `estado`: `mesa_id`, `cliente_id`, `fecha`, `hora` y `cantidad_personas` se conservan. La comanda NO DEBE tener un cliente propio. Las `observaciones` son opcionales (S56).

#### Escenario: Comanda válida desde una reserva activa de hoy

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES responde 201 con una `ComandaSalida` con `estado` `ABIERTA`, `mesa_id` 5, `reserva_id` 10 y un detalle con `producto_id` 12 y `cantidad` 2
- Y `GET /reservas/10` devuelve `estado` `ATENDIDA` con `mesa_id` 5, `cliente_id` 7, `fecha` `2026-11-02`, `hora` `21:30` y `cantidad_personas` 4, iguales a los de antes

#### Escenario: A M4 se le pide la comanda con la mesa y el vínculo de la reserva

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES el doble recibió exactamente una llamada, con `mesa_id` 5, `reserva_id` 10 y los detalles del pedido en el mismo orden

#### Escenario: Un único commit

- DADO la reserva de referencia, el doble y un espía sobre `db.commit`
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES `db.commit` se llamó exactamente una vez, después de la llamada al doble y de pasar la reserva a `ATENDIDA`

#### Escenario: Varias líneas, con producto y menú en el mismo pedido

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con las líneas, en este orden, producto 12 por 2, menú ejecutivo 5 por 1 y producto 13 por 1
- ENTONCES responde 201 con tres detalles en ese orden y la reserva queda `ATENDIDA`
- Y Supuesto: S53, las líneas de menú se aceptan junto a un producto

#### Escenario: Observaciones opcionales

- DADO la reserva de referencia y otra reserva `ACTIVA` de hoy, ambas en mesas distintas, y el doble
- CUANDO se hace `POST` sobre la primera con el pedido de referencia y `observaciones` `"Sin sal"`, y sobre la segunda con el pedido de referencia sin `observaciones`
- ENTONCES la primera `ComandaSalida` trae `observaciones` `"Sin sal"` y la segunda trae `observaciones` nulo

#### Escenario: La comanda no trae un cliente propio

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES la `ComandaSalida` no tiene ninguna clave de cliente
- Y el cliente 7 se conoce por `GET /reservas/10`, cuyo `cliente_id` no cambió

#### Escenario: Crear una reserva no crea ninguna comanda

- DADO el doble
- CUANDO se hace `POST /reservas` con datos válidos
- ENTONCES responde 201 con la reserva `ACTIVA` y el doble no fue invocado

#### Escenario: [Integración, condicionado a B1 y B2] La comanda se persiste con el vínculo y ocupa la mesa

- DADO la primitiva real de M4, una mesa `LIBRE` de M3 y una reserva `ACTIVA` de hoy en esa mesa
- CUANDO se hace `POST /reservas/{id}/comanda` con un producto habilitado
- ENTONCES responde 201 y en la base existe una sola comanda `ABIERTA` con `reserva_id` igual al `id` de la reserva y `mesa_id` igual al de la reserva
- Y la mesa de M3 pasa a `OCUPADA` y la reserva queda `ATENDIDA`

### Requisito: La mesa sale de la reserva (HU-M5-06 CA 1)

La comanda DEBE crearse en la `mesa_id` de la reserva. El cuerpo NO DEBE incluir `mesa_id`: `ComandaDesdeReservaCrear` prohíbe los campos extra (S62), así que un cuerpo con `mesa_id`, `reserva_id`, `estado`, `cliente_id` o cualquier otro campo desconocido DEBE responder 422 nombrando el campo, sin crear nada y sin invocar a M4. En este flujo M5 NO DEBE consultar el estado de la mesa al puente: que la mesa exista y esté `LIBRE` lo verifica M4 (S55).

#### Escenario: La comanda hereda la mesa de la reserva

- DADO una reserva `ACTIVA` de hoy con `id` 11 en la mesa 6 y el doble
- CUANDO se hace `POST /reservas/11/comanda` con el pedido de referencia
- ENTONCES responde 201 con `mesa_id` 6
- Y el doble recibió una llamada con `mesa_id` 6

#### Escenario: Un cuerpo con mesa se rechaza

- DADO la reserva de referencia (mesa 5) y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia más `mesa_id` 6
- ENTONCES responde 422 y el `detalle` nombra `mesa_id`
- Y la reserva sigue `ACTIVA`, el doble no fue invocado y no se crea ninguna comanda
- Y Supuesto: S62

#### Escenario: Otros campos extra se rechazan

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia más, por separado, `reserva_id` 10, `estado` `ATENDIDA` y `cliente_id` 7
- ENTONCES cada pedido responde 422 nombrando el campo extra, la reserva sigue `ACTIVA` y el doble no fue invocado

#### Escenario: El flujo no consulta la mesa al puente

- DADO la reserva de referencia, el doble y un espía sobre `obtener_mesa` y `listar_mesas` del puente
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES responde 201 y ninguna de las dos operaciones fue llamada

### Requisito: Una reserva cancelada o ya atendida no se atiende (HU-M5-06 CA 2)

Con una reserva `CANCELADA_ANTICIPADA` o `CANCELADA_POR_AUSENCIA` el sistema DEBE responder 409 «La reserva {id} ya fue cancelada» (paso 3). Con una reserva `ATENDIDA` DEBE responder 409 «La reserva {id} ya fue atendida» (paso 4). En los dos casos NO DEBE invocar a M4, ni crear una comanda, ni cambiar la reserva ni la mesa. El `detalle` es el aviso que la pantalla muestra a la persona. Los textos son de referencia (S61).

#### Escenario: Reserva cancelada anticipadamente

- DADO una reserva `CANCELADA_ANTICIPADA` con `id` 11 y el doble
- CUANDO se hace `POST /reservas/11/comanda` con el pedido de referencia
- ENTONCES responde 409 con `{"detalle": "La reserva 11 ya fue cancelada"}`
- Y la reserva sigue `CANCELADA_ANTICIPADA` y el doble no fue invocado

#### Escenario: Reserva cancelada por ausencia

- DADO una reserva `CANCELADA_POR_AUSENCIA` con `id` 12 y el doble
- CUANDO se hace `POST /reservas/12/comanda` con el pedido de referencia
- ENTONCES responde 409 con «La reserva 12 ya fue cancelada»
- Y la reserva sigue `CANCELADA_POR_AUSENCIA` y el doble no fue invocado

#### Escenario: Reserva ya atendida

- DADO una reserva `ATENDIDA` con `id` 13 y el doble
- CUANDO se hace `POST /reservas/13/comanda` con el pedido de referencia
- ENTONCES responde 409 con `{"detalle": "La reserva 13 ya fue atendida"}`
- Y la reserva sigue `ATENDIDA` y el doble no fue invocado

#### Escenario: Doble envío de la misma reserva

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia y, una vez terminada esa solicitud, otra vez con el mismo cuerpo
- ENTONCES la primera responde 201 y la segunda responde 409 con «La reserva 10 ya fue atendida»
- Y el doble recibió una sola llamada y la reserva sigue `ATENDIDA`

### Requisito: Verificación aislada, la reserva es del día de hoy (HU-M5-06 CA 3, S57)

Esta verificación (paso 5) DEBE vivir en una regla propia, independiente de las demás, de modo que cambiarla no toque el orden ni el resto de las verificaciones. Supuesto: S57 (propuesta S5), «se advierte» se lee como rechazo, no como un aviso que deja seguir (contradicción C1). Si la `fecha` de la reserva no es la de hoy, comparada con la fecha de `ahora()` en la zona del restaurante (S28), el sistema DEBE responder 409 «La reserva {id} no corresponde al día de hoy», sin invocar a M4, sin crear una comanda y dejando la reserva `ACTIVA`. La regla vale para fechas futuras y para fechas pasadas. La hora de la reserva NO se verifica (S63).

Si el equipo decide que es un aviso no bloqueante, este requisito se reemplaza por uno que defina cómo confirma la persona el aviso (por ejemplo, un indicador en el cuerpo); ninguna fuente lo define, por eso no se especifica. Una reserva `ACTIVA` de un día anterior no se puede atender: su salida es la cancelación por ausencia (S47 del delta de HU-M5-04-05).

#### Escenario: Reserva de mañana

- DADO una reserva `ACTIVA` con `id` 14 y `fecha` `2026-11-03`, y el doble
- CUANDO se hace `POST /reservas/14/comanda` con el pedido de referencia
- ENTONCES responde 409 con `{"detalle": "La reserva 14 no corresponde al día de hoy"}`
- Y la reserva sigue `ACTIVA`, el doble no fue invocado y no se crea ninguna comanda
- Y Supuesto: S57

#### Escenario: Reserva de un día anterior

- DADO una reserva `ACTIVA` con `id` 15 y `fecha` `2026-11-01`, y el doble
- CUANDO se hace `POST /reservas/15/comanda` con el pedido de referencia
- ENTONCES responde 409 con «La reserva 15 no corresponde al día de hoy» y la reserva sigue `ACTIVA`

#### Escenario: «Hoy» es el de la zona del restaurante

- DADO el reloj UTC del servidor en `2026-11-03 02:30` (en la zona del restaurante son las `2026-11-02 23:30`), la zona del proceso en UTC, el doble, la reserva de referencia (`fecha` `2026-11-02`) y una reserva `ACTIVA` con `id` 14 y `fecha` `2026-11-03`
- CUANDO se hace `POST` sobre cada una con el pedido de referencia
- ENTONCES la de `2026-11-02` responde 201 y la de `2026-11-03` responde 409 con «La reserva 14 no corresponde al día de hoy» (S28)

#### Escenario: La hora de la reserva no se verifica

- DADO una reserva `ACTIVA` de hoy a las `21:30` (todavía no llegó la hora) y otra de hoy a las `08:00` (la hora ya pasó), y el doble
- CUANDO se hace `POST` sobre cada una con el pedido de referencia
- ENTONCES las dos responden 201 y quedan `ATENDIDA`
- Y Supuesto: S63, solo cuenta la fecha

### Requisito: Cantidad entera mayor que cero (HU-M5-06 CA 4)

La `cantidad` de cada línea DEBE ser un entero estricto mayor que cero. Cero, negativos, decimales, texto, booleanos y `null`, o la ausencia del campo, DEBEN responder 422 en el paso 1, antes de leer la reserva. El `detalle` es el del manejador global (`Datos invalidos. detalles.{n}.cantidad: …`) y nombra la línea y el campo. NO DEBE crearse ninguna comanda, ni siquiera con las líneas válidas del mismo pedido, ni cambiar la reserva, y M4 NO DEBE ser invocado.

#### Escenario: Cantidad cero o negativa

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con un detalle `{"producto_id": 12, "cantidad": 0}`, y por separado con `"cantidad": -3`
- ENTONCES las dos responden 422 con un `detalle` que empieza con «Datos invalidos.» y nombra `detalles.0.cantidad`
- Y la reserva sigue `ACTIVA` y el doble no fue invocado

#### Escenario: Cantidad no entera

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con `"cantidad": 1.5`, y por separado con `"cantidad": "2"` y con `"cantidad": true`
- ENTONCES las tres responden 422 nombrando `detalles.0.cantidad` y no se crea nada

#### Escenario: Falta la cantidad o es nula

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con un detalle `{"producto_id": 12}`, y por separado con `"cantidad": null`
- ENTONCES las dos responden 422 nombrando `detalles.0.cantidad` y no se crea nada

#### Escenario: La cantidad inválida de una línea anula todo el pedido

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con las líneas producto 12 por 2 y producto 13 por 0
- ENTONCES responde 422 nombrando `detalles.1.cantidad`
- Y la reserva sigue `ACTIVA`, el doble no fue invocado y no se crea ninguna comanda

### Requisito: Forma del pedido (paso 1)

`detalles` DEBE estar presente y tener al menos una línea. Cada línea DEBE llevar exactamente uno de `producto_id` o `menu_ejecutivo_id`, entero estricto mayor que cero. `reserva_id` de la ruta DEBE ser un entero. Cualquier otro caso DEBE responder 422 con el manejador global, sin leer la reserva, sin crear nada y sin invocar a M4. Los mensajes de la línea (producto y menú a la vez, o ninguno) son los del DTO compartido.

#### Escenario: Sin detalles

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con el cuerpo `{}`, y por separado con `{"detalles": []}` y con `{"detalles": null}`
- ENTONCES las tres responden 422 con un `detalle` que empieza con «Datos invalidos.» y nombra `detalles`
- Y la reserva sigue `ACTIVA` y el doble no fue invocado

#### Escenario: Producto y menú en la misma línea

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con una línea `{"producto_id": 12, "menu_ejecutivo_id": 5, "cantidad": 1}`
- ENTONCES responde 422 con un `detalle` que contiene «Indique un producto o un menú ejecutivo, exclusivamente»
- Y no se crea nada

#### Escenario: Línea sin producto ni menú

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con una línea `{"cantidad": 1}`
- ENTONCES responde 422 con «Indique un producto o un menú ejecutivo, exclusivamente» en el `detalle` y no se crea nada

#### Escenario: Identificador de producto no positivo o no entero

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con `producto_id` `0`, `-1`, `2.5`, `"12"` y `true`, cada uno por separado
- ENTONCES todos responden 422 nombrando `detalles.0.producto_id` y no se crea nada

#### Escenario: Identificador de reserva no numérico

- DADO el identificador `abc`
- CUANDO se hace `POST /reservas/abc/comanda` con el pedido de referencia
- ENTONCES responde 422 y el `detalle` nombra `reserva_id`

### Requisito: Verificación aislada, el pedido incluye al menos un producto (HU-M5-06 CA 1, S53)

Esta verificación (paso 6) DEBE vivir en una regla propia, independiente de las demás. Supuesto: S53 (propuesta S1), «al menos un producto» se lee en forma literal (contradicción C3). Si ninguna línea del pedido tiene `producto_id`, es decir, si todas son de menú ejecutivo, el sistema DEBE responder 422 «La comanda debe incluir al menos un producto», sin invocar a M4, sin crear una comanda y dejando la reserva `ACTIVA`. Este 422 es distinto del 422 de forma del paso 1. Con al menos un producto, las líneas de menú se aceptan.

Si el equipo elige la lectura genérica (cualquier línea alcanza, como en HU-M4-04), este requisito se elimina y el pedido de solo menús pasa a responder 201.

#### Escenario: Pedido hecho solo de menús

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con una sola línea `{"menu_ejecutivo_id": 5, "cantidad": 1}`
- ENTONCES responde 422 con `{"detalle": "La comanda debe incluir al menos un producto"}`
- Y la reserva sigue `ACTIVA`, el doble no fue invocado y no se crea ninguna comanda
- Y Supuesto: S53

#### Escenario: Varias líneas, todas de menú

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con las líneas menú 5 por 1 y menú 6 por 2
- ENTONCES responde 422 con «La comanda debe incluir al menos un producto» y no se crea nada

#### Escenario: Un solo producto junto a menús alcanza

- DADO la reserva de referencia y el doble
- CUANDO se hace `POST /reservas/10/comanda` con las líneas menú 5 por 1 y producto 12 por 1
- ENTONCES responde 201 con las dos líneas y la reserva queda `ATENDIDA`

### Requisito: Reserva inexistente (HU-M5-06, paso 2)

Si la reserva no existe, el sistema DEBE responder 404 «La reserva {id} no existe», sin invocar a M4 y sin crear nada.

#### Escenario: Reserva inexistente

- DADO que no existe la reserva 999 y el doble
- CUANDO se hace `POST /reservas/999/comanda` con el pedido de referencia
- ENTONCES responde 404 con `{"detalle": "La reserva 999 no existe"}`
- Y el doble no fue invocado

### Requisito: Orden de las verificaciones (HU-M5-06, S56)

El sistema DEBE aplicar las verificaciones en el orden de la tabla «Orden de las verificaciones»: forma (422), existencia (404), cancelada (409), atendida (409), fecha (409), al menos un producto (422) y, solo al final, M4. Cuando varias reglas fallan a la vez, DEBE responder con la primera.

#### Escenario: El cuerpo inválido gana a la reserva inexistente

- DADO que no existe la reserva 999
- CUANDO se hace `POST /reservas/999/comanda` con `{"detalles": []}`
- ENTONCES responde 422 y no 404

#### Escenario: El cuerpo inválido gana a la reserva cancelada

- DADO una reserva `CANCELADA_ANTICIPADA` con `id` 11
- CUANDO se hace `POST /reservas/11/comanda` con un detalle de `"cantidad": 0`
- ENTONCES responde 422 nombrando `detalles.0.cantidad` y no 409

#### Escenario: Atendida gana a otra fecha

- DADO una reserva `ATENDIDA` con `id` 16 y `fecha` `2026-11-03`
- CUANDO se hace `POST /reservas/16/comanda` con el pedido de referencia
- ENTONCES responde 409 con «La reserva 16 ya fue atendida»

#### Escenario: Otra fecha gana a un pedido sin productos

- DADO una reserva `ACTIVA` con `id` 14 y `fecha` `2026-11-03`
- CUANDO se hace `POST /reservas/14/comanda` con una sola línea de menú
- ENTONCES responde 409 con «La reserva 14 no corresponde al día de hoy» y no 422

#### Escenario: Un pedido sin productos gana a los errores de M4

- DADO la reserva de referencia y el doble configurado para lanzar un error de M4
- CUANDO se hace `POST /reservas/10/comanda` con una sola línea de menú
- ENTONCES responde 422 con «La comanda debe incluir al menos un producto»
- Y el doble no fue invocado

### Requisito: Errores de M4 sin cambios en la reserva ni en la mesa (HU-M5-06, paso 7)

Un error de la primitiva de M4 (producto o menú inexistente o deshabilitado; mesa inexistente, con otra comanda abierta o no `LIBRE`; cualquier otro) DEBE llegar a la persona con el código y el `detalle` de M4, sin que M5 los reescriba. M5 DEBE deshacer la sesión: la reserva sigue `ACTIVA`, la mesa conserva su estado y no queda ninguna comanda. La mesa reservada está `LIBRE` en M3 mientras nadie la ocupe; las reservas nunca cambian su estado, y la verificación de M4 (mesa `LIBRE`) NO se relaja (S55). Si la mesa sigue ocupada por una comanda anterior o está fuera de servicio, la reserva sigue `ACTIVA` y se puede atender cuando la mesa vuelva a estar libre.

#### Escenario: Producto inexistente

- DADO la reserva de referencia y el doble configurado para lanzar `NoEncontradoError` con «El producto 99 no existe»
- CUANDO se hace `POST /reservas/10/comanda` con una línea de producto 99
- ENTONCES responde 404 con `{"detalle": "El producto 99 no existe"}`
- Y la reserva sigue `ACTIVA` y no se crea ninguna comanda

#### Escenario: Producto o menú deshabilitado

- DADO la reserva de referencia y el doble configurado para lanzar `ReglaDeNegocioError` con «El producto Milanesa está deshabilitado», y por separado con «El menú ejecutivo Del día está deshabilitado»
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES cada pedido responde 409 con el `detalle` de M4
- Y la reserva sigue `ACTIVA`

#### Escenario: La mesa de la reserva no está libre

- DADO la reserva de referencia y el doble configurado para lanzar `ReglaDeNegocioError` con «La mesa 5 no está libre»
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES responde 409 con `{"detalle": "La mesa 5 no está libre"}`
- Y la reserva sigue `ACTIVA` y la mesa no cambia
- Y Supuesto: S55, la verificación de M4 no se relaja

#### Escenario: Otra comanda abierta en la mesa

- DADO la reserva de referencia y el doble configurado para lanzar el error de comanda abierta de M4
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES responde 409 con el `detalle` de M4 (la clave extra `comanda_id` la agrega el manejador de M4, no M5)
- Y la reserva sigue `ACTIVA`

#### Escenario: La mesa de la reserva ya no existe

- DADO la reserva de referencia y el doble configurado para lanzar `NoEncontradoError` con «La mesa 5 no existe»
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES responde 404 con el `detalle` de M4 y la reserva sigue `ACTIVA`

#### Escenario: La misma reserva se puede atender cuando la mesa se libera

- DADO la reserva de referencia y el doble configurado para lanzar «La mesa 5 no está libre»
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia, se cambia el doble para que acepte la comanda y se repite el pedido
- ENTONCES el primero responde 409 y el segundo responde 201
- Y la reserva queda `ATENDIDA`

#### Escenario: [Integración, condicionado a B1 y B2] Mesa ocupada por otra comanda

- DADO una mesa de M3 `OCUPADA` por una comanda `ABIERTA` anterior y una reserva `ACTIVA` de hoy en esa mesa
- CUANDO se hace `POST /reservas/{id}/comanda` con un producto habilitado
- ENTONCES responde 409
- Y la reserva sigue `ACTIVA`, la mesa sigue `OCUPADA` y en la mesa hay una sola comanda

#### Escenario: [Integración, condicionado a B1 y B2] Mesa fuera de servicio

- DADO una mesa de M3 `FUERA_DE_SERVICIO` y una reserva `ACTIVA` de hoy en esa mesa
- CUANDO se hace `POST /reservas/{id}/comanda` con un producto habilitado
- ENTONCES responde 409 con «La mesa {numero} no está libre» y la reserva sigue `ACTIVA`

#### Escenario: [Integración, condicionado a B1 y B2] La cotización falla y no se persiste nada

- DADO una mesa `LIBRE` de M3 y una reserva `ACTIVA` de hoy en esa mesa
- CUANDO se hace `POST /reservas/{id}/comanda` con las líneas, producto habilitado por 1 y producto inexistente por 1
- ENTONCES responde 404
- Y no existe ninguna comanda ni detalle en la base, la mesa sigue `LIBRE` y la reserva sigue `ACTIVA`

#### Escenario: [Integración, condicionado a B1 y B2] La base rechaza la comanda abierta duplicada

- DADO que la verificación previa no encuentra comanda abierta en la mesa pero otra comanda `ABIERTA` de esa mesa se confirma antes de guardar
- CUANDO la base rechaza la inserción por el índice único parcial de comandas abiertas por mesa
- ENTONCES responde 409 con el mismo mensaje de comanda abierta que M4
- Y la reserva sigue `ACTIVA` y no queda ninguna comanda duplicada (cómo se traduce el error lo fija el diseño)

### Requisito: Atomicidad (HU-M5-06 CA 1)

La comanda y el pase de la reserva a `ATENDIDA` DEBEN confirmarse juntos o no confirmarse. M5 NO DEBE pasar la reserva a `ATENDIDA` antes de que M4 haya aceptado la comanda, y DEBE confirmar una sola vez (patrón de `registrar_cliente_para_reserva`, S41 de la spec base). Ante cualquier error durante el proceso, M5 DEBE deshacer la sesión completa. Los errores de la base ajenos a los casos con 4xx responden 500 y también deshacen la sesión.

#### Escenario: Un error de M4 no deja la reserva atendida

- DADO la reserva de referencia y el doble configurado para lanzar un error de M4
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES la respuesta es el error de M4 y, al releer la reserva de la base, su `estado` es `ACTIVA`
- Y `db.commit` no se llamó

#### Escenario: Falla el commit

- DADO la reserva de referencia, el doble y `db.commit` configurado para lanzar un error de base de datos
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES responde 500, la sesión se deshace (`rollback`) y, al releer la reserva, su `estado` es `ACTIVA`

#### Escenario: [Integración, condicionado a B1 y B2] Una falla después de crear la comanda no la deja persistida

- DADO la primitiva real de M4, una mesa `LIBRE` de M3, una reserva `ACTIVA` de hoy en esa mesa y `db.commit` configurado para fallar
- CUANDO se hace `POST /reservas/{id}/comanda` con un producto habilitado
- ENTONCES responde 500 y no existe ninguna comanda en la base
- Y la mesa sigue `LIBRE` y la reserva sigue `ACTIVA`

### Requisito: Una reserva genera a lo sumo una comanda (HU-M5-06, S54, S65)

Una reserva DEBE generar a lo sumo una comanda («genera 0..1» del diagrama de clases). La garantiza la transición a `ATENDIDA`, que solo es posible desde `ACTIVA`, y, ante dos solicitudes simultáneas para la misma reserva, la regla de M4 de una sola comanda `ABIERTA` por mesa. Supuesto: S65, no se agrega ningún bloqueo; la segunda solicitud recibe 409 («ya fue atendida» si lee después del `commit` de la primera, o el de comanda abierta de M4 si lee antes).

#### Escenario: [Integración, condicionado a B1 y B2] Dos solicitudes simultáneas para la misma reserva

- DADO una mesa `LIBRE` de M3 y una reserva `ACTIVA` de hoy en esa mesa
- CUANDO se procesan a la vez dos `POST /reservas/{id}/comanda` idénticos
- ENTONCES uno responde 201 y el otro responde 409
- Y existe una sola comanda con `reserva_id` igual al `id` de la reserva y la reserva queda `ATENDIDA`

### Requisito: La reserva atendida deja de ser modificable y cancelable

Una reserva que pasó a `ATENDIDA` por este flujo DEBE comportarse como cualquier reserva `ATENDIDA` según las reglas existentes: no se modifica (HU-M5-02 CA 5), no se cancela (HU-M5-04 y HU-M5-05) y se lista con su estado. Este cambio no agrega ninguna operación para deshacer la atención.

#### Escenario: Una reserva atendida es terminal

- DADO la reserva de referencia atendida con `POST /reservas/10/comanda`
- CUANDO se hace `PUT /reservas/10` con datos válidos, `POST /reservas/10/cancelar-anticipada` y `POST /reservas/10/cancelar-por-ausencia`
- ENTONCES el `PUT` responde 409 con «La reserva 10 no está activa y no se puede modificar»
- Y las dos cancelaciones responden 409 con «La reserva 10 ya fue atendida y no se puede cancelar»
- Y `GET /reservas?fecha=2026-11-02&estado=ATENDIDA` incluye la reserva 10 y `estado=ACTIVA` no la incluye

### Requisito: M5 consume la interfaz de M4 solo a través del puente (B1 a B3)

El `service` de M5 DEBE pedir la comanda con `puente.crear_comanda_sin_confirmar(db, datos)`, donde `datos` es un `ComandaCrear` con la `mesa_id` de la reserva, su `id` como `reserva_id`, los `detalles` y las `observaciones`. El puente DEBE delegar en `app.modules.atencion.service.crear_comanda_sin_confirmar` y solo en ese módulo, sin importar de `atencion` su `router`, `repository`, `models`, `schemas` ni `adaptadores` (RNF-MAN-09, B3). La interfaz de M4 es una **interfaz asumida** (sección «Interfaz asumida de M4 y de `shared/`»): hasta que B1 y B2 estén en `develop` y M4 las haya acordado, los escenarios marcados quedan pendientes.

#### Escenario: El service llama al puente y se puede sustituir

- DADO la reserva de referencia y la operación `crear_comanda_sin_confirmar` del puente reemplazada por el doble
- CUANDO se hace `POST /reservas/10/comanda` con el pedido de referencia
- ENTONCES el doble recibe un `ComandaCrear` con `mesa_id` 5, `reserva_id` 10 y los detalles del pedido
- Y el `service` no importa nada de `atencion` fuera del puente

#### Escenario: [Integración, condicionado a B1 y B2] B1, sin vínculo todo sigue igual

- DADO la primitiva real de M4 y un `ComandaCrear` sin `reserva_id`
- CUANDO se crea la comanda con `POST /comandas` y con `crear_comanda`
- ENTONCES la comanda queda con `reserva_id` nulo y las pruebas existentes de M4 pasan sin cambios

#### Escenario: [Integración, condicionado a B1 y B2] B1, el vínculo debe ser un entero positivo

- DADO un `ComandaCrear` válido
- CUANDO se le da `reserva_id` `0`, `-1`, `2.5` o `"3"`
- ENTONCES la validación falla en cada caso (entero estricto mayor que cero)

#### Escenario: [Integración, condicionado a B1 y B2] B2, la primitiva no confirma

- DADO una mesa `LIBRE` de M3 y una sesión de la base
- CUANDO se llama a `atencion.service.crear_comanda_sin_confirmar` con un `ComandaCrear` válido y luego se hace `db.rollback()`
- ENTONCES no existe ninguna comanda en la base y la mesa sigue `LIBRE`
- Y si en cambio se hace `db.commit()`, la comanda queda con su `reserva_id` y la mesa `OCUPADA`

#### Escenario: [Integración, condicionado a B1 y B2] B2, `crear_comanda` conserva su comportamiento

- DADO `crear_comanda` implementada sobre la primitiva
- CUANDO se ejecutan las pruebas de M4
- ENTONCES pasan sin cambios: `crear_comanda` conserva su `commit`, su `rollback` y la traducción del `IntegrityError`

#### Escenario: [Integración, condicionado a B1 y B2] B3, M5 no importa los adaptadores de M4

- DADO el módulo `reservas` terminado
- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos
- Y `reservas` solo importa `app.modules.atencion.service` y `app.modules.salon.service`, y solo desde `puente.py`

### Requisito: Aislamiento del módulo y sin migración (HU-M5-06, AGENTS.md sección 9.3)

El cambio NO DEBE agregar ninguna migración de Alembic ni columna nueva (S54). NO DEBE modificar `salon/` (M3), ni los contratos de importación de `backend/pyproject.toml`, ni `backend/tests/shared/fakes/comanda.py` ni `backend/tests/shared/test_contrato_comanda.py`. Los archivos de `atencion/` (M4) y de `backend/app/shared/` solo PUEDEN cambiar para B1 a B3, con el acuerdo explícito del responsable de M4 anotado en el PR y en commits separados; sin ese acuerdo, NO DEBEN cambiar. La creación de la comanda NO DEBE cambiar el estado de la mesa desde M5: lo ocupa la primitiva de M4.

#### Escenario: Sin migración nueva

- DADO el repositorio con el cambio terminado
- CUANDO se ejecuta `alembic heads`
- ENTONCES muestra el mismo head que antes del cambio, sin ninguna migración nueva

#### Escenario: La reserva no gana ningún atributo

- DADO una reserva atendida por este flujo
- CUANDO se hace `GET /reservas/{id}`
- ENTONCES la `ReservaSalida` tiene las mismas claves que antes del cambio (sin `comanda_id`)
- Y el vínculo se obtiene de la comanda, por `reserva_id`

#### Escenario: Sin cambios en módulos ajenos sin acuerdo

- DADO el conjunto de archivos modificados por el cambio
- CUANDO se revisa
- ENTONCES no hay cambios en `backend/app/modules/salon/`, `frontend/src/modules/salon/`, `frontend/src/modules/atencion/` ni `frontend/src/shared/`
- Y los únicos archivos posibles de `backend/app/modules/atencion/` y de `backend/app/shared/` son los de B1 a B3, con el acuerdo de M4 anotado en el PR

### Requisito: Acción «Crear comanda» en las filas activas (frontend, HU-M5-06 CA 1)

En cada fila `ACTIVA` de `ReservasTabla` DEBE aparecer una acción nueva con el `aria-label` «Crear comanda», junto a «Modificar reserva», «Cancelar reserva» y «Cancelar por ausencia». Ninguna fila que no esté `ACTIVA` DEBE mostrar esa acción ni ninguna de las otras tres, con la misma regla de HU-M5-02 CA 5. Supuesto: S59 (propuesta S7), la acción se muestra en toda fila `ACTIVA`, sin calcular la fecha en el navegador: el backend decide y el aviso muestra su mensaje. Pulsar la acción DEBE abrir el modal «Crear comanda» de esa fila (requisito siguiente), sin llamar a la API.

#### Escenario: La acción aparece solo en las filas activas

- DADO una reserva `ACTIVA`, otra `ATENDIDA`, otra `CANCELADA_ANTICIPADA` y otra `CANCELADA_POR_AUSENCIA` en la tabla
- CUANDO se muestran las filas
- ENTONCES solo la `ACTIVA` ofrece «Crear comanda», además de las otras tres acciones, y las demás no ofrecen ninguna

#### Escenario: La acción no depende de la fecha del navegador

- DADO una fila `ACTIVA` de una fecha distinta de la de hoy, visible al navegar con «Día siguiente»
- CUANDO se muestra la fila
- ENTONCES ofrece «Crear comanda» y la decisión de la fecha queda para el backend (S59)

#### Escenario: Pulsar la acción abre el modal sin llamar a la API

- DADO una fila `ACTIVA` con `id` 10
- CUANDO la persona pulsa «Crear comanda»
- ENTONCES se abre el modal «Crear comanda» y la ruta sigue siendo `/reservas`
- Y no se llama a ninguna API

### Requisito: Modal «Crear comanda» (frontend, HU-M5-06 CA 1)

El modal DEBE construirse con el componente `Dialog` compartido (`frontend/src/shared/components/ui/dialog.tsx`), según la regla de AGENTS.md (sección 5), con el título «Crear comanda». DEBE mostrar la mesa de la reserva en un campo de solo lectura, que la persona no puede editar y que no se envía, y una lista de líneas de producto. Cada línea tiene un campo de producto por su número (ID) y una cantidad (S58). El modal NO DEBE importar `ComandaForm` ni `usePedido` de `atencion` (AGENTS.md, sección 9.4). Supuesto: S64, los textos y el comportamiento de abajo no los fija la propuesta: el campo «Mesa» con el valor «Mesa n.º {mesa_id}»; las líneas «Producto {n} (ID)» y «Cantidad {n}», numeradas desde 1; el modal arranca con una línea vacía y cantidad `1`; el botón «Agregar producto» suma una línea y «Quitar producto {n}» la elimina, y no se puede quitar la última; el pie lleva los botones «Cancelar» y «Guardar comanda». El modal no pide `observaciones`. Solo puede haber un modal de reserva abierto a la vez (S36 de la capacidad): mientras el modal «Crear comanda» está abierto, «Nueva reserva» DEBE verse pero estar deshabilitado.

#### Escenario: Contenido inicial del modal

- DADO una fila `ACTIVA` con `id` 10 en la mesa 5
- CUANDO la persona pulsa «Crear comanda»
- ENTONCES el modal muestra el título «Crear comanda», el campo «Mesa» de solo lectura con «Mesa n.º 5» y una línea con «Producto 1 (ID)» vacío y «Cantidad 1» igual a `1`
- Y los botones «Cancelar» y «Guardar comanda»
- Y Supuesto: S58 y S64

#### Escenario: La mesa no se puede editar

- DADO el modal abierto
- CUANDO la persona intenta escribir en el campo «Mesa»
- ENTONCES el valor no cambia y el campo no es un selector ni una entrada editable

#### Escenario: Agregar y quitar líneas

- DADO el modal abierto con una línea
- CUANDO la persona pulsa «Agregar producto» y luego «Quitar producto 2»
- ENTONCES aparece una segunda línea («Producto 2 (ID)» y «Cantidad 2») y después desaparece
- Y con una sola línea no se puede quitar: «Quitar producto 1» no está disponible

#### Escenario: Cerrar sin guardar

- DADO el modal abierto con datos escritos
- CUANDO la persona lo cierra con la X, con la tecla Escape, haciendo clic en el fondo o con «Cancelar»
- ENTONCES el modal se cierra sin llamar a la API y sin volver a pedir el listado de reservas

#### Escenario: Un solo modal de reserva a la vez

- DADO el modal «Crear comanda» abierto
- CUANDO se muestra la pantalla detrás del modal
- ENTONCES el botón «Nueva reserva» está deshabilitado
- Y al cerrar el modal vuelve a estar habilitado

#### Escenario: Al abrir otra fila el modal arranca limpio

- DADO el modal abierto en la fila 10 con líneas escritas, cerrado sin guardar
- CUANDO la persona pulsa «Crear comanda» en la fila 11 en la mesa 6
- ENTONCES el modal muestra «Mesa n.º 6» y una sola línea vacía con cantidad `1`

### Requisito: Validación local de las líneas (frontend, HU-M5-06 CA 4)

Antes de enviar, el modal DEBE validar cada línea y mostrar bajo el campo qué falla: el producto DEBE ser un entero mayor que cero y la cantidad DEBE ser un entero mayor que cero. Si hay algún error local, el modal NO DEBE llamar a la API ni cerrarse. Supuesto: S64, los textos son «El producto debe ser un número entero mayor que cero» y «La cantidad debe ser un número entero mayor que cero».

#### Escenario: Cantidad inválida

- DADO el modal con el producto de la línea 1 en `12`
- CUANDO la persona escribe en «Cantidad 1» `0`, `-2`, `1.5` o lo deja vacío, y pulsa «Guardar comanda»
- ENTONCES en cada caso aparece «La cantidad debe ser un número entero mayor que cero» bajo ese campo
- Y no se llama a la API y el modal sigue abierto

#### Escenario: Producto inválido

- DADO el modal con la cantidad `1`
- CUANDO la persona deja vacío «Producto 1 (ID)», o escribe `0`, `-1`, `2.5` o `abc`, y pulsa «Guardar comanda»
- ENTONCES aparece «El producto debe ser un número entero mayor que cero» bajo ese campo y no se llama a la API

#### Escenario: Un error en una línea bloquea todo el envío

- DADO el modal con la línea 1 válida (producto `12`, cantidad `2`) y la línea 2 con cantidad `0`
- CUANDO la persona pulsa «Guardar comanda»
- ENTONCES el error aparece solo bajo «Cantidad 2», la línea 1 no muestra error y no se llama a la API

### Requisito: Envío, avisos y recarga (frontend, HU-M5-06 CA 1 a CA 4)

El `api.ts` del módulo DEBE exponer `crearComandaDesdeReserva(reservaId, datos)`, que hace `POST /reservas/{reservaId}/comanda` con el cuerpo `datos`, y los tipos de entrada y de salida DEBEN estar en el `types.ts` del módulo, sin importarlos de `atencion`. Al guardar con líneas válidas, el modal DEBE enviar a esa función una línea `{producto_id, cantidad}` por cada línea, sin `mesa_id` y sin `observaciones`. Si la API responde 201, DEBE mostrar un aviso de éxito (`useToast`, variante `success`) con el número de la comanda, cerrar el modal y volver a pedir el listado. Si la API responde 404, 409 o 422, DEBE mostrar un aviso `danger` cuyo detalle es el `detalle` del backend, sin cambiarlo, dejar el modal abierto con las líneas escritas y NO volver a pedir el listado. Mientras la solicitud está en curso, «Guardar comanda» DEBE estar deshabilitado. Supuesto: S64, el aviso de éxito dice «Comanda n.º {id} creada» y el de error tiene el título «No se pudo crear la comanda».

#### Escenario: Envío válido

- DADO el modal abierto en la fila 10 con las líneas producto `12` por `2` y producto `13` por `1`, y la API que responde 201 con la comanda número 31
- CUANDO la persona pulsa «Guardar comanda»
- ENTONCES se llama a `POST /reservas/10/comanda` con el cuerpo `{"detalles": [{"producto_id": 12, "cantidad": 2}, {"producto_id": 13, "cantidad": 1}]}`, sin `mesa_id`
- Y se muestra el aviso de éxito «Comanda n.º 31 creada», el modal se cierra y se vuelve a pedir el listado

#### Escenario: Tras el éxito la reserva sale de las activas

- DADO la pantalla con el filtro «Activa» y la fila 10, y la API que responde 201 y luego un listado sin esa fila
- CUANDO la persona crea la comanda de la fila 10
- ENTONCES la fila 10 ya no aparece, y al elegir «Todas» aparece como «Atendida» sin ninguna acción

#### Escenario: Error del backend, un aviso con su detalle

- DADO el modal con líneas válidas y la API que responde, por separado, 404 con «La reserva 10 no existe», 409 con «La reserva 10 ya fue cancelada» y 422 con «La comanda debe incluir al menos un producto»
- CUANDO la persona pulsa «Guardar comanda»
- ENTONCES se muestra un aviso `danger` con el título «No se pudo crear la comanda» y como descripción el `detalle` recibido
- Y el modal sigue abierto con las mismas líneas y no se vuelve a pedir el listado

#### Escenario: Reserva atendida mientras tanto por otra persona

- DADO una fila `ACTIVA` que, mientras tanto, otra persona ya atendió (la API responde 409 con «La reserva 10 ya fue atendida»)
- CUANDO la persona pulsa «Guardar comanda»
- ENTONCES se muestra el aviso `danger` con ese `detalle` y no se vuelve a pedir el listado

#### Escenario: Un doble clic envía una sola solicitud

- DADO el modal con líneas válidas y la API cuya respuesta tarda
- CUANDO la persona pulsa «Guardar comanda» dos veces seguidas
- ENTONCES «Guardar comanda» queda deshabilitado mientras la solicitud está en curso y se llama una sola vez a la API

#### Escenario: Llamada de la API del módulo

- DADO `crearComandaDesdeReserva(10, {detalles: [{producto_id: 12, cantidad: 2}]})`
- CUANDO el servidor responde 201 con la comanda
- ENTONCES hace `POST /reservas/10/comanda` con ese cuerpo y devuelve la comanda como éxito
- Y si el servidor responde 409 con `{"detalle": "La reserva 10 ya fue atendida"}`, devuelve un error con ese `detalle`

### Requisito: Aislamiento del frontend (HU-M5-06, AGENTS.md sección 9.4)

Los archivos nuevos o modificados del frontend DEBEN estar dentro de `frontend/src/modules/reservas/`. El módulo NO DEBE importar archivos de `frontend/src/modules/atencion/` (ni `ComandaForm`, ni `usePedido`, ni sus tipos), no DEBE usar `fetch` en los componentes (D-16) y no DEBE modificar `frontend/src/shared/`, ni `frontend/src/App.tsx`.

#### Escenario: Sin importaciones de otro módulo

- DADO el frontend con el cambio terminado
- CUANDO se ejecutan `npm run lint` y `npm run typecheck`
- ENTONCES pasan sin advertencias
- Y ningún archivo de `frontend/src/modules/reservas/` importa de `frontend/src/modules/atencion/` y no hay cambios en `frontend/src/shared/`

## Supuestos

Los supuestos S53 a S60 son los S1 a S8 de la propuesta (`openspec/changes/HU-M5-06/proposal.md`, sección «Supuestos a validar por el equipo»), renumerados para continuar la secuencia de la capacidad `reservas-gestion` (que termina en S52 en el delta de HU-M5-04-05), igual que hizo ese delta con sus S1 a S8. S61 a S65 son nuevos de esta spec. Todos están marcados `Supuesto:` para que el equipo los valide (AGENTS.md, sección 9.2). S53 y S57 son decisiones de producto pendientes: cada una vive en un requisito aislado, para cambiarla sin tocar el resto.

- Supuesto: S53 (propuesta S1). «Al menos un producto» se lee en forma literal: al menos una línea con `producto_id`; un pedido hecho solo de menús ejecutivos se rechaza con 422 «La comanda debe incluir al menos un producto», y las líneas de menú se aceptan junto a un producto. Es lo que dice el issue #68 («Productos: lista con al menos un producto») y lo que ya fija el doble de S2-01 (`test_contrato_comanda.py:336-343`). La lectura genérica (cualquier línea, como HU-M4-04) haría innecesario el paso 6. Decisión de producto pendiente. Contradicción C3.
- Supuesto: S54 (propuesta S2). El vínculo es solo `Comanda.reserva_id`; `Reserva` no gana `comanda_id`. Alcanza para «genera 0..1» (la comanda de una reserva se obtiene filtrando por `reserva_id`), no necesita migración y evita mantener dos punteros sincronizados entre dos módulos. `ReservaFake.comanda_id` del doble de S2-01 se declara superado para la implementación real; el resto del doble (orden de validaciones, atomicidad, mesa heredada) se adopta como referencia de comportamiento. El doble no se edita en este cambio. Contradicción C2.
- Supuesto: S55 (propuesta S3). La mesa reservada está `LIBRE` en M3: `EstadoMesa` solo tiene `LIBRE`, `OCUPADA` y `FUERA_DE_SERVICIO`, no existe «reservada», y las reservas nunca cambian el estado de la mesa. La verificación de M4 (mesa `LIBRE`) es correcta y no se relaja: si la mesa sigue `OCUPADA` por una comanda anterior o está fuera de servicio, la creación falla con el 409 de M4 y la reserva sigue `ACTIVA`. La comanda creada ocupa la mesa, igual que el alta general.
- Supuesto: S56 (propuesta S4). Contrato de la API: `POST /api/v1/reservas/{reserva_id}/comanda`, acción de negocio como `POST` sobre un subrecurso (D-24); cuerpo `{"detalles": [...], "observaciones": "..."}` con `observaciones` opcional, que viene del contrato compartido y que el issue #68 no lista (el modal no la pide, S64); respuesta 201 con `ComandaSalida`. Errores con `{"detalle": "mensaje"}`: 404 reserva inexistente; 409 reserva cancelada, ya atendida, de otra fecha, mesa no libre o con comanda abierta; 422 cuerpo inválido o sin productos. El orden es el de la tabla «Orden de las verificaciones».
- Supuesto: S57 (propuesta S5). «Se advierte» que la reserva es de otra fecha significa rechazar con 409 «La reserva {id} no corresponde al día de hoy», no un aviso que permite seguir. Decisión de producto pendiente. Contradicción C1.
- Supuesto: S58 (propuesta S6). Las líneas del modal se cargan por el número (ID) del producto, igual que el formulario actual de comandas de M4 (`DetallePedidoFila.tsx`, «Referencia (ID)»). Un buscador de productos sería otro componente y otra HU. El modal solo ofrece líneas de producto, así que desde la pantalla no se puede producir el 422 de «solo menús» (S53); sigue valiendo para los clientes de la API.
- Supuesto: S59 (propuesta S7). La acción «Crear comanda» se muestra en toda fila `ACTIVA`, sin calcular la fecha en el navegador: el backend decide y el aviso muestra su mensaje (mismo criterio que S50 de HU-M5-04-05).
- Supuesto: S60 (propuesta S8). El issue habla del mozo, pero la pantalla de reservas es la misma para todos porque el sistema no tiene roles ni inicio de sesión. No se agrega control de acceso.
- Supuesto: S61 (nuevo). Los textos de los mensajes de negocio de M5 son los de la tabla «Mensajes de negocio de M5» y son de referencia: el diseño puede ajustar el redactado sin cambiar el código de estado ni la clave `detalle` (igual criterio que S18). Los de las reservas cancelada («La reserva {id} ya fue cancelada», el mismo de HU-M5-04-05) y atendida («La reserva {id} ya fue atendida») los propone esta spec, porque la propuesta solo fija los de otra fecha y de pedido sin productos. Los errores de M4 se muestran con su propio texto, incluido el 409 de comanda abierta, que hoy está en inglés.
- Supuesto: S62 (nuevo). `ComandaDesdeReservaCrear` prohíbe los campos extra a nivel del cuerpo (como S15 para `ReservaCrear`): `mesa_id` y cualquier otro campo desconocido responden 422 en lugar de ignorarse, para que nadie crea que puede elegir otra mesa. Los elementos de `detalles` siguen las reglas del DTO compartido, que no se edita.
- Supuesto: S63 (nuevo). Solo cuenta la fecha de la reserva (paso 5): su hora no se verifica, ni como mínimo ni como máximo, así que una reserva de hoy se puede atender antes o después de su hora. La propuesta no define ninguna ventana de tolerancia.
- Supuesto: S64 (nuevo). Textos y comportamientos de pantalla que la propuesta no fija: el título «Crear comanda»; el campo «Mesa» de solo lectura con «Mesa n.º {mesa_id}»; las etiquetas «Producto {n} (ID)» y «Cantidad {n}»; la línea inicial vacía con cantidad `1`; «Agregar producto» y «Quitar producto {n}» (no se quita la última); los botones «Cancelar» y «Guardar comanda»; los mensajes locales «El producto debe ser un número entero mayor que cero» y «La cantidad debe ser un número entero mayor que cero»; el aviso de éxito «Comanda n.º {id} creada»; el título del aviso de error «No se pudo crear la comanda»; que ante un error del backend el modal sigue abierto con las líneas escritas y no se recarga el listado (como las cancelaciones de HU-M5-04-05); y que «Guardar comanda» se deshabilita mientras la solicitud está en curso. El equipo valida estos textos antes de implementarlos.
- Supuesto: S65 (nuevo). Sin concurrencia especial: si dos personas atienden la misma reserva a la vez, la segunda recibe 409 («ya fue atendida» si lee después del `commit` de la primera, o el de comanda abierta de M4 si lee antes); no se agrega bloqueo (igual criterio que S51 de HU-M5-04-05).

## Trazabilidad

| Criterio | Requisito | Escenarios |
| --- | --- | --- |
| CA 1: la comanda queda vinculada a la reserva, en la mesa reservada, y la reserva pasa a `ATENDIDA` | Crear una comanda desde una reserva activa de hoy; La mesa sale de la reserva; Atomicidad | Comanda válida desde una reserva activa de hoy; A M4 se le pide la comanda con la mesa y el vínculo de la reserva; Un único commit; Varias líneas, con producto y menú en el mismo pedido; Observaciones opcionales; La comanda no trae un cliente propio; Crear una reserva no crea ninguna comanda; La comanda hereda la mesa de la reserva; [Integración] La comanda se persiste con el vínculo y ocupa la mesa |
| CA 2: reserva cancelada o ya atendida, no se permite y se avisa | Una reserva cancelada o ya atendida no se atiende | Reserva cancelada anticipadamente; Reserva cancelada por ausencia; Reserva ya atendida; Doble envío de la misma reserva |
| CA 3: reserva de otra fecha, se advierte que no corresponde al día actual | Verificación aislada, la reserva es del día de hoy | Reserva de mañana; Reserva de un día anterior; «Hoy» es el de la zona del restaurante; La hora de la reserva no se verifica |
| CA 4: cantidad no entera mayor que cero, cantidad inválida | Cantidad entera mayor que cero; Validación local de las líneas | Cantidad cero o negativa; Cantidad no entera; Falta la cantidad o es nula; La cantidad inválida de una línea anula todo el pedido; Cantidad inválida (frontend); Un error en una línea bloquea todo el envío |
| Dato del issue: la lista tiene al menos un producto | Forma del pedido; Verificación aislada, el pedido incluye al menos un producto | Sin detalles; Producto y menú en la misma línea; Línea sin producto ni menú; Identificador de producto no positivo o no entero; Pedido hecho solo de menús; Varias líneas, todas de menú; Un solo producto junto a menús alcanza |
| Límite: reserva inexistente | Reserva inexistente; Forma del pedido | Reserva inexistente; Identificador de reserva no numérico |
| Límite: la mesa sale de la reserva, sin `mesa_id` | La mesa sale de la reserva | Un cuerpo con mesa se rechaza; Otros campos extra se rechazan; El flujo no consulta la mesa al puente |
| Límite: error de M4 sin cambios en la reserva ni en la mesa | Errores de M4 sin cambios en la reserva ni en la mesa | Producto inexistente; Producto o menú deshabilitado; La mesa de la reserva no está libre; Otra comanda abierta en la mesa; La mesa de la reserva ya no existe; La misma reserva se puede atender cuando la mesa se libera; [Integración] Mesa ocupada por otra comanda; [Integración] Mesa fuera de servicio; [Integración] La cotización falla y no se persiste nada; [Integración] La base rechaza la comanda abierta duplicada |
| Límite: atomicidad ante una falla | Atomicidad | Un error de M4 no deja la reserva atendida; Falla el commit; [Integración] Una falla después de crear la comanda no la deja persistida |
| Límite: doble envío | Una reserva genera a lo sumo una comanda; Una reserva cancelada o ya atendida no se atiende | Doble envío de la misma reserva; [Integración] Dos solicitudes simultáneas para la misma reserva |
| Orden de las verificaciones | Orden de las verificaciones | El cuerpo inválido gana a la reserva inexistente; El cuerpo inválido gana a la reserva cancelada; Atendida gana a otra fecha; Otra fecha gana a un pedido sin productos; Un pedido sin productos gana a los errores de M4 |
| La atención es terminal | La reserva atendida deja de ser modificable y cancelable | Una reserva atendida es terminal |
| Interfaz asumida de M4 (B1 a B3) | M5 consume la interfaz de M4 solo a través del puente | El service llama al puente y se puede sustituir; [Integración] B1, sin vínculo todo sigue igual; [Integración] B1, el vínculo debe ser un entero positivo; [Integración] B2, la primitiva no confirma; [Integración] B2, `crear_comanda` conserva su comportamiento; [Integración] B3, M5 no importa los adaptadores de M4 |
| Sin migración ni módulos ajenos | Aislamiento del módulo y sin migración; Aislamiento del frontend | Sin migración nueva; La reserva no gana ningún atributo; Sin cambios en módulos ajenos sin acuerdo; Sin importaciones de otro módulo |
| Pantalla: acción solo en las filas `ACTIVA` | Acción «Crear comanda» en las filas activas | La acción aparece solo en las filas activas; La acción no depende de la fecha del navegador; Pulsar la acción abre el modal sin llamar a la API |
| Pantalla: el modal no pide la mesa y muestra los avisos del backend | Modal «Crear comanda»; Envío, avisos y recarga | Contenido inicial del modal; La mesa no se puede editar; Agregar y quitar líneas; Cerrar sin guardar; Un solo modal de reserva a la vez; Al abrir otra fila el modal arranca limpio; Envío válido; Tras el éxito la reserva sale de las activas; Error del backend, un aviso con su detalle; Reserva atendida mientras tanto por otra persona; Un doble clic envía una sola solicitud; Llamada de la API del módulo |
