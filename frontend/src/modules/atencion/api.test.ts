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

it('anula por POST de acción y conserva la respuesta HTTP', async () => {
  const respuesta = { exito: false, datos: null, error: 'Comanda facturada' };
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);
  expect(await api.anularComanda(3)).toBe(respuesta);
  expect(post).toHaveBeenCalledWith('/comandas/3/anular', {});
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

it('consulta las entregas por GET /comandas/{id}/detalles', async () => {
  const respuesta = { exito: false, datos: null, error: 'La comanda 9 no existe' };
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);
  expect(await api.consultarEntregas(9)).toBe(respuesta);
  expect(get).toHaveBeenCalledWith('/comandas/9/detalles');
});

it('registra la cantidad entregada absoluta por PUT .../entrega', async () => {
  const respuesta = { exito: true, datos: { comanda_id: 3, estado: 'ABIERTA', detalles: [] } };
  const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue(respuesta);
  expect(await api.registrarEntrega(3, 81, 4)).toBe(respuesta);
  expect(put).toHaveBeenCalledWith('/comandas/3/detalles/81/entrega', { cantidad_entregada: 4 });
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
