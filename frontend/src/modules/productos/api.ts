import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Producto } from './types';

export async function listarProductos(): Promise<RespuestaApi<Producto[]>> {
  return clienteHttp.get<Producto[]>('/productos');
}

export async function obtenerProductoPorId(id: string): Promise<RespuestaApi<Producto>> {
  return clienteHttp.get<Producto>(`/productos/${id}`);
}
