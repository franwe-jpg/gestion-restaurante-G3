# Diseño: HU-M5-04-05 Cancelar una reserva (anticipada y por ausencia)

- **Entradas:** `proposal.md` (aprobada, commit `242ad11`) y `specs/reservas-gestion/spec.md` (aprobada, commit `9f14816`) de este cambio; `openspec/changes/HU-M5-01-02-03/design.md` (Decisiones 1 a 31) para el estilo y las decisiones previas del módulo.
- **Código de base:** la rama `feature/HU-M5-04-05-cancelaciones` después de integrar `develop` (merge `73d2c54`), que ya incluye el PR #211 (ABM, mesas disponibles y modal) y el PR #212 (selección de cliente en el alta). Todo lo que este diseño cita del código se leyó en ese estado.
- **Numeración:** las decisiones siguen desde la última de `HU-M5-01-02-03/design.md`, que es la **Decisión 31** (delta del cliente). Este diseño usa las **Decisiones 32 a 38**.

## Enfoque técnico

Dos transiciones de estado nuevas sobre `Reserva`, `ACTIVA → CANCELADA_ANTICIPADA` y `ACTIVA → CANCELADA_POR_AUSENCIA`, expuestas como dos acciones de negocio `POST` sin cuerpo (D-24, S45) y resueltas en el `service` con lo que el módulo ya tiene: `_obtener` (404), `ahora()` (reloj de la zona del restaurante, parcheable en las pruebas, Decisiones 3 y 20) y `ReglaDeNegocioError` (409, D-25). No hay consulta, `schema`, `model` ni migración nuevos: el efecto completo de cancelar es cambiar `Reserva.estado` y confirmar. La mesa queda libre sola, porque toda la disponibilidad del módulo ya cuenta solo las reservas `ACTIVA` (`exploration.md`, sección 3; Requisito «El estado cancelado excluye la mesa de la disponibilidad automáticamente»).

En el frontend, dos funciones nuevas en `api.ts`, un hook `useCancelarReserva` con la forma de `useBajaMesa` (confirmación, llamada, avisos y recarga) y dos botones nuevos en la columna de acciones de `ReservasTabla`, con la misma regla de visibilidad que «Modificar reserva».

**Nota sobre los supuestos:** este diseño cita los supuestos de la spec de este cambio como «S44 a S52 (HU-M5-04-05)», ya renumerados para no chocar con los S39 a S43 que la spec base usa para el delta del cliente (ver «Contradicciones con el código integrado, ya resueltas en la spec», punto 1).

## Decisiones de arquitectura

### Decisión 32: dos funciones del `service`, `cancelar_anticipada` y `cancelar_por_ausencia`, con una guarda común de estado

**Elección:** en `backend/app/modules/reservas/service.py`, después de `modificar_reserva`:

```python
# Estados terminales de cancelacion: una reserva en cualquiera de ellos "ya fue cancelada".
_CANCELADAS = frozenset({EstadoReserva.CANCELADA_ANTICIPADA, EstadoReserva.CANCELADA_POR_AUSENCIA})


def _obtener_cancelable(db: Session, reserva_id: int) -> Reserva:
    """La reserva existe (404) y no esta cancelada ni atendida (409), en ese orden (S48 HU-M5-04-05)."""
    reserva = _obtener(db, reserva_id)
    if reserva.estado in _CANCELADAS:
        raise ReglaDeNegocioError(f"La reserva {reserva_id} ya fue cancelada")
    if reserva.estado == EstadoReserva.ATENDIDA:
        raise ReglaDeNegocioError(
            f"La reserva {reserva_id} ya fue atendida y no se puede cancelar"
        )
    return reserva


def _llego_su_hora(reserva: Reserva) -> bool:
    """`(fecha, hora) <= ahora()` comparado en minutos, sin minutos de gracia (S46 y S47)."""
    actual = ahora().replace(second=0, microsecond=0)
    return datetime.combine(reserva.fecha, reserva.hora) <= actual


def cancelar_anticipada(db: Session, reserva_id: int) -> ReservaSalida:
    """HU-M5-04: una reserva ACTIVA cuya hora todavia no llego pasa a CANCELADA_ANTICIPADA."""
    reserva = _obtener_cancelable(db, reserva_id)
    if _llego_su_hora(reserva):
        raise ReglaDeNegocioError(
            f"La reserva {reserva_id} ya llegó a su hora; si el cliente no vino, "
            "cancélela por ausencia"
        )
    reserva.estado = EstadoReserva.CANCELADA_ANTICIPADA
    db.commit()
    return ReservaSalida.model_validate(reserva)


def cancelar_por_ausencia(db: Session, reserva_id: int) -> ReservaSalida:
    """HU-M5-05: una reserva ACTIVA cuya hora ya llego pasa a CANCELADA_POR_AUSENCIA."""
    reserva = _obtener_cancelable(db, reserva_id)
    if not _llego_su_hora(reserva):
        raise ReglaDeNegocioError(
            f"La reserva {reserva_id} todavía no llegó a su hora y no se puede cancelar "
            "por ausencia"
        )
    reserva.estado = EstadoReserva.CANCELADA_POR_AUSENCIA
    db.commit()
    return ReservaSalida.model_validate(reserva)
```

