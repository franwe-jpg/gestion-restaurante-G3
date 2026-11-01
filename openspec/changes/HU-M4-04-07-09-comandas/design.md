# Diseño: alta, listado y cierre de Comanda (HU-M4-04-07-09)

## Alcance vigente de flujos locales

La continuación actual habilita frontend de creación, listado y cierre, además de información estructurada A02. Alta usa los `Protocol` M4 existentes, con dependencias obligatorias sin fallback: Mesa valida/ocupa en la misma sesión y Catálogo devuelve el `DetalleComandaSalida` compartido. Los dobles viven solo en pruebas; no se presentan como servicios externos ya integrados. El POST de alta devuelve 503 hasta configurar proveedores reales y 201 al probar el servicio con dependencias sustituidas.

M4 revalida entrada/cotización con DTO compartidos e importes Decimal antes de persistir y confirmar una sola transacción; el catálogo calcula el descuento, nunca el navegador. A01 conserva la excepción local con `comanda_id`; un manejador específico en `main.py` devuelve ese ID junto a `detalle` en 409, sin cambiar los demás errores. Consulta/presentación de la Comanda existente y adaptadores reales siguen pendientes.

**Límite de puerto:** el proveedor Mesa debe usar exactamente la sesión/transacción recibida y nunca confirmar. Atomicidad y carrera intercalada se probaron localmente; no se certifica concurrencia simultánea ni servicios externos. Las puertas 1.2–1.6 siguen aplicando solo a los subconjuntos integrados pendientes.

> **Estado vigente: 9/30 completas.** Frontend M4 crea mediante API/dobles de prueba, lista con filtros/paginación y confirma cierre tras consultar pendientes. A02 bloquea con información estructurada; navegación real al marcado, integración del alta y M6 permanecen pendientes. Sin HU-M4-08, cambios compartidos ni facturación. Modelos/migración conservados; un solo PR con excepción de tamaño aprobada.

## Enfoque técnico

M4 conserva las capas `router → service → repository → models` y DTO/enums de S2-01 para pedidos y salidas. La pantalla usa solo `api.ts` y `clienteHttp`. `DetallePendiente` hereda `DetalleComandaCrear` y añade ID persistente únicamente para metadatos A02; `PendientesComanda` agrupa esos datos, no duplica `ComandaSalida`. No se añade `id` al DTO compartido ni se cambia el stub. No facturar, cobrar, marcar entregas, incorporar productos ni crear desde Reserva.

## Decisiones de arquitectura

### 1. Una transacción de alta para Comanda y ocupación de Mesa

**Elección de diseño:** M4 orquesta una única sesión/transacción local: obtiene Mesa mediante una operación acordada de `salon.service`, valida el pedido y sus valores, persiste Comanda y DetalleComanda, ocupa Mesa y confirma **una vez**; ante fallo, revierte ambas escrituras. Los repositorios no confirman. **Alternativa descartada:** crear Comanda y ocupar Mesa en dos confirmaciones independientes; permitiría una Comanda registrada con Mesa LIBRE o Mesa OCUPADA sin Comanda. **Justificación:** #52 CA01 y D-01/D-02/D-03/D-10; `salon.service` hoy solo crea Mesa y confirma sus propias altas, no ofrece una operación transaccional de ocupación. **Bloqueado por M3:** acordar identidad número + sector frente a `mesa_id`, regla de Mesa OCUPADA sin otra ABIERTA, operación sin `commit` propio y autoridad de transición; M4 no debe importar `salon.models` ni `salon.repository` ni editar Salón por iniciativa propia.

**Concurrencia pendiente de servicio:** la migración M4 ya incluye índice único parcial de SQLite para una ABIERTA por Mesa; aún hay que resolver el conflicto sin escrituras parciales y **devolver el ID de la Comanda existente**, también si la otra alta ganó la carrera. `409` es traducción HTTP propuesta, no formato de retorno acordado. `ComandaSalida` compartido ya tiene `id`, pero el error del fake A01 solo contiene mensaje: acordar superficies de error y lectura, sin suponer que `detalle` ni el resumen paginado ofrecen la consulta completa. Coordinar ocupación M3 en la misma transacción y probar dos sesiones; #52 CA02 solo exige aviso.

### 2. Persistencia M4 aprobada; referencias verificadas y límites

