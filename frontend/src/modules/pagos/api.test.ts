import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearMedioPago, eliminarMedioPago, listarMediosPago, modificarMedioPago } from './api';
import type { MedioPago, MedioPagoCrear, MedioPagoModificar } from './types';

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api de medios de pago', () => {
  it('crea por POST a /medios-de-pago sin enviar el estado (HU-M6-04)', async () => {
    const datos: MedioPagoCrear = { nombre: 'Efectivo', tipo: 'EFECTIVO', descripcion: null };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: EFECTIVO, exito: true });

    const respuesta = await crearMedioPago(datos);

    expect(post).toHaveBeenCalledWith('/medios-de-pago', datos);
    expect(respuesta.datos).toEqual(EFECTIVO);
  });

  it('modifica por PUT con el estado (HU-M6-05)', async () => {
    const datos: MedioPagoModificar = {
      nombre: 'Efectivo',
      tipo: 'EFECTIVO',
      descripcion: null,
      estado: 'DESHABILITADO',
    };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue({ datos: EFECTIVO, exito: true });

    await modificarMedioPago(1, datos);

    expect(put).toHaveBeenCalledWith('/medios-de-pago/1', datos);
  });

  it('elimina por DELETE (HU-M6-06)', async () => {
    const borrar = vi.spyOn(clienteHttp, 'delete').mockResolvedValue({ datos: null, exito: true });

    await eliminarMedioPago(3);

    expect(borrar).toHaveBeenCalledWith('/medios-de-pago/3');
  });

  it('lista solo habilitados por defecto y suma deshabilitados a pedido (HU-M6-07)', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: { items: [], total: 0, limit: 50, offset: 0 }, exito: true });

    await listarMediosPago(50, 0, false);
    await listarMediosPago(50, 50, true);

    expect(get).toHaveBeenNthCalledWith(1, '/medios-de-pago?limit=50&offset=0');
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/medios-de-pago?limit=50&offset=50&incluir_deshabilitados=true',
    );
  });
});
