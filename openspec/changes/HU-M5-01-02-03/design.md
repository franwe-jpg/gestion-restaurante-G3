# Diseño: HU-M5-01-02-03 Crear, modificar y listar reservas

- **Cambio:** `HU-M5-01-02-03` (grupo ABM de `Reserva`, M5, responsable Federico Cabaña).
- **Entradas:** `proposal.md` (decisiones y supuestos S1 a S14) y `exploration.md` de este cambio. La spec (`specs/`) fija el contrato exacto de la API y los escenarios; si este diseño y la spec difieren en un código de estado o un mensaje, gana la spec y se corrige el diseño.
- **Referencias:** `SPRINT-0/S0-05-arquitectura.md` (sección 3.3 y decisiones D-xx), `AGENTS.md` (secciones 4, 5, 6 y 9), `openspec/config.yaml` (`rules.design`).

## Enfoque técnico

El módulo `reservas` se construye de punta a punta con el mismo patrón que M1 `productos` y M3 `salon`:

- **Backend:** `router → service → repository → models` (D-01, D-02), con `schemas` en la entrada y la salida (D-06). El `service` abre y cierra la transacción (D-10); el `repository` solo hace `flush`. Los errores de negocio usan `shared/excepciones.py` y el manejador global de `main.py` los convierte en `{"detalle": "..."}` con 404, 409 o 422 (D-25, D-26). El listado usa `shared/paginacion.py` (D-27).
- **Autocontenido:** Mesa y Cliente se validan con un **puente propio** (`reservas/puente.py`) que hoy es un stub. Este cambio **no importa** `salon.service` ni `atencion.service`; cuando M3 y M4 expongan lo necesario, solo cambia el cuerpo de `puente.py` (los contratos de `backend/pyproject.toml` ya permiten que `reservas` importe esos `service`).
- **Regla de conflicto (R13):** doble defensa. El `service` consulta si ya hay una reserva `ACTIVA` en la misma mesa, fecha y hora; además, un **índice único parcial** en la base (`WHERE estado = 'ACTIVA'`) impide la doble reserva aunque dos solicitudes pasen la consulta al mismo tiempo. El `IntegrityError` del índice se traduce en 409.
- **Frontend:** una sola página (`ReservasPage`) con la estructura de la maqueta `SPRINT-2/S2-04-maqueta/reservas.html`: navegador de fecha, tabla de reservas del día y panel lateral con el formulario de alta y edición. No se agregan rutas en `App.tsx` (la ruta `/reservas` ya existe en `frontend/src/App.tsx:104`).

## Decisiones de arquitectura

### Decisión 1: `EstadoReserva` y `Reserva` viven en `reservas/models.py`

**Elección:** el enum `EstadoReserva` (`StrEnum` con `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA`) y el modelo `Reserva` se definen en `backend/app/modules/reservas/models.py`. `schemas.py` importa el enum desde `models.py` de su propio módulo.

**Alternativas descartadas:** ponerlo en `backend/app/shared/models/enums.py`, como `EstadoMesa` (`backend/app/shared/models/enums.py:11`).

**Justificación:** D-05 reserva `shared/models/` para entidades que usan dos o más módulos; hoy solo `reservas` usa el estado. La propuesta excluye cambios en `shared/` (AGENTS.md §9.3). El contrato «models solo importa shared» (`backend/pyproject.toml:176-186`) se cumple: `models.py` solo importa `app.database` y la biblioteca estándar. Que `schemas.py` importe `models.py` del mismo módulo no viola ningún contrato, y el `router` no importa `models` (lo importa indirectamente por `schemas`, permitido por `allow_indirect_imports`). Si M4 o M6 necesitan el enum más adelante, se mueve a `shared/` con un cambio coordinado.

### Decisión 2: puente Mesa/Cliente como módulo de funciones reemplazables (`reservas/puente.py`)

**Elección:** un archivo `backend/app/modules/reservas/puente.py` con dos funciones y un tipo de dato:

```python
@dataclass(frozen=True)
class MesaReservable:
    id: int
    capacidad: int | None  # None: el puente no informa la capacidad (stub, S5)


def obtener_mesa(db: Session, mesa_id: int) -> MesaReservable | None:
    """Stub hasta que M3 exponga obtener_mesa (S4, S5): toda mesa con id positivo existe."""
    return MesaReservable(id=mesa_id, capacidad=None) if mesa_id > 0 else None


def existe_cliente(db: Session, cliente_id: int) -> bool:
    """Stub hasta que M4 exponga Cliente (S6): todo cliente con id positivo existe."""
    return cliente_id > 0
```

El `service` lo usa siempre a través del módulo (`from app.modules.reservas import puente` y luego `puente.obtener_mesa(db, ...)`), nunca con `from ... import obtener_mesa`. Así las pruebas reemplazan el comportamiento con `monkeypatch.setattr(puente, "obtener_mesa", ...)` y el código de producción no cambia.

**Alternativas descartadas:**
- Un `Protocol` con inyección por parámetro (`crear_reserva(db, datos, puente=PuenteStub())`): obliga al `router` a conocer el puente o a usar `Depends`, y suma el concepto de puertos y adaptadores que D-01 descarta para este proyecto.
- Consultar la tabla `mesas` con SQL propio desde `reservas`: rompe el espíritu de RNF-MAN-09 (acceder a datos de otro módulo sin su `service`) aunque `lint-imports` no lo detecte.
- Importar `salon.service` ahora: `salon.service` no expone `obtener_mesa` (`backend/app/modules/salon/service.py`) y modificar M3 está fuera de alcance.

