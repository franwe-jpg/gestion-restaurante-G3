# Tareas: HU-M1-11-12 Modificar y dar de baja una sección

- **Issues:** #15 (HU-M1-11) y #16 (HU-M1-12) · **Rama:** `feature/HU-M1-11-12-modificar-baja-seccion` · **Entrada:** `proposal.md` (S58 a S68), `specs/carta-secciones/spec.md` (S69 a S74), `design.md` (H1 a H14, S75 a S78).
- Strict TDD: la prueba falla primero (404 o 405 de la ruta, campo ausente, texto ausente) y recién después se escribe el código.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-11-12)`). Tipos permitidos: `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR hacia `develop`, sin PR encadenados.
- Orden: secuencial. Las Fases 2 a 4 (frontend) no dependen de la Fase 1, pero se recomienda el orden numérico; la Fase 3 depende de la 2 y la 4 de la 3.
- Pruebas del backend en `backend/tests/modules/productos/` con nombres `test_<función>_<caso>`. Pruebas del frontend junto al archivo que prueban.
- El orden de validación del `PUT` es el de H3 (S75): 422, 404 sección, 409 nombre, 409 orden, 409 agregar a deshabilitada, 404 productos, 409 deshabilitados, 409 traslado.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 430 líneas (≈ 100 de código, ≈ 330 de pruebas) |
| Frontend (cambios estimados) | ≈ 520 líneas (≈ 220 de código, ≈ 300 de pruebas) |
| Estimated changed lines | ≈ 950 en total; cada lado se mide contra su propio punto de control de 800 |
| 400-line budget risk | Low (ambos lados por debajo de 800) |
| Estrategia de entrega | `single-pr`: un PR con 5 commits |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Low

El límite de 800 líneas es un punto de control, no un bloqueo, y una HU nunca se divide en varios PR (AGENTS.md §4).

### Unidades de trabajo

| Unidad | Objetivo | Prueba focalizada | Arnés de ejecución | Límite de reversión |
| --- | --- | --- | --- | --- |
| 1 | Rutas `GET`, `PUT` y `POST .../baja` de secciones y `productos_habilitados` | `pytest tests/modules/productos -k "seccion"` | `TestClient` de FastAPI con SQLite temporal (las propias pruebas) | Revertir el commit 1; sin esquema |
| 2 | `put` del cliente compartido, tipos, `api.ts` y fixtures | `npx vitest run src/shared/api src/modules/productos/api.test.ts` | Cliente con `fetch` simulado | Revertir el commit 2 |
| 3 | Diálogo de edición y reactivación | `npx vitest run src/modules/productos/components/SeccionFormDialog.test.tsx` | Diálogo con la API simulada | Revertir el commit 3 |
| 4 | Acciones por fila y baja con aviso | `npx vitest run src/modules/productos/components/AccionesSeccion.test.tsx src/modules/productos/components/SeccionesTab.test.tsx` | `MemoryRouter` con `useConfirm` simulado | Revertir el commit 4 |
| 5 | Artefactos de SDD | N/A (solo documentos) | N/A | Revertir el commit 5 |

## Fase 1. Backend: consultar, modificar y dar de baja una sección (H1 a H8)

