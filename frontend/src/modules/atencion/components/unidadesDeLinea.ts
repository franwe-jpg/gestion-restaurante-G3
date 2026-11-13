import type { DetalleEntrega } from '../types';

export interface UnidadesDeLinea {
  entregadas: number;
  listas: number;
  pendientes: number;
}

/**
 * Reparte las unidades de una línea en tres estados (HU-M4-12, L7). La cantidad lista es
 * independiente de la entregada: una línea puede tener menos listas que entregadas.
 */
export function unidadesDeLinea(
  detalle: Pick<DetalleEntrega, 'cantidad' | 'cantidad_entregada' | 'cantidad_lista'>,
): UnidadesDeLinea {
  const { cantidad, cantidad_entregada: entregadas, cantidad_lista: lista } = detalle;
  return {
    entregadas,
    listas: Math.max(lista - entregadas, 0),
    pendientes: cantidad - Math.max(lista, entregadas),
  };
}
