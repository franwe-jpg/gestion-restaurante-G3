import { CalendarDays, Pencil } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import type { BadgeVariant } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { formatearHora } from '../../../shared/lib/format';
import type { EstadoReserva, Reserva } from '../types';

const ETIQUETAS: Record<EstadoReserva, string> = {
  ACTIVA: 'Activa',
  ATENDIDA: 'Atendida',
  CANCELADA_ANTICIPADA: 'Cancelada anticipada',
  CANCELADA_POR_AUSENCIA: 'Cancelada por ausencia',
};

const VARIANTES: Record<EstadoReserva, BadgeVariant> = {
  ACTIVA: 'success',
  ATENDIDA: 'info',
  CANCELADA_ANTICIPADA: 'neutral',
  CANCELADA_POR_AUSENCIA: 'danger',
};

interface AccionesReservaProps {
  reserva: Reserva;
  onEditar: (reserva: Reserva) => void;
}

function AccionesReserva({ reserva, onEditar }: AccionesReservaProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar la reserva de ${reserva.cliente_nombre}`}
        onClick={() => onEditar(reserva)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
    </div>
  );
}

function columnas(onEditar: (reserva: Reserva) => void): ColumnaTabla<Reserva>[] {
  return [
    {
      clave: 'hora',
      encabezado: 'Hora',
      render: (reserva) => formatearHora(`1970-01-01T${reserva.hora}`),
    },
    { clave: 'cliente', encabezado: 'Cliente', render: (reserva) => reserva.cliente_nombre },
    { clave: 'telefono', encabezado: 'Teléfono', render: (reserva) => reserva.cliente_telefono },
    {
      clave: 'personas',
      encabezado: 'Personas',
      render: (reserva) => reserva.cantidad_personas,
      className: 'text-right',
    },
    {
      clave: 'mesa',
      encabezado: 'Mesa',
      render: (reserva) => `${reserva.mesa.sector_nombre} · ${reserva.mesa.numero}`,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (reserva) => (
        <Badge variant={VARIANTES[reserva.estado]}>{ETIQUETAS[reserva.estado]}</Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (reserva) => <AccionesReserva reserva={reserva} onEditar={onEditar} />,
      className: 'w-16',
    },
  ];
}

export interface ReservasTablaProps {
  reservas: Reserva[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (reserva: Reserva) => void;
}

export function ReservasTabla({
  reservas,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
}: ReservasTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar)}
      filas={reservas}
      obtenerClave={(reserva) => reserva.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={CalendarDays}
          titulo="No hay reservas para este día"
          descripcion="Creá la primera reserva del día con «Nueva reserva»."
        />
      }
    />
  );
}
