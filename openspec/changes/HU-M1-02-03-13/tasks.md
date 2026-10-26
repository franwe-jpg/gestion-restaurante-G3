# Tareas: HU-M1-02-03-13 Modificar, dar de baja y listar productos

- **Issues:** #3 (HU-M1-02), #4 (HU-M1-03) y #18 (HU-M1-13) · **Rama:** `feature/HU-M1-02-03-modificar-baja-plato` · **Entrada:** `proposal.md`, `specs/carta-productos/spec.md` (S24, S25, S29), `design.md` (E1 a E22).
- Las Fases 1 a 8 (HU-M1-02 y HU-M1-03) están hechas y commiteadas en el PR #180 (commits `90f9de7` a `db08090`). Las Fases 9 a 16 son de HU-M1-13 y se agregan al mismo PR.
- Strict TDD: la prueba falla primero (404 o 405 de la ruta, función ausente o texto ausente) y recién después se escribe el código. En la extracción pura (E8), la «prueba» es que la suite existente siga verde.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-02-03)` en las Fases 1 a 8 y `(HU-M1-13)` en las Fases 9 a 15; la Fase 16 usa `(HU-M1-02-03-13)`). Tipos permitidos: `feat`, `fix`, `docs`, `test`, `ci`, `chore`. Un solo PR, sin PR encadenados.
- Orden: secuencial, salvo lo marcado como paralelizable.
- Pruebas del backend en `backend/tests/modules/productos/`, con nombres `test_<función>_<caso>`. Pruebas del frontend junto al archivo que prueban.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 1.130 líneas en total: ≈ 930 de HU-M1-02 y HU-M1-03 (medido) + ≈ 200 de HU-M1-13 (≈ 60 de código, ≈ 140 de pruebas) |
| Frontend (cambios estimados) | ≈ 2.130 líneas en total: ≈ 1.550 de HU-M1-02 y HU-M1-03 (medido; ≈ 180 de movimiento en `a64e338`) + ≈ 580 de HU-M1-13 (≈ 260 de código, ≈ 320 de pruebas) |
| 800-line budget risk: | Backend: por encima del punto de control (informativo). Frontend: por encima del punto de control (informativo) |
| Chained PRs recommended: | No |
| Decision needed before apply: | No |
| Chain strategy: | none |
| Estrategia de entrega | `single-pr`: un PR hacia `develop` con 15 commits (8 ya hechos + 7 de HU-M1-13) más 1 commit de `docs` al cierre |

El exceso de ambos lados es informativo: el límite de 800 líneas es un punto de control, no un bloqueo, y una HU nunca se divide en varios PR (AGENTS.md §4). Unas 300 líneas del frontend son la extracción mecánica del formulario (E8), sin cambios de lógica, en su propio commit (commit 4) para revisarlo aparte. Las Fases 9 a 15 se revisan por capa, un commit cada una.

## Fase 1. Backend: consultar un plato (`GET /platos/{id}`)

- [x] **1.1** (Rojo) En `test_router.py`: `test_consultar_plato_existente`, `test_consultar_plato_inexistente_404`, `test_consultar_plato_de_otra_categoria_404` (postre pedido por `/platos/{id}`), `test_consultar_plato_deshabilitado_200`. En `test_service.py`: `test_obtener_producto_existente`, `test_obtener_producto_otra_categoria_error`. Fallan con 404 de la ruta o función ausente. Cubre el requisito «Consultar un plato» y «Plato deshabilitado consultable».
- [x] **1.2** (Verde) `repository.obtener_producto(db, categoria, producto_id)` (E5). `service.obtener_producto` y `_obtener_de_categoria` con el mensaje «El producto {id} no existe». `router`: `GET /platos/{producto_id}` delegando al `service`, con `PlatoCrear.CATEGORIA`. Sin cambios en `models` ni migraciones.
- [x] **1.3** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`.
- [x] **1.4** Commit 1: `feat: agrega la consulta de un plato con GET /platos/{id} (HU-M1-02-03)`. Rollback: revertir el commit.

## Fase 2. Backend: modificar un plato (`PUT /platos/{id}`) (depende de la Fase 1)

