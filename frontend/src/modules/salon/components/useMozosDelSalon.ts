import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarMozos } from '../api';
import type { Mozo } from '../types';

import { LIMITE_PERSONAS, usePersonasDelSalon } from './usePersonasDelSalon';

export const LIMITE_MOZOS = LIMITE_PERSONAS;

/** Listado completo de mozos (habilitados y deshabilitados), paginado de a 50. */
export function useMozosDelSalon(refresco = 0): {
  mozos: Mozo[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const { personas, ...resto } = usePersonasDelSalon(listarMozos, 'mozos', refresco);
  return { mozos: personas, ...resto };
}
