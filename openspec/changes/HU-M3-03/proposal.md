# Propuesta: HU-M3-03 (eliminar un sector)

- **Issue:** #35 (HU-M3-03 Eliminar un sector) · **Épica:** #32 · **Tarea madre:** #167
- **Rama:** `feature/HU-M3-03-eliminar-sector`, apilada sobre `feature/HU-M3-02-04-modificar-listar-sector`

## Intención

El listado de sectores permite crear y modificar, pero no retirar un sector que ya no se usa. Sin la baja, un sector mal cargado queda para siempre en el selector de mesas. Esta HU agrega la eliminación desde la fila del listado y bloquea la operación cuando el sector todavía tiene mesas asociadas.

## Alcance

### Incluido

- `POST /api/v1/sectores/{sector_id}/baja` (200 `SectorSalida` con `estado` `DESHABILITADO`), 404 si el sector no existe y 409 si ya estaba deshabilitado o si tiene mesas asociadas.
- Acción «Eliminar «nombre»» por fila en `SectoresTabla`, visible solo para sectores habilitados.
- `ConfirmDialog` antes de enviar, aviso de éxito «Sector eliminado» y aviso de error con el mensaje del backend.
- Recarga del listado después de una baja exitosa.
- Una prueba por criterio de aceptación, más las de error y límite.

### Excluido

- Reactivación (habilitar) de un sector deshabilitado: el issue #35 la menciona, pero los criterios informados para este cambio son solo los de eliminación. Ver `Supuesto:` S1.
- Borrado físico de filas: la baja es lógica (`estado = DESHABILITADO`).
- Eliminar mesas o cambiar su sector: es de HU-M3-06/HU-M3-07.
- La columna «Mesas» y el listado de mesas: son de HU-M3-08.
- Filtros y búsqueda en la pantalla del salón.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `salon-sectores`: suma la baja lógica de un sector y su acción en el listado.

## Decisiones tomadas

- **D1. La baja es lógica.** `POST /api/v1/sectores/{sector_id}/baja` cambia `estado` a `DESHABILITADO` y devuelve 200 con `SectorSalida`; la fila y las mesas se conservan. Es el criterio «el sector deja de estar disponible» y el patrón de HU-M1-02-03 (D-24).
- **D2. La baja no recibe cuerpo.** Como en productos, la acción no acepta datos: cualquier campo extra no se lee.
- **D3. Orden de validación.** Sector inexistente (404) → ya deshabilitado (409) → mesas asociadas (409) → confirmar.
- **D4. Disponibilidad.** Un sector deshabilitado deja de aparecer en `GET /api/v1/sectores?estado=HABILITADO`, que es la consulta del selector de mesas. No se agregan rutas nuevas para eso.
- **D5. Confirmación en el frontend.** La acción abre `ConfirmDialog` con variante `danger`; cancelar no envía ninguna solicitud.
- **D6. Error visible.** El 409 se muestra en un toast con el texto del backend, para que el mensaje de las mesas asociadas llegue tal cual.

## Enfoque

Backend por capas: el `router` delega (D-02), el `service` valida existencia, estado y mesas asociadas y confirma la transacción, el `repository` cuenta las mesas del sector y no confirma (D-10). Frontend: la acción de la fila vive en `SectoresTabla`, la confirmación, la llamada y los avisos en un `hook` propio (`useBajaSector`), y la recarga en `SalonPage`. Toda llamada a la API pasa por `modules/salon/api.ts` (D-16).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | HU-M3-03 se limita a la eliminación (baja lógica). La reactivación que menciona el issue #35 no está entre los criterios informados y queda para un cambio posterior o para una ampliación de este. |
| S2 | Un sector deshabilitado sigue visible en el listado con el badge «Deshabilitado»; «deja de estar disponible» significa que no se puede elegir al crear mesas. |
| S3 | Un sector con mesas no se puede eliminar aunque esté deshabilitado; el bloqueo depende solo de la cantidad de mesas. |
| S4 | El mensaje del bloqueo es «No se puede eliminar el sector {nombre} porque tiene mesas asociadas». |
| S5 | La confirmación dice «¿Eliminar el sector «nombre»?» con el texto de apoyo «El sector quedará deshabilitado y no se podrá elegir al crear mesas.» |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/salon/{repository,service,router}.py` | Modificado |
| `backend/tests/modules/salon/{test_service,test_router}.py` | Modificado |
| `frontend/src/modules/salon/{api.ts,api.test.ts}` | Modificado |
| `frontend/src/modules/salon/components/{SectoresTabla.tsx,useBajaSector.ts}` (+ pruebas) | Modificado / Nuevo |
| `frontend/src/modules/salon/pages/SalonPage.tsx` (+ prueba) | Modificado |

No se toca `backend/app/shared/`, `models.py`, `schemas.py`, `frontend/src/shared/` ni el esquema de la base.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La acción nueva rompe pruebas del listado. | Se actualizan las pruebas del módulo en el mismo commit. |
| El sector queda sin forma de reactivarse. | `Supuesto:` S1 explícito en la spec y en el PR. |
| Un borrado accidental. | Confirmación con variante `danger` y texto que explica el efecto. |

## Plan de reversión

No hay migración ni cambio de esquema. Revertir el merge elimina la ruta y la acción de la tabla; los estados que ya se hayan cambiado a `DESHABILITADO` se conservan, así que conviene avisarlo en el PR si se prueba sobre datos reales.

## Dependencias

- HU-M3-01, HU-M3-02 y HU-M3-04 (tabla de sectores). Las dos últimas están en la rama base de este cambio, todavía sin integrar en `develop`.
- HU-M3-08 no depende de este cambio.

## Criterios de éxito

- [ ] Los dos criterios de aceptación de #35 tienen una prueba que pasa.
- [ ] Un sector con mesas no cambia de estado y las mesas se conservan.
- [ ] CI en verde: `ruff`, `lint-imports`, `pytest` ≥ 70 %, `npm run lint`, `format:check`, `typecheck`, `test:coverage` ≥ 60 % y `build`.