- [x] **2.1** (Rojo) En `test_schemas.py`: `test_plato_modificar_*` parametrizados: hereda reglas y mensajes de `PlatoCrear`; `estado` opcional; `estado` `ANULADO` da error; `quitar_imagen` estricto (`"si"` da error); `categoria` desconocida da error.
- [x] **2.2** (Rojo) En `test_router.py`, un escenario por criterio (CA 1 a 5 de HU-M1-02): `test_modificar_plato_datos_validos`, `test_modificar_plato_mismo_nombre_200`, `test_modificar_plato_ingredientes_y_etiquetas`, `test_modificar_plato_imagen_conservada`, `test_modificar_plato_imagen_reemplazada` (archivo anterior fuera de `MEDIA_DIR`, 404 en `/media`), `test_modificar_plato_imagen_quitada`, `test_modificar_plato_quitar_y_reemplazar_422`, `test_modificar_plato_nombre_invalido_422`, `test_modificar_plato_precio_invalido_422`, `test_modificar_plato_ingredientes_invalidos_422`, `test_modificar_plato_etiquetas_y_descripcion_invalidas_422`, `test_modificar_plato_imagen_invalida_422` (conserva imagen, sin archivo nuevo), `test_modificar_plato_nombre_duplicado_409` (incluye uno deshabilitado), `test_modificar_plato_mismo_nombre_que_postre_200`, `test_modificar_plato_seccion_inexistente_404`, `test_modificar_plato_seccion_deshabilitada_409`, `test_modificar_plato_inexistente_404`, `test_modificar_plato_reactivar_200` (vuelve a `GET /api/v1/productos`), `test_modificar_plato_reactivar_en_seccion_deshabilitada_200`, `test_modificar_plato_estado_invalido_422`. Fallan con 405.
- [x] **2.3** (Rojo) En `test_service.py`: `test_modificar_producto_orden_de_validacion` (E6), `test_modificar_producto_seccion_sin_cambio_no_se_valida` (S19), `test_modificar_producto_nombre_propio_permitido`, `test_modificar_producto_commit_fallido_conserva_imagen_anterior` (`monkeypatch` sobre `db.commit`: conserva datos e imagen anterior, borra el archivo nuevo; E4), `test_modificar_producto_error_al_borrar_anterior_se_ignora` (E3). Atomicidad: nada se guarda si algo falla.
- [x] **2.4** (Rojo) Facturas (S18, CA 4): `test_modificar_plato_conserva_identidad_y_filas_relacionadas`, con una tabla de prueba con clave foránea a `productos.id`, creada solo en la base de la prueba.
- [x] **2.5** (Verde) `schemas.py`: `ProductoModificar(ProductoCrear)` y `PlatoModificar(PlatoCrear, ProductoModificar)` (E2; respaldo documentado en el diseño si la herencia no resuelve). `repository.existe_producto(..., excluir_id=None)`. `service`: `modificar_producto`, `_validar_imagen_pedida`, `_validar_seccion_si_cambia`, `_validar_producto_libre(..., excluir_id)`, `_aplicar_cambios`, `_borrar_anterior`; `_guardar_producto` recibe `archivo_nuevo` explícito (E4) y el alta pasa su `archivo`. `router`: `PUT /platos/{producto_id}` con `datos_de(PlatoModificar)` e `leer_imagen`. Funciones de hasta 50 líneas y complejidad 10.
- [x] **2.6** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %). Las pruebas del alta de platos y postres siguen verdes (regresión).
- [x] **2.7** Commit 2: `feat: permite modificar un plato con PUT /platos/{id} (HU-M1-02-03)`. Rollback: revertir el commit; no hay cambios de esquema.

## Fase 3. Backend: dar de baja un plato (`POST /platos/{id}/baja`) (depende de la Fase 1; paralelizable con la Fase 2 si se separan los archivos de prueba, pero ambas tocan `service.py` y `router.py`: se recomienda secuencial)

