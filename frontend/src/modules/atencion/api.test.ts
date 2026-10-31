import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';
import { listarClientes, modificarCliente } from './api';

afterEach(() => vi.restoreAllMocks());

describe('API de clientes', () => {
  it('consulta la primera página sin filtro', async () => {
    const respuesta = { exito: true, datos: { items: [], total: 0, limit: 50, offset: 0 } };
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);
    expect(await listarClientes('', 50, 0)).toBe(respuesta);
    expect(get).toHaveBeenCalledWith('/clientes?limit=50&offset=0');
  });

  it('codifica el filtro y solicita el desplazamiento indicado', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ exito: false, datos: null, error: 'Sin conexión' });
    expect(await listarClientes('+54 123', 10, 20)).toEqual({
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
    expect(await modificarCliente(7, datos)).toEqual({
      exito: false,
      datos: null,
      error: 'nombre inválido',
    });
    expect(put).toHaveBeenCalledWith('/clientes/7', datos);
  });
});