**Justificación:** el puente recibe `db` para que el reemplazo futuro sea una sola línea por función (`return salon_service.obtener_mesa(db, mesa_id)`, adaptado a `MesaReservable`). `MesaReservable.capacidad` es `None` en el stub, así que el control de capacidad (S5) existe en el `service` pero solo se activa cuando el puente real informe la capacidad. El archivo fuera de las cinco capas tiene precedente en `productos/imagenes.py`. Ningún contrato de `backend/pyproject.toml` aplica a `app.modules.reservas.puente`, y el reemplazo futuro (importar `app.modules.salon.service` y `app.modules.atencion.service`) está permitido por los contratos de las líneas 53-69 y 138-154.

### Decisión 3: reloj parcheable `ahora()` en el `service`, sin `freezegun`

**Elección:** `service.py` define una función pública de módulo:

```python
def ahora() -> datetime:
    """Fecha y hora local del servidor. Las pruebas la reemplazan con monkeypatch."""
    return datetime.now()
```

Las reglas de S3 usan `ahora().date()` y `ahora().time()`. Las pruebas del `service` y del `router` la reemplazan con `monkeypatch.setattr(service, "ahora", lambda: datetime(2026, 11, 2, 12, 0))`.

**Alternativas descartadas:** `freezegun` o `time-machine` (dependencia nueva; AGENTS.md §9.7 pide acordarla con el equipo); validar la fecha en el `schema` con `date.today()` (no se puede fijar el reloj sin parchear la biblioteca estándar, y la regla de «hoy con hora futura» necesita la fecha y la hora juntas).

**Justificación:** el pedido mencionaba un `hoy()`; se usa `ahora()` porque S3 necesita también la hora («si la fecha es hoy, la hora debe ser posterior a la actual»). Una sola función evita que fecha y hora salgan de dos lecturas distintas del reloj. `Supuesto:` el servidor corre en la zona horaria del restaurante (la hora es local y sin zona, igual que el resto del sistema). En la CI (UTC) ninguna prueba depende del reloj real, porque todas parchean `ahora()`.

### Decisión 4: horario de atención sin restricción (no se crea constante ni configuración)

**Elección:** no se valida la hora contra un horario de atención (S2). No se agrega `HORARIO_ATENCION` ni una variable en `config.py`.

**Alternativas descartadas:** una constante con un horario inventado; una variable de entorno (D-12) sin valor definido por el negocio.

**Justificación:** AGENTS.md §9.1 prohíbe inventar requerimientos. Si el equipo define el horario, se agrega como validación 422 en `service.py` (una función `_validar_horario`) en un cambio posterior.

### Decisión 5: conflicto validado en el `service` y garantizado por un índice único parcial (R13)

**Elección:**
- `repository.existe_reserva_activa(db, mesa_id, fecha, hora, excluir_id=None) -> bool` (consulta parametrizada, D-07).
- Índice `ux_reservas_mesa_fecha_hora_activa` sobre `(mesa_id, fecha, hora)`, `unique=True`, `sqlite_where=sa.text("estado = 'ACTIVA'")`, igual que `ux_secciones_orden_habilitada` (`backend/app/modules/productos/models.py:15-20` y `backend/alembic/versions/a1c3e5f7b9d1_crea_secciones_y_productos.py:39-45`).
- `service._confirmar(db, reserva)` hace `commit()` y, ante `IntegrityError`, `rollback()` y `ReglaDeNegocioError` (409) con el mismo mensaje que la validación previa, como `salon.service._guardar_mesa` (`backend/app/modules/salon/service.py:60-74`).

**Alternativas descartadas:** solo la consulta previa (deja pasar dos altas simultáneas, que es exactamente el disparador de R13 en `SPRINT-0/S0-10-riesgos.md:170`); solo el índice (el mensaje de error dependería del motor y no habría un 409 claro antes de escribir).

**Justificación:** las reservas canceladas o atendidas no deben bloquear el turno, por eso el índice es parcial. La hora se guarda siempre sin segundos (Decisión 7), así que la comparación exacta en SQLite (que guarda `TIME` como texto) es estable.

### Decisión 6: orden de validación y códigos de error

**Elección:** los errores de forma los resuelve Pydantic (422 por `RequestValidationError`, `backend/app/main.py:55-61`). Las reglas de negocio se validan en este orden:

| Operación | Orden | Error |
| --- | --- | --- |
| Crear | 1. mesa existe (`puente.obtener_mesa`) | `NoEncontradoError` → 404 |
| | 2. cliente existe (`puente.existe_cliente`) | `NoEncontradoError` → 404 |
| | 3. fecha y hora no pasadas (S3) | `DatosInvalidosError` → 422 |
| | 4. capacidad, solo si el puente la informa (S5) | `DatosInvalidosError` → 422 |
| | 5. sin otra reserva `ACTIVA` en mesa, fecha y hora (S4) | `ReglaDeNegocioError` → 409 |
| Modificar | 1. la reserva existe | `NoEncontradoError` → 404 |
| | 2. la reserva está `ACTIVA` (S7) | `ReglaDeNegocioError` → 409 |
| | 3. fecha y hora no pasadas | `DatosInvalidosError` → 422 |
| | 4. capacidad con la mesa de la reserva (si el puente la informa) | `DatosInvalidosError` → 422 |
| | 5. sin conflicto, excluyendo la propia reserva | `ReglaDeNegocioError` → 409 |
| Consultar | la reserva existe | `NoEncontradoError` → 404 |

**Alternativas descartadas:** responder 409 para la fecha pasada (es un dato inválido, no un choque con otra entidad; D-25 reserva 409 para conflictos de regla).

**Justificación:** sigue S9 y el criterio de M1 y M3 (existencia primero, después estado, después datos, al final el conflicto, que es la consulta más cara). `DatosInvalidosError` ya está mapeado a 422 en `backend/app/main.py:48-52`. Consecuencia aceptada: una reserva `ACTIVA` cuyo turno ya pasó no se puede modificar (S3 se revalida en S7); su destino es «atendida» o «cancelada por ausencia» (HU-M5-05, fuera de alcance). Los textos exactos de los mensajes los fija la spec.