- [x] **3.1** (Rojo) En `test_router.py` (CA 1 a 4 de HU-M1-03): `test_dar_de_baja_plato_200` (deja de figurar en `GET /api/v1/productos`), `test_dar_de_baja_plato_ya_deshabilitado_409`, `test_dar_de_baja_plato_inexistente_404`, `test_dar_de_baja_plato_de_postre_404`, `test_dar_de_baja_plato_usado_por_otra_tabla_200` (la fila relacionada sigue intacta), `test_dar_de_baja_plato_conserva_datos_e_imagen`, `test_reactivar_plato_tras_la_baja_200`. En `test_service.py`: `test_dar_de_baja_producto_solo_cambia_estado`, `test_dar_de_baja_producto_ya_deshabilitado_conflicto`. Fallan con 404 o 405.
- [x] **3.2** (Verde) `service.dar_de_baja_producto` (404, 409 «El producto ya está deshabilitado», `estado = DESHABILITADO` + `commit`, sin tocar archivos ni otras filas). `router`: función explícita `POST /platos/{producto_id}/baja` sin cuerpo (E1, D-24).
- [x] **3.3** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`.
- [x] **3.4** Commit 3: `feat: permite dar de baja un plato con POST /platos/{id}/baja (HU-M1-02-03)`. Rollback: revertir el commit.

## Fase 4. Frontend: extraer `FormularioProducto` (E8) (independiente del backend; paralelizable con las Fases 1 a 3)

- [x] **4.1** Sin prueba nueva: la suite existente de `ProductoNuevoPage`, `useFormularioProducto` y `validarProducto` es la «prueba» y debe estar en verde antes y después.
- [x] **4.2** Mover los campos, el aviso, los botones y la imagen de `pages/ProductoNuevoPage.tsx` a `components/FormularioProducto.tsx` (componente de presentación). `ProductoNuevoPage` queda como contenedor. Sin cambios de lógica, de textos ni de comportamiento (≈ 300 líneas movidas).
- [x] **4.3** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **4.4** Commit 4 (solo extracción): `chore: extrae el formulario de alta de productos a un componente (HU-M1-02-03)`. (`chore:` porque AGENTS.md §8 no incluye `refactor`). Rollback: revertir el commit.

## Fase 5. Frontend: capa de datos y código compartido (depende de la Fase 4; la consulta contra el backend real depende de las Fases 1 a 3)

- [x] **5.1** (Rojo) `frontend/src/shared/api/client.test.ts`: `putFormulario` envía `PUT` con `FormData` y sin `Content-Type`; `urlDelBackend(ruta)` arma la URL absoluta con la URL base por defecto y con `VITE_API_URL`. `fetch` simulado, como las pruebas existentes.
- [x] **5.2** (Verde) **Código compartido (avisar al equipo, AGENTS.md §9.3).** En `frontend/src/shared/api/client.ts`: agregar `putFormulario<T>(endpoint, formulario)` (como `postFormulario`, con `PUT`) y exportar `urlDelBackend(ruta)`. `get`, `post` y `postFormulario` no cambian; la baja reutiliza `post` (E1).
- [x] **5.3** (Rojo) `validarProducto.test.ts`: `precioParaEditar('12500.50')` da `'12.500,50'` y `convertirPrecio(precioParaEditar(x)) === x`. `api.test.ts` con `vi.mock` del cliente: `obtenerProducto('PLATO', id)` (GET), `modificarProducto('PLATO', id, datos, imagen)` (una sola solicitud multipart `PUT` con `datos` e `imagen`), `darDeBajaProducto('PLATO', id)` (`POST .../baja` con `{}`) y `urlDeImagen` (relativa a absoluta, `null` a `null`).
- [x] **5.4** (Verde) `types.ts`: `ProductoModificar extends ProductoCrear { estado; quitar_imagen }`. `categorias.ts`: `CategoriaEdicion`, `ConfiguracionEdicion` y `CONFIGURACIONES_EDICION` con los textos de plato (E10). `api.ts`: `ENDPOINTS_ALTA` pasa a `ENDPOINTS` y se agregan las tres funciones y `urlDeImagen` (E12). `validarProducto.ts`: `precioParaEditar`.
- [x] **5.5** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **5.6** Commit 5: `feat: agrega la capa de datos para modificar y dar de baja un plato (HU-M1-02-03)`. Rollback: revertir el commit.

## Fase 6. Frontend: `hooks` de edición y baja (depende de la Fase 5)

- [x] **6.1** (Rojo) `useFormularioProducto.test.ts`: la API actual (`categoria`, `onCreado`) no cambia. Pruebas de `useCampos(inicial?)` (valores iniciales) y `useEnvioProducto(opciones)`.
- [x] **6.2** (Rojo) `useEdicionProducto.test.ts` con `renderHook` y `vi.mock('../api')`: datos iniciales cargados, `estado` editable, `quitarImagen` en `quitar_imagen`, chips quitados y agregados enviados como listas, 409 muestra «El plato ya está registrado» bajo el nombre y conserva los datos, sin envío si la validación local falla (precio `abc`, nombre vacío), `onGuardado` tras el éxito.
- [x] **6.3** (Rojo) `useBajaProducto.test.ts` con `useConfirm` simulado: confirmar envía `darDeBajaProducto` y llama `onDadoDeBaja`; cancelar no envía nada.
- [x] **6.4** (Verde) `useFormularioProducto.ts`: exportar `useCampos` y `useEnvioProducto` sin romper su API (E9). Crear `useEdicionProducto.ts` y `useBajaProducto.ts`, cada uno de menos de 50 líneas y complejidad 10.
- [x] **6.5** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **6.6** Commit 6: `feat: agrega los hooks de edición y baja de productos (HU-M1-02-03)`. Rollback: revertir el commit.

## Fase 7. Frontend: pantalla de edición, selector de imagen y ruta (depende de la Fase 6)

- [x] **7.1** (Rojo) `SelectorImagen.test.tsx`: con `imagenActual` muestra la imagen y «Quitar» llama `onQuitarActual`; sin `imagenActual` no cambia el comportamiento actual.
- [x] **7.2** (Rojo) `ProductoEditarPage.test.tsx` con `MemoryRouter`, un escenario por criterio: formulario cargado («Editar plato», «Guardar cambios»), guardado con aviso y regreso a «Productos» (una sola solicitud `PUT`), cambios de chips e imagen quitada, errores locales sin envío, 409 bajo el nombre, `Switch` «Habilitado» solo en edición, reactivación desde el formulario, «Dar de baja» con `ConfirmDialog` (confirmar envía `POST .../baja`, avisa y vuelve), cancelar sin solicitud, botón oculto y `Switch` apagado si el plato está `DESHABILITADO`, `:id` inválido o 404 muestra «El plato no existe.» (el inválido sin llamar a la API), sección deshabilitada en el `Select` con el sufijo « (deshabilitada)» (E11).
- [x] **7.3** (Rojo) Regresión del alta en `ProductoNuevoPage.test.tsx`: «Nuevo plato» y «Nuevo postre» conservan títulos, botones y el estado fijo «Habilitado», sin interruptor; sigue enviándose una sola solicitud multipart `POST`.
- [x] **7.4** (Rojo) `App.test.tsx`: `/productos/platos/:id/editar` muestra la pantalla de edición.
- [x] **7.5** (Verde) `SelectorImagen.tsx` con `imagenActual?` y `onQuitarActual?` (E12). `FormularioProducto` con `modo`, `acciones` e `imagenActual`; `Switch` solo en edición. `ProductoEditarPage.tsx` (contenedor con `useApi(obtenerProducto)` y `useApi(listarSeccionesHabilitadas)`, `seccionesParaEditar`, botón `danger` «Dar de baja» solo si está `HABILITADO`; E11, E13). `ProductoNuevoPage` sigue igual.
- [x] **7.6** (Verde) **Código compartido (avisar al equipo, AGENTS.md §9.3).** En `frontend/src/App.tsx`: agregar la ruta `productos/platos/:id/editar` con `ProductoEditarPage` en `lazy` (D-19). Sin impacto en otros módulos.
- [x] **7.7** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] **7.8** Commit 7: `feat: agrega la pantalla para editar y dar de baja un plato (HU-M1-02-03)`. Rollback: revertir el commit; el alta sigue funcionando.

## Fase 8. Cierre

- [x] **8.1** Backend desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest` en verde, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` en verde, cobertura ≥ 60 % (AGENTS.md §7). No bajar umbrales ni desactivar reglas.
- [x] **8.2** `alembic heads` desde `backend/` muestra una sola cabeza y no cambió (sin migración nueva).
- [x] **8.3** Comprobar que cada escenario de la spec (requisitos de HU-M1-02 CA 1 a 5 y HU-M1-03 CA 1 a 4, atomicidad y regresión del alta) tiene una prueba que pasa.
- [x] **8.4** Redactar las notas del PR (plantilla `.github/pull_request_template.md`, `Closes #3` y `Closes #4`, hacia `develop`):
  - Supuestos a validar por el equipo: S15 a S25 (en especial S24 y S25), y con M2 la baja de un plato incluido en un menú vigente (S20).
  - Aviso de los cambios en código compartido (§9.3): `frontend/src/shared/api/client.ts` (`putFormulario` y `urlDelBackend`) y `frontend/src/App.tsx` (ruta de edición).
  - Diferencia con la maqueta: el botón «Dar de baja» está en la pantalla de edición y no como ícono en la lista, que es de HU-M1-13 (E13).
  - Tamaño: frontend ≈ 1.130 líneas contra el punto de control de 800 (informativo); ≈ 300 son la extracción mecánica del commit 4.
