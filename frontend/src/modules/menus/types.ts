import type { RespuestaApi } from '../../shared/types';

export type Estado = 'HABILITADO' | 'DESHABILITADO';
export type Categoria = 'PLATO' | 'POSTRE' | 'BEBIDA' | 'MENU_DEL_DIA';
export type FiltroEstado = Estado | 'TODOS';

export interface SeccionResumen {
  id: number;
  nombre: string;
}

export interface SeccionMenu extends SeccionResumen {
  estado: Estado;
}

export interface ProductoMenu {
  id: number;
  nombre: string;
  categoria: Categoria;
  estado: Estado;
}

export interface ProductoSeleccionable extends ProductoMenu {
  seccion: SeccionResumen;
}

export interface MenuEjecutivoCrear {
  nombre: string;
  precio_fijo: string;
  producto_ids: number[];
  seccion_id: number;
  descripcion: string | null;
}

export interface MenuEjecutivoActualizar extends MenuEjecutivoCrear {
  estado: Estado;
}

export interface MenuEjecutivo {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_fijo: string;
  estado: Estado;
  seccion: SeccionResumen;
  productos: ProductoMenu[];
}

/** Menú del día: es un Producto con categoría MENU_DEL_DIA. */
export interface MenuDelDia {
  id: number;
  nombre: string;
  categoria: 'MENU_DEL_DIA';
  precio: string;
  ingredientes: string[];
  descripcion: string | null;
  etiquetas: string[];
  estado: Estado;
  seccion: SeccionResumen;
  imagen_url: string | null;
}

export interface MenuDelDiaListado {
  id: number;
  nombre: string;
  descripcion: string | null;
  seccion: SeccionResumen;
  precio: string;
  estado: Estado;
  imagen_url: string | null;
}

export interface MenuDelDiaCrear {
  nombre: string;
  seccion_id: number;
  precio: string;
  ingredientes: string[];
  descripcion: string | null;
  etiquetas: string[];
}

export interface MenuDelDiaModificar extends MenuDelDiaCrear {
  estado?: Estado;
  quitar_imagen?: boolean;
}

export type RespuestaMenu = RespuestaApi<MenuDelDia>;
