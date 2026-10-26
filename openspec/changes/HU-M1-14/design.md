# Diseño: HU-M1-14 Ver la carta

- **Issue:** #19 (HU-M1-14) · **Rama:** `feature/HU-M1-14-ver-carta` · **Entrada:** `proposal.md` (S79 a S89) y la spec delta `carta-vista` (S90 a S95). Se reutilizan sin rediscutir E15 (`FiltroEstadoProducto`), D-27 (paginación), D-16 (`api.ts`) y el armado de `imagen_url` de los productos. Las decisiones de este cambio usan el prefijo I y los supuestos del diseño siguen desde S96.

## Enfoque técnico

Backend: una ruta de solo lectura `GET /api/v1/carta` dentro del módulo `productos`. El `repository` resuelve la página de secciones que pasan el filtro (con su `total`) y, en una segunda consulta, los productos de esas secciones filtrados por estado; el `service` los agrupa en Python y arma `Pagina[SeccionCarta]`. Tres sentencias SQL por solicitud, sin importar la cantidad de secciones (sin N+1). Sin cambios de esquema.

Frontend: `CartaPage` (contenedor) en `/productos/carta` pide todas las páginas con `obtenerCarta(estado)` de `api.ts` y delega en componentes de presentación: `CartaVista`, `CartaNavegacion`, `CartaSeccion` y `ProductoCartaTarjeta`. El selector de estado se extrae de `ProductosTab` para usarlo en las dos pantallas.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| I1 | Ubicación | Ruta `/carta` en `productos/router.py`; `service.listar_carta`; consultas en `productos/repository.py` | Módulo `carta/` nuevo | La carta es de M1 y solo lee `Seccion` y `Producto`, que ya son de este módulo. Un módulo nuevo exigiría un contrato de `lint-imports` más y tocar `main.py`. |
| I2 | Filtro | `FiltroCarta(FiltroProductos)` solo con docstring: hereda `limit`, `offset`, `estado` (`HABILITADO` por defecto) y `estado_elegido()` | Enumeración nueva | Mismas opciones y 422 que `GET /productos` (E15) sin duplicar código; el nombre propio documenta la ruta. |
| I3 | Consultas sin N+1 | 1) `select(Seccion)` con el predicado de I4, ordenada y paginada; 2) `contar` sobre la misma consulta; 3) `select(Producto).where(seccion_id.in_(ids))` con `estado_elegido()` si no es `None`. Con `ids` vacío no se ejecuta la tercera | `selectinload` con `with_loader_criteria`; `JOIN` paginado por fila; una consulta por sección | El `JOIN` paginaría productos, no secciones (S80). El cargador con criterio es implícito y difícil de probar. |
| I4 | Predicado de sección (S82 a S84) | `HABILITADO`: `Seccion.estado == HABILITADO AND EXISTS(producto HABILITADO de la sección)`. `DESHABILITADO`: `Seccion.estado == DESHABILITADO OR EXISTS(producto DESHABILITADO)`. `TODOS`: sin condición. `EXISTS` correlacionado en `_condicion_de_carta(estado)` | Filtrar en Python después de traer todo | El `total` y la paginación deben contar solo las secciones visibles; el filtro en la base lo garantiza. El filtro de productos coincide con `estado_elegido()`, por eso los habilitados de una sección deshabilitada no aparecen en Deshabilitados (S83). |
| I5 | Orden (S85) | Secciones `orden, nombre, id`; productos `nombre, id` | Reutilizar el orden de `GET /secciones` (`orden, id`) | Dos deshabilitadas pueden repetir `orden` (S61). `GET /secciones` no cambia (excluido en la propuesta). |
| I6 | Esquemas | `ProductoCarta` y `SeccionCarta` (S81); `precio` con el mismo `field_serializer` de dos decimales. Se extrae `_url_de_imagen(producto)` en el `service` y lo usan `_a_salida` y `_a_producto_carta` | Copiar la expresión `f"/media/..."` | Un solo lugar arma la URL de la imagen. |
| I7 | Agrupación | `listar_carta` arma un `dict[int, list[ProductoCarta]]` por `seccion_id` y recorre las secciones en el orden de la consulta 1 | Ordenar en Python | El orden ya viene de la base; el agrupado es lineal. |
| I8 | Todas las páginas en el frontend (S80) | `obtenerCarta(estado)` en `api.ts`: pide `limit=100` con `offset` = secciones acumuladas hasta alcanzar `total` o recibir una página vacía. Cualquier fallo devuelve `{ exito: false, error }` | Una sola página de 100; ruta sin paginar | Respeta D-27 y no trunca con más de 100 secciones. La página vacía evita un ciclo infinito si el `total` cambia. |
| I9 | Contenedor y presentación | `CartaPage`: estado del filtro, `useApi(() => obtenerCarta(estado), \`carta-${estado}\`)`, migas, encabezado y selector. `CartaVista`: carga, error, vacío o contenido. `CartaSeccion` y `ProductoCartaTarjeta`: solo props | Una página única | Cada función queda por debajo de 50 líneas y complejidad 10; las piezas se prueban por separado. |
| I10 | Selector de estado | Se mueve `SelectorEstado` de `ProductosTab.tsx` a `components/SelectorEstado.tsx` sin cambios de comportamiento; las opciones salen de `FILTROS_ESTADO` | Copiar el selector | Un solo selector para la lista y la carta. El estado vive en `useState('HABILITADO')`, no en la URL: al abrir la carta siempre arranca en Habilitados (CA 2). |
| I11 | Navegación por secciones | `<nav aria-label="Secciones de la carta">` con enlaces `href="#seccion-{id}"`; cada `<section id="seccion-{id}" className="scroll-mt-4">` | Botones con `scrollIntoView` | El navegador desplaza sin JavaScript, es accesible y se prueba por `href` (jsdom no implementa `scrollIntoView`). |
| I12 | Estados vacíos y de sección | `CARTA_VACIA: Record<FiltroEstado, string>` con los textos de S88 en `CartaVista`; `AVISO_SECCION_VACIA` en `CartaSeccion` (S97). Insignia de estado en secciones y productos solo si el filtro no es `HABILITADO` (S87) | Agregar campos a `FiltroEstadoOpcion` | `filtrosEstado.ts` describe la tabla de productos; los textos de la carta son otros. |
| I13 | Tarjeta | Imagen con `urlDeImagen(imagen_url)`, `alt` = nombre y `loading="lazy"`, o un marcador «Sin imagen»; precio con `formatearMoneda(Number(precio))`; descripción omitida si es `null`; etiquetas con `Badge` | Componente compartido nuevo | Reutiliza `api.ts`, `format.ts` y `Badge`; nada nuevo en `shared/`. |
| I14 | Entrada | Botón «Ver carta» (`variant="outline"`, icono `BookOpen`) en `acciones` de `PageHeader` de `ProductosPage`, con `navigate('/productos/carta')`. Ruta `productos/carta` con `lazy` en `App.tsx` | Pestaña nueva en `ProductosPage` | La carta es una vista de consulta, no de administración, y tiene su propia URL. |

