import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp, registrarSesionVencida } from '../api/client';

import * as api from './api';
import { guardarToken, leerToken } from './almacenSesion';
import { SesionProvider } from './SesionProvider';
import { useSesion } from './useSesion';

vi.unmock('./useSesion');
vi.mock('./api');

const MOZO = {
  id: 7,
  correo: 'mozo@resto.com',
  roles: ['MOZO' as const],
  nombre: 'Ana',
  apellido: 'Paz',
};

function envoltorio({ children }: { children: ReactNode }) {
  return <SesionProvider>{children}</SesionProvider>;
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  sessionStorage.clear();
  registrarSesionVencida(null);
});

describe('SesionProvider', () => {
  it('sin token no consulta GET /sesion y no hay usuario', () => {
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });

    expect(api.obtenerSesion).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
    expect(result.current.usuario).toBeNull();
    expect(result.current.puede('CARTA_VER')).toBe(false);
  });

  it('con token consulta GET /sesion al montar y restaura al usuario', async () => {
    guardarToken('tok-1');
    vi.mocked(api.obtenerSesion).mockResolvedValue({ exito: true, datos: MOZO });

    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.usuario).toEqual(MOZO);
    expect(result.current.puede('COMANDAS_OPERAR')).toBe(true);
    expect(result.current.puede('REPORTES_VER')).toBe(false);
  });

  it('si GET /sesion falla deja la sesion vacia', async () => {
    guardarToken('tok-1');
    vi.mocked(api.obtenerSesion).mockResolvedValue({ exito: false, datos: null, error: 'x' });

    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.usuario).toBeNull();
  });

  it('iniciarSesion guarda el token y el usuario', async () => {
    vi.mocked(api.iniciarSesion).mockResolvedValue({
      exito: true,
      datos: { token: 'tok-9', tipo: 'bearer', vence_en: '2026-11-12T00:00:00', usuario: MOZO },
    });
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });

    let resultado: { exito: boolean; error?: string } | undefined;
    await act(async () => {
      resultado = await result.current.iniciarSesion('mozo@resto.com', 'clave-1234');
    });

    expect(api.iniciarSesion).toHaveBeenCalledWith({
      correo: 'mozo@resto.com',
      contrasena: 'clave-1234',
    });
    expect(resultado).toEqual({ exito: true });
    expect(leerToken()).toBe('tok-9');
    expect(result.current.usuario).toEqual(MOZO);
  });

  it('iniciarSesion con error devuelve el mensaje y no guarda nada', async () => {
    vi.mocked(api.iniciarSesion).mockResolvedValue({
      exito: false,
      datos: null,
      error: 'Correo o contraseña incorrectos',
    });
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });

    let resultado: { exito: boolean; error?: string } | undefined;
    await act(async () => {
      resultado = await result.current.iniciarSesion('a@b.com', 'mala');
    });

    expect(resultado).toEqual({ exito: false, error: 'Correo o contraseña incorrectos' });
    expect(leerToken()).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('cerrarSesion llama a DELETE /sesion y borra el token', async () => {
    guardarToken('tok-1');
    vi.mocked(api.obtenerSesion).mockResolvedValue({ exito: true, datos: MOZO });
    vi.mocked(api.cerrarSesion).mockResolvedValue({ exito: true, datos: null });
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.usuario).not.toBeNull());

    await act(async () => {
      await result.current.cerrarSesion();
    });

    expect(api.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(leerToken()).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('cerrarSesion borra el token aunque la llamada falle', async () => {
    guardarToken('tok-1');
    vi.mocked(api.obtenerSesion).mockResolvedValue({ exito: true, datos: MOZO });
    vi.mocked(api.cerrarSesion).mockResolvedValue({ exito: false, datos: null, error: 'caido' });
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.usuario).not.toBeNull());

    await act(async () => {
      await result.current.cerrarSesion();
    });

    expect(leerToken()).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  it('un 401 en una solicitud con token deja la sesion vacia', async () => {
    guardarToken('tok-1');
    vi.mocked(api.obtenerSesion).mockResolvedValue({ exito: true, datos: MOZO });
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.usuario).not.toBeNull());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'x',
        json: () => Promise.resolve({ detalle: 'Sesión no válida o vencida' }),
      }),
    );

    await act(async () => {
      await clienteHttp.get('/mesas');
    });
    vi.unstubAllGlobals();

    expect(result.current.usuario).toBeNull();
    expect(leerToken()).toBeNull();
  });

  it('un usuario con dos roles puede la union de sus permisos', async () => {
    guardarToken('tok-1');
    vi.mocked(api.obtenerSesion).mockResolvedValue({
      exito: true,
      datos: { ...MOZO, roles: ['MOZO', 'CHEF'] },
    });
    const { result } = renderHook(() => useSesion(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.usuario).not.toBeNull());

    expect(result.current.puede('SALON_VER')).toBe(true);
    expect(result.current.puede('CARTA_VER')).toBe(true);
    expect(result.current.puede('CARTA_GESTIONAR')).toBe(false);
  });
});

describe('useSesion', () => {
  it('sin proveedor lanza un error', () => {
    function Consumidor() {
      useSesion();
      return null;
    }
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Consumidor />)).toThrow('useSesion debe usarse dentro de SesionProvider');
    consola.mockRestore();
  });
});
