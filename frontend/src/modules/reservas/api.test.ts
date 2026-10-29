import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearReserva, listarReservas, modificarReserva } from './api';
import type { ReservaCrear, ReservaModificar } from './types';

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
