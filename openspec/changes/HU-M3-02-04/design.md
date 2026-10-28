# Diseño: HU-M3-02 y HU-M3-04 (modificar y listar sectores)

- **Issues:** #34 y #36 · **Épica:** #32 · **Rama:** `feature/HU-M3-02-04-modificar-listar-sector`
- **Entrada:** `proposal.md`, `specs/salon-sectores/spec.md` y las decisiones de HU-M3-01 (D1 a D4) y HU-M3-05, que no se rediscuten.

## Enfoque técnico

Backend: una ruta nueva, `PUT /api/v1/sectores/{sector_id}`, sobre las capas existentes. El `router` solo delega (D-02); el `service` carga el sector, valida la unicidad excluyendo su propio id y confirma la transacción; el `repository` suma el parámetro de exclusión. No cambian `models`, `shared/` ni el esquema, así que no hay migración.

Frontend: el `EmptyState` de `/salon` se reemplaza por la tabla de sectores. La lectura y la paginación van a un `hook` propio (`useSectoresDelSalon`) y la tabla a un componente de presentación (`SectoresTabla`), para que `SalonPage` siga por debajo de 50 líneas. El diálogo, el `hook` del formulario y el validador del alta se reutilizan en modo edición: alcanza con pasar el sector.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| M1 | Método de la modificación | `PUT /api/v1/sectores/{sector_id}` que reemplaza `nombre` y `descripcion` y responde 200 con `SectorSalida` | `PATCH`; `POST /sectores/{id}` | Es el contrato que HU-M1-02 fijó para una modificación (D-23) y el que la spec de este cambio describe. `PUT` sobre el recurso evita una ruta verbal nueva. |
| M2 | Unicidad del nombre | `repository.existe_nombre_normalizado(db, nombre_normalizado, excluir_id=None)` con `where(Sector.id != excluir_id)` cuando se pasa | Consultar por nombre y comparar el id en el `service` | Una sola consulta parametrizada; el alta llama sin exclusión y no cambia. Sin esto, guardar un sector con su mismo nombre daría 409. |
| M3 | Esquema de entrada | `class SectorModificar(SectorCrear)` vacío, que hereda `extra="forbid"`, `NombreSector`, `DescripcionSector` y el validador de descripción vacía | Duplicar los cinco campos; un `SectorModificar` con `nombre` opcional | Heredar mantiene las reglas y los mensajes en un solo lugar y deja el tipo explícito en el `service` (mismo criterio que `ProductoModificar`). `nombre` NO es opcional: la modificación exige el dato obligatorio. |
| M4 | Orden de validación | 422 de forma (FastAPI, antes de la ruta) → sector inexistente (404) → nombre de otro sector (409) → `commit` | 409 antes del 404 | El 422 lo resuelve FastAPI antes de ejecutar la ruta, así que el 404 no puede precederlo. Entre 404 y 409 gana el 404: sin entidad no hay nada que modificar. |
| M5 | Persistencia | Asignar `nombre` y `descripcion` sobre la entidad cargada y `commit`; `IntegrityError` → `rollback` y 409 | Una función `actualizar` nueva en el `repository` | La entidad ya es persistente; `add` no hace falta. Asignar `nombre` dispara `@validates` y mantiene `nombre_normalizado` en sincronía. El `repository` sigue sin confirmar (D-10). |
| M6 | Estado | `SectorModificar` no recibe `estado` (`extra="forbid"` → 422) y la modificación lo conserva; se puede modificar un sector deshabilitado | Aceptar `estado` en el mismo cuerpo | Cambiar el estado es la baja/reactivación de HU-M3-03 (D3 de HU-M3-01). Aceptarlo acá duplicaría la regla. |
| M7 | Mensajes de error | 409 «El sector ya existe»; 404 «El sector {id} no existe»; 422 con el formato de Pydantic | Mensajes nuevos por ruta | Reutilizar el 409 del alta hace que el frontend traduzca igual en los dos modos (`errorDelServidor`). |
| M8 | Diálogo único | `SectorFormDialog` recibe `sector?: Sector \| null`; sin sector da de alta, con sector edita | Un `SectorEditarDialog` aparte | Los campos, las validaciones y el layout son idénticos. Un segundo componente duplicaría 60 líneas y sus pruebas. |
| M9 | API del `hook` del formulario | `useFormularioSector({ sector = null, onGuardado })`: inicializa los campos desde `sector`, llama a `modificarSector` o `crearSector` y emite el toast correspondiente | Dos `hooks` (`useFormularioSector` y `useEdicionSector`) | Con dos campos no compensa duplicar el envío. `onCreado` pasa a llamarse `onGuardado` para no mentir en el modo edición; es un renombre dentro del módulo, con sus dos usos y pruebas actualizados. |
| M10 | Cliente HTTP | Se agrega `put<T, B>(endpoint, body)` a `ClienteApi`, simétrico a `post` | Usar `putFormulario` con un `FormData` | La ruta recibe JSON; mandar `FormData` obligaría a `datos_de` en el backend, que esta HU no necesita. El método es aditivo y no cambia los existentes. |
| M11 | Lectura del listado | `useSectoresDelSalon()`: `usePaginacion({total, limite: 50})` + `useApi(() => listarSectores(50, offset), \`sectores-${offset}\`)`, con `recargar` | Cargar todo en `SalonPage` sin `hook` | `SalonPage` se quedaría sin margen para las 50 líneas de RNF-MAN-05. El `hook` también encapsula la sincronización de `total` que usan `ProductosTab` y `SeccionesTab`. |
| M12 | Tabla de presentación | `SectoresTabla` con `DataTable`: Nombre, Descripción («—» si es nula), Estado (`Badge` success/neutral) y Acciones (`Button` ghost con `Pencil` y `aria-label` «Editar «nombre»»); `onEditar(sector)` | Columnas «Mesas» y acciones de baja de la maqueta | «Mesas» depende de HU-M3-08 y la baja de HU-M3-03. El nombre accesible del botón es el que usan las pruebas y el que lee un lector de pantalla; la maqueta usa un ícono sin texto. |
| M13 | Lista vacía | `EmptyState` con «No hay sectores disponibles» y una descripción que invita a crear el primero | Reutilizar el aviso de HU-M3-04 pendiente; dejar los encabezados de la tabla | Es el texto del criterio 2 de #36. `DataTable` ya reemplaza la tabla por el `vacio` cuando no hay filas. |
| M14 | Recarga después de guardar | `alGuardar` cierra el diálogo y llama a `recargar()` | Actualizar la fila en memoria | Una consulta más, sin estado duplicado. La modificación no agrega ni quita filas, así que la página actual sigue siendo válida. |
| M15 | Botones del diálogo | Alta: «Guardar»; edición: «Guardar cambios». Título «Nuevo sector» / «Editar sector»; toast «Sector creado» / «Sector modificado»; error «No se pudo crear el sector» / «No se pudo modificar el sector» | El mismo texto en los dos modos | Coincide con `ProductoEditarPage` (HU-M1-02) y deja claro qué acción se ejecuta. |
| M16 | Estado visible en el diálogo | Alta: «Estado: Habilitado» (lo asigna el sistema); edición: «Estado: Habilitado» o «Estado: Deshabilitado» según el sector | Ocultarlo en la edición | Informa por qué la fila dice «Deshabilitado» sin ofrecer un control que esta HU no implementa. |