### Decisión 7: la hora viaja y se guarda en minutos

**Elección:** los `schemas` de entrada rechazan una hora con segundos, microsegundos o zona horaria (422) con un `field_validator`; `ReservaSalida` serializa la hora como `"HH:MM"` con un `field_serializer`. Se acepta `"21:30"` y `"21:30:00"`.

**Alternativas descartadas:** truncar los segundos en silencio (podría crear conflictos que el usuario no ve); devolver `"21:30:00"` (obliga al frontend a recortar y a comparar con otro formato que el de `<input type="time">`).

**Justificación:** S3 fija la hora en minutos. El formato `"HH:MM"` es el mismo que produce el `<input type="time">` del formulario, así que el frontend no transforma la hora.

### Decisión 8: listado con modelo de filtro en `Query()` y orden fijo

**Elección:** `FiltroReservas(ParametrosPaginacion)` con `fecha: date | None = None` y `estado: EstadoReserva | None = None`, recibido como `Annotated[FiltroReservas, Query()]`, igual que `FiltroSectores` (`backend/app/modules/salon/schemas.py:68-71` y `backend/app/modules/salon/router.py:34-36`). El `repository` ordena por `fecha`, `hora`, `id` y cuenta con `contar()` (`backend/app/shared/paginacion.py:23-26`).

**Justificación:** D-27 y S8. El `router` no importa `models` (contrato de `backend/pyproject.toml:155-160`) porque el enum llega dentro del `schema`. Se agrega el índice `ix_reservas_fecha_hora` porque `fecha` es la columna de filtro y de orden del listado (D-11).

### Decisión 9: sin claves foráneas hacia `mesas` ni `clientes`

**Elección:** `mesa_id` y `cliente_id` son `INTEGER NOT NULL` sin FK (S10).

**Justificación:** la tabla `clientes` no existe y el módulo es autocontenido; la integridad referencial la cubre el puente. Las FK se agregan en una migración posterior (seguimiento de la propuesta).

### Decisión 10: frontend en una sola página con panel lateral, sin rutas nuevas

**Elección:** `ReservasPage` contiene el navegador de fecha, la tabla del día y el panel lateral (`ReservaFormulario`) que se abre en modo alta (botón «Nueva reserva») o edición (acción «Modificar reserva» de una fila `ACTIVA`). La edición parte de la fila del listado, como `SeccionFormDialog` parte de `SeccionListado` (`frontend/src/modules/productos/components/SeccionFormDialog.tsx:105-112`).

**Alternativas descartadas:** páginas `ReservaNuevaPage` y `ReservaEditarPage` con rutas propias, como M1 con los productos. Obligan a tocar `frontend/src/App.tsx` (compartido) y se apartan de la maqueta, que muestra el formulario al costado de la tabla.

**Justificación:** sigue la maqueta (AGENTS.md §5) y mantiene el cambio dentro de `frontend/src/modules/reservas/` (D-15). El frontend no necesita `GET /reservas/{id}`: la fila ya trae todos los datos. El endpoint existe igual en el backend porque lo pide HU-M5-02 (consultar antes de modificar).

### Decisión 11: fechas `YYYY-MM-DD` con aritmética de texto, sin `new Date(texto)`

**Elección:** un archivo del módulo, `frontend/src/modules/reservas/fechas.ts`, con:
- `hoyLocal(): string`: arma `YYYY-MM-DD` con `getFullYear()`, `getMonth()` y `getDate()` de `new Date()` (fecha **local**).
- `horaActualLocal(): string`: `HH:MM` local.
- `sumarDias(fecha: string, dias: number): string`: separa año, mes y día, calcula con `Date.UTC(...)` y vuelve a texto con `toISOString().slice(0, 10)`; no depende de la zona horaria.
- `formatearFechaReserva(fecha: string): string`: `"2026-10-24"` → `"24/10/2026"` separando el texto, sin crear un `Date`.

**Alternativas descartadas:** `formatearFecha` de `frontend/src/shared/lib/format.ts:9-18`, que hace `new Date('2026-10-24')` (medianoche UTC) y en UTC-3 muestra el 23/10 (S11); corregirla en `shared/` (fuera de alcance; se avisa al equipo); una biblioteca de fechas (dependencia nueva).

**Justificación:** evita el corrimiento de un día y deja funciones puras fáciles de probar con `vi.setSystemTime`.

### Decisión 12: insignia de estado con `Badge` directo

**Elección:** `frontend/src/modules/reservas/components/estadosReserva.ts` define `Record<EstadoReserva, { etiqueta: string; variante: BadgeVariant }>`, con las variantes de la maqueta (`reservas.html:100`): `ACTIVA` → `info` «Activa», `ATENDIDA` → `success` «Atendida», `CANCELADA_ANTICIPADA` → `neutral` «Cancelada anticipada», `CANCELADA_POR_AUSENCIA` → `danger` «Cancelada por ausencia». La tabla usa `Badge` (`frontend/src/shared/components/ui/badge.tsx`).

**Alternativas descartadas:** `StatusBadge` (`frontend/src/shared/components/ui/status-badge.tsx:9-24`), que no conoce estos valores y mostraría «ACTIVA» con la variante `neutral`; agregar los estados a `StatusBadge` (toca `shared/`, S12).

## Flujo de datos

