import { describe, expect, it } from 'vitest';

import { masVendidos } from './masVendidos';
import type { Estado, LineaReporteProductos, ReporteProductosMasVendidos } from './types';

function linea(id: number, nombre: string, cantidad: number, estado: Estado = 'HABILITADO') {
  const l: LineaReporteProductos = {
    producto_id: id,
    nombre,
    estado,
    cantidad_pedida: cantidad,
    dias_mas_pedidos: [],
    franjas_mas_pedidas: [],
  };
  return l;
}

function reporte(...secciones: LineaReporteProductos[][]): ReporteProductosMasVendidos {
  return {
    fecha_desde: '2026-11-01',
    fecha_hasta: '2026-11-05',
    secciones: secciones.map((productos, i) => ({
      id: i + 1,
      nombre: `S${i + 1}`,
      orden: i,
      productos,
    })),
  };
}

describe('masVendidos', () => {
  it('toma los 5 mayores entre todas las secciones, de mayor a menor', () => {
    const r = reporte(
      [linea(1, 'A', 1), linea(2, 'B', 9), linea(3, 'C', 4)],
      [linea(4, 'D', 7), linea(5, 'E', 2)],
      [linea(6, 'F', 8), linea(7, 'G', 3), linea(8, 'H', 5)],
    );

    expect(masVendidos(r, 5).map((i) => i.etiqueta)).toEqual(['B', 'F', 'D', 'H', 'C']);
    expect(masVendidos(r, 5).map((i) => i.cantidad)).toEqual([9, 8, 7, 5, 4]);
  });

  it('desempata por nombre y luego por producto_id', () => {
    const r = reporte([linea(3, 'Flan', 5), linea(2, 'Flan', 5), linea(1, 'Agua', 5)]);

    expect(masVendidos(r, 5).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('corta en 5 aunque haya empate en el puesto 5', () => {
    const r = reporte([
      linea(1, 'A', 9),
      linea(2, 'B', 8),
      linea(3, 'C', 7),
      linea(4, 'D', 6),
      linea(5, 'E', 5),
      linea(6, 'F', 5),
    ]);

    expect(masVendidos(r, 5).map((i) => i.etiqueta)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('devuelve los que haya si son menos de 5', () => {
    expect(masVendidos(reporte([linea(1, 'A', 2), linea(2, 'B', 1)]), 5)).toHaveLength(2);
  });

  it('marca los deshabilitados en la etiqueta', () => {
    const r = reporte([linea(1, 'Flan', 2, 'DESHABILITADO')]);

    expect(masVendidos(r, 5)[0]?.etiqueta).toBe('Flan (Deshabilitado)');
  });
});
