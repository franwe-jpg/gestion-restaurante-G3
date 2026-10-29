import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearMenuDelDia,
  crearMenuEjecutivo,
  darDeBajaMenuDelDia,
  darDeBajaMenuEjecutivo,
  listarMenusDelDia,
  listarMenusEjecutivos,
  listarProductosHabilitados,
  listarSeccionesHabilitadas,
  modificarMenuDelDia,
  modificarMenuEjecutivo,
  obtenerMenuDelDia,
  urlDeImagen,
} from './api';
import type { MenuDelDiaCrear, MenuEjecutivoActualizar, MenuEjecutivoCrear } from './types';

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

describe('crearMenuEjecutivo', () => {
  it('envía nombre, precio, productos, sección y descripción por POST', async () => {
    const datos: MenuEjecutivoCrear = {
      nombre: 'Almuerzo ejecutivo',
      precio_fijo: '1500.00',
      producto_ids: [3, 7],
      seccion_id: 2,
      descripcion: 'Incluye bebida',
    };
    const respuesta = { datos: null, exito: true };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

    await crearMenuEjecutivo(datos);

    expect(post).toHaveBeenCalledWith('/menus-ejecutivos', datos);
  });
});

describe('modificarMenuEjecutivo', () => {
  it('envía todos los datos y el estado por PUT', async () => {
    const datos: MenuEjecutivoActualizar = {
      nombre: 'Cena ejecutiva',
      precio_fijo: '2000.00',
      producto_ids: [3],
      seccion_id: 2,
      descripcion: null,
      estado: 'HABILITADO',
    };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue({ datos: null, exito: true });

    await modificarMenuEjecutivo(7, datos);

    expect(put).toHaveBeenCalledWith('/menus-ejecutivos/7', datos);
  });
});

describe('darDeBajaMenuEjecutivo', () => {
  it('solicita la baja sin borrar el registro', async () => {
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: null, exito: true });

    await darDeBajaMenuEjecutivo(7);

    expect(post).toHaveBeenCalledWith('/menus-ejecutivos/7/baja', {});
  });
});

describe('listarMenusEjecutivos', () => {
  it('aplica el filtro de estado y la paginación', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await listarMenusEjecutivos('HABILITADO', 10, 20);

    expect(get).toHaveBeenCalledWith('/menus-ejecutivos?estado=HABILITADO&limit=10&offset=20');
  });

  it('omite estado cuando el filtro es TODOS', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await listarMenusEjecutivos('TODOS', 50, 0);

    expect(get).toHaveBeenCalledWith('/menus-ejecutivos?limit=50&offset=0');
  });
});

describe('listarProductosHabilitados', () => {
  it('consulta productos habilitados y oculta MENU_DEL_DIA del selector', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({
      datos: {
        items: [
          { id: 1, nombre: 'Plato', categoria: 'PLATO', estado: 'HABILITADO' },
          { id: 2, nombre: 'Menú del día', categoria: 'MENU_DEL_DIA', estado: 'HABILITADO' },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      },
      exito: true,
    });

    const respuesta = await listarProductosHabilitados();

    expect(get).toHaveBeenCalledWith('/productos?estado=HABILITADO&limit=100&offset=0');
    expect(respuesta.datos?.map(({ id }) => id)).toEqual([1]);
  });
});

describe('listarSeccionesHabilitadas', () => {
  it('consulta secciones habilitadas paginadas', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({
      datos: {
        items: [{ id: 2, nombre: 'Principal', estado: 'HABILITADO' }],
        total: 1,
        limit: 100,
        offset: 0,
      },
      exito: true,
    });

    const respuesta = await listarSeccionesHabilitadas();

    expect(get).toHaveBeenCalledWith('/secciones?estado=HABILITADO&limit=100&offset=0');
    expect(respuesta.datos?.items[0]?.id).toBe(2);
  });
});
