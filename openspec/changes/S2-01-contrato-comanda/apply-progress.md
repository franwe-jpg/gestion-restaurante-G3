# Apply de Comanda: continuación y línea base histórica

> **Actualización 2026-10-29:** los apartados históricos siguientes corresponden al primer intento y sus dos timeouts basales; sus afirmaciones «sin implementación» y «siguiente paso: detener» no describen el estado actual. La continuación creó DTO, fake, suite y documento, y el pytest final terminó verde. Se preserva intacta la línea base sin reinterpretarla como GREEN. Véase «Continuación ejecutada» al final.

**Cambio:** S2-01-contrato-comanda · **Fecha:** 2026-10-29.
**Estado:** parcial; sin comportamiento implementado. **Modo:** Strict TDD activo, ciclos no iniciados.

## Autoridad y alcance

Primer apply real; no existe progreso previo que fusionar. El padre confirmó preflight automático/OpenSpec/single-pr y aceptación humana explícita de `size:exception` para este cambio. Delivery strategy: `exception-ok`; Chain strategy: `size-exception`, sin cadenas. No se inventó identidad de sesión ni se volvió a solicitar aprobación.

Superficies autorizadas: `backend/app/shared/contratos/comanda.py`, inicializadores mínimos necesarios, `backend/tests/shared/fakes/comanda.py`, `backend/tests/shared/test_contrato_comanda.py`, `SPRINT-2/S2-01-contrato-comanda.md` y documentación de este cambio. No se creó ninguna de las superficies de implementación/publicación. No se tocó configuración, secretos, dependencias, shared existente, conftest, otros módulos o frontend. No hubo instalaciones, llamadas remotas, staging, commits, push, PR, revisiones, delegación o continuación nativa.

La excepción de tamaño no es aceptación M5/M6 ni congelación. A01–A05 locales permiten el fake provisional; A06–A10 y acuerdos de equipo siguen abiertos. HTTP U7 no seleccionado; P4-F1–F4 fuera de alcance. No se bloqueó por falta de consumidores ni se inventaron proveedores reales.

## Línea base observada antes de comportamiento

Todos los comandos desde `backend/`, sin modificar argumentos de cobertura ni umbrales.

| Comando exacto | Resultado observado |
| --- | --- |
| `.venv/bin/ruff check .` | Exit 0; `All checks passed!`. |
| `.venv/bin/ruff format --check .` | Exit 0; `76 files already formatted`. |
| `.venv/bin/lint-imports` | Exit 0; 70 archivos, 94 dependencias; 10 contratos conservados, 0 rotos. |
| `.venv/bin/pytest` — límite 120000 ms | 581 casos recolectados; ejecución interrumpida por timeout a 120 s durante `tests/modules/productos/test_router.py`. Sin resumen final ni fallo de aserción visible. |
| `.venv/bin/pytest` — límite 600000 ms | 581 casos recolectados; ejecución interrumpida por timeout a 600 s durante el mismo archivo, con más progreso visible. Sin resumen final ni fallo de aserción visible. |

**Interpretación:** la suite no está probada verde ni roja. Los puntos de progreso no permiten afirmar conteos exactos de aprobados o cobertura final. No se identificó causa raíz del tiempo de ejecución y no se modificaron pruebas ajenas. Tras dos intentos incompletos se detuvo la fase, sin nuevo reintento automático. Timeout no cuenta como RED de negocio. No se repitió setup.

## TDD Cycle Evidence

| Unidad / tareas | Archivo previsto | Capa | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U1, 2.1–2.3 | `backend/tests/shared/test_contrato_comanda.py` | Unitaria | Suite basal incompleta | No iniciado | No ejecutado | No ejecutado | No ejecutado |
| U2, 3.1–3.10 | Misma suite | Unitaria/fake | Suite basal incompleta | No iniciado | No ejecutado | No ejecutado | No ejecutado |
| U3, 4.1–4.7 | Misma suite | Unitaria/fake | Suite basal incompleta | No iniciado | No ejecutado | No ejecutado | No ejecutado |
| U4, 5.1–5.7 | Misma suite | Unitaria/fake | Suite basal incompleta | No iniciado | No ejecutado | No ejecutado | No ejecutado |
| U5, 6.1–6.6 | Misma suite | Unitaria/fake | Suite basal incompleta | No iniciado | No ejecutado | No ejecutado | No ejecutado |
| U6, 7.1–7.6 | Misma suite | Unitaria/fake | Suite basal incompleta | No iniciado | No ejecutado | No ejecutado | No ejecutado |

