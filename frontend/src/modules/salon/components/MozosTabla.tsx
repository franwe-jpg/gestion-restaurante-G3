import { Pencil, Trash2, Users } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { Mozo } from '../types';

interface AccionesMozoProps {
  mozo: Mozo;
  onEditar: (mozo: Mozo) => void;
  onEliminar: (mozo: Mozo) => void;
}

function AccionesMozo({ mozo, onEditar, onEliminar }: AccionesMozoProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar el mozo ${mozo.dni}`}
        onClick={() => onEditar(mozo)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      {mozo.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Dar de baja al mozo ${mozo.dni}`}
          onClick={() => onEliminar(mozo)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Dar de baja</span>
        </Button>
      )}
    </div>
  );
}

function columnas(
  onEditar: (mozo: Mozo) => void,
  onEliminar: (mozo: Mozo) => void,
): ColumnaTabla<Mozo>[] {
  return [
    { clave: 'dni', encabezado: 'DNI', render: (mozo) => mozo.dni },
    {
      clave: 'nombre',
      encabezado: 'Apellido y nombre',
      render: (mozo) => `${mozo.apellido}, ${mozo.nombre}`,
    },
    {
      clave: 'telefono',
      encabezado: 'Teléfono',
      render: (mozo) => mozo.telefono ?? <span className="text-slate-400">—</span>,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (mozo) => (
        <Badge variant={mozo.estado === 'HABILITADO' ? 'success' : 'neutral'}>
          {mozo.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (mozo) => <AccionesMozo mozo={mozo} onEditar={onEditar} onEliminar={onEliminar} />,
      className: 'w-24',
    },
  ];
}

export interface MozosTablaProps {
  mozos: Mozo[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (mozo: Mozo) => void;
  onEliminar: (mozo: Mozo) => void;
}

export function MozosTabla({
  mozos,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
  onEliminar,
}: MozosTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar, onEliminar)}
      filas={mozos}
      obtenerClave={(mozo) => mozo.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={Users}
          titulo="No hay mozos disponibles"
          descripcion="Registrá el primer mozo para asignarlo a las mesas."
        />
      }
    />
  );
}