```text
POST /api/v1/reservas  (ReservaCrear)
  router.crear_reserva ──→ service.crear_reserva
                              ├─ puente.obtener_mesa ─────── 404 si None
                              ├─ puente.existe_cliente ────── 404 si False
                              ├─ _validar_momento(ahora()) ── 422 si es pasado
                              ├─ _validar_capacidad ───────── 422 si excede (solo con capacidad)
                              ├─ repository.existe_reserva_activa ── 409 si hay otra ACTIVA
                              ├─ repository.agregar (flush)
                              └─ _confirmar: commit ── IntegrityError (índice parcial) → rollback → 409
  ←── 201 ReservaSalida (hora "HH:MM", estado "ACTIVA")

PUT /api/v1/reservas/{id}  (ReservaModificar: fecha, hora, cantidad_personas)
  service.modificar_reserva: _obtener (404) → _validar_activa (409) → _validar_momento (422)
    → _validar_capacidad (puente.obtener_mesa de la mesa de la reserva) → existe_reserva_activa(excluir_id=id) (409)
    → asigna campos → _confirmar → 200 ReservaSalida

GET /api/v1/reservas?fecha=&estado=&limit=&offset=
  service.listar_reservas ──→ repository.listar_reservas (orden fecha, hora, id; aplicar + contar)
  ←── 200 Pagina[ReservaSalida]

Frontend
  ReservasPage ── estado: fecha (hoyLocal), estado (ACTIVA), página, panel (cerrado | alta | edición)
     ├─ NavegadorFecha ── sumarDias ±1, «Hoy»
     ├─ useApi(listarReservas(fecha, estado, 50, offset)) ──→ ReservasTabla (Badge, acción Modificar)
     └─ ReservaFormulario ── useFormularioReserva ── validarReserva ── crearReserva | modificarReserva
                                └─ al guardar: toast, cierra el panel y recarga el listado
```

## Contratos e interfaces

### Backend: modelo (`reservas/models.py`)

```python
class EstadoReserva(StrEnum):
    ACTIVA = "ACTIVA"
    ATENDIDA = "ATENDIDA"
    CANCELADA_ANTICIPADA = "CANCELADA_ANTICIPADA"
    CANCELADA_POR_AUSENCIA = "CANCELADA_POR_AUSENCIA"


class Reserva(Base):
    __tablename__ = "reservas"
    __table_args__ = (
        sa.CheckConstraint("cantidad_personas > 0", name="ck_reservas_cantidad_personas_positiva"),
        # R13: no hay dos reservas ACTIVA en la misma mesa, fecha y hora; las demás no cuentan.
        sa.Index(
            "ux_reservas_mesa_fecha_hora_activa", "mesa_id", "fecha", "hora",
            unique=True, sqlite_where=sa.text("estado = 'ACTIVA'"),
        ),
        sa.Index("ix_reservas_fecha_hora", "fecha", "hora"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    mesa_id: Mapped[int]       # sin FK (S10)
    cliente_id: Mapped[int]    # sin FK (S10)
    fecha: Mapped[date]
    hora: Mapped[time]
    cantidad_personas: Mapped[int]
    estado: Mapped[EstadoReserva] = mapped_column(
        sa.Enum(EstadoReserva, native_enum=False), default=EstadoReserva.ACTIVA
    )
```

### Backend: migración (`backend/alembic/versions/d6f8a0c2e4b6_crea_reservas.py`)

- `revision = "d6f8a0c2e4b6"`, `down_revision = "b2d4f6a8c0e1"`, cabecera y constantes con el estilo de `b2d4f6a8c0e1_crea_mesas.py` (`ESTADO_RESERVA = sa.Enum("ACTIVA", "ATENDIDA", "CANCELADA_ANTICIPADA", "CANCELADA_POR_AUSENCIA", name="estadoreserva", native_enum=False)`, `CHECK_CANTIDAD`, `UNICO_ACTIVA`, `INDICE_FECHA`).
- `upgrade()`: `op.create_table("reservas", ...)` con las siete columnas `nullable=False`, el `CheckConstraint` y la `PrimaryKeyConstraint`; luego `op.create_index(UNICO_ACTIVA, "reservas", ["mesa_id", "fecha", "hora"], unique=True, sqlite_where=sa.text("estado = 'ACTIVA'"))` y `op.create_index(INDICE_FECHA, "reservas", ["fecha", "hora"])`.
- `downgrade()`: borra los dos índices y la tabla.
- `backend/alembic/env.py:19` ya importa `app.modules.reservas.models`: no se modifica.
- Antes del PR: `alembic heads` debe mostrar una sola cabeza; si `develop` trae otra revisión sobre `b2d4f6a8c0e1`, se rebasa `down_revision` y se actualiza el ancla de la prueba de migración de M5.

### Backend: schemas (`reservas/schemas.py`)

| Schema | Campos | Notas |
| --- | --- | --- |
| `_DatosDelTurno` (base) | `fecha: date`, `hora: time`, `cantidad_personas: StrictInt = Field(gt=0)` | `extra="forbid"`; `field_validator("hora")` rechaza segundos, microsegundos y zona |
| `ReservaCrear(_DatosDelTurno)` | `mesa_id: StrictInt = Field(gt=0)`, `cliente_id: StrictInt = Field(gt=0)` | `estado` no se recibe (422 por `extra="forbid"`) |
| `ReservaModificar(_DatosDelTurno)` | (solo los tres campos de la base) | enviar `mesa_id` o `cliente_id` da 422 (la mesa y el cliente no cambian, S7) |
| `ReservaSalida` | `id`, `mesa_id`, `cliente_id`, `fecha`, `hora`, `cantidad_personas`, `estado: EstadoReserva` | `from_attributes=True`; `field_serializer("hora")` → `"HH:MM"` |
| `FiltroReservas(ParametrosPaginacion)` | `fecha: date \| None = None`, `estado: EstadoReserva \| None = None` | se recibe con `Query()` |

Los nombres JSON van en `snake_case`, como `sector_id` en `salon` (S14: `cantidad_personas`).

### Backend: repository (`reservas/repository.py`)

```python
def obtener(db: Session, reserva_id: int) -> Reserva | None
def existe_reserva_activa(
    db: Session, mesa_id: int, fecha: date, hora: time, excluir_id: int | None = None
) -> bool
def agregar(db: Session, reserva: Reserva) -> None          # add + flush, sin commit (D-10)
def listar_reservas(
    db: Session, parametros: ParametrosPaginacion, fecha: date | None, estado: EstadoReserva | None
) -> tuple[list[Reserva], int]
```

