import { LayoutGrid, Pencil, Trash2 } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import type { Sector } from '../types';

export interface SectoresTablaProps {
  sectores: Sector[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  /** Sin `onEditar` y `onEliminar` (rol sin `SALON_GESTIONAR`) no hay columna de acciones. */
  onEditar?: (sector: Sector) => void;
  onEliminar?: (sector: Sector) => void;
}

interface AccionesSectorProps {
  sector: Sector;
  onEditar: (sector: Sector) => void;
  onEliminar: (sector: Sector) => void;
}

function AccionesSector({ sector, onEditar, onEliminar }: AccionesSectorProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${sector.nombre}»`}
        title={`Editar «${sector.nombre}»`}
        onClick={() => onEditar(sector)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      {sector.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Eliminar «${sector.nombre}»`}
          title={`Eliminar «${sector.nombre}»`}
          onClick={() => onEliminar(sector)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Eliminar</span>
        </Button>
      )}
    </div>
  );
}

function columnas(
  onEditar?: (sector: Sector) => void,
  onEliminar?: (sector: Sector) => void,
): ColumnaTabla<Sector>[] {
  const base: ColumnaTabla<Sector>[] = [
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      render: (sector) => <span className="uppercase">{sector.nombre}</span>,
    },
    {
      clave: 'descripcion',
      encabezado: 'Descripción',
      render: (sector) => sector.descripcion ?? <span className="text-slate-400">—</span>,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (sector) => <StatusBadge estado={sector.estado} />,
    },
  ];
  if (!onEditar || !onEliminar) return base;
  return [
    ...base,
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (sector) => (
        <AccionesSector sector={sector} onEditar={onEditar} onEliminar={onEliminar} />
      ),
      className: 'w-24',
    },
  ];
}

export function SectoresTabla({
  sectores,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
  onEliminar,
}: SectoresTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar, onEliminar)}
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
