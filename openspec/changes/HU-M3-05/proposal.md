# Propuesta: HU-M3-05 Crear una mesa

- **Issue:** [#38](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/38) · **Épica:** #37 · **Tarea padre:** #167
- **Rama:** `feature/HU-M3-05-crear-mesa`

## Intención

Con los sectores creados (HU-M3-01), falta la entidad que M4 (comandas) y M5 (reservas) necesitan para ubicar a los clientes. Esta HU agrega la entidad `Mesa`, su alta con número único dentro del sector y estado inicial `LIBRE`, y el formulario «Nueva mesa» del salón.

## Alcance

### Incluido

- `POST /api/v1/mesas` (201) que cubre los 7 criterios de aceptación.
- Tabla `mesas` con migración, FK a `sectores`, unicidad `(sector_id, numero)`, `numero > 0` y `capacidad > 0`.
- `EstadoMesa {LIBRE, OCUPADA, FUERA_DE_SERVICIO}` en `shared/models/enums.py`.
- Lectura de apoyo `GET /api/v1/sectores` (paginada, filtro opcional `estado`) para el selector del formulario. El listado visible sigue siendo HU-M3-04.
- Frontend: botón «Nueva mesa» y diálogo con Sector, Número y Capacidad; aviso de estado `Libre`; validaciones y toast.
- Una prueba por criterio de aceptación (camino feliz y error o límite).

### Excluido

- Listar, modificar, eliminar u ocupar/liberar mesas (HU-M3-06, HU-M3-07, HU-M3-08 y las HU de M4).
- La pantalla de listado de sectores (HU-M3-04) y la de mesas (HU-M3-08).
- Mozos (HU-M3-09 a HU-M3-12).

## Capacidades

### Nuevas

- `salon-mesas`: alta de mesas con número único por sector, capacidad y estado asignado por el sistema.

### Modificadas

- `salon-sectores`: se agrega la lectura paginada `GET /sectores` con filtro opcional `estado`, necesaria para el selector del alta de mesas. No cambia el alta existente.

## Decisiones tomadas

- **D1. Entidad y tabla.** `Mesa` en `backend/app/modules/salon/models.py`, tabla `mesas`; FK a `sectores` con `ondelete=RESTRICT`.
- **D2. Estado.** `EstadoMesa` en `shared/models/enums.py`; el esquema de entrada prohíbe campos extra y el `service` fija `LIBRE`.
- **D3. Unicidad.** Restricción única `(sector_id, numero)` más comprobación previa para el 409 legible.
- **D4. Lectura de apoyo.** `GET /sectores` mínimo y paginado, con filtro opcional `estado`, para el selector. Se documenta como adelanto de HU-M3-04.
- **D5. Frontend.** Diálogo «Nueva mesa» sobre `/salon`, reutilizando `Dialog`, `FormField`, `Input`, `Select` y `useToast`.

## Enfoque

Capas `router → service → repository → models`. El `service` valida el sector (existe y está habilitado), el número libre dentro del sector y confirma la transacción; el `repository` consulta y agrega sin confirmar (D-10). El frontend llama a la API solo desde `modules/salon/api.ts` (D-16).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | El número es único por sector; dos sectores pueden tener la mesa 1. |
| S2 | Solo se puede asignar un sector habilitado; uno deshabilitado responde 409. |
| S3 | No hay tope superior de número ni de capacidad; la HU solo exige «mayor a cero». Se descartan los topes 99/20 de S1-07 por contradecir el issue. |
| S4 | El estado no se recibe; toda alta queda `LIBRE`. |
| S5 | Las tablas y filtros de la maqueta son de HU-M3-08. |
| S6 | `GET /sectores` es una lectura de apoyo mínima de HU-M3-04; no incluye la pantalla de listado. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/salon/{models,schemas,repository,service,router}.py` | Modificado |
| `backend/app/shared/models/enums.py` | Compartido: `EstadoMesa` |
| `backend/tests/modules/salon/` | Modificado y nuevo |
| `backend/alembic/versions/` | Nueva migración (`down_revision` = revisión de HU-M3-01) |
| `frontend/src/modules/salon/{types.ts,api.ts,pages,components}` y sus pruebas | Modificado y nuevo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| HU-M3-01 sin integrar al empezar el apply. | Rama apilada sobre `feature/HU-M3-01-agregar-sector` y rebase después del merge. |
| Dos migraciones encadenadas. | Verificar `alembic heads` antes del PR. |
| `shared/models/enums.py` compartido. | Cambio aditivo; se avisa a M4 y M5 en el PR (§9.3). |
| Pantalla sin listado hasta HU-M3-08. | Toast de confirmación; se documenta como entrega incremental. |

## Plan de reversión

- `alembic downgrade -1` elimina `mesas`; `sectores` se conserva. Un `downgrade` adicional elimina `sectores` (HU-M3-01).
- Revertir el merge en `develop`; el frontend vuelve al diálogo de sector únicamente.

## Dependencias

- HU-M3-01 (#33) integrada: entidad y tabla `sectores`.
- Habilita M4 (comandas) y M5 (reservas).

## Criterios de éxito

- [ ] Cada criterio de aceptación tiene una prueba que pasa.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] `alembic upgrade head` y `alembic downgrade -1` funcionan.
- [ ] El equipo valida S1 a S6.
