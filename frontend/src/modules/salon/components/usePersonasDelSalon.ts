import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import type { Pagina, RespuestaApi } from '../../../shared/types';
import type { Persona } from '../types';

export const LIMITE_PERSONAS = 50;

/** Listado completo (habilitados y deshabilitados) de mozos o chefs, paginado de a 50. */
export function usePersonasDelSalon(
  listar: (limit: number, offset: number) => Promise<RespuestaApi<Pagina<Persona>>>,
  clave: string,
  refresco: number,
): {
  personas: Persona[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_PERSONAS });
  const consulta = useApi(
    () => listar(LIMITE_PERSONAS, paginacion.offset),
    `${clave}-${paginacion.offset}-${refresco}`,
  );

  const totalActual = consulta.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  return {
    personas: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion,
  };
}
