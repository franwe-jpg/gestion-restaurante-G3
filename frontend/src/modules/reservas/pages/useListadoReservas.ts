import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import { listarReservas } from '../api';
import { hoyLocal } from '../fechas';
import type { FiltroEstadoReserva } from '../types';

const LIMITE_PAGINA = 50;

/**
 * Día, estado y página del listado. El día arranca en hoy y el estado en `ACTIVA` (S8, S25);
 * cambiar cualquiera de los dos vuelve a la primera página.
 */
export function useListadoReservas() {
  const [fecha, setFecha] = useState(hoyLocal);
  const [estado, setEstado] = useState<FiltroEstadoReserva>('ACTIVA');
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_PAGINA });
  const reservas = useApi(
    () => listarReservas(fecha, estado, LIMITE_PAGINA, paginacion.offset),
    `${fecha}-${estado}-${paginacion.offset}`,
  );

  const totalActual = reservas.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  const cambiarFecha = (nueva: string) => {
    setFecha(nueva);
    paginacion.irAPagina(1);
  };

  const cambiarEstado = (nuevo: FiltroEstadoReserva) => {
    setEstado(nuevo);
    paginacion.irAPagina(1);
  };

  return { fecha, estado, paginacion, reservas, cambiarFecha, cambiarEstado };
}
