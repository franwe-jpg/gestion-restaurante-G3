import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { modificarProducto } from '../api';
import type { ProductoSalida } from '../types';

import { useEdicionProducto } from './useEdicionProducto';

vi.mock('../api');

const PLATO: ProductoSalida = {
  id: 7,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  precio: '12500.50',
  ingredientes: ['Pan', 'Huevo'],
  descripcion: 'Con papas',
  etiquetas: ['Casero'],
  estado: 'DESHABILITADO',
  seccion: { id: 3, nombre: 'Platos' },
  imagen_url: '/media/a.jpg',
};

const mostrarToast = vi.fn();

function preparar(producto: ProductoSalida = PLATO) {
  const onGuardado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(
    () => useEdicionProducto({ categoria: 'PLATO', producto, onGuardado }),
    { wrapper: envoltorio },
  );
  return { result, onGuardado };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useEdicionProducto', () => {
  it('carga los datos iniciales del plato', () => {
    const { result } = preparar();

    expect(result.current).toMatchObject({
      nombre: 'Milanesa',
      seccionId: '3',
      precio: '12.500,50',
      ingredientes: ['Pan', 'Huevo'],
      descripcion: 'Con papas',
      etiquetas: ['Casero'],
      estado: 'DESHABILITADO',
      quitarImagen: false,
    });
  });

  it('envía los datos conservados sin cambios y avisa', async () => {
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    const { result, onGuardado } = preparar();

    await act(() => result.current.enviar());

    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      {
        nombre: 'Milanesa',
        seccion_id: 3,
        precio: '12500.50',
        ingredientes: ['Pan', 'Huevo'],
        descripcion: 'Con papas',
        etiquetas: ['Casero'],
        estado: 'DESHABILITADO',
        quitar_imagen: false,
      },
      null,
    );
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Plato modificado', variante: 'success' }),
    );
    expect(onGuardado).toHaveBeenCalledTimes(1);
  });
});

describe('useEdicionProducto: cambios', () => {
  it('envía el estado editado y quitar_imagen', async () => {
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    const { result } = preparar();
    act(() => {
      result.current.setEstado('HABILITADO');
      result.current.setQuitarImagen(true);
    });

    await act(() => result.current.enviar());

    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      expect.objectContaining({ estado: 'HABILITADO', quitar_imagen: true }),
      null,
    );
  });

  it('envía las listas con un chip quitado y otro agregado', async () => {
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    const { result } = preparar();
    act(() => {
      result.current.setIngredientes(['Pan', 'Queso']);
      result.current.setEtiquetas([]);
    });

    await act(() => result.current.enviar());

    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      expect.objectContaining({ ingredientes: ['Pan', 'Queso'], etiquetas: [] }),
      null,
    );
  });
});

describe('useEdicionProducto: imagen y errores', () => {
  it('con una imagen nueva no envía quitar_imagen aunque se haya quitado la actual', async () => {
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    const { result } = preparar();
    const foto = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    act(() => {
      result.current.setQuitarImagen(true);
      result.current.setImagen(foto);
    });

    await act(() => result.current.enviar());

    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      expect.objectContaining({ quitar_imagen: false }),
      foto,
    );
  });

  it('ubica el 409 bajo el nombre y conserva los datos escritos', async () => {
    vi.mocked(modificarProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El plato ya está registrado',
    });
    const { result, onGuardado } = preparar();
    act(() => result.current.setNombre('Flan'));

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ nombre: 'El plato ya está registrado.' });
    expect(result.current.nombre).toBe('Flan');
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('no envía si la validación local falla', async () => {
    const { result } = preparar();
    act(() => {
      result.current.setPrecio('abc');
      result.current.setNombre('');
    });

    await act(() => result.current.enviar());

    expect(modificarProducto).not.toHaveBeenCalled();
    expect(result.current.errores).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      precio: expect.stringMatching(/precio es inválido/) as string,
    });
  });
});