### Backend: service (`reservas/service.py`)

```python
def ahora() -> datetime
def crear_reserva(db: Session, datos: ReservaCrear) -> ReservaSalida
def obtener_reserva(db: Session, reserva_id: int) -> ReservaSalida
def modificar_reserva(db: Session, reserva_id: int, datos: ReservaModificar) -> ReservaSalida
def listar_reservas(db: Session, filtro: FiltroReservas) -> Pagina[ReservaSalida]
```

Funciones privadas (cada una de pocas líneas, para cumplir el límite de 50 líneas y complejidad 10 de RNF-MAN-05): `_obtener_mesa`, `_validar_cliente`, `_validar_momento(fecha, hora)`, `_validar_capacidad(mesa, cantidad)`, `_validar_turno_libre(db, mesa_id, fecha, hora, excluir_id)`, `_obtener(db, reserva_id)`, `_validar_activa(reserva)`, `_confirmar(db, reserva)`. Como en `productos.service.modificar_seccion` (`backend/app/modules/productos/service.py:119-144`), la reserva se modifica recién después de validar todo.

### Backend: router (`reservas/router.py`) y registro

| Método y ruta | Función del router | Respuesta |
| --- | --- | --- |
| `POST /reservas` | `crear_reserva(datos: ReservaCrear, db)` | `201 ReservaSalida` |
| `GET /reservas` | `listar_reservas(db, filtro: Annotated[FiltroReservas, Query()])` | `200 Pagina[ReservaSalida]` |
| `GET /reservas/{reserva_id}` | `consultar_reserva(reserva_id: int, db)` | `200 ReservaSalida` |
| `PUT /reservas/{reserva_id}` | `modificar_reserva(reserva_id: int, datos: ReservaModificar, db)` | `200 ReservaSalida` |

Endpoints síncronos (D-08), `Sesion = Annotated[Session, Depends(get_db)]` como en `salon/router.py:21`. En `backend/app/main.py` se agrega `from app.modules.reservas.router import router as reservas_router` y `app.include_router(reservas_router, prefix=API_PREFIX)` junto a los de las líneas 26-27. El prefijo `/api/v1` sale de `API_PREFIX` (`backend/app/config.py:7`, D-22). La modificación usa `PUT` (D-23); las cancelaciones, fuera de alcance, usarán `POST /reservas/{id}/cancelar` (D-24).

### Frontend: tipos y API

```ts
// types.ts (reescritura completa: el actual no coincide con el diagrama ni pagina)
export type EstadoReserva = 'ACTIVA' | 'ATENDIDA' | 'CANCELADA_ANTICIPADA' | 'CANCELADA_POR_AUSENCIA';
export type FiltroEstadoReserva = EstadoReserva | 'TODAS';

export interface Reserva {
  id: number;
  mesa_id: number;
  cliente_id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cantidad_personas: number;
  estado: EstadoReserva;
}
export type ReservaCrear = Omit<Reserva, 'id' | 'estado'>;
export type ReservaModificar = Pick<Reserva, 'fecha' | 'hora' | 'cantidad_personas'>;

// api.ts (reescritura completa; única puerta a la API, D-16)
export function listarReservas(
  fecha: string, estado: FiltroEstadoReserva, limit: number, offset: number,
): Promise<RespuestaApi<Pagina<Reserva>>>; // omite `estado` cuando es 'TODAS'
export function crearReserva(datos: ReservaCrear): Promise<RespuestaApi<Reserva>>;
export function modificarReserva(id: number, datos: ReservaModificar): Promise<RespuestaApi<Reserva>>;
```

Los parámetros de consulta se arman con `URLSearchParams`. Ningún archivo fuera de `modules/reservas/` importa `types.ts` ni `api.ts` (verificado con búsqueda en `frontend/src`), así que la reescritura no rompe a otros módulos.

### Frontend: componentes y hooks

| Archivo | Responsabilidad |
| --- | --- |
| `pages/ReservasPage.tsx` | `PageHeader` con el botón «Nueva reserva»; estado de fecha (`hoyLocal()`), filtro de estado (`'ACTIVA'` por defecto, S8), página (`usePaginacion`, límite 50) y panel (`cerrado`, `alta` o `{ edicion: Reserva }`); layout de dos columnas como la maqueta |
| `components/NavegadorFecha.tsx` | Botones «Día anterior» y «Día siguiente» (`sumarDias`), `<Input type="date" aria-label="Día">` y botón «Hoy»; al cambiar el día vuelve a la página 1 |
| `components/ReservasTabla.tsx` | `DataTable` (`frontend/src/shared/components/ui/data-table.tsx`) con columnas Hora, Cliente, Personas, Mesa, Estado y Acciones; `Badge` con `estadosReserva.ts`; la acción «Modificar reserva» solo en filas `ACTIVA`; vacío, cargando y error con los estados de `DataTable` |
| `components/estadosReserva.ts` | Etiqueta y variante de cada estado (Decisión 12) |
| `components/ReservaFormulario.tsx` | Panel lateral (`Card`) con título «Nueva reserva» o «Modificar reserva», botón «Cerrar formulario», campos Cliente (número), Fecha, Hora, Cantidad de personas y Mesa (número), botones «Cancelar» y «Guardar reserva»; en edición, Cliente y Mesa se muestran deshabilitados |
| `components/useFormularioReserva.ts` | Estado del formulario, validación local, llamada a `crearReserva` o `modificarReserva`, toast de éxito (`useToast`) y errores del servidor, siguiendo `useFormularioSeccion` (`frontend/src/modules/productos/components/useFormularioSeccion.ts:77-130`) |
| `components/validarReserva.ts` | `validarReserva(datos, modo, hoy, horaActual)`: cliente y mesa enteros positivos (solo alta), fecha obligatoria y no anterior a hoy, hora obligatoria y posterior a la actual si la fecha es hoy, personas entero positivo; `errorDelServidor(mensaje)` deja el mensaje del 404, 409 o 422 como error general (como `validarSeccion.ts:41-48`) |
| `fechas.ts` | Funciones de la Decisión 11 |
| `components/index.ts` | Reexporta `ReservasTabla`, `ReservaFormulario` y `NavegadorFecha` |

