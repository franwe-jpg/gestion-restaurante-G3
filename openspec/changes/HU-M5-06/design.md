# Diseño: HU-M5-06 Crear una comanda a partir de una reserva

- **Entradas:** `proposal.md` de este cambio (revisada y corregida; alcance A y B, orden de verificaciones, supuestos S1 a S8, contradicciones C1 a C3) y la exploración (Engram `sdd/hu-m5-06/explore`). La spec (`specs/reservas-gestion/spec.md`) se escribe en paralelo: este diseño es consistente con la propuesta y la spec se reconcilia después (ver «Puntos a reconciliar con la spec»).
- **Código de base:** la rama `feature/HU-M5-06-comanda-desde-reserva`, creada desde `origin/develop`, que ya incluye HU-M5-01-02-03 (ABM y cliente) y HU-M5-04-05 (cancelaciones). Todo lo citado del código se leyó en ese estado.
- **Numeración:** las decisiones siguen desde la última de `HU-M5-04-05/design.md`, que es la **Decisión 38**. Este diseño usa las **Decisiones 50 a 61**. `openspec/changes/HU-M5-07/design.md`, citado como referencia de estilo en el pedido de esta fase, **no existe** en la rama; si HU-M5-07 escribe su diseño después y también numera desde la 39, habrá que renumerar uno de los dos (ver «Preguntas abiertas»).
- **Referencias de arquitectura:** D-02 (capas), D-04 (contratos de importación), D-16 (`api.ts`), D-22 (versión en la ruta), D-24 (acción de negocio como `POST` sobre subrecurso), D-25 (códigos), D-26 (formato de error) de `SPRINT-0/S0-05-arquitectura.md`.

## Enfoque técnico

M5 orquesta y M4 expone una primitiva sin confirmación (Enfoque recomendado de la propuesta). El flujo completo vive en `reservas/`:

1. FastAPI valida el cuerpo con `ComandaDesdeReservaCrear`, que reutiliza el DTO compartido `DetalleComandaCrear` (paso 1, 422).
2. `service.crear_comanda` lee la reserva con una guarda nueva, `_obtener_atendible` (pasos 2 a 5: 404, 409, 409, 409), y exige al menos una línea de producto (paso 6, 422, S1).
3. `puente.crear_comanda_de_reserva` arma el `ComandaCrear` con la mesa y el `id` de la reserva y delega en `atencion_service.crear_comanda_sin_confirmar` (B2), que valida mesa, cotiza, inserta con `flush` y ocupa la mesa, sin confirmar (paso 7).
4. El `service` pasa la reserva a `ATENDIDA` y hace **un único `db.commit()`**. Ante cualquier error después del primer cambio, `db.rollback()` y la excepción sube; un `IntegrityError` del índice `ux_comandas_mesa_abierta` se traduce a un 409 legible.

No hay migración, `model`, consulta de `repository` ni cambio de `shared/` en el alcance (A). B1 a B3 se documentan como **interfaz asumida** de M4 y `shared/` (sección «Contrato asumido con M4»), y el puente es la única costura que los toca: mientras B no esté en `develop`, todas las pruebas de M5 reemplazan esa función con un doble.

En el frontend, una acción nueva por fila `ACTIVA` en `ReservasTabla` abre un modal propio de `reservas/` (`ComandaDesdeReservaDialog`) con la mesa en solo lectura y las líneas de producto; un hook (`useComandaDesdeReserva`) valida, llama a `api.ts`, muestra el aviso de éxito y pide la recarga del listado. Nada se importa de `atencion/` (AGENTS.md §9.4).

## Decisiones de arquitectura

### Decisión 50: guarda `_obtener_atendible` separada de `_obtener_cancelable`

**Elección:** en `backend/app/modules/reservas/service.py`, después de `cancelar_por_ausencia`:

```python
def _obtener_atendible(db: Session, reserva_id: int) -> Reserva:
    """Existe (404), no esta cancelada ni atendida y es de hoy (409), en ese orden (HU-M5-06)."""
    reserva = _obtener(db, reserva_id)
    if reserva.estado in _CANCELADAS:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} fue cancelada y no se puede atender")
    if reserva.estado == EstadoReserva.ATENDIDA:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} ya fue atendida")
    if reserva.fecha != ahora().date():
        raise ReglaDeNegocioError(f"La reserva {reserva_id} no corresponde al día de hoy")
    return reserva
```

- **Orden fijo:** existencia, cancelada (cualquiera de los dos estados de `_CANCELADAS`), atendida, fecha. Coincide con los pasos 2 a 5 de la propuesta y con el doble de S2-01. Se prueban dos cruces de orden: una reserva cancelada de otra fecha responde «fue cancelada», y una atendida de otra fecha responde «ya fue atendida».
- **Solo la fecha, no la hora:** la regla es «la reserva es del día de hoy» según `ahora()` (UTC-3, S28). Un cliente que llega antes o después de su hora reservada se puede atender igual. La propuesta no fija ninguna regla de hora; se registra para la spec (ver «Puntos a reconciliar»).
- **Reutiliza** `_obtener` (404 con su mensaje actual), `_CANCELADAS` y `ahora()` (parcheable en las pruebas con la fixture `reloj`).
- **Mensajes:** son propuestos por este diseño y los fija la spec. El de fecha es el texto de S5 de la propuesta.

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| Reutilizar `_obtener_cancelable` y agregar la fecha | Su mensaje para `ATENDIDA` es «ya fue atendida y no se puede cancelar», que no aplica a atender; cambiar su texto rompe pruebas y spec de HU-M5-04-05 |
| Parametrizar `_obtener_cancelable` con los mensajes | Toca una función ya probada de otra HU para ahorrar cuatro líneas, y mezcla dos guardas con reglas distintas (la de atender suma la fecha) |
| Reutilizar `_validar_activa` | Su mensaje es «no está activa y no se puede modificar» y no distingue cancelada de atendida, que CA2 necesita |

**Justificación:** D-02, D-25, S5 de la propuesta y el estilo de `_obtener_cancelable` (Decisión 32).

### Decisión 51: `service.crear_comanda` con un único `commit` y `rollback` ante cualquier error

**Elección:** en `backend/app/modules/reservas/service.py`:

```python
def _validar_al_menos_un_producto(detalles: list[DetalleComandaCrear]) -> None:
    """S1 (HU-M5-06): al menos una linea con `producto_id`; las de menu se aceptan junto a ella."""
    if all(detalle.producto_id is None for detalle in detalles):
        raise DatosInvalidosError("La comanda debe incluir al menos un producto")


def crear_comanda(
    db: Session, reserva_id: int, datos: ComandaDesdeReservaCrear
) -> ComandaSalida:
    """HU-M5-06: crea la comanda ABIERTA en la mesa de la reserva y la pasa a ATENDIDA.

    Un solo commit: la comanda, la mesa ocupada (M4/M3) y la reserva atendida, o nada.
    """
    reserva = _obtener_atendible(db, reserva_id)
    _validar_al_menos_un_producto(datos.detalles)
    mesa_id = reserva.mesa_id  # se lee antes: el rollback expira la entidad
    try:
        comanda = puente.crear_comanda_de_reserva(
            db, mesa_id, reserva.id, datos.detalles, datos.observaciones
        )
        reserva.estado = EstadoReserva.ATENDIDA
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _conflicto_al_atender(db, reserva_id, mesa_id) from error
    except Exception:
        db.rollback()
        raise
    return comanda
```

- **Nombre:** `crear_comanda`, del diagrama de clases (`Reserva.crearComanda(): Comanda`). Firma `(db, reserva_id, datos)` como pide la propuesta.
- **Lecturas fuera del `try`:** la guarda y la regla S1 no escriben nada, así que no necesitan `rollback` (mismo criterio que `cancelar_anticipada`). El `try` envuelve exactamente lo que escribe: la primitiva de M4 (que hace `flush` de la comanda y sus detalles y deja la mesa `OCUPADA` sin confirmar) y el cambio de estado.
- **Orden dentro del `try`:** primero M4 y después `ATENDIDA`. Si M4 falla, la reserva ni siquiera se modifica en memoria; el `rollback` deshace lo que M4 haya enviado con `flush`.
- **`except Exception` y `raise`:** cualquier error de negocio de M4 (`NoEncontradoError`, `ReglaDeNegocioError`, `ComandaAbiertaError`, `DatosInvalidosError`) sube tal cual y lo convierte el manejador global de `main.py` (D-26). Es el patrón de `atencion_service.crear_comanda` y de `registrar_cliente_para_reserva` del lado de quien llama.
- **Retorno:** la `ComandaSalida` que devuelve M4, armada antes del `commit` (tiene `id` y `fecha_hora` desde el `flush`). M5 no la reconstruye.
- **Tamaño:** `crear_comanda` queda en unas 20 líneas y complejidad 3 (RNF-MAN-05).

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| Dos `commit` (M4 confirma la comanda y M5 luego la reserva) | Rompe la atomicidad de CA1 (descartado en la propuesta) |
| Validar S1 antes de leer la reserva | Invierte el orden 2 a 6 fijado en la propuesta y en el doble de S2-01; una reserva cancelada con un pedido solo de menús respondería 422 en lugar de 409 |
| Validar S1 en el `schema` con un `model_validator` | Lo dejaría en el paso 1, antes de la reserva (mismo problema de orden); además la regla es de negocio de este flujo (C3), no de forma |
| Pasar la reserva a `ATENDIDA` antes de llamar a M4 | Igual de atómico, pero deja la entidad modificada en memoria durante la validación de M4 sin ninguna ventaja |

