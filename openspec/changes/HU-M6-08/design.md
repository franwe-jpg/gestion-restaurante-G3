# Diseño: HU-M6-08 Reporte de recaudación por medio de pago y deuda pendiente

- **Entradas:** `proposal.md` y `exploration.md` de este cambio. La spec (`specs/pagos-reporte-recaudacion/spec.md`) se escribe en paralelo: este diseño sigue la propuesta (S1 a S9) y debe revisarse contra la spec antes de `sdd-tasks`.
- **Patrón de referencia:** HU-M5-07 (`openspec/changes/HU-M5-07/design.md`), ya integrado: `reservas/reporte.py`, `reporte_pdf.py`, `service.py:294-320`, `router.py:74-90`; frontend `reservas/pages/ReporteReservasAusentismoPage.tsx`, `useReporteReservasAusentismo.ts`, `validarPeriodo.ts`, `api.ts:88-110`.
- **Código de pagos que se reutiliza (verificado):** `repository.sumar_cobros_por_medio` (`repository.py:102-117`), `repository.resumir_facturas_adeudadas` (`:120-126`), `schemas.Importe` (`schemas.py:79`), `CobradoPorMedio` (`:179-188`), `AdeudadoSalida` (`:191-193`), `service._ahora` (`service.py:307-308`), `service._redondear` (`:311-313`), `comprobante_pdf.ZONA_DEL_RESTAURANTE` (`comprobante_pdf.py:10`), `shared/pdf.py` (`DocumentoPdf`, `TablaPdf`, `renderizar`).
- **Idioma:** español neutro; identificadores según S1-02 y S1-03.

## Enfoque técnico

Lectura agregada dentro de `pagos/`, con las cuatro capas de HU-M5-07 (D-02, D-11): dos consultas agregadas parametrizadas en `repository` (cobros por medio, ya existente; deuda del período, extendiendo la existente de forma retrocompatible) → `reporte.py` puro (validación del período, intervalo UTC, armado del DTO) → `service` (JSON y PDF) → `reporte_pdf.py` (solo compone) → dos rutas `GET` que solo delegan. Sin migraciones, sin importaciones de otros módulos y sin cambios en `backend/app/shared/`. En el frontend, página + hook + `validarPeriodo.ts` local + dos funciones en `api.ts`, y el registro en `/reportes`.

## Decisiones de arquitectura

