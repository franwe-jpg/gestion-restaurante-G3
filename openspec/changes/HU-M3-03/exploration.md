# Exploración: HU-M3-03 (eliminar un sector)

- **Issue:** #35 (HU-M3-03 Eliminar un sector) · **Épica:** #32 · **Responsable:** Giuliano Giannoncelli
- **Rama:** `feature/HU-M3-03-eliminar-sector`, creada desde `feature/HU-M3-02-04-modificar-listar-sector` (`c59eef1`).
- **Cambio de una sola HU:** la baja de un sector no pertenece al grupo ABM de otra entidad ni comparte flujo con HU-M3-08 (AGENTS.md §4).

## Estado del repositorio

La rama base ya contiene HU-M3-01 (alta de sectores), HU-M3-05 (alta de mesas) y HU-M3-02/HU-M3-04 (modificación y listado de sectores). `develop` en `0bff1e0` todavía no tiene el listado ni la tabla de sectores, así que la baja se apila sobre esa rama: la acción «Eliminar» vive en `SectoresTabla`, que no existe en `develop`.

| Pieza | Estado |
| --- | --- |
| `Sector` (`models.py`) | `id`, `nombre` (30), `nombre_normalizado` (índice único), `descripcion` (200, opcional), `estado` (`Estado`, por defecto `HABILITADO`) |
| `Mesa` (`models.py`) | `id`, `numero`, `capacidad`, `sector_id` (`ForeignKey(..., ondelete="RESTRICT")`), `estado` (`EstadoMesa`, por defecto `LIBRE`) |
| `GET /api/v1/sectores` | Listado paginado, ordenado por `nombre`, con filtro opcional `estado` (HU-M3-05) |
| `GET /api/v1/sectores?estado=HABILITADO` | Lo usa el formulario de alta de mesa a través de `listarSectoresHabilitados` |
| `POST`, `PUT` sobre `/sectores` | Existen (HU-M3-01 y HU-M3-02) |
| `POST /api/v1/sectores/{id}/baja` | No existe |
| Frontend `SectoresTabla` | Columnas Nombre, Descripción, Estado y la acción «Editar «nombre»»; no hay acción de baja |
| `useConfirm` / `ConfirmProvider` | Montados en `AppProviders`; `useBajaProducto` es el patrón de baja con confirmación |

## Contradicciones y huecos detectados

1. **«Eliminar» no es borrar la fila.** El criterio dice que el sector «deja de estar disponible», y el diseño de HU-M3-02 afirma que el cambio de estado «es la baja/reactivación de HU-M3-03» (D3 de HU-M3-01). La entidad ya tiene `estado: HABILITADO | DESHABILITADO` y la tabla de sectores lo muestra. Se implementa una baja lógica que pasa el sector a `DESHABILITADO`; no se borran filas. Coincide con HU-M1-02-03 para productos y con D-24 (acción de negocio como `POST` sobre un subrecurso verbal).
2. **La reactivación no está en los criterios informados.** El issue #35 agrupa, según los artefactos de HU-M3-02, «eliminar, habilitar o deshabilitar», pero el alcance informado para este cambio son los dos criterios de eliminación. Queda como `Supuesto:` en la propuesta y fuera del código hasta que la persona responsable lo confirme.
3. **El bloqueo por mesas es una regla de negocio, no una restricción de la base.** `Mesa.sector_id` usa `ondelete="RESTRICT"`, pero la baja lógica no borra la fila del sector, así que la FK nunca se dispara. El 409 lo produce el `service` contando las mesas del sector; la restricción de la base queda como segunda barrera.
4. **La maqueta no muestra el texto del error.** `salon.html` dibuja un botón de baja por fila sin confirmación ni mensajes. Se reutiliza el patrón de HU-M1: `ConfirmDialog` + aviso de éxito + aviso de error con el `detalle` del backend.
5. **La rama no sale de `develop`.** AGENTS.md §8 pide crear la rama desde `develop`; acá se apila sobre HU-M3-02-04 porque la tabla de sectores todavía no está integrada. Se anota en el PR.

## Patrón de referencia en el repositorio

HU-M1-02-03-13 y HU-M1-05-06 fijan la baja de una entidad con estado:

- Ruta `POST /api/v1/.../{id}/baja` (D-24) que responde 200 con la entidad y `estado` en `DESHABILITADO`; 404 si no existe; 409 si ya estaba deshabilitada.
- `service.dar_de_baja_*`: carga la entidad, valida el estado actual, asigna `DESHABILITADO` y confirma; el `repository` no confirma (D-10).
- En el frontend, `useBajaProducto`: `useConfirm` con título `¿Dar de baja «nombre»?`, `variante: 'danger'`, toast de éxito y de error con el `detalle`, y recarga del listado. La acción por fila solo se muestra cuando el registro está `HABILITADO`.

## Alcance verificado de la HU

| Criterio de aceptación | Qué implica |
| --- | --- |
| Existe un sector y confirmo su eliminación | Acción por fila, confirmación, `POST .../baja`, 200 y el sector queda `DESHABILITADO`; deja de aparecer en `GET /sectores?estado=HABILITADO` |
| El sector tiene mesas asociadas | 409 con un mensaje que explica el bloqueo, sin cambiar el estado ni tocar las mesas; el frontend muestra ese mensaje |

## Riesgos de implementación

| Riesgo | Mitigación |
| --- | --- |
| Agregar una columna de acciones a `SectoresTabla` rompe pruebas de HU-M3-02/HU-M3-04. | Se actualizan las pruebas del módulo en el mismo commit; la edición no cambia. |
| Los criterios no piden reactivación y el sector quedaría sin vuelta atrás. | Se documenta como `Supuesto:` y se consulta antes del apply. |
| Un 409 por mesas se confunde con «ya está deshabilitado». | Dos mensajes distintos y una prueba por cada uno. |
