# Tareas: HU-M4-01-02-03 · Gestión de clientes

La implementación fue autorizada para los archivos de M4 indicados en el preflight; M5, `shared/` y los diagramas permanecen fuera de alcance. Cada CA conserva el número y la issue de origen en la especificación.

## Pronóstico de carga de revisión

Pronóstico original del cambio, ya implementado e integrado en `develop`. El pronóstico vigente es el del delta, más abajo.

| Campo | Estimación |
| --- | --- |
| Backend (modelo, migración, capas, pruebas) | ≈ 350-500 líneas modificadas |
| Frontend (API, pantalla, edición, pruebas) | ≈ 250-400 líneas modificadas |
| Total | ≈ 600-900 líneas modificadas, alto riesgo de superar 400 por PR |
| Estrategia acordada | Un solo PR por grupo de HU de una entidad (`AGENTS.md` §4); el límite local 800/800 por lado es punto de control, no división de HU. |
| Recomendación frente a presupuesto de sesión (400 líneas/PR) | Preparar unidades revisables dentro del PR; solicitar autorización de excepción de tamaño antes de implementar si el pronóstico sigue excediendo 400. No dividir la HU en varios PR sin una nueva decisión del equipo. |

Decision needed before apply: Resuelta (un solo PR, `AGENTS.md` §4)
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: High

### Unidades revisables para el PR único

| Unidad | Objetivo | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- | --- |
| 1 | Datos M4, validación y migración | `pytest tests/modules/atencion/test_schemas.py tests/modules/atencion/test_migracion.py` | Alembic sobre base temporal; upgrade y downgrade | Migración, modelo y esquemas M4 |
| 2 | Edición, búsqueda y rutas M4 | `pytest tests/modules/atencion/` | `TestClient` sobre base SQLite temporal | Repositorio, servicio, router y registro de rutas |
| 3 | Interfaz de lista y edición M4 | `npm test -- atencion` | Página `/atencion` con servidor de prueba de M4 | Página, componentes, tipos y API de M4 |
| 4 | Costura con M5 (interfaz acordada; ver «Delta» en `design.md`) | Pruebas de integración M4-M5 acordadas con el responsable de #61 | Guardar una primera reserva válida y otra que falle; comprobar asociación y ausencia de cliente huérfano | Solo interfaz pública de M4; cambios M5 bajo su responsable |

## Pronóstico de carga de revisión del delta (interfaz con M5)

| Campo | Estimación |
| --- | --- |
| Backend (`repository.crear_cliente`, dos funciones de servicio, pruebas 1.5 y 2.6) | ≈ 120-180 líneas modificadas |
| Frontend (M4) | 0 líneas |
| Contra el límite de 800 por lado | Muy por debajo; el total del cambio sigue dentro de 800 en backend |

Decision needed before apply: No
Chained PRs recommended: No

## Fase 1: Acordar el límite con M5 y preparar persistencia M4

