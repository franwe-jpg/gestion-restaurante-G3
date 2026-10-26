# Diseño: HU-M1-04 Crear un postre

- **Issue:** #6 · **Rama:** `feature/HU-M1-04-crear-postre` (apilada sobre HU-M1-01, PR #177) · **Entrada:** `proposal.md` (D1, D2, S13, S14) y las decisiones B1 a B10 de HU-M1-01, que se reutilizan sin cambios.

## Enfoque técnico

Backend: `PostreCrear` hereda de `ProductoCrear` con sus `ClassVar` (B7) y `POST /api/v1/postres` reutiliza `datos_de`, `leer_imagen` y `service.crear_producto` (B2, B3, B6). No cambian `service`, `repository`, `models` ni el esquema: el índice B1 ya separa categorías. Frontend: la página, el `hook` y el validador del alta de platos pasan a llamarse `Producto*` y reciben la categoría; una configuración por categoría concentra los textos y la regla de ingredientes, y `api.ts` resuelve el endpoint (D-16).

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| C1 | Ruta de postres | Función explícita `crear_postre` en `router.py`, igual a `crear_plato` (una línea de cuerpo) | Fábrica `_ruta_de_alta(esquema)` que registra la ruta | Lo repetible (`datos_de`, `leer_imagen`, `crear_producto`) ya está compartido; la fábrica ahorra unas 3 líneas por categoría y oculta la firma, el nombre en OpenAPI y el `summary`. El `router` sigue siendo delgado (D-02) y los contratos de importación no cambian (D-04). |
| C2 | Pruebas del `router` | `fixture` `alta` parametrizada (`plato`, `postre`) con ruta, categoría y mensaje del 409; las pruebas de `POST /platos` pasan a `test_crear_producto_*` y reciben `alta` | Copiar las pruebas para postres | Una sola prueba por criterio cubre las dos categorías; el diff es de firmas y nombres, no de lógica. |
| C3 | Configuración por categoría | `productos/categorias.ts`: `CategoriaAlta = 'PLATO' \| 'POSTRE'` y `CONFIGURACIONES: Record<CategoriaAlta, ConfiguracionAlta>` con los textos completos | Componer los textos con el sustantivo («Nuevo » + nombre) | «Nueva bebida» y «Bebida creada» cambian de género (HU-M1-07). El `Record` obliga a completar la configuración al agregar una categoría. |
| C4 | Endpoint | `crearProducto(categoria, datos, imagen)` en `api.ts` con `ENDPOINTS_ALTA: Record<CategoriaAlta, string>`; reemplaza a `crearPlato` | Guardar el endpoint o la función en la configuración | Las URL viven solo en `api.ts` (D-16); la configuración queda como datos de interfaz, sin dependencias. |
| C5 | Rutas | `productos/platos/nuevo` y `productos/postres/nuevo` en `App.tsx`, con `<ProductoNuevoPage categoria="…" />` (`lazy`, D-19) | Ruta con parámetro `productos/:categoria/nuevo` | Con la `prop` tipada no hay que validar el parámetro ni manejar valores desconocidos; `App.tsx` no importa nada más del módulo. |
| C6 | `/productos/nuevo` | `<Navigate to="/productos/platos/nuevo" replace />` | Quitar la ruta | Cumple D2 con una línea y no rompe enlaces de quien probó HU-M1-01. |
| C7 | Punto de entrada | Botones «Nuevo plato» y «Nuevo postre» en la pestaña «Productos» de `ProductosPage` | Menú desplegable «Nuevo producto» | Un botón por categoría es directo y no agrega componentes. La maqueta solo muestra «Nuevo plato»: la diferencia se anota en el PR. |
| C8 | Renombrado | Primer commit con solo `git mv` y ajuste de importaciones (pruebas verdes); después, la parametrización | Renombrar y cambiar en un mismo commit | Git detecta el renombrado y la historia de cada archivo se conserva (`git log --follow`). |

## Flujo de datos

```
ProductosPage ─«Nuevo postre»→ /productos/postres/nuevo
ProductoNuevoPage(categoria="POSTRE") → CONFIGURACIONES.POSTRE (textos, ingredientesObligatorios)
  useFormularioProducto → validarProducto → crearProducto("POSTRE", datos, imagen)
  api.ts: ENDPOINTS_ALTA.POSTRE = "/postres" ─FormData→ router.crear_postre
  datos_de(PostreCrear) → service.crear_producto → 201 ProductoSalida | 404 | 409 | 422
```

## Contratos

**Backend (`schemas.py`, `router.py`):**

