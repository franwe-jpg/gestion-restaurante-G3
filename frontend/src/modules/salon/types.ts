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

export type EstadoMesa = 'LIBRE' | 'OCUPADA' | 'FUERA_DE_SERVICIO';

export interface SectorResumen {
  id: number;
  nombre: string;
}

export interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  sector: SectorResumen;
  estado: EstadoMesa;
}

// HU-M3-05: alta de mesas. El estado no se envía: el sistema lo fija en LIBRE.
export interface MesaCrear {
  numero: number;
  capacidad: number;
  sector_id: number;
}

export interface Mozo {
  id: string;
  nombre: string;
  activo: boolean;
}