La validación local recibe `hoy` y `horaActual` como parámetros (el hook los toma de `fechas.ts`), así la función es pura y se prueba sin reloj.

### Diferencias con la maqueta (se anotan en el PR)

| Maqueta | Implementación | Motivo |
| --- | --- | --- |
| Cliente con búsqueda por nombre o teléfono y alta de cliente nuevo | Campo numérico «Cliente (número)» | M4 no expone Cliente (S6, S13) |
| Columna «Teléfono» y nombre del cliente | Sin teléfono; «Cliente n.º 12» | Ídem |
| Mesa como `select` con sector y capacidad | Campo numérico «Mesa (número)»; la tabla muestra «Mesa n.º 5» | M3 no expone `GET /mesas` (S13) |
| La tabla muestra todos los estados del día | Selector de estado con `Activa` por defecto y opción «Todas» | S8 |
| Acción «Cancelar reserva» | No se muestra | HU-M5-04 y HU-M5-05 fuera de alcance |
| Panel abierto al entrar | Panel cerrado hasta elegir «Nueva reserva» o «Modificar reserva» | Evita un formulario vacío permanente; misma estética |

## Estrategia de pruebas (Strict TDD)

Cada prueba se escribe primero, se ve fallar (RED) y después se implementa (GREEN). Nombres `test_<función>_<caso>` (AGENTS.md §9.5). Las pruebas del backend usan las fixtures `db` y `cliente` de `backend/tests/conftest.py` (base temporal migrada hasta `head`, D-14). Un `backend/tests/modules/reservas/conftest.py` agrega:

- `reloj` (autouse): `monkeypatch.setattr(service, "ahora", lambda: AHORA)` con `AHORA = datetime(2026, 11, 2, 12, 0)`.
- `fabrica_reserva(db)`: inserta una `Reserva` con valores por defecto (mesa 1, cliente 1, `2026-11-03`, `21:30`, 4 personas, `ACTIVA`) y permite cambiar cualquiera.
- `puente_sin_mesa`, `puente_sin_cliente`, `puente_con_capacidad(n)`: fixtures que reemplazan `puente.obtener_mesa` o `puente.existe_cliente` con `monkeypatch`.

### Backend

| Capa | Archivo | Pruebas (una por escenario crítico) |
| --- | --- | --- |
| Puente | `test_puente.py` | `test_obtener_mesa_stub_devuelve_mesa_sin_capacidad`, `test_existe_cliente_stub_acepta_id_positivo` |
| Schemas | `test_schemas.py` | `test_reserva_crear_acepta_datos_validos`, `test_reserva_crear_rechaza_cantidad_no_positiva` (parametrizada 0 y -1), `test_reserva_crear_rechaza_tipos_laxos` (`"4"`, `true`), `test_reserva_crear_rechaza_estado`, `test_reserva_crear_rechaza_hora_con_segundos`, `test_reserva_modificar_rechaza_mesa_o_cliente`, `test_reserva_salida_serializa_hora_en_minutos`, `test_filtro_reservas_rechaza_estado_desconocido` |
| Service, HU-M5-01 | `test_service.py` | `test_crear_reserva_queda_activa`, `test_crear_reserva_rechaza_fecha_pasada`, `test_crear_reserva_rechaza_hora_pasada_de_hoy`, `test_crear_reserva_acepta_hoy_con_hora_futura` (límite), `test_crear_reserva_rechaza_mesa_inexistente`, `test_crear_reserva_rechaza_cliente_inexistente`, `test_crear_reserva_rechaza_capacidad_excedida`, `test_crear_reserva_acepta_capacidad_justa` (límite), `test_crear_reserva_rechaza_turno_ocupado`, `test_crear_reserva_permite_turno_de_reserva_cancelada`, `test_crear_reserva_permite_misma_hora_en_otra_mesa` |
| Service, R13 | `test_service.py` | `test_crear_reserva_traduce_conflicto_del_indice_en_409`: se reemplaza `repository.existe_reserva_activa` por una función que devuelve `False` (simula dos altas simultáneas) y el `commit` choca con el índice parcial; se espera `ReglaDeNegocioError` y la sesión queda usable (`rollback`) |
| Service, HU-M5-03 | `test_service.py` | `test_listar_reservas_ordena_por_fecha_hora_e_id`, `test_listar_reservas_filtra_por_fecha`, `test_listar_reservas_filtra_por_estado`, `test_listar_reservas_pagina_y_cuenta_total`, `test_listar_reservas_sin_resultados_devuelve_pagina_vacia` |
| Service, HU-M5-02 | `test_service.py` | `test_obtener_reserva_inexistente`, `test_modificar_reserva_cambia_fecha_hora_y_personas`, `test_modificar_reserva_conserva_mesa_y_cliente`, `test_modificar_reserva_no_choca_consigo_misma`, `test_modificar_reserva_rechaza_turno_de_otra_reserva`, `test_modificar_reserva_rechaza_reserva_no_activa`, `test_modificar_reserva_rechaza_fecha_pasada`, `test_modificar_reserva_inexistente` |
| Router | `test_router.py` | `test_post_reservas_crea_y_devuelve_201`, `test_post_reservas_turno_ocupado_devuelve_409_con_detalle`, `test_post_reservas_fecha_pasada_devuelve_422`, `test_post_reservas_mesa_inexistente_devuelve_404`, `test_post_reservas_datos_invalidos_devuelve_422`, `test_get_reservas_pagina_y_filtra`, `test_get_reservas_limit_fuera_de_rango_devuelve_422`, `test_get_reserva_por_id_devuelve_200`, `test_get_reserva_inexistente_devuelve_404`, `test_put_reserva_modifica_y_devuelve_200`, `test_put_reserva_no_activa_devuelve_409` |
| Migración | `test_migracion.py` | `test_upgrade_head_crea_reservas_con_una_sola_cabeza`, `test_upgrade_define_columnas_no_nulas_check_e_indices`, `test_upgrade_impone_el_check_de_cantidad_personas`, `test_upgrade_impide_dos_reservas_activas_en_el_mismo_turno` (R13 a nivel de base), `test_upgrade_permite_turno_repetido_si_una_no_esta_activa`, `test_downgrade_a_m3_elimina_reservas_y_conserva_mesas` (`command.downgrade(config, "b2d4f6a8c0e1")`), `test_downgrade_y_upgrade_de_nuevo_recrean_reservas` |

