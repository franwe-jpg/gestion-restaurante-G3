# Propuesta: HU-M1-07-08-09 Crear, modificar y dar de baja una bebida

- **Issues:** [#10](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/10) HU-M1-07 Crear una bebida, [#11](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/11) HU-M1-08 Modificar una bebida y [#12](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/12) HU-M1-09 Dar de baja una bebida. Cambio `HU-M1-07-08-09`, rama `feature/HU-M1-07-08-09-bebida`.
- Un solo cambio para el grupo ABM (AGENTS.md §4). Repite para bebidas lo que HU-M1-04 y HU-M1-05-06 hicieron para postres.

## Intención

El encargado no puede cargar bebidas: no hay ruta, formulario ni acciones, y sus filas de la lista no tienen «Editar» ni «Dar de baja» (S27). El `service` ya es genérico por categoría (E5) y el frontend está parametrizado por configuración (C3, F3). La única regla propia es que los ingredientes son opcionales (diagrama: «≥1 salvo BEBIDA»).

## Alcance

### Incluido

- `BebidaCrear` y `BebidaModificar` (categoría `BEBIDA`, ingredientes opcionales) y las rutas `POST /api/v1/bebidas`, `GET` y `PUT /api/v1/bebidas/{id}` y `POST /api/v1/bebidas/{id}/baja`, sobre el `service` sin cambios.
- Frontend: `BEBIDA` en `CategoriaAlta`, `CONFIGURACIONES` (`ingredientesObligatorios: false`), `CONFIGURACIONES_EDICION` y `SEGMENTOS_RUTA`; rutas de alta y edición; botón «Nueva bebida»; acciones en las filas de bebidas.
- Una prueba por criterio de aceptación de las tres HU; las pruebas de platos, postres y la lista siguen pasando.

### Excluido

- Secciones (HU-M1-11 y HU-M1-12), la carta (HU-M1-14), el reporte (HU-M1-15) y menús (M2, `MENU_DEL_DIA`).
- Cambios de esquema: `BEBIDA` ya existe en el enum y el índice (`categoria`, `nombre_normalizado`) separa categorías.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `carta-productos`: se agregan crear, consultar, modificar, reactivar y dar de baja una bebida; el requisito «Enlace de editar en platos y postres» pasa a todas las categorías del alta, y la regresión «bebida sin acciones» deja de regir.

## Enfoque

- **Backend:** solo `schemas.py` y `router.py`. `BebidaCrear` conserva el `ingredientes` opcional de `ProductoCrear` (sin `min_length`). Un id de otra categoría responde 404 (E5, S34).
- **Frontend:** ampliar tipos y configuraciones; `ProductoNuevoPage`, `ProductoEditarPage`, `useEdicionProducto`, `useBajaProducto` y `validarProducto` se reutilizan sin lógica nueva.

## Supuestos

| # | Supuesto: |
| --- | --- |
| — | Rigen para bebidas S1 a S12, S14, S15, S18 a S25, S29 y S34. El último usado es S41 (diseño de HU-M1-05-06); se sigue desde S42. |
| S42 | Los criterios de #11 y #12 son los de #7 y #8 con «bebida»; los de #10 son los de #6 salvo ingredientes opcionales. |
| S43 | Mensaje de nombre repetido: «La bebida ya está registrada», análogo a S13 (el issue dice «ya se encuentra registrada»). |
| S44 | Los ingredientes son opcionales en el alta y en la modificación; una lista vacía es válida y reemplaza a la actual. |
| S45 | Rutas `/productos/bebidas/nuevo` y `/productos/bebidas/:id/editar`. Las filas de bebidas ofrecen «Editar» y, si están habilitadas, «Dar de baja»; S27 deja de regir. |
| S46 | Textos en femenino, análogos a los del postre: «Nueva bebida», «Guardar bebida», «Bebida creada», «Editar bebida», «Bebida modificada», «Bebida dada de baja», «La bebida no existe.», «Cargando bebida...» y «La bebida quedará deshabilitada…». |

## Ronda de preguntas de la propuesta

Ritmo automático: se avanza con los supuestos.

1. ¿El mensaje de nombre repetido sigue el patrón de platos y postres (S43) o el texto literal del issue?
2. ¿Dar de baja una bebida incluida en un menú vigente (M2) debería advertirse? (S20; validar con M2)

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,router}.py`, `backend/tests/modules/productos/` | Modificado |
| `frontend/src/modules/productos/` (`categorias.ts`, `components/ProductosTab.tsx` y pruebas) | Modificado |
| `frontend/src/App.tsx` (compartido, avisar §9.3) | Modificado (dos rutas) |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| El formulario marca ingredientes como obligatorios para bebidas. | Media | Prueba del alta sin ingredientes en ambos lados. |
| Ampliar los tipos rompe platos o postres. | Baja | Mantener verdes sus pruebas. |
| Delta sobre la spec consolidada del PR #182 sin integrar. | Baja | Integrar el PR #182 antes. |

## Plan de reversión

Sin cambios de esquema ni migraciones. Revertir el merge en `develop`; las bebidas creadas quedan como filas `BEBIDA` sin rutas.

## Dependencias

- PR #182 (archivo de los cambios de M1 y spec consolidada) integrado en `develop`.

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M1-07, HU-M1-08 y HU-M1-09 tiene una prueba que pasa.
- [ ] Las pruebas de platos, postres y la lista siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S42 a S46.