- **Orden de verificación, idéntico en las dos funciones y fijado por la spec:** existencia (404, el `_obtener` actual, sin cambios), ya cancelada en cualquiera de los dos estados (409), `ATENDIDA` (409) y, por último, la regla de hora de cada función (409). El orden importa en dos casos que se prueban: una reserva `ATENDIDA` con hora futura responde «ya fue atendida», no la regla de hora; una reserva cancelada con hora pasada responde «ya fue cancelada».
- **Guarda común `_obtener_cancelable`:** las tres primeras verificaciones son las mismas en las dos HU, con los mismos mensajes; se escriben una sola vez para que un cambio de texto o de orden no se aplique solo en una de las dos. Sigue el estilo de `_obtener` y `_validar_mesa`: una función privada que lee una vez y lanza la excepción compartida.
- **La regla de hora queda en cada función:** son reglas opuestas con mensajes distintos (S46 y S47 HU-M5-04-05). Lo único compartido es el predicado `_llego_su_hora`, que define **un solo límite**: con el mismo predicado negado en un lado y afirmado en el otro, las dos reglas son complementarias por construcción y no puede quedar un minuto en el que ninguna (o las dos) se pueda aplicar. Cada función decide y redacta su propio 409.
- **Comparación en minutos:** `ahora()` se trunca a minutos y la hora de la reserva ya tiene precisión de minutos (S16, `_hora_en_minutos`). Es la misma precisión que `_validar_momento`, que en el alta rechaza `hora <= ahora`: una reserva que el alta ya no aceptaría para ese minuto es exactamente la que «ya llegó a su hora». Con `AHORA = 12:00`, una reserva de las 12:00 de hoy ya llegó (anticipada 409, ausencia 200) y una de las 12:01 todavía no (anticipada 200, ausencia 409). `datetime.combine` resuelve también los otros días sin código aparte: una reserva de ayer siempre llegó, una de mañana nunca. Sin límite de días hacia atrás (S47 HU-M5-04-05).
- **Efecto completo:** asignar `reserva.estado` y `db.commit()`. No cambia ningún otro campo (`mesa_id`, `cliente_id`, `fecha`, `hora` y `cantidad_personas` se conservan, que es lo que necesita el reporte de HU-M5-07, S49 HU-M5-04-05) y **no hay ninguna llamada al puente ni a M3**: la «liberación» de la mesa es automática (`exploration.md`, sección 3; Decisión 15), porque `repository.existe_reserva_activa`, `repository.ids_de_mesas_con_reserva_activa` y el índice único parcial `ux_reservas_mesa_fecha_hora_activa` filtran por `estado = 'ACTIVA'`.
- **`db.commit()` directo y no `_confirmar`:** `_confirmar` existe para atrapar el `IntegrityError` del índice único cuando una reserva **entra** a un turno (R13, Decisión 5). Pasar de `ACTIVA` a cancelada **saca** la fila del índice parcial, así que ese error no puede ocurrir y envolverlo agregaría un camino muerto sin prueba posible. La reserva ya es persistente en la sesión: no hace falta `repository.agregar`. Confirmar en el `service` es lo que ya hace el módulo (`_confirmar`).
- **Concurrencia:** sin bloqueo (S51 HU-M5-04-05). Si dos pedidos leen la reserva `ACTIVA` antes del primer `commit`, los dos responden 200 y el último estado escrito gana; si el segundo lee después, responde 409 «ya fue cancelada». Se acepta por S51.
- **Tamaño:** cada función tiene menos de 15 líneas y complejidad 2 o 3 (RNF-MAN-05).

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| Una sola función `cancelar(db, id, motivo)` | Mezcla dos reglas opuestas en un `if motivo`, contra S45 y D-24 («el cambio de estado debe ser explícito en la API y en los servicios»); el diagrama de clases declara `cancelarAnticipada()` y `cancelarPorAusencia()` |
| Reutilizar `_validar_activa` | Su mensaje es «no está activa y no se puede modificar»; la spec pide «ya fue cancelada» y «ya fue atendida y no se puede cancelar» (CA2 de HU-M5-04). Cambiar su texto rompería HU-M5-02 |
| Repetir las tres verificaciones en cada función | Duplica mensajes y orden; un cambio futuro podría quedar en una sola HU |
| Comparar tuplas `(fecha, hora, minuto)` como `_validar_momento` | `_validar_momento` solo compara horas del mismo día porque antes descarta las fechas pasadas; acá hace falta ordenar fechas y horas juntas, que `datetime.combine` resuelve en una línea |
| Pasar por `_confirmar` | Ver arriba: el `IntegrityError` es imposible en esta transición |
| Métodos en el `model` (`reserva.cancelar_anticipada()`) | Las reglas viven en el `service` en todo el proyecto (D-02); el `model` del módulo no tiene comportamiento |

**Justificación:** D-02 (reglas en el `service`), D-24 (transición explícita), D-25 (409 para conflicto con una regla de negocio), S46 a S48 HU-M5-04-05 y el hallazgo de liberación automática de `exploration.md`.

### Decisión 33: dos rutas `POST` sin cuerpo que devuelven `ReservaSalida`

**Elección:** en `backend/app/modules/reservas/router.py`, al final del archivo:

```python
@router.post("/reservas/{reserva_id}/cancelar-anticipada")
def cancelar_anticipada(reserva_id: int, db: Sesion) -> ReservaSalida:
    return service.cancelar_anticipada(db, reserva_id)


@router.post("/reservas/{reserva_id}/cancelar-por-ausencia")
def cancelar_por_ausencia(reserva_id: int, db: Sesion) -> ReservaSalida:
    return service.cancelar_por_ausencia(db, reserva_id)
```