| # | Decisión | Alternativas descartadas | Justificación |
| --- | --- | --- | --- |
| 1 | `resumir_facturas_adeudadas(db, desde=None, hasta=None)`: filtra `fecha_emision` en `[desde, hasta)` solo si el argumento no es `None` | Función nueva `resumir_deuda_del_periodo`; filtrar en Python | Una sola regla de «adeudada» (S2); `caja-del-dia` la llama sin argumentos y conserva el snapshot (sus pruebas K07 y K08 lo protegen); agregación en SQL (D-11) |
| 2 | Reutilizar `sumar_cobros_por_medio` sin cambios | Consulta nueva | Ya agrupa en `[desde, hasta)` UTC, incluye medios dados de baja y ordena por nombre (S3) |
| 3 | `pagos/reporte.py` con `validar_periodo` e `intervalo_utc` **copiados** de `reservas/reporte.py:14-26` y `productos/reporte.py:39-46`; `ZONA_DEL_RESTAURANTE` se importa de `pagos/comprobante_pdf.py` | Importar de otro módulo; mover a `shared/` | Contratos de import-linter (`pyproject.toml:88-101`, RNF-MAN-09); `shared/` excluido (S9); dentro del módulo hay una sola constante de zona |
| 4 | El `service` convierte filas a `CobradoPorMedio` con un helper privado `_cobrados_por_medio(filas)`, extraído de `obtener_caja_del_dia` (`service.py:322-331`) | Duplicar la comprensión | Misma conversión y redondeo (`_redondear`) en los dos reportes; refactor sin cambio de comportamiento, cubierto por `test_caja_del_dia.py` |
| 5 | Agregar un dataclass propio `ArchivoReporte` (`contenido: bytes`, `nombre: str`, `frozen=True`) en `service.py`, siguiendo el patrón de `ArchivoPdf` de HU-M5-07; `ArchivoComprobante` (HU-M6-03) no se toca | Renombrar `ArchivoComprobante` a `ArchivoPdf` y reutilizarlo | `ArchivoComprobante` pertenece a HU-M6-03: no se modifica código de otra HU; el dataclass nuevo es mínimo y deja cada PDF con su tipo |
| 6 | «Sin datos» = `por_medio_pago == []` y `adeudado.cantidad_facturas == 0`; se calcula igual en PDF y pantalla | Campo booleano en el DTO | El DTO sigue el diagrama (`ResumenRecaudacion`); la regla es trivial y se prueba en los dos lados |
| 7 | Fecha de generación del PDF: `_ahora().astimezone(ZONA_DEL_RESTAURANTE).replace(tzinfo=None)` | `datetime.now(...)` directo, como el comprobante | `_ahora` ya se fija con `monkeypatch` en las pruebas de pagos |
| 8 | Importes: JSON como texto con 2 decimales (`Importe`); PDF `"$ 1.500,00"` con `formatear_importe`; pantalla con `formatearMoneda(Number(valor))` (S6) | `"$ 1500.00"` como `comprobante_pdf._importe` y `FacturasTabla` | S6 fija formato es-AR; pantalla y PDF muestran lo mismo |
| 9 | Fábricas `fabrica_factura` y `fabrica_cobro` se mueven de `test_caja_del_dia.py:30-65` a `tests/modules/pagos/conftest.py`; `fabrica_factura` suma `fecha_emision: datetime | None = None` | Duplicarlas en el archivo nuevo | Las usan los dos archivos de reportes; `HOY_A_LAS_10` también pasa a `conftest.py` |
| 10 | Página con 2 `StatCard` + `DataTable` por medio (con `vacio` = «Sin cobros en el período») + `EmptyState` cuando no hay datos | `ChartContainer`; tabla HTML propia | Componentes de `shared/components/ui`; mismo estilo que M5; la maqueta no tiene pantalla de reportes |

## Flujo de datos

```text
GET /api/v1/reportes/recaudacion-por-medio-de-pago?fecha_desde&fecha_hasta
  router.reporte_recaudacion ─► service.generar_reporte_recaudacion
     ├─ reporte.validar_periodo ──✗─► DatosInvalidosError → 422 {"detalle"} (sin consultas)
     ├─ reporte.intervalo_utc → (inicio, fin)  [00:00 local desde, 00:00 local hasta+1) en UTC
     ├─ repository.sumar_cobros_por_medio(db, inicio, fin) → _cobrados_por_medio → list[CobradoPorMedio]
     ├─ repository.resumir_facturas_adeudadas(db, inicio, fin) → (cantidad, saldo) → AdeudadoSalida
     └─ reporte.armar_resumen → ResumenRecaudacion (total_cobrado = suma de montos)
GET .../pdf ─► service.generar_pdf_recaudacion
     ├─ generar_reporte_recaudacion (mismo camino y mismo 422 JSON)
     ├─ reporte_pdf.componer(resumen, generado) → DocumentoPdf
     └─ shared.pdf.renderizar → ArchivoReporte(contenido, "recaudacion-medio-pago_<desde>_<hasta>.pdf")
Frontend: ReporteRecaudacionPage ─► useReporteRecaudacion.generar
     ├─ validarPeriodo ✗ → Alert warning, sin API
     └─ api.obtenerReporteRecaudacion → clienteHttp.get → EmptyState | StatCards + DataTable
   descargarPdf → api.descargarReporteRecaudacionPdf → clienteHttp.obtenerArchivo → guardarArchivo
```

## Consultas SQL

Cobros (existente, sin cambios):

