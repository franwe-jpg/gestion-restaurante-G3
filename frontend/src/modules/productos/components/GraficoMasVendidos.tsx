import type { ReactNode } from 'react';

import { ChartContainer } from '../../../shared/components/ui/chart-container';
import { formatearNumero } from '../../../shared/lib/format';
import type { ProductoMasVendido } from '../masVendidos';

export interface GraficoMasVendidosProps {
  productos: ProductoMasVendido[];
  descripcion?: string;
  acciones?: ReactNode;
}

export function GraficoMasVendidos({ productos, descripcion, acciones }: GraficoMasVendidosProps) {
  const maximo = Math.max(1, ...productos.map((p) => p.cantidad));

  return (
    <ChartContainer
      titulo="Los 5 productos más pedidos"
      descripcion={descripcion}
      acciones={acciones}
      vacio={productos.length === 0}
      mensajeVacio="No hay datos para el período elegido."
    >
      <ul aria-label="Productos más pedidos" className="space-y-3">
        {productos.map((producto) => (
          <li key={producto.id} className="flex items-center gap-3 text-sm">
            <span className="w-48 shrink-0 truncate text-slate-700">{producto.etiqueta}</span>
            <div className="h-5 flex-1 rounded bg-slate-100">
              <div
                className="h-5 rounded bg-amber-600/80"
                style={{ width: `${Math.round((producto.cantidad / maximo) * 100)}%` }}
              />
            </div>
            <span className="w-12 text-right font-medium text-slate-900">
              {formatearNumero(producto.cantidad)}
            </span>
          </li>
        ))}
      </ul>
      {productos.length > 0 && (
        <p className="mt-4 text-sm text-slate-500">El detalle completo está en el reporte PDF.</p>
      )}
    </ChartContainer>
  );
}
