import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearMenuEjecutivo,
  darDeBajaMenuEjecutivo,
  listarMenusEjecutivos,
  listarProductosHabilitados,
  listarSeccionesHabilitadas,
  modificarMenuEjecutivo,
} from './api';
import type { MenuEjecutivoActualizar, MenuEjecutivoCrear } from './types';

afterEach(() => vi.restoreAllMocks());

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
    expect(respuesta.datos?.[0]?.id).toBe(2);
  });
});
