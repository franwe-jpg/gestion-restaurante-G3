import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  CobroCrear,
  Comprobante,
  Factura,
  FacturaCrear,
  FacturaPrevia,
  FacturaResumen,
  MedioPago,
  MedioPagoCrear,
  MedioPagoModificar,
  ResumenRecaudacion,
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

/** HU-M6-02: listado paginado de facturas, de la más reciente a la más vieja. */
export function listarFacturas(
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<FacturaResumen>>> {
  return clienteHttp.get<Pagina<FacturaResumen>>(
    `${RUTA_FACTURAS}?limit=${limit}&offset=${offset}`,
  );
}

/** HU-M6-02: factura completa con sus cobros, para mostrar el saldo antes de cobrar. */
export function obtenerFactura(id: number): Promise<RespuestaApi<Factura>> {
  return clienteHttp.get<Factura>(`${RUTA_FACTURAS}/${id}`);
}

/** HU-M6-02: registra un cobro sobre una factura adeudada y devuelve la factura actualizada. */
export function registrarCobro(
  facturaId: number,
  datos: CobroCrear,
): Promise<RespuestaApi<Factura>> {
  return clienteHttp.post<Factura, CobroCrear>(`${RUTA_FACTURAS}/${facturaId}/cobros`, datos);
}

const RUTA_COMPROBANTES = '/comprobantes';

/** HU-M6-03: comprobante de un cobro; pedirlo otra vez devuelve el mismo. */
export function obtenerComprobante(numero: number): Promise<RespuestaApi<Comprobante>> {
  return clienteHttp.get<Comprobante>(`${RUTA_COMPROBANTES}/${numero}`);
}

/** HU-M6-03: el mismo comprobante en PDF, para entregarlo al cliente. */
export function descargarComprobantePdf(numero: number): Promise<RespuestaApi<Blob>> {
  return clienteHttp.obtenerArchivo(`${RUTA_COMPROBANTES}/${numero}/pdf`);
}

const RUTA_RECAUDACION = '/reportes/recaudacion-por-medio-de-pago';

function consultaPeriodo(fechaDesde: string, fechaHasta: string): string {
  return new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }).toString();
}

/** HU-M6-08: `GET /reportes/recaudacion-por-medio-de-pago`. Un 422 llega en `error`. */
export function obtenerReporteRecaudacion(
  fechaDesde: string,
  fechaHasta: string,
): Promise<RespuestaApi<ResumenRecaudacion>> {
  return clienteHttp.get<ResumenRecaudacion>(
    `${RUTA_RECAUDACION}?${consultaPeriodo(fechaDesde, fechaHasta)}`,
  );
}

/** HU-M6-08: el mismo reporte en PDF, como `Blob` para `guardarArchivo`. */
export function descargarReporteRecaudacionPdf(
  fechaDesde: string,
  fechaHasta: string,
): Promise<RespuestaApi<Blob>> {
  return clienteHttp.obtenerArchivo(
    `${RUTA_RECAUDACION}/pdf?${consultaPeriodo(fechaDesde, fechaHasta)}`,
  );
}
