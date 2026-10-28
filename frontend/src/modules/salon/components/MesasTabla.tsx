import { Armchair } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import type { BadgeVariant } from '../../../shared/components/ui/badge';
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

const COLUMNAS: ColumnaTabla<Mesa>[] = [
  { clave: 'numero', encabezado: 'Número', render: (mesa) => mesa.numero, className: 'text-right' },
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
];

export interface MesasTablaProps {
  mesas: Mesa[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
}

export function MesasTabla({
  mesas,
  cargando = false,
  error = null,
  onReintentar,
}: MesasTablaProps) {
  return (
    <DataTable
      columnas={COLUMNAS}
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
