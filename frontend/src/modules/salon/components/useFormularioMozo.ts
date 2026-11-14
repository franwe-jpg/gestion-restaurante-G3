import { crearMozo, modificarMozo } from '../api';
import type { Mozo } from '../types';

import { useFormularioPersona } from './useFormularioPersona';

export interface OpcionesFormularioMozo {
  mozo?: Mozo | null;
  onGuardado: () => void;
}

export function useFormularioMozo({ mozo = null, onGuardado }: OpcionesFormularioMozo) {
  return useFormularioPersona({
    persona: mozo,
    tipo: 'mozo',
    crear: crearMozo,
    modificar: modificarMozo,
    onGuardado,
  });
}
