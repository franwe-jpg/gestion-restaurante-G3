import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { darDeBajaMenuDelDia } from '../api';
import type { MenuDelDiaListado } from '../types';

/** Confirmación y baja de un menú del día; al terminar recarga la lista (HU-M2-06). */
export function useBajaMenuDelDia(alRecargar: () => void) {
  const { mostrarToast } = useToast();
  const confirmar = useConfirm();

  return async (menu: MenuDelDiaListado) => {
    const confirmado = await confirmar({
      titulo: `Dar de baja ${menu.nombre}`,
      descripcion:
        'El menú del día quedará deshabilitado y dejará de aparecer en la carta. Sus datos se conservan.',
      textoConfirmar: 'Dar de baja',
      variante: 'danger',
    });
    if (!confirmado) return;

    const respuesta = await darDeBajaMenuDelDia(menu.id);
    if (!respuesta.exito) {
      mostrarToast({
        titulo: respuesta.error ?? 'No se pudo dar de baja el menú del día',
        variante: 'danger',
      });
      return;
    }
    mostrarToast({ titulo: 'Menú del día dado de baja', variante: 'success' });
    alRecargar();
  };
}
