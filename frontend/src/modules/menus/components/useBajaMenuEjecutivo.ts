import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { darDeBajaMenuEjecutivo } from '../api';
import type { MenuEjecutivo } from '../types';

export interface OpcionesBajaMenuEjecutivo {
  menu: Pick<MenuEjecutivo, 'id' | 'nombre'>;
  onDadoDeBaja: () => void;
}

export function useBajaMenuEjecutivo({ menu, onDadoDeBaja }: OpcionesBajaMenuEjecutivo) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [dandoDeBaja, setDandoDeBaja] = useState(false);

  const darDeBaja = async () => {
    const aceptado = await confirmar({
      titulo: `¿Dar de baja «${menu.nombre}»?`,
      descripcion:
        'El menú quedará deshabilitado y dejará de estar disponible para los clientes. ' +
        'Sus productos no cambian.',
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setDandoDeBaja(true);
    const respuesta = await darDeBajaMenuEjecutivo(menu.id);
    setDandoDeBaja(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Menú ejecutivo dado de baja', variante: 'success' });
      onDadoDeBaja();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo dar de baja el menú ejecutivo',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { dandoDeBaja, darDeBaja };
}