```sql
SELECT medios_pago.id AS medio_pago_id, medios_pago.nombre, medios_pago.tipo,
       count(cobros.id) AS cantidad_cobros, coalesce(sum(cobros.monto), 0) AS monto
FROM cobros JOIN medios_pago ON cobros.medio_pago_id = medios_pago.id
WHERE cobros.fecha_hora >= :inicio AND cobros.fecha_hora < :fin
GROUP BY medios_pago.id, medios_pago.nombre, medios_pago.tipo
ORDER BY medios_pago.nombre, medios_pago.id
```

Deuda del período (extensión; las dos condiciones de fecha solo se agregan con argumentos):

```sql
SELECT count(facturas.id), coalesce(sum(facturas.saldo_pendiente), 0)
FROM facturas
WHERE facturas.estado = :estado            -- 'ADEUDADA'
  AND facturas.fecha_emision >= :inicio    -- solo si desde no es None
  AND facturas.fecha_emision < :fin        -- solo si hasta no es None
```

```python
def resumir_facturas_adeudadas(
    db: Session, desde: datetime | None = None, hasta: datetime | None = None
) -> tuple[int, Decimal]:
    """Facturas ADEUDADA y suma de su saldo pendiente. Sin `desde`/`hasta`, de cualquier fecha
    (S4-06); con ellos, solo las emitidas en [desde, hasta) (HU-M6-08)."""
    consulta = select(
        func.count(Factura.id), func.coalesce(func.sum(Factura.saldo_pendiente), 0)
    ).where(Factura.estado == EstadoFactura.ADEUDADA)
    if desde is not None:
        consulta = consulta.where(Factura.fecha_emision >= desde)
    if hasta is not None:
        consulta = consulta.where(Factura.fecha_emision < hasta)
    cantidad, saldo = db.execute(consulta).one()
    return cantidad, Decimal(str(saldo))
```

Sin índices nuevos (S7): ambas consultas recorren la tabla; seguimiento con `ix_cobros_fecha_hora` e `ix_facturas_fecha_emision` si el equipo exige RNF-REN-05 al pie de la letra.

## Contratos e interfaces

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/reportes/recaudacion-por-medio-de-pago` | query `fecha_desde`, `fecha_hasta` (`YYYY-MM-DD`, opcionales en el router) | 200 `ResumenRecaudacion` | 422 `{"detalle"}` con los 4 mensajes de `validar_periodo`; formato inválido: 422 de `main.py` («Datos invalidos. fecha_desde: ...») |
| `GET .../recaudacion-por-medio-de-pago/pdf` | mismo query | 200 `application/pdf`, `Content-Disposition: attachment; filename="recaudacion-medio-pago_<desde>_<hasta>.pdf"` | 422 JSON, igual que arriba |

```json
{
  "fecha_desde": "2026-11-01",
  "fecha_hasta": "2026-11-09",
  "por_medio_pago": [
    {"medio_pago_id": 1, "nombre": "Efectivo", "tipo": "EFECTIVO", "cantidad_cobros": 2, "monto": "1500.00"},
    {"medio_pago_id": 2, "nombre": "Tarjeta", "tipo": "TARJETA", "cantidad_cobros": 1, "monto": "2000.00"}
  ],
  "total_cobrado": "3500.00",
  "adeudado": {"cantidad_facturas": 2, "monto": "500.50"}
}
```

Sin datos: `por_medio_pago: []`, `total_cobrado: "0.00"`, `adeudado: {"cantidad_facturas": 0, "monto": "0.00"}`.

Firmas del backend:

```python
# schemas.py (nuevo, al final; CobradoPorMedio: docstring «Cobros de un medio de pago en un intervalo»)
class ResumenRecaudacion(BaseModel):
    fecha_desde: date
    fecha_hasta: date
    por_medio_pago: list[CobradoPorMedio]
    total_cobrado: Importe
    adeudado: AdeudadoSalida
# reporte.py (nuevo)
def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]: ...
def intervalo_utc(desde: date, hasta: date) -> tuple[datetime, datetime]: ...
def armar_resumen(desde: date, hasta: date, por_medio: list[CobradoPorMedio],
                  adeudado: AdeudadoSalida) -> ResumenRecaudacion: ...
