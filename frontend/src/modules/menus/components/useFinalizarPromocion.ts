import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { finalizarPromocion } from '../api';
import type { Promocion } from '../types';

interface OpcionesFinalizarPromocion {
  promocion: Pick<Promocion, 'id' | 'nombre'>;
  onFinalizada: () => void;
}

export function useFinalizarPromocion({ promocion, onFinalizada }: OpcionesFinalizarPromocion) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [finalizando, setFinalizando] = useState(false);

  async function finalizar() {
    const aceptado = await confirmar({
      titulo: `¿Finalizar «${promocion.nombre}»?`,
      descripcion:
        'Dejará de aplicarse inmediatamente en los pedidos nuevos. ' +
        'Las comandas anteriores y sus importes no cambian.',
      textoConfirmar: 'Finalizar',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setFinalizando(true);
    const respuesta = await finalizarPromocion(promocion.id);
    setFinalizando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Promoción finalizada', variante: 'success' });
      onFinalizada();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo finalizar la promoción',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  }

  return { finalizando, finalizar };
}
