import { afterEach, expect, it, vi } from 'vitest';

import { clienteHttp } from '../api/client';

import { cerrarSesion, iniciarSesion, obtenerSesion } from './api';

afterEach(() => {
  vi.restoreAllMocks();
});

it('iniciarSesion envia correo y contrasena por POST a /sesion', async () => {
  const respuesta = { datos: null, exito: false, error: 'Correo o contraseña incorrectos' };
  const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue(respuesta);

  const resultado = await iniciarSesion({ correo: 'a@b.com', contrasena: 'clave-1234' });

  expect(post).toHaveBeenCalledWith('/sesion', { correo: 'a@b.com', contrasena: 'clave-1234' });
  expect(resultado).toBe(respuesta);
});

it('obtenerSesion consulta GET /sesion', async () => {
  const respuesta = {
    datos: { id: 1, correo: 'a@b.com', roles: ['MOZO' as const], nombre: 'Ana', apellido: 'Paz' },
    exito: true,
  };
  const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue(respuesta);

  const resultado = await obtenerSesion();

  expect(get).toHaveBeenCalledWith('/sesion');
  expect(resultado).toBe(respuesta);
});

it('cerrarSesion envia DELETE /sesion', async () => {
  const respuesta = { datos: null, exito: true };
  const eliminar = vi.spyOn(clienteHttp, 'delete').mockResolvedValue(respuesta);

  const resultado = await cerrarSesion();

  expect(eliminar).toHaveBeenCalledWith('/sesion');
  expect(resultado).toBe(respuesta);
});
