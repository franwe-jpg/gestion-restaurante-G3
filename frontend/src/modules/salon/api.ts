import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Mesa, Mozo } from './types';

export async function listarMesas(): Promise<RespuestaApi<Mesa[]>> {
  return clienteHttp.get<Mesa[]>('/salon/mesas');
}

export async function listarMozos(): Promise<RespuestaApi<Mozo[]>> {
  return clienteHttp.get<Mozo[]>('/salon/mozos');
}
