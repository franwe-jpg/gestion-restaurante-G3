```yaml
schema: gentle-ai.verify-result/v1
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 32/32
scenarios: 182/182
evidence_revision: sha256:02a71dbf6bd09dc7c759f2b867c609c40467e39ef9cb676743025eedcdbb456a
test_command: "backend: pytest (con ruff, lint-imports) | frontend: npm run test:coverage"
test_exit_code: 0
test_output_hash: sha256:3c8928f12462f64da7a9f82ae704593ee8f2a49ec6b81c966f7c3e3647713ab6
build_command: "frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
build_exit_code: 0
build_output_hash: sha256:c4e1cca7085f605fe41464f876b86cb1da9e47f7d5659ec44daa05f04c480713
```

# Informe de verificación: HU-M1-07-08-09 (HU-M1-07, HU-M1-08 y HU-M1-09)

- **Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 2 WARNING, 4 SUGGESTION)
- **Cambio:** `HU-M1-07-08-09` · **Rama:** `feature/HU-M1-07-08-09-bebida` (4 commits sobre `feature/archiva-sdd-m1`: `a23c73e`, `e7963c4`, `1a11a61`, `3be3178`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** HU-M1-07 (#10) CA 1 a 14, HU-M1-08 (#11) CA 1 a 5 y HU-M1-09 (#12) CA 1 a 4. Spec: 32 requisitos (15 agregados, 17 modificados) y 182 escenarios (56 y 126).
- `evidence_revision` es el SHA-256 de `git diff feature/archiva-sdd-m1...HEAD` (HEAD `3be3178`). `test_output_hash` y `build_output_hash` son el SHA-256 de las últimas tres líneas de la salida de `pytest -q` y de `npm run ... build` de esta verificación.

## 1. Completitud de tareas

`tasks.md`: 33 tareas marcadas `[x]`, `grep -c "^- \[ \]"` = 0. Coinciden con los commits de `apply-progress.md` (Fase 1 `a23c73e`, Fase 2 `e7963c4`, Fase 3 `1a11a61`, Fase 4 `3be3178`). Árbol de trabajo limpio al empezar.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `69 files already formatted`, `Contracts: 10 kept, 0 broken`, `413 passed`, cobertura 99,32 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: lint con 0 errores y 0 advertencias, Prettier correcto, `tsc` correcto, 27 archivos y `316 passed`, cobertura 72,38 % sentencias (367/507) / 69,37 % ramas / 69,23 % funciones / 74,57 % líneas (umbral 60 %), build correcto |
| Migraciones | `alembic heads` | Una sola cabeza, `c4e6a8b0d2f4`; sin archivos nuevos en `backend/alembic/` |

**Cobertura del frontend idéntica (72,38 %): confirmada y explicada.** Se corrió `npm run test:coverage` sobre `feature/archiva-sdd-m1` (263 pruebas): mismo 367/507 sentencias, 222/320 ramas, 171/247 funciones y 352/472 líneas. `frontend/vite.config.ts` limita `coverage.include` a `src/App.tsx` y `src/shared/**`, de modo que ningún archivo de `modules/productos/` entra en la métrica. Las +53 pruebas no pueden moverla, y el umbral del 60 % no mide este cambio (ver SUGGESTION 1). Las rutas nuevas de `App.tsx` son líneas ya cubiertas por el mismo componente `Route`.

## 3. Trazabilidad (requisito y escenario, prueba, resultado)

Archivos: backend `backend/tests/modules/productos/{test_router,test_schemas}.py`; frontend `frontend/src/modules/productos/{api.test.ts,categorias.test.ts}`, `components/{AccionesProducto,ProductosTab,useFormularioProducto}.test.tsx`, `components/validarProducto.test.ts`, `pages/{ProductoNuevoPage,ProductoEditarPage}.test.tsx` y `frontend/src/App.test.tsx`. Las pruebas del alta del backend usan el `fixture` `alta` con id `[bebida]`.

### 3.1 Requisitos agregados (15 requisitos, 56 escenarios)

| Requisito y escenarios | Prueba | Res. |
| --- | --- | --- |
| Contrato de la API: rutas disponibles, error con formato | `test_crear_producto_responde_201_con_la_forma_de_producto_salida[bebida]`, `test_consultar_bebida_existente`, `test_modificar_bebida_datos_validos`, `test_dar_de_baja_bebida_200`; errores `{"detalle"}` en `test_modificar_bebida_nombre_duplicado_409`, `test_bebida_inexistente_404_en_las_tres_operaciones` | OK |
| Crear: alta mínima y completa | `test_crear_producto_responde_201...[bebida]`, `test_crear_producto_completo_con_imagen_devuelve_su_url[bebida]`, `test_crear_bebida_sin_ingredientes_201[ausentes/vacios]` | OK |
| Crear: botón «Nueva bebida», título, alta desde la pantalla | `ProductosTab.test` ««Nueva bebida» lleva al formulario de alta»; `App.test` «monta el formulario de alta de /productos/bebidas/nuevo…»; `ProductoNuevoPage BEBIDA` «muestra el título y las migas…», «da de alta el mínimo, avisa y vuelve al listado (CA 1 y CA 14)», «da de alta el completo…» | OK |
| Nombre único: otra capitalización, deshabilitada | `test_crear_producto_con_nombre_repetido_responde_409[bebida]` (mensaje «La bebida ya está registrada»); `test_modificar_bebida_nombre_duplicado_409` (incluye deshabilitada) | OK |
| Nombre único: igual que un plato o un postre | `test_crear_bebida_con_nombre_de_postre_convive`, `test_modificar_bebida_mismo_nombre_que_plato_200` | OK |
| Consultar: existente, inexistente o de otra categoría, no se consulta como plato ni postre | `test_consultar_bebida_existente`, `test_bebida_inexistente_404_en_las_tres_operaciones`, `test_bebida_con_id_de_postre_404[consultar/modificar/baja]` | OK |
| Consultar: formulario cargado, bebida inexistente en pantalla | `ProductoEditarPage: bebidas` «muestra «Cargando bebida...»», «muestra los datos de la bebida con «Editar bebida»…», «un 404 muestra «La bebida no existe.»»; `App.test` «monta la pantalla de edición de BEBIDA» | OK |
| Modificar datos: cambio válido, mismo nombre, desde la pantalla | `test_modificar_bebida_datos_validos`, `test_modificar_bebida_mismo_nombre_que_plato_200` y regla compartida `test_modificar_plato_mismo_nombre_200`; pantalla: «guarda con la categoría BEBIDA, avisa y vuelve a «Productos»», `api.test` «edición y baja de BEBIDA > modifica con una sola solicitud multipart PUT…» | OK |
| Modificar ingredientes: agregar y quitar, quitar todos, formulario sin ingredientes | `test_modificar_bebida_ingredientes_etiquetas_e_imagen`, `test_modificar_bebida_quita_todos_los_ingredientes_200[ausentes/vacios]`; pantalla: «guarda tras quitar todos los chips de ingredientes (S44)» | OK |
| Modificar imagen: conservada, reemplazada, quitada, quitar y reemplazar (422) | Reemplazada: `test_modificar_bebida_ingredientes_etiquetas_e_imagen`. Resto solo con platos: `test_modificar_plato_imagen_conservada/_quitada/_quitar_y_reemplazar_422` (mismo `service`) | OK (W1) |
| Modificar: cambios en el formulario | Solo con platos: `ProductoEditarPage` «envía los chips cambiados y la imagen quitada» | OK (W2) |
| Reglas del alta en la modificación: precio, ingredientes repetidos, nombre duplicado, mismo nombre que plato o postre | `test_modificar_bebida_datos_invalidos_422[precio-cero, precio-texto, ingredientes-repetidos]`, `test_modificar_bebida_nombre_duplicado_409`, `test_bebida_modificar_hereda_categoria_mensaje_y_tipo_base`, `test_modificar_rechaza_categoria_enviada[BebidaModificar]` | OK |
| Reglas: nombre vacío o largo, etiquetas, descripción, imagen inválida, sección inexistente o deshabilitada | Solo con platos y postres (`test_modificar_plato_*_422`, `..._seccion_inexistente_404`, `..._seccion_deshabilitada_409`); la regla del alta sí tiene `[bebida]` | OK (W1) |
| Reglas: error indicado y 409 en el formulario (edición) | Solo con platos: `ProductoEditarPage` «con errores locales…», «muestra el 409…»; 409 de bebida bajo «Nombre»: `validarProducto.test` y `ProductoNuevoPage BEBIDA` «advierte el 409…» | OK (W2) |
| Atomicidad de la modificación: falla el commit | Solo a nivel de `service`: `test_service.py::test_modificar_producto_commit_fallido_conserva_imagen_anterior` (mismo `service`) | OK (W1) |
| Facturas conservan el precio: identidad | `test_modificar_bebida_conserva_identidad` | OK |
| Reactivar bebida deshabilitada: reactivación | `test_modificar_bebida_reactivar_200` | OK |
| Reactivar: sección deshabilitada, estado inválido | Solo con platos: `test_modificar_plato_reactivar_en_seccion_deshabilitada_200`, `..._estado_invalido_422` | OK (W1) |
| Reactivar desde el formulario | Solo con platos: `ProductoEditarPage` «reactiva un plato deshabilitado…»; bebida: «una bebida deshabilitada no ofrece «Dar de baja» y tiene el interruptor apagado» | OK (W2) |
| Dar de baja: confirmada, ya deshabilitada (409), id inexistente u otra categoría (404) | `test_dar_de_baja_bebida_200`, `test_dar_de_baja_bebida_ya_deshabilitada_409`, `test_bebida_inexistente_404_en_las_tres_operaciones`, `test_bebida_con_id_de_postre_404[baja]` | OK |
| Dar de baja: usada por menú o comanda | `test_dar_de_baja_bebida_usada_por_otra_tabla_200` | OK |
| Dar de baja: desde la pantalla | `ProductoEditarPage: bebidas, errores y baja` «da de baja tras confirmar, avisa y vuelve»; `api.test` «da de baja con POST a /baja y cuerpo vacío» | OK |
| Cancelar la baja | `AccionesProducto: BEBIDA` «al cancelar no envía nada ni notifica» | OK |
| La baja conserva datos y filas relacionadas | `test_dar_de_baja_bebida_conserva_datos_e_imagen`, `test_dar_de_baja_bebida_usada_por_otra_tabla_200` | OK |
| Reactivar tras la baja: consultable, filtro Deshabilitados | `test_dar_de_baja_bebida_conserva_datos_e_imagen` (`GET` con `DESHABILITADO`), `test_reactivar_bebida_tras_la_baja_200` | OK |
| Reactivar tras la baja: pantalla de edición de una bebida deshabilitada | `ProductoEditarPage` «una bebida deshabilitada no ofrece «Dar de baja» y tiene el interruptor apagado» | OK |
| Reactivar desde la lista filtrada | Tramos: `AccionesProducto: BEBIDA` «ofrece editar con un enlace…», `test_reactivar_bebida_tras_la_baja_200`; sin prueba del recorrido unido | OK (W2) |
| Regresión: ingredientes obligatorios en platos y postres | `test_crear_producto_sin_ingredientes_422[ausentes/vacios-plato/postre]`, `test_ingredientes_son_obligatorios_en_platos_y_postres[...]`, `test_plato_modificar_sin_ingredientes_es_invalido`, `test_postre_modificar_exige_ingredientes`, `test_modificar_postre_datos_invalidos_422[sin-ingredientes]`; frontend: `categorias.test` «los ingredientes de PLATO/POSTRE son obligatorios: true», `ProductoNuevoPage` «marca «Ingredientes» con asterisco solo si son obligatorios (S55)» (por categoría) | OK |
| Regresión: pruebas existentes | 413 de backend y 316 de frontend en verde; las de platos y postres no cambian de comportamiento | OK |

### 3.2 Requisitos modificados (17 requisitos, 126 escenarios)

Cada requisito suma las variantes «(bebida)» a las de plato y postre. El backend las cubre con el `fixture` `alta` (id `[bebida]`) y el frontend con `CATEGORIAS` que incluye `BEBIDA` en `ProductoNuevoPage.test` y `useFormularioProducto.test`.

| Requisito (CA) | Pruebas de bebida | Res. |
| --- | --- | --- |
| Campos obligatorios (CA 2) | `test_crear_producto_sin_campos_obligatorios_responde_422_e_indica_el_campo[bebida-nombre/seccion_id/precio]`, `..._sin_seccion_ni_precio_indica_los_dos_campos[bebida]`; `ProductoNuevoPage BEBIDA` «con campos vacíos no envía…(CA 2)», `useFormularioProducto BEBIDA` «con campos vacíos no envía y marca qué falta (CA 2)» | OK |
| Largo del nombre (CA 4) | `test_crear_producto_con_datos_invalidos_responde_422_sin_guardar[bebida-cambios0/1-nombre]`; límite de 100 con números por la regla heredada de `ProductoCrear` | OK |
| Precio válido (CA 5) | `[bebida-cambios2..5-precio]`; `useFormularioProducto BEBIDA` «con un precio inválido no envía (CA 5)», «envía el alta mínima convertida…» (coma convertida) | OK |
| Ingredientes opcionales y sin repetidos (CA 6, S44) | `test_crear_bebida_sin_ingredientes_201[ausentes/vacios]`, `[bebida-cambios6/7-ingredientes]` (repetido y `["  "]`), `test_bebida_crear_acepta_sin_ingredientes[...]`, `test_bebida_crear_rechaza_ingredientes_vacios_o_repetidos[...]`; `ProductoNuevoPage BEBIDA: ingredientes opcionales` «guarda sin ingredientes y los envía como lista vacía (S44)», «rechaza un chip vacío y uno repetido»; `useFormularioProducto BEBIDA` «guarda sin ingredientes…» | OK |
| Descripción opcional (CA 7) | `[bebida-cambios8-descripcion]`; `ProductoNuevoPage BEBIDA` «cuenta los caracteres de la descripción (CA 7)» | OK |
| Sin secciones habilitadas (CA 8) | `ProductoNuevoPage BEBIDA: sin secciones habilitadas` (4 pruebas) | OK |
| Sección habilitada y existente (CA 9) | `test_crear_producto_con_seccion_inexistente_responde_404[bebida]`, `..._deshabilitada_responde_409[bebida]`; `ProductoNuevoPage BEBIDA` «el selector lista solo las secciones habilitadas, por orden (CA 9)» | OK |
| Imagen válida por contenido (CA 10) | `test_crear_producto_con_imagen_invalida_responde_422_y_no_guarda_nada[bebida-extension-falsa/pdf/mas-de-5-mb]`, `test_crear_producto_con_imagen_de_2_mb_la_deja_servida[bebida]`; formulario: `useFormularioProducto BEBIDA` «envía descripción, etiquetas e imagen…» | OK |
| Imagen de archivo o cámara (CA 11) | `ProductoNuevoPage BEBIDA` «ofrece elegir archivo o sacar foto (CA 11)»; vista previa y quitar con el componente de imagen compartido del formulario (mismo código para las tres categorías) | OK |
| HEIC se guarda como JPEG (CA 12) | `test_crear_producto_con_heic_lo_sirve_como_jpeg[bebida]`, `test_crear_producto_ignora_el_nombre_original_de_la_imagen[bebida]` | OK |
| Etiquetas opcionales y sin repetidas (CA 13) | `[bebida-cambios9/10-etiquetas]`; chips en `useFormularioProducto BEBIDA` «envía descripción, etiquetas e imagen…» y el componente compartido `ListaDeTextos` del formulario | OK |
| Alta sin datos opcionales (CA 14) | `test_crear_bebida_sin_ingredientes_201[...]`, `test_crear_producto_con_parte_imagen_vacia_equivale_a_sin_imagen[bebida]`; `ProductoNuevoPage BEBIDA` «da de alta el mínimo… (CA 1 y CA 14)», `useFormularioProducto BEBIDA` «envía el alta mínima convertida… (CA 1 y CA 14)» | OK |
| Estado asignado por el sistema | `test_crear_producto_ignora_estado_y_categoria_enviados_fuera_de_datos[bebida]`, `[bebida-cambios11-categoria]`; `ProductoNuevoPage BEBIDA` «muestra el estado fijo «Habilitado»… (S10)» | OK |
| Atomicidad del alta | `test_service.py::test_crear_producto_con_fallo_en_commit_no_deja_fila_ni_archivo` (`service` genérico, no parametrizado por categoría; sin prueba `[bebida]` propia) | OK |
| Listar los productos con su detalle: botones de alta en la pestaña | `ProductosTab.test` ««Nueva bebida» lleva al formulario de alta» (junto a los de plato y postre) | OK |
| Enlace de editar en platos, postres y bebidas | `AccionesProducto: BEBIDA` «ofrece editar con un enlace…»; `categorias.test` «esCategoriaEdicion(BEBIDA) es true», «rutaDeEdicion(BEBIDA, 7) es /productos/bebidas/7/editar»; `MENU_DEL_DIA` sin acciones (S57) en `AccionesProducto.test` | OK |
| Baja desde la fila: bebida, cancelar, deshabilitada sin «Dar de baja», plato y postre no cambian | `AccionesProducto: BEBIDA` «al confirmar da de baja, avisa y notifica (S28)», «al cancelar no envía nada ni notifica», «deshabilitado ofrece editar y no dar de baja»; `api.test` «edición y baja de BEBIDA»; las filas PLATO y POSTRE del `describe.each` siguen en verde | OK |

Resultado: 182 escenarios, ninguno `UNTESTED` ni `FAILING`. Regla clave de bebidas verificada: alta y modificación sin `ingredientes` (ausentes o `[]`) responden 2xx; el ingrediente vacío o repetido sigue rechazado (422); platos y postres siguen exigiendo al menos un ingrediente (regresión citada arriba).

## 4. Criterios de aceptación

| HU | CA | Cubierto por |
| --- | --- | --- |
| #10 HU-M1-07 | CA 1 a 14 | Requisitos agregados «Crear bebida», «Nombre único entre bebidas», «Contrato de la API» y los 14 requisitos modificados de campos, nombre, precio, ingredientes, descripción, secciones, imagen, etiquetas y alta mínima (sección 3) |
| #11 HU-M1-08 | CA 1 a 5 | Requisitos «Consultar», «Modificar los datos», «Modificar ingredientes, etiquetas e imagen», «Reglas de validación…», «Facturas conservan el precio», «Reactivar una bebida deshabilitada» |
| #12 HU-M1-09 | CA 1 a 4 | Requisitos «Dar de baja una bebida», «Cancelar la baja», «La baja conserva los datos», «Reactivar una bebida dada de baja» |

## 5. Cumplimiento de Strict TDD

| Comprobación | Resultado |
| --- | --- |
| Evidencia Rojo y Verde por fase en `apply-progress.md` | Presente para las Fases 1 a 3 (49 fallas, 38 fallas y 1 falla de partida; 413, 304 y 316 pruebas en verde). La Fase 3 reconoce que las pruebas de `ProductoEditarPage` y de la fila `BEBIDA` pasaron desde el inicio porque son genéricas por categoría (G3); coherente con el diseño |
| Archivos de prueba existen y pasan | Sí: 413 y 316 pruebas pasan en esta verificación |
| Triangulación | Alta y baja parametrizadas por categoría (`[bebida]`, `describe.each`, `it.each`); ingredientes opcionales con dos variantes (ausentes y `[]`) |
| Calidad de aserciones | Sin pruebas vacías ni aserciones triviales en las pruebas de bebidas; ver SUGGESTION 3 por un nombre engañoso |
| Capa de las pruebas | Backend: integración con `TestClient` y SQLite temporal, más unitarias de esquemas. Frontend: unitarias (`categorias`, `api`, `validarProducto`) e integración con Testing Library (páginas, `AccionesProducto`, `ProductosTab`, `App`) |

## 6. Coherencia con el diseño (G1 a G8)

| # | Decisión | Evidencia | Res. |
| --- | --- | --- | --- |
| G1 | `BebidaCrear(ProductoCrear)` con `CATEGORIA`, mensaje femenino y sin redefinir `ingredientes`; `BebidaModificar(BebidaCrear, ProductoModificar)` sin cuerpo | `schemas.py`; `test_bebida_crear_*`, `test_bebida_modificar_hereda_categoria_mensaje_y_tipo_base` | OK |
| G2 | Cuatro funciones explícitas; consultar y baja pasan `BebidaCrear.CATEGORIA` | `router.py`: `crear_bebida`, `consultar_bebida`, `modificar_bebida`, `dar_de_baja_bebida` (una línea que delega) | OK |
| G3 | `CategoriaAlta` suma `BEBIDA`; `CategoriaEdicion` sigue como `Extract`; `esCategoriaEdicion` derivada de `CONFIGURACIONES_EDICION` | `categorias.ts`; `AccionesProducto.tsx` sin cambios | OK |
| G4 | `errorDelServidor` reconoce `/ya está registrad[oa]/i` | `validarProducto.ts`; `validarProducto.test` | OK |
| G5 | `ingredientesObligatorios` en `configuracion` de `FormularioProducto` y `required` condicional; `ProductoEditarPage` lo toma de `CONFIGURACIONES[categoria]` | `FormularioProducto.tsx`, `ProductoEditarPage.tsx`; prueba de asterisco por categoría | OK |
| G6 | Botón literal «Nueva bebida» y rutas `productos/bebidas/nuevo` y `productos/bebidas/:id/editar` en `App.tsx` «con `lazy`» | Botón en `ProductosTab.tsx`; las dos rutas reutilizan `ProductoNuevoPage` y `ProductoEditarPage`, que ya se cargan con `lazy` en `App.tsx` (líneas 20 y 26). Ver SUGGESTION 2 | OK |
| G7 | `ALTA_BEBIDA` en el `fixture` `alta`; casos de ingredientes obligatorios pasan a prueba parametrizada plato y postre; bloque nuevo de bebidas | `test_router.py` | OK |
| G8 | `CATEGORIAS` con `BEBIDA`; `it.each` de ingredientes; 409 con `Record<CategoriaAlta, string>`; filas nuevas en `categorias`, `api`, `AccionesProducto`, `App` | Pruebas del frontend | OK |

**Sobre G6 y `lazy`:** G6 sí pedía `lazy`, pero para las páginas, y eso se cumple. `App.tsx` no tiene una declaración `lazy` por ruta: declara `ProductoNuevoPage` y `ProductoEditarPage` con `lazy` una sola vez y las rutas nuevas las reutilizan con `categoria="BEBIDA"`, igual que PLATO y POSTRE. La nota de `apply-progress.md` («`App.tsx` importa las páginas de forma directa (no con `lazy`)») es inexacta; no hay desvío del diseño, solo un error de documentación (SUGGESTION 2).

## 7. Reglas de AGENTS.md

| Regla | Resultado |
| --- | --- |
| Capas: `router` solo delega | Las cuatro rutas nuevas son una línea que llama al `service`; `lint-imports` 10/10; `service`, `repository`, `models` y `shared/` sin cambios |
| Errores `{"detalle": ...}` y 404, 409, 422 | Verificado en `test_modificar_bebida_nombre_duplicado_409`, `test_dar_de_baja_bebida_ya_deshabilitada_409`, los 404 y los 422 del `fixture` `alta` |
| Sin `any` | Ningún `any` en los archivos cambiados; `eslint --max-warnings=0` correcto |
| Funciones de hasta 50 líneas y complejidad 10 | `ruff` y `eslint` (reglas de RNF-MAN-05) sin hallazgos |
| Sin cambios fuera del módulo M1 salvo `App.tsx` | `git diff feature/archiva-sdd-m1...HEAD --name-only` toca solo `backend/app/modules/productos/`, `backend/tests/modules/productos/`, `frontend/src/modules/productos/`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx` y `openspec/changes/HU-M1-07-08-09/`. `App.tsx`: dos rutas nuevas (§9.3, avisar al equipo; ya anotado en las notas del PR) |
| Sin cambios en CI ni lint | Sin diffs en `.github/`, `backend/pyproject.toml` ni `frontend/eslint.config.js` |
| Sin migraciones | Sin archivos nuevos en `backend/alembic/`; una sola cabeza |
| Tamaño de revisión | Backend 415 líneas y frontend 330 (según `apply-progress.md`), ambos bajo 800; el PR es único |

## 8. Hallazgos

### CRITICAL

Ninguno.

### WARNING

1. **Escenarios de modificación del backend cubiertos solo por las pruebas de platos.** Imagen conservada, quitada y «quitar y reemplazar» (422), imagen inválida, nombre vacío o largo, etiquetas y descripción inválidas, sección inexistente o deshabilitada, estado inválido, reactivar en sección deshabilitada y falla del `commit` en la modificación no tienen prueba contra `/bebidas`. Pasan por el mismo `service` y `datos_de(BebidaModificar)`, y G7 acepta esta decisión de forma explícita. Riesgo: un cambio futuro de cableado específico de la bebida no lo detectarían estas pruebas.
2. **Escenarios de pantalla de edición cubiertos solo con el plato.** Cambios de chips e imagen, errores locales, 409 de nombre bajo el campo en la edición, reactivar desde el formulario, cancelar el diálogo de baja desde la pantalla y el recorrido unido «Reactivar desde la lista filtrada» no tienen prueba con `categoria="BEBIDA"`. El componente no tiene lógica por categoría fuera de la configuración, que sí se prueba para bebidas.

### SUGGESTION

1. La cobertura del frontend (`coverage.include` limitado a `src/App.tsx` y `src/shared/**`) no mide `modules/productos/`: el 72,38 % es idéntico antes y después de +53 pruebas. No es un defecto de este cambio ni se debe tocar acá (AGENTS.md §9.8); conviene plantearlo al equipo para que el umbral del 60 % refleje los módulos.
2. Corregir en `apply-progress.md` la nota «`App.tsx` importa las páginas de forma directa (no con `lazy`)»: las páginas sí se cargan con `lazy` y las rutas nuevas las reutilizan (G6 cumplido).
3. La prueba `ProductoNuevoPage BEBIDA` «exige ingredientes y rechaza un chip repetido (CA 6)» tiene un nombre engañoso para una bebida, donde los ingredientes son opcionales: solo comprueba el chip repetido. Renombrarla o dividirla por categoría.
4. Agregar una prueba mínima por categoría para imagen quitada y falla del `commit` en la modificación, y un caso de reactivación de una bebida desde `ProductoEditarPage`, si el equipo prefiere detectar regresiones de cableado.

## 9. Veredicto

**PASS WITH WARNINGS.** La CI completa pasa (backend 413 pruebas, frontend 316), no hay tareas pendientes ni desvíos del diseño, la regla propia de las bebidas (ingredientes opcionales, con el vacío y el repetido rechazados) está probada y las reglas de platos y postres no regresionan. Los dos WARNING son de profundidad de cobertura por categoría y no bloquean el archivado.