- **200 por defecto:** `@router.post` sin `status_code` responde 200, que es lo que pide la spec (D-25: «200 consulta o modificación»; no es una creación). Se deja así, sin `status_code=status.HTTP_200_OK` explícito, como `GET` y `PUT` del mismo archivo.
- **Sin cuerpo:** no se declara ningún parámetro de cuerpo; FastAPI ignora lo que llegue. Por eso no aparece ningún 422 nuevo (spec, «Contrato de la API»). Un `reserva_id` no entero sigue respondiendo 422 de ruta, como hoy en `GET` y `PUT /reservas/{reserva_id}`.
- **Sin `schema` nuevo:** `ReservaSalida` ya trae `id`, `mesa_id`, `cliente_id`, `fecha`, `hora` (serializada `HH:MM`), `cantidad_personas` y `estado: EstadoReserva`, que incluye los dos estados de cancelación. Es todo lo que la spec pide en la respuesta.
- **Sin choque de rutas:** las dos rutas nuevas son `POST` sobre `/reservas/{reserva_id}/<verbo>`, una ruta de **tres** segmentos. `GET /reservas/{reserva_id}` y `PUT /reservas/{reserva_id}` tienen dos segmentos y otro método. Starlette compara la ruta completa (`{reserva_id}` no cruza una `/`) y FastAPI elige por método y ruta juntos, así que el orden de declaración no importa. El problema de la Decisión 13 (`GET /reservas/mesas-disponibles` capturado por `GET /reservas/{reserva_id}`) era otro: dos rutas `GET` de dos segmentos donde el parámetro aceptaba el literal. Acá esa situación no existe; la pregunta queda cerrada y no hace falta comentario de orden.
- El `router` solo delega (D-02) y no captura excepciones: el manejador global de `main.py` convierte `NoEncontradoError` y `ReglaDeNegocioError` en 404 y 409 con `{"detalle": ...}` (D-26).

**Alternativas descartadas:** una ruta `POST /reservas/{id}/cancelar` con `{"motivo": ...}` (descartada por S45 HU-M5-04-05, confirmado); `PUT` o `PATCH` sobre la reserva con el estado en el cuerpo (D-24 lo descarta y `ReservaModificar` prohíbe `estado`, S15); `DELETE` (no es una baja física: la reserva se conserva para el reporte).

**Justificación:** D-22, D-24, D-25, D-26 y S45 HU-M5-04-05.

### Decisión 34: sin cambios en `repository`, `models`, `schemas` ni `puente`

**Elección:** las dos funciones usan `_obtener` (que ya devuelve la entidad completa con `repository.obtener`, `db.get(Reserva, id)`) y un `db.commit()`. No se agrega ninguna consulta ni función al `repository`; `models.py`, `schemas.py` y `puente.py` quedan iguales.

**Justificación:** la transición no necesita leer otra cosa que la propia reserva, y la disponibilidad ya filtra por `ACTIVA` (Decisión 15). Los cuatro valores de `EstadoReserva` existen en el enumerado y en la migración `d6f8a0c2e4b6_crea_reservas.py` desde HU-M5-01-02-03, así que tampoco hay migración (Requisito «Aislamiento del módulo»).

### Decisión 35: dos funciones nuevas en `api.ts` con el patrón de acción sin cuerpo

**Elección:** en `frontend/src/modules/reservas/api.ts`, después de `modificarReserva`:

```ts
/** HU-M5-04: `POST /reservas/{id}/cancelar-anticipada`, sin cuerpo. */
export function cancelarReservaAnticipada(id: number): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, Record<string, never>>(`/reservas/${id}/cancelar-anticipada`, {});
}

/** HU-M5-05: `POST /reservas/{id}/cancelar-por-ausencia`, sin cuerpo. */
export function cancelarReservaPorAusencia(id: number): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, Record<string, never>>(`/reservas/${id}/cancelar-por-ausencia`, {});
}
```

- `api.ts` de `reservas` todavía no tiene ninguna acción sin cuerpo, pero el patrón exacto `clienteHttp.post<T, Record<string, never>>(url, {})` ya existe en el proyecto: `salon/api.ts:18` (`/sectores/{id}/baja`), `atencion/api.ts:50` (`/comandas/{id}/cerrar`), `productos/api.ts:46` y `menus/api.ts:39`. Se copia tal cual (D-16). Prettier decidirá si la línea se parte.
- `types.ts` no cambia: `Reserva` y `EstadoReserva` ya cubren la respuesta.

**Justificación:** D-16 y la propuesta, sección «Frontend».

### Decisión 36: un hook `useCancelarReserva` que expone dos acciones con una configuración por motivo

**Elección:** archivo nuevo `frontend/src/modules/reservas/components/useCancelarReserva.ts`, con la forma de `useBajaMesa` (`frontend/src/modules/salon/components/useBajaMesa.ts`):

