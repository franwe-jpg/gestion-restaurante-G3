```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:e47de2bed7ddeab2afa1c06c78e46bce0886f6652e85be75052a2c5025e5d5e1
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 17/17
scenarios: 52/52
test_command: cd backend && pytest
test_exit_code: 0
test_output_hash: sha256:7abbd9b2e40887854071795adc51bd4313cd906037b5946c883f14d2a6852d02
build_command: cd frontend && npm run build
build_exit_code: 0
build_output_hash: sha256:27ebceadbea4e06ac14528a6b08f193735074d17e0222064da1dda2733b0b867
```

## Verification Report

**Change**: HU-M1-01 (Crear un plato), issue #2
**Version**: N/A (delta specs carta-productos and carta-secciones)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 28 |
| Tasks complete | 28 |
| Tasks incomplete | 0 |

### Build and Tests Execution
**Build**: PASSED (`npm run build`, exit 0; `PlatoNuevoPage` lazy chunk generated).

**Backend CI checks** (from `backend/`): `ruff check .` all passed; `ruff format --check .` 69 files formatted; `lint-imports` 10 kept, 0 broken; `pytest` 178 passed, coverage 99.36% (threshold 70%); `alembic heads` single head `c4e6a8b0d2f4`.

**Frontend CI checks** (from `frontend/`): `npm run lint` 0 errors, 0 warnings; `format:check` clean; `typecheck` clean; `test:coverage` 129 passed in 19 files, global lines 73.66% (threshold 60%); `build` OK.

**Migrations** (fresh temp SQLite in the scratchpad, `DATABASE_URL` overridden): `upgrade head`, `alembic check` ("No new upgrade operations detected"), `downgrade -1`, `upgrade head`, `downgrade base` all exit 0.

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD evidence reported | OK | Table in apply-progress.md (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR per task) |
| All tasks have tests | OK | Every code task maps to an existing test file |
| RED confirmed (files exist) | OK | All listed test files exist |
| GREEN confirmed | OK | 178 backend + 129 frontend pass now |
| Triangulation adequate | OK | Multi-case in every logic task |
| Safety net for modified files | OK | Modified files report N/N; new files report N/A (new) and are untracked |

### Spec Compliance Matrix (summary)
Totals: 17 requirements (16 carta-productos, 1 carta-secciones), 52 scenarios (47 + 5). 47 fully COMPLIANT, 5 PARTIAL (each has a passing covering test for its rule at unit or component level; envelope counts them as complete because the validator admits only binary completion, and they are reported as W1), 0 UNTESTED, 0 FAILING.

