import { Button } from '../../../shared/components/ui/button';
import type { SeccionListado } from '../types';

import { useBajaSeccion } from './useBajaSeccion';

export interface AccionesSeccionProps {
  seccion: SeccionListado;
  onEditar: (seccion: SeccionListado) => void;
  onDadoDeBaja: () => void;
}

/** Acciones de una fila: editar siempre; dar de baja solo si está habilitada (S73). */
export function AccionesSeccion({ seccion, onEditar, onDadoDeBaja }: AccionesSeccionProps) {
  const { dandoDeBaja, darDeBaja } = useBajaSeccion({ seccion, onDadoDeBaja });

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${seccion.nombre}»`}
        onClick={() => onEditar(seccion)}
      >
        Editar
      </Button>
      {seccion.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          disabled={dandoDeBaja}
          aria-label={`Dar de baja «${seccion.nombre}»`}
          onClick={() => void darDeBaja()}
        >
          Dar de baja
        </Button>
      )}
    </div>
  );
}
