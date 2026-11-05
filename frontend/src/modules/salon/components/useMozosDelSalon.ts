import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarMozos } from '../api';
import type { Mozo } from '../types';

export const LIMITE_MOZOS = 50;

/** Listado completo de mozos (habilitados y deshabilitados), paginado de a 50. */
export function useMozosDelSalon(refresco = 0): {
  mozos: Mozo[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_MOZOS });
  const consulta = useApi(
    () => listarMozos(LIMITE_MOZOS, paginacion.offset),
    `mozos-${paginacion.offset}-${refresco}`,
  );

  const totalActual = consulta.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  return {
    mozos: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion,
  };
}
