import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type { MedioPago, MedioPagoCrear, MedioPagoModificar } from './types';

const RUTA = '/medios-de-pago';

/** HU-M6-04: alta de un medio de pago; queda habilitado. */
export function crearMedioPago(datos: MedioPagoCrear): Promise<RespuestaApi<MedioPago>> {
  return clienteHttp.post<MedioPago, MedioPagoCrear>(RUTA, datos);
}

/** HU-M6-05: reemplaza nombre, tipo, descripción y estado. */
export function modificarMedioPago(
  id: number,
  datos: MedioPagoModificar,
): Promise<RespuestaApi<MedioPago>> {
  return clienteHttp.put<MedioPago, MedioPagoModificar>(`${RUTA}/${id}`, datos);
}

/** HU-M6-06: baja lógica; el backend responde 204 sin cuerpo. */
export function eliminarMedioPago(id: number): Promise<RespuestaApi<null>> {
  return clienteHttp.delete<null>(`${RUTA}/${id}`);
}

/** HU-M6-07: por defecto solo los habilitados; a pedido, también los deshabilitados. */
export function listarMediosPago(
  limit: number,
  offset: number,
  incluirDeshabilitados: boolean,
): Promise<RespuestaApi<Pagina<MedioPago>>> {
  const filtro = incluirDeshabilitados ? '&incluir_deshabilitados=true' : '';
  return clienteHttp.get<Pagina<MedioPago>>(`${RUTA}?limit=${limit}&offset=${offset}${filtro}`);
}
