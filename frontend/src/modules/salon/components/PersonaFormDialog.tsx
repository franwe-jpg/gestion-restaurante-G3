import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import type { Persona } from '../types';

import { CamposPersona } from './CamposPersona';
import type { TipoPersona } from './tipoPersona';
import type { useFormularioPersona } from './useFormularioPersona';

export interface PersonaFormDialogProps {
  tipo: TipoPersona;
  persona: Persona | null;
  formulario: ReturnType<typeof useFormularioPersona>;
  onOpenChange: (abierto: boolean) => void;
}

/** Diálogo de alta y edición de mozo o chef; se monta solo mientras está abierto. */
export function PersonaFormDialog({
  tipo,
  persona,
  formulario,
  onOpenChange,
}: PersonaFormDialogProps) {
  const esEdicion = persona !== null;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={`${esEdicion ? 'Editar' : 'Nuevo'} ${tipo}`}
      description={`El estado del ${tipo} lo asigna el sistema.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void formulario.enviar()} disabled={formulario.enviando}>
            {esEdicion ? 'Guardar cambios' : `Guardar ${tipo}`}
          </Button>
        </>
      }
    >
      <CamposPersona formulario={formulario} prefijo={tipo} persona={persona} />
    </Dialog>
  );
}
