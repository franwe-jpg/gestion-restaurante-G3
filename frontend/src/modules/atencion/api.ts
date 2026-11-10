import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  Comanda,
  ComandaCrear,
  ComandaModificar,
  ComandaResumen,
  EntregaDetalle,
  EntregasComanda,
  FiltroComandas,
  MenuEjecutivoSeleccionable,
  MesaSeleccionable,
  ProductoSeleccionable,
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

export function obtenerComanda(id: number): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.get<Comanda>(`/comandas/${id}`);
}

export function modificarComanda(
  id: number,
  datos: ComandaModificar,
): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.put<Comanda, ComandaModificar>(`/comandas/${id}`, datos);
}

export function reabrirComanda(id: number): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.post<Comanda, Record<string, never>>(`/comandas/${id}/reabrir`, {});
}

export function consultarPendientes(id: number): Promise<RespuestaApi<PendientesComanda>> {
  return clienteHttp.get<PendientesComanda>(`/comandas/${id}/pendientes`);
}

export function consultarEntregas(id: number): Promise<RespuestaApi<EntregasComanda>> {
  return clienteHttp.get<EntregasComanda>(`/comandas/${id}/detalles`);
}

export function registrarEntrega(
  id: number,
  detalleId: number,
  cantidadEntregada: number,
): Promise<RespuestaApi<EntregasComanda>> {
  return clienteHttp.put<EntregasComanda, EntregaDetalle>(
    `/comandas/${id}/detalles/${detalleId}/entrega`,
    { cantidad_entregada: cantidadEntregada },
  );
}

export function cerrarComanda(id: number): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.post<Comanda, Record<string, never>>(`/comandas/${id}/cerrar`, {});
}

export function anularComanda(id: number): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.post<Comanda, Record<string, never>>(`/comandas/${id}/anular`, {});
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

const LIMITE_CATALOGO = 100;

export function listarMesas(): Promise<RespuestaApi<Pagina<MesaSeleccionable>>> {
  return clienteHttp.get<Pagina<MesaSeleccionable>>(`/mesas?limit=${LIMITE_CATALOGO}`);
}

export function listarProductos(): Promise<RespuestaApi<Pagina<ProductoSeleccionable>>> {
  return clienteHttp.get<Pagina<ProductoSeleccionable>>(
    `/productos?estado=TODOS&limit=${LIMITE_CATALOGO}`,
  );
}

export function listarMenusEjecutivos(): Promise<RespuestaApi<Pagina<MenuEjecutivoSeleccionable>>> {
  return clienteHttp.get<Pagina<MenuEjecutivoSeleccionable>>(
    `/menus-ejecutivos?limit=${LIMITE_CATALOGO}`,
  );
}
