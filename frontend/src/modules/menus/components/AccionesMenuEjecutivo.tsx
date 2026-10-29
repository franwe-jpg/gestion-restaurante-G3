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
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar «${menu.nombre}»`}
        onClick={() => onEditar(menu)}
      >
        Editar
      </Button>
      {menu.estado === 'HABILITADO' && (
        <Button
          variant="ghost"
          size="sm"
          disabled={dandoDeBaja}
          aria-label={`Dar de baja «${menu.nombre}»`}
          onClick={() => void darDeBaja()}
        >
          Dar de baja
        </Button>
      )}
    </div>
  );
}