**Justificación:** CA1 y CA2, la propuesta («Orden de las verificaciones») y el patrón de transacción única de `crear_reserva` con cliente nuevo (S41).

### Decisión 52: traducción del `IntegrityError` de comanda abierta duplicada en M5

**Problema (riesgo de la propuesta):** hoy `atencion_service.crear_comanda` atrapa el `IntegrityError` de `ux_comandas_mesa_abierta` (texto `UNIQUE constraint failed: comandas.mesa_id`), hace `rollback`, relee y lanza `ComandaAbiertaError`. La primitiva de B2 no confirma ni revierte, así que no puede releer después del error: tras un `IntegrityError` en el `flush` la sesión queda inválida hasta un `rollback`, y ese `rollback` le corresponde a quien llama. El error llega crudo a M5.

**Elección:** M5 lo traduce en su propio `except IntegrityError`, después de su `rollback`:

```python
def _conflicto_al_atender(db: Session, reserva_id: int, mesa_id: int) -> ReglaDeNegocioError:
    """Explica un IntegrityError al atender, ya revertido (HU-M5-06).

    En esta transaccion la unica restriccion que puede fallar es el indice unico de comanda
    ABIERTA por mesa de M4. Si otra solicitud ya atendio la reserva (doble envio), se informa
    eso; si no, otra comanda tomo la mesa entre la validacion y el insert.
    """
    try:
        _obtener_atendible(db, reserva_id)
    except ReglaDeNegocioError as estado_actual:
        return estado_actual
    return ReglaDeNegocioError(f"La mesa {mesa_id} ya tiene una comanda abierta")
```

- **Por qué cualquier `IntegrityError` es este conflicto:** dentro de la transacción solo se escriben la comanda y sus detalles (cuyas restricciones `CHECK` ya garantiza `DetalleComandaCrear`: cantidad positiva y una sola referencia), la mesa (sin índice único) y la reserva (salir de `ACTIVA` saca la fila del índice parcial `ux_reservas_mesa_fecha_hora_activa`, así que no lo puede violar, Decisión 32). Una mesa inexistente la rechaza M3 con 404 antes del `insert`. Queda solo `ux_comandas_mesa_abierta`.
- **Releer la reserva da el mensaje exacto del doble envío:** si la carrera la ganó otra solicitud sobre **la misma reserva**, después del `rollback` la reserva figura `ATENDIDA` y la respuesta es el mismo 409 «ya fue atendida» que daría un segundo envío tardío. Si la reserva sigue atendible, la mesa la tomó otra comanda (por ejemplo, el alta general de M4) y se responde 409 con la mesa.
- **Mensaje con `mesa_id`:** el módulo ya nombra la mesa por su `id` («La mesa {mesa_id} no existe», `_validar_mesa`), y M5 no conoce el número de M3 sin otra lectura.
- **Diferencia aceptada con el camino sin carrera:** cuando la comanda abierta ya existía antes de validar, B2 lanza `ComandaAbiertaError` (409 con `comanda_id` y el texto actual de M4); en la carrera, M5 responde 409 sin `comanda_id`. El frontend solo muestra `detalle`, así que la diferencia no se ve en pantalla. Ver «Contradicciones y observaciones», punto 3, sobre el texto en inglés de `ComandaAbiertaError`.

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| Comparar `str(error.orig)` con `"UNIQUE constraint failed: comandas.mesa_id"` como M4 | Ata M5 al nombre de una tabla de M4 (va contra el espíritu de RNF-MAN-09) sin ganar precisión: es la única restricción posible en esta transacción |
| Pedir a M4 que la primitiva traduzca con un `SAVEPOINT` (`db.begin_nested()`) | Con `pysqlite` los `SAVEPOINT` necesitan los ajustes de eventos que `app/database.py` no tiene (solo configura `PRAGMA` y mide tiempos); cambiar `database.py` es `shared/` y afecta a todos los módulos |
| Pedir a M4 un traductor público (B4: `atencion_service.conflicto_de_mesa(...)`) | Agranda el contrato con M4, que ya es el riesgo principal del cambio, para un caso de carrera |
| Reconstruir `ComandaAbiertaError(comanda_id)` desde M5 con `atencion_service.listar_comandas` | Una lectura y un acoplamiento más (M5 construyendo excepciones de M4) para exponer un `comanda_id` que la pantalla no usa |
| Dejar subir el `IntegrityError` | Responde 500 con el manejador por defecto, contra D-25 y D-26 |

**Justificación:** riesgo 3 de la propuesta, D-25, D-26 y RNF-MAN-09.

### Decisión 53: el puente arma el `ComandaCrear` y es la única costura con B1 y B2

**Elección:** en `backend/app/modules/reservas/puente.py`:

```python
def crear_comanda_de_reserva(
    db: Session,
    mesa_id: int,
    reserva_id: int,
    detalles: list[DetalleComandaCrear],
    observaciones: str | None,
) -> ComandaSalida:
    """Crea en M4 la comanda de la reserva dentro de la sesion de M5; M4 no confirma (HU-M5-06).

    Usa `crear_comanda_sin_confirmar` (B2) con `reserva_id` en `ComandaCrear` (B1). Los
    errores de M4 suben tal cual; el commit o el rollback los hace `service.crear_comanda`.
    """
    datos = ComandaCrear(
        mesa_id=mesa_id, reserva_id=reserva_id, detalles=detalles, observaciones=observaciones
    )
    return atencion_service.crear_comanda_sin_confirmar(db, datos)
```

- **Argumentos sueltos, no un `ComandaCrear` armado en el `service`:** hasta que B1 esté en `develop`, `ComandaCrear` no tiene `reserva_id` y Pydantic, con su configuración por defecto, **ignora en silencio** un campo desconocido. Si el `service` armara el DTO, el vínculo con la reserva se perdería sin error y ninguna prueba con doble lo detectaría (el doble recibiría un `ComandaCrear` sin `reserva_id`, y leer `datos.reserva_id` daría `AttributeError`). Con argumentos sueltos, las pruebas del `service` comprueban con el doble que M5 envía `mesa_id` y `reserva_id` correctos, y la dependencia de B1 queda encerrada en tres líneas del puente, que cubre la prueba de integración.
- **Nombre:** `crear_comanda_de_reserva`, distinto de `service.crear_comanda` para que un `monkeypatch` o una búsqueda no los confunda.
- **Sin `rollback` ni `commit`:** mismo contrato que `registrar_cliente` (S41).
- **Importaciones nuevas en el puente:** `ComandaCrear`, `ComandaSalida` y `DetalleComandaCrear` de `app.shared.contratos.comanda` (permitido: es `shared/`). `atencion_service` ya está importado. `lint-imports` no cambia: el puente importa el **módulo** `app.modules.atencion.service`, no el atributo.
- **Antes de B2:** el atributo `crear_comanda_de_reserva` existe en el puente desde el primer commit (lo exige `monkeypatch.setattr`, que falla si el atributo no existe), pero su cuerpo llama a `atencion_service.crear_comanda_sin_confirmar`, que todavía no existe. Ni `ruff` ni `lint-imports` lo detectan (no hay verificador de tipos en el backend) y la falla sería un `AttributeError` **en la llamada**. Ninguna prueba la llama mientras `puente_doble` (autouse) la reemplace, y el PR no se abre hasta que B esté en `develop` (propuesta, «Cómo avanza M5»), así que esa ventana solo existe en la rama. Las tres líneas del cuerpo quedan sin cubrir hasta la fase bloqueada (impacto despreciable sobre el 70 %).
- **Si M4 elige otra forma** (por ejemplo, `crear_comanda(..., confirmar=False)` o recibir `reserva_id` aparte), cambia solo el cuerpo de esta función; el `service`, el doble y sus pruebas quedan iguales.

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| `service` arma `ComandaCrear` y el puente recibe el DTO (forma literal de B2) | Ver el primer punto: antes de B1 el vínculo se pierde en silencio y las pruebas con doble no lo ven |
| Importar `atencion.adaptadores` para pasar `MesasDeSalon()` y `CatalogoDeCarta()` a la `crear_comanda` actual | AGENTS.md §9.4: solo el `service` de otro módulo (por eso B3). `lint-imports` no lo prohíbe hoy (`adaptadores` no está en `forbidden_modules`), pero la regla del proyecto sí |
| `getattr(atencion_service, "crear_comanda_sin_confirmar", None)` con un error explícito si falta | Código defensivo que solo existe por una ventana de la rama y queda muerto después de B |
| Definir el puente recién cuando B entre | `monkeypatch.setattr` falla sobre un atributo inexistente y el `service` no se puede escribir con Strict TDD |

