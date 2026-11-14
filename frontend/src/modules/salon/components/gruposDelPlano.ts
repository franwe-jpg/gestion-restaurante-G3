import type { Mesa } from '../types';

export interface GrupoMesasPorSector {
  sectorId: number;
  sectorNombre: string;
  mesas: Mesa[];
}

export interface CriteriosAccionesPlano {
  mesa: Mesa;
  gestiona: boolean;
  puedeAbrirComanda: boolean;
  onEditar?: (mesa: Mesa) => void;
  onEliminar?: (mesa: Mesa) => void;
  onAbrirComanda?: (mesa: Mesa) => void;
}

/** Agrupa las mesas por sector, con los sectores ordenados por nombre. */
export function agruparMesasPorSector(mesas: Mesa[]): GrupoMesasPorSector[] {
  const grupos = new Map<number, GrupoMesasPorSector>();
  for (const mesa of mesas) {
    const grupo = grupos.get(mesa.sector.id);
    if (grupo) {
      grupo.mesas.push(mesa);
    } else {
      grupos.set(mesa.sector.id, {
        sectorId: mesa.sector.id,
        sectorNombre: mesa.sector.nombre,
        mesas: [mesa],
      });
    }
  }
  return [...grupos.values()].sort((a, b) => a.sectorNombre.localeCompare(b.sectorNombre, 'es'));
}

/** Si el plano muestra al menos una acción para la mesa. */
export function hayAccionesDelPlano({
  mesa,
  gestiona,
  puedeAbrirComanda,
  onEditar,
  onEliminar,
  onAbrirComanda,
}: CriteriosAccionesPlano): boolean {
  const verAbrir = puedeAbrirComanda && mesa.estado === 'LIBRE' && onAbrirComanda !== undefined;
  const verEditar = gestiona && onEditar !== undefined;
  const verEliminar = gestiona && mesa.estado !== 'OCUPADA' && onEliminar !== undefined;
  return verAbrir || verEditar || verEliminar;
}
