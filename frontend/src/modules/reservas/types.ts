export type EstadoReserva =
  'ACTIVA' | 'ATENDIDA' | 'CANCELADA_ANTICIPADA' | 'CANCELADA_POR_AUSENCIA';
export type FiltroEstadoReserva = EstadoReserva | 'TODAS';

export interface Reserva {
  id: number;
  mesa_id: number;
  cliente_id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cantidad_personas: number;
  estado: EstadoReserva;
}

export type ReservaCrear = Omit<Reserva, 'id' | 'estado'>;
export type ReservaModificar = Pick<Reserva, 'fecha' | 'hora' | 'cantidad_personas'>;
