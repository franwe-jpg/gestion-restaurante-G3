import type { SeccionListado } from '../types';

export type OpcionSeccion = Pick<SeccionListado, 'id' | 'nombre'>;

/** Agrega la sección actual del producto, con el sufijo «(deshabilitada)», si no está habilitada (E11). */
export function seccionesParaEditar(
  habilitadas: OpcionSeccion[],
  actual: OpcionSeccion,
): OpcionSeccion[] {
  if (habilitadas.some((seccion) => seccion.id === actual.id)) return habilitadas;
  return [...habilitadas, { id: actual.id, nombre: `${actual.nombre} (deshabilitada)` }];
}
