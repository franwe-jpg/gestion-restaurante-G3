# Diseño: HU-M3-08 (listar las mesas)

- **Issue:** #41 · **Épica:** #37 · **Rama:** `feature/HU-M3-08-listar-mesas`
- **Entrada:** `proposal.md`, `specs/salon-mesas/spec.md` y las decisiones de HU-M3-01, HU-M3-02/HU-M3-04 y HU-M3-05, que no se rediscuten.

## Enfoque técnico

Backend: una ruta nueva, `GET /api/v1/mesas`, sobre las capas existentes. El `repository` hace `select(Mesa, Sector).join(Sector)` y devuelve la página y el total; el `service` reutiliza `_a_salida(mesa, sector)`; el `router` solo delega (D-02). No cambian `models` ni `schemas`: `MesaSalida` y `SectorResumen` ya existen, así que no hay migración.

Frontend: `/salon` se organiza con `Tabs` («Sectores» y «Mesas»). El listado de mesas vive en `useMesasDelSalon` (lectura y paginación) y `MesasTabla` (presentación). `SalonPage` mantiene la pestaña activa y un contador de refresco que se incrementa al crear una mesa.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| M1 | Contrato del listado | `GET /api/v1/mesas?limit&offset` → 200 `Pagina[MesaSalida]` | Devolver una lista plana sin paginar | D-27 exige paginación en todos los listados; `Pagination` ya está en el salón. |
| M2 | Orden | `order_by(Sector.nombre, Mesa.numero, Mesa.id)` | Ordenar solo por `Mesa.numero` | Con números repetidos entre sectores el orden sería ambiguo; el `id` desempata y estabiliza la paginación. |
| M3 | Consulta | `select(Mesa, Sector).join(Sector, Mesa.sector_id == Sector.id)` en el `repository` y `contar(db, select(Mesa.id))` | Agregar una `relationship` a `Mesa` y usar carga diferida | Sin `relationship` no hay consultas N+1 ni cambios en el modelo; el `join` explícito deja la consulta en el `repository` (D-10). |
| M4 | Reutilización del mapeo | `service.listar_mesas` usa `_a_salida(mesa, sector)`, el mismo que el alta | Un segundo mapeo en el `service` | Una sola definición de `MesaSalida`. |
| M5 | Pestañas | `Tabs` de `shared/components/ui` con «Sectores» y «Mesas»; activa «Sectores» por defecto | Dos rutas (`/salon/sectores`, `/salon/mesas`) | La maqueta usa pestañas en una sola pantalla y HU-M3-04 ya vive en `/salon`; no hace falta tocar el router de React. |
| M6 | Montaje del listado | El contenido de cada pestaña se arma en `SalonPage`; `Tabs` renderiza solo la activa | Precargar las dos pestañas al entrar | Evita pedir mesas cuando el usuario no las mira; `useApi` vuelve a consultar al montar. |
| M7 | Refresco tras el alta | `refrescoMesas` es parte de la clave de `useApi` (`mesas-${offset}-${refresco}`); al crear una mesa se incrementa y se activa la pestaña «Mesas» | Recargar con un evento global o duplicar el estado de las mesas en `SalonPage` | Mantiene el `hook` encapsulado y no agrega estado duplicado. |
| M8 | Columnas | Número, Sector, Capacidad y Estado; `Badge` `success` para `LIBRE`, `warning` para `OCUPADA` y `neutral` para `FUERA_DE_SERVICIO` | Mostrar el enum crudo | Coincide con los colores de estado de la maqueta y con `SectoresTabla`. |
| M9 | Lista vacía | `EmptyState` con título «No hay mesas disponibles» y descripción «Creá la primera mesa para empezar a atender.» | Reutilizar «Sin resultados» de `DataTable` | Es el texto del criterio 2 de #41. |
| M10 | Filtros | No se agregan | Implementar los selectores de la maqueta | Ningún criterio de #41 los pide; se anota la diferencia en el PR. |

## Flujo de datos

```
/salon → SalonPage
  Tabs [Sectores | Mesas], activa = 'sectores'
    Sectores → useSectoresDelSalon + SectoresTabla (sin cambios)
    Mesas → useMesasDelSalon(refresco)
      usePaginacion(total, 50) + useApi(() => listarMesas(50, offset), `mesas-${offset}-${refresco}`)
        api.listarMesas → GET /api/v1/mesas?limit=50&offset=N
          router.listar_mesas → service.listar_mesas
            repository.listar_mesas → select(Mesa, Sector).join(...) ordenado + contar
            _a_salida(mesa, sector) → MesaSalida
      <MesasTabla mesas /> → DataTable (Número, Sector, Capacidad, Estado) o EmptyState
  MesaFormDialog.onCreado → cerrar + setPestania('mesas') + refrescoMesas + 1
```

