## Exploración: HU-M6-08 Reporte «recaudación por medio de pago y deuda pendiente»

Issue #89 (épica #88, prioridad media, asignada a franwe-jpg). Datos: período (obligatorio), medio de pago, total recaudado por medio de pago, total adeudado. Criterios: (1) con período elegido se ve lo cobrado por cada medio y lo adeudado; (2) período sin pagos: el sistema avisa que no hay datos; (3) con pagos, agrupados por medio; (4) con facturas impagas en el período, se incluye el total adeudado. Sin dependencias vinculadas. M6 sin responsable en S4: Franco trabaja en pagos con autorización.

### Estado actual

**Modelo (`backend/app/modules/pagos/models.py`)**

- `MedioPago`: id, nombre, nombre_normalizado, `tipo` (`TipoMedioPago`: EFECTIVO, TARJETA, TRANSFERENCIA, BILLETERA_VIRTUAL), descripcion, estado (HABILITADO/...), `eliminado` (baja lógica; las filas se conservan).
- `Factura`: id, `comanda_id` (único), `fecha_emision` (DateTime tz, UTC), `total`, `saldo_pendiente`, `estado` (`EstadoFactura`: ADEUDADA | PAGADA), detalles, cobros.
- `Cobro`: id, `factura_id`, `medio_pago_id`, `monto`, `fecha_hora` (DateTime tz, UTC), `numero_comprobante`. No hay entidad «Pago»: el código usa `Cobro` y el diagrama `ReporteRecaudacion` / `ResumenRecaudacion`.
- Diagrama (`SPRINT-0/G3 - Diagrama de clases unificado.drawio`): servicio `ReporteRecaudacion` {fechaDesde, fechaHasta {≥ fechaDesde}, `generar(): ResumenRecaudacion`}; DTO `ResumenRecaudacion` {`totalPorMedioPago: Map[MedioPago, Decimal]`, `totalAdeudado: Decimal`}. No hay filtro por medio de pago en el diagrama: el medio es la agrupación.
- Índices: ninguno sobre `cobros.fecha_hora` ni `facturas.fecha_emision` (solo FK y únicos). Atención tiene `ix_comandas_fecha_hora` y Reservas `ix_reservas_fecha_hora`.

**Reutilizable (S4-06, `GET /api/v1/reportes/caja-del-dia`, ya en el router de pagos)**

- `repository.sumar_cobros_por_medio(db, desde, hasta)`: intervalo semiabierto `[desde, hasta)` en UTC, JOIN a `MedioPago` (incluye medios dados de baja), `GROUP BY` medio; devuelve medio_pago_id, nombre, tipo, cantidad_cobros, monto. Sirve tal cual; solo muestra medios con cobros.
- `schemas.CobradoPorMedio` y `schemas.AdeudadoSalida {cantidad_facturas, monto}`; `Importe` serializa como texto con 2 decimales.
- `service._redondear` (SQLite suma en float) y `CENTAVO`.
- `repository.resumir_facturas_adeudadas(db)`: cuenta y suma `saldo_pendiente` de facturas ADEUDADA de cualquier fecha (snapshot). No filtra por período: no sirve tal cual.
- `ZONA_DEL_RESTAURANTE` (UTC-3) está en `pagos/comprobante_pdf.py`. Los otros módulos copian su propia constante e `intervalo_utc`.
- Patrón de PDF en pagos: `comprobante_pdf.py` (compone) + `ArchivoComprobante` en service + `shared.pdf.renderizar`.

**Qué es «adeudado»:** factura con `estado == ADEUDADA` y `saldo_pendiente > 0` (el service mantiene saldo y estado sincronizados: PAGADA ⇔ saldo 0). Un cobro parcial deja la factura ADEUDADA con el saldo restante. La «deuda pendiente» de S4-06 es un snapshot, pero el criterio 4 habla de «facturas impagas en el período» y el período es obligatorio, así que debe depender del período.

### Patrón de los reportes existentes (en develop)

