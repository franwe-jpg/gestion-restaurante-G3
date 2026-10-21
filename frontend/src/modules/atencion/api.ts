import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Comanda } from './types';

export async function listarComandasActivas(): Promise<RespuestaApi<Comanda[]>> {
  return clienteHttp.get<Comanda[]>('/atencion/comandas');
}