Backend tests (all in `backend/tests/modules/productos/` unless noted):
- CA1: Alta valida minima: `test_router > test_crear_plato_responde_201_con_la_forma_de_producto_salida`, `test_service > test_crear_producto_minimo_queda_habilitado_como_plato`. Alta completa: `test_crear_plato_completo_con_imagen_devuelve_su_url`. Alta desde la pantalla: `PlatoNuevoPage.test > da de alta el plato minimo...` and `useFormularioPlato.test > envia el alta minima...`. COMPLIANT.
- CA2: Falta nombre/precio/seccion/ingredientes: `test_crear_plato_sin_campos_obligatorios_responde_422_e_indica_el_campo[x4]`. Nombre con espacios: `test_crear_plato_con_datos_invalidos...[cambios0-nombre]`. Formulario vacio: `PlatoNuevoPage.test > con campos vacios no envia...`. COMPLIANT. "Faltan seccion y precio" at once is only tested one field at a time: PARTIAL.
- CA3: `test_crear_plato_con_nombre_repetido_responde_409`, `test_service > ..._otra_capitalizacion`, `..._de_un_plato_deshabilitado`, `..._permite_el_mismo_nombre_en_otra_categoria`; form warning: `PlatoNuevoPage.test > advierte el 409...`. COMPLIANT.
- CA4: 101 chars: router `[cambios1-nombre]`, `test_schemas > test_nombre_vacio_o_de_mas_de_100...`, `validarPlato.test > advierte un nombre de 101...`. 100 chars: schema and `validarPlato` only, no POST-level 201 with digits: PARTIAL.
- CA5: `test_crear_plato_responde_201...` ("1500.50"), router `[cambios2..5-precio]`, `PlatoNuevoPage.test` (input `12.500,50` sends `12500.50`), `useFormularioPlato.test > con un precio invalido no envia`, `validarPlato.test.each`. COMPLIANT.
- CA6: router `[cambios6, cambios7]`, `test_schemas > test_ingredientes_invalidos[x5]`, `ListaDeTextos.test` (vacio, repetido, quitar). COMPLIANT; "Quitar un chip ... se enviara unicamente ese" asserted only at component level (PARTIAL).
- CA7: sin descripcion: minimal 201 test (`descripcion` null); 501: router `[cambios8-descripcion]`; counter: `PlatoNuevoPage.test > cuenta los caracteres`. COMPLIANT.
- CA8: `PlatoNuevoPage.test > avisa, enlaza a Secciones y deshabilita... si %s` (2 cases), `ProductosPage.test > abre la pestania Secciones...`. COMPLIANT.
- CA9: `test_crear_plato_con_seccion_inexistente_responde_404`, `..._deshabilitada_responde_409`, `test_service` equivalents, `test_listar_secciones_con_estado_habilitado_filtra_y_cuenta`, `PlatoNuevoPage.test > el selector lista solo las secciones habilitadas`. COMPLIANT.
- CA10: router `test_crear_plato_con_imagen_invalida...[extension-falsa|pdf|mas-de-5-mb]` (asserts 422, message, no file, no row), `test_imagenes` (texto, pdf, gif, bmp, truncada, vacio, 5MB+1, exactamente 5MB), `test_crear_plato_con_imagen_de_2_mb_la_deja_servida`, `SelectorImagen.test > rechaza un archivo de 6 MB`. COMPLIANT.
- CA11: `SelectorImagen.test` (dos botones con capture, vista previa y quitar, HEIC con nombre y tamano). COMPLIANT.
- CA12: `test_crear_plato_ignora_el_nombre_original_de_la_imagen`; `test_imagenes > test_procesar_heic_valido_se_convierte_a_jpeg`, `..._aplica_la_orientacion_exif...`. The scenarios "Alta con HEIC" (POST returns `.jpg`, served file is a valid JPEG) and "Imagen servida tras guardar" (HEIC) have no HTTP-level test: only the unit `procesar` is covered: 2 PARTIAL.
- CA13: router `[cambios9, cambios10]`, `test_schemas > test_etiquetas_*`, `ListaDeTextos.test`. COMPLIANT.
- CA14: minimal 201 test and `PlatoNuevoPage.test > da de alta el plato minimo`. COMPLIANT.
- Estado asignado: `test_crear_plato_ignora_estado_y_categoria_enviados_fuera_de_datos`, `test_schemas > test_campos_desconocidos_se_rechazan[x2]` (inside `datos` -> 422), `PlatoNuevoPage.test > muestra el estado fijo`. COMPLIANT.
- Atomicidad: `test_service > test_crear_producto_con_fallo_en_commit_no_deja_fila_ni_archivo`, `..._con_integridad_violada...`, `..._con_imagen_invalida_no_guarda_nada`. COMPLIANT.
- carta-secciones: Listado paginado `test_listar_secciones_pagina_y_ordena_por_orden`; Limite fuera de rango `test_listar_con_limit_fuera_de_rango_responde_422[secciones]`; Filtro habilitado `test_listar_secciones_con_estado_habilitado_filtra_y_cuenta` + service variant; Estado invalido `test_listar_secciones_con_estado_invalido_responde_422`; Sin filtro `test_listar_secciones_sin_estado_incluye_todas`. 5/5 COMPLIANT.

**Acceptance criteria (14)**: each has at least one happy-path and one error/limit test (CA1/14 happy only by nature; their error side is CA2). Verified above.

### Correctness (Static Evidence)
| Area | Status | Notes |
|------|--------|-------|
| Import contracts | OK | `lint-imports` 10 kept |
| service without FastAPI, raises only shared exceptions | OK | `service.py` imports no FastAPI; uses `NoEncontradoError`, `ReglaDeNegocioError`; `imagenes.py` raises `DatosInvalidosError` |
| router only delegates | OK | `router.py:141-147`; `datos_de` and `leer_imagen` are request-adapter helpers, no business rules |
| API returns schemas, `{"detalle"}` errors | OK | `ProductoSalida`; handlers in `main.py` for 404/409/422 |
| Pagination | OK | `FiltroSecciones(ParametrosPaginacion)`, `total` counts the filter |
| Function size/complexity | OK | ruff passes with max-complexity 10 and PLR0915 |
| No `any`, no `fetch` in components | OK | grep over `modules/productos` non-test: none; no eslint-disable |
| Test names `test_<funcion>_<caso>` | OK | All new backend tests conform |
| Exact pins, no secrets | OK | `python-multipart==0.0.32`, `Pillow==13.0.0`, `pillow-heif==1.8.1`; `.env.example` has `MEDIA_DIR=./media`; `.gitignore` ignores `backend/media/` |

