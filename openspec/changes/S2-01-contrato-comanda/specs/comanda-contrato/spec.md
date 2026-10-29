# Especificación de Comanda: borrador para revisión

> **Vigencia de apply (2026-10-29):** excepción de tamaño ya aceptada para single-pr y preflight nativo confirmado por el padre. Autorizados únicamente contrato documental (incluido `SPRINT-2/`), DTO, fake y pruebas del lanzamiento; HTTP no seleccionado. Las condiciones antiguas de autorización que siguen son históricas, no obligan a preguntar otra vez ni a esperar aceptación M5/M6 para un fake provisional. Apply quedó parcial antes de comportamiento por dos timeouts de pytest basal; no se afirma cumplimiento ejecutado, GREEN ni congelación. Evidencia en [apply-progress.md](../../apply-progress.md).

**Cambio:** S2-01-contrato-comanda · **Responsable:** Juan Ignacio Riquelme (M4).
**Estado:** BORRADOR NO CONGELADO para el equipo. Decisiones locales del stub registradas; futuro apply restringido autorizado por el usuario, condicionado al presupuesto. Sin implementación ni aceptación M5/M6.

## Propósito y lectura

Especificación completa de una capacidad nueva: datos y operaciones observables de Comanda para M4/M5/M6. Primero se revisan los requisitos respaldados; después las propuestas de intercambio y las decisiones pendientes. El [stub](../comanda-stub-compartido/spec.md) referencia estas reglas sin redefinirlas.

