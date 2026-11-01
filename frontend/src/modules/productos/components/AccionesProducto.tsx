import { Button } from '../../../shared/components/ui/button';
import { esCategoriaEdicion } from '../categorias';
import type { CategoriaEdicion } from '../categorias';
import type { ProductoListado } from '../types';

import { useBajaProducto } from './useBajaProducto';

export interface AccionesProductoProps {
  producto: ProductoListado;
  /** Abre el diálogo de edición del producto en la misma página. */
  onEditar: (categoria: CategoriaEdicion, productoId: number) => void;
  onDadoDeBaja: () => void;
}

interface AccionesEdicionProps extends AccionesProductoProps {
  categoria: CategoriaEdicion;
}

function AccionesEdicion({ categoria, producto, onEditar, onDadoDeBaja }: AccionesEdicionProps) {
  const { dandoDeBaja, darDeBaja } = useBajaProducto({ categoria, producto, onDadoDeBaja });

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${producto.nombre}»`}
        onClick={() => onEditar(categoria, producto.id)}
      >
        Editar
      </Button>
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
export function AccionesProducto(props: AccionesProductoProps) {
  if (!esCategoriaEdicion(props.producto.categoria)) return null;
  return <AccionesEdicion {...props} categoria={props.producto.categoria} />;
}
