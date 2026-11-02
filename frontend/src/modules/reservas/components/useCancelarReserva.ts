import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import type { RespuestaApi } from '../../../shared/types';
import { cancelarReservaAnticipada, cancelarReservaPorAusencia } from '../api';
import type { Reserva } from '../types';

export interface OpcionesCancelarReserva {
  onCancelada: () => void;
}

interface Cancelacion {
  titulo: string;
  descripcion: string;
  avisoExito: string;
  llamar: (id: number) => Promise<RespuestaApi<Reserva>>;
}

/** Textos de S52 (HU-M5-04-05) y endpoint de cada motivo. */
const ANTICIPADA: Cancelacion = {
  titulo: '¿Cancelar la reserva?',
  descripcion: 'La mesa quedará disponible para ese turno.',
  avisoExito: 'Reserva cancelada',
  llamar: cancelarReservaAnticipada,
};

const POR_AUSENCIA: Cancelacion = {
  titulo: '¿Cancelar por ausencia?',
  descripcion: 'La mesa quedará disponible para ese turno y se registra que el cliente no vino.',
  avisoExito: 'Reserva cancelada por ausencia',
  llamar: cancelarReservaPorAusencia,
};

/** HU-M5-04 y HU-M5-05: confirmación, cancelación y avisos de una reserva del listado. */
export function useCancelarReserva({ onCancelada }: OpcionesCancelarReserva) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [cancelando, setCancelando] = useState(false);

  const cancelar = async (reserva: Pick<Reserva, 'id'>, cancelacion: Cancelacion) => {
    const aceptado = await confirmar({
      titulo: cancelacion.titulo,
      descripcion: cancelacion.descripcion,
      textoConfirmar: 'Cancelar',
      textoCancelar: 'Volver',
      variante: 'danger',
    });
    if (!aceptado) return;

    setCancelando(true);
    const respuesta = await cancelacion.llamar(reserva.id);
    setCancelando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: cancelacion.avisoExito, variante: 'success' });
      onCancelada();
      return;
    }
    mostrarToast({
      titulo: 'No se pudo cancelar la reserva',
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return {
    cancelando,
    cancelarAnticipada: (reserva: Pick<Reserva, 'id'>) => cancelar(reserva, ANTICIPADA),
    cancelarPorAusencia: (reserva: Pick<Reserva, 'id'>) => cancelar(reserva, POR_AUSENCIA),
  };
}
