export type Estado = 'HABILITADO' | 'DESHABILITADO';
export type Categoria = 'PLATO' | 'POSTRE' | 'BEBIDA' | 'MENU_DEL_DIA';
export type FiltroEstado = Estado | 'TODOS';

export interface ProductoMenu {
  id: number;
  nombre: string;
  categoria: Categoria;
  estado: Estado;
}

export interface ProductoSeleccionable extends ProductoMenu {
  seccion: { id: number; nombre: string };
}

export interface SeccionMenu {
  id: number;
  nombre: string;
  estado: Estado;
}

export interface MenuEjecutivoCrear {
  nombre: string;
  precio_fijo: string;
  producto_ids: number[];
  seccion_id: number;
  descripcion: string | null;
}

export interface MenuEjecutivo {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_fijo: string;
  estado: Estado;
  seccion: { id: number; nombre: string };
  productos: ProductoMenu[];
}