# reporte_pdf.py (nuevo)
TITULO = "Recaudación por medio de pago"
SIN_DATOS = "No hay datos para el período seleccionado."
SIN_COBROS = "Sin cobros en el período."
def formatear_importe(valor: Decimal) -> str: ...          # Decimal("1500.5") → "$ 1.500,50"
def componer(resumen: ResumenRecaudacion, generado: datetime) -> DocumentoPdf: ...
# service.py
def _cobrados_por_medio(filas: list[Row]) -> list[CobradoPorMedio]: ...
def generar_reporte_recaudacion(db: Session, fecha_desde: date | None,
                                fecha_hasta: date | None) -> ResumenRecaudacion: ...
@dataclass(frozen=True)
class ArchivoReporte:
    contenido: bytes
    nombre: str
def generar_pdf_recaudacion(db: Session, fecha_desde: date | None,
                            fecha_hasta: date | None) -> ArchivoReporte: ...
# router.py
@router.get("/reportes/recaudacion-por-medio-de-pago")
def reporte_recaudacion(db: Sesion, fecha_desde: date | None = None,
                        fecha_hasta: date | None = None) -> ResumenRecaudacion: ...
@router.get("/reportes/recaudacion-por-medio-de-pago/pdf")
def reporte_recaudacion_pdf(db: Sesion, fecha_desde: date | None = None,
                            fecha_hasta: date | None = None) -> Response: ...
