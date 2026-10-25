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