**Elección aprobada e implementada:** una única definición ORM de `Comanda` y `DetalleComanda` en `backend/app/modules/atencion/models.py`, sin copia en `shared/models/`. La revisión `backend/alembic/versions/e7c9a1b3d5f0_crea_comandas.py` crea `comandas` y `detalles_comanda`, y `backend/alembic/env.py` ya importa los modelos. Esta ubicación difiere del ejemplo de entidades compartidas D-05: coordinar una interfaz pública M4 para M5/M6 sin que importen modelos internos. El GREEN de persistencia no demuestra servicio, API ni criterios funcionales.

| Modelo M4 existente | Columnas y restricciones verificadas en modelo/migración | Límite de integración |
| --- | --- | --- |
| `Comanda` | `id` entero PK; `mesa_id` obligatorio; `reserva_id` y `observaciones` opcionales; `estado` inicial ABIERTA, con CERRADA/ANULADA contemplados; `fecha_hora` UTC autogenerada mediante `InstanteUTC`. Índice único parcial sobre `mesa_id` cuando `estado = 'ABIERTA'`. | FK `mesa_id → mesas.id`; el número de Mesa es único solo por `sector_id`: resolución y ocupación siguen pendientes con M3. `reserva_id` es escalar sin FK ni relación ORM; no existe tabla Reserva. |
| `DetalleComanda` | `id` entero PK; `comanda_id → comandas.id`; `producto_id` o `menu_ejecutivo_id` exactamente uno no nulo mediante CHECK XOR; `cantidad > 0`; `estado_entrega` inicial PENDIENTE; `precio_unitario` y `descuento` como `Numeric(10, 2)` de `Decimal`; `promocion_id` opcional. | FK `producto_id → productos.id` y `menu_ejecutivo_id → menus_ejecutivos.id`; `promocion_id` escalar sin FK ni relación ORM. El modelo almacena importes, no determina si el descuento absoluto es por unidad o línea. No importar modelos ajenos. |

La revisión M4 tiene `down_revision=d6b7c8e9f0a1`; RED monetario/UTC/downgrade y GREEN de SQLite temporal están en `apply-progress.md` (hito histórico: 3/30; acumulado vigente: 9/30). Conservar migración y datos; no ejecutar downgrade real. Alta local ya conserva precio/descuento cotizados sin recálculo. El índice no certifica bloqueo simultáneo ni integración transaccional M3. **Pendientes:** origen/fórmula/redondeo y alcance del descuento con M1/M2/M6; Reserva con M5, Mozo/ocupación con M3, y aceptación de datos para facturar. Los puertos no sustituyen esos acuerdos.

**Instante y presentación:** el modelo M4 autogenera UTC con microsegundos y offset explícito y el DTO serializa UTC; el frontend convierte ese instante usando la zona local del navegador con `toLocaleString()`, sin convertir valores al guardar. No admitir fecha/hora del mozo ni aplicar una política a otros modelos. Una zona comercial fija aún requeriría acuerdo adicional.

### 3. Listado paginado y adaptación explícita del cliente

**Listado implementado de extremo local a extremo local:** `GET /api/v1/comandas` devuelve `Pagina[ComandaResumen]`, con filtros por ID de Mesa/estado y orden S2-01 `fecha_hora DESC, id DESC`; el frontend usa los mismos estados en mayúsculas, mantiene filtros al paginar, reinicia offset al filtrar y distingue vacío total de página desplazada. Carga y fallos se muestran con reintento. El ID no se confunde con número/sector; selectores de M3 siguen pendientes.

### 4. Cierre sin facturación ni confirmación ficticia

**Cierre local implementado:** antes de habilitar confirmación, el diálogo consulta `GET /api/v1/comandas/{id}/pendientes`; si falla no permite confirmar. Con pendientes muestra IDs, referencias y cantidades y no ofrece confirmación. Sin pendientes solicita confirmación explícita y envía el POST de cierre. El servicio vuelve a leer las entregas; el 409 especializado devuelve información estructurada. Tras un rechazo, la UI reconsulta pendientes porque el cliente HTTP común conserva solo el mensaje de los errores. No factura, cobra, libera Mesa ni entrega automáticamente; no se certifica concurrencia simultánea entre validación y escritura.

**Metadatos A02 implementados sin cambiar S2-01:** GET retorna `{comanda_id, pendientes: [{id, producto_id, menu_ejecutivo_id, cantidad}]}`; el 409 de cierre agrega `detalle` a esa forma. IDs provienen del ORM, no del stub ni de índices de lista, y distinguen productos repetidos. `DetalleComandaSalida` compartido sigue sin `id`; el esquema adicional solo describe la operación bloqueada. **Pendiente real:** no hay pantalla de marcado implementada; se informa ese bloqueo sin enlazar a una ruta ficticia. La navegación completa sigue pendiente de HU-M4-08/coordinar su destino y no se declara CA03 íntegro por el aviso aislado.

