# Avance de implementación: Comandas M4

> **Continuación vigente sin delegación:** frontend local de crear/listar/cerrar y A02 estructurado implementados. Se conservan modelos, migración y DTO/stub S2-01; los dobles solo existen en pruebas. Alta HTTP retorna 503 sin adaptadores reales y permite verificar el servicio real al sustituir sus puertos únicamente en tests. No se implementan HU-M4-08 ni facturación; la navegación a gestión de entregas sigue pendiente.

**Resultado acumulado vigente:** 9/30 completas (1.1, 2.4, 2.5, 3.1–3.3, 3.5–3.6, 4.2). El frontend consulta información A02 antes de confirmar y tras conflicto. El cierre bloquea con datos estructurados; listado distingue vacío total/desplazado. Formulario y POST de alta se prueban con dobles, no certifican M1/M2/M3. Quedan pendientes consulta/presentación A01, navegación A02, incorporación posterior y M6. Historial conservado; 76 pruebas backend focalizadas y controles Ruff correctos en esta tanda. Sin suites completas ni cobertura global, commits o PR.

**Corrección vigente de compatibilidad:** listado por `fecha_hora DESC, id DESC` antes de paginar, reutilizando el orden S2-01; reemplaza el supuesto histórico de ID ascendente. Regresión focalizada de esta tanda: 35 passed, 1 warning preexistente; Ruff correcto. No se completa ninguna tarea adicional. La evidencia exacta está al final.

**Lectura del historial:** las secciones de evaluación y continuaciones anteriores conservan sus resultados tal como ocurrieron (incluidos 3/30, ausencia entonces de servicio/router y supuesto de orden). No representan el estado vigente; las autorizaciones posteriores y esta corrección los sustituyen solo en su alcance explícito.

## Tareas

| Estado | Tareas | Motivo |
| --- | --- | --- |
| Completa | 1.1 | Revisión y aprobación funcional explícitas de las tres especificaciones y sus 16 CA; no se modificó su contrato. |
| Bloqueadas para integración, no para este lote local | 1.2–1.6 | Faltan acuerdos de consulta A01, entregas y navegación A02, Mesa M3, catálogo M1/M2, origen M5, facturación M6 y las restantes decisiones de datos/API. |
| Completas en esta continuación | 2.4–2.5 | RED monetario/UTC/downgrade confirmado antes de crear modelo y migración; GREEN y refactor verificados en SQLite temporal. |
| Completas en el lote independiente actual | 3.1–3.3 | Listado backend paginado y filtrado, pruebas RED/GREEN y refactor focalizados. |
| Completas en el lote frontend local | 3.5–3.6, 4.2 | API/tipos/pantalla locales, distinción de vacíos y confirmación previa al cierre con A02. |
| Parciales | 2.1–2.2, 2.6–2.8, 3.4, 4.1, 4.4–4.6 | Alta con puertos, A01 HTTP, A02 estructurado y aviso previo probados; faltan adaptadores, consulta/presentación A01, navegación real y componentes integrados. |
| Pendientes | 2.3, 4.3, 5.1–5.4 | Validación HTTP de alta completa, incorporación posterior, contratos externos y verificación global futura. |

## Evaluación previa de la unidad aislada (conservada)

En la tanda anterior no se escribió código de producción ni se añadió una prueba: ni el modelo persistente completo ni una migración parcial constituían aún una unidad independiente. La identidad de Mesa (número/sector frente a ID), la referencia de promoción histórica, la representación de dinero y la procedencia de Reserva/Mozo están pendientes en el diseño y las tareas 1.4–1.6; la ubicación de los modelos en M4 fue aprobada posteriormente. Fijar la precisión del dinero o del instante ahora convertiría propuestas en decisiones de esquema. `backend/alembic/env.py` ya importa `app.modules.atencion.models`; no hace falta registrar el modelo otra vez. El contrato S2-01 es provisional y no autoriza reutilizarlo como esquema productivo. Tampoco hay un contrato autónomo de entrada/salida suficiente para `schemas.py` sin fijar esas decisiones.

**Trabajo parcial en 2.5:** se inspeccionaron el marcador de modelos M4, el registro existente de Alembic, las entidades disponibles y el diagrama. No se implementó ni se marcó completa la tarea 2.5: requiere la prueba RED de 2.4 y un esquema acordado. Ningún CA se declara cubierto por código.

## Continuación local: RED estructural de 2.4

Se agregaron cuatro pruebas en `backend/tests/modules/atencion/test_migracion.py`. La fixture `db` crea por prueba una base SQLite temporal mediante migraciones Alembic hasta `head`; `crear_motor` activa `PRAGMA foreign_keys=ON`. Las aserciones previstas inspeccionan nombres de tablas y columnas estructurales, las cuatro FK permitidas (y ninguna para Reserva/Promoción), los CHECK de cantidad y XOR y la unicidad parcial de ABIERTA por Mesa. La prueba del índice también inspeccionaría su predicado en `sqlite_master`. Por ahora ninguna prueba alcanza las aserciones posteriores a la presencia de tablas. No se usó `create_all`, no se alteraron tablas ajenas y no se asignó precisión monetaria ni temporal.

**RED observado:** `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py` desde `backend/` → salida no cero, **4 failed, 1 warning**; las cuatro aserciones fallan por tablas M4 ausentes después de la migración hasta `d6b7c8e9f0a1`. `-o addopts=''` evita que el umbral global de cobertura enmascare estas fallas de aserción; no modifica la configuración ni acredita cobertura. `.venv/bin/ruff check tests/modules/atencion/test_migracion.py && .venv/bin/ruff format --check tests/modules/atencion/test_migracion.py` → salida cero, `All checks passed!` y `1 file already formatted`. Los primeros intentos con `pytest` y `ruff` sin entorno virtual fallaron con `command not found`; se repitieron con los ejecutables existentes en `backend/.venv/bin/`.

**Límite para GREEN:** faltan la escala numérica M4 y la semántica por unidad o línea del descuento histórico, además de zona y precisión del instante; no se puede completar el RED de esos datos sin definirlos. Confirmar también la precedencia de Alembic antes de elegir `down_revision` de una revisión nueva y probar upgrade/downgrade solo en base temporal. La cadena observada en la fixture alcanza `d6b7c8e9f0a1` tras las tablas Mesa/Producto/Menú; no equivale a un plan de migración aprobado. Sin RED completo ni decisiones de esquema, no se crea migración ni modelo, y 2.4/2.5 quedan pendientes.

