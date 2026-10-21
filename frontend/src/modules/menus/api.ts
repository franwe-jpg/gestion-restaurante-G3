import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { MenuPromocion } from './types';

export async function listarMenus(): Promise<RespuestaApi<MenuPromocion[]>> {
  return clienteHttp.get<MenuPromocion[]>('/menus');
}
