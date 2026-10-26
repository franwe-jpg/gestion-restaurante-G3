# Diseño: HU-M1-07-08-09 Crear, modificar y dar de baja una bebida

- **Issues:** #10 (HU-M1-07), #11 (HU-M1-08) y #12 (HU-M1-09) · **Rama:** `feature/HU-M1-07-08-09-bebida` · **Entrada:** `proposal.md` (S42 a S46) y las decisiones B1 a B10 (HU-M1-01), C1 a C8 (HU-M1-04), E1 a E22 (HU-M1-02-03-13) y F1 a F9 (HU-M1-05-06), que no se rediscuten. Las decisiones de este cambio usan el prefijo G.

## Enfoque técnico

Backend: `BebidaCrear`, `BebidaModificar` y cuatro rutas sobre `/api/v1/bebidas`, iguales a las de postres (C1, F1, F2). El `service`, el `repository`, `models` y el esquema no cambian: `crear_producto`, `obtener_producto`, `modificar_producto` y `dar_de_baja_producto` ya son genéricos por categoría (E5) y la columna `ingredientes` admite una lista vacía.

Frontend: `BEBIDA` entra en `CategoriaAlta`, `CategoriaEdicion` y en cada `Record` por categoría (`CONFIGURACIONES`, `CONFIGURACIONES_EDICION`, `SEGMENTOS_RUTA`, `ENDPOINTS`). El compilador obliga a completar los cuatro. `ProductoNuevoPage`, `ProductoEditarPage`, `useFormularioProducto`, `useEdicionProducto`, `useBajaProducto` y `AccionesProducto` se reutilizan sin lógica nueva. La lectura del código encontró dos ajustes chicos que hacen falta para la regla propia de las bebidas (G4, G5).

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| G1 | Esquemas | `BebidaCrear(ProductoCrear)` fija `CATEGORIA = Categoria.BEBIDA` y `MENSAJE_NOMBRE_REPETIDO = "La bebida ya está registrada"` (S43) y **no** redefine `ingredientes`. `BebidaModificar(BebidaCrear, ProductoModificar)`, sin cuerpo (F1) | Redefinir `ingredientes` con `min_length=0`; un validador condicional por categoría en `ProductoCrear` | La base ya declara `ingredientes` opcional (`default_factory=list`, `max_length=50`, cada texto `Texto[1, 100]`, sin repetidos): heredarla cumple S44 sin código nuevo y conserva el rechazo de textos vacíos y repetidos. El validador condicional mezcla reglas de categorías en la base. |
| G2 | Rutas | Cuatro funciones explícitas: `crear_bebida`, `consultar_bebida`, `modificar_bebida` y `dar_de_baja_bebida`. Consultar y dar de baja pasan `BebidaCrear.CATEGORIA` (E5) | Fábrica de rutas por categoría | Repite C1 y F2: una línea de cuerpo que delega (D-02). |
| G3 | Categorías del frontend | `CategoriaAlta = 'PLATO' \| 'POSTRE' \| 'BEBIDA'`; `CategoriaEdicion = Extract<CategoriaAlta, 'PLATO' \| 'POSTRE' \| 'BEBIDA'>` | `CategoriaEdicion = CategoriaAlta` | F3 se conserva: el alta y la edición siguen siendo tipos independientes (por ejemplo, para `MENU_DEL_DIA` en M2). `esCategoriaEdicion` sigue derivada de `CONFIGURACIONES_EDICION`: con `BEBIDA` en el `Record`, la fila de una bebida recibe acciones sin tocar `AccionesProducto` (F7). |
| G4 | Mensaje del 409 en el campo | `errorDelServidor` reconoce `/ya está registrad[oa]/i` | Cambiar el mensaje del backend a masculino; comparar el mensaje completo de la configuración | Hoy busca `/ya está registrado/i`: «La bebida ya está registrada» no coincide y el 409 quedaría como error general, no bajo «Nombre». S43 fija el femenino. |
| G5 | Asterisco de «Ingredientes» | `FormularioProducto` recibe `ingredientesObligatorios` en su `configuracion` y pasa `required={configuracion.ingredientesObligatorios}` a `ListaDeTextos`. `ProductoEditarPage` lo toma de `CONFIGURACIONES[categoria]` | Dejar `required` fijo | Hoy el asterisco está fijo: en una bebida marcaría como obligatorio un campo que no lo es (S55). `validarProducto` ya respeta `ingredientesObligatorios: false` y `ListaDeTextos` sigue rechazando el texto vacío y el repetido, sin cambios. |
| G6 | Punto de entrada y rutas | Tercer botón literal «Nueva bebida» en `BotonesAlta`; rutas `productos/bebidas/nuevo` y `productos/bebidas/:id/editar` en `App.tsx` con `lazy` (C5, F6) | Generar los botones recorriendo `CONFIGURACIONES` | S41 sigue vigente: las rutas literales del alta no se migran. Un botón más son 4 líneas. |
| G7 | Pruebas del backend | El alta de bebidas entra en el `fixture` `alta` (C2). Los dos casos que suponen ingredientes obligatorios salen de las pruebas genéricas a una prueba parametrizada sobre plato y postre. La edición y la baja tienen un bloque nuevo de bebidas, como el de postres (F8) | Parametrizar el bloque de postres con bebidas | Con el `fixture`, las ≈ 15 pruebas del alta (imagen, HEIC, 404, 409, 422) cubren bebidas sin copiar. Parametrizar el bloque de postres reescribiría ≈ 260 líneas verificadas. |
| G8 | Pruebas del frontend | `CATEGORIAS` de `useFormularioProducto.test` y `ProductoNuevoPage.test` suma `BEBIDA`. La aserción de ingredientes obligatorios pasa a un `it.each` con el valor esperado por categoría. El 409 se arma con un `Record<CategoriaAlta, string>` en lugar del ternario plato/postre. Los `it.each`/`describe.each` de `categorias`, `api`, `AccionesProducto` y `App` suman una fila | Duplicar archivos de prueba para bebidas | Mismo criterio que F9: casos parametrizados, sin condicionales dentro de las pruebas. |

