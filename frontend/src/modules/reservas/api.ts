import { clienteHttp } from '../../shared/api/client';
import type { Pagina, RespuestaApi } from '../../shared/types';
import type {
  ClienteEncontrado,
  ComandaCreada,
  ComandaDesdeReservaCrear,
  FiltroEstadoReserva,
  MesaDisponible,
  MozoSeleccionable,
  ProductoHabilitado,
  Reserva,
  ReservaCrear,
  ReservaModificar,
  ResumenReservas,
} from './types';

/** Reservas de un día. `'TODAS'` no envía `estado`: la API trae los cuatro estados. */
export function listarReservas(
  fecha: string,
  estado: FiltroEstadoReserva,
  limit: number,
  offset: number,
): Promise<RespuestaApi<Pagina<Reserva>>> {
  const consulta = new URLSearchParams({ fecha });
  if (estado !== 'TODAS') consulta.set('estado', estado);
  consulta.set('limit', String(limit));
  consulta.set('offset', String(offset));
  return clienteHttp.get<Pagina<Reserva>>(`/reservas?${consulta.toString()}`);
}

/** Mesas libres para una fecha `YYYY-MM-DD` y una hora `HH:MM`: una lista simple, sin paginar. */
export function listarMesasDisponibles(
  fecha: string,
  hora: string,
): Promise<RespuestaApi<MesaDisponible[]>> {
  const consulta = new URLSearchParams({ fecha, hora });
  return clienteHttp.get<MesaDisponible[]>(`/reservas/mesas-disponibles?${consulta.toString()}`);
}

export function crearReserva(datos: ReservaCrear): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, ReservaCrear>('/reservas', datos);
}

/** Cambia solo fecha, hora y cantidad de personas: mesa, cliente y estado no se envían. */
export function modificarReserva(
  id: number,
  datos: ReservaModificar,
): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.put<Reserva, ReservaModificar>(`/reservas/${id}`, datos);
}

/** HU-M5-04: `POST /reservas/{id}/cancelar-anticipada`, sin cuerpo. */
export function cancelarReservaAnticipada(id: number): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, Record<string, never>>(
    `/reservas/${id}/cancelar-anticipada`,
    {},
  );
}

/** HU-M5-05: `POST /reservas/{id}/cancelar-por-ausencia`, sin cuerpo. */
export function cancelarReservaPorAusencia(id: number): Promise<RespuestaApi<Reserva>> {
  return clienteHttp.post<Reserva, Record<string, never>>(
    `/reservas/${id}/cancelar-por-ausencia`,
    {},
  );
}

/** HU-M5-06: `POST /reservas/{id}/comanda` crea la comanda de una reserva y la pasa a `ATENDIDA`. */
export function crearComandaDesdeReserva(
  reservaId: number,
  datos: ComandaDesdeReservaCrear,
): Promise<RespuestaApi<ComandaCreada>> {
  return clienteHttp.post<ComandaCreada, ComandaDesdeReservaCrear>(
    `/reservas/${reservaId}/comanda`,
    datos,
  );
}

const LIMITE_MOZOS = 100;

async function listarPaginaMozos(offset: number): Promise<RespuestaApi<Pagina<MozoSeleccionable>>> {
  const consulta = new URLSearchParams({
    estado: 'HABILITADO',
    limit: String(LIMITE_MOZOS),
    offset: String(offset),
  });
  return clienteHttp.get<Pagina<MozoSeleccionable>>(`/mozos?${consulta.toString()}`);
}

/** Lee todas las páginas del catálogo público M3; no incluye mozos deshabilitados. */
export async function listarMozosHabilitados(): Promise<RespuestaApi<MozoSeleccionable[]>> {
  const mozos: MozoSeleccionable[] = [];
  let offset = 0;
  while (true) {
    const respuesta = await listarPaginaMozos(offset);
    if (!respuesta.exito || !respuesta.datos) {
      return {
        exito: false,
        datos: null,
        error: respuesta.error ?? 'No se pudieron cargar los mozos habilitados',
      };
    }
    const pagina = respuesta.datos;
    mozos.push(...pagina.items.filter((mozo) => mozo.estado === 'HABILITADO'));
    if (!pagina.items.length || pagina.offset + pagina.items.length >= pagina.total) {
      return { exito: true, datos: mozos };
    }
    if (pagina.limit <= 0 || pagina.offset + pagina.limit <= offset) {
      return {
        exito: false,
        datos: null,
        error: 'El backend devolvió una página de mozos inválida',
      };
    }
    offset = pagina.offset + pagina.limit;
  }
}

