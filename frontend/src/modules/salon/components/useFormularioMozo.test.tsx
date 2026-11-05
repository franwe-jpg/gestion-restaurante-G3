import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearMozo, modificarMozo } from '../api';
import type { Mozo } from '../types';

import { useFormularioMozo } from './useFormularioMozo';

vi.mock('../api');

const CREADO: Mozo = {
  id: 1,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
  estado: 'HABILITADO',
};

const mostrarToast = vi.fn();

function preparar(mozo: Mozo | null = null) {
  const onGuardado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(() => useFormularioMozo({ mozo, onGuardado }), {
    wrapper: envoltorio,
  });
  return { result, onGuardado };
}

type Formulario = ReturnType<typeof preparar>['result'];

function completar(
  result: Formulario,
  dni = '30123456',
  nombre = 'Juan',
  apellido = 'Fernández',
  telefono = '280 412-3456',
) {
  act(() => {
    result.current.setDni(dni);
    result.current.setNombre(nombre);
    result.current.setApellido(apellido);
    result.current.setTelefono(telefono);
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useFormularioMozo: validación local', () => {
  it('con los campos vacíos no envía y marca los obligatorios (CA 2 de #43)', async () => {
    const { result } = preparar();

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({
      dni: 'El DNI es obligatorio.',
      nombre: 'El nombre es obligatorio.',
      apellido: 'El apellido es obligatorio.',
    });
  });

  it('con un DNI inválido no envía y lo advierte (CA 5 de #43)', async () => {
    const { result } = preparar();
    completar(result, '301234');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores.dni).toBe('El DNI debe tener 7 u 8 dígitos.');
  });

  it('con un nombre con números no envía y lo advierte (CA 6 de #43)', async () => {
    const { result } = preparar();
    completar(result, '30123456', 'Juan123');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores.nombre).toBe('El nombre solo debe contener letras.');
  });
});

describe('useFormularioMozo: alta', () => {
  it('envía los datos recortados, avisa y notifica el alta (CA 1 de #43)', async () => {
    vi.mocked(crearMozo).mockResolvedValue({ datos: CREADO, exito: true });
    const { result, onGuardado } = preparar();
    completar(result, ' 30123456 ', ' Juan ', ' Fernández ', ' 280 412-3456 ');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMozo).toHaveBeenCalledWith({
      dni: '30123456',
      nombre: 'Juan',
      apellido: 'Fernández',
      telefono: '280 412-3456',
    });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Mozo creado', variante: 'success' });
    expect(onGuardado).toHaveBeenCalledTimes(1);
    expect(result.current.enviando).toBe(false);
  });

  it('envía el teléfono vacío como nulo', async () => {
    vi.mocked(crearMozo).mockResolvedValue({ datos: CREADO, exito: true });
    const { result } = preparar();
    completar(result, '30123456', 'Juan', 'Fernández', '   ');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMozo).toHaveBeenCalledWith({
      dni: '30123456',
      nombre: 'Juan',
      apellido: 'Fernández',
      telefono: null,
    });
  });
});

describe('useFormularioMozo: errores del servidor', () => {
  it('ubica el 409 de DNI repetido bajo DNI y conserva lo escrito (CA 3 de #43)', async () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';
    vi.mocked(crearMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onGuardado } = preparar();
    completar(result);

    await act(async () => {
      await result.current.enviar();
    });

    expect(result.current.errores).toEqual({ dni: mensaje });
    expect(result.current.dni).toBe('30123456');
    expect(result.current.nombre).toBe('Juan');
    expect(onGuardado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
  });

  it('muestra como error general lo que no es de un campo', async () => {
    vi.mocked(crearMozo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    const { result } = preparar();
    completar(result);

    await act(async () => {
      await result.current.enviar();
    });

    expect(result.current.errores).toEqual({ general: 'No se pudo conectar con el backend' });
  });
});

describe('useFormularioMozo: edición', () => {
  const MOZO: Mozo = {
    id: 3,
    dni: '35987654',
    nombre: 'Ana',
    apellido: 'Romero',
    telefono: null,
    estado: 'HABILITADO',
  };

  it('precarga los datos y envía la modificación (CA 1 de #44)', async () => {
    vi.mocked(modificarMozo).mockResolvedValue({ datos: MOZO, exito: true });
    const { result, onGuardado } = preparar(MOZO);

    expect(result.current.dni).toBe('35987654');
    expect(result.current.nombre).toBe('Ana');
    expect(result.current.apellido).toBe('Romero');

    completar(result, '35987654', 'Ana María', 'Romero', '280 400-0000');
    await act(async () => {
      await result.current.enviar();
    });

    expect(modificarMozo).toHaveBeenCalledWith(3, {
      dni: '35987654',
      nombre: 'Ana María',
      apellido: 'Romero',
      telefono: '280 400-0000',
    });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Mozo modificado', variante: 'success' });
    expect(onGuardado).toHaveBeenCalledTimes(1);
    expect(crearMozo).not.toHaveBeenCalled();
  });

  it('con un dato obligatorio vacío no guarda y lo informa (CA 2 de #44)', async () => {
    const { result } = preparar(MOZO);
    completar(result, '35987654', '', 'Romero', '');

    await act(async () => {
      await result.current.enviar();
    });

    expect(modificarMozo).not.toHaveBeenCalled();
    expect(result.current.errores.nombre).toBe('El nombre es obligatorio.');
  });

  it('ubica el 409 de DNI repetido bajo DNI y no notifica (CA 3 de #44)', async () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';
    vi.mocked(modificarMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onGuardado } = preparar(MOZO);
    completar(result, '30123456', 'Ana', 'Romero', '');

    await act(async () => {
      await result.current.enviar();
    });

    expect(result.current.errores).toEqual({ dni: mensaje });
    expect(onGuardado).not.toHaveBeenCalled();
  });
});
