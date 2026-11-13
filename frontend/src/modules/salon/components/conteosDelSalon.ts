import type { Mesa, Sector } from '../types';

/** Sectores en estado habilitado: los únicos que reciben mesas nuevas. */
export function contarSectoresHabilitados(sectores: Sector[]): number {
  return sectores.filter((sector) => sector.estado === 'HABILITADO').length;
}

/** Mesas de la página cargada en el estado indicado. */
export function contarMesasPorEstado(mesas: Mesa[], estado: Mesa['estado']): number {
  return mesas.filter((mesa) => mesa.estado === estado).length;
}