```ts
import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import type { RespuestaApi } from '../../../shared/types';
import { cancelarReservaAnticipada, cancelarReservaPorAusencia } from '../api';
import type { Reserva } from '../types';

export interface OpcionesCancelarReserva {
  onCancelada: () => void;
}

interface Cancelacion {
  titulo: string;
  descripcion: string;
  avisoExito: string;
  llamar: (id: number) => Promise<RespuestaApi<Reserva>>;
}

/** Textos de S52 (HU-M5-04-05) y endpoint de cada motivo. */
const ANTICIPADA: Cancelacion = {
  titulo: '¿Cancelar la reserva?',
  descripcion: 'La mesa quedará disponible para ese turno.',
  avisoExito: 'Reserva cancelada',
  llamar: cancelarReservaAnticipada,
};

const POR_AUSENCIA: Cancelacion = {
  titulo: '¿Cancelar por ausencia?',
  descripcion: 'La mesa quedará disponible para ese turno y se registra que el cliente no vino.',
  avisoExito: 'Reserva cancelada por ausencia',
  llamar: cancelarReservaPorAusencia,
};

/** HU-M5-04 y HU-M5-05: confirmación, cancelación y avisos de una reserva del listado. */
export function useCancelarReserva({ onCancelada }: OpcionesCancelarReserva) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [cancelando, setCancelando] = useState(false);

  const cancelar = async (reserva: Pick<Reserva, 'id'>, cancelacion: Cancelacion) => {
    const aceptado = await confirmar({
      titulo: cancelacion.titulo,
      descripcion: cancelacion.descripcion,
      textoConfirmar: 'Cancelar',
      textoCancelar: 'Volver',
      variante: 'danger',
    });
    if (!aceptado) return;

    setCancelando(true);
    const respuesta = await cancelacion.llamar(reserva.id);
    setCancelando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: cancelacion.avisoExito, variante: 'success' });
      onCancelada();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo cancelar la reserva',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return {
    cancelando,
    cancelarAnticipada: (reserva: Pick<Reserva, 'id'>) => cancelar(reserva, ANTICIPADA),
    cancelarPorAusencia: (reserva: Pick<Reserva, 'id'>) => cancelar(reserva, POR_AUSENCIA),
  };
}
```

- **Por qué un hook con dos acciones y no un parámetro `motivo` ni dos hooks:**
  - `useBajaMesa` hace una sola cosa con un solo texto. Las dos cancelaciones son **dos acciones distintas para la persona** (dos botones, dos diálogos, dos avisos), así que el hook las expone como dos funciones con nombre propio, `cancelarAnticipada` y `cancelarPorAusencia`, igual que la API tiene dos rutas (S45). Quien las usa no elige un motivo con un texto: llama a la acción que corresponde, y TypeScript impide una tercera.
  - Pero el **flujo** (confirmar, llamar, avisar, recargar o avisar el error) es idéntico. Repetirlo en dos hooks duplicaría unas 30 líneas y sus pruebas; un `if (motivo === ...)` dentro del flujo mezclaría textos y endpoints con la lógica. La diferencia se expresa como **datos** (`ANTICIPADA` y `POR_AUSENCIA`, del tipo `Cancelacion`) y el flujo se escribe una vez en `cancelar`, que es privada.
  - La página necesita las dos acciones con la misma recarga: un solo hook se instancia una vez con un solo `onCancelada`, y una sola instancia de `useConfirm` y `useToast`.
- **Textos (`Supuesto:` S52 HU-M5-04-05, a validar por el equipo):** títulos «¿Cancelar la reserva?» y «¿Cancelar por ausencia?»; descripciones «La mesa quedará disponible para ese turno.» y «La mesa quedará disponible para ese turno y se registra que el cliente no vino.»; `textoConfirmar: 'Cancelar'`, `textoCancelar: 'Volver'`, `variante: 'danger'`; avisos de éxito «Reserva cancelada» y «Reserva cancelada por ausencia», variante `success`. Siguen el tono de `DESCRIPCION_BAJA` («La mesa se quitará del salón y no se podrá volver a usar.»): una oración que dice la consecuencia.
- **`Supuesto:` nuevo de este diseño (no lo fija S52):** el título del aviso de error es «No se pudo cancelar la reserva» en los dos motivos, con el `detalle` de la API como descripción (`respuesta.error`), en el mismo formato que «No se pudo eliminar la mesa» de `useBajaMesa`. Así el 409 «La reserva 22 todavía no llegó a su hora y no se puede cancelar por ausencia» llega textual a la persona (S50 HU-M5-04-05).
- **Errores:** ante 404 o 409 el hook solo muestra el aviso; no llama a `onCancelada`, así que el listado no se vuelve a pedir y la fila queda igual (escenario «Un 409 muestra el aviso y no cambia la fila»). El hook no guarda ninguna copia local de la fila: la tabla muestra lo que trae el `GET`, y la próxima recarga (por ejemplo, al cambiar de día o al cancelar otra) trae el estado real.
- **Cancelar el diálogo:** `aceptado === false` corta antes de cualquier efecto (escenario «Cancelar el diálogo de confirmación no hace nada»).
- **`cancelando`:** se devuelve por paridad con `eliminando` de `useBajaMesa` y para pruebas; la página no lo usa en este cambio (tampoco `SalonPage` usa `eliminando`).
- **Sin guarda de vigencia (Decisión 23):** el hook vive en `ReservasPage`, que no se desmonta mientras la respuesta está en curso; no hay un modal que pueda cerrarse y reabrirse, como en `useFormularioReserva`. `useBajaMesa` tampoco la tiene.
- El parámetro es `Pick<Reserva, 'id'>`, como `useBajaMesa` usa `Pick<Mesa, 'id' | 'numero'>`: los títulos de S52 no nombran la reserva, así que solo hace falta el `id`.
- **Exportación:** `SalonPage` importa `useBajaMesa` directamente de `../components/useBajaMesa`; `ReservasPage` importa `useCancelarReserva` igual, sin tocar `components/index.ts` (que solo exporta componentes).

