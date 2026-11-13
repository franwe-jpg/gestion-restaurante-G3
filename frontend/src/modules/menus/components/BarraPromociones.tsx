import { Plus } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';

interface BarraPromocionesProps {
  /** Sin `onNueva` (rol sin permiso de gestion) no se muestra el boton de alta. */
  onNueva?: () => void;
}

export function BarraPromociones({ onNueva }: BarraPromocionesProps) {
  return (
    <div className="flex justify-end">
      {onNueva && (
        <Button onClick={onNueva}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva promoción
        </Button>
      )}
    </div>
  );
}