- [x] **8.5** Commit 8 solo si hay artefactos de SDD por versionar: `docs: agrega los artefactos de SDD de HU-M1-02-03 (HU-M1-02-03)`.

## Fase 9. Backend: esquemas de la lista (HU-M1-13) (independiente de las Fases 10 y 11; paralelizable con las Fases 12 y 13 del frontend)

- [x] **9.1** (Rojo) En `test_schemas.py`: `test_filtro_productos_estado_por_defecto_habilitado`, `test_filtro_productos_estado_elegido` (parametrizado: `HABILITADO` a `Estado.HABILITADO`, `DESHABILITADO` a `Estado.DESHABILITADO`, `TODOS` a `None`), `test_filtro_productos_estado_invalido_error` (`ANULADO`), `test_filtro_productos_hereda_limites_de_paginacion` (`limit` 0 y 101), `test_producto_listado_extiende_seleccionable` (trae `id`, `nombre`, `categoria`, `seccion`, `precio`, `etiquetas`, `estado`; `precio` se serializa `"12500.50"`). Fallan por clase ausente. Cubre «Estado inválido en el listado» y el contrato de E14 y E15.
- [x] **9.2** (Verde) `schemas.py`: `FiltroEstadoProducto(StrEnum)`, `FiltroProductos(ParametrosPaginacion)` con `estado` y `estado_elegido()`, y `ProductoListado(ProductoSeleccionable)` con `precio`, `etiquetas` y `estado`. `ProductoSeleccionable` no cambia. No se agrega `TODOS` a `Estado` del `shared`.
- [x] **9.3** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`.
- [x] **9.4** Commit 9: `feat: agrega el filtro de estado y el esquema de listado de productos (HU-M1-13)`. Rollback: revertir el commit.

## Fase 10. Backend: `repository` y `service` de la lista (depende de la Fase 9)

- [x] **10.1** (Rojo) En `test_service.py`: `test_listar_productos_por_defecto_solo_habilitados` (la llamada actual `listar_productos(db, ParametrosPaginacion())` conserva ítems, orden y total), `test_listar_productos_estado_habilitado`, `test_listar_productos_estado_deshabilitado`, `test_listar_productos_estado_todos_incluye_ambos` (cada ítem con su `estado`), `test_listar_productos_total_cuenta_solo_el_filtro`, `test_listar_productos_items_con_precio_etiquetas_y_estado`, `test_listar_productos_orden_por_nombre_e_id`, `test_listar_productos_sin_productos_vacio` (`items` vacío y `total` 0), `test_listar_productos_pagina_con_offset`. Fallan por parámetro `estado` ausente o campos ausentes.
- [x] **10.2** (Verde) `repository.listar_productos_habilitados` pasa a `listar_productos(db, parametros, estado: Estado | None)` con consulta parametrizada y el mismo orden `nombre, id`; el total cuenta solo el filtro elegido (E16). `service.listar_productos(db, parametros, estado=Estado.HABILITADO)` arma cada ítem con `_a_listado` y devuelve `Pagina[ProductoListado]`. Actualizar los llamadores del nombre viejo del `repository`. Funciones de hasta 50 líneas y complejidad 10.
- [x] **10.3** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`.
- [x] **10.4** Commit 10: `feat: filtra por estado el listado de productos en el service (HU-M1-13)`. Rollback: revertir el commit.

