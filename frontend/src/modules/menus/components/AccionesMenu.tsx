import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Switch } from '../../../shared/components/ui/switch';

import type { FormularioMenuDelDia as Estado } from './useFormularioMenuDelDia';

export interface AccionesMenuProps {
  formulario: Estado;
  esAlta: boolean;
  onCancelar?: () => void;
}

/** Estado (solo en edición), error general y botones de guardar y cancelar. */
export function AccionesMenu({ formulario, esAlta, onCancelar }: AccionesMenuProps) {
  return (
    <>
      {!esAlta && (
        <div className="flex items-center gap-2">
          <Switch
            checked={formulario.estado === 'HABILITADO'}
            onCheckedChange={(habilitado) =>
              formulario.cambiarEstado(habilitado ? 'HABILITADO' : 'DESHABILITADO')
            }
            aria-label="Habilitado"
          />
          <span className="text-sm font-medium text-slate-700">Habilitado</span>
        </div>
      )}

      {formulario.errorGeneral !== null && (
        <Alert variant="danger">{formulario.errorGeneral}</Alert>
      )}

      <div className="flex justify-end gap-2">
        {onCancelar !== undefined && (
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={formulario.enviando}>
          {esAlta ? 'Guardar menú' : 'Guardar cambios'}
        </Button>
      </div>
    </>
  );
}
