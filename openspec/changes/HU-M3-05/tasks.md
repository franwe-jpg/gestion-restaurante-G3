# Tareas: HU-M3-05 Crear una mesa

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas cambiadas estimadas | Backend ≈ 595 (código 245 + pruebas 350); frontend ≈ 515 (código 265 + pruebas 250) |
| Riesgo frente al límite de revisión | Bajo (ambos lados por debajo de 800) |
| PR encadenados recomendados | No |
| División sugerida | Un solo PR con 5 commits por unidad de trabajo |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

Nota: AGENTS.md §4 y `openspec/config.yaml` fijan un PR por HU; el límite 800/800 es un punto de control, no un bloqueo.

### Unidades de trabajo (commits dentro del PR único)

| Unidad | Objetivo | Commit | Prueba focalizada | Arnés de ejecución | Límite de reversión |
|--------|----------|--------|-------------------|--------------------|---------------------|
| 1 | EstadoMesa, modelo `Mesa` y migración | `feat` | `pytest tests/modules/salon/test_modelo.py tests/modules/salon/test_migracion.py` | `alembic upgrade head` / `downgrade -1` en base temporal | Enum, `models.py`, revisión y pruebas |
| 2 | Esquemas de mesa | `feat` | `pytest tests/modules/salon/test_schemas.py` | N/A | `schemas.py` y su prueba |
| 3 | Repositorio, servicio, rutas y lectura de apoyo | `feat` | `pytest tests/modules/salon` | `TestClient` con base migrada | Capas de `salon/` y pruebas |
| 4 | Cliente, tipos, validaciones y formulario (lógica) | `feat` | `npm test -- salon` | N/A: sin diálogo todavía | `types.ts`, `api.ts`, `components/`, `validarMesa.ts` |
| 5 | Diálogo y acción en la página del salón | `feat` | `npm test -- salon` | `npm run dev` y alta manual | `MesaFormDialog.tsx`, `SalonPage.tsx` y pruebas |

**Ruta de implementación:** delegado en dos escritores paralelos para las unidades 1 a 3 (backend) y 4 a 5 (frontend), con superficies de edición disjuntas; el padre revisa cada diff, ejecuta la suite completa como chequeo de costura y hace los commits. Motivo: dos unidades independientes de varios cientos de líneas cada una (Writer trigger, paralelismo).

**Dependencia de rama:** si HU-M3-01 no está integrada en `develop` al empezar, esta rama se apila sobre `feature/HU-M3-01-agregar-sector` y se rebasa sobre `develop` después del merge. La migración de `mesas` usa como `down_revision` la revisión de `sectores`.

## Fase 1: Backend

- [x] 1.1 RED: `test_modelo.py` — `EstadoMesa` existe con sus tres valores; `Mesa` toma `LIBRE` por defecto; `CHECK` de `numero` y `capacidad`; `UNIQUE (sector_id, numero)` produce `IntegrityError` al repetir y permite el mismo número en otro sector.
- [x] 1.2 GREEN: `EstadoMesa` en `backend/app/shared/models/enums.py` (compartido, B2) y `Mesa` en `backend/app/modules/salon/models.py` (B1, B7).
- [x] 1.3 RED: `test_migracion.py` — `upgrade head` crea `mesas` con FK a `sectores` y sus restricciones; `downgrade -1` elimina `mesas` y conserva `sectores`.
- [x] 1.4 GREEN: revisión `<rev>_crea_mesas.py` con `down_revision` = revisión de HU-M3-01, modo batch. Verificar `alembic heads` con una sola cabeza.
- [x] 1.5 RED: `test_schemas.py` — número y capacidad válidos; `0`, negativo, texto, decimal y booleano → 422; `sector_id` ausente o ≤ 0 → 422; `estado` extra → 422.
- [x] 1.6 GREEN: `MesaCrear`, `SectorResumen` y `MesaSalida` en `salon/schemas.py`.
- [x] 1.7 RED: `test_service.py` con `fabrica_sector` y `fabrica_mesa` en `conftest.py` — alta mínima y estado `LIBRE`; número repetido en el mismo sector → 409; mismo número en otro sector → 201; sector inexistente → 404; sector deshabilitado → 409; `IntegrityError` → 409 sin fila.
- [x] 1.8 GREEN: `repository.obtener_sector`, `existe_numero_en_sector`, `agregar` generalizado y `listar_sectores`; `service.crear_mesa` y `service.listar_sectores`.
- [x] 1.9 RED: `test_router.py` — 201 y forma de `MesaSalida`; 422 parametrizado por campo; 404 y 409 con `detalle`; `estado` enviado → 422; `GET /sectores?estado=HABILITADO` filtra y cuenta; `limit=101` y `offset=-1` → 422.
- [x] 1.10 GREEN: `POST /mesas` y `GET /sectores` en `salon/router.py`.
- [x] 1.11 REFACTOR: `ruff check --fix . && ruff format .`, `lint-imports` y funciones de hasta 50 líneas.

