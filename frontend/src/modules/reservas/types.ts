export type EstadoReserva = 'confirmada' | 'pendiente' | 'cancelada' | 'cumplida';

export interface Reserva {
  id: string;
  cliente: string;
  telefono: string;
  fecha: string;
  hora: string;
  comensales: number;
  estado: EstadoReserva;
  mesaAsignada?: string;
  observaciones?: string;
}
