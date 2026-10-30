# Propuesta: HU-M1-04 Crear un postre

- **Issue:** [#6](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/6). Tarea madre: #165. Rama: `feature/HU-M1-04-crear-postre` (apilada sobre `feature/HU-M1-01-crear-plato`, PR #177).

## Intención

El encargado puede dar de alta platos, pero no postres. La HU es idéntica a HU-M1-01 salvo la categoría: mismos datos, mismos 14 criterios de aceptación y mismos límites. El backend ya es genérico; el frontend está atado a «plato» y hay que generalizarlo para no duplicarlo (y dejarlo listo para bebidas, HU-M1-07).

## Alcance

### Incluido

- `PostreCrear` (categoría `POSTRE`, ingredientes obligatorios) y `POST /api/v1/postres` (201, multipart) sobre `service.crear_producto`.
- Frontend: página, `hook` y validador de alta parametrizados por categoría; ruta propia para postres y botón «Nuevo postre» junto a «Nuevo plato».
- Una prueba por criterio de aceptación; las pruebas de platos siguen pasando.

### Excluido

- Bebidas (HU-M1-07), listar, modificar, deshabilitar productos y la carta.
- Cambios de esquema: el índice único (`categoria`, `nombre_normalizado`) ya separa postres de platos.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `carta-productos` (introducida por HU-M1-01, aún sin archivar): se agrega el alta de postres con las mismas reglas.

## Decisiones tomadas

- **D1.** Se reutilizan las decisiones D1 a D5 y los supuestos S1 a S12 de HU-M1-01, aplicados a postres.
- **D2. Formulario por categoría.** Una sola página, `hook` y validador parametrizados por una configuración de categoría: título, migas, endpoint, mensaje de nombre repetido y si los ingredientes son obligatorios (en bebidas serán opcionales). Rutas por categoría (por ejemplo, `/productos/platos/nuevo` y `/productos/postres/nuevo`); `/productos/nuevo` sigue funcionando o redirige. Los nombres los fija el diseño.

## Enfoque

Backend: solo `schemas.py` y `router.py`, mismo patrón que platos. Frontend: refactor del código de HU-M1-01 dentro de `productos/` (mismo responsable) y alta de postres sobre esa base.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S13 | Mensaje de nombre repetido: «El postre ya está registrado», análogo al de platos. |
| S14 | Un plato y un postre pueden llamarse igual (la unicidad es por categoría). |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,router}.py`, `backend/tests/modules/productos/` | Modificado |
| `frontend/src/modules/productos/*` | Modificado (refactor y alta) |
| `frontend/src/App.tsx` (compartido, avisar §9.3) | Modificado (rutas) |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El refactor rompe el alta de platos. | Mantener verdes las pruebas existentes; adaptarlas solo por nombres o rutas. |
| Rama apilada: cambios pedidos en el PR #177 obligan a rebasar. | Rebasar sobre `develop` cuando se integre HU-M1-01. |
| Delta sobre una spec aún no archivada. | Archivar HU-M1-01 antes que HU-M1-04. |

## Plan de reversión

Sin cambios de esquema. Revertir el merge en `develop`; platos vuelve al código de HU-M1-01.

## Dependencias

- HU-M1-01 integrada (PR #177).

## Criterios de éxito

- [ ] Cada criterio de aceptación tiene una prueba que pasa.
- [ ] Las pruebas de platos siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S13 y S14.
