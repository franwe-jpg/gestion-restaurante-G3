# Diseño: HU-M5-01-02-03 Crear, modificar y listar reservas

- **Cambio:** `HU-M5-01-02-03` (grupo ABM de `Reserva`, M5, responsable Federico Cabaña).
- **Entradas:** `proposal.md` (decisiones y supuestos S1 a S14) y `exploration.md` de este cambio. La spec (`specs/`) fija el contrato exacto de la API y los escenarios; si este diseño y la spec difieren en un código de estado o un mensaje, gana la spec y se corrige el diseño.
- **Delta del issue #61 (mesas disponibles):** la spec aprobada agrega `GET /reservas/mesas-disponibles`, el rechazo de una mesa `FUERA_DE_SERVICIO` en el alta, el puente real con M3 y el selector de mesa del panel (supuestos S4, S5, S9, S10, S13, S17, S20 y S23 reescritos; S29 a S35 nuevos). Este diseño se actualizó en el lugar: las Decisiones 2, 3, 6 y 9 se ajustaron sin cambiar su número, y las Decisiones 13 a 20 son nuevas. Lo ya implementado antes del delta (tabla `reservas`, migración, listado, modificación y pantalla) no cambia, salvo lo que se indica.
- **Delta del modal (AGENTS.md §5, regla del equipo del 2026-11-01):** la spec aprobada (commit `533ae20`) reemplaza el panel lateral de alta y edición por un modal sobre el `Dialog` compartido (supuestos S24, S34, S36, S37 y S38; requisitos «Formulario de alta», «Formulario de edición» y «Listado de reservas en pantalla»). La Decisión 10 queda **reemplazada** (se conserva su texto como historia) y las Decisiones 21 a 24 son nuevas. Es un delta solo del frontend: no cambia el backend, `shared/`, otros módulos, rutas ni migraciones.
- **Referencias:** `SPRINT-0/S0-05-arquitectura.md` (sección 3.3 y decisiones D-xx), `AGENTS.md` (secciones 4, 5, 6 y 9), `openspec/config.yaml` (`rules.design`).

## Enfoque técnico

El módulo `reservas` se construye de punta a punta con el mismo patrón que M1 `productos` y M3 `salon`:

