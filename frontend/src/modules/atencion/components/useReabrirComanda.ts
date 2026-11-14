import { useConfirm } from '../../../shared/hooks/useConfirm';
import { reabrirComanda } from '../api';

export function useReabrirComanda(recargar: () => void, avisar: (mensaje: string) => void) {
  const confirmar = useConfirm();

  return async (id: number) => {
    const aceptado = await confirmar({
      titulo: `Reabrir comanda #${id}`,
      descripcion: 'La comanda vuelve a estar ABIERTA y se pueden modificar sus productos.',
      textoConfirmar: 'Reabrir',
    });
    if (!aceptado) return;
    const respuesta = await reabrirComanda(id);
    avisar(respuesta.exito ? 'Comanda reabierta' : (respuesta.error ?? 'No se pudo reabrir'));
    recargar();
  };
}
