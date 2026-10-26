# Diseño: HU-M1-05-06 Modificar y dar de baja un postre

- **Issues:** #7 (HU-M1-05) y #8 (HU-M1-06) · **Rama:** `feature/HU-M1-05-06-modificar-baja-postre` · **Entrada:** `proposal.md` (S30 a S32) y las decisiones B1 a B10 (HU-M1-01), C1 a C8 (HU-M1-04) y E1 a E22 (HU-M1-02-03-13), que no se rediscuten. Las decisiones de este cambio usan el prefijo F.

## Enfoque técnico

Backend: `PostreModificar` y tres rutas sobre `/api/v1/postres/{producto_id}`, iguales a las de platos (E1, E2, E5). El `service` y el `repository` no cambian: `obtener_producto`, `modificar_producto` y `dar_de_baja_producto` ya son genéricos por categoría. No cambian `models`, `shared/` ni el esquema.

Frontend: `CategoriaEdicion` pasa a incluir `POSTRE` y `CONFIGURACIONES_EDICION` suma sus textos (S32). La ruta de edición de una fila sale de la categoría (deja de estar fija a `/platos`). `ProductoEditarPage`, `FormularioProducto`, `useEdicionProducto`, `useBajaProducto` y `api.ts` se reutilizan sin lógica nueva: ya reciben la categoría. `App.tsx` suma una ruta.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| F1 | Esquema de la modificación | `PostreModificar(PostreCrear, ProductoModificar)`, sin cuerpo, como `PlatoModificar` (E2) | Un `ProductoModificar` genérico con la categoría en el cuerpo | Hereda `CATEGORIA`, `MENSAJE_NOMBRE_REPETIDO` («El postre ya está registrado», S13) y los ingredientes obligatorios de `PostreCrear`. `extra="forbid"` sigue rechazando `categoria`. Mismo respaldo que E2 si la herencia múltiple fallara. |
| F2 | Rutas del `router` | Tres funciones explícitas: `consultar_postre`, `modificar_postre` y `dar_de_baja_postre`. Consultar y dar de baja pasan `PostreCrear.CATEGORIA` (E5); modificar usa `datos_de(PostreModificar)` y el `service` toma la categoría de `datos.CATEGORIA` | Una fábrica que registre las tres rutas por categoría en un bucle; una ruta genérica `/productos/{id}` | El cuerpo de cada ruta es una línea que delega (D-02): la repetición es declarativa y cada función queda muy por debajo de 50 líneas. La fábrica oculta las rutas a la lectura y a la búsqueda, y tipa peor las dependencias de FastAPI. La ruta genérica rompe el 404 por categoría (E5) y el recurso por categoría del alta (D-21). |
| F3 | Categorías editables | `CategoriaEdicion = Extract<CategoriaAlta, 'PLATO' \| 'POSTRE'>`. `esCategoriaEdicion` se deriva de las claves de la configuración: `categoria in CONFIGURACIONES_EDICION` | `CategoriaEdicion = CategoriaAlta`; comparar con una lista literal en la guarda | `Extract` mantiene independientes el alta y la edición: cuando HU-M1-07 sume `BEBIDA` al alta, el `Record` no exigirá textos de edición antes de HU-M1-08. Derivar la guarda del `Record` deja una sola fuente: agregar una categoría editable es agregar su configuración. |
| F4 | Ruta de edición en la fila | `rutaDeEdicion(categoria: CategoriaEdicion, id: number)` en `categorias.ts`, sobre `SEGMENTOS_RUTA: Record<CategoriaAlta, string>` (`platos`, `postres`) | Un campo `ruta` en `ConfiguracionEdicion`; reutilizar `ENDPOINTS` de `api.ts` | `ConfiguracionEdicion` agrupa textos, no navegación. La ruta de la API y la de la pantalla coinciden hoy por casualidad; acoplarlas mezcla capas (D-16). Las rutas de `App.tsx` y el botón «Nuevo plato» de `ProductosTab` siguen literales (fuera del alcance). |
| F5 | Textos del postre (S32) | `CONFIGURACIONES_EDICION.POSTRE` con los textos análogos al plato. `ConfiguracionEdicion` suma `cargando` («Cargando plato...», «Cargando postre...») | Dejar fijo «Cargando plato...» en `ProductoEditarPage`; un texto neutro «Cargando...» | El `Spinner` de `ProductoEditarPage` tiene hoy el texto fijo «Cargando plato...»: con postres mostraría la categoría equivocada. Un campo más conserva el texto del plato (sus pruebas no cambian) y el `Record` obliga a definirlo por categoría. |
| F6 | Ruta de la pantalla | `productos/postres/:id/editar` → `<ProductoEditarPage categoria="POSTRE" />`, con el mismo `lazy` (D-19) | Una ruta `productos/:segmento/:id/editar` que traduzca el segmento | Repite el patrón de las rutas del alta (`platos/nuevo`, `postres/nuevo`). La ruta con segmento exigiría validar y traducir el segmento en la página. Archivo compartido: avisar (§9.3). |
| F7 | Acciones por fila (S31, enmienda E21) | `AccionesProducto` usa `rutaDeEdicion(producto.categoria, producto.id)`; la guarda `esCategoriaEdicion` deja sin acciones a bebidas y menús del día | Comparar la categoría dentro del componente | Cambio de una línea: el componente ya recibe la categoría tipada y `useBajaProducto` ya la usa. S27 deja de regir para postres. |
| F8 | Pruebas del backend | Las pruebas de platos no cambian. Bloque nuevo de postres: una prueba por criterio más el aislamiento por categoría. `_modificar` y `_baja` suman `ruta: str = RUTA_PLATOS`; `_crear_postre` reutiliza `_crear` con `ALTA_POSTRE`. El 404 por id de plato se parametriza sobre las tres operaciones | Convertir el bloque de platos en un `fixture` parametrizado `Edicion` (como `Alta`, C2) | El `service` es compartido y sus reglas ya están probadas con platos. Parametrizar el bloque reescribiría ≈ 45 pruebas verificadas (≈ 490 líneas) sin comportamiento nuevo. Lo que agrega este cambio es el cableado de las rutas, y eso es lo que se prueba. |
| F9 | Pruebas del frontend | `it.each` / `describe.each` donde solo cambia la categoría: `categorias.test`, `api.test` (obtener, modificar y dar de baja), `AccionesProducto.test` (enlace, baja, cancelar) y `App.test` (ruta de edición). `ProductoEditarPage.test`: `abrir(id, categoria = 'PLATO')` y un `describe` de postres. Las pruebas de los `hooks` no cambian | Duplicar cada archivo de prueba para postres | Los casos parametrizados conservan el nombre legible (`%s`) y evitan copiar ≈ 300 líneas. Los `hooks` no tienen lógica por categoría distinta de la configuración, que cubren las pruebas de la página. |

