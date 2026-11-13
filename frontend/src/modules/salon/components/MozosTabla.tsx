import type { Mozo } from '../types';

import { PersonasTabla } from './PersonasTabla';

export interface MozosTablaProps {
  mozos: Mozo[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (mozo: Mozo) => void;
  onEliminar: (mozo: Mozo) => void;
}

export function MozosTabla({ mozos, ...resto }: MozosTablaProps) {
  return (
    <PersonasTabla
      tipo="mozo"
      personas={mozos}
      descripcionVacia="Registrá el primer mozo para asignarlo a las mesas."
      {...resto}
    />
  );
}