/** Tamaño de página al leer los productos: el máximo que admite la API (D-27). */
export const LIMITE_PRODUCTOS = 100;

function aProductoHabilitado({ id, nombre, precio }: ProductoHabilitado): ProductoHabilitado {
  return { id, nombre, precio };
}

function porNombre(a: ProductoHabilitado, b: ProductoHabilitado): number {
  return a.nombre.localeCompare(b.nombre, 'es') || a.id - b.id;
}

/**
 * HU-M5-06: todos los productos habilitados, para el desplegable del modal «Crear comanda».
 * `GET /productos` pagina y no tiene búsqueda, así que lee las páginas de a 100 hasta cubrir el
 * `total`. Una página vacía antes de completarlo corta la lectura y devuelve lo leído, para no
 * girar sin fin si el catálogo se achicó mientras se leía. Si falla cualquier página devuelve el
 * error y descarta lo leído. Un producto que aparece en dos páginas porque el catálogo cambió se
 * ofrece una sola vez. El resultado sale ordenado por nombre.
 */
export async function listarProductosHabilitados(): Promise<RespuestaApi<ProductoHabilitado[]>> {
  const productos = new Map<number, ProductoHabilitado>();
  let leidos = 0;
  let hayMas = true;
  while (hayMas) {
    const respuesta = await clienteHttp.get<Pagina<ProductoHabilitado>>(
      `/productos?estado=HABILITADO&limit=${LIMITE_PRODUCTOS}&offset=${leidos}`,
    );
    if (!respuesta.exito || respuesta.datos === null) {
      return { datos: null, exito: false, error: respuesta.error };
    }
    const { items, total } = respuesta.datos;
    items.forEach((item) => productos.set(item.id, aProductoHabilitado(item)));
    leidos += items.length;
    // Una página vacía corta la lectura aunque no se haya llegado al total.
    hayMas = items.length > 0 && leidos < total;
  }
  return { datos: [...productos.values()].sort(porNombre), exito: true };
}

/** Resultados de la búsqueda de clientes: la primera página, sin paginar en pantalla (S43). */
export const LIMITE_BUSQUEDA_CLIENTES = 10;

/** Clientes registrados cuyo nombre o teléfono coincide con `q` (`GET /clientes?q=`, M4). */
export function buscarClientes(q: string): Promise<RespuestaApi<Pagina<ClienteEncontrado>>> {
  const consulta = new URLSearchParams({ q });
  consulta.set('limit', String(LIMITE_BUSQUEDA_CLIENTES));
  consulta.set('offset', '0');
  return clienteHttp.get<Pagina<ClienteEncontrado>>(`/clientes?${consulta.toString()}`);
}

/** Clientes del desplegable del alta: una sola página, del tamaño máximo que admite la API (S71). */
export const LIMITE_LISTA_CLIENTES = 100;

/**
 * Los primeros clientes registrados, para el desplegable «Clientes registrados» del alta (S71):
 * `GET /clientes?limit=100&offset=0` de M4, sin texto de búsqueda y sin leer más páginas. El
 * `total` de la respuesta dice si hay más clientes de los que trae.
 */
export function listarClientes(): Promise<RespuestaApi<Pagina<ClienteEncontrado>>> {
  const consulta = new URLSearchParams({ limit: String(LIMITE_LISTA_CLIENTES), offset: '0' });
  return clienteHttp.get<Pagina<ClienteEncontrado>>(`/clientes?${consulta.toString()}`);
}

function consultaPeriodo(fechaDesde: string, fechaHasta: string): string {
  return new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }).toString();
}

/** HU-M5-07: `GET /reportes/reservas-ausentismo`. Un 422 llega en `error` con el `detalle`. */
export function obtenerReporteReservasAusentismo(
  fechaDesde: string,
  fechaHasta: string,
): Promise<RespuestaApi<ResumenReservas>> {
  return clienteHttp.get<ResumenReservas>(
    `/reportes/reservas-ausentismo?${consultaPeriodo(fechaDesde, fechaHasta)}`,
  );
}

/** HU-M5-07: el mismo reporte en PDF, como `Blob` para `guardarArchivo`. */
export function descargarReporteReservasAusentismoPdf(
  fechaDesde: string,
  fechaHasta: string,
): Promise<RespuestaApi<Blob>> {
  return clienteHttp.obtenerArchivo(
    `/reportes/reservas-ausentismo/pdf?${consultaPeriodo(fechaDesde, fechaHasta)}`,
  );
}
