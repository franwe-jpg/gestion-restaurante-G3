# Diseño: HU-M3-01 Agregar un sector

- **Issue:** #33 · **Rama:** `feature/HU-M3-01-agregar-sector` · **Entrada:** `proposal.md` (D1 a D4, S1 a S5) y los patrones de M1 (Sección, HU-M1-01).

## Enfoque técnico

`POST /api/v1/sectores` recibe JSON validado por `SectorCrear`. El `router` delega en `service.crear_sector`, que valida el nombre libre, arma el `Sector` con `Estado.HABILITADO` y confirma. El `repository` solo consulta y agrega (D-01, D-02, D-10). La unicidad se garantiza con `nombre_normalizado` (`strip().casefold()`) y un índice único, además de la comprobación previa para devolver un 409 legible. La tabla se crea con una revisión nueva de Alembic.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| A1 | Unicidad (D2, S1) | Columna `nombre_normalizado` mantenida por `@validates("nombre")`, índice único | Índice único sobre `nombre` | SQLite compara texto distinguiendo mayúsculas; el patrón ya existe en `Seccion` (M1) y evita duplicados como «Terraza»/«terraza». |
| A2 | Estado (D3, S3) | `SectorCrear` con `extra="forbid"`; el `service` fija `Estado.HABILITADO` | Aceptar `estado` y forzarlo en el `service` | La HU dice que lo asigna el sistema. Rechazar el campo hace explícito el contrato y evita que el cliente crea que puede elegirlo. |
| A3 | Descripción (S2) | `String(200)` nula; `""` → `None` con `field_validator` | `Text` sin límite | SQLite no impone largos; la API necesita un tope validable. **Supuesto** del equipo. |
| A4 | Persistencia del enum | `sa.Enum(Estado, native_enum=False)` | `String` con validación solo en Pydantic | Mismo patrón que `Seccion`; el valor queda como texto y no depende de un tipo nativo de SQLite. |
| A5 | Ubicación del modelo | `backend/app/modules/salon/models.py` (ya registrado en `alembic/env.py`) | `backend/app/shared/models/` | Solo M3 administra sectores; los demás módulos los consumen por el `service` (S0-05 §3.3). |
| A6 | Router | `app.include_router(salon_router, prefix=API_PREFIX)` en `main.py` | Montarlo desde otro router | `main.py` es el único lugar donde se registran los routers de todos los módulos. |

## Flujo de datos

```
SectorFormDialog ─JSON {nombre, descripcion?}─→ router.crear_sector
                                                      │
                                                      ▼
service.crear_sector(db, datos)
  1. _validar_nombre_libre: repository.existe_nombre_normalizado → 409
  2. Sector(nombre, descripcion, estado=HABILITADO)
  3. repository.agregar: add + flush
  4. db.commit                    → IntegrityError → rollback + 409
  └→ SectorSalida (201)
```

## Contratos

**Modelo (`salon/models.py`):**

```python
class Sector(Base):
    __tablename__ = "sectores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(sa.String(30))
    nombre_normalizado: Mapped[str] = mapped_column(sa.String, unique=True)
    descripcion: Mapped[str | None] = mapped_column(sa.String(200))
    estado: Mapped[Estado] = mapped_column(
        sa.Enum(Estado, native_enum=False), default=Estado.HABILITADO
    )

    @validates("nombre")
    def _sincronizar_nombre_normalizado(self, _clave: str, nombre: str) -> str:
        self.nombre_normalizado = nombre.strip().casefold()
        return nombre
```

**Esquemas (`salon/schemas.py`):**

```python
NOMBRE_SECTOR_MAXIMO = 30
DESCRIPCION_SECTOR_MAXIMA = 200

class SectorCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # estado no se recibe (S3)
    nombre: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
    descripcion: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] | None = None

class SectorSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    descripcion: str | None
    estado: Estado
```

`field_validator("descripcion")` convierte `""` en `None`.

**Repository:** `existe_nombre_normalizado(db, nombre_normalizado) -> bool` y `agregar(db, entidad: Sector) -> None` (`add` + `flush`).

**Service:** `crear_sector(db: Session, datos: SectorCrear) -> SectorSalida`; mensaje del 409: «El sector ya existe».

**API:**

| Ruta | Respuesta | Errores |
| --- | --- | --- |
| `POST /api/v1/sectores` | 201 `SectorSalida` | 409 nombre repetido; 422 datos inválidos |

## Frontend

