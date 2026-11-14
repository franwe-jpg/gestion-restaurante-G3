# Propuesta: HU-M5-07 Reporte de reservas y ausentismo por período

- **Issue:** [#87](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/87) HU-M5-07. Cambio `HU-M5-07`, rama sugerida `feature/HU-M5-07-reporte-reservas-ausentismo`. Sprint 4. Responsable: Federico Cabaña (M5).
- Reporte del módulo M5 previsto en el plan («Reservas y ausentismo por período», `SPRINT-0/Plan-de-trabajo-Sprint.md:102`).
- **Exploración:** `openspec/changes/HU-M5-07/exploration.md`.
- **Diagrama de clases** (`SPRINT-0/G3 - Diagrama de clases unificado.drawio`, celdas `rep-rM5` y `rep-rM5dto`): servicio `ReporteReservasAusentismo` (`fechaDesde`, `fechaHasta ≥ fechaDesde`, `generar(): ResumenReservas`) y DTO `ResumenReservas` (`totalReservas`, `canceladasAnticipada`, `canceladasPorAusencia`, `porcentajeAusentismo: Decimal`). **Corrección a la exploración:** el DTO del diagrama se llama `ResumenReservas`, no `ResumenReservasAusentismo`; esta propuesta usa los nombres del diagrama.
- Los criterios de aceptación del issue no se leyeron directamente en esta fase (sin acceso a `gh`); salen del pedido del orquestador y de la exploración. La spec DEBE trazarlos uno por uno contra #87.

## Intención

Las reservas ya registran su desenlace (`ATENDIDA`, `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA`, desde HU-M5-04-05), pero el encargado no tiene cómo ver, para un período, cuántas reservas hubo, cómo terminaron y qué proporción de clientes no se presentó. El reporte responde eso para un rango de fechas elegido, y cuando el período no tiene reservas lo informa sin inventar un porcentaje.

## Alcance

### Incluido

- **Backend (solo `reservas/`):**
  - Una consulta nueva en `repository.py` que cuenta, en la base, las reservas cuya `fecha` está en `[fecha_desde, fecha_hasta]`, agrupadas por `estado` (una sola consulta `GROUP BY`, parametrizada, apoyada en el índice existente `ix_reservas_fecha_hora`).
  - Un archivo nuevo `reporte.py`, puro y sin base: `validar_periodo` (mismas reglas y mensajes literales que `productos/reporte.py:24-36`) y el cálculo del `ResumenReservas` a partir de los conteos.
  - En `service.py`: la función del reporte (validar → consultar → armar el DTO) y la función que arma el PDF (`ArchivoPdf` + `reporte_pdf.py` nuevo + `app/shared/pdf.py:renderizar()`, que ya existe y se usa sin modificarlo).
  - En `router.py`: `GET /api/v1/reportes/reservas-ausentismo` (JSON) y `GET /api/v1/reportes/reservas-ausentismo/pdf` (`application/pdf`), ambas con `fecha_desde` y `fecha_hasta` como parámetros de consulta.
  - En `schemas.py`: el schema de salida `ResumenReservas`.
- **Frontend (`frontend/src/modules/reservas/`):** página `ReporteReservasAusentismoPage.tsx`, su hook, un `validarPeriodo.ts` local (mismos mensajes que el backend), las funciones nuevas en `api.ts` y los tipos en `types.ts`. La página muestra el período, los cinco datos y el botón «Descargar PDF»; si el período no tiene reservas, muestra «No hay datos para el período seleccionado» y ningún porcentaje.
- **Registro del reporte (dos líneas compartidas, mismo patrón que M1):** una entrada en el catálogo `frontend/src/shared/components/reportes.ts` y una `<Route>` en `frontend/src/App.tsx` dentro de `<Route path="reportes">`. No se crean componentes compartidos nuevos ni se modifica `navegacion.ts`.
- Una prueba por criterio de aceptación en cada lado (camino feliz, sin datos y período inválido como mínimo), con Strict TDD (`openspec/config.yaml`).

### Excluido

- Cualquier cambio de esquema o migración: los estados y el índice `ix_reservas_fecha_hora` ya existen.
- Cambios en otros módulos (M1 a M4, M6) o en `backend/app/shared/` (se usa `pdf.py` tal como está; no se mueve `validar_periodo` a `shared/`).
- La transición a `ATENDIDA` (HU-M5-06): el reporte la cuenta si existe, pero no la implementa.
- Desgloses por día, franja horaria, mesa o cliente; gráficos; exportación a CSV; paginación (es un reporte, no un listado D-27); autenticación y roles.
- Unificar `validar_periodo` y la zona horaria entre módulos (seguimiento del equipo, ya anotado en S116 de HU-M1-15).

## Capacidades

### Nuevas

- `reservas-reporte-ausentismo`: consulta del reporte por período (validación de fechas, conteo por estado, cálculo del porcentaje de ausentismo, caso sin datos), salidas JSON y PDF, y la pantalla del reporte con su entrada en `/reportes`.

### Modificadas

- Ninguna. El reporte solo lee reservas; no cambia requisitos de `reservas-gestion` (que además todavía vive solo en los cambios sin archivar HU-M5-01-02-03 y HU-M5-04-05).

## Enfoque

### Decisión: el DTO incluye `atendidas`

El texto de la HU-M5-07 pide mostrar las reservas atendidas; el DTO `ResumenReservas` del diagrama no tiene ese campo. Por AGENTS.md §2 («el issue gana para HU y tareas»), **el DTO final incluye `atendidas: int`**. No es un `Supuesto:`, es una decisión tomada por la regla de precedencia. El diagrama queda desactualizado en ese punto y **la diferencia se señala en el PR** para que el equipo actualice el diagrama.

Mientras HU-M5-06 no esté implementada, ninguna reserva llega a `ATENDIDA` y el campo dará 0 en producción; eso no es motivo para omitirlo, y las pruebas lo cubren insertando reservas `ATENDIDA` directamente.

### DTO resultante

| Campo (Python / JSON) | Diagrama | Tipo | Cálculo |
| --- | --- | --- | --- |
| `fecha_desde`, `fecha_hasta` | `fechaDesde`, `fechaHasta` | `date` | Eco del período validado, para que la pantalla y el PDF lo muestren. |
| `total_reservas` | `totalReservas` | `int` | Todas las reservas con `fecha` en el período, en cualquier estado (S2). |
| `atendidas` | — (decisión de arriba) | `int` | Estado `ATENDIDA`. |
| `canceladas_anticipada` | `canceladasAnticipada` | `int` | Estado `CANCELADA_ANTICIPADA`. |
| `canceladas_por_ausencia` | `canceladasPorAusencia` | `int` | Estado `CANCELADA_POR_AUSENCIA`. |
| `porcentaje_ausentismo` | `porcentajeAusentismo` | `Decimal \| None` | `canceladas_por_ausencia / total_reservas × 100`, redondeado a 2 decimales; `None` si `total_reservas == 0` (S1, S3). |

Las reservas `ACTIVA` cuentan en `total_reservas` pero no tienen campo propio (la HU no lo pide; se deduce como `total − atendidas − canceladas`).

### Capas

1. **`repository.py`:** `contar_reservas_por_estado(sesion, desde, hasta) -> dict[EstadoReserva, int]` (nombre final en el diseño). `Reserva.fecha` ya es la fecha local del restaurante, así que no hace falta convertir a UTC como en M1; el filtro es `fecha BETWEEN :desde AND :hasta` con ambos extremos incluidos.
2. **`reporte.py` (nuevo, puro):** `validar_periodo` con los cuatro casos de M1 (faltan ambas, falta desde, falta hasta, desde > hasta → `DatosInvalidosError`, 422) y una función que convierte los conteos en `ResumenReservas`, incluida la regla de `None`.
3. **`service.py`:** la operación `generar` del servicio `ReporteReservasAusentismo` del diagrama, como función del módulo; y la variante PDF que devuelve un `ArchivoPdf` con el período en el nombre del archivo.
4. **`router.py`:** solo delega; los errores salen con `{"detalle": ...}` y 422 (D-25, D-26).

### Frontend

- `api.ts`: `obtenerReporteReservasAusentismo(desde, hasta)` y `descargarReporteReservasAusentismoPdf(desde, hasta)`, por `clienteHttp` (D-16), copiando las funciones equivalentes de M1.
- Hook `useReporteReservasAusentismo` con estados de carga, error (muestra el `detalle` del 422) y resultado.
- La página decide «sin datos» con `total_reservas === 0` (equivalente a `porcentaje_ausentismo === null`) y en ese caso no muestra ningún porcentaje; el botón «Descargar PDF» sigue disponible y el PDF también informa «no hay datos» (S5).
- La maqueta no tiene pantalla de reportes: se sigue el estilo de la página de M1 y la diferencia se anota en el PR.

## Supuestos a validar por el equipo

| # | Supuesto: |
| --- | --- |
| S1 | **Forma del DTO sin datos (CA 2).** Cuando el período no tiene reservas, la respuesta es **200** con los cuatro contadores en 0 y `porcentaje_ausentismo: null`; no se agrega una bandera `hay_datos`. Justificación: (a) `null` hace imposible mostrar un «0 %» engañoso, porque no hay un número que calcular, y cumple literalmente «sin calcular ningún porcentaje»; (b) evita un campo redundante que podría contradecirse con `total_reservas` (una sola fuente de verdad: `total_reservas == 0` ⇔ `porcentaje_ausentismo is None`); (c) mantiene el DTO lo más cerca posible del diagrama (solo cambia la nulabilidad de `porcentajeAusentismo`); (d) responder 200 y no 404 sigue la convención de HU-M1-15 (S108) para que la pantalla muestre el mensaje y no un error. La spec fija la invariante con una prueba. |
| S2 | **Qué es una reserva «del período».** Cuenta toda reserva cuya `fecha` (local, UTC−3) esté entre `fecha_desde` y `fecha_hasta`, ambas incluidas, en cualquier estado, incluidas las `ACTIVA` (pasadas sin resolver o futuras). No se usa la fecha de creación ni la de cancelación. |
| S3 | **Porcentaje de ausentismo:** `canceladas_por_ausencia / total_reservas × 100`, redondeado a 2 decimales con `ROUND_HALF_UP`. El denominador es el total del período (incluye `ACTIVA` y canceladas anticipadamente), según el diagrama. La representación JSON del `Decimal` la fija el diseño siguiendo los reportes ya integrados. |
| S4 | **Validación del período:** ambas fechas obligatorias y `fecha_desde ≤ fecha_hasta`, con los mismos cuatro mensajes literales que `productos/reporte.py` (422). Se reimplementa dentro de `reservas/` (no hay versión compartida y no se toca `shared/`). Sin amplitud máxima del período. |
| S5 | **Exportación a PDF.** La HU no la pide explícitamente; se incluye por la convención del equipo para los reportes de módulo (M1 ya la tiene en `develop`; según el pedido del orquestador, M2, M3, M4 y M6 también) y porque reduce fricción en la revisión y deja los seis reportes homogéneos. Usa `app/shared/pdf.py` sin modificarlo (`fpdf2` ya es dependencia, no se agrega ninguna). Período sin datos → 200 con un PDF que lo dice. El equipo la valida en el PR como cualquier otro supuesto; si se descarta, se quitan la ruta `/pdf`, `reporte_pdf.py` y el botón, sin afectar el resto. |
| S6 | **Contenido del PDF:** título, período en dd/mm/aaaa, fecha de generación en hora local, los cinco datos del DTO y una línea que explica el cálculo del porcentaje; A4 vertical, como el de M1. |
| S7 | **Rutas:** `GET /api/v1/reportes/reservas-ausentismo` y `/pdf`, y la ruta de pantalla `/reportes/reservas-ausentismo`, siguiendo el patrón `/reportes/{nombre}` de M1. |

## Preguntas abiertas (decisiones de producto)

Ninguna bloqueante. Los tres puntos que dejó la exploración quedaron resueltos: `atendidas` como decisión por precedencia del issue; el caso sin datos en S1; el PDF en S5. Si al leer #87 algún criterio contradice S1 a S7, la spec lo ajusta y lo señala.

## Áreas afectadas

| Área | Impacto | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/repository.py` | Modificado | Consulta de conteo por estado en un rango de fechas |
| `backend/app/modules/reservas/reporte.py` | Nuevo | `validar_periodo` y cálculo puro del `ResumenReservas` |
| `backend/app/modules/reservas/reporte_pdf.py` | Nuevo | Armado del `DocumentoPdf` del reporte |
| `backend/app/modules/reservas/service.py` | Modificado | Reporte JSON y PDF (`ArchivoPdf`) |
| `backend/app/modules/reservas/schemas.py` | Modificado | Schema de salida `ResumenReservas` |
| `backend/app/modules/reservas/router.py` | Modificado | Dos rutas `GET /reportes/reservas-ausentismo[/pdf]` |
| `backend/tests/modules/reservas/` | Modificado y nuevo | Pruebas de repository, reporte, service y router |
| `frontend/src/modules/reservas/{api.ts,types.ts}` (+ `api.test.ts`) | Modificado | Funciones y tipos del reporte |
| `frontend/src/modules/reservas/pages/` (página, hook, `validarPeriodo.ts` y pruebas) | Nuevo | Pantalla del reporte |
| `frontend/src/shared/components/reportes.ts` | Modificado (1 entrada) | Tarjeta del reporte en `/reportes` |
| `frontend/src/App.tsx` | Modificado (1 ruta) | `<Route>` dentro de `reportes` |
| Migraciones, `alembic/`, `backend/app/shared/`, otros módulos | Sin cambios | Solo lectura sobre datos existentes |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| El texto real de #87 difiere del resumido (por ejemplo, otra definición del porcentaje o del período). | (a estimar por el equipo) | La spec traza cada CA contra #87 antes del apply; S2 y S3 aíslan las reglas en `reporte.py`. |
| `atendidas` siempre en 0 hasta que exista HU-M5-06, y el revisor lo lea como un error. | (a estimar por el equipo) | Pruebas con reservas `ATENDIDA` insertadas directamente; nota en el PR. |
| Conflicto de merge en `reportes.ts` o `App.tsx` con los reportes de otros módulos. | (a estimar por el equipo) | Cambio de una entrada y una ruta; `git pull origin develop` antes del PR (AGENTS.md §8). |
| El equipo descarta el PDF (S5). | (a estimar por el equipo) | Partes del PDF separadas (`reporte_pdf.py`, una ruta, un botón); se quitan sin tocar el JSON. |
| El diagrama queda desactualizado (`atendidas`, nulabilidad del porcentaje). | (a estimar por el equipo) | Señalarlo en el PR para que el equipo actualice el `.drawio`. |
| Serialización del `Decimal` distinta a la de otros reportes. | (a estimar por el equipo) | El diseño la alinea con los reportes ya integrados. |

Los riesgos no llevan valores de probabilidad (AGENTS.md §9.9).

## Plan de reversión

El cambio **no toca el esquema** ni escribe datos: las rutas nuevas son de solo lectura.

1. **Antes de integrar:** descartar la rama o revertir sus commits.
2. **Ya integrado en `develop`:** `git revert -m 1 <merge>`. No hace falta `alembic downgrade`.
3. **Parcial (solo PDF, si el equipo descarta S5):** quitar la ruta `/pdf`, `reporte_pdf.py`, la función de descarga y el botón.
4. **Verificación:** `pytest` y `npm test` en verde, `alembic heads` sin cambios y la tarjeta ausente de `/reportes`.

## Dependencias

- HU-M5-01-02-03 (modelo `Reserva`, ya en `develop`) y HU-M5-04-05 (estados cancelados en uso). Si HU-M5-04-05 aún no está integrada, el reporte funciona igual: los estados ya existen en `EstadoReserva`.
- HU-M1-15 en `develop`: aporta `app/shared/pdf.py`, `fpdf2` y la página compartida `/reportes` con su catálogo.
- No depende de HU-M5-06; cuando esta exista, `atendidas` deja de dar 0 sin cambios en el reporte.
- Leer #87 para trazar los criterios en la spec.

## Presupuesto de revisión estimado (punto de control, no bloqueo)

| Lado | Límite | Estimación | Detalle |
| --- | --- | --- | --- |
| `backend/` | 800 | ~300 a 400 | repository ~20, `reporte.py` ~50, `reporte_pdf.py` ~40, service ~30, router ~20, schemas ~15, pruebas ~150 a 220 |
| `frontend/` | 800 | ~350 a 450 | `api.ts` y tipos ~30, `validarPeriodo.ts` ~20, hook ~50, página ~100, registro 2 líneas, pruebas ~150 a 250 |

## Criterios de éxito

- [ ] Camino feliz: para un período con reservas, el JSON y la pantalla muestran `total_reservas`, `atendidas`, `canceladas_anticipada`, `canceladas_por_ausencia` y `porcentaje_ausentismo` correctos (prueba con reservas en los cuatro estados y fuera del período).
- [ ] CA 2: un período sin reservas responde 200 con contadores en 0 y `porcentaje_ausentismo: null`; la pantalla muestra «No hay datos para el período seleccionado» y ningún porcentaje.
- [ ] Período inválido (falta una fecha, faltan ambas, desde > hasta) → 422 con `{"detalle": ...}` y el mismo mensaje en la pantalla, sin llamar a la API cuando la validación local falla.
- [ ] Bordes del período: reservas en `fecha_desde` y `fecha_hasta` cuentan; el día anterior y el posterior no.
- [ ] El PDF se descarga con el período en el nombre y contiene los mismos datos (o «no hay datos»).
- [ ] El reporte aparece como tarjeta en `/reportes` y abre `/reportes/reservas-ausentismo`.
- [ ] Sin migración nueva; sin cambios en otros módulos ni en `backend/app/shared/`; `lint-imports` pasa sin tocar contratos.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, Vitest ≥ 60 %, lint, typecheck y build.
- [ ] El PR enlaza `Closes #87`, señala que el diagrama no tiene `atendidas` y lista S1 a S7 para validación del equipo.
