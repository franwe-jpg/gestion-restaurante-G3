# Propuesta: HU-M1-14 Ver la carta

- **Issue:** [#19](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/19) HU-M1-14 Ver la carta. Cambio `HU-M1-14`, rama `feature/HU-M1-14-ver-carta`.
- «Como mozo, quiero ver la carta para mostrarla al cliente.» Cinco criterios de aceptación: carta por secciones en orden (CA 1), filtro inicial Habilitados (CA 2), secciones vacías ocultas (CA 3), filtros Deshabilitados (CA 4) y Todos (CA 5).

## Intención

Las secciones y los productos ya se administran (HU-M1-01 a HU-M1-13), pero no hay una vista que los muestre como carta: agrupados por sección, en su orden y con nombre, precio, descripción, imagen y etiquetas. El mozo no tiene qué mostrarle al cliente.

## Alcance

### Incluido

- `GET /api/v1/carta?estado&limit&offset`: secciones en orden con sus productos anidados, de solo lectura.
- Frontend: página `CartaPage` en `/productos/carta`, botón «Ver carta» en el encabezado de Productos y Carta, filtro de estado, navegación por secciones y tarjeta de producto guiadas por la maqueta (`carta.html`).
- Una prueba por criterio de aceptación en cada lado; las pruebas existentes siguen pasando.

### Excluido

- Menús del día y ejecutivos (M2), hasta que M2 los exponga por su `service` (S26).
- La carta pública para el cliente en su celular (la maqueta la marca como supuesto), el reporte (HU-M1-15), autenticación y roles.
- Cambios de esquema, migraciones y cambios en `GET /productos` y `GET /secciones`.

## Capacidades

### Nuevas

- `carta-vista`: consulta de la carta agrupada por sección con filtro de estado, y la pantalla que la muestra.

### Modificadas

- Ninguna.

## Enfoque

- **Backend:** `schemas`, `router`, `service` y `repository` de `productos/`. Una consulta de secciones paginada y una de sus productos (sin N+1), filtradas según S82 a S84. Se reutiliza `FiltroEstadoProducto` (E15).
- **Frontend:** `api.ts` y `types.ts` se amplían; las opciones del filtro salen de `filtrosEstado.ts`; se reutilizan `PageHeader` (prop `acciones`) y los componentes de `shared/components/`. Se agrega una ruta en `App.tsx` (archivo compartido, §9.3).

## Supuestos

| # | Supuesto: |
| --- | --- |
| — | El último usado es S78; se sigue desde S79. |
| S79 | `GET /carta` → 200 `Pagina[SeccionCarta]`; `estado` acepta `HABILITADO` (por defecto), `DESHABILITADO` o `TODOS`; otro valor o paginación inválida → 422. |
| S80 | Se pagina por sección (D-27: `limit` 50 por defecto, máximo 100); los productos van anidados sin paginar, acotados por el volumen de S2-02 (500 productos). El frontend pide páginas de 100 hasta completar `total`. |
| S81 | `SeccionCarta`: `id`, `nombre`, `orden`, `estado`, `productos`. `ProductoCarta`: `id`, `nombre`, `categoria`, `precio`, `descripcion`, `etiquetas`, `imagen_url`, `estado`. Sin ingredientes (CA 1 no los pide). |
| S82 | Habilitados: secciones habilitadas con al menos un producto habilitado, y solo sus productos habilitados (CA 1 a 3). |
| S83 | Deshabilitados: solo productos deshabilitados. Aparecen todas las secciones deshabilitadas (sin productos deshabilitados, con el aviso «Sin productos dados de baja») y las habilitadas que tienen algún producto deshabilitado, como agrupador. Los productos habilitados de una sección deshabilitada no aparecen. |
| S84 | Todos: todas las secciones, también las vacías, con todos sus productos. |
| S85 | Orden: secciones por `orden`, `nombre` e `id` (una deshabilitada puede repetir el orden, S61); productos por `nombre` e `id`, como `GET /productos`. |
| S86 | Cada sección muestra todos sus `Producto`, sin filtrar por categoría (hoy platos, postres y bebidas). |
| S87 | Pantalla dentro del diseño de la aplicación (no limitada a 390 px). El filtro arranca en Habilitados cada vez que se abre (CA 2). Píldoras que desplazan a cada sección. Tarjeta: imagen (o un marcador sin imagen), nombre, precio, descripción (se omite si no hay) y etiquetas. En Deshabilitados y Todos, secciones y productos muestran su estado (CA 5). |
| S88 | Estados vacíos: «No hay productos habilitados en la carta.», «No hay secciones ni productos dados de baja.» y «No hay secciones cargadas.». Error: «No se pudo cargar la carta.». |
| S89 | Sin autenticación, cualquier persona que use el sistema ve la carta; la restricción al mozo queda para cuando existan roles. |

## Ronda de preguntas de la propuesta

Ritmo automático: se avanza con los supuestos.

1. En Deshabilitados, ¿una sección deshabilitada debe mostrar también sus productos habilitados, que tampoco llegan al cliente (S83)?
2. En Todos, ¿se muestran las secciones vacías (S84)?
3. ¿El mozo necesita la carta en el celular, como la maqueta, o alcanza con la pantalla de la aplicación (S87)?

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,router,service,repository}.py`, `backend/tests/modules/productos/` | Modificado |
| `frontend/src/modules/productos/` (`api.ts`, `types.ts`, `pages/CartaPage.tsx`, componentes de la carta, `ProductosPage.tsx` y pruebas) | Nuevo y modificado |
| `frontend/src/App.tsx` | Modificado (compartido: una ruta) |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| El filtro combinado de secciones y productos (S82 a S84) da resultados ambiguos. | Media | Una prueba por filtro con secciones vacías, mixtas y deshabilitadas. |
| Consultas N+1 al anidar productos. | Media | Una sola consulta de productos para las secciones de la página. |
| Conflicto en `App.tsx` con otros módulos. | Baja | Cambio de una línea; avisar en el PR. |

## Plan de reversión

Sin cambios de esquema ni migraciones; la ruta es de solo lectura. Revertir el merge en `develop`.

## Dependencias

- PR #185 integrado en `develop` (specs consolidadas de `carta-productos` y `carta-secciones`).

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M1-14 tiene una prueba que pasa en el backend y en el frontend.
- [ ] Las pruebas existentes de productos y secciones siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S79 a S89.
