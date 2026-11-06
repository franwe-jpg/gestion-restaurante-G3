import { useCallback, useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { listarFacturas } from '../api';
import type { FacturaResumen } from '../types';

export const LIMITE_FACTURAS = 50;

export interface PaginacionFacturas {
  pagina: number;
  totalPaginas: number;
  irAPagina: (pagina: number) => void;
}

/** HU-M6-02: listado paginado de facturas para elegir cuál cobrar. */
export function useFacturasDelModulo(): {
  facturas: FacturaResumen[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: PaginacionFacturas;
} {
  const [pagina, setPagina] = useState(1);
  const offset = (pagina - 1) * LIMITE_FACTURAS;
  const consulta = useApi(() => listarFacturas(LIMITE_FACTURAS, offset), `facturas-${offset}`);

  const total = consulta.datos?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_FACTURAS));
  const irAPagina = useCallback(
    (nuevaPagina: number) => {
      setPagina(Math.min(Math.max(1, nuevaPagina), totalPaginas));
    },
    [totalPaginas],
  );

  return {
    facturas: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion: { pagina, totalPaginas, irAPagina },
  };
}
