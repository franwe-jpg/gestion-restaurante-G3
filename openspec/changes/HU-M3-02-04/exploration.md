# Exploración: HU-M3-02 y HU-M3-04 (modificar y listar sectores)

- **Issues:** [#34](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/34) (HU-M3-02 Modificar un sector) y [#36](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/36) (HU-M3-04 Listar los sectores) · **Épica:** #32
- **Rama:** `feature/HU-M3-02-04-modificar-listar-sector`, creada desde `develop` en `0bff1e0`.
- **Cambio agrupado:** AGENTS.md §4 permite juntar modificación y listado de una misma entidad con el mismo responsable. Decisión de la persona responsable del módulo: hacer las dos HU en un solo cambio porque la modificación necesita el listado para tener punto de entrada.

## Estado del repositorio

`develop` ya contiene HU-M3-01 (PR #187) y HU-M3-05 (PR #188). El módulo `salon` tiene:

| Pieza | Estado |
| --- | --- |
| `Sector` (`models.py`) | `id`, `nombre` (30), `nombre_normalizado` (índice único), `descripcion` (200, opcional), `estado` (`Estado`, por defecto `HABILITADO`) |
| `POST /api/v1/sectores` | Alta con 201 y `SectorSalida`; 409 nombre repetido; 422 datos inválidos (HU-M3-01) |
| `GET /api/v1/sectores` | Listado paginado y ordenado por `nombre`, filtro opcional `estado` (HU-M3-05) |
| `PUT`, `PATCH`, `DELETE` sobre `/sectores` | No existen |
| Frontend `/salon` | Encabezado con «Nuevo sector» y «Nueva mesa»; el cuerpo es un `EmptyState` que anuncia que el listado llega con HU-M3-04 |
| `SectorFormDialog` + `useFormularioSector` + `validarSector` | Solo alta: campos vacíos, llama a `crearSector`, toast «Sector creado» |
| `clienteHttp` | `get`, `post`, `postFormulario`, `putFormulario`; no hay `put` con JSON |
| `SectorFormDialog.test.tsx` / `useFormularioSector.test.tsx` / `SalonPage.test.tsx` | Cubren el alta y el aviso de listados pendientes |

## Contradicciones y huecos detectados

1. **El listado es de HU-M3-04, la modificación de HU-M3-02.** Sin tabla no hay fila con acción «Modificar» y los criterios 1 y 4 de HU-M3-02 no se pueden ejercitar. Se resolvió agrupando las dos HU en este cambio (AGENTS.md §4).
2. **La maqueta (`SPRINT-2/S2-04-maqueta/salon.html`) muestra cuatro columnas** —Nombre, Descripción, Mesas, Estado— y dos acciones por fila (modificar y dar de baja). La columna «Mesas» depende de HU-M3-08 y la baja de HU-M3-03; ninguna entra en este cambio. Las acciones de la maqueta son íconos; el proyecto usa botones con nombre accesible.
3. **El listado ya existe en el backend.** `GET /api/v1/sectores` (HU-M3-05) devuelve todos los sectores cuando no se envía `estado`, ordenados por nombre y paginados. HU-M3-04 no necesita backend nuevo: solo la pantalla. Se reutiliza la ruta tal como está.
4. **La unicidad del nombre incluye al propio sector.** `repository.existe_nombre_normalizado` no excluye un id, así que guardar un sector sin cambiarle el nombre daría 409. Hay que admitir la exclusión del propio id.
5. **Entorno local insuficiente para el frontend.** `frontend/package.json` exige Node `>=22.12.0` (Vite 8, Vitest 5) y la máquina tiene Node 18.19.1. La suite del frontend no se puede correr hasta actualizar Node.

## Patrón de referencia en el repositorio

HU-M1-02 (modificar un producto) fija el contrato de una modificación:

- Ruta `PUT /api/v1/.../{id}` que devuelve 200 con la entidad, 404 si no existe, 409 por conflicto de unicidad y 422 por datos inválidos.
- Esquema `XModificar` que hereda de `XCrear` y prohíbe campos extra.
- En el `service`, el orden es: obtener la entidad (404) → validar unicidad excluyendo el propio id (409) → aplicar cambios sobre la entidad cargada → `commit` con `IntegrityError` → 409 y `rollback`.
- En el frontend, `persona` reutiliza el validador y el `hook` del alta, y separa el modo edición por la presencia de la entidad.

HU-M1-13 y `SeccionesTab`/`SeccionesTabla` fijan el patrón de listado: contenedor con `useApi` + `usePaginacion`, tabla de presentación con `DataTable`, `EmptyState` para la lista vacía y `Pagination` cuando hay más de una página.

## Alcance verificado de las dos HU

| HU | Criterios de aceptación | Qué implica |
| --- | --- | --- |
| HU-M3-02 | Guardar cambios válidos | `PUT` + diálogo en modo edición con datos precargados |
| HU-M3-02 | Dato obligatorio vacío | Validación local (nombre obligatorio) y 422 del backend |
| HU-M3-02 | Nombre de otro sector | 409 traducido bajo el campo Nombre |
| HU-M3-02 | Cancelar | El diálogo se cierra sin llamar a la API y la fila conserva sus datos |
| HU-M3-04 | Existen sectores | Tabla con Nombre, Descripción y Estado |
| HU-M3-04 | No existen sectores | Aviso «No hay sectores disponibles» |
| HU-M3-04 | Varios sectores | Todos los sectores de la página, ordenados por nombre |

## Riesgos de implementación

| Riesgo | Mitigación |
| --- | --- |
| La tabla reemplaza el `EmptyState` y rompe pruebas de HU-M3-01/HU-M3-05. | Se actualizan las pruebas del módulo en el mismo commit; el comportamiento del alta y de la mesa no cambia. |
| Cambio en `shared/api/client.ts` (método `put`). | Es aditivo; se anota en el PR (AGENTS.md §9.3). |
| Funciones de `SalonPage` por encima de 50 líneas. | La lectura del listado va a un `hook` propio y la tabla a un componente de presentación. |
