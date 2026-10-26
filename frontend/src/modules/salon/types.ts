// Tipos de la API de salón. Los nombres de campo son los del backend.

export type Estado = 'HABILITADO' | 'DESHABILITADO';

export interface Sector {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: Estado;
}

// HU-M3-01: alta de sectores. El estado no se envía: lo asigna el sistema.
export interface SectorCrear {
  nombre: string;
  descripcion?: string | null;
}

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
