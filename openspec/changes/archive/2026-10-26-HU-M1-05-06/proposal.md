# Propuesta: HU-M1-05-06 Modificar y dar de baja un postre

- **Issues:** [#7](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/7) HU-M1-05 Modificar un postre y [#8](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/8) HU-M1-06 Dar de baja un postre. Cambio `HU-M1-05-06`, rama `feature/HU-M1-05-06-modificar-baja-postre`.
- Un solo cambio para las dos HU (regla de agrupación de ABM del PR #179). Repite para postres lo que HU-M1-02-03-13 hizo para platos.

## Intención

Un postre hoy solo se puede crear: el encargado no puede corregir su precio, ingredientes o foto, ni sacarlo de la oferta, y su fila de la lista no tiene acciones (S27). El backend ya es genérico por categoría (E5) y el frontend de edición está parametrizado, pero limitado a `PLATO` (E10, E21). Este cambio habilita postres sobre esa base, sin duplicar código.

## Alcance

### Incluido

- `PostreModificar` y las rutas `GET` y `PUT /api/v1/postres/{id}` y `POST /api/v1/postres/{id}/baja`, sobre `service.obtener_producto`, `modificar_producto` y `dar_de_baja_producto` sin cambios.
- Frontend: `CategoriaEdicion` incluye `POSTRE`, `CONFIGURACIONES_EDICION.POSTRE`, ruta `/productos/postres/:id/editar` y acciones «Editar» y «Dar de baja» en las filas de postres (el enlace deja de estar fijo a `/platos`).
- Una prueba por criterio de aceptación de las dos HU; las pruebas de platos siguen pasando.

### Excluido

- Bebidas (HU-M1-07 a HU-M1-09): sus filas siguen sin acciones. Secciones (HU-M1-11 y HU-M1-12) y la carta (HU-M1-14).
- Cambios de esquema, de la lista (HU-M1-13) y de otros módulos.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `carta-productos` (deltas de HU-M1-01, HU-M1-04 y HU-M1-02-03-13, aún sin archivar): se agregan consultar, modificar, reactivar y dar de baja un postre; el requisito «Enlace de editar solo en platos» pasa a incluir postres.

## Enfoque

- **Backend:** solo `schemas.py` y `router.py`, mismo patrón que platos. Un id que no es un postre responde 404 (E5).
- **Frontend:** ampliar el tipo y la configuración de edición; derivar la ruta de edición de la categoría. `ProductoEditarPage`, `useEdicionProducto` y `useBajaProducto` se reutilizan sin lógica nueva.

## Supuestos

| # | Supuesto: |
| --- | --- |
| — | Rigen para postres S15, S18 a S25 (facturas, sección, baja sin bloqueos, 409 si ya está deshabilitado, imagen, textos neutros) y S13 (nombre repetido). S29 ya está usado; se sigue desde S30. |
| S30 | Comprobado contra el texto de los issues: los criterios de #7 y #8 son los de HU-M1-02 (#3) y HU-M1-03 (#4) con «postre» en lugar de «plato» y las referencias a HU-M1-04 y HU-M1-05. No hay reglas propias de postres. |
| S31 | Edición en `/productos/postres/:id/editar`, a la que se llega desde la fila. Las filas de postres ofrecen «Editar» y, si están habilitados, «Dar de baja»; S27 deja de regir para postres. |
| S32 | Textos análogos a los del plato: «Editar postre», «Postre modificado», «Postre dado de baja», «El postre no existe.» y la descripción de la baja con «El postre quedará deshabilitado…». |

## Ronda de preguntas de la propuesta

Ritmo automático: se avanza con los supuestos.

1. ¿Dar de baja un postre incluido en un menú vigente (M2) debería advertirse? (S20; validar con M2)

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,router}.py`, `backend/tests/modules/productos/` | Modificado |
| `frontend/src/modules/productos/` (`categorias.ts`, `components/AccionesProducto.tsx` y pruebas) | Modificado |
| `frontend/src/App.tsx` (compartido, avisar §9.3) | Modificado (una ruta) |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Ampliar `CategoriaEdicion` rompe la edición de platos. | Baja | Mantener verdes sus pruebas. |
| Delta sobre specs sin archivar. | Baja | Archivar HU-M1-01, HU-M1-04 y HU-M1-02-03-13 antes. |

## Plan de reversión

Sin cambios de esquema ni migraciones. Revertir el merge en `develop`; los postres dados de baja conservan sus datos.

## Dependencias

- HU-M1-02-03-13 integrada en `develop` (PR #180).

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M1-05 y HU-M1-06 tiene una prueba que pasa.
- [ ] Las pruebas de platos, del alta de postres y de la lista siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S30 a S32.
