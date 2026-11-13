import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';
import type { MenuEjecutivo } from '../types';

import { useBajaMenuEjecutivo } from './useBajaMenuEjecutivo';

interface AccionesMenuEjecutivoProps {
  menu: MenuEjecutivo;
  onEditar: (menu: MenuEjecutivo) => void;
  onDadoDeBaja: () => void;
}

export function AccionesMenuEjecutivo({
  menu,
  onEditar,
  onDadoDeBaja,
}: AccionesMenuEjecutivoProps) {
  const { dandoDeBaja, darDeBaja } = useBajaMenuEjecutivo({ menu, onDadoDeBaja });

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${menu.nombre}»`}
        title={`Editar «${menu.nombre}»`}
        onClick={() => onEditar(menu)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </Button>
      {menu.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          disabled={dandoDeBaja}
          aria-label={`Dar de baja «${menu.nombre}»`}
          title={`Dar de baja «${menu.nombre}»`}
          onClick={() => void darDeBaja()}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Dar de baja</span>
        </Button>
      )}
    </div>
  );
}
