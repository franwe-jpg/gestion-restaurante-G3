import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  FiltroEstado,
  MenuEjecutivo,
  MenuEjecutivoActualizar,
  MenuEjecutivoCrear,
  ProductoSeleccionable,
  SeccionMenu,
} from './types';

const LIMITE_SELECTOR = 100;

export function crearMenuEjecutivo(
  datos: MenuEjecutivoCrear,
): Promise<RespuestaApi<MenuEjecutivo>> {
  return clienteHttp.post<MenuEjecutivo, MenuEjecutivoCrear>('/menus-ejecutivos', datos);
}

export function modificarMenuEjecutivo(
  id: number,
  datos: MenuEjecutivoActualizar,
): Promise<RespuestaApi<MenuEjecutivo>> {
  return clienteHttp.put<MenuEjecutivo, MenuEjecutivoActualizar>(`/menus-ejecutivos/${id}`, datos);
}

export function darDeBajaMenuEjecutivo(id: number): Promise<RespuestaApi<MenuEjecutivo>> {
  return clienteHttp.post<MenuEjecutivo, Record<string, never>>(`/menus-ejecutivos/${id}/baja`, {});
}

export function listarMenusEjecutivos(
  estado: FiltroEstado,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<MenuEjecutivo>>> {
  const filtro = estado === 'TODOS' ? '' : `estado=${estado}&`;
  return clienteHttp.get<Pagina<MenuEjecutivo>>(
    `/menus-ejecutivos?${filtro}limit=${limit}&offset=${offset}`,
  );
}

export async function listarProductosHabilitados(): Promise<RespuestaApi<ProductoSeleccionable[]>> {
  const respuesta = await clienteHttp.get<Pagina<ProductoSeleccionable>>(
    `/productos?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
  if (!respuesta.exito || respuesta.datos === null) {
    return { datos: null, exito: false, error: respuesta.error };
  }
  return {
    datos: respuesta.datos.items.filter(
      (producto) => producto.estado === 'HABILITADO' && producto.categoria !== 'MENU_DEL_DIA',
    ),
    exito: true,
  };
}

export async function listarSeccionesHabilitadas(): Promise<RespuestaApi<SeccionMenu[]>> {
  const respuesta = await clienteHttp.get<Pagina<SeccionMenu>>(
    `/secciones?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
  if (!respuesta.exito || respuesta.datos === null) {
    return { datos: null, exito: false, error: respuesta.error };
  }
  return { datos: respuesta.datos.items, exito: true };
}
