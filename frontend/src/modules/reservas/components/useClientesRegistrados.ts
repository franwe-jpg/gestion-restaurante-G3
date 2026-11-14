import { useEffect, useMemo, useState } from 'react';

import type { Pagina, RespuestaApi } from '../../../shared/types';
import { listarClientes } from '../api';
import type { ClienteEncontrado } from '../types';

type Respuesta = RespuestaApi<Pagina<ClienteEncontrado>>;

/** Lo que el desplegable «Clientes registrados» necesita saber de la carga (S71). */
export interface ClientesRegistrados {
  /** Ordenados por nombre; vacía mientras carga y si la consulta falla. */
  clientes: ClienteEncontrado[];
  /** Total de clientes que informa la API; puede ser mayor que los que trae la primera página. */
  total: number;
  cargando: boolean;
  /** Mensaje de la API (o uno propio si no trae detalle) cuando la consulta falla. */
  error?: string;
}

const ERROR_SIN_DETALLE = 'No se pudieron cargar los clientes registrados.';

function porNombre(a: ClienteEncontrado, b: ClienteEncontrado): number {
  return a.nombre.localeCompare(b.nombre, 'es') || a.id - b.id;
}

function aEstado(respuesta: Respuesta | null, habilitado: boolean): ClientesRegistrados {
  if (respuesta === null) return { clientes: [], total: 0, cargando: habilitado };
  if (!respuesta.exito) {
    return { clientes: [], total: 0, cargando: false, error: respuesta.error ?? ERROR_SIN_DETALLE };
  }
  const clientes = [...(respuesta.datos?.items ?? [])].sort(porNombre);
  return { clientes, total: respuesta.datos?.total ?? clientes.length, cargando: false };
}

/**
 * Clientes registrados para el desplegable del alta (S71). Con `habilitado` en `true` pide la lista
 * una sola vez (`GET /clientes?limit=100&offset=0`) y la devuelve ordenada por nombre; una vez
 * cargada, deshabilitar y volver a habilitar no la pide de nuevo. La bandera `vigente` descarta la
 * respuesta que llega cuando el hook ya se deshabilitó o el componente ya se desmontó (patrón de
 * `useProductosHabilitados`); si se vuelve a habilitar antes de tener una respuesta, la pide otra vez.
 */
export function useClientesRegistrados(habilitado: boolean): ClientesRegistrados {
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const cargada = respuesta !== null;

  useEffect(() => {
    if (!habilitado || cargada) return;
    let vigente = true;

    void listarClientes().then((recibida) => {
      if (vigente) setRespuesta(recibida);
    });

    return () => {
      vigente = false;
    };
  }, [habilitado, cargada]);

  return useMemo(() => aEstado(respuesta, habilitado), [respuesta, habilitado]);
}
