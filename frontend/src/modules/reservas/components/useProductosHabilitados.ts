import { useEffect, useState } from 'react';

import type { RespuestaApi } from '../../../shared/types';
import { listarProductosHabilitados } from '../api';
import type { ProductoHabilitado } from '../types';

export type EstadoProductosHabilitados =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; productos: ProductoHabilitado[] } // puede venir vacía
  | { tipo: 'error'; mensaje: string };

const ERROR_SIN_DETALLE = 'No se pudo obtener la lista de productos habilitados.';

function aEstado(respuesta: RespuestaApi<ProductoHabilitado[]>): EstadoProductosHabilitados {
  if (respuesta.exito) return { tipo: 'listo', productos: respuesta.datos ?? [] };
  return { tipo: 'error', mensaje: respuesta.error ?? ERROR_SIN_DETALLE };
}

/** Solo `listo` y con al menos un producto se puede usar; los demás estados no dejan elegir. */
export function puedeElegirProducto(estado: EstadoProductosHabilitados): boolean {
  return estado.tipo === 'listo' && estado.productos.length > 0;
}

/**
 * Productos habilitados para los desplegables del modal «Crear comanda». Pide la lista una sola vez,
 * al montarse el modal, y el modal la comparte entre todas sus líneas. El estado se deriva en el
 * render (como `useMesasDisponibles`): mientras no llega la respuesta está `cargando`. La bandera
 * `vigente` descarta la respuesta si el modal se cerró antes de que llegue.
 */
export function useProductosHabilitados(): EstadoProductosHabilitados {
  const [respuesta, setRespuesta] = useState<RespuestaApi<ProductoHabilitado[]> | null>(null);

  useEffect(() => {
    let vigente = true;

    void listarProductosHabilitados().then((recibida) => {
      if (vigente) setRespuesta(recibida);
    });

    return () => {
      vigente = false;
    };
  }, []);

  if (respuesta === null) return { tipo: 'cargando' };
  return aEstado(respuesta);
}
