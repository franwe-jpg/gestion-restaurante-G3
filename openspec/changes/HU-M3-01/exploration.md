# Exploración: HU-M3-01 Agregar un sector

- **Issue:** [#33](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/33) · **Épica:** #32 · **Tarea padre:** #167
- **Rama:** `feature/HU-M3-01-agregar-sector`
- **Entrada:** criterios de aceptación 1 a 6 del issue y `SPRINT-2/S2-04-maqueta/salon.html` (pestaña «Sectores»).

## 1. Estado actual relevante

| Pieza | Estado |
| --- | --- |
| `backend/app/modules/salon/*` | Esqueleto: `models.py`, `repository.py`, `router.py`, `schemas.py` y `service.py` solo tienen un docstring. No hay entidades ni endpoints. |
| `backend/alembic/env.py` | Ya importa `app.modules.salon.models` en `MODULOS_CON_MODELOS`; no hace falta registrarlo. |
| `backend/app/main.py` | Solo incluye el router de `productos`. Falta `include_router` del salón (archivo compartido). |
| `backend/app/shared/models/enums.py` | Define `Estado` (HABILITADO/DESHABILITADO) y `Categoria`. `Estado` se reutiliza para el sector. |
| Patrón de unicidad de HU-M1-01 | `Seccion.nombre_normalizado = nombre.strip().casefold()` con `@validates("nombre")`, columna única e índice. Se reutiliza para el sector. |
| Patrón de alta de HU-M1-01 | Esquema Pydantic con `StringConstraints`, `service` que valida y confirma, `repository` con `existe_*` y `agregar`, `router` que solo delega, errores 404/409/422 con `{"detalle": ...}`. |
| `frontend/src/modules/salon/*` | Esqueleto: `SalonPage.tsx` muestra `EmptyState` «Módulo pendiente de implementación»; `api.ts` lista mesas y mozos contra rutas que no existen; `types.ts` tiene tipos provisorios en minúsculas. |
| `frontend/src/App.tsx` | La ruta `/salon` ya existe y es `lazy`; no hay que tocarla. |
| Componentes compartidos | `Dialog`, `FormField`, `Input`, `Textarea`, `Select`, `Button`, `Alert`, `PageHeader`, `useToast`, `useApi`. `SeccionFormDialog` de M1 resuelve un alta equivalente. |
| Maqueta `salon.html` | Pestañas Sectores/Mesas/Mozos, tabla de sectores con Nombre, Descripción, Mesas y Estado, y botón «Nuevo sector» en el encabezado. |

## 2. Hallazgos

### 2.1 Esquema

- El diagrama de clases define `Sector` con `id: int`, `nombre: str {≤30, único}`, `descripcion: str [0..1]` y `estado: Estado = HABILITADO`.
- Tipos propuestos: `nombre` `String(30)`; `nombre_normalizado` `String` único (no se expone); `descripcion` `String(200)` nula; `estado` `sa.Enum(Estado, native_enum=False)` con valor por defecto `HABILITADO`.
- **Supuesto:** la unicidad del nombre ignora mayúsculas, tildes y espacios, igual que las secciones de M1 (`casefold()` + `strip()`), e incluye sectores deshabilitados. La HU solo dice «único»; se elige el criterio ya usado en el repositorio.
- **Supuesto:** la descripción admite hasta 200 caracteres. Ni la HU ni el diagrama fijan un máximo.
- Es la primera entidad del módulo: requiere una revisión nueva de Alembic con `down_revision` en la cabeza actual (`c4e6a8b0d2f4`) y modo `batch` (SQLite).

### 2.2 API y capas

- `POST /api/v1/sectores` → 201 `SectorSalida {id, nombre, descripcion, estado}`.
- El estado no se recibe: `extra="forbid"` en el esquema hace que enviarlo responda 422 (la HU dice que lo asigna el sistema). Es más estricto que `SeccionCrear` de M1, que lo ignora.
- Errores: nombre repetido → 409 `{"detalle": "El sector ya existe"}`; datos inválidos → 422 con el manejador global.
- `service.crear_sector` valida el nombre libre, arma el `Sector` con `Estado.HABILITADO`, `repository.agregar` hace `add` + `flush` y el `service` confirma; ante `IntegrityError` deshace y responde 409.
- El `router` del salón se registra en `main.py` (archivo compartido, §9.3).

### 2.3 Frontend

- `SalonPage` deja de ser un marcador: encabezado «Salón y Mozos» con botón «Nuevo sector» y el diálogo de alta. El listado de la maqueta pertenece a HU-M3-04 y queda fuera de esta HU.
- `components/SectorFormDialog.tsx` sigue el patrón de `SeccionFormDialog`: se monta solo al abrir, campos vacíos, «Cancelar» cierra sin llamar a la API, «Guardar» valida y envía.
- Validaciones locales: nombre obligatorio y máximo 30; descripción opcional y máximo 200. El 409 de nombre repetido se ubica bajo el campo Nombre.
- Después de crear: toast «Sector creado» y cierre del diálogo. No hay listado todavía.
- Diferencias con la maqueta (se anotan en el PR): la maqueta muestra la tabla de sectores y la columna «Mesas»; el listado y el conteo son de HU-M3-04/HU-M3-08. El alta se muestra en un diálogo, no en una página aparte.

### 2.4 Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 185 (incluye ≈ 35 de migración) | ≈ 250 | ≈ 435 | 800: holgado |
| Frontend | ≈ 230 | ≈ 200 | ≈ 430 | 800: holgado |

Va en un solo PR (AGENTS.md §4).

## 3. Decisiones de rumbo

Ninguna que cambie el alcance. Las dos decisiones de forma (unicidad sin distinguir mayúsculas y largo de la descripción) se anotan como `Supuesto:` para que el equipo las valide en la revisión de la spec.

## 4. Supuestos

- S1: la unicidad del nombre usa `strip().casefold()` e incluye sectores deshabilitados.
- S2: la descripción admite hasta 200 caracteres; vacía se guarda como `null`.
- S3: el estado no se recibe en el alta; el sistema lo fija en `HABILITADO`.
- S4: el nombre repetido responde 409; los datos inválidos, 422; la respuesta exitosa, 201.
- S5: el listado de sectores y la columna «Mesas» de la maqueta pertenecen a HU-M3-04 y HU-M3-08.

## 5. Riesgos

- Conflicto de migraciones si otro módulo agrega una revisión en paralelo: verificar `alembic heads` antes del PR.
- `main.py` es compartido: el cambio es una línea y se avisa en el PR.
- La pantalla queda sin listado hasta HU-M3-04: se mitiga con el toast de confirmación y se documenta como entrega incremental.