## Flujo de datos

```
ProductosPage «Ver carta» → /productos/carta → CartaPage (estado = HABILITADO)
  SelectorEstado ─cambia→ estado ─→ useApi(clave carta-{estado})
  obtenerCarta(estado) ─GET /carta?estado&limit=100&offset=n (hasta total)→
     router.listar_carta → service.listar_carta(filtro, filtro.estado_elegido())
        repository.listar_secciones_de_carta (I4, I5) → (secciones, total)
        repository.listar_productos_de_secciones (ids, estado) → productos
        agrupar por seccion_id → Pagina[SeccionCarta]
  CartaVista: Spinner | ErrorState «No se pudo cargar la carta.» | EmptyState (I12)
     | CartaNavegacion + CartaSeccion[] → ProductoCartaTarjeta[]
```

## Contratos

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /api/v1/carta?estado=HABILITADO\|DESHABILITADO\|TODOS&limit&offset` | 200 `Pagina[SeccionCarta]`; `total` cuenta secciones visibles | 422 `estado` inválido, `limit` fuera de 1 a 100 u `offset` negativo |

```python
class FiltroCarta(FiltroProductos): ...  # I2

class ProductoCarta(BaseModel):
    id: int; nombre: str; categoria: Categoria; precio: Decimal  # "1500.00"
    descripcion: str | None; etiquetas: list[str]; imagen_url: str | None; estado: Estado

class SeccionCarta(BaseModel):
    id: int; nombre: str; orden: int; estado: Estado; productos: list[ProductoCarta]

# repository: _condicion_de_carta(estado), listar_secciones_de_carta(db, parametros, estado)
#   -> tuple[list[Seccion], int], listar_productos_de_secciones(db, ids, estado) -> list[Producto]
# service: _url_de_imagen, _a_producto_carta, listar_carta(db, parametros, estado) -> Pagina[SeccionCarta]
```

```ts
export interface ProductoCarta { id: number; nombre: string; categoria: Categoria; precio: string;
  descripcion: string | null; etiquetas: string[]; imagen_url: string | null; estado: Estado }
export interface SeccionCarta { id: number; nombre: string; orden: number; estado: Estado;
  productos: ProductoCarta[] }
