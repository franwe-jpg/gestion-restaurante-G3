import { useEffect, useState } from 'react';

import type { RespuestaApi } from '../../../shared/types';
import { listarMesasDisponibles } from '../api';
import type { MesaDisponible } from '../types';

export type EstadoMesasDisponibles =
  | { tipo: 'inactivo' } // Fecha u Hora no pasan la validación local: no se pide nada
  | { tipo: 'cargando' }
  | { tipo: 'listo'; mesas: MesaDisponible[] } // puede venir vacía
  | { tipo: 'error'; mensaje: string };

/** Respuesta guardada junto con el turno que se pidió, para saber a cuál corresponde. */
interface ResultadoGuardado {
  clave: string;
  respuesta: RespuestaApi<MesaDisponible[]>;
}

const ERROR_SIN_DETALLE = 'No se pudieron cargar las mesas disponibles.';

function aEstado(respuesta: RespuestaApi<MesaDisponible[]>): EstadoMesasDisponibles {
  if (respuesta.exito) return { tipo: 'listo', mesas: respuesta.datos ?? [] };
  return { tipo: 'error', mensaje: respuesta.error ?? ERROR_SIN_DETALLE };
}

/**
 * Mesas libres para una fecha y una hora, para el selector del alta (Decisión 18). Solo pide la
 * lista con `habilitado` en `true`. El estado se deriva en el render: un resultado guardado para
 * otro turno cuenta como `cargando`, así la lista mostrada siempre es la del turno actual. La
 * bandera `vigente` descarta las respuestas de un pedido reemplazado (patrón de `useApi`).
 */
export function useMesasDisponibles(
  fecha: string,
  hora: string,
  habilitado: boolean,
): EstadoMesasDisponibles {
  const clave = habilitado ? `${fecha} ${hora}` : null;
  const [guardado, setGuardado] = useState<ResultadoGuardado | null>(null);

  useEffect(() => {
    if (clave === null) return;
    let vigente = true;

    void listarMesasDisponibles(fecha, hora).then((respuesta) => {
      if (vigente) setGuardado({ clave, respuesta });
    });

    return () => {
      vigente = false;
    };
  }, [clave, fecha, hora]);

  if (clave === null) return { tipo: 'inactivo' };
  if (guardado?.clave !== clave) return { tipo: 'cargando' };
  return aEstado(guardado.respuesta);
}
