import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { Sector, SectorCrear } from './types';

export function crearSector(datos: SectorCrear): Promise<RespuestaApi<Sector>> {
  return clienteHttp.post<Sector, SectorCrear>('/sectores', datos);
}
