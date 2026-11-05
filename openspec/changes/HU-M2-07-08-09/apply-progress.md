# Apply progress: HU-M2-07-08-09 Crear, modificar y finalizar una promoción

## Estado

| Fase | Estado |
| --- | --- |
| Artefactos SDD | Completa |
| Alta: modelo, migración, schemas, service y router | Completa |
| Modificación: schemas, service, router y bloqueos | Completa |
| Finalización: columna, migración, endpoint y confirmación | Completa |
| Endpoint de lectura de uso en M4 | Completa |
| Frontend: alta y edición | Completa |
| Verificación completa del backend | Pendiente (se corre una vez antes del PR) |
| Commit y PR | Pendiente |

## Backend

- `menus/models.py`: `Promocion`, `TipoPromocion`, `DiaSemana` y `promocion_productos`.
- `alembic/versions/a4c6e8b0d2f4_crea_promociones.py`: tablas, índice único, FKs y checks.
- `menus/schemas.py`: `PromocionCrear`, `PromocionModificar`, salidas y filtro.
- `menus/repository.py`: unicidad, alta, modificación y listado.
- `menus/service.py`: alta, `modificar_promocion` y `finalizar_promocion`; bloquea finalizadas y aplicadas.
- `menus/router.py`: `POST`, `PUT /promociones/{id}`, `POST /promociones/{id}/finalizar` y `GET`.
- `atencion/repository.py` y `atencion/service.py`: `promocion_fue_aplicada`, lectura pública para M2.
- `alembic/versions/b5d7f9a1c3e5_agrega_finalizacion_promociones.py`: columna nullable.

Resultado focalizado: **270 passed** (`tests/modules/menus` + `tests/modules/atencion/test_service.py`),
`ruff check`, `ruff format --check` y `lint-imports` en verde.

## Frontend

- Alta y edición con el mismo formulario; al cambiar el tipo se limpian los campos anteriores.
- `PromocionesTabla` muestra «Editar» solo para promociones habilitadas.
- `PromocionesTab` distingue alta y edición; el modal se titula «Editar promoción» cuando corresponde.
- Pruebas de API, validación, alta, edición y finalización con confirmación en `src/modules/menus`.

Resultado: suite completa del frontend en verde, cobertura **76.37 %**, `eslint`, `prettier`, `tsc` y
`vite build` correctos.

## Ajustes fuera del módulo

- `backend/tests/modules/reservas/test_migracion.py` ya no fija la cabeza exacta de Alembic.
- `backend/app/modules/atencion/{repository,service}.py` agregan una lectura de solo uso; no cambian
  el comportamiento de M4. Avisar a Juan Ignacio (M4) y a Federico (M5) en el PR.

## Fuera de alcance

- CA 11 (aplicación NxM en una venta): corresponde a M4.

## Pendiente

1. Correr la suite completa del backend una vez antes del PR.
2. Crear los commits y el PR con `Closes #29`, `Closes #30` y `Closes #31`.
3. Mover la tarjeta a «En Testing» al integrarse.