No se escribió código de producción ni de fake antes de RED. No hay tareas de comportamiento completadas ni fallback a Standard. Pruebas nuevas: 0; pruebas nuevas aprobadas: 0; cobertura final: no disponible.

## Work Unit Evidence

| Unidad | Comando enfocado y resultado | Runtime harness | Rollback boundary |
| --- | --- | --- | --- |
| U0, presupuesto/autoridad 1.8 | Lectura de lanzamiento y `git status --short && git branch --show-current`: rama `feature/S2-01-contrato-comanda`, seis documentos previos sin seguimiento. Excepción/alcance reconciliados. | N/A: decisión documental sin frontera runtime. | Solo notas de vigencia añadidas a los seis documentos de este cambio y ajustes de pronóstico/1.8 en `tasks.md`; preservar contenido previo. |
| U1–U6, no iniciadas | No se ejecutaron selectores enfocados: todavía no existe la suite. | No ejecutado: DTO y fake no existen; no se proporciona un comando de uso ficticio. | Ningún archivo de implementación creado que revertir. |
| U8, 11.1 parcial | Lint/formato/imports aprobados; dos pytest incompletos según tabla. | No ejecutado: publicación y ejemplos todavía pendientes. | Este `apply-progress.md` nuevo y notas documentales de vigencia, sin retirar los artefactos históricos. |

## Tareas y cobertura de criterios

- Completada únicamente **1.8** por autoridad recibida, rama y evidencia documental del padre; no se consultó GitHub.
- **2.1–7.6** pendientes: ningún CA cuenta como verificado ejecutablemente, incluidos los 20 originales.
- **11.1** parcial: tres controles verdes; pytest/cobertura pendientes. No marcada.
- **11.2** pendiente: documento requerido en SPRINT-2 no creado; no se presenta planificación como entregable terminado.
- **11.3** pendiente: sin aceptación externa ni harness; #58 CA02 deberá declarar cobertura parcial cuando exista el fake, y la incorporación real seguirá en P4-F2.
- **11.4** parcial: permiso y presupuesto reconciliados, medición documental local registrada; no hay cierre de implementación. No marcada.
- **1.1–1.7 y 9.1–9.5** pendientes de equipo; **8.1–8.5** no seleccionadas, sin marcar por ausencia.
- Total conservado: **61 IDs, 1 completada, 60 sin marcar**. No se considera listo para archivo.

## Medición y comprobaciones del árbol

El estado inicial tenía seis documentos sin seguimiento; el único archivo nuevo de esta ejecución es este progreso. Backend: **0** líneas cambiadas; frontend: **0**; documentación: medir con `git diff --no-index --numstat /dev/null <ruta>` para los siete documentos sin seguimiento. Estos conteos incluyen planificación previa, no se atribuyen enteramente a este apply. No se eligió una base de rama para ocultar cambios: la medición es local contra ausencia de cada archivo sin seguimiento, no diff completo contra develop.

Medición local mediante `git ls-files --others --exclude-standard -z -- openspec/changes/S2-01-contrato-comanda` y `git diff --no-index --numstat /dev/null "$path"` por ruta: `apply-progress.md` 68/0, `design.md` 253/0, `exploration.md` 209/0, `proposal.md` 183/0, `specs/comanda-contrato/spec.md` 287/0, `specs/comanda-stub-compartido/spec.md` 96/0, `tasks.md` 190/0 (adiciones/eliminaciones). Total documental local: **1286/0**; backend **0/0**, frontend **0/0**. `git diff --check` aprobó el árbol seguido (sin diff); se comprueba también cada archivo sin seguimiento contra `/dev/null`. La excepción de 400 generales está aceptada; 800 backend y 800 frontend son independientes. No se comprimió contenido para ajustar presupuesto.

