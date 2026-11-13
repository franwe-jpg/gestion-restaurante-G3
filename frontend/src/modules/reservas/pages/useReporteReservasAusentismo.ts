import { useState } from 'react';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReporteReservasAusentismoPdf, obtenerReporteReservasAusentismo } from '../api';
import { hoyLocal } from '../fechas';
import type { ResumenReservas } from '../types';
import { validarPeriodo } from '../validarPeriodo';

export const ERROR_CARGA = 'No se pudo cargar el reporte.';
export const ERROR_DESCARGA = 'No se pudo descargar el PDF.';

/** Primer día del mes actual y hoy como `YYYY-MM-DD`, en la zona del navegador. */
function periodoInicial(): { desde: string; hasta: string } {
  const hasta = hoyLocal();
  return { desde: `${hasta.slice(0, 7)}-01`, hasta };
}

/** Período, resultado y descarga del reporte de reservas y ausentismo (HU-M5-07). */
export function useReporteReservasAusentismo() {
  const [desde, setDesde] = useState(() => periodoInicial().desde);
  const [hasta, setHasta] = useState(() => periodoInicial().hasta);
  const [resultado, setResultado] = useState<ResumenReservas | null>(null);
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
    const respuesta = await obtenerReporteReservasAusentismo(desde, hasta);
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
    const respuesta = await descargarReporteReservasAusentismoPdf(d, h);
    setDescargando(false);
    if (respuesta.exito && respuesta.datos) {
      guardarArchivo(respuesta.datos, `reservas-ausentismo_${d}_${h}.pdf`);
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
