# Diseño: HU-M1-11-12 Modificar y dar de baja una sección

- **Issues:** #15 (HU-M1-11) y #16 (HU-M1-12) · **Rama:** `feature/HU-M1-11-12-modificar-baja-seccion` · **Entrada:** `proposal.md` (S58 a S68), la spec delta (S69 a S74) y las decisiones A1 a A10 de HU-M1-10 (`archive/2026-10-25-HU-M1-10/design.md`), que no se rediscuten. Las decisiones de este cambio usan el prefijo H y los supuestos siguen desde S75.

## Enfoque técnico

Backend: `SeccionModificar` y tres rutas sobre `/api/v1/secciones/{seccion_id}`. El `service` reutiliza los auxiliares del alta (`_validar_nombre_libre`, `_validar_orden_libre`, `_cargar_productos`, `_validar_habilitados`, `_validar_traslado`) con la propia sección excluida, valida todo antes de mutar y confirma una sola vez (A3). El listado y las respuestas de sección suman `productos_habilitados`. Sin cambios de esquema: `ux_secciones_orden_habilitada` (A2) respalda el 409 ante carreras.

Frontend: `SeccionFormDialog` gana el modo edición; la fila de `SeccionesTabla` recibe «Editar» y «Dar de baja» con un `AccionesSeccion` y un `useBajaSeccion` calcados de `AccionesProducto` y `useBajaProducto`. Sin rutas nuevas: `App.tsx` no cambia.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| H1 | Esquema | `SeccionModificar(SeccionCrear)` con `estado: Estado \| None = None`. Hereda `nombre`, `orden` estricto, `producto_ids` sin repetidos y `confirmar_traslado` | Modelo independiente con `extra="forbid"` | Mismas reglas de forma que el alta (CA 2 a 5 de HU-M1-10) sin duplicarlas, como E2 y F1 en productos. |
| H2 | Rutas | `consultar_seccion`, `modificar_seccion` y `dar_de_baja_seccion`: una línea que delega (D-02). `PUT` recibe JSON, como `POST /secciones` | Cuerpo multipart con `datos_de` | La sección no tiene archivo; el JSON reutiliza la validación nativa de FastAPI. |
| H3 | Orden de validación del `PUT` | 422 de forma → 404 sección → 409 nombre → 409 orden (solo si queda habilitada) → 409 agregar a deshabilitada → 404 productos → 409 productos deshabilitados → 409 traslado → mutar → `commit` | 404 antes que 422 (S70 literal) | FastAPI valida el cuerpo antes de llamar a la función; mismo comportamiento que platos y postres (E6). Ver S75. |
| H4 | Exclusión de la propia sección | `existe_nombre_normalizado` y `buscar_habilitada_por_orden` reciben `excluir_id: int \| None = None`; el `service` lo pasa **posicional** | Funciones nuevas de `repository` para la edición | Un solo camino de consulta. El paso posicional mantiene válido el `monkeypatch` `lambda *_: None` de la prueba de carrera existente. |
| H5 | Productos aditivos (S62, S72) | `nuevos = ids que no están en seccion.productos`; solo `nuevos` pasan por carga, habilitados y traslado. Se agregan con `seccion.productos = [*seccion.productos, *productos]` | Reemplazar la lista | La API no puede quitar (CA 4). Un id ya presente no exige confirmación ni estado habilitado. |
| H6 | Atomicidad y carrera | Se muta recién tras validar todo (evita que el `autoflush` dispare el índice a mitad de la validación). `_guardar` se divide y el nuevo `_confirmar_seccion(db)` hace `commit` y traduce `IntegrityError` a 409 «La sección ya existe o la posición está ocupada» con `rollback` | Capturar solo en el alta | Reactivar o reordenar en paralelo choca con el índice parcial: mismo 409 que A3 (S71). |
| H7 | Baja | `dar_de_baja_seccion`: 404, 409 «La sección ya está deshabilitada» (S73), `estado = DESHABILITADO`, `commit`. Los productos no se tocan (CA 3) | Deshabilitar también los productos | Igual que `dar_de_baja_producto`. Deshabilitar saca la fila del índice parcial: no hay `IntegrityError` posible. |
| H8 | Conteo para el aviso (S66, S69) | `productos_habilitados` en `SeccionListado` (misma consulta: `func.count(Producto.id).filter(Producto.estado == HABILITADO)`) y en `SeccionSalida` (calculado por `_a_salida_seccion` sobre la relación). `cantidad_productos` se conserva | Cambiar el significado de `cantidad_productos`; pedir el conteo al abrir la baja | Ningún consumidor cambia de semántica y el aviso no hace otra solicitud. SQLite ≥ 3.30 admite `FILTER`. |
| H9 | `PUT` JSON en el frontend | `put<T, B>` en `ClienteApi` (`shared/api/client.ts`), gemelo de `post` | `putFormulario` con un `FormData` | El backend espera JSON (H2). Cambio compartido: avisar (§9.3). |
| H10 | Datos del diálogo de edición | Se inicializa con la fila (`SeccionListado`) y con los productos habilitados ya cargados por `SeccionesTab`; los actuales son los de `producto.seccion.id === seccion.id`. `api.ts` no expone `obtenerSeccion` | Llamar a `GET /secciones/{id}` al abrir | Sin estados de carga ni de 404 en el diálogo (≈ 40 líneas menos). El selector solo ofrece habilitados (CA 6), así que los deshabilitados de la sección no se mostrarían igual. El `GET` queda para otros clientes de la API. |
| H11 | Productos actuales bloqueados (CA 4) | `useFormularioSeccion` intercepta el cambio de selección: si quita un actual, no lo aplica y muestra un `Alert` `warning` con el texto de S62. `SelectorProductos` no cambia | Casillas `disabled`; `Toast` | Una casilla deshabilitada no permite el intento que dispara el aviso. El `Alert` queda dentro del diálogo. |
| H12 | Traslado en edición (S63) | Se confirma con `useConfirm` solo si hay `nuevos`; se envía `producto_ids: nuevos` y `confirmar_traslado: nuevos.length > 0`. La descripción dice «a esta sección» en lugar de «a la nueva» | Enviar toda la selección | El backend ignora los presentes (H5), pero el diálogo de confirmación no debe nombrarlos. |
| H13 | Reactivación (S67) | Con la fila `DESHABILITADO`, el diálogo muestra la casilla «Habilitar la sección»; marcada envía `estado: 'HABILITADO'`, desmarcada omite `estado` | Selector de estado completo | El frontend nunca envía `DESHABILITADO`: la baja va por la fila, con su aviso. |
| H14 | Acciones por fila | `SeccionesTabla` recibe `renderAcciones` (como `ProductosTabla`). `AccionesSeccion`: botón «Editar» (abre el diálogo) y «Dar de baja» solo si está habilitada. `SeccionesTab` guarda `dialogo: { seccion?: SeccionListado } \| null` y, tras la baja, recarga solo las secciones | Ruta `/productos/secciones/:id/editar` | El alta ya es un diálogo; sin rutas nuevas. El listado de secciones no filtra por estado: la fila dada de baja sigue en la página (no aplica E22). |

