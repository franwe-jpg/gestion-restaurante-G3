# Propuesta: HU-M6-08 Reporte de recaudación por medio de pago y deuda pendiente

- **Issue:** [#89](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/89) HU-M6-08 (épica #88, prioridad media). Cambio `HU-M6-08`, rama sugerida `feature/HU-M6-08-reporte-recaudacion`. Sprint 4. M6 sin responsable en S4: lo implementa Franco con autorización, y se avisa en el PR.
- **Exploración:** `openspec/changes/HU-M6-08/exploration.md`.
- **Diagrama de clases:** servicio `ReporteRecaudacion` (`fechaDesde`, `fechaHasta ≥ fechaDesde`, `generar(): ResumenRecaudacion`) y DTO `ResumenRecaudacion` (`totalPorMedioPago`, `totalAdeudado`).

## Intención

Los cobros y las facturas ya existen, pero el encargado no puede ver, para un período, cuánto se cobró con cada medio de pago ni cuánto quedó sin cobrar. El reporte responde las dos preguntas (CA 1, 3 y 4) y avisa cuando el período no tiene datos (CA 2).

## Alcance

### Incluido

- **Backend (`backend/app/modules/pagos/`):** `GET /api/v1/reportes/recaudacion-por-medio-de-pago` y `/pdf`; `reporte.py` (validación del período e intervalo UTC, copias locales); `reporte_pdf.py`; schema `ResumenRecaudacion`; funciones de reporte y PDF en `service.py`; `resumir_facturas_adeudadas` con `desde`/`hasta` opcionales (retrocompatible con `caja-del-dia`). Se reutiliza `sumar_cobros_por_medio`.
- **Frontend (`frontend/src/modules/pagos/`):** página `ReporteRecaudacionPage.tsx`, hook, `validarPeriodo.ts` local, funciones en `api.ts` y tipos en `types.ts`. Tarjetas de total cobrado y total adeudado, tabla por medio y botón «Descargar PDF».
- **Compartido (solo registro):** una entrada al final de `frontend/src/shared/components/reportes.ts`, una `<Route>` en `frontend/src/App.tsx` y una prueba de la tarjeta en `ReportesPage.test.tsx`.
- Una prueba por criterio de aceptación en cada lado, con Strict TDD.

### Excluido

- Migraciones e índices nuevos (S7).
- Filtro por medio de pago (S4), gráficos, CSV, paginación.
- Saldo histórico al cierre del período (enfoque 3 de la exploración).
- Cambios en otros módulos o en `backend/app/shared/`.

## Capacidades

### Nuevas

- `pagos-reporte-recaudacion`: reporte por período con lo cobrado agrupado por medio de pago y la deuda del período, validación de fechas, caso sin datos, salidas JSON y PDF, y la pantalla con su entrada en `/reportes`.

### Modificadas

- Ninguna (no hay specs de pagos en `openspec/specs/`; `caja-del-dia` conserva su comportamiento).

## Enfoque

Enfoque 1 de la exploración: `repository` (consultas agregadas en SQL, D-11) → `reporte.py` puro → `service` → `reporte_pdf.py` → router que solo delega (patrón de HU-M5-07). Respuesta: `fecha_desde`, `fecha_hasta`, `por_medio_pago: list[CobradoPorMedio]`, `total_cobrado`, `adeudado: AdeudadoSalida`. PDF `recaudacion-medio-pago_<desde>_<hasta>.pdf` con tabla por medio, recuadro resumen y un párrafo que explica el cálculo de la deuda.

## Supuestos a validar por el equipo

| # | Supuesto: |
| --- | --- |
| S1 | Cobros del período: `Cobro.fecha_hora` en `[00:00 local de desde, 00:00 local de hasta + 1)`, UTC−3; extremos inclusivos. |
| S2 | Deuda del período: facturas con `fecha_emision` en el mismo intervalo y estado `ADEUDADA`; monto = suma del `saldo_pendiente` actual (no el saldo al cierre). Se aclara en pantalla y en el PDF. |
| S3 | Se agrupan los medios con cobros en el período, incluidos los dados de baja; los medios sin cobros no aparecen. Orden por nombre. |
| S4 | Sin filtro por medio de pago: el diagrama no lo tiene; el «medio de pago» del issue es la agrupación. |
| S5 | Sin datos (CA 2): sin cobros ni deuda → JSON 200 en cero y «No hay datos para el período seleccionado»; el PDF se genera igual. Con deuda y sin cobros: se muestra la deuda y «Sin cobros en el período». |
| S6 | Importes como texto con 2 decimales; en pantalla, formato es-AR (`formatearMoneda`). |
| S7 | Sin migración ni índices nuevos (volumen bajo). Seguimiento: si el equipo exige RNF-REN-05 al pie de la letra, agregar `ix_cobros_fecha_hora` e `ix_facturas_fecha_emision`. |
| S8 | PDF incluido, por la convención de HU-M1-15 y HU-M5-07. |
| S9 | Mensajes de validación y `validarPeriodo.ts` son copias locales, no importados de otro módulo. |

## Ronda de preguntas de la propuesta

Modo automático: no se consultó a la persona. Las dudas de producto (definición de «adeudado», filtro por medio, caso sin datos, PDF) quedan resueltas por S2, S4, S5 y S8 y se validan en la revisión de la spec.

## Áreas afectadas

| Área | Impacto | Descripción |
| --- | --- | --- |
| `backend/app/modules/pagos/{repository,service,schemas,router}.py` | Modificado | Deuda por período, reporte JSON y PDF, schema, dos rutas |
| `backend/app/modules/pagos/{reporte,reporte_pdf}.py` | Nuevo | Lógica pura y armado del PDF |
| `backend/tests/modules/pagos/` | Modificado y nuevo | Pruebas |
| `frontend/src/modules/pagos/` | Modificado y nuevo | `api.ts`, `types.ts`, página, hook, validación y pruebas |
| `frontend/src/shared/components/reportes.ts`, `frontend/src/App.tsx` | Modificado (1 entrada, 1 ruta) | Registro en `/reportes` |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| El equipo entiende «adeudado» como snapshot (como `caja-del-dia`) | (a estimar por el equipo) | S2 explícito; regla aislada en el repository |
| Factura emitida en el período y cobrada después: cuenta como deuda aquí y como cobro en otro período | (a estimar por el equipo) | Nota en pantalla y PDF |
| Recorrido completo sin índices | (a estimar por el equipo) | S7 con seguimiento |
| Conflictos en archivos compartidos del hub | (a estimar por el equipo) | Solo una entrada y una ruta; aviso en el PR |

## Plan de reversión

Sin cambios de esquema. Revertir los commits o `git revert -m 1 <merge>`; sin `alembic downgrade`. Para quitar solo el PDF: ruta `/pdf`, `reporte_pdf.py` y botón.

## Dependencias

- S4-06 (`caja-del-dia`) en `develop`: `sumar_cobros_por_medio`, `CobradoPorMedio`, `AdeudadoSalida`.
- HU-M1-15: `shared/pdf.py` y hub `/reportes`.

## Presupuesto de revisión (punto de control)

Backend ~550 de 800; frontend ~600 de 800.

## Criterios de éxito

- [ ] CA 1 y 3: con cobros en el período, total por medio y total cobrado correctos; los cobros fuera del período no cuentan.
- [ ] CA 4: la deuda suma el `saldo_pendiente` de las facturas `ADEUDADA` emitidas en el período, con cantidad de facturas.
- [ ] CA 2: período vacío → 200 en cero y «No hay datos para el período seleccionado».
- [ ] Período inválido → 422 `{"detalle": ...}` con los 4 mensajes.
- [ ] PDF descargable con el período en el nombre; tarjeta en `/reportes`.
- [ ] `caja-del-dia` sin cambios de comportamiento; CI en verde; PR con `Closes #89` y S1 a S9.
