```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e39b4b6aadb4e91ed902d18c30e3cdea8ae8708f14a35c667e4b407e8d0520c8
verdict: pass
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 25/25
test_command: cd backend && pytest
test_exit_code: 0
test_output_hash: sha256:a14f348d48d22357f7b6ddbd5001dbd61349de6e1898b9fc6e77ee6711fa5399
build_command: cd frontend && npm run build
build_exit_code: 0
build_output_hash: sha256:a2043a85bb65372718e2d323a414cf472e4c74eb39e89a261bcc4a89c6f00460
```

## Informe de verificación

**Cambio**: HU-M1-10 (Crear una sección de la carta) · **Modo**: Strict TDD · **Veredicto**: PASS WITH WARNINGS

### Completitud
| Métrica | Valor |
| --- | --- |
| Tareas totales | 19 |
| Completas | 16 |
| Incompletas | 3 (1.1, 1.2, 5.3: avisos y planificación del PR, del orquestador; WARNING) |

### Ejecución (CI de AGENTS.md §7, solo verificación)
- Backend: `ruff check .` OK; `ruff format --check .` 63 archivos OK; `lint-imports` 10 contratos cumplidos, 0 rotos; `pytest` 57 pasan, cobertura 98.93 % (umbral 70 %).
- Frontend: `npm run lint` OK (0 advertencias); `format:check` OK; `typecheck` OK; `test:coverage` 14 archivos, 58 pasan, sentencias 70.88 %, ramas 67.81 %, funciones 67.08 %, líneas 73.43 % (umbral 60 %); `build` OK.
- Migración en SQLite temporal nueva: `upgrade head` crea `secciones`, `productos` e índices; `alembic check` sin diferencias; `downgrade base` deja solo `alembic_version`; `upgrade head` otra vez OK.

### Matriz de cumplimiento (25 escenarios; la tarea mencionaba 27, la spec tiene 25)
| Requisito | Escenario | Prueba | Resultado |
| --- | --- | --- | --- |
| CA1 | Alta válida sin productos | test_router `test_crear_seccion_responde_201_con_la_forma_s5`; test_service `test_crear_seccion_sin_productos_queda_habilitada`; SeccionFormDialog `crea la sección sin productos (CA 1)` | COMPLIANT |
| CA1 | Estado no lo elige el cliente | test_router `test_crear_seccion_ignora_el_estado_enviado` | COMPLIANT |
| CA2 | Falta el nombre | test_router `test_crear_seccion_sin_campos_obligatorios_responde_422[nombre]` (422, campo, total 0) | COMPLIANT |
| CA2 | Falta el orden | mismo test `[orden]` | COMPLIANT |
| CA2 | Formulario vacío | SeccionFormDialog `con campos vacíos no envía y marca qué falta (CA 2)`; validarSeccion `pide nombre y orden` | COMPLIANT |
| CA3 | Nombre repetido otra capitalización | test_router `..._nombre_repetido_responde_409`; test_service `..._sin_distinguir_mayusculas`, `..._casefold_no_solo_ascii`; SeccionFormDialog `muestra el 409 de nombre repetido (CA 3)` | COMPLIANT |
| CA3 | Nombre de deshabilitada | test_service `..._rechaza_nombre_de_una_deshabilitada` | COMPLIANT |
| CA4 | 51 caracteres | test_router `..._51_caracteres_responde_422`; SeccionFormDialog `advierte un nombre largo (CA 4 y 5)`; validarSeccion CA 4 | COMPLIANT |
| CA4 | 50 caracteres con números | test_router `..._50_caracteres_y_numeros_responde_201` | COMPLIANT |
| CA5 | Orden no entero | test_router `..._orden_invalido_responde_422["3", 2.0, 2.5, True]`; SeccionFormDialog (2.5); validarSeccion.each | COMPLIANT |
| CA5 | Cero o negativo | test_router `[0, -1]`; validarSeccion.each | COMPLIANT |
| CA6 | Orden ocupado | test_router `..._orden_ocupado_responde_409` (existente intacta); test_service; SeccionFormDialog `muestra el 409 de posición ocupada (CA 6)` | COMPLIANT |
| CA6 | Orden de deshabilitada | test_service `..._permite_orden_de_una_deshabilitada` | COMPLIANT |
| CA7 | Seleccionados y confirmados | test_router `test_traslado_sin_confirmar_..._confirmado_responde_201` (1 producto + GET /productos); test_service `..._confirmada_traslada_los_productos` (2 productos) | COMPLIANT |
| CA7 | Producto inexistente | test_router `..._producto_inexistente_responde_404`; test_service | COMPLIANT |
| CA7 | Producto deshabilitado | test_service `..._producto_deshabilitado_responde_conflicto` (sin prueba HTTP) | COMPLIANT |
| CA7 | Ids repetidos | test_router `..._ids_repetidos_responde_422` | COMPLIANT |
| CA7 | Selector solo habilitados | test_router `test_listar_productos_solo_trae_habilitados`, `..._sin_datos_devuelve_pagina_vacia`; test_service; SelectorProductos (sección actual, vacío) | COMPLIANT |
| CA8 | Traslado sin confirmar | test_router (409 con Flan y Postres); test_service `..._sin_confirmar_traslado_nombra_producto_y_seccion` (nada cambia) | COMPLIANT |
| CA8 | Traslado confirmado | test_router; test_service | COMPLIANT |
| CA8 | Falla a mitad del alta | test_service `..._un_producto_invalido_no_traslada_ninguno` | COMPLIANT |
| CA8 | Cancelar confirmación | SeccionFormDialog `al cancelar la confirmación no envía y conserva los datos` | COMPLIANT |
| CA8 | Confirmación antes de enviar | SeccionFormDialog `pide confirmar el traslado antes de enviar y envía una sola vez con true` | COMPLIANT |
| Listar | Listado paginado | test_router `..._pagina_y_ordena_por_orden`; test_service | COMPLIANT |
| Listar | Límite fuera de rango | test_router `..._limit_fuera_de_rango_responde_422` | COMPLIANT |

