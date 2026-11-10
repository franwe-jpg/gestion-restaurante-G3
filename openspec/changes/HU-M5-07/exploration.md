# Exploración — HU-M5-07 (#87): Reporte «reservas y ausentismo por período»

## Estado actual

`reservas/` tiene el ABM completo (HU-M5-01 a 05) pero ningún reporte. `backend/app/modules/reservas/repository.py` no tiene ninguna consulta de conteo agregado por rango de fechas ni por estado; hay que escribirla desde cero. Sin dependencias cross-módulo: todo el trabajo queda dentro de `reservas/`.

## Patrón de referencia (M1, HU-M1-15, recién mergeado a `develop`)

**Backend** — cuatro capas:
1. `repository.py` — consulta agregada.
2. `reporte.py` (nuevo, puro) — `validar_periodo(desde, hasta)` (exige ambas fechas, rechaza `desde > hasta`, `DatosInvalidosError` 422 con mensajes literales) + cálculo. No hay validación de período compartida en `shared/`; cada módulo la reimplementa igual (`backend/app/modules/productos/reporte.py:24-36`).
3. `service.py` — encadena validar → consultar → armar DTO. Si hay PDF: `ArchivoPdf` (dataclass frozen) + `reporte_pdf.py` + `app/shared/pdf.py:renderizar()` (`backend/app/modules/productos/service.py:582-595`).
4. `router.py` — `GET /reportes/{nombre}` (JSON) y opcionalmente `GET /reportes/{nombre}/pdf` (`backend/app/modules/productos/router.py:193-209`).

**Frontend**: página `Reporte*Page.tsx` + hook `use*Reporte.ts` + `validarPeriodo.ts` local (mismos 4 mensajes que el backend, no hay uno compartido) + funciones en `api.ts`. Registrar en `frontend/src/shared/components/reportes.ts` (catálogo estático, 1 línea) y una `<Route>` en `frontend/src/App.tsx` dentro de `<Route path="reportes">`. `navegacion.ts` no requiere cambios.

## Hallazgos sin resolver (para `sdd-propose`)

1. **DTO "atendidas"**: el diagrama de clases unificado define `ResumenReservasAusentismo` sin un campo de reservas atendidas, pero el texto de la HU-M5-07 sí lo pide como dato a mostrar. Por AGENTS.md §2, la HU y sus criterios de aceptación ganan sobre el diagrama. HU-M5-06 (la que marca reservas como ATENDIDA) no existe todavía, así que ese campo puede dar 0 en producción hoy — no es razón para omitirlo del DTO.
2. **CA 2 — "sin datos"**: cuando el período no tiene reservas, hay que informar "no hay datos" y no calcular ningún porcentaje. Hace falta decidir la forma del DTO (`porcentaje_ausentismo: Decimal | None`, bandera `hay_datos`, u otra).
3. **Exportación a PDF**: la HU no la pide explícitamente, pero es la convención ya asentada en M1/M2/M3/M4/M6. Documentar como `Supuesto:` si se sigue o no.

## Riesgos

- Ninguno cross-módulo.
- Presupuesto de revisión: AGENTS.md §4 sugiere ~800 líneas; esta sesión usa ~400 como heurística de planificación, no como tope duro.

## Listo para propuesta

Sí — patrón mapeado con evidencia concreta, sin dependencias cruzadas. Tres preguntas abiertas, ninguna bloqueante para avanzar a `sdd-propose` como `Supuesto:`.
