# Diseño: HU-M3-03 (eliminar un sector)

- **Issue:** #35 · **Épica:** #32 · **Rama:** `feature/HU-M3-03-eliminar-sector`
- **Entrada:** `proposal.md`, `specs/salon-sectores/spec.md` y las decisiones de HU-M3-01 (D1 a D4), HU-M3-02/HU-M3-04 y HU-M3-05, que no se rediscuten.

## Enfoque técnico

Backend: una ruta nueva, `POST /api/v1/sectores/{sector_id}/baja`, sobre las capas existentes. El `router` solo delega (D-02); el `service` carga el sector, valida el estado y la ausencia de mesas, asigna `DESHABILITADO` y confirma; el `repository` suma una consulta de conteo de mesas. No cambian `models`, `schemas`, `shared/` ni el esquema, así que no hay migración.

Frontend: `SectoresTabla` suma una celda de acciones con «Editar» y «Eliminar» por fila. La confirmación, la llamada y los avisos van a `useBajaSector`, para que la tabla siga siendo de presentación y `SalonPage` no crezca. `SalonPage` recarga el listado cuando la baja termina.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| M1 | Semántica de la baja | Baja lógica: `estado = DESHABILITADO`, sin borrar filas | `DELETE /sectores/{id}` con 204 y borrado físico | «Deja de estar disponible» y el diseño de HU-M3-02 ya asignan el cambio de estado a esta HU. El borrado físico perdería el historial y rompería la FK `RESTRICT` con las mesas. |
| M2 | Ruta | `POST /api/v1/sectores/{sector_id}/baja` (D-24) | `DELETE /api/v1/sectores/{sector_id}` (D-23) | La baja no borra el recurso, es una acción de negocio sobre su estado; es el mismo contrato que `POST /platos/{id}/baja`. |
| M3 | Cuerpo | Sin cuerpo; `router` no recibe esquema | Un `SectorBaja {motivo?}` | Ningún criterio pide un motivo y la acción no necesita datos. |
| M4 | Orden de validación | 404 inexistente → 409 ya deshabilitado → 409 mesas → aplicar y `commit` | 409 mesas antes del estado | Si el sector ya está deshabilitado, el mensaje correcto es ese; el bloqueo por mesas se informa solo cuando la baja era posible. `sector_id` no entero lo rechaza FastAPI con 422 antes de la ruta. |
| M5 | Conteo de mesas | `repository.contar_mesas_del_sector(db, sector_id) -> int` con `select(func.count())` filtrado por `sector_id` | Cargar las mesas y contarlas en Python | Una consulta agregada, sin traer filas (D-11). |
| M6 | Persistencia | Asignar `sector.estado = Estado.DESHABILITADO` sobre la entidad cargada y `commit` | Un `repository.actualizar` nuevo | La entidad ya es persistente; el `repository` sigue sin confirmar (D-10). Sin `IntegrityError` posible: no cambia ninguna clave. |
| M7 | Respuesta | 200 con `SectorSalida` y `estado` `DESHABILITADO` | 204 sin cuerpo | El frontend necesita el estado resultante para el toast y la recarga; D-25 admite 204 solo para borrado real. |
| M8 | Visibilidad de la acción | «Eliminar «nombre»» solo en filas `HABILITADO` | Mostrarla siempre y dejar que el backend responda 409 | Evita ofrecer una acción que siempre falla; mismo criterio que `AccionesProducto` con «Dar de baja». |
| M9 | Confirmación | `useConfirm` con título «¿Eliminar el sector «nombre»?», descripción «El sector quedará deshabilitado y no se podrá elegir al crear mesas.», `textoConfirmar: 'Eliminar'`, `variante: 'danger'` | Eliminar sin confirmar | Es una acción destructiva desde el punto de vista del usuario. |
| M10 | Avisos | Éxito «Sector eliminado»; error «No se pudo eliminar el sector» con el `detalle` del backend como descripción | Un texto fijo para todos los 409 | El criterio 2 exige informar que no puede eliminarse por las mesas; el mensaje útil lo produce el backend. |
| M11 | Recarga | `onEliminado` cierra y llama a `recargar()` de `useSectoresDelSalon` | Actualizar la fila en memoria | El sector sigue en la página con otro estado; una recarga evita duplicar la lógica del badge. |
| M12 | Nombre en mayúsculas | Se mantiene el `span` con `uppercase`; el `aria-label` usa el nombre real | Poner en mayúsculas el `aria-label` | El lector de pantalla debe oír el nombre guardado. |

## Flujo de datos

```
SectoresTabla → fila habilitada → «Eliminar «Terraza»» → useBajaSector.darDeBaja()
  1 confirmar({titulo, descripcion, textoConfirmar: 'Eliminar', variante: 'danger'})
     false → no envía nada
  2 api.eliminarSector(id) → POST /api/v1/sectores/{id}/baja
     router.dar_de_baja_sector → service.dar_de_baja_sector
       a obtener_sector → 404
       b estado == DESHABILITADO → 409 «El sector ya está deshabilitado»
       c contar_mesas_del_sector > 0 → 409 «No se puede eliminar el sector {nombre} porque tiene mesas asociadas»
       d estado = DESHABILITADO + commit → SectorSalida
  3 exito → toast «Sector eliminado» + onEliminado() → recargar listado
     fallo → toast «No se pudo eliminar el sector» + detalle del backend
```