**Justificación:** D-04, RNF-MAN-09, AGENTS.md §9.3 y §9.4, y la propuesta («Cómo avanza M5 sin esperar a M4»).

### Decisión 54: contrato de la API

**Elección:**

- **Ruta:** `POST /api/v1/reservas/{reserva_id}/comanda`, en `backend/app/modules/reservas/router.py` al final del archivo:

```python
@router.post("/reservas/{reserva_id}/comanda", status_code=status.HTTP_201_CREATED)
def crear_comanda(
    reserva_id: int, datos: ComandaDesdeReservaCrear, db: Sesion
) -> ComandaSalida:
    return service.crear_comanda(db, reserva_id, datos)
```

- **Entrada** en `backend/app/modules/reservas/schemas.py`:

```python
class ComandaDesdeReservaCrear(BaseModel):
    """Pedido de la comanda de una reserva: sin `mesa_id`, la mesa sale de la reserva (HU-M5-06)."""

    model_config = ConfigDict(extra="forbid")

    detalles: list[DetalleComandaCrear] = Field(min_length=1)
    observaciones: str | None = None
```

- **Salida:** `ComandaSalida` compartida, **201** (D-25: creación), con `reserva_id` y la mesa de la reserva (S4).
- **Errores** (todos con `{"detalle": ...}`, D-26, por el manejador global de `main.py`; el `router` no captura nada):

| Paso | Caso | Código | Origen | `detalle` propuesto |
| --- | --- | --- | --- | --- |
| 1 | Cuerpo inválido: `detalles` vacío o ausente, cantidad no entera, `"2"`, `true`, cero o negativa, producto y menú a la vez o ninguno, campo extra (`mesa_id`) | 422 | Pydantic (`RequestValidationError`) | `Datos invalidos. <campo>: <mensaje>` (formato actual de `main.py`) |
| 1 | `reserva_id` no entero | 422 | FastAPI | ídem |
| 2 | Reserva inexistente | 404 | M5 | `La reserva {id} no existe` |
| 3 | Reserva cancelada (cualquiera de los dos estados) | 409 | M5 | `La reserva {id} fue cancelada y no se puede atender` |
| 4 | Reserva atendida | 409 | M5 | `La reserva {id} ya fue atendida` |
| 5 | Reserva de otra fecha | 409 | M5 | `La reserva {id} no corresponde al día de hoy` |
| 6 | Ninguna línea con `producto_id` (S1) | 422 | M5 (`DatosInvalidosError`) | `La comanda debe incluir al menos un producto` |
| 7 | Comanda abierta en la mesa | 409 | M4 (`ComandaAbiertaError`) | texto de M4, con `comanda_id` |
| 7 | Mesa no `LIBRE` (ocupada o fuera de servicio) | 409 | M4 (adaptador de M3) | `La mesa {numero} no está libre` |
| 7 | Producto o menú inexistente | 404 | M4 (M1/M2) | `El producto {id} no existe` |
| 7 | Producto o menú deshabilitado | 409 | M4 | `El producto {nombre} está deshabilitado` |
| 7 | Carrera sobre la mesa (Decisión 52) | 409 | M5 | `La reserva {id} ya fue atendida` o `La mesa {mesa_id} ya tiene una comanda abierta` |

- **`extra="forbid"`:** como los demás `schemas` de entrada del módulo (S15). Un cliente que envía `mesa_id` recibe 422 en lugar de creer que eligió la mesa.
- **`observaciones` igual que `ComandaCrear`** (sin largo máximo en el DTO): no se agrega una regla que el alta general no tiene; si M4 la agrega, se replica.
- **Orden de rutas:** `POST` de tres segmentos; no choca con ninguna ruta existente (mismo análisis que la Decisión 33).
- **Consecuencia del paso 1 que la spec debe registrar:** con un cuerpo inválido y una reserva inexistente la respuesta es 422, no 404 (la propuesta ya lo señala).

**Alternativas descartadas:** `POST /comandas` con `reserva_id` en el cuerpo (pone la HU en el endpoint de M4 y su `router`, fuera de alcance); `POST /reservas/{id}/atender` (el recurso creado es la comanda, y el diagrama la nombra `crearComanda`); respuesta `ReservaSalida` (el aviso de éxito necesita el número de la comanda, S4); un `ComandaDesdeReservaSalida` propio (duplicaría `ComandaSalida`, que ya trae `reserva_id`).

**Justificación:** D-22, D-24, D-25, D-26 y S4 de la propuesta.

### Decisión 55: contrato asumido con M4 y `shared/` (B1 a B3), sin ejecutarlo

**Elección:** M5 se escribe contra esta interfaz, que **no** se implementa en este cambio sin el acuerdo explícito de Juan Ignacio Riquelme (responsable de M4) y de Franco Martín Soler (a quien se reasignó HU-M4-04; `crear_comanda` la introdujo Juan en el commit `35d7478`):

```python
# B1, app/shared/contratos/comanda.py
class ComandaCrear(BaseModel):
    mesa_id: StrictInt = Field(gt=0)
    reserva_id: StrictInt | None = Field(default=None, gt=0)   # nuevo, aditivo
    detalles: list[DetalleComandaCrear] = Field(min_length=1)
    observaciones: str | None = None
# y app/modules/atencion/repository.crear_comanda copia `reserva_id` al model.

# B2 + B3, app/modules/atencion/service.py
def crear_comanda_sin_confirmar(db: Session, datos: ComandaCrear) -> ComandaSalida:
    """Misma validacion que crear_comanda; flush en lugar de commit; sin rollback."""
```

Lo que M5 **necesita** de B2, y que forma parte del acuerdo:

1. No hace `commit` ni `rollback`.
2. Deja subir sin traducir cualquier `IntegrityError` del `flush` (Decisión 52); `crear_comanda` conserva su traducción a `ComandaAbiertaError` para el alta general.
3. Construye `MesasDeSalon()` y `CatalogoDeCarta()` internamente (B3), o los recibe con esos valores por defecto.
4. Devuelve la `ComandaSalida` con `reserva_id` (requiere B1 y el cambio en `repository.crear_comanda`).

**Dónde entra B:** si M4 acuerda que lo haga Federico, B1 a B3 entran en este PR en commits separados (`feat: ... (HU-M4-04)` o el ID que M4 indique), con la aprobación anotada en el PR y sus propias pruebas en `backend/tests/modules/atencion/`; si no, este PR espera al de M4 y se rebasa sobre `develop`. En los dos casos el código de M5 no cambia. Hay solapamiento con el PR #230 (HU-M4-06) en `atencion/service.py` (riesgo de la propuesta).

**Justificación:** AGENTS.md §9.3; propuesta, sección (B).

### Decisión 56: reconciliación con el doble de S2-01 y el contrato provisorio

**Elección:** el doble (`backend/tests/shared/fakes/comanda.py`) y sus pruebas (`test_contrato_comanda.py:277-410`) son **referencia de comportamiento**; no se editan (son de `tests/shared/`) ni se ejecutan contra M5.

| Comportamiento del doble | Decisión en M5 |
| --- | --- |
| Mesa heredada de la reserva, comanda `ABIERTA` con `reserva_id` | Adoptado (Decisiones 51 y 53) |
| La comanda no agrega un cliente propio | Adoptado: `ComandaSalida` no tiene cliente |
| Producto y menú en el mismo pedido | Adoptado (S1: los menús se aceptan junto a un producto) |
| Orden: no activa, luego fecha, luego productos | Adoptado (Decisión 50 y 40), con dos estados de cancelación en lugar de `"CANCELADA"` |
| Ninguna mutación ante error (reserva `ACTIVA`, mesa `LIBRE`, sin comandas) | Adoptado: única transacción con `rollback` |
| Error de catálogo (producto inexistente) sin mutación | Adoptado: lo lanza M4 y M5 revierte |
| `crear_desde_reserva(5, [])` lanza `DatosInvalidosError` | Mismo código (422) en otra capa: `min_length=1` en el `schema` |
| `ReservaFake.comanda_id` | **Superado** (S2): el vínculo es solo `Comanda.reserva_id` |
| La orquestación vive en el doble de M4 (`crear_desde_reserva`) | **Superado**: la orquesta M5 (dependencia circular descartada en la propuesta) |

