import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearReserva } from './api';
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
});
