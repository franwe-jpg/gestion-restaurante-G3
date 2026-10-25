import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { ProductoSeleccionable, Seccion, SeccionCrear, SeccionListado } from './types';

const LIMITE_SELECTOR = 100;

export function listarSecciones(
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<SeccionListado>>> {
  return clienteHttp.get<Pagina<SeccionListado>>(`/secciones?limit=${limit}&offset=${offset}`);
}

export function crearSeccion(datos: SeccionCrear): Promise<RespuestaApi<Seccion>> {
  return clienteHttp.post<Seccion, SeccionCrear>('/secciones', datos);
}

export function listarProductosHabilitados(): Promise<RespuestaApi<Pagina<ProductoSeleccionable>>> {
  return clienteHttp.get<Pagina<ProductoSeleccionable>>(
    `/productos?limit=${LIMITE_SELECTOR}&offset=0`,
  );
}
