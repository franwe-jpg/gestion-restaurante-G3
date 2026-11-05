import { useEffect, useState } from 'react';

import { obtenerComanda } from '../api';
import type { Comanda } from '../types';

export function useComandaParaModificar(id: number) {
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    void obtenerComanda(id).then((respuesta) => {
      if (!vigente) return;
      if (respuesta.exito && respuesta.datos) setComanda(respuesta.datos);
      else setError(respuesta.error ?? 'No se pudo cargar la comanda');
    });
    return () => {
      vigente = false;
    };
  }, [id]);

  return { comanda, setComanda, error };
}
