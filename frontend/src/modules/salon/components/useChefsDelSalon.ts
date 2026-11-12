import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarChefs } from '../api';
import type { Chef } from '../types';

import { usePersonasDelSalon } from './usePersonasDelSalon';

/** HU-TR-01: listado completo de chefs (habilitados y deshabilitados), paginado de a 50. */
export function useChefsDelSalon(refresco = 0): {
  chefs: Chef[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const { personas, ...resto } = usePersonasDelSalon(listarChefs, 'chefs', refresco);
  return { chefs: personas, ...resto };
}
