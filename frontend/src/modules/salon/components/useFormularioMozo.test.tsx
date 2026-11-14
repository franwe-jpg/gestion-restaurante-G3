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
  correo: 'juan@resto.com',
};

const MOZO: Mozo = {
  id: 3,
  dni: '35987654',
  nombre: 'Ana',
  apellido: 'Romero',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'ana@resto.com',
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

interface Datos {
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  contrasena: string;
}

const COMPLETOS: Datos = {
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
  correo: 'juan@resto.com',
  contrasena: 'clave-1234',
};

function completar(result: Formulario, cambios: Partial<Datos> = {}) {
  const datos = { ...COMPLETOS, ...cambios };
  act(() => {
    result.current.setDni(datos.dni);
    result.current.setNombre(datos.nombre);
    result.current.setApellido(datos.apellido);
    result.current.setTelefono(datos.telefono);
    result.current.setCorreo(datos.correo);
    result.current.setContrasena(datos.contrasena);
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

describe('useFormularioMozo: validación local', () => {
  it('con los campos vacíos no envía y marca los obligatorios (CA 2 de #43)', async () => {
    const { result } = preparar();

    await enviar(result);

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({
      dni: 'El DNI es obligatorio.',
      nombre: 'El nombre es obligatorio.',
      apellido: 'El apellido es obligatorio.',
      correo: 'El correo es obligatorio.',
      contrasena: 'La contraseña es obligatoria.',
    });
  });

  it('con un DNI inválido no envía y lo advierte (CA 5 de #43)', async () => {
    const { result } = preparar();
    completar(result, { dni: '301234' });

    await enviar(result);

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores.dni).toBe('El DNI debe tener 7 u 8 dígitos.');
  });

  it('con un nombre con números no envía y lo advierte (CA 6 de #43)', async () => {
    const { result } = preparar();
    completar(result, { nombre: 'Juan123' });

    await enviar(result);

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores.nombre).toBe('El nombre solo debe contener letras.');
  });
});

describe('useFormularioMozo: validación de credenciales', () => {
  it('sin contraseña al crear no envía y la pide', async () => {
    const { result } = preparar();
    completar(result, { contrasena: '' });

    await enviar(result);

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({ contrasena: 'La contraseña es obligatoria.' });
  });

  it('con una contraseña de 7 caracteres no envía', async () => {
    const { result } = preparar();
    completar(result, { contrasena: '1234567' });

    await enviar(result);

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores.contrasena).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    );
  });

  it('con un correo sin formato no envía', async () => {
    const { result } = preparar();
    completar(result, { correo: 'juan' });

    await enviar(result);

    expect(crearMozo).not.toHaveBeenCalled();
    expect(result.current.errores.correo).toBe('El correo no tiene un formato válido.');
  });
});

describe('useFormularioMozo: alta', () => {
  it('envía los datos recortados, avisa y notifica el alta (CA 1 de #43)', async () => {
    vi.mocked(crearMozo).mockResolvedValue({ datos: CREADO, exito: true });
    const { result, onGuardado } = preparar();
    completar(result, {
      dni: ' 30123456 ',
      nombre: ' Juan ',
      apellido: ' Fernández ',
      telefono: ' 280 412-3456 ',
      correo: ' juan@resto.com ',
    });

    await enviar(result);

    expect(crearMozo).toHaveBeenCalledWith({
      dni: '30123456',
      nombre: 'Juan',
      apellido: 'Fernández',
      telefono: '280 412-3456',
      correo: 'juan@resto.com',
      contrasena: 'clave-1234',
    });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Mozo creado', variante: 'success' });
    expect(onGuardado).toHaveBeenCalledTimes(1);
    expect(result.current.enviando).toBe(false);
  });

  it('envía el teléfono vacío como nulo', async () => {
    vi.mocked(crearMozo).mockResolvedValue({ datos: CREADO, exito: true });
    const { result } = preparar();
    completar(result, { telefono: '   ' });

    await enviar(result);

    expect(crearMozo).toHaveBeenCalledWith(expect.objectContaining({ telefono: null }));
  });
});