## Flujo de datos

```
/productos → ProductosTab ─«Nueva bebida»→ /productos/bebidas/nuevo
ProductoNuevoPage(categoria="BEBIDA") → CONFIGURACIONES.BEBIDA (ingredientesObligatorios: false)
  useFormularioProducto → validarProducto (sin error de ingredientes) → crearProducto('BEBIDA', …)
  ─POST /bebidas FormData→ router.crear_bebida → datos_de(BebidaCrear) [422]
  → service.crear_producto (B6) → 201 | 404 | 409 «La bebida ya está registrada» | 422

fila BEBIDA → AccionesProducto (esCategoriaEdicion = true)
  Editar → rutaDeEdicion('BEBIDA', id) = /productos/bebidas/:id/editar
  Dar de baja → useBajaProducto ─confirmar→ POST /bebidas/:id/baja → recargar (E22)

/productos/bebidas/:id/editar → ProductoEditarPage(categoria="BEBIDA")
  GET /bebidas/:id → service.obtener_producto(BEBIDA) → 200 | 404
  PUT /bebidas/:id → datos_de(BebidaModificar) → service.modificar_producto (E6) → 200 | 404 | 409 | 422
```

## Contratos

**API** (errores `{"detalle": ...}`, D-25 y D-26):

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `POST /api/v1/bebidas` (multipart: `datos`, `imagen?`) | 201 `ProductoSalida` con `categoria: "BEBIDA"`; `ingredientes` ausente o `[]` es válido | 404 sección; 409 «La bebida ya está registrada», sección deshabilitada; 422 |
| `GET /api/v1/bebidas/{producto_id}` | 200 `ProductoSalida` | 404 (inexistente o de otra categoría) |
| `PUT /api/v1/bebidas/{producto_id}` | 200 `ProductoSalida`; `ingredientes: []` reemplaza la lista (S44) | 404, 409, 422 |
| `POST /api/v1/bebidas/{producto_id}/baja` | 200 con `estado: "DESHABILITADO"` | 404, 409 «El producto ya está deshabilitado» |

