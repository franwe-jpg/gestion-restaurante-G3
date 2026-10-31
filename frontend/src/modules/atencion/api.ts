import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Cliente, ClienteModificar, Comanda, PaginaCliente } from './types';

export async function listarComandasActivas(): Promise<RespuestaApi<Comanda[]>> {
  return clienteHttp.get<Comanda[]>('/atencion/comandas');
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
