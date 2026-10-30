import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarSectores } from '../api';
import type { Sector } from '../types';

export const LIMITE_SECTORES = 50;

/** Listado completo de sectores (habilitados y deshabilitados), paginado de a 50. */
export function useSectoresDelSalon(): {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_SECTORES });
  const consulta = useApi(
    () => listarSectores(LIMITE_SECTORES, paginacion.offset),
    `sectores-${paginacion.offset}`,
  );

  const totalActual = consulta.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  return {
    sectores: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion,
  };
}