## Próximo paso y límites

Devolver control al padre con `status: partial` y `next_recommended: none`. Para reanudar hace falta resolver la ejecución incompleta de la línea base o que el padre determine un límite de tiempo suficiente; no se diagnostica una causa sin evidencia. No es necesaria una nueva aprobación de tamaño ni repetir setup/planificación. Mantener Strict TDD: obtener línea base completa, luego ciclos pequeños observados RED/GREEN/REFACTOR, harness real y suite final completa ≥70 %, sin alterar configuración. No iniciar automáticamente otra fase.

## Continuación ejecutada (estado vigente, 2026-10-29)

**Alcance:** solo DTO `backend/app/shared/contratos/comanda.py` (+ paquete), fake `backend/tests/shared/fakes/comanda.py` (+ paquete), suite `backend/tests/shared/test_contrato_comanda.py`, `SPRINT-2/S2-01-contrato-comanda.md` y estos dos archivos de progreso. No se editó código de M4/M5/M6, frontend, otros shared, configuración ni pruebas existentes. HTTP U7 sigue sin seleccionar. Single-pr con `size:exception` ya aceptada; no staging, commits, push, PR ni operación remota. Contrato compartido NO CONGELADO.

### TDD Cycle Evidence

| Unidad / tareas | Capa y safety net | RED observado | GREEN observado | TRIANGULATE / REFACTOR |
| --- | --- | --- | --- | --- |
| U1 2.1–2.3 | DTO unitario; archivos nuevos N/A; baseline total desconocida. | Tras esqueleto DTO: `pytest ... -k datos -q`: 7 fallos de validación XOR/cantidad/lista; 4 aprobados, exit 1. El primer intento fue solo error de import, no RED de negocio. | Mismo comando: 11 aprobados; exit 1 **únicamente** cobertura global 61,48 % <70. | Casos de producto/menú, ambos/ninguno, cantidad 0/negativa/float/bool/texto; se centralizó validación XOR en DTO; formato Ruff y suite final sin regresión. Serializador `.2f` ya existía antes de observar RED específico, por lo que 7.3 permanece abierta. |
| U2 3.1–3.10 excepto 3.4/3.7 | Fake nuevo N/A. | `pytest ... -k alta -q`: 6 fallos por alta ausente (`NotImplementedError`), exit 1; además la validación estricta ya tuvo RED en U1. Los tests de cliente ausente y enum ANULADA no aportaron RED propio: 3.4/3.7 abiertas. | Mismo comando: 6 aprobados, exit 1 solo cobertura global 61,37 %; suite final 624/624 exit 0. | Producto/menú, otra ABIERTA, mesa inexistente, historial vs catálogo, fecha controlada, nueva alta tras cierre; preparación de snapshots antes de mutar, copias; Ruff y suite completa sin regresión. |
| U3 4.3, 4.5–4.7 | Fake nuevo N/A. | `pytest ... -k listado -q`: 1 fallo de orden/página (`[1,2,3]` vs `[2,1]`), 1 error de fixture `comandas_iniciales` ausente; 5 aprobados; exit 1. 4.1/4.4 no registraron RED de comportamiento, 4.2 no incluye número repetido entre sectores: abiertas. | `pytest ... -k 'listado or cierre' -q`: 11 aprobados, exit 1 solo cobertura global 61,37 %; final 624/624. | Dos fechas/IDs, filtros estado/mesa, página posterior; orden estable y resumen copiado, formateo Ruff; los casos ya verdes no se atribuyen RED retroactivo. |
| U4 5.1–5.7 | Fake nuevo N/A. | `pytest ... -k cierre -q`: 4 fallos por cierre ausente (`NotImplementedError`), exit 1. | `pytest ... -k 'listado or cierre' -q`: 11 aprobados, exit 1 solo cobertura global; final 624/624. | Fixture ENTREGADO independiente, pendiente, segundo cierre, identidad inexistente; no se libera mesa ni se añade factura/operación de incorporación. #58 CA02 parcial: solo estado CERRADA consultable; P4-F2 futuro. |
| U5 6.1–6.6 | Reserva exclusivamente sintética N/A. | `pytest ... -k reserva -q`: 5 fallos por flujo ausente (`NotImplementedError`), 1 caso ya verde de ausencia de cliente, exit 1. | Mismo comando: 6 aprobados, exit 1 solo cobertura global; final 624/624. | Activa de hoy, cancelada/ATENDIDA, fecha distinta, vacío/menú sin producto, error de catálogo sin efectos; reutiliza alta validada, no prueba atomicidad de SQLite ni M5 real. |
| U6 7.1–7.6 | Fake/suite nuevos N/A. | **Parcial:** `pytest ... -k pedido_vaciado -q`: 1 fallo real (aceptaba una lista vaciada tras validar el DTO), exit 1; el resto de las pruebas U6 se escribió después de sus comportamientos existentes y no constituye RED de esas tareas. | `pytest ... -q`: 43 aprobados, exit 1 solo cobertura global 61,48 %; final 624/624. | Reconstrucción, copias, error de catálogo y aislamiento aprobados; 7.1–7.6 se dejan sin marcar por falta de RED específico y de paridad real reutilizable. |

