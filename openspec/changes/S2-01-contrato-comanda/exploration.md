## Exploration: S2-01-contrato-comanda

> **Actualización de autoridad (2026-10-29):** tras este historial, el usuario aceptó expresamente `size:exception` para este cambio y el padre confirmó el preflight nativo. Se autoriza apply limitado a contrato documental (incluido `SPRINT-2/S2-01-contrato-comanda.md`), DTO, fake y pruebas, sin HTTP, producto real, módulos ajenos o entrega Git/GitHub. Las menciones históricas a excepción/publicación pendientes quedan sustituidas por esta nota; A01–A10 y sus evidencias se conservan. No hay aceptación de M5/M6. Véase [apply-progress.md](apply-progress.md): línea base incompleta por dos timeouts; no se escribió comportamiento ni se reintentó planificación/setup.

**Resultado:** exploración completada; contrato todavía no aprobado ni congelado. Es posible preparar la propuesta con los requisitos independientes ya respaldados. Las ambigüedades A01–A10 impiden congelar las partes indicadas, no continuar su análisis.

**Alcance autorizado en la fase original:** únicamente este archivo. Sin implementación, cambios en otros módulos, configuración, documentos de sprint, pruebas ejecutadas ni operaciones remotas. Responsable de S2-01: Juan Ignacio Riquelme (M4). Rama comprobada: `feature/S2-01-contrato-comanda`, inicialmente limpia. Preflight recibido: automático, OpenSpec, un solo PR y punto de revisión de 400 líneas cambiadas; no se seleccionó encadenamiento. Los controles nativos siguen siendo la autoridad del flujo; este informe no habilita fases ni implementación.

