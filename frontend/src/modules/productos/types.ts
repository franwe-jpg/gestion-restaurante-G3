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
  productos_habilitados: number;
}

export interface SeccionListado {
  id: number;
  nombre: string;
  orden: number;
  estado: Estado;
  cantidad_productos: number;
  productos_habilitados: number;
}

export interface SeccionCrear {
  nombre: string;
  orden: number;
  producto_ids: number[];
  confirmar_traslado: boolean;
}

/** `estado` solo se envía para reactivar: la baja va por su propia acción (H13). */
export interface SeccionModificar extends SeccionCrear {
  estado?: 'HABILITADO';
}

export interface ProductoSeleccionable {
  id: number;
  nombre: string;
  categoria: Categoria;
  seccion: { id: number; nombre: string };
}

// HU-M1-13: filtro de la lista. `TODOS` no es un estado del producto, solo una opción del filtro.
export type FiltroEstado = Estado | 'TODOS';

export interface ProductoListado extends ProductoSeleccionable {
  precio: string;
  etiquetas: string[];
  estado: Estado;
}

// HU-M1-01: alta de platos. `precio` viaja como texto decimal con punto ("12500.50").
export interface ProductoCrear {
  nombre: string;
  seccion_id: number;
  precio: string;
  ingredientes: string[];
  descripcion: string | null;
  etiquetas: string[];
}

// HU-M1-02: modificación. `estado` es editable y `quitar_imagen` deja al plato sin imagen.
export interface ProductoModificar extends ProductoCrear {
  estado: Estado;
  quitar_imagen: boolean;
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

// HU-M1-14: carta por secciones. `precio` viaja como texto decimal con punto ("12500.50").
export interface ProductoCarta {
  id: number;
  nombre: string;
  categoria: Categoria;
  precio: string;
  descripcion: string | null;
  etiquetas: string[];
  imagen_url: string | null;
  estado: Estado;
}

export interface SeccionCarta {
  id: number;
  nombre: string;
  orden: number;
  estado: Estado;
  productos: ProductoCarta[];
}

// Reporte de productos más vendidos (HU-M1-15). Nombres de campo del backend.

export type DiaSemana =
  'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

export interface FranjaHoraria {
  hora_desde: number;
  hora_hasta: number;
}

export interface LineaReporteProductos {
  producto_id: number;
  nombre: string;
  estado: Estado;
  cantidad_pedida: number;
  dias_mas_pedidos: DiaSemana[];
  franjas_mas_pedidas: FranjaHoraria[];
}

export interface SeccionReporte {
  id: number;
  nombre: string;
  orden: number;
  productos: LineaReporteProductos[];
}

export interface ReporteProductosMasVendidos {
  fecha_desde: string;
  fecha_hasta: string;
  secciones: SeccionReporte[];
}