- **Backend:** `router → service → repository → models` (D-01, D-02), con `schemas` en la entrada y la salida (D-06). El `service` abre y cierra la transacción (D-10); el `repository` solo hace `flush`. Los errores de negocio usan `shared/excepciones.py` y el manejador global de `main.py` los convierte en `{"detalle": "..."}` con 404, 409 o 422 (D-25, D-26). El listado usa `shared/paginacion.py` (D-27).
- **Puente propio:** Mesa y Cliente se validan con un **puente propio** (`reservas/puente.py`), y el `service` lo llama siempre como `puente.<operación>(...)`. Con el delta del issue #61, el **lado Mesa es real**: el puente consulta a M3 solo con `app.modules.salon.service.listar_mesas` y lee todas sus páginas (Decisión 14, S33). El **lado Cliente sigue siendo un stub** hasta que M4 exponga Cliente (S6, S20). El puente es el único archivo de `reservas` que importa algo de `salon`, y no importa nada de `atencion` (contratos de `backend/pyproject.toml:138-154`, RNF-MAN-09).
- **Mesas disponibles (issue #61):** `GET /reservas/mesas-disponibles?fecha&hora` devuelve una lista simple de las mesas que se pueden reservar en ese turno: el `service` cruza las mesas del puente (sin las `FUERA_DE_SERVICIO`) con las reservas `ACTIVA` de esa fecha y hora exactas (Decisiones 13 y 15). El alta rechaza una mesa `FUERA_DE_SERVICIO` con 409 (Decisión 16).
- **Regla de conflicto (R13):** doble defensa. El `service` consulta si ya hay una reserva `ACTIVA` en la misma mesa, fecha y hora; además, un **índice único parcial** en la base (`WHERE estado = 'ACTIVA'`) impide la doble reserva aunque dos solicitudes pasen la consulta al mismo tiempo. El `IntegrityError` del índice se traduce en 409.
- **Frontend:** una sola página (`ReservasPage`) con navegador de fecha y tabla de reservas del día, como la maqueta `SPRINT-2/S2-04-maqueta/reservas.html`. El alta y la edición se abren en un **modal** (`ReservaFormDialog`, sobre el `Dialog` de `frontend/src/shared/components/ui/dialog.tsx`), no en el panel lateral de la primera versión ni en una página aparte (AGENTS.md §5, S24; Decisiones 21 a 24, que reemplazan a la Decisión 10). No se agregan rutas en `App.tsx` (la ruta `/reservas` ya existe en `frontend/src/App.tsx:104`). En el alta, el campo Mesa es un selector que se llena con la lista de mesas disponibles pedida al `api.ts` del módulo (Decisiones 18 y 19); el frontend no importa nada del módulo `salon` (AGENTS.md §9.4).

## Decisiones de arquitectura

### Decisión 1: `EstadoReserva` y `Reserva` viven en `reservas/models.py`

**Elección:** el enum `EstadoReserva` (`StrEnum` con `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA`, `CANCELADA_POR_AUSENCIA`) y el modelo `Reserva` se definen en `backend/app/modules/reservas/models.py`. `schemas.py` importa el enum desde `models.py` de su propio módulo.

**Alternativas descartadas:** ponerlo en `backend/app/shared/models/enums.py`, como `EstadoMesa` (`backend/app/shared/models/enums.py:11`).

**Justificación:** D-05 reserva `shared/models/` para entidades que usan dos o más módulos; hoy solo `reservas` usa el estado. La propuesta excluye cambios en `shared/` (AGENTS.md §9.3). El contrato «models solo importa shared» (`backend/pyproject.toml:176-186`) se cumple: `models.py` solo importa `app.database` y la biblioteca estándar. Que `schemas.py` importe `models.py` del mismo módulo no viola ningún contrato, y el `router` no importa `models` (lo importa indirectamente por `schemas`, permitido por `allow_indirect_imports`). Si M4 o M6 necesitan el enum más adelante, se mueve a `shared/` con un cambio coordinado.

### Decisión 2: puente Mesa/Cliente como módulo de funciones reemplazables (`reservas/puente.py`)

**Elección:** un archivo `backend/app/modules/reservas/puente.py` con tres funciones de módulo y dos tipos de dato. Primera versión (ya implementada): `obtener_mesa` y `existe_cliente` como stubs y `MesaReservable` con solo el `id`. Con el delta del issue #61 cambia el **cuerpo** del lado Mesa (Decisión 14) y se agrega `listar_mesas`; el mecanismo de esta decisión no cambia:

```python
@dataclass(frozen=True)
class SectorDeMesa:
    id: int
    nombre: str


@dataclass(frozen=True)
class MesaReservable:
    id: int
    numero: int
    capacidad: int
    sector: SectorDeMesa
    estado: EstadoMesa          # app.shared.models.enums


def listar_mesas(db: Session) -> list[MesaReservable]: ...          # real, Decisión 14
def obtener_mesa(db: Session, mesa_id: int) -> MesaReservable | None: ...  # real, Decisión 14


def existe_cliente(db: Session, cliente_id: int) -> bool:
    """Stub hasta que M4 exponga Cliente (S6, S20): todo cliente con id positivo existe."""
    return cliente_id > 0
```

El `service` lo usa siempre a través del módulo (`from app.modules.reservas import puente` y luego `puente.obtener_mesa(db, ...)`), nunca con `from ... import obtener_mesa`. Así las pruebas reemplazan el comportamiento con `monkeypatch.setattr(puente, "obtener_mesa", ...)` y el código de producción no cambia.

**Alternativas descartadas:**
- Un `Protocol` con inyección por parámetro (`crear_reserva(db, datos, puente=PuenteStub())`): obliga al `router` a conocer el puente o a usar `Depends`, y suma el concepto de puertos y adaptadores que D-01 descarta para este proyecto.
- Consultar la tabla `mesas` con SQL propio desde `reservas`: rompe el espíritu de RNF-MAN-09 (acceder a datos de otro módulo sin su `service`) aunque `lint-imports` no lo detecte. Sigue descartada con el puente real: el puente usa `salon.service`, nunca la tabla.
- Devolver desde el puente el `MesaSalida` de M3: obligaría a `reservas` a depender de `salon.schemas` (prohibido por `backend/pyproject.toml:148-153`) y acoplaría el `service` y las pruebas a un esquema ajeno.

**Justificación:** el puente recibe `db` porque `salon.service.listar_mesas(db, parametros)` lo necesita. `MesaReservable` es un tipo propio de `reservas`, inmutable y sin dependencia de `salon`, que las pruebas construyen sin base de M3 (S20). Lleva `numero`, `capacidad` y `sector` solo para que el selector los muestre; la capacidad no se compara con la cantidad de personas (S5, issue #61). `estado` usa `EstadoMesa` de `app.shared.models.enums`, que ya es compartido (D-05) y que `reservas` puede importar. El archivo fuera de las cinco capas tiene precedente en `productos/imagenes.py`. Los contratos de las líneas 53-69 y 138-154 permiten que `reservas` importe `app.modules.atencion.service` y `app.modules.salon.service`; prohíben su `router`, `repository`, `models` y `schemas`.

### Decisión 3: reloj parcheable `ahora()` en el `service`, sin `freezegun`

**Elección:** `service.py` define una función pública de módulo:

```python
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")


def ahora() -> datetime:
    """Fecha y hora del restaurante (UTC-3 fija), sin zona. Las pruebas la reemplazan con monkeypatch."""
    return datetime.now(ZONA_DEL_RESTAURANTE).replace(tzinfo=None)
```

Las reglas de S3 usan `ahora().date()` y `ahora().time()`. Las pruebas del `service` y del `router` la reemplazan con `monkeypatch.setattr(service, "ahora", lambda: datetime(2026, 11, 2, 12, 0))`.

**Alternativas descartadas:** `freezegun` o `time-machine` (dependencia nueva; AGENTS.md §9.7 pide acordarla con el equipo); validar la fecha en el `schema` con `date.today()` (no se puede fijar el reloj sin parchear la biblioteca estándar, y la regla de «hoy con hora futura» necesita la fecha y la hora juntas).

**Justificación:** el pedido mencionaba un `hoy()`; se usa `ahora()` porque S3 necesita también la hora («si la fecha es hoy, la hora debe ser posterior a la actual»). Una sola función evita que fecha y hora salgan de dos lecturas distintas del reloj. Actualización (2026-11-01, S28): la fecha y la hora son las de la zona del restaurante, UTC-3 fija, calculadas desde el reloj UTC con `datetime.now(ZONA_DEL_RESTAURANTE)`, así que no dependen de `TZ` del proceso ni del contenedor; el resultado sigue siendo un `datetime` sin zona. Se usa un desplazamiento fijo y no `zoneinfo` porque Argentina no tiene horario de verano desde 2009 y así no hace falta la base de zonas horarias del sistema (que falta en muchas instalaciones de Windows) ni la dependencia `tzdata` (AGENTS.md §9.7). Ver Decisión 20.

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
| | 2. mesa no está `FUERA_DE_SERVICIO` (delta, S31) | `ReglaDeNegocioError` → 409 |
| | 3. cliente existe (`puente.existe_cliente`) | `NoEncontradoError` → 404 |
| | 4. fecha y hora no pasadas (S3) | `DatosInvalidosError` → 422 |
| | 5. sin otra reserva `ACTIVA` en mesa, fecha y hora (S4) | `ReglaDeNegocioError` → 409 |
| Modificar | 1. la reserva existe | `NoEncontradoError` → 404 |
| | 2. la reserva está `ACTIVA` (S7) | `ReglaDeNegocioError` → 409 |
| | 3. fecha y hora no pasadas | `DatosInvalidosError` → 422 |
| | 4. sin conflicto, excluyendo la propia reserva | `ReglaDeNegocioError` → 409 |
| Consultar | la reserva existe | `NoEncontradoError` → 404 |
| Mesas disponibles (delta) | 1. fecha y hora no pasadas (S32), antes de consultar a M3 | `DatosInvalidosError` → 422 |

La modificación no cambia con el delta: no consulta al puente (S27), así que una reserva cuya mesa pasó a `FUERA_DE_SERVICIO` se puede seguir modificando.

**Alternativas descartadas:** responder 409 para la fecha pasada (es un dato inválido, no un choque con otra entidad; D-25 reserva 409 para conflictos de regla).

**Justificación:** sigue S9, S17 y el criterio de M1 y M3 (existencia primero, después estado, después datos, al final el conflicto, que es la consulta más cara). El estado de la mesa se controla junto con su existencia porque ambos salen de la misma consulta al puente. `DatosInvalidosError` ya está mapeado a 422 en `backend/app/main.py:48-52`. Consecuencia aceptada: una reserva `ACTIVA` cuyo turno ya pasó no se puede modificar (S3 se revalida en S7); su destino es «atendida» o «cancelada por ausencia» (HU-M5-05, fuera de alcance). Los textos exactos de los mensajes los fija la spec.

### Decisión 7: la hora viaja y se guarda en minutos

**Elección:** los `schemas` de entrada rechazan una hora con segundos, microsegundos o zona horaria (422) con un `field_validator`; `ReservaSalida` serializa la hora como `"HH:MM"` con un `field_serializer`. Se acepta `"21:30"` y `"21:30:00"`.

**Alternativas descartadas:** truncar los segundos en silencio (podría crear conflictos que el usuario no ve); devolver `"21:30:00"` (obliga al frontend a recortar y a comparar con otro formato que el de `<input type="time">`).

**Justificación:** S3 fija la hora en minutos. El formato `"HH:MM"` es el mismo que produce el `<input type="time">` del formulario, así que el frontend no transforma la hora.

### Decisión 8: listado con modelo de filtro en `Query()` y orden fijo

**Elección:** `FiltroReservas(ParametrosPaginacion)` con `fecha: date | None = None` y `estado: EstadoReserva | None = None`, recibido como `Annotated[FiltroReservas, Query()]`, igual que `FiltroSectores` (`backend/app/modules/salon/schemas.py:68-71` y `backend/app/modules/salon/router.py:34-36`). El `repository` ordena por `fecha`, `hora`, `id` y cuenta con `contar()` (`backend/app/shared/paginacion.py:23-26`).

**Justificación:** D-27 y S8. El `router` no importa `models` (contrato de `backend/pyproject.toml:155-160`) porque el enum llega dentro del `schema`. Se agrega el índice `ix_reservas_fecha_hora` porque `fecha` es la columna de filtro y de orden del listado (D-11).

### Decisión 9: sin claves foráneas hacia `mesas` ni `clientes`

**Elección:** `mesa_id` y `cliente_id` son `INTEGER NOT NULL` sin FK (S10).

**Justificación:** la tabla `clientes` no existe y el módulo es autocontenido; la integridad referencial la cubre el puente. Las FK se agregan en una migración posterior (seguimiento de la propuesta). El delta no cambia esta decisión: aunque el lado Mesa del puente ya consulta a M3, una FK hacia `mesas` acoplaría el esquema de `reservas` al de M3 y exigiría una migración nueva, que el delta no incluye (S10).

### Decisión 10: frontend en una sola página con panel lateral, sin rutas nuevas (REEMPLAZADA por la Decisión 21)

> **Reemplazada el 2026-11-02.** AGENTS.md §5 fija desde el 2026-11-01 una regla para todo el equipo: «los formularios de alta y edición se abren en un modal sobre la misma página (`Dialog` de `frontend/src/shared/components/ui/`)». La spec aprobada (S24) la aplica y deja sin efecto el panel lateral. Siguen valiendo de esta decisión: una sola página, ninguna ruta nueva, `frontend/src/App.tsx` sin cambios y la edición a partir de los datos de la fila, sin `GET /reservas/{id}`. Cambia solo el contenedor del formulario: ver las Decisiones 21 a 24. El texto de abajo se conserva como historia.

**Elección (histórica):** `ReservasPage` contiene el navegador de fecha, la tabla del día y el panel lateral (`ReservaFormulario`) que se abre en modo alta (botón «Nueva reserva») o edición (acción «Modificar reserva» de una fila `ACTIVA`). La edición parte de la fila del listado, como `SeccionFormDialog` parte de `SeccionListado` (`frontend/src/modules/productos/components/SeccionFormDialog.tsx:105-112`).

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

### Decisión 13: `GET /reservas/mesas-disponibles` como lista simple, declarada antes de `GET /reservas/{reserva_id}`

**Elección:**
- Ruta `GET /reservas/mesas-disponibles` en `reservas/router.py`, declarada **después** de `GET /reservas` y **antes** de `GET /reservas/{reserva_id}`. Recibe `consulta: Annotated[ConsultaMesasDisponibles, Query()]` y responde `list[MesaDisponible]`.
- `ConsultaMesasDisponibles(BaseModel)`: `fecha: date` y `hora: time`, los dos obligatorios, con la misma validación de minutos que `_DatosDelTurno` (S16). Para no duplicar la regla, el cuerpo del `field_validator("hora")` actual pasa a una función privada de módulo (`_hora_en_minutos(hora) -> time`) que usan los dos esquemas; el mensaje no cambia.
- `MesaDisponible(BaseModel)`: `id`, `numero`, `capacidad` y `sector: SectorResumenMesa` (`id`, `nombre`), con `from_attributes=True`. No declara `estado`, así que no sale en el JSON aunque el objeto de origen lo tenga.
- Respuesta sin paginar (S29): una lista JSON, no `Pagina[T]`.

**Alternativas descartadas:**
- `GET /mesas/disponibles` o una ruta bajo `salon`: es una regla de `reservas` (cruza mesas con reservas) y M3 no se modifica (AGENTS.md §9.3).
- `Pagina[MesaDisponible]`: un selector necesita todas las opciones; la paginación obligaría al frontend a pedir varias páginas para una lista de decenas de elementos (S29). D-27 aplica a los listados de recursos, y esta respuesta es una consulta derivada.
- Reusar `SectorResumen` de `salon.schemas`: prohibido por el contrato de `backend/pyproject.toml:148-153`; se declara un esquema propio de dos campos.
- Declarar la ruta después de `/{reserva_id}`: Starlette compara las rutas en orden y `{reserva_id}` acepta cualquier texto; FastAPI respondería 422 por un `reserva_id` no entero (escenario «La ruta no se confunde con la consulta por id»).

**Justificación:** D-02 (el `router` solo delega), D-06 (entrada y salida con `schemas`), D-22 (prefijo `/api/v1` por `API_PREFIX`) y D-25/D-26 (los 422 de forma salen del manejador global de `backend/app/main.py:61-67`, que nombra `fecha` u `hora` porque arma el campo con `loc[1:]`). Recibir el modelo con `Query()` sigue el patrón de `FiltroReservas` (Decisión 8).

### Decisión 14: el puente real lee todas las páginas de `salon.service.listar_mesas`

**Elección:** el lado Mesa de `puente.py` importa `from app.modules.salon import service as salon_service` (solo ese módulo de `salon`) y resuelve las dos operaciones con una única lectura completa:

```python
TAMANO_PAGINA = LIMIT_MAXIMO  # 100, de app.shared.paginacion


def _leer_todas(db: Session) -> list[MesaReservable]:
    """Lee todas las páginas de M3. No captura errores: si una página falla, falla todo (S33)."""
    mesas: list[MesaReservable] = []
    offset = 0
    while True:
        pagina = salon_service.listar_mesas(db, ParametrosPaginacion(limit=TAMANO_PAGINA, offset=offset))
        mesas.extend(_a_mesa_reservable(item) for item in pagina.items)
        offset += len(pagina.items)
        if not pagina.items or offset >= pagina.total:
            return mesas


def listar_mesas(db: Session) -> list[MesaReservable]:
    return _leer_todas(db)


def obtener_mesa(db: Session, mesa_id: int) -> MesaReservable | None:
    return next((mesa for mesa in _leer_todas(db) if mesa.id == mesa_id), None)
```

`_a_mesa_reservable(item)` copia `id`, `numero`, `capacidad`, `sector.id`, `sector.nombre` y `estado` leyendo atributos del objeto que devuelve M3, sin importar `MesaSalida` (el tipo se infiere de `salon_service.listar_mesas`). Como `obtener_mesa` y `listar_mesas` salen de la misma función de lectura y conversión, informan lo mismo de cada mesa (requisito de coherencia del contrato del puente). Se llama a `salon_service.listar_mesas` a través del módulo para que la prueba de «M3 falla en la segunda página» pueda reemplazarla.

**Sin capturar errores:** el puente no tiene `try`. Si M3 lanza una excepción en cualquier página, sube por el `service` y el `router` hasta Starlette, que responde 500; no hay lista parcial. En el alta, la lectura ocurre en el paso 1 de la Decisión 6, antes de cualquier escritura, así que no se guarda nada. El cuerpo de ese 500 es el texto plano de Starlette (`Internal Server Error`), no `{"detalle": ...}`: la spec solo exige el código 500 y D-26 cubre los 404, 409 y 422; agregar un manejador genérico tocaría `backend/app/main.py` y queda fuera del delta.

**Corte del ciclo:** el ciclo de la spec («hasta que `offset + len(items) >= total`») se mantiene y se agrega el corte por página vacía. Sin él, si `total` cambiara entre dos páginas (una mesa borrada en M3 mientras se lee), una página vacía con `offset < total` dejaría el ciclo sin fin.

**Alternativas descartadas:**
- Pedir a M3 un `obtener_mesa(db, mesa_id)` o un filtro por estado: es la solución correcta a mediano plazo, pero exige modificar `salon`, que este cambio no puede tocar (AGENTS.md §9.3). Queda como seguimiento para coordinar con Giuliano; no bloquea.
- Leer solo la primera página (`limit=100`): deja afuera a las mesas 101 en adelante (escenario de 120 mesas).
- Cachear la lectura entre solicitudes: agrega invalidación y estado compartido para un volumen chico; una lectura por solicitud siempre refleja el estado actual de M3 (S35).
- Capturar el error y devolver lo leído: la spec lo prohíbe (escenario «M3 falla mientras el puente lee sus páginas»); una lista parcial haría creer que una mesa no existe.

**Justificación:** M3 solo ofrece `listar_mesas(db, parametros) -> Pagina[MesaSalida]`, paginado con `limit` de 1 a 100 (`backend/app/shared/paginacion.py:7-13`), ordenado por `Sector.nombre`, `Mesa.numero` y `Mesa.id`, sin filtro por estado ni búsqueda por `id` (`backend/app/modules/salon/repository.py:67-74`), y `reservas` no puede cambiarlo (S33). **Costo:** cada alta y cada consulta de mesas disponibles hace `ceil(N/100)` lecturas de M3 (más un `COUNT` por página); con las decenas de mesas de un restaurante es una sola página. Si un local tuviera cientos de mesas, el costo crece lineal y la alternativa de arriba lo resuelve sin cambiar las reglas de `reservas`. **Consistencia:** las páginas se leen con consultas separadas, así que un alta o una baja de mesas en M3 durante la lectura podría duplicar u omitir una mesa en esa respuesta; es improbable y el alta vuelve a verificar la mesa (S35). **Contratos:** `lint-imports` pasa sin cambios: `app.modules.reservas.puente → app.modules.salon.service` está permitido, y la cadena indirecta hacia `salon.schemas` y `salon.repository` no se controla (`allow_indirect_imports = true`). La spec dice además que solo el puente importa de `salon`: `lint-imports` no puede expresar «solo desde el puente» sin cambiar los contratos, así que lo verifica una prueba (Decisión 17).

### Decisión 15: la disponibilidad se calcula en el `service` con una consulta propia de `reservas`

**Elección:**
- `repository.ids_de_mesas_con_reserva_activa(db, fecha, hora) -> set[int]`: `select(Reserva.mesa_id).where(Reserva.fecha == fecha, Reserva.hora == hora, Reserva.estado == EstadoReserva.ACTIVA)`, parametrizada (D-07). La resuelve el índice existente `ix_reservas_fecha_hora` (`fecha`, `hora`); el índice único parcial `ux_reservas_mesa_fecha_hora_activa` empieza por `mesa_id` y no sirve para esta búsqueda. No hace falta un índice nuevo.
- `service.listar_mesas_disponibles(db, fecha, hora) -> list[MesaDisponible]`, en este orden:
  1. `_validar_momento(fecha, hora)` (la misma función del alta, mismos mensajes 422; S32). Un turno pasado no consulta a M3.
  2. `ocupadas = repository.ids_de_mesas_con_reserva_activa(db, fecha, hora)`.
  3. `mesas = puente.listar_mesas(db)`.
  4. Filtra las mesas cuyo `estado` no es `FUERA_DE_SERVICIO` y cuyo `id` no está en `ocupadas`. `LIBRE` y `OCUPADA` se incluyen (S30).
  5. Ordena por `(sector.nombre, numero, id)` y convierte cada una con `MesaDisponible.model_validate(mesa)`.
- La consulta es de solo lectura: no hace `commit` ni `flush`.

**Alternativas descartadas:**
- Delegar el filtro de `FUERA_DE_SERVICIO` en el puente: el contrato del puente exige que `listar_mesas` incluya esas mesas («descartarlas es una regla de `reservas`»), y el alta necesita distinguir «no existe» (404) de «fuera de servicio» (409).
- Una consulta por mesa (`existe_reserva_activa` en un ciclo): N consultas en lugar de una.
- Confiar en el orden que trae el puente sin ordenar: el doble de prueba puede ofrecer las mesas en cualquier orden (escenario «Orden por sector, número e id»). Ordenar en Python es barato y deja el orden garantizado por `reservas`. La comparación de textos de Python (por punto de código) coincide con la intercalación `BINARY` por defecto de SQLite, así que el resultado es el mismo que el orden de M3.

**Justificación:** S4, S30, S32 y S33. Las reglas viven en el `service` (D-02) y la consulta en el `repository` (D-07). La regla de doble reserva no usa el puente (contrato del puente), y la disponibilidad reutiliza exactamente la misma definición de «turno ocupado» que el alta: misma fecha, misma hora y estado `ACTIVA`.

### Decisión 16: el alta rechaza la mesa `FUERA_DE_SERVICIO` con 409

**Elección:** `_validar_mesa(db, mesa_id)` pasa a leer la mesa una sola vez y a controlar las dos condiciones:

```python
def _validar_mesa(db: Session, mesa_id: int) -> None:
    mesa = puente.obtener_mesa(db, mesa_id)
    if mesa is None:
        raise NoEncontradoError(f"La mesa {mesa_id} no existe")
    if mesa.estado == EstadoMesa.FUERA_DE_SERVICIO:
        raise ReglaDeNegocioError(f"La mesa {mesa_id} está fuera de servicio")
```

El orden del alta queda: forma, existencia, fuera de servicio, cliente, momento y turno libre (Decisión 6, S17). `OCUPADA` no se rechaza (S30). La modificación no cambia (S27).

**Alternativas descartadas:** 422 (los datos están bien formados; el estado de la mesa impide la operación, igual que la doble reserva); rechazar también `OCUPADA` (describe el momento presente, no el turno). Las dos decisiones las tomó y aprobó la persona responsable (S30, S31).

**Justificación:** D-25 reserva 409 para conflictos con reglas de negocio y D-26 fija el cuerpo `{"detalle": ...}`; `ReglaDeNegocioError` ya está mapeado a 409 en `backend/app/main.py:49-51`. Una sola llamada a `obtener_mesa` evita leer M3 dos veces por alta.

### Decisión 17: doble de prueba por defecto y semilla de M3 solo en las pruebas del puente real

**Elección:**
- `backend/tests/modules/reservas/conftest.py` define una clase `DoblePuente` con un diccionario `mesas: dict[int, MesaReservable]` y los métodos `obtener_mesa(db, mesa_id)`, `listar_mesas(db)` (valores del diccionario, en el orden de inserción) y `existe_cliente(db, cliente_id)` (`cliente_id > 0`, igual que el stub). Ofrece además un ayudante `poner(mesa_id, **cambios)` que reemplaza una mesa con `dataclasses.replace`, para que `obtener_mesa` y `listar_mesas` nunca difieran en el estado de una mesa.
- Fixture **autouse** `puente_doble` (devuelve la instancia): crea el doble por defecto de la spec (mesas 5 y 6, sector `SectorDeMesa(1, "Salón")`, `numero` igual al `id`, capacidad 4, `EstadoMesa.LIBRE`) e instala sus tres métodos con `monkeypatch.setattr(puente, ...)`. Toda prueba de `reservas` arranca con el doble, sin base de M3 (S20).
- `puente_sin_mesa` vacía el diccionario del doble (en lugar de reemplazar solo `obtener_mesa`), y `puente_sin_cliente` reemplaza `existe_cliente` por `lambda _db, _id: False`. Así sigue habiendo coherencia entre `obtener_mesa` y `listar_mesas`.
- Fixture `puente_real` (no autouse): deshace el doble volviendo a poner las funciones originales del módulo `puente`, guardadas al importar `conftest.py` (`OBTENER_MESA_REAL = puente.obtener_mesa`, etc.). Solo la piden las pruebas «el puente real».
- Fixture `mesas_en_m3(db)`: fábrica que crea un sector y N mesas en la base de prueba con los modelos `Sector` y `Mesa` de `salon` (un `add_all` y un `commit`; el validador de `Sector.nombre` completa `nombre_normalizado`), con estado configurable. Los modelos de `salon` se importan **solo en las pruebas**: `lint-imports` controla `root_package = "app"` (`backend/pyproject.toml:51`) y no alcanza a `tests/`. El estado `FUERA_DE_SERVICIO` se asigna sobre el modelo porque M3 no ofrece una operación para cambiarlo.
- Prueba de arquitectura `test_solo_el_puente_importa_salon` (en `test_puente.py`): recorre con `ast` los archivos de `app/modules/reservas/` y comprueba que ninguno importa `app.modules.atencion` y que solo `puente.py` importa de `app.modules.salon`, y únicamente `app.modules.salon.service`.

**Alternativas descartadas:**
- Sembrar M3 en todas las pruebas: acopla las pruebas de `reservas` al esquema de M3 y las hace más lentas; la spec pide el doble (S20).
- Dejar el puente real como predeterminado y pedir el doble prueba por prueba: casi todas las pruebas existentes usan la mesa 5 o la 6 y se romperían con 404.
- Crear las 120 mesas con `salon.service.crear_mesa`: 120 `commit` y sin forma de poner una mesa fuera de servicio.

**Justificación:** RNF-MAN-04 (una prueba por criterio), AGENTS.md §9.5 y D-14 (base temporal migrada por prueba). El doble respeta la forma del contrato del puente, y las pruebas del puente real cubren lo que el doble no puede: la paginación, el estado real y la propagación de errores de M3.

### Decisión 18: hook `useMesasDisponibles` con descarte de respuestas viejas por limpieza del efecto y clave del turno

**Elección:** `frontend/src/modules/reservas/components/useMesasDisponibles.ts`:

```ts
export type EstadoMesasDisponibles =
  | { tipo: 'inactivo' }                               // Fecha u Hora no pasan la validación local
  | { tipo: 'cargando' }
  | { tipo: 'listo'; mesas: MesaDisponible[] }         // puede venir vacía
  | { tipo: 'error'; mensaje: string };

export function useMesasDisponibles(
  fecha: string, hora: string, habilitado: boolean,
): EstadoMesasDisponibles;
```

- La clave del turno es la fecha y la hora unidas en un texto (por ejemplo `2026-11-02 21:30`) cuando `habilitado` es `true`, y `null` si no. Con clave `null` no se pide nada y el estado es `inactivo`.
- Un `useEffect` con dependencias `[clave, fecha, hora]` llama a `listarMesasDisponibles(fecha, hora)` y, al resolver, guarda `{ clave, respuesta }` solo si el efecto sigue vigente (variable `vigente` que la limpieza pone en `false`, el mismo patrón de `frontend/src/shared/hooks/useApi.ts:28-43`).
- El estado se **deriva** durante el render: si el resultado guardado no tiene la `clave` actual, el estado es `cargando`; si la tiene, es `listo` o `error`. No se llama a `setState` de forma sincrónica dentro del efecto.

**Alternativas descartadas:**
- `useApi` de `shared`: no se puede deshabilitar (siempre pide, y la spec prohíbe pedir sin Fecha y Hora válidas) y, al cambiar la clave, conserva los datos anteriores con `cargando: false` hasta que llega la respuesta nueva, así que mostraría la lista del turno anterior. Cambiarlo es tocar `shared/`.
- `AbortController`: `clienteHttp.get` (`frontend/src/shared/api/client.ts:53`) no recibe una señal, y agregarla toca `shared/`. Además cancelar no alcanza: una respuesta que ya se resolvió igual hay que ignorarla.
- Contador de solicitudes en un `useRef`: equivale a la bandera de limpieza, pero se aparta del patrón ya usado en `useApi`.

**Justificación:** la bandera descarta toda respuesta de un efecto reemplazado (escenario «Una respuesta vieja no pisa a la nueva»), y la comparación de la clave garantiza que la lista mostrada corresponda siempre a la Fecha y la Hora actuales, también mientras llega la respuesta nueva (estado `cargando`). Derivar el estado en el render evita los `setState` sincrónicos en efectos que señala `eslint-plugin-react-hooks` 7 (`frontend/package.json:40`) y sigue el mismo criterio que `useListadoReservas` (`pages/useListadoReservas.ts:25-26`). Llamar a la API pasa por el `api.ts` del módulo (D-16).

### Decisión 19: selector de mesa sobre `Select` y `FormField`; la edición no usa el selector

**Elección:**
- `components/SelectorMesa.tsx` recibe `estado: EstadoMesasDisponibles`, `valor: string`, `error?: string` y `onCambiar(valor)`, y usa `FormField` (`frontend/src/shared/components/ui/form-field.tsx`) con la etiqueta «Mesa» y `Select` (`frontend/src/shared/components/ui/select.tsx`), los mismos componentes que ya usa `SelectorEstadoReserva`. No hay estilos nuevos.

| Estado | `Select` | Opciones |
| --- | --- | --- |
| `inactivo` | deshabilitado | ninguna |
| `cargando` | deshabilitado | una sola: «Cargando mesas…» (valor vacío) |
| `listo` con mesas | habilitado | primera opción vacía «Seleccione una mesa» (`Supuesto:` texto no fijado por la spec) y una por mesa: `${sector.nombre} · Mesa ${numero} (${capacidad} personas)`, valor `String(id)` |
| `listo` vacía | deshabilitado | una sola: «No hay mesas disponibles para esa fecha y hora» |
| `error` | deshabilitado | ninguna; el mensaje de la API se muestra como error del campo |

- El error del campo es `errores.mesa` (validación local) o, si no lo hay, el mensaje del estado `error`.
- `useFormularioReserva` (alta):
  - calcula `turnoValido` con una función nueva y pura de `validarReserva.ts`, `turnoValido(fecha, hora, hoy, horaActual): boolean` (sin errores de Fecha ni de Hora), y llama a `useMesasDisponibles(datos.fecha, datos.hora, modo === 'alta' && turnoValido)`;
  - `mesaVigente` = `datos.mesa` si el estado es `listo` y la lista la incluye; si no, `''`. El selector muestra `mesaVigente` y la validación local recibe `{ ...datos, mesa: mesaVigente }`: mientras carga, con error o sin turno válido, «Guardar reserva» marca «La mesa es obligatoria.» y no envía nada (S34);
  - cuando llega una lista `listo` que no incluye `datos.mesa`, borra la elección con un ajuste de estado durante el render (mismo patrón que `useListadoReservas`); si la incluye, la conserva;
  - expone `guardarDeshabilitado = enviando || (modo === 'alta' && estado listo y vacío)`.
- `validarReserva`: en el alta, Mesa solo controla que no esté vacía («La mesa es obligatoria.»); desaparece «La mesa debe ser un entero positivo.», porque el valor sale de una opción del selector. Cliente no cambia.
- `ReservaFormulario`: en el alta muestra `SelectorMesa`; en la edición sigue mostrando el campo de solo lectura actual («Mesa (número)», deshabilitado, con el `mesa_id` de la fila) y no pide la lista (`habilitado` es `false`). Ante un 404, 409 o 422 al guardar, `datos` no se toca y la mesa elegida se conserva.

**Alternativas descartadas:** un componente de selección nuevo o con búsqueda (no existe en `shared/` y agregaría estilos); mostrar el selector también en la edición (la mesa no cambia, S7, y la spec pide que la edición no pida la lista); importar el `api.ts` o los tipos del módulo `salon` del frontend (AGENTS.md §9.4, S34).

**Justificación:** AGENTS.md §5 (buscar el componente en `shared/` antes de crearlo), D-15 (todo dentro de `frontend/src/modules/reservas/`), D-16 y S13, S34 y S35. Validar con la mesa vigente, y no con el texto guardado, impide enviar una mesa que la lista actual no ofrece.

### Decisión 20: «hoy» y la hora actual en la zona del restaurante, no en la del contenedor (S28)

**Elección (actualizada el 2026-11-01):** `ahora()` calcula la fecha y la hora con `datetime.now(ZONA_DEL_RESTAURANTE)` y descarta la zona, con `ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")` como constante de `reservas/service.py`. Así «hoy» y la hora actual son los del restaurante aunque el contenedor corra en UTC (S28). El panel sigue validando con la hora local del navegador (`fechas.ts`): coinciden mientras el navegador esté en la zona del restaurante y, si no, la consulta de mesas disponibles responde 422 y el selector muestra ese mensaje junto al campo Mesa (escenario «Falla la consulta de la lista»). Se pide al equipo `TZ=America/Argentina/Buenos_Aires` en `compose.yaml` como mejora complementaria (registros y otros módulos); **no es necesario** para esta corrección.

**Alternativas descartadas:** `zoneinfo.ZoneInfo("America/Argentina/Buenos_Aires")` (necesita la base de zonas horarias del sistema o la dependencia `tzdata`, que hay que acordar con el equipo, AGENTS.md §9.7); leer la zona de la configuración (D-12: variable de entorno nueva, `.env.example` y acuerdo del equipo); enviar la hora del navegador a la API (el servidor dejaría de ser la fuente de «hoy»); depender solo de `TZ` en `compose.yaml` (archivo compartido, y no cubre a quien corre el backend fuera de Docker).

**Justificación:** el problema se comprobó el 2026-10-31: `compose.yaml` no define `TZ`, `datetime.now()` devolvía la hora UTC y, para una reserva de hoy, el servidor exigía una hora posterior a la hora local más 3 horas durante todo el día; además, entre las 21:00 y las 24:00 locales rechazaba «hoy» con «La fecha de la reserva no puede ser anterior a hoy». Argentina no usa horario de verano desde 2009, así que un desplazamiento fijo de -3 horas es exacto. Limitación: si el restaurante cambiara de zona, hay que cambiar la constante.

### Decisión 21: el contenedor pasa a ser `ReservaFormDialog`, sobre el `Dialog` compartido (reemplaza a la Decisión 10)

**Elección:**
- `components/ReservaFormulario.tsx` se **renombra** a `components/ReservaFormDialog.tsx` (y su prueba a `ReservaFormDialog.test.tsx`), con la misma forma que `MesaFormDialog` (`frontend/src/modules/salon/components/MesaFormDialog.tsx:107-149`) y `ClienteFormDialog`:

```tsx
export interface ReservaFormDialogProps {
  /** Con `reserva` el modal modifica esa fila; sin ella da de alta una reserva nueva. */
  reserva?: Reserva;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

/** Se monta solo mientras el modal está abierto: cada apertura parte de la fila o de campos vacíos. */
export function ReservaFormDialog({ reserva, onGuardado, onOpenChange }: ReservaFormDialogProps) {
  const formulario = useFormularioReserva({ reserva, onGuardado });
  const edicion = reserva !== undefined;
  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={edicion ? 'Modificar reserva' : 'Nueva reserva'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form={ID_FORMULARIO_RESERVA} disabled={formulario.guardarDeshabilitado}>
            Guardar reserva
          </Button>
        </>
      }
    >
      <form id={ID_FORMULARIO_RESERVA} noValidate onSubmit={alEnviar} className="space-y-4">
        {/* error general, Cliente, Fecha y Hora en una fila, Cantidad de personas, CampoMesa: sin cambios */}
      </form>
    </Dialog>
  );
}
```

- **No hay prop `open`:** el componente se monta solo mientras debe verse un modal y le pasa `open` fijo al `Dialog`, igual que `MesaFormDialog` y `ClienteFormDialog`. La página decide montarlo o no (Decisión 22).
- **Título exacto de la spec:** «Nueva reserva» en el alta y «Modificar reserva» en la edición (requisitos «Formulario de alta» y «Formulario de edición»); no «Editar reserva». El botón de guardar dice «Guardar reserva» en los dos modos, como hoy. No se agrega `description`: la spec no fija un texto y no se inventa (AGENTS.md §9.1).
- **Se elimina** `CabeceraDelPanel` con su botón «Cerrar formulario»: la X del `Dialog` («Cerrar modal») la reemplaza (spec: «el modal NO necesita un botón "Cerrar formulario" aparte»). También se eliminan `Card`, `CardHeader`, `CardTitle`, `CardContent` y el ícono `X` de las importaciones, y el `id="titulo-reserva"`/`aria-labelledby` del formulario: el `Dialog` ya nombra el diálogo con su `title` (`role="dialog"`, `aria-labelledby`).
- **Pie y envío:** «Cancelar» y «Guardar reserva» pasan al `footer` del `Dialog`. Como el `Dialog` dibuja el `footer` fuera del cuerpo, el `<form>` queda en el cuerpo con un `id` (`ID_FORMULARIO_RESERVA = 'formulario-reserva'`) y el botón de guardar lo envía con el atributo `form`, el mismo mecanismo que ya usa `ProductoFormDialog` (`frontend/src/modules/productos/components/ProductoFormDialog.tsx:60` y `FormularioProducto.tsx:26`). Así se conserva lo que hoy hace el panel: Enter en un campo envía el formulario y `onSubmit` llama a `formulario.enviar()`.
- **Cerrar:** la X, Escape y el clic en el fondo los maneja el `Dialog` llamando a `onOpenChange(false)` (`dialog.tsx:50-53`, `:90` y `:118`); «Cancelar» llama a lo mismo. Las cuatro vías son equivalentes por construcción (spec: «DEBE tener el mismo efecto»). «Cancelar» y la X **no** se deshabilitan mientras `enviando` es `true`: la spec permite cerrar mientras se guarda (S38), y lo que pase con esa respuesta lo resuelve la Decisión 23.
- **Qué no cambia:** `useFormularioReserva` (salvo la guarda de la Decisión 23), `validarReserva`, `SelectorMesa`, `useMesasDisponibles`, `CampoReserva`, `CampoMesa` y los textos de los campos, los errores y los avisos. Solo cambia el contenedor JSX: el `<Card>` dentro del `<div className="w-full lg:w-96 lg:shrink-0">` pasa a ser el `<Dialog>`.
- `components/index.ts` reexporta `ReservaFormDialog` en lugar de `ReservaFormulario`.

**Alternativas descartadas:**
- Conservar el nombre `ReservaFormulario.tsx` y solo cambiar el contenedor: el resto del proyecto nombra estos componentes `*FormDialog` (`MesaFormDialog`, `SectorFormDialog`, `ClienteFormDialog`, `ProductoFormDialog`, `SeccionFormDialog`, `MedioPagoFormDialog`), y S1-02 pide nombres coherentes en todos los módulos. El renombrado es barato: solo lo importan `ReservasPage.tsx`, `components/index.ts` y su prueba (verificado con búsqueda en `frontend/src`).
- Recibir `open` y dejar el componente siempre montado: obliga a reiniciar el estado del formulario a mano en cada apertura y rompe la guarda de la Decisión 23, que depende de que cerrar el modal desmonte el formulario.
- Botones en el cuerpo, sin `footer`: se aparta de los demás `*FormDialog` y del pie con borde del `Dialog`.
- Botón de guardar con `onClick={() => void formulario.enviar()}` y sin `<form>`, como `MesaFormDialog`: funciona, pero pierde el envío con Enter que el formulario ya tiene; el atributo `form` lo conserva sin código nuevo.

**Justificación:** AGENTS.md §5 (regla del modal y «buscar el componente en `shared/` antes de crearlo»), S24, D-15 (todo dentro de `frontend/src/modules/reservas/`) y D-16 (las llamadas siguen pasando por `api.ts`). El `Dialog` ya ofrece la trampa de foco, Escape, el cierre por el fondo, el bloqueo del desplazamiento y la devolución del foco al cerrar (`dialog.tsx:42-81`), así que el módulo no agrega nada de eso.

### Decisión 22: estado de `ReservasPage`, un solo modal a la vez y «Nueva reserva» deshabilitado durante la edición

**Elección:**
- Se conserva la unión `Panel = 'cerrado' | 'alta' | { edicion: Reserva }` (se puede renombrar a `ModalDeReserva`; el nombre es indiferente). Como guarda un solo valor, **ya garantiza un solo modal a la vez** (S36: «el mismo estado que ya tenía el panel lateral»): no se agrega estado.
- `PanelDeReserva` pasa a ser `ModalDeReserva` y monta `ReservaFormDialog` solo cuando el valor no es `'cerrado'`, con la misma clave de hoy, `key={reserva?.id ?? 'alta'}`. Desaparecen el `<div className="w-full lg:w-96 lg:shrink-0">` y el layout de dos columnas (`flex ... lg:flex-row`): el listado ocupa todo el ancho y el modal se dibuja encima.
- **Callback estable para `onOpenChange`:** `const alCambiarModal = useCallback((abierto: boolean) => { if (!abierto) setPanel('cerrado'); }, [])`. Es necesario, no cosmético: el `Dialog` tiene `onOpenChange` en las dependencias de su efecto (`dialog.tsx:81`); con una función nueva en cada render, cada vez que la página se vuelve a dibujar con el modal abierto (por ejemplo, cuando termina de cargar la tabla) el efecto se limpia y se vuelve a ejecutar, devuelve el foco al elemento anterior y lo pone otra vez en la X, sacándolo del campo donde la persona escribe. `SalonPage` evita lo mismo pasando un `setState` directo (`frontend/src/modules/salon/pages/SalonPage.tsx:172-177`); acá hace falta traducir el booleano a `'cerrado'`, así que se usa `useCallback` (ya usado en el proyecto, por ejemplo en `frontend/src/shared/hooks/useApi.ts`).
- **Botón «Nueva reserva»:** `disabled={typeof panel === 'object'}`, es decir, deshabilitado **solo durante la edición**. Coincide con los escenarios «El botón "Nueva reserva" se deshabilita durante la edición» (deshabilitado, pulsarlo no hace nada y el modal de edición sigue con sus datos) y «... se habilita de nuevo al cerrar la edición» (al cerrar con o sin guardar, el valor vuelve a `'cerrado'`). Durante el alta no se deshabilita: el botón queda detrás del fondo del modal y fuera de la trampa de foco, así que no se alcanza, y si una prueba en jsdom (que no comprueba qué elemento está encima) lo pulsara, `setPanel('alta')` con el mismo valor no cambia nada. Además, como el `Dialog` devuelve el foco al elemento que lo tenía al abrir (`dialog.tsx:45` y `:79`), que en el alta es justamente «Nueva reserva», mantenerlo habilitado evita depender del orden en que React quita el `disabled` y ejecuta esa devolución.
- `alGuardar` no cambia: `setPanel('cerrado')` y `listado.reservas.recargar()`. Solo la llama una instancia montada del formulario (Decisión 23).
- **Acción «Modificar reserva» de otra fila con un modal abierto:** no se agrega lógica. En el navegador el fondo del `Dialog` tapa la tabla y la trampa de foco impide llegar a ella con el teclado. Si igual se disparara, el valor cambia a otra `{ edicion }`, la `key` cambia, el formulario anterior se desmonta (y su guarda descarta cualquier respuesta pendiente) y se monta uno nuevo con los datos de la fila.

**Por qué importa la `key`:** con el flujo normal, todo cambio de modal pasa por `'cerrado'`, que desmonta el formulario. La `key` cubre los cambios directos (de una fila a otra, o de la edición al alta sin pasar por `'cerrado'`) y garantiza que cada modal sea una instancia nueva de `useFormularioReserva`. La guarda de la Decisión 23 se apoya en eso: «instancia montada» equivale a «el modal que pidió el guardado sigue abierto».

**Alternativas descartadas:**
- `disabled={panel !== 'cerrado'}`: también cumple la spec, pero deshabilita un botón que en el alta no se alcanza y que es el destino de la devolución del foco al cerrar.
- Cerrar la edición en silencio y abrir el alta al pulsar «Nueva reserva»: perdería cambios sin guardar; S36 lo descarta.
- Dos estados booleanos (`altaAbierta`, `edicionAbierta`), como `SalonPage`: permitiría dos modales a la vez, que S36 prohíbe y que el `Dialog` no soporta bien (dos trampas de foco y dos escuchas de Escape).

**Justificación:** S36, AGENTS.md §5 y el principio de no agregar estado cuando el que existe ya expresa la regla. La forma de la página sigue la de `SalonPage` (monta el diálogo solo cuando está abierto).

### Decisión 23: guarda de guardado vigente en `useFormularioReserva` (S38)

**Problema:** hoy `enviar()` hace `await guardar(datos, reserva)` y después, sin comprobar nada, llama a `setEnviando(false)`, `mostrarToast(...)` y `onGuardado()` o `setErrores(...)` (`useFormularioReserva.ts:125-134`). Si la persona cierra el modal mientras la solicitud está en curso y después abre otro, la respuesta tardía muestra el aviso, recarga la tabla y, por `alGuardar`, pone el valor en `'cerrado'`, **cerrando el modal nuevo** con sus datos. Con el panel lateral pasaba lo mismo, pero el modal lo hace visible. S38 y los escenarios «Cerrar mientras se guarda», «Una respuesta de guardado tardía no cierra un modal distinto» y «Lo mismo al revés, con un alta tardía» lo prohíben.

**Elección:** una bandera de vigencia por instancia, con el mismo patrón y el mismo nombre que la bandera `vigente` de `useMesasDisponibles` (`useMesasDisponibles.ts:42-50`) y de `useApi`:

```ts
export function useFormularioReserva({ reserva, onGuardado }: OpcionesFormularioReserva) {
  // ...estado actual sin cambios...
  /** `true` mientras el modal que creó este formulario sigue montado (S38). */
  const vigente = useRef(false);

  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);

  const enviar = async () => {
    // ...validación local sin cambios...
    setEnviando(true);
    const respuesta = await guardar(datos, reserva);
    if (!vigente.current) return; // el modal se cerró: la respuesta no toca nada (S38)
    setEnviando(false);
    // ...toast y onGuardado(), o setErrores(...), sin cambios...
  };
```

- La comprobación va **inmediatamente después del `await`** y antes de cualquier efecto: `setEnviando`, `mostrarToast`, `onGuardado` y `setErrores`. Una respuesta tardía, buena o mala, no hace nada.
- `vigente.current = true` se pone **dentro del efecto** y no solo como valor inicial: `frontend/src/main.tsx` usa `StrictMode`, que en desarrollo monta, limpia y vuelve a ejecutar los efectos; si el valor `true` viniera solo de `useRef(true)`, la limpieza de StrictMode lo dejaría en `false` para siempre y ningún guardado se aplicaría.
- Se usa `useRef` (y no la variable local `let vigente` del efecto de `useMesasDisponibles`) porque acá la solicitud no nace en un efecto sino en un manejador de eventos; la idea, el nombre y el momento en que se apaga (al desmontar) son los mismos. No hay dependencia de la implementación de `useMesasDisponibles`: solo se repite el patrón.
- La solicitud **no se cancela** (spec: «la solicitud sigue en curso»): `clienteHttp` no acepta una señal y agregarla toca `shared/` (Decisión 18).
- Leer `vigente.current` dentro de `enviar` (un manejador, no el render) no infringe las reglas de `eslint-plugin-react-hooks` 7 sobre referencias.

**Qué archivo cambia:** `components/useFormularioReserva.ts`, función `enviar` y una referencia con su efecto (≈ 10 a 15 líneas). No es un cambio del contenedor: es una corrección de comportamiento del hook, que vale igual si algún día se volviera al panel.

**Alternativas descartadas:**
- `AbortController`: `clienteHttp` no recibe la señal (tocar `shared/`), y la spec pide no cancelar.
- Comparar un identificador de solicitud guardado en la página (contador de modales): lleva el problema a la página y agrega estado; la desmontada del formulario ya marca el fin de su modal gracias a la `key` (Decisión 22).
- Hacer que la página ignore `onGuardado` si el modal ya no es el mismo: no evita el aviso de éxito, que lo muestra el hook.
- Deshabilitar «Cancelar», la X y Escape mientras se guarda: contradice la spec, que permite cerrar en ese momento.

**Justificación:** S38 pide «el mismo mecanismo que ya usa S35 [...] una bandera que se apaga al desmontar». El cambio es chico, reutiliza un patrón del propio módulo y vuelve comprobables los tres escenarios de respuesta tardía. Desde React 18 un `setState` sobre un componente desmontado no avisa nada, así que el problema no se ve en la consola: solo una prueba lo muestra.

### Decisión 24: tamaño del modal `size="md"`

**Elección:** `ReservaFormDialog` usa el tamaño por defecto del `Dialog`, `md` (`max-w-lg`, `dialog.tsx:19-23`); no se pasa la prop `size`. Fecha y Hora siguen en una fila de dos columnas (`grid grid-cols-2 gap-3`), como hoy.

**Alternativas descartadas:** `size="lg"` (`max-w-2xl`), que usa `ProductoFormDialog` para un formulario largo con desplazamiento interno; `size="sm"` (`max-w-sm`), donde Fecha y Hora en la misma fila quedarían apretadas.

**Justificación:** S37: el formulario tiene cinco campos, el mismo volumen que `MesaFormDialog` y `ClienteFormDialog`, que usan el tamaño por defecto. El panel actual mide `lg:w-96` (24 rem), menos que `max-w-lg` (32 rem), así que el contenido entra sin cambios de estilo.

## Flujo de datos

```text
POST /api/v1/reservas  (ReservaCrear)
  router.crear_reserva ──→ service.crear_reserva
                              ├─ puente.obtener_mesa ─────── 404 si None (lee todas las páginas de M3)
                              │                      └────── 409 si FUERA_DE_SERVICIO
                              ├─ puente.existe_cliente ────── 404 si False (stub)
                              ├─ _validar_momento(ahora()) ── 422 si es pasado
                              ├─ repository.existe_reserva_activa ── 409 si hay otra ACTIVA
                              ├─ repository.agregar (flush)
                              └─ _confirmar: commit ── IntegrityError (índice parcial) → rollback → 409
  ←── 201 ReservaSalida (hora "HH:MM", estado "ACTIVA")

PUT /api/v1/reservas/{id}  (ReservaModificar: fecha, hora, cantidad_personas)
  service.modificar_reserva: _obtener (404) → _validar_activa (409) → _validar_momento (422)
    → existe_reserva_activa(excluir_id=id) (409)
    → asigna campos → _confirmar → 200 ReservaSalida

GET /api/v1/reservas?fecha=&estado=&limit=&offset=
  service.listar_reservas ──→ repository.listar_reservas (orden fecha, hora, id; aplicar + contar)
  ←── 200 Pagina[ReservaSalida]

GET /api/v1/reservas/mesas-disponibles?fecha=&hora=   (ConsultaMesasDisponibles; 422 de forma)
  router.listar_mesas_disponibles ──→ service.listar_mesas_disponibles
      ├─ _validar_momento(ahora()) ─────────────── 422 si es pasado (no consulta a M3)
      ├─ repository.ids_de_mesas_con_reserva_activa(fecha, hora) ── set de mesa_id
      ├─ puente.listar_mesas ──→ salon.service.listar_mesas(limit=100, offset=0, 100, …)
      │                            (una excepción de M3 sube sin capturar → 500)
      ├─ filtra: estado != FUERA_DE_SERVICIO y id no ocupado
      └─ ordena por sector.nombre, numero, id
  ←── 200 list[MesaDisponible] (puede ser vacía)

Frontend
  ReservasPage ── estado: fecha (hoyLocal), estado (ACTIVA), página, panel (cerrado | alta | edición)
     ├─ «Nueva reserva» ── disabled mientras panel es { edicion } (S36, Decisión 22)
     ├─ NavegadorFecha ── sumarDias ±1, «Hoy»
     ├─ useApi(listarReservas(fecha, estado, 50, offset)) ──→ ReservasTabla (Badge, acción Modificar)
     └─ panel ≠ cerrado ──→ ReservaFormDialog key={reserva?.id ?? 'alta'}   (Dialog size md, Decisión 21)
            │   onOpenChange = useCallback(abierto ⇒ si es false, panel = cerrado)
            │   X · Escape · fondo · «Cancelar» ──→ onOpenChange(false) ──→ desmonta el formulario
            └─ useFormularioReserva ── validarReserva ── crearReserva | modificarReserva
                   ├─ useMesasDisponibles(fecha, hora, alta && turnoValido)
                   │     └─ listarMesasDisponibles ── descarta respuestas viejas
                   ├─ alta: SelectorMesa (Select + FormField) ── mesaVigente
                   ├─ edición: Mesa de solo lectura, sin pedir la lista
                   └─ enviar: await guardar ── si vigente.current es false: no hace nada (S38, Decisión 23)
                                           └─ si sigue vigente: toast, onGuardado (cierra el modal y recarga)
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

- `revision = "d6f8a0c2e4b6"`, `down_revision = "a8c0e2b4d6f8"` (cantidad entregada de M4, head de `develop` al integrar), cabecera y constantes con el estilo de `b2d4f6a8c0e1_crea_mesas.py` (`ESTADO_RESERVA = sa.Enum("ACTIVA", "ATENDIDA", "CANCELADA_ANTICIPADA", "CANCELADA_POR_AUSENCIA", name="estadoreserva", native_enum=False)`, `CHECK_CANTIDAD`, `UNICO_ACTIVA`, `INDICE_FECHA`).
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
| `ConsultaMesasDisponibles` (delta) | `fecha: date`, `hora: time` | obligatorios; se recibe con `Query()`; la hora usa `_hora_en_minutos`, compartida con `_DatosDelTurno` (Decisión 13) |
| `SectorResumenMesa` (delta) | `id: int`, `nombre: str` | `from_attributes=True`; propio de `reservas` (no se importa `salon.schemas`) |
| `MesaDisponible` (delta) | `id: int`, `numero: int`, `capacidad: int`, `sector: SectorResumenMesa` | `from_attributes=True`; sin `estado` (S29) |

Los nombres JSON van en `snake_case`, como `sector_id` en `salon` (S14: `cantidad_personas`).

### Backend: puente (`reservas/puente.py`, reescrito por el delta)

| Elemento | Forma | Origen |
| --- | --- | --- |
| `SectorDeMesa` | `dataclass(frozen=True)`: `id`, `nombre` | Decisión 2 |
| `MesaReservable` | `dataclass(frozen=True)`: `id`, `numero`, `capacidad`, `sector: SectorDeMesa`, `estado: EstadoMesa` | Decisión 2 |
| `listar_mesas(db) -> list[MesaReservable]` | todas las mesas de M3, incluidas las `FUERA_DE_SERVICIO`, en el orden de M3 | Decisión 14 |
| `obtener_mesa(db, mesa_id) -> MesaReservable \| None` | la mesa con ese `id` dentro de la misma lectura, o `None` | Decisión 14 |
| `existe_cliente(db, cliente_id) -> bool` | stub: `cliente_id > 0` | sin cambios (S6, S20) |

Importaciones del puente: `app.modules.salon.service` (solo ese módulo de `salon`), `app.shared.models.enums.EstadoMesa` y `app.shared.paginacion` (`LIMIT_MAXIMO`, `ParametrosPaginacion`). El docstring del módulo se actualiza: ya no dice que toda mesa positiva existe.

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
def ids_de_mesas_con_reserva_activa(db: Session, fecha: date, hora: time) -> set[int]  # delta, Decisión 15
```

### Backend: service (`reservas/service.py`)

```python
def ahora() -> datetime
def crear_reserva(db: Session, datos: ReservaCrear) -> ReservaSalida
def obtener_reserva(db: Session, reserva_id: int) -> ReservaSalida
def modificar_reserva(db: Session, reserva_id: int, datos: ReservaModificar) -> ReservaSalida
def listar_reservas(db: Session, filtro: FiltroReservas) -> Pagina[ReservaSalida]
def listar_mesas_disponibles(db: Session, fecha: date, hora: time) -> list[MesaDisponible]  # delta
```

Funciones privadas (cada una de pocas líneas, para cumplir el límite de 50 líneas y complejidad 10 de RNF-MAN-05): `_validar_mesa` (con el delta, también rechaza `FUERA_DE_SERVICIO`, Decisión 16), `_validar_cliente`, `_validar_momento(fecha, hora)`, `_validar_turno_libre(db, mesa_id, fecha, hora, excluir_id)`, `_obtener(db, reserva_id)`, `_validar_activa(reserva)`, `_confirmar(db, reserva)`. Como en `productos.service.modificar_seccion` (`backend/app/modules/productos/service.py:119-144`), la reserva se modifica recién después de validar todo.

### Backend: router (`reservas/router.py`) y registro

| Método y ruta | Función del router | Respuesta |
| --- | --- | --- |
| `POST /reservas` | `crear_reserva(datos: ReservaCrear, db)` | `201 ReservaSalida` |
| `GET /reservas` | `listar_reservas(db, filtro: Annotated[FiltroReservas, Query()])` | `200 Pagina[ReservaSalida]` |
| `GET /reservas/mesas-disponibles` (delta; antes de `/{reserva_id}`) | `listar_mesas_disponibles(db, consulta: Annotated[ConsultaMesasDisponibles, Query()])` | `200 list[MesaDisponible]` |
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

// Delta del issue #61
// types.ts
export interface SectorResumenMesa {
  id: number;
  nombre: string;
}
export interface MesaDisponible {
  id: number;
  numero: number;
  capacidad: number;
  sector: SectorResumenMesa;
}

// api.ts
export function listarMesasDisponibles(
  fecha: string, hora: string,
): Promise<RespuestaApi<MesaDisponible[]>>; // GET /reservas/mesas-disponibles?fecha=&hora=
```

Los parámetros de consulta se arman con `URLSearchParams`. Los tipos de mesa son propios de `reservas`: no se importan del módulo `salon` del frontend (AGENTS.md §9.4). Ningún archivo fuera de `modules/reservas/` importa `types.ts` ni `api.ts` (verificado con búsqueda en `frontend/src`), así que la reescritura no rompe a otros módulos.

### Frontend: componentes y hooks

| Archivo | Responsabilidad |
| --- | --- |
| `pages/ReservasPage.tsx` | `PageHeader` con el botón «Nueva reserva»; estado de fecha (`hoyLocal()`), filtro de estado (`'ACTIVA'` por defecto, S8), página (`usePaginacion`, límite 50) y panel (`cerrado`, `alta` o `{ edicion: Reserva }`); primera versión con layout de dos columnas como la maqueta. Con el delta del modal: una columna, el modal montado solo si el panel no está cerrado, `onOpenChange` estable y «Nueva reserva» deshabilitado durante la edición (Decisión 22) |
| `components/NavegadorFecha.tsx` | Botones «Día anterior» y «Día siguiente» (`sumarDias`), `<Input type="date" aria-label="Día">` y botón «Hoy»; al cambiar el día vuelve a la página 1 |
| `components/ReservasTabla.tsx` | `DataTable` (`frontend/src/shared/components/ui/data-table.tsx`) con columnas Hora, Cliente, Personas, Mesa, Estado y Acciones; `Badge` con `estadosReserva.ts`; la acción «Modificar reserva» solo en filas `ACTIVA`; vacío, cargando y error con los estados de `DataTable` |
| `components/estadosReserva.ts` | Etiqueta y variante de cada estado (Decisión 12) |
| `components/ReservaFormulario.tsx` → `components/ReservaFormDialog.tsx` (delta del modal) | Primera versión: panel lateral (`Card`) con título «Nueva reserva» o «Modificar reserva», botón «Cerrar formulario», campos Cliente (número), Fecha, Hora, Cantidad de personas y Mesa (número), botones «Cancelar» y «Guardar reserva»; en edición, Cliente y Mesa se muestran deshabilitados. Con el delta del modal: modal sobre `Dialog` (`size` por defecto), mismo título y mismos campos, sin «Cerrar formulario» (lo reemplaza la X del `Dialog`) y con «Cancelar» y «Guardar reserva» en el `footer` (Decisiones 21 y 24) |
| `components/useFormularioReserva.ts` | Estado del formulario, validación local, llamada a `crearReserva` o `modificarReserva`, toast de éxito (`useToast`) y errores del servidor, siguiendo `useFormularioSeccion` (`frontend/src/modules/productos/components/useFormularioSeccion.ts:77-130`) |
| `components/validarReserva.ts` | `validarReserva(datos, modo, hoy, horaActual)`: cliente y mesa enteros positivos (solo alta), fecha obligatoria y no anterior a hoy, hora obligatoria y posterior a la actual si la fecha es hoy, personas entero positivo; `errorDelServidor(mensaje)` deja el mensaje del 404, 409 o 422 como error general (como `validarSeccion.ts:41-48`) |
| `fechas.ts` | Funciones de la Decisión 11 |
| `components/index.ts` | Reexporta `ReservasTabla`, `ReservaFormulario` (con el delta del modal, `ReservaFormDialog`) y `NavegadorFecha` |
| `components/useMesasDisponibles.ts` (delta) | Pide la lista solo con un turno válido, deriva `inactivo`, `cargando`, `listo` o `error` y descarta respuestas viejas (Decisión 18) |
| `components/SelectorMesa.tsx` (delta) | Campo «Mesa» del alta sobre `FormField` y `Select`, con los textos de la Decisión 19 |

Cambios del delta en archivos existentes: `useFormularioReserva` usa `useMesasDisponibles`, calcula `mesaVigente`, borra la mesa que ya no está y expone `guardarDeshabilitado`; `validarReserva` agrega `turnoValido` y en el alta solo exige que Mesa no esté vacía; `ReservaFormulario` muestra `SelectorMesa` en el alta y el campo de solo lectura en la edición, y usa `guardarDeshabilitado` en «Guardar reserva» (Decisión 19).

La validación local recibe `hoy` y `horaActual` como parámetros (el hook los toma de `fechas.ts`), así la función es pura y se prueba sin reloj.

### Diferencias con la maqueta (se anotan en el PR)

| Maqueta | Implementación | Motivo |
| --- | --- | --- |
| Cliente con búsqueda por nombre o teléfono y alta de cliente nuevo | Campo numérico «Cliente (número)» | M4 no expone Cliente (S6, S13) |
| Columna «Teléfono» y nombre del cliente | Sin teléfono; «Cliente n.º 12» | Ídem |
| Mesa como `select` con sector y capacidad | Alta: selector «Sector · Mesa N (capacidad personas)» con las mesas disponibles para la fecha y la hora (delta, S13, S34). Edición: campo de solo lectura con el `mesa_id`. La tabla sigue mostrando «Mesa n.º {mesa_id}» con el `id` interno | La tabla no cambia en este cambio (S23); ver «Riesgos del delta y reversión» |
| La tabla muestra todos los estados del día | Selector de estado con `Activa` por defecto y opción «Todas» | S8 |
| Acción «Cancelar reserva» | No se muestra | HU-M5-04 y HU-M5-05 fuera de alcance |
| Panel abierto al entrar | Ningún modal abierto hasta elegir «Nueva reserva» o «Modificar reserva» | Evita un formulario vacío permanente; misma estética |
| Formulario al costado de la tabla (y alta y edición en una página aparte en otras pantallas de la maqueta) | Modal sobre la misma página con el `Dialog` compartido, `size` por defecto (delta del modal) | AGENTS.md §5 y S24: la regla del equipo gana sobre la maqueta (AGENTS.md §2); Decisiones 21 a 24 |

## Estrategia de pruebas (Strict TDD)

Cada prueba se escribe primero, se ve fallar (RED) y después se implementa (GREEN). Nombres `test_<función>_<caso>` (AGENTS.md §9.5). Las pruebas del backend usan las fixtures `db` y `cliente` de `backend/tests/conftest.py` (base temporal migrada hasta `head`, D-14). Un `backend/tests/modules/reservas/conftest.py` agrega:

- `reloj` (autouse): `monkeypatch.setattr(service, "ahora", lambda: AHORA)` con `AHORA = datetime(2026, 11, 2, 12, 0)`.
- `fabrica_reserva(db)`: inserta una `Reserva` con valores por defecto (mesa 1, cliente 1, `2026-11-03`, `21:30`, 4 personas, `ACTIVA`) y permite cambiar cualquiera.
- `puente_sin_mesa`, `puente_sin_cliente`: fixtures que reemplazan `puente.obtener_mesa` o `puente.existe_cliente` con `monkeypatch`. Con el delta, `puente_sin_mesa` vacía el doble por defecto (Decisión 17).
- Delta: `puente_doble` (autouse, doble por defecto con las mesas 5 y 6), `puente_real` y `mesas_en_m3` (Decisión 17).

### Backend

| Capa | Archivo | Pruebas (una por escenario crítico) |
| --- | --- | --- |
| Puente | `test_puente.py` | `test_obtener_mesa_stub_devuelve_la_mesa_con_su_id` (se elimina con el delta, ver «Backend: pruebas del delta»), `test_existe_cliente_stub_acepta_id_positivo` |
| Schemas | `test_schemas.py` | `test_reserva_crear_acepta_datos_validos`, `test_reserva_crear_rechaza_cantidad_no_positiva` (parametrizada 0 y -1), `test_reserva_crear_rechaza_tipos_laxos` (`"4"`, `true`), `test_reserva_crear_rechaza_estado`, `test_reserva_crear_rechaza_hora_con_segundos`, `test_reserva_modificar_rechaza_mesa_o_cliente`, `test_reserva_salida_serializa_hora_en_minutos`, `test_filtro_reservas_rechaza_estado_desconocido` |
| Service, HU-M5-01 | `test_service.py` | `test_crear_reserva_queda_activa`, `test_crear_reserva_rechaza_fecha_pasada`, `test_crear_reserva_rechaza_hora_pasada_de_hoy`, `test_crear_reserva_acepta_hoy_con_hora_futura` (límite), `test_crear_reserva_rechaza_mesa_inexistente`, `test_crear_reserva_rechaza_cliente_inexistente`, `test_crear_reserva_acepta_una_cantidad_muy_grande_de_personas` (límite: 100 personas, sin control contra la capacidad; S5), `test_crear_reserva_rechaza_turno_ocupado`, `test_crear_reserva_permite_turno_de_reserva_cancelada`, `test_crear_reserva_permite_misma_hora_en_otra_mesa` |
| Service, R13 | `test_service.py` | `test_crear_reserva_traduce_conflicto_del_indice_en_409`: se reemplaza `repository.existe_reserva_activa` por una función que devuelve `False` (simula dos altas simultáneas) y el `commit` choca con el índice parcial; se espera `ReglaDeNegocioError` y la sesión queda usable (`rollback`) |
| Service, HU-M5-03 | `test_service.py` | `test_listar_reservas_ordena_por_fecha_hora_e_id`, `test_listar_reservas_filtra_por_fecha`, `test_listar_reservas_filtra_por_estado`, `test_listar_reservas_pagina_y_cuenta_total`, `test_listar_reservas_sin_resultados_devuelve_pagina_vacia` |
| Service, HU-M5-02 | `test_service.py` | `test_obtener_reserva_inexistente`, `test_modificar_reserva_cambia_fecha_hora_y_personas`, `test_modificar_reserva_conserva_mesa_y_cliente`, `test_modificar_reserva_no_choca_consigo_misma`, `test_modificar_reserva_rechaza_turno_de_otra_reserva`, `test_modificar_reserva_rechaza_reserva_no_activa`, `test_modificar_reserva_rechaza_fecha_pasada`, `test_modificar_reserva_acepta_una_cantidad_muy_grande_de_personas` (límite: 100 personas; S5), `test_modificar_reserva_inexistente` |
| Router | `test_router.py` | `test_post_reservas_crea_y_devuelve_201`, `test_post_reservas_turno_ocupado_devuelve_409_con_detalle`, `test_post_reservas_fecha_pasada_devuelve_422`, `test_post_reservas_mesa_inexistente_devuelve_404`, `test_post_reservas_datos_invalidos_devuelve_422`, `test_post_reservas_cantidad_muy_grande_devuelve_201` (S5), `test_get_reservas_pagina_y_filtra`, `test_get_reservas_limit_fuera_de_rango_devuelve_422`, `test_get_reserva_por_id_devuelve_200`, `test_get_reserva_inexistente_devuelve_404`, `test_put_reserva_modifica_y_devuelve_200`, `test_put_reserva_cantidad_muy_grande_devuelve_200` (S5), `test_put_reserva_no_activa_devuelve_409` |
| Migración | `test_migracion.py` | `test_upgrade_head_crea_reservas_con_una_sola_cabeza`, `test_upgrade_define_columnas_no_nulas_check_e_indices`, `test_upgrade_impone_el_check_de_cantidad_personas`, `test_upgrade_impide_dos_reservas_activas_en_el_mismo_turno` (R13 a nivel de base), `test_upgrade_permite_turno_repetido_si_una_no_esta_activa`, `test_downgrade_a_la_revision_anterior_elimina_reservas_y_conserva_mesas` (`command.downgrade(config, "a8c0e2b4d6f8")`), `test_downgrade_y_upgrade_de_nuevo_recrean_reservas` |

Las pruebas de migración siguen el estilo de `backend/tests/modules/salon/test_migracion.py` (base propia en `tmp_path`, `get_settings.cache_clear()`, inserciones con `text()`). El índice parcial se prueba por comportamiento (inserción repetida → `IntegrityError`), no por reflexión, porque la reflexión de `sqlite_where` depende de la versión de SQLAlchemy.

### Backend: pruebas del delta (issue #61)

| Capa | Archivo | Pruebas nuevas |
| --- | --- | --- |
| Puente real | `test_puente.py` (con `puente_real` y `mesas_en_m3`) | `test_listar_mesas_lee_todas_las_paginas_de_m3` (120 mesas en un sector, números 1 a 120: devuelve 120, la última es la 120); `test_obtener_mesa_encuentra_la_mesa_de_la_segunda_pagina` (la 120); `test_obtener_mesa_inexistente_devuelve_none` (999); `test_listar_mesas_incluye_fuera_de_servicio_con_su_estado`; `test_obtener_mesa_y_listar_mesas_coinciden` (mismo `MesaReservable` para cada id); `test_listar_mesas_propaga_el_error_de_m3_en_la_segunda_pagina` (`pytest.raises`); `test_existe_cliente_stub_*` (se conservan); `test_solo_el_puente_importa_salon` (Decisión 17) |
| Schemas | `test_schemas.py` | `test_consulta_mesas_disponibles_exige_fecha_y_hora`, `test_consulta_mesas_disponibles_rechaza_hora_con_segundos`, `test_mesa_disponible_no_expone_el_estado` |
| Service, disponibles | `test_service.py` | una por escenario del requisito «Mesas disponibles»: mesa libre (forma exacta del elemento), fuera de servicio excluida, reserva activa en el turno excluye, otra hora u otra fecha no excluye, reservas no activas no excluyen (parametrizada), `OCUPADA` incluida, fecha pasada y hora pasada o igual (422, y el puente no se llama: el doble falla si se lo llama), turnos válidos parecidos, todas reservadas (vacía), ninguna reservable (vacía, dos casos), orden por sector, número e id con el doble 12, 15, 14, mismo número en sectores distintos, reservar saca la mesa de la lista, la consulta no modifica datos |
| Service, alta | `test_service.py` | `test_crear_reserva_rechaza_mesa_fuera_de_servicio` (409 y nada guardado), `test_crear_reserva_acepta_mesa_ocupada`, `test_crear_reserva_rechaza_mesa_que_m3_no_conoce` (123 → 404), `test_modificar_reserva_con_mesa_fuera_de_servicio_se_modifica` (S27) |
| Router | `test_router.py` | `test_get_mesas_disponibles_devuelve_200_con_la_lista`; `test_get_mesas_disponibles_no_se_confunde_con_la_consulta_por_id` (200, y `GET /reservas/abc` sigue en 422 y `GET /reservas/{id}` en 200); `test_get_mesas_disponibles_sin_fecha_o_sin_hora_devuelve_422_nombrando_el_campo` y formatos inválidos (parametrizadas); `test_get_mesas_disponibles_turno_pasado_devuelve_422`; `test_post_reservas_mesa_fuera_de_servicio_devuelve_409_con_detalle`; con el puente real: `test_puente_real_mesas_disponibles_y_alta_con_120_mesas` (lista de 120 y alta sobre la 120 → 201), `test_puente_real_fuera_de_servicio_no_figura_y_el_alta_responde_409`, `test_puente_real_mesa_inexistente_devuelve_404`, `test_puente_real_falla_de_m3_en_la_segunda_pagina_devuelve_500_sin_guardar` |

**Simulación de la falla de M3 en la segunda página:** la prueba pide `puente_real` y `mesas_en_m3(120)`, guarda la función original y aplica `monkeypatch.setattr(salon_service, "listar_mesas", envoltura)`, donde `envoltura(db, parametros)` lanza `RuntimeError("falla simulada de M3")` cuando `parametros.offset >= 100` y, si no, llama a la original. Funciona porque el puente llama a `salon_service.listar_mesas` a través del módulo (Decisión 14). A nivel de API hace falta un `TestClient(app, raise_server_exceptions=False)` creado dentro de la prueba (después de pedir la fixture `cliente`, que ya instaló la sesión de prueba en `dependency_overrides`); con el `TestClient` por defecto la excepción llega a la prueba en lugar de convertirse en 500. Se comprueba el 500, que el cuerpo no es una lista y que la tabla `reservas` sigue vacía después del `POST`.

**Orden de rutas:** la prueba de la ruta pide `GET /reservas/mesas-disponibles?fecha=2026-11-03&hora=21:30` y espera 200 con una lista; con la ruta declarada después de `/{reserva_id}` respondería 422 (RED observable).

**Pruebas existentes que cambian por el delta.** El stub anterior daba por existente toda mesa positiva; con el puente real y sin mesas en la base de M3, cualquier alta respondería 404. El doble por defecto (autouse) evita reescribir casi todas las pruebas, porque usan las mesas 5 y 6. Cambian estas:

| Archivo | Prueba o fixture | Cambio |
| --- | --- | --- |
| `conftest.py` | (nuevas) `DoblePuente`, `puente_doble`, `puente_real`, `mesas_en_m3` | Decisión 17 |
| `conftest.py` | `puente_sin_mesa` | Vacía el doble en lugar de reemplazar solo `obtener_mesa` |
| `test_puente.py` | `test_obtener_mesa_stub_devuelve_la_mesa_con_su_id`, `test_obtener_mesa_stub_rechaza_id_no_positivo` | Se eliminan: el stub de mesa ya no existe; los reemplazan las pruebas del puente real |
| `test_puente.py` | docstring del módulo | Ya no dice «stub hasta que M3…» para la mesa |
| `test_service.py` | `test_crear_reserva_acepta_cualquier_id_positivo_con_el_stub` (mesa 123 → 201) | Se divide: la mesa 123 responde 404 (escenario «Una mesa que M3 no conoce…») y el cliente 456 con la mesa 5 responde 201 (escenario «El stub de cliente…») |
| `test_service.py` | `test_crear_reserva_conflicto_no_depende_del_puente` | Compara con la mesa 5 del doble en lugar de `MesaReservable(id=5)` |
| `test_service.py` | `test_crear_reserva_orden_de_validacion` | `MesaReservable(mesa_id)` posicional ya no construye; usa `puente_doble.poner(...)`, y agrega el paso «fuera de servicio» entre la mesa inexistente y el cliente |
| `test_service.py` | `test_modificar_reserva_no_consulta_mesa_ni_cliente` | Sigue válida; se refuerza con un doble cuyos métodos fallan si se los llama |
| `test_router.py` | pruebas de `POST /reservas` con la mesa 5 | Sin cambio de código: pasan gracias al doble por defecto |
| `test_models.py`, `test_migracion.py`, `backend/tests/modules/salon/test_migracion.py` | — | Sin cambios |

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

Pruebas del delta en el frontend:

| Archivo de prueba | Casos |
| --- | --- |
| `api.test.ts` | `listarMesasDisponibles` pide `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30` |
| `components/useMesasDisponibles.test.ts` (nuevo, `renderHook`) | sin turno válido no pide y queda `inactivo`; con turno válido pasa por `cargando` y llega a `listo`; lista vacía; error con el mensaje de la API; cambiar la hora vuelve a pedir; **respuesta vieja**: dos promesas controladas a mano, se resuelve primero la del turno nuevo y después la del viejo, y el estado queda con la lista del turno nuevo |
| `components/SelectorMesa.test.tsx` (nuevo) | texto «Salón · Mesa 5 (4 personas)» con valor 5; mismo número en dos sectores sin opciones repetidas; `cargando` deshabilitado con «Cargando mesas…» como única opción; vacía con «No hay mesas disponibles para esa fecha y hora»; `inactivo` deshabilitado y sin opciones; `error` muestra el mensaje junto al campo |
| `components/validarReserva.test.ts` | `turnoValido` (fecha vacía, anterior a hoy, hoy con hora pasada o igual, hoy con hora posterior, otro día) |
| `components/ReservaFormulario.test.tsx` | el alta pide la lista con Fecha y Hora válidas y no antes; elegir una mesa y guardar envía su `id` como `mesa_id`; mesa sin elegir marca obligatoria; lista vacía deshabilita «Guardar reserva»; mientras carga, guardar no envía y marca Mesa; cambiar la hora borra la mesa que ya no está y conserva la que sigue; 409 «La mesa 6 está fuera de servicio» se muestra como error general y conserva la mesa; la edición no llama a `listarMesasDisponibles` |

Pruebas existentes del frontend que cambian: `validarReserva.test.ts` («rechaza Cliente 0 y Mesa -1»: el caso de Mesa sale, Cliente se conserva; el caso de campos vacíos sigue esperando «La mesa es obligatoria.»); `ReservaFormulario.test.tsx` (`completar` escribe la mesa en un `Input`: pasa a elegir una opción del selector después de que la lista simulada carga; «con Cliente 0 y Mesa -1…» pierde la parte de Mesa; los casos que envían deben simular `listarMesasDisponibles` con la mesa 5; la edición sigue esperando Mesa deshabilitada con valor 5); `ReservasPage.test.tsx` (con `vi.mock('../api')` la función nueva devuelve `undefined` y el `.then` del hook fallaría: `beforeEach` agrega `vi.mocked(listarMesasDisponibles).mockResolvedValue(...)`, y la prueba de alta elige la mesa en el selector en lugar de escribir «5»). `ReservasTabla.test.tsx`, `NavegadorFecha.test.tsx` y `fechas.test.ts` no cambian.

#### Pruebas del delta del modal (Strict TDD)

Las respuestas tardías se simulan con una promesa controlada a mano: `vi.mocked(crearReserva).mockReturnValue(promesa)` (o `modificarReserva`), donde `promesa` se resuelve recién después de cerrar el modal, el mismo recurso que ya usa la prueba de «respuesta vieja» de `useMesasDisponibles.test.ts`. El modal se busca con `getByRole('dialog', { name: 'Nueva reserva' })` o `{ name: 'Modificar reserva' }`, como `MenusPage.test.tsx:61` y `ProductosTab.test.tsx:245`; la X, con `getByRole('button', { name: 'Cerrar modal' })`; Escape, con `user.keyboard('{Escape}')`; el fondo, con un clic sobre el elemento con `aria-hidden="true"` que es hermano anterior del `role="dialog"` (el `Dialog` no le pone un nombre accesible).

| Archivo de prueba | Casos |
| --- | --- |
| `components/ReservaFormDialog.test.tsx` (renombrado desde `ReservaFormulario.test.tsx`) | se ve como `dialog` con el título «Nueva reserva» o «Modificar reserva»; no hay botón «Cerrar formulario»; «Cancelar», la X, Escape y el fondo llaman a `onOpenChange(false)` sin enviar nada (parametrizada, alta y edición; reemplaza el `it.each(['Cancelar', 'Cerrar formulario'])` actual); Enter en un campo envía el formulario (el botón del pie usa `form`); **cerrar mientras se guarda**: con el `POST` pendiente se desmonta el componente (`unmount()`), se resuelve la promesa con éxito y con error, y no se llama a `onGuardado` ni se muestra el aviso; el mismo caso con un `PUT` pendiente |
| `pages/ReservasPage.test.tsx` | «Modal cerrado al entrar» (ningún `dialog`); «Nueva reserva» abre el `dialog` «Nueva reserva» sin cambiar de ruta; «Modificar reserva» abre el `dialog` «Modificar reserva» con los datos de la fila y sin `GET /reservas/{id}`; con la edición abierta «Nueva reserva» está deshabilitado y pulsarlo no abre otro modal ni cambia los datos; al cerrar la edición con «Cancelar» o al guardar, se habilita de nuevo; **PUT tardío**: se cierra la edición con el `PUT` pendiente, se abre «Nueva reserva», se escribe un dato, se resuelve el `PUT` y el alta sigue abierta con el dato, sin aviso y sin un nuevo `listarReservas`; **POST tardío**: lo mismo al revés (alta cerrada con el `POST` pendiente, se abre la edición de otra fila) |

Pruebas existentes que cambian por el delta del modal:

| Archivo | Prueba | Cambio |
| --- | --- | --- |
| `ReservaFormulario.test.tsx` → `ReservaFormDialog.test.tsx` | todas | Importan `ReservaFormDialog` y pasan `onOpenChange` en lugar de `onCerrar`; los `describe` dicen «modal» en lugar de «panel». Las que buscan el título con `getByRole('heading', ...)` siguen funcionando (el `Dialog` usa un `h2`), pero se prefiere `getByRole('dialog', { name })` |
| `ReservaFormulario.test.tsx` | `expect(... 'Cerrar formulario')` (línea 117) y los `it.each` de las líneas 124 y 488 | Pasan a «Cerrar modal», Escape y el fondo; se espera `onOpenChange(false)` |
| `ReservasPage.test.tsx` | «arranca con el panel cerrado y "Nueva reserva" lo abre...» (línea 121) | Sin cambios de lógica; nombre y búsqueda por `dialog` |
| `ReservasPage.test.tsx` | «"Modificar reserva" de otra fila con el panel abierto trae los datos de esa fila» (línea 276) | Se reemplaza: con el modal, la tabla queda detrás del fondo. Se prueba en su lugar cerrar la edición y abrir la de otra fila |
| `ReservasPage.test.tsx` | «"Nueva reserva" después de editar abre el panel vacío» (línea 291) | Contradice S36 tal como está (pulsa «Nueva reserva» con la edición abierta): pasa a cerrar la edición primero y después abrir el alta vacía; el caso de pulsarlo durante la edición lo cubre la prueba nueva del botón deshabilitado |
| `ReservasPage.test.tsx` | guardar en el alta y en la edición (líneas 219 y 313) | Esperan que desaparezca el `dialog` en lugar del encabezado del panel |

Cobertura esperada por encima de los umbrales (70 % backend, 60 % frontend), porque todas las ramas de error tienen prueba.

## Matriz de amenazas

N/A (también para el delta del modal, que solo cambia componentes del frontend, y para el delta del issue #61, que solo agrega una ruta HTTP de lectura y una llamada en proceso a `salon.service`): el cambio no agrega enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS o PR, clasificación de archivos ejecutables ni integración de procesos. Las consultas son parametrizadas por SQLAlchemy (D-07, RNF-SEG-05) y los errores no exponen trazas (D-26).

## Archivos a crear o modificar

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/models.py` | Modificar (hoy solo docstring) | `EstadoReserva` y `Reserva` |
| `backend/app/modules/reservas/schemas.py` | Modificar | `ReservaCrear`, `ReservaModificar`, `ReservaSalida`, `FiltroReservas` |
| `backend/app/modules/reservas/repository.py` | Modificar | `obtener`, `existe_reserva_activa`, `agregar`, `listar_reservas` |
| `backend/app/modules/reservas/puente.py` | Crear | Stub de Mesa y Cliente (`MesaReservable`, `obtener_mesa`, `existe_cliente`); el delta reescribe el lado Mesa (ver «Impacto del delta») |
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

### Impacto del delta (issue #61) por archivo

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/puente.py` | Modificar (reescritura del lado Mesa) | `SectorDeMesa`, `MesaReservable` completo, `_leer_todas`, `listar_mesas` y `obtener_mesa` reales; `existe_cliente` sigue igual |
| `backend/app/modules/reservas/schemas.py` | Modificar | `_hora_en_minutos` compartida, `ConsultaMesasDisponibles`, `SectorResumenMesa`, `MesaDisponible` |
| `backend/app/modules/reservas/repository.py` | Modificar | `ids_de_mesas_con_reserva_activa` |
| `backend/app/modules/reservas/service.py` | Modificar | `_validar_mesa` con `FUERA_DE_SERVICIO` (409), `listar_mesas_disponibles` |
| `backend/app/modules/reservas/router.py` | Modificar | `GET /reservas/mesas-disponibles` antes de `/{reserva_id}` |
| `backend/tests/modules/reservas/conftest.py` | Modificar | Doble por defecto, `puente_real`, `mesas_en_m3`, ajuste de `puente_sin_mesa` |
| `backend/tests/modules/reservas/test_puente.py` | Modificar (casi reescritura) | Puente real y prueba de importaciones |
| `backend/tests/modules/reservas/test_{schemas,service,router}.py` | Modificar | Pruebas nuevas y adaptación de tres pruebas existentes |
| `frontend/src/modules/reservas/types.ts` | Modificar | `SectorResumenMesa`, `MesaDisponible` |
| `frontend/src/modules/reservas/api.ts` | Modificar | `listarMesasDisponibles` |
| `frontend/src/modules/reservas/components/useMesasDisponibles.ts` | Crear | Hook de la Decisión 18 |
| `frontend/src/modules/reservas/components/SelectorMesa.tsx` | Crear | Selector de la Decisión 19 |
| `frontend/src/modules/reservas/components/useFormularioReserva.ts` | Modificar | Lista, `mesaVigente`, borrado de la mesa, `guardarDeshabilitado` |
| `frontend/src/modules/reservas/components/validarReserva.ts` | Modificar | `turnoValido`; Mesa del alta solo obligatoria |
| `frontend/src/modules/reservas/components/ReservaFormulario.tsx` | Modificar | `SelectorMesa` en el alta; botón con `guardarDeshabilitado` |
| `frontend/src/modules/reservas/components/index.ts` | Sin cambios | `SelectorMesa` se usa solo dentro del panel |
| `frontend/src/modules/reservas/{api.test.ts,components/*.test.ts(x),pages/ReservasPage.test.tsx}` | Crear y modificar | Pruebas del delta y adaptaciones |

El delta **no agrega ninguna migración** ni modifica `models.py`, `main.py`, `backend/alembic/`, `backend/pyproject.toml`, `compose.yaml`, `shared/` (backend y frontend), `frontend/src/App.tsx` ni ningún archivo de `salon/` o `atencion/`.

### Impacto del delta del modal (AGENTS.md §5) por archivo

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `frontend/src/modules/reservas/components/ReservaFormulario.tsx` → `ReservaFormDialog.tsx` | Renombrar y modificar (`git mv`) | `Card` → `Dialog` (`open` fijo, `onOpenChange`, `title`, `footer`); sin `CabeceraDelPanel`; `<form id>` con el botón del pie por `form`; prop `onCerrar` → `onOpenChange` (Decisiones 21 y 24) |
| `frontend/src/modules/reservas/components/useFormularioReserva.ts` | Modificar | Referencia `vigente` con su efecto y comprobación después del `await` en `enviar` (Decisión 23) |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` | Modificar | `PanelDeReserva` → `ModalDeReserva` con la misma `key`; sin el `div` lateral ni el layout de dos columnas; `onOpenChange` estable con `useCallback`; «Nueva reserva» con `disabled={typeof panel === 'object'}` (Decisión 22) |
| `frontend/src/modules/reservas/components/index.ts` | Modificar | Reexporta `ReservaFormDialog` |
| `frontend/src/modules/reservas/components/ReservaFormulario.test.tsx` → `ReservaFormDialog.test.tsx` | Renombrar y modificar | Cierre por las cuatro vías, ausencia de «Cerrar formulario», envío con Enter y cierre mientras se guarda |
| `frontend/src/modules/reservas/pages/ReservasPage.test.tsx` | Modificar | Botón deshabilitado y vuelto a habilitar, las dos respuestas tardías, búsquedas por `dialog` y las dos pruebas que contradicen S36 |
| `validarReserva.ts`, `SelectorMesa.tsx`, `useMesasDisponibles.ts`, `ReservasTabla.tsx`, `NavegadorFecha.tsx`, `api.ts`, `types.ts`, `fechas.ts` y sus pruebas | Sin cambios | La lógica de los campos, la lista de mesas y la tabla no cambia |

El delta del modal **no toca** el backend, `frontend/src/shared/` (el `Dialog` se usa tal como está), `frontend/src/App.tsx`, otros módulos, rutas ni migraciones.

## Estimación de líneas (punto de control de 800 por lado, no bloqueo)

| Lado | Código | Pruebas | Total estimado | Frente al límite |
| --- | --- | --- | --- | --- |
| `backend/` | módulo ~300 (models 35, schemas 65, repository 45, puente 30, service 95, router 35), migración ~50, `main.py` 2, M3 4 (2 líneas cambiadas) → ~360 | conftest 40, puente 15, schemas 70, service 200, router 120, migración 90 → ~535 | **~850 a 900** | Puede superar 800 por las pruebas |
| `frontend/` | types 25, api 40, fechas 40, estados 15, validar 50, hook 80, formulario 110, tabla 70, navegador 45, página 85, index 5 → ~565 | ~480 | **~1000 a 1050** | Supera 800 |

La estimación es mayor que la de la propuesta (backend 650 a 800, frontend 750 a 950) porque el diseño agrega pruebas de R13, de migración y de los límites de fecha y de cantidad de personas. Es informativo: la HU va en un solo PR (AGENTS.md §4) y la nota del PR informa el total.

### Estimación del delta (issue #61), líneas agregadas más borradas

| Lado | Código | Pruebas | Delta estimado | Acumulado del PR frente a 800 |
| --- | --- | --- | --- | --- |
| `backend/` | puente 50 a 70, schemas 25 a 40, repository 10 a 15, service 25 a 40, router 8 a 12 → **~120 a 180** | conftest 50 a 80, puente 90 a 140, schemas 15 a 30, service 130 a 200, router 100 a 150 → **~385 a 600** | **~500 a 780** | Supera 800 con claridad (lo ya implementado se estimó en ~850 a 900) |
| `frontend/` | types 10, api 10 a 15, hook 35 a 55, selector 45 a 70, formulario y hook del formulario 30 a 50, validación 10 a 20 → **~140 a 220** | api 10 a 15, hook 80 a 130, selector 50 a 80, formulario 80 a 130, validación 15 a 25, página 15 a 30 → **~250 a 410** | **~390 a 630** | Supera 800 (lo ya implementado se estimó en ~1000 a 1050) |

Los rangos son amplios a propósito: dependen sobre todo de cuántos escenarios se parametrizan juntos. Es un punto de control informativo: la HU sigue en un solo PR, sin dividirla, sin minificar y sin recortar pruebas para entrar en el límite. La nota del PR informa el total real de cada lado.

### Estimación del delta del modal, líneas agregadas más borradas

Una sola unidad de trabajo del frontend (renombrar y reestructurar un componente, cablear un `disabled` y un callback estable, agregar la guarda a un hook y adaptar sus pruebas):

| Parte | Líneas ≈ |
| --- | --- |
| `ReservaFormDialog.tsx` (cambio de contenedor, pie, `form`, sin `CabeceraDelPanel`) | 35 a 55 |
| `ReservasPage.tsx` (modal, `useCallback`, `disabled`, layout de una columna) | 20 a 35 |
| `useFormularioReserva.ts` (guarda `vigente`) | 10 a 15 |
| `components/index.ts` | 2 |
| **Código** | **~65 a 105** |
| `ReservaFormDialog.test.tsx` (adaptaciones y casos nuevos) | 60 a 110 |
| `ReservasPage.test.tsx` (botón, respuestas tardías, pruebas que contradicen S36) | 80 a 140 |
| **Pruebas** | **~140 a 250** |
| **Total del delta** | **~205 a 355** |

Queda por debajo de la heurística orientativa de ≈ 400 líneas por tarea, así que es una sola unidad (un commit). El acumulado del frontend que estima `tasks.md` (≈ 1.390 a 1.680) pasa a ≈ 1.595 a 2.035; sigue siendo informativo y la HU no se divide. **Supuesto de medición:** la cifra cuenta los dos renombrados como archivos modificados, que es lo que hace `git diff --shortstat` con la detección de renombrados por defecto mientras la similitud quede por encima del 50 %; si un archivo se reescribiera casi entero, `git` lo contaría como borrado más agregado y la cifra subiría (la prueba del formulario tiene más de 500 líneas). Para evitarlo, el renombrado y los cambios van en el mismo commit con `git mv`, sin reformatear lo que no cambia.

## Orden de implementación sugerido

1. **HU-M5-01 (crear), backend:** prueba de migración (RED) → migración y `models` → ajuste de las 2 líneas de M3 → `schemas` → `puente` → `repository` (`agregar`, `existe_reserva_activa`) → `service.crear_reserva` con `ahora()` → `router` `POST` y registro en `main.py`.
2. **HU-M5-01, frontend:** `types.ts`, `api.ts` (`crearReserva`), `fechas.ts`, `validarReserva`, `useFormularioReserva` y `ReservaFormulario` en modo alta.
3. **HU-M5-03 (listar), backend:** `repository.listar_reservas`, `FiltroReservas`, `service.listar_reservas`, `GET /reservas`.
4. **HU-M5-03, frontend:** `listarReservas`, `estadosReserva`, `ReservasTabla`, `NavegadorFecha` y `ReservasPage` con el panel de alta.
5. **HU-M5-02 (modificar), backend:** `repository.obtener`, `service.obtener_reserva` y `modificar_reserva` (con `excluir_id`), `GET` y `PUT /reservas/{id}`.
6. **HU-M5-02, frontend:** `modificarReserva`, modo edición del formulario y acción «Modificar reserva» en la tabla.
7. **Cierre:** `ruff`, `lint-imports`, `pytest`, `npm run lint`, `format:check`, `typecheck`, `test:coverage`, `build`; `alembic heads` con una sola cabeza.

Orden sugerido para el delta (Strict TDD, cada paso con su prueba en RED primero):

8. **Backend, pruebas existentes:** `DoblePuente` y `puente_doble` autouse en `conftest.py`; adaptar las tres pruebas de `test_service.py` y `puente_sin_mesa` (todo en verde con el stub actual, salvo la mesa 123, que queda en RED hasta el paso 9).
9. **Backend, puente real:** `mesas_en_m3`, `puente_real` y las pruebas de `test_puente.py` → `MesaReservable` completo, `_leer_todas`, `listar_mesas`, `obtener_mesa`; prueba de importaciones.
10. **Backend, alta:** `test_crear_reserva_rechaza_mesa_fuera_de_servicio` y el orden de validación → `_validar_mesa` con 409.
11. **Backend, mesas disponibles:** `ids_de_mesas_con_reserva_activa`, `ConsultaMesasDisponibles` y `MesaDisponible`, `listar_mesas_disponibles`, ruta y prueba de orden de rutas; pruebas del puente real a nivel API (120 mesas y falla en la segunda página).
12. **Frontend:** `types.ts` y `listarMesasDisponibles`; `turnoValido`; `useMesasDisponibles`; `SelectorMesa`; `useFormularioReserva` y `ReservaFormulario`; adaptación de las pruebas existentes.
13. **Cierre del delta:** los mismos controles del paso 7.

Orden sugerido para el delta del modal (Strict TDD, una sola unidad de trabajo del frontend):

14. **Guarda de guardado vigente:** en `ReservaFormulario.test.tsx`, la prueba «cerrar mientras se guarda» (desmontar con el `POST` y el `PUT` pendientes) en RED → referencia `vigente` y comprobación en `enviar` (Decisión 23). Se hace primero porque es independiente del contenedor y deja verde el resto.
15. **Contenedor:** `git mv` de `ReservaFormulario.tsx` y de su prueba a `ReservaFormDialog`; pruebas del `dialog` con su título, de las cuatro vías de cierre y del envío con Enter en RED → `Dialog`, `footer` y `form` (Decisiones 21 y 24); `index.ts`.
16. **Página:** pruebas de «Nueva reserva» deshabilitado y vuelto a habilitar y de las dos respuestas tardías en RED, más la adaptación de las pruebas de las líneas 276 y 291 → `ModalDeReserva`, `useCallback` y `disabled` (Decisión 22).
17. **Cierre:** `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` desde `frontend/`.

## Migración y puesta en marcha

- Migración nueva `d6f8a0c2e4b6` sobre `a8c0e2b4d6f8`; reversión con `alembic downgrade a8c0e2b4d6f8` (borra la tabla y sus datos), como describe el plan de reversión de la propuesta.
- **El delta del issue #61 no agrega ninguna migración ni cambia el esquema:** la consulta de mesas disponibles usa las columnas y el índice `ix_reservas_fecha_hora` que ya existen, y las mesas se leen de M3 por su `service`.
- Sin banderas de funcionalidad: el endpoint y la pantalla quedan activos al integrar.
- **El delta del modal no agrega migraciones ni toca el backend:** solo cambia componentes del frontend de `reservas`.

## Riesgos del delta y reversión

| Riesgo | Efecto | Mitigación |
| --- | --- | --- |
| Reloj del servidor en UTC (Docker sin `TZ`) frente al restaurante en UTC-3 (resuelto en la Fase 11, Decisión 20) | Antes de la corrección, entre las 21:00 y las 24:00 locales el servidor rechazaba «hoy» y, durante todo el día, las reservas de hoy para las próximas 3 horas | `ahora()` calcula la hora con una zona fija UTC-3, sin depender de `TZ`; se pide al equipo `TZ` en `compose.yaml` solo como mejora complementaria. Si el navegador está en otra zona, el selector muestra el 422 de la API junto a Mesa |
| La tabla sigue mostrando «Mesa n.º {id interno}» (S23) | El `id` puede no coincidir con el `numero` que la persona eligió en el selector | Limitación aprobada para un cambio posterior; el PR la anota en «Diferencias con la maqueta» y como seguimiento («mostrar sector y número de la mesa en el listado») |
| M3 cambia el contrato de `listar_mesas` (nombre, parámetros, orden o campos de `MesaSalida`) | El puente deja de funcionar | Las pruebas del puente real usan el `service` verdadero de M3 y fallan en la CI ante ese cambio; se avisa a Giuliano en el PR que `reservas` consume `listar_mesas` |
| Lectura de todas las páginas en cada alta y consulta | Costo lineal en la cantidad de mesas | Aceptable para decenas de mesas (S33); seguimiento: pedir a M3 un `obtener_mesa` o un filtro por estado |
| Falla de M3 durante la lectura | 500 sin lista parcial ni alta guardada; el cuerpo es el texto plano de Starlette, no `{"detalle"}` | Comportamiento exigido por la spec; un manejador genérico de 500 queda fuera del delta (tocaría `main.py`) |
| 409 frente a 422 para la mesa fuera de servicio y la inclusión de `OCUPADA` | Otro integrante podría esperar otra respuesta | Decisiones de la persona responsable, ya aprobadas (S30, S31); se mencionan en el PR |

**Reversión del delta:** el delta no toca el esquema, así que no hace falta ningún `alembic downgrade`. Antes de integrar, se revierten sus commits en la rama (`git revert` de cada uno), con lo que vuelven el stub de mesa, el campo numérico y las pruebas anteriores. Ya integrado, el plan de reversión de la propuesta no cambia: revertir el merge deshace también el delta. Verificación: `pytest`, `lint-imports` y las pruebas del frontend en verde.

### Riesgos del delta del modal y reversión

| Riesgo | Efecto | Mitigación |
| --- | --- | --- |
| La guarda de la Decisión 23 cambia el comportamiento del hook, no solo el contenedor | Una respuesta de guardado que llega con el modal ya cerrado deja de mostrar el aviso y de recargar la tabla | Es lo que piden S38 y sus tres escenarios, que surgieron de la revisión nativa del delta de la spec: es una corrección, no un agregado de alcance. Reutiliza el patrón `vigente` del módulo, así que el código agregado es de unas 10 a 15 líneas. La tabla se actualiza igual al volver a abrir la pantalla o al cambiar de día; el registro sí queda guardado en el servidor |
| `StrictMode` monta, limpia y vuelve a ejecutar los efectos en desarrollo | Si `vigente` solo se inicializara en `true`, ningún guardado se aplicaría en desarrollo | `vigente.current = true` se pone dentro del efecto (Decisión 23); las pruebas cubren el guardado normal y el tardío |
| `onOpenChange` inestable | El `Dialog` vuelve a ejecutar su efecto en cada render de la página y saca el foco del campo donde se escribe | `useCallback` con dependencias vacías (Decisión 22) |
| Pruebas en jsdom pueden pulsar elementos que en el navegador quedan detrás del fondo del modal | Una prueba podría «abrir» la edición de otra fila con el modal abierto | La `key` y la guarda mantienen la coherencia aun en ese caso; las pruebas que lo hacían hoy se adaptan (ver «Pruebas del delta del modal») |
| Al guardar la edición, la tabla se vuelve a pedir y la fila que tenía el foco puede volver a dibujarse | El `Dialog` devuelve el foco a un botón que ya no está y el foco pasa al `body` | Mismo comportamiento que los demás `*FormDialog` del proyecto; no se corrige en este delta (tocaría `shared/`) |

**Reversión del delta del modal:** no hay esquema ni backend involucrados, así que no hace falta ningún `alembic downgrade`. Antes de integrar, se revierte su commit (`git revert`), con lo que vuelven el panel lateral y el nombre `ReservaFormulario`. **Atención:** si se quisiera volver al panel conservando la corrección, hay que revertir solo el contenedor y la página y **mantener la guarda de `useFormularioReserva`**: es una corrección real (S38), válida también para el panel, y no un efecto secundario del modal. Ya integrado, el plan de reversión de la propuesta no cambia. Verificación: las pruebas del frontend en verde.

## Preguntas abiertas

- [ ] El equipo valida S1 a S14, en especial `ACTIVA` frente a `PENDIENTE` (S1) y la falta de horario de atención (S2). Ninguna bloquea el diseño: cada una cambia en un solo lugar (enum o una función del `service`).
- [x] `Supuesto:` el servidor corre en la hora local del restaurante (Decisión 3). En Docker no se cumplía; se resolvió el 2026-11-01 con una zona fija UTC-3 en `ahora()` (Decisión 20, Fase 11). Falta solo pedir al equipo `TZ` en `compose.yaml` como mejora complementaria.
- [ ] Mensajes exactos de 404, 409 y 422: los fija la spec.
- [ ] `Supuesto:` texto de la opción vacía del selector cuando hay mesas, «Seleccione una mesa» (la spec no lo fija). No bloquea.
- [ ] (Delta del modal, no bloquea) La spec no define qué pasa con la acción «Modificar reserva» de otra fila mientras hay un modal abierto: el diseño no agrega lógica porque el fondo del `Dialog` la tapa (Decisión 22). Si el equipo quiere deshabilitarla también, es un cambio de la spec.
- [ ] Seguimiento con M3 (no bloquea): ofrecer `obtener_mesa` por `id` o un filtro por estado en `salon.service`, para que el puente no lea todas las páginas.
