import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { eliminarSector } from '../api';
import type { Sector } from '../types';

export interface OpcionesBajaSector {
  onEliminado: () => void;
}

const DESCRIPCION_BAJA = 'El sector quedará deshabilitado y no se podrá elegir al crear mesas.';

/** HU-M3-03: confirmación, baja y avisos de un sector del listado. */
export function useBajaSector({ onEliminado }: OpcionesBajaSector) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async (sector: Pick<Sector, 'id' | 'nombre'>) => {
    const aceptado = await confirmar({
      titulo: `¿Eliminar el sector «${sector.nombre}»?`,
      descripcion: DESCRIPCION_BAJA,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setEliminando(true);
    const respuesta = await eliminarSector(sector.id);
    setEliminando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Sector eliminado', variante: 'success' });
      onEliminado();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo eliminar el sector',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { eliminando, eliminar };
}
