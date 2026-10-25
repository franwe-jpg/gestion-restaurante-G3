import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearPlato,
  crearSeccion,
  listarProductosHabilitados,
  listarSecciones,
  listarSeccionesHabilitadas,
} from './api';
import type { PlatoCrear, SeccionCrear } from './types';

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

  it('lista solo las secciones habilitadas con el limite maximo', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await listarSeccionesHabilitadas();

    expect(get).toHaveBeenCalledWith('/secciones?estado=HABILITADO&limit=100&offset=0');
  });
});

describe('crearPlato', () => {
  const DATOS: PlatoCrear = {
    nombre: 'Milanesa',
    seccion_id: 3,
    precio: '12500.50',
    ingredientes: ['Carne'],
    descripcion: null,
    etiquetas: ['Casero'],
  };

  it('envia una sola solicitud multipart con `datos` como JSON y la imagen', async () => {
    const post = vi
      .spyOn(clienteHttp, 'postFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });
    const imagen = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

    await crearPlato(DATOS, imagen);

    expect(post).toHaveBeenCalledTimes(1);
    const [ruta, formulario] = post.mock.calls[0] ?? [];
    expect(ruta).toBe('/platos');
    expect(JSON.parse(String(formulario?.get('datos')))).toEqual(DATOS);
    expect(formulario?.get('imagen')).toBe(imagen);
  });

  it('no agrega la parte `imagen` si no se eligio ninguna', async () => {
    const post = vi
      .spyOn(clienteHttp, 'postFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await crearPlato(DATOS, null);

    const [, formulario] = post.mock.calls[0] ?? [];
    expect(formulario?.has('imagen')).toBe(false);
    expect(JSON.parse(String(formulario?.get('datos')))).toEqual(DATOS);
  });
});
