import { useCallback, useEffect, useRef, useState } from 'react';

import type { RespuestaApi } from '../types';

export interface EstadoConsulta<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

export function useApi<T>(
  consulta: () => Promise<RespuestaApi<T>>,
  clave: string,
): EstadoConsulta<T> {
  const consultaRef = useRef(consulta);
  const [version, setVersion] = useState(0);
  const [estado, setEstado] = useState<Omit<EstadoConsulta<T>, 'recargar'>>({
    datos: null,
    cargando: true,
    error: null,
  });

  useEffect(() => {
    consultaRef.current = consulta;
  });

  useEffect(() => {
    let activo = true;

    void consultaRef.current().then((respuesta) => {
      if (!activo) return;
      setEstado({
        datos: respuesta.datos,
        cargando: false,
        error: respuesta.exito ? null : (respuesta.error ?? 'No se pudieron cargar los datos'),
      });
    });

    return () => {
      activo = false;
    };
  }, [clave, version]);

  const recargar = useCallback(() => {
    setEstado((previo) => ({ ...previo, cargando: true, error: null }));
    setVersion((previa) => previa + 1);
  }, []);

  return { ...estado, recargar };
}
