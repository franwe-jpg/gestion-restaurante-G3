import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearChef, modificarChef } from '../api';
import type { Chef } from '../types';

import { useFormularioChef } from './useFormularioChef';

vi.mock('../api');

const CHEF: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
};

const mostrarToast = vi.fn();

function preparar(chef: Chef | null = null) {
  const onGuardado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(() => useFormularioChef({ chef, onGuardado }), {
    wrapper: envoltorio,
  });
  return { result, onGuardado };
}

type Formulario = ReturnType<typeof preparar>['result'];

function completar(result: Formulario, contrasena = 'clave-1234') {
  act(() => {
    result.current.setDni('28111222');
    result.current.setNombre('Marta');
    result.current.setApellido('Gómez');
    result.current.setTelefono('');
    result.current.setCorreo('marta@resto.com');
    result.current.setContrasena(contrasena);
  });
}

async function enviar(result: Formulario) {
  await act(async () => {
    await result.current.enviar();
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useFormularioChef', () => {
  it('crea el chef con correo y contraseña y avisa «Chef creado»', async () => {
    vi.mocked(crearChef).mockResolvedValue({ datos: CHEF, exito: true });
    const { result, onGuardado } = preparar();
    completar(result);

    await enviar(result);

    expect(crearChef).toHaveBeenCalledWith({
      dni: '28111222',
      nombre: 'Marta',
      apellido: 'Gómez',
      telefono: null,
      correo: 'marta@resto.com',
      contrasena: 'clave-1234',
    });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Chef creado', variante: 'success' });
    expect(onGuardado).toHaveBeenCalledTimes(1);
  });

  it('sin contraseña al crear no envía y la pide («La contraseña es obligatoria.»)', async () => {
    const { result } = preparar();
    completar(result, '');

    await enviar(result);

    expect(crearChef).not.toHaveBeenCalled();
    expect(result.current.errores.contrasena).toBe('La contraseña es obligatoria.');
  });
});

describe('useFormularioChef: errores y modificación', () => {
  it('el 409 de correo repetido queda bajo Correo y el formulario conserva lo escrito', async () => {
    const mensaje = 'Ya existe un usuario con el correo marta@resto.com';
    vi.mocked(crearChef).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onGuardado } = preparar();
    completar(result);

    await enviar(result);

    expect(result.current.errores).toEqual({ correo: mensaje });
    expect(result.current.dni).toBe('28111222');
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('al modificar con la contraseña vacía llama a modificarChef sin contraseña', async () => {
    vi.mocked(modificarChef).mockResolvedValue({ datos: CHEF, exito: true });
    const { result } = preparar(CHEF);
    completar(result, '');

    await enviar(result);

    expect(modificarChef).toHaveBeenCalledWith(4, {
      dni: '28111222',
      nombre: 'Marta',
      apellido: 'Gómez',
      telefono: null,
      correo: 'marta@resto.com',
    });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Chef modificado', variante: 'success' });
    expect(crearChef).not.toHaveBeenCalled();
  });

  it('usa el mensaje por defecto cuando el servidor falla sin detalle', async () => {
    vi.mocked(crearChef).mockResolvedValue({ datos: null, exito: false });
    const { result } = preparar();
    completar(result);

    await enviar(result);

    expect(result.current.errores).toEqual({ general: 'No se pudo crear el chef' });
  });
});
