import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Reserva, ReservaCrear } from './types';

export function crearReserva(datos: ReservaCrear): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, ReservaCrear>('/reservas', datos);
}
