import type { RespuestaApi } from '../../shared/types';

export type Estado = 'HABILITADO' | 'DESHABILITADO';

export type FiltroEstado = Estado | 'TODOS';

export interface SeccionResumen {
  id: number;
  nombre: string;
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
