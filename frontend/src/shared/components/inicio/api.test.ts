import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../api/client';
import type { Pagina, RespuestaApi } from '../../types';

import {
  hoyLocal,
  obtenerCajaDelDia,
  obtenerCliente,
  obtenerComandaAbierta,
  obtenerMapaDelLocal,
} from './api';
import type {
  CajaDelDia,
  ClienteApi,
  ComandaApi,
  ItemConNombre,
  MesaApi,
  ReservaActiva,
} from './types';

function mesas(desde: number, cantidad: number): MesaApi[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: desde + i,
    numero: desde + i,
    capacidad: 4,
    sector: { id: 1, nombre: 'Salón' },
    estado: 'LIBRE' as const,
  }));
}

function reserva(mesa_id: number, hora: string): ReservaActiva {
  return { id: mesa_id * 10, mesa_id, cliente_id: 7, hora, cantidad_personas: 3 };
}

function pagina<T>(items: T[], total: number, offset = 0): RespuestaApi<Pagina<T>> {
  return { exito: true, datos: { items, total, limit: 100, offset } };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('obtenerMapaDelLocal', () => {
  it('pagina /mesas con limit=100 hasta completar el total (120 mesas = 2 páginas)', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockImplementation((ruta: string) => {
      if (ruta.startsWith('/mesas?limit=100&offset=0'))
        return Promise.resolve(pagina(mesas(1, 100), 120));
      if (ruta.startsWith('/mesas?limit=100&offset=100'))
        return Promise.resolve(pagina(mesas(101, 20), 120, 100));
      return Promise.resolve(pagina<ReservaActiva>([], 0));
    });

    const respuesta = await obtenerMapaDelLocal('2026-11-09');

    expect(respuesta.exito).toBe(true);
    expect(respuesta.datos).toHaveLength(120);
    const rutasDeMesas = get.mock.calls.map(([ruta]) => ruta).filter((r) => r.startsWith('/mesas'));
    expect(rutasDeMesas).toEqual(['/mesas?limit=100&offset=0', '/mesas?limit=100&offset=100']);
  });

  it('pide las reservas ACTIVA de la fecha y marca la mesa reservada', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockImplementation((ruta: string) =>
        Promise.resolve(
          ruta.startsWith('/mesas')
            ? pagina(mesas(1, 2), 2)
            : pagina<ReservaActiva>([reserva(2, '20:30')], 1),
        ),
      );

    const respuesta = await obtenerMapaDelLocal('2026-11-09');

    expect(get).toHaveBeenCalledWith('/reservas?fecha=2026-11-09&estado=ACTIVA&limit=100&offset=0');
    expect(respuesta.datos?.map((m) => m.estadoVisible)).toEqual(['LIBRE', 'RESERVADA']);
  });

  it('propaga el error de mesas', async () => {
    vi.spyOn(clienteHttp, 'get').mockImplementation((ruta: string) =>
      Promise.resolve(
        ruta.startsWith('/mesas')
          ? { datos: null, exito: false, error: 'Falla de mesas' }
          : pagina<ReservaActiva>([], 0),
      ),
    );

    const respuesta = await obtenerMapaDelLocal('2026-11-09');

    expect(respuesta).toEqual({ datos: null, exito: false, error: 'Falla de mesas' });
  });

  it('propaga el error de reservas en lugar de mostrar un mapa incompleto', async () => {
    vi.spyOn(clienteHttp, 'get').mockImplementation((ruta: string) =>
      Promise.resolve(
        ruta.startsWith('/mesas')
          ? pagina(mesas(1, 1), 1)
          : { datos: null, exito: false, error: 'Falla de reservas' },
      ),
    );

    const respuesta = await obtenerMapaDelLocal('2026-11-09');

    expect(respuesta).toEqual({ datos: null, exito: false, error: 'Falla de reservas' });
  });
});

describe('obtenerCajaDelDia', () => {
  it('pide /reportes/caja-del-dia', async () => {
    const caja: CajaDelDia = {
      fecha: '2026-11-09',
      por_medio_pago: [],
      total_cobrado: '0.00',
      adeudado: { cantidad_facturas: 0, monto: '0.00' },
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: true, datos: caja });

    const respuesta = await obtenerCajaDelDia();

    expect(get).toHaveBeenCalledWith('/reportes/caja-del-dia');
    expect(respuesta.datos).toEqual(caja);
  });
});

