# Tareas: HU-M1-01 Crear un plato

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 820 (código 370 + pruebas 450); frontend ≈ 890 (código 520 + pruebas 370) |
| Riesgo frente al límite de revisión | Medio (backend en el límite de 800; frontend apenas por encima de 800, informativo) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 6 commits por unidad de trabajo |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Medium

Nota: AGENTS.md §4 y `openspec/config.yaml` fijan un PR por HU; el límite 800/800 es un punto de control, no un bloqueo. Cada lado se mide contra su propio límite.

### Unidades de trabajo (commits dentro del PR único)

| Unidad | Objetivo | Commit | Prueba focalizada | Arnés de ejecución | Límite de reversión |
|--------|----------|--------|-------------------|--------------------|---------------------|
| 1 | Dependencias y prueba temprana multipart | `chore` | `pytest tests/modules/productos/test_multipart_spike.py` | `pip install -r requirements.txt`, `pip-audit` | `requirements.txt` y la prueba |
| 2 | Migración, modelo y `normalizar_nombre` | `feat` | `pytest tests/modules/productos/test_migracion.py` | `alembic upgrade head` / `downgrade -1` en base temporal | Revisión, `producto.py`, `test_migracion.py` |
| 3 | Imágenes, configuración de `/media`, `DatosInvalidosError` | `feat` | `pytest tests/modules/productos/test_imagenes.py` | `montar_media` sobre `tmp_path` | `imagenes.py`, `config.py`, `main.py`, `excepciones.py` |
| 4 | `POST /platos` y filtro `estado` | `feat` | `pytest tests/modules/productos` | `TestClient` multipart con imagen | Capas de `productos/` y sus pruebas |
| 5 | Cliente HTTP, componentes y utilidades del formulario | `feat` | `npm test -- productos shared/api` | N/A: sin ruta hasta la unidad 6 | `client.ts`, `components/`, `validarPlato.ts` |
| 6 | Página `/productos/nuevo`, ruta y botón | `feat` | `npm test -- PlatoNuevoPage ProductosPage` | `npm run dev` y alta manual | Página, `App.tsx`, `ProductosPage.tsx` |

## Fase 1: Fundación

- [x] 1.1 Agregar `python-multipart==0.0.32`, `Pillow==13.0.0`, `pillow-heif==1.8.1` a `backend/requirements.txt` (compartido, §9.7); `pip install -r` en `backend/.venv`; correr `pip-audit` si existe y anotar versiones distintas para el PR.
- [x] 1.2 RED/GREEN, prueba temprana B2/B3: `backend/tests/modules/productos/test_multipart_spike.py` con una ruta mínima `datos_de(PlatoCrear)` + `imagen`; casos con y sin `imagen`, JSON inválido y campo extra → 422 con `detalle`. Si falla, aplicar la alternativa de respaldo de B2 y anotarlo.
- [x] 1.3 RED: ajustar `test_downgrade_elimina_productos_y_secciones` en `test_migracion.py` para bajar a `efdafc2a164c`; agregar pruebas de la revisión nueva: relleno de `nombre_normalizado`, aborto con repetidos (mismo `categoria` y nombre normalizado), `downgrade -1` conserva filas.
- [x] 1.4 GREEN: `normalizar_nombre`, columna, `@validates("nombre")` e índice `ux_productos_categoria_nombre_normalizado` en `backend/app/shared/models/producto.py` (compartido: M2, M4, M6).
- [x] 1.5 GREEN: crear `backend/alembic/versions/<rev>_agrega_nombre_normalizado_a_productos.py` (`down_revision = "a1c3e5f7b9d1"`, modo batch, B1 y migración); verificar `alembic heads` con una sola cabeza.
- [x] 1.6 RED/GREEN: `media_dir` en `backend/app/config.py`, `MEDIA_DIR=./media` en `backend/.env.example`, `backend/media/` en `.gitignore`; prueba de `montar_media` sobre `tmp_path` (200 `image/jpeg`, 404) y `montar_media` en `backend/app/main.py` (compartidos).
- [x] 1.7 RED/GREEN: `DatosInvalidosError` en `backend/app/shared/excepciones.py` y su manejador 422 `{"detalle": ...}` en `main.py` (compartidos, B4).

## Fase 2: Backend (reglas y API)

