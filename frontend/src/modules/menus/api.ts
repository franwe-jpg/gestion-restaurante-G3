import { clienteHttp, urlDelBackend } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  FiltroEstado,
  MenuDelDia,
  MenuDelDiaCrear,
  MenuDelDiaListado,
  MenuDelDiaModificar,
  MenuEjecutivo,
  MenuEjecutivoActualizar,
  MenuEjecutivoCrear,
  ProductoSeleccionable,
  Promocion,
  PromocionCrear,
  PromocionModificar,
  ReporteImpactoPromociones,
  SeccionMenu,
} from './types';

const LIMITE_SELECTOR = 100;

function formulario(datos: MenuDelDiaCrear | MenuDelDiaModificar, imagen: File | null): FormData {
  const cuerpo = new FormData();
  cuerpo.append('datos', JSON.stringify(datos));
  if (imagen !== null) cuerpo.append('imagen', imagen);
  return cuerpo;
}

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

/** Secciones habilitadas para los selects; el modulo no importa el `api.ts` de productos (D-15). */
export function listarSeccionesHabilitadas(): Promise<RespuestaApi<Pagina<SeccionMenu>>> {
  return clienteHttp.get<Pagina<SeccionMenu>>(
    `/secciones?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
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

export function urlDeImagen(ruta: string | null): string | null {
  return ruta === null ? null : urlDelBackend(ruta);
}

export function crearPromocion(datos: PromocionCrear): Promise<RespuestaApi<Promocion>> {
  return clienteHttp.post<Promocion, PromocionCrear>('/promociones', datos);
}

export function listarPromociones(
  estado: FiltroEstado,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<Promocion>>> {
  const filtro = estado === 'TODOS' ? '' : `estado=${estado}&`;
  return clienteHttp.get<Pagina<Promocion>>(
    `/promociones?${filtro}limit=${limit}&offset=${offset}`,
  );
}

export async function listarProductosParaPromocion(): Promise<
  RespuestaApi<ProductoSeleccionable[]>
> {
  const respuesta = await clienteHttp.get<Pagina<ProductoSeleccionable>>(
    `/productos?estado=HABILITADO&limit=${LIMITE_SELECTOR}&offset=0`,
  );
  if (!respuesta.exito || respuesta.datos === null) {
    return { datos: null, exito: false, error: respuesta.error };
  }
  return { datos: respuesta.datos.items, exito: true };
}

export function modificarPromocion(
  id: number,
  datos: PromocionModificar,
): Promise<RespuestaApi<Promocion>> {
  return clienteHttp.put<Promocion, PromocionModificar>(`/promociones/${id}`, datos);
}

export function finalizarPromocion(id: number): Promise<RespuestaApi<Promocion>> {
  return clienteHttp.post<Promocion, Record<string, never>>(`/promociones/${id}/finalizar`, {});
}

/** HU-M2-10: impacto de una promoción en las ventas diarias de sus productos. */
export function obtenerReporteImpactoPromociones(
  fechaDesde: string,
  fechaHasta: string,
  promocionId: number,
): Promise<RespuestaApi<ReporteImpactoPromociones>> {
  const parametros = new URLSearchParams({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    promocion_id: String(promocionId),
  });
  return clienteHttp.get<ReporteImpactoPromociones>(
    `/reportes/impacto-promociones?${parametros.toString()}`,
  );
}
