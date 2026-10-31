# Propuesta: HU-M3-08 (listar las mesas)

- **Issue:** #41 (HU-M3-08 Listar las mesas) · **Épica:** #37 · **Tarea madre:** #167
- **Rama:** `feature/HU-M3-08-listar-mesas`, apilada sobre `feature/HU-M3-03-eliminar-sector`

## Intención

El salón ya permite crear mesas, pero no hay forma de verlas: la pantalla solo lista sectores. Un mozo necesita saber qué mesas existen, de qué sector son y en qué estado están. Esta HU agrega el listado de mesas en `/salon`, con el sector asociado a cada una y un aviso cuando no hay ninguna.

## Alcance

### Incluido

- `GET /api/v1/mesas?limit&offset` (200 `Pagina[MesaSalida]`), ordenado por nombre del sector y número de mesa, con 422 por parámetros inválidos.
- Pestañas «Sectores» y «Mesas» en `/salon`, con «Sectores» activa por defecto.
- Tabla de mesas con Número, Sector, Capacidad y Estado, paginada con `Pagination` cuando hay más de una página.
- Aviso «No hay mesas disponibles» cuando el listado viene vacío y estado de error con «Reintentar».
- Al crear una mesa, la pantalla cambia a la pestaña «Mesas» y refresca el listado.
- Una prueba por criterio de aceptación.

### Excluido

- Modificar, eliminar u ocupar/liberar mesas (HU-M3-06, HU-M3-07 y las HU de M4).
- Filtros por sector o estado: la maqueta los muestra, pero ningún criterio de #41 los pide.
- La columna «Mesas» de la pestaña de sectores.
- Mozos y sus pestañas (HU-M3-09 a HU-M3-12).
- Cambios de esquema: `mesas` y `sector_id` ya existen.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `salon-mesas`: suma el listado paginado de mesas con su sector.

## Decisiones tomadas

- **D1. Contrato del listado.** `GET /api/v1/mesas` con `limit` y `offset` de `shared/paginacion.py` (D-27) y respuesta `Pagina[MesaSalida]`; el resumen del sector viaja en cada mesa, como en el alta.
- **D2. Orden.** Por `Sector.nombre`, luego `Mesa.numero` y `Mesa.id`, para agrupar las mesas de un mismo sector como en la maqueta y que la paginación sea estable.
- **D3. Consulta.** Un `join` de `Mesa` con `Sector` en el `repository`; el `service` reutiliza `_a_salida(mesa, sector)`. Sin `relationship` nueva en el modelo.
- **D4. Pestañas.** Se usa `Tabs` de `shared/components/ui` con «Sectores» (contenido actual) y «Mesas» (listado nuevo). La pestaña activa se mantiene en `SalonPage`.
- **D5. Lista vacía.** `EmptyState` con el texto exacto «No hay mesas disponibles» y una descripción que invita a crear la primera mesa.
- **D6. Refresco tras el alta.** `MesaFormDialog.onCreado` cierra el diálogo, activa la pestaña «Mesas» e incrementa un contador que forma parte de la clave de `useApi`, de modo que el listado se vuelve a pedir.

## Enfoque

Backend por capas: el `router` solo delega (D-02), el `service` arma la página, el `repository` consulta con `join`, ordena y cuenta (D-10, D-11). Frontend: `useMesasDelSalon` encapsula la lectura y la paginación; `MesasTabla` es presentación pura con `DataTable`; `SalonPage` compone las pestañas y los diálogos. Toda llamada a la API pasa por `modules/salon/api.ts` (D-16).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | El listado incluye mesas en cualquier estado (`LIBRE`, `OCUPADA`, `FUERA_DE_SERVICIO`); no se filtra. |
| S2 | «No hay mesas disponibles» se refiere a que no hay mesas registradas, no a que ninguna esté `LIBRE`. |
| S3 | El listado muestra el nombre del sector tal como está guardado, aunque el sector esté deshabilitado. |
| S4 | La pestaña «Sectores» queda activa por defecto para no cambiar el punto de entrada de HU-M3-04. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/salon/{repository,service,router}.py` | Modificado |
| `backend/tests/modules/salon/{test_service,test_router}.py` | Modificado |
| `frontend/src/modules/salon/{api.ts,api.test.ts}` | Modificado: `listarMesas` |
| `frontend/src/modules/salon/components/useMesasDelSalon.ts` (+ prueba) | Nuevo |
| `frontend/src/modules/salon/components/MesasTabla.tsx` (+ prueba) | Nuevo |
| `frontend/src/modules/salon/pages/SalonPage.tsx` (+ prueba) | Modificado: pestañas y refresco |

No se toca `models.py`, `schemas.py`, `backend/app/shared/`, `frontend/src/shared/` ni el esquema.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las pestañas rompen pruebas del salón. | «Sectores» activa por defecto y pruebas actualizadas en el mismo commit. |
| La mesa creada no aparece. | Cambio de pestaña y refresco al crear. |
| Nombres de sector duplicados en pantalla. | La tabla usa `id` de la mesa como clave y muestra el nombre solo como dato. |

## Plan de reversión

No hay migración. Revertir el merge elimina la ruta, las pestañas y la tabla; las mesas cargadas se conservan.

## Dependencias

- HU-M3-05 (alta de mesas) en `develop`; HU-M3-02-04 y HU-M3-03 en la cadena de ramas.
- Ninguna otra HU depende de este cambio.

## Criterios de éxito

- [ ] Los tres criterios de aceptación de #41 tienen una prueba que pasa.
- [ ] La tabla muestra el sector de cada mesa y el vacío informa que no hay mesas.
- [ ] CI en verde: `ruff`, `lint-imports`, `pytest` ≥ 70 %, `npm run lint`, `format:check`, `typecheck`, `test:coverage` ≥ 60 % y `build`.
