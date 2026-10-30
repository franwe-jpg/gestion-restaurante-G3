import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearReserva, listarMesasDisponibles, listarReservas, modificarReserva } from './api';
import type { Reserva, ReservaCrear, ReservaModificar } from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

const RESERVA: Reserva = {
  id: 1,
  cliente_nombre: 'Ana Pérez',
  cliente_telefono: '2804000000',
  fecha: '2026-12-01',
  hora: '21:00:00',
  cantidad_personas: 4,
  mesa: { id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' },
  estado: 'ACTIVA',
};

describe('crearReserva', () => {
  it('envía el alta por POST a /reservas y devuelve la reserva creada (CA 1)', async () => {
    const datos: ReservaCrear = {
      cliente_nombre: 'Ana Pérez',
      cliente_telefono: '2804000000',
      fecha: '2026-12-01',
      hora: '21:00',
      cantidad_personas: 4,
      mesa_id: 2,
    };
    const respuesta = { datos: RESERVA, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    const resultado = await crearReserva(datos);

    expect(post).toHaveBeenCalledWith('/reservas', datos);
    expect(resultado).toBe(respuesta);
  });
});

describe('modificarReserva', () => {
  it('envía el cambio por PUT a /reservas/{id} (CA de HU-M5-02)', async () => {
    const datos: ReservaModificar = { fecha: '2026-12-02', hora: '22:00', cantidad_personas: 6 };
    const respuesta = { datos: { ...RESERVA, ...datos, hora: '22:00:00' }, exito: true };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);

    const resultado = await modificarReserva(1, datos);

    expect(put).toHaveBeenCalledWith('/reservas/1', datos);
    expect(resultado).toBe(respuesta);
  });
});

describe('listarReservas', () => {
  it('pide las reservas de un día, paginadas (HU-M5-03)', async () => {
    const respuesta = { datos: { items: [RESERVA], total: 1, limit: 50, offset: 0 }, exito: true };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarReservas('2026-12-01', 50, 0);

    expect(get).toHaveBeenCalledWith('/reservas?fecha=2026-12-01&limit=50&offset=0');
    expect(resultado).toBe(respuesta);
  });
});

describe('listarMesasDisponibles', () => {
  it('pide las mesas disponibles para una fecha y hora (selector del alta)', async () => {
    const mesas = [{ id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' }];
    const respuesta = { datos: mesas, exito: true };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarMesasDisponibles('2026-12-01', '21:00');

    expect(get).toHaveBeenCalledWith('/reservas/mesas-disponibles?fecha=2026-12-01&hora=21:00');
    expect(resultado).toBe(respuesta);
  });
});
