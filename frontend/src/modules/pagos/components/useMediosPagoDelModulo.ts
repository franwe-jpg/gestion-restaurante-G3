import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import { listarMediosPago } from '../api';
import type { MedioPago } from '../types';

export const LIMITE_MEDIOS_PAGO = 50;

/** HU-M6-07: listado paginado de a 50; los deshabilitados solo a pedido (S2). */
export function useMediosPagoDelModulo(incluirDeshabilitados: boolean): {
  mediosPago: MedioPago[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
} {
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_MEDIOS_PAGO });
  const consulta = useApi(
    () => listarMediosPago(LIMITE_MEDIOS_PAGO, paginacion.offset, incluirDeshabilitados),
    `medios-pago-${paginacion.offset}-${incluirDeshabilitados}`,
  );

  const totalActual = consulta.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  return {
    mediosPago: consulta.datos?.items ?? [],
    cargando: consulta.cargando,
    error: consulta.error,
    recargar: consulta.recargar,
    paginacion,
  };
}
