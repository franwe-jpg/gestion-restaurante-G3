import { Layers } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { SeccionListado } from '../types';

export interface SeccionesTablaProps {
  secciones: SeccionListado[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
}

const COLUMNAS: ColumnaTabla<SeccionListado>[] = [
  { clave: 'orden', encabezado: 'Orden', render: (s) => s.orden, className: 'w-20' },
  { clave: 'nombre', encabezado: 'Nombre', render: (s) => s.nombre },
  { clave: 'productos', encabezado: 'Productos', render: (s) => s.cantidad_productos },
  {
    clave: 'estado',
    encabezado: 'Estado',
    render: (s) => (
      <Badge variant={s.estado === 'HABILITADO' ? 'success' : 'neutral'}>
        {s.estado === 'HABILITADO' ? 'Habilitada' : 'Deshabilitada'}
      </Badge>
    ),
  },
];

export function SeccionesTabla({ secciones, cargando, error, onReintentar }: SeccionesTablaProps) {
  return (
    <DataTable
      columnas={COLUMNAS}
      filas={secciones}
      obtenerClave={(seccion) => seccion.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={Layers}
          titulo="Todavía no hay secciones"
          descripcion="Creá la primera sección para agrupar los productos de la carta."
        />
      }
    />
  );
}