## Fase 11. Backend: `router` de la lista y regresión (depende de la Fase 10)

- [x] **11.1** (Rojo) En `test_router.py`, un escenario por criterio de HU-M1-13: `test_listar_productos_items_con_detalle` (CA 1: las tres categorías con `id`, `nombre`, `categoria`, `precio`, `etiquetas` y `estado`), `test_listar_productos_sin_productos_estado_todos_vacio` (CA 2: 200, `items` vacío, `total` 0), `test_listar_productos_sin_estado_usa_habilitado` (CA 3), `test_listar_productos_estado_habilitado_solo_habilitados` (CA 4), `test_listar_productos_estado_deshabilitado_solo_dados_de_baja` (CA 5, incluye el plato dado de baja con `POST .../baja`), `test_listar_productos_estado_todos_con_su_estado` (CA 6), `test_listar_productos_estado_invalido_422` (`ANULADO`, con `{"detalle": ...}`), `test_listar_productos_limit_fuera_de_rango_422` (0 y 101), `test_listar_productos_segunda_pagina_con_filtro` (3 productos, `limit=2&offset=2`), `test_listar_productos_precio_como_texto` (`"12500.50"`), `test_listar_productos_no_modifica_datos`. Fallan con 422 de `estado` desconocido o con campos ausentes.
- [x] **11.2** (Regresión) `test_listar_productos_sin_parametros_conserva_items_orden_y_total` y la revisión de las pruebas actuales de `GET /api/v1/productos`: pasan sin cambios (ninguna compara los ítems completos). Sin `estado`, solo figuran los habilitados, con los mismos ítems, orden y total; solo se agregan campos. Las pruebas de `/secciones` y del alta, modificación y baja siguen verdes.
- [x] **11.3** (Verde) `router.listar_productos` recibe `FiltroProductos` con `Depends()` y delega: `service.listar_productos(db, filtro, filtro.estado_elegido())`, con `response_model=Pagina[ProductoListado]` (E16). Sin lógica en el `router`. Sin cambios en `models`, `shared/` ni migraciones.
- [x] **11.4** Verificar desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %). `alembic heads` muestra una sola cabeza, sin cambios.
- [x] **11.5** Commit 11: `feat: agrega el filtro estado a GET /productos (HU-M1-13)`. Rollback: revertir el commit; el valor por defecto conserva la respuesta anterior.

