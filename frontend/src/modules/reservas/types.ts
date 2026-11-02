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

/** Propios de `reservas`: no se importan del módulo `salon` (AGENTS.md §9.4, S34). */
export interface SectorResumenMesa {
  id: number;
  nombre: string;
}

/** Una mesa libre para una fecha y hora, tal como la devuelve `GET /reservas/mesas-disponibles`. */
export interface MesaDisponible {
  id: number;
  numero: number;
  capacidad: number;
  sector: SectorResumenMesa;
}