```

Firmas del frontend (`pagos/`):

```ts
// types.ts
export interface CobradoPorMedio { medio_pago_id: number; nombre: string; tipo: TipoMedioPago; cantidad_cobros: number; monto: string; }
export interface Adeudado { cantidad_facturas: number; monto: string; }
export interface ResumenRecaudacion { fecha_desde: string; fecha_hasta: string; por_medio_pago: CobradoPorMedio[]; total_cobrado: string; adeudado: Adeudado; }
// api.ts (consultaPeriodo privada con URLSearchParams, como reservas/api.ts:88)
export function obtenerReporteRecaudacion(fechaDesde: string, fechaHasta: string): Promise<RespuestaApi<ResumenRecaudacion>>;
export function descargarReporteRecaudacionPdf(fechaDesde: string, fechaHasta: string): Promise<RespuestaApi<Blob>>;
// validarPeriodo.ts (copia de reservas/validarPeriodo.ts)
export function validarPeriodo(desde: string, hasta: string): string | null;
// pages/useReporteRecaudacion.ts: mismas claves que useReporteReservasAusentismo; ERROR_CARGA, ERROR_DESCARGA
export function useReporteRecaudacion(): { desde; hasta; setDesde; setHasta; resultado: ResumenRecaudacion | null; error; errorDescarga; cargando; descargando; generar; descargarPdf };
// pages/ReporteRecaudacionPage.tsx
export function ReporteRecaudacionPage(): JSX.Element;
```

## Diseño del PDF (`reporte_pdf.componer`)

| Elemento | Con datos | Sin datos |
| --- | --- | --- |
| Título | «Recaudación por medio de pago» | igual |
| Período | «Período: dd/mm/aaaa al dd/mm/aaaa» | igual |
| Generado | `generado` (hora local, lo dibuja `shared/pdf.py:87`) | igual |
| Recuadro `resumen` (3 datos) | «Total cobrado» `$ 3.500,00` · «Total adeudado» `$ 500,50` · «Facturas adeudadas» `2` | vacío |
| Párrafos | `_EXPLICACION`; más `SIN_COBROS` si no hay cobros pero sí deuda | `_EXPLICACION`, `SIN_DATOS` |
| Tabla «Cobrado por medio de pago» | columnas `Medio de pago`, `Tipo`, `Cobros`, `Monto`; `anchos=[3, 2, 1, 2]`; `alinear_derecha={2, 3}`; una fila por medio y una fila final `Total` | sin tabla |

- `_EXPLICACION`: «Lo cobrado suma los cobros registrados desde las 00:00 de la fecha desde hasta las 24:00 de la fecha hasta (hora del restaurante), agrupados por medio de pago, incluidos los medios dados de baja. Lo adeudado suma el saldo pendiente actual de las facturas emitidas en el período que todavía no están pagadas: si una factura se cobra después, deja de figurar como adeudada.»
- Etiquetas de tipo en un `dict` privado `_TIPOS` (`EFECTIVO` → «Efectivo», `TARJETA` → «Tarjeta», `TRANSFERENCIA` → «Transferencia», `BILLETERA_VIRTUAL` → «Billetera virtual»), iguales a `frontend/.../validarMedioPago.ts:10-15`.
- `componer` delega en `_resumen`, `_parrafos` y `_tablas` para quedar en menos de 25 líneas y complejidad ≤ 4.

## Diseño de la pantalla (`ReporteRecaudacionPage`)

1. `Breadcrumbs`: Reportes (`/reportes`) › «Recaudación por medio de pago».
2. `PageHeader`: título «Recaudación por medio de pago»; descripción «Lo cobrado en un período con cada medio de pago y lo que quedó adeudado.».
3. `DateRangePicker` («Fecha desde», «Fecha hasta») y botón «Generar» / «Generando…».
4. `Alert warning` con `error` (validación local o `detalle` del 422) y `Alert danger` con `errorDescarga`.
5. Con `resultado`: línea «Del dd/mm/aaaa al dd/mm/aaaa» (helper local que parte el texto ISO, sin `Date`).
   - Sin datos (Decisión 6): `EmptyState` con `ReceiptText`, título «No hay datos para el período seleccionado».
   - Con datos: grilla `sm:grid-cols-2` con `StatCard` «Total cobrado» (`formatearMoneda`, descripción «N cobros») y «Total adeudado» (descripción «N facturas emitidas en el período»); `DataTable` con columnas Medio de pago, Tipo (`etiquetaDelTipo` de `../components/validarMedioPago`), Cobros, Monto (derecha) y `vacio` = `EmptyState` «Sin cobros en el período»; nota en `text-xs text-slate-500` con la aclaración de S2.
   - Botón «Descargar PDF» (`variant="outline"`) en los dos casos.
6. Funciones privadas `TarjetasDelResumen`, `TablaPorMedio` y `ResultadoReporte` en el mismo archivo para respetar 50 líneas por función (RNF-MAN-05).

Registro: entrada al final de `REPORTES` (`reportes.ts:32`) con título «Recaudación por medio de pago», descripción «Lo cobrado en un período por cada medio de pago y el total adeudado de las facturas del período.» y ruta `/reportes/recaudacion-por-medio-de-pago`; `lazy` de `ReporteRecaudacionPage` después de `PagosPage` (`App.tsx:75-79`) y `<Route path="reportes/recaudacion-por-medio-de-pago">` después de la de `pagos` (`App.tsx:97`).

## Cambios por archivo

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/pagos/repository.py` | Modificar | `resumir_facturas_adeudadas` con `desde`/`hasta` opcionales (Decisión 1) |
| `backend/app/modules/pagos/schemas.py` | Modificar | `ResumenRecaudacion`; docstring de `CobradoPorMedio` |
| `backend/app/modules/pagos/reporte.py` | Crear | `validar_periodo`, `intervalo_utc`, `armar_resumen` |
| `backend/app/modules/pagos/reporte_pdf.py` | Crear | `formatear_importe`, `componer` y helpers privados |
| `backend/app/modules/pagos/service.py` | Modificar | `_cobrados_por_medio` (extraído), `ArchivoReporte` (dataclass nuevo; `ArchivoComprobante` sin cambios), `generar_reporte_recaudacion`, `generar_pdf_recaudacion` |
| `backend/app/modules/pagos/router.py` | Modificar | Dos rutas `GET`; imports `date` y `ResumenRecaudacion` |
| `backend/tests/modules/pagos/conftest.py` | Modificar | Recibe `fabrica_factura` (con `fecha_emision`), `fabrica_cobro` y `HOY_A_LAS_10` |
| `backend/tests/modules/pagos/test_caja_del_dia.py` | Modificar | Quita las fábricas movidas; las importa de `conftest` |
| `backend/tests/modules/pagos/test_reporte.py` | Crear | Lógica pura |
| `backend/tests/modules/pagos/test_reporte_pdf.py` | Crear | Composición del PDF |
| `backend/tests/modules/pagos/test_reporte_recaudacion.py` | Crear | Repository, service y HTTP |
| `frontend/src/modules/pagos/types.ts` | Modificar | `CobradoPorMedio`, `Adeudado`, `ResumenRecaudacion` |
| `frontend/src/modules/pagos/api.ts` (+ `api.test.ts`) | Modificar | `consultaPeriodo` y dos funciones |
| `frontend/src/modules/pagos/validarPeriodo.ts` (+ `.test.ts`) | Crear | Copia local (S9) |
| `frontend/src/modules/pagos/pages/useReporteRecaudacion.ts` (+ `.test.tsx`) | Crear | Hook |
| `frontend/src/modules/pagos/pages/ReporteRecaudacionPage.tsx` (+ `.test.tsx`) | Crear | Pantalla |
| `frontend/src/shared/components/reportes.ts` | Modificar | Una entrada al final |
| `frontend/src/App.tsx` | Modificar | Un `lazy` y una `<Route>` |
| `frontend/src/shared/components/ReportesPage.test.tsx` | Modificar | `<Route>` de prueba y prueba de la tarjeta M6 (índice 4) |
| `alembic/`, `backend/app/shared/`, `pyproject.toml`, `main.py`, otros módulos | Sin cambios | — |