**Cumplimiento**: 25/25. Los 8 CA tienen al menos una prueba de camino feliz y una de error o límite.

### Coherencia con el diseño
A1 a A10 y D1 a D3 implementados como se indica (columna `nombre_normalizado` con `casefold` y `@validates`, índice parcial, captura de `IntegrityError`, el service devuelve schemas, paginación sin FastAPI, relación unidireccional, validación en español en el formulario, `useConfirm` y un solo POST, sin `base_repository`, SQLite por prueba vía Alembic). Desviaciones de apply-progress razonables: `obtener_nombre_de_seccion`, `useFormularioSeccion.ts`, diálogo montado solo al abrir, `describe` divididos.

### Reglas del proyecto
Router solo delega; service lanza solo excepciones de `shared/excepciones.py` y no importa FastAPI (contrato `lint-imports` cumplido); respuestas con schemas; errores `{"detalle"}`; listados con `shared/paginacion.py`; sin `any` ni `fetch` en el módulo (grep vacío); nombres de pruebas `test_<función>_<caso>`; ruff y ESLint (límites de 50 líneas y complejidad) en verde.

### TDD
Tabla de evidencia presente con RED y GREEN por tarea; los 14 archivos de prueba existen y pasan. Calidad de aserciones: sin tautologías, sin bucles fantasma, sin pruebas de humo. Capas: unidad (service, paginación, validarSeccion, api), integración (router, migración, componentes).

### Problemas
**CRITICAL**: ninguno.

**WARNING**
1. Tareas 1.1, 1.2 y 5.3 sin marcar: son del PR (avisos, commits, medición de líneas) y las hace el orquestador; deben cerrarse antes del PR.
2. `AGENTS.md` (línea 57) y `openspec/config.yaml` (línea 57) están modificados (límite de backend 400 a 800 y "la HU nunca se divide"). Son archivos de reglas fuera del módulo: avisar al equipo y mencionarlo en el PR (AGENTS.md §9.3 y §9.8).
3. La tabla de evidencia TDD no tiene columna Safety Net; archivos modificados (`main.py`, `paginacion.py`, `api.ts`, `ProductosPage.tsx`) sin registro explícito.
4. Pregunta abierta A7 (mensajes 422 en inglés de Pydantic) y avisos a M2, M3, M4 y M6 sobre `shared/models/` siguen pendientes.

**SUGGESTION**
1. Tamaño: backend +1003 y frontend +892 líneas, sobre el punto de control de 800; decisión ya tomada de PR único (informativo).
2. "Producto deshabilitado" y "Falla a mitad del alta" solo se prueban en el service, no por HTTP (409 por router).
3. Escenario "Seleccionados y confirmados": la prueba HTTP usa un producto; el de dos productos está en el service.
4. `_cargar_productos` ordena con `ids.index` (O(n²)); irrelevante con el tope actual.
5. 1 advertencia de pytest (`httpx` deprecado en `starlette.testclient`), ajena al cambio.

### Veredicto
PASS WITH WARNINGS: 25/25 escenarios con prueba pasando, CI completa en verde, migración reversible.