**Alternativas descartadas:**

| Opción | Problema |
| --- | --- |
| Un hook con `cancelar(reserva, motivo: 'anticipada' \| 'por_ausencia')` | La persona hace dos acciones distintas y la tabla tiene dos callbacks; un texto de motivo vuelve a unir en el frontend lo que S45 separó, y los textos quedan en un `switch` dentro del flujo |
| Dos hooks en dos archivos (`useCancelacionAnticipada`, `useCancelacionPorAusencia`) | Copia del flujo completo y de sus pruebas; la página instancia dos hooks con la misma recarga |
| Calcular en el navegador si la hora ya llegó y deshabilitar el botón | Contra S50 HU-M5-04-05: depende del reloj del navegador; el backend decide |

**Justificación:** D-16, el patrón de `useBajaMesa`, S45, S50 y S52 HU-M5-04-05.

### Decisión 37: dos acciones nuevas en la columna de `ReservasTabla`, con la misma regla que «Modificar reserva»

**Elección:** en `frontend/src/modules/reservas/components/ReservasTabla.tsx`:

- `ReservasTablaProps` suma `onCancelarAnticipada: (reserva: Reserva) => void` y `onCancelarPorAusencia: (reserva: Reserva) => void`, **obligatorias** como `onModificar`, con el mismo comentario de regla («Se ofrecen solo en las filas `ACTIVA`»).
- `columnaAcciones` deja de recibir una sola función y recibe un objeto `AccionesDeFila` con las tres (`Pick<ReservasTablaProps, 'onModificar' | 'onCancelarAnticipada' | 'onCancelarPorAusencia'>`), para no pasar tres funciones sueltas por posición.
- La condición se conserva **exactamente**: `r.estado === 'ACTIVA' ? (...) : null`, la misma expresión que hoy oculta «Modificar reserva». Lo que cambia es el contenido: un `<div className="flex justify-end gap-1">` con los tres botones `variant="ghost" size="sm"`, en este orden: «Modificar reserva» (`Pencil`, sin cambios), «Cancelar reserva» (`aria-label="Cancelar reserva"`, ícono sugerido `CalendarX`) y «Cancelar por ausencia» (`aria-label="Cancelar por ausencia"`, ícono sugerido `UserX`), cada ícono con `aria-hidden="true"` y cada `onClick` llamando a su callback con la fila.
- Ninguna lógica de hora en la tabla (S50 HU-M5-04-05): toda fila `ACTIVA` muestra las dos acciones.

**Íconos:** `lucide-react` ya es dependencia (la tabla usa `Pencil` y `CalendarDays`); `CalendarX` y `UserX` son íconos de la misma biblioteca, sin dependencia nueva. Si el equipo prefiere otros, es un cambio de una línea; no hay prueba que dependa del ícono (las pruebas buscan por `aria-label`).

**Maqueta:** la maqueta tiene un solo botón «Cancelar reserva»; se agregan dos porque las HU piden dos cancelaciones distintas. La diferencia se anota en el PR (AGENTS.md §2 y §5).

**Alternativas descartadas:** un menú desplegable de acciones (no existe en `shared/components/ui/` y agregarlo toca `shared/`); botones con texto visible (la columna actual es de íconos con `aria-label`, y tres textos ensanchan la tabla); props opcionales (permitirían montar la tabla sin las acciones que la spec exige en toda fila `ACTIVA`).

**Justificación:** spec, Requisito «Dos acciones nuevas en el listado de reservas»; HU-M5-02 CA 5 (misma regla de visibilidad); D-16.

### Decisión 38: conexión en `ReservasPage` con el patrón de `SalonPage`

**Elección:** en `frontend/src/modules/reservas/pages/ReservasPage.tsx`:

```tsx
export function ReservasPage() {
  const listado = useListadoReservas();
  const { cancelarAnticipada, cancelarPorAusencia } = useCancelarReserva({
    onCancelada: listado.reservas.recargar,
  });
  // ...panel, alGuardar y alCambiarModal sin cambios...
      <ListadoDelDia
        listado={listado}
        onModificar={(reserva) => setPanel({ edicion: reserva })}
        onCancelarAnticipada={(reserva) => void cancelarAnticipada(reserva)}
        onCancelarPorAusencia={(reserva) => void cancelarPorAusencia(reserva)}
      />
```

- `ListadoDelDiaProps` suma las dos props y `ListadoDelDia` las pasa tal cual a `ReservasTabla`.
- `void cancelarAnticipada(reserva)` es el mismo patrón que `onEliminar={(mesa) => void eliminar(mesa)}` de `SalonPage.tsx:104` (la promesa se descarta a propósito; el hook maneja sus propios errores y avisos).
- La recarga en caso de éxito es `listado.reservas.recargar`, la misma que usa `alGuardar` después de guardar el modal: la fila cancelada desaparece si el filtro es «Activas» (el filtro por defecto) o muestra su nuevo estado si el filtro es «Todas».
- No hay interacción con el modal: con el modal abierto, el fondo del `Dialog` tapa la tabla (Decisión 22), así que las acciones de cancelación no se alcanzan.

