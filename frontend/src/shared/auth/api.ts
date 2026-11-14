import { clienteHttp } from '../api/client';
import type { RespuestaApi } from '../types';

import type { SesionCrear, SesionIniciada, UsuarioSesion } from './types';

export function iniciarSesion(datos: SesionCrear): Promise<RespuestaApi<SesionIniciada>> {
  return clienteHttp.post<SesionIniciada, SesionCrear>('/sesion', datos);
}

/** Restaura la sesion al recargar la pagina. */
export function obtenerSesion(): Promise<RespuestaApi<UsuarioSesion>> {
  return clienteHttp.get<UsuarioSesion>('/sesion');
}

export function cerrarSesion(): Promise<RespuestaApi<null>> {
  return clienteHttp.delete<null>('/sesion');
}
