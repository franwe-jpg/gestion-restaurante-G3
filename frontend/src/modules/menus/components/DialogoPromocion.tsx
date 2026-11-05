import { Dialog } from '../../../shared/components/ui/dialog';
import type { ProductoMenu, Promocion } from '../types';

import { FormularioPromocion } from './FormularioPromocion';

interface DialogoPromocionProps {
  abierto: boolean;
  promocion?: Promocion | null;
  productos: ProductoMenu[];
  cargandoProductos: boolean;
  errorProductos?: string;
  onCambiar: (abierto: boolean) => void;
  onGuardado: () => void;
}

export function DialogoPromocion({
  abierto,
  promocion,
  productos,
  cargandoProductos,
  errorProductos,
  onCambiar,
  onGuardado,
}: DialogoPromocionProps) {
  return (
    <Dialog
      open={abierto}
      onOpenChange={onCambiar}
      title={promocion ? 'Editar promoción' : 'Nueva promoción'}
      description={
        promocion
          ? 'Actualizá las condiciones de la promoción.'
          : 'Definí el tipo de descuento, los productos y cuándo se aplica.'
      }
      size="lg"
    >
      <FormularioPromocion
        promocion={promocion}
        productos={productos}
        cargandoProductos={cargandoProductos}
        errorProductos={errorProductos}
        onGuardado={onGuardado}
        onCancelar={() => onCambiar(false)}
      />
    </Dialog>
  );
}
