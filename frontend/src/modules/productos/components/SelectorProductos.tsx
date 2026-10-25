import { Checkbox } from '../../../shared/components/ui/checkbox';
import type { ProductoSeleccionable } from '../types';

export interface SelectorProductosProps {
  productos: ProductoSeleccionable[];
  seleccionados: number[];
  onCambiar: (ids: number[]) => void;
}

export function SelectorProductos({ productos, seleccionados, onCambiar }: SelectorProductosProps) {
  if (productos.length === 0) {
    return <p className="text-sm text-slate-500">No hay productos habilitados para seleccionar.</p>;
  }

  const alternar = (id: number) => {
    onCambiar(
      seleccionados.includes(id)
        ? seleccionados.filter((elegido) => elegido !== id)
        : [...seleccionados, id],
    );
  };

  return (
    <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
      {productos.map((producto) => {
        const idCampo = `producto-${producto.id}`;
        return (
          <li key={producto.id} className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              id={idCampo}
              checked={seleccionados.includes(producto.id)}
              onChange={() => alternar(producto.id)}
            />
            <label htmlFor={idCampo}>
              {`${producto.nombre} (sección actual: ${producto.seccion.nombre})`}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