Las pruebas de migración siguen el estilo de `backend/tests/modules/salon/test_migracion.py` (base propia en `tmp_path`, `get_settings.cache_clear()`, inserciones con `text()`). El índice parcial se prueba por comportamiento (inserción repetida → `IntegrityError`), no por reflexión, porque la reflexión de `sqlite_where` depende de la versión de SQLAlchemy.

### Ajuste mínimo de las pruebas de migración de M3

`backend/tests/modules/salon/test_migracion.py` baja la base con desplazamientos relativos al head. Con la revisión nueva `d6f8a0c2e4b6` como head, `-2` deja de llegar a antes de `sectores` y `-1` deja de borrar `mesas`. Cambian exactamente dos líneas, anclando la revisión de destino (como ya hace `backend/tests/modules/productos/test_migracion.py:41` con `"efdafc2a164c"`):

| Línea | Hoy | Después | Revisión anclada |
| --- | --- | --- | --- |
| 116 (`test_downgrade_de_dos_pasos_elimina_sectores_y_conserva_las_tablas_de_m1`) | `command.downgrade(config, "-2")` | `command.downgrade(config, "c4e6a8b0d2f4")` | Revisión anterior a `crea_sectores` (`f3a5c7e9b1d2` tiene `down_revision = "c4e6a8b0d2f4"`) |
| 258 (`test_downgrade_de_un_paso_elimina_mesas_y_conserva_sectores`) | `command.downgrade(config, "-1")` | `command.downgrade(config, "f3a5c7e9b1d2")` | Revisión anterior a `crea_mesas` (`b2d4f6a8c0e1` tiene `down_revision = "f3a5c7e9b1d2"`) |

No cambian los nombres de las pruebas ni las aserciones (siguen comprobando que `mesas` y `sectores` desaparecen y que las tablas anteriores quedan). Se avisa a Giuliano en el PR (AGENTS.md §9.3). Ninguna otra prueba usa desplazamientos relativos (`backend/tests/modules/productos/test_migracion.py:41` y `:152` ya usan revisiones fijas).

### Frontend (Vitest + Testing Library)

`api.ts` se simula con `vi.mock('../api')` como en `frontend/src/modules/productos/pages/ProductoEditarPage.test.tsx:18`; los componentes con formulario se envuelven con `ToastContext.Provider` como en `SeccionFormDialog.test.tsx:26-41`. Las pruebas que dependen de «hoy» usan `vi.useFakeTimers()` y `vi.setSystemTime(new Date(2026, 10, 2, 12, 0))` (constructor local).

| Archivo de prueba | Casos |
| --- | --- |
| `fechas.test.ts` | `hoyLocal` devuelve la fecha local fijada; `sumarDias` cruza fin de mes y fin de año; `formatearFechaReserva('2026-10-24')` devuelve `24/10/2026` sin corrimiento (S11) |
| `api.test.ts` | `listarReservas` arma `fecha`, `estado`, `limit` y `offset`; omite `estado` con `'TODAS'`; `crearReserva` usa `POST /reservas`; `modificarReserva` usa `PUT /reservas/{id}` |
| `components/validarReserva.test.ts` | datos válidos sin errores; fecha anterior a hoy; hoy con hora pasada; hoy con hora futura (límite); personas 0 y texto no numérico; mesa y cliente obligatorios solo en alta; `errorDelServidor` deja el 409 como error general |
| `components/ReservasTabla.test.tsx` | muestra hora, «Mesa n.º», «Cliente n.º», personas y la etiqueta del estado; la acción «Modificar reserva» aparece solo en filas `ACTIVA`; estado vacío |
| `components/NavegadorFecha.test.tsx` | «Día anterior», «Día siguiente» y «Hoy» llaman a `onCambiar` con la fecha correcta |
| `components/ReservaFormulario.test.tsx` | alta válida llama a `crearReserva` y avisa; error local no llama a la API; 409 del servidor se muestra; edición precarga los datos, deshabilita mesa y cliente y llama a `modificarReserva` solo con fecha, hora y personas |
| `pages/ReservasPage.test.tsx` | al entrar pide el día de hoy con estado `ACTIVA`; cambiar de día vuelve a pedir; «Nueva reserva» abre el panel; guardar cierra el panel y recarga; error de carga muestra reintentar; paginación visible con más de 50 reservas |

Cobertura esperada por encima de los umbrales (70 % backend, 60 % frontend), porque todas las ramas de error tienen prueba.

## Matriz de amenazas

N/A: el cambio no agrega enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS o PR, clasificación de archivos ejecutables ni integración de procesos. Las consultas son parametrizadas por SQLAlchemy (D-07, RNF-SEG-05) y los errores no exponen trazas (D-26).

