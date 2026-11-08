import { useConfirm } from '../../../shared/hooks/useConfirm';
import { anularComanda } from '../api';

export function useAnularComanda(recargar: () => void, avisar: (mensaje: string) => void) {
  const confirmar = useConfirm();

  return async (id: number) => {
    const aceptado = await confirmar({
      titulo: `Anular comanda #${id}`,
      descripcion: `¿Confirmás que querés anular la comanda #${id}? Esta acción no se puede deshacer.`,
      variante: 'danger',
      textoConfirmar: 'Anular comanda',
    });
    if (!aceptado) return;
    const respuesta = await anularComanda(id);
    avisar(
      respuesta.exito ? 'Comanda anulada' : (respuesta.error ?? 'No se pudo anular la comanda'),
    );
    recargar();
  };
}
