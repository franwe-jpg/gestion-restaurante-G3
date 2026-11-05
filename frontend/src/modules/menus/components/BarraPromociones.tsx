import { Plus } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';

interface BarraPromocionesProps {
  onNueva: () => void;
}

export function BarraPromociones({ onNueva }: BarraPromocionesProps) {
  return (
    <div className="flex justify-end">
      <Button onClick={onNueva}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nueva promoción
      </Button>
    </div>
  );
}