## Work Unit Evidence

| Unidad | Prueba focalizada y resultado exacto | Escenario de ejecución y resultado exacto | Límite de reversión |
| --- | --- | --- | --- |
| Revisión funcional 1.1 (sin código) | N/A: aprobación humana, no unidad ejecutable; no se corrieron pruebas. | N/A: sin frontera de ejecución para esta tarea de aprobación. | Revertir únicamente la casilla 1.1 y este informe si se retira la aprobación; no se alteró la aplicación. |
| Persistencia aislada (evaluación anterior, bloqueada) | No ejecutada en la tanda anterior: faltaba un contrato verificable para escribir RED; no existía un resultado de prueba. | No ejecutado en la tanda anterior. | No se modificaron modelos, migraciones ni esquemas. |
| RED estructural 2.4 (parcial, no entregable GREEN) | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py`: 4 failed por ausencia de tablas; es RED intencional, no aprobación de 2.4. | SQLite temporal con migraciones `head`: falla la inspección de tablas M4; sin frontera productiva implementada para ejecutar GREEN. | Retirar exclusivamente `backend/tests/modules/atencion/test_migracion.py` y las notas de esta continuación; conservar la aprobación 1.1 y su evidencia. |

## TDD Cycle Evidence

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 (aprobación humana) | N/A | N/A | N/A | N/A: sin cambio productivo | N/A | N/A | N/A |
| 2.4–2.5 (evaluación anterior) | No creado en la tanda anterior | Integración prevista | No ejecutada entonces | No escrito ni observado entonces | No ejecutado | No ejecutado | No ejecutado |
| 2.4 (subconjunto estructural) | `backend/tests/modules/atencion/test_migracion.py` | Integración SQLite/Alembic | N/A: archivo nuevo; sin cambios productivos | 4 aserciones fallidas por tablas ausentes, comando focalizado arriba | No ejecutado: decisiones esenciales pendientes | No ejecutado: faltan casos de importes/fecha/downgrade | No ejecutado: no hubo GREEN |
| 2.5 (modelo/migración) | N/A | Integración prevista | N/A: no se modificó producción | RED completo de 2.4 pendiente | No implementado | No ejecutado | No ejecutado |

## Siguiente paso (evaluación anterior, conservada)

Coordinar 1.2–1.6 y actualizar las especificaciones y el diseño en su fase correspondiente para cerrar los contratos de datos e integración. Completar el RED de importes, fecha y downgrade, y solo después implementar el GREEN completo de modelos y migración con una revisión Alembic verificada. No se ejecutaron suites completas, normalizadores, llamadas remotas ni verificaciones ajenas al lote independiente.

## Continuación histórica: persistencia M4 aislada

**Estado vigente:** se verificó un único `head` Alembic `d6b7c8e9f0a1` y la cadena hasta Mesa/Producto/Menú antes de crear la revisión `e7c9a1b3d5f0` con `down_revision=d6b7c8e9f0a1`. Los cuatro tests RED originales quedaron intactos. Se añadieron seis casos focalizados: precisión de las dos columnas `Numeric(10, 2)`, conservación de importes tras cambiar el catálogo, instante UTC autogenerado leído con zona, normalización de un offset distinto, downgrade sobre datos temporales y unicidad parcial efectiva con dos estados (este último como triangulación tras GREEN). Solo las tres FK externas verificadas y la FK interna están presentes. Reserva y Promoción permanecen escalares, sin relación ORM.

**Supuesto técnico local para revisar con el equipo:** `fecha_hora` se codifica en M4 como texto ISO 8601 de longitud 32 con seis cifras de microsegundos y offset explícito `+00:00`; `InstanteUTC` normaliza entradas conscientes a UTC y reconstruye el instante consciente al leer, rechazando valores sin zona o con offset almacenado distinto de UTC. No se cambia la política temporal de otros modelos; la presentación local, fórmula y alcance por unidad/línea del descuento y serialización HTTP siguen pendientes. El esquema almacena el importe histórico provisto al crear, pero no obtiene ni calcula el precio/promoción del catálogo: esa lógica de alta sigue bloqueada.

**RED observado:** antes de tocar producción, `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py` → **8 failed, 1 passed, 1 warning**: cuatro fallos originales por tablas ausentes; otros por ausencia de tabla/modelos. Se corrigió una aserción de downgrade que pasaba sin haber migrado nada: `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py -k downgrade` → **1 failed, 8 deselected, 1 warning** por ausencia de tablas M4. Ese paso no modificó las cuatro pruebas originales. Después se crearon modelo y revisión, sin `create_all` ni migración de bases reales.

**GREEN y REFACTOR observado:** `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py` → **9 passed, 1 warning**. Tras refactor de formato y triangulación del índice parcial y downgrade con una Comanda temporal, `.venv/bin/ruff check app/modules/atencion/models.py alembic/versions/e7c9a1b3d5f0_crea_comandas.py tests/modules/atencion/test_migracion.py && .venv/bin/ruff format --check app/modules/atencion/models.py alembic/versions/e7c9a1b3d5f0_crea_comandas.py tests/modules/atencion/test_migracion.py && .venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py` → **Ruff sin errores, 3 archivos formateados, 10 passed, 1 warning**. La advertencia preexistente de Starlette/httpx no proviene de la migración. No se corrieron suites completas ni CI por instrucción expresa.

### Work Unit Evidence (continuación)

| Unidad | Prueba focalizada y resultado exacto | Escenario de ejecución y resultado exacto | Límite de reversión |
| --- | --- | --- | --- |
| Persistencia M4 2.4–2.5 | Comando focalizado anterior: 10 passed, 1 warning; Ruff check y format --check: correctos. | Fixture `db` migra SQLite temporal hasta la nueva cabeza con FK activadas; crea Mesa/Producto/Comanda/Detalle, cambia precio de catálogo y recupera instantáneas; segunda prueba abre/cierra índices y otra revierte la migración en base temporal con una Comanda, preservando Mesa. 10/10. | Retirar únicamente `backend/app/modules/atencion/models.py` (restaurar marcador), `backend/alembic/versions/e7c9a1b3d5f0_crea_comandas.py` y las pruebas añadidas a `backend/tests/modules/atencion/test_migracion.py`; conservar el RED estructural previo y la aprobación 1.1. En bases con datos reales no ejecutar downgrade sin plan y respaldo aprobados. |

### TDD Cycle Evidence (continuación)

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.4–2.5 | `backend/tests/modules/atencion/test_migracion.py` | Integración SQLite/Alembic | Cuatro RED estructurales previos reconfirmados: 4 failed; archivo nuevo no tenía verde previo que proteger. | 8 failed/1 passed al añadir dinero, UTC y downgrade; tras corregir prueba trivial de downgrade, 1 failed/8 deselected. | 9 passed tras modelo y revisión. | Índice parcial acepta CERRADA y rechaza segunda ABIERTA; downgrade con Comanda temporal conserva Mesa: 10 passed. | Formato y nombres ajustados; Ruff y 10 passed nuevamente. |

**Pendiente:** 1.2–1.6 y alta/listado/cierre de M4, además de la conversión a hora local en una futura presentación. No se interpreta el GREEN de persistencia como cumplimiento de los 16 criterios de aceptación. `size:exception` se mantiene condicionada al diff total redactado del PR único.

## Continuación histórica: consulta interna M4 por ID (sin completar tarea compuesta)

**Estado acumulado: 3/30 tareas completas (1.1, 2.4 y 2.5).** Se conservan íntegros el historial RED/GREEN y la migración anteriores. La unidad nueva es `repository.obtener_comanda(db, comanda_id)`: lectura ORM parametrizada de una Comanda con sus detalles históricos, sin commit ni contrato HTTP/DTO. No se implementó mapeo compartido, servicio, router, filtro público, bloqueo A01/A02 ni integración con otros módulos. 2.6 y 2.7 continúan pendientes. El aviso previo, la navegación y los IDs de error requieren coordinación; tampoco se declara satisfecho ninguno de los 16 CA. El PR único conserva la excepción de tamaño condicional, sin commits ni operaciones remotas.

### Work Unit Evidence (consulta interna)

| Unidad | Prueba focalizada y resultado exacto | Escenario de ejecución y resultado exacto | Límite de reversión |
| --- | --- | --- | --- |
| Lectura interna de Comanda con detalles | Antes: `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_migracion.py` → 10 passed, 1 warning. RED: `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_repository.py` → 1 failed (`AttributeError: repository.obtener_comanda` ausente), 1 warning. GREEN: mismo comando → 1 passed, 1 warning. Triangulación → 2 passed, 1 warning. Tras refactor: `.venv/bin/ruff check app/modules/atencion/repository.py tests/modules/atencion/test_repository.py && .venv/bin/ruff format --check app/modules/atencion/repository.py tests/modules/atencion/test_repository.py && .venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_repository.py` → Ruff sin errores, 2 archivos formateados, 2 passed, 1 warning. `-o addopts=''` evita el umbral de cobertura global en este lote; no modifica configuración. | Fixture `db` migra SQLite temporal hasta `head`; inserta Mesa y Producto de prueba, consulta Comanda persistida con detalle monetario, y comprueba que un ID ajeno devuelve `None` aun existiendo otra Comanda: 2/2. No existe frontera HTTP para esta unidad interna. | Revertir solo `backend/app/modules/atencion/repository.py` al marcador anterior, retirar `backend/tests/modules/atencion/test_repository.py` y esta anotación de progreso/tareas. Conservar modelos, migración, pruebas de migración y las tres tareas completas anteriores. |

### TDD Cycle Evidence (consulta interna)

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Subconjunto autónomo de 2.6 (tarea compuesta pendiente) | `backend/tests/modules/atencion/test_repository.py` | Integración SQLite/Alembic | Migración existente: 10 passed, 1 warning antes de editar el marcador de repositorio; pruebas nuevas sin baseline propia. | Primera prueba de lectura histórica escrita antes de producción: 1 failed por función inexistente, 1 warning. | Consulta por ID con `selectinload` y datos persistidos: 1 passed, 1 warning. | Segunda prueba con otra Comanda presente e ID inexistente: 2 passed, 1 warning; sin filtración ni mutación. | Se extrajo fixture local repetida y se formateó la consulta; Ruff sin errores y 2 passed, 1 warning. |

**Siguiente paso:** acordar 1.2–1.6 antes de ejecutar servicios o rutas. Los mapeadores internos a DTO compartidos pueden abordarse en otra unidad RED→GREEN sin atribuir aprobación de HTTP o `DetalleComandaSalida.id`; no completar 2.6/2.7 con esta lectura parcial. No se ejecutaron suites completas, CI, commits ni integración externa.

## Continuación histórica autorizada: listado backend independiente

La instrucción actual reemplaza la puerta general anterior solo para listado y cierre local. Se registra el router M4 en `main.py` bajo el prefijo existente, sin cambios globales de errores ni otros routers. `GET /api/v1/comandas` usa `Pagina[ComandaResumen]`, `EstadoComanda` y paginación compartidos; no se modifica `shared/` ni se crean DTO paralelos. **Supuesto local:** conjunción de filtros, ID ascendente y serialización UTC del DTO; no resuelve número/sector ni zona de presentación. 3.1–3.3 completas; 3.4–3.6 siguen pendientes por frontend.

### Work Unit Evidence (listado)

| Unidad | Comando focalizado y resultado | Ejecución real | Límite de reversión |
| --- | --- | --- | --- |
| Listado backend 3.1–3.3 | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py`: 22 passed, 1 warning; Ruff check sobre los seis archivos tocados: sin errores. | El mismo comando usa TestClient sobre la aplicación registrada y SQLite temporal migrado: sin filtro, filtros individuales/conjuntos, vacíos reales/filtrados/desplazados y 422. 22/22. | Retirar solo listado de repository/service/router y registro M4 de main.py, pruebas nuevas de listado y fixture local si queda sin consumidores; preservar lectura por ID, modelos, migración y pruebas previas. |

