import { useState } from 'react';

import type { MozoSeleccionable } from '../types';
import type { CambioDeMozo } from './CambiarMozoDialog';

/** S4-04: abre «Cambiar mozo» desde el listado; al guardar cierra, avisa y recarga. */
export function useCambioDeMozo(recargar: () => void, avisar: (mensaje: string) => void) {
  const [cambio, setCambio] = useState<CambioDeMozo | null>(null);
  return {
    cambio,
    abrir: (comandaId: number, mozoActual: MozoSeleccionable | null) =>
      setCambio({ comandaId, mozoActual }),
    salir: () => setCambio(null),
    cambiado() {
      setCambio(null);
      avisar('Mozo de la comanda actualizado');
      recargar();
    },
  };
}
