import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { Mesa, MesaCrear, Sector, SectorCrear, SectorModificar } from './types';

const LIMITE_SELECTOR = 100;

export function crearSector(datos: SectorCrear): Promise<RespuestaApi<Sector>> {
  return clienteHttp.post<Sector, SectorCrear>('/sectores', datos);
}

/** HU-M3-02: reemplaza nombre y descripción de un sector existente. */
export function modificarSector(id: number, datos: SectorModificar): Promise<RespuestaApi<Sector>> {
  return clienteHttp.put<Sector, SectorModificar>(`/sectores/${id}`, datos);
}

/** HU-M3-04: listado completo, sin filtro de estado (habilitados y deshabilitados). */
export function listarSectores(
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<Sector>>> {
  return clienteHttp.get<Pagina<Sector>>(`/sectores?limit=${limit}&offset=${offset}`);
}

/** Lectura de apoyo para el selector de mesas: solo sectores habilitados. */
export function listarSectoresHabilitados(): Promise<RespuestaApi<Pagina<Sector>>> {
  return clienteHttp.get<Pagina<Sector>>(
    `/sectores?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
}

export function crearMesa(datos: MesaCrear): Promise<RespuestaApi<Mesa>> {
  return clienteHttp.post<Mesa, MesaCrear>('/mesas', datos);
}
