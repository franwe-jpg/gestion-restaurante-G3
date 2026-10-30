import { clienteHttp } from '../../shared/api/client';
import type { RespuestaApi } from '../../shared/types';
import type { ComprobantePago } from './types';

export async function listarPagos(): Promise<RespuestaApi<ComprobantePago[]>> {
  return clienteHttp.get<ComprobantePago[]>('/pagos');
}
