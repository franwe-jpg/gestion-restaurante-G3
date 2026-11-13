import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  Comanda,
  ComandaCrear,
  ComandaMozoAsignar,
  ComandaModificar,
  ComandaResumen,
  EntregaDetalle,
  EntregasComanda,
  ListoDetalle,
  FiltroComandas,
  MenuEjecutivoSeleccionable,
  MesaSeleccionable,
  MozoSeleccionable,
  ProductoSeleccionable,
  PendientesComanda,
  ReporteComandasTicketPromedio,
  TurnoReporteComandas,
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

export function asignarMozoComanda(id: number, mozoId: number): Promise<RespuestaApi<Comanda>> {
  return clienteHttp.put<Comanda, ComandaMozoAsignar>(`/comandas/${id}/mozo`, { mozo_id: mozoId });
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

export function marcarListo(
  id: number,
  detalleId: number,
  cantidadLista: number,
): Promise<RespuestaApi<EntregasComanda>> {
  return clienteHttp.put<EntregasComanda, ListoDetalle>(
    `/comandas/${id}/detalles/${detalleId}/listo`,
    { cantidad_lista: cantidadLista },
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

export function obtenerReporteComandas(
  fechaDesde: string,
  fechaHasta: string,
  turno: TurnoReporteComandas | null,
): Promise<RespuestaApi<ReporteComandasTicketPromedio>> {
  const parametros = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
  if (turno) parametros.set('turno', turno);
  return clienteHttp.get<ReporteComandasTicketPromedio>(
    `/reportes/comandas-ticket-promedio?${parametros}`,
  );
}

async function listarPaginaMozos(
  offset: number,
  estado?: 'HABILITADO',
  q?: string,
): Promise<RespuestaApi<Pagina<MozoSeleccionable>>> {
  const parametros = new URLSearchParams();
  if (estado) parametros.set('estado', estado);
  if (q?.trim()) parametros.set('q', q.trim());
  parametros.set('limit', String(LIMITE_CATALOGO));
  parametros.set('offset', String(offset));
  return clienteHttp.get<Pagina<MozoSeleccionable>>(`/mozos?${parametros}`);
}

async function listarMozos(
  estado?: 'HABILITADO',
  q?: string,
): Promise<RespuestaApi<MozoSeleccionable[]>> {
  const mozos: MozoSeleccionable[] = [];
  let offset = 0;
  while (true) {
    const respuesta = await listarPaginaMozos(offset, estado, q);
    if (!respuesta.exito || !respuesta.datos) {
      return {
        exito: false,
        datos: null,
        error: respuesta.error ?? 'No se pudieron cargar los mozos habilitados',
      };
    }
    const pagina = respuesta.datos;
    const items = estado
      ? pagina.items.filter((mozo) => mozo.estado === 'HABILITADO')
      : pagina.items;
    mozos.push(...items);
    if (offset + pagina.items.length >= pagina.total || pagina.items.length === 0) break;
    if (pagina.limit <= 0) {
      return {
        exito: false,
        datos: null,
        error: 'El backend devolvió una página de mozos inválida',
      };
    }
    offset = pagina.offset + pagina.limit;
  }

  return { exito: true, datos: mozos };
}

export function listarMozosHabilitados(q?: string): Promise<RespuestaApi<MozoSeleccionable[]>> {
  return listarMozos('HABILITADO', q);
}

export function listarTodosMozos(): Promise<RespuestaApi<MozoSeleccionable[]>> {
  return listarMozos();
}
