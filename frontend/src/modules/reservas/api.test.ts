import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  buscarClientes,
  cancelarReservaAnticipada,
  cancelarReservaPorAusencia,
  crearComandaDesdeReserva,
  crearReserva,
  descargarReporteReservasAusentismoPdf,
  listarMesasDisponibles,
  listarMozosHabilitados,
  listarProductosHabilitados,
  listarReservas,
  modificarReserva,
  obtenerReporteReservasAusentismo,
} from './api';
import type {
  ComandaCreada,
  ComandaDesdeReservaCrear,
  MesaDisponible,
  MozoSeleccionable,
  ProductoHabilitado,
  Reserva,
  ReservaCrear,
  ReservaModificar,
} from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api de reservas', () => {
  it('crea una reserva con POST /reservas y devuelve la respuesta', async () => {
    const datos: ReservaCrear = {
      mesa_id: 5,
      cliente_id: 7,
      fecha: '2026-11-02',
      hora: '21:30',
      cantidad_personas: 4,
    };
    const respuesta = { datos: { id: 1, estado: 'ACTIVA' as const, ...datos }, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearReserva(datos);

    expect(post).toHaveBeenCalledWith('/reservas', datos);
    expect(resultado).toBe(respuesta);
  });

  it.each([
    ['ACTIVA', 50, 0, '/reservas?fecha=2026-11-02&estado=ACTIVA&limit=50&offset=0'],
    ['TODAS', 50, 0, '/reservas?fecha=2026-11-02&limit=50&offset=0'],
    ['ATENDIDA', 50, 50, '/reservas?fecha=2026-11-02&estado=ATENDIDA&limit=50&offset=50'],
  ] as const)('lista las reservas del día con estado %s', async (estado, limit, offset, ruta) => {
    const respuesta = { datos: { items: [], total: 0, limit, offset }, exito: true };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarReservas('2026-11-02', estado, limit, offset);

    expect(get).toHaveBeenCalledWith(ruta);
    expect(resultado).toBe(respuesta);
  });

  it('modifica una reserva con PUT /reservas/{id} y solo fecha, hora y cantidad', async () => {
    const datos: ReservaModificar = { fecha: '2026-11-03', hora: '22:00', cantidad_personas: 6 };
    const respuesta = {
      datos: { id: 7, mesa_id: 5, cliente_id: 7, estado: 'ACTIVA' as const, ...datos },
      exito: true,
    };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);

    const resultado = await modificarReserva(7, datos);

    expect(put).toHaveBeenCalledWith('/reservas/7', {
      fecha: '2026-11-03',
      hora: '22:00',
      cantidad_personas: 6,
    });
    expect(resultado).toBe(respuesta);
  });
});