## Estrategia de pruebas (Strict TDD)

Primero la prueba en rojo. Backend con `pytest` (fixtures `db`, `cliente`, `fabrica_medio_pago` y las movidas a `conftest.py`); frontend con Vitest y Testing Library.

| Archivo | Casos |
| --- | --- |
| `test_reporte.py` | `validar_periodo`: 4 mensajes y `desde == hasta` válido; `intervalo_utc`: 2026-11-01 → `03:00 UTC` del 1 y del día siguiente a `hasta`; `armar_resumen`: `total_cobrado` = suma; lista vacía → `0.00` |
| `test_reporte_pdf.py` | Título, período `dd/mm/aaaa`, `generado`; con datos: recuadro de 3 datos, tabla con filas por medio + `Total`, tipo «Billetera virtual»; solo deuda: sin tabla, `SIN_COBROS` y recuadro; sin datos: sin tabla ni recuadro, `SIN_DATOS`; `formatear_importe`: `1234.5` → `$ 1.234,50`, `0` → `$ 0,00` |
| `test_reporte_recaudacion.py` | CA1/CA3: cobros de 2 medios agrupados, ordenados por nombre, total; cobros fuera del período excluidos; bordes UTC−3 (02:59:59 UTC del día `desde` excluido, 03:00 incluido, 03:00 del día `hasta+1` excluido); medio dado de baja incluido; CA4: facturas `ADEUDADA` emitidas en el período suman `saldo_pendiente` y cantidad, `PAGADA` y emitidas fuera del período excluidas, pago parcial cuenta el saldo restante; solo deuda sin cobros; CA2: período vacío → 200 en cero; 4 mensajes 422 y formato inválido; período inválido no consulta (`monkeypatch` de `repository.sumar_cobros_por_medio` con una función que falla); `/pdf`: `content-type`, `content-disposition` exacto, `%PDF`, sin datos 200, período inverso 422 JSON; `resumir_facturas_adeudadas(db)` sin argumentos sigue contando todas (retrocompatibilidad); solo lectura |
| `test_caja_del_dia.py` | Sin casos nuevos; debe seguir en verde tras el refactor (Decisiones 1, 4, 9) |
| `validarPeriodo.test.ts` | 4 mensajes y caso válido |
| `api.test.ts` | URLs y query de las dos funciones (`clienteHttp.get`, `obtenerArchivo`) |
| `useReporteRecaudacion.test.tsx` | Validación local sin API; éxito; 422 → `detalle`; error sin texto → `ERROR_CARGA`; `descargarPdf` → `guardarArchivo(blob, "recaudacion-medio-pago_<d>_<h>.pdf")`; error de descarga |
| `ReporteRecaudacionPage.test.tsx` | Tabla con medios, tipo y montos; tarjetas de total cobrado y adeudado; solo deuda → «Sin cobros en el período»; sin datos → «No hay datos para el período seleccionado» sin tarjetas; «Descargar PDF» en ambos casos; validación local; `detalle` del 422. Los importes se comparan con `formatearMoneda` (Intl usa espacio duro) |
| `ReportesPage.test.tsx` | La tarjeta 5 navega a `/reportes/recaudacion-por-medio-de-pago` |

