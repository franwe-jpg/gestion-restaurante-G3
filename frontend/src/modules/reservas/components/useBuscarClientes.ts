import { useEffect, useState } from 'react';

import type { Pagina, RespuestaApi } from '../../../shared/types';
import { buscarClientes } from '../api';
import type { ClienteEncontrado } from '../types';

export type EstadoBusquedaClientes =
  | { tipo: 'inactivo' } // sin texto: no se pide nada
  | { tipo: 'buscando' } // esperando la pausa o la respuesta
  | { tipo: 'listo'; clientes: ClienteEncontrado[] } // puede venir vacía
  | { tipo: 'error'; mensaje: string };

type Respuesta = RespuestaApi<Pagina<ClienteEncontrado>>;

/** Respuesta guardada junto con el texto que se buscó, para saber a cuál corresponde. */
interface ResultadoGuardado {
  clave: string;
  respuesta: Respuesta;
}

/** Pausa desde la última tecla antes de pedir la búsqueda (S43). */
export const ESPERA_BUSQUEDA_MS = 300;

const ERROR_SIN_DETALLE = 'No se pudieron buscar los clientes.';

function aEstado(respuesta: Respuesta): EstadoBusquedaClientes {
  if (respuesta.exito) return { tipo: 'listo', clientes: respuesta.datos?.items ?? [] };
  return { tipo: 'error', mensaje: respuesta.error ?? ERROR_SIN_DETALLE };
}

/**
 * Clientes registrados que coinciden con el texto, para el selector del alta (Decisión 29). Espera
 * 300 ms desde la última tecla y busca con al menos un carácter después de recortar. El estado se
 * deriva en el render: un resultado guardado para otro texto cuenta como `buscando`. La limpieza
 * del efecto cancela la espera pendiente y la bandera `vigente` descarta la respuesta de una
 * búsqueda reemplazada (patrón de `useMesasDisponibles`).
 */
export function useBuscarClientes(texto: string): EstadoBusquedaClientes {
  const recortado = texto.trim();
  const clave = recortado === '' ? null : recortado;
  const [guardado, setGuardado] = useState<ResultadoGuardado | null>(null);

  useEffect(() => {
    if (clave === null) return;
    let vigente = true;

    const espera = setTimeout(() => {
      void buscarClientes(clave).then((respuesta) => {
        if (vigente) setGuardado({ clave, respuesta });
      });
    }, ESPERA_BUSQUEDA_MS);

    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [clave]);

  if (clave === null) return { tipo: 'inactivo' };
  if (guardado?.clave !== clave) return { tipo: 'buscando' };
  return aEstado(guardado.respuesta);
}
