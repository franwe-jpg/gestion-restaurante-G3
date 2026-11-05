import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { eliminarMozo } from '../api';
import type { Mozo } from '../types';

export interface OpcionesBajaMozo {
  onEliminado: () => void;
}

const DESCRIPCION_BAJA = 'El mozo quedará deshabilitado y no se podrá asignar a nuevas mesas.';

/** HU-M3-11: confirmación, baja y avisos de un mozo del listado. */
export function useBajaMozo({ onEliminado }: OpcionesBajaMozo) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async (mozo: Pick<Mozo, 'id' | 'nombre' | 'apellido'>) => {
    const aceptado = await confirmar({
      titulo: `¿Dar de baja a ${mozo.apellido}, ${mozo.nombre}?`,
      descripcion: DESCRIPCION_BAJA,
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setEliminando(true);
    const respuesta = await eliminarMozo(mozo.id);
    setEliminando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Mozo dado de baja', variante: 'success' });
      onEliminado();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo dar de baja al mozo',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { eliminando, eliminar };
}
