import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  Chef,
  ChefCrear,
  ChefModificar,
  Mesa,
  MesaCrear,
  MesaModificar,
  Mozo,
  MozoCrear,
  MozoModificar,
  ReporteMesasVentasPorMozo,
  Sector,
  SectorCrear,
  SectorModificar,
} from './types';

const LIMITE_SELECTOR = 100;

export function crearSector(datos: SectorCrear): Promise<RespuestaApi<Sector>> {
  return clienteHttp.post<Sector, SectorCrear>('/sectores', datos);
}

/** HU-M3-02: reemplaza nombre y descripción de un sector existente. */
export function modificarSector(id: number, datos: SectorModificar): Promise<RespuestaApi<Sector>> {
  return clienteHttp.put<Sector, SectorModificar>(`/sectores/${id}`, datos);
}

/** HU-M3-03: baja logica; el sector queda deshabilitado y conserva sus datos. */
export function eliminarSector(id: number): Promise<RespuestaApi<Sector>> {
  return clienteHttp.post<Sector, Record<string, never>>(`/sectores/${id}/baja`, {});
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

/** HU-M3-06: reemplaza número, capacidad y sector de una mesa existente. */
export function modificarMesa(id: number, datos: MesaModificar): Promise<RespuestaApi<Mesa>> {
  return clienteHttp.put<Mesa, MesaModificar>(`/mesas/${id}`, datos);
}

/** HU-M3-08: listado paginado de mesas con su sector. */
export function listarMesas(limit: number, offset: number): Promise<RespuestaApi<Pagina<Mesa>>> {
  return clienteHttp.get<Pagina<Mesa>>(`/mesas?limit=${limit}&offset=${offset}`);
}

/** HU-M3-07: borra la mesa; el backend responde 204 sin cuerpo. */
export function eliminarMesa(id: number): Promise<RespuestaApi<null>> {
  return clienteHttp.delete<null>(`/mesas/${id}`);
}

/** HU-M3-09: alta de mozo; el backend lo deja en estado Habilitado. */
export function crearMozo(datos: MozoCrear): Promise<RespuestaApi<Mozo>> {
  return clienteHttp.post<Mozo, MozoCrear>('/mozos', datos);
}

/** HU-M3-10: reemplaza los datos de un mozo existente. */
export function modificarMozo(id: number, datos: MozoModificar): Promise<RespuestaApi<Mozo>> {
  return clienteHttp.put<Mozo, MozoModificar>(`/mozos/${id}`, datos);
}

/** HU-M3-11: baja lógica; el mozo queda deshabilitado y conserva sus datos. */
export function eliminarMozo(id: number): Promise<RespuestaApi<Mozo>> {
  return clienteHttp.post<Mozo, Record<string, never>>(`/mozos/${id}/baja`, {});
}

/** HU-M3-12: listado completo, sin filtro de estado (habilitados y deshabilitados). */
export function listarMozos(limit: number, offset: number): Promise<RespuestaApi<Pagina<Mozo>>> {
  return clienteHttp.get<Pagina<Mozo>>(`/mozos?limit=${limit}&offset=${offset}`);
}

/** Lectura de apoyo para asignaciones: solo mozos habilitados. */
export function listarMozosDisponibles(): Promise<RespuestaApi<Pagina<Mozo>>> {
  return clienteHttp.get<Pagina<Mozo>>(
    `/mozos?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
}

/** HU-TR-01: alta de chef con su usuario; el backend lo deja en estado Habilitado. */
export function crearChef(datos: ChefCrear): Promise<RespuestaApi<Chef>> {
  return clienteHttp.post<Chef, ChefCrear>('/chefs', datos);
}

/** HU-TR-01: reemplaza los datos de un chef; la contraseña vacía conserva la actual. */
export function modificarChef(id: number, datos: ChefModificar): Promise<RespuestaApi<Chef>> {
  return clienteHttp.put<Chef, ChefModificar>(`/chefs/${id}`, datos);
}

/** HU-TR-01: baja lógica; el chef y su usuario quedan deshabilitados. */
export function eliminarChef(id: number): Promise<RespuestaApi<Chef>> {
  return clienteHttp.post<Chef, Record<string, never>>(`/chefs/${id}/baja`, {});
}

/** HU-TR-01: listado completo, sin filtro de estado (habilitados y deshabilitados). */
export function listarChefs(limit: number, offset: number): Promise<RespuestaApi<Pagina<Chef>>> {
  return clienteHttp.get<Pagina<Chef>>(`/chefs?limit=${limit}&offset=${offset}`);
}

function consultaReporte(
  fechaDesde: string,
  fechaHasta: string,
  mozoId: number | null,
  sectorId: number | null,
): string {
  const parametros = new URLSearchParams({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  });
  if (mozoId !== null) parametros.set('mozo_id', String(mozoId));
  if (sectorId !== null) parametros.set('sector_id', String(sectorId));
  return parametros.toString();
}

/** HU-M3-13: mesas atendidas y ventas por mozo; mozo y sector son opcionales. */
export function obtenerReporteMozos(
  fechaDesde: string,
  fechaHasta: string,
  mozoId: number | null = null,
  sectorId: number | null = null,
): Promise<RespuestaApi<ReporteMesasVentasPorMozo>> {
  return clienteHttp.get<ReporteMesasVentasPorMozo>(
    `/reportes/mesas-ventas-por-mozo?${consultaReporte(fechaDesde, fechaHasta, mozoId, sectorId)}`,
  );
}