**Upload security**: server-chosen name `uuid4().hex.<ext>` (`imagenes.py:78`), client name never used; router reads at most 5 MB + 1 byte (`router.py:138`) and `procesar` rejects over 5 MB and empty; content validated via Pillow format whitelist, not extension or Content-Type; pixel cap 50 MP checked before `load()` plus `DecompressionBombError` caught; re-encoded without EXIF; file removed on commit/IntegrityError failure (`service.py:271-288`); image processed before DB access so invalid images leave no file; `/media` is `StaticFiles` on the media dir only (no HTML listing, traversal blocked by Starlette), `check_dir=False` so import creates no folder.

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| B1 composite unique index | Yes | Model and migration; `alembic check` clean |
| B2/B3 `datos` JSON dependency, `RequestValidationError` with `body` prefix | Yes | Spike confirmed, no fallback needed |
| B4 `DatosInvalidosError` + 422 handler | Yes | |
| B5 `imagenes.py` in the module | Yes | |
| B6 order of operations | Yes | `test_crear_producto_valida_la_imagen_antes_que_la_seccion` |
| B7 ClassVar category/message | Yes | |
| B8 `media_dir`, `montar_media` | Yes | `test_media.py` |
| B9 `normalizar_nombre` | Yes | Single definition; migration copies it |
| B10 pinned deps | Yes | Installed on 3.12 (see W2) |
| Deviation 1 `FiltroSecciones` | Accepted | HTTP contract unchanged |
| Deviation 2 MPO accepted | Accepted | Reasonable, saved as JPEG |
| Deviation 3 estado/categoria | Resolved | Matches updated spec: inside `datos` -> 422, loose parts ignored; both tested |
| Deviations 4-7 | Accepted | Neutral |

### Assertion Quality
No tautologies, ghost loops or smoke-only tests found. Empty-collection assertions (`ListaDeTextos.test:71,90,132`, `test_service:351,369`, `test_imagenes:160`) have companion non-empty tests. Mock ratio in `PlatoNuevoPage.test` is low. **Assertion quality**: OK.

### Changed File Coverage
Backend: `imagenes.py`, `router.py`, `schemas.py`, `service.py`, `repository.py`, `excepciones.py`, `producto.py` all 100% (global 99.36%). Frontend coverage only reports `App.tsx`, `shared/` (the `modules/` folder is outside the configured coverage scope): `client.ts` 100% lines. Productos components are tested but not measured.

### Issues Found
**CRITICAL**: None.

**WARNING**:
- W1 (partial scenarios) No HTTP-level test for HEIC upload (`Alta con HEIC`, `Imagen servida tras guardar`) in `test_router.py`/`test_service.py`; also "Faltan seccion y precio" together, "Nombre de 100 caracteres con numeros" at POST level, and "Quitar un chip ... solo ese ingrediente se envia" are covered only at unit/component level. Add one POST test with a HEIC (assert `imagen_url` ends in `.jpg`, served bytes open as JPEG) and one POST with both fields missing.
- W2 `pip-audit` was not run (not installed); the three new dependencies are unaudited (RNF-SEG-10). Run in CI or by hand before the PR and note it.
- W3 Not verified in a real browser (`npm run dev`), phone camera, or a real iPhone HEIC; HEIC fixtures are generated with `pillow_heif`.
- W4 Size: backend about 1,581 and frontend about 1,658 changed lines against the 800 checkpoint (informational for single-pr; note it in the PR).

**SUGGESTION**:
- S-a `imagenes.guardar` (`imagenes.py:74-80`) runs outside the cleanup `try`: a disk error mid-write would raise 500 and could leave a partial file. Low risk; consider wrapping the write.
- S-b `MEDIA_DIR=./media` is relative to the process cwd; use an absolute path in deployment.
- S-c Starlette spools the full upload to disk before the router (open question in design); cap the body size at the proxy.
- S-d Index B1 also covers `MENU_DEL_DIA`: notify M2 (already in PR notes). Notify M2, M4, M6 about the shared `Producto` change.
- S-e Frontend coverage excludes `modules/`; consider including it so product code is measured.

### Verdict
PASS WITH WARNINGS
All CI checks, migrations and 307 tests pass; no critical findings; 5 of 52 scenarios (counted complete in the envelope) are only partially covered at the HTTP/end-to-end level.