### 5. Integraciones exclusivamente por fronteras acordadas

**Elección de diseño:** M4 consume servicios públicos de M1/M2/M3 cuando existan; M5/M6 consumen una superficie M4 acordada (servicio o contrato compartido), nunca capas internas de otro módulo. **Alternativa descartada:** importar `models`, `schemas` o `repository` de otro módulo o usar el fake como servicio productivo. **Justificación:** D-03/D-04/D-05 y `SPRINT-0/S0-05-arquitectura.md` §3.3. **Bloqueado:** M3 acuerda ocupación e identidad; M1/M2 entregan valores y promociones vigentes; M5 acepta interfaz futura de origen Reserva y M6 acepta datos para facturación. S2-01 explícitamente no acredita aceptación M5/M6. No modificar módulos ajenos ni `shared/` sin coordinación de sus responsables.

## Flujos de datos y límites de error

```text
Alta: pantalla M4 → api.ts → POST propuesto → router M4 → service M4
                                    ├─→ services M3/M1/M2 acordados (misma sesión, sin commit intermedio)
                                    └─→ repository M4 → Comanda/Detalle + Mesa → commit único o rollback
Listado backend implementado: GET → router → service → repository → Pagina[Resumen]
Cliente de listado: pantalla M4 → api.ts → GET (implementado)
Cierre: inicio → GET pendientes → pendientes: lista, aviso de gestión pendiente, sin confirmación
                               → sin pendientes: confirmación normal → POST local implementado
                                               → service revalida → CERRADA o sin mutación
```

El router valida/delega; `service.py` no importa FastAPI ni consulta SQL. Manejadores específicos M4 en `main.py` conservan `detalle` y añaden metadatos A01/A02; otros errores siguen intactos. El POST de alta tiene proveedores explícitos que devuelven 503 sin adaptadores reales. No existe GET público de Comanda completa; el GET de pendientes solo devuelve metadatos A02. Aceptación y consulta M6 siguen pendientes.

## Archivos existentes y trabajo futuro

| Ruta | Estado vigente y trabajo pendiente |
| --- | --- |
| `backend/app/modules/atencion/{router,service,repository,schemas}.py`, `backend/app/modules/atencion/models.py` | Modelos, lecturas/listado, cierre y alta con puertos implementados. `schemas.py` contiene solo metadatos A02 derivados de entrada shared; pedidos/salidas usan DTO S2-01. POST de alta retorna 503 sin adaptadores reales. |
| `backend/alembic/versions/e7c9a1b3d5f0_crea_comandas.py` | Migración M4 existente: conservar, no generar otra para recrear las tablas. |
| `backend/alembic/env.py` | Ya registra `app.modules.atencion.models`; no requiere otro registro para esta ubicación. |
| `backend/app/main.py` | Router M4 ya registrado bajo `API_PREFIX`; no expone el fake. |
| `frontend/src/modules/atencion/{api,types}.ts` | Implementados los tipos wire S2-01, importes string, estados/paginación y funciones crear/listar/pendientes/cerrar mediante cliente compartido. |
| `frontend/src/modules/atencion/pages/AtencionPage.tsx`, `frontend/src/modules/atencion/components/` | Formulario multilínea producto/menú, filtros, tabla, paginación y diálogo de cierre con aviso previo; consulta A01 y navegación real siguen pendientes. |
| `backend/tests/modules/atencion/`, `frontend/src/modules/atencion/**/*.test.tsx` | Pruebas nuevas por criterio y regresiones del cliente. |

## Interfaces propuestas y pruebas RED

| Interfaz | Resultado propuesto | Condición para fijarla |
| --- | --- | --- |
| `POST /api/v1/comandas` con `ComandaCrear` compartido | Ruta con puertos obligatorios; 503 sin adaptadores reales. Con dependencias sustituidas solo en pruebas: 201 compartido y A01 409 con `detalle/comanda_id`. | Adaptadores reales M1/M2/M3, consulta/presentación A01 y validaciones HTTP integradas completas pendientes. |
| `GET /api/v1/comandas?mesa_id=&estado=&limit=&offset=` | Implementado: `200 Pagina[ComandaResumen]`; filtros inválidos `422`; sin coincidencias `items=[]`. Orden S2-01 `fecha_hora DESC, id DESC`; límites 50/100. | Pendientes número/sector con M3 y adaptación frontend; no bloquean el listado backend autorizado. |
| `POST /api/v1/comandas/{id}/cerrar` | Implementado: `200 ComandaSalida`; no ABIERTA `409 detalle`, pendientes `409 detalle/comanda_id/pendientes`, inexistente `404`, ID inválido `422`. | Navegación real y consumo M6 pendientes. La consulta previa se realiza desde el frontend. |
| `GET /api/v1/comandas/{id}/pendientes` | Implementado: `200 comanda_id/pendientes`; sin pendientes lista vacía; inexistente `404`. Solo lectura. | No implementa gestión ni marcado de entregas ni cambia DTO compartido. |

