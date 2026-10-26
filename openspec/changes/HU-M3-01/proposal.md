# Propuesta: HU-M3-01 Agregar un sector

- **Issue:** [#33](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/33) · **Épica:** #32 · **Tarea madre:** #167
- **Rama:** `feature/HU-M3-01-agregar-sector`

## Intención

El módulo de Salón no tiene entidades: la pantalla es un marcador y la API no expone sectores. Sin sectores no se pueden crear mesas (HU-M3-05) ni reservas (M5). Esta HU agrega la entidad `Sector`, su alta y el formulario de creación, y deja el patrón de capas y pruebas que reutilizarán las demás HU del módulo.

## Alcance

### Incluido

- `POST /api/v1/sectores` (201) que cubre los 6 criterios de aceptación.
- Tabla `sectores` con migración de Alembic y unicidad del nombre sin distinguir mayúsculas.
- Registro del router del salón en `main.py`.
- Frontend: botón «Nuevo sector» y diálogo de alta en `/salon`, con validaciones y toast.
- Una prueba por criterio de aceptación (camino feliz y error o límite).

### Excluido

- Listar, modificar, eliminar o habilitar/deshabilitar sectores (HU-M3-02, HU-M3-03, HU-M3-04).
- Mesas y mozos (HU-M3-05 a HU-M3-12).
- El listado y la columna «Mesas» de la maqueta, que dependen de HU-M3-04 y HU-M3-08.

## Capacidades

### Nuevas

- `salon-sectores`: alta de sectores con nombre único, descripción opcional y estado asignado por el sistema.

### Modificadas

- Ninguna.

## Decisiones tomadas

- **D1. Entidad y tabla.** `Sector` en `backend/app/modules/salon/models.py`, tabla `sectores`. El estado reutiliza el enum compartido `Estado`.
- **D2. Unicidad.** Columna `nombre_normalizado` (`strip().casefold()`) mantenida por `@validates("nombre")`, con índice único. Mismo criterio que `Seccion` en M1.
- **D3. Estado.** El esquema de entrada prohíbe campos extra (`extra="forbid"`), así que el cliente no puede enviar `estado`; el `service` lo fija en `HABILITADO`.
- **D4. Frontend.** Diálogo de alta sobre `/salon`, reutilizando `Dialog`, `FormField`, `Input`, `Textarea` y `useToast`. El listado queda para HU-M3-04.

## Enfoque

Capas `router → service → repository → models`. El `router` solo delega; el `service` valida el nombre libre y confirma la transacción; el `repository` consulta y agrega sin confirmar (D-10). El frontend llama a la API solo desde `modules/salon/api.ts` (D-16).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | La unicidad del nombre usa `strip().casefold()` e incluye sectores deshabilitados. |
| S2 | La descripción admite hasta 200 caracteres; vacía se guarda como `null`. |
| S3 | El estado no se recibe; toda alta queda `HABILITADO`. |
| S4 | Nombre repetido → 409; datos inválidos → 422; alta correcta → 201. |
| S5 | El listado de sectores y la columna «Mesas» de la maqueta son de HU-M3-04/HU-M3-08. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/salon/{models,schemas,repository,service,router}.py` | Modificado |
| `backend/tests/modules/salon/` | Nuevo |
| `backend/alembic/versions/` | Nueva migración |
| `backend/app/main.py` | Compartido: `include_router` del salón |
| `frontend/src/modules/salon/{types.ts,api.ts,pages,components}` y sus pruebas | Modificado y nuevo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Conflicto de migraciones con otro módulo. | Verificar `alembic heads` antes del PR. |
| Pantalla sin listado hasta HU-M3-04. | Toast de confirmación; se documenta como entrega incremental en el PR. |
| `main.py` compartido. | Cambio mínimo de una línea, avisado en el PR (§9.3). |

## Plan de reversión

- `alembic downgrade -1` elimina `sectores`; no hay otras tablas que dependan de ella todavía.
- Revertir el merge en `develop` y el `include_router` de `main.py`; el frontend vuelve al marcador.

## Dependencias

- Ninguna. Es la primera entidad del módulo.
- Habilita HU-M3-05 (crear mesa) y, a través de ella, a M4 y M5.

## Criterios de éxito

- [ ] Cada criterio de aceptación tiene una prueba que pasa.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] `alembic upgrade head` y `alembic downgrade -1` funcionan.
- [ ] El equipo valida S1 a S5.