## Matriz de amenazas

N/A: dos rutas HTTP de solo lectura, consultas SQLAlchemy parametrizadas (D-07, RNF-SEG-05) y una pantalla; sin enrutamiento de procesos, shell, subprocesos, VCS/PR, clasificación de ejecutables ni integración de procesos. El nombre del archivo del `Content-Disposition` se arma solo con fechas ya convertidas a `date`.

## Estimación de líneas (punto de control, no bloqueo)

| Lado | Código | Pruebas | Total | Límite |
| --- | --- | --- | --- | --- |
| `backend/` | repository ~10, schemas ~12, reporte ~45, reporte_pdf ~85, service ~45 (con refactor y dataclass nuevo `ArchivoReporte`), router ~20 → ~215 | conftest ~45, caja ~45 (movimiento), test_reporte ~70, test_reporte_pdf ~90, test_reporte_recaudacion ~220 → ~470 | **620 a 760** | 800 |
| `frontend/` | types ~20, api ~25, validarPeriodo ~10, hook ~65, página ~130, reportes.ts 6, App.tsx 7 → ~265 | validarPeriodo ~25, api ~30, hook ~120, página ~130, ReportesPage ~15 → ~320 | **520 a 640** | 800 |

El backend queda cerca del límite por el movimiento de fábricas (Decisión 9). Estrategia `single-pr`: un solo PR, sin recortar pruebas.

## Migración y puesta en marcha

Sin migración ni dependencias nuevas (`fpdf2` ya está). `alembic heads` no cambia.

## Contradicciones y desvíos señalados

1. **Formato de importes (S6 vs. pagos):** el módulo muestra `$ ${valor}` (`FacturasTabla.tsx:90`) y el comprobante `"$ 1500.00"` (`comprobante_pdf.py:14-15`); este reporte usa es-AR en pantalla y PDF según S6. No se cambian las pantallas existentes.
2. **Código de otras HU del propio módulo:** solo se extrae `_cobrados_por_medio` de `obtener_caja_del_dia` (S4-06), sin cambio de comportamiento. `ArchivoComprobante` (HU-M6-03) NO se renombra: este cambio agrega `ArchivoReporte` aparte (corrección del orquestador, patrón de HU-M5-07). Hay dos dataclasses de archivo en `service.py`; unificarlos queda para una HU de M6.
3. **`ZONA_DEL_RESTAURANTE`:** la propuesta habla de «copias locales»; el diseño copia `validar_periodo` e `intervalo_utc`, pero importa la zona de `comprobante_pdf.py` (mismo módulo).

## Preguntas abiertas

- [ ] Validación del equipo de S1 a S9, en especial S2 (deuda por `fecha_emision` con saldo actual).
- [ ] Revisar este diseño contra la spec escrita en paralelo (nombres de campos, textos y escenarios).
- [ ] Aviso en el PR: M6 sin responsable en S4 (lo implementa Franco con autorización) y archivos compartidos (`reportes.ts`, `App.tsx`, `ReportesPage.test.tsx`).
