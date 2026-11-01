import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  Comanda,
  ComandaCrear,
  ComandaResumen,
  FiltroComandas,
  PendientesComanda,
} from './types';
import type { Cliente, ClienteModificar, PaginaCliente } from './types';

export function listarComandas(
  filtro: FiltroComandas,
): Promise<RespuestaApi<Pagina<ComandaResumen>>> {
  const parametros = new URLSearchParams({
    limit: String(filtro.limit),
    offset: String(filtro.offset),
  });
  if (filtro.mesa_id !== undefined) parametros.set('mesa_id', String(filtro.mesa_id));
  if (filtro.estado) parametros.set('estado', filtro.estado);
  return clienteHttp.get<Pagina<ComandaResumen>>(`/comandas?${parametros}`);
}

export function crearComanda(datos: ComandaCrear): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.post<Comanda, ComandaCrear>('/comandas', datos);
}

export function consultarPendientes(id: number): Promise<RespuestaApi<PendientesComanda>> {
  return clienteHttp.get<PendientesComanda>(`/comandas/${id}/pendientes`);
}

export function cerrarComanda(id: number): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.post<Comanda, Record<string, never>>(`/comandas/${id}/cerrar`, {});
}

export function listarClientes(
  q = '',
  limit = 50,
  offset = 0,
): Promise<RespuestaApi<PaginaCliente>> {
  const parametros = new URLSearchParams();
  if (q) parametros.set('q', q);
  parametros.set('limit', String(limit));
  parametros.set('offset', String(offset));
  return clienteHttp.get<PaginaCliente>(`/clientes?${parametros}`);
}

export function modificarCliente(
  id: number,
  datos: ClienteModificar,
): Promise<RespuestaApi<Cliente>> {
  return clienteHttp.put<Cliente, ClienteModificar>(`/clientes/${id}`, datos);
}
