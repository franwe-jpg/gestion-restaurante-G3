import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearMenuDelDia,
  darDeBajaMenuDelDia,
  listarMenusDelDia,
  listarSeccionesHabilitadas,
  modificarMenuDelDia,
  obtenerMenuDelDia,
  urlDeImagen,
} from './api';
import type { MenuDelDiaCrear } from './types';

afterEach(() => {
  vi.restoreAllMocks();
});

const DATOS: MenuDelDiaCrear = {
  nombre: 'Guiso de lentejas',
  seccion_id: 1,
  precio: '9900.00',
  ingredientes: ['Lentejas'],
  descripcion: null,
  etiquetas: [],
};

describe('api de menús del día', () => {
  it('lista con estado, límite y desplazamiento', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await listarMenusDelDia('DESHABILITADO', 10, 20);

    expect(get).toHaveBeenCalledWith('/menus-del-dia?estado=DESHABILITADO&limit=10&offset=20');
  });

  it('consulta un menú por id', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await obtenerMenuDelDia(7);

    expect(get).toHaveBeenCalledWith('/menus-del-dia/7');
  });

  it('crea con un formulario multipart y sin Content-Type manual', async () => {
    const post = vi
      .spyOn(clienteHttp, 'postFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await crearMenuDelDia(DATOS, null);

    const [ruta, formulario] = post.mock.calls[0] ?? [];
    expect(ruta).toBe('/menus-del-dia');
    expect(JSON.parse(String(formulario?.get('datos')))).toEqual(DATOS);
    expect(formulario?.get('imagen')).toBeNull();
  });

  it('adjunta la imagen cuando se elige un archivo', async () => {
    const post = vi
      .spyOn(clienteHttp, 'postFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });
    const archivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

    await crearMenuDelDia(DATOS, archivo);

    const [, formulario] = post.mock.calls[0] ?? [];
    expect(formulario?.get('imagen')).toBe(archivo);
  });

  it('modifica con PUT multipart', async () => {
    const put = vi
      .spyOn(clienteHttp, 'putFormulario')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await modificarMenuDelDia(3, { ...DATOS, estado: 'HABILITADO' }, null);

    const [ruta, formulario] = put.mock.calls[0] ?? [];
    expect(ruta).toBe('/menus-del-dia/3');
    expect(JSON.parse(String(formulario?.get('datos'))).estado).toBe('HABILITADO');
  });
});

describe('api de menús del día: baja y auxiliares', () => {
  it('da de baja con POST sobre el subrecurso', async () => {
    const post = vi
      .spyOn(clienteHttp, 'post')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await darDeBajaMenuDelDia(5);

    expect(post).toHaveBeenCalledWith('/menus-del-dia/5/baja', {});
  });

  it('pide solo las secciones habilitadas', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: null, exito: false, error: 'x' });

    await listarSeccionesHabilitadas();

    expect(get.mock.calls[0]?.[0]).toContain('/secciones?estado=HABILITADO');
  });

  it('convierte la ruta de la imagen en absoluta y conserva el null', () => {
    expect(urlDeImagen('/media/foto.jpg')).toMatch(/\/media\/foto\.jpg$/);
    expect(urlDeImagen(null)).toBeNull();
  });
});
