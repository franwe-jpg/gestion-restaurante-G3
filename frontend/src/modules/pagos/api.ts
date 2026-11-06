import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  Factura,
  FacturaCrear,
  FacturaPrevia,
  MedioPago,
  MedioPagoCrear,
  MedioPagoModificar,
} from './types';

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

const RUTA_FACTURAS = '/facturas';

/** HU-M6-01 CA1: detalle, fecha y total de una comanda cerrada, sin guardar nada. */
export function previsualizarFactura(comandaId: number): Promise<RespuestaApi<FacturaPrevia>> {
  return clienteHttp.get<FacturaPrevia>(`${RUTA_FACTURAS}/previsualizar?comanda_id=${comandaId}`);
}

/** HU-M6-01 CA2: genera la factura junto con su primer cobro. */
export function generarFactura(datos: FacturaCrear): Promise<RespuestaApi<Factura>> {
  return clienteHttp.post<Factura, FacturaCrear>(RUTA_FACTURAS, datos);
}
