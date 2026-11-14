import { Pencil, Trash2 } from 'lucide-react';

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
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        aria-label={`Editar «${seccion.nombre}»`}
        title="Editar"
        onClick={() => onEditar(seccion)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      {seccion.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          disabled={dandoDeBaja}
          aria-label={`Dar de baja «${seccion.nombre}»`}
          title="Dar de baja"
          onClick={() => void darDeBaja()}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
