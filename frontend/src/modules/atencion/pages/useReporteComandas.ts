import { useState } from 'react';

import { obtenerReporteComandas } from '../api';
import type { ReporteComandasTicketPromedio, TurnoReporteComandas } from '../types';
import { validarPeriodo } from './validarPeriodo';

/**
 * Primer día del mes actual y hoy como `YYYY-MM-DD` en hora local.
 * No usa `toISOString()`: en UTC-3 adelanta el día después de las 21:00.
 */
function periodoInicial(): { desde: string; hasta: string } {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  return {
    desde: `${ahora.getFullYear()}-${mes}-01`,
    hasta: `${ahora.getFullYear()}-${mes}-${String(ahora.getDate()).padStart(2, '0')}`,
  };
}

export function useReporteComandas() {
  const [desde, setDesde] = useState(() => periodoInicial().desde);
  const [hasta, setHasta] = useState(() => periodoInicial().hasta);
  const [turno, setTurno] = useState<TurnoReporteComandas | ''>('');
  const [resultado, setResultado] = useState<ReporteComandasTicketPromedio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const generar = async () => {
    setResultado(null);
    const invalido = validarPeriodo(desde, hasta);
    setError(invalido);
    if (invalido) return;
    setCargando(true);
    const respuesta = await obtenerReporteComandas(desde, hasta, turno || null);
    setCargando(false);
    if (respuesta.exito && respuesta.datos) {
      setResultado(respuesta.datos);
      return;
    }
    setResultado(null);
    setError(respuesta.error ?? 'No se pudo cargar el reporte.');
  };

  return {
    desde,
    hasta,
    turno,
    setDesde,
    setHasta,
    setTurno,
    resultado,
    error,
    cargando,
    generar,
  };
}
