import { useState } from 'react';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReportePdf, obtenerReporteMasVendidos } from '../api';
import { masVendidos } from '../masVendidos';
import type { ProductoMasVendido } from '../masVendidos';
import type { ReporteProductosMasVendidos } from '../types';
import { validarPeriodo } from '../validarPeriodo';

const CANTIDAD_EN_GRAFICO = 5;

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

interface Resultado {
  periodo: { desde: string; hasta: string };
  productos: ProductoMasVendido[];
}

function aResultado(reporte: ReporteProductosMasVendidos): Resultado {
  return {
    periodo: { desde: reporte.fecha_desde, hasta: reporte.fecha_hasta },
    productos: masVendidos(reporte, CANTIDAD_EN_GRAFICO),
  };
}

export function useReporteMasVendidos() {
  const [desde, setDesde] = useState(() => periodoInicial().desde);
  const [hasta, setHasta] = useState(() => periodoInicial().hasta);
  const [resultado, setResultado] = useState<Resultado | null>(null);
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
    const respuesta = await obtenerReporteMasVendidos(desde, hasta);
    setCargando(false);
    if (respuesta.exito && respuesta.datos) {
      setResultado(aResultado(respuesta.datos));
    } else {
      setError('No se pudo cargar el reporte.');
    }
  };

  const descargarPdf = async () => {
    if (!resultado) return;
    const { desde: d, hasta: h } = resultado.periodo;
    setErrorDescarga(null);
    setDescargando(true);
    const respuesta = await descargarReportePdf(d, h);
    setDescargando(false);
    if (respuesta.exito && respuesta.datos) {
      guardarArchivo(respuesta.datos, `productos-mas-vendidos_${d}_${h}.pdf`);
    } else {
      setErrorDescarga('No se pudo descargar el PDF.');
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
