import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EstadoServicio } from '../types';

import { guardarToken, leerToken } from '../auth/almacenSesion';

import { ClienteApi, registrarSesionVencida, urlDelBackend } from './client';

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
  sessionStorage.clear();
  registrarSesionVencida(null);
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

  it('no clasifica una respuesta exitosa con JSON inválido como fallo de conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('invalid json')),
      }),
    );

    const respuesta = await new ClienteApi().get('/clientes');

    expect(respuesta).toEqual({
      datos: null,
      exito: false,
      error: 'La respuesta del backend no es válida',
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

  it('envia JSON en las solicitudes PUT', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ id: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    const respuesta = await new ClienteApi().put<{ id: number }, { nombre: string }>(
      '/secciones/3',
      { nombre: 'Postres' },
    );

    expect(respuesta).toEqual({ datos: { id: 3 }, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/secciones/3', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Postres' }),
    });
  });

  it('propaga el detalle del error de una solicitud PUT', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(respuestaJson({ detalle: 'La sección ya existe' }, 409, 'Conflict')),
    );

    const respuesta = await new ClienteApi().put('/secciones/3', { nombre: 'Postres' });

    expect(respuesta).toEqual({ datos: null, exito: false, error: 'La sección ya existe' });
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

  it('envia un DELETE y trata el 204 como éxito sin cuerpo', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson(null, 204, 'No Content'));
    vi.stubGlobal('fetch', fetchMock);

    const respuesta = await new ClienteApi().delete('/mesas/3');

    expect(respuesta).toEqual({ datos: null, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/mesas/3', {
      method: 'DELETE',
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

describe('ClienteApi.obtenerArchivo', () => {
  it('devuelve el Blob de la respuesta', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      blob: () => Promise.resolve(blob),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const respuesta = await new ClienteApi('http://api.test').obtenerArchivo('/x/pdf?a=1');

    expect(respuesta).toEqual({ datos: blob, exito: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/x/pdf?a=1', undefined);
  });

  it('lee el detalle de un 422', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuestaJson({ detalle: 'Falta la fecha desde.' }, 422, 'x')),
    );

    const respuesta = await new ClienteApi('http://api.test').obtenerArchivo('/x/pdf');

    expect(respuesta).toEqual({ datos: null, exito: false, error: 'Falta la fecha desde.' });
  });

  it('informa el error de conexion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('caido')));

    const respuesta = await new ClienteApi('http://api.test').obtenerArchivo('/x/pdf');

    expect(respuesta.error).toBe('No se pudo conectar con el backend');
  });
});

describe('ClienteApi con sesion', () => {
  it('sin token no agrega el encabezado Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ estado: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await new ClienteApi('http://api.test').get('/salud');

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/salud', undefined);
  });

  it('con token envia Authorization Bearer en GET', async () => {
    guardarToken('tok-1');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ estado: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await new ClienteApi('http://api.test').get('/salud');

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/salud', {
      headers: { Authorization: 'Bearer tok-1' },
    });
  });

  it('con token conserva el Content-Type en POST y suma Authorization', async () => {
    guardarToken('tok-1');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await new ClienteApi('http://api.test').post('/mozos', { dni: '1' });

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/mozos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-1' },
      body: JSON.stringify({ dni: '1' }),
    });
  });

  it('con token envia Authorization en un formulario sin fijar Content-Type', async () => {
    guardarToken('tok-1');
    const fetchMock = vi.fn().mockResolvedValue(respuestaJson({ id: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const formulario = new FormData();

    await new ClienteApi('http://api.test').postFormulario('/platos', formulario);

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/platos', {
      method: 'POST',
      headers: { Authorization: 'Bearer tok-1' },
      body: formulario,
    });
  });

  it('obtenerArchivo envia Authorization Bearer', async () => {
    guardarToken('tok-1');
    const blob = new Blob(['%PDF']);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      blob: () => Promise.resolve(blob),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await new ClienteApi('http://api.test').obtenerArchivo('/x/pdf');

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/x/pdf', {
      headers: { Authorization: 'Bearer tok-1' },
    });
  });

  it('un 401 con token borra el token y avisa al manejador', async () => {
    guardarToken('tok-1');
    const manejador = vi.fn();
    registrarSesionVencida(manejador);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuestaJson({ detalle: 'Sesión no válida o vencida' }, 401, 'x')),
    );

    const respuesta = await new ClienteApi('http://api.test').get('/mesas');

    expect(respuesta).toEqual({ datos: null, exito: false, error: 'Sesión no válida o vencida' });
    expect(leerToken()).toBeNull();
    expect(manejador).toHaveBeenCalledTimes(1);
  });

  it('un 401 de obtenerArchivo con token tambien cierra la sesion', async () => {
    guardarToken('tok-1');
    const manejador = vi.fn();
    registrarSesionVencida(manejador);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({ detalle: 'x' }, 401, 'x')));

    await new ClienteApi('http://api.test').obtenerArchivo('/x/pdf');

    expect(leerToken()).toBeNull();
    expect(manejador).toHaveBeenCalledTimes(1);
  });

  it('un 401 sin token no avisa al manejador', async () => {
    const manejador = vi.fn();
    registrarSesionVencida(manejador);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({ detalle: 'x' }, 401, 'x')));

    await new ClienteApi('http://api.test').get('/mesas');

    expect(manejador).not.toHaveBeenCalled();
  });

  it('el 401 del inicio de sesion (POST /sesion) no dispara el manejador', async () => {
    guardarToken('tok-viejo');
    const manejador = vi.fn();
    registrarSesionVencida(manejador);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(respuestaJson({ detalle: 'Correo o contraseña incorrectos' }, 401, 'x')),
    );

    const respuesta = await new ClienteApi('http://api.test').post('/sesion', {
      correo: 'a@b.com',
      contrasena: 'x',
    });

    expect(respuesta.error).toBe('Correo o contraseña incorrectos');
    expect(manejador).not.toHaveBeenCalled();
    expect(leerToken()).toBe('tok-viejo');
  });

  it('un 403 conserva el detalle y no cierra la sesion', async () => {
    guardarToken('tok-1');
    const manejador = vi.fn();
    registrarSesionVencida(manejador);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respuestaJson({ detalle: 'No tiene permiso para realizar esta acción' }, 403, 'x'),
        ),
    );

    const respuesta = await new ClienteApi('http://api.test').post('/platos', {});

    expect(respuesta.error).toBe('No tiene permiso para realizar esta acción');
    expect(manejador).not.toHaveBeenCalled();
    expect(leerToken()).toBe('tok-1');
  });

  it('un 401 con token sin manejador registrado solo borra el token', async () => {
    guardarToken('tok-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({ detalle: 'x' }, 401, 'x')));

    await new ClienteApi('http://api.test').get('/mesas');

    expect(leerToken()).toBeNull();
  });

  it('urlDelBackend no lleva el token', () => {
    guardarToken('tok-1');

    expect(urlDelBackend('/media/a.jpg')).not.toContain('tok-1');
  });
});