### TDD Cycle Evidence (listado)

| Tarea | Archivo | Capa | Safety Net | RED observado | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1–3.3: listado base | `test_router.py` | HTTP + SQLite/Alembic | `test_migracion.py test_repository.py`: 12 passed, 1 warning antes de producción. | 2 failed por 404 en ruta ausente. | 2 passed, 1 warning. | Vacío real y dos estados presentes. | Formato verificado junto al lote de filtros: 22 passed. |
| 3.1–3.3: filtros/paginación/validación | `test_router.py` | HTTP + SQLite/Alembic | 2 passed antes de ampliar. | 20 failed, 2 passed: parámetros ignorados y 200 en vez de 422. | 22 passed, 1 warning. | Ocho variantes válidas y doce inválidas, incluyendo conjunción sin coincidencias y texto de inyección rechazado. | Ruff format en cinco archivos; Ruff check sin errores y 22 passed, 1 warning nuevamente. |

Todos los comandos se ejecutaron desde `backend/`; `-o addopts=''` limita la ejecución al lote solicitado, sin modificar umbrales/configuración ni acreditar cobertura global. Advertencia preexistente Starlette/httpx conservada.

## Continuación histórica autorizada: cierre local backend

**Resultado:** `POST /api/v1/comandas/{comanda_id}/cerrar` devuelve `200 ComandaSalida` compartida; inexistente `404`, no ABIERTA (incluida ANULADA) o pendientes `409`, ID inválido `422`, siempre con el error `detalle` existente. No hay endpoint de detalle/prevalidación, flag de bypass, IDs públicos inventados ni modificaciones de entrega. Se actualiza únicamente el estado de Comanda y se confirma una vez; se conservan importes históricos, referencias, observaciones e instante. No se libera Mesa ni se invocan servicios externos, facturación o pagos. `model_validate(..., from_attributes=True)` reutiliza los DTO anidados y sus enumeraciones sin duplicarlos ni añadir el ID ausente de detalle.

