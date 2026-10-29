import { useEffect, useState } from 'react';

import { listarProductosHabilitados, listarSeccionesHabilitadas } from '../api';
import type { ProductoSeleccionable, SeccionMenu } from '../types';

export function useOpcionesMenuEjecutivo() {
  const [productos, setProductos] = useState<ProductoSeleccionable[]>([]);
  const [secciones, setSecciones] = useState<SeccionMenu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let vigente = true;
    void Promise.all([listarProductosHabilitados(), listarSeccionesHabilitadas()])
      .then(([respuestaProductos, respuestaSecciones]) => {
        if (!vigente) return;
        if (!respuestaProductos.exito || !respuestaSecciones.exito) {
          setError(
            respuestaProductos.error ?? respuestaSecciones.error ?? 'No se cargaron las opciones',
          );
          return;
        }
        setProductos(respuestaProductos.datos ?? []);
        setSecciones(respuestaSecciones.datos ?? []);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  return { productos, secciones, cargando, error };
}