**Nota de mantenimiento (2026-10-29):** todos los artefactos de planificación ya existen; el cuerpo original conserva hechos, alternativas y recomendaciones históricas, no instrucciones ejecutables vigentes. El siguiente anexo registra las decisiones posteriores; solo se reparan seis documentos existentes, sin implementación. Los controles independientes 800/800 del equipo y 400 general del flujo se detallan en [tareas](tasks.md#política-de-revisión-dos-controles-independientes), sin reconfiguración del runtime.

### Anexo de decisiones del usuario — 2026-10-29

**Vigencia:** este anexo sustituye las recomendaciones históricas incompatibles de A01–A05, no reescribe las HU ni acredita aceptación de M5/M6. El contrato de equipo sigue **NO CONGELADO**. La persona autoriza un futuro apply restringido a documentación de contrato, DTO compartido, stub y pruebas; no Comanda real, pantallas, otras HU, módulos ajenos, router productivo, commits, push ni PR. Esa autorización queda condicionada al control general de tamaño y al consentimiento de edición nativo que corresponda: **no hay `size:exception` concedida**. Esta ejecución es solo mantenimiento documental.

| Decisión | Comportamiento provisional vigente para el stub | Límite y validación pendiente |
| --- | --- | --- |
| A01 | **Supuesto: adoptado operativamente para el stub por el usuario.** Otra ABIERTA en la mesa bloquea crear, informa el conflicto y permite consultar la existente mediante listado filtrado por la misma Mesa y consulta de su ID o referencia acordada. | #52 CA02 exige advertencia, no bloqueo explícito. Reconciliar HU con equipo/M5/M6; no declarar unicidad productiva aprobada. Supuesto: conflicto 409 con `{"detalle":"mensaje"}`, sin envelope nuevo. |
| A02 | **Supuesto: adoptado operativamente para el stub por el usuario.** Cualquier producto pendiente de entrega bloquea cerrar; advertir y ofrecer orientación para ir al marcado de entregas. No cambia estado ni autoentrega. Fixture entregada permite cierre válido. | #58 CA03 exige aviso antes de confirmar, no prohibición explícita. Reconciliar con equipo/M6. Supuesto: 409 común; navegación solo como guía documental al consumidor, destino pendiente de validación, sin ruta, pantalla, callback ni payload nuevo. |
| A03 | Al llegar los clientes y atender el mozo la reserva, confirmar el pedido válido crea ABIERTA vinculada y reserva ATENDIDA. Mantener activa de hoy, mesa heredada y productos con cantidades positivas; no crear una comanda vacía como marcador de reserva. | M5/mesa son simulaciones; inválidos no mutan el estado. Dueño transaccional, proveedores y atomicidad reales siguen pendientes, no asignados a M5 por esta decisión. |
| A04 | Respetar arquitectura/interfaces/convenios del proyecto; implementar en el futuro stub **crear, consultar, listar y cerrar**. DTO y fake interno de pruebas constituyen el mínimo válido; HTTP aislado es opcional, no se exigen ambos. | «FastAPI si corresponde» no obliga HTTP. Firmas/aceptación compartida pendientes; no editar otros módulos ni router productivo. Toda ampliación futura requiere alcance explícito. |
| A05 | Usar Decimal y seguir el precedente de formato monetario de Productos. Ordenar fecha descendente y desempatar por ID. **Supuesto:** ID descendente como candidato, dirección no especificada por el usuario. | Fórmula de descuentos, modo/momento de redondeo y snapshots compartidos pendientes con M6/M1/M2. ROUND_HALF_UP queda como propuesta histórica superada, no aprobada ni encontrada en Productos. |

**Evidencia monetaria comprobada:** `backend/app/modules/productos/schemas.py:153` limita precio Decimal a `gt=0`, `max_digits=10`, `decimal_places=2`; líneas 108–110, 225–227 y 240–242 serializan con `f"{precio:.2f}"`. La búsqueda `quantize|ROUND_|\bround\(` en el módulo no encontró coincidencias. Formato de salida y contexto decimal no equivalen a una regla explícita de redondeo de negocio ni a un algoritmo global de descuentos. **Supuesto:** el stub usa importes sintéticos de centavos exactos y ese formato, sin decidir redondeo fraccional ni fórmula M6. No se ejecutó ninguna prueba ni sonda de formato.

A06–A10 siguen pendientes, excepto fecha descendente y desempate indicados arriba: no se aceptan tácitamente origen de Mozo, zona, nuevos campos, FUERA_DE_SERVICIO o protocolo de errores. Estos acuerdos de equipo y la brecha M1 categoría+ID limitan la integración real, no obligan a implementarla para construir un fake sintético provisional. Los escenarios de continuación de A01 y cierre confirmado con pendientes de A02 que siguen abajo son **alternativas históricas descartadas para el stub**, no tareas vigentes.

### Current State

#### Fuentes y requisitos establecidos

Se reutiliza la lectura completa de issues y comentarios realizada por el padre en esta sesión: los cinco issues están abiertos, sin comentarios; #162 no declara dependencias. No se repitieron llamadas a GitHub. Se contrastaron las afirmaciones locales con los archivos actuales.

| Fuente | Qué establece para esta exploración |
| --- | --- |
| [S2-01 #162](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/162) | Congelar campos de Comanda: mesa, reserva opcional, detalle, observaciones, estado y fecha/hora; estados Abierta/Cerrada/Anulada; crear, listar y cerrar; stub compartido para M5/M6. |
| [HU-M4-04 #52](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/52) | Al menos un detalle; producto **o** menú ejecutivo; cantidad entera estricta mayor que cero; conservar precio, promoción y descuento al pedir; fecha/hora del sistema y estado ABIERTA. Mesa libre pasa a ocupada. Otra ABIERTA exige advertencia, no una prohibición absoluta. Sin cliente propio: solo el de la reserva de origen opcional. |
| [HU-M4-07 #55](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/55) | Listar con mesa y estado; filtrar por mesa y estado; contemplar resultado vacío. |
| [HU-M4-09 #58](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/58) | Cerrar una ABIERTA con productos la deja CERRADA, sin más incorporación de productos y lista para facturar. Si hay entregas pendientes, advertir **antes de confirmar**: no es un bloqueo permanente. No implica emitir factura ni registrar pago. |
| [HU-M5-06 #68](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/68) | Crear desde reserva activa del día, con al menos un producto y cantidades enteras positivas. La mesa procede de la reserva, no de entrada independiente; vincularla y pasarla a ATENDIDA. Cancelada o atendida no permite crear; otra fecha provoca aviso. |
| `SPRINT-0/S0-10-riesgos.md`, R04, líneas 103–115 | Contrato y stub para no bloquear Reservas, Pagos y reportes; prioriza crear, cerrar y **consultar**. El diagrama no especifica por sí solo rutas ni schemas HTTP completos. |
| `SPRINT-0/Plan-de-trabajo-Sprint.md`, líneas 243–271 | S2-01 sin dependencia; contrato y stub preceden a la implementación de Comanda. Cierre del sprint: crear, **listar** y cerrar. No equivale a implementar M5/M6 anticipadamente. |
| `SPRINT-2/S2-02-supuestos-y-fecha.md`, supuesto 4 | La interpretación de reserva activa del día, mesa heredada, ATENDIDA y aviso por otra fecha **ya está adoptada por el equipo**. No es una invención ni una nueva decisión de esta exploración. |

`AGENTS.md` da prioridad al issue para HU/tareas y al plan para alcance/fechas. Las discrepancias se exponen, no se corrigen en las fuentes durante esta fase.

#### Diagramas: coincidencias y discrepancias

Se leyó el XML sin comprimir de ambos archivos en `SPRINT-0/`:

- `G3 - Diagrama de clases unificado.drawio`: `Comanda` tiene `id`, `fechaHora`, `/turno` opcional derivado, `observaciones` opcionales y `EstadoComanda = ABIERTA`; enum ABIERTA/CERRADA/ANULADA. `DetalleComanda` tiene `id`, `cantidad > 0`, `precioUnitario: Decimal` copiado al pedir, `descuento: Decimal = 0` calculado al pedir y `estadoEntrega = PENDIENTE`; XOR producto/menú ejecutivo y promoción opcional. Una comanda contiene 1..* detalles; mesa y mozo atienden múltiples comandas; reserva y comanda tienen vínculo opcional 0..1; factura es opcional para una comanda. `DetalleFactura` expresa subtotal como cantidad × precio − descuento.
- `G3 - Diagramas por modulo.drawio`, página M4: precio `float`, estados abierta/inactiva/cerrada, relación directa con Cliente y cardinalidad mesa/comanda 1:1. Difiere del unificado y de los issues actuales.
- Los issues establecen los estados y ausencia de cliente propio; no corresponde conservar `inactiva` ni agregar `cliente_id`. La cardinalidad histórica del unificado no decide cuántas ABIERTAS simultáneas se permiten (A01). El conflicto monetario se registra en A05; no se modifica ningún diagrama.
- No se agregan datos personales, fecha/hora de cierre, zona horaria como campo nuevo ni turno como entrada obligatoria. La relación con Mozo y el formato de fecha/hora requieren precisión (A09/A10), no campos inventados.

#### Evidencia del código y restricciones vigentes

- `backend/app/modules/atencion/{router,service,repository,models,schemas}.py`: solo docstrings; no existe implementación pública de Comanda. M5 (`reservas/`) y M6 (`pagos/`) también son esqueletos en las cinco capas.
- `backend/app/modules/salon/service.py`: expone `crear_sector`, `crear_mesa`, `listar_sectores`. No ofrece consulta pública de mesa por ID, ocupar/liberar mesa ni operaciones de mozo. Sus altas confirman transacciones con `db.commit()`; no existe hoy una operación componible para el flujo reserva → comanda → mesa.
- `backend/app/main.py`: registra routers de Productos y Salón, no Atención, Reservas ni Pagos. Un fake de pruebas no vuelve accesibles rutas de Comanda en `/docs`.
- `backend/app/shared/models/enums.py`: solo `Estado`, `EstadoMesa`, `Categoria`; no contiene `EstadoComanda`, `EstadoEntrega` ni `EstadoReserva`. No confundir el estado habilitado/deshabilitado con el ciclo de Comanda.
- D-04, sección 3.3 de arquitectura y `backend/pyproject.toml`, líneas 47–186: entre módulos solo se importa `service`, nunca schemas, models, repository o router ajenos. DTO compartido y entidad persistente compartida son decisiones distintas. D-05 menciona Comanda en `shared/models/`, pero la sección 8 declara provisional esa lista.
- D-10 y `SPRINT-1/S1-03-estandares-backend.md`: transacciones cortas en servicios, consultas en repositorios; servicios sin FastAPI. Excepciones existentes: `NoEncontradoError`, `ReglaDeNegocioError`, `DatosInvalidosError`, traducidas globalmente a 404/409/422 y `{"detalle": "mensaje"}`. No existe protocolo común de advertencia confirmable.
- D-21–D-27: REST JSON `/api/v1`, creación 201, consulta/modificación 200 y cierre como acción POST. `shared/paginacion.py` ya define `Pagina` con `items,total,limit,offset`, límite por defecto 50, máximo 100 y offset por defecto 0.
- `openspec/specs/` contiene contratos de carta/productos/secciones, no de Comanda. Los cambios `HU-M3-01` y `HU-M3-05` documentan altas de sector/mesa, no las operaciones intermodulares faltantes. No se encontró archivo de prueba con nombre relativo a Comanda mediante búsqueda `backend/tests/**/*comanda*`; esto no prueba por sí solo ausencia de toda referencia en pruebas.
- Precedente monetario concreto: `productos/schemas.py`, `ProductoListado`, conserva `Decimal` y serializa el precio con dos decimales como cadena; `openspec/specs/carta-productos/spec.md` también documenta esa representación. No fija automáticamente el redondeo de descuentos de M4/M6.

### Affected Areas

Ninguna ruta siguiente se modifica en esta fase, salvo el artefacto autorizado.

| Estado | Ruta | Afectación futura o coordinación |
| --- | --- | --- |
| Nuevo, creado en esta fase | `openspec/changes/S2-01-contrato-comanda/exploration.md` | Evidencia, alternativas y pendientes. |
| Planificado, no creado | `openspec/changes/S2-01-contrato-comanda/{proposal.md,specs/,design.md,tasks.md}` | Fases posteriores, solo por lanzamiento del orquestador. |
| Planificado, no creado | `SPRINT-2/S2-01-contrato-comanda.md` | Posible publicación del contrato; requiere autorización fuera del alcance actual. |
| Existentes | `backend/app/modules/atencion/{router,service,repository,models,schemas}.py` | Futuro contrato y adaptadores de M4, no implementación de las HU ahora. |
| Existentes | `backend/app/modules/{salon,reservas,pagos}/service.py` | Coordinar operaciones y consumidores con Giuliano, Federico y Héctor; no editar módulos ajenos. |
| Existentes | `backend/app/shared/models/enums.py`, `shared/excepciones.py`, `shared/paginacion.py` | Reutilización; posibles enums nuevos solo con coordinación, sin cambiar los contratos existentes. |
| Planificado, no creado | `backend/app/shared/contratos/comanda.py` | Supuesto: DTO intermodular común separado de ORM y de schemas internos; requiere aprobación del equipo y coordinación M4/M5/M6. |
| Planificados, no creados | `backend/tests/shared/fakes/comanda.py`, `backend/tests/shared/test_contrato_comanda.py` | Supuesto: fake con estado y escenarios compartidos de contrato; coordinar con M5/M6 antes de escribir. |
| Planificado, no creado | `backend/tests/stubs/comanda_http.py` | Supuesto: aplicación HTTP local de prueba independiente, si se acuerda uso manual; no registrar el stub en producción. |
| Existentes / planificados | `backend/app/main.py`, `backend/alembic/env.py` / futuras migraciones en `backend/alembic/versions/` | Solo una implementación posterior necesitaría registrar router/modelos y migrar; fuera de esta autorización. |
| Existentes / planificados | `backend/app/modules/{productos,menus}/service.py` / futuro `frontend/src/shared/types/comanda.ts` | Coordinar snapshots con M1/M2 y tipos de consumidores si se acuerdan; no implementar algoritmos ajenos ni imponer un archivo compartido ahora. |

### Approaches

1. **DTO compartido y fake de servicio para pruebas** — Supuesto: contrato tipado en `shared/contratos/comanda.py` y fake en `tests/shared/fakes/comanda.py`, consumido mediante el punto de servicio acordado, sin importar schemas internos de M4.
   - Ventajas: bajo acoplamiento, pruebas rápidas, compatible con D-04 y útil para M5/M6 en el mismo backend.
   - Costos: no ofrece HTTP real ni uso manual del frontend; DTO sin fake ejecutable no reproduce estados, advertencias ni efectos. Necesita escenarios de paridad con la implementación futura.
   - Esfuerzo: bajo a medio, una vez resueltas las semánticas compartidas.

2. **Stub HTTP local ejecutable con el mismo contrato** — Supuesto: aplicación independiente en `tests/stubs/comanda_http.py`, reutilizando DTO y comportamiento acordados.
   - Ventajas: permite pruebas manuales y de clientes HTTP sin esperar a M4; hace visibles rutas, serialización y códigos.
   - Costos: mayor mantenimiento; puede divergir si duplica lógica. No resuelve por sí solo la integración interna de servicios M5/M6 ni demuestra atomicidad real. No equivale a implementar la aplicación de producción.
   - Esfuerzo: medio; requiere acordar arranque local, aislamiento, reinicio de datos y consumidor objetivo.

No son opciones necesariamente excluyentes. Supuesto: compartir escenarios de contrato y estado del fake entre ambos reduce divergencias; la elección de entregables depende de A04 y de autorización posterior.

#### Registro priorizado de ambigüedades

**Clasificación:** «bloqueante de contrato» significa que la porción señalada no puede declararse congelada; «coordinación» impide prometer disponibilidad real de una dependencia; «diseño interno» permite especificar el comportamiento sin fijar todavía la técnica. Todas las recomendaciones siguientes son **Supuesto:**, no requisitos ni decisiones aceptadas.

##### A01 — Otra ABIERTA en la misma mesa

- **Establecido:** #52 pide advertir; el unificado admite historial de múltiples comandas por mesa. No hay fundamento para imponer unicidad absoluta de ABIERTA.
- **Pendiente de validación:** si la advertencia basta o requiere confirmación explícita; cómo se comunica por servicio/HTTP; qué ocurre si aparece otra ABIERTA entre consulta y alta, y cómo M5 identifica la comanda correcta.
- **Alternativas:** aviso informativo y creación inmediata (simple, puede duplicar accidentalmente); confirmación antes de crear (mayor control, exige intercambio y revalidación); prohibición total (no compatible con la HU actual sin cambiar alcance).
- **Supuesto:** recomendar advertencia confirmable y permitir continuar, revalidando al escribir. Justificación: conserva el carácter no prohibitivo y evita una creación inadvertida. No se fija nombre de flag, endpoint, token ni código para el aviso.
- **Afectados:** alta M4/M5, filtros/selección por mesa de M6; nunca asumir que mesa identifica una única comanda. **Bloqueante de contrato:** alta y advertencias. **Validación:** Juan con Federico y Héctor; coordinar estado de mesa con Giuliano.

##### A02 — Cierre con entregas pendientes

- **Establecido:** #58 requiere advertir antes de confirmar; al cerrar se pasa a CERRADA y se habilita facturación, sin factura/cobro implícitos. Cerrar no es marcar todos los detalles como entregados.
- **Pendiente de validación:** responsable de presentar/confirmar el aviso, intercambio HTTP/servicio, revalidación entre aviso y confirmación y resultado de un cierre repetido.
- **Alternativas:** consultar pendientes y confirmar en UI antes de POST (simple, posible información desactualizada); confirmación coordinada con servicio y revalidación (más consistente, más contrato); prohibir hasta entregar todo (contradice el comportamiento solicitado).
- **Supuesto:** recomendar confirmación explícita con revalidación del servicio, permitiendo cerrar aun con pendientes confirmados y conservando sus estados. No se adopta un parámetro `confirmar_*`, un 409 especial ni un envelope nuevo.
- **Afectados:** cierre M4 y lectura/facturación M6; el stub debe representar el camino confirmado, no bloquearlo permanentemente. **Bloqueante de contrato:** protocolo y repetición del cierre. **Validación:** Juan y Héctor.

##### A03 — Alta desde reserva, estados y atomicidad

- **Establecido:** #68 y S2-02 adoptan reserva activa del día, mesa heredada, vínculo y ATENDIDA; no cancelada ni atendida. #68 exige al menos un producto. #52 admite producto o menú ejecutivo en el alta general.
- **Pendiente de validación:** servicio que orquesta, quién confirma la transacción, contrato de M5 para validar/atender, efecto de fallo parcial/reintento/concurrencia; tratamiento técnico del aviso por otra fecha y de menús ejecutivos en este flujo específico.
- **Alternativas:** M5 orquesta e invoca M4 (propiedad natural del caso reserva, necesita composición transaccional); M4 orquesta e invoca M5 (centraliza altas, riesgo de dependencia circular si M5 también lo llama); commits independientes (simple, puede dejar reserva atendida sin comanda o viceversa).
- **Supuesto:** recomendar orquestación única del caso de uso en M5, núcleo de alta M4 reutilizable y una unidad atómica para comanda, detalle, vínculo, ATENDIDA y ocupación de mesa. D-10 respalda transacciones en servicios, pero no define este protocolo: sesión compartida y operaciones sin commit interno requieren diseño y acuerdo, no copiar los commits de las altas de Salón.
- **Supuesto:** mantener como precondición activa del día y avisar sin crear ante fecha distinta, sin agregar una excepción para continuar fuera de fecha; confirmar esa lectura de #68/S2-02. No extender silenciosamente el flujo a menú ejecutivo sin validar su alcance.
- **Afectados:** M5/M4/M3, estado consultable por M6. **Bloqueante de contrato:** entradas, efectos y resultado de fallo/reintento; **diseño interno:** técnica de atomicidad luego del acuerdo observable. **Validación:** Federico y Juan, con Giuliano para mesa y Héctor para consistencia consumida.

##### A04 — Interfaces consumidas y alcance del stub

- **Establecido:** #162/plan piden crear/listar/cerrar y stub M5/M6; R04 agrega consultar. D-04 permite consumo interno por `service`, no imports de schemas de Atención; el frontend usa HTTP. No hay interfaces M5/M6 implementadas que permitan inferir firmas definitivas.
- **Pendiente de validación:** consumidores automáticos/manuales, firmas y DTO de entrada/salida, consulta por ID con detalle completo, listado resumido o completo, nombres de rutas/parámetros, instalación del doble y alcance simulado de efectos M3/M5. La necesidad de consulta de M6 no autoriza agregar funcionalidad de facturación.
- **Alternativas:** DTO+fake cubre integración interna automatizada con menor costo; stub HTTP ejecutable cubre clientes/manuales con más mantenimiento; ambos cubren las dos superficies, pero requieren paridad.
- **Supuesto:** recomendar servicio público de M4 para consumo interno, DTO en ubicación compartida coordinada y fake con estado; añadir stub HTTP local si M5/M6 necesitan uso manual, no declarar que test-only satisface ese objetivo. Proponer `POST /api/v1/comandas`, `GET /api/v1/comandas`, `POST /api/v1/comandas/{id}/cerrar`; proponer `GET /api/v1/comandas/{id}` para R04/M6. Las tres primeras siguen la guía arquitectónica; la consulta individual y sus datos requieren validar alcance.
- **Supuesto:** limitar el doble a datos sintéticos, crear/listar/consultar/cerrar y casos acordados de advertencia/error; representar efectos de reserva/mesa solo como simulación explícita, sin escribir módulos ajenos ni afirmar integración real. No cubrir facturar, cobrar, anular o reabrir por el solo hecho de existir esos estados/métodos en el diagrama.
- **Afectados:** M5 crea desde reserva; M6 identifica y consulta la comanda y sus snapshots para facturar; M4 mantiene ambas superficies. **Bloqueante de contrato:** firmas, payloads, consulta y entrega del stub. **Validación:** Juan, Federico y Héctor; autorización del equipo para nuevas rutas compartidas antes de escribirlas.

##### A05 — Decimal, serialización, redondeo y snapshots

- **Establecido:** #52 conserva precio/promoción/descuento al pedir; unificado usa Decimal, descuento calculado al pedir y promoción opcional; modular usa float. M1 serializa importes con cadenas de dos decimales. La fórmula explícita de DetalleFactura usa descuento monetario por línea, no necesariamente porcentaje.
- **Pendiente de validación:** representación común M4/M6, precisión y escala, modo/momento de redondeo, descuento por unidad o por línea, subtotal/total y datos exactos de promoción que se conservan frente a cambios posteriores. El precedente M1 no resuelve esos puntos.
- **Alternativas:** Decimal interno y cadena decimal en HTTP (consistente y evita float, requiere conversión de clientes); números JSON con política numérica acordada (cómodos, riesgo de pérdida de precisión); centavos enteros (exactos, cambia representación respecto de M1). Redondear cada línea o al final puede producir totales distintos.
- **Supuesto:** recomendar Decimal y cadenas con dos decimales al serializar; descuento como importe de línea y subtotal cantidad × precioUnitario − descuento; proponer redondeo explícito a centavos por línea con `ROUND_HALF_UP` y total como suma de subtotales. Es una propuesta pendiente de ejemplos acordados con M6, no un algoritmo monetario aprobado.
- **Supuesto:** recomendar que M4 capture desde servicios M1/M2 el precio y resultado de promoción/descuento al pedir, sin aceptar importes arbitrarios del cliente y sin recalcular desde catálogo al cerrar/facturar. Acordar la información mínima de promoción que preserva el snapshot; solo su ID podría no conservar condiciones históricas. No implementar selección/superposición de promociones ni algoritmos M1/M2.
- **Afectados:** DTO M4/M5/M6, facturación y reportes; M1/M2 como proveedores. **Bloqueante de contrato:** tipos, snapshot y cálculo observable. **Validación:** Juan y Héctor, con Franco y Joaquín para procedencia de valores; señalar al equipo la discrepancia entre diagramas.

##### A06 — Estado de mesa y dependencia de Salón

- **Establecido:** #52 cambia LIBRE → OCUPADA; M3 tiene enum LIBRE/OCUPADA/FUERA_DE_SERVICIO, pero no servicios de consulta u ocupación. #58 no establece liberar al cerrar ni cobrar.
- **Pendiente de validación:** comportamiento de alta sobre OCUPADA o FUERA_DE_SERVICIO, servicio público disponible, vínculo con otras ABIERTAS y momento de liberar mesa.
- **Alternativas:** coordinar servicios M3 componibles (respeta capas, requiere trabajo de su responsable); simularlos en pruebas (desbloquea desarrollo, no integración real); acceder directamente al repositorio/modelo M3 (prohibido por D-04).
- **Supuesto:** recomendar coordinar consulta/ocupación con Giuliano y simularlas explícitamente mientras faltan. No liberar automáticamente al cerrar ni asumir rechazo de toda mesa ocupada; proponer rechazo de FUERA_DE_SERVICIO para validación, sin convertirlo en requisito confirmado.
- **Afectados:** alta M4/M5 y selección M6. **Bloqueante de contrato:** estados admitidos/efectos; **coordinación:** servicios M3 reales. **Validación:** Juan y Giuliano, con Federico y Héctor para liberación ligada al flujo completo.

##### A07 — Listado, filtros e identificación

- **Establecido:** #55 requiere mesa/estado y vacío; D-27 ya fija paginación. `HU-M3-05` permite el mismo número de mesa en distintos sectores: número no identifica una mesa globalmente.
- **Pendiente de validación:** ID frente a número/sector en filtro, nombres del parámetro, valores por defecto, combinación de filtros, orden estable, campos de resumen y necesidad del detalle en consulta individual.
- **Alternativas:** filtrar por ID estable (inequívoco, necesita seleccionar mesa); número+sector (más humano, más parámetros); listado completo con detalles (menos consultas, más carga) frente a resumen más consulta individual (más liviano, otra operación).
- **Supuesto:** recomendar filtro por ID de mesa, filtros combinables por conjunción, sin filtro de estado implícito, orden estable por fechaHora e id descendentes y lista resumida más consulta con detalles para M6. Recomendar vacío como `items: []` y `total: 0` para cero coincidencias; una página fuera de rango puede tener items vacíos y total mayor que cero. Nombres y campos finales pendientes.
- **Afectados:** M4/M5/M6 y stub. **Bloqueante de contrato:** selección/filtros/respuestas; no impide reutilizar la paginación existente. **Validación:** Juan con Federico y Héctor.

##### A08 — Fallos, advertencias, repetición y paridad

- **Establecido:** D-25/D-26 y código compartido fijan errores 404/409/422 con `detalle`; no fijan mecanismo de advertencia. Anulada existe como estado, no como autorización para implementar anulación en S2-01.
- **Pendiente de validación:** mapa por operación, orden cuando coinciden fallos, respuesta a cerrar CERRADA/ANULADA, repetición de alta y reintentos del flujo de reserva; cómo diferenciar un aviso de un rechazo sin romper el formato común.
- **Alternativas:** repetir cierre devuelve resultado actual (facilita reintentos, puede ocultar uso incorrecto) o conflicto (más explícito, consumidor reconcilia); consulta previa para avisos o resultado confirmable acordado (mismos tradeoffs A01/A02). No hay autorización para imponer un nuevo esquema de error, claves de idempotencia ni códigos especiales.
- **Supuesto:** recomendar preservar las excepciones comunes, no reutilizar `detalle` como error de éxito; proponer conflicto de negocio para cerrar una no ABIERTA y documentar reconciliación tras timeout. El mecanismo final de avisos se acuerda en A01/A02; para altas desde reserva, acordar prevención de duplicación concurrente sin inventar un protocolo HTTP definitivo.
- **Afectados:** manejo de errores y pruebas de M5/M6, doble y producción. **Bloqueante de contrato:** fallos/repetición/avisos observables; **diseño interno:** mecanismo de concurrencia. **Validación:** Juan, Federico y Héctor.

##### A09 — Fecha/hora y significado de «hoy»

- **Establecido:** #52 usa fecha/hora del sistema; unificado tiene `fechaHora` y turno derivado; #68/S2-02 vinculan creación al día de reserva.
- **Pendiente de validación:** reloj/zona del restaurante, representación ISO y offset, precisión de salida, comparación de fecha cerca de medianoche. No está definido un campo de cierre ni una fecha editable por cliente.
- **Alternativas:** hora local sin offset (simple, ambigua fuera de ese contexto); timestamp con offset y día calculado en zona del restaurante (inequívoco, requiere convención de equipo).
- **Supuesto:** recomendar una convención común de zona del restaurante y fecha/hora ISO con offset, asignada por servidor; probar medianoche en el futuro. No se agrega configuración ni campo ahora; no derivar hoy del navegador de cada consumidor.
- **Afectados:** M5, snapshots de promociones M2 y lectura/reportes M6. **Bloqueante de contrato:** fecha serializada y elegibilidad diaria. **Validación:** Juan y Federico, con Joaquín y Héctor para consistencia temporal.

##### A10 — Forma de datos, Mozo y ubicación de entidades

- **Establecido:** #162 fija campos generales, no DTO exacto; unificado relaciona Comanda con un Mozo y mesa, reserva opcional, detalle XOR y observaciones opcionales. D-05 mantiene provisional la lista de entidades compartidas.
- **Pendiente de validación:** origen del mozo (entrada, asignación de mesa o contexto), campos obligatorios/nulos/omitidos y nombres snake_case frente al diagrama, IDs frente a objetos anidados, restricciones de observaciones, entradas desconocidas y si se agrupan detalles repetidos. También ubicación ORM de Comanda/DetalleComanda y enums compartidos.
- **Alternativas:** IDs de relaciones en entrada y DTO compartido de salida (simple y estable); objetos anidados (más información, más acoplamiento). ORM en M4 con acceso por servicio o en `shared/models/` según integración acordada (ambas requieren aclarar D-05, no compartir ORM como DTO).
- **Supuesto:** recomendar IDs en entradas y DTO compartidos explícitos para consumidores; preservar nombres de negocio y separar schemas HTTP de ORM. Resolver origen del mozo con M3 antes de exigir un `mozo_id`. No inventar datos personales, límites de texto ni campos temporales ausentes. Proponer ubicación ORM coordinada siguiendo D-05, sin decidirla únicamente porque M5/M6 consumen un DTO.
- **Afectados:** schemas/DTO M4/M5/M6, persistencia y stub. **Bloqueante de contrato:** forma pública y origen de relaciones; **diseño interno/coordinación:** ORM, migraciones y validación técnica posterior. **Validación:** Juan con Federico/Héctor y Giuliano para Mozo; equipo para shared.

### Recommendation

**Supuesto:** preparar una propuesta documental que separe requisitos respaldados de decisiones pendientes y un contrato común de servicios/HTTP; no declarar congelación completa hasta validar A01–A10 en sus porciones compartidas. Prioridad de revisión: A01/A02 (avisos), A03 (reserva/atomicidad), A04 (superficies y stub), A05 (dinero); luego A06–A10 para completar el contrato.

**Supuesto:** usar DTO compartido y fake de servicio como base compatible con D-04; complementar con HTTP local ejecutable cuando los consumidores confirmen uso manual. Las ubicaciones propuestas son concretas para coordinar, no permiso para escribir en shared, pruebas, SPRINT-2 ni otros módulos. Mantener anulación, reapertura, factura, cobro, reportes y algoritmos de promociones fuera de la implementación de esta tarea de planificación.

**Pendiente de validación:** una futura spec debe registrar por operación entradas/salidas, códigos y fallos, efectos, advertencias y confirmación, ejemplos monetarios, escenarios de concurrencia/reintento y alcance del stub. Los escenarios futuros deben incluir alta válida/errores de cantidad y XOR, otra ABIERTA con continuación, listado filtrado/vacío, cierre confirmado con pendientes, reserva activa/cancelada/atendida/otra fecha, rollback observable y snapshots tras cambios de catálogo. Esta lista orienta la especificación; no acredita pruebas ejecutadas ni amplía las HU.

### Risks

- R04 sigue expuesto: documentar un DTO no equivale a disponer de un stub utilizable ni de crear/cerrar/consultar funcionando. Plan y R04 difieren entre listar/consultar; A04 propone resolverlo expresamente, no omitir uno silenciosamente.
- Convertir una advertencia en prohibición cambia #52/#58; permitir efectos antes de confirmar puede impedir que la persona decida informadamente.
- Commits independientes entre M3/M4/M5 pueden dejar estados parciales; un fake no prueba atomicidad de SQLite ni disponibilidad de servicios ausentes.
- Float, redondeo no acordado o recálculo desde catálogo pueden alterar lo que M6 factura. Las discrepancias de los diagramas requieren comunicación al equipo, no corrección automática.
- R08/R09: agregar interfaces/campos por conveniencia o compartir ORM para eludir D-04 aumenta alcance y acoplamiento. Las tareas de otros responsables exigen coordinación/autorización posterior.
- Divergencia entre fake, HTTP stub y producción puede dar falsa confianza. Supuesto: acordar ejemplos/escenarios de paridad y datos sintéticos con M5/M6 como mitigación.
- Se mantiene el control general de 400 líneas del preflight y, por separado, los puntos de revisión del equipo de 800 en backend y 800 en frontend, nunca una franquicia de 1600. El equipo no exige dividir la HU; para single-pr >400 el flujo requiere `size:exception` de mantenedor aún no concedida. Véase el seguimiento manual y la limitación del esquema activo en tareas; no se cambia configuración ni se crean varios PR.
- No se asignan ni modifican probabilidades de riesgos; corresponde al equipo estimarlas.

### Ready for Proposal

**Sí, para preparar una propuesta con límites y pendientes explícitos; no para aprobar/congelar el contrato ni implementar.** La exploración cumple su objetivo documental. Los requisitos independientes pueden avanzar en planificación; cada parte crítica queda sin congelar hasta su validación por los responsables indicados. No hay código ni stub entregado, no se ejecutaron pruebas y `SPRINT-2/S2-01-contrato-comanda.md` continúa como publicación futura no escrita.

El orquestador debe recibir este informe, conservar los gates nativos y decidir el siguiente lanzamiento. Esta ejecución termina en exploración, sin autoavance.
