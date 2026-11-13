import { useContext } from 'react';

import { SesionContext, type SesionContexto } from './sesion-context';

/** Sin proveedor falla en voz alta: si falta, no se concede nada en silencio. */
export function useSesion(): SesionContexto {
  const contexto = useContext(SesionContext);
  if (contexto === null) {
    throw new Error('useSesion debe usarse dentro de SesionProvider');
  }
  return contexto;
}