```python
class BebidaCrear(ProductoCrear):
    CATEGORIA = Categoria.BEBIDA
    MENSAJE_NOMBRE_REPETIDO = "La bebida ya está registrada"  # S43
    # ingredientes: se hereda opcional de ProductoCrear (S44, G1)


class BebidaModificar(BebidaCrear, ProductoModificar):
    """Modificacion de una bebida: las reglas y los mensajes salen de BebidaCrear (G1)."""
```

```ts
// categorias.ts (textos de S46)
// CONFIGURACIONES.BEBIDA: 'Nueva bebida', 'Guardar bebida', 'Bebida creada', 'No se pudo crear la bebida',
//   'La bebida necesita una sección habilitada.', 'La bebida ya está registrada.', ingredientesObligatorios: false
// CONFIGURACIONES_EDICION.BEBIDA: 'Editar bebida', 'Guardar cambios', 'Bebida modificada',
//   'No se pudo modificar la bebida', 'La bebida no existe.', 'La bebida quedará deshabilitada y dejará de
//   mostrarse en la carta. Puede volver a habilitarla desde la pantalla de edición.', 'Bebida dada de baja',
//   'No se pudo dar de baja la bebida', 'Cargando bebida...'
// SEGMENTOS_RUTA.BEBIDA = 'bebidas'; api.ts ENDPOINTS.BEBIDA = '/bebidas'
// FormularioProducto: configuracion: Pick<ConfiguracionAlta, 'botonGuardar' | 'avisoSinSecciones' | 'ingredientesObligatorios'>
```

## Cambios en código compartido

Avisar al equipo antes del PR (AGENTS.md §9.3). En el backend no se toca código compartido.

