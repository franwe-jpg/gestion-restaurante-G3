import { useMemo, useState } from 'react';

import type { EstadoMesa, Mesa } from '../types';

export type FiltroEstadoMesa = 'TODOS' | EstadoMesa;

export const FILTRO_TODOS_LOS_SECTORES = 'TODOS';

export interface FiltrosActivos {
  sectorId: string;
  estado: FiltroEstadoMesa;
  mesasFiltradas: Mesa[];
  cambiarSector: (sectorId: string) => void;
  cambiarEstado: (estado: FiltroEstadoMesa) => void;
  limpiar: () => void;
}

function aplicarFiltros(mesas: Mesa[], sectorId: string, estado: FiltroEstadoMesa): Mesa[] {
  return mesas.filter(
    (mesa) =>
      (sectorId === FILTRO_TODOS_LOS_SECTORES || String(mesa.sector.id) === sectorId) &&
      (estado === 'TODOS' || mesa.estado === estado),
  );
}

/** Estado de los filtros con las mesas ya cargadas que pasan el filtro. */
export function useFiltrosDeMesas(mesas: Mesa[]): FiltrosActivos {
  const [sectorId, setSectorId] = useState(FILTRO_TODOS_LOS_SECTORES);
  const [estado, setEstado] = useState<FiltroEstadoMesa>('TODOS');
  const mesasFiltradas = useMemo(
    () => aplicarFiltros(mesas, sectorId, estado),
    [mesas, sectorId, estado],
  );

  const limpiar = () => {
    setSectorId(FILTRO_TODOS_LOS_SECTORES);
    setEstado('TODOS');
  };

  return {
    sectorId,
    estado,
    mesasFiltradas,
    cambiarSector: setSectorId,
    cambiarEstado: setEstado,
    limpiar,
  };
}