describe('api de reservas: cancelaciones (HU-M5-04-05)', () => {
  const RESERVA_CANCELADA: Reserva = {
    id: 1,
    mesa_id: 5,
    cliente_id: 7,
    fecha: '2026-11-02',
    hora: '21:30',
    cantidad_personas: 4,
    estado: 'CANCELADA_ANTICIPADA',
  };

  it('cancela una reserva anticipadamente con POST /reservas/{id}/cancelar-anticipada sin cuerpo', async () => {
    const respuesta = { datos: RESERVA_CANCELADA, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await cancelarReservaAnticipada(1);

    expect(post).toHaveBeenCalledWith('/reservas/1/cancelar-anticipada', {});
    expect(resultado).toBe(respuesta);
  });

  it('cancela una reserva por ausencia con POST /reservas/{id}/cancelar-por-ausencia sin cuerpo', async () => {
    const respuesta = {
      datos: { ...RESERVA_CANCELADA, id: 2, estado: 'CANCELADA_POR_AUSENCIA' as const },
      exito: true,
    };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await cancelarReservaPorAusencia(2);

    expect(post).toHaveBeenCalledWith('/reservas/2/cancelar-por-ausencia', {});
    expect(resultado).toBe(respuesta);
  });
});

describe('api de reservas: comanda desde una reserva (HU-M5-06)', () => {
  const DATOS: ComandaDesdeReservaCrear = {
    mozo_id: 31,
    detalles: [{ producto_id: 12, cantidad: 2 }],
  };

  it('crea la comanda con POST /reservas/{id}/comanda y devuelve la comanda como éxito', async () => {
    const comanda: ComandaCreada = { id: 31, mesa_id: 5, reserva_id: 10, estado: 'ABIERTA' };
    const respuesta = { datos: comanda, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearComandaDesdeReserva(10, DATOS);

    expect(post).toHaveBeenCalledExactlyOnceWith('/reservas/10/comanda', DATOS);
    expect(resultado).toBe(respuesta);
  });

  it('devuelve el error con el detalle del servidor sin cambiarlo', async () => {
    const respuesta = {
      datos: null,
      exito: false,
      error: 'La reserva 10 ya fue atendida',
    };
    vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearComandaDesdeReserva(10, DATOS);

    expect(resultado).toEqual({
      datos: null,
      exito: false,
      error: 'La reserva 10 ya fue atendida',
    });
  });
});

describe('api de reservas: selección de mozos habilitados para abrir una comanda', () => {
  it('lee y agrega todas las páginas de mozos habilitados de M3', async () => {
    const mozo: MozoSeleccionable = {
      id: 31,
      nombre: 'Lucía',
      apellido: 'Paz',
      estado: 'HABILITADO',
    };
    const otraPagina: MozoSeleccionable = {
      id: 32,
      nombre: 'Ana',
      apellido: 'Sosa',
      estado: 'HABILITADO',
    };
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValueOnce({
        exito: true,
        datos: { items: [mozo], total: 2, limit: 1, offset: 0 },
      })
      .mockResolvedValueOnce({
        exito: true,
        datos: { items: [otraPagina], total: 2, limit: 1, offset: 1 },
      });

    const resultado = await listarMozosHabilitados();

    expect(get).toHaveBeenNthCalledWith(1, '/mozos?estado=HABILITADO&limit=100&offset=0');
    expect(get).toHaveBeenNthCalledWith(2, '/mozos?estado=HABILITADO&limit=100&offset=1');
    expect(resultado).toEqual({ exito: true, datos: [mozo, otraPagina] });
  });
});

describe('api de reservas: mesas disponibles', () => {
  it('pide las mesas disponibles con GET /reservas/mesas-disponibles y devuelve la respuesta', async () => {
    const mesas: MesaDisponible[] = [
      { id: 5, numero: 5, capacidad: 4, sector: { id: 1, nombre: 'Salón' } },
    ];
    const respuesta = { datos: mesas, exito: true };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarMesasDisponibles('2026-11-02', '21:30');

    expect(get).toHaveBeenCalledTimes(1);
    // `URLSearchParams` escribe «:» como «%3A»: se compara el pedido ya decodificado.
    const pedido = new URL(String(get.mock.calls[0]?.[0]), 'http://localhost');
    expect(pedido.pathname).toBe('/reservas/mesas-disponibles');
    expect(Object.fromEntries(pedido.searchParams)).toEqual({
      fecha: '2026-11-02',
      hora: '21:30',
    });
    expect(resultado).toBe(respuesta);
  });
});

describe('api de reservas: cliente de la reserva', () => {
  it('crea una reserva con cliente nuevo y envía cliente_nuevo sin cliente_id', async () => {
    const datos: ReservaCrear = {
      mesa_id: 5,
      cliente_nuevo: { nombre: 'Luis Gómez', telefono: '280-4556677' },
      fecha: '2026-11-02',
      hora: '21:30',
      cantidad_personas: 4,
    };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: null, exito: true });

    await crearReserva(datos);

    const enviado = post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(enviado).toHaveProperty('cliente_nuevo', datos.cliente_nuevo);
    expect(enviado).not.toHaveProperty('cliente_id');
  });

  it('crea una reserva con cliente existente y envía cliente_id sin cliente_nuevo', async () => {
    const datos: ReservaCrear = {
      mesa_id: 5,
      cliente_id: 7,
      fecha: '2026-11-02',
      hora: '21:30',
      cantidad_personas: 4,
    };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: null, exito: true });

    await crearReserva(datos);

    const enviado = post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(enviado).toHaveProperty('cliente_id', 7);
    expect(enviado).not.toHaveProperty('cliente_nuevo');
  });

  it('busca clientes con GET /clientes?q=&limit=10&offset=0 y devuelve la página', async () => {
    const respuesta = { datos: { items: [], total: 0, limit: 10, offset: 0 }, exito: true };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await buscarClientes('Ana');

    expect(get).toHaveBeenCalledWith('/clientes?q=Ana&limit=10&offset=0');
    expect(resultado).toBe(respuesta);
  });

  it('codifica el texto de la búsqueda con espacios y &', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await buscarClientes('Ana & Luis');

    expect(get).toHaveBeenCalledWith('/clientes?q=Ana+%26+Luis&limit=10&offset=0');
  });
});

