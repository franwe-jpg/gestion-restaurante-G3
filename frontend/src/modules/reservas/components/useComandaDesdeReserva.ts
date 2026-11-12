import { useEffect, useRef, useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearComandaDesdeReserva } from '../api';
import type { ComandaDesdeReservaCrear, Reserva } from '../types';

import { validarComandaDesdeReserva } from './validarComandaDesdeReserva';
import type { ErroresDeLineas, LineaEscrita } from './validarComandaDesdeReserva';

export interface OpcionesComandaDesdeReserva {
  /** La reserva cuya comanda se crea; la mesa sale de ella en el backend y no se envía. */
  reserva: Pick<Reserva, 'id'>;
  onCreada: () => void;
}

/** Campos de texto de una línea: producto (su número) y cantidad. */
export type CampoLinea = 'producto' | 'cantidad';

/** Errores por línea (validación local) y uno general (el `detalle` que devuelve la API). */
export interface ErroresComanda {
  lineas: ErroresDeLineas;
  general?: string;
  mozo?: string;
}

const MENSAJE_ERROR = 'No se pudo crear la comanda';

function lineaNueva(clave: number): LineaEscrita {
  return { clave, producto: '', cantidad: '1' };
}

/** Una línea `{producto_id, cantidad}` por cada línea escrita; sin mesa y sin observaciones (S64). */
function aComandaCrear(lineas: LineaEscrita[], mozoId: number): ComandaDesdeReservaCrear {
  return {
    mozo_id: mozoId,
    detalles: lineas.map(({ producto, cantidad }) => ({
      producto_id: Number(producto),
      cantidad: Number(cantidad),
    })),
  };
}

/** Las líneas escritas: arrancan con una vacía y nunca quedan sin ninguna (S64). */
function useLineas() {
  const [lineas, setLineas] = useState<LineaEscrita[]>(() => [lineaNueva(1)]);

  const agregarLinea = () => {
    setLineas((anteriores) => {
      const ultima = Math.max(...anteriores.map(({ clave }) => clave));
      return [...anteriores, lineaNueva(ultima + 1)];
    });
  };

  const quitarLinea = (clave: number) => {
    setLineas((anteriores) =>
      anteriores.length > 1 ? anteriores.filter((linea) => linea.clave !== clave) : anteriores,
    );
  };

  const cambiarLinea = (clave: number, campo: CampoLinea, valor: string) => {
    setLineas((anteriores) =>
      anteriores.map((linea) => (linea.clave === clave ? { ...linea, [campo]: valor } : linea)),
    );
  };

  return { lineas, agregarLinea, quitarLinea, cambiarLinea };
}

interface OpcionesEnvioComanda {
  lineas: LineaEscrita[];
  mozoId: string;
  reservaId: number;
  onCreada: () => void;
}

function useEnvioComanda({ lineas, mozoId, reservaId, onCreada }: OpcionesEnvioComanda) {
  const { mostrarToast } = useToast();
  const [errores, setErrores] = useState<ErroresComanda>({ lineas: {} });
  const [enviando, setEnviando] = useState(false);
  const vigente = useRef(false);
  const enCurso = useRef(false);

  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);

  const enviar = async () => {
    if (enCurso.current) return;
    const locales = validarComandaDesdeReserva(lineas);
    const errorMozo = mozoId ? undefined : 'Seleccioná un mozo habilitado';
    setErrores({ lineas: locales, mozo: errorMozo });
    if (Object.keys(locales).length > 0 || errorMozo) return;

    enCurso.current = true;
    setEnviando(true);
    const respuesta = await crearComandaDesdeReserva(
      reservaId,
      aComandaCrear(lineas, Number(mozoId)),
    );
    enCurso.current = false;
    if (!vigente.current) return;
    setEnviando(false);
    if (respuesta.exito && respuesta.datos !== null) {
      mostrarToast({ titulo: `Comanda n.º ${respuesta.datos.id} creada`, variante: 'success' });
      onCreada();
      return;
    }
    setErrores({ lineas: {}, general: respuesta.error ?? MENSAJE_ERROR });
  };

  return { errores, setErrores, enviando, enviar };
}

/**
 * HU-M5-06: estado del pedido, validación local, envío y avisos del modal «Crear comanda». Ante un
 * error de la API el modal queda abierto con las líneas escritas. Una respuesta que llega con el
 * modal ya cerrado no toca nada (guarda de vigencia, como `useFormularioReserva`, S38).
 */
export function useComandaDesdeReserva({ reserva, onCreada }: OpcionesComandaDesdeReserva) {
  const { lineas, agregarLinea, quitarLinea, cambiarLinea } = useLineas();
  const [mozoId, setMozoId] = useState('');
  const envio = useEnvioComanda({ lineas, mozoId, reservaId: reserva.id, onCreada });

  const elegirMozo = (id: string) => {
    setMozoId(id);
    envio.setErrores((actuales) => ({ ...actuales, mozo: undefined }));
  };

  return {
    lineas,
    agregarLinea,
    quitarLinea,
    cambiarLinea,
    mozoId,
    elegirMozo,
    errores: envio.errores,
    enviando: envio.enviando,
    enviar: envio.enviar,
  };
}
