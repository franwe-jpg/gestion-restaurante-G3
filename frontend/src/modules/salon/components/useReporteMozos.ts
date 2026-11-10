import { useEffect, useState } from 'react';

import { listarMozos, listarSectores, obtenerReporteMozos } from '../api';
import type { Mozo, ReporteMesasVentasPorMozo, Sector } from '../types';
import { validarPeriodo } from '../validarPeriodo';

const LIMITE_OPCIONES = 100;

function useOpcionesDelReporte() {
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);

  useEffect(() => {
    let activo = true;
    void Promise.all([listarMozos(LIMITE_OPCIONES, 0), listarSectores(LIMITE_OPCIONES, 0)]).then(
      ([respuestaMozos, respuestaSectores]) => {
        if (!activo) return;
        if (respuestaMozos.exito && respuestaMozos.datos) setMozos(respuestaMozos.datos.items);
        if (respuestaSectores.exito && respuestaSectores.datos) {
          setSectores(respuestaSectores.datos.items);
        }
      },
    );
    return () => {
      activo = false;
    };
  }, []);

  return { mozos, sectores };
}

/** Estado del reporte de mesas atendidas y ventas por mozo (HU-M3-13). */
export function useReporteMozos() {
  const { mozos, sectores } = useOpcionesDelReporte();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [mozoId, setMozoId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [resultado, setResultado] = useState<ReporteMesasVentasPorMozo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const generar = async () => {
    setResultado(null);
    const invalido = validarPeriodo(desde, hasta);
    setError(invalido);
    if (invalido) return;

    setCargando(true);
    const respuesta = await obtenerReporteMozos(
      desde,
      hasta,
      mozoId ? Number(mozoId) : null,
      sectorId ? Number(sectorId) : null,
    );
    setCargando(false);
    if (respuesta.exito && respuesta.datos) {
      setResultado(respuesta.datos);
    } else {
      setError('No se pudo cargar el reporte.');
    }
  };

  return {
    desde,
    hasta,
    setDesde,
    setHasta,
    mozoId,
    setMozoId,
    sectorId,
    setSectorId,
    mozos,
    sectores,
    resultado,
    error,
    cargando,
    generar,
  };
}
