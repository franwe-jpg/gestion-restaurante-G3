# Diseño: HU-M3-13 (reporte de mesas atendidas y ventas por mozo)

- **Issue:** #83 · **Épica:** #82 · **Rama:** `feature/HU-M3-13-reporte-mesas-ventas-mozo`
- **Entrada:** `proposal.md`, `specs/salon-reporte-mozos/spec.md` y el patrón de HU-M1-15.

## Enfoque técnico

Backend: una ruta de solo lectura en `salon/router.py` delega en `salon/service.py`; el cálculo puro vive en `salon/reporte.py`; `salon/repository.py` obtiene los mozos y las mesas del sector. Las comandas se leen con una función pública nueva de `atencion.service`, que agrega por mozo y mesa; es el único punto de contacto entre módulos y respeta RNF-MAN-09.

Frontend: una página nueva en `/reportes/mesas-ventas-por-mozo`; el `hook` `useReporteMozos` concentra filtros, carga de opciones y consulta; `ReporteMozosTabla` es presentación pura con `DataTable`.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| M1 | Ubicación de la lectura | `atencion.service.sumar_ventas_por_mozo_mesa` | Consultar tablas de atención desde el `repository` de salón | Un módulo solo usa el `service` de otro (RNF-MAN-09) y ya existe el precedente de HU-M1-15. |
| M2 | Agregación | `SUM` en SQL agrupado por `mozo_id` y `mesa_id` | Traer todas las comandas y agregar en Python | Menos datos y menos memoria; el total por línea coincide con la factura. |
| M3 | Total de la línea | `cantidad * precio_unitario - descuento` | Usar `Factura.total` | Evita depender de pagos y es el criterio de la factura (S5). |
| M4 | Estados | `ABIERTA` y `CERRADA`; fuera `ANULADA` | Solo `CERRADA` | Consistente con HU-M1-15; una mesa abierta ya fue atendida. Supuesto S1. |
| M5 | Sector | `salon.repository.ids_mesas_del_sector` y `mesa_ids` como filtro | Hacer que atención conozca sectores | El sector es de M3 y atención no debe conocerlo. |
| M6 | Mozos en cero | Se listan todos los mozos y se completan con cero | Listar solo mozos con ventas | CA 3 pide mostrar al mozo sin actividad. |
| M7 | Sin datos | Frontend: total vendido cero → aviso | Backend: 404 o lista vacía | CA 6 y CA 3 conviven; el backend mantiene las líneas para poder mostrar ceros. |
| M8 | Período | `salon.reporte.validar_periodo` + `intervalo_utc` (UTC-3) | Importar `productos.reporte` | Evita importar un módulo ajeno fuera del `service`; se anota la unificación pendiente en `shared/`. |
| M9 | Zona horaria | UTC-3 fijo, igual que HU-M1-15 | Hora del servidor | El período se interpreta en la hora del restaurante. |

## Flujo de datos

```
/reportes/mesas-ventas-por-mozo → ReporteMozosPage
  useReporteMozos
    useEffect → listarMozos(100, 0) + listarSectores(100, 0)  // opciones
    generar → validarPeriodo(desde, hasta)
      api.obtenerReporteMozos → GET /api/v1/reportes/mesas-ventas-por-mozo?...
        router → service.generar_reporte_mozos
          reporte.validar_periodo + intervalo_utc
          repository.mozos_para_reporte + ids_mesas_del_sector
          atencion_service.sumar_ventas_por_mozo_mesa(inicio, fin, mesa_ids)
          reporte.armar_lineas + armar_reporte
      resultado → StatCard x3 + ReporteMozosTabla
      total_ventas === 0 → Alert «No hay datos disponibles…»
```

## Contratos

**Backend:**

```python
# atencion/repository.py y atencion/service.py
def sumar_ventas_por_mozo_mesa(
    db: Session, desde: datetime, hasta: datetime, mesa_ids: list[int] | None = None
) -> list[VentaPorMozoMesa]: ...

# salon/repository.py
def mozos_para_reporte(db: Session, mozo_id: int | None = None) -> list[Mozo]: ...
def ids_mesas_del_sector(db: Session, sector_id: int) -> list[int]: ...

# salon/service.py
def generar_reporte_mozos(
    db: Session,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    mozo_id: int | None = None,
    sector_id: int | None = None,
) -> ReporteMesasVentasPorMozo: ...

# salon/router.py
@router.get("/reportes/mesas-ventas-por-mozo")
def reporte_mesas_ventas_por_mozo(...) -> ReporteMesasVentasPorMozo: ...
```

**Frontend:**

```ts
export function obtenerReporteMozos(
  fechaDesde: string,
  fechaHasta: string,
  mozoId?: number | null,
  sectorId?: number | null,
): Promise<RespuestaApi<ReporteMesasVentasPorMozo>>;

export function useReporteMozos(): {
  desde: string;
  hasta: string;
  setDesde: (valor: string) => void;
  setHasta: (valor: string) => void;
  mozoId: string;
  setMozoId: (valor: string) => void;
  sectorId: string;
  setSectorId: (valor: string) => void;
  mozos: Mozo[];
  sectores: Sector[];
  resultado: ReporteMesasVentasPorMozo | null;
  error: string | null;
  cargando: boolean;
  generar: () => Promise<void>;
};
```

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/atencion/models.py` | `mozo_id` nullable |
| `backend/alembic/versions/c3e5a7b9d1f2_agrega_mozo_id_a_comandas.py` | Migración |
| `backend/app/modules/atencion/{repository,service}.py` | Lectura agregada |
| `backend/app/modules/salon/reporte.py` | Nuevo |
| `backend/app/modules/salon/{repository,service,router,schemas}.py` | Reporte |
| `backend/tests/modules/salon/test_reporte.py` | Nuevo |
| `backend/tests/modules/atencion/test_migracion.py` | Pruebas de la migración |
| `frontend/src/modules/salon/{types.ts,api.ts}` | Cliente |
| `frontend/src/modules/salon/validarPeriodo.ts` | Nuevo |
| `frontend/src/modules/salon/components/{useReporteMozos.ts,ReporteMozosTabla.tsx}` | Nuevos |
| `frontend/src/modules/salon/pages/ReporteMozosPage.tsx` | Nuevo |
| `frontend/src/App.tsx`, `frontend/src/shared/components/reportes.ts` | Ruta y catálogo |

## Estrategia de pruebas

| Capa | Qué |
| --- | --- |
| `reporte.py` | Promedio con y sin mesas; líneas en cero; totales y promedio general |
| `atencion.service` | Agregación por mozo y mesa; excluye anuladas, fuera de período y comandas sin mozo |
| `salon.service` | Filtros por mozo y sector; período inválido |
| `router` | 200 con importes como texto; 422 por fechas faltantes, inversas, formato o ids ≤ 0 |
| `api.ts` | URL con y sin filtros opcionales |
| `ReporteMozosPage` | Filtros, error de período, filas y totales, sin datos, cambio de período |

## Migración y despliegue

La migración agrega `mozo_id` nullable a `comandas`; no reescribe la tabla ni toca índices. El downgrade la elimina. Como la API actual no envía mozo, todas las comandas nuevas quedan en `NULL` hasta que exista el flujo de asignación.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Límite |
| --- | --- | --- | --- | --- |
| Backend | ≈ 180 | ≈ 230 | ≈ 410 | 800 |
| Frontend | ≈ 260 | ≈ 160 | ≈ 420 | 800 |

Un solo PR.
