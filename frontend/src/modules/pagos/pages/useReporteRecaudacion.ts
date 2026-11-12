import { useState } from 'react';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReporteRecaudacionPdf, obtenerReporteRecaudacion } from '../api';
import type { ResumenRecaudacion } from '../types';
import { validarPeriodo } from '../validarPeriodo';

export const ERROR_CARGA = 'No se pudo cargar el reporte.';
export const ERROR_DESCARGA = 'No se pudo descargar el PDF.';

/** Período, resultado y descarga del reporte de recaudación por medio de pago (HU-M6-08). */
export function useReporteRecaudacion() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
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
