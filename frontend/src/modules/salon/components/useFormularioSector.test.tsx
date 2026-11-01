import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearSector, modificarSector } from '../api';
import type { Sector } from '../types';

import { useFormularioSector } from './useFormularioSector';

vi.mock('../api');

const CREADO: Sector = {
  id: 1,
  nombre: 'Terraza',
  descripcion: null,
  estado: 'HABILITADO',
};

const TERRAZA: Sector = {
  id: 7,
  nombre: 'Terraza',
  descripcion: 'Al aire libre',
  estado: 'HABILITADO',
};

const mostrarToast = vi.fn();

function preparar(sector: Sector | null = null) {
  const onGuardado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(() => useFormularioSector({ sector, onGuardado }), {
    wrapper: envoltorio,
  });
  return { result, onGuardado };
}

type Formulario = ReturnType<typeof preparar>['result'];

function completar(result: Formulario, nombre: string, descripcion = '') {
  act(() => {
    result.current.setNombre(nombre);
    result.current.setDescripcion(descripcion);
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useFormularioSector: validación local', () => {
  it('con el nombre vacío no envía y lo marca (CA 2)', async () => {
    const { result } = preparar();

    await act(() => result.current.enviar());

    expect(crearSector).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({ nombre: 'El nombre es obligatorio.' });
  });

  it('con 31 caracteres no envía y advierte el máximo (CA 5)', async () => {
    const { result } = preparar();
    completar(result, 'a'.repeat(31));

    await act(() => result.current.enviar());

    expect(crearSector).not.toHaveBeenCalled();
    expect(result.current.errores.nombre).toBe('El nombre supera los 30 caracteres permitidos.');
  });

  it('con una descripción de 201 caracteres no envía y advierte el máximo', async () => {
    const { result } = preparar();
    completar(result, 'Terraza', 'a'.repeat(201));

    await act(() => result.current.enviar());

    expect(crearSector).not.toHaveBeenCalled();
    expect(result.current.errores.descripcion).toBe(
      'La descripción supera los 200 caracteres permitidos.',
    );
  });

  it('en edición con el nombre vacío no envía y lo marca (CA 2 de #34)', async () => {
    const { result } = preparar(TERRAZA);
    completar(result, '   ');

    await act(() => result.current.enviar());

    expect(modificarSector).not.toHaveBeenCalled();
    expect(result.current.errores).toEqual({ nombre: 'El nombre es obligatorio.' });
  });
});

describe('useFormularioSector: alta', () => {
  it('recorta el nombre, envía la descripción nula, avisa y notifica (CA 1)', async () => {
    vi.mocked(crearSector).mockResolvedValue({ datos: CREADO, exito: true });
    const { result, onGuardado } = preparar();
    completar(result, '  Terraza  ', '   ');

    await act(() => result.current.enviar());

    expect(crearSector).toHaveBeenCalledWith({ nombre: 'Terraza', descripcion: null });
    expect(mostrarToast).toHaveBeenCalledWith({ titulo: 'Sector creado', variante: 'success' });
    expect(onGuardado).toHaveBeenCalledTimes(1);
  });

  it('envía la descripción recortada cuando se carga (CA 1)', async () => {
    vi.mocked(crearSector).mockResolvedValue({
      datos: { ...CREADO, descripcion: 'Al aire libre' },
      exito: true,
    });
    const { result } = preparar();
    completar(result, 'Terraza', '  Al aire libre ');

    await act(() => result.current.enviar());

    expect(crearSector).toHaveBeenCalledWith({
      nombre: 'Terraza',
      descripcion: 'Al aire libre',
    });
  });
});

describe('useFormularioSector: edición', () => {
  it('inicializa los campos con los datos del sector (CA 1 de #34)', () => {
    const { result } = preparar(TERRAZA);

    expect(result.current.nombre).toBe('Terraza');
    expect(result.current.descripcion).toBe('Al aire libre');
  });

  it('envía la modificación por id, avisa «Sector modificado» y notifica (CA 1 de #34)', async () => {
    vi.mocked(modificarSector).mockResolvedValue({
      datos: { ...TERRAZA, nombre: 'Terraza norte', descripcion: 'Planta alta' },
      exito: true,
    });
    const { result, onGuardado } = preparar(TERRAZA);
    completar(result, '  Terraza norte ', '  Planta alta ');

    await act(() => result.current.enviar());

    expect(modificarSector).toHaveBeenCalledWith(7, {
      nombre: 'Terraza norte',
      descripcion: 'Planta alta',
    });
    expect(crearSector).not.toHaveBeenCalled();
    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'Sector modificado',
      variante: 'success',
    });
    expect(onGuardado).toHaveBeenCalledTimes(1);
  });

  it('borra la descripción como nula (CA 1 de #34)', async () => {
    vi.mocked(modificarSector).mockResolvedValue({ datos: TERRAZA, exito: true });
    const { result } = preparar(TERRAZA);
    completar(result, 'Terraza', '   ');

    await act(() => result.current.enviar());

    expect(modificarSector).toHaveBeenCalledWith(7, { nombre: 'Terraza', descripcion: null });
  });
});

describe('useFormularioSector: errores del servidor', () => {
  it('ubica el 409 bajo Nombre, conserva lo escrito y no cierra (CA 3)', async () => {
    vi.mocked(crearSector).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El sector ya existe',
    });
    const { result, onGuardado } = preparar();
    completar(result, 'Salón principal');

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ nombre: 'Ya existe un sector con ese nombre.' });
    expect(result.current.nombre).toBe('Salón principal');
    expect(result.current.enviando).toBe(false);
    expect(onGuardado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
  });

  it('ubica el 409 de la edición bajo Nombre y no cierra (CA 3 de #34)', async () => {
    vi.mocked(modificarSector).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El sector ya existe',
    });
    const { result, onGuardado } = preparar(TERRAZA);
    completar(result, 'Salón principal');

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ nombre: 'Ya existe un sector con ese nombre.' });
    expect(result.current.nombre).toBe('Salón principal');
    expect(onGuardado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
  });

  it('muestra como error general lo que no es de un campo', async () => {
    vi.mocked(crearSector).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    const { result } = preparar();
    completar(result, 'Terraza');

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ general: 'No se pudo conectar con el backend' });
  });

  it('usa el mensaje propio de la edición cuando la API no informa el error', async () => {
    vi.mocked(modificarSector).mockResolvedValue({ datos: null, exito: false });
    const { result } = preparar(TERRAZA);
    completar(result, 'Terraza');

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ general: 'No se pudo modificar el sector' });
  });
});
