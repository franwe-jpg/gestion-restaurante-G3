# Especificación de alta de Comanda (borrador)

## Alcance local vigente (autorización posterior)

HU-M4-04 tiene servicio M4 con puertos obligatorios de Mesa y Catálogo y un POST conectado a ese servicio mediante dependencias explícitas: sin adaptadores reales retorna `503 detalle`; los dobles solo se inyectan en pruebas. Se reutilizan entrada/salida/enums S2-01 y persistencia existente. Mesa debe validar/ocupar en la misma sesión sin commit propio, Catálogo entrega valores calculados sin fórmula inventada en M4. La entrada/cotización se revalidan y fallos revierten la transacción. El formulario está implementado y probado con dobles, pero eso no acredita alta integrada ni servicios externos.

A01 impide segunda inserción y lleva `comanda_id` en la excepción local; su manejador HTTP especializado conserva `detalle` y añade ese ID. Con dobles de prueba el POST retorna 201 y el segundo intento 409 sin insertar otra Comanda. Consulta/presentación de la existente sigue pendiente. No se acredita alta productiva sin adaptadores, aceptación M1/M2/M3/M5/M6 ni fórmula externa.

## Propósito y fuentes

Registrar el pedido de una Mesa con sus valores históricos. Capacidad nueva, sin especificación principal previa. Fuente de los ocho escenarios numerados: [#52](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/52), criterios de aceptación en su orden original. El contrato HTTP siguiente es una propuesta para revisión, no una API productiva ya acordada. S2-01 aporta DTO y un doble de pruebas, no un servicio HTTP (`SPRINT-2/S2-01-contrato-comanda.md`).

## Contrato HTTP y datos propuestos

**Persistencia y servicio local existentes:** modelos/migración conservados, FK solo a tablas existentes y Reserva/Promoción escalares. ABIERTA/PENDIENTE, UTC del sistema, ausencia de cliente propio y snapshots `Decimal`/`Numeric(10,2)` probados. Acumulado actual 9/30. El POST y formulario existen, pero los adaptadores productivos no: responden indisponibilidad explícita en vez de simular datos. La fórmula y el alcance del descuento quedan con su proveedor; no se recalculan snapshots.

**Reutilización compartida:** `POST /api/v1/comandas` recibe `ComandaCrear` y devuelve `ComandaSalida` al disponer de proveedores; los esquemas S2-01 no se duplican ni modifican. Los metadatos locales de A02 no reemplazan la salida de detalle. El DTO recibe `mesa_id`, no número de mesa; los selectores por número/sector requieren coordinación M3.

| Esquema propuesto | Campos y límites respaldados | Pendiente de validación |
| --- | --- | --- |
| `ComandaCrear` | Mesa obligatoria, `detalles` no vacío, `observaciones` opcionales. Cada detalle refiere a Producto o Menú Ejecutivo y tiene `cantidad` entera > 0. | `mesa_id` frente a número/sector; referencia XOR y nombres `producto_id`/`menu_ejecutivo_id`; origen de Mozo; vínculo `reserva_id` opcional solo para el flujo de reserva de otra HU. |
| `DetalleComandaSalida` compartido | Referencia consumida, cantidad, precio/descuento histórico y promoción; sin `id`, sin recálculo. | A02 obtiene IDs mediante metadatos de operación locales separados; no se requiere extender S2-01 para ese alcance. Fórmula/alcance del descuento pendientes de catálogo. |
| `ComandaSalida` compartido | **Ya incluye `id`** heredado de `ComandaResumen`, Mesa, detalles, estado, fecha/hora, observaciones y reserva opcional; sin cliente propio. | La salida normal no determina cómo devolver el ID en un conflicto A01. Zona local y superficies HTTP pendientes. |

**Supuesto: traducción HTTP propuesta, no fallo atribuido al issue.** Mesa inexistente → `404`; cantidad no entera positiva o detalle vacío → `422`; A01 → `409` propuesto. Los errores existentes siguen `{"detalle":"mensaje legible"}` (D-25/D-26); el fake A01 solo lanza un mensaje. **El bloqueo A01 debe devolver el ID de la Comanda ABIERTA existente**, también en conflicto concurrente, y permitir consultarla; acordar con el equipo la superficie de lectura y error sin inventar una carga HTTP ni asumir que `detalle` lleva el ID. #52 CA02 solo exige aviso. Catálogo, prioridad de errores y Mesa no libre sin otra ABIERTA: pendientes. No admitir precio, descuento, cliente ni fecha elegidos por el mozo.

## Requisitos

### Requisito: Crear pedido en Mesa libre (#52 CA01)

El sistema DEBE registrar una Comanda con al menos una línea de pedido y DEBE reflejar la Mesa libre como ocupada al completar el alta; el mecanismo de coordinación con M3 permanece pendiente.

#### Escenario: CA01 — Alta y ocupación

- **Dado** que existe una Mesa libre y un pedido válido con productos.
- **Cuando** el mozo crea la Comanda.
- **Entonces** el pedido queda registrado con sus detalles y la Mesa figura ocupada.

### Requisito: Avisar sobre otra Comanda abierta (#52 CA02)

El sistema DEBE avisar si la Mesa ya tiene otra Comanda ABIERTA. El criterio original NO prescribe si se puede continuar tras el aviso. **Decisión A01 aprobada para este cambio:** impedir la segunda alta y mostrar la Comanda ABIERTA existente para consulta.

#### Escenario: CA02 — Otra abierta en la Mesa

- **Dado** que la Mesa ya tiene una Comanda ABIERTA.
- **Cuando** se intenta crear otra en esa Mesa.
- **Entonces** se informa al mozo que existe otra Comanda abierta; conforme a A01, no se crea una segunda, el bloqueo devuelve el ID de la existente y se muestra para consulta.

#### Escenario: A01 — Acceso a la Comanda existente

- **Dado** que una Mesa tiene una Comanda ABIERTA identificable.
- **Cuando** el mozo intenta iniciar otra Comanda para esa Mesa.
- **Entonces** se impide crear otra, se devuelve su ID y la interfaz presenta la Comanda ya abierta para consulta, sin alterar sus detalles ni su estado.

La decisión funcional A01 es adicional a #52 CA02; falta acordar con M3 cómo identificar la Mesa y con el equipo cómo devolver el ID y leer la Comanda existente sin inventar un endpoint ni equiparar `mesa_id` a número de Mesa. El `id` de la salida compartida no resuelve por sí solo el transporte del conflicto.

### Requisito: Advertir Mesa inexistente (#52 CA03)

Ante una Mesa inexistente, el sistema DEBE advertir y NO DEBE registrar el pedido.

#### Escenario: CA03 — Número de Mesa desconocido

- **Dado** un número de Mesa que no corresponde a ninguna Mesa existente.
- **Cuando** se intenta crear la Comanda.
- **Entonces** se advierte que la Mesa no existe y no se registra una Comanda para ella.

### Requisito: No crear cliente propio (#52 CA04)

Una Comanda que no nace de una Reserva NO DEBE tener cliente asociado; si nace de Reserva, el cliente solo se conoce a través de ella.

#### Escenario: CA04 — Pedido sin Reserva

- **Dado** que la Comanda no se crea desde una Reserva.
- **Cuando** se registra el pedido.
- **Entonces** queda sin cliente asociado y no se crea un cliente propio de la Comanda.

### Requisito: Validar cantidad (#52 CA05)

Cada cantidad DEBE ser un número entero mayor que cero; se DEBE advertir si no lo es.

#### Escenario: CA05 — Cantidad inválida

- **Dado** un detalle de Producto con cantidad cero, negativa, fraccionaria o no numérica.
- **Cuando** se intenta registrar la Comanda.
- **Entonces** se advierte que la cantidad es inválida y no se registra ese pedido inválido.

### Requisito: Conservar precio y promoción al pedir (#52 CA06)

Cada línea DEBE capturar al crear la Comanda el precio unitario vigente y, cuando corresponda una promoción vigente, la promoción aplicada y el descuento calculado entonces como importe monetario absoluto, no porcentaje. Precio unitario y descuento DEBEN conservarse como importes decimales de dos decimales sin recálculo posterior. La fórmula y si el descuento absoluto corresponde a la unidad o la línea requieren acuerdo de integración.

#### Escenario: CA06 — Valores históricos con promoción

- **Dado** un Producto o Menú Ejecutivo con promoción vigente al efectuar el pedido.
- **Cuando** se registra su línea y posteriormente cambia el precio o la promoción del catálogo.
- **Entonces** la línea mantiene el precio unitario y el descuento monetario absoluto de dos decimales capturados al momento de pedir, junto con la promoción aplicada, sin recalcularlos tras el cambio.

### Requisito: Estado inicial (#52 CA07)

Una Comanda válida DEBE comenzar en estado ABIERTA.

#### Escenario: CA07 — Alta confirmada

- **Dado** una Comanda válida.
- **Cuando** se confirma su creación.
- **Entonces** queda registrada en estado ABIERTA.

### Requisito: Fecha y hora del sistema (#52 CA08)

Al crear la Comanda, el sistema DEBE generar y guardar la fecha y la hora de creación en UTC; no son datos ingresados por el mozo. La conversión a la zona local DEBE ocurrir solo al presentar, sin modificar el instante almacenado.

#### Escenario: CA08 — Instante de creación

- **Dado** un pedido válido y un instante de creación conocido del sistema.
- **Cuando** se registra la Comanda.
- **Entonces** conserva la fecha y la hora de ese instante en UTC, asignadas por el sistema; al presentarlas en hora local no se modifica el dato guardado.

## Decisiones pendientes

- Coordinar con M3 identificación y ocupación de Mesa y qué sucede si está OCUPADA pero no tiene otra ABIERTA; no modificar el módulo Salón en esta fase.
- Acordar las superficies de error y lectura que devuelvan el ID persistente de la Comanda existente y permitan consultarla tras A01; el DTO compartido ya tiene `ComandaSalida.id`, pero el error del fake no lo devuelve.
- Acordar con M1/M2 y M6 fórmula/redondeo, alcance por unidad o línea del descuento absoluto y origen de valores/promociones; con M5, validación futura de `reserva_id` (#68 fuera de alcance). El servicio M4 local ya captura valores cotizados y persiste historia sin redondearla; rechaza referencias/cantidades incompatibles, importes no Decimal/fuera de escala y entregas anticipadas. No existen adaptadores productivos ni integración HTTP de alta/A01. Los escenarios siguen pendientes de presentación y aceptación externa, aunque tengan evidencia local.