| Archivo | Cambio | Impacto en otros módulos |
| --- | --- | --- |
| `frontend/src/App.tsx` (+ `App.test.tsx`) | Rutas de alta y edición de bebidas | Ninguno |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/productos/{schemas,router}.py` | Modificar (G1, G2) |
| `backend/tests/modules/productos/{test_schemas,test_router}.py` | Modificar (G7) |
| `frontend/src/modules/productos/categorias.ts` (+ prueba) | Modificar (G3, S46) |
| `frontend/src/modules/productos/api.ts` (+ prueba) | Modificar (`ENDPOINTS.BEBIDA`) |
| `frontend/src/modules/productos/components/validarProducto.ts` (+ prueba) | Modificar (G4) |
| `frontend/src/modules/productos/components/FormularioProducto.tsx` | Modificar (G5) |
| `frontend/src/modules/productos/components/ProductosTab.tsx` (+ prueba) | Modificar (G6) |
| `frontend/src/modules/productos/components/AccionesProducto.test.tsx` | Modificar (fila `BEBIDA`; «sin acciones» pasa a `MENU_DEL_DIA`) |
| `frontend/src/modules/productos/components/useFormularioProducto.test.tsx` | Modificar (G8) |
| `frontend/src/modules/productos/pages/ProductoEditarPage.tsx` (+ prueba) | Modificar (G5; `describe` de bebidas) |
| `frontend/src/modules/productos/pages/ProductoNuevoPage.test.tsx` | Modificar (G8) |
| `frontend/src/App.tsx` (+ `App.test.tsx`) | Modificar (G6) |

## Estrategia de pruebas

Strict TDD: cada prueba falla primero por 404/405 de la ruta, por tipo, por texto ausente o por el asterisco. Las CA de #10 son las de #6 salvo los ingredientes; las de #11 y #12, las de #7 y #8 (S42).

| HU y CA | Backend (`test_router.py`, salvo indicación) | Frontend |
| --- | --- | --- |
| HU-M1-07 CA del alta (1 a 14 de HU-M1-01) | `fixture` `alta` con `ALTA_BEBIDA`: forma 201, imagen, HEIC, 404, 409 con su mensaje, 422 por campo, `categoria` rechazada. La tabla de 422 suma `["  "]` en ingredientes | `ProductoNuevoPage` y `useFormularioProducto` con `BEBIDA` en `CATEGORIAS`; `api.test`: `POST /bebidas`; `App.test`: «Nueva bebida»; `ProductosTab.test`: el botón lleva al alta |
| HU-M1-07, ingredientes opcionales (S44) | `test_crear_bebida_sin_ingredientes_201` (parametrizado: ausentes y `[]`); `test_crear_producto_sin_ingredientes_422` para plato y postre (reemplaza los casos genéricos y la prueba solo de postres); `test_schemas`: `BebidaCrear` acepta sin ingredientes y rechaza vacío o repetido | Página: guarda una bebida sin ingredientes y llama a `crearProducto('BEBIDA', {… ingredientes: []})`; sin asterisco en «Ingredientes» (con asterisco en plato y postre); rechaza el chip vacío y el repetido |
| HU-M1-07, nombre repetido (S43) | `test_crear_bebida_con_nombre_de_postre_convive` (S14) | `validarProducto.test`: el 409 de bebida va al campo (G4) |
| HU-M1-08 CA 1 y 2 | `test_consultar_bebida_existente`; `test_modificar_bebida_datos_validos`; `test_modificar_bebida_ingredientes_etiquetas_e_imagen`; `test_modificar_bebida_quita_todos_los_ingredientes_200` | `ProductoEditarPage` (`describe` de bebidas): «Cargando bebida...», «Editar bebida», guardar con `'BEBIDA'` y «Bebida modificada»; guardar tras quitar todos los chips |
| HU-M1-08 CA 3 | `test_modificar_bebida_nombre_duplicado_409`; `test_modificar_bebida_datos_invalidos_422` (precio, ingredientes repetidos); `test_schemas`: `BebidaModificar` fija categoría y mensaje y rechaza `categoria` | 404: «La bebida no existe.» |
| HU-M1-08 CA 4 y 5 | `test_modificar_bebida_conserva_identidad`; `test_modificar_bebida_reactivar_200` | — |
| Aislamiento (E5) | `test_bebida_con_id_de_postre_404`, parametrizado sobre `GET`, `PUT` y `POST .../baja`; inexistente 404 en las tres | `categorias.test`: `esCategoriaEdicion('BEBIDA')` verdadero, `MENU_DEL_DIA` falso; `rutaDeEdicion('BEBIDA', 7)` |
| HU-M1-09 CA 1 y 2 | `test_dar_de_baja_bebida_200`; `test_dar_de_baja_bebida_ya_deshabilitada_409` | `AccionesProducto` (fila `BEBIDA`): enlace, confirmar con «Bebida dada de baja», cancelar no envía |
| HU-M1-09 CA 3 y 4 | `test_dar_de_baja_bebida_conserva_datos_e_imagen`; `test_reactivar_bebida_tras_la_baja_200` | Bebida deshabilitada: «Editar» sin «Dar de baja» |
| Regresión | Platos y postres sin cambios de comportamiento | `MENU_DEL_DIA` sin acciones (reemplaza a «BEBIDA sin acciones»); plato y postre conservan el asterisco |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. Las rutas nuevas reutilizan id entero validado por FastAPI, `imagenes.procesar` (B6) y consultas parametrizadas.

## Migración y despliegue

No requiere migración: `BEBIDA` ya está en el enum y el índice (`categoria`, `nombre_normalizado`) separa categorías (B1). Reversión: revertir el merge en `develop`.

## Tamaño estimado

| Lado | Código | Pruebas | Total previsto | Punto de control (800) |
| --- | --- | --- | --- | --- |
| Backend | ≈ 40 | ≈ 290 | ≈ 330 | Por debajo |
| Frontend | ≈ 55 | ≈ 180 | ≈ 235 | Por debajo |

## Supuestos del diseño

| # | Supuesto: |
| --- | --- |
| S55 | El asterisco de «Ingredientes» aparece solo en las categorías que los exigen (G5). |
| S56 | En la modificación de una bebida, `ingredientes` ausente equivale a `[]` y reemplaza la lista (reemplazo completo, S24). El frontend siempre envía la lista. |
| S57 | Las filas `MENU_DEL_DIA` siguen sin acciones: su ABM es de M2. |

## Preguntas abiertas

- [ ] Avisar del cambio en `App.tsx` (§9.3).
- [ ] Validar con M2 S20 para bebidas (baja de una bebida incluida en un menú vigente).
- [ ] La spec delta debe enmendar «Enlace de editar en platos y postres» y retirar la regresión «bebida sin acciones» (S45).
