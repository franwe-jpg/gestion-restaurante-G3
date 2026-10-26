import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearMesa, listarSectoresHabilitados } from '../api';
import type { Mesa, Sector } from '../types';

import { useFormularioMesa } from './useFormularioMesa';

vi.mock('../api');

const SECTORES: Sector[] = [
  { id: 1, nombre: 'Salón principal', descripcion: null, estado: 'HABILITADO' },
  { id: 2, nombre: 'Terraza', descripcion: null, estado: 'HABILITADO' },
];

const CREADA: Mesa = {
  id: 1,
  numero: 13,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

const mostrarToast = vi.fn();

async function preparar() {
  vi.mocked(listarSectoresHabilitados).mockResolvedValue({
    datos: { items: SECTORES, total: SECTORES.length, limit: 100, offset: 0 },
    exito: true,
  });
  const onCreado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(() => useFormularioMesa({ onCreado }), { wrapper: envoltorio });
  await waitFor(() => expect(result.current.sectores).toHaveLength(SECTORES.length));
  return { result, onCreado };
}

type Formulario = Awaited<ReturnType<typeof preparar>>['result'];

function completar(result: Formulario, numero = '13', capacidad = '4', sectorId = '1') {
  act(() => {
    result.current.setNumero(numero);
    result.current.setCapacidad(capacidad);
    result.current.setSectorId(sectorId);
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useFormularioMesa: carga del selector', () => {
  it('carga los sectores habilitados con useApi (CA 1)', async () => {
    const { result } = await preparar();

    expect(listarSectoresHabilitados).toHaveBeenCalledTimes(1);
    expect(result.current.sectores.map((sector) => sector.nombre)).toEqual([
      'Salón principal',
      'Terraza',
    ]);
    expect(result.current.cargandoSectores).toBe(false);
  });
});

describe('useFormularioMesa: validación local', () => {
  it('con los campos vacíos no envía y marca los obligatorios (CA 2)', async () => {
    const { result } = await preparar();

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMesa).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({
      numero: 'El número es obligatorio.',
      capacidad: 'La capacidad es obligatoria.',
      sectorId: 'El sector es obligatorio.',
    });
  });

  it('con un número inválido no envía y lo advierte (CA 5)', async () => {
    const { result } = await preparar();
    completar(result, '0', '4', '1');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMesa).not.toHaveBeenCalled();
    expect(result.current.errores.numero).toBe('El número debe ser un número entero mayor a cero.');
  });

  it('con una capacidad decimal no envía y la advierte (CA 6)', async () => {
    const { result } = await preparar();
    completar(result, '13', '4.5', '1');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMesa).not.toHaveBeenCalled();
    expect(result.current.errores.capacidad).toBe(
      'La capacidad debe ser un número entero mayor a cero.',
    );
  });
});

describe('useFormularioMesa: alta', () => {
  it('envía los enteros, avisa y notifica el alta (CA 1)', async () => {
    vi.mocked(crearMesa).mockResolvedValue({ datos: CREADA, exito: true });
    const { result, onCreado } = await preparar();
    completar(result, ' 13 ', ' 4 ', '1');

    await act(async () => {
      await result.current.enviar();
    });

    expect(crearMesa).toHaveBeenCalledWith({ numero: 13, capacidad: 4, sector_id: 1 });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Mesa creada', variante: 'success' });
    expect(onCreado).toHaveBeenCalledTimes(1);
    expect(result.current.enviando).toBe(false);
  });
});

describe('useFormularioMesa: errores del servidor', () => {
  it('ubica el 409 de número repetido bajo Número y conserva lo escrito (CA 3)', async () => {
    const mensaje = 'La mesa 3 ya existe en el sector Salón principal';
    vi.mocked(crearMesa).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result, onCreado } = await preparar();
    completar(result, '3', '4', '1');

    await act(async () => {
      await result.current.enviar();
    });

    expect(result.current.errores).toEqual({ numero: mensaje });
    expect(result.current.numero).toBe('3');
    expect(result.current.capacidad).toBe('4');
    expect(result.current.sectorId).toBe('1');
    expect(result.current.enviando).toBe(false);
    expect(onCreado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
  });

  it('ubica el 409 de sector deshabilitado bajo Sector', async () => {
    const mensaje = 'El sector Reservado está deshabilitado';
    vi.mocked(crearMesa).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { result } = await preparar();
    completar(result, '3', '4', '1');

    await act(async () => {
      await result.current.enviar();
    });

    expect(result.current.errores).toEqual({ sectorId: mensaje });
  });

  it('muestra como error general lo que no es de un campo', async () => {
    vi.mocked(crearMesa).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    const { result } = await preparar();
    completar(result);

    await act(async () => {
      await result.current.enviar();
    });

    expect(result.current.errores).toEqual({ general: 'No se pudo conectar con el backend' });
  });
});