No se fabricó GREEN de proceso para los comandos enfocados: pytest-cov exige ≥70 % sobre **todo** `app` incluso con `-k`, y sale 1 pese a 43 aserciones aprobadas. No se alteró `addopts`. El RED inicial de módulo inexistente, el error de fixture y los fallos solo por cobertura **no** se cuentan como RED funcional. El refactor observable consistió en extracción del detalle/copia/validación antes de mutar y normalización con Ruff; el verde posterior está acreditado por la suite final.

### Work Unit Evidence

| Unidad | Focused test / resultado | Runtime harness / resultado | Rollback boundary |
| --- | --- | --- | --- |
| U1 DTO | `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k datos -q`: 11 aprobados, exit 1 solo cobertura; suite final exit 0. | Construcción DTO válido y XOR/entero inválido en la suite: 11 aprobados; sin HTTP. | `backend/app/shared/contratos/{__init__,comanda}.py` y casos `test_datos_*` (retirar dependencias del fake conjuntamente). |
| U2 alta | `... -k alta -q`: 6 aprobados, exit 1 solo cobertura; final exit 0. | El comando Python documentado crea mesa 7, consulta y lista; duplicada se bloquea, exit 0. | Método `crear_comanda` y `_detalle` del fake + casos `test_alta_*`/fixtures; DTO U1 permanece. |
| U3 listado | `... -k 'listado or cierre' -q`: 11 aprobados, exit 1 solo cobertura; final exit 0. | Comando documentado: `listar_comandas(mesa_id=7).total == 1`, exit 0; casos de filtros/páginas en suite. | Método `listar_comandas` y pruebas `test_listado_*`, conservar consulta/alta. |
| U4 cierre | `... -k cierre -q`: RED 4 fallos; GREEN en `... -k 'listado or cierre' -q`: 11 aprobados, exit 1 solo cobertura; final exit 0. | Comando documentado: fixture entregada cierra; pendiente no cierra, exit 0. | Método `cerrar_comanda`, fixture `fake_entregada` y casos `test_cierre_*`; no hay datos reales que revertir. |
| U5 reserva | `... -k reserva -q`: 6 aprobados, exit 1 solo cobertura; final exit 0. | Suite parametrizada prueba reserva ACTIVA/CANCELADA/ATENDIDA/otra fecha y efectos de mesa simulada, 6 aprobados; no hay servicio M5 real que ejecutar. | Método `crear_desde_reserva`, `ReservaFake` y casos `test_reserva_*`; conservar alta general. |
| U6 aislamiento | `... -k aislamiento -q`: 6 aprobados, exit 1 solo cobertura; test adicional de lista vaciada RED→GREEN; suite final 624 aprobados. | Comando documentado recorre cuatro operaciones y dos bloqueos, exit 0; casos de reconstrucción en suite; sin frontera de producción. | Copias y semillas del fake + casos `test_aislamiento_*`; coordinación de consumidor pendiente. |
| U8 documento y gates | Suite final `.venv/bin/pytest`: 624 aprobados, exit 0, 99,56 %; lint/formato/imports exit 0. | `.venv/bin/python -c '...'` exacto en `SPRINT-2/S2-01-contrato-comanda.md`: `crear/consultar/listar/cerrar: OK; duplicada/pendientes bloqueados: OK`, exit 0. | Solo `SPRINT-2/S2-01-contrato-comanda.md` y notas de continuación en `tasks.md`/este archivo; preservar el progreso basal anterior. |

