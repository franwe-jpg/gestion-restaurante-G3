import { eliminarMozo } from '../api';

import { useBajaPersona } from './useBajaPersona';

export interface OpcionesBajaMozo {
  onEliminado: () => void;
}

const DESCRIPCION_BAJA = 'El mozo quedará deshabilitado y no se podrá asignar a nuevas mesas.';

/** HU-M3-11: confirmación, baja y avisos de un mozo del listado. */
export function useBajaMozo({ onEliminado }: OpcionesBajaMozo) {
  return useBajaPersona({
    tipo: 'mozo',
    descripcion: DESCRIPCION_BAJA,
    baja: eliminarMozo,
    onEliminado,
  });
}