**Hallazgos corregidos mediante RED:** `selectinload` no refresca detalles ya cargados en la sesión: se añadió `populate_existing=True` a la lectura existente y se comprobó el cambio persistido por otra sesión antes del cierre. La validación de salida fuera de `try` dejaba CERRADA en memoria ante datos incompatibles con el DTO: mutación, mapeo y commit quedan dentro del límite de rollback. No se afirma protección concurrente integral frente a cambios entre lectura y escritura; tampoco se simula aceptación de A02/M6.

### Work Unit Evidence (cierre local)

| Unidad | Comando focalizado y resultado exacto | Ejecución real y resultado | Límite de reversión |
| --- | --- | --- | --- |
| Servicio y repositorio de cierre local | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_service.py`: último lote previo a triangulación 8 passed, 1 warning; resultado final ampliado incluido abajo. | SQLite temporal migrado: transición persistida, inexistente, CERRADA/ANULADA, pendientes sin autoentrega, otra sesión cambia entrega, fallo de mapeo y commit con rollback. La triangulación final agrega pendientes en ambas posiciones de líneas repetidas y estado cambiado por otra sesión. | Retirar `service.cerrar_comanda`, solo `populate_existing` de la lectura y `test_service.py`; preservar lectura anterior, listado, modelos/migración y sus pruebas. |
| Frontera HTTP de cierre | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py -k cerrar`: 9 passed, 22 deselected, 1 warning. | TestClient sobre aplicación real registrada + SQLite migrado: 200 con salida y dinero serializados, segundo cierre y no ABIERTA/pendientes 409, inexistente 404 e IDs inválidos 422. 9/9. | Retirar solo ruta POST y pruebas de cierre del router, junto al servicio si se revierte la unidad completa; mantener GET y registro M4. No revertir datos ni ejecutar downgrade. |

### TDD Cycle Evidence (cierre local)

| Subunidad / tarea original parcial | Archivo | Capa | Safety Net | RED observado | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Transición local / 4.2, 4.5 | `test_service.py` | Servicio + SQLite | Listado existente: 22 passed; archivo nuevo. | 2 failed: función ausente, antes de producción. | 2 passed. | Éxito con DTO/historia y recurso ajeno inexistente. | Función breve; formato y lote final verdes. |
| Reglas locales / 4.5 | `test_service.py` | Servicio + SQLite | 2 passed. | 3 failed, 2 passed: faltaban rechazos de CERRADA, ANULADA y PENDIENTE. | 5 passed. | Dos líneas del mismo producto: pendiente primero o segundo, sin autoentrega de ninguna; lote final verde. | Ruff y lote final verdes. |
| Relectura de pendientes / 4.5 | `test_service.py`, regresión `test_repository.py` | Dos sesiones SQLite | 5 passed y repositorio previo protegido. | `-k revalida`: 1 failed, 5 deselected por caché obsoleta. | Servicio + repositorio: 8 passed. | Otro estado de Comanda modificado externamente también se revalida; lote final verde. | `populate_existing` en consulta existente, sin otro servicio; regresión final verde. |
| Rollback de mapeo / 4.5–4.6 | `test_service.py` | SQLite; un reemplazo local de commit para fallo | Servicio/repositorio: 8 passed. | `-k 'mapeo or fallo_commit'`: 1 failed, 1 passed, 6 deselected. Falla de commit ya cubierta por implementación; no se atribuye RED a ese caso. | Servicio: 8 passed al incluir mapeo en try/rollback. | Fallos diferentes de validación y escritura. | Formato y lote final verdes. |
| HTTP / 4.2, 4.4, 4.5 | `test_router.py` | HTTP + SQLite | GET: 22 passed; servicio: 8 passed. | `-k cerrar`: 9 failed, 22 deselected por ruta ausente (también se verifica mensaje de 404). | 9 passed, 22 deselected. | Nueve casos, con segundo cierre, ausencia de ID inventado y entrada inválida. | Ruff format y regresión final: 53 passed. |

### Verificación focalizada final

Desde `backend/`:

```bash
.venv/bin/ruff check app/main.py app/modules/atencion/repository.py app/modules/atencion/service.py app/modules/atencion/router.py tests/modules/atencion/conftest.py tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py
.venv/bin/ruff format --check app/main.py app/modules/atencion/repository.py app/modules/atencion/service.py app/modules/atencion/router.py tests/modules/atencion/conftest.py tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py
.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py tests/modules/atencion/test_repository.py tests/modules/atencion/test_migracion.py
```

