# Exploración: HU-M3-08 (listar las mesas)

- **Issue:** #41 (HU-M3-08 Listar las mesas) · **Épica:** #37 · **Responsable:** Giuliano Giannoncelli
- **Rama:** `feature/HU-M3-08-listar-mesas`, creada desde `feature/HU-M3-03-eliminar-sector`, que a su vez se apila sobre HU-M3-02-04.
- **Cambio de una sola HU:** listar mesas no comparte entidad ni flujo con la baja de un sector (AGENTS.md §4).

## Estado del repositorio

| Pieza | Estado |
| --- | --- |
| `Mesa` (`models.py`) | `id`, `numero` (> 0), `capacidad` (> 0), `sector_id` (FK a `sectores`, `RESTRICT`), `estado` (`LIBRE` \| `OCUPADA` \| `FUERA_DE_SERVICIO`, por defecto `LIBRE`) |
| `MesaSalida` (`schemas.py`) | `{id, numero, capacidad, sector: {id, nombre}, estado}`; ya incluye el resumen del sector |
| `POST /api/v1/mesas` | Alta con 201 (HU-M3-05) |
| `GET /api/v1/mesas` | No existe |
| `Mesa` en `frontend/src/modules/salon/types.ts` | Definida desde HU-M3-01; se conservó para esta HU |
| `listarMesas` en `api.ts` | No existe (se había quitado la versión provisoria de HU-M3-01) |
| Pantalla `/salon` | Encabezado con «Nuevo sector» y «Nueva mesa» y la tabla de sectores; no hay pestañas ni listado de mesas |
| `MesaFormDialog` | Alta de mesa; al crear, cierra el diálogo sin refrescar ningún listado |

## Contradicciones y huecos detectados

1. **La maqueta agrupa el salón en pestañas.** `SPRINT-2/S2-04-maqueta/salon.html` muestra las pestañas «Sectores», «Mesas» y «Mozos», y la de Mesas con las columnas Número, Sector, Capacidad y Estado. HU-M3-04 no agregó pestañas porque no las necesitaba; con el listado de mesas aparece la segunda vista y se incorporan las pestañas con `Tabs` de `shared/components/ui`.
2. **La maqueta trae filtros por sector y estado.** Los criterios de #41 solo piden listar; los filtros no entran en este cambio y se anotan como diferencia con la maqueta.
3. **La maqueta trae la columna «Mesas» en la pestaña de sectores.** Ningún criterio de #41 la pide; HU-M3-02/HU-M3-04 la atribuyó a esta HU, así que se deja afuera y queda como decisión pendiente para la persona responsable. Se anota en el PR.
4. **El backend no tiene listado de mesas.** `MesaSalida` ya existe y `service._a_salida(mesa, sector)` arma la respuesta; falta la consulta con `join` al sector para poder ordenar por sector y número, y el `router`.
5. **`develop` no tiene la tabla de sectores.** La rama se apila sobre HU-M3-02-04/HU-M3-03 para no reimplementar la pantalla del salón ni entrar en conflicto.

## Patrón de referencia en el repositorio

HU-M3-04 y HU-M1-14 fijan el listado:

- Backend: `GET /api/v1/<recurso>` con `ParametrosPaginacion` (D-27) y `Pagina[T]`; el `repository` arma la consulta ordenada y usa `contar(db, consulta)`; el `service` mapea a los `schemas` de salida; el `router` solo delega (D-02).
- Frontend: un `hook` con `useApi` + `usePaginacion` (como `useSectoresDelSalon`), un componente de presentación con `DataTable`, `EmptyState` para la lista vacía y `Pagination` cuando hay más de una página.
- `DataTable` ya reemplaza el cuerpo por `vacio` cuando no hay filas, y por `ErrorState` con «Reintentar» cuando falla la consulta.

## Alcance verificado de la HU

| Criterio de aceptación | Qué implica |
| --- | --- |
| Existen mesas registradas | Listado con Número, Sector, Capacidad y Estado de cada mesa |
| No existen mesas | Aviso «No hay mesas disponibles» en lugar de la tabla |
| Mesas en distintos sectores | Cada fila muestra el nombre de su sector; el orden agrupa por sector y luego por número |

## Riesgos de implementación

| Riesgo | Mitigación |
| --- | --- |
| Agregar pestañas cambia la pantalla que ya prueban HU-M3-01, HU-M3-04 y HU-M3-05. | La pestaña «Sectores» queda activa por defecto y se actualizan las pruebas del salón en el mismo commit. |
| La mesa creada no aparece en el listado. | `SalonPage` cambia a la pestaña Mesas y refresca el listado al crear una mesa. |
| `GET /mesas` sin paginación degrada con muchas mesas. | Se reutiliza `ParametrosPaginacion` y `Pagination` (D-27). |