DEBE y NO DEBE expresan obligaciones respaldadas por fuentes. Las secciones **Supuesto:** no son norma de equipo; A01/A02 se distinguen como **adoptadas operativamente para el stub por el usuario**, utilizables en futuras pruebas locales, no aprobación de las HU por terceros. Los demás candidatos abiertos no son expectativas finales aprobadas. **Pendiente de validación** limita congelación compartida, no exige implementar otros módulos para el fake. Decisiones vigentes y autorización: [anexo del 2026-10-29](../../exploration.md#anexo-de-decisiones-del-usuario--2026-10-29).

Esta ejecución solo mantiene seis documentos. La autorización futura cubre contrato documental, DTO compartido, stub y pruebas, no Comanda real, pantallas, otras HU/módulos ni router productivo. Se detiene antes de apply: falta `size:exception` de mantenedor y consentimiento nativo de edición aplicable; no commits/push/PR.

Fuentes: [#162](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/162), [#52](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/52), [#55](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/55), [#58](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/58), [#68](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/68); arquitectura D-04/D-10/D-21–D-27 y diagrama unificado en `SPRINT-0/`; supuesto 4 de `SPRINT-2/S2-02-supuestos-y-fecha.md`. Se utiliza la evidencia documental del padre recogida en [exploración](../../exploration.md#fuentes-y-requisitos-establecidos), sin nuevas operaciones remotas.

## Requisitos respaldados

### Requirement: R01 — Alta general y detalle válido

Fuente: #52 y diagrama unificado. Una Comanda DEBE tener mesa y al menos un DetalleComanda; cada detalle DEBE referir a un Producto o a un Menú Ejecutivo, de forma excluyente, con cantidad entera estrictamente positiva. Ante cantidad inválida o mesa inexistente, el sistema DEBE advertir la situación. NO DEBE poseer cliente propio: la referencia al cliente procede solo de la reserva de origen, si existe. La relación con Mozo está en el diagrama; su origen sigue pendiente en A10.

#### Scenario: S52-01 — Alta con detalle
- **Dado** un pedido válido con productos para una mesa LIBRE, con al menos un detalle válido y las demás precondiciones satisfechas.
- **Cuando** se completa el alta general.
- **Entonces** la Comanda queda asociada a esa mesa y contiene los detalles solicitados; un pedido sin detalles no satisface el alta.

#### Scenario: S52-02 — Producto o menú ejecutivo
- **Dado** un detalle del alta general.
- **Cuando** se valida su referencia de consumo.
- **Entonces** es válido con un producto o un menú ejecutivo, pero no con ambos ni sin ninguno.

#### Scenario: S52-03 — Cantidad estricta
- **Dado** un detalle con cantidad 1, 0, negativa, fraccionaria o booleana.
- **Cuando** se valida la cantidad.
- **Entonces** 1 satisface la regla de cantidad; ante los otros valores el sistema advierte que la cantidad es inválida y no los acepta mediante coerción. El canal del aviso y su traducción HTTP siguen pendientes.

#### Scenario: S52-08 — Sin cliente propio
- **Dado** una Comanda sin reserva y otra originada en reserva.
- **Cuando** se identifica el cliente relacionado.
- **Entonces** ninguna tiene cliente propio; solo la segunda puede referir al cliente de su reserva, sin crear datos personales independientes.

#### Scenario: S52-09 — Mesa inexistente
- **Dado** una mesa indicada que no existe.
- **Cuando** se solicita crear una Comanda para esa mesa.
- **Entonces** el sistema advierte que la mesa no existe; el código HTTP y el mecanismo de presentación del aviso quedan pendientes en A08.

### Requirement: R02 — Valores históricos, fecha y estado inicial

Fuente: #52, #162 y diagrama unificado. Al crear con un producto o menú ejecutivo con promoción vigente, el alta DEBE registrar y conservar el precio, la promoción aplicada y el descuento calculado al pedir, asignar fecha/hora del sistema y estado ABIERTA. Los estados de Comanda DEBEN distinguir ABIERTA, CERRADA y ANULADA, no el estado genérico habilitado/deshabilitado. La precisión monetaria y la representación temporal siguen abiertas en A05/A09.

#### Scenario: S52-04 — Conservación histórica
- **Dado** un alta válida con un producto o menú ejecutivo que tiene una promoción vigente.
- **Cuando** se crea la Comanda y se registra el detalle del pedido.
- **Entonces** se almacenan el precio, la promoción aplicada y el descuento calculado al pedir; ante cambios posteriores del catálogo o promoción, se conservan esos valores y no se sustituyen por los actuales. La estructura exacta del snapshot y la fórmula de cálculo siguen pendientes en A05.

#### Scenario: S52-05 — Inicio de Comanda
- **Dado** un alta válida.
- **Cuando** se registra la Comanda.
- **Entonces** su estado inicial es ABIERTA y su fecha/hora corresponde al sistema, no a una fecha elegida por el cliente.

### Requirement: R03 — Mesa y advertencia por otra ABIERTA

Fuente: #52. Si la mesa estaba LIBRE, el alta DEBE pasarla a OCUPADA. Ante otra Comanda ABIERTA de la misma mesa, el sistema DEBE advertir. La HU no establece bloqueo explícito ni continuación incondicional. A01 local añade bloqueo solo para el stub, pendiente de reconciliación con equipo/M5/M6; no atribuirlo a #52.

#### Scenario: S52-06 — Ocupación de mesa libre
- **Dado** una mesa LIBRE y un alta válida completada.
- **Cuando** se observan los efectos del alta.
- **Entonces** la mesa está OCUPADA y la Comanda está asociada a ella; el mecanismo de coordinación con M3 queda pendiente.

#### Scenario: S52-07 — Otra abierta
- **Dado** otra Comanda ABIERTA en la mesa seleccionada.
- **Cuando** se solicita un alta para esa mesa.
- **Entonces** se advierte esa situación según #52 CA02; el criterio original no fija bloqueo. El adicional provisional del stub se verifica separadamente en C01, sin reescribir la fuente.

### Requirement: R04 — Listado filtrable y paginado

Fuente: #55, D-27 y `backend/app/shared/paginacion.py`. El listado DEBE permitir visualizar comandas ABIERTAS con mesa y estado, permitir filtro por mesa y filtro por estado, e informar el resultado vacío cuando no hay comandas o coincidencias. Esto no establece un filtro ABIERTA por defecto. DEBE usar `Pagina` con `items,total,limit,offset`, `limit` entero entre 1 y 100, por defecto 50, y `offset` entero no negativo, por defecto 0. `total` cuenta coincidencias antes de recortar la página. Identificación, combinación, orden y resumen quedan en A07.

#### Scenario: S55-01 — Listar
- **Dado** comandas ABIERTAS registradas y una página solicitada que las incluye.
- **Cuando** se obtiene el listado.
- **Entonces** las comandas ABIERTAS se visualizan con su mesa y estado y la respuesta contiene los cuatro campos de Pagina; no se impone un filtro ABIERTA por defecto ni se excluyen otros estados por inferencia.

#### Scenario: S55-02 — Filtro de mesa
- **Dado** comandas de distintas mesas.
- **Cuando** se filtra por una mesa inequívocamente identificada.
- **Entonces** los elementos devueltos corresponden a esa mesa; el parámetro público se decide en A07.

#### Scenario: S55-03 — Filtro de estado
- **Dado** comandas en distintos estados.
- **Cuando** se filtra por CERRADA.
- **Entonces** los elementos devueltos tienen ese estado.

#### Scenario: S55-04 — Sin comandas o sin coincidencias
- **Dado** que no hay comandas registradas y se lista sin filtros, o que hay comandas pero un filtro válido no tiene coincidencias.
- **Cuando** se obtiene el listado en cualquiera de esos casos.
- **Entonces** se informa que el resultado está vacío mediante `items: []` y `total: 0`; la ausencia no es recurso inexistente. La presentación concreta del aviso queda pendiente, sin fijar textos de interfaz.

#### Scenario: SPAG-01 — Página posterior al final
- **Dado** 3 coincidencias y `offset=10`, `limit=50`.
- **Cuando** se obtiene la página.
- **Entonces** `items` está vacío, `total=3`, `limit=50` y `offset=10`; no se confunde página vacía con conjunto sin coincidencias.

### Requirement: R05 — Cierre, aviso previo y límite de incorporación

Fuente: #58 y D-24. Cerrar una ABIERTA con productos DEBE dejarla CERRADA, sin permitir más incorporación de productos y lista para facturar. Con entregas pendientes se DEBE advertir ANTES de confirmar; la HU no establece bloqueo explícito ni entrega automática. A02 local añade bloqueo solo para el stub, pendiente de reconciliación con equipo/M6. NO DEBE cerrarse una ya CERRADA (D-24). El cierre no emite factura ni pago.

#### Scenario: S58-01 — Cierre válido
- **Dado** una Comanda ABIERTA con productos y las precondiciones de cierre satisfechas (fixture entregada para A02 local).
- **Cuando** se confirma y completa el cierre.
- **Entonces** queda CERRADA.

#### Scenario: S58-02 — No incorporar después
- **Dado** una Comanda CERRADA.
- **Cuando** se intenta incorporar otro producto.
- **Entonces** no se permite la incorporación; esto no agrega una operación de edición al alcance de S2-01.

#### Scenario: S58-03 — Lista para facturar
- **Dado** una Comanda CERRADA tras un cierre válido.
- **Cuando** M6 evalúa su disponibilidad para facturación.
- **Entonces** está lista para facturar; cerrar no registra una factura ni un pago.

#### Scenario: S58-04 — Advertir antes de confirmar
- **Dado** una ABIERTA con entregas pendientes.
- **Cuando** se prepara su cierre.
- **Entonces** se advierten los pendientes antes de confirmar según el CA original; el bloqueo adicional del stub se verifica separadamente en C02, sin inventar flags de bypass.

#### Scenario: SD24-01 — Segundo cierre
- **Dado** una Comanda ya CERRADA.
- **Cuando** se solicita cerrarla nuevamente.
- **Entonces** no se ejecuta otro cierre; el resultado público preciso queda en A08, no la prohibición establecida.

### Requirement: R06 — Alta desde reserva

Fuente: #68 y supuesto 4 de S2-02 adoptado por el equipo. El flujo DEBE partir de una reserva activa del día, heredar su mesa, vincular la Comanda y pasar la reserva a ATENDIDA. DEBE incluir al menos un producto con cantidades enteras positivas y DEBE advertir ante cantidades inválidas. NO DEBE crear desde cancelada o ya atendida y DEBE advertir esa situación. Ante otra fecha DEBE avisar; no se elimina la precondición «del día». Menús en este flujo, atomicidad, orquestador y resultado técnico del aviso quedan pendientes en A03/A09.

#### Scenario: S68-01 — Reserva activa de hoy
- **Dado** una reserva activa del día con mesa y un pedido válido con al menos un producto.
- **Cuando** se completa el alta desde esa reserva.
- **Entonces** la Comanda hereda la mesa, queda vinculada a la reserva y esta pasa a ATENDIDA; no se solicita una mesa independiente como elección del flujo.

**Decisión local A03:** al llegar los clientes y atender el mozo esa reserva, confirmar el pedido válido crea ABIERTA vinculada y reserva ATENDIDA; no se crea una comanda vacía como marcador al reservar. Activa de hoy, mesa heredada y productos/cantidades positivas se conservan. Invalidación no muta el estado simulado; dueño transaccional y atomicidad reales siguen pendientes, sin aprobación implícita de orquestación M5.

#### Scenario: S68-02 — Producto y cantidad
- **Dado** un pedido desde reserva sin productos o con cantidad cero, negativa o no entera estricta.
- **Cuando** se valida el pedido.
- **Entonces** el pedido no satisface las condiciones de alta desde reserva y, si la cantidad es inválida, el sistema lo advierte. El requisito de al menos un producto es cobertura adicional a la validación de cantidad; admitir un pedido compuesto solo por menús no está aprobado. El canal del aviso sigue pendiente.

#### Scenario: S68-03 — Cancelada o atendida
- **Dado** una reserva cancelada o ya ATENDIDA.
- **Cuando** se intenta originar una Comanda desde ella.
- **Entonces** no se crea la Comanda desde esa reserva y se advierte que está cancelada o ya atendida; código y canal del aviso siguen pendientes.

#### Scenario: S68-04 — Otra fecha
- **Dado** una reserva cuya fecha difiere del día aplicable.
- **Cuando** se solicita crear desde ella.
- **Entonces** el sistema avisa y la reserva no cumple la precondición de activa del día; no queda autorizado continuar fuera de fecha. Código y secuencia pública pendientes.

### Requirement: R07 — Superficies y errores arquitectónicos

Fuente: #162, D-04 y D-21–D-27. El contrato DEBE contemplar crear, listar y cerrar. El consumo interno M5/M6 DEBE pasar por `service`, NO DEBE importar schemas, modelos, repositorios ni routers ajenos. HTTP DEBE usar REST JSON `/api/v1`, GET para lectura, POST para alta y POST sobre subrecurso verbal para cierre. DEBE responder 201 en alta exitosa y 200 en lectura/modificación exitosa; errores DEBEN usar `{"detalle":"mensaje legible"}` sin información interna: 404 inexistencia, 409 regla de negocio, 422 datos inválidos. El mapa de casos y la precedencia siguen en A08; las advertencias no tienen protocolo establecido.

#### Scenario: S162-01 — Consumo y traducción
- **Dado** un consumidor interno M5/M6 y un adaptador HTTP del contrato.
- **Cuando** invocan una operación y se produce una excepción común de inexistencia, regla de negocio o datos inválidos.
- **Entonces** el consumidor interno usa el servicio público y HTTP traduce respectivamente a 404, 409 o 422 con `detalle`, sin devolver ORM ni trazas.

## Contrato de datos propuesto — no normativo

**Supuesto:** nombres snake_case para transporte, no renombrado del dominio. Cada nombre, tipo de identificador, inclusión en DTO, obligatoriedad, nulabilidad, omisión, valor por defecto y política de campos extra de estas tablas queda pendiente en A04/A10, salvo la semántica respaldada expresamente indicada. No se define todavía el rechazo o descarte de campos desconocidos.

| Dominio/diagrama | DTO candidato / tipo propuesto | Semántica conocida y pendiente |
| --- | --- | --- |
| Comanda.id | `id: int` en salida | Identifica Comanda; tipo público pendiente. |
| Mesa (relación) | `mesa_id: int` | Alta general recibe mesa; desde reserva se hereda. ID frente a número+sector: A07. |
| Reserva (relación opcional) | `reserva_id: int` o `null` | Vínculo opcional conocido; ausencia/null y superficie del flujo: A03/A10. |
| Mozo (relación) | Referencia de Mozo en salida por acordar | A10: origen en entrada, mesa o contexto; no se exige `mozo_id` en payload. |
| fechaHora | `fecha_hora: string` | Sistema; formato ISO con offset propuesto, no aprobado: A09. |
| EstadoComanda | `estado: string` | Valores ABIERTA/CERRADA/ANULADA establecidos; no editable libremente. |
| observaciones | `observaciones: string` o `null` | Opcional en diagrama; null/omisión/vacío y límites pendientes. |
| DetalleComanda (composición) | `detalles: list[DetalleComandaSalida]` | 1..* conocido; nombre plural propuesto. |
| /turno | Omitir del DTO inicial | Derivado opcional, no entrada arbitraria; inclusión pendiente. |
| total() | `total` derivado en salida, si se acuerda | No importe editable; fórmula/tipo/escala pendientes en A05. |

| DetalleComanda / relación | DTO candidato | Semántica conocida y pendiente |
| --- | --- | --- |
| id | `id: int`, solo salida | Tipo público pendiente. |
| Producto / Menú Ejecutivo | `producto_id` / `menu_ejecutivo_id: int` | XOR establecido; null frente a omisión pendiente. |
| cantidad | `cantidad: int` | Entero estricto >0 establecido; sin máximo inventado. |
| precioUnitario | `precio_unitario` | Snapshot; unificado Decimal contra float modular, representación pendiente. |
| descuento | `descuento` | Calculado al pedir; unidad/línea, escala y redondeo pendientes. |
| Promoción opcional | `promocion_id` más snapshot por acordar | Un ID podría no preservar condiciones históricas; no inventar atributos de promoción. |
| estadoEntrega | `estado_entrega: string` | Inicial PENDIENTE en diagrama; enum completo y exposición pendientes. |
| subtotal derivado propuesto | `subtotal` solo salida, si se acuerda | Fórmula de DetalleFactura no congela cálculo de Comanda. |

**Supuesto:** `ComandaCrear` transportaría mesa, reserva opcional, observaciones y detalles con referencia XOR/cantidad; `ComandaResumen` incluiría id/mesa/estado/fecha_hora; `ComandaSalida` añadiría vínculo opcional, observaciones y detalles históricos. No se acepta tácitamente que el cliente determine precio/descuento/promoción: se propone capturarlos desde servicios M1/M2. Ubicación de DTO y ORM son decisiones separadas.

**Supuesto: ejemplo PROVISIONAL único**, fragmento de entrada general, no schema final ni expectativa ejecutable. Omite Mozo y campos opcionales porque su origen/omisión siguen pendientes:

```json
{"mesa_id": 7, "detalles": [{"producto_id": 12, "cantidad": 2}]}
```

## Operaciones revisables — formas exactas propuestas, no congeladas

Las rutas son propuestas D-21–D-24; DTO, firmas, parámetros y cuerpos siguen pendientes de aceptación compartida. **A04 local exige crear, consultar, listar y cerrar en el stub**, mediante DTO y fake interno mínimo válido; HTTP es opcional, no se exigen ambas superficies ni router productivo. Ninguna firma implica imports cruzados, edición de otros módulos o dueño transaccional aprobado.

| Operación / ruta candidata | Entrada conceptual / DTO o firma candidata | Salida, efectos y límites |
| --- | --- | --- |
| Crear: `POST /api/v1/comandas` | Mesa en alta general o reserva origen con mesa heredada; detalles/observaciones. `crear_comanda(datos: ComandaCrear) -> ComandaSalida` | 201 establecido; cuerpo propuesto con estado/fecha/detalles. R01–R03/R06. A01/A03/A05/A06/A09/A10 impiden congelarlo. No se añade ruta específica M5 sin acuerdo. |
| Listar: `GET /api/v1/comandas` | Filtros candidatos `mesa_id`, `estado`; `limit`, `offset` establecidos. `listar_comandas(filtros, paginacion) -> Pagina[ComandaResumen]` | 200 y Pagina establecidos; sin mutación. Decisión local: fecha_hora DESC y desempate ID; Supuesto: ID DESC, dirección no especificada por usuario. Conjunción/shape pendientes A07. |
| Consultar: `GET /api/v1/comandas/{id}` | Identidad Comanda. `consultar_comanda(id) -> ComandaSalida` | Consulta obligatoria del stub A04 local, con detalles/snapshots sintéticos, sin mutación/factura. HTTP 200 candidato y shape compartido pendientes; no inferir única comanda histórica por mesa. |
| Cerrar: `POST /api/v1/comandas/{id}/cerrar` | Identidad. `cerrar_comanda(id) -> ComandaSalida`, firma candidata. | 200 al éxito HTTP; pendientes bloquean por A02 local, sin confirmación que lo omita. No libera mesa, entrega, factura ni cobra; payload exacto compartido pendiente. |

| Caso observable | Base establecida / mapa propuesto pendiente A08 |
| --- | --- |
| Recurso inexistente | 404 como categoría establecida; Supuesto: aplicarlo a Comanda consultada/cerrada y relaciones de alta inexistentes. Prioridad frente a errores del cuerpo pendiente. |
| Datos inválidos | 422 como categoría establecida; Supuesto: detalle vacío, XOR, cantidad inválida, estado de filtro inválido y parámetros fuera de rango se traducen aquí. |
| Conflicto | 409 como categoría establecida; Supuesto: cierre ya CERRADA, no ABIERTA o reserva cancelada/atendida. D-24 ya prohíbe segundo cierre aunque su respuesta precise validación. |
| Otra ABIERTA / entregas pendientes | Fuente: advertencias; adicional local A01/A02 bloquea sin mutar. Supuesto: ReglaDeNegocioError y HTTP 409 con `{"detalle":"mensaje"}`, no código/envelope nuevo ni éxito encubierto. Consultar existente por listado de misma Mesa y consulta por ID/referencia acordada; no insertar identidad en error sin acuerdo. |
| Otra fecha | Aviso establecido y precondición del día; mapa/prioridad pendientes A08, sin permiso de crear fuera de fecha. |
| Timeout, reintento o solicitudes concurrentes | Resultado/reconciliación pendientes; no prometer idempotencia de alta, tokens ni claves nuevas. |

## Decisiones conservadas y escenarios candidatos — no normativos

Cada enlace conserva alternativas históricas; vigencia y responsables en el anexo y [propuesta](../../proposal.md#matriz-de-decisiones-y-trazabilidad). A01–A05 tienen decisiones locales explícitas; no aceptación de consumidores ni congelación del contrato de equipo.

| ID estable | Supuesto: propuesta para revisión / Pendiente de validación |
| --- | --- |
| [A01](../../exploration.md#a01--otra-abierta-en-la-misma-mesa) | Supuesto: adoptado para el stub por usuario: otra ABIERTA bloquea alta, informa conflicto y permite consulta existente. Reconciliación #52 CA02 con equipo/M5/M6 pendiente. |
| [A02](../../exploration.md#a02--cierre-con-entregas-pendientes) | Supuesto: adoptado para el stub por usuario: cualquier producto pendiente bloquea cierre sin mutar/autoentregar, con aviso y guía de navegación documental. Reconciliación #58 CA03/equipo/M6 y destino pendientes. |
| [A03](../../exploration.md#a03--alta-desde-reserva-estados-y-atomicidad) | Decisión local: confirmar pedido al atender reserva crea ABIERTA vinculada y ATENDIDA; no vacía. M5 orquestador/atomicidad reales siguen propuestas pendientes, no asignación aprobada. |
| [A04](../../exploration.md#a04--interfaces-consumidas-y-alcance-del-stub) | Decisión local: crear/consultar/listar/cerrar obligatorios; DTO+fake interno mínimo válido, HTTP opcional. Firmas/aceptación compartida pendientes; arquitectura del proyecto sin editar otros módulos/router productivo. |
| [A05](../../exploration.md#a05--decimal-serialización-redondeo-y-snapshots) | Decisión local: Decimal/formato Productos, fecha DESC/desempate ID. Supuesto: ID DESC y centavos sintéticos exactos. Fórmula de descuento/redondeo con M6 pendientes; ROUND_HALF_UP histórico superado/no aprobado, no regla encontrada en Productos. |
| [A06](../../exploration.md#a06--estado-de-mesa-y-dependencia-de-salón) | Consulta/ocupación M3 coordinadas; simular mientras falten. Propuesto rechazo FUERA_DE_SERVICIO; OCUPADA y liberación pendientes, sin efecto automático al cierre; Juan/Giuliano/Federico/Héctor. |
| [A07](../../exploration.md#a07--listado-filtros-e-identificación) | ID de mesa, conjunción, sin estado implícito, orden estable y resumen+consulta. Selección/parametrización/shape pendientes; Juan/Federico/Héctor. |
| [A08](../../exploration.md#a08--fallos-advertencias-repetición-y-paridad) | Conflicto y consulta tras timeout para reconciliar. Mapa/prioridad, cierre ANULADA y repetición/concurrencia de alta pendientes; no reabrir la prohibición D-24; Juan/Federico/Héctor. |
| [A09](../../exploration.md#a09--fechahora-y-significado-de-hoy) | Timestamp ISO con offset y día del restaurante. Zona/reloj/precisión/medianoche pendientes; Juan/Federico con Joaquín/Héctor. |
| [A10](../../exploration.md#a10--forma-de-datos-mozo-y-ubicación-de-entidades) | IDs de entrada y DTO independiente; origen Mozo, nulos/omisiones/extras, repetidos y ORM/enums pendientes; Juan/Federico/Héctor/Giuliano/equipo. |

#### Scenario: C01 — Bloqueo ante otra ABIERTA (Supuesto: A01 adoptado para el stub por el usuario)
- **Dado** otra Comanda ABIERTA para la misma Mesa sintética.
- **Cuando** se intenta crear otra, revalidando ese estado al intento.
- **Entonces** se informa conflicto sin insertar ni mutar; el consumidor puede listar por esa Mesa y consultar la identidad existente por la operación regular. Supuesto: 409 con detalle común, sin envelope nuevo. No hay confirmación que habilite continuar; reconciliación de HU/equipo/M5/M6 pendiente.

#### Scenario: C02 — Bloqueo por pendientes (Supuesto: A02 adoptado para el stub por el usuario)
- **Dado** una ABIERTA con cualquier producto pendiente de entrega en el dataset sintético.
- **Cuando** se intenta cerrar, incluso tras reconocer el aviso.
- **Entonces** se advierte y no se cierra ni cambia ninguna entrega; Supuesto: 409 con detalle común. Ofrecer al consumidor guía para revisar y marcar entregas antes de reintentar: destino/pantalla pendiente de validación, sin UI, ruta, callback o campo nuevo. Una fixture separada entregada sí permite cierre; el stub no implementa marcado de otra HU. Reconciliación #58 CA03/equipo/M6 pendiente.

#### Scenario: C03 — Fallo y concurrencia de reserva (Supuesto: A03/A06/A08)
- **Dado** un alta desde reserva y un fallo entre los efectos o dos solicitudes concurrentes.
- **Cuando** se resuelve el intento.
- **Entonces** se propone ausencia de efectos parciales y de duplicación para esa reserva; el resultado de cada solicitud y mecanismo atómico siguen pendientes. Un fake no acredita rollback real.

#### Scenario: C04 — Decimal y formato del stub (decisión local A05; fórmula compartida pendiente)
- **Dado** snapshots sintéticos Decimal de centavos exactos, sin algoritmo global de descuentos.
- **Cuando** se serializan importes para el contrato candidato.
- **Entonces** se sigue el formato de Productos `f"{precio:.2f}"`, por ejemplo Decimal 10.00 como cadena `"10.00"`, sin adoptar una regla nueva de redondeo fraccional. `productos/schemas.py:153` valida dos decimales; serializadores 108–110, 225–227 y 240–242 usan ese formato. Búsqueda en Productos sin `quantize`, `ROUND_` o `round(`: formato/contexto decimal no prueban regla explícita de negocio. ROUND_HALF_UP por línea queda como propuesta histórica superada/no aprobada; fórmula/modo/momento pendientes con M6.

#### Scenario: C05 — Medianoche (Supuesto: A09)
- **Dado** reserva para el día D e invocaciones a ambos lados de medianoche según relojes distintos.
- **Cuando** se evalúa «hoy».
- **Entonces** se propone usar un único día del restaurante; los resultados concretos esperan zona, reloj y precisión aprobados.

## Trazabilidad de aceptación y condiciones pendientes

Los índices CA siguientes conservan el orden original de los criterios de GitHub según la captura exacta de `gh api` aportada por el padre en esta corrección; las descripciones son síntesis, no citas literales. No se realizaron nuevas operaciones remotas. La matriz relaciona los 20 criterios originales: 8 de #52, 4 de #55, 4 de #58 y 4 de #68. Su cobertura documental no aprueba el intercambio técnico, que conserva los Axx indicados.

| Fuente | Criterios en orden original → escenarios respaldados | Porción pendiente |
| --- | --- | --- |
| #52 | CA01 mesa LIBRE, alta con productos y OCUPADA → S52-01 + S52-06; CA02 otra ABIERTA, advertencia → S52-07; CA03 mesa inexistente, advertencia → S52-09; CA04 sin reserva origen, sin cliente propio → S52-08; CA05 cantidad inválida, advertencia → S52-03; CA06 snapshot de promoción al crear → S52-04; CA07 estado ABIERTA → S52-05; CA08 fecha/hora del sistema → S52-05 | A01/A05/A06/A09/A10; detalle de wire A04/A08. |
| #55 | CA01 listar ABIERTAS con mesa/estado → S55-01; CA02 filtro mesa → S55-02; CA03 filtro estado → S55-03; CA04 sin comandas, informar vacío → S55-04 | A07; wire A04/A08. |
| #58 | CA01 confirmar ABIERTA con productos, queda CERRADA → S58-01; CA02 sin incorporar productos y lista para facturar → S58-02 + S58-03; CA03 aviso de pendientes ANTES de confirmar → S58-04; CA04 CERRADA disponible para facturar → S58-03 | A02/A08; dinero consumido A05. |
| #68 | CA01 vínculo, mesa correcta y ATENDIDA → S68-01; CA02 cancelada/atendida, no crear y advertir → S68-03; CA03 otra fecha, advertir → S68-04; CA04 cantidad inválida, advertir → S68-02 | A03/A06/A09; wire A04/A08/A10. |
| #162 | Campos/estados → R01/R02/tablas; crear/listar/cerrar → R01/R04/R05; límites de interfaz → S162-01; stub M5/M6 → spec enlazada | A01–A10; aceptación real del contrato y entrega del doble no satisfechas. |

La spec conserva 7 requisitos, 24 escenarios respaldados y 5 escenarios adicionales C01–C05, distinguiendo decisiones locales del stub de candidatos compartidos pendientes. Los 20 criterios originales se trazan a 20 escenarios distintos: S52-01 y S52-06 complementan CA01, S52-05 cubre CA07/CA08 y S58-03 participa en CA02/CA04. Los 4 escenarios respaldados adicionales son S52-02 (XOR/producto o menú), SPAG-01 (paginación), SD24-01 (segundo cierre) y S162-01 (superficies/errores). C01/C02 son reglas provisionales adicionales, no criterios originales de bloqueo; no renumeran los CA ni acreditan su cumplimiento ejecutado.

- [ ] Validación humana de decisiones compartidas; aceptación de Federico (M5) y Héctor (M6) todavía no obtenida.
- [ ] Diseño/tareas podrán continuar como planificación con pendientes explícitos; no implican contrato congelado.
- [ ] Excepción de tamaño y consentimiento nativo aplicable antes del futuro apply restringido ya autorizado localmente; sin código, pruebas o publicación en esta ejecución.
- [ ] R04 sigue expuesto: documentos y candidatos de paridad no demuestran integración disponible.

No se incluyen operaciones de factura, pago, reapertura, anulación, reporte ni marcar entregas; ANULADA es un estado, no autorización de un flujo. No se agregan cliente/dirección, fecha de cierre ni turno editable. Se conserva single-pr: 800 adiciones + eliminaciones en backend y 800 en frontend son puntos de revisión independientes del equipo, no franquicia de 1600 ni división obligatoria. El control general de 400 incluye documentos y requiere `size:exception` explícita de mantenedor antes del futuro apply restringido; no está concedida. Véase [política en tareas](../../tasks.md#política-de-revisión-dos-controles-independientes): seguimiento manual, sin reconfigurar runtime. El permiso local no equivale a excepción, aceptación ajena ni autorización para ampliar alcance.
