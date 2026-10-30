# Progreso de apply: HU-M1-01 Crear un plato

- **Modo:** Strict TDD (pytest en `backend/`, Vitest en `frontend/`). Estrategia de entrega: `single-pr`. Sin commits: los cambios quedan sin confirmar para que el orquestador arme los 6 commits por unidad de trabajo.
- **Tareas:** 28 de 28 completas (1.1 a 1.7, 2.1 a 2.9, 3.1 a 3.9, 4.1 a 4.3).
- **Línea base antes de empezar:** backend 57 pruebas pasando (cobertura 98,93 %); frontend 58 pruebas pasando.
- **Resultado final:** backend 178 pruebas (cobertura 99,36 %); frontend 129 pruebas en 19 archivos.

## Evidencia del ciclo TDD

Safety Net = pruebas previas del archivo modificado, corridas antes de tocarlo (todas pasaban). `N/A (nuevo)` = archivo nuevo.

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULAR | REFACTOR |
|-------|-------------------|------|------------|-----|-------|------------|----------|
| 1.1 | (dependencias) `requirements.txt` | Config | 57/57 backend | N/A: sin lógica | `pip install` y 57/57 | ➖ Omitida: solo versiones fijas | ➖ No hace falta |
| 1.2 | `tests/modules/productos/test_multipart_spike.py` | Integración | N/A (nuevo); `router.py` 38/38 | ✅ ImportError de `datos_de` | ✅ 7/7 con el diseño B2 (sin respaldo) | ✅ 7 casos: con y sin imagen, parte vacía, JSON inválido, campo extra, campo faltante, sin `datos` | ➖ No hace falta |
| 1.3 / 1.5 | `tests/modules/productos/test_migracion.py` | Integración | ✅ 2/2 | ✅ 3 fallos (relleno, aborto, bajada) | ✅ 6/6 con la revisión `c4e6a8b0d2f4` | ✅ relleno, otra categoría, repetidos, bajada conserva filas | ✅ `alembic check` sin diferencias |
| 1.4 | `tests/modules/productos/test_modelo.py` | Unidad e integración | N/A (nuevo); `producto.py` cubierto por 57/57 | ✅ ImportError de `normalizar_nombre` | ✅ 6/6 | ✅ 3 normalizaciones, validador, índice único, otra categoría | ➖ No hace falta |
| 1.6 | `tests/test_media.py` | Unidad e integración | N/A (nuevo); `main.py`/`config.py` cubiertos por `test_salud.py` 7/7 | ✅ ImportError de `montar_media` | ✅ 5/5 | ✅ por defecto, variable de entorno, 200 `image/jpeg`, 404, no crea carpeta | ➖ No hace falta |
| 1.7 | `tests/test_salud.py` | Integración | ✅ 7/7 | ✅ ImportError de `DatosInvalidosError` | ✅ 8/8 | ➖ Un solo manejador (un camino) | ➖ No hace falta |
| 2.1 / 2.2 | `tests/modules/productos/test_imagenes.py` | Unidad | N/A (nuevo) | ✅ ImportError del módulo | ✅ 18/18 | ✅ JPG, PNG, HEIC, EXIF 6, sin EXIF, texto, PDF, GIF, BMP, truncada, vacío, 5 MB ± 1, 60 MP, nombre, borrar | ✅ ruff y complejidad ≤ 10 |
| 2.3 / 2.4 | `tests/modules/productos/test_schemas.py` | Unidad | ✅ `schemas.py` cubierto por 38/38 | ✅ ImportError de `PlatoCrear` | ✅ 35/35 | ✅ límites 100/101, precios válidos e inválidos, listas, repetidos, 500/501, extras | ➖ No hace falta |
| 2.5 / 2.6 | `tests/modules/productos/test_service.py` (+ `conftest.py`) | Integración | ✅ 38/38 (servicio + router) | ✅ AttributeError `crear_producto` | ✅ 28/28 del archivo | ✅ mínima, completa, 404, 409 sección, 409 nombre (capitalización y deshabilitado), otra categoría, imagen inválida, orden B6, fallo de commit, `IntegrityError`, filtro de secciones | ✅ `_descartar` recibe el nombre del archivo |
| 2.7 / 2.8 | `tests/modules/productos/test_router.py` | Integración | ✅ 38/38 | ✅ 30 fallos | ✅ 55/55 | ✅ 201 mínima y completa, imagen de 2 MB servida, 12 casos 422, 4 campos faltantes, JSON inválido, estado/categoría fuera de `datos`, 404, 409 x2, 3 imágenes inválidas, nombre del servidor, filtro | ✅ ver «Desviaciones» (modelo `FiltroSecciones`) |
| 2.9 | todo el backend | Estática | ✅ 178/178 | N/A | ✅ `ruff check`, `ruff format --check`, `lint-imports` | N/A | ✅ |
| 3.1 | `src/shared/api/client.test.ts` | Unidad | ✅ 6/6 | ✅ `postFormulario is not a function` | ✅ 8/8 | ✅ éxito sin `Content-Type`, error con `detalle` | ➖ No hace falta |
| 3.2 | `src/modules/productos/api.test.ts` | Unidad | ✅ 3/3 | ✅ `listarSeccionesHabilitadas is not a function` | ✅ 6/6 | ✅ con y sin imagen | ➖ No hace falta |
| 3.3 | `components/validarPlato.test.ts` | Unidad | N/A (nuevo) | ✅ import no resuelve | ✅ 24/24 | ✅ 6 precios válidos, 10 inválidos, obligatorios, 100/101, 500/501, 3 errores del servidor | ✅ funciones puras |
| 3.4 | `components/ListaDeTextos.test.tsx` | Componente | N/A (nuevo) | ✅ import no resuelve | ✅ 9/9 | ✅ agrega, varios, vacío, repetido, largo, tope, quitar, error externo, otras teclas | ✅ extraído `Chips`; ≤ 50 líneas |
| 3.5 | `components/SelectorImagen.test.tsx` | Componente | N/A (nuevo) | ✅ import no resuelve | ✅ 11/11 | ✅ dos botones, cámara, JPG, quitar, HEIC, 6 MB, 5 MB justos, PDF, conserva la elegida, cancelar | ✅ hook `useSeleccionImagen` |
| 3.6 | `components/useFormularioPlato.test.tsx` | Hook | N/A (nuevo) | ✅ import no resuelve | ✅ 7/7 | ✅ vacío, precio inválido, mínimo, completo, enviando, 409, error general | ✅ `useCampos` extraído |
| 3.7 | `pages/PlatoNuevoPage.test.tsx` | Integración | N/A (nuevo) | ✅ import no resuelve | ✅ 11/11 | ✅ alta mínima, completa, vacíos, 409, estado fijo, selector, contador, sin secciones (2), con secciones, error de carga | ✅ subcomponentes ≤ 50 líneas |
| 3.8 | `pages/ProductosPage.test.tsx`, `App.test.tsx` | Integración | ✅ 2/2 y 4/4 | ✅ 3 fallos | ✅ 10/10 | ✅ botón, `?pestania=secciones`, valor desconocido, ruta `/productos/nuevo` | ➖ No hace falta |
| 3.9 | todo el frontend | Estática | ✅ 129/129 | N/A | ✅ `npm run format`, lint, typecheck | N/A | ✅ |
| 4.1 / 4.2 | CI completa de ambos lados | Verificación | N/A | N/A | ✅ ver «Verificación» | N/A | N/A |

