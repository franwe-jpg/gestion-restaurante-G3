// Tipos de la API de la carta (HU-M1-10). Los nombres de campo son los del backend.

export type Estado = 'HABILITADO' | 'DESHABILITADO';

export type Categoria = 'PLATO' | 'POSTRE' | 'BEBIDA' | 'MENU_DEL_DIA';

export interface ProductoResumen {
  id: number;
  nombre: string;
}

export interface Seccion {
  id: number;
  nombre: string;
  orden: number;
  estado: Estado;
  productos: ProductoResumen[];
}

export interface SeccionListado {
  id: number;
  nombre: string;
  orden: number;
  estado: Estado;
  cantidad_productos: number;
}

export interface SeccionCrear {
  nombre: string;
  orden: number;
  producto_ids: number[];
  confirmar_traslado: boolean;
}

export interface ProductoSeleccionable {
  id: number;
  nombre: string;
  categoria: Categoria;
  seccion: { id: number; nombre: string };
}

// HU-M1-01: alta de platos. `precio` viaja como texto decimal con punto ("12500.50").
export interface PlatoCrear {
  nombre: string;
  seccion_id: number;
  precio: string;
  ingredientes: string[];
  descripcion: string | null;
  etiquetas: string[];
}

export interface ProductoSalida {
  id: number;
  nombre: string;
  categoria: Categoria;
  precio: string;
  ingredientes: string[];
  descripcion: string | null;
  etiquetas: string[];
  estado: Estado;
  seccion: { id: number; nombre: string };
  imagen_url: string | null;
}