### Checks finales y alcance de revisión

Desde `backend/`, **después** de normalizar los archivos nuevos con `.venv/bin/ruff check --fix app/shared/contratos tests/shared` (exit 0) y `.venv/bin/ruff format app/shared/contratos tests/shared` (dos archivos reformateados), se ejecutaron individualmente sin cambiar código después: `.venv/bin/ruff check .` exit 0; `.venv/bin/ruff format --check .` exit 0 (**81 archivos**); `.venv/bin/lint-imports` exit 0 (**10 contratos conservados, 0 rotos**, 73 archivos/98 dependencias); `.venv/bin/pytest` exit 0 (**624 aprobados, 1 aviso de Starlette, 99,56 %**, 1107,50 s / 18:27). La suite basal de 581 casos permanece indeterminada, no fallida ni aprobada retrospectivamente. `git diff --check` exit 0 para el árbol seguido; las rutas nuevas están sin seguimiento.

Medición de archivos nuevos antes de actualizar estas notas, con `git diff --no-index --numstat /dev/null <ruta>`: backend 582/0 (`__init__` 1+1, DTO 60, fake 148, tests 372), frontend 0; documento `SPRINT-2` 53/0. Los seis documentos de planificación previos y este progreso ya excedían 400 sin implementación; el total documental evoluciona al editar las casillas y este progreso, por lo que estas cifras no constituyen diff final contra `develop`. Control 800 backend y 800 frontend por separado: backend 582 en esta medición, frontend 0; `size:exception` general aceptada. No se comprime contenido ni se crea PR.

**Estado de tareas:** 61 IDs, 32 marcadas y 29 abiertas. El fake está disponible localmente, pero U6 no acredita RED completo, 4.2 no prueba sectores de igual número y 3.7 no prueba ANULADA. 1.1–1.7, 9.1–9.5 y 11.3 necesitan coordinación/aceptación real, no suposición; U7 (8.1–8.5) sigue sin selección, P4-F1–F4 fuera de alcance. A01/A02 más fuertes que HU originales continúan provisionales; fórmula de descuento, zona/día y contratos de proveedores siguen abiertos. No declarar R04 mitigado ni iniciar archivo/implementación productiva por este resultado.

## Continuación acotada: pedido mixto desde reserva (2026-10-29)

**Alcance y causa:** en el fake, `any(detalle.producto_id is None for detalle in detalles)` exigía que *todos* los detalles fueran productos; S68-01/S68-02 solo exigen al menos un producto. Un pedido válido con producto y menú era rechazado. Se añadió un único caso nuevo con reserva activa del día, identificadores presentes en el catálogo sintético, estado ABIERTA, mesa heredada, vínculo/ATENDIDA y ambos detalles preservados en alta y consulta. La corrección mínima rechaza el pedido solo cuando ningún detalle contiene producto; se conserva el rechazo de lista vacía y pedido solo de menús. No se cambió el DTO ni se añadieron efectos en M5/M3.

### TDD Cycle Evidence