## Contratos

**API** (errores `{"detalle": ...}`, D-25 y D-26):

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /api/v1/mesas?limit&offset` | 200 `Pagina[MesaSalida]` ordenada por `sector.nombre`, `numero` e `id` | 422 (`limit` fuera de 1..100, `offset` negativo o no entero) |
| `POST /api/v1/mesas` (existente) | 201 `MesaSalida` | 404, 409, 422 |

**Backend:**

```python
# repository
def listar_mesas(
    db: Session, parametros: ParametrosPaginacion
) -> tuple[list[tuple[Mesa, Sector]], int]: ...

# service
def listar_mesas(db: Session, parametros: ParametrosPaginacion) -> Pagina[MesaSalida]: ...

# router
@router.get("/mesas")
def listar_mesas(db: Sesion, filtro: Annotated[ParametrosPaginacion, Query()]) -> Pagina[MesaSalida]: ...
```

**Frontend:**

```ts
// api.ts
export function listarMesas(limit: number, offset: number): Promise<RespuestaApi<Pagina<Mesa>>>;

// components/useMesasDelSalon.ts
export const LIMITE_MESAS = 50;
export function useMesasDelSalon(refresco?: number): {
  mesas: Mesa[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
};

// components/MesasTabla.tsx
export interface MesasTablaProps {
  mesas: Mesa[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
}
```

## Cambios en código compartido

No se toca `frontend/src/shared/` ni `backend/app/shared/`.

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/salon/repository.py` | Modificar: `listar_mesas` |
| `backend/app/modules/salon/service.py` | Modificar: `listar_mesas` |
| `backend/app/modules/salon/router.py` | Modificar: `GET /mesas` |
| `backend/tests/modules/salon/{test_service,test_router}.py` | Modificar |
| `frontend/src/modules/salon/api.ts` y `api.test.ts` | Modificar: `listarMesas` |
| `frontend/src/modules/salon/components/useMesasDelSalon.ts` (+ prueba) | Crear |
| `frontend/src/modules/salon/components/MesasTabla.tsx` (+ prueba) | Crear |
| `frontend/src/modules/salon/pages/SalonPage.tsx` (+ prueba) | Modificar: pestañas y refresco |

## Estrategia de pruebas

Strict TDD: cada prueba se escribe primero y falla por 404 de la ruta, por función ausente o por texto ausente.

| Capa | Qué | Cómo |
| --- | --- | --- |
| `repository` | Devuelve las mesas con su sector, ordenadas por nombre de sector y número, y el total; respeta `limit` y `offset`; lista vacía → `([], 0)` | `test_service.py` con `fabrica_sector` y `fabrica_mesa` |
| `service` | Arma `Pagina[MesaSalida]` con `sector {id, nombre}` y `estado`; incluye mesas de sectores deshabilitados; no filtra por estado | `test_service.py` |
| `router` | 200 con la forma de `MesaSalida`; 0 mesas → `items: []`, `total: 0`; orden entre sectores; `limit`/`offset` recortan y `total` no cambia; 422 por `limit=0`, `limit=101`, `offset=-1` | `test_router.py`; `cliente`, `fabrica_sector`, `fabrica_mesa` |
| `api.ts` | `listarMesas` arma `GET /mesas?limit=&offset=` | `vi.mock` del cliente |
| `useMesasDelSalon` | Primera consulta con `limit=50` y `offset=0`; `total` sincroniza la paginación; `recargar` y `refresco` vuelven a consultar | `renderHook` con `vi.mock('../api')` |
| `MesasTabla` | Número, Sector, Capacidad y los tres badges; «No hay mesas disponibles»; error con «Reintentar» | Testing Library |
| `SalonPage` | Pestañas presentes y «Sectores» activa; pestaña Mesas con las mesas y su sector (CA 1 y 3); vacío «No hay mesas disponibles» (CA 2); paginación; crear mesa activa Mesas y refresca | Testing Library, `ToastProvider`, `vi.mock('../api')` |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. La ruta solo lee y las consultas son parametrizadas por SQLAlchemy.

## Migración y despliegue

No requiere migración: `mesas` y su FK existen desde HU-M3-05. Reversión: revertir el merge elimina la ruta y la pestaña; las mesas cargadas se conservan.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Límite |
| --- | --- | --- | --- | --- |
| Backend | ≈ 45 | ≈ 140 | ≈ 185 | 800 |
| Frontend | ≈ 150 | ≈ 230 | ≈ 380 | 800 |

Ambos lados quedan por debajo del límite de revisión; un solo PR.