## Fase 12. Frontend: tipos, capa de datos y filtros de la lista (HU-M1-13) (independiente del backend; paralelizable con las Fases 9 a 11; la consulta contra el backend real depende de la Fase 11)

- [x] **12.1** (Rojo) `api.test.ts` con `vi.mock` del cliente: `listarProductos('HABILITADO', 50, 0)` pide `GET /productos?estado=HABILITADO&limit=50&offset=0`; `listarProductos('TODOS', 50, 100)` arma los tres parámetros; `listarProductosHabilitados()` sigue sin enviar `estado` (regresión del selector de `SeccionesTab`). `categorias.test.ts`: `ETIQUETAS_CATEGORIA` da «Plato», «Postre», «Bebida» y «Menú del día»; `esCategoriaEdicion('PLATO')` es `true` y `'POSTRE'` y `'BEBIDA'` son `false`. `filtrosEstado.test.ts`: `FILTROS_ESTADO` trae Habilitados, Deshabilitados y Todos con sus textos de vacío (E20). Fallan por funciones y constantes ausentes.
- [x] **12.2** (Verde) `types.ts`: `FiltroEstado = Estado | 'TODOS'` y `ProductoListado extends ProductoSeleccionable { precio; etiquetas; estado }`. `categorias.ts`: `ETIQUETAS_CATEGORIA` y `esCategoriaEdicion`. `api.ts`: `listarProductos(estado, limit, offset)`; `listarProductosHabilitados` no cambia. `components/filtrosEstado.ts` (nuevo): `FILTROS_ESTADO` con valor, etiqueta y textos del vacío («No hay productos habilitados», «No hay productos deshabilitados», «Todavía no hay productos»; descripciones del diseño, español neutro).
- [x] **12.3** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **12.4** Commit 12: `feat: agrega la capa de datos y los filtros de la lista de productos (HU-M1-13)`. Rollback: revertir el commit.

## Fase 13. Frontend: `ProductosTabla` (presentación) (depende de la Fase 12)

- [x] **13.1** (Rojo) `ProductosTabla.test.tsx` con `MemoryRouter`, un escenario por criterio: muestra nombre, categoría legible (Plato, Postre, Bebida), sección, precio con `formatearMoneda` y un `Badge` por etiqueta (CA 1; «—» si no hay etiquetas); columna Estado con insignia «Habilitado» o «Deshabilitado» con cualquier filtro, también «Todos» (CA 6); lista vacía sin carga ni error muestra solo el `EmptyState` del filtro, sin encabezados de tabla (CA 2; los tres filtros); en carga y error usa los estados de `DataTable` con «Reintentar»; solo se ven los productos recibidos (CA 4 y CA 5 en pantalla); filas de menús del día ausentes sin error (S26). Fallan por componente ausente.
- [x] **13.2** (Verde) `components/ProductosTabla.tsx` (presentación, sin llamadas a la API): `DataTable`, `Badge` y `EmptyState` con las columnas del diseño (E19) y la columna de acciones recibida como `renderAcciones` o `AccionesProducto` ya conectado en la Fase 14. Funciones de hasta 50 líneas y complejidad 10. Sin `any`.
- [x] **13.3** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] **13.4** Commit 13: `feat: agrega la tabla de productos con su estado y su filtro vacío (HU-M1-13)`. Rollback: revertir el commit; no se usa todavía en ninguna página.

## Fase 14. Frontend: `AccionesProducto`, baja desde la fila y texto de confirmación E13 (depende de la Fase 13)