| Unidad / tarea ya marcada | Archivo y capa | Safety net | RED observado | GREEN observado | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| U5, revalidación de 6.1/6.4–6.6 | `backend/tests/shared/test_contrato_comanda.py`; fake aislado | `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k reserva -q`: 9 aprobados, exit 1 exclusivamente por cobertura global 61,26 % < 70; sin fallos de aserción. | `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k test_reserva_activa_admite_producto_y_menu_en_mismo_pedido -q`: 1 fallo en `DatosInvalidosError` de `crear_desde_reserva` (línea 142 previa), 43 excluidos; exit 1. El umbral de cobertura también falló, pero no se cuenta como RED de negocio. | Mismo comando tras el cambio: 1 aprobado, 43 excluidos; exit 1 solo por cobertura global 61,26 %. Suite completa final: 625 aprobados, exit 0. | Caso anterior solo-menú y vacío sigue rechazado (`test_reserva_sin_productos_o_cantidad_invalida_no_muta`); nuevo mixto admitido y producto solo ya admitido. | Solo cambió el predicado; no se requirió refactor adicional. Ruff check/formato: 2 archivos ya conformes; suite completa verde. |

### Work Unit Evidence

| Unidad | Comando enfocado y resultado | Runtime harness / resultado | Frontera de reversión |
| --- | --- | --- | --- |
| U5, regresión de mezcla | Desde `backend/`: `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k reserva -q`: 10 aprobados, 34 excluidos, exit 1 solo por cobertura global 61,48 %. `.venv/bin/pytest tests/shared/test_contrato_comanda.py -q`: 44 aprobados, exit 1 solo por cobertura global 61,48 %. | La suite de fake en memoria ejecutó `crear_desde_reserva` con producto y menú del catálogo y verificó consulta posterior, mesa y reserva simuladas; 44 casos aprobados en la suite de contrato, sin HTTP ni servicios reales. | Únicamente el nuevo caso `test_reserva_activa_admite_producto_y_menu_en_mismo_pedido` y el predicado de `crear_desde_reserva` en `backend/tests/shared/fakes/comanda.py`; no revertir ni retirar la suite o fake preexistentes. |

**Comprobaciones posteriores a la edición (sin normalización necesaria):** `.venv/bin/ruff check tests/shared/test_contrato_comanda.py tests/shared/fakes/comanda.py && .venv/bin/ruff format --check tests/shared/test_contrato_comanda.py tests/shared/fakes/comanda.py`: exit 0, dos archivos formateados. `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/lint-imports`: exit 0, 81 archivos formateados, 10 contratos conservados y 0 rotos. Una única ejecución final `.venv/bin/pytest` desde `backend/`, límite 45 minutos: exit 0, **625 aprobados**, 1 aviso Starlette, **99,67 %** de cobertura, 1064,46 s (17:44). Los comandos enfocados mantuvieron `addopts` y el umbral intactos: sus aserciones pasan, pero el proceso sale 1 por cobertura global; no se presenta ese exit como 0.

**Estado:** 32/61 casillas permanecen marcadas; no se marcó ninguna nueva porque este caso complementa tareas U5 ya marcadas y no acredita íntegramente ninguna de las restantes. El contrato de equipo continúa NO CONGELADO, sin aceptación M5/M6 ni prueba de integración productiva. La excepción `size:exception` previamente aceptada sigue vigente para el único PR futuro; no se realizó operación remota, commit ni PR. Los 29 pendientes y límites de la continuación anterior se conservan.

## Cobertura acotada de tareas pendientes (2026-10-29)

Solo se añadieron caracterizaciones de comportamientos ya presentes en el doble: no hay cambio de lógica ni RED nuevo que se pueda atribuir retroactivamente a esas tareas. Se preservan las 32/61 casillas marcadas y la evidencia Strict TDD anterior.

