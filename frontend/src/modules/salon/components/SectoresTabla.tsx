import { LayoutGrid, Pencil } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { Sector } from '../types';

export interface SectoresTablaProps {
  sectores: Sector[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (sector: Sector) => void;
}

function columnas(onEditar: (sector: Sector) => void): ColumnaTabla<Sector>[] {
  return [
    { clave: 'nombre', encabezado: 'Nombre', render: (sector) => sector.nombre },
    {
      clave: 'descripcion',
      encabezado: 'Descripción',
      render: (sector) => sector.descripcion ?? <span className="text-slate-400">—</span>,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (sector) => (
        <Badge variant={sector.estado === 'HABILITADO' ? 'success' : 'neutral'}>
          {sector.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (sector) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Editar «${sector.nombre}»`}
          onClick={() => onEditar(sector)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Editar</span>
        </Button>
      ),
      className: 'w-20',
    },
  ];
}

export function SectoresTabla({
  sectores,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
}: SectoresTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar)}
      filas={sectores}
      obtenerClave={(sector) => sector.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={LayoutGrid}
          titulo="No hay sectores disponibles"
          descripcion="Creá el primer sector para organizar las mesas del salón."
        />
      }
    />
  );
}
