import { useCallback, useEffect, useState } from 'react';

import { listarMozosHabilitados } from '../api';
import type { MozoSeleccionable } from '../types';

interface ResultadoMozos {
  revision: number;
  mozos: MozoSeleccionable[];
  cargando: boolean;
  error: string | null;
}

const SIN_RESULTADO: ResultadoMozos = {
  revision: -1,
  mozos: [],
  cargando: true,
  error: null,
};

export function useMozosDisponibles() {
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState(SIN_RESULTADO);

  useEffect(() => {
    let vigente = true;
    void listarMozosHabilitados()
      .then((respuesta) => {
        if (!vigente) return;
        setResultado({
          revision,
          mozos: respuesta.exito ? (respuesta.datos ?? []) : [],
          cargando: false,
          error: respuesta.exito ? null : (respuesta.error ?? 'No se pudieron cargar los mozos'),
        });
      })
      .catch((causa: unknown) => {
        if (!vigente) return;
        setResultado({
          revision,
          mozos: [],
          cargando: false,
          error: causa instanceof Error ? causa.message : 'No se pudieron cargar los mozos',
        });
      });
    return () => {
      vigente = false;
    };
  }, [revision]);

  const recargar = useCallback(() => setRevision((actual) => actual + 1), []);
  const resultadoActual = resultado.revision === revision;
  return {
    mozos: resultadoActual ? resultado.mozos : [],
    cargando: !resultadoActual || resultado.cargando,
    error: resultadoActual ? resultado.error : null,
    recargar,
  };
}
