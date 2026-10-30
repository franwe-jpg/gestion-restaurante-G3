import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { eliminarMesa } from '../api';
import type { Mesa } from '../types';

export interface OpcionesBajaMesa {
  onEliminada: () => void;
}

const DESCRIPCION_BAJA = 'La mesa se quitará del salón y no se podrá volver a usar.';

/** HU-M3-07: confirmación, eliminación y avisos de una mesa del listado. */
export function useBajaMesa({ onEliminada }: OpcionesBajaMesa) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async (mesa: Pick<Mesa, 'id' | 'numero'>) => {
    const aceptado = await confirmar({
      titulo: `¿Eliminar la mesa ${mesa.numero}?`,
      descripcion: DESCRIPCION_BAJA,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setEliminando(true);
    const respuesta = await eliminarMesa(mesa.id);
    setEliminando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Mesa eliminada', variante: 'success' });
      onEliminada();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo eliminar la mesa',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { eliminando, eliminar };
}
