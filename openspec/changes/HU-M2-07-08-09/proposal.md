# Propuesta: HU-M2-07-08-09 Crear, modificar y finalizar una promoción

## Por qué

El encargado necesita registrar y ajustar promociones con reglas claras de precio, vigencia, días y
horario para atraer ventas. Hoy la pestaña «Promociones» es un `EmptyState` y no existe la entidad.

## Qué cambia

- Agrega `Promocion` y `promocion_productos` en `backend/app/modules/menus/models.py`.
- Agrega la migración de `promociones` y su tabla intermedia.
- Agrega `POST /api/v1/promociones`, `PUT /api/v1/promociones/{id}`,
  `POST /api/v1/promociones/{id}/finalizar` y `GET /api/v1/promociones` (listado de apoyo).
- Valida nombre único, tipo, productos, vigencia, días, franja horaria y campos por tipo, tanto en el
alta como en la modificación.
- Bloquea la modificación de promociones finalizadas o ya aplicadas en una comanda.
- Finaliza una promoción, registra la fecha y hora y conserva intactos los importes históricos.
- Agrega una función de solo lectura en `atencion.service` para consultar si una promoción fue usada.
- Reemplaza el `EmptyState` de la pestaña por un listado y un modal de alta.
- Agrega una prueba por criterio de aceptación, en backend y frontend.

## Fuera de alcance

- Finalizar promociones y `fechaHoraFinalizacion` (HU-M2-09).
- Aplicar la promoción en una venta y calcular el remanente NxM (CA 11). Corresponde a M4.
- Validar superposición de promociones sobre el mismo producto, día y horario: el issue no lo pide.

## Impacto

- Solo módulo M2 y su carpeta de SDD. No toca `shared/`, `main.py`, `alembic/env.py`, M1 ni M4.
- Migración con `downgrade` completo; plan de reversión: `alembic downgrade d6f8a0c2e4b6`.
- Issues que cierra: `Closes #29`, `Closes #30` y `Closes #31`.

## Supuestos

- El listado es el mínimo necesario para ver la promoción creada, igual que en los cambios previos
  de M2.
- «Alfanumérico» se interpreta como texto libre de 1 a 100 caracteres.
- La unicidad usa `normalizar_nombre()` (trim + casefold).
- La descripción es opcional porque figura en el diagrama, aunque no en los «Datos» del issue.
