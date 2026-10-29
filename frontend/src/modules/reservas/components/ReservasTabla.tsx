import { CalendarDays } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { Reserva } from '../types';

import { ESTADOS_RESERVA } from './estadosReserva';

export interface ReservasTablaProps {
  reservas: Reserva[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
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

export function ReservasTabla({ reservas, cargando, error, onReintentar }: ReservasTablaProps) {
  return (
    <DataTable
      columnas={COLUMNAS}
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