**Strict TDD (`openspec/config.yaml`):** `apply-progress.md` conserva los ciclos de persistencia, listado y cierre local (lote anterior: 53 passed). La corrección de compatibilidad agrega dos regresiones HTTP RED→GREEN para fechas distintas y empate, con paginación; router/repositorio: 35 passed. Son subconjuntos focalizados, no suite global ni HU completa. El backend de listado cubre escenarios de #55, no su interfaz; servicio/router prueban transición, rechazos y rollback locales, no A02 integrado ni consumo M6. Para alta e integración siguen pendientes pruebas por CA de #52/#58, rollback Comanda/Mesa, concurrencia A01 e IDs A01/A02. El fake no sustituye servicio real; E2E no configurado.

## Matriz de amenazas de límites de ejecución

El diseño añade rutas **HTTP de negocio**, no selección de repositorios ni enrutamiento de comandos/procesos. Matriz de `sdd-design/references/threat-matrix.md`:

| Límite | Aplicabilidad y motivo | Conducta/prueba RED específica |
| --- | --- | --- |
| Rutas de archivos semejantes a documentación | N/A: no se clasifican ni ejecutan rutas de archivos. | No corresponde. |
| Selección de repositorio Git | N/A: no se elige repositorio para comandos. | No corresponde. |
| Estado de commit | N/A: no se automatizan commits. | No corresponde. |
| Estado de push | N/A: no hay envío remoto. | No corresponde. |
| Comandos de PR | N/A: un solo PR es estrategia de entrega, no automatización de PR. | No corresponde. |

Para las rutas HTTP sí se planifican pruebas RED de entradas inválidas, permisos cuando se habilite autenticación (D-13), errores sin filtración y ausencia de mutaciones en conflicto, en la estrategia anterior; no se confunden con la matriz de ejecución.

## Migración, reversión y revisión

La migración Alembic M4 ya existe y tiene upgrade/downgrade probado en SQLite temporal; no usar `create_all` como despliegue. **Supuesto:** con datos persistidos, no ejecutar downgrade destructivo sin respaldo y aprobación; revertir router/cliente coordinadamente y preservar historia. CA06 sigue bloqueado por origen/cálculo de catálogo. Presupuesto **400 líneas cambiadas**, un solo PR, `size:exception` condicional autorizada; tareas pronostican por lado y total sin dividir el cambio.

## Preguntas abiertas y puerta previa a implementación

- [ ] **Bloqueante — navegación A02:** GET de lectura/409 estructurado y aviso previo implementados; falta pantalla real de marcado. No requiere modificar el DTO compartido para el alcance local ni implementar HU-M4-08.
- [ ] **Bloqueante — integración A01:** acordar error que devuelva el ID de la Comanda existente y lectura para consultarla, incluso con altas concurrentes; el DTO de salida ya contiene `id`, el error del fake no.
- [ ] **Bloqueante — M3:** acordar identidad número/sector, ocupación transaccional, concurrencia y Mesa OCUPADA sin otra ABIERTA; no tocar Salón unilateralmente.
- [ ] **Bloqueante — M1/M2/M5/M6:** origen de precio/promoción, fórmula y redondeo del descuento absoluto (por unidad o por línea), validación de la referencia escalar Reserva y contrato M4 de lectura para facturar; comprobar dependencias de planificación no verificadas. La ubicación de los modelos M4 ya está aprobada, no la interfaz externa.
- [ ] Acordar zona local de presentación, serialización/errores de futuras superficies integradas y concurrencia. Listado/cierre local ya serializan UTC mediante DTO; el cierre rechaza ANULADA y el listado conserva orden S2-01. Esto no resuelve todas las reglas de integración.

**Puerta vigente:** 9/30 completas; listado frontend local y confirmación de cierre implementados. Alta integrada, consulta/presentación A01, navegación A02, incorporación real y aceptación M5/M6 pendientes. Formulario y ruta de alta se prueban con dobles; sin adaptadores reales el POST da 503. No declarar el cambio entero completo ni listo para archivo; preservar evidencia histórica.