describe('api de reservas: reporte de reservas y ausentismo (HU-M5-07)', () => {
  it('pide el reporte con GET /reportes/reservas-ausentismo y el período en el query', async () => {
    const respuesta = {
      datos: {
        fecha_desde: '2026-10-01',
        fecha_hasta: '2026-10-31',
        total_reservas: 6,
        atendidas: 1,
        canceladas_anticipada: 2,
        canceladas_por_ausencia: 1,
        porcentaje_ausentismo: '16.67',
      },
      exito: true,
    };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await obtenerReporteReservasAusentismo('2026-10-01', '2026-10-31');

    expect(get).toHaveBeenCalledWith(
      '/reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31',
    );
    expect(resultado).toBe(respuesta);
  });

  it('descarga el PDF con GET /reportes/reservas-ausentismo/pdf y el período en el query', async () => {
    const blob = new Blob(['%PDF']);
    const respuesta = { datos: blob, exito: true };
    const obtenerArchivo = vi.spyOn(clienteHttp, 'obtenerArchivo').mockResolvedValue(respuesta);

    const resultado = await descargarReporteReservasAusentismoPdf('2026-10-01', '2026-10-31');

    expect(obtenerArchivo).toHaveBeenCalledWith(
      '/reportes/reservas-ausentismo/pdf?fecha_desde=2026-10-01&fecha_hasta=2026-10-31',
    );
    expect(resultado).toBe(respuesta);
  });
});

function producto(id: number, nombre = `Producto ${id}`, precio = '100.00'): ProductoHabilitado {
  return { id, nombre, precio };
}

/** Sirve el catálogo por páginas según el `limit` y el `offset` de cada pedido. */
function servirCatalogo(catalogo: ProductoHabilitado[]) {
  return vi.spyOn(clienteHttp, 'get').mockImplementation((ruta) => {
    const consulta = new URL(ruta, 'http://localhost').searchParams;
    const limit = Number(consulta.get('limit'));
    const offset = Number(consulta.get('offset'));
    const items = catalogo.slice(offset, offset + limit);
    return Promise.resolve({
      datos: { items, total: catalogo.length, limit, offset },
      exito: true,
    });
  });
}

/** Ruta y parámetros de cada pedido que llegó al cliente HTTP, decodificados. */
function pedidosRealizados(get: ReturnType<typeof servirCatalogo>): Record<string, string>[] {
  return get.mock.calls.map(([ruta]) => {
    const url = new URL(String(ruta), 'http://localhost');
    return { ruta: url.pathname, ...Object.fromEntries(url.searchParams) };
  });
}

describe('api de reservas: productos habilitados (HU-M5-06)', () => {
  it('pide GET /productos con estado HABILITADO, limit 100 y offset 0, y devuelve id, nombre y precio', async () => {
    const get = servirCatalogo([producto(12, 'Milanesa', '1500.50')]);

    const resultado = await listarProductosHabilitados();

    expect(pedidosRealizados(get)).toEqual([
      { ruta: '/productos', estado: 'HABILITADO', limit: '100', offset: '0' },
    ]);
    expect(resultado).toEqual({
      datos: [{ id: 12, nombre: 'Milanesa', precio: '1500.50' }],
      exito: true,
    });
  });

  it('sin productos habilitados hace un solo pedido y devuelve una lista vacía', async () => {
    const get = servirCatalogo([]);

    const resultado = await listarProductosHabilitados();

    expect(get).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ datos: [], exito: true });
  });

  it('descarta los campos que la pantalla no usa', async () => {
    const conExtras = { ...producto(12, 'Milanesa'), categoria: 'PLATO', etiquetas: [] };
    servirCatalogo([conExtras]);

    const resultado = await listarProductosHabilitados();

    expect(resultado.datos).toEqual([{ id: 12, nombre: 'Milanesa', precio: '100.00' }]);
  });
});

