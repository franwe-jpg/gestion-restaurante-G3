import { Button } from '../../../shared/components/ui/button';
import type { Promocion } from '../types';

import { useFinalizarPromocion } from './useFinalizarPromocion';

interface AccionesPromocionProps {
  promocion: Promocion;
  onEditar: (promocion: Promocion) => void;
  onFinalizada: () => void;
}

export function AccionesPromocion({ promocion, onEditar, onFinalizada }: AccionesPromocionProps) {
  const { finalizando, finalizar } = useFinalizarPromocion({ promocion, onFinalizada });

  if (promocion.estado !== 'HABILITADO') return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${promocion.nombre}»`}
        onClick={() => onEditar(promocion)}
      >
        Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={finalizando}
        aria-label={`Finalizar «${promocion.nombre}»`}
        onClick={() => void finalizar()}
      >
        Finalizar
      </Button>
    </div>
  );
}
