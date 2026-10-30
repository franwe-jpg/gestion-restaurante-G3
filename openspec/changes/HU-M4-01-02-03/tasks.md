# Tareas: HU-M4-01-02-03 · Gestión de clientes

La implementación fue autorizada para los archivos de M4 indicados en el preflight; M5, `shared/` y los diagramas permanecen fuera de alcance. Cada CA conserva el número y la issue de origen en la especificación.

## Pronóstico de carga de revisión

| Campo | Estimación |
| --- | --- |
| Backend (modelo, migración, capas, pruebas) | ≈ 350-500 líneas modificadas |
| Frontend (API, pantalla, edición, pruebas) | ≈ 250-400 líneas modificadas |
| Total | ≈ 600-900 líneas modificadas, alto riesgo de superar 400 por PR |
| Estrategia acordada | Un solo PR por grupo de HU de una entidad (`AGENTS.md` §4); el límite local 800/800 por lado es punto de control, no división de HU. |
| Recomendación frente a presupuesto de sesión (400 líneas/PR) | Preparar unidades revisables dentro del PR; solicitar autorización de excepción de tamaño antes de implementar si el pronóstico sigue excediendo 400. No dividir la HU en varios PR sin una nueva decisión del equipo. |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

### Unidades revisables para el PR único

| Unidad | Objetivo | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- | --- |
| 1 | Datos M4, validación y migración | `pytest tests/modules/atencion/test_schemas.py tests/modules/atencion/test_migracion.py` | Alembic sobre base temporal; upgrade y downgrade | Migración, modelo y esquemas M4 |
| 2 | Edición, búsqueda y rutas M4 | `pytest tests/modules/atencion/` | `TestClient` sobre base SQLite temporal | Repositorio, servicio, router y registro de rutas |
| 3 | Interfaz de lista y edición M4 | `npm test -- atencion` | Página `/atencion` con servidor de prueba de M4 | Página, componentes, tipos y API de M4 |
| 4 | Costura con M5 (sujeta a acuerdo externo) | Pruebas de integración M4-M5 acordadas con el responsable de #61 | Guardar una primera reserva válida y otra que falle; comprobar asociación y ausencia de cliente huérfano | Solo interfaz pública de M4; cambios M5 bajo su responsable |

## Fase 1: Acordar el límite con M5 y preparar persistencia M4