El encabezado de `shared/contratos/comanda.py` lo declara «Provisional ... not an approved production API». M5 pasa a depender de él (`DetalleComandaCrear`, `ComandaCrear`, `ComandaSalida`), como ya depende M4. Proponer a M4 el ajuste del doble (quitar `comanda_id`) queda fuera de este cambio.

**Justificación:** S2 y C2 de la propuesta; AGENTS.md §9.3.

### Decisión 57: tipos y llamada en el frontend, propios de `reservas/`

**Elección:**

En `frontend/src/modules/reservas/types.ts`:

```ts
/** Línea del pedido desde una reserva: solo productos, por su número (S6 HU-M5-06). */
export interface LineaComandaDesdeReserva {
  producto_id: number;
  cantidad: number;
}

/** Cuerpo de `POST /reservas/{id}/comanda`: sin mesa, sale de la reserva. */
export interface ComandaDesdeReservaCrear {
  detalles: LineaComandaDesdeReserva[];
  observaciones?: string;
}

/** Lo que la pantalla de reservas lee de la comanda creada; propio de `reservas` (AGENTS.md §9.4). */
export interface ComandaCreada {
  id: number;
  mesa_id: number;
  reserva_id: number | null;
  estado: string;
}
```

En `frontend/src/modules/reservas/api.ts`:

```ts
/** HU-M5-06: crea la comanda de una reserva ACTIVA de hoy y la pasa a ATENDIDA. */
export function crearComandaDesdeReserva(
  reservaId: number,
  datos: ComandaDesdeReservaCrear,
): Promise<RespuestaApi<ComandaCreada>> {
  return clienteHttp.post<ComandaCreada, ComandaDesdeReservaCrear>(
    `/reservas/${reservaId}/comanda`,
    datos,
  );
}
```

- **Solo productos en la pantalla:** el issue pide «una lista con al menos un producto» y S6 fija la selección por número de producto. La API acepta además líneas de menú junto a un producto; la pantalla no las ofrece. Los menús se pueden agregar después desde la pantalla de comandas de M4 (modificar comanda). Así el 422 «solo menús» no se puede producir desde esta pantalla y lo cubren las pruebas del backend.
- **`ComandaCreada` es un subconjunto** de `ComandaSalida`: el aviso de éxito solo necesita `id`. No se importa el tipo de `atencion/` (§9.4).

**Alternativas descartadas:** un selector tipo producto/menú como `DetallePedidoFila` de M4 (más alcance del que pide el issue; se puede sumar luego sin cambiar la API); importar `ComandaForm`, `usePedido` o los tipos de `atencion/` (prohibido por §9.4); mover los tipos de comanda a `frontend/src/shared/` (toca `shared/` sin necesidad).

**Justificación:** D-16, AGENTS.md §9.4, S6 de la propuesta.

### Decisión 58: modal `ComandaDesdeReservaDialog` y hook `useComandaDesdeReserva`

**Elección:** tres archivos nuevos en `frontend/src/modules/reservas/components/`:

1. **`validarComandaDesdeReserva.ts`** (función pura, como `validarReserva.ts`): recibe las líneas escritas (`{ clave, producto, cantidad }` como texto) y devuelve los errores por línea y campo. Reglas locales: número de producto entero mayor que cero; cantidad entera mayor que cero (mismo texto que la spec fije para CA4). No hay regla «al menos una línea» porque la pantalla nunca queda sin líneas (ver abajo). El backend sigue siendo la autoridad: la validación local solo evita un viaje inútil.
2. **`useComandaDesdeReserva.ts`**: estado de las líneas (`agregarLinea`, `quitarLinea`, `cambiarLinea`), `observaciones`, `errores` (por línea y `general`), `enviando` y `enviar()`. Al enviar: valida localmente; si hay errores, corta; si no, `setEnviando(true)` y llama a `crearComandaDesdeReserva(reserva.id, ...)` con `Number(...)` de cada campo y `observaciones` solo si no está vacía (recortada). Con éxito: `mostrarToast({ titulo: 'Comanda n.º {id} creada', descripcion: 'La reserva quedó atendida.', variante: 'success' })` y `onCreada()`. Con error: `errores.general = respuesta.error` (el `detalle` del backend tal cual) y el modal **queda abierto**. Guarda de vigencia con `useRef` igual que `useFormularioReserva` (S38): si el modal se cerró mientras la respuesta viajaba, la respuesta no toca el estado.
3. **`ComandaDesdeReservaDialog.tsx`**: `Dialog` de `shared/components/ui/` con título «Crear comanda», el resumen de la reserva (hora y cliente), el campo **Mesa** en solo lectura (`Input disabled` con `mesa_id`, mismo patrón que `CampoMesa` en edición), una fila por línea (componente local `LineaProducto` con `FormField` + `Input` «Producto (número)» y «Cantidad», y un botón «Quitar» deshabilitado cuando queda una sola línea), el botón «Agregar producto», un `Textarea` para observaciones y, en el pie, «Cancelar» y «Crear comanda» (`type="submit"`, deshabilitado mientras `enviando`). Los errores generales se muestran con `Alert variant="danger"` arriba del formulario, como `ReservaFormDialog`.

Reutiliza de `frontend/src/shared/`: `Dialog`, `Button`, `FormField`, `Input`, `Textarea`, `Alert` y `useToast`. No se crea ningún componente compartido.

- **Error en el modal y no en un toast:** el error más probable es corregible en el mismo formulario (producto inexistente o deshabilitado, cantidad inválida); un toast obligaría a reabrir y reescribir el pedido. Cumple el «aviso `danger` con el `detalle`» de la propuesta con la variante `danger` de `Alert`.
- **Sin recarga ante error:** como en las cancelaciones (Decisión 36). Si el 409 dice que la reserva ya fue atendida o cancelada, la persona cierra el modal y el listado se actualiza en la siguiente recarga.
- **Sin cálculo de fecha en el navegador** (S7): el 409 «no corresponde al día de hoy» se muestra en el modal.
- **Tamaño:** el modal se divide en `LineaProducto` y el cuerpo para quedar en funciones de menos de 50 líneas (RNF-MAN-05).

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| Reutilizar `ReservaFormDialog` con un modo `comanda` | Mezcla dos formularios sin campos en común en un componente que ya tiene alta y edición |
| Toast `danger` y cerrar el modal ante error | Pierde lo escrito ante un error corregible |
| Un hook sin función de validación aparte | La validación pura se prueba sin renderizar, como `validarReserva.test.ts` |
| Página aparte (`comanda-nueva.html` de la maqueta) | AGENTS.md §5: los formularios de alta se abren en un modal |

**Justificación:** D-16, AGENTS.md §5 y §9.4, el patrón de `ReservaFormDialog` y `useFormularioReserva`, y S6 y S7 de la propuesta.

### Decisión 59: acción en `ReservasTabla` y conexión en `ReservasPage`

**Elección:**

- **`ReservasTabla.tsx`:** `ReservasTablaProps` suma `onCrearComanda: (reserva: Reserva) => void`, obligatoria, con el comentario «Se ofrece solo en las filas `ACTIVA` (HU-M5-06)». `AccionesDeFila` la incluye. Dentro de la misma condición `r.estado === 'ACTIVA'`, un botón `variant="ghost" size="sm"` con `aria-label="Crear comanda"` e ícono `ClipboardList` de `lucide-react` (dependencia existente), **primero** en la fila porque es la acción principal cuando el cliente llega. Ninguna lógica de fecha (S7).
- **`ReservasPage.tsx`:** el tipo `Panel` suma una variante: `'cerrado' | 'alta' | { edicion: Reserva } | { comanda: Reserva }`. `ListadoDelDia` recibe y pasa `onCrearComanda={(reserva) => setPanel({ comanda: reserva })}`. `ModalDeReserva` monta `ComandaDesdeReservaDialog` (con `key={reserva.id}`) cuando el panel es `{ comanda }`, y `ReservaFormDialog` en los demás casos, como hoy. `onCreada` cierra el panel y llama a `listado.reservas.recargar()` (mismo `alGuardar`): con el filtro «Activas» la fila desaparece; con «Todas» muestra `ATENDIDA`. El botón «Nueva reserva» sigue deshabilitado con cualquier panel objeto (`typeof panel === 'object'`).
- **`components/index.ts`:** exporta `ComandaDesdeReservaDialog`.

**Alternativas descartadas:** un segundo estado `useState` para el modal de comanda (dos modales podrían quedar abiertos a la vez; el tipo `Panel` ya los excluye); un hook en la página con `useConfirm` sin modal (el pedido necesita líneas); prop opcional en la tabla (permitiría montar la tabla sin la acción).

**Maqueta:** si la maqueta no muestra esta acción, la diferencia se anota en el PR (AGENTS.md §5).

**Justificación:** Decisiones 37 y 38, AGENTS.md §5.

