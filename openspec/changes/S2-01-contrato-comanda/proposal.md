# Propuesta: contrato de Comanda para integración M4–M5–M6

> **Vigencia de apply (2026-10-29):** el usuario ya aceptó `size:exception` para single-pr y el padre confirmó el preflight nativo. Autoriza contrato documental, incluida publicación en `SPRINT-2/S2-01-contrato-comanda.md`, DTO, fake y pruebas limitados; no HTTP ni producto real. Las menciones posteriores a tamaño/publicación sin autorización describen el estado anterior y quedan sustituidas por esta nota y [apply-progress.md](apply-progress.md). No hay aceptación compartida ni contrato congelado. Apply se detuvo antes del comportamiento: pytest basal no terminó en dos ejecuciones (120 s y 600 s); lint, formato y contratos de importación sí pasaron. No se repite la pregunta de autorización ni la planificación.

**Cambio:** `S2-01-contrato-comanda` · **Responsable:** Juan Ignacio Riquelme (M4).
**Estado:** propuesta documental completa; contrato de equipo **NO CONGELADO**. Futuro apply restringido autorizado por el usuario, condicionado al presupuesto; sin implementación realizada.

Se propone especificar un contrato común de Comanda y planificar un stub compartido controlado y pruebas de contrato para que Reservas y Pagos puedan avanzar sin depender de la implementación completa de Atención al Público. En la fase original se creó **únicamente `proposal.md`**. La aceptación de [exploration.md](exploration.md) como insumo no constituye aprobación de producto, de sus recomendaciones ni del stub.

