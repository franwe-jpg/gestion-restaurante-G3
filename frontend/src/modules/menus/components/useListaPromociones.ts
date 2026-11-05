import { useEffect, useState } from 'react';

import { listarPromociones } from '../api';
import type { FiltroEstado, Promocion } from '../types';

const LIMITE_PAGINA = 10;

export function useListaPromociones() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [estado, setEstado] = useState<FiltroEstado>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [solicitudTerminada, setSolicitudTerminada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const claveSolicitud = `${estado}:${pagina}:${revision}`;

  useEffect(() => {
    let vigente = true;
    void listarPromociones(estado, LIMITE_PAGINA, (pagina - 1) * LIMITE_PAGINA)
      .then((respuesta) => {
        if (!vigente) return;
        if (!respuesta.exito || respuesta.datos === null) {
          setError(respuesta.error ?? 'No se pudieron cargar las promociones');
          return;
        }
        setPromociones(respuesta.datos.items);
        setTotal(respuesta.datos.total);
        setError(null);
      })
      .finally(() => {
        if (vigente) setSolicitudTerminada(claveSolicitud);
      });
    return () => {
      vigente = false;
    };
  }, [estado, pagina, revision, claveSolicitud]);

  return {
    promociones,
    estado,
    pagina,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / LIMITE_PAGINA)),
    cargando: solicitudTerminada !== claveSolicitud,
    error,
    cambiarEstado: (nuevoEstado: FiltroEstado) => {
      setEstado(nuevoEstado);
      setPagina(1);
    },
    cambiarPagina: setPagina,
    recargar: () => setRevision((actual) => actual + 1),
  };
}
