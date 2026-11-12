import type { Reserva } from '../types';

/** El restaurante usa UTC-3 fijo, igual que `ZONA_DEL_RESTAURANTE` del backend; no la del navegador. */
const DESFASE_DEL_RESTAURANTE_MS = -3 * 60 * 60 * 1000;

export const MOTIVO_OTRO_DIA = 'Solo se puede crear la comanda el día de la reserva';

/** Si una reserva `ACTIVA` se puede atender ahora y, cuando no, por qué (HU-M5-06). */
export type AtencionDeReserva = { disponible: true } | { disponible: false; motivo: string };

/**
 * Fecha (`YYYY-MM-DD`) y hora (`HH:MM`) del restaurante en ese instante. Corre el instante tres
 * horas atrás y lo lee en UTC, así que el resultado no depende de la zona del navegador.
 */
function fechaYHoraDelRestaurante(instante: Date): { fecha: string; hora: string } {
  const texto = new Date(instante.getTime() + DESFASE_DEL_RESTAURANTE_MS).toISOString();
  return { fecha: texto.slice(0, 10), hora: texto.slice(11, 16) };
}

/**
 * Espejo de la regla del backend: la reserva se atiende el día de la reserva y desde su hora, ambos
 * en la hora del restaurante. El servidor sigue decidiendo; esto solo evita ofrecer la acción
 * cuando se sabe que va a fallar. `fecha` llega como `YYYY-MM-DD` y `hora` como `HH:MM`.
 */
export function atencionDeReserva(
  reserva: Pick<Reserva, 'fecha' | 'hora'>,
  ahora: Date,
): AtencionDeReserva {
  const hoy = fechaYHoraDelRestaurante(ahora);
  if (reserva.fecha !== hoy.fecha) return { disponible: false, motivo: MOTIVO_OTRO_DIA };
  if (reserva.hora > hoy.hora) {
    return { disponible: false, motivo: `Disponible desde las ${reserva.hora}` };
  }
  return { disponible: true };
}