### Resumen de pruebas

- Backend: 121 pruebas nuevas (57 → 178). Frontend: 71 pruebas nuevas (58 → 129).
- Capas: unidad, integración (TestClient, Alembic sobre SQLite temporal) y componentes (Testing Library).
- Funciones puras nuevas: `normalizar_nombre`, `convertirPrecio`, `validarPlato`, `errorDelServidor`, `imagenes.procesar`.

## Evidencia por unidad de trabajo

| Unidad | Prueba focalizada y resultado | Arnés de ejecución | Límite de reversión |
|--------|-------------------------------|--------------------|---------------------|
| 1. Dependencias y spike | `pytest tests/modules/productos/test_multipart_spike.py`: 7 passed | `pip install` de los 3 pines: instalados. `pip-audit` NO está instalado en el entorno: sin resultado | `requirements.txt`, `test_multipart_spike.py`, `datos_de` en `router.py` |
| 2. Migración y modelo | `pytest test_migracion.py test_modelo.py`: 12 passed | `alembic upgrade head`, `downgrade efdafc2a164c`, `downgrade -1`, `alembic check` en SQLite temporal: sin errores | `c4e6a8b0d2f4_*.py`, `shared/models/producto.py`, `test_migracion.py`, `test_modelo.py` |
| 3. Imágenes, `/media`, 422 | `pytest test_imagenes.py tests/test_media.py tests/test_salud.py`: 31 passed | `montar_media` sobre `tmp_path`; ningún `media/` en el repositorio | `imagenes.py`, `config.py`, `main.py`, `excepciones.py`, `.env.example`, `.gitignore` |
| 4. `POST /platos` y filtro | `pytest tests/modules/productos`: pasan | `TestClient` multipart con imagen real (JPEG, PNG de 2 MB) | `schemas.py`, `repository.py`, `service.py`, `router.py` y sus pruebas |
| 5. Cliente y componentes | `npm test -- productos shared/api`: pasan | N/A: sin ruta hasta la unidad 6 | `client.ts`, `api.ts`, `types.ts`, `components/` |
| 6. Página y ruta | `npm test -- PlatoNuevoPage ProductosPage App`: 21 passed | `npm run build` genera el bloque `PlatoNuevoPage` (carga diferida). No se probó `npm run dev` con un navegador real | `PlatoNuevoPage.tsx`, `App.tsx`, `ProductosPage.tsx` y sus pruebas |

