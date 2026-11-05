# Tareas: HU-M2-07-08-09 Crear, modificar y finalizar una promoción

- **Issues:** [#29](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/29) (crear),
  [#30](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/30) (modificar) y
  [#31](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/31) (finalizar). **Épica:**
  [#28](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/28). **Rama:**
  `feature/HU-M2-07-08-09-promociones`. **Un solo PR** hacia `develop` con los tres `Closes`.
- **Strict TDD:** cada tarea de código va en orden Rojo → Verde → Refactor.
- **Unidad de trabajo:** backend y frontend en commits separados; cada commit deja el repositorio
  verde y lleva su código, sus pruebas y su documentación.
- **Aislamiento:** solo `backend/app/modules/menus/`, `backend/tests/modules/menus/`,
  `frontend/src/modules/menus/` y `openspec/changes/HU-M2-07/`.
- **Presupuesto de revisión:** ~600 líneas backend y ~750 frontend (informativo; no divide el PR).

## Fase 1 · Backend: modelo y migración

- [x] 1.1 Rojo: `test_modelo_promocion.py` y `test_migracion_promociones.py`.
- [x] 1.2 Verde: enums, `Promocion`, `promocion_productos` y migración.
- [x] 1.3 Refactor y `pytest tests/modules/menus --no-cov`.

## Fase 2 · Backend: schemas

- [x] 2.1 Rojo: `test_schemas_promociones.py` con un caso por regla.
- [x] 2.2 Verde: `PromocionCrear`, salidas, filtro y validadores.
- [x] 2.3 Refactor.

## Fase 3 · Backend: service y router

- [x] 3.1 Rojo: `test_service_promociones.py`.
- [x] 3.2 Verde: repository, service, `IntegrityError` → 409.
- [x] 3.3 Rojo: `test_router_promociones.py`.
- [x] 3.4 Verde: `POST /promociones` y `GET /promociones`.
- [x] 3.5 Verificación focalizada con `V-BACK`.

## Fase 4 · Frontend: datos y validación

- [x] 4.1 Rojo: `validarPromocion.test.ts` y `api.test.ts`.
- [x] 4.2 Verde: tipos, API, validador y hook del formulario.
- [x] 4.3 Refactor.

## Fase 5 · Frontend: pantalla

- [x] 5.1 Rojo: `PromocionesTab.test.tsx`.
- [x] 5.2 Verde: pestaña, barra, listado, modal, formulario y selector de días.
- [x] 5.3 Verificación `V-FRONT` y build.

## Fase 6 · Modificación

- [x] 6.1 Rojo: casos de modificación en `test_service_promociones.py` y `test_router_promociones.py`.
- [x] 6.2 Rojo/Verde: `atencion.service.promocion_fue_aplicada` y su prueba.
- [x] 6.3 Verde: `PromocionModificar`, `PUT /promociones/{id}` y bloqueos por estado/uso.
- [x] 6.4 Rojo/Verde frontend: edición en el modal, botón por fila y pruebas de edición.

## Fase 7 · Finalización

- [x] 7.1 Rojo: `test_service_promociones.py` y `test_router_promociones.py` de finalización.
- [x] 7.2 Verde: columna `fecha_hora_finalizacion`, migración y `finalizar_promocion`.
- [x] 7.3 Rojo/Verde frontend: confirmación, acción por fila y columna de finalización.

## Fase 8 · Cierre

- [ ] 8.1 Correr la suite completa del backend una vez antes del PR.
- [ ] 8.2 Crear los commits y el PR a `develop` con `Closes #29`, `Closes #30` y `Closes #31`.
- [ ] 8.3 Revisión de otro integrante y CI en verde.
- [ ] 8.4 Mover la tarjeta a «En Testing».