- [x] **1.1 Coordinación (RESUELTA):** la interfaz pública con M5 quedó acordada en `design.md`, sección «Delta: interfaz acordada con M5» (`registrar_cliente_para_reserva` y `existe_cliente`; M5 confirma o revierte; M4 solo hace `flush`). Con ese acuerdo, #48 CA1-CA3 es implementable.
- [x] **1.2 RED:** escribir en `backend/tests/modules/atencion/test_migracion.py` una prueba que exija `clientes` con `id`, `nombre` y `telefono` no nulos, sin unicidad de nombre/teléfono, y que verifique upgrade/downgrade en base temporal; comprobar que falla.
- [x] **1.3 GREEN:** crear `Cliente` en `backend/app/modules/atencion/models.py` y una revisión `backend/alembic/versions/<revision>_crea_clientes.py`; revisar cabeza Alembic, aplicar downgrade/upgrade aislado. `backend/alembic/env.py` (read-only) ya registra el módulo.
- [x] **1.4 RED:** crear `backend/tests/modules/atencion/test_schemas.py` para nombre y teléfono obligatorios/no vacíos, nombre con dígitos o caracteres especiales inválido y duplicados permitidos (#48 CA2-CA3, #49 CA2 y CA4); comprobar fallo previo.
- [x] **1.5 RED → GREEN → refactor (`repository.crear_cliente`):** en `backend/tests/modules/atencion/test_repository.py`, escribir primero una prueba con sesión SQLite que llame a `crear_cliente(db, nombre, telefono)` y compruebe que devuelve un `Cliente` con `id` asignado (por `flush`), visible en la misma sesión, y que tras `db.rollback()` ya no existe; comprobar que falla (la función no existe). Luego implementar en `backend/app/modules/atencion/repository.py` `crear_cliente` con `db.add` + `db.flush()`, sin `commit`, y revisar que siga el estilo de `crear_comanda`. Refactor solo si no rompe las pruebas.

**Nota sobre 1.4:** el RED de 1.4 cubre los casos expresos de `ClienteNuevo` (14 fallos previos) y `ClienteModificar` (13 fallos previos); los tres esquemas (`ClienteNuevo`, `ClienteModificar`, `ClienteSalida`) ya existen y no cambian en el delta. La entrada pública hacia M5 usa tipos primitivos (ver «Delta» del diseño), no `ClienteNuevo`.

## Fase 2: Servicio y rutas de M4 (TDD por criterio)

- [x] **2.1 RED:** en `backend/tests/modules/atencion/test_service.py` y `test_router.py`, probar que `PUT /api/v1/clientes/{id}` actualiza ambos datos, devuelve 200 y la consulta posterior los muestra (#49 CA1), y que un ID ausente devuelve 404; comprobar fallo previo.
- [x] **2.2 RED:** en los mismos archivos probar que un nombre con números o caracteres especiales (#49 CA2) o un campo obligatorio vacío u omitido (#49 CA4) devuelve 422 con `detalle` que identifica el campo y conserva **ambos** valores previos; comprobar fallo previo.
- [x] **2.3 GREEN:** implementar `backend/app/modules/atencion/repository.py`, `service.py` y `router.py` para modificar tras validar y confirmar una vez; añadir el router de M4 a `backend/app/main.py` (archivo compartido: coordinar antes). No habilitar alta HTTP independiente ni baja de clientes.
- [x] **2.4 RED:** en `backend/tests/modules/atencion/test_repository.py` y `test_router.py`, probar `GET /api/v1/clientes` con datos de contacto y paginación (#50 CA1), nombre coincidente total o parcialmente (#50 CA2), teléfono compartido por más de un cliente (#50 CA3), búsqueda sin resultados (#50 CA4) y registro vacío (#50 CA5); comprobar fallo previo.
- [x] **2.5 GREEN:** en `backend/app/modules/atencion/repository.py`, `service.py` y `router.py`, implementar filtro literal por nombre parcial o teléfono coincidente y `Pagina[ClienteSalida]` de `backend/app/shared/paginacion.py` (read-only), con total filtrado y `limit`/`offset` del contrato; ejecutar pruebas de 2.4.
- [x] **2.6 RED (requiere 1.5):** en `backend/tests/modules/atencion/test_service.py`, con una sesión SQLite compartida y sin `TestClient`, escribir las 6 pruebas del Delta y comprobar que fallan (las funciones no existen):
  1. Datos válidos: `registrar_cliente_para_reserva` devuelve un `id`; el cliente es visible en la misma sesión y la transacción sigue abierta (sin commit propio).
  2. `db.rollback()` posterior: el cliente no queda registrado (#48 CA1, límite).
  3. Dos clientes con el mismo nombre: ambos se registran.
  4. `nombre` o `telefono` vacío: `DatosInvalidosError` cuyo mensaje nombra el campo, sin cliente agregado (#48 CA2).
  5. Nombre con dígitos o caracteres especiales: `DatosInvalidosError` que nombra `nombre` y no contiene «Value error, » (#48 CA3).
  6. `existe_cliente`: `True` para un cliente existente, `False` para un `id` inexistente.
  Estas pruebas no sustituyen la costura real con una reserva (4.1).
- [x] **2.7 GREEN → refactor (requiere 2.6):** en `backend/app/modules/atencion/service.py` implementar `registrar_cliente_para_reserva(db, nombre, telefono) -> int`: valida con `ClienteNuevo`, traduce `pydantic.ValidationError` a `DatosInvalidosError` con el primer error como «campo: mensaje» y sin el prefijo «Value error, » de pydantic, llama a `repository.crear_cliente` y devuelve el `id`; sin `commit` ni `rollback`. Implementar `existe_cliente(db, cliente_id) -> bool` como `repository.obtener_cliente(db, cliente_id) is not None`. Sin ruta HTTP nueva, sin cambios en `ClienteSalida`, `GET`/`PUT`, modelos ni migraciones. Comprobar las 6 pruebas de 2.6, luego `ruff` y `lint-imports`.

## Fase 3: Interfaz M4 (TDD por criterio)

- [x] **3.1 RED/GREEN:** en `frontend/src/modules/atencion/types.ts` y `api.ts`, agregar tipos `Cliente`, `ClienteModificar`, `PaginaCliente` y llamadas `listarClientes(q, limit, offset)` y `modificarCliente(id, datos)` mediante `clienteHttp`. Probar en `frontend/src/modules/atencion/api.test.ts` ruta, filtro codificado, cuerpo de edición y error; sin `fetch` en componentes.
- [x] **3.2 RED/GREEN:** en `frontend/src/modules/atencion/pages/AtencionPage.test.tsx` y `AtencionPage.tsx`, comprobar y mostrar listado con nombre y teléfono (#50 CA1), búsqueda por nombre total/parcial (#50 CA2), búsqueda por teléfono (#50 CA3) y estados diferenciados de filtro sin resultados (#50 CA4) y registro vacío (#50 CA5). Distinguir página vacía por `offset` usando `total`.
- [x] **3.3 RED/GREEN:** en `frontend/src/modules/atencion/components/ClienteFormDialog.test.tsx` y `ClienteFormDialog.tsx`, probar edición exitosa (#49 CA1), aviso de nombre con números/caracteres especiales (#49 CA2) y campos obligatorios vacíos (#49 CA4), sin enviar solicitud inválida ni borrar datos previos. Reutilizar componentes comunes existentes tras revisar `frontend/src/shared/components/` (read-only); no crear formulario de reserva M5.

## Fase 4: Integración y criterios pendientes

- [x] **4.1 Costura M4-M5 con reserva real (ejecuta M5):** _(hecha por la Fase 13 de `HU-M5-01-02-03`; evidencia en `apply-progress.md`)_ la realizan el cambio `HU-M5-01-02-03` y su responsable, en el mismo PR; M4 no edita `backend/app/modules/reservas/`. Las pruebas de integración con una reserva real cubren #48 CA1 (alta y asociación), CA2 (dato obligatorio faltante sin cliente ni reserva), CA3 (nombre inválido) y fallo de reserva sin cliente huérfano. Registrar la evidencia solo tras ejecutarlas. La issue #48 se cierra únicamente cuando esas pruebas de integración pasen; las pruebas con stub no bastan.
- [x] **4.2 #49 CA3:** con el formato técnico provisional confirmado, añadir **primero** una prueba fallida concreta de teléfono inválido que preserva el registro y muestra aviso, y solo después aplicar la regla acordada. No inventar longitudes ni restricciones adicionales.
- [ ] **4.3 Revisión documental:** dejar constancia de las diferencias pendientes de `SPRINT-0/G3 - Diagramas por modulo.drawio` (read-only), `SPRINT-0/G3 - Diagrama de clases unificado.drawio` (read-only) y `SPRINT-1/S1-07-casos-de-prueba.md` (read-only), y coordinar su actualización posterior sin editarlos en este cambio.
- [ ] **4.4 Calidad:** desde `backend/`, ejecutar `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %), más migración de prueba. Desde `frontend/`, ejecutar `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %). Mantener tareas no verificadas sin marcar como completadas.
- [ ] **4.5 Preparación de implementación:** comprobar dependencias #61 y M3 y trabajar en la rama `feature/HU-M4-01-HU-M5-01-cliente-en-reserva` (ya activa; un solo PR junto con `HU-M5-01-02-03`). No crear ni editar PR/issues/tarjetas sin confirmación explícita.
