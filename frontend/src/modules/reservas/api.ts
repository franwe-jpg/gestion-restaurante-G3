import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { MesaResumen, Reserva, ReservaCrear, ReservaModificar } from './types';

export function crearReserva(datos: ReservaCrear): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, ReservaCrear>('/reservas', datos);
}

/** HU-M5-02: reemplaza fecha, hora y comensales de una reserva existente. */
export function modificarReserva(
  id: number,
  datos: ReservaModificar,
): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.put<Reserva, ReservaModificar>(`/reservas/${id}`, datos);
}

/** HU-M5-03: listado paginado de las reservas de un día. */
export function listarReservas(
  fecha: string,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<Reserva>>> {
  return clienteHttp.get<Pagina<Reserva>>(
    `/reservas?fecha=${fecha}&limit=${limit}&offset=${offset}`,
  );
}

/** Lectura de apoyo para el selector del alta: mesas sin reserva Activa en ese horario. */
export function listarMesasDisponibles(
  fecha: string,
  hora: string,
): Promise<RespuestaApi<MesaResumen[]>> {
  return clienteHttp.get<MesaResumen[]>(`/reservas/mesas-disponibles?fecha=${fecha}&hora=${hora}`);
}