**Justificación:** mismo cableado que `SalonPage` (hook en la página, callbacks finos hacia la tabla) y que el resto de `ReservasPage` (recarga del listado después de un cambio).

## Flujo de datos

```text
POST /api/v1/reservas/{id}/cancelar-anticipada        POST /api/v1/reservas/{id}/cancelar-por-ausencia
        │                                                        │
        ▼                                                        ▼
router.cancelar_anticipada                              router.cancelar_por_ausencia
        │                                                        │
        ▼                                                        ▼
service.cancelar_anticipada ──┐                ┌── service.cancelar_por_ausencia
                              ▼                ▼
                     _obtener_cancelable(db, id)
                       ├─ _obtener → repository.obtener → 404 si no existe
                       ├─ estado en _CANCELADAS → 409 «ya fue cancelada»
                       └─ estado ATENDIDA       → 409 «ya fue atendida...»
                              │                │
     _llego_su_hora → 409 «ya llegó...»   not _llego_su_hora → 409 «todavía no llegó...»
                              │                │
          estado = CANCELADA_ANTICIPADA   estado = CANCELADA_POR_AUSENCIA
                              └──── db.commit() ────┘
                                      │
                                      ▼
                         200 ReservaSalida (estado nuevo)

Efecto lateral sin código: repository.existe_reserva_activa, ids_de_mesas_con_reserva_activa
y ux_reservas_mesa_fecha_hora_activa dejan de contar la fila (filtran estado = 'ACTIVA').
```

```text
ReservasTabla (fila ACTIVA) ── clic «Cancelar reserva» / «Cancelar por ausencia»
        │
        ▼
ReservasPage: void cancelarAnticipada(r) / void cancelarPorAusencia(r)
        │
        ▼
useCancelarReserva.cancelar(r, ANTICIPADA | POR_AUSENCIA)
        ├─ useConfirm(...) → false: termina sin efectos
        └─ true → api.ts cancelarReserva* (POST sin cuerpo)
                   ├─ exito: toast success + onCancelada() → listado.reservas.recargar()
                   └─ error: toast danger con el detalle; sin recarga
```

## Contratos e interfaces

| Capa | Nuevo | Firma |
| --- | --- | --- |
| `service` | `cancelar_anticipada` | `(db: Session, reserva_id: int) -> ReservaSalida` |
| `service` | `cancelar_por_ausencia` | `(db: Session, reserva_id: int) -> ReservaSalida` |
| `service` (privadas) | `_obtener_cancelable`, `_llego_su_hora`, `_CANCELADAS` | ver Decisión 32 |
| `router` | `POST /reservas/{reserva_id}/cancelar-anticipada` | sin cuerpo; 200 `ReservaSalida`; 404, 409 |
| `router` | `POST /reservas/{reserva_id}/cancelar-por-ausencia` | sin cuerpo; 200 `ReservaSalida`; 404, 409 |
| `api.ts` | `cancelarReservaAnticipada`, `cancelarReservaPorAusencia` | `(id: number) => Promise<RespuestaApi<Reserva>>` |
| hook | `useCancelarReserva` | `({ onCancelada }) => { cancelando, cancelarAnticipada, cancelarPorAusencia }` |
| tabla | `ReservasTablaProps` | `+ onCancelarAnticipada`, `+ onCancelarPorAusencia`: `(reserva: Reserva) => void` |

Mensajes exactos (texto de la spec, con el `id` pedido):

| Caso | `detalle` | Código |
| --- | --- | --- |
| No existe | `La reserva {id} no existe` | 404 |
| Ya cancelada (cualquiera de los dos estados) | `La reserva {id} ya fue cancelada` | 409 |
| `ATENDIDA` | `La reserva {id} ya fue atendida y no se puede cancelar` | 409 |
| Anticipada con la hora ya llegada | `La reserva {id} ya llegó a su hora; si el cliente no vino, cancélela por ausencia` | 409 |
| Por ausencia con la hora todavía no llegada | `La reserva {id} todavía no llegó a su hora y no se puede cancelar por ausencia` | 409 |

## Estrategia de pruebas (Strict TDD)

Primero la prueba en rojo, después el código. Todas las pruebas usan el reloj fijo `AHORA = datetime(2026, 11, 2, 12, 0)` (fixture `reloj`, autouse) y el `DoblePuente` (autouse, mesas 5 y 6 `LIBRE`, cliente 7) tal como están en `backend/tests/modules/reservas/conftest.py`. **No hace falta ninguna fixture nueva:**

- `fabrica_reserva(mesa_id=..., fecha=..., hora=..., estado=...)` ya acepta todos los datos de los escenarios, incluido el `estado` inicial (`ATENDIDA`, `CANCELADA_*`).
- **Límite exacto:** una reserva con `fecha=date(2026, 11, 2)` y `hora=time(12, 0)` coincide con `AHORA` al minuto; sirve tanto para «La hora de la reserva ya llegó» (anticipada, 409) como para «Límite exacto» (ausencia, 200). `time(12, 1)` cubre el minuto siguiente en los dos sentidos. No hace falta mover el reloj.
- **Ids:** los `id` 10 a 31 de los escenarios son ilustrativos; las pruebas usan el `id` que devuelve la fábrica y arman el mensaje esperado con él. `999` se usa tal cual para la reserva inexistente.
- **«Otro `cliente_id`»** del escenario de la reserva nueva en el mismo turno: la fábrica crea con `cliente_id=1` por defecto y el alta nueva usa el cliente 7, que el `DoblePuente` ya tiene.