- Rutas: `GET /api/v1/reportes/<nombre>` (D-28, solo lectura) y `/pdf` hermana. Existen: `productos-mas-vendidos` (+pdf), `reservas-ausentismo` (+pdf), `mesas-ventas-por-mozo`, `impacto-promociones` (M2 y M3 solo pantalla), `caja-del-dia`.
- Parámetros `fecha_desde: date | None = None` y `fecha_hasta: date | None = None` (opcionales a propósito: la validación la hace `reporte.validar_periodo`, que da 422 `{"detalle": ...}` vía `DatosInvalidosError` con 4 mensajes literales: «Faltan la fecha desde y la fecha hasta.», «Falta la fecha desde.», «Falta la fecha hasta.», «El período es inválido: la fecha desde es posterior a la fecha hasta.»). Fecha mal formada: 422 de FastAPI. El período es inclusivo en ambos extremos.
- Capas (M5-07 como modelo, `openspec/changes/HU-M5-07/design.md`): `repository` (consulta agregada) → `reporte.py` puro (validar_periodo, intervalo_utc, armar_resumen) → `service` (`generar_reporte_*` y `generar_pdf_*` que reutiliza el JSON; dataclass de archivo propio; nombre `<reporte>_<desde>_<hasta>.pdf`) → `reporte_pdf.py` (compone `DocumentoPdf`, no dibuja) → router que solo delega; PDF con `Content-Disposition: attachment`. Cada módulo copia `validar_periodo`, `intervalo_utc` y el dataclass; no se importa entre módulos ni se mueve a `shared/` (contratos de import-linter).
- `shared/pdf.py`: `DocumentoPdf(titulo, periodo, generado, parrafos, tablas, resumen)`, `TablaPdf(titulo, columnas, filas, anchos, alinear_derecha)`. El recuadro `resumen` reparte el ancho en partes iguales (sirve con 2–3 datos). «Generado» en hora local sin zona. Período del PDF: «Período: dd/mm/aaaa al dd/mm/aaaa».
- Vacío: JSON 200 con datos en cero; la pantalla muestra `EmptyState` «No hay datos para el período seleccionado»; el PDF se genera igual con el mismo texto y sin tablas.
- Frontend (M5): `modules/<m>/pages/Reporte*Page.tsx` + hook `useReporte*.ts` (estado desde/hasta, `generar`, `descargarPdf` con `guardarArchivo`, muestra el `detalle` del 422) + `validarPeriodo.ts` local (copia) + dos funciones en `api.ts` (`clienteHttp.get` y `clienteHttp.obtenerArchivo`, `URLSearchParams` con `fecha_desde`/`fecha_hasta`) + tipos en `types.ts` (importes como `string`). UI: `Breadcrumbs` (Reportes › X), `PageHeader`, `DateRangePicker`, botón «Generar», `Alert warning` (error) y `danger` (descarga), `StatCard`, `EmptyState`, botón «Descargar PDF» siempre que haya resultado. `ChartContainer` solo lo usa M1.
- Hub: `frontend/src/shared/components/reportes.ts` (`REPORTES`: titulo, descripcion, ruta; hoy 4 entradas: M1, M5, M3, M2; no hay tarjeta de M6) y `App.tsx` (un `lazy` y una `<Route path="reportes/<nombre>">`). `ReportesPage.test.tsx` accede a las tarjetas por índice, así que agregar una al final no rompe pruebas existentes; conviene sumar una prueba de la tarjeta M6. `reportes.ts` no puede importar de `modules/` (lo verifica una prueba).
- RNF y decisiones: D-11 y RNF-REN-05 (agregación en SQL, ≤ 3 s para 6 meses, EXPLAIN sin recorrido completo), D-28 (reportes bajo `/api/v1/reportes/...`, filtros como query params), D-25/D-26 (errores `{"detalle"}`, 404/409/422), D-27 (paginación: no aplica), RNF-SEG-05 (consultas parametrizadas), RNF-MAN-05 (funciones ≤ 50 líneas, complejidad ≤ 10), RNF-MAN-09 (un módulo solo importa el service de otro).

### Áreas afectadas

- Backend (pagos, M6): `repository.py` (extender `resumir_facturas_adeudadas` con `desde`/`hasta` opcionales); nuevos `reporte.py` y `reporte_pdf.py`; `schemas.py` (`ResumenRecaudacion`); `service.py` (`generar_reporte_recaudacion`, `generar_pdf_recaudacion`); `router.py` (2 rutas); pruebas en `backend/tests/modules/pagos/`.
- Frontend (pagos): `types.ts`, `api.ts`, `validarPeriodo.ts`, `pages/ReporteRecaudacionPage.tsx` + hook + pruebas.
- Compartidos (solo catálogo y ruta): `frontend/src/shared/components/reportes.ts`, `frontend/src/App.tsx`, `ReportesPage.test.tsx`.
- Sin tocar: otros módulos; `shared/pdf.py` sin cambios.

### Enfoques para la deuda