### Decisión 60: doble envío y concurrencia

**Elección:** tres barreras, sin bloqueos nuevos:

1. **Frontend:** «Crear comanda» queda deshabilitado mientras `enviando`, así que dos clics seguidos en el mismo modal producen una sola solicitud.
2. **Guarda de estado:** si una segunda solicitud llega después del `commit` de la primera (otra pestaña, otro mozo), `_obtener_atendible` responde 409 «ya fue atendida».
3. **Índice `ux_comandas_mesa_abierta` de M4:** si las dos solicitudes leen la reserva `ACTIVA` antes del primer `commit`, las dos intentan insertar una comanda `ABIERTA` en **la misma mesa** (la de la reserva). SQLite serializa a los escritores (WAL con `busy_timeout`, `app/database.py`); la segunda inserción falla con `IntegrityError` en el `flush` de B2, M5 revierte todo (también su cambio a `ATENDIDA`) y responde el 409 de la Decisión 52, que tras releer será «ya fue atendida».

Resultado garantizado: **a lo sumo una comanda por reserva** («genera 0..1» del diagrama) sin índice nuevo sobre `comandas.reserva_id` (excluido por la propuesta), porque todas las comandas de una reserva caerían en la misma mesa. Si la espera supera el `busy_timeout`, SQLite responde `OperationalError` («database is locked»), que hoy da 500 en todo el sistema; la transacción única asegura que tampoco quede estado parcial. No se agrega un manejo específico para eso (es transversal, `shared/`).

**Alternativas descartadas:** `SELECT ... FOR UPDATE` (SQLite no lo soporta); un `UPDATE reservas SET estado='ATENDIDA' WHERE id=? AND estado='ACTIVA'` condicional como primer paso (correcto, pero agrega una consulta al `repository` para un caso que ya cubre el índice de M4); un índice único sobre `comandas.reserva_id` (migración en M4, excluida).

**Justificación:** CA1, S3 de la propuesta, Decisión 52.

### Decisión 61: estrategia de pruebas con Strict TDD y fases

**Elección:** cada comportamiento empieza con una prueba en rojo (`openspec/config.yaml`, `strict_tdd: true`). La fixture `reloj` (autouse, `AHORA = datetime(2026, 11, 2, 12, 0)`) fija «hoy» en el 2 de noviembre de 2026; `fabrica_reserva` ya acepta `fecha` y `estado`.

**Doble de la primitiva** en `backend/tests/modules/reservas/conftest.py`:

- `DoblePuente` suma `comandas: list[tuple[int, int, list[DetalleComandaCrear], str | None]]` (lo recibido), `falla: Exception | None = None` y `crear_comanda_de_reserva(db, mesa_id, reserva_id, detalles, observaciones) -> ComandaSalida`: si hay `falla`, la lanza; si no, registra la llamada y devuelve una `ComandaSalida` con `id` incremental, `estado=ABIERTA`, `fecha_hora` fija, `mesa_id`, `reserva_id`, `observaciones` y detalles con `precio_unitario=Decimal("1000.00")`, `descuento=Decimal("0.00")` y `estado_entrega=PENDIENTE`.
- `puente_doble` (autouse) reemplaza también `puente.crear_comanda_de_reserva`; `CREAR_COMANDA_DE_RESERVA_REAL` se guarda al importar y `puente_real` la restaura. Ninguna prueba toca la función real antes de B.
- Para probar el `rollback`, una variante del doble hace una escritura con `flush` en la sesión (por ejemplo, cambia otra reserva) antes de lanzar `falla`; la prueba verifica que esa escritura no quedó.
- Para el doble envío (Decisión 52), el doble abre una **segunda sesión** sobre el mismo motor (`sessionmaker(bind=db.get_bind())`), pasa la reserva a `ATENDIDA`, confirma y lanza un `IntegrityError` simulado; la prueba espera 409 «ya fue atendida».

**Una prueba por criterio de aceptación (y sus límites):**

| Criterio | Capa | Prueba (nombre orientativo) | Estado |
| --- | --- | --- | --- |
| CA1 | `test_service.py` | `test_crear_comanda_reserva_activa_de_hoy_queda_atendida`: el doble recibe `mesa_id` de la reserva y su `id`; la reserva releída está `ATENDIDA`; se devuelve la `ComandaSalida` | Con doble |
| CA1 | `test_router.py` | `test_post_comanda_de_reserva_devuelve_201`: cuerpo con `reserva_id`, `mesa_id`, `estado` `ABIERTA` | Con doble |
| CA1 | `test_integracion_comanda.py` (nuevo) | Con SQLite real, M3 sembrado (`mesas_en_m3`) y un producto habilitado de M1: comanda persistida con `reserva_id`, mesa `OCUPADA`, reserva `ATENDIDA` | **Bloqueada hasta B** |
| CA2 | `test_service.py` | Canceladas (parametrizada con los dos estados) y atendida → 409, el doble no se llamó, la reserva no cambió | Con doble |
| CA2 | `test_router.py` | 409 con `{"detalle": ...}` | Con doble |
| CA3 | `test_service.py` | Fecha de ayer y de mañana → 409 «no corresponde al día de hoy», reserva `ACTIVA`; reserva de hoy con hora ya pasada → 201 (solo fecha, Decisión 50) | Con doble |
| CA4 | `test_schemas.py` y `test_router.py` | Cantidad `0`, `-1`, `2.5`, `"2"` y `true` → 422; la reserva sigue `ACTIVA` y el doble no se llamó | Con doble |
| Límite | `test_service.py` | Reserva inexistente → 404 | Con doble |
| Límite (S1) | `test_service.py` | Solo menús → 422 «al menos un producto»; producto + menú → 201 | Con doble |
| Límite | `test_router.py` | `detalles: []` → 422; producto y menú en la misma línea → 422; `mesa_id` en el cuerpo → 422 | Con doble |
| Orden | `test_service.py` | Cancelada de otra fecha → «fue cancelada»; atendida de otra fecha → «ya fue atendida»; cancelada con solo menús → 409, no 422 | Con doble |
| Error de M4 | `test_service.py` | El doble lanza `NoEncontradoError` y `ReglaDeNegocioError` → sube igual; la escritura previa del doble se revirtió; reserva `ACTIVA` | Con doble |
| Carrera | `test_service.py` | `IntegrityError` con reserva aún `ACTIVA` → 409 «La mesa {id} ya tiene una comanda abierta»; con reserva atendida por otra sesión → 409 «ya fue atendida» | Con doble |
| Atomicidad real | `test_integracion_comanda.py` | Producto inexistente → 404 y nada persistido (0 comandas, mesa `LIBRE`, reserva `ACTIVA`); mesa con comanda abierta previa → 409 de M4 | **Bloqueada hasta B** |
| Puente | `test_puente.py` | `crear_comanda_de_reserva` real arma `ComandaCrear` con `reserva_id` y no confirma (la comanda desaparece tras `db.rollback()`) | **Bloqueada hasta B** |
| Frontend | `api.test.ts` | `crearComandaDesdeReserva` llama a `clienteHttp.post` con `/reservas/7/comanda` y el cuerpo | Ejecutable ya |
| Frontend | `validarComandaDesdeReserva.test.ts` | Producto y cantidad vacíos, `0`, negativos, decimales → error; enteros positivos → sin error | Ejecutable ya |
| Frontend | `useComandaDesdeReserva.test.tsx` | Éxito: cuerpo enviado, toast con el número, `onCreada` una vez; error 409/404/422: `errores.general` con el `detalle`, sin `onCreada`; error local: no llama a la API; respuesta tras desmontar: no toca el estado | Ejecutable ya |
| Frontend | `ComandaDesdeReservaDialog.test.tsx` | Mesa en solo lectura, agregar y quitar líneas (no se puede quitar la última), «Crear comanda» deshabilitado mientras envía, `Alert` con el error | Ejecutable ya |
| Frontend | `ReservasTabla.test.tsx` | «Crear comanda» solo en filas `ACTIVA`; llama a `onCrearComanda` con la fila | Ejecutable ya |
| Frontend | `ReservasPage.test.tsx` | Abrir el modal desde la fila, crear y ver la recarga del listado; 409 deja el modal abierto y no recarga | Ejecutable ya |

- **Sin `skipif` para las pruebas bloqueadas:** se escriben en la fase posterior a B. Un `skipif(not hasattr(atencion_service, "crear_comanda_sin_confirmar"))` las dejaría verdes en silencio si M4 elige otro nombre.
- Las pruebas de integración importan `app.modules.productos.models`, `app.modules.salon.models` y `app.modules.atencion.models` solo desde `tests/` (permitido: `lint-imports` controla `app`, como ya indica `conftest.py`).

**Justificación:** `openspec/config.yaml` (Strict TDD), AGENTS.md §9.5, RNF-MAN-04.

