import type { Chef } from '../types';

import { PersonaFormDialog } from './PersonaFormDialog';
import { useFormularioChef } from './useFormularioChef';

export interface ChefFormDialogProps {
  chef?: Chef | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

/** Se monta solo mientras está abierto: cada apertura parte de los datos del chef o vacía. */
export function ChefFormDialog({ chef = null, onGuardado, onOpenChange }: ChefFormDialogProps) {
  const formulario = useFormularioChef({ chef, onGuardado });

  return (
    <PersonaFormDialog
      tipo="chef"
      persona={chef}
      formulario={formulario}
      onOpenChange={onOpenChange}
    />
  );
}