- [x] **14.1** (Rojo) `AccionesProducto.test.tsx` con `MemoryRouter`, `vi.mock('../api')` y `useConfirm` simulado, un escenario por criterio: fila `PLATO` ofrece «Editar «{nombre}»» como `Link` a `/productos/platos/:id/editar` con el `id` del plato (S27); fila `PLATO` habilitada ofrece «Dar de baja «{nombre}»»; confirmar envía `darDeBajaProducto('PLATO', id)`, avisa el éxito y llama `onDadoDeBaja` (S28); cancelar no envía nada ni llama `onDadoDeBaja`; fila `PLATO` deshabilitada ofrece «Editar» y no «Dar de baja»; filas `POSTRE` y `BEBIDA` no ofrecen ninguna acción. Fallan por componente ausente.
- [x] **14.2** (Rojo) Texto E13: en `useBajaProducto.test.ts` y `ProductoEditarPage.test.tsx`, el diálogo muestra «El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.» (sin voseo). Falla por el texto anterior («desde esta pantalla»). Ajustar solo los textos esperados de las pruebas existentes que lo repiten.
- [x] **14.3** (Verde) `categorias.ts`: `bajaDescripcion` de `CONFIGURACIONES_EDICION.PLATO` pasa al texto de E13. `components/AccionesProducto.tsx`: un componente por fila que usa `useBajaProducto` (que ya recibe el producto al crearse) y la guarda `esCategoriaEdicion`; conectarlo a `ProductosTabla` (E17, E21). Sin tocar `useBajaProducto` ni la pantalla de edición.
- [x] **14.4** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`. Las pruebas de `ProductoEditarPage` siguen verdes (regresión de la baja desde la edición).
- [x] **14.5** Commit 14: `feat: agrega editar y dar de baja desde la fila de un producto (HU-M1-13)`. Rollback: revertir el commit; el texto vuelve al de la pantalla de edición.

## Fase 15. Frontend: `ProductosTab` y `ProductosPage` (depende de la Fase 14; la prueba contra el backend real depende de la Fase 11)

- [x] **15.1** (Rojo) `ProductosTab.test.tsx` con `MemoryRouter`, `vi.mock('../api')` y `useConfirm` simulado, un escenario por criterio: primera consulta con `listarProductos('HABILITADO', 50, 0)` y el `Select` («Filtrar por estado») en «Habilitados» (CA 3); el `Select` ofrece «Habilitados», «Deshabilitados» y «Todos»; elegir «Deshabilitados» o «Todos» consulta de nuevo con `offset` 0, también desde la segunda página (CA 5, CA 6); un filtro sin productos muestra su mensaje de vacío (CA 2); `Pagination` solo si hay más de una página (50 por página, D-27); baja desde la fila recarga la lista; si la página queda vacía y no es la primera, retrocede una página (E22); botones «Nuevo plato» y «Nuevo postre» navegan a sus rutas; error de carga con «Reintentar». Fallan por componente ausente.
- [x] **15.2** (Rojo) `ProductosPage.test.tsx`: la pestaña «Productos» muestra la lista y ya no el `EmptyState` de «pendiente»; los botones «Nuevo plato» y «Nuevo postre» se conservan; la pestaña «Secciones» (`SeccionesTab` y su selector de productos con `listarProductosHabilitados`, sin `estado`) sigue igual. Regresión de `SeccionesTab`: sus pruebas existentes pasan sin cambios. Falla por el `EmptyState` actual.
- [x] **15.3** (Verde) `components/ProductosTab.tsx` (contenedor: `useApi` con clave `productos-${estado}-${offset}`, `LIMITE_PAGINA = 50`, `usePaginacion`, `TableToolbar` con `Select`, `Pagination`, botones de alta; E17, E18, E22). `pages/ProductosPage.tsx`: `ProductosPendientes` se reemplaza por `ProductosTab`. Sin cambios en `shared/` ni en el módulo de M2.
- [x] **15.4** Verificar desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %). Los componentes de `SeccionesTab` y del alta no cambian.
- [x] **15.5** Commit 15: `feat: reemplaza el pendiente de Productos por la lista con filtro de estado (HU-M1-13)`. Rollback: revertir el commit; la pestaña vuelve al `EmptyState` de «pendiente».

## Fase 16. Cierre de HU-M1-13

- [x] **16.1** CI completa de ambos lados. Backend desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest` en verde, cobertura ≥ 70 %. Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` en verde, cobertura ≥ 60 %. No bajar umbrales ni desactivar reglas.
- [x] **16.2** Regresión global: las pruebas de alta, modificación y baja de platos, `SeccionesTab` y los consumidores existentes de `GET /api/v1/productos` (`listarProductosHabilitados`) pasan sin cambios. `alembic heads` muestra una sola cabeza, sin migración nueva.
- [x] **16.3** Comprobar que cada escenario de la spec de HU-M1-13 (CA 1 a 6, estado inválido, paginación, editar y baja desde la fila, regresión del selector) tiene una prueba que pasa (ver la trazabilidad).
- [x] **16.4** Actualizar los artefactos de SDD con la carpeta renombrada `openspec/changes/HU-M1-02-03-13/` (antes `HU-M1-02-03`): referencias cruzadas, `apply-progress.md` (Fases 9 a 16) y `verify-report.md` con las cifras de tamaño medidas. Alinear la spec con E14, E13 y E21 según las preguntas abiertas del diseño.
- [x] **16.5** Actualizar las notas del PR #180 (plantilla `.github/pull_request_template.md`, hacia `develop`): agregar `Closes #18` a `Closes #3` y `Closes #4`. Con el equipo: S29 (`estado` por defecto `HABILITADO` en `/productos` y «todas» en `/secciones`, E14), S20 y S26 con M2. Diferencias con la maqueta: filtro con `Select` en lugar de botones segmentados (E18); sin búsqueda, sin filtro de categoría y sin miniatura. Avisar los cambios en código compartido (§9.3), que no cambian respecto de la Fase 8. Tamaño: backend ≈ 1.130 y frontend ≈ 2.130 líneas contra el punto de control de 800 (informativo; una HU nunca se divide en varios PR).
- [x] **16.6** Commit 16 (artefactos de SDD, incluido el renombrado de la carpeta): `docs: actualiza los artefactos de SDD de HU-M1-02-03-13 (HU-M1-02-03-13)`. Rollback: revertir el commit.

