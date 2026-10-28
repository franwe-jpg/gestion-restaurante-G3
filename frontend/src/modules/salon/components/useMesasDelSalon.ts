import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarMesas } from '../api';
import type { Mesa } from '../types';

export const LIMITE_MESAS = 50;

/** Listado paginado de mesas con su sector (HU-M3-08). `refresco` fuerza otra consulta. */
export function useMesasDelSalon(refresco = 0): {
  mesas: Mesa[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_MESAS });
  const consulta = useApi(
    () => listarMesas(LIMITE_MESAS, paginacion.offset),
    `mesas-${paginacion.offset}-${refresco}`,
  );

  const totalActual = consulta.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  return {
    mesas: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion,
  };
}
