import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EstadoServicio } from '../types';

import { ClienteApi, urlDelBackend } from './client';

function respuestaJson(cuerpo: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(cuerpo),
  } as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('ClienteApi', () => {
  it('consulta /api/v1 a partir de VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ estado: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const respuesta = await new ClienteApi().get<EstadoServicio>('/salud');

    expect(respuesta).toEqual({ datos: { estado: 'ok' }, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/salud', undefined);
  });

  it('usa la URL por defecto si VITE_API_URL esta vacia', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ estado: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await new ClienteApi().get<EstadoServicio>('/salud');

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/salud', undefined);
  });

  it('devuelve el detalle de un error HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(respuestaJson({ detalle: 'La reserva no existe' }, 404, 'Not Found')),
    );

    const respuesta = await new ClienteApi().get('/reservas/1');

    expect(respuesta).toEqual({
      datos: null,
      exito: false,
      error: 'La reserva no existe',
    });
  });

  it('informa el estado HTTP si el error no trae detalle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(null, 500, 'Server Error')));

    const respuesta = await new ClienteApi().get('/salud');

    expect(respuesta).toEqual({
      datos: null,
      exito: false,
      error: 'Error HTTP: 500 Server Error',
    });
  });

  it('devuelve un error controlado si falla la conexion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const respuesta = await new ClienteApi().get('/salud');

    expect(respuesta).toEqual({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
  });

  it('envia JSON en las solicitudes POST', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    const respuesta = await new ClienteApi().post<{ id: number }, { nombre: string }>(
      '/productos',
      {
        nombre: 'Milanesa',
      },
    );

    expect(respuesta).toEqual({ datos: { id: 1 }, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Milanesa' }),
    });
  });

  it('envia un FormData sin Content-Type para que el navegador fije el boundary', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ id: 7 }));
    vi.stubGlobal('fetch', fetchMock);
    const formulario = new FormData();
    formulario.append('datos', '{"nombre":"Milanesa"}');

    const respuesta = await new ClienteApi().postFormulario<{ id: number }>('/platos', formulario);

    expect(respuesta).toEqual({ datos: { id: 7 }, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/platos', {
      method: 'POST',
      body: formulario,
    });
  });

  it('devuelve el detalle del error de un envio de formulario', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respuestaJson({ detalle: 'El plato ya está registrado' }, 409, 'Conflict'),
        ),
    );

    const respuesta = await new ClienteApi().postFormulario('/platos', new FormData());

    expect(respuesta).toEqual({
      datos: null,
      exito: false,
      error: 'El plato ya está registrado',
    });
  });

  it('envia un formulario con PUT y sin Content-Type', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ id: 7 }));
    vi.stubGlobal('fetch', fetchMock);
    const formulario = new FormData();
    formulario.append('datos', '{"nombre":"Milanesa"}');

    const respuesta = await new ClienteApi().putFormulario<{ id: number }>('/platos/7', formulario);

    expect(respuesta).toEqual({ datos: { id: 7 }, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/platos/7', {
      method: 'PUT',
      body: formulario,
    });
  });
});

describe('urlDelBackend', () => {
  it('arma la URL absoluta con la URL base por defecto', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(urlDelBackend('/media/a.jpg')).toBe('http://127.0.0.1:8000/media/a.jpg');
  });

  it('usa VITE_API_URL sin la barra final', () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');
    expect(urlDelBackend('/media/a.jpg')).toBe('http://api.test/media/a.jpg');
  });
});