## Fase 2: Frontend

- [x] 2.1 RED/GREEN: `types.ts` (`EstadoMesa`, `SectorResumen`, `Mesa`, `MesaCrear`) y `api.ts` (`crearSector`, `listarSectoresHabilitados`, `crearMesa`) con prueba (rutas, cuerpo e `id`).
- [x] 2.2 RED/GREEN: `components/validarMesa.ts` + prueba (obligatorios, `0`, negativos, letras, decimales, sector ausente, `errorDelServidor` del 409 de número y de sector).
- [x] 2.3 RED/GREEN: `components/useFormularioMesa.ts` + prueba (envío, toast, 409 conserva lo escrito, no envía con errores locales).
- [x] 2.4 RED/GREEN: `components/MesaFormDialog.tsx` + prueba (campos, aviso «La mesa se crea en estado Libre», selector solo con habilitados, sin sectores habilitados deshabilita «Guardar mesa», cancelar sin llamada).
- [x] 2.5 RED/GREEN: `SalonPage.tsx` + prueba (acciones «Nuevo sector» y «Nueva mesa», apertura y cierre de cada diálogo).
- [x] 2.6 REFACTOR: `npm run format`; buscar componentes reutilizables en `shared/components/`; contrastar con `SPRINT-2/S2-04-maqueta/salon.html` y anotar diferencias.

## Fase 3: Verificación final y notas del PR

- [x] 3.1 Backend desde `backend/`: `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %); `alembic upgrade head`, `alembic downgrade -1`, `alembic downgrade -2` y `alembic heads`.
- [x] 3.2 Frontend desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 3.3 Reunir notas del PR (sin crear issues ni comentarios):
  - Archivo compartido tocado (§9.3): `backend/app/shared/models/enums.py` (`EstadoMesa`); avisar a M4 y M5.
  - Contradicción con S1-07: topes 99/20 y estado `RESERVADA` descartados; gana el issue #38 y el diagrama.
  - `GET /sectores` es lectura de apoyo de HU-M3-04; su pantalla no se implementa acá.
  - Diferencias con la maqueta: sin tabla, filtros ni pestañas; alta en diálogo.
  - Tamaño por lado frente a 800/800.

## Notas del apply

- La revisión de Alembic generada es `b2d4f6a8c0e1_crea_mesas.py` (`down_revision = "f3a5c7e9b1d2"`).
- `EstadoMesa` quedó en `backend/app/shared/models/enums.py` y se re-exporta desde `backend/app/shared/models/__init__.py`, para que M4 y M5 lo importen como el resto de las entidades compartidas.
- La prueba de downgrade de sectores pasó de `-1` a `-2` porque la cabeza avanzó: con la cabeza nueva, `-2` elimina `mesas` y `sectores`; `-1` elimina solo `mesas`. Se agregó además una prueba específica para el downgrade de mesas.
- `GET /sectores` se implementó como lectura de apoyo paginada con filtro opcional `estado`; la pantalla de listado sigue siendo HU-M3-04.
- Resultado: backend 461 pruebas en verde, cobertura 99,46 %; frontend 67 pruebas del módulo en verde, cobertura global 76,48 % de líneas, lint, formato, typecheck y build en verde.
- Punto de control de revisión: backend ≈ 857 líneas y frontend ≈ 850, apenas por encima de 800 por lado. AGENTS.md §4 fija un solo PR por HU; no se divide.
