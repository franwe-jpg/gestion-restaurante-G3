# Propuesta: HU-M1-11-12 Modificar y dar de baja una sección

- **Issues:** [#15](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/15) HU-M1-11 Modificar una sección y [#16](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/16) HU-M1-12 Dar de baja una sección. Cambio `HU-M1-11-12`, rama `feature/HU-M1-11-12-modificar-baja-seccion`.
- Un solo cambio para el grupo ABM (AGENTS.md §4). Completa sobre `Seccion` lo que HU-M1-10 dejó en alta y listado.

## Intención

El encargado puede crear secciones, pero no cambiarles el nombre ni el orden, sumarles productos, quitarlas de la carta ni volver a habilitarlas. Las reglas de HU-M1-10 (S1 a S4) y el índice único parcial de orden entre habilitadas ya existen: no hace falta tocar el esquema.

## Alcance

### Incluido

- `GET /api/v1/secciones/{id}`, `PUT /api/v1/secciones/{id}` (`SeccionModificar`) y `POST /api/v1/secciones/{id}/baja`.
- Conteo de productos habilitados por sección en `GET /secciones`, para el aviso de la baja.
- Frontend: acciones «Editar» y «Dar de baja» en `SeccionesTabla`; `SeccionFormDialog` en modo edición (con reactivación); `ConfirmDialog` de la baja con el conteo.
- Una prueba por criterio de aceptación de las dos HU; las pruebas de HU-M1-10 y de productos siguen pasando.

### Excluido

- La carta (HU-M1-14), el reporte (HU-M1-15) y menús (M2).
- Cambios de esquema y migraciones.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `carta-secciones`: se agregan consultar, modificar, agregar o trasladar productos, reactivar y dar de baja una sección; el listado suma el conteo de productos habilitados.

## Enfoque

- **Backend:** `schemas`, `router`, `service` y `repository` de `productos/`. Se reutilizan `_validar_nombre_libre`, `_validar_orden_libre`, `_cargar_productos`, `_validar_habilitados` y `_validar_traslado`, con la propia sección excluida. El índice `ux_secciones_orden_habilitada` respalda el 409 ante carreras.
- **Frontend:** sin rutas nuevas (`App.tsx` no cambia); `api.ts`, `types.ts`, `useFormularioSeccion`, `validarSeccion` y `SelectorProductos` se amplían.

## Supuestos

| # | Supuesto: |
| --- | --- |
| — | Rigen S1 a S4 y S21. El último usado es S57; se sigue desde S58. |
| S58 | `GET /secciones/{id}` → 200 `SeccionSalida` o 404. `PUT` → 200, 404, 409 o 422. `POST /secciones/{id}/baja` sin cuerpo → 200, 404 o 409. |
| S59 | `SeccionModificar`: `nombre` y `orden` obligatorios (reemplazo), `producto_ids`, `confirmar_traslado` y `estado` opcional (ausente conserva el actual). |
| S60 | Nombre y orden se validan excluyendo la propia sección; el orden solo se valida si la sección queda habilitada. |
| S61 | Una sección deshabilitada puede repetir el orden de otra. Reactivarla con su orden ocupado por una habilitada → 409 «posición ocupada»; se corrige cambiando el orden en el mismo guardado. |
| S62 | `producto_ids` es aditivo: un producto ausente no se quita y uno que ya está en la sección se ignora. La API no permite quitar productos (CA 4). En el diálogo, los productos actuales quedan marcados; al intentar desmarcarlos se avisa «Todo producto debe pertenecer a una sección; para quitarlo, agréguelo a otra sección». |
| S63 | La confirmación de traslado (CA 8 de HU-M1-10) aplica solo a productos de otras secciones (CA 5). El selector ofrece solo productos habilitados (CA 6). |
| S64 | Agregar productos a una sección que queda deshabilitada → 409, igual que el alta y la edición de productos. |
| S65 | La baja cambia solo el `estado` de la sección; sus productos conservan estado y sección (CA 3). Baja de una ya deshabilitada → 409. |
| S66 | El aviso cuenta los productos habilitados de la sección; sin productos habilitados, el diálogo lo indica sin conteo. |
| S67 | El diálogo de edición de una sección deshabilitada ofrece habilitarla; la baja solo se hace desde la fila, con su aviso. El `PUT` acepta `DESHABILITADO`, como en productos, pero el frontend no lo envía. |
| S68 | Sin HU-M1-14, «la carta» se verifica con el estado de la sección. Los selectores de sección de productos ya listan solo habilitadas; los productos de una sección deshabilitada siguen en `GET /productos` para poder trasladarlos. |

## Ronda de preguntas de la propuesta

Ritmo automático: se avanza con los supuestos.

1. ¿Reactivar con el orden ocupado debe rechazarse (S61) o asignar el siguiente libre?
2. ¿Alcanza con quitar un producto agregándolo a otra sección (S62), o el diálogo debería permitir elegir su nueva sección ahí mismo?
3. ¿El aviso de la baja cuenta solo los productos habilitados (S66)?

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,router,service,repository}.py`, `backend/tests/modules/productos/` | Modificado |
| `frontend/src/modules/productos/` (`api.ts`, `types.ts`, componentes de secciones y pruebas) | Modificado |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| La exclusión de la propia sección falla y renombrar o reordenar responde 409. | Media | Pruebas de guardar sin cambios y de cambiar solo la capitalización. |
| El frontend se acerca al punto de control de 800 líneas. | Media | Reutilizar el diálogo y el selector; es un punto de control, no un bloqueo. |
| Delta sobre la spec de los PR #182 y #183 sin integrar. | Baja | Integrarlos antes. |

## Plan de reversión

Sin cambios de esquema ni migraciones. Revertir el merge en `develop`; las secciones modificadas o deshabilitadas quedan con sus datos válidos.

## Dependencias

- PR #182 y PR #183 integrados en `develop`.

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M1-11 y HU-M1-12 tiene una prueba que pasa.
- [ ] Las pruebas de HU-M1-10 y de productos siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S58 a S68.
