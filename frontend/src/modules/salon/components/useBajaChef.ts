import { eliminarChef } from '../api';

import { useBajaPersona } from './useBajaPersona';

export interface OpcionesBajaChef {
  onEliminado: () => void;
}

const DESCRIPCION_BAJA = 'El chef quedará deshabilitado y no podrá iniciar sesión.';

/** HU-TR-01: confirmación, baja y avisos de un chef del listado. */
export function useBajaChef({ onEliminado }: OpcionesBajaChef) {
  return useBajaPersona({
    tipo: 'chef',
    descripcion: DESCRIPCION_BAJA,
    baja: eliminarChef,
    onEliminado,
  });
}