describe('api de reservas: productos habilitados en varias páginas (HU-M5-06)', () => {
  const CATALOGO = Array.from({ length: 250 }, (_, i) => producto(i + 1));

  it('lee todas las páginas hasta cubrir el total, avanzando el offset de 100 en 100', async () => {
    const get = servirCatalogo(CATALOGO);

    const resultado = await listarProductosHabilitados();

    expect(pedidosRealizados(get).map((pedido) => pedido.offset)).toEqual(['0', '100', '200']);
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).toHaveLength(250);
  });

  it('con exactamente 100 productos hace un solo pedido', async () => {
    const get = servirCatalogo(CATALOGO.slice(0, 100));

    const resultado = await listarProductosHabilitados();

    expect(get).toHaveBeenCalledTimes(1);
    expect(resultado.datos).toHaveLength(100);
  });

  it('con 101 productos pide una segunda página y trae el último', async () => {
    const get = servirCatalogo(CATALOGO.slice(0, 101));

    const resultado = await listarProductosHabilitados();

    expect(get).toHaveBeenCalledTimes(2);
    expect(resultado.datos).toHaveLength(101);
  });
});

describe('api de reservas: productos habilitados, orden y repetidos (HU-M5-06)', () => {
  it('los ordena por nombre con el criterio del español, sin importar el orden de la API', async () => {
    servirCatalogo([
      producto(1, 'Zapallo'),
      producto(2, 'Ñoquis'),
      producto(3, 'Ensalada'),
      producto(4, 'Ají'),
    ]);

    const resultado = await listarProductosHabilitados();

    expect(resultado.datos?.map(({ nombre }) => nombre)).toEqual([
      'Ají',
      'Ensalada',
      'Ñoquis',
      'Zapallo',
    ]);
  });

  it('ordena todo el catálogo junto, no página por página', async () => {
    const catalogo = Array.from({ length: 150 }, (_, i) => producto(i + 1, `Plato ${150 - i}`));
    servirCatalogo(catalogo);

    const resultado = await listarProductosHabilitados();

    expect(resultado.datos?.[0]?.nombre).toBe('Plato 1');
    expect(resultado.datos?.at(-1)?.nombre).toBe('Plato 99');
  });

  it('un producto que aparece en dos páginas porque el catálogo cambió se ofrece una sola vez', async () => {
    const repetido = producto(100, 'Repetido');
    const primera = Array.from({ length: 99 }, (_, i) => producto(i + 1)).concat(repetido);
    vi.spyOn(clienteHttp, 'get').mockImplementation((ruta) => {
      const offset = Number(new URL(ruta, 'http://localhost').searchParams.get('offset'));
      const items = offset === 0 ? primera : [repetido, producto(101)];
      return Promise.resolve({ datos: { items, total: 102, limit: 100, offset }, exito: true });
    });

    const resultado = await listarProductosHabilitados();

    const ids = resultado.datos?.map(({ id }) => id);
    expect(ids).toHaveLength(101);
    expect(new Set(ids).size).toBe(101);
  });
});

describe('api de reservas: productos habilitados, cortes y errores (HU-M5-06)', () => {
  it('una página vacía antes de completar el total corta la lectura y devuelve lo leído', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockImplementation((ruta) => {
      const offset = Number(new URL(ruta, 'http://localhost').searchParams.get('offset'));
      const items = offset === 0 ? Array.from({ length: 100 }, (_, i) => producto(i + 1)) : [];
      return Promise.resolve({ datos: { items, total: 250, limit: 100, offset }, exito: true });
    });

    const resultado = await listarProductosHabilitados();

    expect(get).toHaveBeenCalledTimes(2);
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).toHaveLength(100);
  });

  it('un error en la primera página se devuelve con su detalle y no pide más', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'Error de conexión' });

    const resultado = await listarProductosHabilitados();

    expect(get).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ datos: null, exito: false, error: 'Error de conexión' });
  });

  it('un error en una página posterior descarta lo leído y devuelve el error', async () => {
    const primera = {
      datos: {
        items: Array.from({ length: 100 }, (_, i) => producto(i + 1)),
        total: 150,
        limit: 100,
        offset: 0,
      },
      exito: true,
    };
    vi.spyOn(clienteHttp, 'get')
      .mockResolvedValueOnce(primera)
      .mockResolvedValueOnce({ datos: null, exito: false, error: 'Falló la segunda página' });

    const resultado = await listarProductosHabilitados();

    expect(resultado).toEqual({ datos: null, exito: false, error: 'Falló la segunda página' });
  });
});