| Pieza | Diseño |
| --- | --- |
| `types.ts` | `Estado`, `Sector`, `SectorCrear`; se conservan `Mesa`/`Mozo` provisorios hasta HU-M3-05. |
| `api.ts` | `crearSector(datos): Promise<RespuestaApi<Sector>>` por `clienteHttp.post` (D-16). |
| `components/validarSector.ts` | `NOMBRE_SECTOR_MAXIMO = 30`, `DESCRIPCION_SECTOR_MAXIMA = 200`; errores «El nombre es obligatorio.», «El nombre supera los 30 caracteres permitidos.», «La descripción supera los 200 caracteres permitidos.»; `errorDelServidor` ubica «ya existe» bajo Nombre. |
| `components/useFormularioSector.ts` | Estado del formulario, validación local, envío, toast «Sector creado» y cierre; el 409 se muestra bajo Nombre y conserva lo escrito. |
| `components/SectorFormDialog.tsx` | Se monta solo al abrir. Campos Nombre (obligatorio) y Descripción (opcional), texto fijo «Estado: Habilitado», botones «Cancelar» y «Guardar». |
| `pages/SalonPage.tsx` | `PageHeader` «Salón y Mozos» con acción «Nuevo sector»; `EmptyState` que explica que los listados llegan con HU-M3-04. |

Diferencias con la maqueta: no se muestra la tabla de sectores, la columna «Mesas» ni las pestañas; corresponden a HU-M3-04/HU-M3-08. El alta va en un diálogo, no en una página. Se anota en el PR.

## Cambios en archivos

| Archivo | Acción | Compartido |
| --- | --- | --- |
| `backend/app/modules/salon/models.py` | Crear `Sector` | No |
| `backend/app/modules/salon/schemas.py` | Crear `SectorCrear`, `SectorSalida` | No |
| `backend/app/modules/salon/repository.py` | `existe_nombre_normalizado`, `agregar` | No |
| `backend/app/modules/salon/service.py` | `crear_sector` | No |
| `backend/app/modules/salon/router.py` | `POST /sectores` | No |
| `backend/app/main.py` | `include_router` del salón | **Sí** |
| `backend/alembic/versions/<rev>_crea_sectores.py` | Crear (`down_revision = "c4e6a8b0d2f4"`) | **Sí** |
| `backend/tests/modules/salon/{conftest,test_schemas,test_service,test_router,test_migracion}.py` | Crear | No |
| `frontend/src/modules/salon/{types,api}.ts` | Modificar | No |
| `frontend/src/modules/salon/components/{validarSector,useFormularioSector,SectorFormDialog}.tsx` y pruebas | Crear | No |
| `frontend/src/modules/salon/pages/SalonPage.tsx` y prueba | Modificar y crear | No |

## Estrategia de pruebas

| Capa | Qué | Cómo |
| --- | --- | --- |
| Esquemas | Nombre de 30 y 31; vacío y solo espacios; descripción de 200 y 201; `""` → `None`; `estado` extra → 422 | `pytest` directo sobre `SectorCrear` |
| `service` | Alta mínima y con descripción; estado `HABILITADO`; nombre recortado; repetido con otra capitalización y con tilde (`Ñoquis`/`ñOQUIS`); repetido contra uno deshabilitado; `IntegrityError` del `commit` → 409 sin fila | Fixture `fabrica_sector` en `backend/tests/modules/salon/conftest.py` |
| `router` | 201 y forma de `SectorSalida`; 422 parametrizado por campo; `estado` enviado → 422; 409 con `detalle` | `cliente` de `tests/conftest.py` |
| Migración | `upgrade head` crea `sectores`; `downgrade -1` la elimina | `Config(str(ALEMBIC_INI))` sobre base temporal |
| Frontend | `validarSector`; diálogo (alta, cancelar sin llamada, campos vacíos, 31 caracteres, 409); `api.ts`; `SalonPage` (botón y apertura) | Vitest + Testing Library, `vi.mock('../api')` |

Impacto en la CI: ninguno nuevo; se suman pruebas a la cobertura existente.

## Migración y despliegue

Revisión en modo `batch`: `create_table("sectores", ...)` con `id`, `nombre` `String(30)` no nulo, `nombre_normalizado` `String` no nulo, `descripcion` `String(200)` nula y `estado` `Enum(Estado, native_enum=False)` no nulo; luego `create_index("ux_sectores_nombre_normalizado", "sectores", ["nombre_normalizado"], unique=True)`. `downgrade`: borra el índice y la tabla. Verificar `alembic heads` antes del PR.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 185 (incluye ≈ 35 de migración) | ≈ 250 | ≈ 435 | 800 |
| Frontend | ≈ 230 | ≈ 200 | ≈ 430 | 800 |

## Preguntas abiertas

- [ ] Confirmar S1 (unicidad sin distinguir mayúsculas) y S2 (descripción de 200 caracteres).
- [ ] Confirmar que el listado de sectores no entra en esta HU (HU-M3-04).