- [ ] **1.1 Coordinación (bloqueante para #48):** acordar con el responsable de #61 la interfaz pública de `atencion.service` para preparar un cliente nuevo en la misma sesión de la reserva, quién confirma/revierte y cómo se selecciona uno existente. Revisar `backend/app/modules/reservas/` (read-only) y el esquema de la reserva; no editar M5. Registrar el acuerdo antes de dar por implementable #48 CA1-CA3.
- [x] **1.2 RED:** escribir en `backend/tests/modules/atencion/test_migracion.py` una prueba que exija `clientes` con `id`, `nombre` y `telefono` no nulos, sin unicidad de nombre/teléfono, y que verifique upgrade/downgrade en base temporal; comprobar que falla.
- [x] **1.3 GREEN:** crear `Cliente` en `backend/app/modules/atencion/models.py` y una revisión `backend/alembic/versions/<revision>_crea_clientes.py`; revisar cabeza Alembic, aplicar downgrade/upgrade aislado. `backend/alembic/env.py` (read-only) ya registra el módulo.
- [x] **1.4 RED:** crear `backend/tests/modules/atencion/test_schemas.py` para nombre y teléfono obligatorios/no vacíos, nombre con dígitos o caracteres especiales inválido y duplicados permitidos (#48 CA2-CA3, #49 CA2 y CA4); comprobar fallo previo.
- [ ] **1.5 GREEN:** definir `ClienteModificar`, `ClienteSalida` y entrada para el servicio de alta vinculada en `backend/app/modules/atencion/schemas.py`, con formato provisional confirmado del teléfono (dígitos, espacios, guiones, `+` solo al inicio), sin longitud inventada; comprobar las pruebas de 1.4.

**Distinción de 1.4 y 1.5:** el RED de 1.4 cubre todos los casos expresos: omisión/vacío de ambos campos, nombre con dígitos/caracteres especiales y duplicados en `ClienteNuevo` (14 fallos previos a su implementación); omisión/vacío y nombre inválido en `ClienteModificar` (13 fallos por ausencia del esquema antes de implementarlo). Las pruebas vigentes de esquemas cubren esos casos. `ClienteNuevo`, `ClienteModificar` y `ClienteSalida` ya existen; 1.5 sigue pendiente únicamente porque la entrada pública del servicio de alta vinculada a M5 (forma del DTO y responsabilidad transaccional) requiere acuerdo con su responsable. No confundir el esquema local `ClienteNuevo` con ese contrato entre servicios.

## Fase 2: Servicio y rutas de M4 (TDD por criterio)

- [x] **2.1 RED:** en `backend/tests/modules/atencion/test_service.py` y `test_router.py`, probar que `PUT /api/v1/clientes/{id}` actualiza ambos datos, devuelve 200 y la consulta posterior los muestra (#49 CA1), y que un ID ausente devuelve 404; comprobar fallo previo.
- [x] **2.2 RED:** en los mismos archivos probar que un nombre con números o caracteres especiales (#49 CA2) o un campo obligatorio vacío u omitido (#49 CA4) devuelve 422 con `detalle` que identifica el campo y conserva **ambos** valores previos; comprobar fallo previo.
- [x] **2.3 GREEN:** implementar `backend/app/modules/atencion/repository.py`, `service.py` y `router.py` para modificar tras validar y confirmar una vez; añadir el router de M4 a `backend/app/main.py` (archivo compartido: coordinar antes). No habilitar alta HTTP independiente ni baja de clientes.
- [x] **2.4 RED:** en `backend/tests/modules/atencion/test_repository.py` y `test_router.py`, probar `GET /api/v1/clientes` con datos de contacto y paginación (#50 CA1), nombre coincidente total o parcialmente (#50 CA2), teléfono compartido por más de un cliente (#50 CA3), búsqueda sin resultados (#50 CA4) y registro vacío (#50 CA5); comprobar fallo previo.
- [x] **2.5 GREEN:** en `backend/app/modules/atencion/repository.py`, `service.py` y `router.py`, implementar filtro literal por nombre parcial o teléfono coincidente y `Pagina[ClienteSalida]` de `backend/app/shared/paginacion.py` (read-only), con total filtrado y `limit`/`offset` del contrato; ejecutar pruebas de 2.4.
- [ ] **2.6 RED (dependiente de 1.1):** probar en `backend/tests/modules/atencion/test_service.py` que la interfaz pública de preparación de cliente para una reserva permite nombres repetidos, rechaza nombre/teléfono ausente y nombre inválido (#48 CA2-CA3), y no hace commit propio. Una prueba de coordinación en sesión compartida comprueba rollback del cliente cuando falla la reserva (#48 CA1, límite). Comprobar fallo previo; no afirmar que esto sustituye la prueba de integración real con M5.
- [ ] **2.7 GREEN (dependiente de 1.1):** implementar únicamente en `backend/app/modules/atencion/service.py` y `repository.py` la interfaz M4 acordada para crear cliente dentro de la sesión de M5, sin commit propio ni ruta de alta aislada. Las reglas y los archivos de M5 siguen siendo de su responsable.

## Fase 3: Interfaz M4 (TDD por criterio)

- [x] **3.1 RED/GREEN:** en `frontend/src/modules/atencion/types.ts` y `api.ts`, agregar tipos `Cliente`, `ClienteModificar`, `PaginaCliente` y llamadas `listarClientes(q, limit, offset)` y `modificarCliente(id, datos)` mediante `clienteHttp`. Probar en `frontend/src/modules/atencion/api.test.ts` ruta, filtro codificado, cuerpo de edición y error; sin `fetch` en componentes.
- [x] **3.2 RED/GREEN:** en `frontend/src/modules/atencion/pages/AtencionPage.test.tsx` y `AtencionPage.tsx`, comprobar y mostrar listado con nombre y teléfono (#50 CA1), búsqueda por nombre total/parcial (#50 CA2), búsqueda por teléfono (#50 CA3) y estados diferenciados de filtro sin resultados (#50 CA4) y registro vacío (#50 CA5). Distinguir página vacía por `offset` usando `total`.
- [x] **3.3 RED/GREEN:** en `frontend/src/modules/atencion/components/ClienteFormDialog.test.tsx` y `ClienteFormDialog.tsx`, probar edición exitosa (#49 CA1), aviso de nombre con números/caracteres especiales (#49 CA2) y campos obligatorios vacíos (#49 CA4), sin enviar solicitud inválida ni borrar datos previos. Reutilizar componentes comunes existentes tras revisar `frontend/src/shared/components/` (read-only); no crear formulario de reserva M5.

## Fase 4: Integración y criterios pendientes

- [ ] **4.1 Costura M4-M5 (bloqueada hasta coordinación e implementación de #61):** acordar con M5 pruebas con reserva real para #48 CA1 (alta y asociación), #48 CA2 (dato obligatorio faltante sin cliente ni reserva), #48 CA3 (nombre inválido) y fallo de reserva sin cliente huérfano. Registrar evidencia solo después de ejecutarlas; `backend/app/modules/reservas/` (read-only) permanece a cargo de M5. No marcar #48 completo por pruebas con un stub.
- [x] **4.2 #49 CA3:** con el formato técnico provisional confirmado, añadir **primero** una prueba fallida concreta de teléfono inválido que preserva el registro y muestra aviso, y solo después aplicar la regla acordada. No inventar longitudes ni restricciones adicionales.
- [ ] **4.3 Revisión documental:** dejar constancia de las diferencias pendientes de `SPRINT-0/G3 - Diagramas por modulo.drawio` (read-only), `SPRINT-0/G3 - Diagrama de clases unificado.drawio` (read-only) y `SPRINT-1/S1-07-casos-de-prueba.md` (read-only), y coordinar su actualización posterior sin editarlos en este cambio.
- [ ] **4.4 Calidad:** desde `backend/`, ejecutar `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %), más migración de prueba. Desde `frontend/`, ejecutar `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %). Mantener tareas no verificadas sin marcar como completadas.
- [ ] **4.5 Preparación de implementación:** comprobar dependencias #61 y M3, acordar la excepción al presupuesto de 400 líneas del PR único si corresponde y regularizar rama `feature/HU-M4-01-02-03-clientes` antes de escribir código. No crear ni editar PR/issues/tarjetas sin confirmación explícita.
