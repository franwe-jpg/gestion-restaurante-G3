// Tipos de la API de reservas. Los nombres de campo son los del backend.

export type EstadoReserva =
  'ACTIVA' | 'ATENDIDA' | 'CANCELADA_ANTICIPADA' | 'CANCELADA_POR_AUSENCIA';

export interface MesaResumen {
  id: number;
  numero: number;
  capacidad: number;
  sector_nombre: string;
}

export interface Reserva {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM:SS
  cantidad_personas: number;
  mesa: MesaResumen;
  estado: EstadoReserva;
}

// HU-M5-01: alta de reservas. El estado no se envía: el sistema lo fija en Activa.
// Supuesto S1 de la spec: el cliente se guarda como nombre y teléfono en la propia reserva
// mientras M4 (Atención al Público) no tenga la entidad Cliente.
export interface ReservaCrear {
  cliente_nombre: string;
  cliente_telefono: string;
  fecha: string;
  hora: string;
  cantidad_personas: number;
  mesa_id: number;
}

// HU-M5-02: modificación de reservas. El cliente y la mesa no cambian.
export interface ReservaModificar {
  fecha: string;
  hora: string;
  cantidad_personas: number;
}
