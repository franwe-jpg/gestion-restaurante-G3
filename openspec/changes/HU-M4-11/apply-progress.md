# Progreso de implementación: HU-M4-11

## Estado

Implementación focalizada terminada. El dispatcher SDD no se utilizó; la persona autorizó trabajo directo en modo Build y artefactos OpenSpec manuales.

## Hecho

- Se documentaron propuesta, contrato/especificación, diseño y tareas.
- Backend M4: endpoint GET de solo lectura, validación de fechas/turno, límites horarios UTC−3, agregación SQL de comandas CERRADA y cálculo con Decimal.
- Frontend: filtros de fecha y turno, tarjetas de resumen, tabla y estado vacío; tarjeta del hub y ruta lazy.
- Se mantuvo el cambio de esquema en cero. Decisión confirmada por la persona: asignar día/turno por `fecha_hora` de creación (UTC→UTC−3), contar solo comandas CERRADA al consultar; el turno Noche pertenece al día en que comienza aunque la comanda cierre después.

## Verificación focalizada

- RED inicial: pytest falló al importar el módulo nuevo `atencion.reporte`; Vitest falló al resolver `ReporteComandasPage` aún no creado.
- GREEN backend: `.venv/bin/pytest --no-cov tests/modules/atencion/test_reporte_comandas.py tests/modules/atencion/test_repository_reporte_comandas.py tests/modules/atencion/test_reporte_comandas_router.py -q` — 19 passed. Incluye filtros, estados, Decimal/descuento, límites de turnos, fecha local nocturna, medianoche, vacío e invalidación.
- GREEN frontend: `npm test -- --run src/modules/atencion/pages/ReporteComandasPage.test.tsx src/shared/components/ReportesPage.test.tsx` — 12 passed.
- Calidad focalizada: Ruff check + format check (8 archivos backend), ESLint (archivos frontend), Prettier (archivos frontend) y `tsc --noEmit` pasaron.
- `pytest` con configuración del repositorio activa cobertura global por defecto y falló el umbral si no se anula. Se usó `--no-cov` para respetar la solicitud de pruebas focalizadas.

## Revisión de interfaz previa al commit

- Se comparó la pantalla M4 con los reportes de M3, M5 y M6 y la guía de componentes. No se detectaron diferencias visuales/componentes que requieran cambios: ya utiliza Breadcrumbs, PageHeader, DateRangePicker, Select, botón Generar, tres StatCard, EmptyState, Alert, DataTable y `formatearMoneda` compartidos.
- Se verificó la tarjeta del catálogo y la ruta lazy `/reportes/comandas-ticket-promedio`; se añadió una prueba de montaje de la ruta real en `App.test.tsx`.
- Se registró como decisión confirmada que la fecha/turno viene de la creación UTC convertida a UTC−3; solo cuentan comandas CERRADA al consultar y la noche se asigna al día en que comienza.
- Pruebas frontend afectadas: `npm test -- --run src/modules/atencion/pages/ReporteComandasPage.test.tsx src/shared/components/ReportesPage.test.tsx src/App.test.tsx` — 21 passed.
- Controles solicitados: `npm run lint`, `npm run format:check` y `npm run typecheck` — todos pasaron.

## Pendiente de confirmación/seguimiento

- Riesgo funcional registrado: fecha/hora de creación puede diferir de cierre. Para atribución real de cierre hará falta acordar y persistir ese instante en trabajo futuro.
- No se ejecutaron suites completas, cobertura global, build, migraciones, commits ni publicación.
