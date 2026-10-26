# Propuesta: HU-M1-02-03-13 Modificar, dar de baja y listar productos

- **Issues:** [#3](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/3) HU-M1-02 Modificar un plato, [#4](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/4) HU-M1-03 Dar de baja un plato y [#18](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/18) HU-M1-13 Listar los productos. Cambio `HU-M1-02-03-13`; la rama sigue siendo `feature/HU-M1-02-03-modificar-baja-plato` porque el PR #180 ya está abierto.
- Un solo cambio para las tres HU (regla de agrupación de ABM y listado del PR #179). En sentido estricto, HU-M1-13 lista más de una entidad (incluye el menú del día de M2); el responsable de M1 aprobó incluirla en forma explícita.
- HU-M1-02 y HU-M1-03 ya están implementadas y verificadas (commits `90f9de7` a `db08090`). Esta enmienda solo agrega HU-M1-13.

## Intención

Hoy un plato solo se puede crear. Si cambia el precio, un ingrediente o la foto, o si el plato sale de la oferta, el encargado no tiene cómo reflejarlo. Esta HU agrega la modificación (incluida la reactivación) y la baja lógica, reutilizando las reglas y el formulario del alta (HU-M1-01).

Además, la pestaña «Productos» muestra solo los botones de alta y un `EmptyState` de «pendiente»: nadie puede consultar qué se ofrece, ni llegar a la edición sin escribir la URL. HU-M1-13 agrega la lista para que el mozo consulte los productos y su estado.

## Alcance

### Incluido

- Consultar un plato por id, para cargar el formulario de edición.
- Modificar todos los datos del alta, la imagen (mantener, reemplazar o quitar) y el estado, con las mismas validaciones que HU-M1-01.
- Dar de baja con confirmación: el plato pasa a `DESHABILITADO`, se conservan sus datos y sale de `GET /api/v1/productos`.
- Frontend: pantalla de edición en ruta propia, que reutiliza página, `hook` y validador del alta en modo edición, y el botón «Dar de baja» con `ConfirmDialog`.
- **HU-M1-13:** lista de productos en la pestaña «Productos» de `ProductosPage.tsx`, que reemplaza el `EmptyState` de «pendiente» y conserva los botones «Nuevo plato» y «Nuevo postre». Cada fila muestra nombre, categoría, precio, etiquetas y estado.
- Filtro de estado Habilitados / Deshabilitados / Todos, con Habilitados por defecto; mensaje de lista vacía para el filtro elegido; paginación (D-27, `backend/app/shared/paginacion.py`).
- Enlace desde cada fila de plato a `/productos/platos/:id/editar`.
- Una prueba por criterio de aceptación de las tres HU.

### Excluido

- Menús del día en la lista (entidad `MenuDelDia` de M2, aún sin implementar; S26). No se toca M2.
- Editar postres y bebidas desde la lista (HU-M1-05 y HU-M1-08; S27). Modificar o dar de baja postres y bebidas, y la vista de la carta (HU-M1-14).
- Búsqueda por texto o filtro por categoría (la HU solo pide el filtro de estado).
- Facturas y reportes (M6, Héctor). Cambios de esquema: la columna `estado` ya existe.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `carta-productos` (de HU-M1-01 y HU-M1-04, aún sin archivar): se agregan consultar, modificar, dar de baja y reactivar un plato, y listar los productos con filtro de estado. El requisito del CA 4 de HU-M1-03 pasa a incluir el filtro por Deshabilitados.

## Enfoque

- **Backend:** `GET` y `PUT /api/v1/platos/{id}` (multipart, como el alta) y una operación de baja con `POST` sobre el subrecurso `/baja` (D-24). `service.modificar_producto` comparte con el alta la validación de sección, la unicidad (excluyendo el propio plato) y el manejo de imágenes. Un id que no es un plato responde 404.
- **Frontend:** `ProductoNuevoPage`, `useFormularioProducto` y `validarProducto` aceptan un plato inicial; el estado pasa a ser editable solo en edición. `shared/api/client.ts` necesita `PUT` multipart (archivo compartido, avisar §9.3); la baja reutiliza `post`.
- **Lista (HU-M1-13), restricción de diseño:** `GET /api/v1/productos` (`service.listar_productos` → `repository.listar_productos_habilitados`) hoy devuelve `Pagina[ProductoSeleccionable]` solo con habilitados, y lo consume el selector de `SeccionesTab` (`listarProductosHabilitados` en `api.ts`). Sin parámetros, esa respuesta DEBE seguir igual. El diseño elige entre extender la ruta con un filtro `estado` y un `schema` más rico, o agregar una ruta nueva.
- **Lista, frontend:** un componente de lista y su `hook` en `productos/components/`, con función propia en `api.ts`; reutiliza los componentes compartidos (`data-table`, `status-badge`, `pagination`, `EmptyState`).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S15 | Los estados Habilitado y Deshabilitado de las HU son `HABILITADO` y `DESHABILITADO` del código. |
| S16 | La pantalla de edición vive en `/productos/platos/:id/editar` y se llega desde la fila del plato en la lista (HU-M1-13, incluida en este cambio). La URL directa sigue funcionando. |
| S17 | CA 4 de HU-M1-03: queda cubierto por completo. El plato dado de baja aparece con el filtro Deshabilitados y se reactiva desde el formulario de modificación al que lleva la lista. |
| S18 | CA 4 de HU-M1-02 y CA 3 de HU-M1-03: `Factura` no existe en el código (`pagos/models.py` está vacío). El diagrama define `precioUnitario {copia al emitir}`, así que M6 copia el precio; aquí se prueba que modificar o dar de baja no borra ni altera filas existentes. |
| S19 | La sección se valida habilitada solo si cambia. Un plato puede reactivarse en una sección deshabilitada; no aparece en la carta hasta que la sección se habilite (CA 5). |
| S20 | La baja no se bloquea por menús (M2) ni comandas (M4); cada módulo decide cómo trata un producto deshabilitado. |
| S21 | Dar de baja un plato ya deshabilitado responde 409. |
| S22 | Al reemplazar o quitar la imagen, el archivo anterior se borra después del `commit`. Sin control de concurrencia: gana la última modificación. |
| S23 | Los textos de la pantalla se escriben en español neutro, sin el voseo de la maqueta («Puede volver a habilitarlo»). |
| S26 | «Menú del día» (CA 1 de HU-M1-13) es `MenuDelDia`, entidad de M2 aún sin implementar. La lista muestra las categorías guardadas en `productos` (`PLATO`, `POSTRE`, `BEBIDA`). Los menús del día se suman cuando M2 los exponga por su `service` (contrato entre módulos, D-03 y S0-05 §3.3). No se toca M2. |
| S27 | La acción de editar se ofrece solo en las filas de platos; postres y bebidas la reciben con HU-M1-05 y HU-M1-08. |
| S28 | Si las filas ofrecen también «Dar de baja» (la maqueta `SPRINT-2/S2-04-maqueta/productos.html` la ubica ahí, E13) lo decide el diseño. Se prefiere incluirla si reutiliza `useBajaProducto` con poco costo, porque elimina la diferencia con la maqueta. |

## Ronda de preguntas de la propuesta

Preguntas para que la persona valide (ritmo automático: se avanza con los supuestos):

1. ¿Dar de baja un plato que forma parte de un menú vigente (M2) debería advertirse o bloquearse? (S20; validar con el responsable de M2)
2. ¿Se acepta el CA 1 de HU-M1-13 como cumplido con platos, postres y bebidas mientras M2 no exponga los menús del día? (S26; validar con el equipo)
3. ¿La fila de la lista debe ofrecer «Dar de baja», o alcanza con el botón de la pantalla de edición? (S28)

Resueltas: S19 sale del CA 5 de HU-M1-02 («vuelve a aparecer en la carta si su sección está habilitada»). S16 y S17 cambian porque HU-M1-13 es del responsable de M1 y se suma a este cambio.

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,service,repository,router}.py`, `backend/tests/modules/productos/` | Modificado (lista con filtro de estado) |
| `frontend/src/modules/productos/*`: `pages/ProductosPage.tsx`, `api.ts`, `types.ts` y `components/` (lista y su `hook`) | Modificado / Nuevo |
| Compartidos (avisar §9.3): `frontend/src/shared/api/client.ts`, `frontend/src/App.tsx` | Modificado (sin cambios nuevos previstos para HU-M1-13) |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| El modo edición rompe el alta de platos y postres. | Media | Mantener verdes las pruebas existentes. |
| La lista rompe el selector de `SeccionesTab` o los escenarios que usan `GET /api/v1/productos`. | Media | Sin parámetros, la respuesta no cambia; mantener sus pruebas verdes. |
| CA 1 de HU-M1-13 queda parcial sin menús del día. | Media | S26 explícito; validarlo con el equipo y con M2. |
| El PR ya supera el punto de control de 800 líneas por lado y crece con la lista. | Alta | Informativo; un solo PR, nunca se divide. |
| M2, M4 o M6 esperan otra semántica de la baja. | Media | Avisar a los responsables con S18 y S20. |
| Delta sobre una spec sin archivar. | Baja | Archivar HU-M1-01 y HU-M1-04 antes. |

## Plan de reversión

Sin cambios de esquema ni migraciones. Revertir el merge en `develop`; los platos dados de baja conservan sus datos y se reactivan cambiando `estado`. La lista es de solo lectura.

## Dependencias

- HU-M1-01 y HU-M1-04 integradas en `develop`.

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M1-02 y HU-M1-03 tiene una prueba que pasa, incluido el CA 4 de HU-M1-03 completo (filtro Deshabilitados y reactivación).
- [ ] Cada uno de los 6 criterios de HU-M1-13 tiene una prueba que pasa (CA 1 con las categorías de M1, S26).
- [ ] Las pruebas del alta de platos y postres y las del selector de `SeccionesTab` siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S15 a S28.
- [ ] Tamaño (informativo): el PR ya supera las 800 líneas por lado; la nota del PR informa el total final.