- [x] **1.1** (Rojo) `test_schemas.py`: `SeccionModificar` hereda las reglas de `SeccionCrear` (nombre, `orden` estricto, ids sin repetidos), acepta `estado` ausente (`None`) y `HABILITADO`/`DESHABILITADO`. Falla por clase ausente.
- [x] **1.2** (Rojo) `test_service.py` y `test_router.py`, consulta y 404: `test_obtener_seccion_con_productos`; 404 parametrizado sobre `GET`, `PUT` y `POST .../baja`.
- [x] **1.3** (Rojo) `test_router.py`, nombre y orden (CA 1 y 2 de #15): `test_modificar_seccion_nombre_y_orden_200`; 422 parametrizado (51 caracteres, `0`, `"3"`), también con id inexistente (S75); 409 nombre de otra; 200 al cambiar solo la capitalización; 409 orden ocupado; 200 orden de deshabilitada; 200 guardar sin cambios.
- [x] **1.4** (Rojo) `test_router.py`, productos (CA 3 a 6): agregar con confirmación; sin confirmar 409 con producto y sección actual; 409 producto deshabilitado; 409 agregar a deshabilitada (S76); id ya presente ignorado (S72); falla parcial sin cambios (S71); `producto_ids: []` conserva los productos (CA 4).
- [x] **1.5** (Rojo) `test_router.py` y `test_service.py`, reactivación (CA 7): reactivar 200; reactivar con orden ocupado 409 y sigue deshabilitada; reactivar con orden libre 200. `test_service.py`: `test_modificar_seccion_convierte_la_carrera_de_orden_en_conflicto` con `monkeypatch.setattr(service.repository, "buscar_habilitada_por_orden", lambda *_: None)`; el `service` pasa `excluir_id` **posicional** (H4) para que el `lambda *_` siga válido, y la prueba existente `test_crear_seccion_convierte_la_carrera_de_orden_en_conflicto` sigue verde.
- [x] **1.6** (Rojo) `test_router.py`, baja (#16): `test_dar_de_baja_seccion_200`; productos conservan estado y sección; reactivar los vuelve a mostrar; baja doble 409 (S73). Conteo: `productos_habilitados` cuenta 2 de 3 en `GET /secciones` y en `SeccionSalida`.
- [x] **1.7** (Verde) `schemas.py`: `SeccionModificar(SeccionCrear)` con `estado: Estado | None = None`; `productos_habilitados: int` en `SeccionSalida` y `SeccionListado` (H1, H8). `repository.py`: `excluir_id: int | None = None` en `existe_nombre_normalizado` y `buscar_habilitada_por_orden`; el conteo con `func.count(Producto.id).filter(...)` en `listar_secciones` (H4, H8).
- [x] **1.8** (Verde) `service.py`: `obtener_seccion`, `modificar_seccion`, `dar_de_baja_seccion`; auxiliares `_obtener_seccion`, `_validar_agregado_en_deshabilitada`, `_aplicar_cambios_seccion`, `_confirmar_seccion` (divide `_guardar`, traduce `IntegrityError` a 409 con `rollback`), `_a_salida_seccion`. Funciones ≤ 50 líneas y complejidad ≤ 10 (H3, H5 a H7). `router.py`: `consultar_seccion`, `modificar_seccion` (JSON) y `dar_de_baja_seccion`, una línea que delega (H2).
- [x] **1.9** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`. Las pruebas de HU-M1-10 y de productos siguen verdes.
- [x] **1.10** Commit 1: `feat: agrega consultar, modificar y dar de baja una sección en el backend (HU-M1-11-12)`. Rollback: revertir el commit; sin cambios de esquema.

## Fase 2. Frontend: cliente compartido, tipos y api (H9)

- [x] **2.1** (Rojo) **Código compartido (avisar al equipo, AGENTS.md §9.3).** `frontend/src/shared/api/client.test.ts`: `put` envía JSON con método `PUT`, cabecera `Content-Type` y cuerpo serializado, y devuelve el JSON; propaga el error de la API como `post`. Falla por método ausente.
- [x] **2.2** (Rojo) `api.test.ts`: `modificarSeccion(id, datos)` llama `clienteHttp.put('/secciones/{id}', datos)`; `darDeBajaSeccion(id)` llama `clienteHttp.post('/secciones/{id}/baja', {})`.
- [x] **2.3** (Rojo) Fixtures: sumar `productos_habilitados: number` a los objetos `Seccion`/`SeccionListado` de `ProductoNuevoPage.test.tsx`, `ProductoEditarPage.test.tsx`, `SeccionesTabla.test.tsx`, `SeccionesTab.test.tsx` y `SeccionFormDialog.test.tsx`. Se hace en el mismo commit que el tipo para que `typecheck` quede verde.
- [x] **2.4** (Verde) `frontend/src/shared/api/client.ts`: `put<T, B>` gemelo de `post` (H9). `types.ts`: `SeccionModificar extends SeccionCrear { estado?: 'HABILITADO' }`; `Seccion` y `SeccionListado` suman `productos_habilitados: number`. `api.ts`: `modificarSeccion` y `darDeBajaSeccion`.
- [x] **2.5** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **2.6** Commit 2: `feat: agrega el método put y la api de modificar y dar de baja una sección (HU-M1-11-12)`. Rollback: revertir el commit.

## Fase 3. Frontend: diálogo de edición y reactivación (H10 a H13, S77, S78)

- [x] **3.1** (Rojo) `SeccionFormDialog.test.tsx`, edición (CA 1, 2): título «Editar sección», nombre y orden precargados, envía `modificarSeccion(id, {nombre, orden, producto_ids, confirmar_traslado})`, avisa «Sección modificada»; 409 de nombre y de posición bajo su campo; error general «No se pudo modificar la sección».
- [x] **3.2** (Rojo) `SeccionFormDialog.test.tsx`, productos (CA 3 a 6): los actuales llegan marcados; desmarcar uno muestra el `Alert` de S62 y sigue marcado (CA 4); agregar uno de otra sección pide confirmación que nombra solo los nuevos y envía `producto_ids: nuevos` con `confirmar_traslado: true` (H12); sin nuevos no pide confirmación.
- [x] **3.3** (Rojo) `SeccionFormDialog.test.tsx`, reactivación (CA 7): la casilla «Habilitar la sección» aparece solo con la fila `DESHABILITADO`; marcada envía `estado: 'HABILITADO'`, sin marcar omite `estado` (H13); 409 de posición ocupada corregible en el mismo guardado.
- [x] **3.4** (Verde) `useFormularioSeccion.ts`: modo edición, bloqueo de desmarcado, traslado de nuevos, `estado` opcional. `SeccionFormDialog.tsx`: prop `seccion?: SeccionListado`, textos de S78, casilla de reactivación.
- [x] **3.5** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **3.6** Commit 3: `feat: agrega la edición y la reactivación de una sección en el diálogo (HU-M1-11-12)`. Rollback: revertir el commit.

## Fase 4. Frontend: acciones por fila y baja (H14)

- [x] **4.1** (Rojo) `useBajaSeccion.test.tsx`: `descripcionDeLaBaja` con 0, 1 y 3 productos habilitados (S78); confirmar llama a `darDeBajaSeccion` y avisa «Sección dada de baja»; cancelar no envía nada (CA 2 y 4 de #16); error «No se pudo dar de baja la sección».
- [x] **4.2** (Rojo) `AccionesSeccion.test.tsx`: «Editar» siempre; «Dar de baja» solo con la sección habilitada (CA 1).
- [x] **4.3** (Rojo) `SeccionesTabla.test.tsx` y `SeccionesTab.test.tsx`: la fila muestra las acciones vía `renderAcciones`; «Editar» abre el diálogo con la fila y los productos habilitados; tras la baja se recargan solo las secciones y la fila sigue en la página con «Deshabilitado».
- [x] **4.4** (Verde) Crear `components/useBajaSeccion.ts` y `components/AccionesSeccion.tsx`. Modificar `SeccionesTabla.tsx` (`renderAcciones`) y `SeccionesTab.tsx` (`dialogo: { seccion?: SeccionListado } | null`, recarga tras la baja). `App.tsx` no cambia.
- [x] **4.5** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **4.6** Commit 4: `feat: agrega editar y dar de baja una sección desde la fila (HU-M1-11-12)`. Rollback: revertir el commit.

## Fase 5. Cierre

- [x] **5.1** CI completa. Backend desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest`, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`, cobertura ≥ 60 %. No bajar umbrales ni desactivar reglas.
- [x] **5.2** Regresión global: las pruebas de HU-M1-10, platos, postres y bebidas pasan sin cambios de comportamiento. `alembic heads` desde `backend/` muestra una sola cabeza, sin migración nueva.
- [x] **5.3** Comprobar que cada escenario de la spec tiene una prueba que pasa (ver la trazabilidad).
- [x] **5.4** Escribir `openspec/changes/HU-M1-11-12/apply-progress.md` con las notas del PR (plantilla `.github/pull_request_template.md`, `Closes #15` y `Closes #16`, hacia `develop`): supuestos a validar S58 a S68 y S75 a S78; aviso del cambio compartido `frontend/src/shared/api/client.ts` (§9.3); enmienda de S70 según S75; tamaño medido de cada lado contra el punto de control de 800.
- [x] **5.5** Commit 5 (artefactos de SDD, tarea de apply): `docs: agrega los artefactos de SDD de HU-M1-11-12 (HU-M1-11-12)`. Incluye `exploration.md` (si existe), `proposal.md`, `specs/`, `design.md`, `tasks.md`, `apply-progress.md` y, si existe, `verify-report.md`. Rollback: revertir el commit.

## Trazabilidad

| Criterio / requisito de la spec | Tareas |
| --- | --- |
| Consultar una sección; 404 en `GET`, `PUT` y baja | 1.2, 1.8 |
| #15 CA 1 Modificar nombre y orden | 1.1, 1.3, 2.2, 3.1 |
| #15 CA 2 Valores inválidos, nombre y orden repetidos, capitalización, deshabilitada, sin cambios | 1.3, 3.1 |
| #15 CA 3 Agregar productos habilitados, con traslado confirmado | 1.4, 3.2 |
| #15 CA 4 Todo producto pertenece a una sección (omitir y desmarcar) | 1.4, 3.2 |
| #15 CA 5 Producto de otra sección sin confirmar | 1.4, 3.2 |
| #15 CA 6 Producto deshabilitado y agregar a deshabilitada (S76) | 1.4 |
| #15 CA 7 Reactivar, con orden ocupado y carrera | 1.5, 3.3 |
| #16 CA 1 Baja confirmada | 1.6, 2.2, 4.1, 4.2 |
| #16 CA 2 Aviso con la cantidad de productos habilitados | 1.6, 4.1 |
| #16 CA 3 Los productos conservan su estado | 1.6 |
| #16 CA 4 Cancelar la baja | 4.1 |
| Baja de una ya deshabilitada (S73) | 1.6, 4.2 |
| Atomicidad del `PUT` (S71) y ids ya presentes (S72) | 1.4, 1.5 |
| Orden de validación (S70, S75, H3) | 1.3 |
| Listado: `productos_habilitados` y acciones por fila | 1.6, 2.3, 4.3 |
| Método `put` compartido (H9) | 2.1, 2.4, 5.4 |
| Regresión de HU-M1-10 y de productos | 1.5, 1.9, 2.5, 5.2 |
