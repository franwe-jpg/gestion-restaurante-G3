# Tareas: HU-M1-02-03 Modificar y dar de baja un plato

- **Issues:** #3 (HU-M1-02) y #4 (HU-M1-03) · **Rama:** `feature/HU-M1-02-03-modificar-baja-plato` · **Entrada:** `proposal.md`, `specs/carta-productos/spec.md` (S24, S25), `design.md` (E1 a E13).
- Strict TDD: la prueba falla primero (404 o 405 de la ruta, función ausente o texto ausente) y recién después se escribe el código. En la extracción pura (E8), la «prueba» es que la suite existente siga verde.
- Una unidad de trabajo = un commit (Conventional Commits, en español, con `(HU-M1-02-03)`). Un solo PR, sin PR encadenados.
- Orden: secuencial, salvo lo marcado como paralelizable.
- Pruebas del backend en `backend/tests/modules/productos/`, con nombres `test_<función>_<caso>`. Pruebas del frontend junto al archivo que prueban.

## Pronóstico de carga de revisión

| Campo | Valor |
| --- | --- |
| Backend (cambios estimados) | ≈ 540 líneas (≈ 140 de código, ≈ 400 de pruebas) |
| Frontend (cambios estimados) | ≈ 1.130 líneas (≈ 690 de código, ≈ 440 de pruebas; ≈ 300 del código son la extracción mecánica de `FormularioProducto`, E8) |
| 800-line budget risk: | Backend: Low. Frontend: por encima del punto de control (informativo) |
| Chained PRs recommended: | No |
| Decision needed before apply: | No |
| Chain strategy: | none |
| Estrategia de entrega | `single-pr`: un PR hacia `develop` con 8 commits |

El exceso del frontend es informativo: el límite de 800 líneas es un punto de control, no un bloqueo, y una HU nunca se divide en varios PR (AGENTS.md §4). Unas 300 líneas son la extracción mecánica del formulario (E8), sin cambios de lógica, en su propio commit (commit 4) para revisarlo aparte.

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
