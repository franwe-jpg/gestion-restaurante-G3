import type { ReporteProductosMasVendidos } from './types';

export interface ProductoMasVendido {
  id: number;
  etiqueta: string;
  cantidad: number;
}

/** Los `limite` productos más pedidos entre todas las secciones, con el orden del backend. */
export function masVendidos(reporte: ReporteProductosMasVendidos, limite: number) {
  return reporte.secciones
    .flatMap((seccion) => seccion.productos)
    .sort(
      (a, b) =>
        b.cantidad_pedida - a.cantidad_pedida ||
        a.nombre.localeCompare(b.nombre, 'es') ||
        a.producto_id - b.producto_id,
    )
    .slice(0, limite)
    .map((p): ProductoMasVendido => ({
      id: p.producto_id,
      etiqueta: p.estado === 'DESHABILITADO' ? `${p.nombre} (Deshabilitado)` : p.nombre,
      cantidad: p.cantidad_pedida,
    }));
}
