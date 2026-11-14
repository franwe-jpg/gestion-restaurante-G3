import { useEffect, useState } from 'react';
import type { Pagina } from '../../../shared/types';
import { listarComandas } from '../api';
import type { ComandaResumen, FiltroComandas } from '../types';

export function useComandas() {
  const [filtro, setFiltro] = useState<FiltroComandas>({ limit: 50, offset: 0 });
  const [pagina, setPagina] = useState<Pagina<ComandaResumen> | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let vigente = true;
    void listarComandas(filtro).then((respuesta) => {
      if (!vigente) return;
      setPagina(respuesta.exito ? respuesta.datos : null);
      setError(respuesta.exito ? '' : (respuesta.error ?? 'No se pudieron cargar las comandas'));
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [filtro, revision]);
  function filtrar(nuevo: FiltroComandas) {
    setCargando(true);
    setPagina(null);
    setFiltro(nuevo);
  }
  function recargar() {
    setCargando(true);
    setRevision((n) => n + 1);
  }
  return {
    pagina,
    error,
    cargando,
    hayFiltros: filtro.mesa_id !== undefined || filtro.estado !== undefined,
    filtrar,
    recargar,
    cambiarPagina: (offset: number) => filtrar({ ...filtro, offset }),
  };
}
