```yaml
schema: gentle-ai.verify-result/v1
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 13/13
scenarios: 38/38
evidence_revision: sha256:ee8df75c57b49302e6fc882723edd2a3f0492959bcb0054ca0431c03eb771199
test_command: "backend: ruff check . && ruff format --check . && lint-imports && pytest | frontend: npm run test:coverage"
test_exit_code: 0
test_output_hash: sha256:0842bb55b695bde9a9579d0fe109c1439dbdeae634f762274cd527f86b218180
build_command: "frontend: npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build"
build_exit_code: 0
build_output_hash: sha256:b2502a84eabc385a93e08f4a872edb012e8cd98cc3e480c46e612e1b8b2ec63e
```

# Informe de verificación: HU-M1-14 (Ver la carta)

- **Veredicto: PASS WITH WARNINGS** (0 CRITICAL, 3 WARNING, 4 SUGGESTION)
- **Cambio:** `HU-M1-14` · **Rama:** `feature/HU-M1-14-ver-carta` (5 commits sobre `feature/archiva-sdd-m1-bebida-seccion`: `c683ebb`, `5364da5`, `36ffdd1`, `0944b77`, `c8d3a70`) · **Modo:** Strict TDD · **Persistencia:** OpenSpec.
- **Alcance verificado:** HU-M1-14 (#19), CA 1 a 5. Spec delta de la capacidad nueva `carta-vista`: 13 requisitos y 38 escenarios.
- `evidence_revision` es el SHA-256 de `git diff feature/archiva-sdd-m1-bebida-seccion...HEAD` (HEAD `c8d3a70`). `test_output_hash` y `build_output_hash` son el SHA-256 de las últimas tres líneas de la salida de `pytest -q` (backend) y de `npm run lint && ... && npm run build` (frontend) de esta verificación.

## 1. Completitud de tareas

`tasks.md`: `grep -c "^- \[ \]"` = 0 y 34 tareas marcadas `[x]`. Coinciden con los commits de `apply-progress.md` (Fase 1 `c683ebb`, Fase 2 `5364da5`, Fase 3 `36ffdd1`, Fase 4 `0944b77`, Fase 5 `c8d3a70`). Árbol de trabajo limpio al empezar.

## 2. Ejecución de la CI (AGENTS.md §7)

| Lado | Comando | Resultado |
| --- | --- | --- |
| Backend | `ruff check . && ruff format --check . && lint-imports && pytest` | Exit 0: `All checks passed!`, `69 files already formatted`, `Contracts: 10 kept, 0 broken`, `470 passed, 1 warning`, cobertura 99,43 % (umbral 70 %) |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` | Exit 0: `eslint --max-warnings=0` sin hallazgos, Prettier y `tsc` correctos, 32 archivos y `364 passed`, cobertura 72,6 % sentencias / 69,37 % ramas / 69,6 % funciones / 74,78 % líneas (umbral 60 %), build correcto |
| Migraciones | `alembic heads` | Una sola cabeza, `c4e6a8b0d2f4`; sin archivos nuevos en `backend/alembic/` |

Las cifras coinciden con `apply-progress.md` (470 y 364 pruebas, 99,43 % y 72,6 %).

## 3. Trazabilidad (requisito y escenario, prueba, resultado)

Rutas: backend `backend/tests/modules/productos/{test_router,test_service}.py` (`R` y `S`); frontend `frontend/src/modules/productos/{api.test.ts,pages/CartaPage.test.tsx,pages/ProductosPage.test.tsx,components/CartaSeccion.test.tsx,components/ProductoCartaTarjeta.test.tsx}` y `frontend/src/App.test.tsx`. Nombres de `R` abreviados con el prefijo `test_listar_carta_`.

| Requisito y escenario | Prueba | Res. |
| --- | --- | --- |
| Carta por secciones: secciones en orden con sus productos | `R::ordena_secciones_y_productos_con_los_campos_de_s81` (Principales antes de Postres; productos por nombre) | OK |
| Carta: productos de todas las categorías | Misma prueba (plato, bebida y postre, con `categoria`); ver WARNING 1 | OK |
| Carta: producto con imagen / sin imagen | `R::ordena_...s81` (`imagen_url` `/media/agua.jpg` y `null`); `ProductoCartaTarjeta` «muestra nombre, precio, descripcion, etiquetas e imagen diferida» y «omite la descripcion y muestra el marcador cuando no hay imagen» | OK |
| Carta: producto sin descripción | `ProductoCartaTarjeta` «omite la descripcion y muestra el marcador...» | OK |
| Carta: pantalla con la carta | `CartaPage` «abre en Habilitados, pide la carta y muestra las secciones en orden» | OK |
| Filtro inicial: sin `estado` | `R::sin_estado_equivale_a_habilitado` | OK |
| Filtro inicial: no aparecen bajas con Habilitados | `R::habilitados_oculta_secciones_sin_productos_habilitados` (sección deshabilitada con producto habilitado oculta), `R::sin_estado_equivale_a_habilitado` (producto deshabilitado oculto) | OK |
| Filtro inicial: la pantalla abre en Habilitados | `CartaPage` «abre en Habilitados...» (selector y `obtenerCarta('HABILITADO')`); el reinicio tras elegir «Todos» no tiene prueba propia, ver WARNING 2 | OK (parcial) |
| Ocultar: sección habilitada sin productos habilitados (`total` 1) | `R::habilitados_oculta_secciones_sin_productos_habilitados` (`total == 1`) | OK |
| Ocultar: sección habilitada sin productos | Misma prueba (sección «Vacía») | OK |
| Deshabilitados: solo productos dados de baja | `R::deshabilitados_muestra_solo_lo_dado_de_baja` («Con baja» solo con «Helado») | OK |
| Deshabilitados: sección habilitada sin bajas | Misma prueba («Sin bajas» no figura) | OK |
| Deshabilitados: sección deshabilitada con productos habilitados | Misma prueba («Cerrada» con «Té» habilitado figura con `productos == []`); la variante con un producto deshabilitado además no está, ver WARNING 1 | OK (parcial) |
| Deshabilitados: sección deshabilitada sin bajas, aviso en pantalla | `R` (misma prueba, `productos == []`); `CartaSeccion` «avisa que no hay productos dados de baja en Deshabilitados» | OK |
| Todos: todas las secciones y productos, con `estado` (`total` 3) | `R::todos_trae_las_tres_secciones_con_su_estado` | OK |
| Todos: la pantalla indica el estado | `CartaPage` «vuelve a pedir la carta al cambiar a Deshabilitados y a Todos, con insignias»; `CartaSeccion` «muestra la insignia de estado...»; `ProductoCartaTarjeta` `it.each` de insignias | OK |
| Todos: Habilitados no muestra indicación | `CartaPage` («queryByText Habilitada/Habilitado» ausentes); `ProductoCartaTarjeta` (insignia solo si se pide) | OK |
| Orden: empate de orden | `R::desempata_por_nombre_y_por_id` (Alfa antes de Beta, ambas con orden 1 y deshabilitadas, en `TODOS`) | OK |
| Orden: empate de orden y nombre | Productos con igual nombre por `id` en `R::desempata_...`; el nombre de sección es único, ver SUGGESTION 1 | OK (parcial) |
| Paginación: página de secciones | `R::pagina_las_secciones_con_el_total_completo` (`limit=2`, `total` 3, `limit` 2, `offset` 0) | OK |
| Paginación: segunda página | Misma prueba con `limit=1&offset=1` (devuelve la segunda y `total` 3); no se usa exactamente `limit=2&offset=2`, ver SUGGESTION 1 | OK |
| Paginación: `total` cuenta solo las que pasan el filtro | `R::habilitados_oculta_secciones_sin_productos_habilitados` (`total == 1` con 4 secciones); `R::deshabilitados_...` (`total == 2`) | OK |
| Paginación: valores inválidos (422) | `R::con_parametros_invalidos_responde_422[limit 0, limit 101, offset -1]`, con `detalle` | OK |
| Paginación: el frontend completa las páginas | `api.test` «pide las páginas de 100 en 100 hasta completar el total y las concatena», «corta el ciclo si llega una página vacía...», «devuelve el error si falla la segunda página» | OK |
| Estado inválido: valor desconocido / capitalización | `R::con_parametros_invalidos_responde_422[estado ABIERTO, estado habilitado]` | OK |
| Solo lectura sin efectos | `R::no_modifica_los_datos` (`GET /productos` y `GET /secciones` iguales antes y después) | OK |
| Tres sentencias SQL (I3) | `S::test_listar_carta_ejecuta_tres_sentencias_sql` (3 secciones, 3 sentencias) y `S::test_listar_carta_sin_secciones_omite_la_consulta_de_productos` (2) | OK |
| Entrada: botón «Ver carta» y navegación | `ProductosPage` «ofrece «Ver carta» en el encabezado y lleva a la carta»; `App.test` «monta la carta en /productos/carta» | OK |
| Filtro en pantalla: cambiar a Deshabilitados y a Todos | `CartaPage` «vuelve a pedir la carta al cambiar a Deshabilitados y a Todos, con insignias» (`toHaveBeenLastCalledWith`) | OK |
| Navegación: pulsar una píldora | `CartaPage` «ofrece un enlace de ancla por cada seccion visible» (`href="#seccion-{id}"`; `CartaSeccion` «es una seccion con ancla...»); el desplazamiento lo hace el navegador (I11) | OK |
| Navegación: píldoras según el filtro | `CartaPage` `it.each` de vacíos (sin `navigation` cuando no hay secciones); las ocultas no llegan de la API (backend) | OK |
| Vacíos: Habilitados, Deshabilitados y Todos | `CartaPage` `it.each` «muestra el vacio de %s» con los tres textos de S88 | OK |
| Error de carga | `CartaPage` «muestra el error y reintenta» («No se pudo cargar la carta.») | OK |

Resultado: 38 escenarios, ninguno `UNTESTED` ni `FAILING`. Dos con cobertura parcial (WARNING 1 y 2).

### Semántica del filtro de estado (S82 a S84), comprobada contra el código

`_condicion_de_carta` (`repository.py`): `HABILITADO` = sección habilitada Y existe producto habilitado; `DESHABILITADO` = sección deshabilitada O existe producto deshabilitado; `TODOS` = `None` (sin condición). Los productos se filtran con el mismo `estado` en `listar_productos_de_secciones`. El `total` sale de `contar` sobre la misma consulta, así que cuenta solo las secciones visibles. Se verificó con las pruebas de CA 3, 4 y 5 de arriba. La guarda de sentencias usa `before_cursor_execute` registrado dentro de `_contar_sentencias`, después de armar los datos, y cuenta solo lo que ejecuta la acción medida (no el armado de datos).

## 4. Criterios de aceptación de #19

| CA | Cubierto por |
| --- | --- |
| CA 1 | «Carta por secciones con sus productos» (6 escenarios): `R::ordena_...s81` y pruebas de `CartaPage`, `CartaSeccion` y `ProductoCartaTarjeta` |
| CA 2 | «Filtro inicial en Habilitados» y «Estado inválido»: `R::sin_estado_equivale_a_habilitado`, `R::con_parametros_invalidos_responde_422`, `CartaPage` «abre en Habilitados...» |
| CA 3 | «Ocultar secciones sin productos habilitados»: `R::habilitados_oculta_secciones_sin_productos_habilitados` |
| CA 4 | «Filtro Deshabilitados»: `R::deshabilitados_muestra_solo_lo_dado_de_baja` y `CartaSeccion` (aviso) |
| CA 5 | «Filtro Todos»: `R::todos_trae_las_tres_secciones_con_su_estado` y pruebas de insignias |

## 5. Cumplimiento de Strict TDD

| Comprobación | Resultado |
| --- | --- |
| Evidencia Rojo y Verde por fase en `apply-progress.md` | Presente para las Fases 1 a 4 (14 fallas por 404 y 2 por `listar_carta` ausente; 3 archivos sin módulo y 3 fallas por `obtenerCarta`; 2 fallas en la Fase 4; 470, 362, 362 y 364 pruebas en verde). Sin la tabla por tarea con Triangular y Red de seguridad: ver SUGGESTION 3 |
| Archivos de prueba existen y pasan | Sí: 470 y 364 pruebas pasan en esta verificación |
| Pruebas verdes de partida | `apply-progress.md` reconoce que la prueba de solo lectura pasaba con el 404 y que se verificó después con la ruta real; ver WARNING 3 |
| Refactor con base | `SelectorEstado` extraído con las 18 pruebas de `ProductosTab` y `ProductosPage` en verde antes y después, sin editar esas pruebas |
| Triangulación | 422 parametrizado (5 entradas); filtro con los tres estados; vacíos `it.each` por filtro; `obtenerCarta` con éxito, página vacía y fallo; sentencias con y sin secciones |
| Calidad de aserciones | Sin pruebas vacías ni triviales: se comprueban nombres, orden, `estado`, `total`, el cuerpo completo del producto y datos intactos |
| Capa de las pruebas | Backend: integración con `TestClient` y SQLite temporal, más unitarias del `service` con contador de sentencias. Frontend: unitarias (`api`) e integración con Testing Library (página, tarjeta, sección, `App`) |

## 6. Coherencia con el diseño (I1 a I14)

| # | Decisión | Evidencia | Res. |
| --- | --- | --- | --- |
| I1 | Ruta `/carta` en `productos/router.py`, `service.listar_carta`, consultas en `repository` | Los tres archivos; sin módulo nuevo ni cambios en `main.py` | OK |
| I2 | `FiltroCarta(FiltroProductos)` solo con docstring | `schemas.py`; 422 idénticos a `GET /productos` | OK |
| I3 | Tres consultas: secciones, `contar`, productos con `in_(ids)`; sin la tercera si no hay secciones | `repository.py`, `service.listar_carta`; pruebas de 3 y 2 sentencias | OK |
| I4 | `EXISTS` correlacionado por estado en `_condicion_de_carta` | `repository.py` (`HABILITADO` con `and_`, `DESHABILITADO` con `or_`, `TODOS` sin condición) | OK |
| I5 | Secciones por `orden, nombre, id`; productos por `nombre, id` | `order_by` en ambas consultas; `R::desempata_por_nombre_y_por_id` | OK |
| I6 | `ProductoCarta`, `SeccionCarta`, `precio` con dos decimales; `_url_de_imagen` compartida con `_a_salida` | `schemas.py`, `service.py` | OK |
| I7 | `dict[int, list[ProductoCarta]]` por `seccion_id`, en el orden de la consulta 1 | `service.listar_carta` | OK |
| I8 | `obtenerCarta` pide `limit=100` con `offset` creciente hasta `total` o página vacía; un fallo devuelve el error | `api.ts` (`while` con total inicial infinito, desviación de forma ya anotada en `apply-progress.md`) y `api.test.ts` | OK |
| I9 | `CartaPage` contenedor; `CartaVista`, `CartaNavegacion`, `CartaSeccion`, `ProductoCartaTarjeta` solo con props | Archivos de `components/` y `pages/` | OK |
| I10 | `SelectorEstado` movido sin cambio de comportamiento; estado en `useState('HABILITADO')` | `SelectorEstado.tsx`, `ProductosTab.tsx` (importa), `CartaPage.tsx` | OK |
| I11 | `<nav aria-label="Secciones de la carta">` con `href="#seccion-{id}"` y `<section id="seccion-{id}" className="scroll-mt-4">` | `CartaNavegacion.tsx`, `CartaSeccion.tsx` | OK |
| I12 | `CARTA_VACIA` en `CartaVista`, `AVISO_SECCION_VACIA` en `CartaSeccion`; insignias solo fuera de Habilitados | Archivos citados; sin cambios en `filtrosEstado.ts` | OK |
| I13 | Imagen con `urlDeImagen`, `alt`, `loading="lazy"` o marcador «Sin imagen»; `formatearMoneda(Number(precio))`; descripción omitida si es `null`; etiquetas con `Badge` | `ProductoCartaTarjeta.tsx` | OK |
| I14 | Botón «Ver carta» (`outline`, `BookOpen`) en `acciones` de `PageHeader`; ruta `productos/carta` con `lazy` | `ProductosPage.tsx`, `App.tsx` | OK |

## 7. Reglas de AGENTS.md

| Regla | Resultado |
| --- | --- |
| `router` solo delega | `listar_carta` es una línea que llama a `service.listar_carta`; `lint-imports` 10/10 |
| `service` sin FastAPI ni `HTTPException` | Los imports nuevos son del módulo y de `sqlalchemy`; no hay excepciones nuevas |
| Errores `{"detalle": ...}` y códigos 404, 409, 422 | Los 422 devuelven `detalle` (probado); la ruta no lanza otros errores |
| Consultas parametrizadas en `repository` | `select(...).where(...)`, `exists()` e `in_` de SQLAlchemy; sin SQL en texto |
| Sin `any` | Ningún `any` en las líneas agregadas fuera de `openspec/`; `eslint --max-warnings=0` correcto |
| Funciones de hasta 50 líneas y complejidad 10 | `ruff` (`max-complexity = 10`) y `eslint` (`max-lines-per-function`, `complexity`) sin hallazgos |
| Sin cambios fuera del módulo M1 salvo `App.tsx` | `git diff --name-status` fuera de `productos` y `openspec/changes/HU-M1-14/` toca solo `frontend/src/App.tsx` (una ruta `lazy`) y `frontend/src/App.test.tsx` (una prueba) |
| Sin cambios en CI ni lint | Sin diffs en `.github/`, `backend/pyproject.toml`, `frontend/eslint.config.js`, `requirements.txt` ni `package.json` |
| Sin migraciones | Sin archivos en `backend/alembic/`; una sola cabeza |
| Tipos de commit | `chore`, `feat`, `feat`, `feat`, `docs`; sin atribución de IA en los mensajes |
| Tamaño de revisión | Backend 330 líneas (327 agregadas, 3 quitadas) y frontend 714 (682 y 32), medidos con `git diff --shortstat`; ambos por debajo de 800 y coincidentes con `apply-progress.md` |

## 8. Hallazgos

### CRITICAL

Ninguno.

### WARNING

1. **Escenarios del filtro con cobertura parcial en backend.** Faltan combinaciones que la spec nombra: Deshabilitados con una sección deshabilitada que tiene un producto habilitado y otro deshabilitado (la prueba solo usa un habilitado), Deshabilitados con una sección deshabilitada sin ningún producto, y los productos de la sección deshabilitada en Todos (la prueba no los comprueba). El código lo resuelve por construcción (filtro de productos por `estado`), por eso no es CRITICAL; conviene agregar los casos para blindar S83.
2. **Reinicio del filtro al volver a entrar sin prueba.** El escenario «La pantalla abre en Habilitados» (tras elegir «Todos» en una visita anterior) solo se prueba con la apertura inicial. El estado vive en `useState`, de modo que se reinicia al desmontar; falta una prueba que desmonte y vuelva a montar.
3. **Un caso en verde antes de implementar.** En la Fase 1 la prueba de solo lectura pasó con el 404 (no hay datos que modificar), así que no distinguía en el paso Rojo. `apply-progress.md` lo reconoce y se verificó con la ruta real; hoy discrimina porque compara `GET /productos` y `GET /secciones` antes y después. Sin impacto en el resultado.

### SUGGESTION

1. **Escenarios de orden y paginación con una variante distinta.** La spec pide secciones con igual `orden` y `nombre` (no puede ocurrir si el nombre de sección es único, S61) y la segunda página con `limit=2&offset=2`; las pruebas usan `limit=1&offset=1` y desempatan productos por `id`. Equivalentes para la lógica, pero conviene alinear los escenarios de la spec con lo que realmente se prueba.
2. **Texto de las insignias.** La spec (S93) habla de «Habilitado» o «Deshabilitado» para secciones y productos; el diseño (S99) fija «Habilitada»/«Deshabilitada» en secciones. El código sigue S99; conviene reflejarlo en S93 de la spec.
3. **Formato de la evidencia TDD.** `apply-progress.md` resume Rojo y Verde por fase, sin las columnas Triangular y Red de seguridad por tarea del módulo Strict TDD. La evidencia es verificable.
4. **Cobertura del frontend.** `coverage.include` limita la métrica a `src/App.tsx` y `src/shared/**`, de modo que los archivos de `modules/productos/` no entran en el 72,6 %. No se debe tocar acá (AGENTS.md §9.8); conviene plantearlo al equipo. Además, queda abierta la validación de S96 a S99 por el equipo y el aviso del cambio de `App.tsx` en el PR (§9.3).

## 9. Veredicto

**PASS WITH WARNINGS.** La CI completa pasa (backend 470 pruebas, frontend 364), no hay tareas pendientes, los 38 escenarios y los 5 criterios de aceptación de #19 tienen una prueba que pasa, las decisiones I1 a I14 están implementadas como se escribieron, la semántica de S82 a S84, el orden S85, la paginación por sección con su `total` y los 422 se comprobaron en código y en pruebas, y la guarda de tres sentencias cuenta solo las de la solicitud. Se cumplen las reglas de AGENTS.md (fuera de M1 solo cambian `App.tsx` y `App.test.tsx`). Los tres WARNING son de profundidad de pruebas y de proceso, y no bloquean el archivado.

## Seguimiento posterior a la verificación

- ADVERTENCIA 1 resuelta en el commit `test: cubre las combinaciones de secciones deshabilitadas en la carta (HU-M1-14)`. Se agregó `test_listar_carta_deshabilitados_en_seccion_deshabilitada_solo_trae_los_de_baja`, que prueba una sección deshabilitada con productos mixtos y otra sin productos, y en «Todos» ahora se comprueban los productos de la sección deshabilitada. Las pruebas pasaron desde el primer intento, porque el código ya cumplía la regla: son de cobertura, no de TDD. Backend: 471 pruebas, 99,43 %.
