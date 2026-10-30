# Diseño provisional: contrato y doble controlado de Comanda

> **Vigencia de apply (2026-10-29):** `size:exception` aceptada y preflight nativo confirmado por el padre; single-pr sin encadenamiento. Contrato documental en `SPRINT-2/`, DTO, fake y pruebas están autorizados en las superficies del lanzamiento. Enums nuevos se permiten únicamente dentro de `shared/contratos/comanda.py`, no en enums existentes. HTTP no seleccionado. El cuerpo conserva el diseño y las restricciones históricas de fases previas; sus menciones a tamaño/publicación pendientes ya no son bloqueos vigentes. [Apply](apply-progress.md) quedó parcial antes de escribir comportamiento por dos timeouts de pytest basal; no hay TDD ejecutado ni aceptación M5/M6, congelación, implementación o integración real.

**Cambio:** `S2-01-contrato-comanda` · **Responsable:** Juan Ignacio Riquelme (M4).
**Estado:** diseño completo para revisión; contrato de equipo **NO CONGELADO**. Autorización local de futuro apply restringido registrada, condicionada al presupuesto; no aceptación de interfaces por M5/M6 ni implementación realizada.

**Decisión local A04:** DTO compartidos independientes de ORM y fake interno de pruebas como mínimo válido, con **crear, consultar, listar y cerrar** obligatorios. HTTP aislado opcional si se valida su necesidad, no exigido por «FastAPI si corresponde». Respetar interfaces, convenios y capas D-01/D-04, sin framework hexagonal, dependencias nuevas ni maquinaria genérica de proveedores/transacciones. El servicio público de Atención es frontera futura; no se implementa ahora ni se editan consumidores ajenos.

## Recorrido de revisión y límites

1. Revisar A01–A05: advertencias, reserva/atomicidad, superficie del doble y dinero.
2. Completar A06–A10: mesa, selección, fallos, tiempo y forma de datos.
3. Validar los 20 CA originales y los escenarios adicionales; registrar decisiones humanas antes de congelar el contrato y autorizar implementación.

La fase original creó **solo este `design.md`**. Propuesta, exploración y ambas specs se conservan como borradores de revisión, no aprobaciones. No se escribe ni ejecuta código, stub o pruebas; no se modifica configuración, bootstrap, shared ni módulos. No hay operaciones remotas, commits, push o PR.