| Tanda (máximo tres tareas) | Evidencia obtenida | Estado de las casillas |
| --- | --- | --- |
| 3.4, 3.7, 4.1 | Nueva comprobación del vínculo de reserva sin cliente propio; enum ABIERTA/CERRADA/ANULADA y alta ABIERTA; listado de ABIERTAS con mesa/estado junto con CERRADA sin filtro implícito. Cuatro pruebas enfocadas aprobaron sus aserciones. | Siguen abiertas: la redacción de cada tarea exige RED previo y no se observó un fallo de comportamiento nuevo. |
| 4.2, 4.4, 7.1 | 4.4 ya comprobaba conjunto vacío y filtro sin coincidencias. Nuevo caso 7.1 recorre crear, consultar, listar y cerrar, bloquea pendiente y verifica otro contexto aislado; tres pruebas enfocadas aprobaron sus aserciones. 4.2 solo filtra IDs distintos: el doble no modela número/sector, así que no prueba dos mesas con el mismo número en sectores diferentes. | Las tres siguen abiertas: 4.2 necesita esa representación/acuerdo para una prueba completa; 4.4 y 7.1 carecen de RED funcional previo, sin fingirlo. |
| 7.4, 7.5, 7.6 | Excepciones comunes, copias y reinicio tienen casos previos. No hay proveedor real M5/M6 ni un nuevo comportamiento a implementar/refactorizar en este alcance. | Permanecen abiertas: 7.4 requiere validar el punto público compartido; 7.5/7.6 no acreditan todos los ciclos RED→GREEN→REFACTOR descritos. |

Desde `backend/`, `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k 'alta_sin_reserva_no_crea_cliente or alta_distingue_estados_de_comanda or listado_abiertas_muestra_mesa_y_estado_sin_filtro_implicito or reserva_vinculada_no_agrega_cliente_propio' -q`: **4 aprobadas**, salida 1 solo por cobertura global de `app` 61,37 % <70. `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k 'listado_vacio_y_filtro_sin_coincidencias or listado_filtra_mesa_sin_confundir_numero_de_sector or aislamiento_ciclo_completo_con_pendiente_y_contexto_nuevo' -q`: **3 aprobadas**, salida 1 solo por cobertura global 61,37 % <70. No se desactivó ni redujo el umbral y, por petición de la persona, no se ejecutó la suite completa. `.venv/bin/ruff check tests/shared/test_contrato_comanda.py && .venv/bin/ruff format --check tests/shared/test_contrato_comanda.py && .venv/bin/lint-imports`: salida 0, un archivo formateado y diez contratos conservados.

**Bloqueos humanos:** 1.1 exige revisión y registro humano de los CA/supuestos; 1.7 exige aceptación real de M5/M6; 11.3 exige esa aceptación y evidencia del escenario compartido. No se marcan como hechas por una prueba local. 4.2 requiere acordar cómo representar número/sector sin duplicar M3. La comprobación de incorporación efectiva de productos tras cierre permanece en P4-F2, fuera de S2-01. No hubo commits, PR ni edición de módulos ajenos.

## Tarea 4.2: mesas de igual número en sectores distintos (2026-10-29)

**Caracterización, sin RED:** se actualizó únicamente el caso `test_listado_filtra_mesa_sin_confundir_numero_de_sector` para preparar dos mesas de número 4 en sectores 1 y 2, con IDs 7 y 8. El doble ya filtra por `mesa_id`; para cada ID se comprueban `total=1`, identidad de comanda y mesa devueltas, sin cruzar resultados. La asociación `(sector_id, numero) → mesa_id` es dato controlado de la prueba: el doble no consulta M3 ni ofrece búsqueda por número y sector. Esto comprueba separación por identidad, no la integración real M3→M4. No se cambió el fake ni el contrato compartido.

**Ejecución afectada:** desde `backend/`, `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k test_listado_filtra_mesa_sin_confundir_numero_de_sector --no-cov -q`: salida 0, **1 aprobada**, 47 excluidas, 1 aviso de Starlette, 0,12 s. `--no-cov` solo omite la medición global al ejecutar esta prueba aislada; no modifica `pyproject.toml`, el umbral 70 % ni los pasos de CI. No se ejecutó la suite completa por instrucción de la persona.

