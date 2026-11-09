import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  ClienteEncontrado,
  ComandaCreada,
  ComandaDesdeReservaCrear,
  FiltroEstadoReserva,
  MesaDisponible,
  Reserva,
  ReservaCrear,
  ReservaModificar,
} from './types';

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

/** Mesas libres para una fecha `YYYY-MM-DD` y una hora `HH:MM`: una lista simple, sin paginar. */
export function listarMesasDisponibles(
  fecha: string,
  hora: string,
): Promise<RespuestaApi<MesaDisponible[]>> {
  const consulta = new URLSearchParams({ fecha, hora });
  return clienteHttp.get<MesaDisponible[]>(`/reservas/mesas-disponibles?${consulta.toString()}`);
}

export function crearReserva(datos: ReservaCrear): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, ReservaCrear>('/reservas', datos);
}

/** Cambia solo fecha, hora y cantidad de personas: mesa, cliente y estado no se envían. */
export function modificarReserva(
  id: number,
  datos: ReservaModificar,
): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.put<Reserva, ReservaModificar>(`/reservas/${id}`, datos);
}

/** HU-M5-04: `POST /reservas/{id}/cancelar-anticipada`, sin cuerpo. */
export function cancelarReservaAnticipada(id: number): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, Record<string, never>>(
    `/reservas/${id}/cancelar-anticipada`,
    {},
  );
}

/** HU-M5-05: `POST /reservas/{id}/cancelar-por-ausencia`, sin cuerpo. */
export function cancelarReservaPorAusencia(id: number): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, Record<string, never>>(
    `/reservas/${id}/cancelar-por-ausencia`,
    {},
  );
}

/** HU-M5-06: `POST /reservas/{id}/comanda` crea la comanda de una reserva y la pasa a `ATENDIDA`. */
export function crearComandaDesdeReserva(
  reservaId: number,
  datos: ComandaDesdeReservaCrear,
): Promise<RespuestaApi<ComandaCreada>> {
  return clienteHttp.post<ComandaCreada, ComandaDesdeReservaCrear>(
    `/reservas/${reservaId}/comanda`,
    datos,
  );
}

/** Resultados de la búsqueda de clientes: la primera página, sin paginar en pantalla (S43). */
export const LIMITE_BUSQUEDA_CLIENTES = 10;

/** Clientes registrados cuyo nombre o teléfono coincide con `q` (`GET /clientes?q=`, M4). */
export function buscarClientes(q: string): Promise<RespuestaApi<Pagina<ClienteEncontrado>>> {
  const consulta = new URLSearchParams({ q });
  consulta.set('limit', String(LIMITE_BUSQUEDA_CLIENTES));
  consulta.set('offset', '0');
  return clienteHttp.get<Pagina<ClienteEncontrado>>(`/clientes?${consulta.toString()}`);
}
