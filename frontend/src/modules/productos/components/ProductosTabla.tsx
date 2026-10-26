import { UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { formatearMoneda } from '../../../shared/lib/format';
import { ETIQUETAS_CATEGORIA } from '../categorias';
import type { ProductoListado } from '../types';

import type { FiltroEstadoOpcion } from './filtrosEstado';

export interface ProductosTablaProps {
  productos: ProductoListado[];
  filtro: FiltroEstadoOpcion;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  renderAcciones?: (producto: ProductoListado) => ReactNode;
}

function Etiquetas({ etiquetas }: { etiquetas: string[] }) {
  if (etiquetas.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {etiquetas.map((etiqueta) => (
        <Badge key={etiqueta}>{etiqueta}</Badge>
      ))}
    </div>
  );
}

function columnas(
  renderAcciones?: (producto: ProductoListado) => ReactNode,
): ColumnaTabla<ProductoListado>[] {
  return [
    { clave: 'nombre', encabezado: 'Nombre', render: (p) => p.nombre },
    {
      clave: 'categoria',
      encabezado: 'Categoría',
      render: (p) => ETIQUETAS_CATEGORIA[p.categoria],
    },
    { clave: 'seccion', encabezado: 'Sección', render: (p) => p.seccion.nombre },
    {
      clave: 'precio',
      encabezado: 'Precio',
      render: (p) => formatearMoneda(Number(p.precio)),
      className: 'text-right',
    },
    {
      clave: 'etiquetas',
      encabezado: 'Etiquetas',
      render: (p) => <Etiquetas etiquetas={p.etiquetas} />,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (p) => (
        <Badge variant={p.estado === 'HABILITADO' ? 'success' : 'neutral'}>
          {p.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (p) => renderAcciones?.(p) ?? null,
      className: 'w-28',
    },
  ];
}

export function ProductosTabla({
  productos,
  filtro,
  cargando = false,
  error = null,
  onReintentar,
  renderAcciones,
}: ProductosTablaProps) {
  if (!cargando && !error && productos.length === 0) {
    return (
      <EmptyState
        icono={UtensilsCrossed}
        titulo={filtro.vacioTitulo}
        descripcion={filtro.vacioDescripcion}
      />
    );
  }

  return (
    <DataTable
      columnas={columnas(renderAcciones)}
      filas={productos}
      obtenerClave={(producto) => producto.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
    />
  );
}
