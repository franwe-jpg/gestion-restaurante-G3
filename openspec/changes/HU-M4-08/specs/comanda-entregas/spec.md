# Especificación de comanda-entregas (HU-M4-08)

## Propósito

Registrar cuántas unidades de cada línea de una comanda se entregaron y consultar qué falta servir. Capacidad nueva del módulo M4 (Atención al Público). Entidades del diagrama de clases: `Comanda`, `DetalleComanda`. Cumple la historia HU-M4-08 (issue #57) y habilita el cierre real de comandas (regla A02 de HU-M4-04-07-09), que exige todos los detalles entregados.

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25. Sin autenticación (Supuesto S5).

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `PUT /comandas/{comanda_id}/detalles/{detalle_id}/entrega` | 200, `EntregasComanda` | 404, 409, 422 |
| `GET /comandas/{comanda_id}/detalles` | 200, `EntregasComanda` | 404, 422 |

- `comanda_id` y `detalle_id` son enteros mayores a 0; un valor no entero o menor o igual a 0 responde 422.
- Cuerpo de `PUT`: `{"cantidad_entregada": n}`, con `n` entero, `0 ≤ n ≤ cantidad` de ese detalle. Un valor no entero (texto, decimal, booleano), negativo, mayor que `cantidad`, ausente o con campos extra responde 422.
- `PUT` fija la cantidad entregada **absoluta**, no un incremento. Cubre la entrega parcial, «entregar todo» (`n = cantidad`) y desmarcar (`n` menor que la actual, hasta 0). Repetir el mismo valor es idempotente: 200 sin cambios.
- `DetalleEntrega` (esquema local de M4, junto a `DetallePendiente`; no modifica `backend/app/shared/contratos/comanda.py`): `id` (entero), `producto_id` (entero o `null`), `menu_ejecutivo_id` (entero o `null`), `cantidad` (entero), `cantidad_entregada` (entero), `estado_entrega` (`PENDIENTE` o `ENTREGADO`).
- `EntregasComanda`: `comanda_id` (entero), `estado` (`EstadoComanda` de la comanda), `detalles: [DetalleEntrega]` ordenados por `id` ascendente. Incluye todos los detalles.
- Datos: columna nueva `detalles_comanda.cantidad_entregada` (entero, no nulo, por defecto 0, con 0 ≤ `cantidad_entregada` ≤ `cantidad`), agregada con una migración de Alembic que la fija en `cantidad` para las filas con `estado_entrega = ENTREGADO` y en 0 para las demás. Se registra en `backend/alembic/env.py` lo que corresponda (RNF-MAN-06).
- Invariante: `estado_entrega = ENTREGADO` si y solo si `cantidad_entregada = cantidad`; en otro caso `PENDIENTE`. El servicio lo recalcula en cada cambio. Por eso el contrato compartido y la regla A02 del cierre (el cierre se bloquea mientras algún detalle esté `PENDIENTE`) no cambian.
- Orden de validación de `PUT`: 422 de ruta y de cuerpo (el tope `n ≤ cantidad` depende del detalle y se valida después de resolverlo, también con 422), 404 de comanda inexistente, 404 de detalle inexistente o de otra comanda, 409 de comanda no ABIERTA. Nada se guarda si algo falla.
- Supuesto S1: solo las comandas `ABIERTA` cambian entregas; `CERRADA` o `ANULADA` responden 409. Las correcciones tras el cierre pasan por HU-M4-10 (reabrir).
- Supuesto S2: la entrega se registra por cantidad en cada línea (decisión del 01/11/2026).
- Supuesto S3: se puede desmarcar bajando `cantidad_entregada`, hasta 0, mientras la comanda esté `ABIERTA`.
- Supuesto S4: comanda inexistente o detalle que pertenece a otra comanda responden 404 con mensajes distintos.
- Supuesto S5: sin autenticación todavía; cualquier usuario del sistema puede registrar entregas.
- Supuesto S6: entregar la última unidad no cierra la comanda; el cierre sigue siendo `POST /comandas/{comanda_id}/cerrar`.
- Supuesto S7: repetir el mismo valor responde 200 sin cambios.
- Supuesto S8: `GET /comandas/{comanda_id}/detalles` funciona para comandas en cualquier estado, porque solo lee, y no se pagina (como `/pendientes`). Es una ruta nueva y `GET .../pendientes` no cambia.
- Supuesto S9: el frontend muestra «Producto #id» o «Menú ejecutivo #id»; los nombres dependen de los adaptadores del PR #207.

## Requisitos

### Requisito: Registrar la cantidad entregada de un detalle (CA 1)

El sistema DEBE fijar `cantidad_entregada` del detalle indicado de una comanda `ABIERTA`, recalcular su `estado_entrega` según el invariante y responder 200 con `EntregasComanda` (el estado actualizado de todos los detalles). Los demás detalles NO DEBEN cambiar.

#### Escenario: Entrega parcial

- DADO una comanda `ABIERTA` con un detalle `PENDIENTE` de `cantidad` 10 y `cantidad_entregada` 0
- CUANDO se hace `PUT /comandas/{comanda_id}/detalles/{detalle_id}/entrega` con `{"cantidad_entregada": 4}`
- ENTONCES responde 200 con ese detalle en `cantidad_entregada` 4 y `estado_entrega` `PENDIENTE`
- Y `GET /comandas/{comanda_id}/detalles` muestra el mismo valor

#### Escenario: Entrega completa de un producto (CA 1)

- DADO una comanda `ABIERTA` con dos detalles `PENDIENTE`, uno de `cantidad` 3
- CUANDO se hace `PUT` sobre el de `cantidad` 3 con `{"cantidad_entregada": 3}`
- ENTONCES responde 200 con ese detalle en `ENTREGADO` y `cantidad_entregada` 3
- Y el otro detalle sigue `PENDIENTE` con `cantidad_entregada` 0

#### Escenario: Completar una entrega parcial

- DADO un detalle de `cantidad` 10 con `cantidad_entregada` 4
- CUANDO se hace `PUT` con `{"cantidad_entregada": 10}`
- ENTONCES el detalle queda `ENTREGADO` con `cantidad_entregada` 10

#### Escenario: Desmarcar bajando la cantidad

- DADO un detalle `ENTREGADO` de `cantidad` 3 con `cantidad_entregada` 3, en una comanda `ABIERTA`
- CUANDO se hace `PUT` con `{"cantidad_entregada": 2}`
- ENTONCES responde 200 con `cantidad_entregada` 2 y `estado_entrega` `PENDIENTE` (S3)

#### Escenario: Fijar en cero

- DADO un detalle con `cantidad_entregada` 3 en una comanda `ABIERTA`
- CUANDO se hace `PUT` con `{"cantidad_entregada": 0}`
- ENTONCES responde 200 con `cantidad_entregada` 0 y `estado_entrega` `PENDIENTE`

#### Escenario: Repetir el mismo valor es idempotente

- DADO un detalle con `cantidad_entregada` 4
- CUANDO se hace `PUT` con `{"cantidad_entregada": 4}` dos veces seguidas
- ENTONCES ambas respuestas son 200 con el mismo contenido y nada cambia (S7)

#### Escenario: Cantidad mayor que la pedida

- DADO un detalle de `cantidad` 10
- CUANDO se hace `PUT` con `{"cantidad_entregada": 11}`
- ENTONCES responde 422 con `{"detalle": ...}` y el detalle no cambia

#### Escenario: Cantidad negativa

- DADO un detalle cualquiera
- CUANDO se hace `PUT` con `{"cantidad_entregada": -1}`
- ENTONCES responde 422 y el detalle no cambia

#### Escenario: Cantidad no entera

- DADO un detalle cualquiera
- CUANDO se hace `PUT` con `{"cantidad_entregada": 2.5}`, `"dos"`, `null` o sin el campo
- ENTONCES responde 422 y el detalle no cambia

#### Escenario: Identificador inválido

- DADO un `detalle_id` igual a 0 o no numérico
- CUANDO se hace `PUT .../entrega`
- ENTONCES responde 422

#### Escenario: Comanda inexistente

- DADO un `comanda_id` que no existe
- CUANDO se hace `PUT .../entrega` con un cuerpo válido
- ENTONCES responde 404 con `{"detalle": ...}`

#### Escenario: Detalle de otra comanda o inexistente

- DADO un `detalle_id` que no existe o que pertenece a otra comanda
- CUANDO se hace `PUT /comandas/{comanda_id}/detalles/{detalle_id}/entrega`
- ENTONCES responde 404 y ningún detalle cambia (S4)

#### Escenario: Comanda no abierta

- DADO una comanda `CERRADA` o `ANULADA` con un detalle `PENDIENTE`
- CUANDO se hace `PUT .../entrega` con un cuerpo válido
- ENTONCES responde 409 y el detalle no cambia (S1)

#### Escenario: Comanda cerrada no admite desmarcar

- DADO una comanda `CERRADA` con un detalle `ENTREGADO`
- CUANDO se hace `PUT .../entrega` con `{"cantidad_entregada": 0}`
- ENTONCES responde 409 y el detalle sigue `ENTREGADO`

#### Escenario: La última unidad no cierra la comanda

- DADO una comanda `ABIERTA` con un único detalle `PENDIENTE`
- CUANDO se entrega la cantidad completa
- ENTONCES la comanda sigue `ABIERTA` (S6)
- Y `POST /comandas/{comanda_id}/cerrar` responde 200 y la comanda queda `CERRADA`

#### Escenario: Desmarcar una unidad bloquea el cierre

- DADO una comanda `ABIERTA` con todos sus detalles `ENTREGADO`
- CUANDO se baja en una unidad `cantidad_entregada` de un detalle y se hace `POST .../cerrar`
- ENTONCES ese detalle está `PENDIENTE` y el cierre responde 409 (regla A02)

### Requisito: Consultar el estado de entrega de los detalles (CA 2)

El sistema DEBE responder 200 con `EntregasComanda` para una comanda existente, con todos sus detalles ordenados por `id`, su `cantidad`, su `cantidad_entregada` y su `estado_entrega`. Con todos los detalles `ENTREGADO`, la respuesta DEBE permitir saber que no falta servir nada (ningún detalle `PENDIENTE`).

#### Escenario: Comanda con pendientes y entregados

- DADO una comanda con un detalle `ENTREGADO` y otro `PENDIENTE` con 2 de 5 entregadas
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 200 con ambos detalles ordenados por `id`, cada uno con `cantidad`, `cantidad_entregada` y `estado_entrega`

#### Escenario: Todo entregado (CA 2)

- DADO que se entregó la cantidad completa de todos los detalles de la comanda
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 200 y ningún detalle está `PENDIENTE`
- Y `GET /comandas/{comanda_id}/pendientes` responde con `pendientes` vacío

#### Escenario: Comanda cerrada

- DADO una comanda `CERRADA`
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 200 con `estado` `CERRADA` y sus detalles (S8)

#### Escenario: Comanda inexistente

- DADO un `comanda_id` que no existe
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 404 con `{"detalle": ...}`

### Requisito: Migración de la cantidad entregada

La migración de Alembic DEBE agregar `cantidad_entregada` y completarla para los datos existentes, sin perder el estado de entrega. DEBE poder revertirse.

#### Escenario: Detalles ya entregados

- DADO detalles existentes con `estado_entrega` `ENTREGADO` y otros `PENDIENTE`
- CUANDO se aplica la migración
- ENTONCES los `ENTREGADO` quedan con `cantidad_entregada = cantidad` y los `PENDIENTE` con 0
- Y el invariante se cumple en todas las filas

#### Escenario: Reversión

- DADO la migración aplicada
- CUANDO se ejecuta `alembic downgrade` de esa revisión
- ENTONCES la columna `cantidad_entregada` desaparece y `estado_entrega` se conserva

### Requisito: Modal «Entregas» en el listado de comandas (CA 1 y CA 2)

El frontend DEBE ofrecer una acción «Entregas» en cada fila del listado de comandas (módulo `atencion`) que abre un modal (`Dialog`) con los detalles de la comanda. Cada línea DEBE mostrar su referencia («Producto #id» o «Menú ejecutivo #id», S9), el texto «{entregadas} de {cantidad}», una insignia (`Badge`) «Entregado» o «Pendiente», un contador con los botones − y +, y un botón «Entregar todo». El botón − DEBE estar deshabilitado con `cantidad_entregada` 0 y el + con `cantidad_entregada` igual a `cantidad`. Con la comanda no `ABIERTA`, todos los controles DEBEN estar deshabilitados. Toda llamada a la API DEBE pasar por `frontend/src/modules/atencion/api.ts`; los componentes no usan `fetch` (D-16).

#### Escenario: Sumar una unidad con +

- DADO el modal «Entregas» de una comanda `ABIERTA` con una línea «2 de 10»
- CUANDO la persona pulsa +
- ENTONCES se llama a `PUT .../entrega` con `{"cantidad_entregada": 3}` y la línea muestra «3 de 10»

#### Escenario: Desmarcar con −

- DADO una línea «3 de 3» marcada «Entregado»
- CUANDO la persona pulsa −
- ENTONCES se llama a `PUT .../entrega` con `{"cantidad_entregada": 2}`, la línea muestra «2 de 3» y su insignia pasa a «Pendiente»

#### Escenario: Límites del contador

- DADO una línea «0 de 5»
- CUANDO se muestra
- ENTONCES − está deshabilitado y + habilitado
- Y con la línea «5 de 5», + está deshabilitado y − habilitado

#### Escenario: Entregar todo

- DADO una línea «Pendiente» «2 de 10» en una comanda `ABIERTA`
- CUANDO la persona pulsa «Entregar todo»
- ENTONCES se llama a `PUT .../entrega` con `{"cantidad_entregada": 10}`, la línea muestra «10 de 10» y la insignia «Entregado»

#### Escenario: No falta servir nada (CA 2)

- DADO el modal «Entregas» de una comanda cuyas líneas están todas completas
- CUANDO se muestra
- ENTONCES se lee el mensaje «No falta servir nada»

#### Escenario: Error al registrar

- DADO que `PUT .../entrega` responde 409 (por ejemplo, otro mozo cerró la comanda)
- CUANDO la persona pulsa + o «Entregar todo»
- ENTONCES el modal muestra el mensaje de `detalle` y recarga los datos de la comanda

#### Escenario: Comanda no abierta

- DADO una comanda `CERRADA` o `ANULADA`
- CUANDO se abre el modal «Entregas»
- ENTONCES muestra las líneas y su estado, con −, + y «Entregar todo» deshabilitados

### Requisito: Acceso a las entregas desde el cierre de la comanda

El modal de cierre (`CierreComandaDialog`) DEBE reemplazar el texto «pendiente de integración (HU-M4-08)» por un acceso al modal «Entregas» de la misma comanda. Al volver de las entregas, el cierre DEBE reflejar los pendientes actualizados.

#### Escenario: Cierre con pendientes

- DADO el modal de cierre de una comanda con productos pendientes
- CUANDO se muestra la lista de pendientes
- ENTONCES se ofrece un acceso «Entregas» que abre el modal de entregas de esa comanda y no aparece el texto «pendiente de integración»

#### Escenario: Cierre tras entregar todo

- DADO una comanda `ABIERTA` cuyas líneas se completaron desde el modal «Entregas»
- CUANDO se vuelve al cierre y se confirma
- ENTONCES `POST /comandas/{comanda_id}/cerrar` responde 200 y la comanda queda `CERRADA`, sin SQL manual

## Fuera de alcance

- Corregir entregas de una comanda cerrada o anulada (HU-M4-10, reabrir).
- Columna «Entregados» del listado (cambiaría `ComandaResumen`, contrato compartido S2-01).
- Detalle de mesa en Inicio (módulo M3).
- Nombres de productos en lugar de referencias (adaptadores del PR #207).
- Modificar, anular o reabrir comandas; promociones; factura; autenticación.

## Pruebas mínimas

Una prueba por criterio de aceptación en backend y en frontend (CA 1 y CA 2), más los casos de error y de límite de arriba (404, 409, 422, idempotencia, desmarcar, migración). Nombres `test_<función>_<caso>` en el backend.
