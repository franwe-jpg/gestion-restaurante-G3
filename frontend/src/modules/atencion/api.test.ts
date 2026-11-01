import { afterEach, describe, expect, it, vi } from 'vitest';
import { clienteHttp } from '../../shared/api/client';
import * as api from './api';

afterEach(() => vi.restoreAllMocks());

it('lista usando filtros, estados S2-01 y paginación en /comandas', async () => {
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: true, datos: null });
  await api.listarComandas({ mesa_id: 7, estado: 'ABIERTA', offset: 50, limit: 50 });
  expect(get).toHaveBeenCalledWith('/comandas?limit=50&offset=50&mesa_id=7&estado=ABIERTA');
});

it('consulta los pendientes antes de confirmar y cierra por una acción separada', async () => {
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ exito: true, datos: null });
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ exito: true, datos: null });
  await api.consultarPendientes(3);
  await api.cerrarComanda(3);
  expect(get).toHaveBeenCalledWith('/comandas/3/pendientes');
  expect(post).toHaveBeenCalledWith('/comandas/3/cerrar', {});
});

it('crea usando el cuerpo de entrada S2-01 sin importes ni fecha arbitrarios', async () => {
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ exito: true, datos: null });
  const datos = {
    mesa_id: 7,
    detalles: [{ producto_id: 12, menu_ejecutivo_id: null, cantidad: 2 }],
    observaciones: null,
  };
  await api.crearComanda(datos);
  expect(post).toHaveBeenCalledWith('/comandas', datos);
});

describe('API de clientes', () => {
  it('consulta la primera página sin filtro', async () => {
    const respuesta = { exito: true, datos: { items: [], total: 0, limit: 50, offset: 0 } };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);
    expect(await api.listarClientes('', 50, 0)).toBe(respuesta);
    expect(get).toHaveBeenCalledWith('/clientes?limit=50&offset=0');
  });

  it('codifica el filtro y solicita el desplazamiento indicado', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ exito: false, datos: null, error: 'Sin conexión' });
    expect(await api.listarClientes('+54 123', 10, 20)).toEqual({
      exito: false,
      datos: null,
      error: 'Sin conexión',
    });
    expect(get).toHaveBeenCalledWith('/clientes?q=%2B54+123&limit=10&offset=20');
  });

  it('envía ambos campos por PUT y conserva el error del servidor', async () => {
    const put = vi
      .spyOn(clienteHttp, 'put')
      .mockResolvedValue({ exito: false, datos: null, error: 'nombre inválido' });
    const datos = { nombre: 'Ana', telefono: '+54 123' };
    expect(await api.modificarCliente(7, datos)).toEqual({
      exito: false,
      datos: null,
      error: 'nombre inválido',
    });
    expect(put).toHaveBeenCalledWith('/clientes/7', datos);
  });
});
