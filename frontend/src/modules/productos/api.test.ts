import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import { crearSeccion, listarProductosHabilitados, listarSecciones } from './api';
import type { SeccionCrear } from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api de productos', () => {
  it('lista las secciones con limit y offset', async () => {
    const respuesta = { datos: { items: [], total: 0, limit: 10, offset: 20 }, exito: true };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

    const resultado = await listarSecciones(10, 20);

    expect(get).toHaveBeenCalledWith('/secciones?limit=10&offset=20');
    expect(resultado).toBe(respuesta);
  });

  it('lista los productos habilitados con el limite maximo', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await listarProductosHabilitados();

    expect(get).toHaveBeenCalledWith('/productos?limit=100&offset=0');
  });

  it('crea una seccion enviando el cuerpo completo', async () => {
    const datos: SeccionCrear = {
      nombre: 'Postres',
      orden: 2,
      producto_ids: [4],
      confirmar_traslado: true,
    };
    const post = vi
      .spyOn(clienteHttp, 'post')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await crearSeccion(datos);

    expect(post).toHaveBeenCalledWith('/secciones', datos);
  });
});