## Flujo de datos

```
SeccionesTabla ─fila─→ AccionesSeccion
  «Editar» → SeccionesTab.dialogo = { seccion } → SeccionFormDialog(seccion, productos)
     useFormularioSeccion: validarSeccion → [confirmar traslado de nuevos] → modificarSeccion(id, {…, estado?})
     ─PUT /secciones/{id}→ router → service.modificar_seccion (H3) → 200 SeccionSalida | 404 | 409 | 422
  «Dar de baja» → useBajaSeccion → useConfirm(descripcionDeLaBaja(productos_habilitados))
     ─POST /secciones/{id}/baja→ service.dar_de_baja_seccion (H7) → 200 | 404 | 409 → recargar secciones
GET /secciones → repository.listar_secciones → (seccion, cantidad, habilitados) → SeccionListado
```

## Contratos

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /api/v1/secciones/{seccion_id}` | 200 `SeccionSalida` | 404 «La sección {id} no existe» |
| `PUT /api/v1/secciones/{seccion_id}` (JSON `SeccionModificar`) | 200 `SeccionSalida` | 404; 409 nombre, posición, sección deshabilitada, producto deshabilitado, traslado; 422 |
| `POST /api/v1/secciones/{seccion_id}/baja` (sin cuerpo) | 200 `SeccionSalida` con `DESHABILITADO` | 404; 409 «La sección ya está deshabilitada» |

```python
class SeccionModificar(SeccionCrear):
    estado: Estado | None = None  # ausente: conserva el actual (S59)

