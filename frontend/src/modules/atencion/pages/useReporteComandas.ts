import { useState } from 'react';

import { obtenerReporteComandas } from '../api';
import type { ReporteComandasTicketPromedio, TurnoReporteComandas } from '../types';
import { validarPeriodo } from './validarPeriodo';

export function useReporteComandas() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
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