- [x] 2.1 RED: `test_imagenes.py` en `backend/tests/modules/productos/`: JPG, PNG y HEIC válidos; HEIC → JPEG; EXIF 6 aplicado; texto `.jpg`, PDF y GIF → 422; 5 MB + 1 y vacío → 422; PNG de 60 MP en modo `1` → 422; nombre `uuid4().hex` sin rastro del original; sin EXIF.
- [x] 2.2 GREEN: `backend/app/modules/productos/imagenes.py` (`procesar`, `guardar`, borrado, B5/B6).
- [x] 2.3 RED: pruebas de esquemas `PlatoCrear` (nombre 100/101, vacío con `strip`, precio válido e inválido `0`, `-5`, `mil`, `1500.555`, ingredientes vacíos o repetidos, etiqueta de 31, descripción 501, campo extra).
- [x] 2.4 GREEN: `ProductoCrear`, `PlatoCrear`, `ProductoSalida` y alias `Texto` en `productos/schemas.py` (B7).
- [x] 2.5 RED: `test_service.py` con fixture `directorio_media` en `conftest.py`: alta mínima y completa; sección inexistente (404) y deshabilitada (409); nombre repetido con otra capitalización y deshabilitado (409); misma denominación en otra categoría (201); fallo en `commit` y imagen inválida → sin fila ni archivo.
- [x] 2.6 GREEN: `repository.py` (`obtener_seccion`, `existe_producto`, `agregar` generalizado) y `service.crear_producto` con el orden de B6 y limpieza ante error.
- [x] 2.7 RED: `test_router.py`: 201 y forma de `ProductoSalida` (precio `"1500.50"`); 422 parametrizado por campo; `estado` y `categoria` enviados se ignoran; `GET /secciones?estado=HABILITADO` filtra y cuenta; `estado=ABIERTO` → 422; sin filtro igual que antes; imagen de 2 MB servida con 200.
- [x] 2.8 GREEN: `router.py` (`datos_de`, `leer_imagen`, `POST /platos`) y filtro `estado` en `listar_secciones` (servicio, repositorio y `contar`).
- [x] 2.9 REFACTOR: `ruff check --fix . && ruff format .`, `lint-imports` y funciones de hasta 50 líneas.

## Fase 3: Frontend

- [x] 3.1 RED/GREEN: `postFormulario<T>` en `frontend/src/shared/api/client.ts` y `client.test.ts` (sin `Content-Type`, error con `detalle`) — compartido.
- [x] 3.2 RED/GREEN: tipos en `productos/types.ts`; `crearPlato` y `listarSeccionesHabilitadas` en `api.ts` con prueba (`?estado=HABILITADO&limit=100&offset=0`).
- [x] 3.3 RED/GREEN: `validarPlato.ts` y `convertirPrecio` (`12.500,50` → `12500.50`, `abc` inválido) con su prueba, más campos obligatorios vacíos.
- [x] 3.4 RED/GREEN: `components/ListaDeTextos.tsx` + prueba (Enter agrega; vacío, repetido, 31 caracteres y tope muestran error; quitar chip).
- [x] 3.5 RED/GREEN: `components/SelectorImagen.tsx` + prueba (dos botones, `capture="environment"`, vista previa y quitar, HEIC con nombre y tamaño, rechazo de 6 MB).
- [x] 3.6 RED/GREEN: `components/useFormularioPlato.ts` (envío, `errorDelServidor`, 409 de nombre en el campo) con prueba.
- [x] 3.7 RED/GREEN: `pages/PlatoNuevoPage.tsx` + prueba (alta mínima y completa, estado fijo «Habilitado», aviso sin secciones o solo deshabilitadas con «Guardar plato» deshabilitado, contador de descripción, selector solo con habilitadas, 409).
- [x] 3.8 GREEN: ruta `/productos/nuevo` (`lazy`) en `frontend/src/App.tsx` (compartido); botón «Nuevo plato» y pestaña inicial por `?pestania=` en `ProductosPage.tsx` con prueba.
- [x] 3.9 REFACTOR: `npm run format`; buscar componentes reutilizables en `shared/components/`; contrastar con la maqueta `SPRINT-2/S2-04-maqueta/` y anotar diferencias.

## Fase 4: Verificación final y notas del PR

- [x] 4.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %); `alembic upgrade head`, `alembic downgrade -1` y `alembic heads` (una sola cabeza).
- [x] 4.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 4.3 Reunir notas del PR (sin crear issues ni comentarios):
  - 3 dependencias nuevas con versión exacta (§9.7) y resultado de `pip-audit`.
  - Archivos compartidos tocados (§9.3): `producto.py`, `excepciones.py`, `main.py`, `config.py`, `.env.example`, `.gitignore`, `requirements.txt`, migración, `client.ts`, `App.tsx`.
  - El índice compuesto también alcanza a `MENU_DEL_DIA`: avisar a M2.
  - Contradicción: `SPRINT-1/S1-07-casos-de-prueba.md` dice descripción ≤ 200 y el issue #2 dice 500; gana el issue.
  - Diferencias con la maqueta (estado fijo, chips, cámara) y tamaño por lado frente a 800/800.