**Resultado exacto:** Ruff `All checks passed!`; formato `7 files already formatted`; pytest **53 passed, 1 warning in 197.50s**, salida cero. Son 41 casos nuevos (31 HTTP y 10 servicio) y 12 previos (2 repositorio y 10 migración), todos de M4. Sin suite global, cobertura global, lint-imports, frontend ni cambios de CI. TestClient y SQLite migrado constituyen el escenario de ejecución, no solo dobles. `git diff --check` sin errores. `rg` no está instalado para conteo; se utilizó `wc -l` sin modificar archivos.

**Carga de revisión:** diff backend acumulado contra HEAD, incluyendo el trabajo anterior y archivos sin seguimiento: **981 líneas redactadas** (196 adiciones + 4 eliminaciones de archivos seguidos, más 781 líneas nuevas de migración/pruebas). Supera 400 global y 800 backend; se conserva `size:exception` aprobada, no se recortan pruebas ni se crean cadenas. El conteo no incluye los documentos OpenSpec, que también requieren revisión y aumentan el total; no equivale al diff de un PR creado. Modelos y migración preexistentes quedaron intactos en esta tanda.

**Cierre honesto:** 6/30 tareas completas; 2.6/2.7 y 4.2/4.4/4.5/4.6 parciales. Backend de listado cubre los cuatro escenarios de #55 y D-27, no la pantalla completa. Cierre solo cumple transición y validaciones locales: siguen pendientes confirmación de interfaz, incorporación posterior (#58 CA02), IDs/aviso previo/navegación A02 (#58 CA03), y lectura/aceptación M6 (#58 CA04). Alta y A01 siguen bloqueados por contratos M1/M2/M3/M5/M6. Siguiente paso: devolver al orquestador para coordinar esos acuerdos; no archivar ni declarar la HU full-stack completa.

## Corrección vigente: compatibilidad S2-01 y estado documental

**Resultado:** correcciones asignadas completas, acumulado sin cambios en **6/30**. `repository.listar_comandas` ahora ordena por `Comanda.fecha_hora.desc(), Comanda.id.desc()` antes de paginar. La referencia S2-01 se verificó localmente en `backend/tests/shared/fakes/comanda.py:110` (`sort` por fecha/ID con `reverse=True`), sin editarla. No es una nueva decisión de negocio. Los modelos y la migración M4 quedan intactos.

### Comandos y resultados exactos

Todos desde `backend/`, salvo el control Git indicado. `-o addopts=''` evita cobertura global en esta ejecución focalizada; no cambia configuración ni umbrales.

| Paso | Comando ejecutado | Resultado observado |
| --- | --- | --- |
| Safety Net, antes de editar | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py tests/modules/atencion/test_repository.py` | Salida 0; **33 passed, 1 warning in 117.06s**. |
| RED, antes de producción | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py -k preserva_orden_s2_01` | Salida 1; **2 failed, 31 deselected, 1 warning in 7.30s**. Con fechas distintas se obtuvo `[1, 2, 3]` en vez de `[2, 3, 1]`; con empate, en vez de `[3, 2, 1]`. Fallos reales de aserción de orden, no de infraestructura. |
| GREEN, tras cambiar solo el orden del repositorio | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py -k preserva_orden_s2_01` | Salida 0; **2 passed, 31 deselected, 1 warning in 7.05s**; también pasan las aserciones de paginación posterior al orden. |
| Formato focalizado | `.venv/bin/ruff format app/modules/atencion/repository.py tests/modules/atencion/test_router.py` | Salida 0; **1 file reformatted, 1 file left unchanged**. |
| Lint focalizado | `.venv/bin/ruff check app/modules/atencion/repository.py tests/modules/atencion/test_router.py` | Salida 0; **All checks passed!** |
| Comprobación de formato | `.venv/bin/ruff format --check app/modules/atencion/repository.py tests/modules/atencion/test_router.py` | Salida 0; **2 files already formatted**. |
| Regresión tras formato | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py tests/modules/atencion/test_repository.py` | Salida 0; **35 passed, 1 warning in 131.56s**. Incluye las rutas existentes de cierre; no es una suite global. |
| Higiene del diff, desde raíz | `git diff --check` | Salida 0, sin errores. |

La única advertencia sigue siendo la de Starlette/httpx preexistente; no se agregan dependencias para corregirla fuera de alcance. Las pruebas de listado existentes ahora tienen fechas explícitas para evitar dependencia del reloj y expectativas compatibles con S2-01.

### Work Unit Evidence (corrección)

| Unidad | Prueba focalizada y resultado | Escenario real y resultado | Límite de reversión |
| --- | --- | --- | --- |
| Restaurar orden S2-01 y sincronizar estado | Comando `-k preserva_orden_s2_01` anterior: RED 2 failed → GREEN 2 passed; regresión final 35 passed y Ruff correcto. | TestClient sobre aplicación con router M4 registrado y SQLite temporal migrado: tres Comandas con fechas distintas, y otras tres con fecha empatada; GET completo y `limit=1&offset=1` conservan orden, total y ventana correctos en ambos casos. | Revertir solo el cambio de `order_by` en `backend/app/modules/atencion/repository.py`, las dos regresiones y ajustes de fechas/expectativas en `backend/tests/modules/atencion/test_router.py`, y las notas de esta corrección en los cinco documentos OpenSpec afectados. Conservar listado/cierre previos, modelos, migración y evidencia anterior; sin reversión de datos. |

### TDD Cycle Evidence (corrección)

| Unidad | Archivo | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compatibilidad de orden del listado / mantenimiento de 3.3 | `backend/tests/modules/atencion/test_router.py` | HTTP + SQLite/Alembic | 33 passed antes de editar. | Dos casos escritos y ejecutados antes del cambio productivo: 2 failed por ID ascendente. | Cambio mínimo de una línea de repositorio: 2 passed. | Fechas distintas (prioridad temporal opuesta a ID) y empate (ID descendente); ambos comprueban ventana paginada y total. | Formato de prueba y datos temporales explícitos, sin más abstracciones: Ruff correcto, regresión de 35 passed. |