# SeccionSalida y SeccionListado suman: productos_habilitados: int
# service: obtener_seccion, modificar_seccion, dar_de_baja_seccion; auxiliares _obtener_seccion (404,
# tambien usado por _validar_seccion_habilitada), _validar_agregado_en_deshabilitada,
# _aplicar_cambios_seccion, _confirmar_seccion, _a_salida_seccion. Todas <= 50 lineas, complejidad <= 10.
```

```ts
// types.ts
export interface SeccionModificar extends SeccionCrear { estado?: 'HABILITADO' }
// Seccion y SeccionListado suman productos_habilitados: number
// api.ts: modificarSeccion(id, datos) → clienteHttp.put; darDeBajaSeccion(id) → clienteHttp.post(…/baja, {})
// SeccionFormDialog: { productos, seccion?: SeccionListado, onGuardada, onOpenChange }
```

## Cambios en código compartido

| Archivo | Cambio | Impacto en otros módulos |
| --- | --- | --- |
| `frontend/src/shared/api/client.ts` (+ `client.test.ts`) | Método `put<T, B>` (H9) | Ninguno: método nuevo |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/productos/{schemas,router,service,repository}.py` | Modificar (H1 a H8) |
| `backend/tests/modules/productos/{test_service,test_router,test_schemas}.py` | Modificar |
| `frontend/src/modules/productos/{types,api}.ts` (+ `api.test.ts`) | Modificar |
| `frontend/src/modules/productos/components/{SeccionFormDialog.tsx,useFormularioSeccion.ts,SeccionesTabla.tsx,SeccionesTab.tsx}` (+ pruebas) | Modificar (H10 a H14) |
| `frontend/src/modules/productos/components/{AccionesSeccion.tsx,useBajaSeccion.ts}` (+ pruebas) | Crear (H14) |
| Fixtures `SeccionListado`/`Seccion` de `ProductoNuevoPage.test`, `ProductoEditarPage.test`, `SeccionesTabla.test`, `SeccionesTab.test`, `SeccionFormDialog.test` | Sumar `productos_habilitados` |

## Estrategia de pruebas

Strict TDD: cada prueba falla primero por 404/405 de la ruta, campo ausente o texto ausente.

| HU y CA | Backend | Frontend |
| --- | --- | --- |
| Consultar | `test_obtener_seccion_con_productos`; 404 parametrizado sobre `GET`, `PUT` y `POST …/baja` | — |
| HU-M1-11 CA 1 y 2 | `test_modificar_seccion_nombre_y_orden_200`; 422 parametrizado (51 caracteres, `0`, `"3"`); 409 nombre de otra; 200 al cambiar solo la capitalización; 409 orden ocupado; orden de deshabilitada 200; guardar sin cambios 200 | Diálogo de edición precargado; envía `modificarSeccion` con nombre y orden; 409 bajo el campo |
| HU-M1-11 CA 3, 5 y 6 | Agregar con confirmación; sin confirmar 409 con producto y sección; producto deshabilitado 409; agregar a deshabilitada 409; id ya presente ignorado; falla parcial sin cambios | Confirmación nombra solo los nuevos y envía `producto_ids: nuevos` |
| HU-M1-11 CA 4 | `producto_ids: []` conserva los productos | Desmarcar un actual: aviso de S62 y sigue marcado |
| HU-M1-11 CA 7 | Reactivar 200; reactivar con orden ocupado 409 y sigue deshabilitada; carrera (`monkeypatch`) → 409 | Casilla «Habilitar la sección» solo en deshabilitadas; envía `estado: 'HABILITADO'`; sin marcar omite `estado` |
| HU-M1-12 CA 1 y 3 | Baja 200; productos conservan estado y sección; reactivar los vuelve a mostrar; baja doble 409 | «Dar de baja» solo en habilitadas; confirmar llama a `darDeBajaSeccion` y recarga |
| HU-M1-12 CA 2 y 4 | `productos_habilitados` cuenta 2 de 3 en el listado y en `SeccionSalida` | `descripcionDeLaBaja` con 0, 1 y 3; cancelar no envía |
| Regresión | Pruebas de HU-M1-10 y de productos sin cambios | `client.test`: `put` envía JSON con `PUT` |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. Las rutas nuevas usan id entero validado por FastAPI y consultas parametrizadas.

## Migración y despliegue

No requiere migración. Reversión: revertir el merge en `develop`.

## Tamaño estimado

| Lado | Código | Pruebas | Total previsto | Punto de control (800) |
| --- | --- | --- | --- | --- |
| Backend | ≈ 100 | ≈ 330 | ≈ 430 | Por debajo |
| Frontend | ≈ 220 | ≈ 300 | ≈ 520 | Por debajo |

## Supuestos del diseño

| # | Supuesto: |
| --- | --- |
| S75 | Un cuerpo inválido responde 422 aunque la sección no exista: FastAPI valida antes del `service` (H3). S70 debe leerse «422, 404, …». |
| S76 | El 409 de agregar a una sección que queda deshabilitada se evalúa antes de cargar los productos y usa «La sección {nombre} está deshabilitada». El diálogo no lo previene: lo muestra como error general. |
| S77 | El diálogo marca como actuales solo los productos habilitados de la sección presentes en la página del selector (límite 100, pregunta abierta de HU-M1-10). |
| S78 | Textos: «Editar sección», «Sección modificada», «No se pudo modificar la sección», «Habilitar la sección», «¿Dar de baja «{nombre}»?», «{n} producto(s) habilitado(s) dejará(n) de mostrarse en la carta», «La sección no tiene productos habilitados», «Sección dada de baja», «No se pudo dar de baja la sección». |

## Preguntas abiertas

- [x] Avisar del método `put` en `shared/api/client.ts` (§9.3).
- [x] Enmendar S70 en la spec delta según S75.