## Archivos a crear o modificar

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/models.py` | Modificar (hoy solo docstring) | `EstadoReserva` y `Reserva` |
| `backend/app/modules/reservas/schemas.py` | Modificar | `ReservaCrear`, `ReservaModificar`, `ReservaSalida`, `FiltroReservas` |
| `backend/app/modules/reservas/repository.py` | Modificar | `obtener`, `existe_reserva_activa`, `agregar`, `listar_reservas` |
| `backend/app/modules/reservas/puente.py` | Crear | Stub de Mesa y Cliente (`MesaReservable`, `obtener_mesa`, `existe_cliente`) |
| `backend/app/modules/reservas/service.py` | Modificar | `ahora`, `crear_reserva`, `obtener_reserva`, `modificar_reserva`, `listar_reservas` |
| `backend/app/modules/reservas/router.py` | Modificar | Cuatro endpoints |
| `backend/app/main.py` | Modificar | Importar y registrar `reservas_router` con `API_PREFIX` |
| `backend/alembic/versions/d6f8a0c2e4b6_crea_reservas.py` | Crear | Tabla `reservas`, check e índices |
| `backend/tests/modules/reservas/__init__.py` | Crear | Paquete de pruebas |
| `backend/tests/modules/reservas/conftest.py` | Crear | Reloj fijo, fábrica de reservas y reemplazos del puente |
| `backend/tests/modules/reservas/test_{puente,schemas,service,router,migracion}.py` | Crear | Pruebas por capa |
| `backend/tests/modules/salon/test_migracion.py` | Modificar (2 líneas, módulo de M3) | Anclar los `downgrade` a revisiones fijas |
| `frontend/src/modules/reservas/types.ts` | Reescribir | Tipos del diagrama |
| `frontend/src/modules/reservas/api.ts` | Reescribir | `listarReservas` paginado, `crearReserva`, `modificarReserva` |
| `frontend/src/modules/reservas/fechas.ts` | Crear | Fechas locales sin corrimiento |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` | Reescribir | Página con navegador, tabla y panel |
| `frontend/src/modules/reservas/components/{NavegadorFecha,ReservasTabla,ReservaFormulario}.tsx` | Crear | Componentes de la pantalla |
| `frontend/src/modules/reservas/components/{useFormularioReserva,validarReserva,estadosReserva}.ts` | Crear | Hook, validación y estados |
| `frontend/src/modules/reservas/components/index.ts` | Modificar | Reexportaciones |
| `frontend/src/modules/reservas/**/*.test.ts(x)` | Crear | Pruebas listadas arriba |

No se modifican `backend/alembic/env.py`, `backend/pyproject.toml`, `backend/app/shared/`, `frontend/src/shared/` ni `frontend/src/App.tsx`.

## Estimación de líneas (punto de control de 800 por lado, no bloqueo)

| Lado | Código | Pruebas | Total estimado | Frente al límite |
| --- | --- | --- | --- | --- |
| `backend/` | módulo ~300 (models 35, schemas 65, repository 45, puente 30, service 95, router 35), migración ~50, `main.py` 2, M3 4 (2 líneas cambiadas) → ~360 | conftest 40, puente 15, schemas 70, service 200, router 120, migración 90 → ~535 | **~850 a 900** | Puede superar 800 por las pruebas |
| `frontend/` | types 25, api 40, fechas 40, estados 15, validar 50, hook 80, formulario 110, tabla 70, navegador 45, página 85, index 5 → ~565 | ~480 | **~1000 a 1050** | Supera 800 |

La estimación es mayor que la de la propuesta (backend 650 a 800, frontend 750 a 950) porque el diseño agrega pruebas de R13, de migración y de los límites de fecha y capacidad. Es informativo: la HU va en un solo PR (AGENTS.md §4) y la nota del PR informa el total.

## Orden de implementación sugerido

1. **HU-M5-01 (crear), backend:** prueba de migración (RED) → migración y `models` → ajuste de las 2 líneas de M3 → `schemas` → `puente` → `repository` (`agregar`, `existe_reserva_activa`) → `service.crear_reserva` con `ahora()` → `router` `POST` y registro en `main.py`.
2. **HU-M5-01, frontend:** `types.ts`, `api.ts` (`crearReserva`), `fechas.ts`, `validarReserva`, `useFormularioReserva` y `ReservaFormulario` en modo alta.
3. **HU-M5-03 (listar), backend:** `repository.listar_reservas`, `FiltroReservas`, `service.listar_reservas`, `GET /reservas`.
4. **HU-M5-03, frontend:** `listarReservas`, `estadosReserva`, `ReservasTabla`, `NavegadorFecha` y `ReservasPage` con el panel de alta.
5. **HU-M5-02 (modificar), backend:** `repository.obtener`, `service.obtener_reserva` y `modificar_reserva` (con `excluir_id`), `GET` y `PUT /reservas/{id}`.
6. **HU-M5-02, frontend:** `modificarReserva`, modo edición del formulario y acción «Modificar reserva» en la tabla.
7. **Cierre:** `ruff`, `lint-imports`, `pytest`, `npm run lint`, `format:check`, `typecheck`, `test:coverage`, `build`; `alembic heads` con una sola cabeza.

## Migración y puesta en marcha

- Migración nueva `d6f8a0c2e4b6` sobre `b2d4f6a8c0e1`; reversión con `alembic downgrade b2d4f6a8c0e1` (borra la tabla y sus datos), como describe el plan de reversión de la propuesta.
- Sin banderas de funcionalidad: el endpoint y la pantalla quedan activos al integrar.

## Preguntas abiertas

- [ ] El equipo valida S1 a S14, en especial `ACTIVA` frente a `PENDIENTE` (S1) y la falta de horario de atención (S2). Ninguna bloquea el diseño: cada una cambia en un solo lugar (enum o una función del `service`).
- [ ] `Supuesto:` el servidor corre en la hora local del restaurante (Decisión 3). Si se despliega en UTC, `ahora()` debe usar una zona configurada (D-12) en un cambio posterior.
- [ ] Mensajes exactos de 404, 409 y 422: los fija la spec.