## Trazabilidad

| Requisito de la spec | Tareas |
| --- | --- |
| Consultar un plato; plato deshabilitado consultable | 1.1, 1.2, 7.2 |
| Modificar los datos (HU-M1-02 CA 1) | 2.2, 2.5, 6.2, 7.2 |
| Ingredientes, etiquetas e imagen (CA 2) | 2.2, 2.3, 6.2, 7.1, 7.2 |
| Reglas de validación del alta (CA 3) | 2.1, 2.2, 6.2, 7.2 |
| Atomicidad de la modificación | 2.3, 2.5 |
| Las facturas conservan el precio (CA 4, S18) | 2.4 |
| Reactivar un plato deshabilitado (CA 5) | 2.2, 6.2, 7.2 |
| Dar de baja (HU-M1-03 CA 1) | 3.1, 3.2, 6.3, 7.2 |
| Cancelar la baja (CA 2) | 6.3, 7.2 |
| La baja conserva los datos (CA 3, S18) | 3.1 |
| Reactivar un plato dado de baja (CA 4) | 3.1, 7.2 |
| El alta de platos y postres no cambia | 2.6, 4.1 a 4.3, 6.1, 7.3 |
| Código compartido (`client.ts`, `App.tsx`) | 5.1, 5.2, 7.4, 7.6, 8.4 |
| Reactivar un plato dado de baja (HU-M1-03 CA 4, reescrito: filtro Deshabilitados, editar desde la fila y reactivar) | 3.1, 7.2, 11.1 (`DESHABILITADO` en la API), 13.1, 14.1 (editar en fila deshabilitada), 15.1 |
| Listar productos con su detalle (HU-M1-13 CA 1) | 9.1, 10.1, 11.1, 12.1, 13.1, 15.2 |
| Lista vacía (HU-M1-13 CA 2) | 10.1, 11.1, 12.1, 13.1, 15.1 |
| Filtro por defecto Habilitados (HU-M1-13 CA 3) | 9.1, 11.1, 12.1, 15.1 |
| Filtrar por Habilitados (HU-M1-13 CA 4) | 10.1, 11.1, 13.1, 15.1 |
| Filtrar por Deshabilitados (HU-M1-13 CA 5) | 10.1, 11.1, 13.1, 15.1 |
| Filtrar por Todos con su estado (HU-M1-13 CA 6) | 10.1, 11.1, 13.1, 15.1 |
| Estado inválido en el listado (S29) | 9.1, 11.1 |
| Paginación del listado (D-27, E22) | 10.1, 11.1, 15.1 |
| Enlace de editar solo en platos (S27) | 12.1, 14.1 |
| Dar de baja desde la fila (S28, E13) y texto de confirmación | 14.1, 14.2, 15.1 |
| El selector de productos de secciones no cambia (regresión) | 10.1, 11.2, 12.1, 15.2, 16.2 |
