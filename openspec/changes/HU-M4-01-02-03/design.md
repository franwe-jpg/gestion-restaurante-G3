# Diseño: HU-M4-01-02-03 · Clientes

## Enfoque técnico

`Cliente` pertenece a M4. M4 expone listado/búsqueda y modificación, pero no alta independiente: la creación de un cliente nuevo ocurre dentro del guardado de su primera reserva, cuyo flujo HTTP pertenece a M5 (#61). En el estado actual, `backend/app/modules/atencion/` y `backend/app/modules/reservas/` contienen stubs; no existe todavía un contrato de integración implementado. La especificación de esta agrupación está en `specs/atencion-clientes/spec.md`.

## Decisiones y límites

| Decisión | Elección técnica propuesta | Razón y alternativa descartada |
| --- | --- | --- |
| Propiedad y persistencia (D-03, D-05) | Una sola entidad `Cliente` administrada por M4 en `atencion/models.py`; M5 la referencia por clave foránea al nombre de tabla, sin importar sus modelos. Confirmar con M5 la ubicación final si su integración exige `shared/models/`. | Evita duplicar entidades o importar capas internas de otro módulo (RNF-MAN-09). El `env.py` ya registra `atencion.models`. |
| Alta conjunta (D-04, D-10) | El `service` de M5 coordina la operación de reserva y usa exclusivamente una función pública del `service` de M4 para preparar el cliente en **la misma sesión/transacción**. Esa función agrega/obtiene el identificador, pero no confirma; M5 confirma una vez al persistir la reserva, o revierte ambos. | Dos commits independientes dejarían clientes sin reserva si M5 falla. Esta interfaz se propone para acordar con M5, no se implementa en este cambio por cuenta propia. |
| HTTP (D-21 a D-27) | `PUT /api/v1/clientes/{id}` con datos completos; `GET /api/v1/clientes?q=...&limit=...&offset=...` paginado. No exponer `POST /clientes` ni `DELETE /clientes`. | `PUT` hace explícita la sustitución completa de los dos datos obligatorios; el alta por M4 permitiría clientes sin primera reserva. |
| Validación (D-06, D-25, D-26) | Esquemas de M4 para `nombre` y `telefono` requeridos como `str` no vacíos; nombre solo letras y formato técnico provisional del teléfono: dígitos, espacios, guiones y `+` solo al inicio. Validar antes de mutar; responder 422 con `detalle` y el campo. | Sin validación previa se pueden aplicar cambios parciales; no se prescribe longitud ni unicidad telefónica. |
| Búsqueda (D-27) | Consulta en el repositorio M4: coincidencia total o parcial del nombre, o coincidencia del teléfono, con un único `q`; paginar y contar sobre el mismo filtro. La búsqueda interpreta el texto literalmente, sin convertir caracteres especiales de la consulta en comodines SQL. | Filtrar solo la página en memoria daría `total` incorrecto. No se presupone que el teléfono identifique a una sola persona. |
| Experiencia de usuario (D-15, D-16) | Página de M4 con lista, filtro y edición; `api.ts` del propio módulo usa `clienteHttp` y los componentes comunes existentes. El formulario de primera reserva es responsabilidad de M5. | No importar componentes o API internos de M5, ni duplicar formulario de reserva en M4. |

`Supuesto:` el formato técnico provisional de #49 CA3 fue confirmado para esta implementación. Se prueba el rechazo de caracteres fuera del conjunto permitido y de `+` fuera del inicio; no se agregan límites de longitud ni otros requisitos. La definición funcional definitiva queda pendiente del equipo.

## Flujo de datos y transacciones

```text
M5 (flujo futuro de #61): POST de reserva → reservas.router → reservas.service
    ├─ cliente existente: localizar/validar por contrato público de M4
    └─ cliente nuevo: atencion.service.preparar_cliente_para_reserva(db, datos)
                        → atencion.repository → clientes (sin commit)
    → reservas.repository → reservas (misma sesión)
    → commit conjunto o rollback conjunto (responsabilidad de M5)

M4: GET /clientes → atencion.router → atencion.service → atencion.repository
    → Pagina[ClienteSalida]
M4: PUT /clientes/{id} → validación → atencion.service → atencion.repository
    → commit único → ClienteSalida; datos inválidos: 422 sin mutación
```

La interfaz M4-M5 propuesta necesita acuerdo con el responsable de #61: nombre/forma del DTO de entrada, resolución de cliente existente, semántica de errores y dueño de la transacción. M5 sigue siendo dueño del endpoint, la validación de mesa, fecha y estado, la asociación y la persistencia de `Reserva`. Ni una inserción de cliente por separado ni una llamada HTTP M5→M4 con commits separados satisfacen #48 CA1. Probar fallo de reserva y ausencia de cliente huérfano cuando exista la implementación coordinada. El modelo de cliente no lleva una dependencia circular de FK a reservas; la garantía de al menos una reserva nace del flujo atómico de alta, no de un `POST /clientes` aislado.

## Contratos concretos de M4

| Pieza | Contrato |
| --- | --- |
| `Cliente` | `id: int`, `nombre: str`, `telefono: str`; `nombre`/`telefono` no nulos, sin índices de unicidad para esos campos. Una migración Alembic crea la tabla `clientes`; verificar cabeza de migraciones al implementarla. |
| `ClienteModificar` | `nombre: str`, `telefono: str` obligatorios; validación de entrada antes de asignar campos. No se aceptan modificaciones parciales ni se cambia `id`. |
| `ClienteSalida` | `id: int`, `nombre: str`, `telefono: str`. API devuelve esquema, nunca modelo ORM (D-06). |
| `Pagina[ClienteSalida]` | `items`, `total`, `limit`, `offset`; usar `shared/paginacion.py`, 50 por defecto, 100 máximo. |
| M4 `GET /api/v1/clientes` | 200, incluye búsqueda `q` sobre nombre parcial o teléfono; 422 si paginación inválida. `items: []`/`total: 0` en búsqueda vacía o registro vacío. |
| M4 `PUT /api/v1/clientes/{id}` | 200 con salida actualizada; 404 inexistente; 422 si faltan datos, son vacíos o el nombre no satisface la regla. Sin cambios persistidos en todo caso de error de validación. |
| Interfaz M5 #61 | Pendiente de coordinación. Debe distinguir cliente existente vs datos de cliente nuevo, confirmar cliente y reserva en la misma transacción, y usar solo `atencion.service` como interfaz entre módulos (S0-05 §3.3). No se define unilateralmente la ruta o los schemas de M5. |

Formato de errores HTTP: `{"detalle": "mensaje"}`; `NoEncontradoError` para 404, errores de entrada para 422. No usar 409 para nombres o teléfonos repetidos. Mantener `q` como texto de búsqueda; no transformarlo en restricción de formato telefónico.

## Archivos previstos al implementar (no modificados ahora)

| Ubicación | Responsabilidad |
| --- | --- |
| `backend/app/modules/atencion/{models,schemas,repository,service,router}.py` | Entidad y validación, consultas paginadas, edición, interfaz de servicio consumible por M5, rutas de M4. |
| `backend/alembic/versions/<revision>_crea_clientes.py` | Tabla e índices necesarios tras revisar la cabeza; `alembic/env.py` ya incluye el módulo. |
| `backend/app/main.py` | Registro mínimo del router M4; archivo compartido, coordinar el cambio antes de implementarlo. |
| `backend/tests/modules/atencion/` | Pruebas de esquemas, servicio, repositorio, router y migración según #48-#50. |
| `frontend/src/modules/atencion/{types.ts,api.ts,pages/AtencionPage.tsx,components/}` | Tipos, llamadas de M4, listado, búsqueda, formulario de edición y estados vacíos; pruebas junto a componentes. |
| `frontend/src/shared/components/` | Solo lectura para reutilización: `EmptyState`, `PageHeader`, `ui/data-table`, `ui/search-input`, `ui/form-field` y `ui/dialog`. |
| `backend/app/modules/reservas/` | **Fuera del alcance de edición de M4**: M5 implementará el punto de entrada y la reserva cuando se acuerde el contrato de #61. |

## Pruebas y verificación previstas

| Nivel | Escenarios que acredita | Evidencia |
| --- | --- | --- |
| Esquema y HTTP de M4 | #49 CA1, CA2, CA4; 404; 422; registro sin cambios tras solicitud inválida | `pytest tests/modules/atencion/` con base temporal y `TestClient`. |
| Consultas y frontend de M4 | #50 CA1-CA5, nombres repetidos, teléfonos compartidos, paginación y estados vacíos diferenciados | Pruebas de repositorio y Vitest/Testing Library para página, formulario y `api.ts`. |
| Integración M4-M5 | #48 CA1-CA3, fallo de reserva sin cliente huérfano; uso de cliente existente #61 | Pruebas acordadas con M5 sobre sesión compartida y reserva real; no se consideran completadas con mocks de M5. |
| Criterio telefónico provisional | #49 CA3 | Probar primero en rojo un valor fuera del formato técnico provisional confirmado y comprobar que los datos previos se conservan. |
| Infraestructura | Creación/reversión de la tabla, contratos de importación y checks de CI | `alembic upgrade`/`downgrade` en base temporal; `ruff`, `lint-imports`, `pytest`, `npm run lint`, `format:check`, `typecheck`, `test:coverage` y `build`. |

Strict TDD (configuración de OpenSpec): para cada comportamiento implementable, escribir prueba que falla antes de la implementación; no fabricar una prueba de formato telefónico sin regla. No correr pruebas de aplicación en esta fase documental.

## Matriz de aplicabilidad

El cambio planifica rutas HTTP de FastAPI, pero no cambia enrutamiento de agentes/herramientas ni ejecución de archivos, shell, selección de repositorios, commits, push o creación de PR. Las cinco filas de la matriz de amenazas operacionales (`documentation-like paths`, selección de repositorio Git, estado de commit, estado de push y comandos de PR) son **N/A** por esa razón; las rutas HTTP y sus errores sí se cubren en las pruebas de contrato indicadas arriba.

## Dependencias y pendientes

1. **Formato definitivo #49 CA3:** el formato técnico provisional confirmado permite implementar el criterio; coordinar su eventual reemplazo funcional con el equipo sin imponer requisitos nuevos ahora.
2. **Acuerdo M5 #61:** fijar contrato e integración transaccional con su responsable. #61 y las tres HU M4 figuran abiertas; no dar por cerrada su dependencia. No tocar M5 o `shared/` sin coordinación.
3. **Correcciones documentales:** `SPRINT-0/G3 - Diagramas por modulo.drawio` presenta nombre único y teléfono entero; `SPRINT-0/G3 - Diagrama de clases unificado.drawio` presenta teléfono opcional. `SPRINT-1/S1-07-casos-de-prueba.md` presupone teléfono opcional de 7 a 20 caracteres. Registrar y corregir posteriormente; no derivar validaciones de esos documentos contradictorios.
4. **Nombre compuesto y acentuado:** precisar con el equipo si una implementación concreta necesita distinguir espacios o letras acentuadas; #48 prohíbe números y caracteres especiales, pero no los define para ese caso.
5. **Rama de implementación:** la rama actual `feat/m4-clientes` difiere del patrón `feature/<ID>-<descripcion>` de `AGENTS.md`; regularizar antes de escribir código.