## Flujo de datos

```text
POST /api/v1/reservas/{id}/comanda  {detalles, observaciones}
        │
        ├─ Pydantic: ComandaDesdeReservaCrear ─────────────── 422 (paso 1)
        ▼
router.crear_comanda ──→ service.crear_comanda(db, id, datos)
                           │
                           ├─ _obtener_atendible ─────────── 404 / 409 / 409 / 409 (pasos 2-5)
                           ├─ _validar_al_menos_un_producto ─ 422 (paso 6)
                           │
                           │  try ───────────────────────────────────────────────────┐
                           ├─ puente.crear_comanda_de_reserva(db, mesa, id, ...)     │
                           │     └─ ComandaCrear(mesa_id, reserva_id, ...)  [B1]    │
                           │     └─ atencion_service.crear_comanda_sin_confirmar [B2]│
                           │           ├─ comanda abierta / mesa no LIBRE ── 409     │
                           │           ├─ cotizar (M1/M2) ─────────── 404 / 409      │
                           │           ├─ insert + flush (comanda, detalles)         │
                           │           └─ ocupar mesa (M3, sin commit)               │
                           ├─ reserva.estado = ATENDIDA                              │
                           └─ db.commit()  ← único                                   │
                              except IntegrityError → rollback → _conflicto ── 409   │
                              except Exception      → rollback → raise ─────────────┘
        ▼
201 ComandaSalida (reserva_id, mesa_id de la reserva, ABIERTA)
```

```text
ReservasTabla (fila ACTIVA) ── clic «Crear comanda»
        ▼
ReservasPage: setPanel({ comanda: reserva })
        ▼
ComandaDesdeReservaDialog ── useComandaDesdeReserva
        ├─ validarComandaDesdeReserva → errores locales: no llama a la API
        └─ api.crearComandaDesdeReserva(reserva.id, datos)
              ├─ éxito: toast «Comanda n.º {id} creada» + onCreada → cerrar + recargar listado
              └─ error: Alert danger con el detalle; el modal queda abierto
```

## Archivos a crear o modificar

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/service.py` | Modificar | `_obtener_atendible`, `_validar_al_menos_un_producto`, `_conflicto_al_atender`, `crear_comanda`; importa `IntegrityError` (ya está), `DetalleComandaCrear` y `ComandaSalida` de `shared/contratos`, `ComandaDesdeReservaCrear` |
| `backend/app/modules/reservas/puente.py` | Modificar | `crear_comanda_de_reserva`; docstring del módulo menciona el lado Comanda |
| `backend/app/modules/reservas/schemas.py` | Modificar | `ComandaDesdeReservaCrear` |
| `backend/app/modules/reservas/router.py` | Modificar | `POST /reservas/{reserva_id}/comanda` |
| `backend/tests/modules/reservas/conftest.py` | Modificar | Doble de la primitiva, reemplazo en `puente_doble`, restauración en `puente_real` |
| `backend/tests/modules/reservas/test_service.py` | Modificar | Pruebas con doble (Decisión 61) |
| `backend/tests/modules/reservas/test_router.py` | Modificar | Pruebas HTTP con doble |
| `backend/tests/modules/reservas/test_schemas.py` | Modificar | `ComandaDesdeReservaCrear` |
| `backend/tests/modules/reservas/test_puente.py` | Modificar | Puente real (bloqueada hasta B) |
| `backend/tests/modules/reservas/test_integracion_comanda.py` | Crear | SQLite real de punta a punta (bloqueada hasta B) |
| `frontend/src/modules/reservas/types.ts` | Modificar | `LineaComandaDesdeReserva`, `ComandaDesdeReservaCrear`, `ComandaCreada` |
| `frontend/src/modules/reservas/api.ts` (+ `api.test.ts`) | Modificar | `crearComandaDesdeReserva` |
| `frontend/src/modules/reservas/components/validarComandaDesdeReserva.ts` (+ `.test.ts`) | Crear | Validación local de las líneas |
| `frontend/src/modules/reservas/components/useComandaDesdeReserva.ts` (+ `.test.tsx`) | Crear | Estado, envío y avisos |
| `frontend/src/modules/reservas/components/ComandaDesdeReservaDialog.tsx` (+ `.test.tsx`) | Crear | Modal |
| `frontend/src/modules/reservas/components/index.ts` | Modificar | Exporta el modal |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx` (+ `.test.tsx`) | Modificar | Acción «Crear comanda» |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` (+ `.test.tsx`) | Modificar | Variante `{ comanda }` del panel y conexión |
| `backend/app/modules/reservas/{models,repository}.py`, `backend/alembic/`, `backend/app/main.py`, `backend/pyproject.toml` | Sin cambios | `ATENDIDA` y `comandas.reserva_id` ya existen; los manejadores globales ya cubren los errores |
| `backend/app/shared/contratos/comanda.py`, `backend/app/modules/atencion/{service,repository}.py` | Dependencia (B1 a B3) | Solo con acuerdo de M4 (Decisión 55) |
| `backend/tests/shared/fakes/comanda.py`, `backend/tests/shared/test_contrato_comanda.py` | Sin cambios | Referencia (Decisión 56) |

## Contratos e interfaces

| Capa | Nuevo | Firma |
| --- | --- | --- |
| `service` | `crear_comanda` | `(db: Session, reserva_id: int, datos: ComandaDesdeReservaCrear) -> ComandaSalida` |
| `service` (privadas) | `_obtener_atendible`, `_validar_al_menos_un_producto`, `_conflicto_al_atender` | ver Decisiones 50 a 52 |
| `puente` | `crear_comanda_de_reserva` | `(db, mesa_id: int, reserva_id: int, detalles: list[DetalleComandaCrear], observaciones: str \| None) -> ComandaSalida` |
| `schemas` | `ComandaDesdeReservaCrear` | `detalles: list[DetalleComandaCrear]` (`min_length=1`), `observaciones: str \| None`; `extra="forbid"` |
| `router` | `POST /reservas/{reserva_id}/comanda` | 201 `ComandaSalida`; 404, 409, 422 |
| M4 asumido (B2) | `atencion_service.crear_comanda_sin_confirmar` | `(db: Session, datos: ComandaCrear) -> ComandaSalida` |
| `api.ts` | `crearComandaDesdeReserva` | `(reservaId: number, datos: ComandaDesdeReservaCrear) => Promise<RespuestaApi<ComandaCreada>>` |
| hook | `useComandaDesdeReserva` | `({ reserva, onCreada }) => { lineas, agregarLinea, quitarLinea, cambiarLinea, observaciones, cambiarObservaciones, errores, enviando, enviar }` |
| tabla | `ReservasTablaProps` | `+ onCrearComanda: (reserva: Reserva) => void` |

## Matriz de amenazas

N/A: el cambio agrega una ruta HTTP de la API en proceso, un modal y un hook del frontend; no agrega enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS o PR, clasificación de archivos ejecutables ni integración de procesos. Las lecturas y escrituras usan SQLAlchemy con parámetros (D-07, RNF-SEG-05) y los errores no exponen trazas ni SQL (D-26): el `IntegrityError` se traduce a un mensaje propio.

## Orden de tareas sugerido (para sdd-tasks)

**Fase A, ejecutable ya (contra el doble):**

1. Backend, `conftest.py`: doble de la primitiva y su reemplazo en `puente_doble`; `puente.crear_comanda_de_reserva` con su cuerpo definitivo (Decisión 53).
2. Backend, `schemas.py`: `ComandaDesdeReservaCrear` (prueba en `test_schemas.py` primero).
3. Backend, `service.py`: `_obtener_atendible` (404 y los tres 409, con los cruces de orden).
4. Backend, `service.py`: `crear_comanda` con S1, transacción y `rollback` ante error de M4.
5. Backend, `service.py`: `_conflicto_al_atender` (las dos ramas).
6. Backend, `router.py`: ruta y pruebas HTTP (201, 404, 409, 422).
7. Frontend: tipos y `api.ts`.
8. Frontend: `validarComandaDesdeReserva`.
9. Frontend: `useComandaDesdeReserva`.
10. Frontend: `ComandaDesdeReservaDialog` e `index.ts`.
11. Frontend: `ReservasTabla` y `ReservasPage`.

**Fase B, bloqueada hasta que B1 a B3 estén en `develop` (o en esta rama con acuerdo de M4):**

12. Si M4 lo acuerda: B1, B2 y B3 en commits separados, con sus pruebas en `backend/tests/modules/atencion/`.
13. `test_puente.py`: puente real.
14. `test_integracion_comanda.py`: CA1 y atomicidad con SQLite real.
15. `git pull origin develop`, verificación completa (sección 7 de AGENTS.md) y apertura del PR con `Closes #68` y la aprobación de M4 anotada.