| # | Enfoque | Pros | Contras | Esfuerzo |
| --- | --- | --- | --- | --- |
| 1 | **Deuda del período**: facturas con `fecha_emision` en el período y estado ADEUDADA; monto = suma de su `saldo_pendiente` actual | Coincide con el criterio 4 y con el período obligatorio; reutiliza `AdeudadoSalida`; una consulta agregada | Mezcla ejes: cobros por `fecha_hora`, deuda por `fecha_emision`; el saldo es el actual, no el de fin de período | Bajo |
| 2 | **Snapshot** (reusar `resumir_facturas_adeudadas` sin cambios) | Cero cambios; mismo número que la caja | Ignora el período: contradice el criterio 4 | Muy bajo |
| 3 | **Saldo histórico al cierre del período** | Contablemente exacto | Consulta más compleja y difícil de explicar; excede la HU | Alto |

### Recomendación

Enfoque 1:

- Ruta `GET /api/v1/reportes/recaudacion-por-medio-de-pago` y `.../pdf`; `fecha_desde`/`fecha_hasta` opcionales en el router, validadas con un `validar_periodo` copiado a `pagos/reporte.py` (422 con los 4 mensajes).
- `intervalo_utc(desde, hasta)` copiado de `productos/reporte.py` (00:00 local de `desde` a 00:00 de `hasta + 1`, semiabierto, UTC-3); se usa con `sumar_cobros_por_medio` y con la deuda (por `Factura.fecha_emision`).
- Respuesta `ResumenRecaudacion`: `fecha_desde`, `fecha_hasta`, `por_medio_pago: list[CobradoPorMedio]`, `total_cobrado: Importe`, `adeudado: AdeudadoSalida`.
- Extender `resumir_facturas_adeudadas(db, desde=None, hasta=None)` (retrocompatible; `caja-del-dia` no cambia).
- Pantalla: StatCards (total cobrado, total adeudado con cantidad de facturas) + tabla por medio (nombre, tipo, cantidad de cobros, monto) + botón «Descargar PDF». PDF: `TablaPdf` por medio + recuadro resumen + párrafo que explica el cálculo; nombre `recaudacion-medio-pago_<desde>_<hasta>.pdf`.
- Hub: una entrada al final de `reportes.ts` y una `<Route path="reportes/recaudacion-por-medio-de-pago">` en `App.tsx`.
- Tamaño estimado: backend ~250 líneas de código + ~300 de pruebas; frontend ~300 + ~300. Ambos bajo el punto de control de 800.

### Supuestos propuestos

1. `Supuesto:` cobros del período: `Cobro.fecha_hora` en `[00:00 local de desde, 00:00 local de hasta+1)`, UTC-3; extremos inclusivos.
2. `Supuesto:` deuda del período: facturas con `fecha_emision` en el mismo intervalo y estado ADEUDADA; monto = suma de `saldo_pendiente` actual (no el saldo al cierre del período). Se aclara en pantalla y en el PDF.
3. `Supuesto:` se agrupa por medio de pago con cobros en el período, incluidos los dados de baja (como S4-06); los medios sin cobros no aparecen. Orden por nombre.
4. `Supuesto:` sin filtro por medio de pago (el diagrama no lo tiene; «medio de pago» del issue es la agrupación).
5. `Supuesto:` «sin datos» (criterio 2): no hay cobros ni facturas adeudadas en el período → «No hay datos para el período seleccionado» (JSON 200 con ceros; el PDF se genera igual). Si hay deuda pero no cobros: se muestra la deuda y «Sin cobros en el período».
6. `Supuesto:` importes como texto con 2 decimales; en pantalla, formato es-AR (`formatearMoneda`).
7. `Supuesto:` sin migración ni índices nuevos (volumen de referencia bajo). Si el equipo exige «EXPLAIN sin recorrido completo» (RNF-REN-05) al pie de la letra, sumar `ix_cobros_fecha_hora` e `ix_facturas_fecha_emision` con migración.
8. `Supuesto:` PDF incluido (convención de HU-M1-15 y HU-M5-07).
9. `Supuesto:` los mensajes de validación y `validarPeriodo.ts` son copia local, no importados de otro módulo.

### Riesgos

- «Adeudado» ambiguo: el issue dice «facturas impagas del período» y S4-06 usa un snapshot. Se adopta el supuesto 2.
- Sin índices en `cobros.fecha_hora` ni `facturas.fecha_emision` (supuesto 7).
- `reportes.ts`, `App.tsx` y `ReportesPage.test.tsx` son compartidos: solo se agrega catálogo y ruta; avisar en el PR.
- Una factura emitida en el período y cobrada después aparece en la deuda de este período y en los cobros de otro: documentarlo en el PDF.
- M6 sin responsable en S4: cambio acotado a pagos, con aviso en el PR.

### Listo para propuesta

Sí.
