import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { eliminarMedioPago } from '../api';
import type { MedioPago } from '../types';

export interface OpcionesBajaMedioPago {
  onEliminado: () => void;
}

const DESCRIPCION_BAJA =
  'Dejará de poder usarse para cobrar y no se podrá volver a habilitar. Los cobros anteriores lo conservan.';

/** HU-M6-06: confirmación, baja lógica y avisos de un medio de pago del listado. */
export function useBajaMedioPago({ onEliminado }: OpcionesBajaMedioPago) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async (medioPago: Pick<MedioPago, 'id' | 'nombre'>) => {
    const aceptado = await confirmar({
      titulo: `¿Eliminar el medio de pago «${medioPago.nombre}»?`,
      descripcion: DESCRIPCION_BAJA,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setEliminando(true);
    const respuesta = await eliminarMedioPago(medioPago.id);
    setEliminando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Medio de pago eliminado', variante: 'success' });
      onEliminado();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo eliminar el medio de pago',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { eliminando, eliminar };
}