```python
class PostreCrear(ProductoCrear):
    CATEGORIA = Categoria.POSTRE
    MENSAJE_NOMBRE_REPETIDO = "El postre ya está registrado"  # S13
    ingredientes: list[Texto[1, 100]] = Field(min_length=1, max_length=50)
```

| Ruta | Respuesta | Errores |
| --- | --- | --- |
| `POST /api/v1/postres` (multipart: `datos`, `imagen?`) | 201 `ProductoSalida` con `categoria: "POSTRE"` | 404, 409, 422 con `{"detalle": ...}` (D-25, D-26) |

**Frontend:**

```ts
export interface ConfiguracionAlta {
  titulo: string;                  // 'Nuevo postre' (título y miga)
  botonGuardar: string;            // 'Guardar postre'
  creado: string;                  // toast: 'Postre creado'
  errorAlCrear: string;            // 'No se pudo crear el postre'
  avisoSinSecciones: string;       // 'El postre necesita una sección habilitada.'
  nombreRepetido: string;          // 'El postre ya está registrado.'
  ingredientesObligatorios: boolean;
}
```

| Antes | Después |
| --- | --- |
| `pages/PlatoNuevoPage.tsx` | `pages/ProductoNuevoPage.tsx` (`{ categoria: CategoriaAlta }`) |
| `components/useFormularioPlato.ts` | `components/useFormularioProducto.ts` (`{ categoria, onCreado }`) |
| `components/validarPlato.ts` | `components/validarProducto.ts`: `validarProducto(datos, { ingredientesObligatorios })`, `errorDelServidor(mensaje, configuracion)`; `NOMBRE_PRODUCTO_MAXIMO`, `DatosFormularioProducto`, `ErroresProducto` |
| `types.ts` `PlatoCrear` | `ProductoCrear` |
| `id` `plato-*` | `producto-*` |

## Cambios en archivos

| Archivo | Acción | Compartido |
| --- | --- | --- |
| `backend/app/modules/productos/{schemas,router}.py` | `PostreCrear` y `crear_postre` | No |
| `backend/tests/modules/productos/{test_router,test_schemas}.py` | Parametrizar y agregar casos | No |
| `frontend/src/modules/productos/categorias.ts` | Crear | No |
| `frontend/src/modules/productos/{api,types}.ts`, `pages/`, `components/` y sus pruebas | Renombrar y modificar | No |
| `frontend/src/App.tsx`, `App.test.tsx` | Rutas por categoría y redirección | **Sí** (avisar, §9.3) |

## Estrategia de pruebas

| Capa | Qué | Cómo |
| --- | --- | --- |
| Esquemas | `PostreCrear`: categoría, mensaje e ingredientes obligatorios | Parametrizar la prueba existente de `PlatoCrear` |
| `router` | Las pruebas de HU-M1-01 (CA 1 a 14) para `plato` y `postre` | `fixture` `alta` (C2); `_crear(cliente, alta, datos, ...)` |
| `router` | S14: plato «Flan» y postre «Flan» conviven (201); el 409 del postre dice «El postre ya está registrado» | Pruebas nuevas, solo postre |
| `service` | Sin cambios: ya es genérico y cubre otra categoría | — |
| `validarProducto` | Casos actuales + ingredientes opcionales con `ingredientesObligatorios: false`; 409 con el texto de cada configuración | Vitest |
| `hook` y página | Casos actuales para `PLATO` y `POSTRE` (título, botón, endpoint, 409, CA 2, CA 8) | `describe.each` sobre las categorías; `vi.mock('../api')`; `crearProducto` llamado con `'POSTRE'` |
| `api.ts` | `crearProducto` envía a `/platos` y a `/postres` | `it.each` |
| `App` y `ProductosPage` | Las dos rutas, la redirección de `/productos/nuevo` y el botón «Nuevo postre» | `it.each` sobre rutas |

Strict TDD: cada parametrización por `postre` falla primero (404 o texto ausente) y pasa después de agregar la ruta o la configuración.

## Matriz de amenazas

N/A: sin procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. La subida de imágenes reutiliza B6 e `imagenes.procesar` sin cambios.

## Migración y despliegue

No requiere migración (B1 ya cubre postres).

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 15 | ≈ 110 | ≈ 125 | 800: holgado |
| Frontend | ≈ 130 (los renombrados cuentan solo las líneas cambiadas) | ≈ 170 | ≈ 300 | 800: holgado |

## Preguntas abiertas

- [ ] El equipo valida S13 y S14.
- [ ] La spec delta aún no existe: si agrega criterios propios de postres, se suman a C2 sin cambiar el diseño.
- [ ] Avisar del cambio en `App.tsx` y anotar en el PR la diferencia con la maqueta (C7).
