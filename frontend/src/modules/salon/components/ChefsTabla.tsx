import type { Chef } from '../types';

import { PersonasTabla } from './PersonasTabla';

export interface ChefsTablaProps {
  chefs: Chef[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (chef: Chef) => void;
  onEliminar: (chef: Chef) => void;
}

export function ChefsTabla({ chefs, ...resto }: ChefsTablaProps) {
  return (
    <PersonasTabla
      tipo="chef"
      personas={chefs}
      descripcionVacia="Registrá el primer chef para que pueda iniciar sesión."
      {...resto}
    />
  );
}