## Contratos

**API** (errores `{"detalle": ...}`, D-25 y D-26):

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /api/v1/sectores/{sector_id}/baja` | 200 `SectorSalida` con `estado` `DESHABILITADO` | 404; 409 (ya deshabilitado); 409 (mesas asociadas); 422 `sector_id` no entero |
| `GET /api/v1/sectores?estado=HABILITADO` (existente) | 200 `Pagina[SectorSalida]` sin los dados de baja | 422 parámetros inválidos |

**Backend:**

```python
# repository
def contar_mesas_del_sector(db: Session, sector_id: int) -> int: ...

# service
def dar_de_baja_sector(db: Session, sector_id: int) -> SectorSalida: ...

# router
@router.post("/sectores/{sector_id}/baja")
def dar_de_baja_sector(sector_id: int, db: Sesion) -> SectorSalida: ...
```

**Frontend:**

```ts
// api.ts
export function eliminarSector(id: number): Promise<RespuestaApi<Sector>>;

// components/useBajaSector.ts
export interface OpcionesBajaSector {
  sector: Pick<Sector, 'id' | 'nombre'>;
  onEliminado: () => void;
}
export function useBajaSector(opciones: OpcionesBajaSector): {
  eliminando: boolean;
  eliminar: () => Promise<void>;
};

// components/SectoresTabla.tsx
export interface SectoresTablaProps {
  sectores: Sector[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (sector: Sector) => void;
  onEliminar: (sector: Sector) => void;
}
```

## Cambios en código compartido

No se toca `frontend/src/shared/` ni `backend/app/shared/`.

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/salon/repository.py` | Modificar: `contar_mesas_del_sector` |
| `backend/app/modules/salon/service.py` | Modificar: `dar_de_baja_sector` |
| `backend/app/modules/salon/router.py` | Modificar: `POST /sectores/{sector_id}/baja` |
| `backend/tests/modules/salon/{test_service,test_router}.py` | Modificar |
| `frontend/src/modules/salon/api.ts` y `api.test.ts` | Modificar: `eliminarSector` |
| `frontend/src/modules/salon/components/useBajaSector.ts` (+ prueba) | Crear |
| `frontend/src/modules/salon/components/SectoresTabla.tsx` (+ prueba) | Modificar |
| `frontend/src/modules/salon/pages/SalonPage.tsx` (+ prueba) | Modificar |

## Estrategia de pruebas

Strict TDD: cada prueba se escribe primero y falla por 404 de la ruta, por función ausente o por texto ausente.

| Capa | Qué | Cómo |
| --- | --- | --- |
| `repository` | `contar_mesas_del_sector` cuenta solo las mesas del sector pedido y devuelve 0 sin mesas | `test_service.py` con `fabrica_sector` y `fabrica_mesa` |
| `service` | Pasa a `DESHABILITADO` y conserva nombre y descripción; sector con mesa → 409 sin cambios; ya deshabilitado → 409; inexistente → 404; el sector deshabilitado sale de la lista filtrada por `HABILITADO` | `test_service.py` |
| `router` | 200 con la forma de `SectorSalida` y persistencia verificada con `GET /sectores`; 404 y los dos 409 con su `detalle`; `sector_id` no entero → 422; la mesa del sector bloqueado sigue existiendo | `test_router.py`; `cliente`, `fabrica_sector`, `fabrica_mesa` |
| `api.ts` | `eliminarSector` usa `POST /sectores/{id}/baja` sin cuerpo | `vi.mock` del cliente |
| `useBajaSector` | Al confirmar envía la baja, avisa «Sector eliminado» y llama a `onEliminado`; al cancelar no envía; si el backend responde 409 muestra «No se pudo eliminar el sector» con el `detalle` y no recarga | `renderHook` con `ConfirmContext` y `ToastContext` |
| `SectoresTabla` | «Eliminar «nombre»» solo en filas habilitadas y entrega el sector; «Editar» sigue funcionando | Testing Library |
| `SalonPage` | Eliminar con confirmación recarga y muestra el estado nuevo (CA 1); con mesas muestra el mensaje del backend y la fila sigue «Habilitado» (CA 2); cancelar no envía | Testing Library con `ConfirmContext` simulado |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. El `sector_id` lo valida FastAPI como entero y las consultas son parametrizadas.

## Migración y despliegue

No requiere migración. Reversión: revertir el merge; los sectores que ya se hayan dado de baja quedan en `DESHABILITADO`, porque la baja es lógica y no hay reactivación en este cambio.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Límite |
| --- | --- | --- | --- | --- |
| Backend | ≈ 40 | ≈ 130 | ≈ 170 | 800 |
| Frontend | ≈ 120 | ≈ 190 | ≈ 310 | 800 |

Ambos lados quedan por debajo del límite de revisión; un solo PR.
