import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearReserva, listarReservas } from './api';
import type { ReservaCrear } from './types';

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
});
