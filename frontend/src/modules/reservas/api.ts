import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Reserva } from './types';

export async function listarReservas(): Promise<RespuestaApi<Reserva[]>> {
  return clienteHttp.get<Reserva[]>('/reservas');
}
