import { CalendarDays, CalendarX, Pencil, UserX } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { Reserva } from '../types';

import { ESTADOS_RESERVA } from './estadosReserva';

export interface ReservasTablaProps {
  reservas: Reserva[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
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
  'onModificar' | 'onCancelarAnticipada' | 'onCancelarPorAusencia'
>;

function columnaAcciones({
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
  onModificar,
  onCancelarAnticipada,
  onCancelarPorAusencia,
}: ReservasTablaProps) {
  return (
    <DataTable
      columnas={[
        ...COLUMNAS,
        columnaAcciones({ onModificar, onCancelarAnticipada, onCancelarPorAusencia }),
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