## Flujo de datos

```
/productos → ProductosTab → ProductosTabla → fila POSTRE → <AccionesProducto>
  Editar → rutaDeEdicion('POSTRE', id) = /productos/postres/:id/editar
  Dar de baja → useBajaProducto({ categoria: 'POSTRE' }) ─confirmar→ POST /postres/:id/baja → recargar

/productos/postres/:id/editar → ProductoEditarPage(categoria="POSTRE")
  obtenerProducto('POSTRE', id) ─GET /postres/:id→ router.consultar_postre
    → service.obtener_producto(db, Categoria.POSTRE, id) → 200 | 404
  useEdicionProducto ─PUT FormData→ router.modificar_postre → datos_de(PostreModificar) [422]
    → service.modificar_producto (orden E6, categoría de datos.CATEGORIA) → 200 | 404 | 409 | 422
  useBajaProducto ─POST .../baja→ router.dar_de_baja_postre
    → service.dar_de_baja_producto(db, Categoria.POSTRE, id) → 200 | 404 | 409
```

## Contratos

**API** (errores `{"detalle": ...}`, D-25 y D-26), igual que platos:

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /api/v1/postres/{producto_id}` | 200 `ProductoSalida` | 404 (inexistente o de otra categoría); 422 si el id no es entero |
| `PUT /api/v1/postres/{producto_id}` (multipart: `datos`, `imagen?`) | 200 `ProductoSalida` | 404, 409 («El postre ya está registrado», sección deshabilitada), 422 |
| `POST /api/v1/postres/{producto_id}/baja` (sin cuerpo) | 200 `ProductoSalida` con `estado: "DESHABILITADO"` | 404, 409 «El producto ya está deshabilitado» |

```python
class PostreModificar(PostreCrear, ProductoModificar):
    """Modificacion de un postre: las reglas y los mensajes salen de PostreCrear (F1)."""
```

```ts
// categorias.ts
export type CategoriaEdicion = Extract<CategoriaAlta, 'PLATO' | 'POSTRE'>;
export function esCategoriaEdicion(categoria: Categoria): categoria is CategoriaEdicion; // categoria in CONFIGURACIONES_EDICION
export function rutaDeEdicion(categoria: CategoriaEdicion, id: number): string;         // '/productos/postres/7/editar'
// ConfiguracionEdicion suma: cargando: string
// POSTRE: 'Editar postre', 'Guardar cambios', 'Postre modificado', 'No se pudo modificar el postre',
//   'El postre no existe.', 'El postre quedará deshabilitado y dejará de mostrarse en la carta. Puede volver
//   a habilitarlo desde la pantalla de edición.', 'Postre dado de baja', 'No se pudo dar de baja el postre',
//   'Cargando postre...'
```

## Cambios en código compartido

Avisar al equipo antes del PR (AGENTS.md §9.3). En el backend no se toca código compartido.

| Archivo | Cambio | Impacto en otros módulos |
| --- | --- | --- |
| `frontend/src/App.tsx` (+ `App.test.tsx`) | Ruta `productos/postres/:id/editar` con `ProductoEditarPage` | Ninguno |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/productos/{schemas,router}.py` | Modificar (F1, F2) |
| `backend/tests/modules/productos/{test_schemas,test_router}.py` | Modificar (F8) |
| `frontend/src/modules/productos/categorias.ts` (+ `categorias.test.ts`) | Modificar (F3 a F5) |
| `frontend/src/modules/productos/components/AccionesProducto.tsx` (+ prueba) | Modificar (F7) |
| `frontend/src/modules/productos/pages/ProductoEditarPage.tsx` (+ prueba) | Modificar (`configuracion.cargando`, F5) |
| `frontend/src/modules/productos/api.test.ts` | Modificar (casos de `POSTRE`) |
| `frontend/src/App.tsx` (+ `App.test.tsx`) | Modificar (F6) |