// api.ts: obtenerCarta(estado: FiltroEstado): Promise<RespuestaApi<SeccionCarta[]>>  (I8)
```

## Cambios en código compartido

| Archivo | Cambio | Impacto en otros módulos |
| --- | --- | --- |
| `frontend/src/App.tsx` | `lazy` de `CartaPage` y `<Route path="productos/carta">` | Ninguno; avisar en el PR (§9.3) |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/productos/{schemas,repository,service,router}.py` | Modificar (I1 a I7) |
| `backend/tests/modules/productos/{test_service,test_router}.py` | Modificar |
| `frontend/src/modules/productos/{types,api}.ts` (+ `api.test.ts`) | Modificar (I8) |
| `frontend/src/modules/productos/pages/CartaPage.tsx` (+ prueba) | Crear (I9) |
| `frontend/src/modules/productos/components/{CartaVista,CartaNavegacion,CartaSeccion,ProductoCartaTarjeta,SelectorEstado}.tsx` (+ pruebas de `CartaSeccion` y `ProductoCartaTarjeta`) | Crear (I9 a I13) |
| `frontend/src/modules/productos/components/ProductosTab.tsx` | Modificar: importa `SelectorEstado` (I10) |
| `frontend/src/modules/productos/pages/ProductosPage.tsx` (+ prueba) | Modificar: botón «Ver carta» (I14) |

## Estrategia de pruebas

Strict TDD: cada prueba falla primero por 404 de la ruta, función ausente o texto ausente.

| CA | Backend | Frontend |
| --- | --- | --- |
| CA 1 | Secciones por `orden, nombre, id` (dos deshabilitadas con igual orden en Todos); productos por `nombre, id`; campos de S81 con `precio` `"1500.00"` e `imagen_url` | Títulos de sección en orden, enlaces `#seccion-{id}`; tarjeta con nombre, precio formateado, descripción, etiquetas e imagen; sin descripción se omite; sin imagen, marcador |
| CA 2 | Sin `estado` responde como `HABILITADO` | Al abrir, el selector muestra «Habilitados» y se llama `obtenerCarta('HABILITADO')`; sin insignias de estado |
| CA 3 | Habilitados oculta la sección habilitada vacía, la que solo tiene deshabilitados y la deshabilitada con habilitados; `total` cuenta solo las visibles | Vacío «No hay productos habilitados en la carta.» |
| CA 4 | Deshabilitados: sección deshabilitada sin productos dados de baja con `productos: []`; habilitada con uno deshabilitado muestra solo ese; habilitados de la deshabilitada no aparecen | Cambiar a Deshabilitados llama con `DESHABILITADO`; aviso «Sin productos dados de baja»; insignias; vacío de S88 |
| CA 5 | Todos: secciones vacías y productos de ambos estados | Insignias «Habilitado» y «Deshabilitado»; aviso de sección vacía (S97); vacío «No hay secciones cargadas.» |
| Límites | 422 parametrizado (`estado=OTRO`, `limit=0`, `limit=101`, `offset=-1`); `limit=1&offset=1` devuelve la segunda sección con `total` completo; tres sentencias SQL con 3 secciones (contador `before_cursor_execute`); la consulta no modifica datos | `obtenerCarta` pide dos páginas con `total` 150 y concatena; fallo en la segunda devuelve error; `ErrorState` con «Reintentar»; «Ver carta» navega a `/productos/carta` |
| Regresión | Pruebas de productos y secciones sin cambios | Pruebas de `ProductosTab` y `ProductosPage` sin cambios tras extraer `SelectorEstado` |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. La ruta nueva es de solo lectura, valida la consulta con Pydantic y usa consultas parametrizadas.

## Migración y despliegue

No requiere migración. Reversión: revertir el merge en `develop`.

## Tamaño estimado

| Lado | Código | Pruebas | Total previsto | Punto de control (800) |
| --- | --- | --- | --- | --- |
| Backend | ≈ 90 | ≈ 260 | ≈ 350 | Por debajo |
| Frontend | ≈ 330 | ≈ 310 | ≈ 640 | Por debajo |

## Supuestos del diseño

| # | Supuesto: |
| --- | --- |
| S96 | Las píldoras son enlaces de ancla con el mismo estilo; no se resalta la sección visible (sin seguimiento del desplazamiento). |
| S97 | En Todos, una sección sin productos muestra «Sección sin productos.»; en Deshabilitados, «Sin productos dados de baja» (S83). En Habilitados nunca hay secciones vacías (I4). |
| S98 | Si la carta cambia entre dos páginas de `obtenerCarta`, puede faltar o repetirse una sección hasta recargar; con el volumen de S2-02 la carta entra en una sola página. |
| S99 | Textos: título «Carta», descripción «Secciones y productos tal como se muestran al cliente.», migas «Productos y Carta › Carta», carga «Cargando carta...», insignias «Habilitada»/«Deshabilitada» en secciones y «Habilitado»/«Deshabilitado» en productos, marcador «Sin imagen». |

## Preguntas abiertas

- [x] Avisar del cambio de una ruta en `App.tsx` (§9.3).
- [ ] El equipo valida S96 a S99.
