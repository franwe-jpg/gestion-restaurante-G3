# Propuesta: HU-M3-02 y HU-M3-04 (modificar y listar sectores)

- **Issues:** [#34](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/34) (HU-M3-02), [#36](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/36) (HU-M3-04) · **Épica:** #32 · **Tarea madre:** #167
- **Rama:** `feature/HU-M3-02-04-modificar-listar-sector`
- **Cambio agrupado por ABM:** el listado es el punto de entrada de la modificación; AGENTS.md §4 autoriza juntar modificación y listado de una misma entidad con el mismo responsable.

## Intención

El módulo de Salón ya permite crear sectores y mesas, pero la pantalla no muestra ningún sector: no se puede consultar la distribución ni corregir un nombre o una descripción mal cargados. Esta HU agrega el listado de sectores en `/salon` y la modificación de un sector existente desde la fila correspondiente.

## Alcance

### Incluido

- `PUT /api/v1/sectores/{sector_id}` (200) con 404, 409 y 422, y la exclusión del propio id en la unicidad del nombre.
- Tabla de sectores en `/salon` con Nombre, Descripción, Estado y la acción «Editar «nombre»», paginada con `Pagination`.
- Aviso «No hay sectores disponibles» cuando el listado viene vacío.
- Diálogo de sector reutilizado en modo alta y edición, con datos precargados, validaciones locales y traducción del 409 bajo el campo Nombre.
- Una prueba por criterio de aceptación de cada HU (camino feliz y error o límite).

### Excluido

- Eliminar un sector, habilitarlo o deshabilitarlo (HU-M3-03, #35).
- La columna «Mesas» de la maqueta, que depende de HU-M3-08 (#41).
- Filtros, pestañas y búsqueda en la pantalla del salón: no los piden estas HU.
- Cambios en `GET /api/v1/sectores`: la ruta de HU-M3-05 ya devuelve todos los sectores ordenados por nombre.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `salon-sectores`: suma la modificación de un sector y el listado en pantalla.

## Decisiones tomadas

- **D1. Contrato de la modificación.** `PUT /api/v1/sectores/{sector_id}` con `SectorModificar {nombre, descripcion?}`; 200 con `SectorSalida`; 404 si no existe; 409 si el nombre pertenece a otro sector; 422 por datos inválidos. Mismo contrato que HU-M1-02.
- **D2. Unicidad con exclusión.** `repository.existe_nombre_normalizado` recibe `excluir_id: int | None = None`; el alta sigue llamándola sin exclusión.
- **D3. Estado fuera del cuerpo.** `SectorModificar` prohíbe campos extra: el estado no se recibe, igual que en el alta (D3 de HU-M3-01). Cambiarlo es de HU-M3-03.
- **D4. Reutilizar el listado del backend.** La pantalla usa `GET /api/v1/sectores?limit&offset` sin `estado`, con lo que ve habilitados y deshabilitados.
- **D5. Un solo diálogo.** `SectorFormDialog` recibe un `sector` opcional: sin él da de alta, con él edita. El `hook` y el validador son los mismos del alta, con los datos iniciales del sector.
- **D6. Tabla dentro de `/salon`.** El listado vive en la misma pantalla, en reemplazo del `EmptyState` que anunciaba HU-M3-04. No se agregan rutas ni páginas nuevas.

## Enfoque

Backend por capas: el `router` solo delega, el `service` valida existencia y unicidad y confirma la transacción, el `repository` consulta y agrega sin confirmar (D-10). Frontend: la pantalla carga el listado con `useApi` + `usePaginacion`, lo muestra con `DataTable` en un componente de presentación y abre el diálogo en modo edición desde la fila. Toda llamada a la API pasa por `modules/salon/api.ts` (D-16).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | La modificación admite cualquier sector, habilitado o deshabilitado. El estado no se toca. |
| S2 | `PUT` reemplaza `nombre` y `descripcion`: si `descripcion` no se envía, queda en `null`. |
| S3 | El listado muestra todos los sectores (habilitados y deshabilitados) ordenados por nombre, 50 por página. |
| S4 | Cancelar en la edición no envía ninguna solicitud y la fila conserva los datos originales. |
| S5 | Un id de sector inexistente al modificar responde 404 con «El sector {id} no existe». |
| S6 | El nombre repetido responde 409 con «El sector ya existe», también cuando coincide con un sector deshabilitado. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/salon/{schemas,repository,service,router}.py` | Modificado |
| `backend/tests/modules/salon/{test_schemas,test_service,test_router}.py` | Modificado |
| `frontend/src/shared/api/client.ts` (+ prueba) | Compartido: método `put` con JSON, aditivo |
| `frontend/src/modules/salon/{api,types}.ts` (+ prueba) | Modificado |
| `frontend/src/modules/salon/components/{useFormularioSector,SectorFormDialog}.ts(x)` (+ pruebas) | Modificado (modo edición) |
| `frontend/src/modules/salon/components/{SectoresTabla.tsx,useSectoresDelSalon.ts}` (+ pruebas) | Nuevo |
| `frontend/src/modules/salon/pages/SalonPage.tsx` (+ prueba) | Modificado (tabla y diálogos) |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Reemplazar el `EmptyState` rompe pruebas del alta y de la mesa. | Se actualizan las pruebas del módulo; el flujo del alta y de la mesa no cambia. |
| `shared/api/client.ts` compartido. | Solo se agrega `put`; se avisa en el PR (§9.3). |
| Node 18 en la máquina impide correr Vitest 5. | Actualizar a Node 22 antes de la verificación del frontend. |

## Plan de reversión

No hay migración ni cambio de esquema. Revertir el merge en `develop` elimina la ruta `PUT`, la tabla y el modo edición; los sectores quedan intactos porque el cambio nunca borra ni reescribe filas fuera de la modificación explícita.

## Dependencias

- HU-M3-01 (#33) y HU-M3-05 (#38), ya integradas en `develop`. La ruta de listado y la entidad `Sector` vienen de ellas.
- Ninguna otra HU depende de este cambio; HU-M3-03 (eliminar sector) reutiliza la exclusión del propio id.

## Criterios de éxito

- [ ] Cada criterio de aceptación de #34 y #36 tiene una prueba que pasa.
- [ ] CI en verde: `ruff`, `lint-imports`, `pytest` ≥ 70 %, `npm run lint`, `format:check`, `typecheck`, `test:coverage` ≥ 60 % y `build`.
- [ ] El listado muestra todos los sectores y el vacío informa que no hay sectores disponibles.
- [ ] Cancelar en la edición no modifica nada.