### Afirmaciones corregidas y límites

- `design.md`: estado 6/30, servicio/mapeo/router registrados para listado/cierre local; tablas, flujos, interfaces y puerta actualizados. La puerta histórica de 3/30 queda etiquetada como tal.
- `proposal.md`: ya no declara ausentes servicio, router ni mapeo; distingue implementación local de integraciones futuras y conserva la propuesta original como antecedente.
- `specs/comanda-listado/spec.md`: documenta GET implementado, filtros/paginación/validación y orden S2-01; no afirma pantalla lista ni altera los cuatro CA.
- `tasks.md`: orden corregido en estado vigente y 3.3, resultados focalizados registrados, ninguna casilla adicional marcada. `apply-progress.md`: historial completo conservado y señalado como histórico.

**Bloqueos restantes:** alta/A01 y acuerdos M1/M2/M3/M5/M6; interfaz, IDs persistentes/aviso previo/navegación A02; incorporación posterior y lectura/aceptación de facturación. No hay bloqueo nuevo para la corrección asignada. No se tocaron frontend, `shared/`, otros módulos, modelos ni migración; no se ejecutaron suites completas, cobertura global, CI, operaciones remotas, commits, PR, RDD ni archivo.

**Revisión y devolución:** se conserva `single-pr` con `size:exception` aprobada frente al presupuesto de 400 líneas. El conteo histórico de 981 líneas backend pertenece al lote anterior y aumenta con las nuevas pruebas; los documentos OpenSpec también requieren revisión. No se ha creado ni medido un PR, ni se redujeron pruebas para caber en el presupuesto. Devolver al orquestador para los acuerdos pendientes; `next_recommended: none` para esta corrección, sin iniciar otra fase ni declarar listo para archivo.

## Continuación vigente: HU-M4-04 local con puertos obligatorios

**Resultado: partial para la HU; unidad local GREEN.** Se conservan las seis tareas completas previas y todo el historial anterior. `service.crear_comanda` requiere `MesasPort` y `CatalogoPort`, ambos `Protocol` propiedad de M4, no servicios existentes de otros responsables. No hay proveedor predeterminado, catálogo/Mesa sintéticos en producción, adaptador externo ni POST de alta. Solo se editaron `service.py`, `repository.py`, el nuevo `test_alta.py` y cinco documentos de este cambio. Modelos, migración, shared, frontend, otros módulos, listado y cierre quedan intactos.

### Conducta implementada y límites

- Revalida `ComandaCrear` antes de invocar proveedores; mantiene referencia XOR, cantidad StrictInt positiva y pedido no vacío del DTO compartido. Valida la correspondencia y entrega PENDIENTE de cada cotización, Decimal finito dentro de Numeric(10,2), signo/escala compartidos sin redondear. Reutiliza los DTO/enums S2-01, sin duplicados.
- Captura precio, descuento absoluto y promoción desde el puerto; no inventa fórmula ni determina unidad/línea. Guarda Comanda/Detalle, ABIERTA/PENDIENTE e instante UTC del sistema, sin Reserva ni cliente propios. Prueba historia de Producto y Menú con líneas repetidas y conservación al cambiar catálogo y cerrar.
- Comanda/Detalle y ocupación comparten Session/transacción; solo el servicio confirma una vez. Rollback en catálogo (incluso con escritura de prueba previa), ocupación, mapeo posterior a persistir, commit y FK. Proveedores de prueba nunca hacen commit; en la carrera, otra operación de aplicación con otra Session confirma su propia alta.
- A01 consulta antes de disponibilidad y usa `ComandaAbiertaError(ReglaDeNegocioError)` con `comanda_id`. La unicidad parcial existente protege la inserción perdedora: rollback y relectura del ganador solo para el error SQLite específico de unicidad `comandas.mesa_id`; otros IntegrityError se propagan. La consulta interna por ID permite inspeccionar el registro existente; no hay segunda inserción ni cambio de sus detalles.
- El transporte HTTP del ID, presentación A01, proveedores reales, acuerdo de promociones/identidad Mesa, zona local y aceptación externa siguen pendientes. Dos sesiones **intercaladas**, no prueba de bloqueo simultáneo integral; no se promete comportamiento frente a todos los bloqueos SQLite. Si el ganador deja de estar ABIERTA antes de releer, se conserva el error original, no se inventa un ID. 2.1/2.2/2.6/2.8 parciales, 2.7 integrada pendiente; no se declara HU completa ni lista para archivo.

### TDD Cycle Evidence (alta local)

Todos los comandos desde `backend/`. Prefijo **P** = `.venv/bin/pytest -q -o addopts=''`; ruta **A** = `tests/modules/atencion/test_alta.py`. Las abreviaturas siguientes se expanden literalmente; no son comandos nuevos ni aliases instalados. Cada ejecución tuvo la advertencia preexistente Starlette/httpx, salvo la primera prueba de cantidades con dos advertencias adicionales del serializador, eliminadas al validar antes de serializar datos inválidos.

