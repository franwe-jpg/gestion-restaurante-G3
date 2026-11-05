# Verify report: HU-M2-07-08-09 Crear, modificar y finalizar una promoción

## Cobertura de los criterios de aceptación

### Alta (HU-M2-07, #29)

| CA | Evidencia | Estado |
| --- | --- | --- |
| 1. Alta válida y asociación | `test_router_promociones.py::test_crear_promocion_responde_201_y_asocia_productos`; `PromocionesTab.test.tsx` | Cumple |
| 2. Falta un obligatorio | schemas/router 422; `validarPromocion.test.ts` | Cumple |
| 3. Nombre repetido | service/router 409; `errorDelServidor` | Cumple |
| 4. Fecha hasta anterior | schema 422; `validarPromocion.test.ts` | Cumple |
| 5. Hora hasta igual o anterior | schema 422; `validarPromocion.test.ts` | Cumple |
| 6. Sin días | schema 422; `validarPromocion.test.ts` | Cumple |
| 7. Sin productos | schema 422; `validarPromocion.test.ts` | Cumple |
| 8. Porcentaje inválido | schema 422; `validarPromocion.test.ts` | Cumple |
| 9. NxM paga ≥ lleva | schema 422; `validarPromocion.test.ts` | Cumple |
| 10. Campo de otro tipo bloqueado | el formulario solo renderiza el campo activo y limpia al cambiar de tipo; el backend rechaza campos ajenos | Cumple |
| 11. Remanente NxM en la venta | Fuera de M2; corresponde a M4 | No aplica |

### Modificación (HU-M2-08, #30)

| CA | Evidencia | Estado |
| --- | --- | --- |
| 1. Modificar una habilitada sin uso | `test_router_promociones.py::test_modificar_promocion_responde_200`; `PromocionesTab.test.tsx` (edición) | Cumple |
| 2. Bloquear si ya fue aplicada | `test_service_promociones.py` y `test_router_promociones.py` (409); prueba real de `atencion.service.promocion_fue_aplicada` | Cumple |
| 3. Bloquear si está finalizada | service/router 409 | Cumple |
| 4. Borrar un obligatorio | schema 422; `validarPromocion.test.ts` | Cumple |
| 5. Cambiar de tipo | el schema exige el valor nuevo y rechaza los campos del anterior; el formulario limpia al cambiar | Cumple |
| 6. Vigencia inválida | schema 422; `validarPromocion.test.ts` | Cumple |

### Finalización (HU-M2-09, #31)

| CA | Evidencia | Estado |
| --- | --- | --- |
| 1. Finalizar una habilitada | `test_service_promociones.py` y `test_router_promociones.py`; `PromocionesTab.test.tsx` (confirmación) | Cumple |
| 2. Mensaje de confirmación | `useFinalizarPromocion` + `PromocionesTab.test.tsx` | Cumple |
| 3. Ya deshabilitada | 409 en service/router; la fila no ofrece «Finalizar» | Cumple |
| 4. Comandas históricas intactas | `test_finalizar_promocion_no_toca_importes_historicos` | Cumple |
| 5. Fecha y hora exacta | se guarda `fecha_hora_finalizacion` y se muestra en el listado | Cumple |

## Comandos ejecutados

### Backend focalizado

```bash
ruff check .
ruff format --check .
pytest tests/modules/menus tests/modules/atencion/test_service.py -q --no-cov
```

Resultado: **270 passed**, lint y formato en verde.

### Frontend

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
```

Resultado: suite completa en verde, cobertura **76.37 %**, build correcto.

## Limitaciones

- La suite completa del backend queda pendiente para el cierre, antes del PR.
- `dias_semana` se valida en la API y el service; SQLite lo guarda como JSON.
- No se valida superposición de promociones: el issue no lo pide.
- El bloqueo por uso depende de que M4 escriba `DetalleComanda.promocion_id`; hoy la columna existe y
  la lectura está probada, pero la integración de aplicación de promociones sigue siendo de M4.