## Verificación (tareas 4.1 y 4.2)

- Backend: `ruff check .` sin errores; `ruff format --check .` 69 archivos formateados; `lint-imports` 10 contratos cumplidos, 0 rotos; `pytest` 178 passed, cobertura 99,36 % (umbral 70 %).
- Alembic: `alembic heads` devuelve una sola cabeza (`c4e6a8b0d2f4`); `upgrade head`, `downgrade efdafc2a164c` y `downgrade -1` sin errores; `alembic check` en `head`: «No new upgrade operations detected».
- Frontend: `npm run lint` 0 errores y 0 advertencias; `format:check` limpio; `typecheck` limpio; `test:coverage` 129 passed, cobertura global (App y `shared/`) líneas 73,66 %, ramas 67,81 %, funciones 67,48 %, sentencias 71,11 % (umbral 60 %); `npm run build` correcto.

## Desviaciones del diseño

1. **Filtro `estado` de `GET /secciones`:** FastAPI no permite mezclar un modelo `Query()` (`ParametrosPaginacion`) con otro parámetro de consulta suelto: la prueba rojea con `paginacion: Field required`. Se agregó `FiltroSecciones(ParametrosPaginacion)` en `schemas.py` con `estado: Estado | None`. El contrato HTTP no cambia.
2. **Formato `MPO`:** `imagenes.py` acepta también el formato detectado `MPO` (JPEG con datos extra que graban muchos celulares) y lo guarda como JPEG. Sin esto se rechazarían fotos válidas de la cámara. El diseño listaba solo JPEG, PNG y HEIF.
3. **`estado` y `categoria` enviados:** el diseño exige `extra="forbid"` dentro de `datos` (campo extra → 422, B3) y la spec dice que un `estado` o `categoria` enviado se ignora. Se resolvió así: enviados como campos sueltos del formulario multipart se ignoran (prueba de 201); dentro del JSON `datos` dan 422. Conviene que la persona confirme que es la lectura buscada.
4. **`Texto[a, b]`** se implementó como una clase con `__class_getitem__` para respetar la sintaxis del diseño.
5. **Pruebas extra no listadas:** `test_modelo.py`, `tests/test_media.py`, `test_schemas.py` y un caso nuevo en `tests/test_salud.py`. La prueba de `montar_media` quedó en `tests/test_media.py` y no en `test_imagenes.py`.
6. **Textos de ayuda neutros:** los mensajes de `ListaDeTextos` evitan el género gramatical («No se puede agregar un texto vacío.», «"huevo" ya está en la lista.»).
7. **Sin vista «Así se ve en la carta»:** la maqueta la muestra, pero no está en la HU ni en la spec (S12); no se implementó.

## Problemas y riesgos

- **Tamaño:** muy por encima del pronóstico. Backend ≈ 1 581 líneas cambiadas (código ≈ 452, pruebas ≈ 1 129) frente a ≈ 820 previstas; frontend ≈ 1 658 (código ≈ 696, pruebas ≈ 962) frente a ≈ 890. El límite de 800 por lado es un punto de control informativo; hay que anotarlo en el PR. El exceso está sobre todo en pruebas parametrizadas y en el rigor de TDD.
- `pip-audit` no está instalado: no se pudo auditar las tres dependencias. Se recomienda correrlo en CI o a mano antes del PR.
- No se probó con un navegador real (`npm run dev`), ni la cámara en un celular, ni un HEIC real de un iPhone (el HEIC de las pruebas se genera con `pillow_heif`).
- `MENU_DEL_DIA` queda alcanzado por el índice único compuesto (B1): avisar a M2.

## Notas para el PR (tarea 4.3)

- Tres dependencias nuevas con versión exacta (§9.7): `python-multipart==0.0.32`, `Pillow==13.0.0`, `pillow-heif==1.8.1`. Se instalaron en Python 3.12 sin cambios de versión. `pip-audit` no disponible.
- Archivos compartidos tocados (§9.3): `backend/app/shared/models/producto.py`, `backend/app/shared/excepciones.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/.env.example`, `.gitignore`, `backend/requirements.txt`, migración `c4e6a8b0d2f4`, `frontend/src/shared/api/client.ts`, `frontend/src/App.tsx`.
- El índice compuesto (`categoria`, `nombre_normalizado`) también alcanza a `MENU_DEL_DIA`: avisar a M2. La migración aborta con un mensaje claro si ya hay productos repetidos en la misma categoría.
- Contradicción de fuentes: `SPRINT-1/S1-07-casos-de-prueba.md` dice descripción ≤ 200 y el issue #2 dice 500; gana el issue.
- Diferencias con la maqueta: estado fijo «Habilitado» (sin interruptor), ingredientes y etiquetas como chips, botón «Sacar foto» con `capture`, sin la vista previa «Así se ve en la carta», y sin arrastrar y soltar la imagen.
