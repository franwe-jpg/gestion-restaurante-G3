import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearProducto,
  crearSeccion,
  darDeBajaProducto,
  listarProductos,
  listarProductosHabilitados,
  listarSecciones,
  listarSeccionesHabilitadas,
  modificarProducto,
  obtenerProducto,
  urlDeImagen,
} from './api';
import type { ProductoCrear, ProductoModificar, SeccionCrear } from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api de productos', () => {
  it.each([
    ['HABILITADO', 50, 0, '/productos?estado=HABILITADO&limit=50&offset=0'],
    ['TODOS', 50, 100, '/productos?estado=TODOS&limit=50&offset=100'],
  ] as const)('lista los productos con estado %s', async (estado, limit, offset, ruta) => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await listarProductos(estado, limit, offset);

    expect(get).toHaveBeenCalledWith(ruta);
  });

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

describe('crearProducto', () => {
  const DATOS: ProductoCrear = {
    nombre: 'Milanesa',
    seccion_id: 3,
    precio: '12500.50',
    ingredientes: ['Carne'],
    descripcion: null,
    etiquetas: ['Casero'],
  };

  it.each([
    ['PLATO', '/platos'],
    ['POSTRE', '/postres'],
  ] as const)(
    'envia una sola solicitud multipart de %s con `datos` como JSON y la imagen',
    async (categoria, endpoint) => {
      const post = vi
        .spyOn(clienteHttp, 'postFormulario')
        .mockResolvedValue({ datos: null, exito: false, error: 'x' });
      const imagen = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

      await crearProducto(categoria, DATOS, imagen);

      expect(post).toHaveBeenCalledTimes(1);
      const [ruta, formulario] = post.mock.calls[0] ?? [];
      expect(ruta).toBe(endpoint);
      expect(JSON.parse(String(formulario?.get('datos')))).toEqual(DATOS);
      expect(formulario?.get('imagen')).toBe(imagen);
    },
  );

  it('no agrega la parte `imagen` si no se eligio ninguna', async () => {
    const post = vi
      .spyOn(clienteHttp, 'postFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await crearProducto('POSTRE', DATOS, null);

    const [, formulario] = post.mock.calls[0] ?? [];
    expect(formulario?.has('imagen')).toBe(false);
    expect(JSON.parse(String(formulario?.get('datos')))).toEqual(DATOS);
  });
});

describe.each([
  ['PLATO', '/platos'],
  ['POSTRE', '/postres'],
] as const)('edición y baja de %s', (categoria, base) => {
  const MODIFICAR: ProductoModificar = {
    nombre: 'Milanesa',
    seccion_id: 3,
    precio: '12500.50',
    ingredientes: ['Carne'],
    descripcion: null,
    etiquetas: [],
    estado: 'HABILITADO',
    quitar_imagen: false,
  };

  it('obtiene el producto por id', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await obtenerProducto(categoria, 7);

    expect(get).toHaveBeenCalledWith(`${base}/7`);
  });

  it('modifica con una sola solicitud multipart PUT con `datos` e `imagen`', async () => {
    const put = vi
      .spyOn(clienteHttp, 'putFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });
    const imagen = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

    await modificarProducto(categoria, 7, MODIFICAR, imagen);

    expect(put).toHaveBeenCalledTimes(1);
    const [ruta, formulario] = put.mock.calls[0] ?? [];
    expect(ruta).toBe(`${base}/7`);
    expect(JSON.parse(String(formulario?.get('datos')))).toEqual(MODIFICAR);
    expect(formulario?.get('imagen')).toBe(imagen);
  });

  it('no agrega la parte `imagen` si no hay archivo nuevo', async () => {
    const put = vi
      .spyOn(clienteHttp, 'putFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await modificarProducto(categoria, 7, MODIFICAR, null);

    const [, formulario] = put.mock.calls[0] ?? [];
    expect(formulario?.has('imagen')).toBe(false);
  });

  it('da de baja con POST a /baja y cuerpo vacío', async () => {
    const post = vi
      .spyOn(clienteHttp, 'post')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await darDeBajaProducto(categoria, 7);

    expect(post).toHaveBeenCalledWith(`${base}/7/baja`, {});
  });
});

describe('urlDeImagen', () => {
  it('convierte la URL relativa de la imagen en absoluta', () => {
    expect(urlDeImagen('/media/a.jpg')).toBe('http://127.0.0.1:8000/media/a.jpg');
    expect(urlDeImagen(null)).toBeNull();
  });
});
