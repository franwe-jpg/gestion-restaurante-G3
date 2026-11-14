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

// HU-M3-02: modificación de sectores. El estado no se envía: lo conserva el sector.
export interface SectorModificar {
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

// HU-M3-06: modificación de mesas. El estado no se envía: lo conserva la mesa.
export interface MesaModificar {
  numero: number;
  capacidad: number;
  sector_id: number;
}

/** Datos comunes de las personas del salón con acceso al sistema (mozos y chefs). */
export interface Persona {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  estado: Estado;
  /** Correo del usuario vinculado; nulo si la persona todavía no tiene usuario (S5). */
  correo: string | null;
}

export type Mozo = Persona;

export type Chef = Persona;

// HU-M3-09 y HU-TR-01: alta con correo y contraseña. El estado no se envía: el sistema lo fija.
export interface PersonaCrear {
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  correo: string;
  contrasena: string;
}

// HU-M3-10 y HU-TR-01: la contraseña vacía o ausente conserva la actual (S2).
export interface PersonaModificar {
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  correo: string;
  contrasena?: string;
}

export type MozoCrear = PersonaCrear;

export type MozoModificar = PersonaModificar;

export type ChefCrear = PersonaCrear;

export type ChefModificar = PersonaModificar;

// HU-M3-13: reporte de mesas atendidas y ventas por mozo. Los importes son texto decimal.
export interface LineaReporteMozo {
  mozo_id: number;
  nombre: string;
  apellido: string;
  mesas_atendidas: number;
  total_ventas: string;
  promedio_por_mesa: string;
}

export interface ReporteMesasVentasPorMozo {
  fecha_desde: string;
  fecha_hasta: string;
  lineas: LineaReporteMozo[];
  total_mesas_atendidas: number;
  total_ventas: string;
  promedio_general: string;
}
