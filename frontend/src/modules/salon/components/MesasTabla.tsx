import { Armchair, Trash2 } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import type { BadgeVariant } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { EstadoMesa, Mesa } from '../types';

const ETIQUETAS: Record<EstadoMesa, string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

const VARIANTES: Record<EstadoMesa, BadgeVariant> = {
  LIBRE: 'success',
  OCUPADA: 'warning',
  FUERA_DE_SERVICIO: 'neutral',
};

interface AccionesMesaProps {
  mesa: Mesa;
  onEliminar: (mesa: Mesa) => void;
}

function AccionesMesa({ mesa, onEliminar }: AccionesMesaProps) {
  if (mesa.estado === 'OCUPADA') return null;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Eliminar la mesa ${mesa.numero}`}
        onClick={() => onEliminar(mesa)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Eliminar</span>
      </Button>
    </div>
  );
}

function columnas(onEliminar: (mesa: Mesa) => void): ColumnaTabla<Mesa>[] {
  return [
    {
      clave: 'numero',
      encabezado: 'Número',
      render: (mesa) => mesa.numero,
      className: 'text-right',
    },
    { clave: 'sector', encabezado: 'Sector', render: (mesa) => mesa.sector.nombre },
    {
      clave: 'capacidad',
      encabezado: 'Capacidad',
      render: (mesa) => mesa.capacidad,
      className: 'text-right',
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (mesa) => <Badge variant={VARIANTES[mesa.estado]}>{ETIQUETAS[mesa.estado]}</Badge>,
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (mesa) => <AccionesMesa mesa={mesa} onEliminar={onEliminar} />,
      className: 'w-16',
    },
  ];
}

export interface MesasTablaProps {
  mesas: Mesa[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEliminar: (mesa: Mesa) => void;
}

export function MesasTabla({
  mesas,
  cargando = false,
  error = null,
  onReintentar,
  onEliminar,
}: MesasTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEliminar)}
      filas={mesas}
      obtenerClave={(mesa) => mesa.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={Armchair}
          titulo="No hay mesas disponibles"
          descripcion="Creá la primera mesa para empezar a atender."
        />
      }
    />
  );
}