## Estrategia de pruebas

Strict TDD: cada prueba se escribe primero y falla por 404/405 de la ruta, por tipo o por texto ausente. Las CA de #7 y #8 son las de #3 y #4 para postres (S30).

| HU y CA | Backend (`test_router.py`, salvo indicación) | Frontend |
| --- | --- | --- |
| HU-M1-05 CA 1 (modificar datos) | `test_modificar_postre_datos_validos` (200, el `GET` refleja el cambio); `test_consultar_postre_existente` | `ProductoEditarPage`: «Editar postre» con los datos cargados; guardar llama a `modificarProducto('POSTRE', ...)` y muestra «Postre modificado» |
| CA 2 (ingredientes, etiquetas, imagen) | `test_modificar_postre_ingredientes_etiquetas_e_imagen` (reemplaza la imagen y la anterior deja de servirse) | `api.test`: `PUT /postres/7` con `FormData` |
| CA 3 (validaciones) | `test_modificar_postre_nombre_duplicado_409` (mensaje de postre); `test_modificar_postre_mismo_nombre_que_plato_200`; `test_modificar_postre_datos_invalidos_422` (parametrizado: precio, ingredientes vacíos); `test_schemas.py`: `PostreModificar` fija categoría y mensaje (parametrizado con `PlatoModificar`), exige ingredientes y rechaza `categoria` | Página: 404 muestra «El postre no existe.» |
| CA 4 (facturas, S18) | `test_modificar_postre_conserva_identidad` (fila de `prueba_linea` intacta tras cambiar el precio) | — |
| CA 5 (reactivar) | `test_modificar_postre_reactivar_200` | — |
| Aislamiento (E5) | `test_postre_con_id_de_plato_404`, parametrizado sobre `GET`, `PUT` y `POST .../baja`; el plato queda intacto | `categorias.test`: `esCategoriaEdicion` (`POSTRE` verdadero, `BEBIDA` falso) y `rutaDeEdicion` |
| HU-M1-06 CA 1 (baja) | `test_dar_de_baja_postre_200` (sale de `GET /productos`); `test_dar_de_baja_postre_ya_deshabilitado_409` | `AccionesProducto` (`describe.each` plato y postre): enlace a su ruta, confirmar envía la baja con su categoría y su texto; página: «Postre dado de baja» |
| CA 2 (cancelar) | — | `AccionesProducto`: cancelar no envía (parametrizado) |
| CA 3 (datos intactos) | `test_dar_de_baja_postre_conserva_datos_e_imagen`; `test_dar_de_baja_postre_usado_por_otra_tabla_200` | — |
| CA 4 (reactivar tras la baja) | `test_reactivar_postre_tras_la_baja_200` (visible con `estado=DESHABILITADO` antes) | Postre deshabilitado: «Editar» sin «Dar de baja» |
| Regresión | Pruebas de platos y del alta, sin cambios | Bebida sin acciones; `App.test` monta la edición de plato y de postre (`it.each`) |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. Las rutas nuevas reutilizan las validaciones de platos: id entero validado por FastAPI, imagen por `imagenes.procesar` (B6) y consultas parametrizadas.

## Migración y despliegue

No requiere migración. Reversión: revertir el merge en `develop`; los postres dados de baja conservan sus datos y se reactivan con `estado`.

## Tamaño estimado

| Lado | Código | Pruebas | Total previsto | Punto de control (800) |
| --- | --- | --- | --- | --- |
| Backend | ≈ 30 | ≈ 200 | ≈ 230 | Por debajo |
| Frontend | ≈ 40 (≈ 5 borradas) | ≈ 160 | ≈ 200 | Por debajo |

## Supuestos del diseño

| # | Supuesto: |
| --- | --- |
| S40 | La pantalla de edición muestra «Cargando postre...» mientras carga; el texto del plato no cambia (F5). |
| S41 | Las rutas literales del alta (`ProductosTab`, `App.tsx`) no se migran a `rutaDeEdicion` ni a una función análoga: no las pide ninguna CA de este cambio. |

## Preguntas abiertas

- [ ] Avisar del cambio en `App.tsx` (§9.3).
- [ ] Validar con M2 S20 para postres (baja de un postre incluido en un menú vigente).
- [x] La spec enmienda el requisito «Enlace de editar solo en platos» (S27) para incluir postres (S31): requisito «Enlace de editar en platos y postres».
