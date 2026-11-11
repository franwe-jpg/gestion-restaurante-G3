# Apply progress: HU-M6-08 Reporte de recaudación por medio de pago y deuda pendiente

## Estado

Tareas 1.1 a 1.13, 2.1 a 2.13, 3.2 y 3.3 hechas. Quedan 3.1 (`git pull origin develop`) y 3.4 (abrir el PR),
a cargo del orquestador y de la persona. Strict TDD: cada grupo de pruebas se vio fallar antes del código
(backend: `ModuleNotFoundError`, `ImportError` y 34 casos HTTP fallando; frontend: módulos y funciones
inexistentes).

## Commits

1. `docs: agrega exploración, propuesta, spec, diseño y tareas del reporte de recaudación (HU-M6-08)`
2. `feat: agrega el reporte de recaudación por medio de pago en el backend (HU-M6-08)`
3. `feat: agrega la pantalla del reporte de recaudación por medio de pago (HU-M6-08)`
4. `docs:` con este archivo y las marcas de `tasks.md`.

## Verificación (comandos de CI de AGENTS.md §7)

- Backend: `ruff check .` OK, `ruff format --check .` OK, `lint-imports` 10 contratos cumplidos, `pytest`
  2211 pruebas en verde, cobertura 98,44 % (mínimo 70 %). `alembic heads`: un solo head
  (`c3e5a7b9d1f2`), sin migración nueva.
- Frontend: `npm run lint` (0 advertencias), `format:check`, `typecheck`, `test:coverage` y `build` OK.
- Mutaciones (1.11): quitar el filtro `fecha_emision < hasta`, cambiar `+ 1 día` por `+ 0` y filtrar la deuda
  por `PAGADA` hacen fallar las pruebas (2, 4 y 8 casos); restauradas.

## Presupuesto de revisión (frente a `origin/develop`)

- `backend/`: 11 archivos, +766 / -57 (punto de control 800).
- `frontend/`: ver el informe del orquestador (`git diff --shortstat origin/develop -- frontend`).

## Desvíos y notas

- `ArchivoComprobante` sin tocar; se agregó `ArchivoReporte` (Decisión 5).
- `EmptyState` exige `descripcion`: el vacío de la tabla usa «Solo hay facturas adeudadas emitidas en el
  período.».
- Los importes de las pruebas de pantalla se comparan con `formatearMoneda` normalizando el espacio duro.
- Sin cambios fuera de los archivos autorizados (3.3 verificado con `git diff --name-only`).

## Lista para el PR (tarea 3.4)

- `Closes #89`.
- Supuestos S1 a S9 de `proposal.md` para validar, en especial S2 (deuda por `fecha_emision` con saldo
  actual).
- Aviso: M6 sin responsable en S4 (lo implementa Franco con autorización) y archivos compartidos
  (`reportes.ts`, `App.tsx`, `ReportesPage.test.tsx`).
- Formato de importes es-AR en pantalla y PDF (S6), a diferencia de `FacturasTabla` y del comprobante.
- La maqueta `SPRINT-2/S2-04-maqueta/` no tiene pantalla de reportes; se siguió el estilo de los reportes
  integrados.
- Presupuesto medido contra 800 líneas por lado (ver arriba).