| Capa | Qué se prueba | Cómo |
| --- | --- | --- |
| `test_service.py` | Anticipada: válida (21:30), 12:01 válida, 12:00 → 409, fecha anterior (2026-11-01) → 409, ya cancelada (parametrizada con los dos estados) → 409, `ATENDIDA` → 409, inexistente → 404; el estado persistido y los demás campos sin cambios | `service.cancelar_anticipada(db, id)` y relectura con `db.get` |
| `test_service.py` | Ausencia: válida (11:30), 12:00 → 200, 12:01 → 409, día siguiente → 409, canceladas/atendida parametrizadas → 409, inexistente → 404 | ídem con `cancelar_por_ausencia` |
| `test_service.py` | Orden: `ATENDIDA` con hora futura responde «ya fue atendida» en las dos; cancelada con hora pasada responde «ya fue cancelada» en las dos | parametrizadas |
| `test_service.py` | Liberación automática: tras cancelar, `repository.ids_de_mesas_con_reserva_activa` y `existe_reserva_activa` ya no cuentan la mesa | en las dos HU |
| `test_router.py` | 200 con el `estado` nuevo, 404 y 409 con `{"detalle": ...}` en las dos rutas | `TestClient`, `RUTA` + `/{id}/cancelar-...` |
| `test_router.py` | HU-M5-04 CA1 completo: tras cancelar, `GET /reservas/mesas-disponibles?fecha=2026-11-02&hora=21:30` incluye la mesa 5; `POST /reservas` en el mismo turno con el cliente 7 responde 201 | dos pedidos seguidos |
| `test_router.py` | El estado de la mesa en M3 no cambia | `puente_real` + `mesas_en_m3(1)`, reserva en esa mesa, cancelar y releer `Mesa.estado == LIBRE` |
| `api.test.ts` | Las dos funciones llaman a `clienteHttp.post` con la URL y `{}` | igual que la prueba de `modificarReserva` |
| `useCancelarReserva.test.tsx` | Por cada acción: confirmar → llama a su API con el `id`, toast `success` con su texto, `onCancelada` una vez; los textos del diálogo; cancelar el diálogo → sin API ni toast; 409 → toast `danger` con el `detalle` y sin `onCancelada` | `renderHook` con `ConfirmContext.Provider` y `ToastContext.Provider`, como `useBajaMesa.test.tsx` |
| `ReservasTabla.test.tsx` | Fila `ACTIVA` muestra las tres acciones; `ATENDIDA` (y las canceladas) ninguna; cada botón llama a su callback con la fila | `mostrar(...)` con `vi.fn()` por defecto para las props nuevas |
| `ReservasPage.test.tsx` | Confirmar «Cancelar reserva» llama a `POST .../1/cancelar-anticipada` y vuelve a pedir el listado; ídem «Cancelar por ausencia»; 409 no vuelve a pedir el listado | `abrir()` suma un `ConfirmContext.Provider` con un `confirmar` simulado (hoy solo envuelve con `ToastContext`; sin proveedor, `useConfirm` devuelve siempre `false`) |

Las dos pruebas del backend que la spec pide a través de `GET /reservas/mesas-disponibles` para un turno pasado (11:30) no se pueden escribir así con el código actual: ver «Contradicciones con el código integrado», punto 2.

Cobertura esperada por encima de los umbrales (70 % y 60 %): todas las ramas nuevas tienen prueba.

## Matriz de amenazas

N/A: el cambio agrega dos rutas HTTP de la API en proceso y un hook del frontend; no agrega enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS o PR, clasificación de archivos ejecutables ni integración de procesos. La lectura es por clave primaria con SQLAlchemy (D-07, RNF-SEG-05) y los errores no exponen trazas (D-26).

## Archivos a crear o modificar

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/service.py` | Modificar | `_CANCELADAS`, `_obtener_cancelable`, `_llego_su_hora`, `cancelar_anticipada`, `cancelar_por_ausencia` |
| `backend/app/modules/reservas/router.py` | Modificar | Dos rutas `POST` sin cuerpo |
| `backend/tests/modules/reservas/test_service.py` | Modificar | Pruebas de las dos funciones, sus límites, su orden y la liberación automática |
| `backend/tests/modules/reservas/test_router.py` | Modificar | Pruebas de las dos rutas, CA1 de punta a punta y mesa de M3 sin cambios |
| `frontend/src/modules/reservas/api.ts` | Modificar | `cancelarReservaAnticipada`, `cancelarReservaPorAusencia` |
| `frontend/src/modules/reservas/api.test.ts` | Modificar | Pruebas de las dos funciones |
| `frontend/src/modules/reservas/components/useCancelarReserva.ts` | Crear | Hook de la Decisión 36 |
| `frontend/src/modules/reservas/components/useCancelarReserva.test.tsx` | Crear | Pruebas del hook |
| `frontend/src/modules/reservas/components/ReservasTabla.tsx` | Modificar | Dos props y dos botones en las filas `ACTIVA` |
| `frontend/src/modules/reservas/components/ReservasTabla.test.tsx` | Modificar | Visibilidad y callbacks de las acciones nuevas |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` | Modificar | Hook y conexión con la tabla |
| `frontend/src/modules/reservas/pages/ReservasPage.test.tsx` | Modificar | Proveedor de confirmación y flujos de las dos cancelaciones |
| `models.py`, `schemas.py`, `repository.py`, `puente.py`, `conftest.py`, `types.ts`, `components/index.ts` | Sin cambios | Ver Decisiones 34 a 36 |
| `alembic/`, `salon/`, `atencion/`, `shared/` (backend y frontend), `backend/pyproject.toml` | Sin cambios | Requisito «Aislamiento del módulo» |

