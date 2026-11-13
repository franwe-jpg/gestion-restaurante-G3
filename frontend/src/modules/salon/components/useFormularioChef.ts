import { crearChef, modificarChef } from '../api';
import type { Chef } from '../types';

import { useFormularioPersona } from './useFormularioPersona';

export interface OpcionesFormularioChef {
  chef?: Chef | null;
  onGuardado: () => void;
}

export function useFormularioChef({ chef = null, onGuardado }: OpcionesFormularioChef) {
  return useFormularioPersona({
    persona: chef,
    tipo: 'chef',
    crear: crearChef,
    modificar: modificarChef,
    onGuardado,
  });
}
