import { Badge } from '../../../shared/components/ui/badge';
import type { FiltroEstado, SeccionCarta } from '../types';

import { ProductoCartaTarjeta } from './ProductoCartaTarjeta';

const AVISO_SECCION_VACIA: Record<FiltroEstado, string> = {
  HABILITADO: 'Sección sin productos.',
  DESHABILITADO: 'Sin productos dados de baja',
  TODOS: 'Sección sin productos.',
};

export interface CartaSeccionProps {
  seccion: SeccionCarta;
  filtro: FiltroEstado;
}

function cantidadProductos(cantidad: number): string {
  return cantidad === 1 ? '1 producto' : `${cantidad} productos`;
}

export function CartaSeccion({ seccion, filtro }: CartaSeccionProps) {
  const mostrarEstado = filtro !== 'HABILITADO';
  const habilitada = seccion.estado === 'HABILITADO';
  return (
    <section
      id={`seccion-${seccion.id}`}
      aria-labelledby={`titulo-seccion-${seccion.id}`}
      className="scroll-mt-4 space-y-3"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 id={`titulo-seccion-${seccion.id}`} className="text-xl font-semibold text-slate-900">
          {seccion.nombre}
        </h2>
        <span className="text-sm text-slate-500">
          {cantidadProductos(seccion.productos.length)}
        </span>
        {mostrarEstado && (
          <Badge variant={habilitada ? 'success' : 'neutral'}>
            {habilitada ? 'Habilitada' : 'Deshabilitada'}
          </Badge>
        )}
      </div>
      {seccion.productos.length === 0 ? (
        <p className="text-sm text-slate-500">{AVISO_SECCION_VACIA[filtro]}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seccion.productos.map((producto) => (
            <ProductoCartaTarjeta
              key={producto.id}
              producto={producto}
              mostrarEstado={mostrarEstado}
            />
          ))}
        </div>
      )}
    </section>
  );
}