describe('hoyLocal', () => {
  it('usa la fecha local y no la de UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 23, 30));

    expect(hoyLocal()).toBe('2026-11-09');
  });
});

const COMANDA: ComandaApi = {
  id: 5,
  mesa_id: 2,
  estado: 'ABIERTA',
  fecha_hora: '2026-11-09T23:15:00Z',
  detalles: [
    {
      producto_id: 10,
      menu_ejecutivo_id: null,
      cantidad: 2,
      precio_unitario: '100.00',
      descuento: '0.00',
      estado_entrega: 'PENDIENTE',
    },
  ],
};

function respuestasDeComanda(ruta: string): Promise<RespuestaApi<unknown>> {
  if (ruta.startsWith('/comandas?')) return Promise.resolve(pagina([{ id: 5 }], 1));
  if (ruta === '/comandas/5') return Promise.resolve({ exito: true, datos: COMANDA });
  if (ruta.startsWith('/productos?'))
    return Promise.resolve(pagina<ItemConNombre>([{ id: 10, nombre: 'Flan' }], 1));
  return Promise.resolve(pagina<ItemConNombre>([], 0));
}

describe('obtenerComandaAbierta', () => {
  it('busca la comanda ABIERTA de la mesa, su detalle y los nombres (productos de todos los estados)', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockImplementation(respuestasDeComanda);

    const respuesta = await obtenerComandaAbierta(2);

    expect(get).toHaveBeenCalledWith('/comandas?mesa_id=2&estado=ABIERTA&limit=1');
    expect(get).toHaveBeenCalledWith('/comandas/5');
    expect(get).toHaveBeenCalledWith('/productos?estado=TODOS&limit=100&offset=0');
    expect(get).toHaveBeenCalledWith('/menus-ejecutivos?limit=100&offset=0');
    expect(respuesta.datos?.lineas).toEqual([
      { cantidad: 2, nombre: 'Flan', importe: 200, entregado: false },
    ]);
  });

  it('sin comanda abierta devuelve datos nulos sin error', async () => {
    vi.spyOn(clienteHttp, 'get').mockResolvedValue(pagina([], 0));

    const respuesta = await obtenerComandaAbierta(2);

    expect(respuesta).toEqual({ exito: true, datos: null });
  });

  it('propaga el error de cualquiera de las consultas', async () => {
    vi.spyOn(clienteHttp, 'get').mockImplementation((ruta: string) =>
      ruta === '/comandas/5'
        ? Promise.resolve({ exito: false, datos: null, error: 'Comanda inexistente' })
        : respuestasDeComanda(ruta),
    );

    const respuesta = await obtenerComandaAbierta(2);

    expect(respuesta).toEqual({ exito: false, datos: null, error: 'Comanda inexistente' });
  });

  it('propaga el error de la búsqueda de la comanda', async () => {
    vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: false, datos: null, error: 'Falla' });

    expect(await obtenerComandaAbierta(2)).toEqual({ exito: false, datos: null, error: 'Falla' });
  });
});

describe('obtenerCliente', () => {
  const clientes = (desde: number, cantidad: number): ClienteApi[] =>
    Array.from({ length: cantidad }, (_, i) => ({
      id: desde + i,
      nombre: `Cliente ${desde + i}`,
      telefono: '2804000000',
    }));

  it('recorre /clientes por páginas hasta encontrar el id', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockImplementation((ruta: string) =>
        Promise.resolve(
          ruta.endsWith('offset=0')
            ? pagina(clientes(1, 100), 150)
            : pagina(clientes(101, 50), 150, 100),
        ),
      );

    const respuesta = await obtenerCliente(120);

    expect(respuesta.datos?.nombre).toBe('Cliente 120');
    expect(get).toHaveBeenCalledWith('/clientes?limit=100&offset=100');
  });

  it('si no está devuelve datos nulos; si falla, el error', async () => {
    vi.spyOn(clienteHttp, 'get').mockResolvedValueOnce(pagina(clientes(1, 2), 2));
    expect(await obtenerCliente(9)).toEqual({ exito: true, datos: null });

    vi.spyOn(clienteHttp, 'get').mockResolvedValueOnce({
      exito: false,
      datos: null,
      error: 'Falla',
    });
    expect(await obtenerCliente(9)).toEqual({ exito: false, datos: null, error: 'Falla' });
  });
});
