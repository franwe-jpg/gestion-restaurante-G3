# Diseño: HU-M3-05 Crear una mesa

- **Issue:** #38 · **Rama:** `feature/HU-M3-05-crear-mesa` · **Depende de:** HU-M3-01
- **Entrada:** `proposal.md` (D1 a D5, S1 a S6), el diagrama de clases (Mesa, EstadoMesa) y el patrón de alta de HU-M3-01.

## Enfoque técnico

`POST /api/v1/mesas` recibe JSON validado por `MesaCrear`. El `router` delega en `service.crear_mesa`, que valida el sector (existe y está habilitado), comprueba que el número no exista en ese sector, arma el `Mesa` con `EstadoMesa.LIBRE` y confirma. La restricción única `(sector_id, numero)` cubre la carrera entre altas simultáneas. El selector del formulario consume `GET /api/v1/sectores`, una lectura paginada con filtro `estado` que reutilizará HU-M3-04.

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| B1 | Unicidad (D3, S1) | `UniqueConstraint("sector_id", "numero")` y comprobación previa en el `service` | Solo comprobación en el `service` | La comprobación previa da un 409 legible; la restricción evita duplicados si dos altas corren a la vez (RNF-REN-03). |
| B2 | Estado (D2, S4) | `EstadoMesa` en `shared/models/enums.py`; `MesaCrear` con `extra="forbid"`; el `service` fija `LIBRE` | Enum en `salon/models.py` | M4 y M5 necesitan los valores y no pueden importar `salon/models.py` (RNF-MAN-09). Archivo compartido: se avisa en el PR. |
| B3 | Sectores habilitados (S2) | `service` rechaza un sector `DESHABILITADO` con 409 | Permitir cualquier sector | La maqueta dice «Solo sectores habilitados» y S1-07 pide un sector activo; una mesa nueva en un sector apagado no se puede usar. |
| B4 | Sin topes (S3) | `numero` y `capacidad` solo con `> 0` | Topes 99 y 20 de S1-07 | El issue y el diagrama no fijan topes y el issue gana; se señala la contradicción en el PR. |
| B5 | Lectura de apoyo (D4, S6) | `GET /sectores` paginado con `estado?` en el mismo router | Un endpoint específico `/sectores/habilitados` | D-21 define `/sectores` como recurso y D-27 exige paginación; HU-M3-04 reutiliza el mismo contrato. |
| B6 | Forma de la salida | `MesaSalida {id, numero, capacidad, sector: SectorResumen{id, nombre}, estado}` | Devolver `sector_id` suelto | La maqueta muestra el nombre del sector; evita una segunda consulta en el frontend. |
| B7 | Migración | Revisión nueva con `down_revision` = revisión de HU-M3-01; `create_table` con `CHECK`, FK y `UNIQUE` | Meter `mesas` en la migración de sectores | Cada entidad conserva su revisión y su reversión. |

## Flujo de datos

```
MesaFormDialog ─JSON {numero, capacidad, sector_id}─→ router.crear_mesa
                                                          │
                                                          ▼
service.crear_mesa(db, datos)
  1. _validar_sector: repository.obtener_sector       → 404 no existe
     estado != HABILITADO                              → 409 deshabilitado
  2. _validar_numero_libre: existe_numero_en_sector   → 409 repetido
  3. Mesa(numero, capacidad, sector_id, estado=LIBRE)
  4. repository.agregar: add + flush
  5. db.commit                                         → IntegrityError → rollback + 409
  └→ MesaSalida (201) con sector {id, nombre}
```

## Contratos

**Enum compartido (`shared/models/enums.py`):**

```python
class EstadoMesa(StrEnum):
    LIBRE = "LIBRE"
    OCUPADA = "OCUPADA"
    FUERA_DE_SERVICIO = "FUERA_DE_SERVICIO"
```

**Modelo (`salon/models.py`):**

```python
class Mesa(Base):
    __tablename__ = "mesas"
    __table_args__ = (
        sa.CheckConstraint("numero > 0", name="ck_mesas_numero_positivo"),
        sa.CheckConstraint("capacidad > 0", name="ck_mesas_capacidad_positiva"),
        sa.UniqueConstraint("sector_id", "numero", name="ux_mesas_sector_numero"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int]
    capacidad: Mapped[int]
    sector_id: Mapped[int] = mapped_column(sa.ForeignKey("sectores.id", ondelete="RESTRICT"))
    estado: Mapped[EstadoMesa] = mapped_column(
        sa.Enum(EstadoMesa, native_enum=False), default=EstadoMesa.LIBRE
    )
```

**Esquemas (`salon/schemas.py`):**

```python
class MesaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")  # estado no se recibe (S4)
    numero: StrictInt = Field(gt=0)            # rechaza "3", 2.0 y true
    capacidad: StrictInt = Field(gt=0)
    sector_id: StrictInt = Field(gt=0)

class SectorResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str

class MesaSalida(BaseModel):
    id: int
    numero: int
    capacidad: int
    sector: SectorResumen
    estado: EstadoMesa
```

**Repository:** `obtener_sector(db, sector_id) -> Sector | None`; `existe_numero_en_sector(db, sector_id, numero) -> bool`; `agregar(db, entidad: Sector | Mesa) -> None` (se generaliza); `listar_sectores(db, parametros, estado) -> tuple[list[Sector], int]`.

**Service:** `crear_mesa(db, datos) -> MesaSalida`; `listar_sectores(db, parametros, estado) -> Pagina[SectorSalida]`.

**API:**

| Ruta | Respuesta | Errores |
| --- | --- | --- |
| `POST /api/v1/mesas` | 201 `MesaSalida` | 404, 409, 422 |
| `GET /api/v1/sectores?estado&limit&offset` | 200 `Pagina[SectorSalida]` | 422 |

