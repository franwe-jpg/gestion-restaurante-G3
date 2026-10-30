# Diseño: HU-M1-02-03-13 Modificar, dar de baja y listar productos

- **Issues:** #3 (HU-M1-02), #4 (HU-M1-03) y #18 (HU-M1-13) · **Rama:** `feature/HU-M1-02-03-modificar-baja-plato` · **Entrada:** `proposal.md` (S15 a S28), `specs/carta-productos/spec.md` (S24, S25) y las decisiones B1 a B10 (HU-M1-01) y C1 a C8 (HU-M1-04), que no se rediscuten.
- E1 a E12 están implementadas y verificadas (commits `90f9de7` a `db08090`, PR #180) y no cambian. E13 se amplía por HU-M1-13 (ver su fila). E14 a E22 son de HU-M1-13.

## Enfoque técnico

Backend: tres rutas nuevas sobre `/api/v1/platos/{producto_id}` (consultar, modificar y dar de baja). El `router` sigue delgado (D-02): reutiliza `datos_de` y `leer_imagen` y delega en tres funciones nuevas del `service`, genéricas por categoría como `crear_producto` (B7). El `repository` suma una consulta por id y categoría y un parámetro para excluir al propio plato en la unicidad. No cambian `models`, `shared/` ni el esquema.

Frontend: el formulario del alta se extrae a un componente de presentación (`FormularioProducto`) que usan dos páginas contenedoras: `ProductoNuevoPage` (sin cambios de comportamiento) y `ProductoEditarPage` (nueva). La lógica de envío del `hook` del alta se separa en piezas reutilizables, y la edición y la baja tienen su propio `hook`. El código compartido solo gana un método (`putFormulario`) y una función (`urlDelBackend`) en `client.ts`, y una ruta en `App.tsx`.

Lista (HU-M1-13): `GET /api/v1/productos` se extiende con un filtro `estado` opcional (por defecto `HABILITADO`) y devuelve un `schema` más rico que hereda del actual, de modo que el selector de `SeccionesTab` sigue recibiendo lo mismo sin parámetros. En el frontend, la pestaña «Productos» pasa a ser un contenedor (`ProductosTab`) con una tabla de presentación (`ProductosTabla`) y un componente de acciones por fila (`AccionesProducto`) que reutiliza `useBajaProducto`. No se toca código compartido ni el módulo de M2.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| E1 | Ruta de la baja (S25) | `POST /api/v1/platos/{producto_id}/baja`, sin cuerpo, 200 con `ProductoSalida` | `PATCH /platos/{id}/baja`; `PATCH /platos/{id}` con `{"estado": ...}`; `DELETE /platos/{id}` | D-24: una acción de negocio con regla propia (409 si el plato ya está deshabilitado, S21) va como `POST` sobre un subrecurso verbal (como `POST /comandas/{id}/cerrar`). D-24 es la regla específica y prevalece sobre la genérica de D-23. Un `PATCH` genérico de `estado` duplicaría al `PUT`, y D-24 lo descarta. `DELETE` implica eliminar y responder 204 (D-25), pero la fila se conserva. El frontend reutiliza `post` del cliente con un cuerpo vacío (`{}`), que la ruta ignora. |
| E2 | Contrato del `PUT` (S24) | Multipart igual al alta: `datos` (JSON) e `imagen?`. `PlatoModificar(PlatoCrear, ProductoModificar)` suma `estado: Estado \| None = None` (ausente conserva el actual) y `quitar_imagen: StrictBool = False`; `extra="forbid"` sigue rechazando `categoria` | Endpoint JSON aparte para los datos y otro para la imagen | Reutiliza `datos_de` (B2, B3) y las reglas del alta sin copiarlas. La herencia múltiple toma las `ClassVar` y la regla de ingredientes de `PlatoCrear`; `isinstance(datos, ProductoModificar)` tipa el `service`. Respaldo: si Pydantic no resuelve la herencia, `PlatoModificar(ProductoModificar)` repite las tres líneas de `PlatoCrear`. |
| E3 | Imagen en la modificación | Sin `imagen` ni `quitar_imagen`: se conserva. Con `imagen`: reemplaza. Con `quitar_imagen`: queda sin imagen. Ambas: 422 (`DatosInvalidosError`). El archivo anterior se borra después del `commit`; un `OSError` al borrarlo se ignora (archivo huérfano) | Borrar el anterior antes del `commit` | Si el `commit` falla, la imagen anterior sigue sirviéndose (atomicidad de la spec). Ignorar el error del borrado evita responder 500 con la base ya confirmada. |
| E4 | Archivo a descartar ante un error | `_guardar_producto(db, producto, mensaje, archivo_nuevo)` recibe explícito el archivo recién escrito | Seguir tomándolo de `producto.imagen` | En la modificación, `producto.imagen` puede ser la imagen **conservada**: tomarla de ahí borraría el archivo vigente al fallar el `commit`. El alta pasa su `archivo`. |
| E5 | 404 por categoría | `repository.obtener_producto(db, categoria, producto_id)` filtra por id **y** categoría; el `router` pasa `PlatoCrear.CATEGORIA` | Buscar por id y comparar la categoría en el `service` | Una sola consulta parametrizada; un postre pedido por `/platos/{id}` responde 404 como pide la spec. Mensaje genérico «El producto {id} no existe», igual que `_cargar_productos`, para que postres y bebidas reutilicen el `service`. |
| E6 | Orden de validación del `PUT` | 422 de forma (dependencia, antes del `router`) → conflicto `imagen` + `quitar_imagen` (422) → `imagenes.procesar` (422) → plato (404) → sección, solo si cambia (404, 409; S19) → nombre libre excluyendo el propio id (409) → escribir archivo → `flush` + `commit` → borrar el anterior | 404 del plato antes del 422 de forma | FastAPI valida `datos` antes de ejecutar la ruta, así que el 404 no puede preceder al 422 de forma. La imagen se procesa antes de leer la base por la misma razón que B6 (trabajo pesado fuera de la transacción, sin `SQLITE_BUSY_SNAPSHOT`). La spec ya sigue este orden. |
| E7 | Persistencia de la modificación | Se asignan los campos sobre la entidad cargada (listas nuevas, no mutación en el lugar) y se reutiliza `repository.agregar` (`add` es idempotente) + `commit` | Función `actualizar` nueva en el `repository` | Las columnas JSON detectan el cambio por reasignación. Asignar `nombre` dispara `@validates` y mantiene `nombre_normalizado` (B9). Gana la última modificación (S22). |
| E8 | Páginas del frontend | Extraer `FormularioProducto` (presentación: campos, aviso, botones, imagen) a `components/`; `ProductoEditarPage` nueva y `ProductoNuevoPage` reducida a contenedor | Un modo edición dentro de `ProductoNuevoPage` | Contenedor y presentación separados: cada página carga sus datos y llama a su `hook` después de cargarlos, sin `useEffect` que copie datos a estados. El costo es ≈ 300 líneas movidas (GitHub no detecta un movimiento entre archivos que siguen existiendo): se hacen en un commit propio, sin cambios de lógica, para revisarlo aparte (como C8). Se reutilizan el formulario, el `hook` y el validador del alta, como dice la spec. |
| E9 | `hooks` | `useFormularioProducto.ts` exporta `useCampos(inicial?)` y `useEnvioProducto(opciones)`; `useFormularioProducto` conserva su API (`categoria`, `onCreado`). Nuevos `useEdicionProducto` (estado, `quitarImagen`, `modificarProducto`) y `useBajaProducto` (`useConfirm` + `darDeBajaProducto`) | Un único `hook` con ramas por modo | Las pruebas del alta no cambian (riesgo 1 de la propuesta). Cada `hook` queda por debajo de 50 líneas y de complejidad 10. |
| E10 | Textos por categoría | `CategoriaEdicion = Extract<CategoriaAlta, 'PLATO'>` y `CONFIGURACIONES_EDICION: Record<CategoriaEdicion, ConfiguracionEdicion>` en `categorias.ts` | Agregar campos a `ConfiguracionAlta` | No obliga a inventar textos de postres (HU-M1-05); el tipo impide abrir la edición de una categoría sin configuración. Las reglas compartidas (`ingredientesObligatorios`, `nombreRepetido`) se siguen leyendo de `CONFIGURACIONES`. |
| E11 | Sección actual deshabilitada | `seccionesParaEditar(habilitadas, actual)` agrega la sección actual con el sufijo « (deshabilitada)» si no está entre las habilitadas | Mostrar solo las habilitadas | Sin esto el `Select` quedaría vacío y el plato no podría guardarse en su sección (S19). Cambiar a otra sección solo ofrece habilitadas. |
| E12 | Imagen actual en pantalla | `SelectorImagen` recibe `imagenActual?: string \| null` y `onQuitarActual?`; la URL absoluta sale de `urlDeImagen` en `api.ts`, que usa `urlDelBackend` de `client.ts` | Proxy `/media` en Vite; armar la URL con `VITE_API_URL` en el módulo | `imagen_url` es relativa al backend y no hay proxy. Una función en `client.ts` evita duplicar la URL por defecto (D-16). «Quitar» siempre deja el plato sin imagen; para conservarla se cancela. |
| E13 | Baja en pantalla (enmendada por HU-M1-13, S28) | Botón «Dar de baja» (variante `danger`) en la pantalla de edición, solo si el plato está `HABILITADO`, **y** el ícono «Dar de baja» en la fila del plato habilitado de la lista (E21). Ambos usan `useBajaProducto` y su `ConfirmDialog`. Desde la edición vuelve a `/productos`; desde la lista, la recarga. El texto `bajaDescripcion` pasa a «… Puede volver a habilitarlo desde la pantalla de edición.» | Solo en la pantalla de edición (versión verificada en el PR #180) | La razón para no ponerlo en la lista era que la lista pertenecía a HU-M1-13, que ahora está en este cambio. Reutilizar el `hook` cuesta un componente pequeño por fila, y la diferencia con la maqueta desaparece. El texto anterior («desde esta pantalla») es falso si el diálogo se abre desde la lista; el nuevo sirve en los dos lugares y no usa voseo (S23). |
| E14 | Contrato de la lista (HU-M1-13) | Extender `GET /api/v1/productos` con el parámetro `estado` (`HABILITADO` por defecto, `DESHABILITADO`, `TODOS`) y responder `Pagina[ProductoListado]`, donde `ProductoListado(ProductoSeleccionable)` suma `precio`, `etiquetas` y `estado` | Ruta nueva (`/productos/listado`); `schema` nuevo solo para otra ruta; `estado` ausente = todos, como en `/secciones` | D-21: un recurso, una ruta de listado; otra ruta duplicaría la consulta y la paginación. Los campos nuevos son aditivos y el valor por defecto conserva la respuesta sin parámetros, así que `listarProductosHabilitados` y las pruebas actuales (ninguna compara los ítems completos) no cambian. «Ausente = todos» rompería el selector y la spec (`GET /api/v1/productos` sin `DESHABILITADO`). Paginación con `shared/paginacion.py` (D-27); `estado` inválido responde 422 (D-25). Diferencia asumida con `/secciones`: allí el valor por defecto es «todas». Sin `estado`, los ítems, el orden y el total son los de hoy; la respuesta solo suma campos (superconjunto de `ProductoSeleccionable`). Devolver dos formas según el parámetro obligaría a una unión de tipos en la misma ruta y en OpenAPI. |
| E15 | Valor «Todos» | `FiltroEstadoProducto(StrEnum)` local (`HABILITADO`, `DESHABILITADO`, `TODOS`) dentro de `FiltroProductos(ParametrosPaginacion)`, como `FiltroSecciones`; `estado_elegido()` lo traduce a `Estado \| None` (`None` = todos) | `incluir_deshabilitados: bool` (no expresa «solo deshabilitados»); lista repetida de `estado` | Un valor por opción del filtro de la HU, validado por FastAPI. El `repository` recibe `Estado \| None` igual que `listar_secciones`. `TODOS` no se agrega a `Estado` del `shared`. |
| E16 | `service` y `repository` | `repository.listar_productos_habilitados` pasa a `listar_productos(db, parametros, estado: Estado \| None)`; `service.listar_productos(db, parametros, estado=Estado.HABILITADO)` arma cada ítem con `_a_listado`. Orden por `nombre, id` sin cambios; el total cuenta solo el filtro elegido | Mantener la función vieja y sumar otra | Una sola consulta parametrizada. El valor por defecto mantiene válida la prueba actual del `service` (`listar_productos(db, ParametrosPaginacion())`). El `router` solo delega: `service.listar_productos(db, filtro, filtro.estado_elegido())`. |
| E17 | Componentes de la lista | `ProductosTab` (contenedor: filtro, paginación, `useApi`, botones «Nuevo plato» y «Nuevo postre»), `ProductosTabla` (presentación: `DataTable` y `EmptyState`) y `AccionesProducto` (acciones de una fila) | Todo en `ProductosPage`; un único `hook` de baja en la tabla con la fila elegida en un estado | Repite el par `SeccionesTab` / `SeccionesTabla`. `useBajaProducto` recibe el producto al crearse, así que un componente por fila permite llamarlo sin romper las reglas de los `hooks` ni refactorizarlo. Cada función queda por debajo de 50 líneas. |
| E18 | Control del filtro | `Select` compartido dentro de `TableToolbar`, con `aria-label="Filtrar por estado"` y las opciones Habilitados, Deshabilitados y Todos; al cambiar, vuelve a la página 1 | Botones segmentados de la maqueta | No hay control segmentado en `shared/components/`; crearlo sería código compartido nuevo, y la guía `/componentes` («Tabla de datos») usa este mismo par para filtrar por estado. La diferencia con la maqueta se anota en el PR. |
| E19 | Columnas | Nombre, Categoría (`ETIQUETAS_CATEGORIA`), Sección, Precio (`formatearMoneda`, a la derecha), Etiquetas (un `Badge` por etiqueta, «—» si no hay), Estado (`Badge` «Habilitado» / «Deshabilitado») y acciones. Estado visible con cualquier filtro | `StatusBadge`; ocultar Estado fuera de «Todos» | `StatusBadge` no conoce estos estados y ampliarlo toca `shared/`; `Badge` repite `SeccionesTabla`. Una columna fija evita una tabla que cambia de forma y cumple «Todos muestra el estado». Sección viene en la respuesta y la maqueta la muestra. |
| E20 | Lista vacía por filtro | `FILTROS_ESTADO` en `filtrosEstado.ts`: valor, etiqueta y textos del vacío. Habilitados: «No hay productos habilitados». Deshabilitados: «No hay productos deshabilitados». Todos: «Todavía no hay productos». Sin carga en curso, sin error y sin ítems, `ProductosTabla` muestra solo el `EmptyState`, sin encabezados de tabla | Un único mensaje genérico; el `vacio` de `DataTable` (deja los encabezados) | La HU pide el mensaje del filtro elegido y la spec pide el vacío «sin tabla ni paginación». Un archivo `.ts` evita exportar constantes desde un `.tsx`. |
| E21 | Acciones por fila (S27, S28) | Solo en filas `PLATO` (guarda de tipo `esCategoriaEdicion` en `categorias.ts`): enlace `Link` «Editar «{nombre}»» a `/productos/platos/:id/editar` y, si está `HABILITADO`, botón `ghost` «Dar de baja «{nombre}»» con `useBajaProducto`; `onDadoDeBaja` recarga la lista. Postres y bebidas, sin acciones | Acciones en todas las filas | El backend solo expone edición y baja de platos (E5, E1); el tipo `CategoriaEdicion` impide ofrecerlas para otra categoría. `Link` es navegación semántica. |
| E22 | Paginación y recarga | `LIMITE_PAGINA = 50`; clave de `useApi` `productos-${estado}-${offset}`; `Pagination` si hay más de una página; mismo ajuste de `total` que `SeccionesTab`. Si tras una baja la página queda vacía y no es la primera, retrocede una | Paginación en el cliente | D-27. Retroceder evita mostrar «sin resultados» con productos en páginas anteriores. |

## Flujo de datos

```
/productos/platos/:id/editar → ProductoEditarPage(categoria="PLATO")
  useApi(obtenerProducto) + useApi(listarSeccionesHabilitadas) → EdicionCargada
    useEdicionProducto({ categoria, producto, onGuardado }) ─PUT FormData→ router.modificar_plato
    useBajaProducto({ categoria, producto, onDadoDeBaja }) ─confirmar→ POST .../baja
    <FormularioProducto f modo="edicion" acciones={«Dar de baja»} imagenActual />

router.modificar_plato → datos_de(PlatoModificar) [422] → service.modificar_producto
  1 imagen + quitar → 422 · 2 imagenes.procesar → 422 · 3 obtener_producto → 404
  4 sección si cambia → 404/409 · 5 nombre libre (excluir id) → 409
  6 imagenes.guardar · 7 aplicar + agregar + commit (error → rollback, borrar nuevo)
  8 borrar anterior si cambió → 200 ProductoSalida

router.dar_de_baja_plato → service.dar_de_baja_producto → 404 · 409 si DESHABILITADO
  → estado = DESHABILITADO + commit → 200 ProductoSalida (sin tocar archivos ni otras filas)

/productos (pestaña «Productos») → ProductosTab [estado=HABILITADO, página 1]
  useApi(listarProductos(estado, 50, offset)) ─GET /productos?estado=&limit=&offset=→
    router.listar_productos(FiltroProductos [422]) → service.listar_productos(db, filtro, estado_elegido())
    → repository.listar_productos(db, parametros, Estado | None) → Pagina[ProductoListado]
  <ProductosTabla filtro productos> → fila PLATO → <AccionesProducto>
    Editar → /productos/platos/:id/editar · Dar de baja → useBajaProducto → recargar
```

## Contratos

**API** (errores `{"detalle": ...}`, D-25 y D-26):

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /api/v1/platos/{producto_id}` | 200 `ProductoSalida` | 404; 422 si el id no es entero |
| `PUT /api/v1/platos/{producto_id}` (multipart: `datos`, `imagen?`) | 200 `ProductoSalida` | 404, 409, 422 |
| `POST /api/v1/platos/{producto_id}/baja` (sin cuerpo, D-24) | 200 `ProductoSalida` con `estado: "DESHABILITADO"` | 404, 409 «El producto ya está deshabilitado» |
| `GET /api/v1/productos?estado=HABILITADO\|DESHABILITADO\|TODOS&limit&offset` (`estado` por defecto `HABILITADO`) | 200 `Pagina[ProductoListado]`, orden por nombre | 422 (`estado`, `limit` u `offset` inválidos) |

**Backend:**

```python
class ProductoModificar(ProductoCrear):
    estado: Estado | None = None          # ausente: conserva el actual
    quitar_imagen: StrictBool = False     # S24

class PlatoModificar(PlatoCrear, ProductoModificar): ...

class FiltroEstadoProducto(StrEnum):      # HU-M1-13, E15
    HABILITADO = "HABILITADO"; DESHABILITADO = "DESHABILITADO"; TODOS = "TODOS"

class FiltroProductos(ParametrosPaginacion):
    estado: FiltroEstadoProducto = FiltroEstadoProducto.HABILITADO
    def estado_elegido(self) -> Estado | None: ...   # TODOS -> None

class ProductoListado(ProductoSeleccionable):   # id, nombre, categoria, seccion + estos
    precio: Decimal                              # se serializa "12500.50", como ProductoSalida
    etiquetas: list[str]
    estado: Estado

# service
def obtener_producto(db, categoria: Categoria, producto_id: int) -> ProductoSalida
def modificar_producto(db, producto_id: int, datos: ProductoModificar, imagen: bytes | None) -> ProductoSalida
def dar_de_baja_producto(db, categoria: Categoria, producto_id: int) -> ProductoSalida
def listar_productos(db, parametros, estado: Estado | None = Estado.HABILITADO) -> Pagina[ProductoListado]
# repository
def obtener_producto(db, categoria: Categoria, producto_id: int) -> Producto | None
def existe_producto(db, categoria, nombre_normalizado, excluir_id: int | None = None) -> bool
def listar_productos(db, parametros, estado: Estado | None) -> tuple[list[tuple[Producto, Seccion]], int]
```

Auxiliares del `service` (cada una con una sola responsabilidad): `_validar_imagen_pedida`, `_obtener_de_categoria`, `_validar_seccion_si_cambia`, `_validar_producto_libre(db, datos, excluir_id=None)`, `_aplicar_cambios`, `_borrar_anterior`, `_a_listado`.

**Frontend:**

```ts
// types.ts
export interface ProductoModificar extends ProductoCrear { estado: Estado; quitar_imagen: boolean }
export type FiltroEstado = Estado | 'TODOS';
export interface ProductoListado extends ProductoSeleccionable { precio: string; etiquetas: string[]; estado: Estado }
// categorias.ts
export interface ConfiguracionEdicion {
  titulo: string;            // 'Editar plato' (título y miga)
  botonGuardar: string;      // 'Guardar cambios'
  modificado: string;        // toast: 'Plato modificado'
  errorAlModificar: string;  // 'No se pudo modificar el plato'
  noEncontrado: string;      // 'El plato no existe.'
  bajaDescripcion: string;   // 'El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.' (E13)
  dadoDeBaja: string;        // toast: 'Plato dado de baja'
  errorAlDarDeBaja: string;  // 'No se pudo dar de baja el plato'
}
export const ETIQUETAS_CATEGORIA: Record<Categoria, string>;  // 'Plato', 'Postre', 'Bebida', 'Menú del día'
export function esCategoriaEdicion(categoria: Categoria): categoria is CategoriaEdicion;
// api.ts (ENDPOINTS_ALTA pasa a ENDPOINTS)
obtenerProducto(categoria: CategoriaEdicion, id: number)
modificarProducto(categoria: CategoriaEdicion, id: number, datos: ProductoModificar, imagen: File | null)
darDeBajaProducto(categoria: CategoriaEdicion, id: number)   // clienteHttp.post(`${endpoint}/${id}/baja`, {})
urlDeImagen(imagenUrl: string | null): string | null
listarProductos(estado: FiltroEstado, limit: number, offset: number)  // GET /productos?estado=&limit=&offset=
// listarProductosHabilitados() no cambia (selector de SeccionesTab)
// validarProducto.ts
precioParaEditar('12500.50') → '12.500,50'   // convertirPrecio(precioParaEditar(x)) === x
```

Título del diálogo: «¿Dar de baja «{nombre}»?»; botones «Cancelar» y «Dar de baja». Estado: `Switch` compartido con la etiqueta «Habilitado», solo en edición; en el alta sigue el texto fijo. Un `:id` que no es entero positivo muestra `noEncontrado` sin llamar a la API; un 404 también.

Lista: descripciones del vacío en español neutro. Habilitados: «Cree un plato o un postre, o elija otro filtro.». Deshabilitados: «Los productos dados de baja aparecen aquí.». Todos: «Cree el primer plato o postre de la carta.». Un error de carga usa el `ErrorState` de `DataTable` con «Reintentar».

## Cambios en código compartido

Avisar al equipo antes del PR (AGENTS.md §9.3). En el backend no se toca código compartido. HU-M1-13 no agrega cambios compartidos: usa `DataTable`, `Badge`, `Select`, `TableToolbar`, `Pagination`, `EmptyState`, `usePaginacion`, `useApi` y `formatearMoneda` tal como están.

| Archivo | Cambio | Impacto en otros módulos |
| --- | --- | --- |
| `frontend/src/shared/api/client.ts` (+ `client.test.ts`) | `putFormulario<T>(endpoint, formulario)` (como `postFormulario`, con `PUT`) y la función exportada `urlDelBackend(ruta)`. La baja reutiliza `post` sin cambios (E1) | Ninguno: solo agrega un método y una función; `get`, `post` y `postFormulario` no cambian |
| `frontend/src/App.tsx` (+ `App.test.tsx`) | Ruta `productos/platos/:id/editar` con `ProductoEditarPage` (`lazy`, D-19) | Ninguno |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/productos/{schemas,router,service,repository}.py` | Modificar (E1 a E7; E14 a E16) |
| `backend/tests/modules/productos/{test_schemas,test_service,test_router}.py` | Modificar |
| `frontend/src/modules/productos/{categorias,types,api}.ts` (+ `api.test.ts`) | Modificar (E10, E13, E14, E19, E21) |
| `frontend/src/modules/productos/components/FormularioProducto.tsx` | Crear (extraído de `ProductoNuevoPage`) |
| `frontend/src/modules/productos/components/{useEdicionProducto,useBajaProducto}.ts` y pruebas | Crear |
| `frontend/src/modules/productos/components/{useFormularioProducto,validarProducto}.ts`, `SelectorImagen.tsx` y pruebas | Modificar |
| `frontend/src/modules/productos/pages/ProductoEditarPage.tsx` y prueba | Crear |
| `frontend/src/modules/productos/pages/ProductoNuevoPage.tsx` | Modificar (usa `FormularioProducto`) |
| `frontend/src/modules/productos/components/{ProductosTab,ProductosTabla,AccionesProducto}.tsx` y pruebas | Crear (E17 a E22) |
| `frontend/src/modules/productos/components/filtrosEstado.ts` | Crear (E20) |
| `frontend/src/modules/productos/pages/ProductosPage.tsx` (+ `ProductosPage.test.tsx`) | Modificar: `ProductosPendientes` se reemplaza por `ProductosTab` |

## Estrategia de pruebas

Strict TDD: cada prueba se escribe primero y falla por 404/405 de la ruta, por función ausente o por texto ausente.

| Capa | Qué | Cómo |
| --- | --- | --- |
| Esquemas | `PlatoModificar`: hereda reglas y mensajes de `PlatoCrear`; `estado` opcional y `ANULADO` → error; `quitar_imagen` estricto; `categoria` rechazada. `FiltroProductos`: por defecto `HABILITADO`; `estado_elegido()` de cada valor | Parametrizar casos de `test_schemas.py` |
| `service` | Orden E6; sección sin cambio aunque esté deshabilitada (S19); nombre propio permitido, ajeno (incluso deshabilitado) 409, mismo nombre que un postre permitido; imagen conservada, reemplazada y quitada; `commit` fallido conserva la imagen anterior y borra la nueva (E4); baja 409 si ya está deshabilitada; datos intactos tras la baja. Lista: cada estado (y `None`) filtra ítems y total; ítems con `precio`, `etiquetas` y `estado` | `directorio_media` existente; `monkeypatch` sobre `db.commit` |
| `router` | Un escenario por criterio de la spec: 200/404/409/422 de las tres rutas, 404 por postre, reactivación y baja reflejadas en `GET /api/v1/productos`, imagen anterior sin servir (404 en `/media`). Lista: sin parámetros solo habilitados (pruebas actuales intactas); `DESHABILITADO` muestra el plato dado de baja (CA 4 de HU-M1-03, S17); `TODOS` ambos con su `estado`; `estado` inválido 422; `precio` `"12500.50"`; paginación con filtro; lista vacía | `cliente`; `_crear` del alta como `fixture` de datos |
| Facturas (S18) | La fila que referencia al plato sigue intacta tras `PUT` y baja | Tabla de prueba con clave foránea a `productos.id`, creada solo en la base de la prueba |
| `client.ts` | `putFormulario` sin `Content-Type`; `urlDelBackend` | `fetch` simulado, como `client.test.ts` |
| `api.ts` | Rutas, método y `FormData` de las tres funciones; `urlDeImagen`; URL de `listarProductos` con `estado`, `limit` y `offset` | `vi.mock` del cliente |
| `validarProducto` | `precioParaEditar` e ida y vuelta con `convertirPrecio` | Vitest |
| `hooks` | Edición: datos iniciales, `estado`, `quitar_imagen`, 409 bajo el nombre, sin envío si la validación local falla. Baja: confirmar envía `POST .../baja`; cancelar no envía nada | `renderHook`; `vi.mock('../api')`; `useConfirm` simulado |
| Páginas y `SelectorImagen` | Formulario cargado («Editar plato», «Guardar cambios»); `Switch` solo en edición; «Dar de baja» oculto si está deshabilitado; id inválido o 404; sección deshabilitada en el `Select`; imagen actual y «Quitar»; el alta sigue igual | Testing Library con `MemoryRouter` |
| Lista | `ProductosTabla`: nombre, categoría legible, precio con formato, etiquetas y estado; mensaje vacío de cada filtro; «Editar» solo en platos (enlace correcto); «Dar de baja» solo en platos habilitados. `AccionesProducto`: confirmar envía la baja y recarga; cancelar no envía. `ProductosTab`: primera consulta con `HABILITADO`; cambiar a Deshabilitados o Todos vuelve a consultar desde `offset` 0; botones «Nuevo plato» y «Nuevo postre» navegan. `ProductosPage`: la pestaña muestra la lista, no «pendiente» | Testing Library con `MemoryRouter`; `vi.mock('../api')`; `useConfirm` simulado |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. La imagen reutiliza `imagenes.procesar` (B6); el archivo a borrar sale del nombre guardado por el servidor, nunca de la petición, y el id de la ruta es un entero validado por FastAPI. El filtro `estado` es un `enum` validado (422) y la consulta de la lista es parametrizada.

## Migración y despliegue

No requiere migración: la columna `estado` ya existe y ninguna fila se borra. Reversión: revertir el merge en `develop`; los platos dados de baja se reactivan con `estado`. La lista es de solo lectura salvo la baja, que reutiliza la ruta existente.

## Tamaño estimado

Cifras medidas de HU-M1-02 y HU-M1-03 (`verify-report.md`) más el pronóstico de HU-M1-13 (líneas agregadas, pruebas incluidas).

| Lado | HU-M1-02 y HU-M1-03 (medido) | HU-M1-13 (código + pruebas) | Total previsto | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 930 | ≈ 60 + 140 = ≈ 200 | ≈ 1.130 | 800: por encima (informativo, un solo PR) |
| Frontend | ≈ 1.550 (+ 210 borradas; ≈ 180 de movimiento en `a64e338`) | ≈ 260 + 320 = ≈ 580 (≈ 30 borradas en `ProductosPage`) | ≈ 2.130 | 800: por encima (informativo, un solo PR) |

## Preguntas abiertas

- [ ] Avisar del cambio en `client.ts` y `App.tsx` (§9.3); anotar en el PR las diferencias con la maqueta: filtro con `Select` en lugar de botones segmentados (E18), sin búsqueda ni filtro de categoría, sin miniatura de imagen (E13 ya no es diferencia).
- [ ] Validar con M2 S20 (baja de un plato incluido en un menú vigente) y S26 (CA 1 de HU-M1-13 sin menús del día).
- [ ] Validar con el equipo que `estado` por defecto `HABILITADO` en `/productos` y «todas» en `/secciones` es una diferencia aceptada (E14).
- [x] Alinear la spec con E14: sin `estado`, `GET /productos` devuelve los mismos ítems, orden y total que hoy, con campos agregados (`precio`, `etiquetas`, `estado`); no «los mismos campos que antes». Y con E13 y E21: la baja desde la fila queda incluida y sus escenarios se prueban.