**Nota de mantenimiento (2026-10-29):** los seis artefactos de planificación ya existen. Las referencias a su creación describen la secuencia histórica, no autorizan relanzar fases. El usuario autoriza futuro apply solo para contrato documental, DTO compartido, stub y pruebas; no Comanda real, pantallas, otras HU, módulos ajenos ni router productivo. No hay excepción de tamaño, commits, push o PR autorizados. Véase el [anexo de decisiones vigente](exploration.md#anexo-de-decisiones-del-usuario--2026-10-29): aceptación local no es aceptación del equipo.

## Intención y recorrido de revisión

1. Revisar los requisitos respaldados y el alcance preparatorio de S2-01.
2. Revisar las decisiones locales A01–A05 y sus diferencias con las HU; validar con equipo/M5/M6, sin presumir aprobación.
3. Mantener A06–A10 abiertos y solicitar la excepción de tamaño antes de un futuro apply restringido; no repetir planificación.

Se conserva el nombre exacto aprobado por la persona: S2-01 es una tarea transversal preparatoria, no la implementación agrupada de varias HU. Esta excepción explícita a la convención de nombres por HU no renombra el cambio ni absorbe tareas de otros responsables.

### Fuentes y requisitos respaldados

La evidencia completa, discrepancias y alternativas están en [exploration.md, fuentes](exploration.md#fuentes-y-requisitos-establecidos). Se reutiliza la lectura del padre: issues abiertos, sin comentarios y sin dependencias declaradas en #162; no se realizaron nuevas operaciones remotas.

| Fuente | Base establecida, no diseño nuevo |
| --- | --- |
| [S2-01 #162](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/162) | Campos mesa, reserva opcional, detalle, observaciones, estado y fecha/hora; estados ABIERTA/CERRADA/ANULADA; crear/listar/cerrar y stub compartido M5/M6. |
| [HU-M4-04 #52](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/52) | Al menos un detalle, producto o menú ejecutivo, cantidad entera estricta positiva, precio/promoción/descuento conservados al pedir; fecha/hora del sistema y ABIERTA; LIBRE pasa a OCUPADA; advertencia ante otra ABIERTA; sin cliente propio. |
| [HU-M4-07 #55](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/55) | Listado con mesa y estado, filtros por ambos y resultado vacío. |
| [HU-M4-09 #58](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/58) | Cerrar una ABIERTA con productos la deja CERRADA, sin más incorporación y lista para facturar; advertir entregas pendientes antes de confirmar. No factura ni cobra. |
| [HU-M5-06 #68](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/68), `SPRINT-2/S2-02-supuestos-y-fecha.md`, supuesto 4 | Reserva activa del día, mesa heredada, vínculo y ATENDIDA; al menos un producto y cantidades enteras positivas; no crear desde cancelada/atendida; aviso por otra fecha. Esta interpretación ya fue adoptada por el equipo. |
| `SPRINT-0/Plan-de-trabajo-Sprint.md`, S2-01; `SPRINT-0/S0-10-riesgos.md`, R04 | Contrato y stub previos a Comanda completa; plan pide crear/listar/cerrar y R04 crear/cerrar/consultar. La consulta individual se precisa en A04, no se omite ni se presupone aprobada. |
| `SPRINT-0/S0-05-arquitectura.md`, D-04/D-10/D-21–D-27; diagrama unificado | Consumo entre módulos solo por `service`; transacciones en servicios; REST JSON `/api/v1`; cierre por POST; no cerrar una ya cerrada (D-24); 201/200 y errores 404/409/422 con `detalle`; paginación común; detalle XOR, Decimal y relaciones del diagrama. |

Los conflictos del diagrama modular (float, estado inactiva, cliente directo y mesa/comanda 1:1) permanecen señalados en la exploración: no se corrigen fuentes ni se trasladan silenciosamente al contrato. D-24 ya descarta tratar un segundo cierre como un nuevo cierre exitoso; quedan pendientes el resultado público preciso y la reconciliación del consumidor, no esa restricción de negocio.

## Alcance

### Incluido en el objetivo del cambio, sujeto a revisión y autorización posterior

- Especificar datos, estados, snapshots y las cuatro operaciones del stub: crear, consultar, listar y cerrar; HTTP aislado opcional, sin facturación.
- Documentar efectos observables sobre reserva y mesa, advertencias, errores, reintentos y concurrencia, separando lo confirmado de A01–A10.
- Planificar DTO compartidos separados de ORM, fake interno con estado y datos sintéticos como mínimo válido y pruebas reutilizables. HTTP aislado solo si se valida su necesidad, nunca ambas superficies obligatorias.
- Preparar escenarios por criterio de aceptación y ejemplos monetarios/temporales para revisión. Planificar la publicación del contrato solo tras su validación y autorización fuera de esta carpeta.

### Autorizado ahora

En este mantenimiento: modificar y releer solo los seis documentos existentes del cambio. La autorización de implementación futura restringida no inicia apply: sigue pendiente `size:exception` explícita de mantenedor y el consentimiento nativo de edición que corresponda. No se ejecutan fases, pruebas ni implementación.

### Fuera de alcance

- Implementar las HU completas de M4 o interfaces, pantallas y persistencia productiva de M3/M5/M6.
- Facturar, cobrar, anular, reabrir, reportar, marcar entregas o implementar algoritmos de promociones M1/M2. ANULADA como valor no autoriza una operación de anulación.
- Añadir cliente propio, datos personales, fecha de cierre, turno obligatorio, campos o límites sin respaldo.
- Escribir código, stub, pruebas, migraciones, `shared/`, otros módulos, frontend o publicación en `SPRINT-2/` en esta ejecución.
- Modificar configuración, bootstrap, registro de skills, issues o tablero; ejecutar commits, push o PR. No declarar R04 mitigado por producir documentos o DTO.

## Capacidades

### Inventario comprobado

`openspec/specs/` contiene `carta-productos`, `carta-secciones` y `carta-vista`, sin capacidad de Comanda. Se inspeccionaron sus contratos y los cambios relacionados `HU-M3-01/specs/salon-sectores/spec.md` y `HU-M3-05/specs/salon-mesas/spec.md`: cubren altas de sector/mesa y listado de sectores, no consulta/ocupación intermodular ni Comanda. No se encontraron capacidades M5/M6 que deban modificarse en este alcance. El precedente de cadenas monetarias de M1 no determina el cálculo M4/M6.

### Capacidades nuevas para la fase spec

| Nombre exacto | Archivo futuro dentro de este cambio | Cobertura y límite |
| --- | --- | --- |
| `comanda-contrato` | `specs/comanda-contrato/spec.md` | Datos y comportamiento de crear/consultar/listar/cerrar; reglas locales provisionales del stub y límites de integración reserva/mesa, con validación compartida pendiente. No implementa capacidades de Reservas, Pagos o Salón. |
| `comanda-stub-compartido` | `specs/comanda-stub-compartido/spec.md` | Doble controlado para M5/M6, instalación/ejecución por acordar, datos sintéticos, reinicio/aislamiento, efectos simulados y escenarios de paridad. No acredita integración productiva ni atomicidad real. |

Estas capacidades separan contrato y utilidad de integración; las reglas se referencian desde el stub, no se duplican. Sus archivos ya existen como borradores. Su eventual incorporación a `openspec/specs/<nombre>/spec.md` corresponde al archivo posterior del cambio, no a este mantenimiento.

### Capacidades modificadas

Ninguna. No se alteran silenciosamente requisitos de M1, `salon-mesas`, `salon-sectores`, M5 ni M6. Una necesidad de cambio ajeno requiere coordinación y autorización explícitas, no un delta implícito en S2-01.

## Enfoque propuesto

**Supuesto:** partir de un contrato tipado independiente de ORM y de schemas internos de Atención, expuesto a consumidores internos mediante el servicio público M4. Mantener adaptadores HTTP separados y reutilizar excepciones/paginación existentes. Esta orientación respeta D-04; no habilita importar directamente schemas, repositorios o modelos de otro módulo.

Hoy M4/M5/M6 son esqueletos; M3 solo tiene servicios parciales de altas/listado, sin consulta/ocupación de mesa ni operaciones de mozo. El router M4 tampoco está registrado en la aplicación. No existe una integración cuya firma pueda darse por definitiva ni una transacción componible ya disponible.

### Superficies y doble controlado: decisión A04

| Alternativa pendiente | Utilidad | Costo o límite |
| --- | --- | --- |
| DTO + fake de servicio con estado | Consumo interno automatizado M5/M6 y pruebas rápidas compatibles con D-04. | No expone HTTP ni `/docs`; por sí solo no sirve a pruebas manuales de clientes HTTP. |
| Stub HTTP local aislado ejecutable | Comprueba rutas, serialización y uso manual/cliente HTTP sin M4 productivo. | Más mantenimiento; no sustituye el punto de servicio interno ni demuestra transacciones reales. |
| Ambos con escenarios comunes | Cubre ambas superficies si son necesarias. | Exige paridad explícita para evitar contratos divergentes. |

**Decisión local A04:** DTO y fake interno de pruebas son el mínimo válido para las cuatro operaciones; HTTP aislado es opcional si se valida necesidad. «FastAPI si corresponde» no obliga a implementarlo. **Pendiente de validación compartida:** firmas, consumidores, conexión, reinicio/aislamiento y simulaciones. Nunca registrar el stub como funcionalidad productiva ni editar otros módulos para conectarlo.

**Supuesto:** proponer `POST /api/v1/comandas`, `GET /api/v1/comandas` y `POST /api/v1/comandas/{id}/cerrar`; proponer además `GET /api/v1/comandas/{id}` para R04/M6. La forma general sigue D-21–D-24, pero payloads, nombres de DTO, parámetros, flags y respuestas no están congelados. Los códigos generales y `{"detalle": "mensaje"}` sí están establecidos; su mapa preciso por operación y el protocolo de advertencias no lo están. No se incorpora un envelope nuevo, un 409 especial o un flag de confirmación por inferencia.

### Matriz de decisiones y trazabilidad

La matriz distingue decisiones locales operativas del stub de propuestas pendientes de equipo. A01/A02 son **Supuesto: adoptado para el stub por el usuario**, más fuertes que las HU originales; no acreditan reconciliación ni aceptación M5/M6. Cada pendiente limita congelación compartida, no exige implementar otros módulos para el fake sintético. Los enlaces conservan evidencia histórica y el anexo registra vigencia.

| ID / porción NO CONGELADA | Establecido / Pendiente de validación | Alternativas y Supuesto: recomendación razonada | Validación |
| --- | --- | --- | --- |
| [A01](exploration.md#a01--otra-abierta-en-la-misma-mesa): alta y conflicto | #52 CA02 exige advertencia, no bloqueo explícito. | Supuesto: adoptado para el stub por el usuario: bloquear otra creación sin inserción, informar y permitir consultar existente por listado de la misma Mesa y consulta por ID/referencia acordada. Supuesto: 409 común con detalle, sin envelope adicional. Continuación confirmada queda descartada para el stub. | Reconciliar HU con equipo/Federico/Héctor; Giuliano por mesa. |
| [A02](exploration.md#a02--cierre-con-entregas-pendientes): bloqueo de cierre | #58 CA03 exige advertir ANTES de confirmar, no bloqueo explícito. | Supuesto: adoptado para el stub por el usuario: cualquier producto pendiente impide cierre, sin mutar estado ni autoentregar. Advertir y ofrecer guía al consumidor hacia marcado de entregas; destino pendiente, sin pantalla/ruta/callback/payload nuevo. Fixture entregada sí cierra. Supuesto: 409 común. | Reconciliar HU con equipo/Héctor; validar destino de navegación, sin implementarlo. |
| [A03](exploration.md#a03--alta-desde-reserva-estados-y-atomicidad): reserva | #68/S2-02: activa del día, mesa heredada, productos positivos, vínculo y ATENDIDA. | Decisión local: al llegar clientes y atender el mozo, confirmar pedido válido crea ABIERTA vinculada y reserva ATENDIDA; no marcador vacío. Simulación inválida sin mutación. Orquestador/transacción reales pendientes; M5 es recomendación, no asignación aprobada. | Federico/Juan/Giuliano/Héctor por integración real y menús. |
| [A04](exploration.md#a04--interfaces-consumidas-y-alcance-del-stub): entrega | Arquitectura y convenios del proyecto; cuatro métodos obligatorios en el stub: crear/consultar/listar/cerrar. | Decisión local: DTO + fake interno mínimo válido; HTTP aislado opcional, no ambos obligatorios. Efectos M3/M5 sintéticos; no editar sus módulos ni registrar router productivo. Ampliaciones requieren alcance explícito. | Firmas/DTO y aceptación compartida M4/M5/M6/equipo pendientes. |
| [A05](exploration.md#a05--decimal-serialización-redondeo-y-snapshots): dinero | Decisión local: Decimal y precedente Productos; fecha descendente y desempate por ID. | Productos valida precio a dos decimales y serializa con f-string .2f, sin modo de redondeo explícito ni algoritmo global de descuentos encontrado. Supuesto: centavos sintéticos exactos y mismo formato; ID descendente candidato, no dirección decidida. ROUND_HALF_UP: propuesta histórica superada/no aprobada, no regla existente. | Fórmula, redondeo y snapshot compartido pendientes con Héctor/Franco/Joaquín; validar dirección del ID. |
| [A06](exploration.md#a06--estado-de-mesa-y-dependencia-de-salón): estados admitidos/efectos | LIBRE → OCUPADA está establecido; no está establecido liberar al cerrar/cobrar. Pendiente de validación: OCUPADA/FUERA_DE_SERVICIO, otras ABIERTAS, liberación y servicios M3. | Servicio M3 componible o simulación temporal; acceso directo a M3 prohibido por D-04. Supuesto: coordinar consulta/ocupación y simular mientras falten, sin liberación automática ni rechazo general de OCUPADA; proponer rechazo de FUERA_DE_SERVICIO para revisión. Evita inventar efectos o romper capas. | Juan/Giuliano; Federico/Héctor por flujo completo. |
| [A07](exploration.md#a07--listado-filtros-e-identificación): selección y respuesta | #55 fija mesa/estado/vacío; D-27 fija paginación. Número de mesa no es globalmente único en HU-M3-05. Pendiente de validación: identificador, parámetros, filtros combinados, defaults, orden y campos. | ID estable o número+sector; detalle completo o resumen+consulta. Supuesto: recomendar ID de mesa, conjunción, sin estado implícito, orden fechaHora/id descendente y resumen+detalle individual: selección inequívoca y menor carga. Para cero coincidencias, `items: []`, `total: 0`; página fuera de rango puede conservar total positivo. | Juan, Federico y Héctor. |
| [A08](exploration.md#a08--fallos-advertencias-repetición-y-paridad): errores/reintentos/paridad | D-25/D-26 fijan excepciones y formato; D-24 impide cerrar ya CERRADA. Pendiente de validación: mapa/prioridad de fallos, respuesta pública a CERRADA/ANULADA, timeout, repetición de alta y duplicación concurrente desde reserva. | Segundo cierre como éxito idempotente contradice D-24 sin cambio arquitectónico; rechazo y reconciliación preservan esa regla. Supuesto: recomendar conflicto de negocio, excepciones comunes y consulta tras timeout; avisos según A01/A02, no errores de éxito. No inventar claves de idempotencia ni códigos especiales. | Juan, Federico y Héctor. |
| [A09](exploration.md#a09--fechahora-y-significado-de-hoy): tiempo y elegibilidad diaria | Fecha/hora del sistema y reserva del día ya establecidas. Pendiente de validación: zona/reloj, ISO/offset, precisión y medianoche. | Hora local sin offset o timestamp con offset y día del restaurante. Supuesto: recomendar segunda alternativa y asignación por servidor para evitar discrepancias entre consumidores; no añadir campo de cierre, fecha editable ni configuración ahora. | Juan/Federico; Joaquín/Héctor por consistencia. |
| [A10](exploration.md#a10--forma-de-datos-mozo-y-ubicación-de-entidades): DTO y relaciones | Unificado: mesa/Mozo, reserva opcional, detalles XOR y observaciones opcionales; D-05 tiene lista compartida provisional. Pendiente de validación: origen del Mozo, obligatoriedad/nulos/omisiones, nombres, IDs/objetos, extras, observaciones, agrupación de repetidos y ubicación ORM/enums. | IDs y DTO explícito o objetos anidados; ORM M4 o shared coordinado. Supuesto: recomendar IDs de entrada y DTO separado de schemas/ORM para reducir acoplamiento; resolver origen del Mozo antes de exigir `mozo_id`. No inventar límites, campos personales ni ubicar ORM solo porque el DTO sea compartido. | Juan/Federico/Héctor; Giuliano por Mozo; equipo por shared/D-05. |

La spec existente identifica fuentes/Axx por operación. Los escenarios locales del stub siguen decisiones humanas registradas; las secciones compartidas abiertas no se convierten en requisitos normativos de equipo ni en expectativas finales por inferencia.

## Áreas afectadas y entregables futuros

En este mantenimiento solo se editan los seis documentos existentes. La tabla distingue su estado actual de ubicaciones futuras: DTO/fake/suite dentro del permiso restringido condicionado al presupuesto; demás rutas no concedidas por inferencia.

| Ruta | Impacto | Condición |
| --- | --- | --- |
| `openspec/changes/S2-01-contrato-comanda/proposal.md` | Existente | Mantenimiento documental autorizado. |
| `openspec/changes/S2-01-contrato-comanda/exploration.md` | Evidencia histórica existente | Anexo fechado autorizado, sin reescribir alternativas originales. |
| `openspec/changes/S2-01-contrato-comanda/specs/{comanda-contrato,comanda-stub-compartido}/spec.md`, `design.md`, `tasks.md` | Existentes | Mantenimiento de decisiones, sin relanzar fases. |
| `backend/app/shared/contratos/comanda.py` | DTO planificado | Coordinar M4/M5/M6 y autorizar shared; no ORM compartido por inferencia. |
| `backend/tests/shared/fakes/comanda.py`, `backend/tests/shared/test_contrato_comanda.py` | Fake/pruebas planificados | Validar consumo, estado, reinicio y escenarios comunes antes de implementar. |
| `backend/tests/stubs/comanda_http.py` | Stub HTTP opcional planificado | Solo si consumidores validan necesidad; aplicación local aislada, no producción. |
| `backend/app/modules/atencion/{router,service,repository,models,schemas}.py` | Implementación posterior | No sustituir esqueletos en esta tarea de planificación. |
| `backend/app/modules/{salon,reservas,pagos}/service.py` | Dependencias por coordinar | Giuliano, Federico y Héctor; sin ediciones ajenas. |
| `backend/app/modules/{productos,menus}/service.py` | Proveedores de snapshots por acordar | Franco/Joaquín; sin implementar sus algoritmos. |
| `backend/app/shared/models/enums.py`, `backend/app/shared/excepciones.py`, `backend/app/shared/paginacion.py` | Referencias comunes | Reutilizar contratos existentes; cualquier ampliación requiere coordinación. |
| `backend/app/main.py`, `backend/alembic/env.py`, `backend/alembic/versions/` | Solo implementación productiva futura | Registro/migraciones fuera de esta autorización; no necesarios para redactar contrato. |
| `frontend/src/shared/types/comanda.ts` | Posible tipo futuro | Solo si se acuerda consumidor HTTP; no frontend ahora. |
| `SPRINT-2/S2-01-contrato-comanda.md` | Publicación futura planificada | Requiere revisión del contrato y autorización fuera de esta carpeta. |

### Pruebas de contrato previstas, no ejecutadas

Preparar en futuro RED → GREEN escenarios locales del fake: alta válida; detalle vacío/XOR/cantidad inválida; otra ABIERTA informa conflicto sin insertar y permite consulta; listado filtrado/vacío/paginado, fecha DESC y desempate ID (Supuesto: DESC); pendientes advierten y bloquean sin mutación/autoentrega, con guía documental de navegación; fixture entregada permite cierre; segundo cierre rechazado; reserva activa de hoy al confirmar pedido queda vinculada/ATENDIDA y pedido inválido no muta; Decimal con centavos exactos y formato Productos. Casos de equipo todavía abiertos (fórmula, redondeo, medianoche, integración concurrente real) no son expectativas finales aprobadas.

**Pendiente de validación compartida:** concretar resultados aún abiertos, sin bloquear los casos locales ya decididos del fake. Sus pruebas acreditarán simulación, no rollback SQLite ni servicios M3/M5 disponibles. La implementación posterior seguirá strict TDD e integración real separada; aquí no se escribieron ni ejecutaron pruebas.

## Dependencias y secuencia de autorización

- No hay dependencia declarada en #162 que impida la propuesta. Las HU relacionadas siguen abiertas; no se presume su implementación o aprobación.
- Juan revisa el contrato con Federico y Héctor; Giuliano valida mesa/Mozo y composición de servicios; Franco/Joaquín validan procedencia de snapshots. D-05 requiere acuerdo de equipo antes de ubicar entidades compartidas.
- Se puede especificar lo respaldado y dejar borradores abiertos. Congelar las porciones compartidas requiere resolver A01–A10 aplicables y registrar decisiones, con ejemplos y efectos observables coherentes.
- Autorización local de futuro apply restringido registrada; aceptación M5/M6 y congelación compartida siguen pendientes, sin fingir aprobación. Las decisiones locales permiten un fake provisional sintético, no integración real. Antes de apply sigue pendiente la excepción de tamaño y cualquier consentimiento nativo de edición; permisos de módulos ajenos no se conceden.
- Preflight vigente: automático/OpenSpec/`single-pr`, control general de **400 adiciones + eliminaciones**, incluidos documentos, y sin encadenamiento. El equipo mantiene puntos de revisión independientes de **800 en backend y 800 en frontend**, no una franquicia de 1600 ni bloqueo/división de HU. El esquema activo no ofrece selector de presupuesto ni entrada por lado; el seguimiento 800/800 es documental/manual y no reconfigura el runtime. Para single-pr >400 sigue pendiente `size:exception` explícita de mantenedor antes de apply, además del permiso humano. Véase [política y medición en tareas](tasks.md#política-de-revisión-dos-controles-independientes). No hay autorización de commit/push/PR.

## Riesgos y mitigación prevista

No se asignan probabilidades; su estimación corresponde al equipo.

| Riesgo | Consecuencia | Mitigación / límite actual |
| --- | --- | --- |
| Confundir propuesta con contrato congelado | M5/M6 integran contra DTO o advertencias no aprobados. | Etiquetas Supuesto:/Pendiente de validación y Axx persistentes; revisión explícita antes de implementar. |
| Advertencias convertidas en prohibiciones o permisos incondicionales | Se altera #52/#58 o se ejecutan efectos antes de decidir. | Resolver A01/A02 con consumidores; preservar advertencia previa y no afirmar continuación ya acordada. |
| Commits independientes o dependencia circular M3/M4/M5 | Reserva/comanda/mesa inconsistentes tras fallo o reintento. | A03/A06: acordar orquestador y efectos atómicos; fake no acredita integración real. |
| Dinero/snapshots divergentes | Facturación posterior distinta del pedido original. | A05: ejemplos M4/M6 y proveedores; no adoptar float, redondeo o recálculo tácitamente. |
| Fake insuficiente para uso manual o divergente del HTTP/productivo | R04 permanece y las pruebas dan falsa confianza. | Validar A04, ejecución, escenarios de paridad y límites simulados; no declarar mitigación completa. |
| Ampliar alcance o escribir en shared/módulos ajenos | Acoplamiento y cambios sin coordinación (R08/R09). | Mantener S2-01 preparatorio y rutas solo planificadas; autorización por responsable. |
| Confundir controles de revisión o resolverlos sin consulta | Revisión difícil o incumplimiento de la estrategia recibida. | Contadores 800/800 independientes como puntos de revisión del equipo y pronóstico general contra 400 del flujo; un solo PR, excepción explícita pendiente y sin cambios de configuración. |

## Plan de reversión

- Esta fase no cambia base de datos, API ni datos: si se descarta la propuesta, retirar únicamente este `proposal.md` nuevo o corregir sus secciones, preservando la exploración y todo trabajo preexistente. No ejecutar limpieza global del árbol.
- Si un borrador posterior cambia, registrar las decisiones y avisar a consumidores antes de publicar otra versión; no presentar un contrato descartado como congelado.
- **Supuesto:** para una futura entrega de stub, mantenerlo aislado para retirar solo DTO/doble/pruebas autorizados y restaurar la selección de proveedor del consumidor por coordinación. No habrá migración productiva que revertir en ese entregable si se mantiene este alcance. Cualquier implementación con esquema requerirá su propio plan Alembic revisado.

## Criterios de éxito y límites de preparación

### Evidencia completada de la fase documental original (histórica)

- [x] Solo se crea y relee `proposal.md`; se conserva el nombre aprobado, la exploración y el alcance de planificación.
- [x] Se identifican fuentes, capacidades nuevas, no objetivos, áreas futuras, dependencias, riesgos y reversión.
- [x] A01–A10 mantienen ID, evidencia, pendientes, alternativas, recomendación provisional y responsables; lo no decidido permanece NO CONGELADO.
- [x] Se distingue contrato, stub y pruebas futuros de una implementación disponible; R04 no se declara resuelto.

### Condiciones futuras, todavía no satisfechas

- [ ] Spec revisada por personas, decisiones compartidas registradas y secciones críticas resueltas; contrato efectivamente congelado por los responsables.
- [ ] M5/M6 validan firmas/DTO, superficies, ejecución y alcance simulado del stub; coordinación M3/M1/M2/shared cuando corresponda.
- [ ] Presupuesto de revisión atendido y consentimiento nativo aplicable antes de ejecutar el futuro apply restringido ya autorizado localmente; sin aceptación de consumidores presumida.
- [ ] Stub entregado y utilizable, pruebas de contrato ejecutadas con evidencia y límites de integración documentados; publicación autorizada. Solo entonces evaluar la mitigación real de R04.

**Siguiente acción recomendada:** el orquestador debe solicitar `size:exception` explícita de mantenedor para single-pr >400 antes de apply restringido. No repetir fases completadas ni ejecutar implementación desde este mantenimiento.