**Work Unit Evidence:** inicio: caso existente con dos IDs pero sin número/sector explícitos; final: caso de mismo número en dos sectores con filtrado independiente. Runtime harness: la prueba anterior ejecuta ambas consultas contra el mismo `ComandaFake`, salida 0. Frontera de reversión: solo el cambio en ese caso de `backend/tests/shared/test_contrato_comanda.py`, esta nota, la casilla 4.2 de `tasks.md` y la aclaración en `SPRINT-2/S2-01-contrato-comanda.md`. Se marca **4.2** como caracterización completada, nunca como RED/GREEN inventado; estado acumulado **33/61**. Los anteriores conteos 32/61 y la observación de 4.2 pendiente en la sección histórica no describen el estado actual. Ningún commit, PR ni módulo ajeno modificado.

## Preparación local para revisión del PR (2026-10-29)

**Alcance:** revisión de pendientes locales sin cambiar comportamiento del stub, contrato de datos, pantallas ni otros módulos. Se cerraron como *caracterización* las tareas 3.4, 3.7, 4.1, 4.4 y 7.1: ya existían pruebas o se habían añadido casos de cliente por reserva, estados, listado de ABIERTAS/vacío y ciclo crear/consultar/listar/cerrar con copias e instancias aisladas. No hay RED nuevo ni se atribuye retroactivamente a estas pruebas un ciclo RED→GREEN. La tarea 4.2 ya constaba caracterizada en el apartado anterior.

**Prueba enfocada:** desde `backend/`, `.venv/bin/pytest tests/shared/test_contrato_comanda.py -k 'alta_sin_reserva_no_crea_cliente or reserva_vinculada_no_agrega_cliente_propio or alta_distingue_estados_de_comanda or listado_abiertas_muestra_mesa_y_estado_sin_filtro_implicito or listado_vacio_y_filtro_sin_coincidencias or aislamiento_ciclo_completo_con_pendiente_y_contexto_nuevo or aislamiento_reconstruccion_y_copias or aislamiento_reserva_no_filtra_cambios_entre_contextos or aislamiento_catalogo_faltante_no_muta_estado or alta_bloquea_otra_abierta_pero_permite_consultarla or cierre_pendientes_bloquea_sin_entregar' --no-cov -q`: salida 0, **11 aprobadas**, 37 excluidas, 1 aviso Starlette. `--no-cov` solo se usó en la selección enfocada; no altera configuración ni el umbral CI.

**Controles completos posteriores, desde `backend/`:** `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/lint-imports`: salida 0, **81 archivos formateados**, **10 contratos conservados**, 0 rotos. `.venv/bin/pytest`: salida 0, **629 pruebas aprobadas**, un aviso Starlette, **99,56 % de cobertura** (906 sentencias, 4 sin cubrir), 1053,93 s (17:33), umbral 70 % sin cambios. La suite incluye **48 casos** de `tests/shared/test_contrato_comanda.py`; no se ejecutó ninguna prueba simulando ser consumidor productivo M5/M6.

**Pendientes sin fingir cierre:** 7.2–7.6 contienen escenarios ya probados por el fake (bloqueos, copias, excepciones, aislamiento), pero también requisitos de concurrencia real, tiempo/dinero no acordados, proveedor público o ciclos TDD sin RED observado. No se implementaron esos contratos nuevos ni se marcaron casillas por inferencia. 1.1–1.7 y 11.3 requieren revisión y aceptación de personas; la persona indicó que Federico y Héctor revisarán **tras abrir el PR y antes del merge a `develop`**. 8.1–8.5 HTTP siguen sin seleccionarse; 9.1–9.5 requieren coordinación con responsables y P4-F1–F4 son futuro S2-M4. Estado total: **38/61 completadas, 23 abiertas**. R04 no se declara mitigado por el fake y el contrato de equipo no está congelado.

**Work Unit Evidence:** inicio: 33/61 con pruebas del fake ya existentes; final: cinco caracterizaciones verificadas y 38/61, sin cambio de código productivo ni del doble. Harness: selección enfocada y suite completa anteriores con resultados observados. Reversión: restaurar únicamente las cinco casillas de `tasks.md` y este registro, preservando evidencia anterior; ningún dato productivo cambió. No hubo staging, commit, push, PR ni modificación de módulos ajenos. La excepción `size:exception` ya aceptada sigue vigente para el PR único futuro.