## Frontend

| Pieza | Diseño |
| --- | --- |
| `types.ts` | `Estado`, `EstadoMesa`, `Sector`, `SectorCrear`, `SectorResumen`, `Mesa`, `MesaCrear`; se retiran los tipos provisorios en minúsculas. |
| `api.ts` | `crearSector`, `listarSectoresHabilitados()` (`?estado=HABILITADO&limit=100&offset=0`) y `crearMesa(datos)` (D-16). |
| `components/validarMesa.ts` | `numero` y `capacidad` con `^[1-9]\d*$`; mensajes de obligatorio y de formato; sector obligatorio; `errorDelServidor` ubica «ya existe» bajo Número y «deshabilitado» bajo Sector. |
| `components/useFormularioMesa.ts` | Carga de sectores vía `useApi`, estado del formulario, validación local, envío, toast «Mesa creada» y cierre; conserva lo escrito ante un 409. |
| `components/MesaFormDialog.tsx` | Se monta solo al abrir. Sector (solo habilitados), Número y Capacidad; aviso «La mesa se crea en estado Libre»; aviso con enlace a «Nuevo sector» si no hay sectores habilitados y «Guardar» deshabilitado. Botones «Cancelar» y «Guardar mesa». |
| `pages/SalonPage.tsx` | Agrega la acción «Nueva mesa» junto a «Nuevo sector». |

Diferencias con la maqueta: sin tabla, filtros ni pestañas (HU-M3-08); el alta va en un diálogo. Se anota en el PR.

## Cambios en archivos

| Archivo | Acción | Compartido |
| --- | --- | --- |
| `backend/app/shared/models/enums.py` | Agregar `EstadoMesa` | **Sí** (M4, M5) |
| `backend/app/modules/salon/models.py` | Agregar `Mesa` | No |
| `backend/app/modules/salon/schemas.py` | `MesaCrear`, `SectorResumen`, `MesaSalida` | No |
| `backend/app/modules/salon/repository.py` | `obtener_sector`, `existe_numero_en_sector`, `agregar` generalizado, `listar_sectores` | No |
| `backend/app/modules/salon/service.py` | `crear_mesa`, `listar_sectores` | No |
| `backend/app/modules/salon/router.py` | `POST /mesas`, `GET /sectores` | No |
| `backend/alembic/versions/<rev>_crea_mesas.py` | Crear (`down_revision` = revisión de HU-M3-01) | **Sí** |
| `backend/tests/modules/salon/{conftest,test_modelo,test_schemas,test_service,test_router,test_migracion}.py` | Modificar y crear | No |
| `frontend/src/modules/salon/{types,api}.ts` | Modificar | No |
| `frontend/src/modules/salon/components/{validarMesa,useFormularioMesa,MesaFormDialog}.tsx` y pruebas | Crear | No |
| `frontend/src/modules/salon/pages/SalonPage.tsx` y prueba | Modificar | No |

## Estrategia de pruebas

| Capa | Qué | Cómo |
| --- | --- | --- |
| Esquemas | número y capacidad enteros válidos; `0`, negativo, texto, decimal y booleano → 422; `sector_id` ausente o ≤ 0 → 422; `estado` extra → 422 | `pytest` directo sobre `MesaCrear` |
| Modelo | valor por defecto `LIBRE`; `CHECK` de número y capacidad; `UNIQUE (sector_id, numero)` | `IntegrityError` con `db.flush()` |
| `service` | Alta mínima; estado `LIBRE`; número repetido en el mismo sector → 409; mismo número en otro sector → 201; sector inexistente → 404; deshabilitado → 409; `IntegrityError` → 409 sin fila | Fixtures `fabrica_sector`/`fabrica_mesa` en `conftest.py` |
| `router` | 201 y forma de `MesaSalida`; 422 parametrizado; 404 y 409 con `detalle`; `estado` enviado → 422; `GET /sectores?estado=HABILITADO` filtra y cuenta; `limit=101` → 422 | `cliente` de `tests/conftest.py` |
| Migración | `upgrade head` crea `mesas` con FK y restricciones; `downgrade -1` la elimina y conserva `sectores` | `Config(str(ALEMBIC_INI))` sobre base temporal |
| Frontend | `validarMesa`; diálogo (alta, cancelar sin llamada, campos vacíos, formatos inválidos, sin sectores habilitados, 409 de número y de sector); `api.ts`; `SalonPage` (acción «Nueva mesa») | Vitest + Testing Library, `vi.mock('../api')` |

Impacto en la CI: ninguno nuevo; se suman pruebas a la cobertura existente.

## Migración y despliegue

Revisión en modo `batch` con `down_revision` = revisión de HU-M3-01: `create_table("mesas", ...)` con `id`, `numero` entero no nulo, `capacidad` entero no nulo, `sector_id` entero no nulo, FK a `sectores.id` con `ondelete="RESTRICT"`, `estado` `Enum(EstadoMesa, native_enum=False)` no nulo, más los dos `CHECK` y el `UNIQUE` de B1. `downgrade`: borra la tabla. Verificar `alembic heads` antes del PR.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 245 (incluye ≈ 40 de migración y la lectura de apoyo) | ≈ 350 | ≈ 595 | 800 |
| Frontend | ≈ 265 | ≈ 250 | ≈ 515 | 800 |

## Preguntas abiertas

- [ ] Confirmar S3: sin topes de número y capacidad (el issue y el diagrama contradicen S1-07).
- [ ] Confirmar S6: `GET /sectores` mínimo en esta HU y pantalla de listado en HU-M3-04.
- [ ] Avisar a M4 y M5 por `EstadoMesa` en `shared/models/enums.py` antes del PR.
