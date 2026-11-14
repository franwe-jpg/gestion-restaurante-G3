import { useState } from 'react';

import type { Chef, Mesa, Mozo, Sector } from '../types';

export interface DialogoDelSalon<T> {
  abierto: boolean;
  enEdicion: T | null;
  setAbierto: (abierto: boolean) => void;
  abrir: (item?: T | null) => void;
}

function useDialogo<T>(): DialogoDelSalon<T> {
  const [abierto, setAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<T | null>(null);
  const abrir = (item: T | null = null) => {
    setEnEdicion(item);
    setAbierto(true);
  };
  return { abierto, enEdicion, setAbierto, abrir };
}

/** Estado de los cuatro diálogos del salón y de la pestaña que se muestra al guardar. */
export function useDialogosDelSalon(recargarSectores: () => void) {
  const sector = useDialogo<Sector>();
  const mesa = useDialogo<Mesa>();
  const mozo = useDialogo<Mozo>();
  const chef = useDialogo<Chef>();
  const [pestania, setPestania] = useState('sectores');
  const [refrescos, setRefrescos] = useState({ mesas: 0, mozos: 0, chefs: 0 });

  const alGuardar = (
    dialogo: Pick<DialogoDelSalon<unknown>, 'setAbierto'>,
    destino: 'mesas' | 'mozos' | 'chefs',
  ) => {
    dialogo.setAbierto(false);
    setPestania(destino);
    setRefrescos((previos) => ({ ...previos, [destino]: previos[destino] + 1 }));
  };

  return {
    sector,
    mesa,
    mozo,
    chef,
    pestania,
    setPestania,
    refrescos,
    alGuardarSector: () => {
      sector.setAbierto(false);
      recargarSectores();
    },
    alGuardarMesa: () => alGuardar(mesa, 'mesas'),
    alGuardarMozo: () => alGuardar(mozo, 'mozos'),
    alGuardarChef: () => alGuardar(chef, 'chefs'),
    abrirSectorDesdeMesa: () => {
      mesa.setAbierto(false);
      sector.abrir();
    },
  };
}
