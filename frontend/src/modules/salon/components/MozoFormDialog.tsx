import type { Mozo } from '../types';

import { PersonaFormDialog } from './PersonaFormDialog';
import { useFormularioMozo } from './useFormularioMozo';

export interface MozoFormDialogProps {
  mozo?: Mozo | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

/** Se monta solo mientras está abierto: cada apertura parte de los datos del mozo o vacía. */
export function MozoFormDialog({ mozo = null, onGuardado, onOpenChange }: MozoFormDialogProps) {
  const formulario = useFormularioMozo({ mozo, onGuardado });

  return (
    <PersonaFormDialog
      tipo="mozo"
      persona={mozo}
      formulario={formulario}
      onOpenChange={onOpenChange}
    />
  );
}