| Subunidad / tareas parciales | Archivo / capa | Safety Net | RED ejecutado antes de producción | GREEN ejecutado | TRIANGULATE / REFACTOR |
| --- | --- | --- | --- | --- | --- |
| Alta, ocupación e historia inicial / 2.1–2.2, 2.6 | `test_alta.py`, servicio + SQLite migrado | `P tests/modules/atencion/test_service.py tests/modules/atencion/test_repository.py`: 12 passed, 1 warning, 49.28s. | `P A`: 1 failed por función ausente. | `P A`: 1 passed. | Producto/Menú, dos cantidades, con/sin promoción e historia al cierre, añadidos después; verdes sin más código. |
| A01 previo / 2.1, 2.6 | Mismo archivo/capa | Alta anterior: 1 passed. | `P A -k 'a01 or inexistente'`: 1 failed (sin ID), 1 passed (Mesa inexistente ya cubierta), 1 deselected. | `P A`: 3 passed. | Existente conserva estado, detalles, dinero y conteos; no se atribuye RED nuevo a Mesa inexistente. |
| Validación local y cotización / 2.1–2.2, 2.6 | Mismo archivo/capa | 3 passed. | `P A -k 'revalida or incompatible'`: 6 failed, 5 passed, 3 deselected. Cantidades fallaban más tarde, por lo que se fortaleció la prueba; `P A -k revalida --tb=short`: 5 failed, 9 deselected porque el proveedor recibía entrada inválida. | `P A`: 14 passed tras revalidar antes del puerto y validar cotización. | Cinco cantidades y seis cotizaciones incompatibles; XOR/vacío añadidos después, verdes con validación compartida ya implementada. |
| Carrera A01 y rollback / 2.1, 2.6 | Mismo archivo, dos sesiones reales | 14 passed. | `P A -k 'carrera or fallo' --tb=short`: 1 failed (IntegrityError sin ID), 5 passed, 14 deselected. Rollbacks ya verdes por el límite transaccional inicial, no se inventa RED para ellos. | `P A -k 'carrera or fallo'`: 6 passed, 14 deselected. | No se oculta FK inválida; cinco fases de fallo verificadas desde otra Session. |
| Precisión sin redondeo / 2.2, 2.6 | Mismo archivo/capa | Carrera/rollback: 6 passed. | `P A -k no_redondea --tb=short`: 2 failed, 20 deselected; `model_dump` redondeaba antes de validar. | `P A -k no_redondea`: 2 passed, 20 deselected. | Precio y descuento triangulan la misma regla; validación de campos nativos sin tocar DTO compartido. |
| Triangulación y formato / 2.8 parcial | Mismo archivo/capa | Ciclos anteriores verdes. | N/A: no nueva conducta productiva; se añaden regresiones de lo ya implementado. | `P A -k 'historia_de_lineas or estructura' --tb=short`: 5 passed, 22 deselected. | Ruff format dirigido: 1 file reformatted, 2 left unchanged; sin refactor funcional adicional. Regresión final: 72 passed. |

### Verificación focalizada final y Work Unit Evidence

| Evidencia | Comando exacto / escenario | Resultado |
| --- | --- | --- |
| Prueba focalizada y harness real | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_alta.py tests/modules/atencion/test_service.py tests/modules/atencion/test_repository.py tests/modules/atencion/test_router.py` | Salida 0: **72 passed, 1 warning in 274.37s**. 27 casos nuevos y 45 previos. SQLite temporal migrado, puertos de prueba, dos sesiones intercaladas y TestClient de rutas existentes; no HTTP de alta ni aceptación externa. |
| Ruff | `.venv/bin/ruff check app/modules/atencion/service.py app/modules/atencion/repository.py tests/modules/atencion/test_alta.py` | Salida 0, All checks passed! Primer intento señaló dos E501 de pruebas; corregidos con formato dirigido, sin cambiar reglas. |
| Formato | `.venv/bin/ruff format app/modules/atencion/service.py app/modules/atencion/repository.py tests/modules/atencion/test_alta.py` y luego `.venv/bin/ruff format --check app/modules/atencion/service.py app/modules/atencion/repository.py tests/modules/atencion/test_alta.py` | Salida 0: 1 archivo reformateado/2 intactos; comprobación: 3 files already formatted. Regresión de 72 después del formato. |
| Reversión independiente | Retirar solo alta, Protocol, excepción A01 y `_cotizar` de `service.py`, creación/lectura por Mesa de `repository.py`, `test_alta.py` y notas de esta tanda en cinco documentos. | Preserva listado/cierre, lectura previa por ID, modelos/migración, datos existentes y evidencia histórica. No ejecutar downgrade ni borrar Comandas. |

`-o addopts=''` evita cobertura global en estas pruebas focalizadas sin cambiar configuración ni umbrales; no se acredita cobertura. Sin suites globales, migraciones de bases reales, CI, lint global, remotos, commits, PR ni cadenas. Entrega `single-pr`, `size:exception` aprobada; el presupuesto no se fuerza reduciendo pruebas.
**Tamaño acumulado contra HEAD, no solo esta tanda:** `git diff --numstat` suma 310 líneas redactadas en archivos seguidos; `wc -l` cuenta 1099 líneas nuevas backend y 860 OpenSpec (incluyendo este renglón). Total acumulado: **1409 backend + 860 OpenSpec = 2269 líneas**; frontend sin cambios. Incluye trabajo histórico sin seguimiento, no representa un PR creado ni mide exclusivamente el lote local. Supera 400 global y 800 backend; se conserva `size:exception` aprobada sin cadenas. `git diff --check` final sin errores.

## Continuación sin delegación: A02 estructurado y frontend local

La autorización actual incorpora crear/listar/cerrar en la UI con dobles solo de prueba. No se ejecutó una nueva exploración ni se crearon subagentes. Los 16 CA originales se conservan y se distinguen de la cobertura local y las integraciones pendientes.

### Contrato y límite productivo

- S2-01 no cambia: pedidos y salidas usan sus DTO y estados. `DetallePendiente` hereda `DetalleComandaCrear` y agrega el ID como metadato de una operación M4; no redefine `ComandaSalida` ni altera tests/consumidores shared.
- `GET /api/v1/comandas/{id}/pendientes` permite leer `{comanda_id, pendientes:[{id, producto_id, menu_ejecutivo_id, cantidad}]}` sin mutar. Error A02: `409` con esos campos y `detalle`; otros errores conservan su forma. `EntregasPendientesError` deriva de `ReglaDeNegocioError` y el service no conoce HTTP.
- El frontend consulta antes de ofrecer confirmación, bloquea ante pendientes/fallo de lectura y reconsulta después del rechazo de cierre. El cliente común solo conserva el mensaje del error, por eso se recuperan metadatos mediante GET sin cambiar `shared/`.
- `POST /api/v1/comandas` usa `ComandaCrear` y los puertos obligatorios existentes. Sin adaptadores configurados responde `503 detalle`, sin crear nada. El éxito `201` y A01 `409 comanda_id` se verifican sustituyendo dependencias de FastAPI solo en tests. A01 aún no tiene consulta/presentación completa en la UI.
- Formulario multilínea producto/menú con IDs hasta disponer de selectores; sin precios/fecha arbitrarios, ni cliente propio. La pantalla lista por estados S2-01 y convierte UTC a zona del navegador solo para presentar. La fecha no se recalcula al cerrar.
- No existe gestión de entregas implementada: el diálogo informa ese pendiente y no navega a una ruta ficticia ni marca entregas. HU-M4-09 no se declara íntegra; M6 y la prohibición de incorporar productos tras cierre requieren operaciones futuras reales.

### TDD Cycle Evidence

| Unidad | RED observado antes de producción | GREEN y triangulación | Refactor y límite |
| --- | --- | --- | --- |
| Metadatos A02, lectura previa y ausencia de adaptadores | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_flujos_locales.py`: 5 failed (faltaban campos, lectura, POST y excepción con datos). | Mismo comando: 5 passed; agregando alta HTTP/A01 con puertos de prueba: 6 passed. | No se modifica contrato/stub, modelos ni migración. Se actualiza la aserción histórica de 409 de mensaje a metadatos según autorización actual. |
| Frontend crear/listar/cerrar | Node 22/Vitest `AtencionPage.test.tsx`: 7 failed por pantalla ausente; `api.test.ts`: 3 failed por funciones inexistentes. | Primer GREEN parcial: 7/10; corregidos botones submit (el componente común por defecto usa button): 10 passed. Casos adicionales de error/paginación/validación: 14 passed. | Componentes/hook separados por responsabilidad, sin desactivar límite 50 líneas ni reglas. Dobles del módulo API exclusivamente en tests. |

