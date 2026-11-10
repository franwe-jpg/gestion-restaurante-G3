import { useEffect, useState } from 'react';

import { listarPromociones, obtenerReporteImpactoPromociones } from '../api';
import type { Promocion, ReporteImpactoPromociones } from '../types';
import { validarFiltrosReporte } from '../validarFiltrosReporte';

const LIMITE_PROMOCIONES = 100;

function usePromocionesDelReporte() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);

  useEffect(() => {
    let activo = true;
    void listarPromociones('TODOS', LIMITE_PROMOCIONES, 0).then((respuesta) => {
      if (!activo) return;
      if (respuesta.exito && respuesta.datos) setPromociones(respuesta.datos.items);
    });
    return () => {
      activo = false;
    };
  }, []);

  return promociones;
}

/** Estado del reporte de impacto de promociones (HU-M2-10). */
export function useReporteImpactoPromociones() {
  const promociones = usePromocionesDelReporte();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [promocionId, setPromocionId] = useState('');
  const [resultado, setResultado] = useState<ReporteImpactoPromociones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const generar = async () => {
    setResultado(null);
    const invalido = validarFiltrosReporte(desde, hasta, promocionId);
    setError(invalido);
    if (invalido) return;

    setCargando(true);
    const respuesta = await obtenerReporteImpactoPromociones(desde, hasta, Number(promocionId));
    setCargando(false);
    if (respuesta.exito && respuesta.datos) {
      setResultado(respuesta.datos);
    } else {
      setError(respuesta.error ?? 'No se pudo cargar el reporte.');
    }
  };

  return {
    desde,
    hasta,
    setDesde,
    setHasta,
    promocionId,
    setPromocionId,
    promociones,
    resultado,
    error,
    cargando,
    generar,
  };
}
