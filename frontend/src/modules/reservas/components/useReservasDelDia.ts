import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarReservas } from '../api';
import type { Reserva } from '../types';

export const LIMITE_RESERVAS = 50;

export interface EstadoReservasDelDia {
  reservas: Reserva[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
}

/** HU-M5-03: reservas de un día, paginadas. `refresco` fuerza otra consulta. */
export function useReservasDelDia(fecha: string, refresco = 0): EstadoReservasDelDia {
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_RESERVAS });
  const consulta = useApi(
    () => listarReservas(fecha, LIMITE_RESERVAS, paginacion.offset),
    `reservas-${fecha}-${paginacion.offset}-${refresco}`,
  );

  const totalActual = consulta.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  return {
    reservas: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion,
  };
}
