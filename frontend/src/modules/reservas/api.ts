import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { FiltroEstadoReserva, Reserva, ReservaCrear } from './types';

/** Reservas de un día. `'TODAS'` no envía `estado`: la API trae los cuatro estados. */
export function listarReservas(
  fecha: string,
  estado: FiltroEstadoReserva,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<Reserva>>> {
  const consulta = new URLSearchParams({ fecha });
  if (estado !== 'TODAS') consulta.set('estado', estado);
  consulta.set('limit', String(limit));
  consulta.set('offset', String(offset));
  return clienteHttp.get<Pagina<Reserva>>(`/reservas?${consulta.toString()}`);
}

export function crearReserva(datos: ReservaCrear): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, ReservaCrear>('/reservas', datos);
}