### Work Unit Evidence y controles

Desde `backend/`:

```text
.venv/bin/ruff check app/main.py app/modules/atencion/service.py app/modules/atencion/router.py app/modules/atencion/schemas.py tests/modules/atencion/test_flujos_locales.py tests/modules/atencion/test_router.py
.venv/bin/ruff format --check app/main.py app/modules/atencion/service.py app/modules/atencion/router.py app/modules/atencion/schemas.py tests/modules/atencion/test_flujos_locales.py tests/modules/atencion/test_router.py
.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_flujos_locales.py tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py tests/modules/atencion/test_alta.py
```

Resultado: Ruff correcto, 6 archivos formateados; **76 passed, 1 warning en 289.73s**. La advertencia Starlette/httpx es preexistente. SQLite temporal migrado y TestClient ejercen rutas reales con puertos sustituidos solo en pruebas; no se migró base productiva.

Desde `frontend/`, Node `/home/juano/.nvm/versions/node/v22.23.4/bin/node` ejecutó `node_modules/vitest/vitest.mjs run src/modules/atencion/pages/AtencionPage.test.tsx src/modules/atencion/api.test.ts`: **15 passed en 1.57s**, después de la triangulación de vacío total/estado cerrado (previamente 14 passed). ESLint focalizado `src/modules/atencion --max-warnings=0`, Prettier `--check src/modules/atencion` y `tsc --noEmit` correctos tras los últimos cambios. Prettier dirigido al módulo, sin formato ajeno. No suites completas, build ni cobertura global.

**Reversión:** retirar los nuevos flujos y componentes/tests frontend M4; retirar metadatos/lectura A02 y proveedores/ruta de alta de router/service/schemas y manejadores específicos de main junto con `test_flujos_locales.py`, restaurando la aserción anterior de error en `test_router.py`. Conservar alta local previa, listado/cierre previos, modelos/migración e historia existente. No hacer downgrade ni borrar datos. No se crean commits o PR. La excepción de tamaño del único PR se mantiene; los conteos históricos de líneas superiores no son el tamaño actualizado.

**Pendientes concretos:** adaptadores productivos M1/M2/M3, navegación de entregas, consulta/presentación A01, incorporación posterior, consumo/aceptación M5/M6 y revisión manual de suites/cobertura desde WSL. No se atribuye cobertura a una integración ausente.

## Continuación de integración visual y tag Swagger

Se inspeccionó la sección **Guía de componentes** (`frontend/src/shared/components/ComponentesPage.tsx`) antes de cambiar el listado. La pantalla M4 reutiliza `EmptyState` para colección sin registros y filtros sin coincidencias (con contenido diferente), `ErrorState` para fallos de conexión/HTTP, `Spinner` para la carga y los componentes compartidos `Table`, `Button` y `Card`. No se añadieron componentes visuales nuevos ni estilos paralelos. Un fallo del `api.ts` continúa como error y nunca se convierte en lista vacía.

El router M4 ahora agrupa sus operaciones en Swagger bajo `Atención al Público`, como tag de módulo. No se cambiaron prefijos, paths, métodos, DTO ni códigos/contratos de las rutas.

### Evidencia RED/GREEN

| Cambio | RED observado | GREEN / comprobación final |
| --- | --- | --- |
| Tag Swagger M4 | `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py -k openapi_agrupa` → 1 failed, 33 deselected: las operaciones no compartían el tag del módulo. | Mismo test focalizado incluido en la regresión final: `.venv/bin/pytest -q -o addopts='' tests/modules/atencion/test_router.py` → 34 passed, 1 warning. Paths y respuestas se prueban en el mismo archivo sin cambios de contrato. |
| Error HTTP como estado visual | Vitest focalizado antes de reemplazar el contenedor manual no encontró el heading de `ErrorState` para el fallo `HTTP 500`; el listado seguía mostrando el mensaje en un div local. | El archivo final incluye casos de error, vacío real, no coincidencias, página desplazada y carga usando estados compartidos. Vitest: `/home/juano/.nvm/versions/node/v22.23.4/bin/node node_modules/vitest/vitest.mjs run src/modules/atencion/pages/AtencionPage.test.tsx src/modules/atencion/api.test.ts` → 18 passed. |

### Calidad focalizada y límites

- Backend: `.venv/bin/ruff check app/modules/atencion/router.py tests/modules/atencion/test_router.py` y `.venv/bin/ruff format --check app/modules/atencion/router.py tests/modules/atencion/test_router.py` → correctos; 2 archivos con formato válido.
- Frontend: ESLint focalizado `src/modules/atencion --max-warnings=0`, Prettier `--check src/modules/atencion` y `tsc --noEmit` → correctos.
- No se ejecutaron suites completas, cobertura global ni build. La tarea 3.4 sigue parcial por la consulta/presentación A01 pendiente; `taskProgress` permanece 9/30. La modificación preexistente de `backend/tests/modules/menus/test_migracion.py` se preservó y no se tocó.