## Flujo de datos

```
/salon → SalonPage
  useSectoresDelSalon() → usePaginacion(total, 50) + useApi(listarSectores(50, offset), `sectores-${offset}`)
    api.listarSectores → GET /api/v1/sectores?limit=50&offset=N → Pagina[SectorSalida]
  <SectoresTabla sectores onEditar={abrirEdicion} /> → fila → «Editar «Terraza»» → sectorEnEdicion = sector
  {dialogoSectorAbierto && <SectorFormDialog sector={sectorEnEdicion} onGuardado={alGuardar} />}
    useFormularioSector({ sector, onGuardado })
      validarSector({nombre, descripcion}) → errores locales (no envía)
      api.crearSector | api.modificarSector(id, datos) → PUT /api/v1/sectores/{id}
        router.modificar_sector → service.modificar_sector
          1 obtener_sector → 404
          2 _validar_nombre_libre(excluir_id=sector.id) → 409
          3 asignar nombre/descripcion + commit (IntegrityError → rollback, 409)
          4 SectorSalida
      exito → toast + onGuardado() → cerrar diálogo + recargar listado
      fallo → errorDelServidor(mensaje) → {nombre} si «ya existe», si no {general}
```

## Contratos

**API** (errores `{"detalle": ...}`, D-25 y D-26):

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `PUT /api/v1/sectores/{sector_id}` | 200 `SectorSalida` | 404; 409; 422 (`nombre`, `descripcion`, campo extra, `sector_id` no entero) |
| `GET /api/v1/sectores?limit&offset` (existente) | 200 `Pagina[SectorSalida]` ordenada por `nombre` | 422 (`limit` fuera de 1..100, `offset` negativo) |