**Nota de mantenimiento (2026-10-29):** todos los artefactos de planificación ya existen; no se repiten fases. Esta ejecución solo modifica seis documentos. El usuario autoriza futuro apply de contrato documental, DTO compartido, stub y pruebas, no Comanda real, pantallas, otras HU/módulos ni router productivo. Falta `size:exception` explícita de mantenedor y cualquier consentimiento nativo de edición aplicable. Sin commits/push/PR. El [anexo vigente](exploration.md#anexo-de-decisiones-del-usuario--2026-10-29) conserva las diferencias con fuentes y las alternativas históricas descartadas.

Fuentes de negocio y aceptación: [exploración](exploration.md#fuentes-y-requisitos-establecidos), [propuesta](proposal.md), [contrato R01–R07](specs/comanda-contrato/spec.md) y [stub T01–T02](specs/comanda-stub-compartido/spec.md). Se reutiliza la captura de issues del padre; no se comprueba nuevamente su estado remoto. #162 no declara dependencias en esa evidencia; las HU relacionadas permanecen abiertas según los insumos.

Fuera de alcance: HU completas, interfaz de usuario, anular/reabrir, marcar entregas, factura/pago, reportes y algoritmos de promociones. ANULADA como valor no habilita una operación. No se agregan cliente propio, datos personales, fecha de cierre, turno obligatorio o límites de texto inventados.

## Evidencia de arquitectura y código inspeccionado

Rama local comprobada: `feature/S2-01-contrato-comanda`. El directorio del cambio ya estaba sin seguimiento; no se limpia ni se atribuyen sus archivos previos a esta fase.

| Evidencia local | Consecuencia para este diseño |
| --- | --- |
| `SPRINT-0/S0-05-arquitectura.md`, D-01–D-06/D-10/D-14/D-21–D-27; `SPRINT-1/S1-03-estandares-backend.md` | Capas simples; servicio sin FastAPI; consultas en repository; DTO no es ORM; transacciones cortas en servicios. |
| `backend/app/modules/{atencion,reservas,pagos}/` | Las cinco capas de cada módulo contienen solo docstrings: no existen firmas Comanda productivas que puedan darse por aprobadas. |
| `backend/app/modules/salon/service.py`, líneas 41–102 | Solo altas de sector/mesa y listado de sectores; las altas hacen commit. Faltan consulta/ocupación de mesa y operaciones de Mozo componibles. |
| `backend/app/modules/productos/service.py`, líneas 238–247 | `obtener_producto(db: Session, categoria: Categoria, producto_id: int) -> ProductoSalida` exige categoría además del ID. No satisface directamente el detalle candidato con solo `producto_id`. |
| `backend/app/modules/productos/schemas.py`, `ProductoListado`/`ProductoSalida` | Precio Decimal con serialización de dos decimales en cadena: precedente, no aprobación del cálculo M4/M6. |
| `backend/app/modules/menus/service.py` | Esqueleto; no hay proveedor público implementado de snapshots de menú/promoción. |
| `backend/app/main.py` | Solo registra routers Productos/Salón; traduce excepciones comunes y validación a `detalle`. El fake no aparecerá en `/docs`. |
| `backend/app/shared/{excepciones,paginacion}.py` | Existen excepciones 404/409/422 y `Pagina(items,total,limit,offset)`; reutilizarlas no exige ampliarlas. Defaults: limit 50, máximo 100, offset 0. |
| `backend/app/shared/models/enums.py` | Existen Estado, EstadoMesa y Categoria; no EstadoComanda/EstadoEntrega/EstadoReserva. Añadir enums sería un cambio shared distinto de reutilizar excepciones/paginación. |
| `backend/pyproject.toml` | Los contratos controlan imports directos: otro módulo solo usa `atencion.service`; servicio no importa FastAPI. Cobertura backend mínima 70 %. |
| `backend/app/database.py`; `backend/tests/conftest.py` | SQLite con WAL/timeout/FK; sesión síncrona. Fixture `db` migra una SQLite temporal por prueba; `cliente` usa la app productiva, por lo que no sirve sin más para un stub aislado. |
| `openspec/config.yaml` | strict TDD activo en configuración raíz/testing/apply; se preserva íntegramente. |

Las discrepancias de diagramas (float/Decimal, cliente directo, inactiva y mesa/comanda 1:1) permanecen expuestas en la exploración. Este diseño no corrige fuentes ni transforma esas diferencias en decisiones aceptadas.

## Decisiones de arquitectura y congelación

La matriz conserva IDs: decisiones locales A01–A05 permiten el stub provisional, no congelan interfaces de equipo. A01/A02 son **Supuesto: adoptado operativamente para el stub por el usuario**; requieren reconciliar HU con equipo/M5/M6. A06–A10 siguen pendientes salvo orden por fecha y desempate indicados en A05; no se aceptan otras propuestas por silencio. Responsables y evidencia: [propuesta](proposal.md#matriz-de-decisiones-y-trazabilidad).

| ID / hechos y referencia | Alternativas y costo | Supuesto: recomendación y justificación | Pendiente de validación / bloqueo de congelación |
| --- | --- | --- | --- |
| A01 — #52 CA02, R03/S52-07 solo exige advertencia. | Continuación confirmada: alternativa histórica descartada para el stub. | Supuesto: adoptado para el stub por usuario: conflicto sin inserción ante otra ABIERTA; informar y permitir listado por misma Mesa y consulta por ID/referencia acordada. Supuesto: 409 común con detalle. | Reconciliar bloqueo más fuerte con equipo/Federico/Héctor/Giuliano; sin envelope ni flag nuevo ni unicidad productiva aprobada. |
| A02 — #58 CA03, R05/S58-04 solo exige aviso antes de confirmar. | Cerrar con pendientes confirmados: alternativa histórica descartada para el stub. | Supuesto: adoptado para el stub por usuario: cualquier producto pendiente bloquea cierre sin mutar estado/entregas; advertir y orientar al consumidor al marcado. Fixture entregada permite cierre. Supuesto: 409 común. | Reconciliar HU con equipo/Héctor; destino de navegación pendiente, sin pantalla/ruta/callback ni campo nuevo. D-24 permanece. |
| A03 — #68 CA01–04/S2-02, R06: reserva activa del día, mesa heredada, vínculo y ATENDIDA; cancelada/atendida no crea. | M5 orquesta: propiedad natural y evita ciclo. M4 orquesta: centraliza, puede generar ciclo si M5 también llama M4. Commits separados: simples, efectos parciales. | M5 dueño único de la transacción del caso reserva; M4 ofrece núcleo componible sin commit propio en ese flujo. Comanda/detalles/vínculo/ATENDIDA/ocupación forman una unidad atómica. | Federico/Juan/Giuliano, Héctor por lectura: composición de sesión/servicios, reintentos y concurrencia. Avisar sin crear fuera del día es recomendación conservadora; menú solo en reserva no aprobado. |
| A04 — #162/plan, R07/T01–T02; R04 pide consultar. | Fake mínimo válido; HTTP opcional de mayor mantenimiento. | Decisión local: crear/consultar/listar/cerrar en fake interno; HTTP solo si se valida necesidad, nunca ambos obligatorios. Sin contenedor genérico ni ediciones de seam/consumidores productivos. | Firmas/DTO y aceptación M5/M6/equipo pendientes; catálogo real junto a A10 no disponible por inferencia. |
| A05 — #52 CA06, R02/S52-04; Decimal y snapshots. | ROUND_HALF_UP por línea: propuesta histórica superada/no aprobada, no regla Productos. | Decisión local: Decimal y formato Productos; fecha DESC y desempate ID. Supuesto: centavos sintéticos exactos; ID DESC candidato no especificado por usuario. | Fórmula, modo/momento de redondeo y snapshot compartido pendientes con M6/M1/M2; no copiar algoritmo de descuentos inexistente en Productos. |
| A06 — #52 CA01, R03/S52-06: LIBRE pasa a OCUPADA; M3 no ofrece operación pública necesaria. | Servicio M3 componible: integración real con coordinación; simulación: permite desarrollo pero no acredita integración. Acceso a repository/model M3: prohibido. | Coordinar consulta/ocupación por servicio; simular explícitamente en fake. No liberar al cerrar ni rechazar toda OCUPADA; proponer rechazo de FUERA_DE_SERVICIO. | Juan/Giuliano/Federico/Héctor: estados admitidos, otras ABIERTAS, liberación y disponibilidad real M3. |
| A07 — #55 CA01–04, R04; número de mesa no globalmente único. | ID: inequívoco, necesita selección previa. Número+sector: humano, más parámetros. Detalles completos: menos llamadas, más carga; resumen+consulta: menor listado. | ID de mesa, filtros por conjunción sin estado implícito, orden fecha_hora/id descendente, resumen y consulta individual. Reutilizar Pagina; distinguir cero coincidencias de offset fuera de rango. | Juan/Federico/Héctor: parámetros, orden y campos exactos; congelación de selección y respuesta. |
| A08 — R07, SD24-01: categorías 404/409/422 y detalle establecidos; CERRADA no se vuelve a cerrar. | Conflicto y reconciliación: explícito, exige lectura del consumidor. Éxito al segundo cierre: oculta el error y contradice D-24. Preconsulta de avisos o intercambio coordinado: costos A01/A02. | Excepciones comunes; proponer conflicto para no ABIERTA y consulta tras timeout, sin reintento ciego de alta. Casos comunes para fake y producción futura. | Juan/Federico/Héctor: mapa y precedencia, ANULADA, duplicación/reintentos y reconciliación. No se inventan claves de idempotencia o errores de éxito. |
| A09 — #52 CA08/#68 CA03, R02/R06: reloj del sistema y reserva del día. | Local sin offset: simple pero ambiguo; timestamp con offset/día restaurante: inequívoco, requiere convención común. | Reloj controlable en fake, asignación servidor, ISO con offset y día de restaurante para todos los consumidores. Evita depender del navegador. | Juan/Federico/Joaquín/Héctor: zona, precisión, comparación en medianoche y fuente de reloj; no nueva configuración ni fecha de cierre ahora. |
| A10 — R01/tablas candidatas: relaciones Mesa/Mozo, reserva opcional, XOR y observaciones opcionales. | IDs/DTO explícito: menor acoplamiento; objetos anidados: más información y dependencia. ORM M4 o shared: depende de D-05, no del DTO. | IDs de entrada, DTO compartido separado de schemas/ORM; no exigir mozo_id hasta resolver origen. Conservar detalle sin agrupación implícita como base de revisión para no perder snapshots de pedidos distintos. | Juan/Federico/Héctor/Giuliano/equipo: Mozo, nombres, tipos, nulos/omisión/extras, repetidos, enums/ORM y lookup producto_id sin categoría (véase abajo). |

### Resoluciones internas recomendadas, no decisiones de producto

**Supuesto:** usar modelos tipados con la dependencia de validación ya presente, sin introducir librerías. `shared/contratos/comanda.py` contendría únicamente DTO intermodulares; `atencion/schemas.py` mantendría la validación/adaptación HTTP. No copiar reglas monetarias o de negocio en varios schemas. Alternativa: dataclasses y adaptación adicional; reduce acoplamiento de librería pero duplica conversión respecto del proyecto. **Pendiente de validación A04/A10:** nombres definitivos y política de campos extra; el precedente M1 de rechazo de extras no aprueba esa elección para Comanda.

**Supuesto:** fake concreto con diccionario privado por identidad de Comanda, secuencia de IDs local, copias de entradas/salidas y fixtures por prueba. Recibiría reloj y conjuntos sintéticos; reconstruir una instancia restablece el estado, sin endpoint reset. Para una operación compuesta simulada, validar y preparar cambios antes de sustituir el estado completo evita mutación parcial observable. Alternativa: fake SQLite; ofrece semántica más cercana pero requiere modelos/migraciones que exceden el doble recomendado. **Pendiente de validación A04:** constructor, fixtures, reset y alcance por consumidor; no afirmar atomicidad real ni seguridad multihilo/proceso por usar diccionarios.

**Supuesto:** no mover ORM solo para compartir DTO. Enums nuevos, si se aprueban compartidos, irían a `shared/models/enums.py` coordinadamente; EstadoComanda no reutiliza Estado. **Pendiente de validación A10:** ubicación de entidades según D-05 provisional y enum completo de entregas; EstadoReserva pertenece a coordinación M5, no se implementa aquí.

## Interfaces propuestas y dependencias faltantes

Referencia: contrato, secciones «Contrato de datos propuesto» y «Operaciones revisables». Todo nombre y firma de esta sección es **Supuesto:** no normativo; no es código listo para implementar.

| Superficie candidata | Entradas/salida recomendadas | Referencia y apertura |
| --- | --- | --- |
| `atencion.service.crear_comanda` / `POST /api/v1/comandas` | Datos ComandaCrear; mesa del alta general, detalles XOR/cantidad, observaciones; ComandaSalida con identidad, estado, fecha y snapshots. 201 al éxito HTTP. | R01–R03; A01/A04/A05/A06/A09/A10. Sesión y variante componible de reserva pendientes A03, no flag commit genérico. |
| `atencion.service.listar_comandas` / `GET /api/v1/comandas` | ParametrosPaginacion y filtros candidatos mesa_id/estado; Pagina[ComandaResumen]. 200. | R04; A07. Resumen candidato id/mesa/estado/fecha_hora. |
| `atencion.service.consultar_comanda` / `GET /api/v1/comandas/{id}` | Identidad Comanda; ComandaSalida con detalles históricos; consulta obligatoria en el stub. HTTP candidato 200. | R04 de riesgos/M6; A04/A05/A10. Firmas/ruta compartidas pendientes; no inferir única Comanda histórica por mesa. |
| `atencion.service.cerrar_comanda` / `POST /api/v1/comandas/{id}/cerrar` | Identidad; ComandaSalida, 200 al éxito HTTP candidato. | R05; A02 local bloquea pendientes, sin confirmación que lo omita ni flags inventados. |
| Caso «crear desde reserva» de M5 | Reserva origen y pedido; mesa heredada internamente. Servicio M5 coordina núcleo M4 y efectos M3 bajo la misma sesión propuesta. | R06/A03: no se agrega ruta M5 ni elección independiente de mesa. |

**Supuesto:** DTO de entrada expresa solo referencias/cantidades y observaciones; DTO de salida conserva precio_unitario, descuento, promoción histórica y estado_entrega cuando se apruebe su exposición. Estado/fecha/precios no son valores arbitrarios determinados por el cliente. **Pendiente de validación A05/A10:** política exacta de rechazo o descarte de campos no permitidos, sin imponerla por inferencia.

### Frontera pública M5/M6 y punto de sustitución

```text
M5.service / M6.service -> atencion.service -> repository M4 -> models M4
           |                  |
           +-> shared DTO     +-> otros service autorizados (M1/M2/M3)
HTTP futuro -> router M4 -> service M4
Prueba del consumidor -> misma función pública sustituida por método del fake
```

**Supuesto:** en pruebas, importar el módulo `atencion.service` y sustituir sus funciones públicas mediante fixtures locales del consumidor; el fake se importa solo desde pruebas, nunca desde `app`. Esto evita importar schemas/modelos/repositorios ajenos o registrar un proveedor de pruebas en producción. DTO y excepciones comunes proceden de shared. **Pendiente de validación A04:** puntos exactos con Federico/Héctor; los esqueletos actuales no ofrecen aún esa seam ejecutable. Los imports a `service` son la regla D-04, no una excepción temporal para el fake.

### Catálogo: falta un contrato de búsqueda, no un campo aprobado

El ejemplo candidato de detalle es `producto_id` + cantidad. El único lookup público inspeccionado requiere `Categoria` + ID, y su retorno es `ProductoSalida` interno de M1. **Pendiente de validación A04/A10:** acordar con Franco cómo obtener por identidad del detalle una proyección pública de precio/promoción sin importar ni anotar `productos.schemas` desde M4; tampoco existe proveedor M2 implementado para el resultado de promoción/menú.

**Supuesto:** recomendar consulta pública M1 por ID con proyección compartida mínima acordada, antes que exigir categoría nueva en el payload Comanda. Ventaja: mantiene identidad del contrato candidato; costo: coordinación y cambio M1 posterior autorizado. Alternativa: enriquecer entrada con categoría validada por M1; evita lookup nuevo pero modifica el contrato del consumidor y puede aportar datos inconsistentes. No iterar categorías, leer repository/model ajeno ni exigir silenciosamente una categoría. Ninguna alternativa está aprobada; esta brecha bloquea prometer captura real de snapshots. El fake usaría snapshots sintéticos declarados, no algoritmos de promoción.

## Flujos y ramas pendientes

### Alta general — R01–R03, S52; A01/A05/A06/A09/A10

**Supuesto:** validar forma/entero estricto/XOR/detalle no vacío; resolver mesa y catálogo mediante servicios públicos; tomar snapshot y reloj; revalidar estado al escribir; crear detalles/Comanda y ocupar LIBRE en una transacción del servicio M4. Las consultas de persistencia permanecen en repositories de sus dueños.

```text
Solicitante -> servicio M4: pedido
M4 -> servicios públicos: mesa y valores al pedir
M4 -> lectura propia: otras ABIERTAS
  sin otra ABIERTA -> validación final -> unidad de escritura -> salida
  con otra ABIERTA -> conflicto A01 local -> no insertar ni mutar
    consumidor: informar -> listado por misma Mesa -> consultar ID/referencia existente
```

**Supuesto: A01 adoptado para el stub por el usuario:** revalidar al intentar crear y bloquear si existe otra ABIERTA, sin inserción ni ocupación nueva. #52 CA02 solo exige advertencia: este bloqueo requiere reconciliación de equipo, no impone unicidad real aprobada. Supuesto: ReglaDeNegocioError/409 con `{"detalle":"mensaje"}`; consulta existente por listado y consulta regulares, no envelope nuevo. Precedencia de fallos A08 pendiente. Mesa inexistente debe advertirse (S52-09).

### Reserva — R06/S68, C03; A03/A06/A08/A09

**Decisión local A03:** al llegar los clientes y atender el mozo la reserva, la confirmación del pedido válido crea ABIERTA vinculada y reserva ATENDIDA. No se crea comanda vacía al reservar. Mantener activa de hoy, mesa heredada y producto/cantidades positivas; inválidos no mutan el estado sintético. El flujo transaccional real siguiente es únicamente contexto de diseño pendiente: ni el usuario ni el fake asignan dueño a M5 o prueban atomicidad M3/M5.

**Supuesto:** M5 inicia y termina la unidad transaccional del caso reserva con una sesión común. M5 revalida reserva activa/día y obtiene su mesa; M4 prepara alta componible; M3 ocupa si corresponde mediante operación pública sin commit independiente; M5 vincula y marca ATENDIDA. Un único commit confirma todos los efectos; cualquier fallo revierte todos. No se propone infraestructura Unit of Work genérica ni llamadas HTTP entre estos servicios internos.

```text
Solicitante -> M5.service: reserva + pedido
M5 -> su repository: comprobar activa/día y mesa
M5 -> M4.service: núcleo de alta con mesa heredada
M4 -> M3.service: consulta/ocupación componible acordada
M5 -> su repository: vínculo y ATENDIDA
M5 -> sesión común: commit único; ante fallo, rollback de toda la unidad
```

**Pendiente de validación:** servicios componibles y semántica concurrente con Federico/Giuliano/Juan. Los commits actuales de altas Salón no se reutilizan como si fueran componibles. En alta general el dueño sería M4; en reserva sería M5, nunca ambos en el mismo caso. Alternativa de orquestación M4 sigue abierta, pero debe reemplazar, no sumar, el dueño. Evitar M4→M5→M4 circular.

**Supuesto:** para implementación real, revalidación atómica de elegibilidad de reserva mediante su repository y conflicto si otra solicitud ya la consumió, con rollback integral; no decidir ahora índice, bloqueo o protocolo idempotente. Preparar cálculo de snapshots fuera de la sección de escritura corta D-10 y acordar su vigencia al persistir. **Pendiente de validación:** técnica SQLite, comparación día A09 y resultado de cada concurrente. WAL/timeout no prueban por sí solos ausencia de carreras. El fake simula el resultado pactado, no demuestra rollback ni concurrencia SQLite.

### Cierre y consulta M6 — R05/R07, S58/SD24; A02/A05/A08

```text
Solicitante -> M4.service: preparar cierre de identidad Comanda
M4 -> estado/detalles propios: comprobar ABIERTA y productos
  sin pendientes (fixture entregada) -> cierre válido -> CERRADA
  con cualquier producto pendiente -> advertir y bloquear A02 local
    conservar ABIERTA y entregas -> guía documental al consumidor para marcar entregas
M6.service -> M4.service: consulta de snapshots de esa identidad
```

**Supuesto:** cierre solo cambia estado de Comanda; no altera entregas, importes ni mesa. CERRADA está disponible para facturar, pero factura y pago son responsabilidad posterior de M6, fuera de S2-01. No crear una operación de añadir detalles para demostrar la prohibición de incorporación; esa restricción deberá propagarse a su HU futura. Segundo cierre no se ejecuta por D-24; **Pendiente de validación A08:** respuesta pública exacta (recomendación conflicto), tratamiento de ANULADA y reconciliación tras timeout.

**Supuesto: A02 adoptado para el stub por el usuario:** conflicto 409 común ante pendientes, sin mutación ni entrega implícita aunque el consumidor confirme. #58 CA03 solo exige aviso previo: reconciliación de HU pendiente con equipo/M6. Ofrecer navegación es guía documental accionable al consumidor («revisar y marcar entregas antes de reintentar»); destino/pantalla pendientes de validación. No implementar UI, ruta, callback ni campo nuevo de payload. Usar datasets controlados pendientes/entregados, sin implementar marcado de otra HU.

### Dinero e historia — R02, C04; A05

**Decisión local A05:** usar Decimal y el precedente de Productos. Evidencia comprobada: `productos/schemas.py:153` valida precio `gt=0,max_digits=10,decimal_places=2`; serializadores 108–110, 225–227 y 240–242 usan `f"{precio:.2f}"`. Búsqueda de `quantize`, `ROUND_` y `round(` sin coincidencias en el módulo. Formato a dos decimales/contexto decimal no constituye redondeo de negocio explícito ni algoritmo global de descuentos. **Supuesto:** fixtures de centavos exactos y ese formato; fórmula de descuento, unidad/línea, escala intermedia y modo/momento de redondeo siguen pendientes con M6. ROUND_HALF_UP por línea es propuesta histórica superada/no aprobada, no código existente. Capturar snapshots sintéticos sin recálculo posterior; contenido real y proveedores M1/M2 por acordar.

## Archivos planificados y alcance de cambios

En este mantenimiento solo se editan seis documentos existentes. La tabla conserva ubicaciones propuestas: futuro DTO/fake/suite dentro del permiso local restringido, condicionado al presupuesto y consentimiento nativo aplicable; las filas productivas siguen excluidas. HTTP y publicación externa requieren selección/autorización propia. No habilita shared arbitrario ni otros módulos.

| Archivo exacto | Acción / finalidad futura | Condición |
| --- | --- | --- |
| `openspec/changes/S2-01-contrato-comanda/design.md` | Diseño existente. | Mantenimiento autorizado junto con los otros cinco documentos. |
| `backend/app/shared/contratos/comanda.py` | Crear DTO intermodulares sin ORM. | A04/A10, acuerdo shared/M4/M5/M6. |
| `backend/tests/shared/fakes/comanda.py` | Crear fake, estado/reloj/reinicio sintéticos controlados. | A04 y decisiones de negocio aplicables aprobadas. |
| `backend/tests/shared/test_contrato_comanda.py` | Crear suite común parametrizada por proveedor. | Expectativas aprobadas, no candidatos abiertos. |
| `backend/tests/stubs/comanda_http.py` | Crear aplicación HTTP aislada opcional con adaptación al mismo fake. | Solo si A04 confirma necesidad manual/HTTP; nunca include_router productivo. |
| `backend/app/modules/atencion/service.py` | Futuro punto público y núcleo componible M4. | Autorización posterior; no completar HU productivas como parte implícita del fake. |
| `backend/app/modules/atencion/schemas.py`, `router.py`, `repository.py`, `models.py` | Futuras capas HTTP/persistencia. | HU productivas posteriores y decisiones Axx resueltas. |
| `backend/tests/modules/atencion/test_service.py`, `test_router.py` | Futuras pruebas reales y adaptación HTTP. | Implementación posterior autorizada; SQLite temporal para integración. |
| `backend/app/shared/models/enums.py` | Posible alta coordinada de enums Comanda/Entrega. | No es simple reutilización de shared; A10 y equipo. |
| `backend/app/modules/{salon,reservas,pagos,productos,menus}/service.py` | Coordinar servicios públicos y consumidores; no editar ahora. | Responsables M3/M5/M6/M1/M2 y autorización separada. |
| `SPRINT-2/S2-01-contrato-comanda.md` | Publicación futura del contrato revisado. | Aprobación humana y autorización fuera de esta carpeta. |

`backend/app/shared/excepciones.py` y `paginacion.py` son referencias de reutilización, sin cambios previstos en la recomendación. No se necesitan migraciones para el fake en memoria. `backend/app/main.py`, `backend/alembic/env.py`, `backend/alembic/versions/`, configuración y frontend permanecen fuera del entregable recomendado. Registrar modelos/router y migrar sería trabajo de implementación productiva posterior, no de un stub de prueba.

## Estrategia de pruebas futuras — ninguna ejecutada

Suite futura con datos sintéticos y fixture de pruebas: empezar por fake, cuatro métodos obligatorios; HTTP opcional. C01/C02/C04 incorporan decisiones locales ejecutables solo en futuro apply autorizado; C03/C05 y aceptación compartida siguen pendientes. Reutilizar en implementación real requiere acuerdo y prueba de paridad; compartir DTO no la demuestra.

La siguiente matriz conserva **exactamente los índices CA originales** de la spec corregida: 8 + 4 + 4 + 4 = 20. Cada fila exige al menos una prueba futura trazable; cuando se comparte escenario, mantener identificable cada CA. Nombres propuestos bajo `test_<función>_<caso>`; no se crean archivos ahora.

| Fuente / CA original | Escenario de spec | Comprobación futura planificada |
| --- | --- | --- |
| #52 CA01 | S52-01 + S52-06 | Alta válida en mesa LIBRE: detalles y asociación; mesa OCUPADA. |
| #52 CA02 | S52-07 | Fuente: advertencia; adicional local A01/C01: conflicto sin inserción, consulta de existente por mesa/ID. Reconciliación de equipo pendiente. |
| #52 CA03 | S52-09 | Mesa inexistente produce advertencia; traducción pendiente A08. |
| #52 CA04 | S52-08 | Sin reserva no hay cliente propio ni datos personales independientes. |
| #52 CA05 | S52-03 | Cantidad inválida advertida/rechazada: 0, negativa, fracción, booleano; entero positivo válido. |
| #52 CA06 | S52-04 | Snapshot al pedir producto/menú con promoción; conservar tras cambio de catálogo. Forma/cálculo pendientes A05. |
| #52 CA07 | S52-05 | Estado inicial ABIERTA. |
| #52 CA08 | S52-05 | Fecha/hora asignada por sistema con reloj controlado; formato pendiente A09. |
| #55 CA01 | S55-01 | Listar ABIERTAS con mesa/estado y Pagina; no asumir filtro implícito. |
| #55 CA02 | S55-02 | Filtrar mesa inequívoca, incluidos números repetidos en sectores distintos. |
| #55 CA03 | S55-03 | Filtro de estado solo devuelve ese estado. |
| #55 CA04 | S55-04 | Sin comandas informa vacío; cubrir además filtro sin coincidencias con items [] y total 0. |
| #58 CA01 | S58-01 | Fixture ABIERTA con productos entregados: cierre válido deja CERRADA conforme A02 local. |
| #58 CA02 | S58-02 + S58-03 | No incorporar productos y disponible para facturar; prueba de incorporación en HU futura, sin añadir endpoint al stub. |
| #58 CA03 | S58-04 | Fuente: aviso ANTES de confirmar; adicional local A02/C02: pendientes bloquean sin mutar ni autoentregar, guía documental de navegación. |
| #58 CA04 | S58-03 | CERRADA consultable como disponible para facturar, sin emitir factura o pago. |
| #68 CA01 | S68-01 | Activa de hoy atendida por mozo: confirmar pedido válido crea ABIERTA, mesa heredada, vínculo y ATENDIDA; no marcador vacío. Solo simulación. |
| #68 CA02 | S68-03 | Cancelada y ATENDIDA no crean, con advertencia (parametrizar ambos estados). |
| #68 CA03 | S68-04 | Otra fecha produce aviso; no se autoriza continuar fuera del día. |
| #68 CA04 | S68-02 | Advertir cantidad inválida; cubrir además pedido sin productos sin aprobar menú solo. |

| Cobertura adicional / capa | Técnica recomendada y límite |
| --- | --- |
| R01/S52-02 | XOR ambos/ninguno, producto o menú válido y detalle vacío. |
| R04/SPAG-01 | Defaults/rangos de paginación; total previo al recorte, offset fuera de rango conserva total positivo; A07 para orden/conjunción. |
| R05/SD24-01 y R07/S162-01 | Segundo cierre sin mutación; servicio con excepciones comunes, HTTP 404/409/422 con detalle y sin trazas; mapa preciso A08. |
| T01/ST01, T02/ST02 | Cobertura entregable y sustitución solo por seam pública; lint-imports posterior, sin importar internos ajenos. |
| CT01–CT03 | Ciclo observable, reset por reconstrucción, aislamiento/copia y casos comunes; condicionados a A04 y resultados aprobados. |
| C01/C02 | RED futuro: otra ABIERTA bloquea sin insertar y permite consulta; pendientes bloquean sin mutar/autoentregar y guía de navegación documentada. Revalidar estado al intento, sin bypass de confirmación. |
| C03/CT04 | Fallo antes/después de cada efecto y dos altas de una reserva; fake comprueba estado simulado. SQLite temporal con servicios reales deberá demostrar rollback/ausencia de parcialidad después de coordinación. |
| C04/C05 | Decimal/centavos exactos/formato Productos para el stub; fórmula/redondeo compartidos y medianoche A09 pendientes, no aserciones finales. |
| CT05 y HTTP opcional | Rutas, JSON, códigos, aislamiento de aplicación/contextos y ausencia de acceso productivo si A04 selecciona HTTP; ciclo de proceso, loopback y arranque/parada/reinicio solo si selecciona proceso manual. Sin usar `cliente` productivo para registrar el stub. |

En un apply futuro autorizado: **RED → GREEN → REFACTOR**, backend `pytest`, primero caso que falla por comportamiento ausente, luego implementación mínima y refactor. Registrar fallo/éxito reales, sin usar un fallo por import accidental o umbral global como demostración de la regla de negocio. Checks futuros desde backend: `ruff check . && ruff format --check . && lint-imports && pytest`, cobertura ≥70 %, sin bajar umbral. No hay cambios frontend previstos; si otro alcance los autoriza, aplicar sus checks de repositorio y cobertura ≥60 %. En esta fase no se ejecutó ningún runner, lint o prueba funcional.

## Matriz de amenazas por aplicabilidad

Referencia leída: `sdd-design/references/threat-matrix.md`. El diseño documental y el fake recomendado no ejecutan agentes, shell, procesos, Git ni PR. Se registran todas las filas del referente; N/A no genera tareas artificiales. Las filas HTTP/proceso añadidas son **condicionales A04**, no entregables obligatorios.

| Frontera / casos adversarios | Aplicabilidad | Conducta segura / fallo esperado | RED futuro |
| --- | --- | --- | --- |
| Clasificación de rutas documentales: requirements.txt, CMakeLists.txt, Markdown/MDX ejecutable, README.sh | N/A: no se clasifican ni ejecutan archivos recibidos. | No hay frontera de ejecución en el contrato Comanda. | N/A. |
| Selección de repositorio: git -C, rutas relativas/absolutas | N/A: sin automatización VCS. | No hay selector de repositorio del producto. | N/A. |
| Commit: staged, commit -a, índice vacío | N/A: no se diseñan commits automáticos. | Sin mutación de índice. | N/A. |
| Push: tracking, primer push, refspec | N/A: no hay transferencia remota. | Sin destino o credencial que resolver. | N/A. |
| PR: --head, prefijos de entorno, comandos compuestos | N/A: no se diseñan comandos PR. | No ejecutar contenido como instrucciones. | N/A. |
| HTTP: datos inválidos, identidad inexistente, fallo de negocio, excepción interna | Applicable solo si A04 selecciona HTTP aislado. | Validación y detalle 422/404/409; fallo inesperado no expone traza/SQL. No éxito encubierto ni bypass de avisos. Mapa A08 pendiente. | Por cada categoría, respuesta y ausencia de mutación; secuencia aviso antes de confirmación, una vez aprobada. |
| Proceso HTTP aislado: arranque con estado residual, reset cruzado, conexión accidental a producción | Applicable solo si A04 selecciona proceso manual. | Supuesto: memoria sintética, loopback local, sin base productiva ni llamadas reales; reinicio determinista/aislamiento; fallar sin exponer datos si preparación inválida. | Arranque limpio/reinicio, aislamiento entre contextos y ausencia de acceso productivo. Comando/puerto/reset por acordar, no inventados. |

**Pendiente de validación A04:** trasladar sin perder alcance los casos aplicables a tareas y RED si se selecciona HTTP/proceso; no exigirlos para el fake interno. El control de acceso de producción sigue D-13 y su alcance futuro, no se presume autenticación productiva en un doble local.

## Despliegue, reversión y presupuesto de revisión

No se requiere migración para este documento ni para el fake recomendado. R04 sigue expuesto: documentación, DTO y fake automatizado no acreditan integración real ni utilidad manual HTTP.

Secuencia futura restringida: decisiones locales ya registradas + excepción de tamaño y consentimiento nativo aplicable → DTO/fake/casos provisionales → aceptación compartida M5/M6 y reconciliación HU → HTTP aislado solo si necesario/autorizado → implementación productiva posterior con permiso propio y paridad real. La integración no es prerrequisito del fake. Publicación externa solo con revisión/permiso; comunicar cambios de interfaces antes de sustituir versiones.

**Supuesto:** reversión del futuro doble: retirar exclusivamente archivos/autorizaciones de sustitución introducidos y restaurar fixtures consumidoras coordinadamente; descartar estado sintético, sin tocar datos reales. Si HTTP se selecciona, detener solo su proceso local y retirar su conexión de prueba. No registrar el stub en `app.main.py` elimina una vía de despliegue accidental. Una implementación productiva con Alembic tendrá su plan independiente; no prometer rollback por retirar el fake.

Reversión documental de la fase original: corregir o retirar únicamente este `design.md` si se descarta, preservando insumos y trabajo previo; no realizar limpieza global. Preflight: automático/OpenSpec/single-pr, control general de **400 adiciones + eliminaciones**, incluidos documentos, y sin encadenamiento seleccionado. Se conservan además los puntos de revisión del equipo de **800 en backend y 800 en frontend**, medidos independientemente, sin franquicia de 1600 ni división obligatoria de HU. El esquema activo no ofrece selector de presupuesto ni entrada por lado; su seguimiento es manual/documental, sin cambiar runtime, configuración o bootstrap. Para single-pr >400 sigue pendiente `size:exception` explícita de mantenedor antes de apply, no una excepción al control del equipo de 800. Véase [política y medición en tareas](tasks.md#política-de-revisión-dos-controles-independientes); este documento no autoriza apply.

## Pendientes de validación y siguiente paso

- [ ] **Pendiente de validación compartida A01–A05:** reconciliar A01/A02 más fuertes con HU y consumidores; transacción real, firmas y fórmula/redondeo siguen abiertos. Decisiones locales del usuario ya registradas, sin atribuir aprobación ajena.
- [ ] **Pendiente de validación A06–A10:** estados/servicios M3, filtros/selección, mapa de fallos, tiempo, origen del Mozo y forma pública. Resolver explícitamente lookup M1 por producto_id frente a firma categoría+ID antes de prometer integración.
- [ ] **Pendiente de validación:** acordar escenarios/fixtures y alcance del fake con consumidores; HTTP/manual no se da por satisfecho por un doble interno.
- [ ] **Pendiente de tamaño:** autorización local de futuro apply restringido registrada; falta `size:exception` explícita de mantenedor y consentimiento nativo aplicable. El contrato de equipo continúa NO CONGELADO.

Siguiente acción: solicitar excepción de tamaño antes de apply restringido, sin repetir planificación. El stub provisional puede basarse en decisiones locales y datos sintéticos sin esperar implementar proveedores reales; no afirma aceptación compartida ni paridad real.
