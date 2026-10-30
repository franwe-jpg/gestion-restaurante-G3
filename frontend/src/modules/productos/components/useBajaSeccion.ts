import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { darDeBajaSeccion } from '../api';
import type { SeccionListado } from '../types';

export interface OpcionesBajaSeccion {
  seccion: Pick<SeccionListado, 'id' | 'nombre' | 'productos_habilitados'>;
  onDadoDeBaja: () => void;
}

/** Avisa cuántos productos habilitados dejan de mostrarse en la carta (HU-M1-12 CA 2). */
export function descripcionDeLaBaja(productosHabilitados: number): string {
  const efecto =
    productosHabilitados === 0
      ? 'La sección no tiene productos habilitados.'
      : productosHabilitados === 1
        ? '1 producto habilitado dejará de mostrarse en la carta.'
        : `${productosHabilitados} productos habilitados dejarán de mostrarse en la carta.`;
  return `${efecto} La sección quedará deshabilitada; puede volver a habilitarla al editarla.`;
}

export function useBajaSeccion({ seccion, onDadoDeBaja }: OpcionesBajaSeccion) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [dandoDeBaja, setDandoDeBaja] = useState(false);

  const darDeBaja = async () => {
    const aceptado = await confirmar({
      titulo: `¿Dar de baja «${seccion.nombre}»?`,
      descripcion: descripcionDeLaBaja(seccion.productos_habilitados),
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setDandoDeBaja(true);
    const respuesta = await darDeBajaSeccion(seccion.id);
    setDandoDeBaja(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Sección dada de baja', variante: 'success' });
      onDadoDeBaja();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo dar de baja la sección',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { dandoDeBaja, darDeBaja };
}