**Backend:**

```python
class SectorModificar(SectorCrear):
    """Mismos campos y reglas que el alta; el estado no se recibe."""

# repository
def existe_nombre_normalizado(
    db: Session, nombre_normalizado: str, excluir_id: int | None = None
) -> bool: ...

# service
def _validar_nombre_libre(db: Session, nombre: str, excluir_id: int | None = None) -> None: ...
def modificar_sector(db: Session, sector_id: int, datos: SectorModificar) -> SectorSalida: ...
def _actualizar(db: Session, sector: Sector, datos: SectorModificar) -> Sector: ...

# router
@router.put("/sectores/{sector_id}")
def modificar_sector(sector_id: int, datos: SectorModificar, db: Sesion) -> SectorSalida: ...
```

**Frontend:**

```ts
// types.ts
export interface SectorModificar {
  nombre: string;
  descripcion?: string | null;
}

// api.ts
export function modificarSector(id: number, datos: SectorModificar): Promise<RespuestaApi<Sector>>;
export function listarSectores(limit: number, offset: number): Promise<RespuestaApi<Pagina<Sector>>>;

// shared/api/client.ts (aditivo)
put<T, B>(endpoint: string, body: B): Promise<RespuestaApi<T>>;

// components/useFormularioSector.ts
export interface OpcionesFormularioSector {
  sector?: Sector | null;
  onGuardado: () => void;
}

// components/SectorFormDialog.tsx
export interface SectorFormDialogProps {
  sector?: Sector | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

// components/useSectoresDelSalon.ts
export function useSectoresDelSalon(): {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
};

// components/SectoresTabla.tsx
export interface SectoresTablaProps {
  sectores: Sector[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (sector: Sector) => void;
}
```

## Cambios en código compartido

Avisar al equipo antes del PR (AGENTS.md §9.3).

| Archivo | Cambio | Impacto en otros módulos |
| --- | --- | --- |
| `frontend/src/shared/api/client.ts` (+ `client.test.ts`) | Método `put<T, B>` simétrico a `post` | Ninguno: solo agrega; `get`, `post`, `postFormulario` y `putFormulario` no cambian |

