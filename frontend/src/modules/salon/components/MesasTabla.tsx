import { Armchair, Pencil, Trash2 } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import type { Mesa } from '../types';

interface AccionesMesaProps {
  mesa: Mesa;
  /** Sin `onEditar` y `onEliminar` (rol sin `SALON_GESTIONAR`) solo queda «Abrir comanda». */
  onEditar?: (mesa: Mesa) => void;
  onEliminar?: (mesa: Mesa) => void;
  onAbrirComanda?: (mesa: Mesa) => void;
}

function AccionesMesa({ mesa, onEditar, onEliminar, onAbrirComanda }: AccionesMesaProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onAbrirComanda && mesa.estado === 'LIBRE' && (
        <Button
          variant="brand-outline"
          size="sm"
          aria-label={`Abrir comanda en la mesa ${mesa.numero}`}
          title={`Abrir comanda en la mesa ${mesa.numero}`}
          onClick={() => onAbrirComanda(mesa)}
        >
          Abrir comanda
        </Button>
      )}
      {onEditar && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Editar la mesa ${mesa.numero}`}
          title={`Editar la mesa ${mesa.numero}`}
          onClick={() => onEditar(mesa)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Editar</span>
        </Button>
      )}
      {onEliminar && mesa.estado !== 'OCUPADA' && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Eliminar la mesa ${mesa.numero}`}
          title={`Eliminar la mesa ${mesa.numero}`}
          onClick={() => onEliminar(mesa)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Eliminar</span>
        </Button>
      )}
    </div>
  );
}

function columnas({
  onEditar,
  onEliminar,
  onAbrirComanda,
}: Pick<AccionesMesaProps, 'onEditar' | 'onEliminar' | 'onAbrirComanda'>): ColumnaTabla<Mesa>[] {
  const base: ColumnaTabla<Mesa>[] = [
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
      render: (mesa) => <StatusBadge estado={mesa.estado} />,
    },
  ];
  // Sin ninguna acción disponible (solo lectura y sin permiso de operar comandas) no hay columna.
  if (!onEditar && !onEliminar && !onAbrirComanda) return base;
  return [
    ...base,
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (mesa) => (
        <AccionesMesa
          mesa={mesa}
          onEditar={onEditar}
          onEliminar={onEliminar}
          onAbrirComanda={onAbrirComanda}
        />
      ),
      className: 'w-24',
    },
  ];
}

export interface MesasTablaProps {
  mesas: Mesa[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar?: (mesa: Mesa) => void;
  onEliminar?: (mesa: Mesa) => void;
  onAbrirComanda?: (mesa: Mesa) => void;
}

export function MesasTabla({
  mesas,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
  onEliminar,
  onAbrirComanda,
}: MesasTablaProps) {
  return (
    <DataTable
      columnas={columnas({ onEditar, onEliminar, onAbrirComanda })}
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
