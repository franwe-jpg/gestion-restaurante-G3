import { clienteHttp, urlDelBackend } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  FiltroEstado,
  MenuDelDia,
  MenuDelDiaCrear,
  MenuDelDiaListado,
  MenuDelDiaModificar,
  SeccionResumen,
} from './types';

const LIMITE_SELECTOR = 100;

function formulario(datos: MenuDelDiaCrear | MenuDelDiaModificar, imagen: File | null): FormData {
  const cuerpo = new FormData();
  cuerpo.append('datos', JSON.stringify(datos));
  if (imagen !== null) cuerpo.append('imagen', imagen);
  return cuerpo;
}

export function listarMenusDelDia(
  estado: FiltroEstado,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<MenuDelDiaListado>>> {
  return clienteHttp.get<Pagina<MenuDelDiaListado>>(
    `/menus-del-dia?estado=${estado}&limit=${limit}&offset=${offset}`,
  );
}

export function obtenerMenuDelDia(id: number): Promise<RespuestaApi<MenuDelDia>> {
  return clienteHttp.get<MenuDelDia>(`/menus-del-dia/${id}`);
}

export function crearMenuDelDia(
  datos: MenuDelDiaCrear,
  imagen: File | null,
): Promise<RespuestaApi<MenuDelDia>> {
  return clienteHttp.postFormulario<MenuDelDia>('/menus-del-dia', formulario(datos, imagen));
}

export function modificarMenuDelDia(
  id: number,
  datos: MenuDelDiaModificar,
  imagen: File | null,
): Promise<RespuestaApi<MenuDelDia>> {
  return clienteHttp.putFormulario<MenuDelDia>(`/menus-del-dia/${id}`, formulario(datos, imagen));
}

export function darDeBajaMenuDelDia(id: number): Promise<RespuestaApi<MenuDelDia>> {
  return clienteHttp.post<MenuDelDia, Record<string, never>>(`/menus-del-dia/${id}/baja`, {});
}

/** Secciones habilitadas para el select; el módulo no importa el `api.ts` de productos (D-15). */
export function listarSeccionesHabilitadas(): Promise<RespuestaApi<Pagina<SeccionResumen>>> {
  return clienteHttp.get<Pagina<SeccionResumen>>(
    `/secciones?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
}

export function urlDeImagen(ruta: string | null): string | null {
  return ruta === null ? null : urlDelBackend(ruta);
}
