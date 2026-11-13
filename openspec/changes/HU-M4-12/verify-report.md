# Informe de verificación: HU-M4-12 Marcar un producto como listo en cocina

- **Cambio:** HU-M4-12 (issue #242) · **Rama:** `feature/HU-M4-12-listo-en-cocina` (da4edd5..0eff451 sobre `origin/develop`)
- **Modo:** Strict TDD · **Veredicto:** APROBADO (0 CRITICAL, 2 WARNING, 2 SUGGESTION)

## Resultados de CI (AGENTS.md sección 7, solo verificación)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check .` | Sin errores |
| Backend | `ruff format --check .` | Sin diferencias |
| Backend | `lint-imports` | 13 contratos cumplidos, 0 rotos |
| Backend | `pytest` | 2966 pasan, 1 advertencia; cobertura 98,40 % (umbral 70 %) |
| Frontend | `npm run lint` | 0 errores y 0 advertencias (`--max-warnings=0`) |
| Frontend | `npm run format:check` | Sin diferencias |
| Frontend | `npm run typecheck` | Sin errores |
| Frontend | `npm run test:coverage` | 154 archivos y 1740 pruebas pasan; sentencias 88,26 %, ramas 84,28 %, funciones 83,71 %, líneas 88,97 % (umbral 60 %) |
| Frontend | `npm run build` | Correcto |

Los números coinciden con los de `apply-progress.md`.

## Tareas

41/41 tareas marcadas `[x]` y coherentes con el código: migración `d2f4a6c8e0b1` (`down_revision = b8d0f2a4c6e8`), columna y CHECK en `models.py`, `ListoDetalle` y `cantidad_lista` en `schemas.py`, `marcar_listo` en repository, service y router, permiso en ambos `permisos`, `marcarListo` en `api.ts` y `useEntregas.ts`, `unidadesDeLinea.ts`, diálogo y página.

## Cumplimiento de Strict TDD

- `apply-progress.md` contiene la tabla de evidencia de ciclo (RED, GREEN, triangulación, refactor) para todos los grupos de tareas, con conteos de fallos en RED y de verde posterior.
- Cada archivo de código nuevo tiene su archivo de prueba (`test_migracion.py`, `test_repository.py`, `test_schemas.py`, `test_service.py`, `test_router.py`, `test_permisos.py`, `test_matriz_permisos.py`, `api.test.ts`, `unidadesDeLinea.test.ts`, `EntregasComandaDialog.test.tsx`, `AtencionPage.roles.test.tsx`, `permisos.test.ts`).
- Las pruebas existentes se ajustaron por el crecimiento del contrato, sin debilitar aserciones (el chef sigue con 403 en entrega, cierre y anulación).
- Los umbrales de cobertura no se tocaron y `pyproject.toml`, `eslint.config.js`, CI y `env.py` no aparecen en el diff.

## Matriz de cumplimiento de la spec

| Requisito / escenario | Código | Pruebas (nombre o grupo) | Estado |
| --- | --- | --- | --- |
| CA1 marcar listo (total, parcial, bajar, cero, idempotente, entrega parcial S3, `l < e` S4) | `repository.marcar_listo`, `service.marcar_listo`, router PUT | `test_marcar_listo_*` (repository y service), `test_put_listo_total/parcial/repetido/con_entrega_parcial_*` | Cumple |
| Chef, mozo y encargado marcan listo (S6) | `Permiso.COMANDAS_MARCAR_LISTO` en `permisos.py` | `test_put_listo_chef_mozo_y_encargado_responden_200`, `test_permisos`, matriz | Cumple |
| S10 no cambia `estado_entrega` ni permite cerrar | `marcar_listo` solo escribe `cantidad_lista` | `test_marcar_listo_no_cambia_estado_entrega_ni_permite_cerrar`, `test_ciclo_listo_sin_entregar_no_permite_cerrar_responde_409` | Cumple |
| CA2 entregar un producto listo / sin listo (S2) | `registrar_entrega` intacto | `test_registrar_entrega_de_linea_lista_pasa_a_entregado`, `test_registrar_entrega_sin_listo_no_exige_marcar_ni_altera_cantidad_lista`, `test_ciclo_listo_entregar_y_cerrar_responde_200` | Cumple |
| CA3 409 línea entregada (valor distinto e igual) | `WHERE cantidad_entregada < cantidad` + `_rechazar_listo` | `test_marcar_listo_linea_entregada_*` (repository, service), `test_put_listo_linea_entregada_responde_409_con_detalle` | Cumple |
| CA4 consulta con tres estados y `cantidad_lista` 0 por defecto | `DetalleEntrega.cantidad_lista` | `test_consultar_entregas_incluye_cantidad_lista_*`, `test_get_detalles_incluye_cantidad_lista_ordenado_por_id`, `test_get_detalles_chef_responde_200_con_cantidad_lista` | Cumple |
| 422 `n > cantidad`; cuerpo inválido (7 variantes); ids 0 o no numéricos | `ListoDetalle` (`StrictInt`, `ge=0`, `extra=forbid`), `Path(gt=0)`, `_rechazar_listo` | `test_put_listo_cantidad_mayor_*`, `test_put_listo_cuerpo_invalido_*`, `test_put_listo_id_cero_o_no_numerico_*`, `test_listo_detalle_*` | Cumple |
| 404 comanda y detalle (ajeno/inexistente); 409 no ABIERTA (S5); orden de diagnóstico (S8, S9) | `_rechazar_listo` | `test_marcar_listo_orden_de_diagnostico`, `test_put_listo_comanda_inexistente_*`, `..._detalle_de_otra_comanda_*`, `..._cerrada_o_anulada_*` | Cumple |
| 401 sin sesión; 403 antes que 422 | `requiere(...)` como dependencia de la ruta | `test_put_listo_sin_sesion_responde_401`, `test_put_listo_prohibido_antes_que_invalido`, `test_cada_ruta_protegida_declara_un_permiso`, matriz | Cumple |
| Concurrencia / causa no visible | UPDATE condicional atómico (L2) | `test_marcar_listo_otra_sesion_entrega_todo_antes_*`, `test_marcar_listo_sin_causa_visible_*` | Cumple |
| Migración (columna, relleno ENTREGADO/PENDIENTE, CHECK, downgrade, una cabeza) | `d2f4a6c8e0b1_agrega_cantidad_lista.py` | 7 pruebas `test_migracion_cantidad_lista_*` | Cumple |
| Frontend: tres estados "2 de 10 / 2 Entregado / 5 Listo / 3 Pendiente" | `unidadesDeLinea`, `etiquetasDeLinea` | `unidadesDeLinea.test.ts`, `EntregasComandaDialog.test.tsx` | Cumple |
| Frontend: Todo listo, + y − (L9), límites, línea entregada, CERRADA/ANULADA, en vuelo, 409 con recarga | `BotonesDeListo`, `useEntregas.enviar` | `EntregasComandaDialog.test.tsx` (14 pruebas nuevas) | Cumple |
| Frontend: chef sin controles de entrega, mozo/encargado con ambos, solo entrega sin listo | props `puedeEntregar` / `puedeMarcarListo` | `EntregasComandaDialog.test.tsx`, `AtencionPage.roles.test.tsx` | Cumple |
| Chef abre el diálogo con «Ver detalle» y no ve crear, editar, cerrar, reabrir ni anular (L10, S11) | `ComandasTabla` sin cambios | `AtencionPage.roles.test.tsx` | Cumple |
| Matriz de permisos frontend igual a backend | `permisos.ts` | `permisos.test.ts` | Cumple |

## Decisiones de diseño L1 a L10

- L1 ruta PUT con valor absoluto: respetada. L2 UPDATE condicional con `EXISTS` ABIERTA, `cantidad >= n`, `cantidad_entregada < cantidad`, parametrizado (SQLAlchemy Core), sin commit en repository: respetada.
- L3 `_rechazar_listo` en el orden pactado, 20 líneas aprox.: respetada. L4 CHECK con nombre `ck_detalles_comanda_cantidad_lista_rango`: respetada.
- L5 `StrictInt ge=0 extra=forbid`: respetada. L6 solo `DetalleEntrega` de M4; `shared/contratos/comanda.py` no cambia: respetada.
- L7 función pura `unidadesDeLinea`: respetada. L8 chef sin `COMANDAS_OPERAR`: respetada (backend y frontend).
- L9 «+» envía `e + listas + 1`, «−» `e + listas − 1`, «Todo listo» envía `c`: respetada. L10 `ComandasTabla` sin cambios: respetada.

## Reglas del proyecto

- Router solo delega al service; service usa `NoEncontradoError`, `ReglaDeNegocioError`, `DatosInvalidosError` de `shared/excepciones` y no importa FastAPI; consultas parametrizadas; errores con `{"detalle": ...}`. Cumple.
- Sin `any`, sin `fetch` en componentes; la llamada pasa por `atencion/api.ts` (`marcarListo`). Cumple (búsqueda en el diff).
- Funciones ≤ 50 líneas y complejidad ≤ 10: las funciones nuevas son cortas (`marcar_listo` 14 líneas, `_rechazar_listo` 20); ruff y ESLint sin reportes.
- Contratos de importación: 13 cumplidos. Solo se tocaron en `shared/`: `permisos.py`, `permisos.ts` y sus pruebas (`test_permisos.py`, `test_matriz_permisos.py`, `permisos.test.ts`). `env.py`, `pyproject.toml`, `shared/contratos/comanda.py` y CI sin cambios.
- Migración encadenada a la única cabeza anterior; reversible.

## Hallazgos

### CRITICAL
Ninguno.

### WARNING
1. **Tamaño del diff de backend:** 14 archivos, +991 −7, por encima del punto de control de 800 líneas (en su mayoría pruebas). Es un punto de control, no un bloqueo (AGENTS.md sección 4): un solo PR, anotarlo en la descripción.
2. **Supuestos S3, S5, S6 y S7 y decisión L10 aún sin validar por el equipo** (marcar listo con 409 en línea entregada por completo, solo comandas ABIERTA, el chef sin `COMANDAS_OPERAR`, el chef usa «Ver detalle»). Pedir validación a la persona que revisa (Juan Ignacio Riquelme, M4). Además, los dos archivos compartidos de permisos requieren aviso en el PR.

### SUGGESTION
1. **Insignias:** la spec dice que cada insignia aparece solo cuando su cantidad es mayor a 0. Con `listas = 0` el diálogo muestra únicamente la insignia dominante (p. ej. una línea con 2 entregadas y 3 pendientes sin listas muestra solo «Pendiente»), según la regla de la tarea 7.1. Es coherente con el texto «una línea sin cantidad intermedia muestra la insignia dominante»; al archivar, redactar la spec de forma inequívoca.
2. **Nombres:** al archivar, alinear las menciones de `EntradaListo` y `registrarListo` de la spec con `ListoDetalle` y `marcarListo` del diseño (ya anotado en `tasks.md`).

## Conclusión

La implementación cumple todos los requisitos y escenarios de las tres specs con pruebas que pasan, las tareas están completas y la CI está en verde en ambos lados. Se puede archivar.
