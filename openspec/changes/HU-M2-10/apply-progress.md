# Apply progress: HU-M2-10

## Implementado

- Backend:
  - lectura agregada en `atencion.repository` y `atencion.service` (sin `commit`);
  - cálculo puro en `menus.reporte`;
  - schemas, service y endpoint `GET /api/v1/reportes/impacto-promociones`;
  - pruebas de cálculo, estados históricos, comandas anuladas y contrato HTTP.
- Frontend:
  - tipos, cliente de API y validación de filtros;
  - hook, tabla y pantalla del reporte;
  - ruta en `App.tsx` y tarjeta en el catálogo de reportes;
  - pruebas de validación y de la página.

## Decisiones de aplicación

- Los días con promoción se calculan por calendario (vigencia + días de la semana), no por días
  con ventas.
- Con franja horaria, la exposición se mide en horas y los promedios son unidades por hora.
- La métrica principal es la diferencia absoluta y el impacto estimado en unidades.
- La variación porcentual se oculta si la base fuera es menor a 1 unidad/día o 0,10 unidades/hora.
- Sin ventas promocionales, `hay_datos = false` y no se listan líneas.
- El issue #81 se actualizó con los nuevos criterios.

## Verificación ejecutada

- `ruff check .`: OK.
- `ruff format --check .`: OK.
- `lint-imports`: 10 contratos, 0 rotos.
- `npm run lint`: OK.
- `npm run typecheck`: OK.
- Prettier aplicado a los archivos tocados. `npm run format:check` global sigue marcando archivos
  preexistentes por fin de línea; no se reformateó el repositorio entero.
- `pytest` y `npm run test:coverage`: omitidos a pedido de la persona por su duración.

## Pendiente

- Revisión de la persona responsable antes del PR.
- Confirmar en el PR el `Closes #81`.
- Coordinar con M4 el agregado de la lectura pública en `atencion.service`.
