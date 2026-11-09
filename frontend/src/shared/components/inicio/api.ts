import { clienteHttp } from '../../api/client';
import type { Pagina, RespuestaApi } from '../../types';

import { armarComanda } from './detalleDeMesa';
import { clasificarMesas } from './mapaDelLocal';
import type {
  CajaDelDia,
  ClienteApi,
  ComandaApi,
  ComandaDeMesa,
  ItemConNombre,
  MesaApi,
  MesaDelMapa,
  ReservaActiva,
} from './types';

const LIMITE_PAGINA = 100;

/** Fecha local del navegador `YYYY-MM-DD`; sin `toISOString()`, que en UTC-3 adelanta el día. */
export function hoyLocal(): string {
  const ahora = new Date();
  const conCeros = (valor: number) => String(valor).padStart(2, '0');
  return `${ahora.getFullYear()}-${conCeros(ahora.getMonth() + 1)}-${conCeros(ahora.getDate())}`;
}

/** Pide página por página hasta completar `total`; el primer error corta y se propaga. */
async function obtenerTodas<T>(ruta: string): Promise<RespuestaApi<T[]>> {
  const separador = ruta.includes('?') ? '&' : '?';
  const items: T[] = [];
  let total: number;
  do {
    const respuesta = await clienteHttp.get<Pagina<T>>(
      `${ruta}${separador}limit=${LIMITE_PAGINA}&offset=${items.length}`,
    );
    if (!respuesta.exito || respuesta.datos === null) {
      return { datos: null, exito: false, error: respuesta.error };
    }
    items.push(...respuesta.datos.items);
    total = respuesta.datos.total;
    if (respuesta.datos.items.length === 0) break;
  } while (items.length < total);
  return { datos: items, exito: true };
}

/** Mesas de M3 más las reservas ACTIVA de `fecha` de M5, ya clasificadas para el mapa. */
export async function obtenerMapaDelLocal(fecha: string): Promise<RespuestaApi<MesaDelMapa[]>> {
  const [mesas, reservas] = await Promise.all([
    obtenerTodas<MesaApi>('/mesas'),
    obtenerTodas<ReservaActiva>(`/reservas?fecha=${fecha}&estado=ACTIVA`),
  ]);
  if (!mesas.exito || mesas.datos === null) {
    return { datos: null, exito: false, error: mesas.error };
  }
  if (!reservas.exito || reservas.datos === null) {
    return { datos: null, exito: false, error: reservas.error };
  }
  return { datos: clasificarMesas(mesas.datos, reservas.datos), exito: true };
}

/** Lo cobrado hoy por medio de pago y lo adeudado (M6). */
export function obtenerCajaDelDia(): Promise<RespuestaApi<CajaDelDia>> {
  return clienteHttp.get<CajaDelDia>('/reportes/caja-del-dia');
}

function fallo<T>(respuesta: RespuestaApi<unknown>): RespuestaApi<T> {
  return { datos: null, exito: false, error: respuesta.error };
}

/**
 * Comanda ABIERTA de la mesa (M4) con los nombres de productos (M1, todos los estados) y de menús
 * ejecutivos (M2). `datos: null` si la mesa no tiene una comanda abierta.
 */
export async function obtenerComandaAbierta(
  mesaId: number,
): Promise<RespuestaApi<ComandaDeMesa | null>> {
  const abiertas = await clienteHttp.get<Pagina<{ id: number }>>(
    `/comandas?mesa_id=${mesaId}&estado=ABIERTA&limit=1`,
  );
  if (!abiertas.exito || abiertas.datos === null) return fallo(abiertas);
  const primera = abiertas.datos.items[0];
  if (primera === undefined) return { datos: null, exito: true };
  const [comanda, productos, menus] = await Promise.all([
    clienteHttp.get<ComandaApi>(`/comandas/${primera.id}`),
    obtenerTodas<ItemConNombre>('/productos?estado=TODOS'),
    obtenerTodas<ItemConNombre>('/menus-ejecutivos'),
  ]);
  for (const respuesta of [comanda, productos, menus]) {
    if (!respuesta.exito || respuesta.datos === null) return fallo(respuesta);
  }
  return {
    datos: armarComanda(comanda.datos as ComandaApi, productos.datos ?? [], menus.datos ?? []),
    exito: true,
  };
}

/**
 * Cliente de una reserva. M4 no ofrece `GET /clientes/{id}`: se recorren las páginas de
 * `GET /clientes` y se busca el id. `datos: null` si no está.
 */
export async function obtenerCliente(id: number): Promise<RespuestaApi<ClienteApi | null>> {
  const clientes = await obtenerTodas<ClienteApi>('/clientes');
  if (!clientes.exito || clientes.datos === null) return fallo(clientes);
  return { datos: clientes.datos.find((cliente) => cliente.id === id) ?? null, exito: true };
}
