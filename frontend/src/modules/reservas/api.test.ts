import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  buscarClientes,
  cancelarReservaAnticipada,
  cancelarReservaPorAusencia,
  crearComandaDesdeReserva,
  crearReserva,
  listarMesasDisponibles,
  listarReservas,
  modificarReserva,
} from './api';
import type {
  ComandaCreada,
  ComandaDesdeReservaCrear,
  MesaDisponible,
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
  const DATOS: ComandaDesdeReservaCrear = { detalles: [{ producto_id: 12, cantidad: 2 }] };

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
