import { CalendarDays, CalendarX, ClipboardList, Pencil, UserX } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { Reserva } from '../types';

import { atencionDeReserva } from './atencionDeReserva';
import { ESTADOS_RESERVA } from './estadosReserva';
import { useAhoraDelRestaurante } from './useAhoraDelRestaurante';

export interface ReservasTablaProps {
  reservas: Reserva[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  /**
   * Se ofrece solo en las filas `ACTIVA` y queda deshabilitada hasta el día y la hora de la reserva
   * en la hora del restaurante (HU-M5-06); el backend sigue decidiendo (S59).
   */
  onCrearComanda: (reserva: Reserva) => void;
  /** Se ofrece solo en las filas `ACTIVA`: las demás reservas no se modifican (HU-M5-02 CA 5). */
  onModificar: (reserva: Reserva) => void;
  /** Se ofrece solo en las filas `ACTIVA`, con la misma regla que `onModificar` (HU-M5-04). */
  onCancelarAnticipada: (reserva: Reserva) => void;
  /** Se ofrece solo en las filas `ACTIVA`, con la misma regla que `onModificar` (HU-M5-05). */
  onCancelarPorAusencia: (reserva: Reserva) => void;
}

const MENSAJE_ERROR = 'No se pudieron cargar las reservas.';

/** Cliente y mesa se muestran por su número: M3 y M4 todavía no exponen sus nombres (S13, S23). */
const COLUMNAS: ColumnaTabla<Reserva>[] = [
  {
    clave: 'hora',
    encabezado: 'Hora',
    render: (r) => <span className="font-bold tabular-nums">{r.hora}</span>,
  },
  { clave: 'cliente', encabezado: 'Cliente', render: (r) => `Cliente n.º ${r.cliente_id}` },
  { clave: 'personas', encabezado: 'Personas', render: (r) => r.cantidad_personas },
  { clave: 'mesa', encabezado: 'Mesa', render: (r) => `Mesa n.º ${r.mesa_id}` },
  {
    clave: 'estado',
    encabezado: 'Estado',
    render: (r) => (
      <Badge variant={ESTADOS_RESERVA[r.estado].variante}>
        {ESTADOS_RESERVA[r.estado].etiqueta}
      </Badge>
    ),
  },
];

type AccionesDeFila = Pick<
  ReservasTablaProps,
  'onCrearComanda' | 'onModificar' | 'onCancelarAnticipada' | 'onCancelarPorAusencia'
> & { ahora: Date };

interface BotonCrearComandaProps {
  reserva: Reserva;
  ahora: Date;
  onCrearComanda: (reserva: Reserva) => void;
}

/**
 * Deshabilitado, con el motivo a la vista, mientras la reserva no se puede atender (HU-M5-06). El
 * `Button` deshabilitado no recibe el puntero (`pointer-events-none`), así que el contenedor
 * repite el `title` para que el motivo aparezca al pasar el mouse.
 */
function BotonCrearComanda({ reserva, ahora, onCrearComanda }: BotonCrearComandaProps) {
  const atencion = atencionDeReserva(reserva, ahora);
  const motivo = atencion.disponible ? undefined : atencion.motivo;
  const idMotivo = `motivo-comanda-${reserva.id}`;
  return (
    <span className="inline-flex" title={motivo}>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Crear comanda"
        disabled={!atencion.disponible}
        title={motivo}
        aria-describedby={motivo === undefined ? undefined : idMotivo}
        onClick={() => onCrearComanda(reserva)}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
      </Button>
      {motivo !== undefined && (
        <span id={idMotivo} className="sr-only">
          {motivo}
        </span>
      )}
    </span>
  );
}

function columnaAcciones({
  ahora,
  onCrearComanda,
  onModificar,
  onCancelarAnticipada,
  onCancelarPorAusencia,
}: AccionesDeFila): ColumnaTabla<Reserva> {
  return {
    clave: 'acciones',
    encabezado: <span className="sr-only">Acciones</span>,
    className: 'text-right',
    render: (r) =>
      r.estado === 'ACTIVA' ? (
        <div className="flex justify-end gap-1">
          <BotonCrearComanda reserva={r} ahora={ahora} onCrearComanda={onCrearComanda} />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Modificar reserva"
            onClick={() => onModificar(r)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cancelar reserva"
            onClick={() => onCancelarAnticipada(r)}
          >
            <CalendarX className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cancelar por ausencia"
            onClick={() => onCancelarPorAusencia(r)}
          >
            <UserX className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null,
  };
}

export function ReservasTabla({
  reservas,
  cargando,
  error,
  onReintentar,
  onCrearComanda,
  onModificar,
  onCancelarAnticipada,
  onCancelarPorAusencia,
}: ReservasTablaProps) {
  const ahora = useAhoraDelRestaurante();
  return (
    <DataTable
      columnas={[
        ...COLUMNAS,
        columnaAcciones({
          ahora,
          onCrearComanda,
          onModificar,
          onCancelarAnticipada,
          onCancelarPorAusencia,
        }),
      ]}
      filas={reservas}
      obtenerClave={(reserva) => reserva.id}
      cargando={cargando}
      error={error ? MENSAJE_ERROR : null}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={CalendarDays}
          titulo="Sin reservas"
          descripcion="No hay reservas para los filtros elegidos."
        />
      }
    />
  );
}
