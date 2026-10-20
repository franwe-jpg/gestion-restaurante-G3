export type EstadoMesa = 'libre' | 'ocupada' | 'reservada' | 'mantenimiento';

export interface Mesa {
  id: string;
  numero: string;
  sector: string;
  capacidad: number;
  estado: EstadoMesa;
  mozoAsignado?: string;
}

export interface Mozo {
  id: string;
  nombre: string;
  activo: boolean;
}