describe('useFormularioMozo: errores del servidor', () => {
  it('ubica el 409 de DNI repetido bajo DNI y conserva lo escrito (CA 3 de #43)', async () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';
    vi.mocked(crearMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onGuardado } = preparar();
    completar(result);

    await enviar(result);

    expect(result.current.errores).toEqual({ dni: mensaje });
    expect(result.current.dni).toBe('30123456');
    expect(result.current.nombre).toBe('Juan');
    expect(onGuardado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
  });

  it('ubica el 409 de correo repetido bajo Correo y conserva lo escrito', async () => {
    const mensaje = 'Ya existe un usuario con el correo juan@resto.com';
    vi.mocked(crearMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onGuardado } = preparar();
    completar(result);

    await enviar(result);

    expect(result.current.errores).toEqual({ correo: mensaje });
    expect(result.current.correo).toBe('juan@resto.com');
    expect(result.current.contrasena).toBe('clave-1234');
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('muestra como error general lo que no es de un campo', async () => {
    vi.mocked(crearMozo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    const { result } = preparar();
    completar(result);

    await enviar(result);

    expect(result.current.errores).toEqual({ general: 'No se pudo conectar con el backend' });
  });

  it('muestra el detalle de un 403 como error general', async () => {
    vi.mocked(crearMozo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No tiene permiso para realizar esta acción',
    });
    const { result } = preparar();
    completar(result);

    await enviar(result);

    expect(result.current.errores).toEqual({
      general: 'No tiene permiso para realizar esta acción',
    });
  });
});

describe('useFormularioMozo: edición', () => {
  it('precarga los datos y el correo, y deja la contraseña vacía', () => {
    const { result } = preparar(MOZO);

    expect(result.current.dni).toBe('35987654');
    expect(result.current.nombre).toBe('Ana');
    expect(result.current.apellido).toBe('Romero');
    expect(result.current.correo).toBe('ana@resto.com');
    expect(result.current.contrasena).toBe('');
    expect(result.current.contrasenaObligatoria).toBe(false);
  });

  it('con la contraseña vacía envía la modificación sin contraseña (conserva la actual)', async () => {
    vi.mocked(modificarMozo).mockResolvedValue({ datos: MOZO, exito: true });
    const { result, onGuardado } = preparar(MOZO);
    completar(result, {
      dni: '35987654',
      nombre: 'Ana María',
      apellido: 'Romero',
      telefono: '280 400-0000',
      correo: 'ana@resto.com',
      contrasena: '',
    });

    await enviar(result);

    expect(modificarMozo).toHaveBeenCalledWith(3, {
      dni: '35987654',
      nombre: 'Ana María',
      apellido: 'Romero',
      telefono: '280 400-0000',
      correo: 'ana@resto.com',
    });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Mozo modificado', variante: 'success' });
    expect(onGuardado).toHaveBeenCalledTimes(1);
    expect(crearMozo).not.toHaveBeenCalled();
  });
});

describe('useFormularioMozo: edición con contraseña nueva', () => {
  it('con una contraseña nueva la envía', async () => {
    vi.mocked(modificarMozo).mockResolvedValue({ datos: MOZO, exito: true });
    const { result } = preparar(MOZO);
    completar(result, {
      dni: '35987654',
      nombre: 'Ana',
      apellido: 'Romero',
      telefono: '',
      correo: 'nueva@resto.com',
      contrasena: 'otra-clave-9',
    });

    await enviar(result);

    expect(modificarMozo).toHaveBeenCalledWith(3, {
      dni: '35987654',
      nombre: 'Ana',
      apellido: 'Romero',
      telefono: null,
      correo: 'nueva@resto.com',
      contrasena: 'otra-clave-9',
    });
  });
});

describe('useFormularioMozo: edición, errores y sin usuario', () => {
  it('con un dato obligatorio vacío no guarda y lo informa (CA 2 de #44)', async () => {
    const { result } = preparar(MOZO);
    completar(result, { nombre: '', telefono: '', contrasena: '', correo: 'ana@resto.com' });

    await enviar(result);

    expect(modificarMozo).not.toHaveBeenCalled();
    expect(result.current.errores.nombre).toBe('El nombre es obligatorio.');
  });

  it('ubica el 409 de DNI repetido bajo DNI y no notifica (CA 3 de #44)', async () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';
    vi.mocked(modificarMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onGuardado } = preparar(MOZO);
    completar(result, { dni: '30123456', nombre: 'Ana', apellido: 'Romero', contrasena: '' });

    await enviar(result);

    expect(result.current.errores).toEqual({ dni: mensaje });
    expect(onGuardado).not.toHaveBeenCalled();
  });
});

describe('useFormularioMozo: mozo sin usuario', () => {
  it('un mozo «Sin usuario» (correo nulo) debe escribir la contraseña', async () => {
    const sinUsuario: Mozo = { ...MOZO, correo: null };
    const { result } = preparar(sinUsuario);

    expect(result.current.contrasenaObligatoria).toBe(true);
    completar(result, {
      dni: '35987654',
      nombre: 'Ana',
      apellido: 'Romero',
      telefono: '',
      correo: 'ana@resto.com',
      contrasena: '',
    });
    await enviar(result);

    expect(modificarMozo).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({ contrasena: 'La contraseña es obligatoria.' });
  });

  it('un mozo «Sin usuario» con contraseña crea su usuario al guardar', async () => {
    vi.mocked(modificarMozo).mockResolvedValue({ datos: MOZO, exito: true });
    const { result } = preparar({ ...MOZO, correo: null });
    expect(result.current.correo).toBe('');
    completar(result, {
      dni: '35987654',
      nombre: 'Ana',
      apellido: 'Romero',
      telefono: '',
      correo: 'ana@resto.com',
      contrasena: 'clave-1234',
    });

    await enviar(result);

    expect(modificarMozo).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ correo: 'ana@resto.com', contrasena: 'clave-1234' }),
    );
  });
});