No se toca `backend/app/shared/`, `backend/app/main.py` ni `App.tsx`.

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/salon/schemas.py` | Modificar: `SectorModificar` |
| `backend/app/modules/salon/repository.py` | Modificar: `excluir_id` en `existe_nombre_normalizado` |
| `backend/app/modules/salon/service.py` | Modificar: `modificar_sector`, `_actualizar`, exclusión en `_validar_nombre_libre` |
| `backend/app/modules/salon/router.py` | Modificar: `PUT /sectores/{sector_id}` |
| `backend/tests/modules/salon/{test_schemas,test_service,test_router}.py` | Modificar |
| `frontend/src/shared/api/client.ts` y `client.test.ts` | Modificar |
| `frontend/src/modules/salon/types.ts` y `api.ts` (+ `api.test.ts`) | Modificar |
| `frontend/src/modules/salon/components/useFormularioSector.ts` (+ prueba) | Modificar |
| `frontend/src/modules/salon/components/SectorFormDialog.tsx` (+ prueba) | Modificar |
| `frontend/src/modules/salon/components/useSectoresDelSalon.ts` (+ prueba) | Crear |
| `frontend/src/modules/salon/components/SectoresTabla.tsx` (+ prueba) | Crear |
| `frontend/src/modules/salon/pages/SalonPage.tsx` (+ prueba) | Modificar |

## Estrategia de pruebas

Strict TDD: cada prueba se escribe primero y falla por 405 de la ruta, por función ausente o por texto ausente.

| Capa | Qué | Cómo |
| --- | --- | --- |
| Esquemas | `SectorModificar` recorta el nombre, exige 1..30, acepta descripción vacía como `None`, rechaza 201 caracteres y `estado` extra; hereda los mensajes del alta | `test_schemas.py`, parametrizado |
| `repository` | `existe_nombre_normalizado` excluye el propio id y sigue encontrando otros; sin `excluir_id` se comporta como antes | `test_service.py` con `fabrica_sector` |
| `service` | Modifica nombre y descripción; mismo nombre con otra descripción → 200; nombre de otro sector (incluido deshabilitado) → 409 sin cambios; sector inexistente → 404; sector deshabilitado se modifica sin cambiar de estado; `IntegrityError` en `commit` → 409 y `rollback`; descripción ausente → `null` | `test_service.py`; `monkeypatch` sobre `db.commit` para el `IntegrityError` |
| `router` | 200 con la forma de `SectorSalida`; persistencia verificada con `GET /sectores`; 404 y 409 con `detalle`; 422 por nombre vacío, 31 caracteres, descripción de 201 y `estado` enviado; `sector_id` no entero → 422; listado sin `estado` devuelve habilitados y deshabilitados ordenados por nombre | `test_router.py`; `cliente` y `fabrica_sector` |
| `client.ts` | `put` envía `method: "PUT"`, `Content-Type: application/json` y el cuerpo serializado; los métodos existentes no cambian | `fetch` simulado |
| `api.ts` | `modificarSector` usa `PUT /sectores/{id}` con el cuerpo; `listarSectores` arma `GET /sectores?limit=&offset=` sin `estado` | `vi.mock` del cliente |
| `useFormularioSector` | Edición: campos iniciales del sector; envía `modificarSector(id, datos)`; toast «Sector modificado»; 409 conserva lo escrito y marca el nombre; sin envío con nombre vacío. Alta: sigue llamando a `crearSector` con «Sector creado» | `renderHook` con `ToastContext` |
| `SectorFormDialog` | Alta: «Nuevo sector», «Guardar», «Estado: Habilitado». Edición: «Editar sector», datos precargados, «Guardar cambios», estado real del sector; cancelar no llama a la API | Testing Library |
| `SectoresTabla` | Nombre, descripción («—» si es nula), `Badge` Habilitado/Deshabilitado, botón «Editar «nombre»» que entrega el sector, aviso «No hay sectores disponibles», estado de error con «Reintentar» | Testing Library |
| `useSectoresDelSalon` | Primera consulta con `limit=50` y `offset=0`; `total` sincroniza la paginación; `recargar` vuelve a consultar | `renderHook` con `vi.mock('../api')` |
| `SalonPage` | Muestra la tabla con los sectores (CA 1 y 3 de #36); el vacío informa que no hay sectores (CA 2); «Editar «Terraza»» abre el diálogo precargado; guardar llama a `modificarSector` y recarga el listado (CA 1 de #34); cancelar no envía (CA 4); el alta y la mesa siguen funcionando | Testing Library, `ToastProvider`, `vi.mock('../api')` |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. El `sector_id` lo valida FastAPI como entero y las consultas son parametrizadas; el cuerpo prohíbe campos extra y no maneja archivos.

## Migración y despliegue

No requiere migración: la tabla `sectores` y la ruta de listado ya existen. Reversión: revertir el merge en `develop`; las filas modificadas conservan el valor que se les haya asignado, así que conviene avisarlo en el PR si se prueba sobre datos reales.

## Tamaño estimado

Cifras de líneas agregadas, pruebas incluidas.

| Lado | Código | Pruebas | Total | Límite |
| --- | --- | --- | --- | --- |
| Backend | ≈ 130 | ≈ 270 | ≈ 400 | 800 |
| Frontend | ≈ 290 | ≈ 350 | ≈ 640 | 800 |

Ambos lados quedan por debajo del límite de revisión; un solo PR, como fija AGENTS.md §4.
