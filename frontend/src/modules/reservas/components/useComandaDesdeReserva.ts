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

/** Campos de una línea, ambos como texto: el `id` del producto elegido y la cantidad. */
export type CampoLinea = 'producto' | 'cantidad';

/** Errores por línea (validación local) y uno general (el `detalle` que devuelve la API). */
export interface ErroresComanda {
  lineas: ErroresDeLineas;
  general?: string;
}

const MENSAJE_ERROR = 'No se pudo crear la comanda';

function lineaNueva(clave: number): LineaEscrita {
  return { clave, producto: '', cantidad: '1' };
}

/** Una línea `{producto_id, cantidad}` por cada línea escrita; sin mesa y sin observaciones (S64). */
function aComandaCrear(lineas: LineaEscrita[]): ComandaDesdeReservaCrear {
  return {
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

/**
 * HU-M5-06: estado del pedido, validación local, envío y avisos del modal «Crear comanda». Ante un
 * error de la API el modal queda abierto con las líneas escritas. Una respuesta que llega con el
 * modal ya cerrado no toca nada (guarda de vigencia, como `useFormularioReserva`, S38).
 */
export function useComandaDesdeReserva({ reserva, onCreada }: OpcionesComandaDesdeReserva) {
  const { mostrarToast } = useToast();
  const { lineas, agregarLinea, quitarLinea, cambiarLinea } = useLineas();
  const [errores, setErrores] = useState<ErroresComanda>({ lineas: {} });
  const [enviando, setEnviando] = useState(false);
  /** `true` mientras el modal que creó este hook sigue montado (S38). */
  const vigente = useRef(false);
  /** Corta un segundo `enviar()` antes de que el estado `enviando` llegue a pintarse. */
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
    setErrores({ lineas: locales });
    if (Object.keys(locales).length > 0) return;

    enCurso.current = true;
    setEnviando(true);
    const respuesta = await crearComandaDesdeReserva(reserva.id, aComandaCrear(lineas));
    enCurso.current = false;
    if (!vigente.current) return; // el modal se cerró: la respuesta no toca nada (S38)
    setEnviando(false);

    if (respuesta.exito && respuesta.datos !== null) {
      mostrarToast({ titulo: `Comanda n.º ${respuesta.datos.id} creada`, variante: 'success' });
      onCreada();
      return;
    }
    setErrores({ lineas: {}, general: respuesta.error ?? MENSAJE_ERROR });
  };

  return { lineas, agregarLinea, quitarLinea, cambiarLinea, errores, enviando, enviar };
}
