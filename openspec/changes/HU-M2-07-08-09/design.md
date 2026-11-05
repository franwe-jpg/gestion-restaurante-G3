# Diseño: HU-M2-07-08-09 Crear, modificar y finalizar una promoción

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
| --- | --- | --- | --- |
| P-01 | `TipoPromocion` y `DiaSemana` viven en `menus/models.py`. | Moverlos a `shared/models/enums.py`. | Solo M2 los usa en este cambio; evita tocar `shared/` y coordinar con otros módulos. |
| P-02 | `productos` es una relación muchos-a-muchos con `promocion_productos`. | Guardar `producto_ids` en JSON. | El diagrama define la asociación con `Producto`; la tabla intermedia mantiene integridad referencial. |
| P-03 | `dias_semana` se guarda como JSON de strings. | Tabla `promocion_dias`. | Es una lista corta y cerrada; sigue el patrón de `Producto.etiquetas`. La API valida contenido y no vacío. |
| P-04 | Los campos por tipo son excluyentes y se validan en schema y en `CHECK`. | Aceptar campos de más y limpiarlos en el service. | Evita datos inconsistentes y permite que la base también los rechace. |
| P-05 | El nombre se normaliza con `normalizar_nombre()` y se protege con índice único. | `UNIQUE` sobre `nombre`. | El criterio del proyecto ignora mayúsculas, tildes y espacios de borde. |
| P-06 | `GET /promociones` entra como listado de apoyo. | Solo `POST`. | Sin listado la pantalla no puede mostrar lo creado; es el mínimo del sprint. |
| P-07 | No se agrega `fecha_hora_finalizacion`. | Incluirla ahora. | HU-M2-09 la necesita con un tipo de instante acordado; este cambio no la usa. |
| P-08 | El listado no valida superposiciones. | Rechazar promociones solapadas. | El issue no lo pide; agregarlo sería inventar una regla. |
| P-09 | La modificación es un reemplazo completo (`PUT`) y no acepta `estado`. | `PATCH` parcial o permitir reactivar. | HU-M2-08 no define campos parciales ni reactivación; el estado lo cambia HU-M2-09. |
| P-10 | M2 consulta `atencion.service.promocion_fue_aplicada` para saber si la promoción se usó. | Leer `detalles_comanda` desde M2 o no validar el uso. | El contrato permite importar el `service` de otro módulo; leer su tabla directamente acoplaría el esquema. |
| P-11 | Finalizar actualiza solo `estado` y `fecha_hora_finalizacion`. | Recalcular o borrar comandas. | M4 guarda snapshots históricos; M2 no debe tocarlos (CA 4). |
| P-12 | `fecha_hora_finalizacion` es `DateTime(timezone=True)` nullable. | `String` ISO o `InstanteUTC` compartido. | No hace falta mover un tipo de M4 a `shared`; la columna se agrega con una migración propia. |

## Modelo

`promociones`: `id`, `nombre`, `nombre_normalizado`, `tipo`, `descripcion`, `fecha_desde`,
`fecha_hasta`, `dias_semana` (JSON), `hora_desde`, `hora_hasta`, `descuento_porcentaje`,
`precio_fijo`, `cant_lleva`, `cant_paga`, `estado`.

Restricciones:
- `ux_promociones_nombre_normalizado` único.
- `ck_promociones_fechas`: `fecha_hasta >= fecha_desde`.
- `ck_promociones_horario`: ambas nulas o ambas con `hora_hasta > hora_desde`.
- `ck_promociones_porcentaje`, `ck_promociones_precio_fijo`, `ck_promociones_nxm`: solo el campo
  del tipo, con sus rangos.

`promocion_productos`: `promocion_id` (CASCADE), `producto_id` (RESTRICT), PK compuesta.

## Capas

- `router`: `POST /promociones`, `PUT /promociones/{id}`, `POST /promociones/{id}/finalizar` y
  `GET /promociones`; solo delega.
- `service`: valida nombre libre, productos habilitados, estado finalizado y uso en comandas; arma la
  entidad; finaliza registrando el instante; convierte `IntegrityError` en `409`; arma las salidas.
- `repository`: `existe_nombre_normalizado`, `obtener_productos`, `agregar`, `listar`.
- `schemas`: `PromocionCrear` y `PromocionModificar` con `model_validator` para fechas, horario y
tipo; salidas y filtro.

## Pruebas

- `test_schemas_promociones.py`: cada regla de forma.
- `test_service_promociones.py`: alta por tipo, unicidad, productos, atomicidad y listado.
- `test_router_promociones.py`: contrato HTTP y un caso por criterio de aceptación (alta,
  modificación y finalización).
- `test_migracion_finalizacion_promociones.py`: columna de finalización y `downgrade`.
- `atencion/test_service.py`: lectura real de `DetalleComanda.promocion_id` para el bloqueo de uso.
- `test_migracion_promociones.py`: tablas, columnas, índice, FKs, checks y downgrade.
- `test_modelo_promocion.py`: normalización del nombre.
- Frontend: `validarPromocion.test.ts`, `PromocionesTab.test.tsx`, `FormularioPromocion.test.tsx`
  y `api.test.ts`.

## Aislamiento

Todo el cambio queda en `backend/app/modules/menus/`, `backend/tests/modules/menus/`,
`frontend/src/modules/menus/` y `openspec/changes/HU-M2-07/`.