**Commits sugeridos** (Conventional Commits en español): `feat: agrega la guarda y el servicio para crear una comanda desde una reserva (HU-M5-06)` (pasos 1 a 5), `feat: expone POST /reservas/{id}/comanda (HU-M5-06)` (6), `feat: agrega el modal para crear una comanda desde una reserva (HU-M5-06)` (7 a 11), los de M4 si corresponden (12) y `test: agrega pruebas de integración de la comanda desde una reserva (HU-M5-06)` (13 y 14). Un solo PR (AGENTS.md §4; estrategia `single-pr`).

## Estimación de líneas (punto de control, no bloqueo)

Líneas escritas (agregadas más quitadas), sin archivos generados:

| Lado | Código | Pruebas y fixtures | Total estimado | Límite |
| --- | --- | --- | --- | --- |
| `backend/` (A) | `service` 45 a 55, `puente` 15 a 20, `schemas` 10 a 12, `router` 6 a 8 | `conftest` 40 a 55, `test_service` 180 a 240, `test_router` 100 a 140, `test_schemas` 20 a 30, `test_puente` 25 a 35, integración 90 a 130 | **530 a 725** | 800 |
| `backend/` (B, si entra en este PR) | 40 a 80 | 60 a 100 | **+100 a 180** | (mismo límite) |
| `frontend/` | `types` 15 a 20, `api` 12 a 15, validación 30 a 40, hook 80 a 100, modal 100 a 130, tabla 10 a 15, página 20 a 30, `index` 1 | `api.test` 15 a 20, validación 40 a 60, hook 130 a 170, modal 90 a 130, tabla 20 a 30, página 60 a 90 | **620 a 850** | 800 |

La estimación supera a la de la propuesta (300 a 450 y 450 a 600) porque incluye las pruebas de integración, el doble y la validación local con sus pruebas. El backend queda cerca del límite si B entra en este PR (hasta ~900) y el frontend puede superarlo levemente. Es un punto de control: la HU no se divide (AGENTS.md §4) y no se recortan pruebas para entrar en el número.

## Migración y puesta en marcha

Sin migración: `EstadoReserva.ATENDIDA` existe desde `d6f8a0c2e4b6_crea_reservas.py` y `comandas.reserva_id` desde `e7c9a1b3d5f0`; `alembic heads` no cambia. Sin configuración nueva ni variables de entorno. La puesta en marcha depende de B (Decisión 55): el PR no se abre hasta que B1 a B3 estén disponibles.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| No hay acuerdo explícito con M4 (Juan Ignacio Riquelme y Franco Martín Soler) sobre B1 a B3 | La Fase A avanza completa contra el doble; si la forma de B cambia, solo cambia el cuerpo de `puente.crear_comanda_de_reserva` (Decisión 53) |
| B2 traduce o absorbe el `IntegrityError` en lugar de dejarlo subir | Es un punto explícito del acuerdo (Decisión 55, punto 2); la prueba de integración de la carrera no se puede reproducir de forma determinista, así que el punto se revisa en el PR de M4 |
| Antes de B1, `ComandaCrear` ignora `reserva_id` en silencio | El DTO se arma solo en el puente; la prueba de integración verifica `reserva_id` persistido (Decisión 53) |
| Antes de B2, `crear_comanda_de_reserva` llama a un atributo inexistente | Solo en la rama: el doble autouse lo reemplaza y el PR espera a B |
| `ComandaAbiertaError` responde con un texto en inglés en el flujo de M5 | Se informa a M4 (ver «Contradicciones y observaciones», punto 3); M5 no lo redefine |
| Conflicto con el PR #230 (HU-M4-06) en `atencion/service.py` | B2 es aditiva; integrar después de #230 o rebasar |
| El equipo elige la lectura genérica de S1 o el aviso no bloqueante de S5 | Cada regla es una función o una condición aislada con su prueba (`_validar_al_menos_un_producto`, última condición de `_obtener_atendible`) |
| `OperationalError` por `busy_timeout` en una carrera larga responde 500 | Transversal al sistema; la transacción única evita estado parcial |
| El frontend supera la estimación de 800 líneas | Punto de control, no bloqueo (AGENTS.md §4) |

Probabilidades a estimar por el equipo (AGENTS.md §9.9).

**Reversión:** sin cambios de esquema. Antes de integrar, descartar la rama; ya integrado, `git revert -m 1 <merge>`. Las comandas con `reserva_id` y las reservas `ATENDIDA` creadas mientras el cambio estuvo activo son datos válidos con o sin este código.

## Contradicciones y observaciones (señaladas, no resueltas)

1. **Referencia inexistente:** `openspec/changes/HU-M5-07/design.md` no existe en la rama; el estilo se tomó de `HU-M5-04-05/design.md`.
2. **Armado de `ComandaCrear`:** el pedido de esta fase ubicaba el armado en el `service`; este diseño lo mueve al puente por la razón de la Decisión 53. La propuesta no lo fija, así que no la contradice.
3. **Texto de `ComandaAbiertaError` en inglés:** M4 responde «An ABIERTA Comanda already exists for this Mesa» (`atencion/service.py:65`), contra el criterio de mensajes en español del resto de la API. Afecta también al flujo de M5 (paso 7). Es código de M4: se informa, no se cambia.
4. **Mensajes de M4 en inglés en la cotización** (`"Quote does not match ..."`, `atencion/service.py:175`): solo aparecen ante un adaptador defectuoso, no ante datos del usuario; se informa.
5. **`lint-imports` no prohíbe `atencion.adaptadores`** a otros módulos (no figura en `forbidden_modules` de `backend/pyproject.toml`), aunque AGENTS.md §9.4 sí. Este diseño sigue la regla del proyecto (B3); proponer agregarlo al contrato es decisión del equipo.
6. **Estimación de líneas** mayor que la de la propuesta (ver la sección correspondiente).

## Puntos a reconciliar con la spec

- Textos exactos de los 409 de M5 (Decisión 50) y del 422 de S1.
- La reserva de hoy se atiende a cualquier hora (solo se compara la fecha).
- Con cuerpo inválido y reserva inexistente, 422 antes que 404.
- `mesa_id` en el cuerpo responde 422 (`extra="forbid"`).
- La pantalla ofrece solo líneas de producto; los menús se aceptan por API junto a un producto.
- El error se muestra dentro del modal (`Alert` `danger`) y el modal queda abierto.
- La carrera sobre la mesa responde 409 sin `comanda_id`.

## Preguntas abiertas

- [ ] Acuerdo de M4 (Juan Ignacio Riquelme y Franco Martín Soler) sobre B1 a B3, incluido el punto 2 de la Decisión 55 (dejar subir el `IntegrityError`), y sobre quién los implementa.
- [ ] Validación del equipo de S1 (lectura literal) y S5 (rechazo con 409), y de la regla «solo fecha, cualquier hora».
- [ ] Numeración de decisiones frente a un futuro diseño de HU-M5-07.

## Adenda 2026-11-11: M4 resolvió B1 a B3 con otra forma

Franco Martín Soler mergeó en `develop` el PR #236 (2026-11-10T11:38:29Z, merge `760dfce`), ya incorporado en esta rama (merge `ae68602`). Entregó la interfaz de M4 con otra forma que la asumida en la Decisión 55, así que el diseño original se conserva y esta adenda registra qué cambió. No hay un acuerdo escrito previo con Juan Ignacio Riquelme: queda pendiente su revisión, pedida en el PR. La firma real, leída en `backend/app/modules/atencion/service.py:163` y en `backend/app/shared/contratos/comanda.py`:

```python
def crear_comanda_para_reserva(db: Session, datos: ComandaCrear, reserva_id: int) -> ComandaSalida:
    """Valida, cotiza y ocupa la mesa como crear_comanda; no hace commit ni rollback."""
```