## Estimación de líneas (punto de control, no bloqueo)

Líneas escritas (agregadas más quitadas), sin archivos generados:

| Lado | Código | Pruebas | Total estimado | Límite del proyecto |
| --- | --- | --- | --- | --- |
| `backend/` | `service` 35 a 45, `router` 8 a 10 | `test_service` 170 a 220, `test_router` 120 a 170 | **330 a 445** | 800 |
| `frontend/` | `api.ts` 12 a 16, hook 60 a 70, tabla 25 a 40, página 10 a 15 | `api.test` 25 a 40, hook 120 a 160, tabla 35 a 55, página 60 a 90 | **350 a 490** | 800 |

Los dos lados quedan muy por debajo del límite de 800 de AGENTS.md §4. Contra el heurístico de 400 líneas por tarea de la sesión, cada lado queda cerca o algo por encima, casi todo en pruebas; con la estrategia de entrega `single-pr` el cambio completo (680 a 935 líneas) va en un solo PR, como pide AGENTS.md §4. No se recortan pruebas para entrar en el número.

## Migración y puesta en marcha

Sin migración. `CANCELADA_ANTICIPADA` y `CANCELADA_POR_AUSENCIA` existen en `EstadoReserva` y en `d6f8a0c2e4b6_crea_reservas.py` desde HU-M5-01-02-03; `alembic heads` no cambia. Sin configuración nueva ni variables de entorno.

## Riesgos y reversión

| Riesgo | Mitigación |
| --- | --- |
| El equipo cambia el límite de la ausencia (tolerancia, S47 HU-M5-04-05) | Es una sola función, `_llego_su_hora`, con pruebas en 12:00 y 12:01 en los dos sentidos |
| El equipo cambia los textos de S52 o el título del aviso de error | Son constantes de `useCancelarReserva.ts` y sus pruebas |
| Dos cancelaciones simultáneas de la misma reserva responden 200 las dos (S51) | Aceptado por S51; el resultado final sigue siendo un estado cancelado válido |
| Escenarios de la spec que dependían de `GET /mesas-disponibles` para un turno pasado | Ya corregido: se reescribieron a nivel de `repository` (ver «Contradicciones», punto 2) |

Probabilidades a estimar por el equipo (AGENTS.md §9.9).

**Reversión:** el cambio no toca el esquema. Antes de integrar, descartar la rama; ya integrado, `git revert -m 1 <merge>`. No hace falta `alembic downgrade`. Las reservas canceladas mientras el cambio estuvo activo conservan un estado válido con o sin este código. Verificación: `pytest`, `npm test` y `alembic heads` sin cambios.

## Contradicciones con el código integrado, ya resueltas en la spec

El diseño las detectó; la corrección se hizo directamente en `specs/reservas-gestion/spec.md` de este cambio (fuera de la superficie de este documento), no aquí.

1. **Supuestos duplicados, corregido.** La spec de este cambio numeraba sus supuestos desde S39, chocando con los S39 a S43 que la spec base (`HU-M5-01-02-03/specs/reservas-gestion/spec.md`) ya usa para el delta del cliente (el código los cita de verdad: `service.py`, `_validar_un_cliente` dice «S39» y `_id_del_cliente` dice «S41»; `schemas.py` dice «S39» y «S40»; esos tres son de la spec base y no cambian). Los supuestos de este cambio se renumeraron a S44–S52; el sufijo «HU-M5-04-05» que usa este diseño ya no hace falta para distinguirlos, pero se mantiene por claridad.
2. **Mesas disponibles para un turno pasado, corregido.** Los dos escenarios que probaban la liberación de una cancelación por ausencia con `GET /reservas/mesas-disponibles` para un turno ya pasado no podían cumplirse: ese endpoint responde 422 ante cualquier turno pasado (`_validar_momento`, S32; probado en `test_get_mesas_disponibles_turno_pasado_devuelve_422`), y una cancelación por ausencia siempre es de un turno ya pasado. Los dos escenarios se reescribieron en la spec para probar la liberación a nivel de `repository` (`ids_de_mesas_con_reserva_activa` y `existe_reserva_activa`), que es la misma consulta que usa el endpoint. Este diseño ya incluye esas pruebas en `test_service.py` (Decisión 32); no cambia nada más.
3. **Proposal desactualizada en la base de la rama:** la propuesta dice que la rama nace de `feature/HU-M5-01-02-03-abm-reservas-v2` con el PR #211 sin integrar; hoy #211 ya está en `develop` y la rama lo integró. No cambia el diseño; solo deja sin efecto la dependencia de la propuesta.

Ningún otro supuesto de la spec choca con el código integrado: `_obtener`, `_validar_activa` y `ahora()` siguen con el mismo comportamiento; `ReservaSalida` no cambió; el alta con `cliente_id` sigue funcionando con el cliente 7 del `DoblePuente`.

## Preguntas abiertas

- [ ] Validación del equipo de S47 a S52 HU-M5-04-05 y del `Supuesto:` del título del aviso de error («No se pudo cancelar la reserva»).
