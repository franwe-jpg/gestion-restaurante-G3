# Exploración: HU-M5-01-02-03 ABM de reservas (crear, modificar, listar)

> **Nota:** esta exploración se copia de Engram (`sdd/HU-M5-01-02-03/explore`). Algunos puntos abiertos que aparecen abajo ya se resolvieron después de la exploración. Las decisiones están en la sección «Decisiones ya tomadas» y en `proposal.md`, y tienen prioridad sobre el texto original.

## Decisiones ya tomadas

- **Dependencias M3/M4 («M5 autocontenido»):** `Reserva` guarda `mesa_id` y `cliente_id` como enteros. Mesa y Cliente se validan con un puente propio dentro de `reservas/`: un stub detrás de una función o protocolo del `service`, fácil de reemplazar. No se modifica código de M3 (`salon/`) ni de M4 (`atencion/`). El único cambio fuera de M5 es un ajuste mínimo en los 2 tests de migración de M3 (`backend/tests/modules/salon/test_migracion.py`, cerca de las líneas 116 y 258), que se anota en el PR para avisar a Giuliano.
- **Estado inicial:** `ACTIVA` (diagrama de clases, S2-02 y maqueta). S1-07 dice `PENDIENTE`: queda registrado como contradicción de fuentes y como `Supuesto:`. Enum `EstadoReserva` = `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA`.
- **Fuera de alcance:** cancelaciones (HU-M5-04/05), comanda desde reserva (HU-M5-06) y reporte (HU-M5-07).

## Resumen

Todo el módulo `reservas` (backend y frontend) es un esqueleto vacío. El patrón a imitar es M1 `productos` y M3 `salon`.

## Ubicaciones relevantes

- `backend/app/modules/reservas/*.py`: solo tienen docstrings.
- `backend/app/main.py:13-27`: falta registrar el `router` de reservas.
- `backend/alembic/env.py:19`: `reservas` ya está registrado.
- Head de Alembic actual: `b2d4f6a8c0e1`.
- `frontend/src/modules/reservas/*`: esqueleto.
- Fuentes de negocio: diagrama del SPRINT-0 (`Reserva`), SPRINT-1/S1-07 (CP-HU-M5-01), SPRINT-2/S2-04-maqueta/reservas.html.

## Hallazgos

1. **Entidad `Reserva`** (diagrama unificado, líneas 94/100): `id`, `fecha` date `{>= hoy}`, `hora` time, `cantidadPersonas` int `{> 0}`, `estado` `EstadoReserva = ACTIVA`. Regla: no puede haber otra reserva `ACTIVA` en la misma mesa, fecha y hora (coincidencia exacta, sin duración). `EstadoReserva` = `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA`. Relaciones: Cliente 1 - Reserva; Mesa 1 - Reserva 0..*. `modificar(fecha, hora, cantidadPersonas)` no cambia la mesa ni el cliente.
2. **Contradicciones:** S1-07 (líneas 155, 165, 168) usa el estado `PENDIENTE`, exige cantidad `<=` capacidad y no menciona al Cliente; el diagrama, S2-02:15 y la maqueta usan `ACTIVA`. El atributo se llama `cantidadPersonas` (no «comensales»).
3. **Dependencias faltantes:** `salon.service` solo expone `crear_sector`, `crear_mesa` y `listar_sectores` (no hay `obtener_mesa` ni `GET /mesas`). `atencion` (M4) está vacío (no existe `Cliente`). Un módulo solo puede importar el `service` de otro (`backend/pyproject.toml:121-154`).
4. **Riesgo de Alembic:** una revisión nueva sobre `b2d4f6a8c0e1` rompe `backend/tests/modules/salon/test_migracion.py:116` y `:258`, que hacen `downgrade` relativo (-2 / -1) atado al head.
5. **Frontend:** `formatearFecha` (`frontend/src/shared/lib/format.ts:9-18`) interpreta `'YYYY-MM-DD'` como UTC y muestra el día anterior en UTC-3. `StatusBadge` no conoce `ACTIVA`, `ATENDIDA` ni `CANCELADA_*`. `G3_Backlog.xlsx` (hoja «Story Map») no se pudo leer en la exploración; los textos de las HU los aportó después el orquestador.

## Puntos abiertos (resueltos como supuestos en la propuesta)

- Horario de atención para la hora de la reserva.
- Significado de mesa «disponible», control de capacidad y hora ya pasada en el día de hoy.
- Qué reservas se pueden modificar y cómo se revalida el conflicto.
- Filtros y orden del listado.
- Códigos de error 404 / 409 / 422.
