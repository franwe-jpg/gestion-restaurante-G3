import { Link } from 'react-router-dom';

import { Button } from '../../../shared/components/ui/button';
import { esCategoriaEdicion, rutaDeEdicion } from '../categorias';
import type { CategoriaEdicion } from '../categorias';
import type { ProductoListado } from '../types';

import { useBajaProducto } from './useBajaProducto';

export interface AccionesProductoProps {
  producto: ProductoListado;
  onDadoDeBaja: () => void;
}

interface AccionesEdicionProps extends AccionesProductoProps {
  categoria: CategoriaEdicion;
}

function AccionesEdicion({ categoria, producto, onDadoDeBaja }: AccionesEdicionProps) {
  const { dandoDeBaja, darDeBaja } = useBajaProducto({ categoria, producto, onDadoDeBaja });

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        to={rutaDeEdicion(categoria, producto.id)}
        aria-label={`Editar «${producto.nombre}»`}
        className="text-sm font-medium text-amber-700 hover:underline"
      >
        Editar
      </Link>
      {producto.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          disabled={dandoDeBaja}
          aria-label={`Dar de baja «${producto.nombre}»`}
          onClick={() => void darDeBaja()}
        >
          Dar de baja
        </Button>
      )}
    </div>
  );
}

/** Acciones de una fila: los platos y los postres se editan y se dan de baja (S28, S31, E21). */
export function AccionesProducto({ producto, onDadoDeBaja }: AccionesProductoProps) {
  if (!esCategoriaEdicion(producto.categoria)) return null;
  return (
    <AccionesEdicion
      categoria={producto.categoria}
      producto={producto}
      onDadoDeBaja={onDadoDeBaja}
    />
  );
}