| Punto | Lo asumido (Decisión 55) | Lo que entregó M4 (#236) | Efecto en M5 |
| --- | --- | --- | --- |
| B1: vínculo con la reserva | `reserva_id: StrictInt \| None` dentro de `ComandaCrear` | No se agregó: `ComandaCrear` sigue con `mesa_id`, `detalles` y `observaciones`, sin `extra="forbid"`, así que ignora en silencio un `reserva_id` que se le pase. El vínculo entra como **argumento aparte** de la primitiva (que rechaza `reserva_id <= 0` con `DatosInvalidosError`), y `ComandaSalida` ya trae `reserva_id` | El puente deja de pasar `reserva_id` dentro de `ComandaCrear`. `POST /comandas` no cambia |
| B2: primitiva sin confirmar | `crear_comanda_sin_confirmar(db, datos: ComandaCrear)` | `crear_comanda_para_reserva(db, datos: ComandaCrear, reserva_id: int)`. Cumple lo que M5 necesita: no hace `commit` ni `rollback`, deja subir el `IntegrityError` sin traducir y devuelve la `ComandaSalida` con `reserva_id` | Solo cambia el cuerpo de `puente.crear_comanda_de_reserva` |
| B3: proveedores internos | `MesasDeSalon()` y `CatalogoDeCarta()` construidos dentro de M4 | Resuelto con un import diferido de `app.modules.atencion.adaptadores` dentro de la función | Sin cambios: M5 sigue sin importar `adaptadores` (el puente importa solo `app.modules.atencion.service`) |

Decisiones afectadas:

| Decisión | Qué cambia | Qué sigue igual |
| --- | --- | --- |
| 53 (el puente) | El cuerpo: arma `ComandaCrear(mesa_id=..., detalles=..., observaciones=...)` sin `reserva_id` y llama a `atencion_service.crear_comanda_para_reserva(db, datos, reserva_id)`. Ya no aplica el párrafo «Antes de B2» (el atributo existe y no hay `AttributeError`) | El nombre `crear_comanda_de_reserva`, su firma con argumentos sueltos `(db, mesa_id, reserva_id, detalles, observaciones)`, que no haga `commit` ni `rollback` y las importaciones del puente. El `service`, el doble y sus pruebas no cambian. El vínculo sigue sin poder perderse en silencio, ahora porque viaja como argumento y porque la prueba del puente real y la de integración comprueban el `reserva_id` persistido |
| 55 (contrato asumido) | La forma de B1 y B2 (no hay B1; B2 tiene otro nombre y recibe `reserva_id` aparte). «Dónde entra B»: ya no entra en este PR, porque lo hizo M4; la Fase 5 de las tareas no aplica | Los cuatro puntos de lo que M5 necesita de B2: sin `commit` ni `rollback`, `IntegrityError` sin traducir (lo comprueba la prueba de integración de la comanda duplicada), proveedores internos y `ComandaSalida` con `reserva_id` |
| 61 (estrategia de pruebas) | Las filas «Bloqueada hasta B» (puente real e integración) se escriben y pasan: `test_puente.py` (3 pruebas) y `test_integracion_comanda.py` (8 pruebas). Los dos entrelazados de la carrera se reproducen de forma determinista con una función que corre dentro de la solicitud, entre la verificación previa de M4 y su insert | Strict TDD, sin `skipif`, el doble `DoblePuente` y las pruebas con doble de las Fases 1 y 2 |

Siguen igual las Decisiones 50 a 52, 54 y 56 a 60. La Decisión 52 queda confirmada contra M4 real: la primitiva deja subir el `IntegrityError` y M5 lo traduce a 409. Pendiente fuera de este diseño: la spec (requisito «M5 consume la interfaz de M4 solo a través del puente», y su escenario con `crear_comanda_sin_confirmar`) y la divergencia D1 de `tasks.md` todavía nombran la forma anterior; no se reescriben aquí.

## Adenda 2026-11-11 (2): el producto se elige por nombre

La responsable del módulo pidió, como ajuste de usabilidad de esta HU ya integrada, que en el modal «Crear comanda» el producto se elija por su nombre y no escribiendo su ID: quien atiende no conoce los IDs. El diseño original se conserva y esta adenda registra qué cambió. Es un cambio solo de frontend, dentro de `frontend/src/modules/reservas/`; no toca el backend, `shared/` ni las rutas. Reemplaza lo que fijaban el supuesto S58 («por el número (ID) del producto»), el supuesto S64 («Producto {n} (ID)») y la Decisión 58 («Producto (número)» como `Input`).

### Qué cambia

| Punto | Antes (Decisión 58, S58 y S64) | Ahora |
| --- | --- | --- |
| Campo de producto | `Input` de texto «Producto {n} (ID)» | `Select` «Producto {n}» (componente `SelectorProducto`, mismo patrón que `SelectorMesa`) con los productos habilitados como «Nombre · precio», por ejemplo «Milanesa · $ 1.500,50». El valor de cada opción es el `id` del producto |
| Origen de los datos | Ninguno: la persona escribía el número | `GET /api/v1/productos?estado=HABILITADO&limit=100&offset=N`, llamada `listarProductosHabilitados()` en `api.ts` (tipo `ProductoHabilitado` en `types.ts`) |
| Lista larga | No aplicaba | La API pagina y no tiene búsqueda, así que se leen todas las páginas de 100 hasta cubrir `total`. Una página vacía antes de completar el total corta la lectura y devuelve lo leído, para no girar sin fin; si falla cualquier página se devuelve el error y se descarta lo leído; un producto repetido por un cambio del catálogo entre páginas se ofrece una sola vez. Salen ordenados por nombre con `localeCompare(…, 'es')` |
| Estados de la lista | No aplicaba | Hook `useProductosHabilitados` con `cargando`, `listo` (puede venir vacía) y `error`, como `useMesasDisponibles`. Se carga **una sola vez al abrir el modal** y el modal la comparte entre todas las líneas: no hay una consulta por línea |
| Textos de interfaz | «Producto {n} (ID)» | Opción vacía «Seleccione un producto»; «Cargando productos…»; «No hay productos habilitados»; etiqueta «Producto {n}»; aviso de error de la carga «No se pudieron cargar los productos» con el detalle de la API (o «No se pudo obtener la lista de productos habilitados.»). Español neutro, sin voseo |
| Validación local | El producto debía ser un entero mayor que cero («El producto debe ser un número entero mayor que cero») | Debe haberse elegido un producto; el error es «Seleccione un producto». Ya no existen los valores `0`, `-1`, `2.5` o `abc`, porque el valor sale de una opción de la lista |
| «Guardar comanda» | Deshabilitado solo mientras `enviando` | Además, deshabilitado mientras la lista carga, si no hay productos habilitados o si la carga falló. Si la carga falla, un aviso `danger` dentro del modal lo explica y no se puede enviar |
| Precio | No se mostraba | `formatearMoneda` de `frontend/src/shared/lib/format.ts` (ya compartido), en pesos argentinos con el formato de las demás pantallas |

### Qué sigue igual

- **El contrato de la API.** `POST /api/v1/reservas/{id}/comanda` recibe el mismo cuerpo, `{"detalles": [{"producto_id": 12, "cantidad": 2}]}`. El estado de cada línea sigue guardando el `id` como texto y `aComandaCrear` lo convierte con `Number(...)`, así que `producto_id` sigue siendo numérico. `crearComandaDesdeReserva`, el backend y sus errores (404, 409 y 422) no cambian.
- Las Decisiones 50 a 57 y 59 a 61, y la «Adenda 2026-11-11» anterior.
- La mesa de solo lectura, que no se envía; que el modal no pide `observaciones`; la cantidad, que sigue siendo un entero mayor que cero con su mensaje; «Agregar producto» y «Quitar producto {n}» (no se quita la última); la protección contra el doble envío y la guarda de vigencia al cerrar el modal; el aviso «Comanda n.º {id} creada»; que un error del backend deja el modal abierto con las líneas elegidas.
- **Menús ejecutivos fuera de la pantalla** (S53, S58): `GET /productos` ya excluye los menús del día, y el modal solo ofrece productos, así que el 422 de «solo menús» sigue sin poder producirse desde la pantalla.
- **Aislamiento (AGENTS.md §9.4):** el módulo no importa nada de `atencion` ni de `menus`; usa solo `shared/lib/format` y `shared/components/ui/select`. Los tipos son propios de `reservas`. No se agrega ninguna dependencia.

### Consecuencias y puntos a validar

- Si la carga de productos falla, el modal no permite enviar y no ofrece «Reintentar»: la persona lo cierra y lo vuelve a abrir, que repite la carga. Se eligió así para no agregar un estado de reintento que la solicitud no pidió.
- Un desplegable con todos los productos habilitados es manejable con el catálogo de esta aplicación. Si el catálogo creciera mucho, un buscador de productos sería otro componente y otra HU (lo que ya decía S58).
- El catálogo se lee al abrir el modal y no se vuelve a leer mientras está abierto. Si un producto se deshabilita entretanto, el backend rechaza la línea y el modal muestra su `detalle` (el caso «Producto o menú deshabilitado» de la spec).
- Supuesto: los textos nuevos de esta adenda, igual que el resto de S64, los valida el equipo.
- `tasks.md` y `proposal.md` conservan sus referencias históricas a «(ID)» (D4 y S6); no se reescriben aquí.

### Archivos de esta adenda

`types.ts`, `api.ts` (+ `api.test.ts`), `components/useProductosHabilitados.ts` y `components/SelectorProducto.tsx` (nuevos, cada uno con su `.test.tsx`), `components/ComandaDesdeReservaDialog.tsx`, `components/validarComandaDesdeReserva.ts`, `components/useComandaDesdeReserva.ts` (solo comentarios) y las pruebas de esos archivos y de `pages/ReservasPage.test.tsx`. Con Strict TDD: las pruebas se escribieron primero y fallaron antes de implementar.
