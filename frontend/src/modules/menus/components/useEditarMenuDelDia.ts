import { useToast } from '../../../shared/hooks/useToast';
import { obtenerMenuDelDia } from '../api';
import type { MenuDelDia, MenuDelDiaListado } from '../types';

/** Carga el menú completo para editar; si falla, avisa y no cambia el formulario (HU-M2-05). */
export function useEditarMenuDelDia(alElegir: (menu: MenuDelDia) => void) {
  const { mostrarToast } = useToast();

  return async (menu: MenuDelDiaListado) => {
    const respuesta = await obtenerMenuDelDia(menu.id);
    if (respuesta.exito && respuesta.datos !== null) {
      alElegir(respuesta.datos);
      return;
    }
    mostrarToast({
      titulo: respuesta.error ?? 'No se pudo cargar el menú del día',
      variante: 'danger',
    });
  };
}
