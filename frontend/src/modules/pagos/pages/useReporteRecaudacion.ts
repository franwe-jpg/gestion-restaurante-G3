import { useState } from 'react';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReporteRecaudacionPdf, obtenerReporteRecaudacion } from '../api';
import type { ResumenRecaudacion } from '../types';
import { validarPeriodo } from '../validarPeriodo';

export const ERROR_CARGA = 'No se pudo cargar el reporte.';
export const ERROR_DESCARGA = 'No se pudo descargar el PDF.';

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

/** Período, resultado y descarga del reporte de recaudación por medio de pago (HU-M6-08). */
export function useReporteRecaudacion() {
  const [desde, setDesde] = useState(() => periodoInicial().desde);
  const [hasta, setHasta] = useState(() => periodoInicial().hasta);
  const [resultado, setResultado] = useState<ResumenRecaudacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const generar = async () => {
    setResultado(null);
    setErrorDescarga(null);
    const invalido = validarPeriodo(desde, hasta);
    setError(invalido);
    if (invalido) return;

    setCargando(true);
    const respuesta = await obtenerReporteRecaudacion(desde, hasta);
    setCargando(false);
    if (respuesta.exito && respuesta.datos) {
      setResultado(respuesta.datos);
    } else {
      setError(respuesta.error ?? ERROR_CARGA);
    }
  };

  const descargarPdf = async () => {
    if (!resultado) return;
    const { fecha_desde: d, fecha_hasta: h } = resultado;
    setErrorDescarga(null);
    setDescargando(true);
    const respuesta = await descargarReporteRecaudacionPdf(d, h);
    setDescargando(false);
    if (respuesta.exito && respuesta.datos) {
      guardarArchivo(respuesta.datos, `recaudacion-medio-pago_${d}_${h}.pdf`);
    } else {
      setErrorDescarga(respuesta.error ?? ERROR_DESCARGA);
    }
  };

  return {
    desde,
    hasta,
    setDesde,
    setHasta,
    resultado,
    error,
    errorDescarga,
    cargando,
    descargando,
    generar,
    descargarPdf,
  };
}
