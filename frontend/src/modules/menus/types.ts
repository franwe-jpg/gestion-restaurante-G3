import type { RespuestaApi } from '../../shared/types';

export type Estado = 'HABILITADO' | 'DESHABILITADO';
export type Categoria = 'PLATO' | 'POSTRE' | 'BEBIDA' | 'MENU_DEL_DIA';
export type FiltroEstado = Estado | 'TODOS';
export type TipoPromocion = 'PORCENTAJE' | 'PRECIO_FIJO' | 'NXM';
export type DiaSemana =
  'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

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

export interface PromocionCrear {
  nombre: string;
  tipo: TipoPromocion;
  descripcion: string | null;
  producto_ids: number[];
  fecha_desde: string;
  fecha_hasta: string;
  dias_semana: DiaSemana[];
  hora_desde: string | null;
  hora_hasta: string | null;
  descuento_porcentaje: number | null;
  precio_fijo: string | null;
  cant_lleva: number | null;
  cant_paga: number | null;
}

export interface Promocion extends Omit<PromocionCrear, 'producto_ids'> {
  id: number;
  estado: Estado;
  fecha_hora_finalizacion: string | null;
  productos: ProductoMenu[];
}

export type PromocionListado = Promocion;

export type PromocionModificar = PromocionCrear;

export type UnidadPromedio = 'DIA' | 'HORA';

export interface PromocionReporte {
  id: number;
  nombre: string;
  estado: Estado;
  fecha_desde: string;
  fecha_hasta: string;
  hora_desde: string | null;
  hora_hasta: string | null;
}

export interface LineaImpactoPromocion {
  producto_id: number;
  nombre: string;
  estado: Estado;
  promedio_durante: string | null;
  promedio_fuera: string | null;
  diferencia_promedio: string | null;
  impacto_estimado: string | null;
  variacion_porcentual: string | null;
  cantidad_durante: number;
  cantidad_fuera: number;
  dias_con_ventas_promocion: number;
}

export interface ReporteImpactoPromociones {
  promocion: PromocionReporte;
  fecha_desde: string;
  fecha_hasta: string;
  dias_promocion: number;
  dias_fuera: number;
  horas_promocion_por_dia: string | null;
  unidad_promedio: UnidadPromedio;
  hay_datos: boolean;
  lineas: LineaImpactoPromocion[];
}
